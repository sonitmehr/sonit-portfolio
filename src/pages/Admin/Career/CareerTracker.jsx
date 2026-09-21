import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  calculateLevelInfo,
  evaluateUnlockedBadges,
  DIFFICULTY_XP,
} from "../../../lib/gamification";
import "./CareerTracker.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION_TABS = [
  { id: "skills",     label: "Skills Roadmap",    icon: "🧠" },
  { id: "goals",      label: "Learning Goals",    icon: "📚" },
  { id: "milestones", label: "Career Milestones", icon: "🏆" },
];

const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced", "expert"];
const PROFICIENCY_COLORS  = { beginner: "#4ECDC4", intermediate: "#FFD93D", advanced: "#FF9F43", expert: "#FF6B6B" };
const PROFICIENCY_STEPS   = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

const SKILL_STATUSES    = ["not_started", "learning", "proficient", "completed"];
const GOAL_STATUSES     = ["not_started", "in_progress", "completed"];
const MILESTONE_TYPES   = ["promotion", "certification", "company_switch", "achievement"];
const MILESTONE_ICONS   = { promotion: "🏆", certification: "📜", company_switch: "🚀", achievement: "⭐" };
const PRIORITY_OPTIONS  = ["low", "medium", "high"];
const PRIORITY_COLORS   = { low: "rgba(255,255,255,0.3)", medium: "#FFD93D", high: "#FF6B6B" };

const DIFFICULTY_OPTIONS = [
  { value: "casual",      label: "Casual",      xp: 50  },
  { value: "moderate",    label: "Moderate",    xp: 100 },
  { value: "challenging", label: "Challenging", xp: 250 },
  { value: "epic",        label: "Epic",        xp: 500 },
];

const DEFAULT_CAREER_CATS = [
  { id: "frontend",      label: "Frontend",       icon: "🖥️" },
  { id: "system_design", label: "System Design",  icon: "🏗️" },
  { id: "dsa",           label: "DSA",            icon: "🧮" },
  { id: "cloud",         label: "Cloud",          icon: "☁️" },
];

const BLANK_SKILL = {
  type: "skill", title: "", category: "frontend", proficiencyLevel: "beginner",
  status: "not_started", resources: "", notes: "", imageUrl: "",
  isPublic: false, xpValue: 100, difficulty: "moderate",
};

const BLANK_GOAL = {
  type: "learning_goal", title: "", description: "", category: "frontend",
  priority: "medium", status: "not_started", deadline: "", milestones: [],
  notes: "", imageUrl: "", isPublic: false, xpValue: 100, difficulty: "moderate",
};

const BLANK_MILESTONE = {
  type: "milestone", milestoneType: "achievement", title: "", company: "",
  date: "", notes: "", isPublic: false,
};

const genId = () => `career_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const triggerConfetti = () =>
  confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 }, colors: ["#FFD93D", "#fff", "#4ECDC4"] });

// ─── Component ────────────────────────────────────────────────────────────────
const CareerTracker = () => {
  const { stats, setStats } = useOutletContext();

  const [activeTab,    setActiveTab]    = useState("skills");
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [categories,   setCategories]   = useState(DEFAULT_CAREER_CATS);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingItem,  setEditingItem]  = useState(null);
  const [formData,     setFormData]     = useState(BLANK_SKILL);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [xpToast,      setXpToast]      = useState(null);
  const [levelUpModal, setLevelUpModal] = useState(null);
  const [expandedId,   setExpandedId]   = useState(null);
  const [newMsText,    setNewMsText]    = useState({});

  // ── Fetch career categories from config ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "config", "categories"));
        if (snap.exists() && snap.data().career?.length) {
          setCategories(snap.data().career);
        }
      } catch (e) {
        console.warn("Using default career categories:", e);
      }
    };
    load();
  }, []);

  // ── Real-time listener on careerGoals ────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "careerGoals"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.warn("careerGoals listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Filtered items per tab ────────────────────────────────────────────────
  const tabTypeMap = { skills: "skill", goals: "learning_goal", milestones: "milestone" };
  const visibleItems = items.filter((it) => it.type === tabTypeMap[activeTab]);

  // ── Summary counts ────────────────────────────────────────────────────────
  const totalSkills     = items.filter((i) => i.type === "skill").length;
  const doneSkills      = items.filter((i) => i.type === "skill" && i.status === "completed").length;
  const totalGoals      = items.filter((i) => i.type === "learning_goal").length;
  const doneGoals       = items.filter((i) => i.type === "learning_goal" && i.status === "completed").length;
  const totalMilestones = items.filter((i) => i.type === "milestone").length;
  const totalXpFromCareer = items
    .filter((i) => i.status === "completed" && i.type !== "milestone")
    .reduce((s, i) => s + (i.xpValue || 100), 0);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingItem(null);
    const blank = activeTab === "skills" ? BLANK_SKILL : activeTab === "goals" ? BLANK_GOAL : BLANK_MILESTONE;
    setFormData({ ...blank, category: categories[0]?.id || "frontend" });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...item,
      resources: Array.isArray(item.resources)
        ? item.resources.map((r) => (typeof r === "string" ? r : `${r.label}|${r.url}`)).join(", ")
        : item.resources || "",
      deadline: item.deadline || "",
      milestones: item.milestones || [],
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingItem(null); };

  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "difficulty") updated.xpValue = DIFFICULTY_XP[value] || 100;
      return updated;
    });
  };

  const parseResources = (str) => {
    if (!str?.trim()) return [];
    return str.split(",").map((r) => {
      const parts = r.trim().split("|");
      return parts.length === 2
        ? { label: parts[0].trim(), url: parts[1].trim() }
        : { label: r.trim(), url: "" };
    }).filter((r) => r.label);
  };

  // ── Save item ─────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;
    setSaving(true);

    const isNew  = !editingItem;
    const itemId = editingItem?.id || genId();

    const payload = {
      type:      formData.type,
      title:     formData.title.trim(),
      notes:     formData.notes?.trim() || "",
      isPublic:  Boolean(formData.isPublic),
      updatedAt: serverTimestamp(),
      ...(isNew && { createdAt: serverTimestamp(), completedAt: null }),
      ...(formData.type === "skill" && {
        category:         formData.category,
        proficiencyLevel: formData.proficiencyLevel,
        status:           formData.status || "not_started",
        resources:        parseResources(formData.resources),
        imageUrl:         formData.imageUrl?.trim() || "",
        xpValue:          Number(formData.xpValue) || 100,
        difficulty:       formData.difficulty,
      }),
      ...(formData.type === "learning_goal" && {
        description: formData.description?.trim() || "",
        category:    formData.category,
        priority:    formData.priority,
        status:      formData.status || "not_started",
        deadline:    formData.deadline || "",
        milestones:  formData.milestones || [],
        resources:   parseResources(formData.resources),
        imageUrl:    formData.imageUrl?.trim() || "",
        xpValue:     Number(formData.xpValue) || 100,
        difficulty:  formData.difficulty,
      }),
      ...(formData.type === "milestone" && {
        milestoneType: formData.milestoneType || "achievement",
        company:       formData.company?.trim() || "",
        date:          formData.date || "",
      }),
    };

    try {
      await setDoc(doc(db, "careerGoals", itemId), payload, { merge: true });
    } catch (err) {
      console.error("Save career item error:", err);
    }

    setSaving(false);
    closeModal();
  };

  // ── Complete item (awards XP) ─────────────────────────────────────────────
  const completeItem = async (item) => {
    if (item.status === "completed" || item.type === "milestone") return;
    try {
      await updateDoc(doc(db, "careerGoals", item.id), {
        status: "completed", completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await awardXp(item);
    } catch (err) {
      console.warn("Complete item error:", err);
    }
  };

  // ── Award XP ──────────────────────────────────────────────────────────────
  const awardXp = async (item) => {
    try {
      const xpGained   = item.xpValue || DIFFICULTY_XP[item.difficulty] || 100;
      const oldStats   = stats || {};
      const newTotalXp = (oldStats.totalXp || 0) + xpGained;
      const oldLevel   = calculateLevelInfo(oldStats.totalXp || 0).level;
      const newLevel   = calculateLevelInfo(newTotalXp).level;
      const leveled    = newLevel > oldLevel;

      const pgBreak = oldStats.categoryBreakdown?.personal_growth || { completed: 0, total: 0 };
      const newPgBreak = {
        ...pgBreak,
        completed: (pgBreak.completed || 0) + 1,
        total: Math.max((pgBreak.total || 0), (pgBreak.completed || 0) + 1),
        label: "Personal Growth", icon: "🌱", color: "#95E1D3",
      };

      const actEntry = {
        id: `act_${Date.now()}`, itemId: item.id, title: item.title,
        xpGained, date: new Date().toISOString(), category: "personal_growth", icon: "🌱",
      };

      const updatedStats = {
        ...oldStats,
        totalXp:        newTotalXp,
        currentLevel:   newLevel,
        levelTitle:     calculateLevelInfo(newTotalXp).title,
        totalCompleted: (oldStats.totalCompleted || 0) + 1,
        categoryBreakdown: { ...(oldStats.categoryBreakdown || {}), personal_growth: newPgBreak },
        recentActivity: [actEntry, ...(oldStats.recentActivity || [])].slice(0, 20),
        updatedAt:      serverTimestamp(),
      };

      updatedStats.unlockedBadges = evaluateUnlockedBadges(updatedStats, oldStats.unlockedBadges || []);
      await setDoc(doc(db, "userStats", "gamification"), updatedStats, { merge: true });
      setStats(updatedStats);

      setXpToast({ xp: xpGained, title: item.title });
      setTimeout(() => setXpToast(null), 3500);

      if (leveled) {
        triggerConfetti();
        setLevelUpModal({ level: newLevel, title: calculateLevelInfo(newTotalXp).title });
      } else {
        triggerConfetti();
      }
    } catch (err) {
      console.warn("XP award error:", err);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteDoc(doc(db, "careerGoals", deleteTarget.id)); } catch (err) { console.error(err); }
    setDeleteTarget(null);
  };

  // ── Toggle Public ─────────────────────────────────────────────────────────
  const togglePublic = async (item) => {
    try {
      await updateDoc(doc(db, "careerGoals", item.id), { isPublic: !item.isPublic, updatedAt: serverTimestamp() });
    } catch (err) { console.warn(err); }
  };

  // ── Inline milestone checklist ────────────────────────────────────────────
  const toggleMilestoneCheck = async (item, idx) => {
    const updated = (item.milestones || []).map((m, i) => i === idx ? { ...m, completed: !m.completed } : m);
    try { await updateDoc(doc(db, "careerGoals", item.id), { milestones: updated, updatedAt: serverTimestamp() }); } catch (err) { console.warn(err); }
  };

  const addMilestoneToCard = async (item) => {
    const text = (newMsText[item.id] || "").trim();
    if (!text) return;
    const updated = [...(item.milestones || []), { title: text, completed: false }];
    try {
      await updateDoc(doc(db, "careerGoals", item.id), { milestones: updated, updatedAt: serverTimestamp() });
      setNewMsText((prev) => ({ ...prev, [item.id]: "" }));
    } catch (err) { console.warn(err); }
  };

  const removeMilestone = async (item, idx) => {
    const updated = (item.milestones || []).filter((_, i) => i !== idx);
    try { await updateDoc(doc(db, "careerGoals", item.id), { milestones: updated, updatedAt: serverTimestamp() }); } catch (err) { console.warn(err); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ct-container">

      {xpToast && (
        <div className="ct-xp-toast">
          <span>🌱</span>
          <span><strong>{xpToast.title}</strong> completed! <span className="ct-xp-val">+{xpToast.xp} XP ⚡</span></span>
        </div>
      )}

      {levelUpModal && (
        <div className="ct-overlay" onClick={() => setLevelUpModal(null)}>
          <div className="ct-levelup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ct-levelup-icon">🎉</div>
            <h2>Level Up!</h2>
            <p>You reached</p>
            <div className="ct-levelup-title">Level {levelUpModal.level} — {levelUpModal.title}</div>
            <button className="ct-btn-primary" onClick={() => setLevelUpModal(null)}>Awesome! 🚀</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="ct-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="ct-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ct-delete-icon">🗑️</div>
            <h3>Delete this entry?</h3>
            <p><strong>{deleteTarget.title}</strong> will be permanently removed.</p>
            <div className="ct-delete-actions">
              <button className="ct-btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="ct-btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="ct-overlay" onClick={closeModal}>
          <div className="ct-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ct-modal-header">
              <h3>
                {activeTab === "skills" ? "🧠" : activeTab === "goals" ? "📚" : "🏆"}
                {" "}{editingItem ? "Edit" : "Add"} {activeTab === "skills" ? "Skill" : activeTab === "goals" ? "Learning Goal" : "Milestone"}
              </h3>
              <button className="ct-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="ct-form" onSubmit={handleSave}>
              <div className="ct-field ct-field-full">
                <label>Title *</label>
                <input type="text" name="title" value={formData.title || ""} onChange={handleField}
                  placeholder={activeTab === "skills" ? "e.g. React, TypeScript, Go" : activeTab === "goals" ? "e.g. Complete System Design course" : "e.g. Promoted to Senior Engineer"} required />
              </div>

              {formData.type === "skill" && (<>
                <div className="ct-form-row">
                  <div className="ct-field">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleField}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div className="ct-field">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleField}>
                      {SKILL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ct-form-row">
                  <div className="ct-field">
                    <label>Proficiency Level</label>
                    <select name="proficiencyLevel" value={formData.proficiencyLevel} onChange={handleField}>
                      {PROFICIENCY_LEVELS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="ct-field">
                    <label>Difficulty</label>
                    <select name="difficulty" value={formData.difficulty} onChange={handleField}>
                      {DIFFICULTY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label} ({d.xp} XP)</option>)}
                    </select>
                  </div>
                </div>
                <div className="ct-field ct-field-full">
                  <label>Resources <span className="ct-label-hint">(Name|URL, comma-separated)</span></label>
                  <input type="text" name="resources" value={formData.resources || ""} onChange={handleField} placeholder="Docs|https://reactjs.org, Course|https://udemy.com" />
                </div>
              </>)}

              {formData.type === "learning_goal" && (<>
                <div className="ct-field ct-field-full">
                  <label>Description</label>
                  <textarea name="description" value={formData.description || ""} onChange={handleField} rows={2} placeholder="What exactly will you accomplish?" />
                </div>
                <div className="ct-form-row">
                  <div className="ct-field">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleField}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div className="ct-field">
                    <label>Priority</label>
                    <select name="priority" value={formData.priority} onChange={handleField}>
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ct-form-row">
                  <div className="ct-field">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleField}>
                      {GOAL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div className="ct-field">
                    <label>Deadline</label>
                    <input type="date" name="deadline" value={formData.deadline || ""} onChange={handleField} />
                  </div>
                </div>
                <div className="ct-form-row">
                  <div className="ct-field">
                    <label>Difficulty</label>
                    <select name="difficulty" value={formData.difficulty} onChange={handleField}>
                      {DIFFICULTY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label} ({d.xp} XP)</option>)}
                    </select>
                  </div>
                  <div className="ct-field">
                    <label>XP Value</label>
                    <input type="number" name="xpValue" value={formData.xpValue} onChange={handleField} min="0" />
                  </div>
                </div>
                <div className="ct-field ct-field-full">
                  <label>Resources <span className="ct-label-hint">(Name|URL, comma-separated)</span></label>
                  <input type="text" name="resources" value={formData.resources || ""} onChange={handleField} placeholder="Course|https://..., Book|https://..." />
                </div>
              </>)}

              {formData.type === "milestone" && (<>
                <div className="ct-form-row">
                  <div className="ct-field">
                    <label>Type</label>
                    <select name="milestoneType" value={formData.milestoneType || "achievement"} onChange={handleField}>
                      {MILESTONE_TYPES.map((t) => <option key={t} value={t}>{MILESTONE_ICONS[t]} {t.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div className="ct-field">
                    <label>Date</label>
                    <input type="date" name="date" value={formData.date || ""} onChange={handleField} />
                  </div>
                </div>
                <div className="ct-field ct-field-full">
                  <label>Company / Organisation</label>
                  <input type="text" name="company" value={formData.company || ""} onChange={handleField} placeholder="e.g. Google, Self, Coursera" />
                </div>
              </>)}

              <div className="ct-field ct-field-full">
                <label>Notes</label>
                <textarea name="notes" value={formData.notes || ""} onChange={handleField} rows={2} placeholder="Any additional context..." />
              </div>

              <label className="ct-toggle-label">
                <input type="checkbox" name="isPublic" checked={Boolean(formData.isPublic)} onChange={handleField} />
                <span className="ct-toggle-track" />
                <span className="ct-toggle-text">Publish to /career public page</span>
              </label>

              <div className="ct-modal-actions">
                <button type="button" className="ct-btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="ct-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingItem ? "Save Changes" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="ct-header-row">
        <div className="ct-header-left">
          <h2>🚀 Career Growth Tracker</h2>
          <p>Skills, learning goals, and career wins — all in one place</p>
        </div>
        <button className="ct-add-btn" onClick={openAdd}>+ Add Entry</button>
      </div>

      {/* Summary Stats */}
      <div className="ct-stats-grid">
        <div className="ct-stat-card">
          <div className="ct-stat-icon">🧠</div>
          <div className="ct-stat-body">
            <div className="ct-stat-value">{doneSkills}<span className="ct-stat-total">/{totalSkills}</span></div>
            <div className="ct-stat-label">Skills Mastered</div>
          </div>
        </div>
        <div className="ct-stat-card">
          <div className="ct-stat-icon">📚</div>
          <div className="ct-stat-body">
            <div className="ct-stat-value">{doneGoals}<span className="ct-stat-total">/{totalGoals}</span></div>
            <div className="ct-stat-label">Goals Completed</div>
          </div>
        </div>
        <div className="ct-stat-card">
          <div className="ct-stat-icon">🏆</div>
          <div className="ct-stat-body">
            <div className="ct-stat-value">{totalMilestones}</div>
            <div className="ct-stat-label">Career Milestones</div>
          </div>
        </div>
        <div className="ct-stat-card">
          <div className="ct-stat-icon">⚡</div>
          <div className="ct-stat-body">
            <div className="ct-stat-value">{totalXpFromCareer.toLocaleString()}</div>
            <div className="ct-stat-label">XP from Career</div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="ct-tab-bar">
        {SECTION_TABS.map((tab) => (
          <button key={tab.id} className={`ct-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="ct-loading">Loading your career data...</div>
      ) : visibleItems.length === 0 ? (
        <div className="ct-empty">
          <div className="ct-empty-icon">{SECTION_TABS.find(t => t.id === activeTab)?.icon}</div>
          <p>No {activeTab === "skills" ? "skills" : activeTab === "goals" ? "learning goals" : "milestones"} yet.</p>
          <button className="ct-btn-primary" onClick={openAdd}>Add Your First Entry</button>
        </div>
      ) : activeTab === "milestones" ? (
        <div className="ct-timeline">
          {visibleItems.map((item, idx) => (
            <div key={item.id} className="ct-timeline-item">
              <div className="ct-timeline-line">
                <div className="ct-timeline-dot">{MILESTONE_ICONS[item.milestoneType] || "⭐"}</div>
                {idx < visibleItems.length - 1 && <div className="ct-timeline-connector" />}
              </div>
              <div className="ct-milestone-card">
                <div className="ct-milestone-header">
                  <div>
                    <div className="ct-milestone-title">{item.title}</div>
                    <div className="ct-milestone-meta">
                      <span className="ct-type-badge">{(item.milestoneType || "achievement").replace(/_/g, " ")}</span>
                      {item.company && <span className="ct-milestone-company">· {item.company}</span>}
                      {item.date && <span className="ct-milestone-date">· {item.date}</span>}
                    </div>
                  </div>
                  <div className="ct-card-actions">
                    <button className={`ct-action-btn ${item.isPublic ? "ct-public-active" : ""}`} onClick={() => togglePublic(item)}>{item.isPublic ? "🌐" : "🔒"}</button>
                    <button className="ct-action-btn" onClick={() => openEdit(item)}>✏️</button>
                    <button className="ct-action-btn ct-del-btn" onClick={() => setDeleteTarget(item)}>🗑️</button>
                  </div>
                </div>
                {item.notes && <p className="ct-milestone-notes">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ct-card-grid">
          {visibleItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const isDone     = item.status === "completed";
            const msTotal    = item.milestones?.length || 0;
            const msDone     = item.milestones?.filter((m) => m.completed).length || 0;
            const msPct      = msTotal ? Math.round((msDone / msTotal) * 100) : 0;
            const isOverdue  = item.deadline && new Date(item.deadline) < new Date() && !isDone;

            return (
              <div key={item.id} className={`ct-item-card ${isDone ? "done" : ""}`}>
                <div className="ct-item-header">
                  <div className="ct-item-title-row">
                    <div className={`ct-item-title ${isDone ? "ct-title-done" : ""}`}>{item.title}</div>
                    <div className="ct-item-tags">
                      {item.xpValue && !isDone && <span className="ct-xp-pill">+{item.xpValue} XP</span>}
                      {isDone && <span className="ct-done-pill">✓ Done</span>}
                    </div>
                  </div>

                  {item.type === "skill" && (<>
                    <div className="ct-item-sub">
                      <span className="ct-cat-badge">{categories.find(c => c.id === item.category)?.icon} {categories.find(c => c.id === item.category)?.label || item.category}</span>
                      <span className="ct-status-badge-text" style={{ color: item.status === "completed" ? "#4ECDC4" : "rgba(255,255,255,0.5)" }}>
                        {(item.status || "").replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="ct-proficiency-bar">
                      {PROFICIENCY_LEVELS.map((lvl) => (
                        <div key={lvl} className="ct-prof-segment"
                          style={{ background: PROFICIENCY_STEPS[lvl] <= PROFICIENCY_STEPS[item.proficiencyLevel] ? PROFICIENCY_COLORS[item.proficiencyLevel] : "rgba(255,255,255,0.08)" }}
                          title={lvl} />
                      ))}
                      <span className="ct-prof-label">{item.proficiencyLevel}</span>
                    </div>
                  </>)}

                  {item.type === "learning_goal" && (<>
                    <div className="ct-item-sub">
                      <span className="ct-cat-badge">{categories.find(c => c.id === item.category)?.icon} {categories.find(c => c.id === item.category)?.label || item.category}</span>
                      <span className="ct-priority-badge" style={{ color: PRIORITY_COLORS[item.priority] || "rgba(255,255,255,0.4)" }}>{item.priority} priority</span>
                      {isOverdue && <span className="ct-overdue-badge">Overdue</span>}
                    </div>
                    {msTotal > 0 && (
                      <div className="ct-ms-progress-row">
                        <div className="ct-ms-progress-bar"><div className="ct-ms-progress-fill" style={{ width: `${msPct}%` }} /></div>
                        <span className="ct-ms-count">{msDone}/{msTotal}</span>
                      </div>
                    )}
                  </>)}
                </div>

                {isExpanded && (
                  <div className="ct-item-expanded">
                    {item.description && <p className="ct-item-desc">{item.description}</p>}
                    {item.deadline && (
                      <div className="ct-detail-row"><span>Deadline</span><span className={isOverdue ? "ct-overdue-text" : ""}>{item.deadline}</span></div>
                    )}
                    {item.resources?.length > 0 && (
                      <div className="ct-resources">
                        <div className="ct-section-title">Resources</div>
                        <div className="ct-resource-chips">
                          {item.resources.map((r, i) => (
                            <a key={i} href={r.url || "#"} target="_blank" rel="noopener noreferrer" className="ct-resource-chip">
                              🔗 {r.label || r.url || r}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.type === "learning_goal" && (
                      <div className="ct-milestones-section">
                        <div className="ct-section-title">Sub-tasks</div>
                        {(item.milestones || []).map((m, i) => (
                          <div key={i} className="ct-ms-item">
                            <input type="checkbox" checked={m.completed} onChange={() => toggleMilestoneCheck(item, i)} className="ct-ms-checkbox" />
                            <span className={m.completed ? "ct-ms-done" : ""}>{m.title}</span>
                            <button className="ct-ms-remove" onClick={() => removeMilestone(item, i)}>✕</button>
                          </div>
                        ))}
                        <div className="ct-ms-add-row">
                          <input type="text" placeholder="Add sub-task..." value={newMsText[item.id] || ""}
                            onChange={(e) => setNewMsText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMilestoneToCard(item))}
                            className="ct-ms-input" />
                          <button className="ct-ms-add-btn" onClick={() => addMilestoneToCard(item)}>+</button>
                        </div>
                      </div>
                    )}
                    {item.notes && <p className="ct-item-notes">{item.notes}</p>}
                  </div>
                )}

                <div className="ct-card-actions">
                  <button className="ct-action-btn" onClick={() => setExpandedId(isExpanded ? null : item.id)}>{isExpanded ? "▲ Less" : "▼ More"}</button>
                  {!isDone && <button className="ct-action-btn ct-complete-btn" onClick={() => completeItem(item)}>✓ Complete</button>}
                  <button className={`ct-action-btn ${item.isPublic ? "ct-public-active" : ""}`} onClick={() => togglePublic(item)}>{item.isPublic ? "🌐" : "🔒"}</button>
                  <button className="ct-action-btn" onClick={() => openEdit(item)}>✏️</button>
                  <button className="ct-action-btn ct-del-btn" onClick={() => setDeleteTarget(item)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CareerTracker;
