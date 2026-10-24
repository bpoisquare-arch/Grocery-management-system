import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { eventBus } from '@/lib/eventBus';

// POST /api/commissions/bulk-delete - Delete multiple commission entries
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Administrator privileges required.' }, { status: 403 });
  }
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Array of ids is required' },
        { status: 400 }
      );
    }

    const result = await (prisma as any).commissionEntry.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    try {
      eventBus.emit('sync', { module: 'commission', type: 'commission', action: 'bulk-delete', ids });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} commission entries`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Failed to bulk delete commission entries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to bulk delete commission entries' },
      { status: 500 }
    );
  }
}
