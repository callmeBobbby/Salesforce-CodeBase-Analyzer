import React, { useState } from 'react';
import { Github as GithubIcon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface User {
  avatar_url: string;
  login: string;
}

export const Header = () => {
  const { logout, user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleOptionClick = (option: string) => {
    setShowModal(false);
    if (option === 'Logout') {
      logout();
    } else if (option === 'Settings') {
      navigate('/settings');
    } else {
      navigate(`/${option.toLowerCase()}`);
    }
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Left Side: Logo */}
          <div className="flex items-center">
            <button
              className="flex items-center focus:outline-none hover:bg-gray-100 p-2 rounded-md"
              onClick={() => navigate('/')}
              aria-label="Go to home"
            >
              <GithubIcon className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">SierraAI</h1>
            </button>
          </div>

          {/* Right Side: Profile Picture with Modal */}
          <div className="relative">
            {user && (
              <button
                className="flex items-center focus:outline-none hover:bg-gray-100 p-2 rounded-md"
                onClick={() => setShowModal((prev) => !prev)}
                aria-label="Toggle menu"
              >
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-8 w-8 rounded-full"
                />
              </button>
            )}
            {showModal && (
              <div className="absolute top-12 right-0 bg-white shadow-lg rounded-md w-48">
                <ul className="py-2">
                  <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleOptionClick('Profile')}
                  >
                    Profile
                  </li>
                  <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleOptionClick('Settings')}
                  >
                    Settings
                  </li>
                  <li
                    className="px-4 py-2 text-red-600 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleOptionClick('Logout')}
                  >
                    Logout
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
