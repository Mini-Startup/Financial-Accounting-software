import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/api/dev-login(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const clerkHandler = clerkMiddleware(async (_auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }
});

export default function proxy(req: NextRequest, event: any) {
  // If in development mode and dev bypass is requested or active, return directly without running Clerk's outer handshake
  if (
    process.env.NODE_ENV === 'development' &&
    (req.nextUrl.searchParams.get('dev_bypass') === 'true' ||
      req.cookies.get('__dev_bypass')?.value === 'true' ||
      req.nextUrl.pathname.startsWith('/api/dev-login'))
  ) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-dev-bypass', 'true');

    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    if (req.nextUrl.searchParams.get('dev_bypass') === 'true' || req.nextUrl.pathname.startsWith('/api/dev-login')) {
      res.cookies.set('__dev_bypass', 'true', {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    res.headers.set('x-dev-bypass', 'true');
    return res;
  }

  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
