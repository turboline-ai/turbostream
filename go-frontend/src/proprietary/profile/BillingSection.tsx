'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TokenPurchaseSection from './TokenPurchaseSection';

const BillingSection: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading billing information...</p>
      </div>
    );
  }

  const tokenUsage = user.tokenUsage || { tokensUsed: 0, limit: 1000000, currentMonth: new Date().toISOString() };
  const usagePercentage = (tokenUsage.tokensUsed / tokenUsage.limit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Billing & Usage</h1>
        <p className="text-gray-400 mt-2">Manage your subscription and monitor token usage</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg p-6 border border-[#D7D9C4]/40 bg-gray-900/70 backdrop-blur-sm">
        <div className="rounded-xl p-6 btn-milkyway shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl text-[#0b132b]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 600 }}>
                Free Plan
              </h2>
              <p className="mt-1" style={{ color: '#0b132b', fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}>
                Perfect for getting started
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl" style={{ color: '#0b132b', fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 600 }}>
                $0
              </p>
              <p className="text-sm" style={{ color: '#0b132b', fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}>
                per month
              </p>
            </div>
          </div>
          <div className="mt-6">
            <button
              className="w-full py-3 rounded-lg bg-[#0b132b] text-white font-medium hover:opacity-90 transition"
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>

      {/* Token Usage */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Token Usage This Month</h2>
        
        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {tokenUsage.tokensUsed.toLocaleString()} / {tokenUsage.limit.toLocaleString()} tokens
            </span>
            <span className="text-gray-400">{usagePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Used</p>
            <p className="text-white text-xl font-semibold">{tokenUsage.tokensUsed.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Remaining</p>
            <p className="text-white text-xl font-semibold">
              {(tokenUsage.limit - tokenUsage.tokensUsed).toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Limit</p>
            <p className="text-white text-xl font-semibold">{tokenUsage.limit.toLocaleString()}</p>
          </div>
        </div>

        {/* Warning */}
        {usagePercentage > 80 && (
          <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-yellow-400 font-medium">High Usage Alert</p>
                <p className="text-yellow-300 text-sm mt-1">
                  You've used {usagePercentage.toFixed(0)}% of your monthly token limit. Consider upgrading to avoid service interruption.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Token Purchase Section */}
      <TokenPurchaseSection />

      {/* Available Plans */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-2">Free</h3>
            <p className="text-3xl font-bold text-white mb-1">$0</p>
            <p className="text-gray-400 text-sm mb-4">per month</p>
            <ul className="space-y-2 mb-4">
              <li className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                1M tokens/month
              </li>
              <li className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                3 feeds max
              </li>
              <li className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Community support
              </li>
            </ul>
            <button className="w-full py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed" disabled>
              Current Plan
            </button>
          </div>

          {/* Pro Plan - Commented out until pro strategy is finalized */}
          {/* <div
            className="rounded-lg p-4 border-2 relative shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(242,243,227,0.25) 0%, rgba(191,193,169,0.15) 45%, rgba(11,19,43,0.85) 100%)',
              borderColor: 'rgba(191,193,169,0.45)'
            }}
          >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#D7D9C4', color: '#0b132b', fontFamily: 'Inter, ui-sans-serif, system-ui' }}
              >
                POPULAR
              </span>
            </div>
            <h3 className="text-white font-semibold mb-2">Pro</h3>
            <p className="text-3xl font-bold text-white mb-1">$29</p>
            <p className="text-sm mb-4" style={{ color: '#D7D9C4', fontFamily: 'Inter, ui-sans-serif, system-ui' }}>per month</p>
            <ul className="space-y-2 mb-4">
              <li className="text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#D7D9C4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                10M tokens/month
              </li>
              <li className="text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#D7D9C4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited feeds
              </li>
              <li className="text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#D7D9C4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Priority support
              </li>
              <li className="text-white text-sm flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#D7D9C4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Advanced analytics
              </li>
            </ul>
            <button
              className="w-full py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3]"
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}
            >
              Upgrade to Pro
            </button>
          </div> */}

          {/* Enterprise Plan */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-2">Enterprise</h3>
            <p className="text-3xl font-bold text-white mb-1">Custom</p>
            <p className="text-gray-400 text-sm mb-4">contact us</p>
            <ul className="space-y-2 mb-4">
              <li className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited tokens
              </li>
              <li className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited feeds
              </li>
              <li className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                24/7 dedicated support
              </li>
              <li className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                VPS Hosting
              </li>
            </ul>
            <button className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Payment History</h2>
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400">No payment history yet</p>
          <p className="text-gray-500 text-sm mt-1">Your payment history will appear here once you upgrade</p>
        </div>
      </div>
    </div>
  );
};

export default BillingSection;
