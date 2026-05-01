export type ClassTypeId = 'pilates' | 'bodypower' | 'gap' | 'espalda' | 'trx' | 'hiit' | 'funcional'

export interface ClassType {
  id: ClassTypeId
  name: string
  color: string
}

export interface ScheduleSlot {
  id: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  is_active: boolean
  class_type_id: ClassTypeId
  class_types: ClassType
  min_regulars: number
  max_capacity: number
}

export interface Plan {
  id: '1x' | '2x' | '3x'
  name: string
  classes_per_week: number
  max_recoveries_per_month: number
}

export interface Profile {
  id: string
  username: string | null
  full_name: string
  phone: string | null
  plan_id: '1x' | '2x' | '3x'
  is_admin: boolean
  payment_status: 'al_dia' | 'pendiente' | 'atrasado'
  last_payment_date: string | null
  notes: string | null
  schedule_type: 'fijo' | 'rotativo'
  created_at: string
}

export interface Announcement {
  id: string
  emoji: string
  title: string
  body: string
  is_active: boolean
  pinned: boolean
  expires_at: string | null
  created_at: string
}

export interface InviteCode {
  id: string
  code: string
  full_name: string
  phone: string | null
  plan_id: string
  is_used: boolean
  created_at: string
}

export interface RegularSlot {
  id: string
  user_id: string
  slot_id: string
  week_parity: 'all' | 'even' | 'odd'
  created_at: string
}

export interface Absence {
  id: string
  user_id: string
  slot_id: string
  class_date: string
  created_at: string
}

export interface RecoveryBooking {
  id: string
  user_id: string
  slot_id: string
  class_date: string
  status: 'confirmed' | 'cancelled'
  created_at: string
}

export interface WaitlistEntry {
  id: string
  user_id: string
  slot_id: string
  class_date: string
  created_at: string
}

export interface CancelledClass {
  slot_id: string
  class_date: string
  reason: string | null
}

export const MAX_CAPACITY = 7
export const CANCEL_DEADLINE_HOURS = 2
export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
export const DAY_SHORT  = ['', 'Lun',   'Mar',    'Mié',       'Jue',    'Vie']
