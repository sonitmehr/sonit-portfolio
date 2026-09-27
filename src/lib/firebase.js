import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// ── Firebase App Check (reCAPTCHA Enterprise) ─────────────────────────────────
if (typeof window !== "undefined" && (import.meta.env.DEV || window.location.hostname === "localhost" || window.location.search.includes("debug_token"))) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
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
// ─────────────────────────────────────────────────────────────────────────────

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
