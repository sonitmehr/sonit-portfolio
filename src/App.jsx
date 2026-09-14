import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Login from "./pages/Login/Login";
import MainPortfolio from "./pages/Public/MainPortfolio";

// Admin components
import AdminLayout from "./pages/Admin/AdminLayout";
import Dashboard from "./pages/Admin/Dashboard/Dashboard";
import SiteSettings from "./pages/Admin/Settings/SiteSettings";
import PlaceholderPage from "./pages/Admin/PlaceholderPage";

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
            <Route 
              path="bucket-list" 
              element={
                <PlaceholderPage 
                  title="Bucket List Manager" 
                  icon="🗺️" 
                  phase="Phase 3 Upcoming" 
                  description="Dynamic category tabs, difficulty & XP assignment, confetti celebration completion flow, direct image URL previews, and public publishing toggle." 
                />
              } 
            />
            <Route 
              path="gaming" 
              element={
                <PlaceholderPage 
                  title="Gaming Progress Tracker" 
                  icon="🎮" 
                  phase="Phase 6 Upcoming" 
                  description="Steam Web API & PlayStation PSN integration, sync status, trophy completion bars, and manual title tracking." 
                />
              } 
            />
            <Route 
              path="career" 
              element={
                <PlaceholderPage 
                  title="Career Growth Tracker" 
                  icon="🚀" 
                  phase="Phase 5 Upcoming" 
                  description="Interactive skills roadmap, learning goals with difficulty/priority, career milestones timeline, and public showcase." 
                />
              } 
            />
            <Route 
              path="credit-cards" 
              element={
                <PlaceholderPage 
                  title="Credit Card Collection" 
                  icon="💳" 
                  phase="Phase 4 Upcoming" 
                  description="Visual card gallery with card art images, reward points & cashback logs, perks tracker, and public showcase." 
                />
              } 
            />
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