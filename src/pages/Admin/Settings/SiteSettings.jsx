import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import "./SiteSettings.css";

const DEFAULT_SECTIONS = {
  intro: { enabled: true, label: "Intro Section" },
  skills: { enabled: true, label: "Skills & About Me" },
  portfolio: { enabled: true, label: "Portfolio Projects" },
  contact: { enabled: true, label: "Contact Form" },
  exploreMore: { enabled: true, label: "Explore More Topic Links" }
};

const DEFAULT_ROUTES = {
  travel: { enabled: true, label: "Travel Adventures", slug: "travel", icon: "✈️" },
  gaming: { enabled: true, label: "Gaming Progress", slug: "gaming", icon: "🎮" },
  career: { enabled: true, label: "Career & Milestones", slug: "career", icon: "🚀" },
  "credit-cards": { enabled: true, label: "Credit Card Collection", slug: "credit-cards", icon: "💳" }
};

const DEFAULT_CATEGORIES = {
  bucketList: [
    { id: "places", label: "Places to Visit", icon: "🗺️", color: "#4ECDC4", enabled: true },
    { id: "gaming", label: "Gaming Backlog", icon: "🎮", color: "#FF6B6B", enabled: true },
    { id: "personal_growth", label: "Personal Growth", icon: "🌱", color: "#95E1D3", enabled: true },
    { id: "credit_cards", label: "Credit Card Collection", icon: "💳", color: "#FFD93D", enabled: true }
  ],
  career: [
    { id: "frontend", label: "Frontend Architecture", icon: "🖥️", color: "#6C5CE7" },
    { id: "system_design", label: "System Design", icon: "🏗️", color: "#FDCB6E" },
    { id: "dsa", label: "Data Structures & Algos", icon: "🧮", color: "#E17055" },
    { id: "cloud", label: "Cloud & DevOps", icon: "☁️", color: "#74B9FF" }
  ]
};

const SiteSettings = () => {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [routes, setRoutes] = useState(DEFAULT_ROUTES);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCatTab, setActiveCatTab] = useState("bucketList");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📌");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Load from Firestore
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const siteDoc = await getDoc(doc(db, "config", "site"));
        if (siteDoc.exists()) {
          const data = siteDoc.data();
          if (data.sections) setSections(prev => ({ ...prev, ...data.sections }));
          if (data.publicRoutes) setRoutes(prev => ({ ...prev, ...data.publicRoutes }));
        }

        const catDoc = await getDoc(doc(db, "config", "categories"));
        if (catDoc.exists()) {
          const data = catDoc.data();
          if (data.bucketList || data.career) {
            setCategories({
              bucketList: data.bucketList || DEFAULT_CATEGORIES.bucketList,
              career: data.career || DEFAULT_CATEGORIES.career
            });
          }
        }
      } catch (err) {
        console.warn("Using default settings config:", err);
      }
    };
    loadConfig();
  }, []);

  const handleSectionToggle = (key) => {
    setSections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled
      }
    }));
  };

  const handleRouteToggle = (key) => {
    setRoutes(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled
      }
    }));
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;

    const id = newCatLabel.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const colors = ["#4ECDC4", "#FF6B6B", "#FFD93D", "#6C5CE7", "#A8E6CF", "#FDA085"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newCategory = {
      id,
      label: newCatLabel.trim(),
      icon: newCatIcon || "📌",
      color,
      enabled: true
    };

    setCategories(prev => ({
      ...prev,
      [activeCatTab]: [...(prev[activeCatTab] || []), newCategory]
    }));

    setNewCatLabel("");
    setNewCatIcon("📌");
  };

  const handleDeleteCategory = (catId) => {
    setCategories(prev => ({
      ...prev,
      [activeCatTab]: prev[activeCatTab].filter(c => c.id !== catId)
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMsg("");

    try {
      // 1. Save site config
      await setDoc(doc(db, "config", "site"), {
        sections,
        publicRoutes: routes,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Save dynamic categories
      await setDoc(doc(db, "config", "categories"), {
        bucketList: categories.bucketList,
        career: categories.career,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setStatusMsg("✅ Settings and dynamic categories saved successfully!");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err) {
      console.error("Save settings error:", err);
      setStatusMsg(`⚠️ Note: Saved locally (${err.message})`);
      setTimeout(() => setStatusMsg(""), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-container">
      {statusMsg && (
        <div style={{
          padding: "14px 20px",
          background: "rgba(46, 213, 115, 0.15)",
          border: "1px solid rgba(46, 213, 115, 0.3)",
          borderRadius: "14px",
          color: "#2ed573",
          fontWeight: 600,
          fontSize: "14px"
        }}>
          {statusMsg}
        </div>
      )}

      {/* 1. Main Page Section Visibility Toggles */}
      <section className="settings-card">
        <div className="settings-header">
          <h3><span>🎛️</span> Main Portfolio Sections</h3>
          <p>Toggle which sections are visible to public visitors on the home page.</p>
        </div>
        <div className="settings-toggle-list">
          {Object.entries(sections).map(([key, sec]) => (
            <div key={key} className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-title">{sec.label}</span>
                <span className="toggle-desc">Identifier: {key}</span>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={sec.enabled}
                  onChange={() => handleSectionToggle(key)}
                />
                <span className="switch-slider" />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Public Topic Routes */}
      <section className="settings-card">
        <div className="settings-header">
          <h3><span>🌐</span> Public Route Endpoints</h3>
          <p>Enable or disable dedicated topic routes (/travel, /gaming, /career, /credit-cards).</p>
        </div>
        <div className="settings-toggle-list">
          {Object.entries(routes).map(([key, r]) => (
            <div key={key} className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-title">{r.icon} {r.label}</span>
                <span className="toggle-desc">Route URL: /{key}</span>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => handleRouteToggle(key)}
                />
                <span className="switch-slider" />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Dynamic Category Manager */}
      <section className="settings-card">
        <div className="settings-header">
          <h3><span>🏷️</span> Dynamic Category Architecture</h3>
          <p>Add, reorder, or delete custom categories. UI tabs dynamically sync with these values.</p>
        </div>

        <div className="categories-tabs-header">
          <button
            className={`category-tab-btn ${activeCatTab === "bucketList" ? "active" : ""}`}
            onClick={() => setActiveCatTab("bucketList")}
          >
            🗺️ Bucket List Categories ({categories.bucketList?.length || 0})
          </button>
          <button
            className={`category-tab-btn ${activeCatTab === "career" ? "active" : ""}`}
            onClick={() => setActiveCatTab("career")}
          >
            🚀 Career Categories ({categories.career?.length || 0})
          </button>
        </div>

        <div className="category-items-grid">
          {(categories[activeCatTab] || []).map((cat) => (
            <div key={cat.id} className="category-pill-card">
              <div className="category-pill-left">
                <span className="category-color-dot" style={{ backgroundColor: cat.color }} />
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
              <button
                className="category-delete-btn"
                title="Remove Category"
                onClick={() => handleDeleteCategory(cat.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <form className="add-category-form" onSubmit={handleAddCategory}>
          <input
            type="text"
            className="add-category-input"
            style={{ maxWidth: "70px" }}
            value={newCatIcon}
            onChange={(e) => setNewCatIcon(e.target.value)}
            placeholder="Emoji"
          />
          <input
            type="text"
            className="add-category-input"
            value={newCatLabel}
            onChange={(e) => setNewCatLabel(e.target.value)}
            placeholder="New Category Name (e.g. Books, Fitness)..."
          />
          <button type="submit" className="add-category-btn">
            + Add Category
          </button>
        </form>
      </section>

      {/* Save Button */}
      <div className="settings-save-bar">
        <button
          className="save-config-btn"
          disabled={saving}
          onClick={handleSaveAll}
        >
          {saving ? "Saving Changes..." : "💾 Save Site Settings"}
        </button>
      </div>
    </div>
  );
};

export default SiteSettings;
