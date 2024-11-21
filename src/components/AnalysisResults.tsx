import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export interface Analysis {
  type: 'error' | 'warning' | 'success';
  message: string;
  file: string;
  line?: number;
}

// In AnalysisResults.tsx
export const AnalysisResults = ({ results }: { results: Analysis[] }) => {
  if (!results || results.length === 0) {
    return <div>No analysis results available</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
      {results.map((result, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg ${result.type === 'error'
            ? 'bg-red-50'
            : result.type === 'warning'
              ? 'bg-yellow-50'
              : 'bg-green-50'
            }`}
        >
          <div className="flex items-center">
            {result.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            {result.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {result.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{result.message}</p>
              <p className="text-sm text-gray-500">
                {result.file}
                {result.line && `:${result.line}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

