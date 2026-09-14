import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, ADMIN_UID } from "../lib/firebase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async (currentUser) => {
    if (!currentUser) return false;
    if (ADMIN_UID && currentUser.uid === ADMIN_UID) return true;
    try {
      const adminSnap = await getDoc(doc(db, "admins", currentUser.uid));
      return adminSnap.exists();
    } catch (err) {
      console.warn("Could not check admins collection:", err);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const adminStatus = await checkAdminStatus(currentUser);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const adminStatus = await checkAdminStatus(result.user);
    setIsAdmin(adminStatus);
    return { ...result, isAdmin: adminStatus };
  };

  const logout = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const value = {
    user,
    loading,
    isAdmin,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
