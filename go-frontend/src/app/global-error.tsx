'use client';

import React from 'react';

/**
 * Global Error page for application-level errors
 * Professional design for critical system failures
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Global Application Error:', error);
  }, [error]);

  return (
    <html>
      <body className="bg-gray-900 text-white">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            {/* Critical Error Icon */}
            <div className="mb-8">
              <div className="mx-auto w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="w-20 h-1 bg-red-600 mx-auto rounded-full animate-pulse"></div>
            </div>

            {/* Error Message */}
            <div className="mb-8 space-y-3">
              <h1 className="text-2xl font-semibold text-white">
                System Error
              </h1>
              <p className="text-gray-400 leading-relaxed">
                A critical error occurred. The application needs to be restarted.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={reset}
                className="block w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Restart Application
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }}
                className="block w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors duration-200"
              >
                Reset & Reload
              </button>
            </div>

            {/* Error Details for Development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-3 bg-red-900/20 border border-red-800 rounded text-left">
                <p className="text-red-300 text-sm font-mono break-all max-h-32 overflow-auto">
                  {error.stack || error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}