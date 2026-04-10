import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

function envTrim(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t && t.length > 0 ? t : undefined;
}

const firebaseConfig = {
  apiKey: envTrim(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: envTrim(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: envTrim(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: envTrim(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: envTrim(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: envTrim(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
