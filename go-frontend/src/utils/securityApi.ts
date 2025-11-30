import { fetchWithTimeout } from './fetchWithTimeout';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface SessionData {
  _id: string;
  userId: string;
  userAgent: string;
  userAgentRaw?: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
  deviceInfo?: {
    browser: string;
    os: string;
    device: string;
  };
  deviceName?: string;
  deviceType?: string;
}

export interface LoginActivityData {
  userId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: string;
}

// Get authentication token from cookies or localStorage
function getAuthToken(): string {
  if (typeof document === 'undefined') return '';
  
  // Try to get from cookie first
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1];
  
  const token = cookieToken || localStorage.getItem('auth_token') || '';
  //console.log('🔐 Security API - Token found:', token ? 'Yes' : 'No', token ? `(${token.substring(0, 10)}...)` : '');
  return token;
}

// Change password
export async function changePassword(data: ChangePasswordData): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to change password');
  }
}

export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

// Generate 2FA setup data (QR code, secret, etc.)
export async function generateTwoFactorSetup(): Promise<TwoFactorSetupData> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/2fa/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to generate 2FA setup');
  }

  const data = await response.json();
  return data.data;
}

// Enable two-factor authentication
export async function enableTwoFactorAuth(secret: string, verificationCode: string): Promise<string[]> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/2fa/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ secret, token: verificationCode }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to enable two-factor authentication');
  }

  const data = await response.json();
  return data.backupCodes || [];
}

// Disable two-factor authentication
export async function disableTwoFactorAuth(verificationCode: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ token: verificationCode }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to disable two-factor authentication');
  }
}

// Get active sessions
export async function getActiveSessions(): Promise<SessionData[]> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/sessions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to get sessions';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If we can't parse the error response, use a generic message
    }
    console.error('🔐 Sessions API Error:', response.status, errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.sessions || [];
}

// Terminate a specific session
export async function terminateSession(sessionId: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to terminate session';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If we can't parse the error response, use a generic message
    }
    throw new Error(errorMessage);
  }
}

// Terminate all other sessions except current
export async function terminateOtherSessions(): Promise<number> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/sessions/terminate-others`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to terminate other sessions';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If we can't parse the error response, use a generic message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.terminatedCount || 0;
}

// Get login activity
export async function getLoginActivity(limit: number = 10): Promise<LoginActivityData[]> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/login-activity?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to get login activity';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If we can't parse the error response, use a generic message
    }
    console.error('🔐 Login Activity API Error:', response.status, errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.activities || [];
}

// Get backup codes status
export async function getBackupCodesStatus(): Promise<{ unusedCount: number }> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/2fa/backup-codes/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to get backup codes status';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If we can't parse the error response, use a generic message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return { unusedCount: data.unusedCount || 0 };
}

// Regenerate backup codes
export async function regenerateBackupCodes(verificationCode: string): Promise<string[]> {
  const token = getAuthToken();
  
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/2fa/backup-codes/regenerate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ token: verificationCode }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to regenerate backup codes');
  }

  const data = await response.json();
  return data.backupCodes || [];
}