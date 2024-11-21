// server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import NodeCache from "node-cache";
import jsforce from "jsforce";
import jobProcessor from "./jobProcessor.js";
import { CONFIG } from "./analysisConfig.js";
import LLMService from "./llmService.js";
// At the top of server.js with other imports
import crypto from "crypto";

dotenv.config();

const app = express();
const analysisCache = new NodeCache({
  stdTTL: CONFIG.CACHE.TTL,
  checkperiod: CONFIG.CACHE.CHECK_PERIOD,
});

// Middleware setup
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const conn = new jsforce.Connection({
  loginUrl: "https://login.salesforce.com",
});

const username = process.env.SALESFORCE_USERNAME;
const password = process.env.SALESFORCE_PASSWORD;

async function connectToSalesforce() {
  try {
    return new Promise((resolve, reject) => {
      conn.login(username, password, (err, userInfo) => {
        if (err) {
          res.status(500).send("Error connecting to Salesforce");
          reject(err);
          return;
        }

        console.log("Connected to Salesforce successfully");
        console.log("User Info:", {
          id: userInfo.id,
          organizationId: userInfo.organizationId,
          url: userInfo.url,
        });
        resolve(userInfo);
      });
    });
  } catch (error) {
    console.error("Error in connectToSalesforce catch:", error);
    throw error;
  }
}

// Reusable SSE function
function sendEventToClient(res, event, data) {
  const payload = { event, data };
  const eventString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  console.log("Sending SSE event:", {
    eventType: event,
    payload: payload,
    rawString: eventString,
  });
  res.write(eventString);
}

// Keep-alive middleware
app.use((req, res, next) => {
  if (req.url === "/api/analyze" || req.url === "/api/analyze/kt") {
    const pingInterval = setInterval(() => {
      if (!res.finished) {
        res.write(":\n\n");
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    res.on("close", () => {
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
app.get("/", (req, res) => {
  console.log("Received request at root route", req);
  res.json({ status: "ok", message: "Salesforce Code Analyzer API" });
});

// Change from const to let for the salesforceConnections object
let salesforceConnections = {};

app.post("/api/auth/salesforce", (req, res) => {
  try {
    const { codeChallenge } = req.body;

    // Clear existing connections by reassigning an empty object
    salesforceConnections = {};

    if (!codeChallenge) {
      throw new Error("Code challenge is required");
    }

    // Validate code challenge format
    const validChallengePattern = /^[A-Za-z0-9_-]{43,128}$/;
    if (!validChallengePattern.test(codeChallenge)) {
      throw new Error("Invalid code challenge format");
    }

    const sfLoginUrl = "https://login.salesforce.com/services/oauth2/authorize";
    const state = crypto.randomBytes(16).toString("hex");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.SALESFORCE_CLIENT_ID?.trim(),
      redirect_uri: process.env.SALESFORCE_CALLBACK_URL?.trim(),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "api refresh_token web",
      prompt: "login consent", // Force login prompt
    });

    const authUrl = `${sfLoginUrl}?${params.toString()}`;

    console.log('Auth request parameters:', {
      codeChallenge: codeChallenge.substring(0, 10) + '...',
      state,
      redirectUri: process.env.SALESFORCE_CALLBACK_URL
    });

    // Set cache control headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      authUrl,
      state,
      success: true,
      timestamp: new Date().getTime()
    });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/salesforce/disconnect", (req, res) => {
  try {
    // Clear the connection from memory
    salesforceConnections = {};

    res.json({
      status: 'success',
      message: 'Disconnected from Salesforce',
      timestamp: new Date().getTime()
    });
  } catch (error) {
    console.error("Error disconnecting from Salesforce:", error);
    res.status(500).json({
      error: "Failed to disconnect",
      details: error.message
    });
  }
});

app.post("/api/auth/salesforce/callback", async (req, res) => {
  try {
    const { code, codeVerifier, state } = req.body;

    console.log('Processing callback with:', {
      hasCode: !!code,
      codeVerifierLength: codeVerifier?.length,
      verifierPreview: codeVerifier?.substring(0, 10) + '...',
      state,
      fullVerifier: codeVerifier // Remove in production
    });

    if (!code || !codeVerifier) {
      throw new Error('Missing required parameters');
    }


    // Validate code verifier format
    const validVerifierPattern = /^[A-Za-z0-9]{43,128}$/;
    if (!validVerifierPattern.test(codeVerifier)) {
      throw new Error('Invalid code verifier format');
    }


    // Set cache control headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });


    const tokenUrl = 'https://login.salesforce.com/services/oauth2/token';
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.SALESFORCE_CLIENT_ID?.trim(),
      client_secret: process.env.SALESFORCE_CLIENT_SECRET?.trim(),
      redirect_uri: process.env.SALESFORCE_CALLBACK_URL?.trim(),
      code: code,
      code_verifier: codeVerifier
    });

    console.log('Token request parameters:', {
      url: tokenUrl,
      clientId: process.env.SALESFORCE_CLIENT_ID?.substring(0, 10) + '...',
      redirectUri: process.env.SALESFORCE_CALLBACK_URL,
      codeVerifierLength: codeVerifier.length,
      verifierPreview: codeVerifier.substring(0, 10) + '...'
    });

    const tokenResponse = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!tokenResponse.data.access_token) {
      throw new Error('No access token received');
    }

    // Store the connection in memory
    salesforceConnections["default"] = {
      status: 'connected',
      access_token: tokenResponse.data.access_token,
      instance_url: tokenResponse.data.instance_url,
      refresh_token: tokenResponse.data.refresh_token
    };

    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenResponse.data.access_token,
      hasInstanceUrl: !!tokenResponse.data.instance_url
    });

    res.json({
      status: 'connected',
      access_token: tokenResponse.data.access_token,
      instance_url: tokenResponse.data.instance_url,
      refresh_token: tokenResponse.data.refresh_token,
      timestamp: new Date().getTime()
    });

  } catch (error) {
    console.error("Salesforce OAuth error:", {
      error: error.response?.data || error.message,
      stack: error.stack,
      requestBody: error.config?.data // Log the request body for debugging
    });
    res.status(401).json({
      error: "Failed to authenticate with Salesforce",
      details: error.response?.data || error.message,
      timestamp: new Date().getTime()
    });
  }
});

app.get("/api/accounts", async (req, res) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: "Not connected to Salesforce" });
  }

  const accessToken = authorization.split(" ")[1]; // Assuming Bearer token format

  // Retrieve instance URL from the in-memory store
  const salesforceConnection = salesforceConnections["default"];
  const instanceUrl = salesforceConnection?.instance_url;
  console.log("instanceURL: ", instanceUrl); // Debug log
  console.log("accessToken: ", accessToken); // Debug log

  if (!instanceUrl) {
    return res.status(401).json({ error: "Instance URL is not defined" });
  }

  const conn = new jsforce.Connection({
    accessToken: accessToken,
    instanceUrl: instanceUrl, // Use the retrieved instance URL
  });

  try {
    const result = await conn.query("SELECT Id, Name FROM Account");
    console.log("Fetched accounts:", result.records);
    res.json(result.records);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch accounts", details: error.message });
  }
});

// File content endpoint
app.post("/api/file-content", async (req, res) => {
  const { path } = req.body;
  const { authorization } = req.headers;

  console.log("Fetching file content:", path);

  try {
    const [owner, repo, ...filePathParts] = path.split("/");
    const filePath = filePathParts.join("/");

    console.log(`Requesting GitHub API for content: ${filePath}`);

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: authorization,
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );

    console.log("File content fetched successfully");
    res.json({ content: response.data });
  } catch (error) {
    console.error("Error fetching file content:", error);
    res.status(500).json({ error: "Failed to fetch file content" });
  }
});

// GitHub authentication endpoint
app.post("/api/auth/github", async (req, res) => {
  const { code } = req.body;

  console.log("Authenticating with GitHub, received code:", code);

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.VITE_GITHUB_CLIENT_ID,
        client_secret: process.env.VITE_GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.VITE_REDIRECT_URI,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    console.log("GitHub authentication successful");
    res.json(response.data);
  } catch (error) {
    console.error("Auth error:", error.response?.data || error.message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Analysis endpoint
app.post("/api/analyze", async (req, res) => {
  const { repoName } = req.body;
  const authHeader = req.headers.authorization;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Credentials": "true",
  });

  try {
    const cacheKey = `repo-${repoName}`;
    const cachedResult = analysisCache.get(cacheKey);
    if (cachedResult) {
      sendEventToClient(res, "complete", cachedResult);
      return res.end();
    }

    sendEventToClient(res, "status", "Starting analysis...");
    const files = await fetchRepoContents(repoName, authHeader);

    sendEventToClient(res, "status", "Processing Salesforce files...");
    const salesforceFiles = await getSalesforceFiles(files, authHeader);

    if (!salesforceFiles.length) {
      sendEventToClient(res, "error", "No Salesforce files found");
      return res.end();
    }

    const analysisResults = [];
    for (const fileInfo of salesforceFiles) {
      try {
        sendEventToClient(res, "status", `Analyzing ${fileInfo.name}...`);
        const response = await axios.get(fileInfo.download_url, {
          headers: {
            Authorization: authHeader,
            Accept: "application/vnd.github.v3.raw",
          },
        });

        const file = {
          name: fileInfo.name,
          content: response.data,
          path: fileInfo.path,
        };

        const result = await jobProcessor.addJob({
          file,
          type: getFileType(file.name),
        });

        console.log(`Analysis result for ${file.name}:`, result);
        analysisResults.push(result);

        sendEventToClient(res, "progress", {
          file: file.name,
          status: "completed",
          analysis: result.analysis,
        });
      } catch (error) {
        console.error(`Failed to process ${fileInfo.name}:`, error);
        sendEventToClient(res, "error", {
          file: fileInfo.name,
          error: error.message,
        });
      }
    }

    if (analysisResults.length === 0) {
      throw new Error("No files were successfully analyzed");
    }

    console.log("Generating codebase overview...");
    sendEventToClient(res, "status", "Generating codebase overview...");

    console.log(
      "overview prompt: ",
      createAnalysisPrompt("codebase", analysisResults)
    );

    const overview = await LLMService.retryAnalysis(
      createAnalysisPrompt("codebase", analysisResults)
    );

    console.log("overview: ", overview);

    const finalResult = {
      repository: repoName,
      overview,
      analyses: analysisResults,
      timestamp: new Date().toISOString(),
    };

    console.log("Final analysis result:", finalResult);
    analysisCache.set(cacheKey, finalResult);

    sendEventToClient(res, "complete", finalResult);
  } catch (error) {
    console.error("Analysis error:", error);
    sendEventToClient(res, "error", {
      message: error.message,
      type: "system_error",
    });
  } finally {
    res.end();
  }
});

// KT Analysis endpoint
app.post("/api/analyze/kt", async (req, res) => {
  const { repoName } = req.body;
  const authHeader = req.headers.authorization;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Credentials": "true",
  });

  try {
    const files = await fetchRepoContents(repoName, authHeader);
    const salesforceFiles = await getSalesforceFiles(files, authHeader);

    sendEventToClient(res, "status", "Generating KT documentation...");

    const ktAnalysis = {
      codebase: {
        structure: {},
        patterns: [],
        conventions: [],
      },
      onboarding: {
        quickStart: [],
        commonTasks: [],
        troubleshooting: [],
      },
      technical: {
        architecture: {},
        dependencies: [],
        integrations: [],
      },
      business: {
        processes: [],
        rules: [],
        domains: [],
      },
    };

    for (const fileInfo of salesforceFiles) {
      try {
        sendEventToClient(res, "status", `Analyzing ${fileInfo.name}...`);
        const response = await axios.get(fileInfo.download_url, {
          headers: {
            Authorization: authHeader,
            Accept: "application/vnd.github.v3.raw",
          },
        });

        const file = {
          name: fileInfo.name,
          content: response.data,
          path: fileInfo.path,
        };

        const fileType = getFileType(file.name);
        const analysis = await jobProcessor.addJob({
          file,
          type: fileType,
          mode: "kt",
        });

        categorizeAnalysis(analysis, ktAnalysis);

        sendEventToClient(res, "progress", {
          file: file.name,
          status: "completed",
          analysis: analysis.analysis,
        });
      } catch (error) {
        console.error(`Failed to process ${fileInfo.name}:`, error);
        sendEventToClient(res, "error", {
          file: fileInfo.name,
          error: error.message,
        });
      }
    }

    const documentation = await generateDocumentation(ktAnalysis);

    sendEventToClient(res, "complete", {
      ktAnalysis,
      documentation,
      quickStart: {
        setup: documentation.setup,
        firstSteps: documentation.workflows.development.slice(0, 3),
      },
    });
  } catch (error) {
    console.error("KT Analysis error:", error);
    sendEventToClient(res, "error", {
      message: error.message,
      type: "kt_analysis_error",
    });
  } finally {
    res.end();
  }
});

async function analyzeSalesforceQuery(prompt) {
  try {
    const llmAnalysis = await LLMService.retryAnalysis(`
      Analyze this prompt and determine what Salesforce API calls might be needed:
      ${prompt}
      
      Return a structured response with:
      1. Required SOQL/SOSL queries
      2. Required Salesforce API endpoints
      3. Required object access
    `);

    // Check if the response is valid JSON
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(llmAnalysis);
    } catch (err) {
      console.error("Invalid JSON from LLMService:", llmAnalysis);
      throw new Error("Received invalid JSON from LLMService");
    }

    return parsedAnalysis;
  } catch (error) {
    console.error("Error analyzing Salesforce query:", error);
    throw error;
  }
}

async function querySalesforce(queryDetails) {
  try {
    const results = [];
    if (queryDetails.soql) {
      const records = await conn.query(queryDetails.soql);
      results.push({ type: "soql", data: records });
    }
    return results;
  } catch (error) {
    console.error("Error querying Salesforce:", error);
    throw error;
  }
}

// Modify the existing /api/analyze/custom endpoint
app.post("/api/analyze/custom", async (req, res) => {
  const { fileName, content, prompt } = req.body;

  try {
    // First LLM analysis to determine Salesforce queries
    const salesforceQueries = await analyzeSalesforceQuery(prompt);

    // Execute Salesforce queries
    const salesforceData = await querySalesforce(salesforceQueries);

    // Second LLM analysis combining Salesforce data with original content
    const finalAnalysis = await LLMService.retryAnalysis(`
      Analyze this code and Salesforce data with the given prompt:
      
      Code: ${content}
      Prompt: ${prompt}
      Salesforce Data: ${JSON.stringify(salesforceData)}
      
      Provide a comprehensive analysis incorporating both the code context and Salesforce data.
    `);

    res.json({
      analysis: finalAnalysis,
      salesforceData: salesforceData,
    });
  } catch (error) {
    console.error("Custom analysis error:", error);
    res.status(500).json({ error: "Custom analysis failed" });
  }
});

async function fetchRepoContents(repoName, authHeader, path = "") {
  console.log("Fetching repository contents for path:", path);

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoName}/contents/${path}`,
      {
        headers: {
          Authorization: authHeader,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching repo contents:", error);
    throw new Error(`Failed to fetch repository contents: ${error.message}`);
  }
}

async function getSalesforceFiles(contents, authHeader) {
  console.log("Filtering files for Salesforce extensions...");
  const salesforceExtensions = [
    ".cls",
    ".trigger",
    ".page",
    ".component",
    ".js",
    ".html",
    ".cmp",
  ];
  return contents.filter((item) =>
    salesforceExtensions.some(
      (ext) =>
        item.name.toLowerCase().endsWith(ext) &&
        !item.name.endsWith("-meta.xml")
    )
  );
}

function getFileType(fileName) {
  const extensions = {
    ".cls": "apex",
    ".trigger": "apex",
    ".page": "visualforce",
    ".component": "visualforce",
    ".js": "javascript",
    ".html": "lwc",
    ".cmp": "aura",
  };
  const ext = "." + fileName.split(".").pop().toLowerCase();
  console.log(
    `Determined file type for ${fileName}: ${extensions[ext] || "unknown"}`
  );
  return extensions[ext] || "unknown";
}

function createAnalysisPrompt(type, data) {
  if (type === "codebase") {
    return `As a development expert, analyze this codebase for a new developer onboarding:
  
  Files to analyze:
  ${data
        .map(
          (file) => `
  File: ${file.fileName}
  Type: ${file.fileType}
  Analysis: ${file.analysis}
  `
        )
        .join("\n")}
  
Please provide a comprehensive overview covering:
1. Overall Architecture
2. Code Quality
3. Performance Considerations
4. Security Analysis
5. Best Practices
6. Recommendations for Improvement`;
  }
  return "";
}

async function generateDocumentation(fileAnalysis) {
  const docTemplate = {
    setup: {
      environment: [],
      dependencies: [],
      configurations: [],
    },
    workflows: {
      development: [],
      testing: [],
      deployment: [],
    },
    architecture: {
      components: [],
      integrations: [],
      dataFlow: [],
    },
    businessLogic: {
      processes: [],
      rules: [],
      validations: [],
    },
  };

  // Generate structured documentation
  const documentation = await LLMService.retryAnalysis(`
      Based on the following codebase analysis, generate developer onboarding documentation:
      ${JSON.stringify(fileAnalysis)}
      
      Focus on:
      1. Setup instructions
      2. Development workflows
      3. Architecture overview
      4. Business logic documentation
    `);

  return {
    ...docTemplate,
    generatedDocs: documentation,
  };
}

function categorizeAnalysis(fileAnalysis, ktAnalysis) {
  // Categorize file-level analysis into different KT sections
  const categories = {
    SETUP: ["configuration", "environment", "dependency"],
    WORKFLOW: ["process", "flow", "pipeline"],
    BUSINESS: ["rule", "validation", "calculation"],
    INTEGRATION: ["api", "service", "connection"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (
      keywords.some((keyword) =>
        fileAnalysis.analysis.toLowerCase().includes(keyword)
      )
    ) {
      ktAnalysis[category.toLowerCase()].push(fileAnalysis);
    }
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
