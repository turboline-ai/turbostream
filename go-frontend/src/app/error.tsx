'use client';

import React from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Custom Error page for runtime errors (500+ errors)
 * Professional design with subtle animations
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  React.useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="w-16 h-1 bg-red-600 mx-auto rounded-full animate-pulse"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8 space-y-3">
          <h1 className="text-2xl font-semibold text-white">
            Something Went Wrong
          </h1>
          <p className="text-gray-400 leading-relaxed">
            We encountered an unexpected error. Please try again or return to the dashboard.
          </p>
          
          {isDevelopment && error.message && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-left">
              <p className="text-red-300 text-sm font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-red-400 text-xs mt-1">
                  ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="block w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors duration-200"
          >
            Return to Dashboard
          </Link>
        </div>

        {/* Recovery Options */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-sm mb-3">Recovery Options</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            >
              Refresh
            </button>
            <Link
              href="/api-docs"
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors text-center"
            >
              Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}