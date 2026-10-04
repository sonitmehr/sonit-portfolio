import React, { useState, useEffect } from "react";
import { SupercellIcon } from "./GamingIcons";
import "./ClashOfClansModal.css";

export default function ClashOfClansModal({ isOpen, onClose, cocData, onRefresh }) {
  const [activeTab, setActiveTab] = useState("heroes");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !cocData) return null;

  const player = cocData;
  const clan = cocData.clanDetails || cocData.clan || null;
  const heroes = cocData.heroes || [];
  const heroEquipment = cocData.heroEquipment || [];
  const spells = cocData.spells || [];
  const achievements = cocData.achievements || [];

  const homeHeroes = heroes.filter((h) => h.village === "home");
  const builderHeroes = heroes.filter((h) => h.village === "builderBase");

  const epicEquipmentNames = new Set([
    "Giant Gauntlet",
    "Frozen Arrow",
    "Electro Boots",
    "Spiky Ball",
    "Fireball",
    "Magic Mirror",
    "Dark Crown",
    "Action Figure",
  ]);

  const handleRefreshClick = async () => {
    if (onRefresh && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  return (
    <div className="coc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="coc-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="coc-modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        {/* Hero Header */}
        <header className="coc-modal-header">
          <div className="coc-modal-header-bg" />
          <div className="coc-modal-header-content">
            <div className="coc-header-badges">
              <span className="coc-tag-live">
                <span className="coc-live-dot" /> Live Supercell API
              </span>
              <span className="coc-player-tag">{player.tag}</span>
            </div>

            <div className="coc-player-identity">
              <div className="coc-th-badge">
                <span className="coc-th-num">{player.townHallLevel || 16}</span>
                <span className="coc-th-label">TH</span>
              </div>
              <div className="coc-name-wrap">
                <h2 className="coc-player-name">{player.name || "BARB KING"}</h2>
                <div className="coc-subtitle-row">
                  <span className="coc-level-pill">⭐ Level {player.expLevel}</span>
                  <span className="coc-stars-pill">⚔️ {player.warStars?.toLocaleString()} War Stars</span>
                  {clan && (
                    <span className="coc-clan-pill">
                      🛡️ {clan.name} (Lv {clan.clanLevel})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stat Bar */}
            <div className="coc-quick-stats">
              <div className="coc-quick-stat-box">
                <span className="coc-stat-label">Town Hall</span>
                <span className="coc-stat-val text-gold">Level {player.townHallLevel}</span>
                <span className="coc-stat-sub">Weapon Lv {player.townHallWeaponLevel || 1}</span>
              </div>
              <div className="coc-quick-stat-box">
                <span className="coc-stat-label">Builder Hall</span>
                <span className="coc-stat-val text-cyan">Level {player.builderHallLevel || 10}</span>
                <span className="coc-stat-sub">{player.builderBaseTrophies} 🏆 ({player.builderBaseLeague?.name || "Emerald"})</span>
              </div>
              <div className="coc-quick-stat-box">
                <span className="coc-stat-label">Best Trophies</span>
                <span className="coc-stat-val text-purple">{player.bestTrophies?.toLocaleString() || 5012} 🏆</span>
                <span className="coc-stat-sub">Legends Record</span>
              </div>
              <div className="coc-quick-stat-box">
                <span className="coc-stat-label">Capital Contribution</span>
                <span className="coc-stat-val text-orange">{player.clanCapitalContributions?.toLocaleString()}</span>
                <span className="coc-stat-sub">Capital Gold</span>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="coc-modal-nav">
          <button
            className={`coc-tab-btn ${activeTab === "heroes" ? "active" : ""}`}
            onClick={() => setActiveTab("heroes")}
          >
            👑 Heroes & Equipment ({heroes.length})
          </button>
          <button
            className={`coc-tab-btn ${activeTab === "clan" ? "active" : ""}`}
            onClick={() => setActiveTab("clan")}
          >
            🛡️ Clan & Village ({clan ? clan.name : "Clan"})
          </button>
          <button
            className={`coc-tab-btn ${activeTab === "spells" ? "active" : ""}`}
            onClick={() => setActiveTab("spells")}
          >
            🧪 Spells & Army
          </button>
          <button
            className={`coc-tab-btn ${activeTab === "achievements" ? "active" : ""}`}
            onClick={() => setActiveTab("achievements")}
          >
            🏆 Achievements ({achievements.filter((a) => a.stars === 3).length} Completed)
          </button>

          {onRefresh && (
            <button
              className="coc-refresh-btn"
              onClick={handleRefreshClick}
              disabled={refreshing}
              title="Refresh live stats from Clash of Clans API"
            >
              {refreshing ? "🔄 Refreshing…" : "🔄 Refresh API"}
            </button>
          )}
        </nav>

        {/* Modal Body */}
        <main className="coc-modal-body">
          {/* TAB 1: HEROES & EQUIPMENT */}
          {activeTab === "heroes" && (
            <div className="coc-tab-pane">
              <div className="coc-section-heading">
                <h3>Home Village Heroes</h3>
                <span className="coc-section-desc">Upgraded heroes with active levels and maximum caps</span>
              </div>
              <div className="coc-heroes-grid">
                {homeHeroes.map((hero) => {
                  const isMax = hero.level === hero.maxLevel;
                  const pct = Math.round((hero.level / hero.maxLevel) * 100);
                  return (
                    <div key={hero.name} className={`coc-hero-card ${isMax ? "maxed" : ""}`}>
                      <div className="coc-hero-header">
                        <span className="coc-hero-name">{hero.name}</span>
                        <span className={`coc-hero-level ${isMax ? "max-level" : ""}`}>
                          Lv {hero.level} / {hero.maxLevel}
                        </span>
                      </div>
                      <div className="coc-progress-bar-wrap">
                        <div className="coc-progress-bar-fill hero-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="coc-hero-sub">
                        {isMax ? "⭐ MAX LEVEL REACHED" : `${pct}% to max cap`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {builderHeroes.length > 0 && (
                <>
                  <div className="coc-section-heading mt-6">
                    <h3>Builder Base Heroes</h3>
                    <span className="coc-section-desc">Mechanical champions of the second village</span>
                  </div>
                  <div className="coc-heroes-grid">
                    {builderHeroes.map((hero) => {
                      const isMax = hero.level === hero.maxLevel;
                      const pct = Math.round((hero.level / hero.maxLevel) * 100);
                      return (
                        <div key={hero.name} className={`coc-hero-card ${isMax ? "maxed" : ""}`}>
                          <div className="coc-hero-header">
                            <span className="coc-hero-name">{hero.name}</span>
                            <span className={`coc-hero-level ${isMax ? "max-level" : ""}`}>
                              Lv {hero.level} / {hero.maxLevel}
                            </span>
                          </div>
                          <div className="coc-progress-bar-wrap">
                            <div className="coc-progress-bar-fill builder-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="coc-hero-sub">
                            {isMax ? "⭐ MAX LEVEL REACHED" : `${pct}% to max cap`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Hero Equipment */}
              <div className="coc-section-heading mt-6">
                <div className="coc-heading-with-badge">
                  <h3>Hero Equipment Arsenal</h3>
                  <span className="coc-epic-badge">✨ Epic & Common Gear</span>
                </div>
                <span className="coc-section-desc">Upgraded abilities and passive stats for battle</span>
              </div>
              <div className="coc-equipment-grid">
                {heroEquipment.map((eq) => {
                  const isEpic = epicEquipmentNames.has(eq.name);
                  const isMax = eq.level === eq.maxLevel;
                  const pct = Math.round((eq.level / eq.maxLevel) * 100);
                  return (
                    <div
                      key={eq.name}
                      className={`coc-eq-card ${isEpic ? "epic" : "common"} ${isMax ? "maxed" : ""}`}
                    >
                      <div className="coc-eq-header">
                        <span className="coc-eq-title">{eq.name}</span>
                        {isEpic && <span className="coc-eq-type">EPIC</span>}
                      </div>
                      <div className="coc-eq-level-row">
                        <span className="coc-eq-level">
                          Level {eq.level} <span className="coc-eq-max">/ {eq.maxLevel}</span>
                        </span>
                        {isMax && <span className="coc-eq-max-tag">MAX</span>}
                      </div>
                      <div className="coc-progress-bar-wrap">
                        <div
                          className={`coc-progress-bar-fill ${isEpic ? "epic-fill" : "common-fill"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CLAN & VILLAGE */}
          {activeTab === "clan" && (
            <div className="coc-tab-pane">
              {clan ? (
                <div className="coc-clan-card">
                  <div className="coc-clan-header">
                    {clan.badgeUrls?.large && (
                      <img
                        src={clan.badgeUrls.large}
                        alt={clan.name}
                        className="coc-clan-badge-img"
                        loading="lazy"
                      />
                    )}
                    <div className="coc-clan-identity">
                      <div className="coc-clan-tag-row">
                        <span className="coc-clan-tag">{clan.tag}</span>
                        <span className="coc-clan-role">Role: {player.role?.toUpperCase()}</span>
                      </div>
                      <h3 className="coc-clan-title">{clan.name}</h3>
                      <p className="coc-clan-meta">
                        Level {clan.clanLevel} Clan • {clan.members || 46}/50 Members • {clan.warLeague?.name || "Master League III"}
                      </p>
                    </div>
                  </div>

                  {clan.description && (
                    <blockquote className="coc-clan-desc">{clan.description}</blockquote>
                  )}

                  <div className="coc-clan-stats-grid">
                    <div className="coc-clan-stat-item">
                      <span className="label">Clan War Wins</span>
                      <span className="value text-gold">{clan.warWins || 287} Wins</span>
                    </div>
                    <div className="coc-clan-stat-item">
                      <span className="label">War Win Streak</span>
                      <span className="value">{clan.warWinStreak || 0}</span>
                    </div>
                    <div className="coc-clan-stat-item">
                      <span className="label">War League</span>
                      <span className="value text-purple">{clan.warLeague?.name || "Master League III"}</span>
                    </div>
                    <div className="coc-clan-stat-item">
                      <span className="label">Clan Capital Contributions</span>
                      <span className="value text-orange">{player.clanCapitalContributions?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="coc-empty-text">No clan details available for this player.</p>
              )}

              {/* Village Highlights */}
              <div className="coc-section-heading mt-6">
                <h3>Base Defense & Records</h3>
              </div>
              <div className="coc-village-grid">
                <div className="coc-village-card">
                  <h4>🏰 Home Village</h4>
                  <ul>
                    <li><strong>Town Hall:</strong> Level {player.townHallLevel}</li>
                    <li><strong>Giga Inferno / Weapon:</strong> Level {player.townHallWeaponLevel || 1}</li>
                    <li><strong>War Stars Earned:</strong> {player.warStars?.toLocaleString()} ⭐</li>
                    <li><strong>Lifetime Best Trophies:</strong> {player.bestTrophies?.toLocaleString()} 🏆 (Legends)</li>
                  </ul>
                </div>
                <div className="coc-village-card">
                  <h4>🔨 Builder Base</h4>
                  <ul>
                    <li><strong>Builder Hall:</strong> Level {player.builderHallLevel || 10}</li>
                    <li><strong>Current Trophies:</strong> {player.builderBaseTrophies?.toLocaleString()} 🏆</li>
                    <li><strong>Best Trophies:</strong> {player.bestBuilderBaseTrophies?.toLocaleString() || 5102} 🏆</li>
                    <li><strong>League:</strong> {player.builderBaseLeague?.name || "Emerald League III"}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SPELLS & ARMY */}
          {activeTab === "spells" && (
            <div className="coc-tab-pane">
              <div className="coc-section-heading">
                <h3>Spells Inventory</h3>
                <span className="coc-section-desc">Upgraded dark and elixir spells ready for war</span>
              </div>
              <div className="coc-spells-grid">
                {spells.map((spell) => {
                  const isMax = spell.level === spell.maxLevel;
                  const pct = Math.round((spell.level / spell.maxLevel) * 100);
                  return (
                    <div key={spell.name} className={`coc-spell-card ${isMax ? "maxed" : ""}`}>
                      <div className="coc-spell-header">
                        <span className="coc-spell-name">{spell.name}</span>
                        <span className="coc-spell-level">
                          Lv {spell.level}/{spell.maxLevel}
                        </span>
                      </div>
                      <div className="coc-progress-bar-wrap">
                        <div
                          className="coc-progress-bar-fill spell-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {isMax && <span className="coc-max-pill">MAX</span>}
                    </div>
                  );
                })}
              </div>

              {/* Troops Highlights */}
              <div className="coc-section-heading mt-6">
                <h3>Army Troops & War Machines</h3>
                <span className="coc-section-desc">Summary of home village and builder base troops</span>
              </div>
              <div className="coc-army-summary-box">
                <p>
                  Total Troops Unlocked: <strong>{player.troops?.length || 62} troops</strong> across Home Village & Builder Base.
                </p>
                <div className="coc-troops-tags">
                  {player.troops
                    ?.filter((t) => t.level === t.maxLevel && t.village === "home")
                    .map((t) => (
                      <span key={t.name} className="coc-troop-tag max">
                        ⭐ {t.name} (MAX Lv {t.level})
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACHIEVEMENTS */}
          {activeTab === "achievements" && (
            <div className="coc-tab-pane">
              <div className="coc-section-heading">
                <h3>Supercell Achievements</h3>
                <span className="coc-section-desc">Major milestones and 3-star achievements completed</span>
              </div>
              <div className="coc-achievements-list">
                {achievements
                  .filter((a) => a.stars === 3)
                  .map((ach) => (
                    <div key={ach.name} className="coc-ach-item">
                      <div className="coc-ach-stars">⭐⭐⭐</div>
                      <div className="coc-ach-info">
                        <h4 className="coc-ach-title">{ach.name}</h4>
                        <p className="coc-ach-desc">{ach.info}</p>
                        {ach.completionInfo && (
                          <span className="coc-ach-sub">{ach.completionInfo}</span>
                        )}
                      </div>
                      <div className="coc-ach-status">
                        <span className="coc-ach-done-badge">COMPLETED</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
