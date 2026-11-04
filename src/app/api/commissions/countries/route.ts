export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventBus } from '@/lib/eventBus';

const DEFAULT_COUNTRIES = ['Australia', 'New Zealand'];

// GET /api/commissions/countries - Fetch all available commission countries
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  try {
    let rows: any[] = [];
    try {
      rows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM `CommissionCountry` ORDER BY `name` ASC'
      );
    } catch (e: any) {
      console.warn('Error reading CommissionCountry table, initializing...', e.message);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`CommissionCountry\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`name\` VARCHAR(191) NOT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`CommissionCountry_name_key\` (\`name\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      for (const name of DEFAULT_COUNTRIES) {
        const id = 'country_' + Math.random().toString(36).substring(2, 10);
        try {
          await prisma.$executeRawUnsafe(
            'INSERT IGNORE INTO `CommissionCountry` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (?, ?, NOW(), NOW())',
            id,
            name
          );
        } catch {}
      }
      rows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM `CommissionCountry` ORDER BY `name` ASC'
      );
    }

    // Ensure default countries are present
    const countryNames = new Set(rows.map((r) => r.name.toLowerCase()));
    for (const def of DEFAULT_COUNTRIES) {
      if (!countryNames.has(def.toLowerCase())) {
        const id = 'country_' + Math.random().toString(36).substring(2, 10);
        try {
          await prisma.$executeRawUnsafe(
            'INSERT IGNORE INTO `CommissionCountry` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (?, ?, NOW(), NOW())',
            id,
            def
          );
          rows.push({ id, name: def });
        } catch {}
      }
    }

    // Sort: Australia and New Zealand first, then alphabetically
    const sorted = rows.sort((a, b) => {
      if (a.name === 'Australia') return -1;
      if (b.name === 'Australia') return 1;
      if (a.name === 'New Zealand') return -1;
      if (b.name === 'New Zealand') return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      data: sorted.map((r) => ({ id: r.id, name: r.name })),
    });
  } catch (err: any) {
    console.error('Error in GET /api/commissions/countries:', err);
    return NextResponse.json({
      success: true,
      data: DEFAULT_COUNTRIES.map((name, index) => ({ id: `country_${index}`, name })),
    });
  }
}

// POST /api/commissions/countries - Add a new country dynamically
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  if (session.role === 'AUDITOR') {
    return NextResponse.json({ success: false, error: 'Forbidden: Auditor account has view-only access.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = body.name ? String(body.name).trim() : '';

    if (!name) {
      return NextResponse.json({ success: false, error: 'Country name is required' }, { status: 400 });
    }

    const existing = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM `CommissionCountry` WHERE LOWER(`name`) = LOWER(?) LIMIT 1',
      name
    );

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        data: { id: existing[0].id, name: existing[0].name },
        message: 'Country already exists',
      });
    }

    const id = 'country_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date();

    await prisma.$executeRawUnsafe(
      'INSERT INTO `CommissionCountry` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?)',
      id,
      name,
      now,
      now
    );

    try {
      eventBus.emit('sync', { module: 'commission', type: 'country', action: 'create', name });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        data: { id, name },
        message: 'Country added successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error adding country in POST /api/commissions/countries:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add country' },
      { status: 500 }
    );
  }
}

