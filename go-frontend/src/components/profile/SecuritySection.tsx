'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { changePassword, generateTwoFactorSetup, enableTwoFactorAuth, disableTwoFactorAuth, getActiveSessions, getLoginActivity, getBackupCodesStatus, regenerateBackupCodes, terminateSession, terminateOtherSessions, SessionData, LoginActivityData, TwoFactorSetupData } from '@/utils/securityApi';

const SecuritySection: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loginActivity, setLoginActivity] = useState<LoginActivityData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // 2FA Setup States
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupData | null>(null);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableVerificationCode, setDisableVerificationCode] = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  
  // Backup Codes States
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [unusedBackupCodesCount, setUnusedBackupCodesCount] = useState(0);
  const [showRegenerateBackupCodes, setShowRegenerateBackupCodes] = useState(false);
  const [regenerateVerificationCode, setRegenerateVerificationCode] = useState('');
  
  // Session Management States
  const [terminatingSessions, setTerminatingSessions] = useState<Set<string>>(new Set());

  const twoFactorEnabled = user?.twoFactorEnabled || false;

  // Debug logging for state
  // console.log('Security Section State:', {
  //   twoFactorEnabled,
  //   showRegenerateBackupCodes,
  //   unusedBackupCodesCount,
  //   isSaving
  // });

  // Load security data on component mount
  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        setLoadingData(true);
        const [sessionsData, activityData] = await Promise.all([
          getActiveSessions(),
          getLoginActivity(10)
        ]);
        setSessions(sessionsData);
        setLoginActivity(activityData);
        
        // Load backup codes status if 2FA is enabled
        if (twoFactorEnabled) {
          try {
            const backupCodesStatus = await getBackupCodesStatus();
            setUnusedBackupCodesCount(backupCodesStatus.unusedCount);
          } catch (error) {
            console.error('Error loading backup codes status:', error);
          }
        }
      } catch (error) {
        console.error('Error loading security data:', error);
        setMessage({ type: 'error', text: 'Failed to load security data' });
      } finally {
        setLoadingData(false);
      }
    };

    if (user) {
      loadSecurityData();
    }
  }, [user, twoFactorEnabled]);

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long!' });
      return;
    }

    if (!passwordForm.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required!' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartTwoFactorSetup = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const setupData = await generateTwoFactorSetup();
      setTwoFactorSetup(setupData);
      setShowTwoFactorSetup(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to generate 2FA setup. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    if (!twoFactorSetup || !verificationCode) {
      setMessage({ type: 'error', text: 'Please enter the verification code from your authenticator app.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const generatedBackupCodes = await enableTwoFactorAuth(twoFactorSetup.secret, verificationCode);
      
      // Store backup codes to show them to the user
      setBackupCodes(generatedBackupCodes);
      
      // Refresh user data to get updated 2FA status
      await refreshUser();
      
      setMessage({ 
        type: 'success', 
        text: 'Two-factor authentication enabled successfully!' 
      });
      
      // Reset setup state and show backup codes
      setShowTwoFactorSetup(false);
      setTwoFactorSetup(null);
      setVerificationCode('');
      setShowBackupCodes(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to enable two-factor authentication. Please check your code and try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!disableVerificationCode) {
      setMessage({ type: 'error', text: 'Please enter the verification code from your authenticator app.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await disableTwoFactorAuth(disableVerificationCode);
      
      // Refresh user data to get updated 2FA status
      await refreshUser();
      
      setMessage({ 
        type: 'success', 
        text: 'Two-factor authentication disabled successfully!' 
      });
      
      // Reset disable state
      setShowDisable2FA(false);
      setDisableVerificationCode('');
      setUnusedBackupCodesCount(0);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disable two-factor authentication. Please check your code and try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    console.log('handleRegenerateBackupCodes called with code:', regenerateVerificationCode);
    
    if (!regenerateVerificationCode) {
      setMessage({ type: 'error', text: 'Please enter the verification code from your authenticator app.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const newBackupCodes = await regenerateBackupCodes(regenerateVerificationCode);
      
      // Store new backup codes to show them to the user
      setBackupCodes(newBackupCodes);
      
      setMessage({ 
        type: 'success', 
        text: 'Backup codes regenerated successfully!' 
      });
      
      // Reset regenerate state and show backup codes
      setShowRegenerateBackupCodes(false);
      setRegenerateVerificationCode('');
      setShowBackupCodes(true);
      setUnusedBackupCodesCount(newBackupCodes.length);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to regenerate backup codes. Please check your code and try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle terminate specific session
  const handleTerminateSession = async (sessionId: string) => {
    setTerminatingSessions(prev => new Set(prev).add(sessionId));

    try {
      await terminateSession(sessionId);
      
      // Refresh sessions list
      const updatedSessions = await getActiveSessions();
      setSessions(updatedSessions);
      
      setMessage({ type: 'success', text: 'Session terminated successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to terminate session' });
    } finally {
      setTerminatingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  // Handle terminate all other sessions
  const handleTerminateOtherSessions = async () => {
    setIsSaving(true);

    try {
      const terminatedCount = await terminateOtherSessions();
      
      // Refresh sessions list
      const updatedSessions = await getActiveSessions();
      setSessions(updatedSessions);
      
      setMessage({ 
        type: 'success', 
        text: `${terminatedCount} other sessions terminated successfully` 
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to terminate other sessions' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Security</h1>
        <p className="text-gray-400 mt-2">Manage your account security settings</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-500'
              : 'bg-red-900/30 border border-red-500'
          }`}
        >
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Password</h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] text-sm font-medium"
            >
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
                placeholder="Enter new password"
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePasswordChange}
                disabled={isSaving}
                className="px-6 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Update Password'}
              </button>
              <button
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setMessage(null);
                }}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Your password was last changed 30 days ago</p>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h2>

        {!showTwoFactorSetup && !showDisable2FA ? (
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-300 mb-2">Secure your account using Google Authenticator, Microsoft Authenticator, or any compatible TOTP app</p>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    twoFactorEnabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {twoFactorEnabled ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Enabled
                    </>
                  ) : (
                    'Disabled'
                  )}
                </span>
              </div>
              {twoFactorEnabled && (
                <>
                  <div className="rounded-lg p-3 mb-4 border border-[#BFC1A9]/40" style={{ background: 'rgba(215, 217, 196, 0.08)' }}>
                    <p className="text-sm" style={{ color: '#D7D9C4', fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}>
                      🔐 Your account is protected with two-factor authentication
                    </p>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-white mb-1">Backup Codes</h4>
                        <p className="text-xs text-gray-400">
                          {unusedBackupCodesCount} unused backup codes available
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          console.log('Regenerate button clicked');
                          setShowRegenerateBackupCodes(true);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {unusedBackupCodesCount === 0 ? 'Generate' : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={twoFactorEnabled ? () => setShowDisable2FA(true) : handleStartTwoFactorSetup}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                twoFactorEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700 transition-colors'
                  : 'btn-milkyway shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3]'
              }`}
            >
              {isSaving ? 'Processing...' : twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        ) : showTwoFactorSetup && twoFactorSetup ? (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-white mb-2">Set up Two-Factor Authentication</h3>
              <p className="text-gray-400 mb-4">Scan this QR code with your authenticator app</p>
              
              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img src={twoFactorSetup.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              
              {/* Manual Entry */}
              <div className="bg-gray-900 p-4 rounded-lg mb-4">
                <p className="text-gray-400 text-sm mb-2">Can't scan? Enter this code manually:</p>
                <code className="text-white text-sm font-mono">{twoFactorSetup.manualEntryKey}</code>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Enter the 6-digit code from your authenticator app
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none text-center font-mono text-lg"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleEnableTwoFactor}
                disabled={isSaving || verificationCode.length !== 6}
                className="px-6 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Verifying...' : 'Enable 2FA'}
              </button>
              <button
                onClick={() => {
                  setShowTwoFactorSetup(false);
                  setTwoFactorSetup(null);
                  setVerificationCode('');
                  setMessage(null);
                }}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : showDisable2FA ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Disable Two-Factor Authentication</h3>
              <p className="text-gray-400 mb-4">Enter the 6-digit code from your authenticator app to disable 2FA</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={disableVerificationCode}
                onChange={(e) => setDisableVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none text-center font-mono text-lg"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDisableTwoFactor}
                disabled={isSaving || disableVerificationCode.length !== 6}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Disabling...' : 'Disable 2FA'}
              </button>
              <button
                onClick={() => {
                  setShowDisable2FA(false);
                  setDisableVerificationCode('');
                  setMessage(null);
                }}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : showRegenerateBackupCodes ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Regenerate Backup Codes</h3>
              <p className="text-gray-400 mb-4">
                Enter your authenticator code to generate new backup codes. This will invalidate all existing backup codes.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={regenerateVerificationCode}
                onChange={(e) => setRegenerateVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none text-center font-mono text-lg"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRegenerateBackupCodes}
                disabled={isSaving || regenerateVerificationCode.length !== 6}
                className="px-6 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Generating...' : 'Regenerate Codes'}
              </button>
              <button
                onClick={() => {
                  setShowRegenerateBackupCodes(false);
                  setRegenerateVerificationCode('');
                  setMessage(null);
                }}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Regenerate Backup Codes Form */}
      {showRegenerateBackupCodes && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Generate Backup Codes</h3>
              <p className="text-gray-400 mb-4">
                Enter your authenticator code to generate backup codes. These codes can be used to access your account if you lose your authenticator device.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Verification Code from Authenticator App
              </label>
              <input
                type="text"
                value={regenerateVerificationCode}
                onChange={(e) => setRegenerateVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none text-center font-mono text-lg"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRegenerateBackupCodes}
                disabled={isSaving || regenerateVerificationCode.length !== 6}
                className="px-6 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Generating...' : 'Generate Backup Codes'}
              </button>
              <button
                onClick={() => {
                  setShowRegenerateBackupCodes(false);
                  setRegenerateVerificationCode('');
                  setMessage(null);
                }}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Display Modal */}
      {showBackupCodes && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Your Backup Codes</h2>
          
          <div className="bg-yellow-900/20 border border-yellow-600/40 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-yellow-400 font-medium mb-1">Important: Save these codes now</h4>
                <p className="text-yellow-200 text-sm">
                  These backup codes can be used to access your account if you lose your authenticator device. 
                  Each code can only be used once. Store them in a safe place.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {backupCodes.map((code, index) => (
              <div key={index} className="bg-gray-900 p-3 rounded border border-gray-700">
                <code className="text-white font-mono text-lg">{code}</code>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                // Copy all codes to clipboard
                const codesText = backupCodes.join('\n');
                navigator.clipboard.writeText(codesText);
                setMessage({ type: 'success', text: 'Backup codes copied to clipboard' });
              }}
              className="px-4 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] font-medium"
            >
              Copy Codes
            </button>
            <button
              onClick={() => {
                // Download backup codes as text file
                const codesText = `Two-Factor Authentication Backup Codes\n\nGenerated on: ${new Date().toLocaleString()}\n\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nIMPORTANT:\n- Keep these codes in a safe place\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app\n- Generate new codes if you suspect these have been compromised`;
                
                const blob = new Blob([codesText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                setMessage({ type: 'success', text: 'Backup codes downloaded successfully' });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Download Codes
            </button>
            <button
              onClick={() => {
                setShowBackupCodes(false);
                setBackupCodes([]);
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              I've Saved These Codes
            </button>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Active Sessions</h2>
          {sessions.length > 1 && (
            <button
              onClick={handleTerminateOtherSessions}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-red-900/30 text-red-400 border border-red-500 rounded-lg hover:bg-red-900/50 transition disabled:opacity-50"
            >
              {isSaving ? 'Terminating...' : 'Terminate All Others'}
            </button>
          )}
        </div>

        {loadingData ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Loading sessions...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.length > 0 ? (
              sessions.map((session, index) => (
                <div key={session._id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center avatar-milkyway">
                        <svg className="w-5 h-5" style={{ color: '#0b132b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">
                            {session.deviceName || session.userAgent}
                          </p>
                          {index === 0 && (
                            <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded">Current</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-1">{session.ipAddress}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Last active: {new Date(session.lastActiveAt).toLocaleString()}</span>
                          <span>Login: {new Date(session.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {index !== 0 && (
                      <button
                        onClick={() => handleTerminateSession(session._id)}
                        disabled={terminatingSessions.has(session._id)}
                        className="px-3 py-1 text-xs bg-red-900/20 text-red-400 border border-red-500/30 rounded hover:bg-red-900/30 transition disabled:opacity-50"
                      >
                        {terminatingSessions.has(session._id) ? 'Terminating...' : 'Terminate'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No active sessions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Login History */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Login Activity</h2>

        {loadingData ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Loading login activity...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {loginActivity.length > 0 ? (
              loginActivity.map((activity, index) => (
                <div key={index} className={`flex items-center justify-between py-2 ${index !== loginActivity.length - 1 ? 'border-b border-gray-700' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-white text-sm">{activity.success ? 'Successful login' : 'Failed login'}</p>
                      <p className="text-gray-400 text-xs">{activity.userAgent} • {activity.ipAddress}</p>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No login activity found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySection;
