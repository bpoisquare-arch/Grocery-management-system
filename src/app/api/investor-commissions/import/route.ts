export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const rows = body.rows;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows provided for import.' }, { status: 400 });
    }

    // Fetch existing passports
    const existingRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT `passportNo`, `studentName`, `srNo` FROM `InvestorCommissionEntry`'
    );
    const existingPassportMap = new Map<string, { studentName: string; srNo: number }>();
    for (const r of existingRows) {
      if (r.passportNo) {
        existingPassportMap.set(r.passportNo.trim().toUpperCase(), {
          studentName: r.studentName,
          srNo: r.srNo,
        });
      }
    }

    // Get current max srNo
    const maxSrRows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT MAX(`srNo`) as maxSr FROM `InvestorCommissionEntry`'
    );
    let currentSrNo = maxSrRows[0]?.maxSr ? parseInt(maxSrRows[0].maxSr, 10) : 0;

    const inserted: any[] = [];
    const skipped: any[] = [];
    const addedByName = session.name || session.email || 'Admin';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const studentName = (row.studentName || row['Student Name'] || '').toString().trim();
      const passportNo = (row.passportNo || row['Passport No.'] || row['Passport No'] || row.passport || '').toString().trim().toUpperCase();
      let date = (row.date || row['Date'] || '').toString().trim();
      const rawAmount = row.amount !== undefined ? row.amount : row['Amount'];
      const amount = parseFloat(rawAmount) || 0;
      
      const rawRecRate = row.receivableCommissionRate ?? row['Receivable Commission %'] ?? row['Receivable Comm. %'] ?? row.commissionRate ?? row['Commission %'];
      const receivableCommissionRate = (rawRecRate !== undefined && rawRecRate !== null && rawRecRate !== '') ? parseFloat(rawRecRate) : 4.0;
      const receivableAmount = Math.round((amount * (receivableCommissionRate / 100)) * 100) / 100;

      const rawPayRate = row.payableCommissionRate ?? row['Payable Commission %'] ?? row['Payable Comm. %'];
      const payableCommissionRate = (rawPayRate !== undefined && rawPayRate !== null && rawPayRate !== '') ? parseFloat(rawPayRate) : 0.0;
      const payableAmount = Math.round((amount * (payableCommissionRate / 100)) * 100) / 100;
      const edlinkCommission = Math.round((receivableAmount - payableAmount) * 100) / 100;

      const rawDays = row.statementDays ?? row['Statement Days'];
      const statementDays = rawDays !== undefined && rawDays !== null && rawDays !== '' ? parseInt(String(rawDays), 10) || null : null;

      const accountNo = (row.accountNo || row['Account No'] || row['Account Number'] || '').toString().trim() || null;
      const reimbursed = (row.reimbursed || row['Paid to Investor'] || row['Reimbursed to Me'] || row['Reimbursed'] || 'No').toString().trim();

      if (!studentName || !passportNo) {
        skipped.push({
          row: i + 1,
          studentName: studentName || 'Unknown',
          passportNo: passportNo || 'Missing',
          reason: 'Student Name and Passport Number are mandatory.',
        });
        continue;
      }

      // Check if duplicate in DB or in already imported batch
      if (existingPassportMap.has(passportNo)) {
        const existingInfo = existingPassportMap.get(passportNo)!;
        skipped.push({
          row: i + 1,
          studentName,
          passportNo,
          reason: `Duplicate passport! Already exists in system for "${existingInfo.studentName}" (S.No: ${existingInfo.srNo}).`,
        });
        continue;
      }

      // Standardize date format if necessary
      if (date) {
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
          const [d, m, y] = date.split('/');
          date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      } else {
        date = new Date().toISOString().split('T')[0];
      }

      currentSrNo += 1;
      const id = `inv_${Date.now()}_${currentSrNo}_${Math.random().toString(36).substring(2, 6)}`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO \`InvestorCommissionEntry\` 
         (\`id\`, \`srNo\`, \`studentName\`, \`passportNo\`, \`date\`, \`amount\`, \`commissionRate\`, \`investorCommission\`, \`receivableCommissionRate\`, \`receivableAmount\`, \`payableCommissionRate\`, \`payableAmount\`, \`edlinkCommission\`, \`statementDays\`, \`accountNo\`, \`reimbursed\`, \`status\`, \`addedBy\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Slip Missing', ?, NOW(3), NOW(3))`,
        id,
        currentSrNo,
        studentName,
        passportNo,
        date,
        amount,
        receivableCommissionRate,
        receivableAmount,
        receivableCommissionRate,
        receivableAmount,
        payableCommissionRate,
        payableAmount,
        edlinkCommission,
        statementDays,
        accountNo,
        reimbursed || 'No',
        addedByName
      );

      existingPassportMap.set(passportNo, { studentName, srNo: currentSrNo });
      inserted.push({
        id,
        srNo: currentSrNo,
        studentName,
        passportNo,
        date,
        amount,
        commissionRate: receivableCommissionRate,
        investorCommission: receivableAmount,
        receivableCommissionRate,
        receivableAmount,
        payableCommissionRate,
        payableAmount,
        edlinkCommission,
        statementDays,
        accountNo,
        reimbursed: reimbursed || 'No',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Import complete: ${inserted.length} added, ${skipped.length} skipped.`,
      insertedCount: inserted.length,
      skippedCount: skipped.length,
      skippedDetails: skipped,
      inserted,
    });
  } catch (error: any) {
    console.error('Error in bulk import /api/investor-commissions/import:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
