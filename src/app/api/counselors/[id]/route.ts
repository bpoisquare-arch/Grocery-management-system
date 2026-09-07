import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// PUT /api/counselors/[id] - Update counselor
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.entity !== undefined) updateData.entity = body.entity;
    if (body.email !== undefined) updateData.email = body.email ? body.email.trim() : null;
    if (body.phone !== undefined) updateData.phone = body.phone ? body.phone.trim() : null;
    if (body.serviceCommissions !== undefined) {
      updateData.serviceCommissions = body.serviceCommissions ? JSON.stringify(body.serviceCommissions) : null;
    }
    if (body.bmServiceCommissions !== undefined) {
      updateData.bmServiceCommissions = body.bmServiceCommissions ? JSON.stringify(body.bmServiceCommissions) : null;
    }

    const updated = await (prisma as any).counselor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: formatCounselor(updated) });
  } catch (error: any) {
    console.error('Failed to update counselor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update counselor' },
      { status: 500 }
    );
  }
}

// DELETE /api/counselors/[id] - Delete counselor
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await (prisma as any).counselor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Counselor deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete counselor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete counselor' },
      { status: 500 }
    );
  }
}
