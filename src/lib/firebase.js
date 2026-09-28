import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC9s75ux3Hn0bbg9unjPxOHTlhqscCk9yE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sonitmehrotra-portfolio.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sonitmehrotra-portfolio",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sonitmehrotra-portfolio.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "537969629359",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:537969629359:web:f2e136b806a709a8d31c5a"
};

export const ADMIN_UID = import.meta.env.VITE_ADMIN_UID || "";

const app = initializeApp(firebaseConfig);

const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID;

export const auth    = getAuth(app);
export const db      = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const storage = getStorage(app);

if (databaseId) {
  console.info(`📦 Connected to Firestore named database: "${databaseId}"`);
}

// ── Firebase App Check (reCAPTCHA Enterprise) ──────────────────────────────
// In dev/localhost, use the explicit debug token registered in Firebase Console.
if (typeof window !== "undefined" && (import.meta.env.DEV || window.location.hostname === "localhost")) {
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true;
}

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (recaptchaSiteKey && typeof window !== "undefined") {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("Firebase App Check initialization failed:", err);
  }
}
// ───────────────────────────────────────────────────────────────────────────

export default app;
