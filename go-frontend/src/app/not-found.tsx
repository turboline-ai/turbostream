'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Custom 404 Not Found page
 * Professional design with subtle animations
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-7xl font-bold text-gray-300 opacity-50 select-none">
            404
          </h1>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full animate-pulse"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8 space-y-3">
          <h2 className="text-2xl font-semibold text-white">
            Page Not Found
          </h2>
          <p className="text-gray-400 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Return to Dashboard
          </Link>

          <Link
            href="/marketplace"
            className="block w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors duration-200"
          >
            Browse Marketplace
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-sm mb-3">Quick Links</p>
          <div className="flex justify-center space-x-6 text-sm">
            <Link href="/api-docs" className="text-blue-400 hover:text-blue-300 transition-colors">
              API Docs
            </Link>
            <Link href="/feeds/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              Register Feed
            </Link>
            <Link href="/subscriptions" className="text-blue-400 hover:text-blue-300 transition-colors">
              My Feeds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}