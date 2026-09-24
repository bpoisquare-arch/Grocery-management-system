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
 */
export async function getAttendanceRequests(filter?: {
  branch?: string
  status?: string
  employeeId?: string
  startDate?: string
  endDate?: string
}): Promise<AttendanceRequestItem[]> {
  try {
    const supabase = getSupabaseClient()
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

    if (!error && Array.isArray(data)) {
      return data as AttendanceRequestItem[]
    }
  } catch {
    // If Supabase table does not exist yet, fallback to file store
  }

  let items = readFallbackRequests()
  if (filter?.branch && filter.branch !== 'all') {
    items = items.filter((r) => r.branch.toLowerCase() === filter.branch!.toLowerCase())
  }
  if (filter?.status && filter.status !== 'all') {
    items = items.filter((r) => r.status === filter.status)
  }
  if (filter?.employeeId && filter.employeeId !== 'all') {
    items = items.filter((r) => r.employee_id === filter.employeeId)
  }
  if (filter?.startDate) {
    items = items.filter((r) => r.attendance_date >= filter.startDate!)
  }
  if (filter?.endDate) {
    items = items.filter((r) => r.attendance_date <= filter.endDate!)
  }
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

/**
 * 2. Create Attendance Request from Branch User
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

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('attendance_requests').insert(newItem as any).select().single()
    if (!error && data) {
      const current = readFallbackRequests().filter((r) => r.id !== newItem.id)
      writeFallbackRequests([data as any, ...current])
      return data as AttendanceRequestItem
    }
  } catch {
    // Supabase table not created yet
  }

  const current = readFallbackRequests().filter(
    (r) => !(r.employee_id === newItem.employee_id && r.attendance_date === newItem.attendance_date && r.status === 'PENDING')
  )
  writeFallbackRequests([newItem, ...current])
  return newItem
}

/**
 * 3. Cancel / Withdraw Pending Request
 */
export async function cancelAttendanceRequest(requestId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    await supabase.from('attendance_requests').delete().eq('id', requestId).eq('status', 'PENDING')
  } catch {}

  const current = readFallbackRequests().filter((r) => !(r.id === requestId && r.status === 'PENDING'))
  writeFallbackRequests(current)
  return true
}
