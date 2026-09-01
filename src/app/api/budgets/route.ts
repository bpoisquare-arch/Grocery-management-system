import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/budgets - Fetch all budgets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');

    const whereClause: any = {};
    if (entity) {
      whereClause.entity = entity;
    }

    const budgets = await prisma.budget.findMany({
      where: whereClause,
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, data: budgets });
  } catch (error: any) {
    console.error('Failed to fetch budgets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

// POST /api/budgets - Upsert monthly budget for entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, month, year, amount } = body;

    if (!entity || !month || !year || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entity, month, year, amount' },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.upsert({
      where: {
        entity_month_year: {
          entity,
          month,
          year: parseInt(year, 10),
        },
      },
      update: {
        amount: parseFloat(amount),
      },
      create: {
        entity,
        month,
        year: parseInt(year, 10),
        amount: parseFloat(amount),
      },
    });

    return NextResponse.json({ success: true, data: budget });
  } catch (error: any) {
    console.error('Failed to upsert budget:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set budget' },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets - Delete single budget or clean all
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const entity = searchParams.get('entity');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const clearAll = searchParams.get('clearAll');

    if (clearAll === 'true') {
      await prisma.budget.deleteMany({});
      return NextResponse.json({ success: true, message: 'All budgets cleared successfully.' });
    }

    if (id) {
      await prisma.budget.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Budget deleted successfully.' });
    }

    if (entity && month && year) {
      await prisma.budget.deleteMany({
        where: {
          entity,
          month,
          year: parseInt(year, 10),
        },
      });
      return NextResponse.json({ success: true, message: 'Budget deleted successfully.' });
    }

    return NextResponse.json(
      { success: false, error: 'Provide id, (entity, month, year), or clearAll=true' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Failed to delete budget:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete budget' },
      { status: 500 }
    );
  }
}
