import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

// GET /api/auth/me - Verify current session & return user profile
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          assignedEntity: true,
          createdAt: true,
        },
      });

      if (user) {
        return NextResponse.json({ authenticated: true, user });
      }
    } catch (dbErr) {
      // Database offline locally - use payload token fallback
    }

    const fallbackUser = {
      id: payload.userId,
      name: payload.name || 'User',
      email: payload.email || '',
      avatar: '',
      role: payload.role || 'LAHORE_USER',
      assignedEntity: payload.assignedEntity,
    };

    return NextResponse.json({ authenticated: true, user: fallbackUser });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
