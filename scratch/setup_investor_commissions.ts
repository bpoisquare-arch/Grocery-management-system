import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Setting up InvestorCommissionEntry Table ---');
  try {
    // 1. Create table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`InvestorCommissionEntry\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`srNo\` INT NOT NULL UNIQUE,
        \`studentName\` VARCHAR(255) NOT NULL,
        \`passportNo\` VARCHAR(100) NOT NULL UNIQUE,
        \`date\` VARCHAR(50) NOT NULL,
        \`amount\` DOUBLE NOT NULL,
        \`commissionRate\` DOUBLE NOT NULL DEFAULT 4.0,
        \`investorCommission\` DOUBLE NOT NULL,
        \`accountNo\` VARCHAR(100) NULL,
        \`reimbursed\` VARCHAR(50) NOT NULL DEFAULT 'Yes',
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Slip Missing',
        \`slipUrl\` LONGTEXT NULL,
        \`slipUrls\` LONGTEXT NULL,
        \`slipType\` VARCHAR(20) NULL,
        \`notes\` TEXT NULL,
        \`addedBy\` VARCHAR(100) NOT NULL DEFAULT 'Admin',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`idx_inv_comm_passport\` (\`passportNo\`),
        INDEX \`idx_inv_comm_date\` (\`date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table `InvestorCommissionEntry` checked/created successfully!');

    const count: any = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM `InvestorCommissionEntry`');
    console.log('Current count in InvestorCommissionEntry:', count[0]?.cnt);
  } catch (error) {
    console.error('Error in setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
