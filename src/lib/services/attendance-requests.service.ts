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
 * Primary: MIS API (Hostinger MySQL) -> local store fallback
 */
export async function getAttendanceRequests(filter?: {
  branch?: string
  status?: string
  employeeId?: string
  startDate?: string
  endDate?: string
}): Promise<AttendanceRequestItem[]> {
  let requestsList: AttendanceRequestItem[] = []

  // 1. Primary: Fetch from MIS API (Hostinger MySQL database)
  try {
    const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || (process.env.NODE_ENV === 'production' ? 'https://mis.isquarebpo.com' : 'http://localhost:3000')
    const q = new URLSearchParams()
    if (filter?.branch && filter.branch !== 'all') q.set('branch', filter.branch)
    if (filter?.status && filter.status !== 'all') q.set('status', filter.status)
    if (filter?.employeeId && filter.employeeId !== 'all') q.set('employeeId', filter.employeeId)
    if (filter?.startDate) q.set('startDate', filter.startDate)
    if (filter?.endDate) q.set('endDate', filter.endDate)

    const res = await fetch(`${misUrl}/api/attendance/requests?${q.toString()}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.requests) && data.requests.length > 0) {
        return data.requests
      }
    }
  } catch (err) {
    console.warn('MIS API getAttendanceRequests fetch warning:', err)
  }

  // 2. Fallback to local store as extra layer
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
 * Primary: MIS API (MySQL) -> local store fallback
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

  // 1. Primary: Forward request directly to MIS API (saved into MySQL database)
  try {
    const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || (process.env.NODE_ENV === 'production' ? 'https://mis.isquarebpo.com' : 'http://localhost:3000')
    const res = await fetch(`${misUrl}/api/attendance/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.request?.id) {
        newItem.id = data.request.id
      }
    }
  } catch (apiErr) {
    console.warn('MIS API request sync warning:', apiErr)
  }

  // 2. Fallback save to local store
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
  // 1. Primary: Cancel in MIS API
  try {
    const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || (process.env.NODE_ENV === 'production' ? 'https://mis.isquarebpo.com' : 'http://localhost:3000')
    await fetch(`${misUrl}/api/attendance/requests?id=${encodeURIComponent(requestId)}`, {
      method: 'DELETE',
    })
  } catch (apiErr) {
    console.warn('MIS API cancel request warning:', apiErr)
  }

  const current = readFallbackRequests().filter((r) => !(r.id === requestId && r.status === 'PENDING'))
  writeFallbackRequests(current)
  return true
}
