import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import confetti from "canvas-confetti";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { 
  calculateLevelInfo, 
  evaluateUnlockedBadges, 
  DIFFICULTY_XP 
} from "../../../lib/gamification";
import "./BucketList.css";

const DEFAULT_CATEGORIES = [
  { id: "places", label: "Places to Visit", icon: "🗺️" },
  { id: "gaming", label: "Gaming Backlog", icon: "🎮" },
  { id: "personal_growth", label: "Personal Growth", icon: "🌱" },
  { id: "credit_cards", label: "Card Collection", icon: "💳" }
];

const INITIAL_ITEM_FORM = {
  title: "",
  description: "",
  category: "places",
  difficulty: "moderate",
  xpValue: 100,
  priority: "medium",
  targetDate: "",
  imageUrl: "",
  notes: "",
  isPublic: false
};

const BucketList = () => {
  const { stats, setStats } = useOutletContext();

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState("places");
  const [statusFilter, setStatusFilter] = useState("all"); // all | todo | completed
  const [visibilityFilter, setVisibilityFilter] = useState("all"); // all | public | private
  const [sortBy, setSortBy] = useState("createdAt"); // priority | xpValue | createdAt | targetDate

  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(INITIAL_ITEM_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // 1. Fetch dynamic categories from config/categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catSnap = await getDoc(doc(db, "config", "categories"));
        if (catSnap.exists() && catSnap.data().bucketList) {
          const list = catSnap.data().bucketList;
          if (list.length > 0) {
            setCategories(list);
            setActiveTab(list[0].id);
          }
        }
      } catch (err) {
        console.warn("Using default category tabs:", err);
      }
    };
    loadCategories();
  }, []);

  // 2. Real-time listener on bucketList items with local fallback
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, "bucketList"), (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setItems(list);
      }, (err) => {
        console.warn("BucketList snapshot fallback:", err.message);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Using local items state:", e);
    }
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      ...INITIAL_ITEM_FORM,
      category: activeTab,
      difficulty: "moderate",
      xpValue: DIFFICULTY_XP.moderate
    });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || "",
      description: item.description || "",
      category: item.category || activeTab,
      difficulty: item.difficulty || "moderate",
      xpValue: item.xpValue || 100,
      priority: item.priority || "medium",
      targetDate: item.targetDate || "",
      imageUrl: item.imageUrl || "",
      notes: item.notes || "",
      isPublic: Boolean(item.isPublic)
    });
    setModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const itemId = editingItem ? editingItem.id : `item_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const itemPayload = {
      ...formData,
      status: editingItem ? editingItem.status : "todo",
      completedAt: editingItem ? (editingItem.completedAt || null) : null,
      createdAt: editingItem ? editingItem.createdAt : nowIso,
      updatedAt: nowIso
    };

    // Update local state immediately
    if (editingItem) {
      setItems(prev => prev.map(it => it.id === itemId ? { id: itemId, ...itemPayload } : it));
      showToast("Goal updated successfully!");
    } else {
      setItems(prev => [{ id: itemId, ...itemPayload }, ...prev]);
      showToast("New goal added to your quest log!");
    }

    // Update category total count in user stats if this is a new item
    if (!editingItem) {
      const cat = itemPayload.category;
      const currentCatStats = stats.categoryBreakdown?.[cat] || { completed: 0, total: 0, label: cat };
      const updatedCatStats = {
        ...stats.categoryBreakdown,
        [cat]: {
          ...currentCatStats,
          total: (currentCatStats.total || 0) + 1
        }
      };
      const updatedStats = { ...stats, categoryBreakdown: updatedCatStats };
      setStats(updatedStats);

      try {
        await setDoc(doc(db, "userStats", "gamification"), updatedStats, { merge: true });
      } catch (err) {
        console.warn("Could not sync category total:", err);
      }
    }

    // Persist to Firestore
    try {
      await setDoc(doc(db, "bucketList", itemId), itemPayload, { merge: true });
      
      // If public, sync to publicShowcase
      if (itemPayload.isPublic) {
        await syncToPublicShowcase(itemId, itemPayload);
      } else if (editingItem && editingItem.isPublic && !itemPayload.isPublic) {
        await deleteDoc(doc(db, "publicShowcase", itemId));
      }
    } catch (err) {
      console.warn("Firestore save item error:", err);
    }

    setModalOpen(false);
  };

  // Helper to sync published items to publicShowcase
  const syncToPublicShowcase = async (itemId, itemData) => {
    const routeSlugMap = {
      places: "travel",
      gaming: "gaming",
      personal_growth: "career",
      credit_cards: "credit-cards"
    };

    const showcasePayload = {
      title: itemData.title,
      description: itemData.description || "",
      sourceType: itemData.category,
      sourceId: `bucketList/${itemId}`,
      routeSlug: routeSlugMap[itemData.category] || itemData.category,
      icon: categories.find(c => c.id === itemData.category)?.icon || "📌",
      imageUrl: itemData.imageUrl || null,
      featured: false,
      completedAt: itemData.completedAt || null,
      createdAt: itemData.createdAt || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "publicShowcase", itemId), showcasePayload, { merge: true });
    } catch (e) {
      console.warn("Could not sync to publicShowcase:", e);
    }
  };

  // Delete Item
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const { id, isCompleted, xpValue, category, isPublic } = deleteTarget;

    // If item was completed, roll back its stats cleanly!
    if (isCompleted) {
      const newTotalXp = Math.max(0, (stats.totalXp || 0) - (xpValue || 0));
      const newTotalCompleted = Math.max(0, (stats.totalCompleted || 0) - 1);
      const curCat = stats.categoryBreakdown?.[category] || { completed: 1, total: 1 };
      const updatedCatStats = {
        ...stats.categoryBreakdown,
        [category]: {
          ...curCat,
          completed: Math.max(0, (curCat.completed || 1) - 1),
          total: Math.max(0, (curCat.total || 1) - 1)
        }
      };

      const updatedStats = {
        ...stats,
        totalXp: newTotalXp,
        totalCompleted: newTotalCompleted,
        categoryBreakdown: updatedCatStats
      };
      setStats(updatedStats);

      try {
        await setDoc(doc(db, "userStats", "gamification"), updatedStats, { merge: true });
      } catch (e) {
        console.warn("Could not sync delete rollback:", e);
      }
    }

    setItems(prev => prev.filter(it => it.id !== id));
    showToast("Goal removed.");

    try {
      await deleteDoc(doc(db, "bucketList", id));
      if (isPublic) {
        await deleteDoc(doc(db, "publicShowcase", id));
      }
    } catch (e) {
      console.warn("Could not delete from Firestore:", e);
    }

    setDeleteTarget(null);
  };

  // Gamified Completion Checkbox Handler
  const handleToggleCompletion = async (item) => {
    const isNowCompleted = item.status !== "completed";
    const nowIso = new Date().toISOString();
    const xp = item.xpValue || 100;
    const cat = item.category || activeTab;

    if (isNowCompleted) {
      // 1. Confetti Burst!
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });

      showToast(`🎉 Goal Accomplished! +${xp} XP Earned`);

      // 2. XP & Level Check
      const prevXp = stats.totalXp || 0;
      const prevLevel = calculateLevelInfo(prevXp).level;
      const newTotalXp = prevXp + xp;
      const newLevelInfo = calculateLevelInfo(newTotalXp);

      // Check for Level Up!
      if (newLevelInfo.level > prevLevel) {
        setLevelUpData(newLevelInfo);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
      }

      // Update category completed counts
      const curCat = stats.categoryBreakdown?.[cat] || { completed: 0, total: 1 };
      const updatedCatStats = {
        ...stats.categoryBreakdown,
        [cat]: {
          ...curCat,
          completed: (curCat.completed || 0) + 1,
          total: Math.max((curCat.total || 0), (curCat.completed || 0) + 1)
        }
      };

      // Activity log entry
      const newActivity = {
        id: `act_${Date.now()}`,
        title: `Accomplished: ${item.title}`,
        xpGained: xp,
        date: nowIso,
        icon: categories.find(c => c.id === cat)?.icon || "🌟"
      };

      const updatedDraft = {
        ...stats,
        totalXp: newTotalXp,
        totalCompleted: (stats.totalCompleted || 0) + 1,
        categoryBreakdown: updatedCatStats,
        recentActivity: [newActivity, ...(stats.recentActivity || [])].slice(0, 8)
      };

      // Evaluate any newly unlocked badges
      const newUnlocked = evaluateUnlockedBadges(updatedDraft, stats.unlockedBadges || []);
      const finalStats = { ...updatedDraft, unlockedBadges: newUnlocked };

      setStats(finalStats);

      try {
        await setDoc(doc(db, "userStats", "gamification"), finalStats, { merge: true });
      } catch (err) {
        console.warn("Could not sync stats to Firestore:", err);
      }
    } else {
      // Un-completing -> Rollback XP
      showToast(`Goal marked in-progress (-${xp} XP rolled back)`);
      const newTotalXp = Math.max(0, (stats.totalXp || 0) - xp);
      const curCat = stats.categoryBreakdown?.[cat] || { completed: 1, total: 1 };
      const updatedCatStats = {
        ...stats.categoryBreakdown,
        [cat]: {
          ...curCat,
          completed: Math.max(0, (curCat.completed || 1) - 1)
        }
      };

      const updatedStats = {
        ...stats,
        totalXp: newTotalXp,
        totalCompleted: Math.max(0, (stats.totalCompleted || 1) - 1),
        categoryBreakdown: updatedCatStats
      };
      setStats(updatedStats);

      try {
        await setDoc(doc(db, "userStats", "gamification"), updatedStats, { merge: true });
      } catch (err) {
        console.warn("Could not sync rollback to Firestore:", err);
      }
    }

    // Update item status
    const updatedItem = {
      ...item,
      status: isNowCompleted ? "completed" : "todo",
      completedAt: isNowCompleted ? nowIso : null,
      updatedAt: nowIso
    };

    setItems(prev => prev.map(it => it.id === item.id ? updatedItem : it));

    try {
      await setDoc(doc(db, "bucketList", item.id), updatedItem, { merge: true });
      if (updatedItem.isPublic) {
        await syncToPublicShowcase(item.id, updatedItem);
      }
    } catch (err) {
      console.warn("Could not update item completion status:", err);
    }
  };

  // Toggle Public Visibility Directly from Card
  const handleTogglePublic = async (item) => {
    const newPublicState = !item.isPublic;
    const updated = { ...item, isPublic: newPublicState, updatedAt: new Date().toISOString() };

    setItems(prev => prev.map(it => it.id === item.id ? updated : it));
    showToast(newPublicState ? "Published to public showcase!" : "Made private (hidden from public)");

    try {
      await setDoc(doc(db, "bucketList", item.id), updated, { merge: true });
      if (newPublicState) {
        await syncToPublicShowcase(item.id, updated);
      } else {
        await deleteDoc(doc(db, "publicShowcase", item.id));
      }
    } catch (e) {
      console.warn("Could not toggle public state:", e);
    }
  };

  const filteredItems = items
    .filter(it => it.category === activeTab)
    .filter(it => {
      if (visibilityFilter === "public" && !it.isPublic) return false;
      if (visibilityFilter === "private" && it.isPublic) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "todo") return it.status !== "completed";
      if (statusFilter === "completed") return it.status === "completed";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const pMap = { epic: 4, high: 3, medium: 2, low: 1 };
        return (pMap[b.priority] || 1) - (pMap[a.priority] || 1);
      }
      if (sortBy === "xpValue") {
        return (b.xpValue || 0) - (a.xpValue || 0);
      }
      if (sortBy === "targetDate") {
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return new Date(a.targetDate) - new Date(b.targetDate);
      }
      // default createdAt
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  return (
    <div className="bucket-list-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="xp-notification-float">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="bucket-header-row">
        <div className="bucket-header-left">
          <h2><span>🗺️</span> Bucket List & Life Quests</h2>
          <p>Organize, track, and accomplish your life ambitions across categories.</p>
        </div>
        <button className="add-goal-btn" onClick={handleOpenCreate}>
          <span>+</span> Add New Goal
        </button>
      </div>

      {/* Dynamic Category Tabs */}
      <div className="category-tabs-bar">
        {categories.map((cat) => {
          const count = items.filter(it => it.category === cat.id).length;
          return (
            <button
              key={cat.id}
              className={`category-tab ${activeTab === cat.id ? "active" : ""}`}
              onClick={() => setActiveTab(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="tab-counter">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Status Filter & Sort */}
      <div className="controls-bar">
        <div className="status-filter-group">
          <button
            className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Goals
          </button>
          <button
            className={`filter-pill ${statusFilter === "todo" ? "active" : ""}`}
            onClick={() => setStatusFilter("todo")}
          >
            In Progress
          </button>
          <button
            className={`filter-pill ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            Accomplished
          </button>

          <span style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.15)", margin: "0 4px", alignSelf: "center" }} />

          <button
            className={`filter-pill ${visibilityFilter === "all" ? "active" : ""}`}
            onClick={() => setVisibilityFilter("all")}
          >
            All Visibility
          </button>
          <button
            className={`filter-pill ${visibilityFilter === "public" ? "active" : ""}`}
            onClick={() => setVisibilityFilter("public")}
          >
            🌐 Public ({items.filter(it => it.category === activeTab && it.isPublic).length})
          </button>
          <button
            className={`filter-pill ${visibilityFilter === "private" ? "active" : ""}`}
            onClick={() => setVisibilityFilter("private")}
          >
            🔒 Private ({items.filter(it => it.category === activeTab && !it.isPublic).length})
          </button>
        </div>

        <div className="sort-select-wrapper">
          <label htmlFor="sort-by">Sort By:</label>
          <select
            id="sort-by"
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Date Created</option>
            <option value="xpValue">XP Value (High to Low)</option>
            <option value="priority">Priority Tier</option>
            <option value="targetDate">Target Date</option>
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "50px 20px",
          background: "rgb(50, 50, 50)",
          borderRadius: "0.75rem",
          border: "1px dashed rgba(255, 255, 255, 0.15)"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🎯</div>
          <h3 style={{ fontSize: "16px", margin: "0 0 6px 0", color: "#fff", fontWeight: 500 }}>
            No goals found in this category
          </h3>
          <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "13px", margin: "0 0 16px 0" }}>
            {statusFilter === "all" 
              ? "Start by adding your first goal to this category!"
              : `No ${statusFilter} items found. Adjust the filter or add a new goal.`}
          </p>
          <button className="add-goal-btn" onClick={handleOpenCreate}>
            + Add First Goal
          </button>
        </div>
      ) : (
        <div className="bucket-items-grid">
          {filteredItems.map((item) => {
            const isCompleted = item.status === "completed";
            return (
              <div 
                key={item.id} 
                className={`bucket-card ${isCompleted ? "is-completed" : ""}`}
              >
                {/* Image Preview Banner if URL Provided */}
                {item.imageUrl && (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="card-image-preview" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}

                <div className="card-body">
                  <div className="card-top-row">
                    <div className="checkbox-title-wrap">
                      <input
                        type="checkbox"
                        className="goal-checkbox"
                        checked={isCompleted}
                        onChange={() => handleToggleCompletion(item)}
                        title={isCompleted ? "Mark in-progress" : "Mark completed and earn XP"}
                      />
                      <h4 className="card-title">{item.title}</h4>
                    </div>
                  </div>

                  {item.description && (
                    <p className="card-description">{item.description}</p>
                  )}

                  <div className="card-tags-row">
                    <span className="diff-badge">{item.difficulty || "moderate"}</span>
                    <span className="xp-tag">+{item.xpValue || 100} XP</span>
                    {item.priority && (
                      <span className="priority-tag">{item.priority}</span>
                    )}
                    {item.isPublic && (
                      <span className="public-tag">Public 🌐</span>
                    )}
                  </div>

                  {item.targetDate && (
                    <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "8px" }}>
                      Target: {new Date(item.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}

                  <div className="card-bottom-bar">
                    <button
                      className="card-action-btn"
                      onClick={() => handleTogglePublic(item)}
                      title={item.isPublic ? "Unpublish from public site" : "Publish to public site"}
                    >
                      {item.isPublic ? "🌐 Public" : "🔒 Private"}
                    </button>

                    <div className="card-actions-right">
                      <button
                        className="card-action-btn"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Goal"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="card-action-btn delete"
                        onClick={() => setDeleteTarget({
                          id: item.id,
                          title: item.title,
                          isCompleted,
                          xpValue: item.xpValue,
                          category: item.category,
                          isPublic: item.isPublic
                        })}
                        title="Delete Goal"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CRUD Modal */}
      {modalOpen && (
        <div className="gamification-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="gamification-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>
                {editingItem ? "Edit Goal" : "Add New Goal"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="modal-form-grid">
                {/* Title */}
                <div className="form-group-full">
                  <label className="form-label" htmlFor="goal-title">Title *</label>
                  <input
                    id="goal-title"
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Visit Kyoto in Cherry Blossom Season..."
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group-full">
                  <label className="form-label" htmlFor="goal-desc">Description</label>
                  <textarea
                    id="goal-desc"
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details, itinerary, or notes..."
                  />
                </div>

                {/* Category */}
                <div className="form-group-half">
                  <label className="form-label" htmlFor="goal-cat">Category</label>
                  <select
                    id="goal-cat"
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Tier */}
                <div className="form-group-half">
                  <label className="form-label" htmlFor="goal-diff">Difficulty Tier</label>
                  <select
                    id="goal-diff"
                    className="form-select"
                    value={formData.difficulty}
                    onChange={(e) => {
                      const diff = e.target.value;
                      setFormData({
                        ...formData,
                        difficulty: diff,
                        xpValue: DIFFICULTY_XP[diff] || 100
                      });
                    }}
                  >
                    <option value="casual">Casual (50 XP)</option>
                    <option value="moderate">Moderate (100 XP)</option>
                    <option value="challenging">Challenging (250 XP)</option>
                    <option value="epic">Epic (500 XP)</option>
                  </select>
                </div>

                {/* XP Value (Auto with custom override) */}
                <div className="form-group-half">
                  <label className="form-label" htmlFor="goal-xp">XP Reward Value</label>
                  <input
                    id="goal-xp"
                    type="number"
                    min="1"
                    className="form-input"
                    value={formData.xpValue}
                    onChange={(e) => setFormData({ ...formData, xpValue: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* Priority */}
                <div className="form-group-half">
                  <label className="form-label" htmlFor="goal-prio">Priority</label>
                  <select
                    id="goal-prio"
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>

                {/* Direct Image URL with instant preview */}
                <div className="form-group-full">
                  <label className="form-label" htmlFor="goal-img">Direct Image URL (Unsplash / Imgur / Web)</label>
                  <input
                    id="goal-img"
                    type="url"
                    className="form-input"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  {formData.imageUrl && (
                    <div className="image-preview-box">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="image-preview-img"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>

                {/* Target Date */}
                <div className="form-group-half">
                  <label className="form-label" htmlFor="goal-date">Target Date</label>
                  <input
                    id="goal-date"
                    type="date"
                    className="form-input"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>

                {/* Public Toggle */}
                <div className="form-group-half" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "24px" }}>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                  <span style={{ fontSize: "13px", color: "#fff" }}>Publish to Public Page</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: "2rem",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "white",
                    color: "#000",
                    border: "none",
                    padding: "8px 22px",
                    borderRadius: "2rem",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  {editingItem ? "Save Changes" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="gamification-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="gamification-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#ff6b6b" }}>
              Delete Goal?
            </h3>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px", lineHeight: "1.4", margin: "0 0 20px 0" }}>
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
              {deleteTarget.isCompleted && (
                <span style={{ display: "block", marginTop: "6px", color: "yellow" }}>
                  ⚠️ Note: Since this goal was accomplished, its awarded {deleteTarget.xpValue} XP will be safely deducted from your total.
                </span>
              )}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  background: "none",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "2rem",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  background: "#ff6b6b",
                  color: "#fff",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "2rem",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Celebration Modal */}
      {levelUpData && (
        <div className="gamification-modal-backdrop" onClick={() => setLevelUpData(null)}>
          <div className="gamification-modal-card level-up-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="level-up-badge-icon">{levelUpData.badge}</div>
            <h2 style={{ fontSize: "24px", margin: "0 0 6px 0", color: "yellow" }}>
              LEVEL UP!
            </h2>
            <h3 style={{ fontSize: "18px", margin: "0 0 12px 0", color: "#fff" }}>
              Level {levelUpData.level} • {levelUpData.title}
            </h3>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px", margin: "0 0 20px 0" }}>
              Outstanding work! Your perseverance has unlocked a new rank title.
            </p>
            <button
              onClick={() => setLevelUpData(null)}
              style={{
                background: "white",
                color: "#000",
                border: "none",
                padding: "10px 24px",
                borderRadius: "2rem",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Continue Adventure ⚔️
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BucketList;
