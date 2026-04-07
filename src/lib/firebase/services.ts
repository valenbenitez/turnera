import { db } from './config';
import { collection, doc, getDoc, getDocs, query, where, addDoc, Timestamp, runTransaction } from 'firebase/firestore';
import type { Commerce, Service, Staff, Appointment } from '@/lib/types';

const COMMERCE_COLLECTION = 'commerces';
const SERVICES_COLLECTION = 'services';
const STAFF_COLLECTION = 'staff';
const APPOINTMENTS_COLLECTION = 'appointments';

export async function getCommerceBySlug(slug: string): Promise<Commerce | null> {
  const commerceRef = collection(db, COMMERCE_COLLECTION);
  const q = query(commerceRef, where('slug', '==', slug));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Commerce;
}

export async function getServicesByCommerceId(commerceId: string): Promise<Service[]> {
  const servicesRef = collection(db, SERVICES_COLLECTION);
  const q = query(servicesRef, where('commerceId', '==', commerceId), where('active', '==', true));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Service[];
}

export async function getStaffByCommerceId(commerceId: string): Promise<Staff[]> {
  const staffRef = collection(db, STAFF_COLLECTION);
  const q = query(staffRef, where('commerceId', '==', commerceId), where('active', '==', true));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Staff[];
}

export async function getStaffByService(commerceId: string, serviceId: string): Promise<Staff[]> {
  const staffRef = collection(db, STAFF_COLLECTION);
  const q = query(
    staffRef,
    where('commerceId', '==', commerceId),
    where('active', '==', true),
    where('servicesIds', 'array-contains', serviceId)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Staff[];
}

export async function getAppointmentsByStaffAndDate(
  staffId: string,
  date: Date
): Promise<Appointment[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
  const q = query(
    appointmentsRef,
    where('staffId', '==', staffId),
    where('start', '>=', Timestamp.fromDate(startOfDay)),
    where('start', '<=', Timestamp.fromDate(endOfDay)),
    where('status', '==', 'confirmed')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    start: doc.data().start.toDate(),
    end: doc.data().end.toDate(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Appointment[];
}

export async function createAppointmentWithValidation(
  appointment: Omit<Appointment, 'id' | 'createdAt' | 'status'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await runTransaction(db, async (transaction) => {
      const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
      const q = query(
        appointmentsRef,
        where('staffId', '==', appointment.staffId),
        where('start', '<=', appointment.end),
        where('end', '>=', appointment.start),
        where('status', '==', 'confirmed')
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return { success: false, error: 'El horario seleccionado ya fue reservado. Por favor selecciona otro horario.' };
      }
      
      const newAppointmentRef = doc(appointmentsRef);
      transaction.set(newAppointmentRef, {
        ...appointment,
        status: 'confirmed',
        createdAt: Timestamp.fromDate(new Date()),
      });
      
      return { success: true };
    });
    
    return result;
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: 'Error al crear el turno. Por favor intenta nuevamente.' };
  }
}
