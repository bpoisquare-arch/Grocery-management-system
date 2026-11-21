import {
  Employee,
  AttendanceRecord,
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  DEFAULT_WORK_DAYS,
} from '@/lib/attendance/database.types'
import { DEFAULT_ATTENDANCE_SETTINGS, cleanDesignation } from '@/lib/attendance/attendance-calculator'

// 1. Get Employee Metadata Map (Read-Only)
export async function getEmployeeMetadataMap(): Promise<Record<string, any>> {
  return {}
}

// 2. Get Employees (Read-Only via MIS API / MySQL)
export async function getEmployees(options?: {
  branch?: string
  search?: string
  isActiveOnly?: boolean
}): Promise<Employee[]> {
  const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${misUrl}/api/attendance/employees`, { cache: 'no-store', headers: { 'x-internal-key': process.env.INTERNAL_API_SECRET || 'isquare-internal-attendance-bridge-2026' } })
    if (res.ok) {
      const json = await res.json()
      let employees: Employee[] = (json.employees || []).map((row: any) => {
        let workDays = row.work_days
        if (typeof workDays === 'string') {
          try {
            workDays = JSON.parse(workDays)
          } catch {}
        }
        return {
          ...row,
          branch: row.branch || 'Multan',
          designation: cleanDesignation(row.designation),
          work_days: Array.isArray(workDays) && workDays.length > 0 ? workDays : DEFAULT_WORK_DAYS,
        }
      })
      if (options?.isActiveOnly) {
        employees = employees.filter((e) => e.is_active !== false)
      }
      if (options?.branch && options.branch.toLowerCase() !== 'all') {
        const targetBranch = options.branch.trim().toLowerCase()
        employees = employees.filter(
          (e) => (e.branch || 'Multan').trim().toLowerCase() === targetBranch
        )
      }
      if (options?.search) {
        const q = options.search.toLowerCase()
        employees = employees.filter(
          (e) =>
            e.name?.toLowerCase().includes(q) ||
            e.employee_id?.toLowerCase().includes(q)
        )
      }
      if (Array.isArray(json.employees)) {
        return employees
      }
    }
  } catch (err) {
    console.warn('MIS API getEmployees fetch warning:', err)
  }

  return []
}

// 3. Get Attendance Records (Read-Only via MIS API / MySQL)
export async function getAttendanceRecords(params: {
  startDate?: string
  endDate?: string
  branch?: string
  employeeId?: string
  arrivalStatus?: string
  departureStatus?: string
}): Promise<AttendanceRecordWithEmployee[]> {
  const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || 'http://localhost:3000'
  try {
    const q = new URLSearchParams()
    if (params.startDate) q.set('startDate', params.startDate)
    if (params.endDate) q.set('endDate', params.endDate)
    if (params.employeeId && params.employeeId !== 'all') q.set('employeeId', params.employeeId)
    q.set('pageSize', '1000')

    const res = await fetch(`${misUrl}/api/attendance/records?${q.toString()}`, { cache: 'no-store', headers: { 'x-internal-key': process.env.INTERNAL_API_SECRET || 'isquare-internal-attendance-bridge-2026' } })
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.records)) {
        if (json.records.length === 0) return []

        const employees = await getEmployees({ branch: params.branch })
        const empMap = new Map<string, Employee>()
        employees.forEach((e) => {
          empMap.set(e.id, e)
          empMap.set(e.employee_id, e)
        })

        let records: AttendanceRecordWithEmployee[] = json.records.map((rec: any) => {
          const emp = empMap.get(rec.employee_id) || rec.employee
          let parsedPunches = rec.raw_punches_parsed || []
          if (!parsedPunches.length && rec.raw_punches) {
            try {
              parsedPunches = typeof rec.raw_punches === 'string' ? JSON.parse(rec.raw_punches) : rec.raw_punches
            } catch {}
          }
          return {
            ...rec,
            employee: emp || null,
            raw_punches_parsed: parsedPunches,
          }
        })

        if (params.branch && params.branch.toLowerCase() !== 'all') {
          const b = params.branch.trim().toLowerCase()
          records = records.filter(r => (r.employee?.branch || 'Multan').trim().toLowerCase() === b)
        }
        return records
      }
    }
  } catch (err) {
    console.warn('MIS API attendance records fetch warning:', err)
  }

  return []
}

// 4. Get Attendance Settings (Read-Only via MIS API / MySQL)
export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${misUrl}/api/attendance/settings`, { cache: 'no-store', headers: { 'x-internal-key': process.env.INTERNAL_API_SECRET || 'isquare-internal-attendance-bridge-2026' } })
    if (res.ok) {
      const json = await res.json()
      if (json.settings) return json.settings
    }
  } catch {}

  return DEFAULT_ATTENDANCE_SETTINGS
}

// 5. Get Gazetted Holidays (Read-Only via MIS API / MySQL)
export async function getGazettedHolidays(): Promise<Record<string, string>> {
  const holidaysMap: Record<string, string> = {}
  const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${misUrl}/api/attendance/holidays?year=2026`, { cache: 'no-store', headers: { 'x-internal-key': process.env.INTERNAL_API_SECRET || 'isquare-internal-attendance-bridge-2026' } })
    if (res.ok) {
      const json = await res.json()
      if (json.holidays && typeof json.holidays === 'object') {
        if (Array.isArray(json.holidays)) {
          for (const h of json.holidays) {
            if (h.date) holidaysMap[h.date] = h.name || 'Gazetted Holiday'
          }
          return holidaysMap
        } else {
          return json.holidays
        }
      }
    }
  } catch {}

  return holidaysMap
}

export const DEFAULT_EMPLOYEE_LEAVE_QUOTAS = {
  annual_leaves: 6,
  sick_leaves: 7,
  casual_leaves: 7,
  wfh_quota: 4,
  probation_leaves: 3,
}

function parseLeaveValue(notesOrStatus?: string | null): number {
  if (!notesOrStatus) return 1
  const m = notesOrStatus.match(/\(([0-9]+(?:\.[0-9]+)?)\s*day/i) || notesOrStatus.match(/([0-9]+(?:\.[0-9]+)?)\s*day/i)
  if (m && m[1]) {
    const val = parseFloat(m[1])
    return isNaN(val) || val <= 0 ? 1 : val
  }
  if (notesOrStatus.toLowerCase().includes('half day')) return 0.5
  return 1
}

export async function getEmployeeLeaveBalanceSummary(
  employeeIdOrUuid: string,
  targetDate?: string,
  excludeRecordId?: string
): Promise<{
  isProbation: boolean
  joiningDate: string | null
  quotas: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  used: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  remaining: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  probationDates: string[]
  hasProbationInTargetMonth: boolean
}> {
  const misUrl = process.env.NEXT_PUBLIC_MIS_API_URL || 'https://mis.isquarebpo.com'
  try {
    const q = new URLSearchParams()
    q.set('employeeId', employeeIdOrUuid)
    if (targetDate) q.set('date', targetDate)
    if (excludeRecordId) q.set('excludeRecordId', excludeRecordId)

    const res = await fetch(`${misUrl}/api/attendance/leave-balance?${q.toString()}`, {
      cache: 'no-store',
      headers: {
        'x-internal-key': process.env.INTERNAL_API_SECRET || 'isquare-internal-attendance-bridge-2026',
      },
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.success) {
        return {
          isProbation: Boolean(data.isProbation),
          joiningDate: data.joiningDate || null,
          quotas: {
            probation_leaves: data.quotas?.probation_leaves ?? 3,
            annual_leaves: data.quotas?.annual_leaves ?? 6,
            sick_leaves: data.quotas?.sick_leaves ?? 7,
            casual_leaves: data.quotas?.casual_leaves ?? 7,
            wfh_quota: data.quotas?.wfh_quota ?? 4,
          },
          used: {
            probation_leaves: data.used?.probation_leaves ?? 0,
            annual_leaves: data.used?.annual_leaves ?? 0,
            sick_leaves: data.used?.sick_leaves ?? 0,
            casual_leaves: data.used?.casual_leaves ?? 0,
            wfh_quota: data.used?.wfh_quota ?? 0,
          },
          remaining: {
            probation_leaves: data.remaining?.probation_leaves ?? 0,
            annual_leaves: data.remaining?.annual_leaves ?? 0,
            sick_leaves: data.remaining?.sick_leaves ?? 0,
            casual_leaves: data.remaining?.casual_leaves ?? 0,
            wfh_quota: data.remaining?.wfh_quota ?? 0,
          },
          probationDates: Array.isArray(data.probationDates) ? data.probationDates : [],
          hasProbationInTargetMonth: Boolean(data.hasProbationInTargetMonth),
        }
      }
    }
  } catch (err) {
    console.warn('MIS real-time leave-balance API fetch warning, using local fallback:', err)
  }

  // Fallback if MIS API is unreachable
  const employees = await getEmployees()
  const emp = employees.find(
    (e) => e.id === employeeIdOrUuid || e.employee_id === employeeIdOrUuid
  )

  const isOldStaff = Boolean(emp?.is_old_staff)
  const joiningDate = isOldStaff ? null : (emp?.joining_date || emp?.created_at || null)

  const targetDateStr = targetDate ? targetDate.split('T')[0] : ''

  let isProbation = false
  if (!isOldStaff && joiningDate && targetDateStr) {
    const j = new Date(joiningDate.split('T')[0])
    const t = new Date(targetDateStr)
    if (!isNaN(j.getTime()) && !isNaN(t.getTime())) {
      const monthsDiff = (t.getFullYear() - j.getFullYear()) * 12 + (t.getMonth() - j.getMonth())
      const daysDiff = Math.floor((t.getTime() - j.getTime()) / (1000 * 60 * 60 * 24))
      isProbation = daysDiff >= 0 && monthsDiff < 3
    }
  }

  const baseQuotas = {
    probation_leaves: isOldStaff ? 0 : (emp?.base_leave_quotas?.probation_leaves ?? (isProbation ? 3 : 0)),
    annual_leaves: emp?.base_leave_quotas?.annual_leaves ?? 6,
    sick_leaves: emp?.base_leave_quotas?.sick_leaves ?? 7,
    casual_leaves: emp?.base_leave_quotas?.casual_leaves ?? 7,
    wfh_quota: emp?.base_leave_quotas?.wfh_quota ?? 4,
  }

  const remaining = {
    probation_leaves: isOldStaff ? 0 : (emp?.leave_quotas?.probation_leaves ?? (isProbation ? 3 : 0)),
    annual_leaves: emp?.leave_quotas?.annual_leaves ?? 6,
    sick_leaves: emp?.leave_quotas?.sick_leaves ?? 7,
    casual_leaves: emp?.leave_quotas?.casual_leaves ?? 7,
    wfh_quota: emp?.leave_quotas?.wfh_quota ?? 4,
  }

  return {
    isProbation,
    joiningDate,
    quotas: baseQuotas,
    used: {
      probation_leaves: Math.max(0, baseQuotas.probation_leaves - remaining.probation_leaves),
      annual_leaves: Math.max(0, baseQuotas.annual_leaves - remaining.annual_leaves),
      sick_leaves: Math.max(0, baseQuotas.sick_leaves - remaining.sick_leaves),
      casual_leaves: Math.max(0, baseQuotas.casual_leaves - remaining.casual_leaves),
      wfh_quota: baseQuotas.wfh_quota - remaining.wfh_quota,
    },
    remaining,
    probationDates: [],
    hasProbationInTargetMonth: false,
  }
}
