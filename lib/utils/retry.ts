/**
 * Retry utility with exponential backoff
 * Attempts an operation up to maxRetries times with exponential backoff delays
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: () => true,
};

/**
 * Retries an async operation with exponential backoff
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!opts.shouldRetry(error)) {
        throw error;
      }

      // Don't delay after the last attempt
      if (attempt < opts.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s (capped at maxDelay)
        const delay = Math.min(
          opts.initialDelay * Math.pow(2, attempt),
          opts.maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Checks if an error is a network-related error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorCode === 'network_error' ||
    errorCode === 'timeout' ||
    error?.status === 0 // Network failure
  );
}

/**
 * Checks if an error is a Supabase-specific error
 */
export function isSupabaseError(error: any): boolean {
  return error && (
    error.code ||
    error.message?.includes('PostgREST') ||
    error.message?.includes('supabase') ||
    error.message?.includes('database')
  );
}

