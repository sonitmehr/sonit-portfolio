import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
