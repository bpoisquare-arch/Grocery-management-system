export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvestorCommissionEntry } from '@/lib/investorCommissionsTypes';

function formatEntry(entry: any): InvestorCommissionEntry {
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

  const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount) || 0;
  const commissionRate = typeof entry.commissionRate === 'number'
    ? entry.commissionRate
    : parseFloat(entry.commissionRate) || 4.0;
  const investorCommission = typeof entry.investorCommission === 'number'
    ? entry.investorCommission
    : parseFloat(entry.investorCommission) || Math.round((amount * (commissionRate / 100)) * 100) / 100;

  return {
    id: String(entry.id),
    srNo: typeof entry.srNo === 'number' ? entry.srNo : parseInt(entry.srNo, 10) || 0,
    studentName: entry.studentName || '',
    passportNo: (entry.passportNo || '').trim(),
    date: entry.date || '',
    amount,
    commissionRate,
    investorCommission,
    accountNo: entry.accountNo ? String(entry.accountNo).trim() : null,
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

// GET /api/investor-commissions - Fetch all student records
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  try {
    const rawRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `InvestorCommissionEntry` ORDER BY `srNo` ASC'
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
    console.error('Error fetching Investor Commissions entries:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/investor-commissions - Create a new student entry with duplicate passport checking
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
      commissionRate = 4.0,
      accountNo,
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

    const numRate = parseFloat(commissionRate) >= 0 ? parseFloat(commissionRate) : 4.0;
    const computedCommission = Math.round((numAmount * (numRate / 100)) * 100) / 100;
    const trimmedAccountNo = accountNo ? String(accountNo).trim() : null;

    // Duplicate passport number check
    const existingDuplicates = await prisma.$queryRawUnsafe<any[]>(
      'SELECT `id`, `srNo`, `studentName`, `passportNo`, `date` FROM `InvestorCommissionEntry` WHERE UPPER(TRIM(`passportNo`)) = ? LIMIT 1',
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
      'SELECT MAX(`srNo`) as maxSr FROM `InvestorCommissionEntry`'
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

    const id = `inv_${Date.now()}_${nextSrNo}_${Math.random().toString(36).substring(2, 7)}`;
    const addedByName = session.name || session.email || 'Admin';

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`InvestorCommissionEntry\` 
       (\`id\`, \`srNo\`, \`studentName\`, \`passportNo\`, \`date\`, \`amount\`, \`commissionRate\`, \`investorCommission\`, \`accountNo\`, \`reimbursed\`, \`status\`, \`slipUrl\`, \`slipUrls\`, \`slipType\`, \`notes\`, \`addedBy\`, \`createdAt\`, \`updatedAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      id,
      nextSrNo,
      trimmedName,
      trimmedPassport,
      date,
      numAmount,
      numRate,
      computedCommission,
      trimmedAccountNo,
      reimbursed || 'Yes',
      status,
      primarySlipUrl,
      finalSlipUrlsJson,
      computedSlipType,
      notes || null,
      addedByName
    );

    const insertedRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `InvestorCommissionEntry` WHERE `id` = ? LIMIT 1',
      id
    );

    const created = formatEntry(insertedRows[0]);
    return NextResponse.json({ success: true, data: created, message: 'Investor Commission entry added successfully.' });
  } catch (error: any) {
    console.error('Error in POST /api/investor-commissions:', error.message);
    if (error.message?.includes('Duplicate') || error.message?.includes('passportNo')) {
      return NextResponse.json({ success: false, error: 'This passport number is already registered in the system.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/investor-commissions - Update existing student entry
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
      commissionRate = 4.0,
      accountNo,
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
      'SELECT * FROM `InvestorCommissionEntry` WHERE `id` = ? LIMIT 1',
      id
    );
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Entry not found.' }, { status: 404 });
    }
    const existing = existingRows[0];

    // Check duplicate passport against OTHER records
    if (trimmedPassport && trimmedPassport !== (existing.passportNo || '').toUpperCase()) {
      const dupRows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT `id`, `srNo`, `studentName` FROM `InvestorCommissionEntry` WHERE UPPER(TRIM(`passportNo`)) = ? AND `id` != ? LIMIT 1',
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

    const finalAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    const finalRate = commissionRate !== undefined ? parseFloat(commissionRate) : (existing.commissionRate || 4.0);
    const computedCommission = Math.round((finalAmount * (finalRate / 100)) * 100) / 100;
    const finalAccountNo = accountNo !== undefined ? (accountNo ? String(accountNo).trim() : null) : existing.accountNo;

    const finalSlipUrls: string[] = Array.isArray(slipUrls)
      ? slipUrls
      : slipUrl ? [slipUrl] : [];

    const primarySlipUrl = finalSlipUrls[0] || slipUrl || (finalSlipUrls.length === 0 ? null : existing.slipUrl);
    const finalSlipUrlsJson = finalSlipUrls.length > 0 ? JSON.stringify(finalSlipUrls) : null;
    const status = (finalSlipUrls.length > 0 || primarySlipUrl) ? 'Slip Uploaded' : 'Slip Missing';
    const computedSlipType = slipType || (primarySlipUrl && (primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')) ? 'pdf' : (primarySlipUrl ? 'image' : null));

    await prisma.$executeRawUnsafe(
      `UPDATE \`InvestorCommissionEntry\` SET 
        \`studentName\` = ?,
        \`passportNo\` = ?,
        \`date\` = ?,
        \`amount\` = ?,
        \`commissionRate\` = ?,
        \`investorCommission\` = ?,
        \`accountNo\` = ?,
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
      finalAmount,
      finalRate,
      computedCommission,
      finalAccountNo,
      reimbursed || existing.reimbursed,
      status,
      primarySlipUrl,
      finalSlipUrlsJson,
      computedSlipType,
      notes !== undefined ? notes : existing.notes,
      id
    );

    const updatedRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `InvestorCommissionEntry` WHERE `id` = ? LIMIT 1',
      id
    );

    const updated = formatEntry(updatedRows[0]);
    return NextResponse.json({ success: true, data: updated, message: 'Record updated successfully.' });
  } catch (error: any) {
    console.error('Error in PUT /api/investor-commissions:', error.message);
    if (error.message?.includes('Duplicate') || error.message?.includes('passportNo')) {
      return NextResponse.json({ success: false, error: 'This passport number is already registered for another student.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/investor-commissions - Single or Bulk Deletion
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
    const singleId = searchParams.get('id');

    if (singleId) {
      await prisma.$executeRawUnsafe('DELETE FROM `InvestorCommissionEntry` WHERE `id` = ?', singleId);
      return NextResponse.json({ success: true, message: 'Entry deleted successfully.' });
    }

    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Please provide ID(s) to delete.' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`InvestorCommissionEntry\` WHERE \`id\` IN (${placeholders})`,
      ...ids
    );

    return NextResponse.json({ success: true, message: `Successfully deleted ${ids.length} entries.` });
  } catch (error: any) {
    console.error('Error in DELETE /api/investor-commissions:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
