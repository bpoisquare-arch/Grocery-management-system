import { NextRequest, NextResponse } from 'next/server'
import { getEmployees } from '@/lib/services/attendance.service'
import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    const session = token ? await verifyToken(token) : null

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    let branch = searchParams.get('branch') || undefined

    // Enforce role-based branch restriction
    if (session) {
      if (session.role === 'LAHORE_USER') {
        branch = 'Lahore'
      } else if (session.role === 'MULTAN_USER') {
        branch = 'Multan'
      }
    }

    const employees = await getEmployees({ branch, search, isActiveOnly: false })
    return NextResponse.json({ success: true, employees })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Employee creation not allowed.' }, { status: 403 })
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Employee editing not allowed.' }, { status: 403 })
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Employee deletion not allowed.' }, { status: 403 })
}
