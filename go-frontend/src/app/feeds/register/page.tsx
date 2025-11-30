'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DynamicRegisterFeedForm from '@/components/DynamicRegisterFeedForm';

export default function RegisterFeedPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <DynamicRegisterFeedForm />
      </div>
    </ProtectedRoute>
  );
}
