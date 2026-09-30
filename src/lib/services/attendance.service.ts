import {
  Employee,
  AttendanceRecord,
  AttendanceRecordWithEmployee,
  AttendanceSettings,
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
    const res = await fetch(`${misUrl}/api/attendance/employees`, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      let employees: Employee[] = (json.employees || []).map((row: any) => ({
        ...row,
        branch: row.branch || 'Multan',
        designation: cleanDesignation(row.designation),
      }))
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

    const res = await fetch(`${misUrl}/api/attendance/records?${q.toString()}`, { cache: 'no-store' })
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
    const res = await fetch(`${misUrl}/api/attendance/settings`, { cache: 'no-store' })
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
    const res = await fetch(`${misUrl}/api/attendance/holidays?year=2026`, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.holidays)) {
        for (const h of json.holidays) {
          if (h.date) holidaysMap[h.date] = h.name || 'Gazetted Holiday'
        }
        return holidaysMap
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
  const employees = await getEmployees()
  const emp = employees.find(
    (e) => e.id === employeeIdOrUuid || e.employee_id === employeeIdOrUuid
  )

  const meta: any = {}
  const isOldStaff = meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : Boolean(emp?.is_old_staff)
  const joiningDate = isOldStaff ? null : (meta.joining_date || emp?.joining_date || emp?.created_at || null)

  const targetDateStr = targetDate ? targetDate.split('T')[0] : ''
  const targetMonthStr = targetDateStr ? targetDateStr.substring(0, 7) : ''
  const year = targetDateStr ? targetDateStr.substring(0, 4) : String(new Date().getFullYear())

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

  const initialQuotas = {
    annual_leaves: emp?.leave_quotas?.annual_leaves ?? emp?.base_leave_quotas?.annual_leaves ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves,
    sick_leaves: emp?.leave_quotas?.sick_leaves ?? emp?.base_leave_quotas?.sick_leaves ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves,
    casual_leaves: emp?.leave_quotas?.casual_leaves ?? emp?.base_leave_quotas?.casual_leaves ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves,
    wfh_quota: emp?.leave_quotas?.wfh_quota ?? emp?.base_leave_quotas?.wfh_quota ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota,
    probation_leaves: isOldStaff ? 0 : (emp?.leave_quotas?.probation_leaves ?? emp?.base_leave_quotas?.probation_leaves ?? (isProbation ? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves : 0)),
  }

  const initial_prob = isOldStaff ? 0 : (initialQuotas.probation_leaves !== undefined ? Number(initialQuotas.probation_leaves) : (isProbation ? 3 : 0))
  const initial_ann = initialQuotas.annual_leaves !== undefined ? Number(initialQuotas.annual_leaves) : 6
  const initial_sick = initialQuotas.sick_leaves !== undefined ? Number(initialQuotas.sick_leaves) : 7
  const initial_cas = initialQuotas.casual_leaves !== undefined ? Number(initialQuotas.casual_leaves) : 7
  const initial_wfh = initialQuotas.wfh_quota !== undefined ? Number(initialQuotas.wfh_quota) : 4

  const empId = emp?.employee_id || employeeIdOrUuid
  const allRecords = await getAttendanceRecords({ employeeId: empId, startDate: `${year}-01-01`, endDate: `${year}-12-31` })

  const probationDates: string[] = []
  let used_annual = 0
  let used_sick = 0
  let used_casual = 0
  let used_probation = 0
  let used_wfh = 0

  if (allRecords && allRecords.length > 0) {
    for (const r of allRecords) {
      if (excludeRecordId && r.id === excludeRecordId) continue
      if (targetDateStr && r.attendance_date === targetDateStr) continue

      const arrStatus = r.arrival_status || ''
      const depStatus = r.departure_status || ''

      let noteStr: string | null = r.notes || null
      if (Array.isArray(r.raw_punches)) {
        const found = (r.raw_punches as any[]).find((p) => p && typeof p === 'object' && p.notes)
        if (found) noteStr = found.notes
      }
      const leaveVal = parseLeaveValue(noteStr || depStatus)

      const isLeave = arrStatus === 'Leave' || depStatus.includes('Leave') || ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Probation Leaves'].includes(depStatus)
      const isWfh = depStatus === 'Work From Home' || arrStatus === 'Work From Home'

      if (isWfh) {
        used_wfh += leaveVal
      } else if (isLeave) {
        if (depStatus.includes('Probation') || arrStatus.includes('Probation')) {
          used_probation += leaveVal
          if (r.attendance_date) {
            probationDates.push(r.attendance_date.split('T')[0])
          }
        } else if (depStatus.includes('Annual') || arrStatus.includes('Annual')) {
          used_annual += leaveVal
        } else if (depStatus.includes('Sick') || arrStatus.includes('Sick')) {
          used_sick += leaveVal
        } else if (depStatus.includes('Casual') || arrStatus.includes('Casual')) {
          used_casual += leaveVal
        }
      }
    }
  }

  const hasProbationInTargetMonth = targetMonthStr
    ? probationDates.some((d) => d.startsWith(targetMonthStr))
    : false

  return {
    isProbation,
    joiningDate,
    quotas: {
      probation_leaves: isOldStaff ? 0 : 3,
      annual_leaves: 6,
      sick_leaves: 7,
      casual_leaves: 7,
      wfh_quota: 4,
    },
    used: {
      probation_leaves: Number(used_probation.toFixed(2)),
      annual_leaves: Number(used_annual.toFixed(2)),
      sick_leaves: Number(used_sick.toFixed(2)),
      casual_leaves: Number(used_casual.toFixed(2)),
      wfh_quota: Number(used_wfh.toFixed(2)),
    },
    remaining: {
      probation_leaves: isOldStaff ? 0 : Math.max(0, Number((initial_prob - used_probation).toFixed(2))),
      annual_leaves: Math.max(0, Number((initial_ann - used_annual).toFixed(2))),
      sick_leaves: Math.max(0, Number((initial_sick - used_sick).toFixed(2))),
      casual_leaves: Math.max(0, Number((initial_cas - used_casual).toFixed(2))),
      wfh_quota: Number((initial_wfh - used_wfh).toFixed(2)),
    },
    probationDates,
    hasProbationInTargetMonth,
  }
}
