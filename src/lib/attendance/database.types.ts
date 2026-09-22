export interface EmployeeLeaveQuotas {
  annual_leaves?: number
  sick_leaves?: number
  casual_leaves?: number
  wfh_quota?: number
  probation_leaves?: number
}

export interface Employee {
  id: string
  user_id?: string | null
  employee_id: string
  name: string
  normalized_name?: string | null
  designation: string
  branch?: string | null
  email?: string | null
  salary?: number | null
  joining_date?: string | null
  is_old_staff?: boolean | null
  is_attendance_exempt?: boolean | null
  is_active: boolean
  leave_quotas?: EmployeeLeaveQuotas
  base_leave_quotas?: EmployeeLeaveQuotas
  created_at?: string
  updated_at?: string
}

export interface RawPunch {
  time: string
  state: 'C/In' | 'C/Out' | string
  rawTimestamp?: string
  originalRowIndex?: number
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  attendance_date: string
  in_time?: string | null
  out_time?: string | null
  total_working_minutes?: number | null
  total_working_hours?: string | null
  arrival_status?: string | null
  departure_status?: string | null
  punch_count?: number
  raw_punches?: RawPunch[] | any
  is_manual_entry?: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  employee?: Employee | null
  raw_punches_parsed?: RawPunch[]
}

export interface AttendanceSettings {
  id: string
  weekday_in_time: string
  weekday_grace_minutes: number
  weekday_out_time: string
  saturday_in_time: string
  saturday_grace_minutes: number
  saturday_out_time: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface GazettedHoliday {
  id?: string
  date?: string
  holiday_date?: string
  name: string
  created_at?: string
}
