import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

/**
 * Server-side authenticated fetch wrapper for Next.js App Router Server Components.
 * Automatically injects the active Clerk user ID into the x-user-id header.
 */
export async function serverFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let userId: string | null = null;

  // Development bypass support for testing & automated browser tasks
  if (process.env.NODE_ENV === 'development') {
    try {
      const { cookies, headers } = await import('next/headers');
      const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
      if (cookieStore.get('__dev_bypass')?.value === 'true' || headerStore.get('x-dev-bypass') === 'true') {
        userId = 'dev_admin_user';
      }
    } catch {}
  }

  if (!userId) {
    try {
      const session = await auth();
      userId = session?.userId || null;
    } catch {
      // In background tasks or static generation without request context
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (userId && !headers.has('x-user-id')) {
    headers.set('x-user-id', userId);
  }

  return fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });
}

export async function safeServerFetch<T = any>(endpoint: string, fallback: T = [] as any): Promise<T> {
  try {
    const res = await serverFetch(endpoint);
    if (!res.ok) {
      console.error(`[safeServerFetch] Failed to fetch ${endpoint}: Status ${res.status} ${res.statusText}`);
      return fallback;
    }
    return await res.json();
  } catch (err) {
    console.error(`[safeServerFetch] Error connecting to ${endpoint}:`, err);
    return fallback;
  }
}
