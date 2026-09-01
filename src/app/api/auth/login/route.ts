import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { mockBudgets, mockGroceryEntries } from '@/lib/mockData';

// Helper to ensure database is automatically seeded on first launch
async function ensureDatabaseInitialized() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('Database empty. Auto-initializing initial users, budgets, and groceries...');
      
      const adminHash = await hashPassword('AdminPassword123!');
      const lahoreHash = await hashPassword('LahorePassword123!');
      const multanHash = await hashPassword('MultanPassword123!');

      await prisma.user.createMany({
        data: [
          {
            id: 'user-admin',
            name: 'ISquareBPO',
            email: 'admin@grocerymanager.com',
            password: adminHash,
            role: 'ADMIN',
          },
          {
            id: 'user-lahore',
            name: 'Lahore User',
            email: 'lahore@grocerymanager.com',
            password: lahoreHash,
            role: 'LAHORE_USER',
            assignedEntity: 'Lahore',
          },
          {
            id: 'user-multan',
            name: 'Multan User',
            email: 'multan@grocerymanager.com',
            password: multanHash,
            role: 'MULTAN_USER',
            assignedEntity: 'Multan',
          },
        ],
      });

      // Seed initial budgets
      for (const budget of mockBudgets) {
        await prisma.budget.upsert({
          where: {
            entity_month_year: {
              entity: budget.entity,
              month: budget.month,
              year: budget.year,
            },
          },
          update: { amount: budget.amount },
          create: {
            entity: budget.entity,
            month: budget.month,
            year: budget.year,
            amount: budget.amount,
          },
        });
      }

      // Seed initial grocery entries
      for (const entry of mockGroceryEntries) {
        await prisma.groceryEntry.upsert({
          where: { id: entry.id },
          update: {},
          create: {
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

      console.log('Database auto-initialization complete.');
    }
  } catch (err) {
    console.error('Error during auto-initialization check:', err);
  }
}

// POST /api/auth/login - Authenticate user & issue HTTP-only cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate inputs
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Auto-seed database if empty on live host
    await ensureDatabaseInitialized();

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user from MySQL
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Compare entered password with stored bcrypt hash
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      assignedEntity: user.assignedEntity,
    });

    // Sanitized user object without password
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      assignedEntity: user.assignedEntity,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Logged in successfully.',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Database connection error during login. Please check database settings.' },
      { status: 500 }
    );
  }
}
