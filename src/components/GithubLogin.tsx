import React from 'react';
import { Github } from 'lucide-react';
import useAuthStore from '../store/authStore';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/callback';

export function GithubLogin() {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo,read:user,user:email`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <Github className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            SierraAI
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your GitHub account to analyze your Salesforce repositories
          </p>
        </div>
        <div>
          <a
            href={authUrl}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Github className="mr-2 h-5 w-5" />
            Connect with GitHub
          </a>
        </div>
      </div>
    </div>
  );
}