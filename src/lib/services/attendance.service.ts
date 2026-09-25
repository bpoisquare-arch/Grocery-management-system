import { getSupabaseClient } from '@/lib/supabase/client'
import {
  Employee,
  AttendanceRecord,
  AttendanceRecordWithEmployee,
  AttendanceSettings,
} from '@/lib/attendance/database.types'
import { DEFAULT_ATTENDANCE_SETTINGS, cleanDesignation } from '@/lib/attendance/attendance-calculator'

// 1. Get Employee Metadata Map from Supabase audit logs
export async function getEmployeeMetadataMap(): Promise<Record<string, any>> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('attendance_audit_logs')
      .select('details')
      .eq('action', 'EMPLOYEE_METADATA_STORE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const rowData = data as any
    if (!error && rowData && rowData.details && typeof rowData.details === 'object') {
      return rowData.details as Record<string, any>
    }
  } catch (err) {
    console.error('Error fetching employee metadata map in Grocery Management:', err)
  }
  return {}
}

// 2. Get Employees (Read-Only)
export async function getEmployees(options?: {
  branch?: string
  search?: string
  isActiveOnly?: boolean
}): Promise<Employee[]> {
  try {
    const supabase = getSupabaseClient()
    let query = supabase.from('employees').select('*').order('employee_id', { ascending: true })

    if (options?.isActiveOnly) {
      query = query.eq('is_active', true)
    }

    const [empRes, metaMap] = await Promise.all([
      query,
      getEmployeeMetadataMap(),
    ])

    if (empRes.error) {
      console.error('Error fetching employees:', empRes.error)
      return []
    }

    let employees: Employee[] = (empRes.data || []).map((row: any) => {
      const meta = metaMap[row.id] || metaMap[row.employee_id] || {}
      const branch = meta.branch !== undefined ? meta.branch : (row.branch || 'Multan')
      return {
        ...row,
        branch,
        designation: cleanDesignation(row.designation),
        joining_date: meta.joining_date !== undefined ? meta.joining_date : (row.joining_date || null),
        is_old_staff: meta.is_old_staff !== undefined ? meta.is_old_staff : Boolean(row.is_old_staff),
        is_attendance_exempt: meta.is_attendance_exempt !== undefined ? meta.is_attendance_exempt : Boolean(row.is_attendance_exempt),
        leave_quotas: row.leave_quotas || meta.leave_quotas || undefined,
        base_leave_quotas: row.base_leave_quotas || meta.base_leave_quotas || undefined,
      }
    })

    // Branch filter
    if (options?.branch && options.branch.toLowerCase() !== 'all') {
      const targetBranch = options.branch.trim().toLowerCase()
      employees = employees.filter(
        (e) => (e.branch || 'Multan').trim().toLowerCase() === targetBranch
      )
    }

    // Search filter
    if (options?.search) {
      const q = options.search.toLowerCase()
      employees = employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employee_id.toLowerCase().includes(q) ||
          (e.designation && e.designation.toLowerCase().includes(q))
      )
    }

    return employees
  } catch (err) {
    console.error('Error in getEmployees service:', err)
    return []
  }
}

// 3. Get Attendance Records (Read-Only)
export async function getAttendanceRecords(params: {
  startDate?: string
  endDate?: string
  branch?: string
  employeeId?: string
  arrivalStatus?: string
  departureStatus?: string
}): Promise<AttendanceRecordWithEmployee[]> {
  try {
    const supabase = getSupabaseClient()
    const employees = await getEmployees({ branch: params.branch })
    const empMap = new Map<string, Employee>()
    employees.forEach((e) => {
      empMap.set(e.id, e)
      empMap.set(e.employee_id, e)
    })

    let query = supabase.from('attendance_records').select('*')

    if (params.startDate) {
      query = query.gte('attendance_date', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('attendance_date', params.endDate)
    }
    if (params.arrivalStatus && params.arrivalStatus !== 'all') {
      query = query.eq('arrival_status', params.arrivalStatus)
    }
    if (params.departureStatus && params.departureStatus !== 'all') {
      query = query.eq('departure_status', params.departureStatus)
    }
    if (params.employeeId && params.employeeId !== 'all') {
      const targetEmp = empMap.get(params.employeeId)
      const empUuid = targetEmp?.id || (params.employeeId.includes('-') && params.employeeId.length > 20 ? params.employeeId : null)
      if (empUuid) {
        query = query.eq('employee_id', empUuid)
      } else {
        query = query.eq('employee_id', params.employeeId)
      }
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('Error fetching attendance records from Supabase:', error)
      return []
    }

    // Attach employee info & filter by branch
    const recordsWithEmp: AttendanceRecordWithEmployee[] = []

    const recordsList = (data as any[]) || []
    for (const rec of recordsList) {
      const emp = empMap.get(rec.employee_id)
      // If branch filter is active, only include if employee belongs to this branch
      if (params.branch && params.branch.toLowerCase() !== 'all') {
        if (!emp) continue // employee not in this branch
      }

      let parsedPunches: any[] = []
      if (rec.raw_punches) {
        try {
          parsedPunches = typeof rec.raw_punches === 'string'
            ? JSON.parse(rec.raw_punches)
            : rec.raw_punches
        } catch {
          parsedPunches = []
        }
      }

      recordsWithEmp.push({
        ...rec,
        employee: emp || null,
        raw_punches_parsed: parsedPunches,
      })
    }

    // Sort by attendance_date asc
    recordsWithEmp.sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))

    return recordsWithEmp
  } catch (err) {
    console.error('Error in getAttendanceRecords service:', err)
    return []
  }
}

// 4. Get Attendance Settings (Read-Only)
export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('attendance_settings').select('*').limit(1).single()
    if (!error && data) {
      return data
    }
  } catch (err) {
    console.error('Error in getAttendanceSettings service:', err)
  }
  return DEFAULT_ATTENDANCE_SETTINGS
}

// 5. Get Gazetted Holidays (Read-Only)
export async function getGazettedHolidays(): Promise<Record<string, string>> {
  const holidaysMap: Record<string, string> = {}

  try {
    const supabase = getSupabaseClient()

    // 1. Try dedicated gazetted_holidays table first (columns: date, name)
    const { data: dbRows, error: tableError } = await supabase
      .from('gazetted_holidays')
      .select('*')

    if (!tableError && Array.isArray(dbRows) && dbRows.length > 0) {
      for (const row of dbRows) {
        const holidayDate = (row as any).date || (row as any).holiday_date
        if (holidayDate) {
          holidaysMap[holidayDate] = (row as any).name || 'Gazetted Holiday'
        }
      }
      return holidaysMap
    }

    // 2. Fallback to audit logs if table is empty
    const { data, error } = await supabase
      .from('attendance_audit_logs')
      .select('details')
      .eq('action', 'GAZETTED_HOLIDAYS_STORE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data && (data as any).details && typeof (data as any).details === 'object') {
      const dbHolidays = (data as any).details as Record<string, string>
      return { ...holidaysMap, ...dbHolidays }
    }
  } catch (err) {
    console.error('Error in getGazettedHolidays service:', err)
  }
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
  const supabase = getSupabaseClient()
  const isUuid = Boolean(employeeIdOrUuid && employeeIdOrUuid.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))

  let empQuery = supabase.from('employees').select('*')
  if (isUuid) {
    empQuery = empQuery.eq('id', employeeIdOrUuid)
  } else {
    empQuery = empQuery.eq('employee_id', employeeIdOrUuid)
  }

  const [empRes, metaMap] = await Promise.all([
    empQuery.limit(1).maybeSingle(),
    getEmployeeMetadataMap(),
  ])

  const emp = (empRes.data as any) || null
  const meta = (emp?.id && metaMap[emp.id]) || (emp?.employee_id && metaMap[emp.employee_id]) || metaMap[employeeIdOrUuid] || {}
  const isOldStaff = meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : Boolean(emp?.is_old_staff)
  const joiningDate = isOldStaff ? null : (meta.joining_date || emp?.joining_date || emp?.created_at || null)

  const targetDateStr = targetDate ? targetDate.split('T')[0] : ''
  const targetMonthStr = targetDateStr ? targetDateStr.substring(0, 7) : ''
  const year = targetDateStr ? targetDateStr.substring(0, 4) : String(new Date().getFullYear())

  // Calculate probation status
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
    annual_leaves: emp?.leave_quotas?.annual_leaves ?? emp?.base_leave_quotas?.annual_leaves ?? meta.leave_quotas?.annual_leaves ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves,
    sick_leaves: emp?.leave_quotas?.sick_leaves ?? emp?.base_leave_quotas?.sick_leaves ?? meta.leave_quotas?.sick_leaves ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves,
    casual_leaves: emp?.leave_quotas?.casual_leaves ?? emp?.base_leave_quotas?.casual_leaves ?? meta.leave_quotas?.casual_leaves ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves,
    wfh_quota: emp?.leave_quotas?.wfh_quota ?? emp?.base_leave_quotas?.wfh_quota ?? meta.leave_quotas?.wfh_quota ?? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota,
    probation_leaves: isOldStaff ? 0 : (emp?.leave_quotas?.probation_leaves ?? emp?.base_leave_quotas?.probation_leaves ?? meta.leave_quotas?.probation_leaves ?? (isProbation ? DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves : 0)),
  }

  const initial_prob = isOldStaff ? 0 : (initialQuotas.probation_leaves !== undefined ? Number(initialQuotas.probation_leaves) : (isProbation ? 3 : 0))
  const initial_ann = initialQuotas.annual_leaves !== undefined ? Number(initialQuotas.annual_leaves) : 6
  const initial_sick = initialQuotas.sick_leaves !== undefined ? Number(initialQuotas.sick_leaves) : 7
  const initial_cas = initialQuotas.casual_leaves !== undefined ? Number(initialQuotas.casual_leaves) : 7
  const initial_wfh = initialQuotas.wfh_quota !== undefined ? Number(initialQuotas.wfh_quota) : 4

  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  const empDbId = (emp?.id && uuidPattern.test(emp.id))
    ? emp.id
    : (uuidPattern.test(employeeIdOrUuid) ? employeeIdOrUuid : null)

  let allRecords: any[] = []
  if (empDbId) {
    const { data } = await supabase
      .from('attendance_records')
      .select('id, employee_id, attendance_date, arrival_status, departure_status, raw_punches')
      .eq('employee_id', empDbId)
      .gte('attendance_date', '2026-09-01')
      .lte('attendance_date', year + '-12-31')
    allRecords = data || []
  }

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
