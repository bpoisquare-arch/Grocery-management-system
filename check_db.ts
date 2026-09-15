import { prisma } from './src/lib/prisma';

async function checkDatabase() {
  console.log('--- Checking Database Connection & Schema ---');
  try {
    // 1. Test basic connection
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('✅ Database connection successful!');

    // 2. Check GroceryEntry columns
    try {
      const columns: any[] = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `GroceryEntry`');
      const columnNames = columns.map((c: any) => c.Field);
      console.log('GroceryEntry columns:', columnNames);

      if (!columnNames.includes('category')) {
        console.log('Creating column "category" in GroceryEntry...');
        await prisma.$executeRawUnsafe('ALTER TABLE `GroceryEntry` ADD COLUMN `category` VARCHAR(255) NULL');
        console.log('✅ Column "category" added successfully to GroceryEntry table!');
      } else {
        console.log('✅ Column "category" already exists in GroceryEntry table!');
      }
    } catch (tableErr: any) {
      console.warn('Could not inspect GroceryEntry table:', tableErr.message);
    }

    // 3. Check GroceryCategory table
    try {
      const tables: any[] = await prisma.$queryRawUnsafe("SHOW TABLES LIKE 'GroceryCategory'");
      if (!tables || tables.length === 0) {
        console.log('Creating table "GroceryCategory"...');
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`GroceryCategory\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
            \`name\` VARCHAR(191) NOT NULL UNIQUE,
            \`type\` VARCHAR(50) NOT NULL DEFAULT 'Expense',
            \`entity\` VARCHAR(50) NOT NULL DEFAULT 'All',
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
          ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Table "GroceryCategory" created successfully!');
      } else {
        console.log('✅ Table "GroceryCategory" already exists!');
      }
    } catch (catTableErr: any) {
      console.warn('Could not inspect GroceryCategory table:', catTableErr.message);
    }

  } catch (error: any) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('--- Verification Complete ---');
  }
}

checkDatabase();
