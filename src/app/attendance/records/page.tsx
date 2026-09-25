'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Loader2,
  X,
} from 'lucide-react'
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
})
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  Employee,
} from '@/lib/attendance/database.types'
import {
  hasOfficeInTimePassed,
  hasOfficeOutTimePassed,
} from '@/lib/attendance/attendance-calculator'
import { useStore } from '@/lib/store'
import { AttendanceHeader } from '@/components/attendance/AttendanceHeader'
import {
  ApplyLeaveModal,
  RegularizeTimingModal,
  PendingRequestModal,
} from '@/components/attendance/AttendanceRequestModals'
import { AttendanceRequestItem } from '@/lib/services/attendance-requests.service'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'
import { DataTableViewOptions } from '@/components/ui/data-table-view-options'
import { DataTableFacetedFilter } from '@/components/ui/data-table-faceted-filter'

// Quick Selector Months
const MONTHS_LIST = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const YEARS_LIST = ['2026', '2027', '2028', '2029', '2030']

function getMonthStartAndEnd(yearStr: string, monthStr: string) {
  const y = parseInt(yearStr, 10)
  const m = parseInt(monthStr, 10)
  const start = `${yearStr}-${monthStr.padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${yearStr}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  if (!startDateStr || !endDateStr) return []
  const dates: string[] = []
  const current = new Date(startDateStr + 'T00:00:00')
  const end = new Date(endDateStr + 'T00:00:00')
  if (isNaN(current.getTime()) || isNaN(end.getTime())) return []
  let count = 0
  while (current <= end && count < 60) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
    count++
  }
  return dates
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

// Helper to evaluate record status flags for filtering & excel
function getRecordStatusFlags(
  emp: Employee,
  date: string,
  recordMatrixMap: Map<string, AttendanceRecordWithEmployee>,
  holidays: Record<string, string>,
  settings?: AttendanceSettings,
  maxUploadedDate?: string
) {
  const dayName = getDayName(date)
  const isSunday = dayName === 'Sunday'
  const isGazettedHoliday = Boolean(holidays[date])
  const todayStr = formatDate(new Date())
  const isFuture = date > todayStr
  const isToday = date === todayStr
  const isPast = date < todayStr

  const isBeforeJoining = Boolean(
    !emp.is_old_staff &&
    emp.joining_date &&
    date < emp.joining_date.split('T')[0]
  )

  const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)

  if (rec) {
    const isWfh = Boolean(
      rec.notes?.includes('Work From Home') ||
      rec.arrival_status === 'Work From Home' ||
      rec.departure_status === 'Work From Home'
    )

    const isLeave =
      rec.arrival_status === 'Leave' ||
      rec.departure_status?.includes('Leave') ||
      ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.departure_status as any) ||
      ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.arrival_status as any)

    const hasInTime = Boolean(rec.in_time && rec.in_time !== '---' && rec.in_time !== '--')
    const hasOutTime = Boolean(rec.out_time && rec.out_time !== '---' && rec.out_time !== '--')
    const isLate = rec.arrival_status === 'Late Arrival'
    const isEarlyLeave = rec.departure_status === 'Early Departure'

    const outTimePassed = isPast || (isToday && hasOfficeOutTimePassed(date, settings))

    const isMissingOut = !isWfh && !isLeave && hasInTime && !hasOutTime && outTimePassed
    const isMissingIn = !isWfh && !isLeave && !hasInTime && hasOutTime

    const hasActualData = hasInTime || hasOutTime || (rec.total_working_minutes ? rec.total_working_minutes > 0 : false) || isLeave || isWfh

    const isExplicitAbsent =
      rec.arrival_status === 'Absent' ||
      rec.departure_status === 'Absent' ||
      (!hasInTime && !hasOutTime && !isLeave && !isWfh)

    if (isLeave) {
      const leaveLabel =
        ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].find(
          (l) => l === rec.departure_status || l === rec.arrival_status
        ) || rec.departure_status || 'Casual Leave'

      return {
        isSunday: false,
        isGazettedHoliday: false,
        isLeave: true,
        isAbsent: false,
        isLate: false,
        isEarlyLeave: false,
        isMissingIn: false,
        isMissingOut: false,
        isWfh: false,
        isPresent: false,
        isBeforeJoining: false,
        statusLabel: leaveLabel,
      }
    }

    if (isExplicitAbsent && !hasActualData) {
      if (isBeforeJoining) {
        return {
          isSunday: false,
          isGazettedHoliday: false,
          isLeave: false,
          isAbsent: false,
          isLate: false,
          isEarlyLeave: false,
          isMissingIn: false,
          isMissingOut: false,
          isWfh: false,
          isPresent: false,
          isBeforeJoining: true,
          statusLabel: '--',
        }
      }

      if (isSunday || isGazettedHoliday) {
        return {
          isSunday,
          isGazettedHoliday,
          isLeave: false,
          isAbsent: false,
          isLate: false,
          isEarlyLeave: false,
          isMissingIn: false,
          isMissingOut: false,
          isWfh: false,
          isPresent: false,
          isBeforeJoining: false,
          statusLabel: isSunday ? 'Sunday' : 'Holiday',
        }
      }

      if (isFuture) {
        return {
          isSunday: false,
          isGazettedHoliday: false,
          isLeave: false,
          isAbsent: false,
          isLate: false,
          isEarlyLeave: false,
          isMissingIn: false,
          isMissingOut: false,
          isWfh: false,
          isPresent: false,
          isBeforeJoining: false,
          statusLabel: '',
        }
      }

      return {
        isSunday: false,
        isGazettedHoliday: false,
        isLeave: false,
        isAbsent: true,
        isLate: false,
        isEarlyLeave: false,
        isMissingIn: false,
        isMissingOut: false,
        isWfh: false,
        isPresent: false,
        isBeforeJoining: false,
        statusLabel: 'Absent',
      }
    }

    let statusLabel = ''
    if (isMissingIn) statusLabel = 'Missing In'
    else if (isMissingOut) statusLabel = 'Missing Out'
    else if (isLate) statusLabel = 'Late Arrival'
    else if (isEarlyLeave) statusLabel = 'Early Departure'
    else if (isWfh) statusLabel = 'Work From Home'

    return {
      isSunday: false,
      isGazettedHoliday: false,
      isLeave: false,
      isAbsent: false,
      isLate,
      isEarlyLeave,
      isMissingIn,
      isMissingOut,
      isWfh,
      isPresent: true,
      isBeforeJoining: false,
      statusLabel,
    }
  }

  // No record in database
  if (isSunday || isGazettedHoliday) {
    return {
      isSunday,
      isGazettedHoliday,
      isLeave: false,
      isAbsent: false,
      isLate: false,
      isEarlyLeave: false,
      isMissingIn: false,
      isMissingOut: false,
      isWfh: false,
      isPresent: false,
      isBeforeJoining: false,
      statusLabel: isSunday ? 'Sunday' : 'Holiday',
    }
  }

  if (isBeforeJoining) {
    return {
      isSunday: false,
      isGazettedHoliday: false,
      isLeave: false,
      isAbsent: false,
      isLate: false,
      isEarlyLeave: false,
      isMissingIn: false,
      isMissingOut: false,
      isWfh: false,
      isPresent: false,
      isBeforeJoining: true,
      statusLabel: '--',
    }
  }

  if (maxUploadedDate && date > maxUploadedDate) {
    return {
      isSunday: false,
      isGazettedHoliday: false,
      isLeave: false,
      isAbsent: false,
      isLate: false,
      isEarlyLeave: false,
      isMissingIn: false,
      isMissingOut: false,
      isWfh: false,
      isPresent: false,
      isBeforeJoining: false,
      statusLabel: '--',
    }
  }

  if (isPast) {
    return {
      isSunday: false,
      isGazettedHoliday: false,
      isLeave: false,
      isAbsent: true,
      isLate: false,
      isEarlyLeave: false,
      isMissingIn: false,
      isMissingOut: false,
      isWfh: false,
      isPresent: false,
      isBeforeJoining: false,
      statusLabel: 'Absent',
    }
  }

  if (isToday) {
    if (hasOfficeInTimePassed(date, settings)) {
      return {
        isSunday: false,
        isGazettedHoliday: false,
        isLeave: false,
        isAbsent: true,
        isLate: false,
        isEarlyLeave: false,
        isMissingIn: false,
        isMissingOut: false,
        isWfh: false,
        isPresent: false,
        isBeforeJoining: false,
        statusLabel: 'Absent',
      }
    }
  }

  return {
    isSunday: false,
    isGazettedHoliday: false,
    isLeave: false,
    isAbsent: false,
    isLate: false,
    isEarlyLeave: false,
    isMissingIn: false,
    isMissingOut: false,
    isWfh: false,
    isPresent: false,
    isBeforeJoining: false,
    statusLabel: '',
  }
}

export default function AttendanceRecordsPage() {
  const { currentUser } = useStore()
  const isAdmin = currentUser?.role === 'ADMIN'
  const isLahoreUser = currentUser?.role === 'LAHORE_USER'
  const isMultanUser = currentUser?.role === 'MULTAN_USER'

  const defaultBranch = isLahoreUser ? 'Lahore' : isMultanUser ? 'Multan' : 'all'

  const [records, setRecords] = useState<AttendanceRecordWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [settings, setSettings] = useState<AttendanceSettings | undefined>()
  const [holidays, setHolidays] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Current Month Defaults
  const initialDateRange = useMemo(() => {
    const now = new Date()
    const yStr = String(now.getFullYear())
    const mStr = String(now.getMonth() + 1).padStart(2, '0')
    const activeYear = YEARS_LIST.includes(yStr) ? yStr : '2026'
    const { start, end } = getMonthStartAndEnd(activeYear, mStr)
    return { year: activeYear, month: mStr, start, end }
  }, [])

  // Branch Requests State (Leave & Timing Regularization)
  const [requests, setRequests] = useState<AttendanceRequestItem[]>([])
  const [activeLeaveModal, setActiveLeaveModal] = useState<{
    isOpen: boolean
    emp: Employee | null
    date: string
  }>({ isOpen: false, emp: null, date: '' })

  const [activeTimingModal, setActiveTimingModal] = useState<{
    isOpen: boolean
    emp: Employee | null
    date: string
    requestType: 'MISSING_IN' | 'MISSING_OUT'
    existingTime?: string | null
  }>({ isOpen: false, emp: null, date: '', requestType: 'MISSING_IN' })

  const [activePendingModal, setActivePendingModal] = useState<{
    isOpen: boolean
    request: AttendanceRequestItem | null
  }>({ isOpen: false, request: null })

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/attendance/requests')
      const data = await res.json()
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests)
      }
    } catch (err) {
      console.error('Error fetching requests in Grocery page:', err)
    }
  }

  const [selectedQuickMonth, setSelectedQuickMonth] = useState<string>(initialDateRange.month)
  const [selectedQuickYear, setSelectedQuickYear] = useState<string>(initialDateRange.year)
  const [startDate, setStartDate] = useState(initialDateRange.start)
  const [endDate, setEndDate] = useState(initialDateRange.end)
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<number | 'all'>('all')

  // Checkbox Filters State (Absent, Missing In, Missing Out)
  const [statusFilters, setStatusFilters] = useState<{
    absent: boolean
    missingIn: boolean
    missingOut: boolean
  }>({
    absent: false,
    missingIn: false,
    missingOut: false,
  })

  // Table Column Visibility State (View Options Dropdown)
  const defaultVisibleColumns = useMemo(
    () => ({
      batchId: true,
      employeeName: true,
      designation: true,
      branch: true,
      sundays: true,
    }),
    []
  )

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    batchId: true,
    employeeName: true,
    designation: true,
    branch: true,
    sundays: true,
  })

  // Restore column preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('attendance_records_visible_cols')
      if (saved) {
        setVisibleColumns((prev) => ({ ...prev, ...JSON.parse(saved) }))
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  const handleToggleColumn = (colId: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] }
      try {
        localStorage.setItem('attendance_records_visible_cols', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  const handleResetColumns = () => {
    setVisibleColumns(defaultVisibleColumns)
    try {
      localStorage.removeItem('attendance_records_visible_cols')
    } catch {}
  }

  // Fixed employee columns layout configuration for dynamic sticky offsets
  const FIXED_COLUMNS = useMemo(
    () => [
      { id: 'batchId', label: 'Batch ID', width: 90 },
      { id: 'employeeName', label: 'Employee Name', width: 170 },
      { id: 'designation', label: 'Designation', width: 150 },
      { id: 'branch', label: 'Branch', width: 110 },
    ],
    []
  )

  const stickyColumnLayout = useMemo(() => {
    let accumulatedLeft = 0
    const offsets: Record<string, number> = {}
    let lastVisibleId: string | null = null

    FIXED_COLUMNS.forEach((col) => {
      if (visibleColumns[col.id]) {
        offsets[col.id] = accumulatedLeft
        accumulatedLeft += col.width
        lastVisibleId = col.id
      }
    })

    return {
      offsets,
      lastVisibleId,
      totalWidth: accumulatedLeft,
      visibleCount: Object.keys(offsets).length,
    }
  }, [visibleColumns, FIXED_COLUMNS])

  // Synchronize branch filter if role changes
  useEffect(() => {
    if (isLahoreUser) {
      setSelectedBranch('Lahore')
    } else if (isMultanUser) {
      setSelectedBranch('Multan')
    }
  }, [isLahoreUser, isMultanUser])

  const handleQuickMonthChange = (newMonth: string) => {
    setSelectedQuickMonth(newMonth)
    const { start, end } = getMonthStartAndEnd(selectedQuickYear, newMonth)
    setStartDate(start)
    setEndDate(end)
  }

  const handleQuickYearChange = (newYear: string) => {
    setSelectedQuickYear(newYear)
    const { start, end } = getMonthStartAndEnd(newYear, selectedQuickMonth)
    setStartDate(start)
    setEndDate(end)
  }

  // Load Metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const branchParam = isLahoreUser ? '?branch=Lahore' : isMultanUser ? '?branch=Multan' : ''
        const [empRes, settRes, holRes] = await Promise.all([
          fetch(`/api/attendance/employees${branchParam}`),
          fetch('/api/attendance/settings'),
          fetch('/api/attendance/holidays'),
        ])
        const empData = await empRes.json()
        const settData = await settRes.json()
        const holData = await holRes.json()
        if (empData.success && empData.employees) setEmployees(empData.employees)
        if (settData.success && settData.settings) setSettings(settData.settings)
        if (holData.success && holData.holidays) setHolidays(holData.holidays)
      } catch (err) {
        console.error('Error loading attendance meta:', err)
      }
    }
    loadMeta()
    fetchRequests()
    const reqTimer = setInterval(() => {
      fetchRequests()
    }, 15000)
    return () => clearInterval(reqTimer)
  }, [isLahoreUser, isMultanUser])

  // Fetch Attendance Records
  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (selectedBranch && selectedBranch !== 'all') {
        params.set('branch', selectedBranch)
      } else if (isLahoreUser) {
        params.set('branch', 'Lahore')
      } else if (isMultanUser) {
        params.set('branch', 'Multan')
      }

      const res = await fetch(`/api/attendance/records?${params.toString()}`)
      const data = await res.json()
      if (data.success && data.records) {
        setRecords(data.records)
      } else {
        setRecords([])
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [startDate, endDate, selectedBranch])

  // Dynamic Date Columns
  const dateColumns = useMemo(() => {
    return getDatesInRange(startDate, endDate)
  }, [startDate, endDate])

  // Record Matrix Map: `${empId}_${date}` -> Record
  const recordMatrixMap = useMemo(() => {
    const map = new Map<string, AttendanceRecordWithEmployee>()
    records.forEach((rec) => {
      if (rec.employee_id && rec.attendance_date) {
        map.set(`${rec.employee_id}_${rec.attendance_date}`, rec)
      }
      if (rec.employee?.id && rec.attendance_date) {
        map.set(`${rec.employee.id}_${rec.attendance_date}`, rec)
      }
      if (rec.employee?.employee_id && rec.attendance_date) {
        map.set(`${rec.employee.employee_id}_${rec.attendance_date}`, rec)
      }
    })
    return map
  }, [records])

  // CRITICAL BUSINESS LOGIC: Determine the MAXIMUM date up to which attendance has been uploaded
  const maxUploadedDate = useMemo(() => {
    let maxD = ''
    records.forEach((r) => {
      // Must have actual attendance data, punches, or leave
      const hasActualPunchOrLeave = Boolean(
        (r.in_time && r.in_time !== '---' && r.in_time !== '--') ||
        (r.out_time && r.out_time !== '---' && r.out_time !== '--') ||
        (r.total_working_minutes && r.total_working_minutes > 0) ||
        r.arrival_status === 'Leave' ||
        r.departure_status?.includes('Leave') ||
        r.arrival_status === 'On Time Arrival' ||
        r.arrival_status === 'Late Arrival' ||
        r.departure_status === 'On Time Departure' ||
        r.departure_status === 'Early Departure' ||
        r.departure_status === 'Work From Home' ||
        r.arrival_status === 'Work From Home'
      )
      if (hasActualPunchOrLeave && r.attendance_date) {
        if (!maxD || r.attendance_date > maxD) {
          maxD = r.attendance_date
        }
      }
    })
    return maxD
  }, [records])

  // Calculate status counts across entire active range for filter badges & employee map
  const statusFilterCounts = useMemo(() => {
    let totalAbsent = 0
    let totalMissingIn = 0
    let totalMissingOut = 0

    const empHasMap = new Map<string, { hasAbsent: boolean; hasMissingIn: boolean; hasMissingOut: boolean }>()

    employees.forEach((emp) => {
      let hasAbsent = false
      let hasMissingIn = false
      let hasMissingOut = false

      dateColumns.forEach((date) => {
        const flags = getRecordStatusFlags(emp, date, recordMatrixMap, holidays, settings, maxUploadedDate)
        if (flags.isAbsent) {
          hasAbsent = true
          totalAbsent++
        }
        if (flags.isMissingIn) {
          hasMissingIn = true
          totalMissingIn++
        }
        if (flags.isMissingOut) {
          hasMissingOut = true
          totalMissingOut++
        }
      })

      empHasMap.set(emp.id, { hasAbsent, hasMissingIn, hasMissingOut })
      empHasMap.set(emp.employee_id, { hasAbsent, hasMissingIn, hasMissingOut })
    })

    return {
      totalAbsent,
      totalMissingIn,
      totalMissingOut,
      empHasMap,
    }
  }, [employees, dateColumns, recordMatrixMap, holidays, settings, maxUploadedDate])

  // Is any status filter active?
  const isAnyStatusFilterActive = Boolean(
    statusFilters.absent || statusFilters.missingIn || statusFilters.missingOut
  )

  // CRITICAL BUSINESS LOGIC: Only show employees who have at least ONE uploaded record in this range
  const filteredEmployees = useMemo(() => {
    const recordedEmployeeIds = new Set<string>()
    records.forEach((rec) => {
      if (rec.employee_id) recordedEmployeeIds.add(rec.employee_id)
      if (rec.employee?.id) recordedEmployeeIds.add(rec.employee.id)
      if (rec.employee?.employee_id) recordedEmployeeIds.add(rec.employee.employee_id)
    })

    // If no records uploaded at all for this month/date range, return empty list
    if (records.length === 0 || recordedEmployeeIds.size === 0) {
      return []
    }

    let list = employees.filter((emp) => {
      // Must have at least 1 record in range
      const hasRecordInRange =
        recordedEmployeeIds.has(emp.id) ||
        recordedEmployeeIds.has(emp.employee_id)
      if (!hasRecordInRange) {
        return false
      }

      // Branch filter
      if (selectedBranch !== 'all' && (emp.branch || 'Multan').trim().toLowerCase() !== selectedBranch.toLowerCase()) {
        return false
      }

      // Designation filter
      if (selectedDesignation !== 'all' && emp.designation?.trim().toLowerCase() !== selectedDesignation.toLowerCase()) {
        return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = emp.name.toLowerCase().includes(q)
        const matchId = emp.employee_id.toLowerCase().includes(q)
        const matchDesig = emp.designation?.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchDesig) return false
      }

      // Status Checkbox filters (Absent, Missing In, Missing Out)
      if (isAnyStatusFilterActive) {
        const empStatus = statusFilterCounts.empHasMap.get(emp.id) || statusFilterCounts.empHasMap.get(emp.employee_id)
        if (!empStatus) return false

        const matchAbsent = statusFilters.absent && empStatus.hasAbsent
        const matchMissingIn = statusFilters.missingIn && empStatus.hasMissingIn
        const matchMissingOut = statusFilters.missingOut && empStatus.hasMissingOut

        if (!matchAbsent && !matchMissingIn && !matchMissingOut) {
          return false
        }
      }

      return true
    })

    if (pageSize !== 'all') {
      list = list.slice(0, pageSize)
    }

    return list
  }, [employees, records, selectedDesignation, selectedBranch, search, pageSize, isAnyStatusFilterActive, statusFilters, statusFilterCounts])

  // Smart Date Columns for Grid View & Export:
  // If status filter (Absent, Missing In, Missing Out) is active, ONLY show dates where at least one employee had that status!
  const displayDateColumns = useMemo(() => {
    let dates = dateColumns

    // 1. Hide Sundays if toggled off in View options
    if (visibleColumns.sundays === false) {
      dates = dates.filter((date) => getDayName(date) !== 'Sunday')
    }

    // 2. If status filter is active, filter date columns to only show matching dates!
    if (isAnyStatusFilterActive && filteredEmployees.length > 0) {
      dates = dates.filter((date) => {
        return filteredEmployees.some((emp) => {
          const flags = getRecordStatusFlags(emp, date, recordMatrixMap, holidays, settings, maxUploadedDate)
          const matchAbsent = statusFilters.absent && flags.isAbsent
          const matchMissingIn = statusFilters.missingIn && flags.isMissingIn
          const matchMissingOut = statusFilters.missingOut && flags.isMissingOut
          return matchAbsent || matchMissingIn || matchMissingOut
        })
      })
    }

    return dates
  }, [
    dateColumns,
    visibleColumns.sundays,
    isAnyStatusFilterActive,
    filteredEmployees,
    recordMatrixMap,
    holidays,
    settings,
    statusFilters,
    maxUploadedDate,
  ])

  // Present employees on date count
  const getPresentEmployeesCountOnDate = (date: string): number => {
    let count = 0
    employees.forEach((emp) => {
      const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
      if (rec) {
        const isPresent =
          Boolean(rec.in_time && rec.in_time !== '--') ||
          Boolean(rec.out_time && rec.out_time !== '--') ||
          (rec.total_working_minutes ? rec.total_working_minutes > 0 : false) ||
          rec.arrival_status === 'On Time Arrival' ||
          rec.arrival_status === 'Late Arrival' ||
          rec.departure_status === 'On Time Departure' ||
          rec.departure_status === 'Early Departure'
        if (isPresent) count++
      }
    })
    return count
  }

  // Summary KPI Counters (Exact match with MIS Attendance page)
  const kpiStats = useMemo(() => {
    let onTimeArrivals = 0
    let lateArrivals = 0
    let onTimeDepartures = 0
    let earlyDepartures = 0
    let totalAbsent = 0
    let totalLeaves = 0

    const todayStr = formatDate(new Date())

    filteredEmployees.forEach((emp) => {
      dateColumns.forEach((date) => {
        const isBeforeJoining = Boolean(
          !emp.is_old_staff &&
          emp.joining_date &&
          date < emp.joining_date.split('T')[0]
        )
        if (isBeforeJoining) return

        const dayName = getDayName(date)
        const isSunday = dayName === 'Sunday'
        const isGazettedHoliday = Boolean(holidays[date]) && getPresentEmployeesCountOnDate(date) === 0
        if (isSunday || isGazettedHoliday) return

        // CRITICAL: Dates after the last uploaded date are NOT past unuploaded days and cannot be counted as Absent
        if (!maxUploadedDate || date > maxUploadedDate) return

        const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)

        if (rec) {
          const isLeave =
            rec.arrival_status === 'Leave' ||
            rec.departure_status?.includes('Leave') ||
            ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.departure_status as any) ||
            ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.arrival_status as any)

          const isExplicitAbsent =
            rec.arrival_status === 'Absent' ||
            rec.departure_status === 'Absent' ||
            (!rec.in_time && !rec.out_time && !isLeave)

          if (isLeave) {
            totalLeaves++
          } else if (isExplicitAbsent) {
            totalAbsent++
          } else {
            if (rec.arrival_status === 'On Time Arrival') onTimeArrivals++
            if (rec.arrival_status === 'Late Arrival') lateArrivals++
            if (rec.departure_status === 'On Time Departure') onTimeDepartures++
            if (rec.departure_status === 'Early Departure') earlyDepartures++
          }
        } else {
          // No record exists up to maxUploadedDate on an official working day -> Absent
          totalAbsent++
        }
      })
    })

    return {
      totalEmployees: filteredEmployees.length,
      onTimeArrivals,
      lateArrivals,
      onTimeDepartures,
      earlyDepartures,
      totalAbsent,
      totalLeaves,
    }
  }, [filteredEmployees, dateColumns, recordMatrixMap, holidays, maxUploadedDate])

  // Export to Excel (Full matrix)
  const handleExportExcel = () => {
    try {
      const rows: any[] = []
      const exportDates = isAnyStatusFilterActive ? displayDateColumns : (visibleColumns.sundays ? dateColumns : dateColumns.filter((d) => getDayName(d) !== 'Sunday'))

      filteredEmployees.forEach((emp) => {
        const rowData: Record<string, any> = {}
        if (visibleColumns.batchId) rowData['Batch ID'] = emp.employee_id
        if (visibleColumns.employeeName) rowData['Employee Name'] = emp.name
        if (visibleColumns.designation) rowData['Designation'] = emp.designation
        if (visibleColumns.branch) rowData['Branch'] = emp.branch || 'Multan'

        exportDates.forEach((date) => {
          const dayName = getDayName(date)
          const isSunday = dayName === 'Sunday'
          const isGazettedHoliday = Boolean(holidays[date]) && getPresentEmployeesCountOnDate(date) === 0
          const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)

          if (isSunday) {
            rowData[date] = 'Holiday'
          } else if (isGazettedHoliday) {
            rowData[date] = `Holiday (${holidays[date] || 'Gazetted'})`
          } else if (rec) {
            const isLeave =
              rec.arrival_status === 'Leave' ||
              rec.departure_status?.includes('Leave') ||
              ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.departure_status as any) ||
              ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.arrival_status as any)
            if (isLeave) {
              rowData[date] = rec.departure_status || rec.arrival_status || 'Leave'
            } else if (rec.in_time || rec.out_time) {
              rowData[date] = `${rec.in_time || '--'} - ${rec.out_time || '--'}`
            } else {
              rowData[date] = (!maxUploadedDate || date <= maxUploadedDate) ? 'Absent' : '--'
            }
          } else {
            rowData[date] = (!maxUploadedDate || date <= maxUploadedDate) ? 'Absent' : '--'
          }
        })

        rows.push(rowData)
      })

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records')
      XLSX.writeFile(workbook, `Attendance_Records_${selectedBranch}_${startDate}_to_${endDate}.xlsx`)
    } catch (err) {
      console.error('Error exporting to Excel:', err)
    }
  }

  // Requests Map for instant O(1) cell lookup
  const requestsMap = useMemo(() => {
    const map = new Map<string, AttendanceRequestItem>()
    requests.forEach((req) => {
      if (req.status === 'PENDING') {
        map.set(`${req.employee_id}_${req.attendance_date}`, req)
        if (req.batch_id) {
          map.set(`${req.batch_id}_${req.attendance_date}`, req)
        }
      }
    })
    return map
  }, [requests])

  // Render Status Badge / Content inside each Grid Cell (Exact MIS Layout & Logic)
  const renderCellContent = (emp: Employee, date: string) => {
    // 0. Check if there is an active pending request from branch user
    const pendingReq = requestsMap.get(`${emp.id}_${date}`) || requestsMap.get(`${emp.employee_id}_${date}`)
    if (pendingReq) {
      return (
        <div
          onClick={() => setActivePendingModal({ isOpen: true, request: pendingReq })}
          className="p-1.5 rounded-md flex flex-col items-center justify-center text-center gap-1 border bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 shadow-2xs cursor-pointer transition-all hover:scale-[1.02] group"
          title="Pending MIS Admin Approval - Click to view or cancel"
        >
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-2xs">
              PENDING
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-amber-900 truncate max-w-[130px]">
            {pendingReq.request_type === 'LEAVE'
              ? (pendingReq.leave_type || 'Leave')
              : pendingReq.request_type === 'MISSING_IN'
              ? `In: ${pendingReq.requested_in_time}`
              : `Out: ${pendingReq.requested_out_time}`}
          </span>
        </div>
      )
    }

    const todayStr = formatDate(new Date())
    const dayName = getDayName(date)
    const isFuture = date > todayStr
    const isToday = date === todayStr
    const isPast = date < todayStr
    const presentCountOnDate = getPresentEmployeesCountOnDate(date)
    const isGazettedHoliday = Boolean(holidays[date]) && presentCountOnDate === 0

    const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)

    const isBeforeJoining = Boolean(
      !emp.is_old_staff &&
      emp.joining_date &&
      date < emp.joining_date.split('T')[0]
    )

    // Pre-joining dates without punches show neutral placeholder "--"
    if (isBeforeJoining && !rec) {
      return (
        <div className="flex items-center justify-center py-2 text-slate-400 font-mono text-xs select-none">
          --
        </div>
      )
    }

    // Sunday is strictly Holiday
    if (dayName === 'Sunday') {
      return (
        <div className="flex items-center justify-center py-2 select-none">
          <span className="bg-[#b38600] text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-2xs tracking-wide">
            Holiday
          </span>
        </div>
      )
    }

    // Gazetted Holiday (when 0 punches recorded on this date)
    if (isGazettedHoliday) {
      return (
        <div className="flex items-center justify-center py-2 select-none">
          <span className="bg-[#b38600] text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs tracking-wide whitespace-nowrap">
            Gazetted Holiday
          </span>
        </div>
      )
    }

    // Record exists
    if (rec) {
      const isLeave =
        rec.arrival_status === 'Leave' ||
        rec.departure_status?.includes('Leave') ||
        ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.departure_status as any) ||
        ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.arrival_status as any)

      const isExplicitAbsent =
        rec.arrival_status === 'Absent' ||
        rec.departure_status === 'Absent' ||
        (!rec.in_time && !rec.out_time && !isLeave)

      // A. Leave Record
      if (isLeave) {
        const leaveLabel =
          ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].find(
            (l) => l === rec.departure_status || l === rec.arrival_status
          ) || 'Leave'

        const match = rec.notes?.match(/\(([0-9]+(?:\.[0-9]+)?)\s*day/i) || rec.notes?.match(/([0-9]+(?:\.[0-9]+)?)\s*day/i)
        const daysSuffix = match && match[1] !== '1' ? ` (${match[1]}d)` : ''

        return (
          <div className="p-1.5 rounded-md flex items-center justify-center text-center border bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-2xs select-none">
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-tight shadow-2xs">
              {leaveLabel}{daysSuffix}
            </span>
          </div>
        )
      }

      // B. Explicit Absent Record (Clickable to Apply Leave)
      if (isExplicitAbsent) {
        if (maxUploadedDate && date > maxUploadedDate) {
          return (
            <div className="flex items-center justify-center py-2 text-slate-300 font-mono text-xs select-none">
              --
            </div>
          )
        }

        return (
          <div
            onClick={() => setActiveLeaveModal({ isOpen: true, emp, date })}
            className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs select-none cursor-pointer transition-all hover:scale-[1.02] group"
            title="Absent - Click to apply for Leave"
          >
            <span className="bg-rose-600 group-hover:bg-rose-700 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      }

      // C. Present Record with timings & notes check
      const isWfh = Boolean(
        rec.notes?.includes('Work From Home') ||
        rec.arrival_status === 'Work From Home' ||
        rec.departure_status === 'Work From Home'
      )
      const isLate = rec.arrival_status === 'Late Arrival'
      const isEarlyLeave = rec.departure_status === 'Early Departure'
      const hasInTime = Boolean(rec.in_time && rec.in_time !== '---' && rec.in_time !== '--')
      const hasOutTime = Boolean(rec.out_time && rec.out_time !== '---' && rec.out_time !== '--')

      const outTimePassed = isPast || (isToday && hasOfficeOutTimePassed(date, settings))
      const isMissingOut = !isWfh && hasInTime && !hasOutTime && outTimePassed
      const isMissingIn = !isWfh && !hasInTime && hasOutTime
      const isCurrentlyInOffice = !isWfh && hasInTime && !hasOutTime && isToday && !outTimePassed

      const workedTimeStr =
        rec.total_working_hours ||
        (rec.total_working_minutes ? `${Math.floor(rec.total_working_minutes / 60)}h ${rec.total_working_minutes % 60}m` : null)

      return (
        <div
          className={`p-1.5 rounded-md flex flex-col items-center justify-center text-center gap-0.5 border select-none ${
            isWfh
              ? 'bg-sky-50 border-sky-300 text-sky-950 shadow-2xs'
              : isMissingOut || isMissingIn
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
              : isCurrentlyInOffice
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : isLate || isEarlyLeave
              ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
              : 'bg-emerald-50/50 border-emerald-200/70 text-slate-800'
          }`}
        >
          {/* In Time - Out Time */}
          <div className="font-mono text-[11px] font-semibold tracking-tight whitespace-nowrap flex items-center justify-center gap-1">
            <span className={isMissingIn ? 'text-emerald-800 font-bold bg-emerald-200/80 px-1 rounded' : ''}>
              {hasInTime ? rec.in_time : isMissingIn ? 'Missing In' : '---'}
            </span>
            <span className="text-slate-400">-</span>
            <span className={isMissingOut ? 'text-emerald-800 font-bold bg-emerald-200/80 px-1 rounded' : isCurrentlyInOffice ? 'text-emerald-700 font-semibold' : ''}>
              {hasOutTime ? rec.out_time : isCurrentlyInOffice ? 'In Office' : isMissingOut ? 'Missing Out' : '---'}
            </span>
          </div>

          {/* Duration Badge with Clock Icon */}
          <div className="flex items-center justify-center gap-1 text-[11px] font-mono font-medium">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                isWfh
                  ? 'bg-sky-600 text-white'
                  : isMissingOut || isMissingIn
                  ? 'bg-emerald-600 text-white'
                  : isCurrentlyInOffice
                  ? 'bg-emerald-500 text-white animate-pulse'
                  : isLate || isEarlyLeave
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isWfh ? '🏠' : '⏱'}
            </span>
            <span className={`font-bold ${isMissingOut || isMissingIn ? 'text-emerald-800' : isWfh ? 'text-sky-900' : isLate || isEarlyLeave ? 'text-amber-800' : 'text-slate-700'}`}>
              ({workedTimeStr && workedTimeStr !== '00:00' && workedTimeStr !== '--' ? workedTimeStr : isCurrentlyInOffice ? 'Working' : '--'})
            </span>
          </div>

          {/* Status Pill (Clickable for Regularization) */}
          {isMissingOut ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTimingModal({
                  isOpen: true,
                  emp,
                  date,
                  requestType: 'MISSING_OUT',
                  existingTime: rec.in_time,
                })
              }}
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 mt-0.5 cursor-pointer shadow-2xs transition-colors"
              title="Click to regularize Out-Time"
            >
              Missing Out ✎
            </button>
          ) : isMissingIn ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTimingModal({
                  isOpen: true,
                  emp,
                  date,
                  requestType: 'MISSING_IN',
                  existingTime: rec.out_time,
                })
              }}
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 mt-0.5 cursor-pointer shadow-2xs transition-colors"
              title="Click to regularize In-Time"
            >
              Missing In ✎
            </button>
          ) : isWfh ? (
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-sky-100 text-sky-900 border border-sky-300">
              WFH
            </span>
          ) : isCurrentlyInOffice ? (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
              Active Now
            </span>
          ) : (isLate || isEarlyLeave) ? (
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200/90 text-amber-900 border border-amber-300">
              {isLate ? 'Late' : 'Early Out'}
            </span>
          ) : null}
        </div>
      )
    }

    // 3. If NO record exists:
    // A. Future Date OR Date after the last uploaded attendance date -> Show neutral placeholder "--"
    if (isFuture || (maxUploadedDate && date > maxUploadedDate)) {
      return (
        <div className="flex items-center justify-center py-2 text-slate-300 font-mono text-xs select-none">
          --
        </div>
      )
    }

    // B. Today -> If in-time cutoff passed, Absent; else "--"
    if (isToday) {
      if (hasOfficeInTimePassed(date, settings)) {
        return (
          <div
            onClick={() => setActiveLeaveModal({ isOpen: true, emp, date })}
            className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs select-none cursor-pointer transition-all hover:scale-[1.02] group"
            title="Absent Today - Click to apply for Leave"
          >
            <span className="bg-rose-600 group-hover:bg-rose-700 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      } else {
        return (
          <div className="flex items-center justify-center py-2 text-slate-400 font-mono text-xs select-none">
            --
          </div>
        )
      }
    }

    // C. Past Date up to maxUploadedDate -> Absent (Clickable to Apply Leave)
    return (
      <div
        onClick={() => setActiveLeaveModal({ isOpen: true, emp, date })}
        className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs select-none cursor-pointer transition-all hover:scale-[1.02] group"
        title="Absent - Click to apply for Leave"
      >
        <span className="bg-rose-600 group-hover:bg-rose-700 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
          ABSENT
        </span>
      </div>
    )
  }

  const activeBranchDisplay = selectedBranch === 'all' ? 'All Branches' : selectedBranch

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col font-sans ${geistSans.className}`}>
      <AttendanceHeader activeBranch={activeBranchDisplay} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 max-w-full mx-auto w-full pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#003D5C] tracking-tight flex items-center gap-2.5">
              Attendance Records
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Timesheet grid view with fixed employee columns and dynamic date-wise attendance logs.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300 gap-1.5 shadow-2xs h-9"
            >
              <Download className="w-4 h-4 text-[#009D9E]" />
              Excel Export
            </Button>
          </div>
        </div>

        {/* Top Unified Filter Bar with DateRange, Quick Month/Year, Designation, Branch, Search */}
        <Card className="p-4 shadow-xs border-slate-200/90 space-y-3.5 bg-white">
          <div className="flex flex-wrap items-end gap-3">
            {/* 1. Date Range: Quick Month & Year + Range Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Date Range:
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                {/* Month Select */}
                <div className="w-[120px] shrink-0">
                  <Select
                    value={selectedQuickMonth}
                    onValueChange={(val) => val && handleQuickMonthChange(val)}
                  >
                    <SelectTrigger className="text-xs border-slate-300 h-9.5 font-semibold rounded-lg bg-slate-50/50 focus:bg-white w-full">
                      <SelectValue placeholder="Month">
                        {MONTHS_LIST.find((m) => m.value === selectedQuickMonth)?.label || 'Month'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 min-w-[135px]">
                      {MONTHS_LIST.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label} ({m.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Select */}
                <div className="w-[82px] shrink-0">
                  <Select
                    value={selectedQuickYear}
                    onValueChange={(val) => val && handleQuickYearChange(val)}
                  >
                    <SelectTrigger className="text-xs border-slate-300 h-9.5 font-semibold rounded-lg bg-slate-50/50 focus:bg-white w-full">
                      <SelectValue placeholder="Year">{selectedQuickYear}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 min-w-[90px]">
                      {YEARS_LIST.map((yr) => (
                        <SelectItem key={yr} value={yr}>
                          {yr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range Picker inputs */}
                <div className="flex items-center gap-1.5 bg-slate-50/50 border border-slate-300 rounded-lg px-2.5 h-9.5 w-full sm:w-[260px] shrink-0">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-full"
                  />
                  <span className="text-xs text-slate-400 font-medium">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {/* 2. Select Designation */}
            <div className="w-full sm:w-[210px] shrink-0 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block truncate">
                Select Designation
              </label>
              <Select
                value={selectedDesignation}
                onValueChange={(val) => setSelectedDesignation(val || 'all')}
              >
                <SelectTrigger className="text-xs border-slate-300 h-9.5 font-medium rounded-lg bg-slate-50/50 focus:bg-white w-full truncate">
                  <SelectValue placeholder="ALL DESIGNATIONS" />
                </SelectTrigger>
                <SelectContent className="max-h-64 min-w-[240px]">
                  <SelectItem value="all">ALL DESIGNATIONS</SelectItem>
                  {Array.from(new Set(employees.map((e) => e.designation))).filter(Boolean).sort().map((desig) => (
                    <SelectItem key={desig} value={desig}>
                      {desig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Branch Filter (Locked for Lahore/Multan users) */}
            <div className="w-full sm:w-[135px] shrink-0 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block truncate">
                  Branch
                </label>
                {!isAdmin && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                    Locked
                  </span>
                )}
              </div>
              <Select
                value={selectedBranch}
                disabled={!isAdmin}
                onValueChange={(val) => setSelectedBranch(val || 'all')}
              >
                <SelectTrigger
                  className={`text-xs border-slate-300 h-9.5 font-medium rounded-lg w-full ${
                    !isAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white'
                  }`}
                >
                  <SelectValue placeholder="ALL BRANCHES" />
                </SelectTrigger>
                <SelectContent className="max-h-64 min-w-[150px]">
                  {isAdmin && <SelectItem value="all">ALL BRANCHES</SelectItem>}
                  <SelectItem value="Lahore">Lahore</SelectItem>
                  <SelectItem value="Multan">Multan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Search Bar */}
            <div className="flex-1 min-w-[200px] space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Search
                </label>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value
                      setPageSize(val === 'all' ? 'all' : parseInt(val, 10))
                    }}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#009D9E]"
                  >
                    <option value="all">All</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  type="text"
                  placeholder="Search Name, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-8 text-xs border-slate-300 h-9.5 w-full rounded-lg bg-slate-50/50 focus:bg-white transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

        {/* Responsive Quick Status Filter & View Bar (Matching UI Style) */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Left Section: Status Filter Dropdown & Active Indicator */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Dropdown Component */}
            <DataTableFacetedFilter
              title="Status Filter"
              options={[
                {
                  id: 'absent',
                  label: 'Absent',
                  colorDot: 'bg-rose-600',
                  count: statusFilterCounts.totalAbsent,
                  isSelected: statusFilters.absent,
                },
                {
                  id: 'missingIn',
                  label: 'Missing In',
                  colorDot: 'bg-emerald-600',
                  count: statusFilterCounts.totalMissingIn,
                  isSelected: statusFilters.missingIn,
                },
                {
                  id: 'missingOut',
                  label: 'Missing Out',
                  colorDot: 'bg-emerald-600',
                  count: statusFilterCounts.totalMissingOut,
                  isSelected: statusFilters.missingOut,
                },
              ]}
              onToggleOption={(id) => {
                setStatusFilters((prev) => ({
                  ...prev,
                  [id]: !prev[id as keyof typeof prev],
                }))
              }}
              onClear={() => {
                setStatusFilters({ absent: false, missingIn: false, missingOut: false })
              }}
            />

            {/* Reset Filters / Active indicator */}
            {(statusFilters.absent || statusFilters.missingIn || statusFilters.missingOut) && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">
                  Filtered: <strong className="text-slate-800">{filteredEmployees.length}</strong> employee(s)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setStatusFilters({ absent: false, missingIn: false, missingOut: false })
                  }
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Right Section: View (Toggle columns) Options */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* View (Toggle Columns) Component */}
            <DataTableViewOptions
              columns={[
                { id: 'batchId', label: 'Batch ID', isVisible: Boolean(visibleColumns.batchId) },
                { id: 'employeeName', label: 'Employee Name', isVisible: Boolean(visibleColumns.employeeName) },
                { id: 'designation', label: 'Designation', isVisible: Boolean(visibleColumns.designation) },
                { id: 'branch', label: 'Branch', isVisible: Boolean(visibleColumns.branch) },
                { id: 'sundays', label: 'Sundays (Off Days)', isVisible: Boolean(visibleColumns.sundays) },
              ]}
              onToggleColumn={handleToggleColumn}
              onResetAll={handleResetColumns}
            />
          </div>
        </div>
        </Card>

        {/* Summary KPI Counters (7 cards) - Exact MIS Card Styling */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <Card className="p-3 shadow-2xs border-slate-200 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Employees</p>
            <p className="text-lg font-extrabold text-[#003D5C] mt-0.5">{kpiStats.totalEmployees}</p>
          </Card>
          <Card className="p-3 shadow-2xs border-slate-200 border-l-4 border-l-emerald-500 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Time Arrival</p>
            <p className="text-lg font-extrabold text-emerald-600 mt-0.5">{kpiStats.onTimeArrivals}</p>
          </Card>
          <Card className="p-3 shadow-2xs border-slate-200 border-l-4 border-l-amber-500 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late Arrival</p>
            <p className="text-lg font-extrabold text-amber-600 mt-0.5">{kpiStats.lateArrivals}</p>
          </Card>
          <Card className="p-3 shadow-2xs border-slate-200 border-l-4 border-l-teal-500 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Time Departure</p>
            <p className="text-lg font-extrabold text-teal-600 mt-0.5">{kpiStats.onTimeDepartures}</p>
          </Card>
          <Card className="p-3 shadow-2xs border-slate-200 border-l-4 border-l-rose-400 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Early Departure</p>
            <p className="text-lg font-extrabold text-rose-500 mt-0.5">{kpiStats.earlyDepartures}</p>
          </Card>
          <Card className="p-3 shadow-2xs border-slate-200 border-l-4 border-l-rose-600 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Absent</p>
            <p className="text-lg font-extrabold text-rose-600 mt-0.5">{kpiStats.totalAbsent}</p>
          </Card>
          <Card className="p-3 shadow-2xs border-slate-200 border-l-4 border-l-indigo-600 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leave</p>
            <p className="text-lg font-extrabold text-indigo-600 mt-0.5">{kpiStats.totalLeaves}</p>
          </Card>
        </div>

        {/* MATRIX / GRID TIMESHEET - Exact MIS Table with Sticky Columns */}
        <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[720px] relative scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full text-left text-xs border-collapse border-spacing-0">
              {/* Dark Styled Header */}
              <thead className="bg-[#2d3748] text-white font-bold sticky top-0 z-30 shadow-xs">
                <tr>
                  {/* Fixed Column 1: Batch ID */}
                  {visibleColumns.batchId && (
                    <th
                      style={{ left: `${stickyColumnLayout.offsets.batchId ?? 0}px` }}
                      className={cn(
                        'py-3 px-3.5 sticky z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[90px] text-center uppercase tracking-wider text-[11px]',
                        stickyColumnLayout.lastVisibleId === 'batchId' && 'shadow-[3px_0_5px_rgba(0,0,0,0.2)]'
                      )}
                    >
                      Batch ID ⇅
                    </th>
                  )}

                  {/* Fixed Column 2: Employee Name */}
                  {visibleColumns.employeeName && (
                    <th
                      style={{ left: `${stickyColumnLayout.offsets.employeeName ?? 0}px` }}
                      className={cn(
                        'py-3 px-3.5 sticky z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[170px] uppercase tracking-wider text-[11px]',
                        stickyColumnLayout.lastVisibleId === 'employeeName' && 'shadow-[3px_0_5px_rgba(0,0,0,0.2)]'
                      )}
                    >
                      Employee Name ⇅
                    </th>
                  )}

                  {/* Fixed Column 3: Designation */}
                  {visibleColumns.designation && (
                    <th
                      style={{ left: `${stickyColumnLayout.offsets.designation ?? 0}px` }}
                      className={cn(
                        'py-3 px-3.5 sticky z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[150px] uppercase tracking-wider text-[11px]',
                        stickyColumnLayout.lastVisibleId === 'designation' && 'shadow-[3px_0_5px_rgba(0,0,0,0.2)]'
                      )}
                    >
                      Designation ⇅
                    </th>
                  )}

                  {/* Fixed Column 4: Branch */}
                  {visibleColumns.branch && (
                    <th
                      style={{ left: `${stickyColumnLayout.offsets.branch ?? 0}px` }}
                      className={cn(
                        'py-3 px-3 sticky z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[110px] text-center uppercase tracking-wider text-[11px]',
                        stickyColumnLayout.lastVisibleId === 'branch' && 'shadow-[3px_0_5px_rgba(0,0,0,0.2)]'
                      )}
                    >
                      Branch ⇅
                    </th>
                  )}

                  {/* Dynamic Date Columns */}
                  {displayDateColumns.map((date) => {
                    const day = getDayName(date)
                    const isSunday = day === 'Sunday'
                    const isGazettedHoliday = Boolean(holidays[date]) && getPresentEmployeesCountOnDate(date) === 0
                    return (
                      <th
                        key={date}
                        className={`py-2 px-3 text-center border-r border-slate-600/80 w-[155px] min-w-[155px] max-w-[155px] font-sans select-none ${
                          isSunday
                            ? 'bg-[#242c3a] text-amber-300'
                            : isGazettedHoliday
                            ? 'bg-[#8c6b00] text-amber-100'
                            : 'bg-[#2d3748] text-white'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[11px] font-bold font-mono tracking-tight">{date}</span>
                          {isSunday ? (
                            <span className="text-[9px] bg-amber-400 text-amber-950 font-extrabold px-1 rounded shadow-2xs">
                              OFF
                            </span>
                          ) : isGazettedHoliday ? (
                            <span className="text-[9px] bg-amber-300 text-amber-950 font-extrabold px-1 rounded shadow-2xs">
                              HOLIDAY
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase mt-0.5">
                          <span>{day}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={stickyColumnLayout.visibleCount + displayDateColumns.length}
                      className="py-20 text-center text-slate-400 bg-white"
                    >
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#009D9E]" />
                      <p className="font-semibold text-slate-600 text-sm">Loading attendance timesheet grid...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={stickyColumnLayout.visibleCount + displayDateColumns.length}
                      className="py-20 text-center text-slate-400 bg-white"
                    >
                      <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">
                        {records.length === 0
                          ? 'No attendance records uploaded for this period'
                          : 'No matching employees found'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {records.length === 0
                          ? 'Attendance data has not been uploaded for the selected month or date range.'
                          : 'Try adjusting your filters or search query.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => {
                    const isEven = index % 2 === 0
                    const rowBgClass = isEven ? 'bg-white' : 'bg-slate-50/60'

                    return (
                      <tr key={emp.id} className={`${rowBgClass} hover:bg-blue-50/40 transition-colors`}>
                        {/* Sticky Column 1: Batch ID */}
                        {visibleColumns.batchId && (
                          <td
                            style={{ left: `${stickyColumnLayout.offsets.batchId ?? 0}px` }}
                            className={cn(
                              'py-3 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200 sticky z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)]',
                              isEven ? 'bg-white' : 'bg-[#f8fafc]',
                              stickyColumnLayout.lastVisibleId === 'batchId' && 'shadow-[3px_0_5px_rgba(0,0,0,0.04)]'
                            )}
                          >
                            {emp.employee_id}
                          </td>
                        )}

                        {/* Sticky Column 2: Employee Name */}
                        {visibleColumns.employeeName && (
                          <td
                            style={{ left: `${stickyColumnLayout.offsets.employeeName ?? 0}px` }}
                            className={cn(
                              'py-3 px-3.5 font-bold text-slate-900 border-r border-slate-200 sticky z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)]',
                              isEven ? 'bg-white' : 'bg-[#f8fafc]',
                              stickyColumnLayout.lastVisibleId === 'employeeName' && 'shadow-[3px_0_5px_rgba(0,0,0,0.04)]'
                            )}
                          >
                            <span className="text-xs text-slate-900 font-bold block truncate">
                              {emp.name}
                            </span>
                          </td>
                        )}

                        {/* Sticky Column 3: Designation */}
                        {visibleColumns.designation && (
                          <td
                            style={{ left: `${stickyColumnLayout.offsets.designation ?? 0}px` }}
                            className={cn(
                              'py-3 px-3.5 text-slate-600 border-r border-slate-200 text-xs sticky z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)] font-medium truncate',
                              isEven ? 'bg-white' : 'bg-[#f8fafc]',
                              stickyColumnLayout.lastVisibleId === 'designation' && 'shadow-[3px_0_5px_rgba(0,0,0,0.04)]'
                            )}
                          >
                            {emp.designation || 'Staff'}
                          </td>
                        )}

                        {/* Sticky Column 4: Branch */}
                        {visibleColumns.branch && (
                          <td
                            style={{ left: `${stickyColumnLayout.offsets.branch ?? 0}px` }}
                            className={cn(
                              'py-3 px-2 text-center border-r border-slate-200 text-xs sticky z-20',
                              isEven ? 'bg-white' : 'bg-[#f8fafc]',
                              stickyColumnLayout.lastVisibleId === 'branch' && 'shadow-[3px_0_5px_rgba(0,0,0,0.04)]'
                            )}
                          >
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                emp.branch === 'Lahore'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : emp.branch === 'Multan'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {emp.branch || 'Multan'}
                            </span>
                          </td>
                        )}

                        {/* Dynamic Date Data Cells */}
                        {displayDateColumns.map((date) => (
                          <td
                            key={date}
                            className="py-2 px-2 border-r border-slate-200 align-middle text-center w-[155px] min-w-[155px] max-w-[155px]"
                          >
                            {renderCellContent(emp, date)}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Grid Footer Bar */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              Showing <span className="font-bold text-slate-800">{filteredEmployees.length}</span> employees across{' '}
              <span className="font-bold text-slate-800">{displayDateColumns.length}</span> days ({startDate} to {endDate})
            </div>
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> On Time
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Late / Deviation
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#b38600]"></span> Holiday
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Absent
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Leave
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 1. Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={activeLeaveModal.isOpen}
        onClose={() => setActiveLeaveModal({ isOpen: false, emp: null, date: '' })}
        employee={activeLeaveModal.emp}
        date={activeLeaveModal.date}
        onSubmitted={() => {
          fetchRequests()
          fetchRecords()
        }}
      />

      {/* 2. Regularize Timing Modal (Missing In / Out) */}
      <RegularizeTimingModal
        isOpen={activeTimingModal.isOpen}
        onClose={() =>
          setActiveTimingModal({
            isOpen: false,
            emp: null,
            date: '',
            requestType: 'MISSING_IN',
          })
        }
        employee={activeTimingModal.emp}
        date={activeTimingModal.date}
        requestType={activeTimingModal.requestType}
        existingTime={activeTimingModal.existingTime}
        onSubmitted={() => {
          fetchRequests()
          fetchRecords()
        }}
      />

      {/* 3. Pending Request Details & Withdraw Modal */}
      <PendingRequestModal
        isOpen={activePendingModal.isOpen}
        onClose={() => setActivePendingModal({ isOpen: false, request: null })}
        request={activePendingModal.request}
        onCancelled={() => {
          fetchRequests()
          fetchRecords()
        }}
      />
    </div>
  )
}
