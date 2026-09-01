import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/groceries/[id] - Update a grocery entry
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updateData: any = {};
    if (body.date !== undefined) updateData.date = body.date;
    if (body.details !== undefined) updateData.details = body.details;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.slipUrl !== undefined) updateData.slipUrl = body.slipUrl;
    if (body.slipType !== undefined) updateData.slipType = body.slipType;
    if (body.approvedByAdmin !== undefined) updateData.approvedByAdmin = body.approvedByAdmin;

    const updated = await prisma.groceryEntry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error(`Failed to update grocery entry:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update grocery entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/groceries/[id] - Delete a grocery entry
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await prisma.groceryEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error(`Failed to delete grocery entry:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete grocery entry' },
      { status: 500 }
    );
  }
}
