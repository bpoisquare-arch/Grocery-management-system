import { getSupabaseClient } from '@/lib/supabase/client'
import fs from 'fs'
import path from 'path'

export type AttendanceRequestType = 'LEAVE' | 'MISSING_IN' | 'MISSING_OUT'
export type AttendanceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface AttendanceRequestItem {
  id: string
  employee_id: string
  employee_name?: string
  batch_id?: string
  branch: string // 'Lahore' | 'Multan'
  attendance_date: string // 'YYYY-MM-DD'
  request_type: AttendanceRequestType
  leave_type?: string | null
  leave_duration?: number | null
  requested_in_time?: string | null
  requested_out_time?: string | null
  reason?: string | null
  status: AttendanceRequestStatus
  submitted_by?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  created_at: string
  updated_at: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getDayOfWeekName(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? 'Monday' : DAYS[d.getUTCDay()]
  } catch {
    return 'Monday'
  }
}

function getFallbackStorePath(): string {
  const p1 = path.resolve('D:\\Invoice Gen\\data\\attendance_requests.json')
  const p2 = path.resolve(process.cwd(), 'data', 'attendance_requests.json')

  try {
    const dir = path.dirname(p1)
    if (fs.existsSync(dir)) {
      return p1
    }
  } catch {}

  const dir2 = path.dirname(p2)
  if (!fs.existsSync(dir2)) {
    try {
      fs.mkdirSync(dir2, { recursive: true })
    } catch {}
  }
  return p2
}

function readFallbackRequests(): AttendanceRequestItem[] {
  try {
    const p = getFallbackStorePath()
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw || '[]')
    }
  } catch (err) {
    console.error('Error reading fallback requests in Grocery Management:', err)
  }
  return []
}

function writeFallbackRequests(items: AttendanceRequestItem[]) {
  try {
    const dataStr = JSON.stringify(items, null, 2)
    const p1 = path.resolve('D:\\Invoice Gen\\data\\attendance_requests.json')
    const p2 = path.resolve(process.cwd(), 'data', 'attendance_requests.json')
    try {
      fs.writeFileSync(p1, dataStr, 'utf-8')
    } catch {}
    try {
      const dir2 = path.dirname(p2)
      if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true })
      fs.writeFileSync(p2, dataStr, 'utf-8')
    } catch {}
  } catch (err) {
    console.error('Error writing fallback requests in Grocery Management:', err)
  }
}

/**
 * 1. Fetch Requests for branch or user
 * Priority: Supabase attendance_records (live cloud sync) -> dedicated table -> local store fallback
 */
export async function getAttendanceRequests(filter?: {
  branch?: string
  status?: string
  employeeId?: string
  startDate?: string
  endDate?: string
}): Promise<AttendanceRequestItem[]> {
  const supabase: any = getSupabaseClient()
  let requestsList: AttendanceRequestItem[] = []

  // 1. Try dedicated table if exists
  try {
    let query = supabase.from('attendance_requests').select('*').order('created_at', { ascending: false })

    if (filter?.branch && filter.branch !== 'all') {
      query = query.ilike('branch', `%${filter.branch}%`)
    }
    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status)
    }
    if (filter?.employeeId && filter.employeeId !== 'all') {
      query = query.eq('employee_id', filter.employeeId)
    }
    if (filter?.startDate) {
      query = query.gte('attendance_date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('attendance_date', filter.endDate)
    }

    const { data, error } = await query

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as AttendanceRequestItem[]
    }
  } catch {}

  // 2. ALWAYS query Supabase attendance_records table (live cloud persistence across ALL deployments)
  try {
    let recQuery = supabase
      .from('attendance_records')
      .select('id, employee_id, attendance_date, arrival_status, departure_status, raw_punches')
      .not('raw_punches', 'is', null)
      .order('attendance_date', { ascending: false })

    if (filter?.startDate) {
      recQuery = recQuery.gte('attendance_date', filter.startDate)
    }
    if (filter?.endDate) {
      recQuery = recQuery.lte('attendance_date', filter.endDate)
    }
    if (filter?.employeeId && filter.employeeId !== 'all') {
      recQuery = recQuery.eq('employee_id', filter.employeeId)
    }

    const { data: recs, error: recErr } = await recQuery

    if (!recErr && recs && (recs as any[]).length > 0) {
      for (const r of recs as any[]) {
        if (!Array.isArray(r.raw_punches)) continue
        const reqObj: any = (r.raw_punches as any[]).find((p: any) => p && p.type === 'BRANCH_REQUEST')
        if (reqObj) {
          const item: AttendanceRequestItem = {
            id: reqObj.id || reqObj.request_id || `req-${r.id}`,
            employee_id: reqObj.employee_id || r.employee_id,
            employee_name: reqObj.employee_name || '',
            batch_id: reqObj.batch_id || '',
            branch: reqObj.branch || 'Multan',
            attendance_date: reqObj.attendance_date || r.attendance_date,
            request_type: reqObj.request_type || 'LEAVE',
            leave_type: reqObj.leave_type || null,
            leave_duration: reqObj.leave_duration !== undefined ? reqObj.leave_duration : 1,
            requested_in_time: reqObj.requested_in_time || null,
            requested_out_time: reqObj.requested_out_time || null,
            reason: reqObj.reason || null,
            status: reqObj.status || 'PENDING',
            submitted_by: reqObj.submitted_by || 'Branch User',
            reviewed_by: reqObj.reviewed_by || null,
            reviewed_at: reqObj.reviewed_at || null,
            review_notes: reqObj.review_notes || null,
            created_at: reqObj.created_at || r.attendance_date,
            updated_at: reqObj.updated_at || r.attendance_date,
          }
          requestsList.push(item)
        }
      }
    }
  } catch (err) {
    console.error('Error fetching live requests from attendance_records in Grocery Management:', err)
  }

  // 3. Fallback to local store as extra layer
  try {
    const local = readFallbackRequests()
    for (const loc of local) {
      if (!requestsList.some((r) => r.id === loc.id || (r.employee_id === loc.employee_id && r.attendance_date === loc.attendance_date))) {
        requestsList.push(loc)
      }
    }
  } catch {}

  // Filter in-memory
  if (filter?.branch && filter.branch !== 'all') {
    requestsList = requestsList.filter((r) => (r.branch || '').toLowerCase().includes(filter.branch!.toLowerCase()))
  }
  if (filter?.status && filter.status !== 'all') {
    requestsList = requestsList.filter((r) => r.status === filter.status)
  }
  if (filter?.employeeId && filter.employeeId !== 'all') {
    requestsList = requestsList.filter((r) => r.employee_id === filter.employeeId)
  }
  if (filter?.startDate) {
    requestsList = requestsList.filter((r) => r.attendance_date >= filter.startDate!)
  }
  if (filter?.endDate) {
    requestsList = requestsList.filter((r) => r.attendance_date <= filter.endDate!)
  }

  return requestsList.sort((a, b) => new Date(b.created_at || b.attendance_date).getTime() - new Date(a.created_at || a.attendance_date).getTime())
}

/**
 * 2. Create Attendance Request from Branch User
 * Persists 100% to Supabase cloud `attendance_records` so MIS (Invoice Gen) on live server immediately receives it!
 */
export async function createAttendanceRequest(params: {
  employee_id: string
  employee_name?: string
  batch_id?: string
  branch: string
  attendance_date: string
  request_type: AttendanceRequestType
  leave_type?: string | null
  leave_duration?: number | null
  requested_in_time?: string | null
  requested_out_time?: string | null
  reason?: string | null
  submitted_by?: string | null
}): Promise<AttendanceRequestItem> {
  const newItem: AttendanceRequestItem = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    employee_id: params.employee_id,
    employee_name: params.employee_name || '',
    batch_id: params.batch_id || '',
    branch: params.branch,
    attendance_date: params.attendance_date,
    request_type: params.request_type,
    leave_type: params.leave_type || null,
    leave_duration: params.leave_duration !== undefined ? params.leave_duration : (params.request_type === 'LEAVE' ? 1 : null),
    requested_in_time: params.requested_in_time || null,
    requested_out_time: params.requested_out_time || null,
    reason: params.reason || null,
    status: 'PENDING',
    submitted_by: params.submitted_by || `${params.branch} Branch User`,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const supabase: any = getSupabaseClient()

  // 1. Try dedicated table if exists
  try {
    await supabase.from('attendance_requests').insert(newItem as any)
  } catch {}

  // 2. ALWAYS sync directly to `attendance_records` table in Supabase
  try {
    const { data: existingRecs } = await supabase
      .from('attendance_records')
      .select('id, employee_id, attendance_date, raw_punches')
      .eq('employee_id', newItem.employee_id)
      .eq('attendance_date', newItem.attendance_date)
      .limit(1)

    const branchReqPayload = {
      type: 'BRANCH_REQUEST',
      ...newItem,
    }

    if (existingRecs && (existingRecs as any[]).length > 0) {
      const rec = (existingRecs as any[])[0]
      const punches = Array.isArray(rec.raw_punches) ? [...rec.raw_punches] : []
      const updatedPunches = [
        ...punches.filter((p: any) => p && p.type !== 'BRANCH_REQUEST'),
        branchReqPayload,
      ]
      await supabase
        .from('attendance_records')
        .update({
          raw_punches: updatedPunches,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rec.id)
    } else {
      const dayName = getDayOfWeekName(newItem.attendance_date)
      await supabase
        .from('attendance_records')
        .insert({
          employee_id: newItem.employee_id,
          attendance_date: newItem.attendance_date,
          day_of_week: dayName,
          arrival_status: 'Absent',
          departure_status: 'Absent',
          raw_punches: [branchReqPayload],
          updated_at: new Date().toISOString(),
        })
    }
  } catch (syncErr) {
    console.error('Error syncing request to attendance_records in Supabase:', syncErr)
  }

  // 3. Fallback save to local store
  try {
    const current = readFallbackRequests().filter(
      (r) => !(r.employee_id === newItem.employee_id && r.attendance_date === newItem.attendance_date && r.status === 'PENDING')
    )
    writeFallbackRequests([newItem, ...current])
  } catch {}

  return newItem
}

/**
 * 3. Cancel / Withdraw Pending Request
 */
export async function cancelAttendanceRequest(requestId: string): Promise<boolean> {
  const supabase: any = getSupabaseClient()
  try {
    await supabase.from('attendance_requests').delete().eq('id', requestId).eq('status', 'PENDING')
  } catch {}

  // Also remove from attendance_records in Supabase!
  try {
    const { data: recs } = await supabase
      .from('attendance_records')
      .select('id, raw_punches')
      .not('raw_punches', 'is', null)

    if (recs && (recs as any[]).length > 0) {
      for (const rec of recs as any[]) {
        if (!Array.isArray(rec.raw_punches)) continue
        const reqObj: any = (rec.raw_punches as any[]).find(
          (p: any) => p && (p.id === requestId || p.request_id === requestId || `req-${rec.id}` === requestId)
        )
        if (reqObj) {
          const updatedPunches = (rec.raw_punches as any[]).filter(
            (p: any) => !(p && (p.id === requestId || p.request_id === requestId || `req-${rec.id}` === requestId))
          )
          await supabase
            .from('attendance_records')
            .update({ raw_punches: updatedPunches, updated_at: new Date().toISOString() })
            .eq('id', rec.id)
          break
        }
      }
    }
  } catch (err) {
    console.error('Error removing cancelled request from attendance_records in Supabase:', err)
  }

  const current = readFallbackRequests().filter((r) => !(r.id === requestId && r.status === 'PENDING'))
  writeFallbackRequests(current)
  return true
}
