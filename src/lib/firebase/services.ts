import { db } from './config';
import { collection, doc, getDoc, getDocs, query, where, addDoc, Timestamp, runTransaction } from 'firebase/firestore';
import type { Commerce, CommerceMember, Service, Staff, Appointment } from '@/lib/types';
import { commerceMemberDocId } from '@/lib/commerce-member-id';

const COMMERCE_COLLECTION = 'commerces';
const COMMERCE_MEMBERS_COLLECTION = 'commerce_members';
const SERVICES_COLLECTION = 'services';
const STAFF_COLLECTION = 'staff';
const APPOINTMENTS_COLLECTION = 'appointments';

export { commerceMemberDocId };

export async function getCommerceBySlug(slug: string): Promise<Commerce | null> {
  const commerceRef = collection(db, COMMERCE_COLLECTION);
  const q = query(commerceRef, where('slug', '==', slug));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const snap = snapshot.docs[0];
  return {
    id: snap.id,
    ...snap.data(),
    createdAt: snap.data().createdAt?.toDate() || new Date(),
  } as Commerce;
}

export async function getCommerceById(commerceId: string): Promise<Commerce | null> {
  const snap = await getDoc(doc(db, COMMERCE_COLLECTION, commerceId));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data(),
    createdAt: snap.data().createdAt?.toDate() || new Date(),
  } as Commerce;
}

export async function getCommerceMember(
  userId: string,
  commerceId: string
): Promise<CommerceMember | null> {
  const snap = await getDoc(
    doc(db, COMMERCE_MEMBERS_COLLECTION, commerceMemberDocId(userId, commerceId))
  );
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    userId: data.userId as string,
    commerceId: data.commerceId as string,
    role: data.role as CommerceMember['role'],
    staffId: data.staffId as string | undefined,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

export async function listCommerceMembersForUser(
  userId: string
): Promise<CommerceMember[]> {
  const q = query(
    collection(db, COMMERCE_MEMBERS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId as string,
      commerceId: data.commerceId as string,
      role: data.role as CommerceMember['role'],
      staffId: data.staffId as string | undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

export async function getServicesByCommerceId(commerceId: string): Promise<Service[]> {
  const servicesRef = collection(db, SERVICES_COLLECTION);
  const q = query(
    servicesRef,
    where("commerceId", "==", commerceId),
    where("active", "==", true)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as Service[];
}

/** Panel: servicios activos e inactivos. */
export async function listAllServicesByCommerce(
  commerceId: string
): Promise<Service[]> {
  const q = query(
    collection(db, SERVICES_COLLECTION),
    where("commerceId", "==", commerceId)
  );
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as Service[];
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** Compat: `servicesIds` en Firestore; futuro alias `serviceIds`. */
function staffServicesIds(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.servicesIds)) return data.servicesIds as string[];
  const alt = (data as { serviceIds?: unknown }).serviceIds;
  if (Array.isArray(alt)) return alt as string[];
  return [];
}

function mapStaffDoc(id: string, data: Record<string, unknown>): Staff {
  const created = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    commerceId: data.commerceId as string,
    slug: typeof data.slug === "string" ? data.slug : id,
    name: data.name as string,
    active: Boolean(data.active),
    servicesIds: staffServicesIds(data),
    workingHours: data.workingHours as Staff["workingHours"],
    userId: typeof data.userId === "string" ? data.userId : undefined,
    createdAt: created?.toDate?.() ?? new Date(),
  };
}

export async function getStaffByCommerceId(commerceId: string): Promise<Staff[]> {
  const staffRef = collection(db, STAFF_COLLECTION);
  const q = query(
    staffRef,
    where("commerceId", "==", commerceId),
    where("active", "==", true)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => mapStaffDoc(d.id, d.data()));
}

export async function listAllStaffByCommerce(
  commerceId: string
): Promise<Staff[]> {
  const q = query(
    collection(db, STAFF_COLLECTION),
    where("commerceId", "==", commerceId)
  );
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((d) => mapStaffDoc(d.id, d.data()));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStaffByService(commerceId: string, serviceId: string): Promise<Staff[]> {
  const staffRef = collection(db, STAFF_COLLECTION);
  const q = query(
    staffRef,
    where("commerceId", "==", commerceId),
    where("active", "==", true),
    where("servicesIds", "array-contains", serviceId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => mapStaffDoc(d.id, d.data()));
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
