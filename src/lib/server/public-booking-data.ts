import type { DocumentData } from "firebase-admin/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { getAdminApp } from "@/lib/firebase/admin";
import type { Commerce, Service, Staff } from "@/lib/types";

function mapCommerce(id: string, d: DocumentData): Commerce {
  return {
    id,
    slug: d.slug as string,
    name: d.name as string,
    active: Boolean(d.active),
    timezone: d.timezone as string,
    workingHours: d.workingHours as Commerce["workingHours"],
    slotDurationMinutes: d.slotDurationMinutes as number,
    maxDaysInAdvance: d.maxDaysInAdvance as number,
    minHoursBeforeBooking: d.minHoursBeforeBooking as number,
    whatsappNumber: d.whatsappNumber as string | undefined,
    bookingNotifyEmail:
      typeof d.bookingNotifyEmail === "string"
        ? d.bookingNotifyEmail.trim() || undefined
        : undefined,
    createdAt: (d.createdAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function adminGetCommerceBySlug(
  slug: string
): Promise<Commerce | null> {
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection("commerces")
    .where("slug", "==", slug.trim().toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return mapCommerce(doc.id, doc.data());
}

export async function adminGetCommerceById(
  commerceId: string
): Promise<Commerce | null> {
  const db = getFirestore(getAdminApp());
  const doc = await db.collection("commerces").doc(commerceId).get();
  if (!doc.exists) return null;
  return mapCommerce(doc.id, doc.data()!);
}

export async function adminListServicesForPublic(
  commerceId: string
): Promise<Service[]> {
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection("services")
    .where("commerceId", "==", commerceId)
    .where("active", "==", true)
    .get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      commerceId: d.commerceId as string,
      name: d.name as string,
      durationMinutes: d.durationMinutes as number,
      price: d.price as number | undefined,
      active: true,
      createdAt: (d.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    } satisfies Service;
  });
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function mapStaffData(id: string, d: DocumentData): Staff {
  const servicesIds = Array.isArray(d.servicesIds)
    ? (d.servicesIds as string[])
    : Array.isArray(d.serviceIds)
      ? (d.serviceIds as string[])
      : [];
  return {
    id,
    commerceId: d.commerceId as string,
    slug: typeof d.slug === "string" ? d.slug : id,
    name: d.name as string,
    active: Boolean(d.active),
    servicesIds,
    workingHours: d.workingHours as Staff["workingHours"],
    userId: typeof d.userId === "string" ? d.userId : undefined,
    createdAt: (d.createdAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function adminListStaffForPublic(
  commerceId: string
): Promise<Staff[]> {
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection("staff")
    .where("commerceId", "==", commerceId)
    .where("active", "==", true)
    .get();
  const rows = snap.docs.map((doc) => mapStaffData(doc.id, doc.data()));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function adminGetService(
  serviceId: string
): Promise<Service | null> {
  const db = getFirestore(getAdminApp());
  const doc = await db.collection("services").doc(serviceId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    id: doc.id,
    commerceId: d.commerceId as string,
    name: d.name as string,
    durationMinutes: d.durationMinutes as number,
    price: d.price as number | undefined,
    active: Boolean(d.active),
    createdAt: (d.createdAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function adminGetStaff(staffId: string): Promise<Staff | null> {
  const db = getFirestore(getAdminApp());
  const doc = await db.collection("staff").doc(staffId).get();
  if (!doc.exists) return null;
  return mapStaffData(doc.id, doc.data()!);
}

export async function adminGetStaffBySlug(
  commerceId: string,
  staffSlug: string
): Promise<Staff | null> {
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection("staff")
    .where("commerceId", "==", commerceId)
    .where("slug", "==", staffSlug.trim().toLowerCase())
    .where("active", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return mapStaffData(doc.id, doc.data());
}

export async function adminListAppointmentsForStaffDayUtc(
  staffId: string,
  dayStartUtc: Date,
  dayEndExclusiveUtc: Date
): Promise<{ startMs: number; endMs: number }[]> {
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection("appointments")
    .where("staffId", "==", staffId)
    .where("status", "==", "confirmed")
    .where("start", ">=", Timestamp.fromDate(dayStartUtc))
    .where("start", "<", Timestamp.fromDate(dayEndExclusiveUtc))
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    const st = (d.start as Timestamp).toMillis();
    const en = (d.end as Timestamp).toMillis();
    return { startMs: st, endMs: en };
  });
}
