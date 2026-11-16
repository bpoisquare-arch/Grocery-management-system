import { prisma } from '../src/lib/prisma';

const initialStudents = [
  { srNo: 1, studentName: 'M Mohsin Wakeel', passportNo: 'AU6309431', date: '2026-06-23', amount: 5000, reimbursed: 'Yes' },
  { srNo: 2, studentName: 'Mudassar Ijaz khokar', passportNo: 'WV4166251', date: '2026-06-24', amount: 5000, reimbursed: 'Yes' },
  { srNo: 3, studentName: 'M Absaar Aqeel', passportNo: 'AQ1305932', date: '2026-07-27', amount: 5000, reimbursed: 'Yes' },
  { srNo: 4, studentName: 'Rimsha Mubarak', passportNo: 'AM0025431', date: '2026-08-05', amount: 5000, reimbursed: 'Yes' },
  { srNo: 5, studentName: 'Huzaifa Tariq', passportNo: 'FD7965372', date: '2026-08-13', amount: 5000, reimbursed: 'Yes' },
  { srNo: 6, studentName: 'Ray Moeez Mubashar', passportNo: 'AX0011311', date: '2026-08-13', amount: 5000, reimbursed: 'Yes' },
  { srNo: 7, studentName: 'M Junaid Khan', passportNo: 'TH4165021', date: '2026-08-18', amount: 5000, reimbursed: 'Yes' },
  { srNo: 8, studentName: 'M Ali Khan', passportNo: 'UD4169731', date: '2026-08-22', amount: 5000, reimbursed: 'Yes' },
  { srNo: 9, studentName: 'Arbab Riaz', passportNo: 'GK9916142', date: '2026-09-03', amount: 5000, reimbursed: 'Yes' },
  { srNo: 10, studentName: 'Shafaq Mazhar', passportNo: 'HC0840631', date: '2026-09-14', amount: 5000, reimbursed: 'Yes' },
  { srNo: 11, studentName: 'Bilal Zafar', passportNo: 'DX5521351', date: '2026-09-14', amount: 5000, reimbursed: 'Yes' },
  { srNo: 12, studentName: 'M Abdullah (Abdul Khaliq)', passportNo: 'RE1076711', date: '2026-09-14', amount: 5000, reimbursed: 'Yes' },
  { srNo: 13, studentName: 'Ammar Bin Yasir', passportNo: 'KT1229352', date: '2026-09-15', amount: 5000, reimbursed: 'Yes' },
  { srNo: 14, studentName: 'Zubair Ilyas', passportNo: 'JH1745601', date: '2026-09-24', amount: 5000, reimbursed: 'Yes' },
  { srNo: 15, studentName: 'M Farhan', passportNo: 'DG8943661', date: '2026-10-02', amount: 5000, reimbursed: 'Yes' },
  { srNo: 16, studentName: 'Umer Basharat', passportNo: 'BF5742961', date: '2026-10-06', amount: 5000, reimbursed: 'Yes' },
  { srNo: 17, studentName: 'M Subhan (Zaheer Ahmad )', passportNo: 'BJ5043651', date: '2026-10-07', amount: 5000, reimbursed: 'Yes' },
  { srNo: 18, studentName: 'Ali Abid Razzaq', passportNo: 'QR1073361', date: '2026-10-07', amount: 5000, reimbursed: 'Yes' },
  { srNo: 19, studentName: 'Khayyam Ali', passportNo: 'SL1850491', date: '2026-10-07', amount: 5000, reimbursed: 'Yes' },
  { srNo: 20, studentName: 'M Asif Ateeq', passportNo: 'HA1837931', date: '2026-10-07', amount: 5000, reimbursed: 'Yes' },
  { srNo: 21, studentName: 'Umair Maqbool', passportNo: 'AM0338371', date: '2026-10-07', amount: 5000, reimbursed: 'Yes' },
  { srNo: 22, studentName: 'M Tasmeer Rohan', passportNo: 'CK9105131', date: '2026-10-07', amount: 5000, reimbursed: 'Yes' },
];

async function main() {
  console.log('--- Setting up LawChamberEntry Table ---');
  try {
    // 1. Create table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`LawChamberEntry\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`srNo\` INT NOT NULL UNIQUE,
        \`studentName\` VARCHAR(255) NOT NULL,
        \`passportNo\` VARCHAR(100) NOT NULL UNIQUE,
        \`date\` VARCHAR(50) NOT NULL,
        \`amount\` DOUBLE NOT NULL,
        \`reimbursed\` VARCHAR(50) NOT NULL DEFAULT 'Yes',
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Slip Missing',
        \`slipUrl\` LONGTEXT NULL,
        \`slipUrls\` LONGTEXT NULL,
        \`slipType\` VARCHAR(50) NULL,
        \`notes\` TEXT NULL,
        \`addedBy\` VARCHAR(255) NOT NULL DEFAULT 'Admin',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`idx_law_chamber_passport\` (\`passportNo\`),
        INDEX \`idx_law_chamber_date\` (\`date\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ LawChamberEntry table confirmed/created!');

    // 2. Check if records exist
    const countResult: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM `LawChamberEntry`');
    const count = Number(countResult[0]?.cnt || 0);
    console.log(`Current records in LawChamberEntry: ${count}`);

    if (count === 0) {
      console.log('Seeding initial 22 records from attachment...');
      for (const st of initialStudents) {
        const id = `clc_${Date.now()}_${st.srNo}_${Math.random().toString(36).substring(2, 6)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO \`LawChamberEntry\` (\`id\`, \`srNo\`, \`studentName\`, \`passportNo\`, \`date\`, \`amount\`, \`reimbursed\`, \`status\`, \`addedBy\`, \`createdAt\`, \`updatedAt\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Slip Missing', 'Admin', NOW(3), NOW(3))`,
          id,
          st.srNo,
          st.studentName,
          st.passportNo,
          st.date,
          st.amount,
          st.reimbursed
        );
      }
      console.log('✅ 22 records successfully seeded!');
    }
  } catch (err: any) {
    console.error('❌ Error during setup:', err.message);
  } finally {
    await prisma.$disconnect();
    console.log('Done.');
  }
}

main();
