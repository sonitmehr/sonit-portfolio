import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Login from "./pages/Login/Login";
import MainPortfolio from "./pages/Public/MainPortfolio";

// Temporary admin placeholder until Phase 2 AdminLayout & Dashboard are wired up
const AdminPlaceholder = () => {
  const { user, logout } = useAuth();
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top, #1a1a2e 0%, #0f0f1b 100%)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Poppins', sans-serif",
      padding: "20px",
      textAlign: "center"
    }}>
      <div style={{
        background: "rgba(25, 25, 38, 0.8)",
        padding: "36px",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        maxWidth: "480px",
        width: "100%"
      }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛡️</div>
        <h2 style={{ margin: "0 0 8px 0" }}>Admin Control Center</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", margin: "0 0 20px 0" }}>
          Authenticated as Admin (UID: {user?.uid})
        </p>
        <div style={{
          padding: "12px",
          background: "rgba(46, 213, 115, 0.15)",
          border: "1px solid rgba(46, 213, 115, 0.3)",
          borderRadius: "10px",
          color: "#2ed573",
          fontSize: "13px",
          marginBottom: "24px"
        }}>
          Phase 1 Foundation Connected Successfully!
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "10px 18px",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            View Public Site
          </button>
          <button
            onClick={logout}
            style={{
              padding: "10px 18px",
              background: "linear-gradient(135deg, #ff416c, #ff4b2b)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Portfolio Route */}
          <Route path="/" element={<MainPortfolio />} />

          {/* Admin Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminPlaceholder />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;