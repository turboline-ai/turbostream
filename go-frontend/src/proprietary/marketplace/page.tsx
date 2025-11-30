'use client';

import { useState } from 'react';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import MarketplaceBrowser from './MarketplaceBrowser';
import AuthModal from '@/components/AuthModal';
import nebulaImage from '@/images/nebula.png';

export default function MarketplacePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <ProtectedRoute
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl mx-auto bg-gray-900/85 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="relative w-full md:w-1/2 h-56 md:h-auto">
              <Image
                src={nebulaImage}
                alt="Colorful galactic nebula"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="w-full md:w-1/2 flex flex-col justify-center text-center gap-6 p-10">
              <h1 className="text-3xl font-semibold text-white">Authentication Required</h1>
              <p className="text-gray-400">
                Please sign in to access the marketplace and subscribe to feeds.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3]"
              >
                Sign In / Register
              </button>
            </div>
          </div>
          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <MarketplaceBrowser />
      </div>
    </ProtectedRoute>
  );
}
