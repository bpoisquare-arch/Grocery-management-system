import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'gem_auth_token';

// Protected application routes
const protectedRoutes = [
  '/dashboard',
  '/grocery',
  '/budget',
  '/reports',
  '/select-entity',
  '/select-module',
  '/commissions',
];
const authRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  let isAuthenticated = false;
  let userPayload: any = null;

  if (token && process.env.JWT_SECRET) {
    try {
      const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      isAuthenticated = !!payload && !!payload.userId;
      userPayload = payload;
    } catch (err) {
      isAuthenticated = false;
    }
  }

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // If trying to access protected route without authentication, redirect to /login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and accessing /login, redirect to /select-module
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/select-module', request.url));
  }

  // Root redirect
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/select-module', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/select-module/:path*',
    '/select-entity/:path*',
    '/commissions/:path*',
    '/dashboard/:path*',
    '/grocery/:path*',
    '/budget/:path*',
    '/reports/:path*',
  ],
};
