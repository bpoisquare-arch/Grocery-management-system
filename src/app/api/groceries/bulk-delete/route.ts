import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/groceries/bulk-delete - Delete multiple grocery entries
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Array of ids is required' },
        { status: 400 }
      );
    }

    const result = await prisma.groceryEntry.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} entries`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Failed to bulk delete entries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to bulk delete entries' },
      { status: 500 }
    );
  }
}
