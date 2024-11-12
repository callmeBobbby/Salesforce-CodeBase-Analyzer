import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { RepositoryCard } from './components/RepositoryCard';
import { AnalysisResults } from './components/AnalysisResults';
import { FileExplorer } from './components/FileExplorer';
import { GithubLogin } from './components/GithubLogin';
import { Callback } from './components/Callback';
import useAuthStore from './store/authStore';
import { useAnalysisStore } from './store/analysisStore';
import { CodeReview, CodeExplanation, DetectedIssue } from './components/AnalysisDetails';
import { AnalysisDetails } from './components/AnalysisDetails';
import { Analysis } from './components/AnalysisResults';
import { FileViewerWithAnalysis } from './components/FileViewerWithAnalysis';

interface GitHubRepository {
  id: number;
  name: string;
  description: string | null;
  stargazers_count: number;
  default_branch: string;
  owner: {
    login: string;
  };
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

interface RepoType {
  branches: string[];
  id: number;
  name: string;
  description: string | null;
  stars: number;
  default_branch: string;
  owner: {
    login: string;
  };
  full_name: string;
}

export const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/" element={<MainApp />} />
      </Routes>
    </Router>
  );
};

const MainApp = () => {
  const { isAuthenticated, token, logout } = useAuthStore();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    results: Analysis[];
    files: FileNode[];
    codeReview: CodeReview;
    codeExplanation: CodeExplanation;
    issues: DetectedIssue[];
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string; analysis: string } | null>(null);

  useEffect(() => {
    const validateTokenAndFetchRepos = async () => {
      if (!token) return;

      setLoading(true);
      try {
        // First validate token
        const validateRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
        });

        if (!validateRes.ok) {
          logout();
          return;
        }

        // Then fetch repositories
        const reposRes = await fetch('https://api.github.com/user/repos', {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
        });

        if (!reposRes.ok) {
          throw new Error(`GitHub API error: ${reposRes.status}`);
        }

        const data = await reposRes.json();
        setRepositories(data);
      } catch (err) {
        console.error('Failed to fetch repositories:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    validateTokenAndFetchRepos();
  }, [token, logout]);

  const handleAnalysisSelect = async (analysis: any) => {
    try {
      setSelectedAnalysis(null);
      setSelectedFile(null);

      const formattedFiles: FileNode[] = analysis.analyses.map((item: any) => ({
        name: item.fileName,
        type: 'file',
        path: `${analysis.repository}/${item.fileName}`,
      }));

      setSelectedAnalysis({
        results: analysis.analyses.map((item: any) => ({
          type: 'success',
          message: item.analysis,
          file: item.fileName
        })),
        files: formattedFiles,
        codeReview: {
          issues: analysis.analyses.map((item: any) => ({
            severity: 'medium',
            file: item.fileName,
            description: item.analysis,
            suggestion: ''
          }))
        },
        codeExplanation: {
          summary: analysis.overview,
          keyComponents: analysis.analyses.map((item: any) => ({
            name: item.fileName,
            purpose: `Analysis of ${item.fileType} file`
          }))
        },
        issues: analysis.analyses.map((item: any) => ({
          type: 'improvement',
          description: item.analysis,
          solution: '',
          priority: 'medium'
        }))
      });

      if (analysis.analyses.length > 0) {
        setSelectedFile({
          name: analysis.analyses[0].fileName,
          content: '',
          analysis: analysis.analyses[0].analysis
        });
      }
    } catch (error) {
      console.error('Failed to process analysis:', error);
    }
  };


  const handleFileSelect = async (file: { name: string; path: string }) => {
    try {
      const response = await fetch('http://localhost:5000/api/file-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${token}`,
        },
        body: JSON.stringify({ path: file.path })
      });

      if (!response.ok) {
        throw new Error(`Error fetching file content: ${response.statusText}`);
      }

      const data = await response.json();

      // Find the analysis for this file from selectedAnalysis
      const fileAnalysis = selectedAnalysis?.results.find(
        result => result.file === file.name
      )?.message || '';

      setSelectedFile({
        name: file.name,
        content: data.content,
        analysis: fileAnalysis
      });
    } catch (error) {
      console.error("Error fetching file content:", error);
    }
  };



  if (!isAuthenticated || !token) {
    return <GithubLogin />;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchBar onSearch={(query) => console.log('Search:', query)} />

        {selectedAnalysis && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* File Explorer */}
              <div className="md:col-span-1 bg-white rounded-lg shadow">
                <FileExplorer
                  files={selectedAnalysis.files}
                  onFileSelect={handleFileSelect}
                />
              </div>

              {/* File Viewer */}
              <div className="md:col-span-1 bg-white rounded-lg shadow">
                {selectedFile && (
                  <FileViewerWithAnalysis files={[selectedFile]} />
                )}
              </div>

              {/* Analysis Details */}
              <div className="md:col-span-1 bg-white rounded-lg shadow">
                <AnalysisDetails analysis={selectedAnalysis} />
                {/* <AnalysisResults results={selectedAnalysis.results} /> */}
              </div>
            </div>
          </div>
        )}



        {/* Repository Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {Array.isArray(repositories) && repositories.map((repo) => (
            <RepositoryCard
              key={repo.id}
              repo={{
                name: repo.name,
                description: repo.description || '',
                stars: repo.stargazers_count,
                default_branch: repo.default_branch,
                full_name: `${repo.owner.login}/${repo.name}`
              }}
              onSelect={handleAnalysisSelect}
            />
          ))}
        </div>
      </main>
    </div>
  );
};
