import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

interface User {
  id: number;
  login: string;
  avatar_url: string;
  // Add other user properties as needed
}

interface AuthState {
  user: User;
  setUser: (user: User) => void;
  login: (token: string) => void;
  // ... other state properties and methods
}

export function Callback() {
  const { login, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) return;

        // Authenticate with backend
        const authResponse = await fetch('http://localhost:5000/api/auth/github', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const authData = await authResponse.json();
        if (authData.access_token) {
          console.log('Token type:', authData.token_type);
          console.log('Token received:', authData.access_token);
          login(authData.access_token);

          // Fetch user data
          const userResponse = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${authData.access_token}`,
            },
          });

          const userData = await userResponse.json();
          setUser(userData); // Store user data in authStore
          navigate('/');
        }
      } catch (error) {
        console.error('Authentication error:', error);
      }
    };

    handleCallback();
  }, [login, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Authenticating...</p>
      </div>
    </div>
  );
}
