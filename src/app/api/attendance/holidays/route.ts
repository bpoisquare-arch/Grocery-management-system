import { NextResponse } from 'next/server'
import { getGazettedHolidays } from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const holidays = await getGazettedHolidays()
    return NextResponse.json({ success: true, holidays })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Read-only mode. Holidays cannot be modified.' }, { status: 403 })
}
