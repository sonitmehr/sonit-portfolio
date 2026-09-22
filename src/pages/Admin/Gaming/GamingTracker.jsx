import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  calculateLevelInfo,
  evaluateUnlockedBadges,
  DIFFICULTY_XP,
} from "../../../lib/gamification";
import "./GamingTracker.css";

// ─── Constants & Metadata ───────────────────────────────────────────────────

const PLATFORMS = [
  { id: "steam",  label: "Steam",           icon: "💻", badge: "Steam",       color: "#66c0f4", bg: "#171a21" },
  { id: "psn",    label: "PlayStation",     icon: "🎮", badge: "PlayStation", color: "#0070d1", bg: "#003791" },
  { id: "switch", label: "Nintendo Switch", icon: "🕹️", badge: "Switch",      color: "#e60012", bg: "#4a0006" },
  { id: "xbox",   label: "Xbox",            icon: "🟢", badge: "Xbox",        color: "#107c41", bg: "#0e3a1f" },
  { id: "pc",     label: "PC / Desktop",    icon: "🖥️", badge: "PC",          color: "#4ECDC4", bg: "#133b3a" },
  { id: "other",  label: "Other / Retro",   icon: "👾", badge: "Other",       color: "#a29bfe", bg: "#2d244c" },
];

const PLATFORM_MAP = PLATFORMS.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {});

const STATUS_OPTIONS = [
  { id: "all",         label: "All Games", icon: "📚" },
  { id: "in_progress", label: "Playing",   icon: "🕹️", color: "#4ECDC4" },
  { id: "completed",   label: "Completed", icon: "🏆", color: "#FFD93D" },
  { id: "not_started", label: "Backlog",   icon: "⏳", color: "rgba(255,255,255,0.5)" },
  { id: "abandoned",   label: "Shelved",   icon: "📦", color: "#FF6B6B" },
];

const STATUS_LABELS = {
  not_started: { label: "Backlog",   color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.08)", icon: "⏳" },
  in_progress: { label: "Playing",   color: "#4ECDC4",               bg: "rgba(78,205,196,0.15)",   icon: "🕹️" },
  completed:   { label: "Completed", color: "#FFD93D",               bg: "rgba(255,217,61,0.15)",   icon: "🏆" },
  abandoned:   { label: "Shelved",   color: "#FF6B6B",               bg: "rgba(255,107,107,0.15)",  icon: "📦" },
};

const DIFFICULTY_OPTIONS = [
  { value: "casual",      label: "Casual",      xp: 50 },
  { value: "moderate",    label: "Moderate",    xp: 100 },
  { value: "challenging", label: "Challenging", xp: 250 },
  { value: "epic",        label: "Epic",        xp: 500 },
];

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low Priority",  color: "rgba(255,255,255,0.4)" },
  { value: "medium", label: "Med Priority",  color: "#FFD93D" },
  { value: "high",   label: "High Priority", color: "#FF6B6B" },
];

const SORT_OPTIONS = [
  { value: "recent",          label: "Date Added (Newest First)" },
  { value: "title_asc",       label: "Title (A to Z)" },
  { value: "playtime_desc",   label: "Playtime (Highest First)" },
  { value: "completion_desc", label: "Achievements % (Highest First)" },
  { value: "xp_desc",         label: "XP Value (Highest First)" },
  { value: "rating_desc",     label: "Rating (Highest First)" },
  { value: "updated_desc",    label: "Recently Updated" },
];

const BLANK_GAME = {
  title: "",
  platform: "steam",
  genre: "",
  coverArtUrl: "",
  playtimeHours: "",
  status: "in_progress",
  priority: "medium",
  difficulty: "moderate",
  xpValue: 100,
  achievementsTotal: "",
  achievementsUnlocked: "",
  trophies: {
    platinum: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
  },
  rating: "",
  personalNotes: "",
  isPublic: false,
};

const SAMPLE_GAMES = [
  {
    title: "Elden Ring",
    platform: "steam",
    genre: "Action RPG • Souls-like",
    coverArtUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
    playtimeHours: 118,
    status: "completed",
    priority: "high",
    difficulty: "epic",
    xpValue: 500,
    achievementsTotal: 42,
    achievementsUnlocked: 42,
    trophies: { platinum: 1, gold: 3, silver: 14, bronze: 24 },
    rating: 10,
    personalNotes: "Masterpiece. Conquered Malenia solo after 35 attempts.",
    isPublic: true,
  },
  {
    title: "God of War Ragnarök",
    platform: "psn",
    genre: "Action Adventure",
    coverArtUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
    playtimeHours: 62.5,
    status: "in_progress",
    priority: "high",
    difficulty: "challenging",
    xpValue: 250,
    achievementsTotal: 36,
    achievementsUnlocked: 28,
    trophies: { platinum: 0, gold: 4, silver: 12, bronze: 18 },
    rating: 9.5,
    personalNotes: "Incredible storytelling and combat. Working on the Muspelheim trials.",
    isPublic: true,
  },
  {
    title: "Hollow Knight",
    platform: "steam",
    genre: "Metroidvania • 2D Action",
    coverArtUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
    playtimeHours: 45,
    status: "completed",
    priority: "medium",
    difficulty: "challenging",
    xpValue: 250,
    achievementsTotal: 63,
    achievementsUnlocked: 58,
    trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
    rating: 9.8,
    personalNotes: "Pantheon of Hallownest is brutal, but breathtaking atmosphere.",
    isPublic: true,
  },
  {
    title: "The Legend of Zelda: Tears of the Kingdom",
    platform: "switch",
    genre: "Action Adventure • Open World",
    coverArtUrl: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80",
    playtimeHours: 85,
    status: "in_progress",
    priority: "high",
    difficulty: "epic",
    xpValue: 500,
    achievementsTotal: 0,
    achievementsUnlocked: 0,
    trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
    rating: 9.7,
    personalNotes: "Ultrahand physics engine is pure joy. Exploring the depths.",
    isPublic: false,
  }
];

const generateId = () => `game_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const triggerConfetti = () => {
  confetti({
    particleCount: 110,
    spread: 75,
    origin: { y: 0.6 },
    colors: ["#FFD93D", "#FF6B6B", "#4ECDC4", "#ffffff"],
  });
};

// ─── Main Component ──────────────────────────────────────────────────────────

const GamingTracker = () => {
  const { stats, setStats } = useOutletContext();

  const [games, setGames]                         = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [modalOpen, setModalOpen]                 = useState(false);
  const [editingGame, setEditingGame]             = useState(null);
  const [formData, setFormData]                   = useState(BLANK_GAME);
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter]       = useState("all");
  const [visibilityFilter, setVisibilityFilter]   = useState("all"); // 'all' | 'public' | 'private'
  const [searchQuery, setSearchQuery]             = useState("");
  const [sortBy, setSortBy]                       = useState("recent");
  const [deleteTarget, setDeleteTarget]           = useState(null);
  const [saving, setSaving]                       = useState(false);
  const [xpToast, setXpToast]                     = useState(null);
  const [levelUpModal, setLevelUpModal]           = useState(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [seeding, setSeeding]                     = useState(false);
  const [steamModalOpen, setSteamModalOpen]       = useState(false);
  const [steamLoading, setSteamLoading]           = useState(false);
  const [steamError, setSteamError]               = useState(null);
  const [steamGames, setSteamGames]               = useState([]);
  const [selectedSteamIds, setSelectedSteamIds]   = useState(new Set());
  const [onlyPlayed, setOnlyPlayed]               = useState(true);
  const [importingSteam, setImportingSteam]       = useState(false);
  const [selectedGameIds, setSelectedGameIds]     = useState(new Set());
  const [bulkApplying, setBulkApplying]           = useState(false);

  // Real-time Firestore sync
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "gamingProgress"),
      (snap) => {
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGames(fetched);
        setLoading(false);
      },
      (err) => {
        console.warn("Gaming progress listener fallback:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // ─── Gamification Handlers ─────────────────────────────────────────────────

  const awardGamingXp = async (game) => {
    try {
      const xpGained = Number(game.xpValue) || DIFFICULTY_XP[game.difficulty] || 100;
      const oldStats = stats || {};
      const newTotalXp = (oldStats.totalXp || 0) + xpGained;
      const oldLevel = calculateLevelInfo(oldStats.totalXp || 0).level;
      const newLevel = calculateLevelInfo(newTotalXp).level;
      const leveled = newLevel > oldLevel;

      const gamingBreakdown = oldStats.categoryBreakdown?.gaming || { completed: 0, total: 0 };
      const newGamingBreakdown = {
        ...gamingBreakdown,
        completed: (gamingBreakdown.completed || 0) + 1,
        total: Math.max(gamingBreakdown.total || 0, (gamingBreakdown.completed || 0) + 1),
        label: "Gaming Backlog",
        icon: "🎮",
        color: "#FF6B6B",
      };

      const activityEntry = {
        id: `act_${Date.now()}`,
        itemId: game.id || game.title,
        title: `Conquered: ${game.title}`,
        xpGained,
        date: new Date().toISOString(),
        category: "gaming",
        icon: "🎮",
      };

      const updatedStats = {
        ...oldStats,
        totalXp: newTotalXp,
        currentLevel: newLevel,
        levelTitle: calculateLevelInfo(newTotalXp).title,
        totalCompleted: (oldStats.totalCompleted || 0) + 1,
        categoryBreakdown: {
          ...(oldStats.categoryBreakdown || {}),
          gaming: newGamingBreakdown,
        },
        recentActivity: [activityEntry, ...(oldStats.recentActivity || [])].slice(0, 20),
        updatedAt: serverTimestamp(),
      };

      updatedStats.unlockedBadges = evaluateUnlockedBadges(updatedStats, oldStats.unlockedBadges || []);

      await setDoc(doc(db, "userStats", "gamification"), updatedStats, { merge: true });
      setStats(updatedStats);

      setXpToast({ xp: xpGained, title: game.title });
      setTimeout(() => setXpToast(null), 3500);

      triggerConfetti();

      if (leveled) {
        setLevelUpModal({
          level: newLevel,
          title: calculateLevelInfo(newTotalXp).title,
        });
      }
    } catch (err) {
      console.warn("XP award error:", err);
    }
  };

  const rollbackGamingXp = async (game) => {
    try {
      const xpLost = Number(game.xpValue) || DIFFICULTY_XP[game.difficulty] || 100;
      const oldStats = stats || {};
      const newTotalXp = Math.max(0, (oldStats.totalXp || 0) - xpLost);
      const newLevelInfo = calculateLevelInfo(newTotalXp);

      const gamingBreakdown = oldStats.categoryBreakdown?.gaming || { completed: 1, total: 1 };
      const newGamingBreakdown = {
        ...gamingBreakdown,
        completed: Math.max(0, (gamingBreakdown.completed || 0) - 1),
        label: "Gaming Backlog",
        icon: "🎮",
        color: "#FF6B6B",
      };

      const updatedStats = {
        ...oldStats,
        totalXp: newTotalXp,
        currentLevel: newLevelInfo.level,
        levelTitle: newLevelInfo.title,
        totalCompleted: Math.max(0, (oldStats.totalCompleted || 0) - 1),
        categoryBreakdown: {
          ...(oldStats.categoryBreakdown || {}),
          gaming: newGamingBreakdown,
        },
        recentActivity: (oldStats.recentActivity || []).filter(
          (a) => a.title !== `Conquered: ${game.title}`
        ),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "userStats", "gamification"), updatedStats, { merge: true });
      setStats(updatedStats);
    } catch (err) {
      console.warn("XP rollback error:", err);
    }
  };

  // ─── Quick Actions ─────────────────────────────────────────────────────────

  const handleToggleComplete = async (game, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
      if (e.currentTarget) e.currentTarget.blur();
    }
    const isCompleted = game.status === "completed";
    const newStatus = isCompleted ? "in_progress" : "completed";

    try {
      const gameRef = doc(db, "gamingProgress", game.id);
      const updates = {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date().toISOString() : null,
      };

      // Optimistically update in place so list never reorders
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, ...updates } : g))
      );

      await setDoc(gameRef, updates, { merge: true });

      if (newStatus === "completed") {
        await awardGamingXp({ ...game, ...updates });
      } else {
        await rollbackGamingXp(game);
      }
    } catch (err) {
      console.error("Toggle complete error:", err);
    }
  };

  const handleTogglePublic = async (game, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
      if (e.currentTarget) e.currentTarget.blur();
    }
    try {
      const nextPublic = !game.isPublic;
      // Optimistically update in place without reordering
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, isPublic: nextPublic } : g))
      );
      // Persist only isPublic without touching updatedAt so sort position remains fixed
      await setDoc(
        doc(db, "gamingProgress", game.id),
        { isPublic: nextPublic },
        { merge: true }
      );
    } catch (err) {
      console.error("Public toggle error:", err);
    }
  };

  // ─── Bulk Selection Handlers ───────────────────────────────────────────────

  const toggleSelectGame = (gameId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
      if (e.currentTarget) e.currentTarget.blur();
    }
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (filteredGames.length === 0) return;
    const allFilteredSelected = filteredGames.every((g) => selectedGameIds.has(g.id));
    if (allFilteredSelected) {
      // Deselect filtered games
      setSelectedGameIds((prev) => {
        const next = new Set(prev);
        filteredGames.forEach((g) => next.delete(g.id));
        return next;
      });
    } else {
      // Select all filtered games
      setSelectedGameIds((prev) => {
        const next = new Set(prev);
        filteredGames.forEach((g) => next.add(g.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedGameIds(new Set());
  };

  const handleBulkApply = async (field, value) => {
    if (selectedGameIds.size === 0 || bulkApplying) return;

    setBulkApplying(true);
    try {
      const targetGames = games.filter((g) => selectedGameIds.has(g.id));
      if (targetGames.length === 0) return;

      let updateFields = {};
      if (field === "visibility") {
        updateFields = { isPublic: Boolean(value) };
      } else if (field === "status") {
        updateFields = {
          status: value,
          completedAt: value === "completed" ? new Date().toISOString() : null,
        };
      }

      // 1. Optimistic update (without altering position/order)
      setGames((prev) =>
        prev.map((g) => (selectedGameIds.has(g.id) ? { ...g, ...updateFields } : g))
      );

      // 2. Commit batch to Firestore in chunks of up to 400
      const ids = Array.from(selectedGameIds);
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          const ref = doc(db, "gamingProgress", id);
          batch.set(ref, updateFields, { merge: true });
        });
        await batch.commit();
      }

      // 3. XP & Notifications
      if (field === "status" && value === "completed") {
        let newlyCompletedXp = 0;
        for (const g of targetGames) {
          if (g.status !== "completed") {
            newlyCompletedXp += Number(g.xpValue) || DIFFICULTY_XP[g.difficulty] || 100;
            await awardGamingXp({ ...g, ...updateFields });
          }
        }
        triggerConfetti();
        setXpToast({
          xp: newlyCompletedXp || 100,
          title: `${targetGames.length} Game${targetGames.length > 1 ? "s" : ""} Marked Completed`,
        });
      } else if (field === "visibility") {
        setXpToast({
          xp: 0,
          title: `${targetGames.length} Game${targetGames.length > 1 ? "s" : ""} Made ${value ? "Public 🌐" : "Private 🔒"}`,
        });
      } else if (field === "status") {
        setXpToast({
          xp: 0,
          title: `${targetGames.length} Game${targetGames.length > 1 ? "s" : ""} set to ${STATUS_LABELS[value]?.label || value}`,
        });
      }

      setTimeout(() => setXpToast(null), 3500);
      setSelectedGameIds(new Set());
    } catch (err) {
      console.error("Bulk apply error:", err);
    } finally {
      setBulkApplying(false);
    }
  };

  // ─── Modal Form Handlers ───────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingGame(null);
    setFormData(BLANK_GAME);
    setImagePreviewError(false);
    setModalOpen(true);
  };

  const openEditModal = (game, e) => {
    if (e) e.stopPropagation();
    setEditingGame(game);
    setFormData({
      title: game.title || "",
      platform: game.platform || "steam",
      genre: game.genre || "",
      coverArtUrl: game.coverArtUrl || "",
      playtimeHours: game.playtimeHours ?? "",
      status: game.status || "in_progress",
      priority: game.priority || "medium",
      difficulty: game.difficulty || "moderate",
      xpValue: game.xpValue ?? 100,
      achievementsTotal: game.achievementsTotal ?? "",
      achievementsUnlocked: game.achievementsUnlocked ?? "",
      trophies: {
        platinum: game.trophies?.platinum ?? 0,
        gold: game.trophies?.gold ?? 0,
        silver: game.trophies?.silver ?? 0,
        bronze: game.trophies?.bronze ?? 0,
      },
      rating: game.rating ?? "",
      personalNotes:
        game.personalNotes && !game.personalNotes.startsWith("Synced from Steam")
          ? game.personalNotes
          : "",
      isPublic: Boolean(game.isPublic),
    });
    setImagePreviewError(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingGame(null);
    setFormData(BLANK_GAME);
  };

  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "difficulty") {
        updated.xpValue = DIFFICULTY_XP[value] || 100;
      }
      return updated;
    });
  };

  const handleTrophyField = (trophyType, value) => {
    setFormData((prev) => ({
      ...prev,
      trophies: {
        ...prev.trophies,
        [trophyType]: Math.max(0, parseInt(value, 10) || 0),
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const id = editingGame ? editingGame.id : generateId();
      const payload = {
        title: formData.title.trim(),
        platform: formData.platform,
        genre: formData.genre.trim(),
        coverArtUrl: formData.coverArtUrl.trim(),
        playtimeHours: formData.playtimeHours !== "" ? Number(formData.playtimeHours) : 0,
        playtimeMinutes: formData.playtimeHours !== "" ? Math.round(Number(formData.playtimeHours) * 60) : 0,
        status: formData.status,
        priority: formData.priority,
        difficulty: formData.difficulty,
        xpValue: Number(formData.xpValue) || DIFFICULTY_XP[formData.difficulty] || 100,
        achievementsTotal: formData.achievementsTotal !== "" ? Number(formData.achievementsTotal) : 0,
        achievementsUnlocked: formData.achievementsUnlocked !== "" ? Number(formData.achievementsUnlocked) : 0,
        trophies: {
          platinum: Number(formData.trophies?.platinum) || 0,
          gold: Number(formData.trophies?.gold) || 0,
          silver: Number(formData.trophies?.silver) || 0,
          bronze: Number(formData.trophies?.bronze) || 0,
        },
        rating: formData.rating !== "" ? Number(formData.rating) : null,
        personalNotes: formData.personalNotes.trim(),
        isPublic: Boolean(formData.isPublic),
        updatedAt: serverTimestamp(),
      };

      if (!editingGame) {
        payload.createdAt = serverTimestamp();
        payload.completedAt = formData.status === "completed" ? new Date().toISOString() : null;
      } else {
        if (formData.status === "completed" && editingGame.status !== "completed") {
          payload.completedAt = new Date().toISOString();
        } else if (formData.status !== "completed") {
          payload.completedAt = null;
        }
      }

      await setDoc(doc(db, "gamingProgress", id), payload, { merge: true });

      // Handle XP award / rollback if status changed
      if (!editingGame && formData.status === "completed") {
        await awardGamingXp({ id, ...payload });
      } else if (editingGame) {
        if (formData.status === "completed" && editingGame.status !== "completed") {
          await awardGamingXp({ id, ...payload });
        } else if (formData.status !== "completed" && editingGame.status === "completed") {
          await rollbackGamingXp(editingGame);
        }
      }

      closeModal();
    } catch (err) {
      console.error("Error saving game:", err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Handler ────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "gamingProgress", deleteTarget.id));
      if (deleteTarget.status === "completed") {
        await rollbackGamingXp(deleteTarget);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // ─── Seed Sample Games ─────────────────────────────────────────────────────

  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      for (const sample of SAMPLE_GAMES) {
        const id = generateId();
        const payload = {
          ...sample,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          completedAt: sample.status === "completed" ? new Date().toISOString() : null,
        };
        await setDoc(doc(db, "gamingProgress", id), payload);
        if (sample.status === "completed") {
          await awardGamingXp({ id, ...payload });
        }
      }
      triggerConfetti();
    } catch (err) {
      console.error("Error seeding sample games:", err);
    } finally {
      setSeeding(false);
    }
  };

  // ─── Steam Library Sync via Local Vite Proxy ─────────────────────────────

  const handleOpenSteamSync = async () => {
    setSteamModalOpen(true);
    setSteamLoading(true);
    setSteamError(null);
    try {
      const res = await fetch("/api/steam/games");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const fetched = data.games || [];
      setSteamGames(fetched);

      // By default select all games with playtime > 0
      const playedIds = new Set(
        fetched.filter((g) => g.playtimeHours > 0).map((g) => g.steamAppId)
      );
      setSelectedSteamIds(playedIds);
    } catch (err) {
      console.error("Steam sync error:", err);
      setSteamError(err.message || "Failed to connect to local Steam proxy.");
    } finally {
      setSteamLoading(false);
    }
  };

  const toggleSelectSteam = (appId) => {
    setSelectedSteamIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const handleToggleSelectAll = (selectAll) => {
    const currentList = onlyPlayed ? steamGames.filter((g) => g.playtimeHours > 0) : steamGames;
    if (selectAll) {
      setSelectedSteamIds(new Set(currentList.map((g) => g.steamAppId)));
    } else {
      setSelectedSteamIds(new Set());
    }
  };

  const handleImportSteamGames = async () => {
    const toImport = steamGames.filter((g) => selectedSteamIds.has(g.steamAppId));
    if (toImport.length === 0) return;

    setImportingSteam(true);
    try {
      for (const game of toImport) {
        const docId = `steam_${game.steamAppId}`;
        const payload = {
          ...game,
          id: docId,
          updatedAt: serverTimestamp(),
        };

        const existing = games.find(
          (g) => g.id === docId || (g.steamAppId && g.steamAppId === game.steamAppId)
        );
        if (existing) {
          payload.status = (game.achievementsTotal > 0 && game.achievementsUnlocked === game.achievementsTotal)
            ? "completed"
            : (existing.status || payload.status);
          payload.priority = existing.priority || payload.priority;
          payload.isPublic = Boolean(existing.isPublic);
          payload.personalNotes = existing.personalNotes || payload.personalNotes;
          payload.rating = existing.rating ?? payload.rating;
        } else {
          payload.createdAt = serverTimestamp();
        }

        await setDoc(doc(db, "gamingProgress", docId), payload, { merge: true });
      }

      triggerConfetti();
      setXpToast({ xp: toImport.length * 50, title: `${toImport.length} Steam Games Synced` });
      setTimeout(() => setXpToast(null), 3500);
      setSteamModalOpen(false);
    } catch (err) {
      console.error("Error importing Steam games:", err);
      setSteamError(err.message || "Failed to save Steam games to database.");
    } finally {
      setImportingSteam(false);
    }
  };

  const displayedSteamGames = onlyPlayed
    ? steamGames.filter((g) => g.playtimeHours > 0)
    : steamGames;

  // ─── Derived Statistics ────────────────────────────────────────────────────

  const statsSummary = useMemo(() => {
    const total = games.length;
    const inProgress = games.filter((g) => g.status === "in_progress").length;
    const completed = games.filter((g) => g.status === "completed").length;
    const backlog = games.filter((g) => g.status === "not_started").length;
    const totalHours = games.reduce((sum, g) => sum + (Number(g.playtimeHours) || 0), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalGamingXp = games
      .filter((g) => g.status === "completed")
      .reduce((sum, g) => sum + (Number(g.xpValue) || DIFFICULTY_XP[g.difficulty] || 100), 0);

    return { total, inProgress, completed, backlog, totalHours, completionRate, totalGamingXp };
  }, [games]);

  // ─── Filtered & Sorted Games ───────────────────────────────────────────────

  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        if (activeStatusFilter !== "all" && g.status !== activeStatusFilter) return false;
        if (platformFilter !== "all" && g.platform !== platformFilter) return false;
        if (visibilityFilter === "public" && !g.isPublic) return false;
        if (visibilityFilter === "private" && g.isPublic) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (g.title || "").toLowerCase().includes(q);
          const matchGenre = (g.genre || "").toLowerCase().includes(q);
          const matchNotes = (g.personalNotes || "").toLowerCase().includes(q);
          if (!matchTitle && !matchGenre && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title_asc") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (sortBy === "playtime_desc") {
          return (Number(b.playtimeHours) || 0) - (Number(a.playtimeHours) || 0);
        }
        if (sortBy === "completion_desc") {
          const aRate = a.achievementsTotal > 0 ? a.achievementsUnlocked / a.achievementsTotal : 0;
          const bRate = b.achievementsTotal > 0 ? b.achievementsUnlocked / b.achievementsTotal : 0;
          return bRate - aRate;
        }
        if (sortBy === "xp_desc") {
          return (Number(b.xpValue) || 0) - (Number(a.xpValue) || 0);
        }
        if (sortBy === "updated_desc") {
          const aTime = a.updatedAt?.seconds || (typeof a.updatedAt === "string" ? new Date(a.updatedAt).getTime() / 1000 : 0) || 0;
          const bTime = b.updatedAt?.seconds || (typeof b.updatedAt === "string" ? new Date(b.updatedAt).getTime() / 1000 : 0) || 0;
          return bTime - aTime;
        }
        // "recent" default: Sort by Date Added (createdAt). Never moves on approval/edit
        const aCreated = a.createdAt?.seconds || (typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() / 1000 : 0) || 0;
        const bCreated = b.createdAt?.seconds || (typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() / 1000 : 0) || 0;
        if (bCreated !== aCreated) {
          return bCreated - aCreated;
        }
        // Stable deterministic tie-breaker so the list stays completely in place
        return (a.title || "").localeCompare(b.title || "");
      });
  }, [games, activeStatusFilter, platformFilter, visibilityFilter, searchQuery, sortBy]);

  const isAllFilteredSelected =
    filteredGames.length > 0 && filteredGames.every((g) => selectedGameIds.has(g.id));

  return (
    <div className="gt-container">
      {/* ── XP Toast Notification ── */}
      {xpToast && (
        <div className="gt-xp-toast">
          <span className="gt-xp-toast-icon">⚡</span>
          <div>
            <span className="gt-xp-toast-xp">+{xpToast.xp} XP!</span> Conquered{" "}
            <strong>{xpToast.title}</strong>
          </div>
        </div>
      )}

      {/* ── Level-Up Modal ── */}
      {levelUpModal && (
        <div className="gt-overlay" onClick={() => setLevelUpModal(null)}>
          <div className="gt-levelup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gt-levelup-glow">🌟</div>
            <h2>Level Up!</h2>
            <p>You have reached</p>
            <div className="gt-levelup-title">
              Level {levelUpModal.level} • {levelUpModal.title}
            </div>
            <button className="gt-btn-primary" onClick={() => setLevelUpModal(null)}>
              Claim Glory
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="gt-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="gt-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gt-delete-icon">🗑️</div>
            <h3>Remove Game?</h3>
            <p>
              Are you sure you want to remove <strong>"{deleteTarget.title}"</strong>?
              {deleteTarget.status === "completed" && (
                <span className="gt-delete-warning">
                  <br />
                  This will also roll back {deleteTarget.xpValue || 100} XP earned.
                </span>
              )}
            </p>
            <div className="gt-delete-actions">
              <button className="gt-btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="gt-btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="gt-header">
        <div className="gt-header-info">
          <div className="gt-title-row">
            <h1 className="gt-title">Gaming Backlog & Progress</h1>
            <span className="gt-phase-pill">Phase 6</span>
          </div>
          <p className="gt-subtitle">
            Conquer your gaming backlog, record trophy achievements, log playtime, and level up your portfolio.
          </p>
        </div>
        <div className="gt-header-actions">
          <button className="gt-btn-steam" onClick={handleOpenSteamSync} title="Sync library directly from Steam">
            <span className="gt-btn-icon">🎮</span> Sync Steam
          </button>
          <button className="gt-btn-primary" onClick={openAddModal}>
            <span className="gt-btn-icon">+</span> Add Game
          </button>
        </div>
      </div>

      {/* ── Notice Banner with Steam Sync ── */}
      <div className="gt-notice-card">
        <div className="gt-notice-icon">🎮</div>
        <div className="gt-notice-content">
          <div className="gt-notice-title">Steam Auto-Sync Ready (Vite Proxy Active)</div>
          <div className="gt-notice-desc">
            Your Steam API keys in <code>.env</code> are connected through the local Vite proxy. You can sync your library, playtimes, and cover art with one click.
          </div>
        </div>
        <button className="gt-btn-steam-sm" onClick={handleOpenSteamSync}>
          ⚡ Sync Steam Now
        </button>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="gt-stats-grid">
        <div className="gt-stat-card">
          <div className="gt-stat-icon">📚</div>
          <div className="gt-stat-content">
            <span className="gt-stat-value">{statsSummary.total}</span>
            <span className="gt-stat-label">Total Titles</span>
          </div>
        </div>

        <div className="gt-stat-card">
          <div className="gt-stat-icon" style={{ color: "#4ECDC4" }}>🕹️</div>
          <div className="gt-stat-content">
            <span className="gt-stat-value">{statsSummary.inProgress}</span>
            <span className="gt-stat-label">Currently Playing</span>
          </div>
        </div>

        <div className="gt-stat-card">
          <div className="gt-stat-icon" style={{ color: "#FFD93D" }}>🏆</div>
          <div className="gt-stat-content">
            <div className="gt-stat-val-row">
              <span className="gt-stat-value">{statsSummary.completed}</span>
              <span className="gt-stat-rate">({statsSummary.completionRate}%)</span>
            </div>
            <span className="gt-stat-label">Conquered</span>
          </div>
        </div>

        <div className="gt-stat-card">
          <div className="gt-stat-icon">⏱️</div>
          <div className="gt-stat-content">
            <span className="gt-stat-value">{statsSummary.totalHours.toLocaleString()}h</span>
            <span className="gt-stat-label">Total Playtime</span>
          </div>
        </div>

        <div className="gt-stat-card gt-stat-card-highlight">
          <div className="gt-stat-icon" style={{ color: "#FF6B6B" }}>⚡</div>
          <div className="gt-stat-content">
            <span className="gt-stat-value">+{statsSummary.totalGamingXp.toLocaleString()} XP</span>
            <span className="gt-stat-label">
              {Math.min(5, statsSummary.completed)}/5 Backlog Slayer 🎮
            </span>
          </div>
        </div>
      </div>

      {/* ── Controls Bar: Filters, Search, Sort ── */}
      <div className="gt-controls-bar">
        {/* Status Filter Tabs */}
        <div className="gt-status-tabs">
          {STATUS_OPTIONS.map((opt) => {
            const count =
              opt.id === "all"
                ? games.length
                : games.filter((g) => g.status === opt.id).length;
            const isActive = activeStatusFilter === opt.id;
            return (
              <button
                key={opt.id}
                className={`gt-status-tab ${isActive ? "active" : ""}`}
                onClick={() => setActiveStatusFilter(opt.id)}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                <span className="gt-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters & Search Row */}
        <div className="gt-filter-row">
          <div className="gt-search-wrapper">
            <span className="gt-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search title, genre, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="gt-search-input"
            />
            {searchQuery && (
              <button className="gt-search-clear" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="gt-selects-wrapper">
            {/* Select All / Deselect All for Bulk Actions */}
            <button
              type="button"
              className={`gt-bulk-toggle-btn ${isAllFilteredSelected ? "active" : ""}`}
              onClick={handleToggleSelectAllFiltered}
              title={isAllFilteredSelected ? "Deselect all visible games" : "Select all visible games"}
            >
              <span className="gt-bulk-toggle-check">{isAllFilteredSelected ? "☑" : "☐"}</span>
              <span>{isAllFilteredSelected ? "Deselect All" : "Select All"}</span>
              {selectedGameIds.size > 0 && (
                <span className="gt-bulk-count-pill">{selectedGameIds.size}</span>
              )}
            </button>

            {/* Visibility Filter (Public / Private) */}
            <div className="gt-visibility-pills" role="group" aria-label="Visibility Filter">
              <button
                type="button"
                className={`gt-vis-pill ${visibilityFilter === "all" ? "active" : ""}`}
                onClick={() => setVisibilityFilter("all")}
                title="Show all games"
              >
                All ({games.length})
              </button>
              <button
                type="button"
                className={`gt-vis-pill gt-vis-public ${visibilityFilter === "public" ? "active" : ""}`}
                onClick={() => setVisibilityFilter("public")}
                title="Show only public games"
              >
                🌐 Public ({games.filter((g) => g.isPublic).length})
              </button>
              <button
                type="button"
                className={`gt-vis-pill gt-vis-private ${visibilityFilter === "private" ? "active" : ""}`}
                onClick={() => setVisibilityFilter("private")}
                title="Show only private games"
              >
                🔒 Private ({games.filter((g) => !g.isPublic).length})
              </button>
            </div>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="gt-dropdown"
            >
              <option value="all">All Platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="gt-dropdown"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Games Grid ── */}
      {loading ? (
        <div className="gt-loading-state">
          <div className="gt-spinner" />
          <p>Loading gaming sanctuary...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="gt-empty-state">
          <div className="gt-empty-icon">🎮</div>
          {games.length === 0 ? (
            <>
              <h3>No Games in Your Library Yet</h3>
              <p>
                Add your favorite games to track your completion, trophies, achievements, and earn XP.
              </p>
              <div className="gt-empty-actions">
                <button className="gt-btn-primary" onClick={openAddModal}>
                  + Add First Game
                </button>
                <button
                  className="gt-btn-secondary"
                  onClick={handleSeedSamples}
                  disabled={seeding}
                >
                  {seeding ? "Loading..." : "⚡ Load Sample Backlog"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>No Matching Games Found</h3>
              <p>Try adjusting your search query or filters.</p>
              <button
                className="gt-btn-secondary"
                onClick={() => {
                  setActiveStatusFilter("all");
                  setPlatformFilter("all");
                  setVisibilityFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="gt-games-grid">
          {filteredGames.map((game) => {
            const platform = PLATFORM_MAP[game.platform] || PLATFORM_MAP.other;
            const statusConfig = STATUS_LABELS[game.status] || STATUS_LABELS.not_started;
            const isCompleted = game.status === "completed";

            // Achievement percentage
            const achTotal = Number(game.achievementsTotal) || 0;
            const achUnlocked = Number(game.achievementsUnlocked) || 0;
            const achPercent = achTotal > 0 ? Math.min(100, Math.round((achUnlocked / achTotal) * 100)) : 0;

            // Trophy counts
            const tr = game.trophies || {};
            const hasTrophies = (tr.platinum || 0) + (tr.gold || 0) + (tr.silver || 0) + (tr.bronze || 0) > 0;

            const isSelected = selectedGameIds.has(game.id);

            return (
              <div
                key={game.id}
                className={`gt-card ${isCompleted ? "gt-card-completed" : ""} ${isSelected ? "gt-card-selected" : ""}`}
              >
                {/* ── Card Cover Header ── */}
                <div className="gt-card-cover-wrapper">
                  {game.coverArtUrl ? (
                    <img
                      src={game.coverArtUrl}
                      alt={game.title}
                      className="gt-card-cover-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : null}

                  <div
                    className="gt-card-cover-fallback"
                    style={{
                      background: `linear-gradient(135deg, ${platform.bg} 0%, #1e1e1e 100%)`,
                    }}
                  >
                    <span className="gt-cover-watermark">{platform.icon}</span>
                  </div>

                  <div className="gt-card-cover-overlay" />

                  {/* Badges on Top of Cover */}
                  <div className="gt-card-top-badges">
                    <div className="gt-top-badge-group">
                      <button
                        type="button"
                        className={`gt-card-select-btn ${isSelected ? "selected" : ""}`}
                        onClick={(e) => toggleSelectGame(game.id, e)}
                        title={isSelected ? "Deselect game" : "Select game for bulk actions"}
                        aria-label={`Select ${game.title}`}
                      >
                        <span className="gt-select-checkmark">{isSelected ? "✓" : ""}</span>
                      </button>

                      <span
                        className="gt-platform-badge"
                        style={{
                          borderColor: platform.color,
                          color: platform.color,
                        }}
                      >
                        <span>{platform.icon}</span>
                        <span>{platform.badge}</span>
                      </span>
                    </div>

                    <span className="gt-xp-badge">
                      +{game.xpValue || 100} XP
                    </span>
                  </div>

                  {/* Status Indicator over Bottom of Cover */}
                  <div className="gt-card-status-overlay">
                    <span
                      className="gt-status-pill"
                      style={{
                        color: statusConfig.color,
                        backgroundColor: statusConfig.bg,
                      }}
                    >
                      <span className="gt-status-dot" style={{ background: statusConfig.color }} />
                      {statusConfig.label}
                    </span>

                    {game.playtimeHours > 0 && (
                      <span className="gt-playtime-pill">
                        ⏱️ {game.playtimeHours}h
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Card Body ── */}
                <div className="gt-card-body">
                  <div className="gt-card-header">
                    <h3 className="gt-game-title" title={game.title}>
                      {game.title}
                    </h3>
                    {game.rating && (
                      <span className="gt-rating-pill" title={`Rating: ${game.rating}/10`}>
                        ⭐ {game.rating}
                      </span>
                    )}
                  </div>

                  {/* Genre & Priority Tag Row */}
                  <div className="gt-meta-row">
                    {game.genre &&
                      game.genre.toLowerCase().trim() !== (game.platform || "").toLowerCase().trim() && (
                        <span className="gt-genre-tag">{game.genre}</span>
                      )}
                    {game.priority && (
                      <span className={`gt-priority-pill gt-priority-${game.priority}`}>
                        {game.priority}
                      </span>
                    )}
                    <span className="gt-difficulty-pill">
                      {game.difficulty || "moderate"}
                    </span>
                  </div>

                  {/* Achievements Bar (if any) */}
                  {achTotal > 0 ? (
                    <div className="gt-achievements-container">
                      <div className="gt-ach-header">
                        <span className="gt-ach-label">Achievements</span>
                        <span className="gt-ach-count">
                          {achUnlocked} / {achTotal} ({achPercent}%)
                        </span>
                      </div>
                      <div className="gt-ach-bar-track">
                        <div
                          className="gt-ach-bar-fill"
                          style={{
                            width: `${achPercent}%`,
                            background: isCompleted
                              ? "#FFD93D"
                              : achPercent > 60
                              ? "#4ECDC4"
                              : "rgba(255,255,255,0.7)",
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Trophies Row (if any) */}
                  {hasTrophies && (
                    <div className="gt-trophies-row">
                      {tr.platinum > 0 && (
                        <span className="gt-trophy-item gt-trophy-plat" title="Platinum Trophies">
                          🏆 {tr.platinum}
                        </span>
                      )}
                      {tr.gold > 0 && (
                        <span className="gt-trophy-item gt-trophy-gold" title="Gold Trophies">
                          🥇 {tr.gold}
                        </span>
                      )}
                      {tr.silver > 0 && (
                        <span className="gt-trophy-item gt-trophy-silver" title="Silver Trophies">
                          🥈 {tr.silver}
                        </span>
                      )}
                      {tr.bronze > 0 && (
                        <span className="gt-trophy-item gt-trophy-bronze" title="Bronze Trophies">
                          🥉 {tr.bronze}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Personal Notes snippet */}
                  {game.personalNotes &&
                    !game.personalNotes.startsWith("Synced from Steam") && (
                      <div className="gt-notes-preview">
                        "{game.personalNotes}"
                      </div>
                    )}

                  {/* ── Card Footer Actions ── */}
                  <div className="gt-card-footer">
                    {/* Public Toggle */}
                    <button
                      type="button"
                      className={`gt-public-toggle ${game.isPublic ? "is-public" : ""}`}
                      onClick={(e) => handleTogglePublic(game, e)}
                      title={game.isPublic ? "Visible on Public Topic Page" : "Private (Hidden from public)"}
                    >
                      <span>{game.isPublic ? "🌐 Public" : "🔒 Private"}</span>
                    </button>

                    <div className="gt-action-buttons">
                      {/* Complete / Undo Complete Toggle */}
                      <button
                        type="button"
                        className={`gt-complete-btn ${isCompleted ? "is-completed" : ""}`}
                        onClick={(e) => handleToggleComplete(game, e)}
                        title={isCompleted ? "Completed! Click to unmark" : "Mark as completed (+XP)"}
                      >
                        {isCompleted ? "🏆 Conquered" : "Complete ✓"}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        className="gt-icon-btn"
                        onClick={(e) => {
                          if (e.currentTarget) e.currentTarget.blur();
                          openEditModal(game, e);
                        }}
                        title="Edit Game"
                      >
                        ✏️
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        className="gt-icon-btn gt-icon-btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (e.currentTarget) e.currentTarget.blur();
                          setDeleteTarget(game);
                        }}
                        title="Delete Game"
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

      {/* ── Bulk Actions Floating Toolbar ── */}
      {selectedGameIds.size > 0 && (
        <aside className="gt-bulk-bar" aria-label="Bulk actions toolbar">
          <div className="gt-bulk-bar-inner">
            <div className="gt-bulk-left">
              <span className="gt-bulk-count-badge">
                🎮 {selectedGameIds.size} game{selectedGameIds.size > 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                className="gt-bulk-clear-btn"
                onClick={handleClearSelection}
                disabled={bulkApplying}
                title="Deselect all games"
              >
                ✕ Deselect
              </button>
            </div>

            <div className="gt-bulk-actions">
              {/* Bulk Visibility Actions */}
              <div className="gt-bulk-group">
                <span className="gt-bulk-group-label">Visibility:</span>
                <button
                  type="button"
                  className="gt-bulk-action-btn gt-bulk-public"
                  onClick={() => handleBulkApply("visibility", true)}
                  disabled={bulkApplying}
                  title="Make all selected games Public"
                >
                  🌐 Make Public
                </button>
                <button
                  type="button"
                  className="gt-bulk-action-btn gt-bulk-private"
                  onClick={() => handleBulkApply("visibility", false)}
                  disabled={bulkApplying}
                  title="Make all selected games Private"
                >
                  🔒 Make Private
                </button>
              </div>

              <div className="gt-bulk-divider" />

              {/* Bulk Status Actions */}
              <div className="gt-bulk-group">
                <span className="gt-bulk-group-label">Status:</span>
                <button
                  type="button"
                  className="gt-bulk-action-btn gt-bulk-playing"
                  onClick={() => handleBulkApply("status", "in_progress")}
                  disabled={bulkApplying}
                  title="Mark selected games as In Progress / Playing"
                >
                  🕹️ In Progress
                </button>
                <button
                  type="button"
                  className="gt-bulk-action-btn gt-bulk-completed"
                  onClick={() => handleBulkApply("status", "completed")}
                  disabled={bulkApplying}
                  title="Mark selected games as Completed (+XP)"
                >
                  🏆 Completed
                </button>
                <button
                  type="button"
                  className="gt-bulk-action-btn gt-bulk-backlog"
                  onClick={() => handleBulkApply("status", "not_started")}
                  disabled={bulkApplying}
                  title="Move selected games to Backlog"
                >
                  ⏳ Backlog
                </button>
                <button
                  type="button"
                  className="gt-bulk-action-btn gt-bulk-shelved"
                  onClick={() => handleBulkApply("status", "abandoned")}
                  disabled={bulkApplying}
                  title="Move selected games to Shelved"
                >
                  📦 Shelved
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ── Add / Edit Game Modal ── */}
      {modalOpen && (
        <div className="gt-overlay" onClick={closeModal}>
          <div className="gt-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h2>{editingGame ? "Edit Game" : "Add Game to Backlog"}</h2>
              <button className="gt-modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="gt-form">
              <div className="gt-form-grid">
                {/* Title */}
                <div className="gt-form-group gt-col-2">
                  <label>Game Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleField}
                    placeholder="e.g. Elden Ring, God of War, Hollow Knight"
                    required
                    className="gt-input"
                  />
                </div>

                {/* Platform */}
                <div className="gt-form-group">
                  <label>Platform</label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleField}
                    className="gt-input"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Genre */}
                <div className="gt-form-group">
                  <label>Genre / Subgenre</label>
                  <input
                    type="text"
                    name="genre"
                    value={formData.genre}
                    onChange={handleField}
                    placeholder="e.g. Action RPG, Metroidvania, FPS"
                    className="gt-input"
                  />
                </div>

                {/* Cover Art URL */}
                <div className="gt-form-group gt-col-2">
                  <label>Cover Art Image URL</label>
                  <input
                    type="url"
                    name="coverArtUrl"
                    value={formData.coverArtUrl}
                    onChange={handleField}
                    placeholder="https://images.unsplash.com/... or direct image link"
                    className="gt-input"
                  />
                  {formData.coverArtUrl && !imagePreviewError && (
                    <div className="gt-image-preview-wrap">
                      <img
                        src={formData.coverArtUrl}
                        alt="Preview"
                        className="gt-image-preview"
                        onError={() => setImagePreviewError(true)}
                      />
                      <span className="gt-preview-label">Live Cover Preview</span>
                    </div>
                  )}
                  {imagePreviewError && (
                    <span className="gt-preview-error">
                      ⚠️ Could not load image preview from this URL.
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="gt-form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleField}
                    className="gt-input"
                  >
                    <option value="in_progress">🕹️ Playing / In Progress</option>
                    <option value="completed">🏆 Completed / Conquered</option>
                    <option value="not_started">⏳ Backlog / Not Started</option>
                    <option value="abandoned">📦 Shelved / Abandoned</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="gt-form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleField}
                    className="gt-input"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Playtime Hours */}
                <div className="gt-form-group">
                  <label>Playtime (Hours)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="playtimeHours"
                    value={formData.playtimeHours}
                    onChange={handleField}
                    placeholder="e.g. 45 or 2.9"
                    className="gt-input"
                  />
                </div>

                {/* Rating */}
                <div className="gt-form-group">
                  <label>Rating (1 - 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    name="rating"
                    value={formData.rating}
                    onChange={handleField}
                    placeholder="e.g. 9.5"
                    className="gt-input"
                  />
                </div>

                {/* Difficulty & XP Tier */}
                <div className="gt-form-group">
                  <label>Difficulty Tier</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleField}
                    className="gt-input"
                  >
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label} (+{d.xp} XP)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom XP override */}
                <div className="gt-form-group">
                  <label>XP Reward Value</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    name="xpValue"
                    value={formData.xpValue}
                    onChange={handleField}
                    className="gt-input"
                  />
                </div>

                {/* Achievements Unlocked vs Total */}
                <div className="gt-form-group">
                  <label>Achievements Unlocked</label>
                  <input
                    type="number"
                    min="0"
                    name="achievementsUnlocked"
                    value={formData.achievementsUnlocked}
                    onChange={handleField}
                    placeholder="e.g. 38"
                    className="gt-input"
                  />
                </div>

                <div className="gt-form-group">
                  <label>Total Achievements</label>
                  <input
                    type="number"
                    min="0"
                    name="achievementsTotal"
                    value={formData.achievementsTotal}
                    onChange={handleField}
                    placeholder="e.g. 42"
                    className="gt-input"
                  />
                </div>

                {/* PlayStation / Multi-platform Trophies */}
                <div className="gt-form-group gt-col-2">
                  <label>Trophy Breakdown (Optional / PlayStation)</label>
                  <div className="gt-trophies-input-grid">
                    <div className="gt-trophy-input-item">
                      <span className="gt-trophy-input-icon">🏆</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Plat"
                        value={formData.trophies.platinum || ""}
                        onChange={(e) => handleTrophyField("platinum", e.target.value)}
                        className="gt-input"
                      />
                    </div>
                    <div className="gt-trophy-input-item">
                      <span className="gt-trophy-input-icon">🥇</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Gold"
                        value={formData.trophies.gold || ""}
                        onChange={(e) => handleTrophyField("gold", e.target.value)}
                        className="gt-input"
                      />
                    </div>
                    <div className="gt-trophy-input-item">
                      <span className="gt-trophy-input-icon">🥈</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Silver"
                        value={formData.trophies.silver || ""}
                        onChange={(e) => handleTrophyField("silver", e.target.value)}
                        className="gt-input"
                      />
                    </div>
                    <div className="gt-trophy-input-item">
                      <span className="gt-trophy-input-icon">🥉</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Bronze"
                        value={formData.trophies.bronze || ""}
                        onChange={(e) => handleTrophyField("bronze", e.target.value)}
                        className="gt-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Notes / Review */}
                <div className="gt-form-group gt-col-2">
                  <label>Personal Review / Notes</label>
                  <textarea
                    rows={3}
                    name="personalNotes"
                    value={formData.personalNotes}
                    onChange={handleField}
                    placeholder="Share your impressions, favorite moments, build specs, or boss battle highlights..."
                    className="gt-textarea"
                  />
                </div>

                {/* Public Showcase Toggle */}
                <div className="gt-form-group gt-col-2 gt-checkbox-group">
                  <label className="gt-checkbox-label">
                    <input
                      type="checkbox"
                      name="isPublic"
                      checked={formData.isPublic}
                      onChange={handleField}
                      className="gt-checkbox"
                    />
                    <div className="gt-checkbox-text">
                      <span className="gt-checkbox-title">Publish to Public Gaming Showcase</span>
                      <span className="gt-checkbox-desc">
                        Make this game visible on the public topic page (Phase 7).
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="gt-modal-actions">
                <button type="button" className="gt-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="gt-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingGame ? "Update Game" : "Add to Library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Steam Sync Modal ── */}
      {steamModalOpen && (
        <div className="gt-overlay" onClick={() => !importingSteam && setSteamModalOpen(false)}>
          <div className="gt-steam-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gt-modal-header">
              <div className="gt-steam-header-title">
                <span className="gt-steam-logo-badge">💻</span>
                <div>
                  <h2>Sync Steam Library</h2>
                  <p className="gt-steam-header-sub">
                    Direct integration via local proxy &bull; Account: bestnoob
                  </p>
                </div>
              </div>
              <button
                className="gt-modal-close"
                onClick={() => !importingSteam && setSteamModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {steamLoading ? (
              <div className="gt-steam-loading">
                <div className="gt-spinner" />
                <p>Connecting to Steam Web API and fetching library...</p>
              </div>
            ) : steamError ? (
              <div className="gt-steam-error-state">
                <span className="gt-error-icon">⚠️</span>
                <h3>Steam Sync Failed</h3>
                <p>{steamError}</p>
                <button className="gt-btn-secondary" onClick={handleOpenSteamSync}>
                  Try Again
                </button>
              </div>
            ) : (
              <div className="gt-steam-body">
                {/* Toolbar */}
                <div className="gt-steam-toolbar">
                  <label className="gt-steam-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={onlyPlayed}
                      onChange={(e) => setOnlyPlayed(e.target.checked)}
                      className="gt-checkbox"
                    />
                    <span>Only show played titles (&gt; 0 hrs)</span>
                  </label>

                  <div className="gt-steam-select-actions">
                    <span className="gt-steam-select-count">
                      {selectedSteamIds.size} of {displayedSteamGames.length} selected
                    </span>
                    <button
                      type="button"
                      className="gt-link-btn"
                      onClick={() => handleToggleSelectAll(selectedSteamIds.size < displayedSteamGames.length)}
                    >
                      {selectedSteamIds.size === displayedSteamGames.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                </div>

                {/* Games List */}
                <div className="gt-steam-list">
                  {displayedSteamGames.map((game) => {
                    const isSelected = selectedSteamIds.has(game.steamAppId);
                    const alreadyInLibrary = games.some(
                      (g) => g.id === `steam_${game.steamAppId}` || g.steamAppId === game.steamAppId
                    );

                    return (
                      <div
                        key={game.steamAppId}
                        className={`gt-steam-item ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleSelectSteam(game.steamAppId)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="gt-checkbox"
                        />
                        <img
                          src={game.coverArtUrl}
                          alt={game.title}
                          className="gt-steam-item-img"
                          onError={(e) => {
                            e.target.style.opacity = "0.2";
                          }}
                        />
                        <div className="gt-steam-item-details">
                          <div className="gt-steam-item-title-row">
                            <span className="gt-steam-item-title">{game.title}</span>
                            {alreadyInLibrary && (
                              <span className="gt-steam-existing-pill">In Library</span>
                            )}
                          </div>
                          <div className="gt-steam-item-meta">
                            <span className="gt-steam-playtime">
                              ⏱️ {game.playtimeHours} hrs
                            </span>
                            {game.achievementsTotal > 0 && (
                              <span
                                className="gt-ach-pill"
                                style={{
                                  background:
                                    game.achievementsUnlocked === game.achievementsTotal
                                      ? "rgba(255, 217, 61, 0.2)"
                                      : "rgba(78, 205, 196, 0.15)",
                                  color:
                                    game.achievementsUnlocked === game.achievementsTotal
                                      ? "#FFD93D"
                                      : "#4ECDC4",
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: "600",
                                }}
                              >
                                🏆 {game.achievementsUnlocked} / {game.achievementsTotal} (
                                {Math.round(
                                  (game.achievementsUnlocked / game.achievementsTotal) * 100
                                )}
                                %)
                              </span>
                            )}
                            <span className="gt-difficulty-pill">{game.difficulty}</span>
                            <span className="gt-xp-pill">+{game.xpValue} XP</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Actions */}
                <div className="gt-modal-actions">
                  <button
                    type="button"
                    className="gt-btn-secondary"
                    onClick={() => setSteamModalOpen(false)}
                    disabled={importingSteam}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="gt-btn-primary"
                    onClick={handleImportSteamGames}
                    disabled={importingSteam || selectedSteamIds.size === 0}
                  >
                    {importingSteam
                      ? "Importing..."
                      : `Import ${selectedSteamIds.size} Games to Backlog`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamingTracker;
