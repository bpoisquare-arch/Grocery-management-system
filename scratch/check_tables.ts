import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    const tables: any[] = await prisma.$queryRawUnsafe('SHOW TABLES');
    console.log('Current tables in DB:', tables);
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
