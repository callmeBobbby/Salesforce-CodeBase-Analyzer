// server.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import jobProcessor from './jobProcessor.js';
import { CONFIG } from './analysisConfig.js';
import LLMService from './llmService.js';

dotenv.config();

const app = express();
const analysisCache = new NodeCache({
  stdTTL: CONFIG.CACHE.TTL,
  checkperiod: CONFIG.CACHE.CHECK_PERIOD
});

// Middleware setup
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Add this near the top of server.js after middleware setup
app.use((req, res, next) => {
  if (req.url === '/api/analyze') {
    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (!res.finished) {
        res.write(':\n\n');
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    // Clean up interval on connection close
    res.on('close', () => {
      clearInterval(pingInterval);
    });
  }
  next();
});


// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  console.log('Received request at root route');
  res.json({ status: 'ok', message: 'Salesforce Code Analyzer API' });
});

// File content endpoint
app.post('/api/file-content', async (req, res) => {
  const { path } = req.body;
  const { authorization } = req.headers;

  console.log('Fetching file content:', path);

  try {
    const [owner, repo, ...filePathParts] = path.split('/');
    const filePath = filePathParts.join('/');

    console.log(`Requesting GitHub API for content: ${filePath}`);

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: authorization,
          Accept: 'application/vnd.github.v3.raw'
        }
      }
    );

    console.log('File content fetched successfully');
    res.json({ content: response.data });
  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});

// GitHub authentication endpoint
app.post('/api/auth/github', async (req, res) => {
  const { code } = req.body;

  console.log('Authenticating with GitHub, received code:', code);

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.VITE_GITHUB_CLIENT_ID,
        client_secret: process.env.VITE_GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.VITE_REDIRECT_URI
      },
      {
        headers: { Accept: 'application/json' }
      }
    );

    console.log('GitHub authentication successful');
    res.json(response.data);
  } catch (error) {
    console.error("Auth error:", error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Analysis endpoint
// Inside the /api/analyze endpoint in server.js
app.post('/api/analyze', async (req, res) => {
  const { repoName } = req.body;
  const authHeader = req.headers.authorization;

  // Set up SSE with proper headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true'
  });

  function sendEvent(event, data) {
    const payload = { event, data };
    const eventString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    console.log('Sending SSE event:', {
      eventType: event,
      payload: payload,
      rawString: eventString
    });
    res.write(eventString);
  }



  try {
    const cacheKey = `repo-${repoName}`;
    const cachedResult = analysisCache.get(cacheKey);
    if (cachedResult) {
      sendEvent('complete', cachedResult);
      return res.end();
    }

    sendEvent('status', 'Starting analysis...');
    const files = await fetchRepoContents(repoName, authHeader);

    sendEvent('status', 'Processing Salesforce files...');
    const salesforceFiles = await getSalesforceFiles(files, authHeader);

    if (!salesforceFiles.length) {
      sendEvent('error', 'No Salesforce files found');
      return res.end();
    }

    const analysisResults = [];
    for (const fileInfo of salesforceFiles) {
      try {
        sendEvent('status', `Analyzing ${fileInfo.name}...`);
        const response = await axios.get(fileInfo.download_url, {
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3.raw'
          }
        });

        const file = {
          name: fileInfo.name,
          content: response.data,
          path: fileInfo.path
        };

        const result = await jobProcessor.addJob({
          file,
          type: getFileType(file.name)
        });

        console.log(`Analysis result for ${file.name}:`, result);
        analysisResults.push(result);

        sendEvent('progress', {
          file: file.name,
          status: 'completed',
          analysis: result.analysis
        });
      } catch (error) {
        console.error(`Failed to process ${fileInfo.name}:`, error);
        sendEvent('error', {
          file: fileInfo.name,
          error: error.message
        });
      }
    }

    if (analysisResults.length === 0) {
      throw new Error('No files were successfully analyzed');
    }

    console.log('Generating codebase overview...');
    sendEvent('status', 'Generating codebase overview...');

    const overview = await LLMService.retryAnalysis(
      createAnalysisPrompt('codebase', analysisResults)
    );
    console.log('Codebase overview:', overview);

    const finalResult = {
      repository: repoName,
      overview,
      analyses: analysisResults,
      timestamp: new Date().toISOString()
    };

    console.log('Final analysis result:', finalResult);
    analysisCache.set(repoName, finalResult);

    sendEvent('complete', finalResult);
    res.end();

  } catch (error) {
    console.error('Analysis error:', error);
    sendEvent('error', {
      message: error.message,
      type: 'system_error'
    });
    res.end();
  }
});


// Helper functions
async function fetchRepoContents(repoName, authHeader, path = '') {
  console.log('Fetching repository contents for path:', path);

  const response = await axios.get(
    `https://api.github.com/repos/${repoName}/contents/${path}`,
    {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github.v3+json'
      }
    }
  );

  let allContents = [];
  for (const item of response.data) {
    if (item.type === 'dir') {
      console.log('Entering directory:', item.path);
      const subContents = await fetchRepoContents(repoName, authHeader, item.path);
      allContents = allContents.concat(subContents);
    } else {
      console.log('File found:', item.name);
      allContents.push(item);
    }
  }
  return allContents;
}

async function getSalesforceFiles(contents, authHeader) {
  console.log('Filtering files for Salesforce extensions...');
  const salesforceExtensions = ['.cls', '.trigger', '.page', '.component', '.js', '.html', '.cmp'];
  return contents.filter(item =>
    salesforceExtensions.some(ext =>
      item.name.toLowerCase().endsWith(ext) && !item.name.endsWith('-meta.xml')
    )
  );
}


function getFileType(fileName) {
  const extensions = {
    '.cls': 'apex',
    '.trigger': 'apex',
    '.page': 'visualforce',
    '.component': 'visualforce',
    '.js': 'javascript',
    '.html': 'lwc',
    '.cmp': 'aura'
  };
  const ext = '.' + fileName.split('.').pop().toLowerCase();
  console.log(`Determined file type for ${fileName}: ${extensions[ext] || 'unknown'}`);
  return extensions[ext] || 'unknown';
}

// In server.js, add this function with the other helper functions
function createAnalysisPrompt(type, data) {
  if (type === 'codebase') {
    return `As a development expert, analyze this codebase:

Files to analyze:
${data.map(file => `
File: ${file.fileName}
Type: ${file.fileType}
Analysis: ${file.analysis}
`).join('\n')}

Please provide a comprehensive overview covering:
1. Overall Architecture
2. Code Quality
3. Performance Considerations
4. Security Analysis
5. Best Practices
6. Recommendations for Improvement`;
  }
  return '';
}


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



