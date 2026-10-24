import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

// POST /api/auth/logout - Clear HTTP-only session cookie
export async function POST(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || '';
  const url = request.url || '';
  const isHttps = proto === 'https' || url.startsWith('https:');

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
