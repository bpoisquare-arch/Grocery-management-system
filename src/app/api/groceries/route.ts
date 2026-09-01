import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/groceries - Fetch all grocery entries or filter by entity/date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');

    const whereClause: any = {};
    if (entity) {
      whereClause.entity = entity;
    }

    const entries = await prisma.groceryEntry.findMany({
      where: whereClause,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    console.error('Failed to fetch groceries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch grocery entries' },
      { status: 500 }
    );
  }
}

// POST /api/groceries - Create a new grocery entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, date, details, amount, addedBy, status, slipUrl, slipType } = body;

    if (!entity || !date || !details || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entity, date, details, amount' },
        { status: 400 }
      );
    }

    const newEntry = await prisma.groceryEntry.create({
      data: {
        entity,
        date,
        details,
        amount: parseFloat(amount),
        addedBy: addedBy || 'Unknown User',
        status: status || (slipUrl ? 'Slip Uploaded' : 'Slip Missing'),
        slipUrl: slipUrl || null,
        slipType: slipType || null,
        approvedByAdmin: false,
      },
    });

    return NextResponse.json({ success: true, data: newEntry }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create grocery entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create grocery entry' },
      { status: 500 }
    );
  }
}
