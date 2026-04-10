/**
 * Perfil del usuario del panel (Firestore `users/{uid}`).
 * La identidad de acceso sigue en Firebase Auth; acá va lo editable y preferencias.
 */
export interface UserPreferences {
  /** p. ej. "es", "en" */
  locale?: string;
  /** Resumen por email (futuro) */
  emailDigest?: boolean;
  /** Extensible sin migración de tipos para claves nuevas */
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  photoURL: string | null;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

/** Roles del panel (inglés, persistidos en Firestore). */
export type CommerceMemberRole = "owner" | "reception" | "provider";

export interface CommerceMember {
  id: string;
  userId: string;
  commerceId: string;
  role: CommerceMemberRole;
  /** Obligatorio si `role === "provider"` */
  staffId?: string;
  createdAt: Date;
}

export interface Commerce {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  timezone: string;
  workingHours: WorkingHours;
  slotDurationMinutes: number;
  maxDaysInAdvance: number;
  minHoursBeforeBooking: number;
  whatsappNumber?: string;
  /**
   * Email para avisos de nueva reserva (público). Si falta, se usa el del primer owner en `commerce_members`.
   */
  bookingNotifyEmail?: string;
  createdAt: Date;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
  breaks?: Break[];
}

export interface Break {
  start: string;
  end: string;
}

export interface Customer {
  id: string;
  commerceId: string;
  name: string;
  phone: string;
  email: string;
  /** Para deduplicar consultas; igual a `email` normalizado. */
  emailLowercase: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  commerceId: string;
  name: string;
  durationMinutes: number;
  price?: number;
  active: boolean;
  createdAt: Date;
}

export interface Staff {
  id: string;
  commerceId: string;
  /** Único por comercio; usado en URL pública `/book/{commerce}/{staffSlug}`. */
  slug: string;
  name: string;
  active: boolean;
  servicesIds: string[];
  workingHours?: WorkingHours;
  /** Opcional: vincular cuenta Auth para rol `provider`. */
  userId?: string;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  commerceId: string;
  serviceId: string;
  staffId: string;
  /** Presente en reservas creadas por API pública. */
  customerId?: string;
  start: Date;
  end: Date;
  customerName: string;
  /** Teléfono de contacto */
  contact: string;
  customerEmail?: string;
  status: 'confirmed' | 'cancelled' | 'no_show';
  createdAt: Date;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
