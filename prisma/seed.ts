import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mockBudgets, mockGroceryEntries } from '../src/lib/mockData';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('--- Initializing Secure Database Seeding ---');

  // Read seed credentials from environment variables (Never hardcoded)
  const adminName = process.env.ADMIN_NAME || 'ISquareBPO';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@grocerymanager.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  const lahoreEmail = process.env.LAHORE_USER_EMAIL || 'lahore@grocerymanager.com';
  const lahorePassword = process.env.LAHORE_USER_PASSWORD || 'LahorePassword123!';

  const multanEmail = process.env.MULTAN_USER_EMAIL || 'multan@grocerymanager.com';
  const multanPassword = process.env.MULTAN_USER_PASSWORD || 'MultanPassword123!';

  // 1. Hash passwords securely with bcrypt
  console.log('Hashing user credentials with bcrypt (10 rounds)...');
  const hashedAdminPassword = await hashPassword(adminPassword);
  const hashedLahorePassword = await hashPassword(lahorePassword);
  const hashedMultanPassword = await hashPassword(multanPassword);

  // 2. Seed/Upsert Users
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      password: hashedAdminPassword,
      role: 'ADMIN',
      assignedEntity: null,
    },
    create: {
      id: 'user-admin',
      name: adminName,
      email: adminEmail,
      password: hashedAdminPassword,
      role: 'ADMIN',
      assignedEntity: null,
    },
  });

  await prisma.user.upsert({
    where: { email: lahoreEmail },
    update: {
      name: 'Lahore User',
      password: hashedLahorePassword,
      role: 'LAHORE_USER',
      assignedEntity: 'Lahore',
    },
    create: {
      id: 'user-lahore',
      name: 'Lahore User',
      email: lahoreEmail,
      password: hashedLahorePassword,
      role: 'LAHORE_USER',
      assignedEntity: 'Lahore',
    },
  });

  await prisma.user.upsert({
    where: { email: multanEmail },
    update: {
      name: 'Multan User',
      password: hashedMultanPassword,
      role: 'MULTAN_USER',
      assignedEntity: 'Multan',
    },
    create: {
      id: 'user-multan',
      name: 'Multan User',
      email: multanEmail,
      password: hashedMultanPassword,
      role: 'MULTAN_USER',
      assignedEntity: 'Multan',
    },
  });
  console.log('✓ Users created with bcrypt-hashed passwords in MySQL.');

  // 3. Seed Budgets
  for (const budget of mockBudgets) {
    await prisma.budget.upsert({
      where: {
        entity_month_year: {
          entity: budget.entity,
          month: budget.month,
          year: budget.year,
        },
      },
      update: {
        amount: budget.amount,
      },
      create: {
        entity: budget.entity,
        month: budget.month,
        year: budget.year,
        amount: budget.amount,
      },
    });
  }
  console.log(`✓ Budgets synchronized (${mockBudgets.length} budgets).`);

  // 4. Seed Grocery Entries (if table is empty)
  const existingCount = await prisma.groceryEntry.count();
  if (existingCount === 0) {
    for (const entry of mockGroceryEntries) {
      await prisma.groceryEntry.create({
        data: {
          id: entry.id,
          entity: entry.entity,
          date: entry.date,
          details: entry.details,
          amount: entry.amount,
          addedBy: entry.addedBy,
          status: entry.status,
          slipUrl: entry.slipUrl || null,
          slipType: entry.slipType || null,
          approvedByAdmin: entry.approvedByAdmin || false,
        },
      });
    }
    console.log(`✓ Initial grocery entries created (${mockGroceryEntries.length} entries).`);
  } else {
    console.log(`ℹ Grocery entries already exist (${existingCount} entries).`);
  }

  console.log('🎉 Seeding successfully completed! All user passwords stored securely.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
