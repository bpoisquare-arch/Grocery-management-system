export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockGroceryEntries } from '@/lib/mockData';
import { eventBus } from '@/lib/eventBus';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function deriveMonthYearFromDate(dateStr?: string) {
  if (!dateStr) return { month: 'August', year: 2026 };
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10) || 2026;
    const monthIndex = parseInt(parts[1], 10) - 1;
    const month = MONTH_NAMES[monthIndex] || 'August';
    return { month, year };
  }
  return { month: 'August', year: 2026 };
}

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

  const derived = deriveMonthYearFromDate(entry.date);
  const budgetMonth = entry.budgetMonth || derived.month;
  const budgetYear = entry.budgetYear ? parseInt(entry.budgetYear, 10) : derived.year;

  return {
    id: String(entry.id),
    entity: entry.entity,
    date: entry.date,
    details: entry.details,
    category: entry.category || undefined,
    amount: typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount) || 0,
    addedBy: entry.addedBy || 'Unknown User',
    status: entry.status || (entry.slipUrl ? 'Slip Uploaded' : 'Slip Missing'),
    budgetMonth,
    budgetYear,
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
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  try {
    const whereClause: any = {};
    if (entity) {
      whereClause.entity = entity;
    }
    if (month) {
      whereClause.budgetMonth = month;
    }
    if (year) {
      whereClause.budgetYear = parseInt(year, 10);
    }

    const entries = await (prisma as any).groceryEntry.findMany({
      where: whereClause,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const formatted = entries.map(formatGroceryEntry);
    return NextResponse.json(
      { success: true, data: formatted },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Database query error in GET /api/groceries:', error.message);
    try {
      let rawEntries: any[] = [];
      if (entity) {
        rawEntries = await prisma.$queryRawUnsafe<any[]>(
          'SELECT * FROM `GroceryEntry` WHERE `entity` = ? ORDER BY `date` DESC, `createdAt` DESC',
          entity
        );
      } else {
        rawEntries = await prisma.$queryRawUnsafe<any[]>(
          'SELECT * FROM `GroceryEntry` ORDER BY `date` DESC, `createdAt` DESC'
        );
      }
      const formatted = rawEntries.map(formatGroceryEntry);
      return NextResponse.json({ success: true, data: formatted });
    } catch (rawErr: any) {
      console.error('Final error in GET /api/groceries:', rawErr.message);
      return NextResponse.json({ success: false, error: rawErr.message || 'Database error' }, { status: 500 });
    }
  }
}

// POST /api/groceries - Create a new grocery entry (supporting up to 10 slips and explicit budget month)
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      entity,
      date,
      details,
      category,
      amount,
      addedBy,
      status,
      budgetMonth,
      budgetYear,
      slipUrl,
      slipUrls,
      slipType,
    } = body;

    if (!entity || !date || !details || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entity, date, details, amount' },
        { status: 400 }
      );
    }

    const derived = deriveMonthYearFromDate(date);
    const finalBudgetMonth = budgetMonth || derived.month;
    const finalBudgetYear = budgetYear ? parseInt(budgetYear, 10) : derived.year;

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

    let newEntry: any = null;

    // Attempt 1: Standard Prisma create
    try {
      newEntry = await (prisma as any).groceryEntry.create({
        data: {
          entity,
          date,
          details,
          category: category ? String(category).trim() : null,
          amount: parseFloat(amount),
          addedBy: addedBy || 'Unknown User',
          status: computedStatus,
          budgetMonth: finalBudgetMonth,
          budgetYear: finalBudgetYear,
          slipUrl: primarySlipUrl,
          slipUrls: finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null,
          slipType: computedSlipType,
          approvedByAdmin: false,
        },
      });
    } catch (createErr: any) {
      console.warn('Prisma create failed, trying auto-alter or raw SQL insert:', createErr.message);

      // Safe direct creation without table locks

      // Attempt raw insert if Prisma still failed
      if (!newEntry) {
        const id = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = new Date();
        try {
          // Try inserting with category, budgetMonth and slipUrls
          await prisma.$executeRawUnsafe(
            'INSERT INTO `GroceryEntry` (`id`, `entity`, `date`, `details`, `category`, `amount`, `addedBy`, `status`, `budgetMonth`, `budgetYear`, `slipUrl`, `slipUrls`, `slipType`, `approvedByAdmin`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            id,
            entity,
            date,
            details,
            category ? String(category).trim() : null,
            parseFloat(amount),
            addedBy || 'Unknown User',
            computedStatus,
            finalBudgetMonth,
            finalBudgetYear,
            primarySlipUrl,
            finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null,
            computedSlipType,
            0,
            now,
            now
          );
        } catch (insertErr) {
          // Fallback inserting without category
          await prisma.$executeRawUnsafe(
            'INSERT INTO `GroceryEntry` (`id`, `entity`, `date`, `details`, `amount`, `addedBy`, `status`, `slipUrl`, `slipType`, `approvedByAdmin`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            id,
            entity,
            date,
            details,
            parseFloat(amount),
            addedBy || 'Unknown User',
            computedStatus,
            primarySlipUrl,
            computedSlipType,
            0,
            now,
            now
          );
        }

        newEntry = {
          id,
          entity,
          date,
          details,
          category: category ? String(category).trim() : undefined,
          amount: parseFloat(amount),
          addedBy: addedBy || 'Unknown User',
          status: computedStatus,
          budgetMonth: finalBudgetMonth,
          budgetYear: finalBudgetYear,
          slipUrl: primarySlipUrl,
          slipUrls: finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null,
          slipType: computedSlipType,
          approvedByAdmin: 0,
          createdAt: now,
          updatedAt: now,
        };
      }
    }

    try {
      eventBus.emit('sync', { module: 'grocery', type: 'grocery', action: 'create', entity });
    } catch {}

    return NextResponse.json({ success: true, data: formatGroceryEntry(newEntry) }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create grocery entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create grocery entry' },
      { status: 500 }
    );
  }
}
