import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockCommissionEntries } from '@/lib/mockData';

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

// GET /api/commissions - Fetch all commission entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');

    const whereClause: any = {};
    if (entity && entity !== 'All') {
      whereClause.entity = entity;
    }

    const entries = await (prisma as any).commissionEntry.findMany({
      where: whereClause,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (!entries || entries.length === 0) {
      const data = entity && entity !== 'All'
        ? mockCommissionEntries.filter(e => e.entity === entity)
        : mockCommissionEntries;
      return NextResponse.json({ success: true, data });
    }

    const formatted = entries.map(formatCommissionEntry);
    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.warn('Database offline on /api/commissions GET, returning mock commissions:', error.message);
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const data = entity && entity !== 'All'
      ? mockCommissionEntries.filter(e => e.entity === entity)
      : mockCommissionEntries;
    return NextResponse.json({ success: true, data });
  }
}

// POST /api/commissions - Create a new commission entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entity,
      studentName,
      service,
      counselor,
      amount,
      date,
      fullReceived,
      counselorCommission,
      bmCommission,
      status,
      slipUrl,
      slipUrls,
      slipType,
      notes,
    } = body;

    if (!entity || !studentName || !service || !counselor || amount === undefined || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entity, studentName, service, counselor, amount, date' },
        { status: 400 }
      );
    }

    const finalSlipUrls = Array.isArray(slipUrls) && slipUrls.length > 0
      ? slipUrls
      : slipUrl ? [slipUrl] : [];

    const primarySlipUrl = finalSlipUrls[0] || slipUrl || null;
    const computedStatus = status || (finalSlipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing');

    const newEntry = await (prisma as any).commissionEntry.create({
      data: {
        entity,
        studentName: studentName.trim(),
        service,
        counselor,
        amount: parseFloat(amount),
        date,
        fullReceived: !!fullReceived,
        counselorCommission: parseFloat(counselorCommission) || 0,
        bmCommission: parseFloat(bmCommission) || 0,
        status: computedStatus,
        slipUrl: primarySlipUrl,
        slipUrls: finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null,
        slipType: slipType || (primarySlipUrl ? (primarySlipUrl.includes('application/pdf') ? 'pdf' : 'image') : null),
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: formatCommissionEntry(newEntry) }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create commission entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create commission entry' },
      { status: 500 }
    );
  }
}
