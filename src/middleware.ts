import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'gem_auth_token';

// Protected application routes
const protectedRoutes = ['/dashboard', '/grocery', '/budget', '/reports', '/select-entity'];
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

  // If already authenticated and accessing /login, redirect to /dashboard
  if (isAuthRoute && isAuthenticated) {
    if (userPayload?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/select-entity', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Root redirect
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(userPayload?.role === 'ADMIN' ? '/select-entity' : '/dashboard', request.url)
      );
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
    '/dashboard/:path*',
    '/grocery/:path*',
    '/budget/:path*',
    '/reports/:path*',
    '/select-entity/:path*',
  ],
};
