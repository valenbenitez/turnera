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
  name: string;
  active: boolean;
  servicesIds: string[];
  workingHours?: WorkingHours;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  commerceId: string;
  serviceId: string;
  staffId: string;
  start: Date;
  end: Date;
  customerName: string;
  contact: string;
  status: 'confirmed' | 'cancelled' | 'no_show';
  createdAt: Date;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
