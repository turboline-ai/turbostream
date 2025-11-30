'use client';

import React, { useState, useEffect } from 'react';
import { TokenPackage, VoucherValidation } from '@/types/tokens';

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

function TokenPurchaseModal({ isOpen, onClose, onPurchaseComplete }: TokenPurchaseModalProps) {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherValidation, setVoucherValidation] = useState<VoucherValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalPrice, setFinalPrice] = useState(0);
  const [tokensToAdd, setTokensToAdd] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPackage) {
      calculatePrice();
    }
  }, [selectedPackage, voucherCode]);

  const loadPackages = async () => {
    try {
      const response = await fetch('/api/tokens/packages');
      const data = await response.json();
      if (data.success) {
        setPackages(data.packages);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const calculatePrice = async () => {
    if (!selectedPackage) return;
    
    try {
      const response = await fetch('/api/tokens/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          voucherCode: voucherCode || undefined
        })
      });

      const data = await response.json();
      if (data.success && data.calculation) {
        setFinalPrice(data.calculation.finalPrice);
        setTokensToAdd(data.calculation.tokensToAdd);
      }
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const validateVoucher = async () => {
    if (!voucherCode || !selectedPackage) {
      setVoucherValidation(null);
      return;
    }

    try {
      const response = await fetch('/api/tokens/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: voucherCode,
          packageId: selectedPackage.id,
          purchaseAmount: selectedPackage.price
        })
      });

      const data = await response.json();
      setVoucherValidation(data);
    } catch (error) {
      console.error('Error validating voucher:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateVoucher();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [voucherCode]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    // For now, just simulate a purchase
    // In real implementation, this would integrate with Stripe
    setTimeout(() => {
      setLoading(false);
      alert(`Purchase simulation: ${tokensToAdd.toLocaleString()} tokens for $${finalPrice}. Stripe integration needed to complete payment.`);
      onPurchaseComplete();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {selectedPackage ? 'Purchase Confirmation' : 'Choose Token Package'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!selectedPackage ? (
          <div className="space-y-6">
            {/* Voucher Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Voucher Code (Optional)
              </label>
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Enter voucher code"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              />
              {voucherValidation && (
                <div className={`mt-2 text-sm ${voucherValidation.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {voucherValidation.valid ? 
                    `✓ Valid voucher applied` : 
                    `✗ ${voucherValidation.error}`
                  }
                </div>
              )}
            </div>

            {/* Package Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative bg-gray-700 rounded-lg p-6 border cursor-pointer transition-all hover:bg-gray-600 ${
                    pkg.popular ? 'border-[#BFC1A9] ring-2 ring-[#D7D9C4]/20' : 'border-gray-600'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: '#D7D9C4', color: '#0b132b', fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">{pkg.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{pkg.description}</p>
                    
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-white">${pkg.price}</div>
                      <div className="text-gray-400 text-sm">{pkg.tokens.toLocaleString()} tokens</div>
                    </div>

                    {pkg.bonusPercentage && pkg.bonusPercentage > 0 && (
                      <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-medium mb-4">
                        +{pkg.bonusPercentage}% Bonus
                      </div>
                    )}

                    <button className="w-full py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] font-medium">
                      Select Package
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedPackage(null)}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: '#D7D9C4', fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to packages
            </button>

            {/* Purchase Summary */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Purchase Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Package:</span>
                  <span className="text-white font-semibold">{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Base Tokens:</span>
                  <span className="text-white">{selectedPackage.tokens.toLocaleString()}</span>
                </div>
                {selectedPackage.bonusPercentage && selectedPackage.bonusPercentage > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Bonus ({selectedPackage.bonusPercentage}%):</span>
                    <span className="text-green-400">+{Math.floor(selectedPackage.tokens * selectedPackage.bonusPercentage / 100).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Tokens:</span>
                  <span className="text-white font-semibold">{tokensToAdd.toLocaleString()}</span>
                </div>
                <hr className="border-gray-600" />
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-300">Total Price:</span>
                  <span className="text-white font-bold">${finalPrice}</span>
                </div>
              </div>

              {voucherCode && voucherValidation?.valid && (
                <div className="bg-green-900/20 border border-green-600 rounded-lg p-3 mb-6">
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Voucher "{voucherCode}" applied successfully!
                  </div>
                </div>
              )}

              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 font-medium">Demo Mode</p>
                    <p className="text-yellow-300 text-sm mt-1">
                      This is a demonstration. Stripe payment integration is needed for actual purchases.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="flex-1 py-3 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : `Purchase for $${finalPrice}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TokenPurchaseSection() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  return (
    <>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Buy More Tokens</h2>
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-6 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] font-medium"
          >
            Buy Tokens
          </button>
        </div>
        
        <p className="text-gray-400 text-sm">
          Need more tokens? Purchase additional tokens to continue using our AI analysis features. 
          Multiple packages available with bonus tokens included!
        </p>
      </div>

      <TokenPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseComplete={() => {
          // Refresh the page or update token usage
          window.location.reload();
        }}
      />
    </>
  );
}