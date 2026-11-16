export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LawChamberEntry } from '@/lib/lawChambersTypes';

function formatEntry(entry: any): LawChamberEntry {
  let slipUrls: string[] | undefined = undefined;
  if (entry.slipUrls) {
    try {
      slipUrls = typeof entry.slipUrls === 'string' ? JSON.parse(entry.slipUrls) : entry.slipUrls;
    } catch {
      slipUrls = undefined;
    }
  }

  if (!slipUrls && entry.slipUrl) {
    slipUrls = [entry.slipUrl];
  }

  const primarySlipUrl = (slipUrls && slipUrls.length > 0) ? slipUrls[0] : (entry.slipUrl || null);
  const status = (slipUrls && slipUrls.length > 0) || entry.slipUrl ? 'Slip Uploaded' : 'Slip Missing';

  return {
    id: String(entry.id),
    srNo: typeof entry.srNo === 'number' ? entry.srNo : parseInt(entry.srNo, 10) || 0,
    studentName: entry.studentName || '',
    passportNo: (entry.passportNo || '').trim(),
    date: entry.date || '',
    amount: typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount) || 0,
    reimbursed: entry.reimbursed || 'Yes',
    status: entry.status || status,
    slipUrl: primarySlipUrl,
    slipUrls: slipUrls && slipUrls.length > 0 ? slipUrls : undefined,
    slipType: entry.slipType || (primarySlipUrl && (primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')) ? 'pdf' : 'image'),
    notes: entry.notes || null,
    addedBy: entry.addedBy || 'Admin',
    createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/law-chambers - Fetch all student records
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  try {
    const rawRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `LawChamberEntry` ORDER BY `srNo` ASC'
    );
    const data = rawRows.map(formatEntry);

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching Law Chambers entries:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/law-chambers - Create a new student entry with duplicate passport checking
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }
  if (session.role === 'AUDITOR') {
    return NextResponse.json({ success: false, error: 'Auditor has view-only access.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      studentName,
      passportNo,
      date,
      amount,
      reimbursed = 'Yes',
      slipUrl,
      slipUrls,
      slipType,
      notes,
    } = body;

    const trimmedName = (studentName || '').trim();
    const trimmedPassport = (passportNo || '').trim().toUpperCase();

    if (!trimmedName) {
      return NextResponse.json({ success: false, error: 'Student Name is required.' }, { status: 400 });
    }
    if (!trimmedPassport) {
      return NextResponse.json({ success: false, error: 'Passport Number is required.' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required.' }, { status: 400 });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json({ success: false, error: 'Valid Amount is required.' }, { status: 400 });
    }

    // MAIN LOGIC: Check previous record for duplicate passport number!
    const existingDuplicates = await prisma.$queryRawUnsafe<any[]>(
      'SELECT `id`, `srNo`, `studentName`, `passportNo`, `date` FROM `LawChamberEntry` WHERE UPPER(TRIM(`passportNo`)) = ? LIMIT 1',
      trimmedPassport
    );

    if (existingDuplicates && existingDuplicates.length > 0) {
      const dup = existingDuplicates[0];
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate Entry! Passport No "${trimmedPassport}" already exists in records for student "${dup.studentName}" (S.No: ${dup.srNo}, Date: ${dup.date}). Duplicate entries are not allowed.`,
        },
        { status: 409 }
      );
    }

    // Determine Next Unique Sr. No
    const maxSrRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT MAX(`srNo`) as maxSr FROM `LawChamberEntry`'
    );
    const nextSrNo = (maxSrRows[0]?.maxSr ? parseInt(maxSrRows[0].maxSr, 10) : 0) + 1;

    // Process Slips
    const finalSlipUrls: string[] = Array.isArray(slipUrls) && slipUrls.length > 0
      ? slipUrls.slice(0, 10)
      : slipUrl ? [slipUrl] : [];

    const primarySlipUrl = finalSlipUrls[0] || slipUrl || null;
    const finalSlipUrlsJson = finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null;
    const status = finalSlipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing';
    const computedSlipType = slipType || (primarySlipUrl && (primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')) ? 'pdf' : (primarySlipUrl ? 'image' : null));

    const id = `clc_${Date.now()}_${nextSrNo}_${Math.random().toString(36).substring(2, 7)}`;
    const addedByName = session.name || session.email || 'Admin';

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`LawChamberEntry\` 
       (\`id\`, \`srNo\`, \`studentName\`, \`passportNo\`, \`date\`, \`amount\`, \`reimbursed\`, \`status\`, \`slipUrl\`, \`slipUrls\`, \`slipType\`, \`notes\`, \`addedBy\`, \`createdAt\`, \`updatedAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      id,
      nextSrNo,
      trimmedName,
      trimmedPassport,
      date,
      numAmount,
      reimbursed || 'Yes',
      status,
      primarySlipUrl,
      finalSlipUrlsJson,
      computedSlipType,
      notes || null,
      addedByName
    );

    const insertedRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `LawChamberEntry` WHERE `id` = ? LIMIT 1',
      id
    );

    const created = formatEntry(insertedRows[0]);
    return NextResponse.json({ success: true, data: created, message: 'Student entry added successfully.' });
  } catch (error: any) {
    console.error('Error in POST /api/law-chambers:', error.message);
    if (error.message?.includes('Duplicate') || error.message?.includes('passportNo')) {
      return NextResponse.json({ success: false, error: 'This passport number is already registered in the system.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/law-chambers - Update existing student entry
export async function PUT(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }
  if (session.role === 'AUDITOR') {
    return NextResponse.json({ success: false, error: 'Auditor has view-only access.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      id,
      studentName,
      passportNo,
      date,
      amount,
      reimbursed,
      slipUrl,
      slipUrls,
      slipType,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Entry ID is required.' }, { status: 400 });
    }

    const trimmedName = (studentName || '').trim();
    const trimmedPassport = (passportNo || '').trim().toUpperCase();

    // Check if target entry exists
    const existingRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `LawChamberEntry` WHERE `id` = ? LIMIT 1',
      id
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Entry not found.' }, { status: 404 });
    }
    const existing = existingRows[0];

    // Check duplicate passport against OTHER records
    if (trimmedPassport && trimmedPassport !== (existing.passportNo || '').toUpperCase()) {
      const dupRows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT `id`, `srNo`, `studentName` FROM `LawChamberEntry` WHERE UPPER(TRIM(`passportNo`)) = ? AND `id` != ? LIMIT 1',
        trimmedPassport,
        id
      );
      if (dupRows && dupRows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Passport "${trimmedPassport}" is already in use by student "${dupRows[0].studentName}" (S.No: ${dupRows[0].srNo}). Duplicate entries are not allowed.`,
          },
          { status: 409 }
        );
      }
    }

    const finalSlipUrls: string[] = Array.isArray(slipUrls)
      ? slipUrls
      : slipUrl ? [slipUrl] : [];

    const primarySlipUrl = finalSlipUrls[0] || slipUrl || null;
    const finalSlipUrlsJson = finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null;
    const status = finalSlipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing';
    const computedSlipType = slipType || (primarySlipUrl && (primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')) ? 'pdf' : (primarySlipUrl ? 'image' : null));

    await prisma.$executeRawUnsafe(
      `UPDATE \`LawChamberEntry\` SET 
        \`studentName\` = ?,
        \`passportNo\` = ?,
        \`date\` = ?,
        \`amount\` = ?,
        \`reimbursed\` = ?,
        \`status\` = ?,
        \`slipUrl\` = ?,
        \`slipUrls\` = ?,
        \`slipType\` = ?,
        \`notes\` = ?,
        \`updatedAt\` = NOW(3)
       WHERE \`id\` = ?`,
      trimmedName || existing.studentName,
      trimmedPassport || existing.passportNo,
      date || existing.date,
      amount !== undefined ? parseFloat(amount) : existing.amount,
      reimbursed !== undefined ? reimbursed : existing.reimbursed,
      status,
      primarySlipUrl,
      finalSlipUrlsJson,
      computedSlipType,
      notes !== undefined ? notes : existing.notes,
      id
    );

    const updatedRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `LawChamberEntry` WHERE `id` = ? LIMIT 1',
      id
    );

    return NextResponse.json({
      success: true,
      data: formatEntry(updatedRows[0]),
      message: 'Student entry updated successfully.',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/law-chambers:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/law-chambers - Delete single or multiple student entries
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }
  if (session.role === 'AUDITOR') {
    return NextResponse.json({ success: false, error: 'Auditor has view-only access.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    let idsToDelete: string[] = [];
    if (idParam) {
      idsToDelete = [idParam];
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.ids && Array.isArray(body.ids)) {
        idsToDelete = body.ids;
      } else if (body.id) {
        idsToDelete = [body.id];
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: 'No ID(s) provided for deletion.' }, { status: 400 });
    }

    for (const id of idsToDelete) {
      await prisma.$executeRawUnsafe('DELETE FROM `LawChamberEntry` WHERE `id` = ?', id);
    }

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length} entry/entries deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/law-chambers:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
