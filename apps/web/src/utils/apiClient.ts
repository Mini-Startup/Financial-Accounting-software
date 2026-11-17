import { toast } from 'sonner';

export interface ApiFetchOptions extends RequestInit {
  userId?: string | null;
}

/**
 * Enhanced fetch wrapper for API communication.
 * Automatically attaches authenticated user identification and handles 403 / 401 errors.
 */
export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Attach user ID if provided or present in window.__CLERK_USER_ID__
  const activeUserId =
    options.userId ||
    (typeof window !== 'undefined' ? (window as any).__BIZZMATE_USER_ID__ : null);

  if (activeUserId && !headers.has('x-user-id')) {
    headers.set('x-user-id', activeUserId);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 403) {
    const errorData = await res.clone().json().catch(() => ({}));
    const message =
      errorData.message ||
      errorData.error ||
      'Access Denied: You do not have permission to perform this action.';
    toast.error(message, {
      duration: 5000,
      description: 'Please contact the application Owner if you believe this is an error.',
    });
  } else if (res.status === 401) {
    toast.error('Session Expired: Please refresh or sign in again.');
  }

  return res;
}

