import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Login from "./pages/Login/Login";
import MainPortfolio from "./pages/Public/MainPortfolio";

// Admin components
import AdminLayout from "./pages/Admin/AdminLayout";
import Dashboard from "./pages/Admin/Dashboard/Dashboard";
import BucketList from "./pages/Admin/BucketList/BucketList";
import SiteSettings from "./pages/Admin/Settings/SiteSettings";
import PlaceholderPage from "./pages/Admin/PlaceholderPage";
import CreditCardTracker from "./pages/Admin/CreditCards/CreditCardTracker";
import CareerTracker from "./pages/Admin/Career/CareerTracker"; 
import GamingTracker from "./pages/Admin/Gaming/GamingTracker";

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
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="bucket-list" element={<BucketList />} />
            <Route path="gaming" element={<GamingTracker />} />
            <Route path="career" element={<CareerTracker />} />
            <Route path="credit-cards" element={<CreditCardTracker />} />
            <Route 
              path="public-pages" 
              element={
                <PlaceholderPage 
                  title="Public Page Builder" 
                  icon="🌐" 
                  phase="Phase 7 Upcoming" 
                  description="Per-route public content curation for /travel, /gaming, /career, /credit-cards, and dynamic custom slugs." 
                />
              } 
            />
            <Route path="settings" element={<SiteSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;