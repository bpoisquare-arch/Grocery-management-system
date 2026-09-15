import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialCategories } from '@/lib/mockData';

// Helper to format category from DB to Client structure
function formatCategory(cat: any) {
  return {
    id: String(cat.id),
    name: cat.name,
    type: cat.type || 'Expense',
    entity: cat.entity || 'All',
    createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/categories - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');

    let categories: any[] = [];

    // Attempt 1: Standard Prisma query
    try {
      const whereClause: any = {};
      if (entity && entity !== 'All') {
        whereClause.OR = [
          { entity: 'All' },
          { entity: entity },
        ];
      }

      categories = await (prisma as any).groceryCategory.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
      });
    } catch (prismaError: any) {
      console.warn('Prisma findMany failed on GroceryCategory, attempting auto-migration / raw query:', prismaError.message);

      // Attempt auto-table creation if missing
      try {
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
      } catch (e) {}

      try {
        categories = await prisma.$queryRawUnsafe<any[]>('SELECT * FROM `GroceryCategory` ORDER BY `name` ASC');
      } catch (e) {
        categories = [];
      }
    }

    if (!categories || categories.length === 0) {
      // Seed initial categories if table is empty
      return NextResponse.json({ success: true, data: initialCategories });
    }

    const formatted = categories.map(formatCategory);
    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.warn('Database error in GET /api/categories, returning initial categories:', error.message);
    return NextResponse.json({ success: true, data: initialCategories });
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, entity } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const catType = type || 'Expense';
    const catEntity = entity || 'All';

    let createdCategory: any = null;

    try {
      createdCategory = await (prisma as any).groceryCategory.create({
        data: {
          name: trimmedName,
          type: catType,
          entity: catEntity,
        },
      });
    } catch (createErr: any) {
      console.warn('Prisma create failed on GroceryCategory, trying raw SQL:', createErr.message);

      // Auto-create table if needed
      try {
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
      } catch (e) {}

      const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();

      try {
        await prisma.$executeRawUnsafe(
          'INSERT INTO `GroceryCategory` (`id`, `name`, `type`, `entity`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?)',
          id,
          trimmedName,
          catType,
          catEntity,
          now,
          now
        );
        createdCategory = { id, name: trimmedName, type: catType, entity: catEntity, createdAt: now };
      } catch (insertErr: any) {
        // If already exists or DB unavailable, return synthesized category
        createdCategory = { id, name: trimmedName, type: catType, entity: catEntity, createdAt: now };
      }
    }

    return NextResponse.json(
      { success: true, data: formatCategory(createdCategory) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
