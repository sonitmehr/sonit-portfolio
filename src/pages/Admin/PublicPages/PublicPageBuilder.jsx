import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import "./PublicPageBuilder.css";

/* ─── Constants ─── */
const DEFAULT_ROUTES = [
  {
    slug: "travel",
    label: "Travel",
    icon: "✈️",
    order: 1,
    title: "Travel & Adventures",
    description: "Places I've explored and dream destinations on my bucket list.",
    seoDescription: "Explore travel stories, visited countries, and bucket list adventures by Sonit Mehrotra.",
  },
  {
    slug: "gaming",
    label: "Gaming",
    icon: "🎮",
    order: 2,
    title: "Gaming Showcase & Trophies",
    description: "My gaming backlog, completions, platinum trophies, and current playthroughs.",
    seoDescription: "Track gaming achievements, trophy collections, and gaming backlog by Sonit Mehrotra.",
  },
  {
    slug: "career",
    label: "Career",
    icon: "🚀",
    order: 3,
    title: "Career & Learning Roadmap",
    description: "Technical skills, certifications, learning goals, and career milestones.",
    seoDescription: "Professional growth, skills development roadmap, and tech achievements by Sonit Mehrotra.",
  },
  {
    slug: "credit-cards",
    label: "Credit Cards",
    icon: "💳",
    order: 4,
    title: "Credit Card & Rewards Portfolio",
    description: "My curated card collection, reward strategies, and benefits breakdown.",
    seoDescription: "Curated credit card collection, reward point optimizations, and wallet showcase by Sonit Mehrotra.",
  },
];

const EMPTY_PAGE = {
  title: "",
  description: "",
  heroImageUrl: "",
  seoDescription: "",
  enabled: false,
  order: 99,
};

/* ─── Component ─── */
export default function PublicPageBuilder() {
  const [pages, setPages]           = useState({});       // { slug: pageData }
  const [showcase, setShowcase]     = useState([]);       // all publicShowcase items
  const [activeSlug, setActiveSlug] = useState(null);
  const [editData, setEditData]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [newSlug, setNewSlug]       = useState("");
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [loading, setLoading]       = useState(true);

  /* ─── Load ─── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load all publicPages docs
      const pagesSnap = await getDocs(collection(db, "publicPages"));
      const pagesData = {};
      pagesSnap.forEach((d) => (pagesData[d.id] = d.data()));

      // Merge defaults for any missing slugs
      DEFAULT_ROUTES.forEach((def) => {
        if (!pagesData[def.slug]) {
          pagesData[def.slug] = {
            ...EMPTY_PAGE,
            title: def.title,
            description: def.description,
            seoDescription: def.seoDescription,
            order: def.order,
            label: def.label,
            icon: def.icon,
          };
        }
      });

      setPages(pagesData);
      if (!activeSlug) setActiveSlug(Object.keys(pagesData)[0] || "travel");

      // Load publicShowcase items
      const showcaseSnap = await getDocs(
        query(collection(db, "publicShowcase"), orderBy("createdAt", "desc"))
      );
      setShowcase(showcaseSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("PublicPageBuilder load error:", err);
      showToast("Failed to load pages", "error");
    }
    setLoading(false);
  }, [activeSlug]);

  useEffect(() => { load(); }, []);

  /* ─── When active slug changes, sync editData ─── */
  useEffect(() => {
    if (activeSlug && pages[activeSlug]) {
      setEditData({ ...pages[activeSlug] });
    }
  }, [activeSlug, pages]);

  /* ─── Helpers ─── */
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const allSlugs = () => {
    const merged = new Set([
      ...DEFAULT_ROUTES.map((r) => r.slug),
      ...Object.keys(pages),
    ]);
    return [...merged];
  };

  const routeMeta = (slug) => {
    const def = DEFAULT_ROUTES.find((r) => r.slug === slug);
    return def || { label: slug, icon: "🔗", order: 99 };
  };

  const showcaseForSlug = (slug) =>
    showcase.filter((item) => item.routeSlug === slug && item.isPublic);

  /* ─── Save page config ─── */
  const savePage = async () => {
    if (!activeSlug) return;
    setSaving(true);
    try {
      const meta = routeMeta(activeSlug);
      const dataToSave = {
        ...editData,
        label: editData.label || meta.label || activeSlug,
        icon: editData.icon || meta.icon || "🔗",
        order: editData.order ?? meta.order ?? 99,
        updatedAt: serverTimestamp(),
      };
      await setDoc(
        doc(db, "publicPages", activeSlug),
        dataToSave,
        { merge: true }
      );
      setPages((prev) => ({ ...prev, [activeSlug]: { ...prev[activeSlug], ...dataToSave } }));
      try {
        localStorage.removeItem("explore_more_config");
      } catch (_) {}
      showToast("Page saved successfully");
    } catch (err) {
      console.error(err);
      showToast("Failed to save page", "error");
    }
    setSaving(false);
  };

  /* ─── Toggle enabled ─── */
  const toggleEnabled = async (slug) => {
    const current = pages[slug]?.enabled ?? false;
    const meta = routeMeta(slug);
    const existing = pages[slug] || {};
    try {
      const dataToSave = {
        ...existing,
        label: existing.label || meta.label || slug,
        icon: existing.icon || meta.icon || "🔗",
        order: existing.order ?? meta.order ?? 99,
        enabled: !current,
        updatedAt: serverTimestamp(),
      };
      await setDoc(
        doc(db, "publicPages", slug),
        dataToSave,
        { merge: true }
      );
      setPages((prev) => ({
        ...prev,
        [slug]: { ...prev[slug], ...dataToSave },
      }));
      if (activeSlug === slug) setEditData((prev) => ({ ...prev, enabled: !current }));
      try {
        localStorage.removeItem("explore_more_config");
      } catch (_) {}
      showToast(`Route /${slug} ${!current ? "enabled" : "disabled"}`);
    } catch (err) {
      showToast("Failed to toggle route", "error");
    }
  };

  /* ─── Remove showcase item from this route ─── */
  const removeFromShowcase = async (itemId) => {
    try {
      await updateDoc(doc(db, "publicShowcase", itemId), {
        isPublic: false,
        routeSlug: null,
      });
      setShowcase((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, isPublic: false, routeSlug: null } : i
        )
      );
      showToast("Item removed from public page");
    } catch (err) {
      showToast("Failed to remove item", "error");
    }
  };

  /* ─── Add custom route ─── */
  const addCustomRoute = async () => {
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug || pages[slug]) {
      showToast("Slug already exists or is invalid", "error");
      return;
    }
    try {
      const data = { ...EMPTY_PAGE, title: slug, enabled: false };
      await setDoc(doc(db, "publicPages", slug), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPages((prev) => ({ ...prev, [slug]: data }));
      setActiveSlug(slug);
      setNewSlug("");
      setShowAddRoute(false);
      showToast(`Route /${slug} created`);
    } catch (err) {
      showToast("Failed to create route", "error");
    }
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="ppb-loading">
        <div className="ppb-spinner" />
        <p>Loading page configurations…</p>
      </div>
    );
  }

  const slugs = allSlugs();
  const activeItems = showcaseForSlug(activeSlug);
  const activePageData = pages[activeSlug] || EMPTY_PAGE;
  const activeMeta = routeMeta(activeSlug);

  return (
    <div className="ppb-wrapper">
      {/* Toast */}
      {toast && (
        <div className={`ppb-toast ${toast.type}`}>{toast.msg}</div>
      )}

      <div className="ppb-layout">
        {/* ── Left: Route List ── */}
        <aside className="ppb-sidebar">
          <div className="ppb-sidebar-header">
            <h2 className="ppb-sidebar-title">Public Routes</h2>
            <button
              className="ppb-add-btn"
              onClick={() => setShowAddRoute(!showAddRoute)}
              title="Add custom route"
            >
              +
            </button>
          </div>

          {showAddRoute && (
            <div className="ppb-add-route-form">
              <input
                type="text"
                className="ppb-input"
                placeholder="route-slug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomRoute()}
              />
              <div className="ppb-add-route-actions">
                <button className="ppb-btn ppb-btn-primary" onClick={addCustomRoute}>
                  Create
                </button>
                <button
                  className="ppb-btn ppb-btn-ghost"
                  onClick={() => { setShowAddRoute(false); setNewSlug(""); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <nav className="ppb-route-list">
            {slugs.map((slug) => {
              const meta = routeMeta(slug);
              const pageData = pages[slug] || EMPTY_PAGE;
              const isActive = activeSlug === slug;
              return (
                <button
                  key={slug}
                  className={`ppb-route-item ${isActive ? "active" : ""}`}
                  onClick={() => setActiveSlug(slug)}
                >
                  <span className="ppb-route-icon">{meta.icon}</span>
                  <div className="ppb-route-info">
                    <span className="ppb-route-label">{meta.label || slug}</span>
                    <span className="ppb-route-path">/{slug}</span>
                  </div>
                  <span
                    className={`ppb-status-dot ${pageData.enabled ? "on" : "off"}`}
                    title={pageData.enabled ? "Enabled" : "Disabled"}
                  />
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Right: Editor ── */}
        <main className="ppb-editor">
          {activeSlug ? (
            <>
              {/* Header */}
              <div className="ppb-editor-header">
                <div className="ppb-editor-title-row">
                  <span className="ppb-editor-icon">{activeMeta.icon}</span>
                  <div>
                    <h2 className="ppb-editor-title">/{activeSlug}</h2>
                    <span className="ppb-editor-subtitle">
                      {activePageData.enabled ? "🟢 Live" : "🔴 Hidden"}
                    </span>
                  </div>
                </div>
                <div className="ppb-header-actions">
                  <label className="ppb-toggle-wrap" title="Toggle route visibility">
                    <span>{activePageData.enabled ? "Enabled" : "Disabled"}</span>
                    <button
                      className={`ppb-toggle ${activePageData.enabled ? "on" : ""}`}
                      onClick={() => toggleEnabled(activeSlug)}
                    >
                      <span className="ppb-toggle-thumb" />
                    </button>
                  </label>
                  <button
                    className="ppb-btn ppb-btn-primary"
                    onClick={savePage}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="ppb-form-section">
                <h3 className="ppb-section-label">Page Content</h3>
                <div className="ppb-form-grid">
                  <div className="ppb-field">
                    <label className="ppb-label">Page Title</label>
                    <input
                      type="text"
                      className="ppb-input"
                      placeholder="e.g. My Gaming Journey"
                      value={editData.title || ""}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="ppb-field ppb-field-full">
                    <label className="ppb-label">Description</label>
                    <textarea
                      className="ppb-input ppb-textarea"
                      placeholder="Short description shown on the public page hero."
                      value={editData.description || ""}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, description: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                  <div className="ppb-field ppb-field-full">
                    <label className="ppb-label">Hero Image URL</label>
                    <input
                      type="text"
                      className="ppb-input"
                      placeholder="https://images.unsplash.com/..."
                      value={editData.heroImageUrl || ""}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, heroImageUrl: e.target.value }))
                      }
                    />
                    {editData.heroImageUrl && (
                      <img
                        src={editData.heroImageUrl}
                        alt="Hero preview"
                        className="ppb-hero-preview"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    )}
                  </div>
                  <div className="ppb-field ppb-field-full">
                    <label className="ppb-label">SEO Meta Description</label>
                    <input
                      type="text"
                      className="ppb-input"
                      placeholder="For search engines (160 chars max)"
                      value={editData.seoDescription || ""}
                      maxLength={160}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, seoDescription: e.target.value }))
                      }
                    />
                    <span className="ppb-char-count">
                      {(editData.seoDescription || "").length}/160
                    </span>
                  </div>
                </div>
              </div>

              {/* Published Items */}
              <div className="ppb-form-section">
                <h3 className="ppb-section-label">
                  Published Items on this Route
                  <span className="ppb-item-count">{activeItems.length}</span>
                </h3>
                {activeItems.length === 0 ? (
                  <div className="ppb-empty-items">
                    <span className="ppb-empty-icon">📭</span>
                    <p>No items published to <code>/{activeSlug}</code> yet.</p>
                    <p className="ppb-empty-hint">
                      Toggle "Publish to Public" on items in Bucket List, Gaming,
                      Career, or Credit Cards pages to feature them here.
                    </p>
                  </div>
                ) : (
                  <div className="ppb-items-grid">
                    {activeItems.map((item) => (
                      <div key={item.id} className="ppb-item-card">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="ppb-item-img"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        )}
                        <div className="ppb-item-body">
                          <span className="ppb-item-title">{item.title}</span>
                          {item.category && (
                            <span className="ppb-item-badge">{item.category}</span>
                          )}
                          {item.description && (
                            <p className="ppb-item-desc">{item.description}</p>
                          )}
                        </div>
                        <button
                          className="ppb-item-remove"
                          onClick={() => removeFromShowcase(item.id)}
                          title="Remove from public page"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ppb-no-selection">
              <span>←</span>
              <p>Select a route to configure</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
