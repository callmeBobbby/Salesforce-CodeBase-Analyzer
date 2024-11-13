import React, { useState } from 'react';
import { FolderGit2, GitBranch, Star, Loader, Book } from 'lucide-react';
import useAuthStore from '../store/authStore';

// interface RepositoryCardProps {
//   repo: {
//     name: string;
//     full_name: string;
//     description: string;
//     stars: number;
//     default_branch: string;
//   };
//   onSelect: (analysis: any) => void;
// }
interface RepositoryCardProps {
  repo: {
    name: string;
    full_name: string;
    description: string;
    stars: number;
    default_branch: string;
  };
  onSelect: (analysis: any) => void;
  onKTSelect: (ktData: any) => void;
}

export function RepositoryCard({ repo, onSelect }: RepositoryCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingKT, setIsGeneratingKT] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const handleKTAnalyze = async () => {
    setIsGeneratingKT(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/analyze/kt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${token}`
        },
        body: JSON.stringify({ repoName: repo.full_name })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const events = decoder.decode(value).split('\n\n');
        for (const event of events) {
          if (!event.trim()) continue;

          try {
            const eventLines = event.split('\n');
            const eventType = eventLines[0].replace('event: ', '');
            const eventData = JSON.parse(eventLines[1].replace('data: ', '')).data;

            if (eventType === 'complete') {
              onSelect(eventData);
            }
          } catch (error) {
            console.error('Error parsing KT SSE event:', error);
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'KT Analysis failed');
    } finally {
      setIsGeneratingKT(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${token}`
        },
        body: JSON.stringify({ repoName: repo.full_name })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const events = decoder.decode(value).split('\n\n');
        for (const event of events) {
          if (!event.trim()) continue;

          try {
            const eventLines = event.split('\n');
            const eventType = eventLines[0].replace('event: ', '');
            const eventData = JSON.parse(eventLines[1].replace('data: ', '')).data;

            console.log('Received event:', eventType, eventData);

            if (eventType === 'complete') {
              onSelect(eventData);
            } else if (eventType === 'error') {
              setError(eventData.message || 'Analysis failed');
            }
          } catch (error) {
            console.error('Error parsing SSE event:', error);
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center">
        <FolderGit2 className="h-6 w-6 text-indigo-600" />
        <h3 className="ml-2 text-lg font-semibold text-gray-900">{repo.name}</h3>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader className="animate-spin h-4 w-4 mr-2 inline" />
              Analyzing...
            </>
          ) : (
            'Analyze'
          )}
        </button>
        <button
          onClick={handleKTAnalyze}
          disabled={isGeneratingKT}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 flex items-center"
        >
          {isGeneratingKT ? (
            <>
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Generating KT...
            </>
          ) : (
            <>
              <Book className="h-4 w-4 mr-2" />
              Generate KT Docs
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-gray-600">{repo.description}</p>
      <div className="mt-4 flex items-center space-x-4">
        <div className="flex items-center text-gray-500">
          <Star className="h-4 w-4 mr-1" />
          <span>{repo.stars}</span>
        </div>
        <div className="flex items-center text-gray-500">
          <GitBranch className="h-4 w-4 mr-1" />
          <span>{repo.default_branch}</span>
        </div>
      </div>
      {error && (
        <p className="text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}