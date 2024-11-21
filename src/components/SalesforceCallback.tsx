import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const SalesforceCallback = () => {
    const navigate = useNavigate();
    const processingRef = useRef(false);

    useEffect(() => {
        const handleCallback = async () => {
            if (processingRef.current) return;
            processingRef.current = true;

            try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                const savedState = sessionStorage.getItem('salesforceAuthState');
                const codeVerifier = sessionStorage.getItem('sf_code_verifier');

                // Enhanced debug logging
                console.log('Callback verification:', {
                    hasCode: !!code,
                    codeLength: code?.length,
                    state,
                    savedState,
                    hasVerifier: !!codeVerifier,
                    verifierLength: codeVerifier?.length,
                    verifier: codeVerifier // Remove in production
                });

                if (!code || !codeVerifier) {
                    throw new Error(`Missing parameters: ${!code ? 'code' : 'verifier'}`);
                }

                if (state !== savedState) {
                    throw new Error('State mismatch - possible CSRF attempt');
                }

                const response = await fetch('http://localhost:5000/api/auth/salesforce/callback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    },
                    body: JSON.stringify({
                        code,
                        codeVerifier,
                        state,
                        timestamp: new Date().getTime()
                    })
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error || 'Failed to connect');
                }

                if (!responseData.access_token) {
                    throw new Error('No access token received');
                }

                // Store connection data
                localStorage.setItem('salesforceConnection', JSON.stringify({
                    status: 'connected',
                    ...responseData,
                    timestamp: new Date().getTime()
                }));

                // Clear session storage only after successful connection
                sessionStorage.removeItem('sf_code_verifier');
                sessionStorage.removeItem('salesforceAuthState');

                // Redirect with success
                navigate('/settings?success=true');
            } catch (error: unknown) {
                console.error('OAuth callback error:', error);
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'An unknown error occurred';
                navigate(`/settings?error=${encodeURIComponent(errorMessage)}`);
            } finally {
                processingRef.current = false;
            }
        };

        // Execute callback handler
        handleCallback();
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4">Connecting to Salesforce...</p>
            </div>
        </div>
    );
};