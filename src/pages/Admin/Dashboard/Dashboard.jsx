import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import confetti from "canvas-confetti";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { 
  calculateLevelInfo, 
  BADGES_CATALOG, 
  evaluateUnlockedBadges,
  LEVEL_TIERS
} from "../../../lib/gamification";
import "./Dashboard.css";

const Dashboard = () => {
  const { stats, setStats } = useOutletContext();
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const [showRanksModal, setShowRanksModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const levelInfo = calculateLevelInfo(stats.totalXp || 0);

  // Trigger celebration & complete quest
  const handleCompleteQuest = async (quest) => {
    // 1. Trigger celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    const xpEarned = quest.xpValue || 100;
    const newTotalXp = (stats.totalXp || 0) + xpEarned;
    const newTotalCompleted = (stats.totalCompleted || 0) + 1;

    // Show floating celebration notification
    setCelebrationMsg(`🎉 Quest Completed! +${xpEarned} XP Earned`);
    setTimeout(() => setCelebrationMsg(null), 3500);

    // Update category counts
    const cat = quest.category || "places";
    const currentCat = stats.categoryBreakdown?.[cat] || { completed: 0, total: 1 };
    const updatedCategoryBreakdown = {
      ...stats.categoryBreakdown,
      [cat]: {
        ...currentCat,
        completed: (currentCat.completed || 0) + 1
      }
    };

    // Remove from active quests
    const updatedActiveQuests = (stats.activeQuests || []).filter(q => q.id !== quest.id);

    // New activity entry
    const newActivity = {
      id: `act_${Date.now()}`,
      title: `Completed: ${quest.title}`,
      xpGained: xpEarned,
      date: new Date().toISOString(),
      icon: quest.icon || "🌟"
    };
    const updatedRecentActivity = [newActivity, ...(stats.recentActivity || [])].slice(0, 8);

    // Check newly unlocked badges
    const updatedStatsDraft = {
      ...stats,
      totalXp: newTotalXp,
      totalCompleted: newTotalCompleted,
      categoryBreakdown: updatedCategoryBreakdown,
      activeQuests: updatedActiveQuests,
      recentActivity: updatedRecentActivity
    };

    const newUnlockedBadges = evaluateUnlockedBadges(updatedStatsDraft, stats.unlockedBadges || []);
    const finalStats = {
      ...updatedStatsDraft,
      unlockedBadges: newUnlockedBadges
    };

    // Update local state immediately
    setStats(finalStats);

    // Attempt to persist to Firestore
    try {
      await setDoc(doc(db, "userStats", "gamification"), finalStats, { merge: true });
    } catch (err) {
      console.warn("Could not sync quest completion to Firestore:", err);
    }
  };

  const unlockedBadgeIds = new Set((stats.unlockedBadges || []).map(b => b.id));

  return (
    <div className="dashboard-container">
      {/* Celebration Floating Notification */}
      {celebrationMsg && (
        <div className="xp-notification-float">
          <span>{celebrationMsg}</span>
        </div>
      )}

      {/* 1. Hero Level & XP Card */}
      <section className="hero-level-card">
        <div className="hero-main-row">
          <div className="hero-profile-info">
            <div className="hero-level-avatar">
              <span>{levelInfo.badge}</span>
              <span className="hero-level-badge-mini">Lv. {levelInfo.level}</span>
            </div>
            <div className="hero-titles">
              <h2>
                Level {levelInfo.level} • {levelInfo.title}
                <span className="hero-rank-tag">{levelInfo.title}</span>
              </h2>
              <p className="hero-subtitles">
                {levelInfo.xpNeeded > 0 
                  ? `${levelInfo.xpNeeded.toLocaleString()} XP needed to reach ${levelInfo.nextTitle}`
                  : "Maximum Rank Achieved"}
              </p>
              <button 
                type="button"
                onClick={() => setShowRanksModal(true)}
                className="hero-ladder-btn"
              >
                📜 View Rank Ladder (Levels 1 - 6)
              </button>
            </div>
          </div>

          <div className="hero-metrics">
            <div className="hero-metric-box">
              <span className="metric-icon">🔥</span>
              <div className="metric-data">
                <span className="metric-val">{stats.streakMonths || 2} Months</span>
                <span className="metric-lbl">Active Streak</span>
              </div>
            </div>

            <div className="hero-metric-box">
              <span className="metric-icon">📈</span>
              <div className="metric-data">
                <span className="metric-val">{stats.totalCompleted || 7} Goals</span>
                <span className="metric-lbl">Accomplished</span>
              </div>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="hero-xp-bar-container">
          <div className="xp-bar-labels">
            <span className="xp-label-left">
              Current XP: {levelInfo.totalXp.toLocaleString()} XP
            </span>
            <span className="xp-label-right">
              {levelInfo.progressPercent}% to next level
            </span>
          </div>
          <div className="xp-progress-track">
            <div 
              className="xp-progress-fill" 
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. Category Completion Rings */}
      <section>
        <h3 className="dashboard-section-title">
          <span>🎯</span> Category Completion Progress
        </h3>
        <div className="category-rings-grid">
          {Object.entries(stats.categoryBreakdown || {}).map(([key, cat]) => {
            const completed = cat.completed || 0;
            const total = Math.max(1, cat.total || 1);
            const percent = Math.min(100, Math.round((completed / total) * 100));
            const circumference = 2 * Math.PI * 30; // r=30
            const strokeDashoffset = circumference - (percent / 100) * circumference;

            return (
              <div key={key} className="ring-card">
                <div className="ring-svg-wrapper">
                  <svg className="ring-svg" width="76" height="76" viewBox="0 0 76 76">
                    <circle 
                      className="ring-circle-bg" 
                      cx="38" 
                      cy="38" 
                      r="30" 
                    />
                    <circle 
                      className="ring-circle-val" 
                      cx="38" 
                      cy="38" 
                      r="30" 
                      stroke={cat.color || "#ff4b2b"}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <span className="ring-percent-text">{percent}%</span>
                </div>
                <div className="ring-info">
                  <span className="ring-cat-label">
                    <span>{cat.icon || "📌"}</span>
                    <span>{cat.label || key}</span>
                  </span>
                  <span className="ring-cat-stats">
                    {completed} of {cat.total || 0} completed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Split Row: Active Quests & Milestone Badges */}
      <div className="dashboard-split-grid">
        {/* Active Quests */}
        <section className="quests-panel">
          <h3 className="dashboard-section-title">
            <span>⚔️</span> Active Quests (Top Priorities)
          </h3>
          <div className="quest-items-list">
            {(stats.activeQuests || []).length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "28px 16px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "14px",
                border: "1px dashed rgba(255, 255, 255, 0.1)"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🌱</div>
                <p style={{ color: "#fff", fontSize: "14px", fontWeight: 600, margin: "0 0 4px 0" }}>
                  No active quests yet
                </p>
                <p style={{ color: "var(--admin-text-muted)", fontSize: "12px", margin: "0 0 16px 0" }}>
                  Add your first goals and backlog items in Bucket List to earn XP!
                </p>
                <a
                  href="/admin/bucket-list"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #ff416c, #ff4b2b)",
                    borderRadius: "10px",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: 600
                  }}
                >
                  + Go to Bucket List
                </a>
              </div>
            ) : (
              (stats.activeQuests || []).map((quest) => (
                <div key={quest.id} className="quest-item-card">
                  <div className="quest-item-left">
                    <div className="quest-icon">{quest.icon || "🎯"}</div>
                    <div className="quest-details">
                      <h4>{quest.title}</h4>
                      <div className="quest-tags">
                        <span className={`difficulty-tag ${quest.difficulty || "casual"}`}>
                          {quest.difficulty || "casual"}
                        </span>
                        <span className="quest-xp-badge">
                          +{quest.xpValue || 100} XP
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="quest-complete-btn"
                    onClick={() => handleCompleteQuest(quest)}
                  >
                    Complete ✓
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Badges & Achievements */}
        <section className="badges-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 className="dashboard-section-title" style={{ margin: 0 }}>
              <span>🏆</span> Badges & Achievements ({stats.unlockedBadges?.length || 0}/{BADGES_CATALOG.length})
            </h3>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              Tap card for details
            </span>
          </div>

          <div className="badges-showcase-grid">
            {BADGES_CATALOG.map((badge) => {
              const isUnlocked = unlockedBadgeIds.has(badge.id);
              const progressVal = badge.getProgress ? badge.getProgress(stats) : 0;
              const targetVal = badge.target || 1;
              const progressPercent = Math.min(100, Math.round((progressVal / targetVal) * 100));

              return (
                <div 
                  key={badge.id} 
                  className={`badge-item-card ${isUnlocked ? "unlocked" : "locked"}`}
                  onClick={() => setSelectedBadge({ ...badge, isUnlocked, progressVal, targetVal })}
                  style={{ cursor: "pointer" }}
                >
                  <div className="badge-icon-display">{badge.icon}</div>
                  <span className="badge-name">{badge.title}</span>
                  <p className="badge-requirement-preview">
                    {badge.description}
                  </p>
                  <div className="badge-progress-mini">
                    <div 
                      className="badge-mini-bar" 
                      style={{ 
                        width: `${progressPercent}%`, 
                        background: isUnlocked ? "yellow" : "rgba(255,255,255,0.4)" 
                      }} 
                    />
                  </div>
                  <span className="badge-status">
                    {isUnlocked ? "Unlocked ✨" : `${progressVal} / ${targetVal} ${badge.unit}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 4. Recent Activity Timeline */}
      <section className="activity-panel">
        <h3 className="dashboard-section-title">
          <span>📜</span> Recent Accomplishments
        </h3>
        <div className="activity-list">
          {(stats.recentActivity || []).length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "24px 16px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "14px",
              border: "1px dashed rgba(255, 255, 255, 0.08)",
              color: "var(--admin-text-muted)",
              fontSize: "13px"
            }}>
              No accomplishments logged yet. Check off items in your Bucket List or Gaming Tracker to start building your milestone timeline!
            </div>
          ) : (
            (stats.recentActivity || []).map((item) => (
              <div key={item.id} className="activity-item-card">
                <div className="activity-left">
                  <span className="activity-icon">{item.icon || "🌟"}</span>
                  <div>
                    <h5 className="activity-title">{item.title}</h5>
                    <span className="activity-date">
                      {new Date(item.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                </div>
                <span className="activity-xp-pill">+{item.xpGained} XP</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 5. Rank Ladder Modal */}
      {showRanksModal && (
        <div className="gamification-modal-backdrop" onClick={() => setShowRanksModal(false)}>
          <div className="gamification-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📜</span> Rank Progression Ladder
              </h3>
              <button 
                onClick={() => setShowRanksModal(false)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: "0 0 16px 0" }}>
              Earn XP by completing bucket list goals, gaming titles, career milestones, and collecting credit cards.
            </p>
            <div>
              {LEVEL_TIERS.map((tier) => {
                const isCurrent = levelInfo.level === tier.level;
                const isPast = levelInfo.level > tier.level;
                return (
                  <div key={tier.level} className={`ladder-tier-item ${isCurrent ? "current-tier" : ""}`}>
                    <div className="tier-left">
                      <span className="tier-icon">{tier.badge}</span>
                      <div>
                        <div className="tier-name">
                          <span>Level {tier.level} • {tier.title}</span>
                          {isCurrent && (
                            <span style={{ fontSize: "10px", background: "yellow", color: "#000", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                              CURRENT
                            </span>
                          )}
                          {isPast && (
                            <span style={{ fontSize: "10px", color: "#2ed573" }}>✓ Passed</span>
                          )}
                        </div>
                        <span className="tier-xp">
                          {tier.maxXp === Infinity ? `${tier.minXp.toLocaleString()}+ XP` : `${tier.minXp.toLocaleString()} - ${tier.maxXp.toLocaleString()} XP`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "right", marginTop: "18px" }}>
              <button
                onClick={() => setShowRanksModal(false)}
                style={{
                  background: "white",
                  color: "#000",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "2rem",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Badge Details Modal */}
      {selectedBadge && (
        <div className="gamification-modal-backdrop" onClick={() => setSelectedBadge(null)}>
          <div className="gamification-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>{selectedBadge.icon}</div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "20px", color: "#fff" }}>
                {selectedBadge.title}
              </h3>
              <div style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: 600,
                background: selectedBadge.isUnlocked ? "rgba(255, 255, 0, 0.15)" : "rgba(255, 255, 255, 0.1)",
                color: selectedBadge.isUnlocked ? "yellow" : "rgba(255, 255, 255, 0.6)",
                border: selectedBadge.isUnlocked ? "1px solid rgba(255, 255, 0, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)"
              }}>
                {selectedBadge.isUnlocked ? "Unlocked ✨" : "Locked 🔒"}
              </div>
            </div>

            <div style={{
              background: "rgb(40, 40, 40)",
              borderRadius: "0.5rem",
              padding: "16px",
              marginBottom: "16px"
            }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.4" }}>
                <strong style={{ color: "#fff" }}>Unlock Requirement:</strong><br />
                {selectedBadge.description}
              </p>
              <div style={{ fontSize: "12px", color: "yellow", fontWeight: 500 }}>
                Progress: {selectedBadge.progressVal || 0} / {selectedBadge.targetVal || 1} {selectedBadge.unit}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setSelectedBadge(null)}
                style={{
                  background: "white",
                  color: "#000",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "2rem",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
