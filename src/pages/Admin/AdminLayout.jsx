import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { calculateLevelInfo, DEFAULT_USER_STATS } from "../../lib/gamification";
import "./AdminLayout.css";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { path: "/admin/bucket-list", label: "Bucket List", icon: "🗺️" },
  { path: "/admin/gaming", label: "Gaming", icon: "🎮" },
  { path: "/admin/career", label: "Career", icon: "🚀" },
  { path: "/admin/credit-cards", label: "Cards", icon: "💳" },
  { path: "/admin/public-pages", label: "Page Builder", icon: "🌐" },
  { path: "/admin/settings", label: "Settings", icon: "⚙️" }
];

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState(DEFAULT_USER_STATS);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Listen to live gamification user stats from Firestore with local fallback
  useEffect(() => {
    try {
      const statsRef = doc(db, "userStats", "gamification");
      const unsubscribe = onSnapshot(statsRef, (docSnap) => {
        if (docSnap.exists()) {
          setStats(docSnap.data());
        }
      }, (err) => {
        console.warn("Firestore stats listener fallback:", err.message);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Using default gamification stats fallback:", e);
    }
  }, []);

  const levelInfo = calculateLevelInfo(stats.totalXp || 0);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Find active item title for top bar
  const activeNavItem = navItems.find(item => 
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <div className={`admin-wrapper ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Desktop Sidebar */}
      <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon-shield">🛡️</div>
            {!collapsed && (
              <div className="brand-text">
                <span className="brand-name">Sonit Admin</span>
                <span className="brand-role">Level {levelInfo.level} {levelInfo.title}</span>
              </div>
            )}
          </div>
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => 
                `sidebar-nav-item ${isActive ? "active" : ""}`
              }
              title={collapsed ? item.label : ""}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {!collapsed && <span className="nav-item-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="/" target="_blank" rel="noopener noreferrer" className="sidebar-action-btn">
            <span>🌐</span>
            {!collapsed && <span>View Public Site</span>}
          </a>
          <button onClick={handleLogout} className="sidebar-action-btn" style={{ color: "#ff6b6b" }}>
            <span>🚪</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="admin-main">
        {/* Top Sticky Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <h1 className="topbar-page-title">
              {activeNavItem ? `${activeNavItem.icon} ${activeNavItem.label}` : "Control Center"}
            </h1>
          </div>

          <div className="topbar-right">
            {/* Gamification Level & XP display */}
            <div className="topbar-badge-pill" title={`Level ${levelInfo.level}: ${levelInfo.title}`}>
              <span>{levelInfo.badge}</span>
              <span>Lv. {levelInfo.level} {levelInfo.title}</span>
            </div>

            <div className="topbar-xp-pill" title={`${levelInfo.totalXp} XP accumulated`}>
              <span>⚡</span>
              <span>{levelInfo.totalXp.toLocaleString()} XP</span>
            </div>

            <a href="/" target="_blank" rel="noopener noreferrer" className="topbar-site-link">
              <span>View Site ↗</span>
            </a>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="admin-page-content">
          <Outlet context={{ stats, setStats, levelInfo }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="admin-mobile-nav">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => 
              `mobile-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/admin/settings"
          className={({ isActive }) => 
            `mobile-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="mobile-nav-icon">⚙️</span>
          <span>More</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default AdminLayout;
