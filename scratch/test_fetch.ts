import { prisma } from '../src/lib/prisma';

async function testFetch() {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe('SELECT * FROM `LawChamberEntry` ORDER BY `srNo` ASC LIMIT 5');
    console.log('Fetched 5 rows:', rows);
  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testFetch();
