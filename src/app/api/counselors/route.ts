import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialCounselors } from '@/lib/mockData';

// Helper to format counselor from DB to Client Counselor structure
function formatCounselor(c: any) {
  let serviceCommissions = undefined;
  let bmServiceCommissions = undefined;

  if (c.serviceCommissions) {
    try {
      serviceCommissions = typeof c.serviceCommissions === 'string' ? JSON.parse(c.serviceCommissions) : c.serviceCommissions;
    } catch (e) {
      serviceCommissions = undefined;
    }
  }

  if (c.bmServiceCommissions) {
    try {
      bmServiceCommissions = typeof c.bmServiceCommissions === 'string' ? JSON.parse(c.bmServiceCommissions) : c.bmServiceCommissions;
    } catch (e) {
      bmServiceCommissions = undefined;
    }
  }

  return {
    id: c.id,
    name: c.name,
    entity: c.entity || 'All',
    email: c.email || undefined,
    phone: c.phone || undefined,
    serviceCommissions,
    bmServiceCommissions,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/counselors - Fetch all counselors or filter by entity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');

    const whereClause: any = {};
    if (entity && entity !== 'All') {
      whereClause.OR = [
        { entity: 'All' },
        { entity: entity },
      ];
    }

    const counselors = await (prisma as any).counselor.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    if (!counselors || counselors.length === 0) {
      return NextResponse.json({ success: true, data: initialCounselors });
    }

    const formatted = counselors.map(formatCounselor);
    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.warn('Database offline on /api/counselors GET, returning initial counselors:', error.message);
    return NextResponse.json({ success: true, data: initialCounselors });
  }
}

// POST /api/counselors - Create a new counselor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, entity, email, phone, serviceCommissions, bmServiceCommissions } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Counselor name is required' },
        { status: 400 }
      );
    }

    const newCounselor = await (prisma as any).counselor.create({
      data: {
        name: name.trim(),
        entity: entity || 'All',
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        serviceCommissions: serviceCommissions ? JSON.stringify(serviceCommissions) : null,
        bmServiceCommissions: bmServiceCommissions ? JSON.stringify(bmServiceCommissions) : null,
      },
    });

    return NextResponse.json({ success: true, data: formatCounselor(newCounselor) }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create counselor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create counselor' },
      { status: 500 }
    );
  }
}
