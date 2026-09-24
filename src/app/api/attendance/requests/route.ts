import { NextRequest, NextResponse } from 'next/server'
import {
  getAttendanceRequests,
  createAttendanceRequest,
  cancelAttendanceRequest,
} from '@/lib/services/attendance-requests.service'
import { AUTH_COOKIE_NAME, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    const session = token ? await verifyToken(token) : null

    const { searchParams } = new URL(request.url)
    let branch = searchParams.get('branch') || undefined
    const status = searchParams.get('status') || undefined
    const employeeId = searchParams.get('employeeId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // Enforce branch security for branch users
    if (session) {
      if (session.role === 'LAHORE_USER') {
        branch = 'Lahore'
      } else if (session.role === 'MULTAN_USER') {
        branch = 'Multan'
      }
    }

    const requests = await getAttendanceRequests({
      branch,
      status,
      employeeId,
      startDate,
      endDate,
    })

    const pendingCount = requests.filter((r) => r.status === 'PENDING').length

    return NextResponse.json({
      success: true,
      requests,
      pendingCount,
      total: requests.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    const session = token ? await verifyToken(token) : null

    const body = await request.json()
    const {
      employee_id,
      employee_name,
      batch_id,
      branch: submittedBranch,
      attendance_date,
      request_type,
      leave_type,
      leave_duration,
      requested_in_time,
      requested_out_time,
      reason,
    } = body

    let effectiveBranch = submittedBranch
    if (session) {
      if (session.role === 'LAHORE_USER') {
        effectiveBranch = 'Lahore'
      } else if (session.role === 'MULTAN_USER') {
        effectiveBranch = 'Multan'
      }
    }

    if (!employee_id || !attendance_date || !effectiveBranch || !request_type) {
      return NextResponse.json(
        { success: false, error: 'Employee, date, branch, and request type are required.' },
        { status: 400 }
      )
    }

    const submittedBy = session ? `${session.name || session.email} (${effectiveBranch})` : `${effectiveBranch} Branch User`

    const newReq = await createAttendanceRequest({
      employee_id,
      employee_name,
      batch_id,
      branch: effectiveBranch,
      attendance_date,
      request_type,
      leave_type,
      leave_duration: typeof leave_duration === 'number' ? leave_duration : parseFloat(leave_duration) || 1,
      requested_in_time,
      requested_out_time,
      reason,
      submitted_by: submittedBy,
    })

    return NextResponse.json({ success: true, request: newReq })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('id')
    if (!requestId) {
      return NextResponse.json({ success: false, error: 'Request ID is required.' }, { status: 400 })
    }

    await cancelAttendanceRequest(requestId)
    return NextResponse.json({ success: true, message: 'Request cancelled successfully.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
