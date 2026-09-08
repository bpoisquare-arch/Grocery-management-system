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
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity');

  try {
    let entries: any[] = [];

    try {
      const whereClause: any = {};
      if (entity && entity !== 'All') {
        whereClause.entity = entity;
      }

      entries = await (prisma as any).commissionEntry.findMany({
        where: whereClause,
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (prismaError: any) {
      console.warn('Prisma findMany query on commissions failed, trying auto-migration / raw SQL query:', prismaError.message);

      // Attempt auto-migration of slipUrls column
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `CommissionEntry` ADD COLUMN `slipUrls` LONGTEXT NULL');
      } catch (alterErr) {}

      try {
        if (entity && entity !== 'All') {
          entries = await prisma.$queryRawUnsafe<any[]>(
            'SELECT * FROM `CommissionEntry` WHERE `entity` = ? ORDER BY `date` DESC, `createdAt` DESC',
            entity
          );
        } else {
          entries = await prisma.$queryRawUnsafe<any[]>(
            'SELECT * FROM `CommissionEntry` ORDER BY `date` DESC, `createdAt` DESC'
          );
        }
      } catch (rawErr: any) {
        console.warn('Raw SELECT * on CommissionEntry failed:', rawErr.message);
      }
    }

    if (!entries || entries.length === 0) {
      const data = entity && entity !== 'All'
        ? mockCommissionEntries.filter(e => e.entity === entity)
        : mockCommissionEntries;
      return NextResponse.json({ success: true, data });
    }

    const formatted = entries.map(formatCommissionEntry);
    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Database error on /api/commissions GET:', error);
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

    let newEntry: any = null;

    try {
      newEntry = await (prisma as any).commissionEntry.create({
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
    } catch (createErr: any) {
      console.warn('Prisma commissionEntry.create failed, trying auto-migration / raw SQL insert:', createErr.message);

      let alterSuccess = false;
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `CommissionEntry` ADD COLUMN `slipUrls` LONGTEXT NULL');
        alterSuccess = true;
      } catch (e) {}

      if (alterSuccess) {
        try {
          newEntry = await (prisma as any).commissionEntry.create({
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
        } catch (e) {}
      }

      if (!newEntry) {
        const id = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = new Date();
        try {
          await prisma.$executeRawUnsafe(
            'INSERT INTO `CommissionEntry` (`id`, `entity`, `studentName`, `service`, `counselor`, `amount`, `date`, `fullReceived`, `counselorCommission`, `bmCommission`, `status`, `slipUrl`, `slipUrls`, `slipType`, `notes`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            id,
            entity,
            studentName.trim(),
            service,
            counselor,
            parseFloat(amount),
            date,
            fullReceived ? 1 : 0,
            parseFloat(counselorCommission) || 0,
            parseFloat(bmCommission) || 0,
            computedStatus,
            primarySlipUrl,
            finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null,
            slipType || (primarySlipUrl ? (primarySlipUrl.includes('application/pdf') ? 'pdf' : 'image') : null),
            notes ? notes.trim() : null,
            now,
            now
          );
        } catch (insertErr) {
          await prisma.$executeRawUnsafe(
            'INSERT INTO `CommissionEntry` (`id`, `entity`, `studentName`, `service`, `counselor`, `amount`, `date`, `fullReceived`, `counselorCommission`, `bmCommission`, `status`, `slipUrl`, `slipType`, `notes`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            id,
            entity,
            studentName.trim(),
            service,
            counselor,
            parseFloat(amount),
            date,
            fullReceived ? 1 : 0,
            parseFloat(counselorCommission) || 0,
            parseFloat(bmCommission) || 0,
            computedStatus,
            primarySlipUrl,
            slipType || (primarySlipUrl ? (primarySlipUrl.includes('application/pdf') ? 'pdf' : 'image') : null),
            notes ? notes.trim() : null,
            now,
            now
          );
        }

        newEntry = {
          id,
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
          createdAt: now,
          updatedAt: now,
        };
      }
    }

    return NextResponse.json({ success: true, data: formatCommissionEntry(newEntry) }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create commission entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create commission entry' },
      { status: 500 }
    );
  }
}
