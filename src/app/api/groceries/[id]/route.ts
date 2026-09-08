import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to format DB grocery entry into client-side GroceryEntry
function formatGroceryEntry(entry: any) {
  let slipUrls: string[] | undefined = undefined;

  if (entry.slipUrls) {
    try {
      slipUrls = typeof entry.slipUrls === 'string' ? JSON.parse(entry.slipUrls) : entry.slipUrls;
    } catch (e) {
      slipUrls = undefined;
    }
  }

  if (!slipUrls && entry.slipUrl) {
    slipUrls = [entry.slipUrl];
  }

  return {
    id: entry.id,
    entity: entry.entity,
    date: entry.date,
    details: entry.details,
    amount: entry.amount,
    addedBy: entry.addedBy,
    status: entry.status || (entry.slipUrl ? 'Slip Uploaded' : 'Slip Missing'),
    slipUrl: entry.slipUrl || (slipUrls && slipUrls.length > 0 ? slipUrls[0] : undefined),
    slipUrls: slipUrls && slipUrls.length > 0 ? slipUrls : undefined,
    slipType: entry.slipType || undefined,
    approvedByAdmin: !!entry.approvedByAdmin,
    createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// PUT /api/groceries/[id] - Update a grocery entry (supporting up to 10 slips)
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
    if (body.approvedByAdmin !== undefined) updateData.approvedByAdmin = body.approvedByAdmin;

    if (body.slipUrls !== undefined) {
      const finalSlips = Array.isArray(body.slipUrls) ? body.slipUrls.slice(0, 10) : [];
      updateData.slipUrls = finalSlips.length > 0 ? JSON.stringify(finalSlips) : null;
      updateData.slipUrl = finalSlips[0] || null;
      if (body.status === undefined) {
        updateData.status = finalSlips.length > 0 ? 'Slip Uploaded' : 'Slip Missing';
      }
      if (finalSlips[0]) {
        updateData.slipType = finalSlips[0].includes('application/pdf') || finalSlips[0].toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
      }
    } else if (body.slipUrl !== undefined) {
      updateData.slipUrl = body.slipUrl || null;
      updateData.slipUrls = body.slipUrl ? JSON.stringify([body.slipUrl]) : null;
      if (body.status === undefined) {
        updateData.status = body.slipUrl ? 'Slip Uploaded' : 'Slip Missing';
      }
      if (body.slipUrl) {
        updateData.slipType = body.slipUrl.includes('application/pdf') || body.slipUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
      }
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.slipType !== undefined) {
      updateData.slipType = body.slipType;
    }

    let updated: any = null;

    try {
      updated = await (prisma as any).groceryEntry.update({
        where: { id },
        data: updateData,
      });
    } catch (updateErr: any) {
      console.warn(`Prisma update failed for ${id}, attempting auto-migration & raw SQL fallback:`, updateErr.message);

      // Attempt auto-migration
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `GroceryEntry` ADD COLUMN `slipUrls` LONGTEXT NULL');
        updated = await (prisma as any).groceryEntry.update({
          where: { id },
          data: updateData,
        });
      } catch (retryErr) {
        // Fallback to raw SQL update omitting slipUrls if needed
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
          `UPDATE \`GroceryEntry\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
          ...params
        );

        const rows = await prisma.$queryRawUnsafe<any[]>(
          'SELECT * FROM `GroceryEntry` WHERE `id` = ? LIMIT 1',
          id
        );
        updated = rows[0] || { id, ...updateData };
      }
    }

    return NextResponse.json({ success: true, data: formatGroceryEntry(updated) });
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

    try {
      await (prisma as any).groceryEntry.delete({
        where: { id },
      });
    } catch (prismaErr: any) {
      console.warn(`Prisma delete failed for ${id}, falling back to raw SQL:`, prismaErr.message);
      await prisma.$executeRawUnsafe('DELETE FROM `GroceryEntry` WHERE `id` = ?', id);
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error(`Failed to delete grocery entry:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete grocery entry' },
      { status: 500 }
    );
  }
}
