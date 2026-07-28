import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getAuth, type Auth } from "firebase-admin/auth";

// Lazy init: Next.js imports route modules during build (page-data
// collection) even without an incoming request, so eager initialization
// would make `next build` require real Firebase credentials.
function getAdminApp(): App {
  if (getApps().length) return getApp();

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

let _adminDb: Firestore | undefined;
let _adminStorage: Storage | undefined;
let _adminAuth: Auth | undefined;

export function getAdminDb(): Firestore {
  return (_adminDb ??= getFirestore(getAdminApp()));
}

export function getAdminStorage(): Storage {
  return (_adminStorage ??= getStorage(getAdminApp()));
}

export function getAdminAuth(): Auth {
  return (_adminAuth ??= getAuth(getAdminApp()));
}
