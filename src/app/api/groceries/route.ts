import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockGroceryEntries } from '@/lib/mockData';

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

// GET /api/groceries - Fetch all grocery entries or filter by entity/date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');

    const whereClause: any = {};
    if (entity) {
      whereClause.entity = entity;
    }

    const entries = await (prisma as any).groceryEntry.findMany({
      where: whereClause,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const formatted = entries.map(formatGroceryEntry);
    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.warn('Database offline locally on /api/groceries GET, returning local mock data.');
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const data = entity ? mockGroceryEntries.filter(e => e.entity === entity) : mockGroceryEntries;
    return NextResponse.json({ success: true, data });
  }
}

// POST /api/groceries - Create a new grocery entry (supporting up to 10 slips)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, date, details, amount, addedBy, status, slipUrl, slipUrls, slipType } = body;

    if (!entity || !date || !details || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entity, date, details, amount' },
        { status: 400 }
      );
    }

    const finalSlipUrls: string[] = Array.isArray(slipUrls) && slipUrls.length > 0
      ? slipUrls.slice(0, 10)
      : slipUrl ? [slipUrl] : [];

    const primarySlipUrl = finalSlipUrls[0] || slipUrl || null;
    const computedStatus = status || (finalSlipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing');

    const computedSlipType = slipType || (
      primarySlipUrl
        ? (primarySlipUrl.includes('application/pdf') || primarySlipUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image')
        : null
    );

    const newEntry = await (prisma as any).groceryEntry.create({
      data: {
        entity,
        date,
        details,
        amount: parseFloat(amount),
        addedBy: addedBy || 'Unknown User',
        status: computedStatus,
        slipUrl: primarySlipUrl,
        slipUrls: finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null,
        slipType: computedSlipType,
        approvedByAdmin: false,
      },
    });

    return NextResponse.json({ success: true, data: formatGroceryEntry(newEntry) }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create grocery entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create grocery entry' },
      { status: 500 }
    );
  }
}
