import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only available in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev login only available in development mode' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirect') || '/trades';

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));

  // Set the dev bypass cookie for development and automated testing
  response.cookies.set('__dev_bypass', 'true', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
