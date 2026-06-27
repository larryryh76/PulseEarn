import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "MISSING",
  // Derive authDomain from project ID to prevent environment mismatch
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (import.meta.env.VITE_FIREBASE_PROJECT_ID ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` : undefined),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Log warning if config is missing but don't prevent boot
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.error("CRITICAL: Firebase API Key is missing from environment variables.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
