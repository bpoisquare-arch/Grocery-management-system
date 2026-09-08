import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to format DB commission entry into client-side CommissionEntry
function formatCommissionEntry(comm: any) {
  let slipUrls: string[] | undefined = undefined;

  if (comm.slipUrls) {
    try {
      slipUrls = typeof comm.slipUrls === 'string' ? JSON.parse(comm.slipUrls) : comm.slipUrls;
    } catch (e) {
      slipUrls = undefined;
    }
  }

  if (!slipUrls && comm.slipUrl) {
    slipUrls = [comm.slipUrl];
  }

  return {
    id: comm.id,
    entity: comm.entity,
    studentName: comm.studentName,
    service: comm.service,
    counselor: comm.counselor,
    amount: comm.amount,
    date: comm.date,
    fullReceived: !!comm.fullReceived,
    counselorCommission: comm.counselorCommission || 0,
    bmCommission: comm.bmCommission || 0,
    status: comm.status || (comm.slipUrl ? 'Slip Uploaded' : 'Slip Missing'),
    slipUrl: comm.slipUrl || (slipUrls && slipUrls.length > 0 ? slipUrls[0] : undefined),
    slipUrls: slipUrls && slipUrls.length > 0 ? slipUrls : undefined,
    slipType: comm.slipType || undefined,
    notes: comm.notes || undefined,
    createdAt: comm.createdAt ? new Date(comm.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: comm.updatedAt ? new Date(comm.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// PUT /api/commissions/[id] - Update a commission entry
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updateData: any = {};
    if (body.studentName !== undefined) updateData.studentName = body.studentName.trim();
    if (body.service !== undefined) updateData.service = body.service;
    if (body.counselor !== undefined) updateData.counselor = body.counselor;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.date !== undefined) updateData.date = body.date;
    if (body.fullReceived !== undefined) updateData.fullReceived = !!body.fullReceived;
    if (body.counselorCommission !== undefined) updateData.counselorCommission = parseFloat(body.counselorCommission) || 0;
    if (body.bmCommission !== undefined) updateData.bmCommission = parseFloat(body.bmCommission) || 0;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes ? body.notes.trim() : null;

    if (body.slipUrls !== undefined) {
      const finalSlips = Array.isArray(body.slipUrls) ? body.slipUrls : [];
      updateData.slipUrls = finalSlips.length > 0 ? JSON.stringify(finalSlips) : null;
      updateData.slipUrl = finalSlips[0] || null;
      if (body.status === undefined) {
        updateData.status = finalSlips.length > 0 ? 'Slip Uploaded' : 'Slip Missing';
      }
    } else if (body.slipUrl !== undefined) {
      updateData.slipUrl = body.slipUrl || null;
      updateData.slipUrls = body.slipUrl ? JSON.stringify([body.slipUrl]) : null;
      if (body.status === undefined) {
        updateData.status = body.slipUrl ? 'Slip Uploaded' : 'Slip Missing';
      }
    }

    if (body.slipType !== undefined) {
      updateData.slipType = body.slipType;
    }

    let updated: any = null;

    try {
      updated = await (prisma as any).commissionEntry.update({
        where: { id },
        data: updateData,
      });
    } catch (updateErr: any) {
      console.warn(`Prisma update failed for commission ${id}, attempting auto-migration / raw SQL update:`, updateErr.message);

      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `CommissionEntry` ADD COLUMN `slipUrls` LONGTEXT NULL');
        updated = await (prisma as any).commissionEntry.update({
          where: { id },
          data: updateData,
        });
      } catch (retryErr) {
        const { slipUrls, ...fallbackData } = updateData;
        const setClauses: string[] = [];
        const params: any[] = [];
        for (const [key, val] of Object.entries(fallbackData)) {
          setClauses.push(`\`${key}\` = ?`);
          params.push(val);
        }
        setClauses.push('`updatedAt` = ?');
        params.push(new Date());
        params.push(id);

        await prisma.$executeRawUnsafe(
          `UPDATE \`CommissionEntry\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
          ...params
        );

        const rows = await prisma.$queryRawUnsafe<any[]>(
          'SELECT * FROM `CommissionEntry` WHERE `id` = ? LIMIT 1',
          id
        );
        updated = rows[0] || { id, ...updateData };
      }
    }

    return NextResponse.json({ success: true, data: formatCommissionEntry(updated) });
  } catch (error: any) {
    console.error(`Failed to update commission entry:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update commission entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/commissions/[id] - Delete a commission entry
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    try {
      await (prisma as any).commissionEntry.delete({
        where: { id },
      });
    } catch (prismaErr: any) {
      console.warn(`Prisma delete failed for commission ${id}, falling back to raw SQL:`, prismaErr.message);
      await prisma.$executeRawUnsafe('DELETE FROM `CommissionEntry` WHERE `id` = ?', id);
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error(`Failed to delete commission entry:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete commission entry' },
      { status: 500 }
    );
  }
}
