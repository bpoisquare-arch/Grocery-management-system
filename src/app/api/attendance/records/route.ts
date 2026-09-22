import { NextRequest, NextResponse } from 'next/server'
import { getAttendanceRecords } from '@/lib/services/attendance.service'
import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    const session = token ? await verifyToken(token) : null

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const employeeId = searchParams.get('employeeId') || undefined
    const arrivalStatus = searchParams.get('arrivalStatus') || undefined
    const departureStatus = searchParams.get('departureStatus') || undefined
    let branch = searchParams.get('branch') || undefined

    // Enforce role-based branch restriction
    if (session) {
      if (session.role === 'LAHORE_USER') {
        branch = 'Lahore'
      } else if (session.role === 'MULTAN_USER') {
        branch = 'Multan'
      }
    }

    const records = await getAttendanceRecords({
      startDate,
      endDate,
      branch,
      employeeId,
      arrivalStatus,
      departureStatus,
    })

    return NextResponse.json({ success: true, records })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Strictly reject any modification attempts
export async function POST() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Updates not allowed.' }, { status: 403 })
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Updates not allowed.' }, { status: 403 })
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Deletions not allowed.' }, { status: 403 })
}
