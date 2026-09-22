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
        leave_quotas: meta.leave_quotas || undefined,
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
