import { AttendanceSettings, Employee, RawPunch } from './database.types'

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  id: 'default',
  weekday_in_time: '10:30',
  weekday_grace_minutes: 15,
  weekday_out_time: '18:30',
  saturday_in_time: '11:00',
  saturday_grace_minutes: 15,
  saturday_out_time: '15:00',
  timezone: 'Asia/Karachi',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function cleanDesignation(desig?: string | null): string {
  if (!desig) return 'Staff'
  return desig
    .replace(/[–—\-]\s*(Multan|Lahore)(\s+Office)?/gi, '')
    .replace(/\s*(Multan|Lahore)\s*Office/gi, '')
    .trim()
}

export function normalizeEmployeeName(name: string | null | undefined): string {
  if (!name) return ''
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function parseTimeToMinutes(timeStr: string | null | undefined): { minutes: number; formatted: string } | null {
  if (!timeStr) return null
  const str = timeStr.trim()
  const timeRegex = /(?:(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(AM|PM)?)/i
  const match = str.match(timeRegex)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const meridiem = match[4] ? match[4].toUpperCase() : null

  if (meridiem === 'PM' && hours < 12) {
    hours += 12
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  const totalMinutes = hours * 60 + minutes
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const displayAmPm = hours >= 12 ? 'PM' : 'AM'
  const formatted = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${displayAmPm}`

  return { minutes: totalMinutes, formatted }
}

export function parseScheduleTimeToMinutes(hhmm: string): number {
  if (!hhmm) return 0
  const parts = hhmm.split(':')
  const h = parseInt(parts[0] || '0', 10)
  const m = parseInt(parts[1] || '0', 10)
  return h * 60 + m
}

export function hasOfficeInTimePassed(dateStr: string, settings?: AttendanceSettings): boolean {
  const s = settings || DEFAULT_ATTENDANCE_SETTINGS
  const targetDate = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = targetDate.getDay()
  if (dayOfWeek === 0) return false // Sunday
  const expectedInMinutes = dayOfWeek === 6
    ? parseScheduleTimeToMinutes(s.saturday_in_time || '11:00') + (s.saturday_grace_minutes || 15)
    : parseScheduleTimeToMinutes(s.weekday_in_time || '10:30') + (s.weekday_grace_minutes || 15)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= expectedInMinutes
}

export function hasOfficeOutTimePassed(dateStr: string, settings?: AttendanceSettings): boolean {
  const s = settings || DEFAULT_ATTENDANCE_SETTINGS
  const targetDate = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = targetDate.getDay()
  if (dayOfWeek === 0) return false // Sunday
  const expectedOutMinutes = dayOfWeek === 6
    ? parseScheduleTimeToMinutes(s.saturday_out_time || '15:00')
    : parseScheduleTimeToMinutes(s.weekday_out_time || '18:30')
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= expectedOutMinutes
}
