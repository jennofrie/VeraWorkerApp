/**
 * Network status detection utility
 * Simple network checking without external dependencies
 * Uses fetch-based approach to detect network availability
 */

/**
 * Checks if device appears to be online by attempting a lightweight request
 * @returns Promise resolving to true if online, false otherwise
 */
export async function isOnline(): Promise<boolean> {
  try {
    // Use a lightweight check - try to fetch a small resource or check Supabase connection
    // For now, we'll use a simple timeout-based check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      // Try to fetch a minimal endpoint or just check if we can reach Supabase
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error: any) {
      clearTimeout(timeoutId);
      // If it's an abort (timeout) or network error, assume offline
      if (error.name === 'AbortError' || error.message?.includes('network')) {
        return false;
      }
      // Other errors might indicate online but resource not found
      return true;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Gets a human-readable error message based on error type
 * @param error - The error object
 * @returns User-friendly error message
 */
export function getNetworkErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';

  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code?.toLowerCase() || '';

  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorCode === 'network_error' ||
    errorCode === 'timeout' ||
    error?.status === 0
  ) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }

  if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return 'Permission denied. Please check your app permissions and try again.';
  }

  return 'An error occurred. Please try again.';
}

