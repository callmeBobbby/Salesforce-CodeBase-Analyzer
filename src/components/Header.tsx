import React from 'react';
import { Github, LogOut } from 'lucide-react';
import useAuthStore from '../store/authStore';

// Define User interface
interface User {
  avatar_url: string;
  login: string;
}

// Define AuthState interface
interface AuthState {
  user: User;
  logout: () => void;
}

export const Header = () => {
  const { logout, user } = useAuthStore();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Github className="h-8 w-8 text-indigo-600" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">
              SierraAI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-8 w-8 rounded-full"
                />
                <span className="ml-2">{user.login}</span>
              </div>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};