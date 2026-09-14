/**
 * Gamification Engine for Sonit's Personal Tracker
 * Handles XP calculation, Level progression, Badges/Achievements, and Streaks.
 */

// Level Progression Thresholds & Rank Titles
export const LEVEL_TIERS = [
  { level: 1, minXp: 0, maxXp: 200, title: "Novice", badge: "🌱" },
  { level: 2, minXp: 201, maxXp: 500, title: "Trailblazer", badge: "🧭" },
  { level: 3, minXp: 501, maxXp: 1000, title: "Adventurer", badge: "⚔️" },
  { level: 4, minXp: 1001, maxXp: 2000, title: "Pathfinder", badge: "🗺️" },
  { level: 5, minXp: 2001, maxXp: 3500, title: "Master of Horizons", badge: "👑" },
  { level: 6, minXp: 3501, maxXp: Infinity, title: "Grandmaster", badge: "⚡" }
];

// XP values by difficulty
export const DIFFICULTY_XP = {
  casual: 50,
  moderate: 100,
  challenging: 250,
  epic: 500
};

// Milestone Badges Definition
export const BADGES_CATALOG = [
  {
    id: "first_step",
    title: "First Step",
    description: "Complete your very first bucket list goal",
    icon: "🌟",
    color: "#FFD93D",
    target: 1,
    unit: "goal",
    getProgress: (stats) => stats.totalCompleted || 0,
    check: (stats) => (stats.totalCompleted || 0) >= 1
  },
  {
    id: "globetrotter",
    title: "Globetrotter",
    description: "Visit 5 destinations around the globe",
    icon: "🗺️",
    color: "#4ECDC4",
    target: 5,
    unit: "destinations",
    getProgress: (stats) => stats.categoryBreakdown?.places?.completed || 0,
    check: (stats) => (stats.categoryBreakdown?.places?.completed || 0) >= 5
  },
  {
    id: "backlog_slayer",
    title: "Backlog Slayer",
    description: "Conquer 5 gaming titles in your backlog",
    icon: "🎮",
    color: "#FF6B6B",
    target: 5,
    unit: "games",
    getProgress: (stats) => stats.categoryBreakdown?.gaming?.completed || 0,
    check: (stats) => (stats.categoryBreakdown?.gaming?.completed || 0) >= 5
  },
  {
    id: "self_master",
    title: "Self Master",
    description: "Achieve 5 personal growth milestones",
    icon: "🌱",
    color: "#95E1D3",
    target: 5,
    unit: "milestones",
    getProgress: (stats) => stats.categoryBreakdown?.personal_growth?.completed || 0,
    check: (stats) => (stats.categoryBreakdown?.personal_growth?.completed || 0) >= 5
  },
  {
    id: "high_achiever",
    title: "High Achiever",
    description: "Complete 3 Challenging or Epic priority quests",
    icon: "⚡",
    color: "#A8E6CF",
    target: 3,
    unit: "epic quests",
    getProgress: (stats) => stats.epicOrChallengingCompleted || 0,
    check: (stats) => (stats.epicOrChallengingCompleted || 0) >= 3
  },
  {
    id: "century_club",
    title: "Century Club",
    description: "Cross the 1,000 total XP milestone",
    icon: "💎",
    color: "#6C5CE7",
    target: 1000,
    unit: "XP",
    getProgress: (stats) => stats.totalXp || 0,
    check: (stats) => (stats.totalXp || 0) >= 1000
  },
  {
    id: "streak_master",
    title: "Streak Master",
    description: "Keep a 3-month goal completion streak alive",
    icon: "🔥",
    color: "#FFA502",
    target: 3,
    unit: "months",
    getProgress: (stats) => stats.streakMonths || 0,
    check: (stats) => (stats.streakMonths || 0) >= 3
  },
  {
    id: "wallet_warrior",
    title: "Wallet Warrior",
    description: "Add and manage 5 credit cards in your collection",
    icon: "💳",
    color: "#FF9F43",
    target: 5,
    unit: "cards",
    getProgress: (stats) => stats.categoryBreakdown?.credit_cards?.completed || 0,
    check: (stats) => (stats.categoryBreakdown?.credit_cards?.completed || 0) >= 5
  }
];

/**
 * Calculate Level info based on total XP
 */
export const calculateLevelInfo = (totalXp = 0) => {
  const currentTier = LEVEL_TIERS.find(tier => totalXp >= tier.minXp && totalXp <= tier.maxXp) || LEVEL_TIERS[0];
  const nextTier = LEVEL_TIERS.find(tier => tier.level === currentTier.level + 1);

  const rangeStart = currentTier.minXp;
  const rangeEnd = nextTier ? nextTier.minXp : currentTier.maxXp;
  const xpIntoLevel = Math.max(0, totalXp - rangeStart);
  const xpRequiredForLevel = Math.max(1, rangeEnd - rangeStart);
  const progressPercent = nextTier 
    ? Math.min(100, Math.round((xpIntoLevel / xpRequiredForLevel) * 100))
    : 100;
  const xpNeeded = nextTier ? Math.max(0, nextTier.minXp - totalXp) : 0;

  return {
    level: currentTier.level,
    title: currentTier.title,
    badge: currentTier.badge,
    totalXp,
    progressPercent,
    xpIntoLevel,
    xpRequiredForLevel,
    xpNeeded,
    nextTitle: nextTier ? nextTier.title : "Maximum Rank"
  };
};

/**
 * Determine which badges should be unlocked given user stats
 */
export const evaluateUnlockedBadges = (stats, existingUnlocked = []) => {
  const unlockedMap = new Map((existingUnlocked || []).map(b => [b.id, b]));

  BADGES_CATALOG.forEach(badge => {
    if (!unlockedMap.has(badge.id) && badge.check(stats)) {
      unlockedMap.set(badge.id, {
        id: badge.id,
        title: badge.title,
        icon: badge.icon,
        color: badge.color,
        unlockedAt: new Date().toISOString()
      });
    }
  });

  return Array.from(unlockedMap.values());
};

/**
 * Default initial gamification stats
 */
export const DEFAULT_USER_STATS = {
  totalXp: 0,
  currentLevel: 1,
  levelTitle: "Novice",
  streakMonths: 0,
  totalCompleted: 0,
  completionVelocity: { thisMonth: 0, prevMonth: 0 },
  unlockedBadges: [],
  categoryBreakdown: {
    places: { completed: 0, total: 0, label: "Places to Visit", icon: "🗺️", color: "#4ECDC4" },
    gaming: { completed: 0, total: 0, label: "Gaming Backlog", icon: "🎮", color: "#FF6B6B" },
    personal_growth: { completed: 0, total: 0, label: "Personal Growth", icon: "🌱", color: "#95E1D3" },
    credit_cards: { completed: 0, total: 0, label: "Card Collection", icon: "💳", color: "#FFD93D" }
  },
  recentActivity: [],
  activeQuests: []
};
