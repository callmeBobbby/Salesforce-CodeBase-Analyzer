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
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';


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
  const [isAnalysisCollapsed, setIsAnalysisCollapsed] = useState(true); // Collapsible state for AnalysisDetails
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

  const toggleAnalysisCollapse = () => {
    setIsAnalysisCollapsed(!isAnalysisCollapsed);
  };

  const handleAnalysisSelect = async (analysis: any) => {
    try {
      console.log('Received analysis:', analysis); // Add logging
      setSelectedAnalysis(null);
      setSelectedFile(null);

      const formattedFiles: FileNode[] = analysis.analyses.map((item: any) => ({
        name: item.fileName,
        type: 'file',
        path: `${analysis.repository}/${item.fileName}`,
      }));

      // First set the analysis
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

      // Then set the initial file with its analysis
      if (analysis.analyses.length > 0) {
        const initialFile = analysis.analyses[0];
        setSelectedFile({
          name: initialFile.fileName,
          content: '', // Content will be fetched when needed
          analysis: initialFile.analysis
        });
      }
    } catch (error) {
      console.error('Failed to process analysis:', error);
    }
  };


  const [ktDocumentation, setKTDocumentation] = useState(null);

  const handleKTSelect = (ktData: any) => {
    try {
      setSelectedAnalysis(null);
      setSelectedFile(null);

      const formattedFiles: FileNode[] = ktData.analyses.map((item: any) => ({
        name: item.fileName,
        type: 'file',
        path: `${ktData.repository}/${item.fileName}`,
      }));

      setSelectedAnalysis({
        results: ktData.analyses.map((item: any) => ({
          type: 'success',
          message: item.analysis,
          file: item.fileName
        })),
        files: formattedFiles,
        codeReview: {
          issues: ktData.analyses.map((item: any) => ({
            severity: 'medium',
            file: item.fileName,
            description: item.analysis,
            suggestion: ''
          }))
        },
        codeExplanation: {
          summary: ktData.documentation.generatedDocs,
          keyComponents: ktData.analyses.map((item: any) => ({
            name: item.fileName,
            purpose: `Analysis of ${item.fileType} file`
          }))
        },
        issues: ktData.analyses.map((item: any) => ({
          type: 'improvement',
          description: item.analysis,
          solution: '',
          priority: 'medium'
        }))
      });

      setKTDocumentation(ktData.documentation);
    } catch (error) {
      console.error('Failed to process KT analysis:', error);
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

      // Find the matching analysis from selectedAnalysis.codeReview.issues
      const fileAnalysis = selectedAnalysis?.codeReview.issues.find(
        issue => issue.file === file.name
      );

      setSelectedFile({
        name: file.name,
        content: data.content,
        analysis: fileAnalysis?.description || 'No analysis available for this file'
      });
    } catch (error) {
      console.error("Error fetching file content:", error);
    }
  };

  const handleCustomAnalysis = async (fileName: string, prompt: string) => {
    try {
      const fileContent = selectedFile?.content || '';
      const response = await fetch('http://localhost:5000/api/analyze/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${token}`,
        },
        body: JSON.stringify({
          fileName,
          content: fileContent,
          prompt
        })
      });

      if (!response.ok) {
        throw new Error('Custom analysis failed');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Custom analysis error:', error);
      return null;
    }
  };



  const handleContentUpdate = async (fileName: string, newContent: string) => {
    // Here you could add logic to save the updated content
    console.log(`Updating content for ${fileName}`);
    // You might want to add an API endpoint to save the changes
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
      <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-4 py-8">
        <SearchBar onSearch={(query) => console.log('Search:', query)} />

        {selectedAnalysis && (
          <div className="mb-8 relative">
            <div className="grid grid-cols-12 gap-4">
              {/* File Explorer */}
              <div className="col-span-12 md:col-span-2 bg-white rounded-lg shadow p-4 overflow-hidden h-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Files</h3>
                <FileExplorer files={selectedAnalysis.files} onFileSelect={handleFileSelect} />
              </div>

              {/* File Viewer */}
              <div
                className={`transition-all duration-300 bg-white rounded-lg shadow ${isAnalysisCollapsed ? 'col-span-10' : 'col-span-6'} h-full`}
              >
                {selectedFile && (
                  <FileViewerWithAnalysis
                    files={[selectedFile]}
                    onContentUpdate={handleContentUpdate}
                    onCustomAnalysis={handleCustomAnalysis}
                  />
                )}
              </div>

              {/* Analysis Details Sidebar */}
              {!isAnalysisCollapsed && (
                <div
                  className="transition-all duration-300 col-span-4 bg-white rounded-lg shadow h-full relative"
                >
                  <div className="h-full overflow-y-auto p-4">
                    {/* <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Analysis Details</h3>
                    </div> */}
                    <AnalysisDetails analysis={selectedAnalysis} />
                  </div>
                </div>
              )}
            </div>

            {/* Toggle Button Fixed to the Right */}
            <button
              onClick={toggleAnalysisCollapse}
              className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-lg shadow-lg hover:bg-gray-100 z-10"
              aria-label={isAnalysisCollapsed ? 'Expand Analysis' : 'Collapse Analysis'}
            >
              {isAnalysisCollapsed ? (
                <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
              ) : (
                <ChevronRightIcon className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        )}

        {/* Repository Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 h-full">
          {Array.isArray(repositories) &&
            repositories.map((repo) => (
              <div className="h-full">
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
                  onKTSelect={handleKTSelect}
                />
              </div>
            ))}
        </div>
      </main>
    </div>
  );






};
