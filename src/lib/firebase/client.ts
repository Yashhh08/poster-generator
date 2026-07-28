"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from "firebase/auth";

// Lazy init: this module is pulled into the SSR render of client components
// (e.g. during `next build` prerendering), so eager initialization would
// require valid Firebase credentials just to build the app.
function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}");
  return initializeApp(firebaseConfig);
}

let _auth: Auth | undefined;

function getFirebaseAuth(): Auth {
  return (_auth ??= getAuth(getFirebaseApp()));
}

let anonAuthPromise: Promise<User> | null = null;

export function ensureAnonAuth(): Promise<User> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!anonAuthPromise) {
    anonAuthPromise = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          }
        },
        reject
      );
      signInAnonymously(auth).catch((err) => {
        unsubscribe();
        reject(err);
      });
    });
  }
  return anonAuthPromise;
}
