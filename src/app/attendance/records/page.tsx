'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Building2,
  ShieldAlert,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import * as XLSX from 'xlsx'

// Months List
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

function getRecordStatusFlags(
  emp: Employee,
  date: string,
  recordMatrixMap: Map<string, AttendanceRecordWithEmployee>,
  holidays: Record<string, string>,
  settings?: AttendanceSettings
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
        statusLabel: leaveLabel,
      }
    }

    if (isExplicitAbsent && !hasActualData) {
      if (isBeforeJoining) {
        return { isSunday: false, isGazettedHoliday: false, isLeave: false, isAbsent: false, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, isBeforeJoining: true, statusLabel: '--' }
      }
      if (isSunday || isGazettedHoliday) {
        return { isSunday, isGazettedHoliday, isLeave: false, isAbsent: false, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, statusLabel: isSunday ? 'Sunday' : 'Holiday' }
      }
      if (isFuture) {
        return { isSunday: false, isGazettedHoliday: false, isLeave: false, isAbsent: false, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, statusLabel: '' }
      }
      return { isSunday: false, isGazettedHoliday: false, isLeave: false, isAbsent: true, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, statusLabel: 'Absent' }
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
      statusLabel,
    }
  }

  if (isSunday || isGazettedHoliday) {
    return { isSunday, isGazettedHoliday, isLeave: false, isAbsent: false, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, statusLabel: isSunday ? 'Sunday' : 'Holiday' }
  }

  if (isBeforeJoining) {
    return { isSunday: false, isGazettedHoliday: false, isLeave: false, isAbsent: false, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, isBeforeJoining: true, statusLabel: '--' }
  }

  if (isPast) {
    return { isSunday: false, isGazettedHoliday: false, isLeave: false, isAbsent: true, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, statusLabel: 'Absent' }
  }

  if (isToday) {
    if (hasOfficeInTimePassed(date, settings)) {
      return { isSunday: false, isGazettedHoliday: false, isLeave: false, isAbsent: true, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, statusLabel: 'Absent' }
    }
  }

  return { isSunday: false, isGazettedHoliday: false, isLeave: false, isAbsent: false, isLate: false, isEarlyLeave: false, isMissingIn: false, isMissingOut: false, isWfh: false, isPresent: false, statusLabel: '' }
}

export default function AttendanceRecordsPage() {
  const { currentUser } = useStore()
  const isAdmin = currentUser?.role === 'ADMIN'
  const isLahoreUser = currentUser?.role === 'LAHORE_USER'
  const isMultanUser = currentUser?.role === 'MULTAN_USER'

  // Default branch based on user role
  const defaultBranch = isLahoreUser ? 'Lahore' : isMultanUser ? 'Multan' : 'all'

  const [records, setRecords] = useState<AttendanceRecordWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [settings, setSettings] = useState<AttendanceSettings | undefined>()
  const [holidays, setHolidays] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Date Range Defaults
  const initialDateRange = useMemo(() => {
    const now = new Date()
    const yStr = String(now.getFullYear())
    const mStr = String(now.getMonth() + 1).padStart(2, '0')
    const activeYear = YEARS_LIST.includes(yStr) ? yStr : '2026'
    const { start, end } = getMonthStartAndEnd(activeYear, mStr)
    return { year: activeYear, month: mStr, start, end }
  }, [])

  const [selectedQuickMonth, setSelectedQuickMonth] = useState<string>(initialDateRange.month)
  const [selectedQuickYear, setSelectedQuickYear] = useState<string>(initialDateRange.year)
  const [startDate, setStartDate] = useState(initialDateRange.start)
  const [endDate, setEndDate] = useState(initialDateRange.end)
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<number | 'all'>('all')

  // Status Filter Checkboxes
  const [statusFilters, setStatusFilters] = useState({
    absent: false,
    missingIn: false,
    missingOut: false,
  })

  // Synchronize branch filter if role changes
  useEffect(() => {
    if (isLahoreUser) {
      setSelectedBranch('Lahore')
    } else if (isMultanUser) {
      setSelectedBranch('Multan')
    }
  }, [isLahoreUser, isMultanUser])

  // Handle Month/Year Quick changes
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

  // Initial Load Metadata
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
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err)
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

  // Available Designations & Branches
  const availableDesignations = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((emp) => {
      if (emp.designation) set.add(emp.designation.trim())
    })
    return Array.from(set).sort()
  }, [employees])

  const availableBranches = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((emp) => {
      if (emp.branch) set.add(emp.branch.trim())
    })
    return Array.from(set).sort()
  }, [employees])

  // Calculate status counts for status filter checkboxes
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
        const flags = getRecordStatusFlags(emp, date, recordMatrixMap, holidays, settings)
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

    return { totalAbsent, totalMissingIn, totalMissingOut, empHasMap }
  }, [employees, dateColumns, recordMatrixMap, holidays, settings])

  // Filter Employees
  const filteredEmployees = useMemo(() => {
    const isAnyStatusActive = statusFilters.absent || statusFilters.missingIn || statusFilters.missingOut

    let list = employees.filter((emp) => {
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
      // Status Checkbox filters
      if (isAnyStatusActive) {
        const empStatus = statusFilterCounts.empHasMap.get(emp.id) || statusFilterCounts.empHasMap.get(emp.employee_id)
        if (!empStatus) return false
        const matchAbsent = statusFilters.absent && empStatus.hasAbsent
        const matchMissingIn = statusFilters.missingIn && empStatus.hasMissingIn
        const matchMissingOut = statusFilters.missingOut && empStatus.hasMissingOut
        if (!matchAbsent && !matchMissingIn && !matchMissingOut) return false
      }
      return true
    })

    if (pageSize !== 'all') {
      list = list.slice(0, pageSize)
    }

    return list
  }, [employees, selectedBranch, selectedDesignation, search, statusFilters, statusFilterCounts, pageSize])

  // KPI Stats
  const kpiStats = useMemo(() => {
    let onTimeArrival = 0
    let lateArrival = 0
    let onTimeDeparture = 0
    let earlyDeparture = 0
    let totalAbsent = 0
    let totalLeave = 0

    filteredEmployees.forEach((emp) => {
      dateColumns.forEach((date) => {
        const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
        const flags = getRecordStatusFlags(emp, date, recordMatrixMap, holidays, settings)

        if (flags.isLeave) totalLeave++
        if (flags.isAbsent) totalAbsent++

        if (rec) {
          if (rec.arrival_status === 'On Time Arrival') onTimeArrival++
          if (rec.arrival_status === 'Late Arrival') lateArrival++
          if (rec.departure_status === 'On Time Departure') onTimeDeparture++
          if (rec.departure_status === 'Early Departure') earlyDeparture++
        }
      })
    })

    return {
      totalEmployees: filteredEmployees.length,
      onTimeArrival,
      lateArrival,
      onTimeDeparture,
      earlyDeparture,
      absent: totalAbsent,
      leave: totalLeave,
    }
  }, [filteredEmployees, dateColumns, recordMatrixMap, holidays, settings])

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const rows: any[] = []
      filteredEmployees.forEach((emp) => {
        const rowData: Record<string, any> = {
          'Batch ID': emp.employee_id,
          'Employee Name': emp.name,
          'Designation': emp.designation,
          'Branch': emp.branch || 'Multan',
        }

        dateColumns.forEach((date) => {
          const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
          const flags = getRecordStatusFlags(emp, date, recordMatrixMap, holidays, settings)
          if (flags.isSunday) {
            rowData[date] = 'Sunday (OFF)'
          } else if (flags.isGazettedHoliday) {
            rowData[date] = `Holiday (${holidays[date] || 'Gazetted'})`
          } else if (flags.isLeave) {
            rowData[date] = flags.statusLabel || 'Leave'
          } else if (flags.isAbsent) {
            rowData[date] = 'Absent'
          } else if (rec && (rec.in_time || rec.out_time)) {
            const inT = rec.in_time || '--'
            const outT = rec.out_time || '--'
            const hrs = rec.total_working_hours || ''
            rowData[date] = `${inT} - ${outT} ${hrs ? `(${hrs})` : ''}`
          } else {
            rowData[date] = '--'
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

  // Render Cell Content (Strictly Read-Only)
  const renderCellContent = (emp: Employee, date: string) => {
    const flags = getRecordStatusFlags(emp, date, recordMatrixMap, holidays, settings)
    const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
    const todayStr = formatDate(new Date())
    const isToday = date === todayStr
    const isPast = date < todayStr
    const isFuture = date > todayStr

    if (flags.isBeforeJoining) {
      return (
        <span className="text-slate-300 font-mono text-xs select-none">
          --
        </span>
      )
    }

    if (flags.isSunday) {
      return (
        <div className="py-1 px-2 bg-amber-50/70 border border-amber-200/80 rounded text-amber-800 text-[10px] font-bold tracking-tight">
          Sunday
        </div>
      )
    }

    if (flags.isGazettedHoliday) {
      return (
        <div className="py-1 px-2 bg-amber-100/80 border border-amber-300 rounded text-amber-900 text-[10px] font-extrabold tracking-tight">
          Holiday
        </div>
      )
    }

    if (flags.isLeave) {
      return (
        <div className="py-1 px-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-900 text-[10px] font-bold">
          {flags.statusLabel || 'Leave'}
        </div>
      )
    }

    if (flags.isAbsent) {
      return (
        <div className="py-1 px-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[10px] font-extrabold tracking-wider uppercase">
          Absent
        </div>
      )
    }

    if (rec) {
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

      return (
        <div
          className={`p-1.5 rounded-md flex flex-col items-center justify-center text-center gap-0.5 border ${
            isWfh
              ? 'bg-sky-50 border-sky-300 text-sky-950'
              : isMissingOut || isMissingIn
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : isCurrentlyInOffice
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : isLate || isEarlyLeave
              ? 'bg-amber-50 border-amber-300 text-amber-950'
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

          {/* Duration Badge */}
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
              <Clock className="w-2.5 h-2.5" />
            </span>
            <span className="font-bold text-[10px]">
              {rec.total_working_hours && rec.total_working_hours !== '--' && rec.total_working_hours !== '00:00'
                ? `(${rec.total_working_hours})`
                : isCurrentlyInOffice
                ? '(In Office)'
                : isMissingOut
                ? '(Missing Out)'
                : isMissingIn
                ? '(Missing In)'
                : ''}
            </span>
          </div>
        </div>
      )
    }

    if (isFuture) {
      return <span className="text-slate-300 font-mono text-xs">--</span>
    }

    return (
      <div className="py-1 px-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[10px] font-extrabold tracking-wider uppercase">
        Absent
      </div>
    )
  }

  const activeBranchDisplay = selectedBranch === 'all' ? 'All Branches' : selectedBranch

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <AttendanceHeader activeBranch={activeBranchDisplay} />

      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-5 max-w-[1650px] w-full mx-auto">
        {/* Top Header & Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              Attendance Records
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Timesheet grid view with fixed employee columns and dynamic date-wise attendance logs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300 gap-1.5 shadow-2xs h-9"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Excel Export
            </Button>
          </div>
        </div>

        {/* Filter Card */}
        <Card className="p-4 shadow-xs border-slate-200 space-y-3.5 bg-white">
          <div className="flex flex-wrap items-end gap-3">
            {/* 1. Date Range: Quick Month & Year */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Date Range:
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                {/* Month */}
                <div className="w-[125px] shrink-0">
                  <Select
                    value={selectedQuickMonth}
                    onValueChange={(val) => val && handleQuickMonthChange(val)}
                  >
                    <SelectTrigger className="text-xs border-slate-300 h-9.5 font-semibold rounded-lg bg-slate-50/50">
                      <SelectValue placeholder="Month">
                        {MONTHS_LIST.find((m) => m.value === selectedQuickMonth)?.label || 'Month'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {MONTHS_LIST.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label} ({m.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="w-[90px] shrink-0">
                  <Select
                    value={selectedQuickYear}
                    onValueChange={(val) => val && handleQuickYearChange(val)}
                  >
                    <SelectTrigger className="text-xs border-slate-300 h-9.5 font-semibold rounded-lg bg-slate-50/50">
                      <SelectValue placeholder="Year">{selectedQuickYear}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {YEARS_LIST.map((yr) => (
                        <SelectItem key={yr} value={yr}>
                          {yr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Dates */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 h-9.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Select Designation */}
            <div className="w-full sm:w-[200px] shrink-0 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Select Designation
              </label>
              <Select
                value={selectedDesignation}
                onValueChange={(val) => setSelectedDesignation(val || 'all')}
              >
                <SelectTrigger className="text-xs border-slate-300 h-9.5 font-medium rounded-lg bg-slate-50/50 truncate">
                  <SelectValue placeholder="ALL DESIGNATIONS" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">ALL DESIGNATIONS</SelectItem>
                  {availableDesignations.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Branch Filter (Disabled/Locked for Lahore and Multan users) */}
            <div className="w-full sm:w-[150px] shrink-0 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
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
                  className={`text-xs border-slate-300 h-9.5 font-semibold rounded-lg ${
                    !isAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-50/50'
                  }`}
                >
                  <SelectValue placeholder="ALL BRANCHES" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {isAdmin && <SelectItem value="all">ALL BRANCHES</SelectItem>}
                  <SelectItem value="Lahore">Lahore</SelectItem>
                  <SelectItem value="Multan">Multan</SelectItem>
                  {availableBranches.map(
                    (b) =>
                      b !== 'Lahore' &&
                      b !== 'Multan' && (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      )
                  )}
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
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-slate-50 focus:outline-none"
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
                  className="pl-9 pr-8 text-xs border-slate-300 h-9.5 w-full rounded-lg bg-slate-50/50"
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

          {/* Quick Status Checkbox Filter Bar */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                Status Filter:
              </span>

              {/* Checkbox 1: Absent */}
              <label
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none ${
                  statusFilters.absent
                    ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statusFilters.absent}
                  onChange={(e) =>
                    setStatusFilters((prev) => ({ ...prev, absent: e.target.checked }))
                  }
                  className="w-3.5 h-3.5 rounded text-rose-600 border-slate-300 cursor-pointer accent-rose-600"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>Absent</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                  {statusFilterCounts.totalAbsent}
                </span>
              </label>

              {/* Checkbox 2: Missing In */}
              <label
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none ${
                  statusFilters.missingIn
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statusFilters.missingIn}
                  onChange={(e) =>
                    setStatusFilters((prev) => ({ ...prev, missingIn: e.target.checked }))
                  }
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer accent-emerald-600"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>Missing In</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                  {statusFilterCounts.totalMissingIn}
                </span>
              </label>

              {/* Checkbox 3: Missing Out */}
              <label
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none ${
                  statusFilters.missingOut
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statusFilters.missingOut}
                  onChange={(e) =>
                    setStatusFilters((prev) => ({ ...prev, missingOut: e.target.checked }))
                  }
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer accent-emerald-600"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>Missing Out</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                  {statusFilterCounts.totalMissingOut}
                </span>
              </label>
            </div>

            {(statusFilters.absent || statusFilters.missingIn || statusFilters.missingOut) && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilters({ absent: false, missingIn: false, missingOut: false })
                }
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>
        </Card>

        {/* Summary KPI Counters (7 cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <Card className="p-3 shadow-2xs border-slate-200 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Employees</p>
            <p className="text-lg font-extrabold text-slate-800 mt-0.5">{kpiStats.totalEmployees}</p>
          </Card>

          <Card className="p-3 shadow-2xs border-emerald-200 bg-emerald-50/40 border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">On Time Arrival</p>
            <p className="text-lg font-extrabold text-emerald-800 mt-0.5">{kpiStats.onTimeArrival}</p>
          </Card>

          <Card className="p-3 shadow-2xs border-amber-200 bg-amber-50/40 border-l-4 border-l-amber-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Late Arrival</p>
            <p className="text-lg font-extrabold text-amber-800 mt-0.5">{kpiStats.lateArrival}</p>
          </Card>

          <Card className="p-3 shadow-2xs border-teal-200 bg-teal-50/40 border-l-4 border-l-teal-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">On Time Departure</p>
            <p className="text-lg font-extrabold text-teal-800 mt-0.5">{kpiStats.onTimeDeparture}</p>
          </Card>

          <Card className="p-3 shadow-2xs border-rose-200 bg-rose-50/40 border-l-4 border-l-rose-400">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Early Departure</p>
            <p className="text-lg font-extrabold text-rose-800 mt-0.5">{kpiStats.earlyDeparture}</p>
          </Card>

          <Card className="p-3 shadow-2xs border-red-200 bg-red-50/40 border-l-4 border-l-red-600">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Absent</p>
            <p className="text-lg font-extrabold text-red-800 mt-0.5">{kpiStats.absent}</p>
          </Card>

          <Card className="p-3 shadow-2xs border-indigo-200 bg-indigo-50/40 border-l-4 border-l-indigo-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Leave</p>
            <p className="text-lg font-extrabold text-indigo-800 mt-0.5">{kpiStats.leave}</p>
          </Card>
        </div>

        {/* Timesheet Matrix Table */}
        <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header */}
              <thead className="bg-[#1e293b] text-white sticky top-0 z-30 shadow-xs">
                <tr>
                  <th className="py-3 px-3 text-center font-bold uppercase tracking-wider border-r border-slate-700 w-24 sticky left-0 z-40 bg-[#1e293b]">
                    Batch ID
                  </th>
                  <th className="py-3 px-3.5 font-bold uppercase tracking-wider border-r border-slate-700 w-44 sticky left-[96px] z-40 bg-[#1e293b]">
                    Employee Name
                  </th>
                  <th className="py-3 px-3.5 font-bold uppercase tracking-wider border-r border-slate-700 w-44 sticky left-[272px] z-40 bg-[#1e293b]">
                    Designation
                  </th>
                  <th className="py-3 px-2.5 text-center font-bold uppercase tracking-wider border-r border-slate-700 w-28 sticky left-[448px] z-40 bg-[#1e293b]">
                    Branch
                  </th>

                  {/* Dynamic Date Headers */}
                  {dateColumns.map((date) => {
                    const day = getDayName(date)
                    const isSunday = day === 'Sunday'
                    const isGazettedHoliday = Boolean(holidays[date])

                    return (
                      <th
                        key={date}
                        className={`py-2 px-2.5 text-center border-r border-slate-700 min-w-[130px] select-none ${
                          isSunday
                            ? 'bg-[#182234] text-amber-300'
                            : isGazettedHoliday
                            ? 'bg-[#1b2537] text-amber-200'
                            : 'bg-[#1e293b] text-white'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[11px] font-bold font-mono tracking-tight">{date}</span>
                          {isSunday ? (
                            <span className="text-[9px] bg-amber-400 text-amber-950 font-extrabold px-1 rounded">
                              OFF
                            </span>
                          ) : isGazettedHoliday ? (
                            <span className="text-[9px] bg-amber-300 text-amber-950 font-extrabold px-1 rounded">
                              HOLIDAY
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase mt-0.5">
                          {day}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4 + dateColumns.length}
                      className="py-20 text-center text-slate-400 bg-white"
                    >
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                      <p className="font-semibold text-slate-600 text-sm">Loading attendance timesheet grid...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4 + dateColumns.length}
                      className="py-20 text-center text-slate-400 bg-white"
                    >
                      <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">No matching employees found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => {
                    const isEven = index % 2 === 0
                    const rowBgClass = isEven ? 'bg-white' : 'bg-slate-50/60'

                    return (
                      <tr key={emp.id} className={`${rowBgClass} hover:bg-emerald-50/30 transition-colors`}>
                        {/* Sticky Column 1: Batch ID */}
                        <td
                          className={`py-3 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200 sticky left-0 z-20 ${
                            isEven ? 'bg-white' : 'bg-[#f8fafc]'
                          } shadow-[2px_0_4px_rgba(0,0,0,0.02)]`}
                        >
                          {emp.employee_id}
                        </td>

                        {/* Sticky Column 2: Employee Name */}
                        <td
                          className={`py-3 px-3.5 font-bold text-slate-900 border-r border-slate-200 sticky left-[96px] z-20 ${
                            isEven ? 'bg-white' : 'bg-[#f8fafc]'
                          } shadow-[2px_0_4px_rgba(0,0,0,0.02)]`}
                        >
                          <span className="text-xs">{emp.name}</span>
                        </td>

                        {/* Sticky Column 3: Designation */}
                        <td
                          className={`py-3 px-3.5 text-slate-600 border-r border-slate-200 text-xs sticky left-[272px] z-20 ${
                            isEven ? 'bg-white' : 'bg-[#f8fafc]'
                          } shadow-[2px_0_4px_rgba(0,0,0,0.02)] font-medium`}
                        >
                          {emp.designation || 'Staff'}
                        </td>

                        {/* Sticky Column 4: Branch */}
                        <td
                          className={`py-3 px-2 text-center border-r border-slate-200 text-xs sticky left-[448px] z-20 ${
                            isEven ? 'bg-white' : 'bg-[#f8fafc]'
                          } shadow-[3px_0_5px_rgba(0,0,0,0.04)]`}
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

                        {/* Dynamic Date Data Cells */}
                        {dateColumns.map((date) => (
                          <td
                            key={date}
                            className="py-2 px-2 border-r border-slate-200 align-middle text-center"
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
              <span className="font-bold text-slate-800">{dateColumns.length}</span> days ({startDate} to {endDate})
            </div>
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> On Time
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Late / Deviation
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Holiday / Sunday
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
    </div>
  )
}
