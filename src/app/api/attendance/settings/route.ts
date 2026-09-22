import { NextResponse } from 'next/server'
import { getAttendanceSettings } from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await getAttendanceSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Settings update not allowed.' }, { status: 403 })
}
