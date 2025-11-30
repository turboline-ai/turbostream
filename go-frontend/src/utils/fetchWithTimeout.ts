/**
 * Fetch with timeout utility
 * Prevents API calls from hanging indefinitely and handles auth errors
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // milliseconds
  handleAuthErrors?: boolean; // Whether to handle 401 errors automatically
}

/**
 * Fetch wrapper that adds timeout functionality
 * @param url - The URL to fetch
 * @param options - Fetch options including custom timeout (default: 10000ms)
 * @returns Promise with the fetch response
 * @throws Error if the request times out
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 5000, handleAuthErrors = true, ...fetchOptions } = options; // Reduced default from 10s to 5s

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      // Add keep-alive for connection reuse
      keepalive: true,
    });
    
    clearTimeout(timeoutId);
    
    // Handle authentication errors automatically
    if (handleAuthErrors && response.status === 401) {
      console.warn('🔒 Authentication token expired or invalid, clearing local storage');
      // Clear expired token from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Emit a custom event that the AuthContext can listen to
        window.dispatchEvent(new CustomEvent('auth-token-expired'));
      }
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Fetch JSON with timeout and error handling
 * @param url - The URL to fetch
 * @param options - Fetch options including custom timeout
 * @returns Promise with the parsed JSON response
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }
  
  return response.json();
}
