import { useState, useEffect } from 'react';
import { Header } from './Header';

interface ConnectedApp {
    name: string;
    description: string;
    status: 'connected' | 'not_connected';
    icon?: string;
}

// async function generateCodeChallenge() {
//     // Generate a random string for the code verifier (43-128 characters)
//     const codeVerifier = generateRandomString(96)
//         .replace(/[^A-Za-z0-9\-._~]/g, '') // Remove any invalid characters
//         .replace(/=+$/, ''); // Remove padding equals signs

//     // Create the code challenge using base64URL encoding
//     const encoder = new TextEncoder();
//     const data = encoder.encode(codeVerifier);
//     const digest = await window.crypto.subtle.digest('SHA-256', data);
//     const codeChallenge = base64URLEncode(new Uint8Array(digest))
//         .replace(/=+$/, ''); // Remove padding equals signs

//     return { codeVerifier, codeChallenge };
// }

async function generateCodeChallenge() {
    // Use a more restricted charset that's guaranteed to work with PKCE
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // Generate a random string of 64 characters
    const array = new Uint8Array(64);
    window.crypto.getRandomValues(array);
    const codeVerifier = Array.from(array)
        .map(x => charset[x % charset.length])
        .join('');

    // Create SHA-256 hash of the code verifier
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);

    // Convert the hash to base64URL format
    const base64Challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Log for debugging
    console.log('PKCE Debug:', {
        verifier: codeVerifier,
        verifierLength: codeVerifier.length,
        challenge: base64Challenge,
        challengeLength: base64Challenge.length
    });

    return {
        codeVerifier,
        codeChallenge: base64Challenge
    };
}

// function generateRandomString(length: number): string {
//     const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
//     const array = new Uint8Array(length);
//     window.crypto.getRandomValues(array);
//     return Array.from(array)
//         .map(x => charset[x % charset.length])
//         .join('');
// }

// Update the base64URLEncode function
// function base64URLEncode(buffer: Uint8Array): string {
//     const base64 = btoa(String.fromCharCode.apply(null, [...buffer]));
//     return base64
//         .replace(/\+/g, '-')
//         .replace(/\//g, '_')
//         .replace(/=+$/, '');
// }


export const Settings = () => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState(() => {
        // Get theme from localStorage or default to 'light'
        return localStorage.getItem('theme') || 'light';
    });

    useEffect(() => {
        const sfConnection = localStorage.getItem('salesforceConnection');
        if (sfConnection) {
            const connection = JSON.parse(sfConnection);
            setConnectionStatus(prev => ({
                ...prev,
                Salesforce: connection.status === 'connected'
            }));
        }
    }, []);

    const connectedApps: ConnectedApp[] = [

        {
            name: 'Salesforce',
            description: 'Connect with Salesforce',
            status: connectionStatus.Salesforce ? 'connected' : 'not_connected' // Update status based on connection
        }, {
            name: 'Google Drive',
            description: 'Upload Google Docs, Sheets, Slides and other files.',
            status: 'not_connected'
        },
        {
            name: 'Microsoft OneDrive (personal)',
            description: 'Upload Microsoft Word, Excel, PowerPoint and other files.',
            status: 'not_connected'
        },
        {
            name: 'Microsoft OneDrive (work/school)',
            description: 'Upload Microsoft Word, Excel, PowerPoint, and other files, including those from SharePoint sites.',
            status: 'not_connected'
        }
    ];

    useEffect(() => {
        // Apply theme to document when it changes
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleOptionClick = (option: string) => {
        setSelectedOption(option);
    };

    const fetchAccounts = async () => {
        try {
            const salesforceConnection = localStorage.getItem('salesforceConnection');
            if (!salesforceConnection) {
                console.error('Not connected to Salesforce');
                return;
            }

            const { access_token } = JSON.parse(salesforceConnection);

            const response = await fetch('http://localhost:5000/api/accounts', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}` // Pass the access token in the header
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch accounts');
            }

            const accounts = await response.json();
            console.log('Fetched accounts:', accounts);
            // You can now display the accounts in your UI or handle them as needed
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };
    const handleConnect = async (appName: string) => {
        if (appName === 'Salesforce') {
            // Check if we're disconnecting
            if (connectionStatus.Salesforce) {
                try {
                    // Handle disconnect
                    localStorage.removeItem('salesforceConnection');
                    sessionStorage.removeItem('sf_code_verifier');
                    sessionStorage.removeItem('salesforceAuthState');
                    setConnectionStatus(prev => ({ ...prev, Salesforce: false }));

                    // Notify server about disconnection
                    await fetch('http://localhost:5000/api/auth/salesforce/disconnect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    return; // Exit early
                } catch (error) {
                    console.error('Disconnect error:', error);
                    setError('Failed to disconnect from Salesforce');
                }
                return;
            }

            try {
                // Clear only specific items instead of all session storage
                sessionStorage.removeItem('sf_code_verifier');
                sessionStorage.removeItem('salesforceAuthState');
                localStorage.removeItem('salesforceConnection');

                setConnectionStatus(prev => ({ ...prev, Salesforce: false }));

                const { codeVerifier, codeChallenge } = await generateCodeChallenge();

                // Store code verifier
                sessionStorage.setItem('sf_code_verifier', codeVerifier);

                console.log('Auth initialization:', {
                    verifierLength: codeVerifier.length,
                    challengeLength: codeChallenge.length,
                    verifierPreview: codeVerifier.substring(0, 10) + '...'
                });

                const response = await fetch('http://localhost:5000/api/auth/salesforce', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    },
                    body: JSON.stringify({
                        codeChallenge,
                        timestamp: new Date().getTime()
                    })
                });

                const data = await response.json();
                if (!data.authUrl) throw new Error('No authorization URL received');

                // Store state
                sessionStorage.setItem('salesforceAuthState', data.state);

                // Log stored values
                console.log('Stored values:', {
                    state: data.state,
                    verifierLength: codeVerifier.length
                });

                // Navigate to Salesforce auth URL
                window.location.href = data.authUrl;
            } catch (error) {
                setError('Failed to connect to Salesforce');
                console.error('Connection error:', error);
            }
        }
    };


    // Add useEffect to handle connection status
    useEffect(() => {
        const sfConnection = localStorage.getItem('salesforceConnection');
        if (sfConnection) {
            const connection = JSON.parse(sfConnection);
            setConnectionStatus(prev => ({
                ...prev,
                Salesforce: connection.status === 'connected'
            }));
        }
    }, []);

    return (
        <>
            <Header />
            <div className="max-w-4xl mx-auto mt-8 p-6 bg-white shadow-lg rounded-lg">
                <h2 className="text-2xl font-bold mb-6">Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Navigation */}
                    <div>
                        <h3 className="font-semibold text-gray-700">General</h3>
                        <ul className="space-y-2 mt-2">
                            {[
                                'Personalization',
                                'Connected apps',
                            ].map((item) => (
                                <li
                                    key={item}
                                    className={`px-4 py-2 rounded-md cursor-pointer ${selectedOption === item
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'hover:bg-gray-100'
                                        }`}
                                    onClick={() => handleOptionClick(item)}
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Content Area */}
                    <div className="col-span-1">
                        {selectedOption === 'Personalization' && (
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-4">Theme Settings</h3>
                                <div className="space-y-4">
                                    {['light', 'dark'].map((themeOption) => (
                                        <div
                                            key={themeOption}
                                            className={`flex items-center p-3 rounded-lg cursor-pointer ${theme === themeOption
                                                ? 'bg-indigo-100 border-2 border-indigo-500'
                                                : 'border-2 border-gray-200 hover:border-indigo-300'
                                                }`}
                                            onClick={() => setTheme(themeOption)}
                                        >
                                            <div className="flex-1">
                                                <h4 className="font-medium capitalize">{themeOption} Mode</h4>
                                                <p className="text-sm text-gray-500">
                                                    {themeOption === 'light'
                                                        ? 'Default theme with light background'
                                                        : 'Dark theme for low-light environments'}
                                                </p>
                                            </div>
                                            {theme === themeOption && (
                                                <span className="text-indigo-600">✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedOption === 'Connected apps' && (
                            <div>
                                <button onClick={fetchAccounts} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                                    Fetch Accounts
                                </button>

                                <h3 className="font-semibold text-gray-700 mb-4">Connected Applications</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Connect apps to access their information in SierraAI.
                                </p>
                                <div className="space-y-4">

                                    {connectedApps.map((app) => (
                                        <div
                                            key={app.name}
                                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium">{app.name}</h4>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {app.description}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleConnect(app.name)}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    {app.status === 'connected' ? 'Disconnect' : 'Connect'} {/* Change button text based on status */}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {error && <div className="text-red-500">{error}</div>}
        </>
    );
};
