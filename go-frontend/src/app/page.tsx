"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AuthModal from "@/components/AuthModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "@/components/Dashboard";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import nebulaImage from "@/images/nebula.png";

export default function Home() {
  const { isConnected, registerUser } = useWebSocket();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Register user with WebSocket manager when authenticated and connected
  useEffect(() => {
    if (isAuthenticated && user && isConnected) {
      registerUser(user._id);
    }
  }, [isAuthenticated, user, isConnected, registerUser]);

  return (
    <ProtectedRoute
      fallback={
        <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
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
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center text-center gap-6 p-10">
              <h1
                className="text-4xl font-thin text-white leading-tight"
                style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}
              >
                Build agentic output
                <br />
                for your streaming data
              </h1>
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
      <Dashboard />
    </ProtectedRoute>
  );
}
