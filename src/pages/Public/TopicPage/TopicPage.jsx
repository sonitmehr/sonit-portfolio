import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import CreditCardShowcase from "./CreditCardShowcase";
import "./TopicPage.css";

/* ── Category colour palette ── */
const CATEGORY_COLORS = [
  "#6c5ce7", "#4ecdc4", "#fd7b52", "#00b894", "#fdcb6e", "#a29bfe", "#ff7675", "#74b9ff",
];

/* ── Platform icon & label map for gaming items ── */
const PLATFORM_ICONS = { steam: "🎮", psn: "🎮", switch: "🕹️", xbox: "🎮", pc: "💻", other: "🕹️" };
const PLATFORM_LABELS = {
  steam: "Steam",
  psn: "PlayStation",
  playstation: "PlayStation",
  switch: "Nintendo Switch",
  xbox: "Xbox",
  pc: "PC",
  other: "Other"
};

/* ── Status badge ── */
const STATUS_BADGES = {
  completed:    { label: "Completed",    color: "#00b894" },
  in_progress:  { label: "In Progress",  color: "#fdcb6e" },
  todo:         { label: "To Do",        color: "#636e72" },
  proficient:   { label: "Proficient",   color: "#00b894" },
  learning:     { label: "Learning",     color: "#6c5ce7" },
  not_started:  { label: "Not Started",  color: "#636e72" },
  abandoned:    { label: "Shelved",      color: "#ff7675" },
  shelved:      { label: "Shelved",      color: "#ff7675" },
};

function ItemCard({ item, index }) {
  const statusBadge = STATUS_BADGES[item.status] || null;

  return (
    <article
      className="topic-item-card"
      style={{ "--fade-delay": `${index * 0.06}s` }}
    >
      {item.imageUrl && (
        <div className="topic-item-img-wrap">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="topic-item-img"
            loading="lazy"
            onError={(e) => (e.target.parentElement.style.display = "none")}
          />
        </div>
      )}
      <div className="topic-item-body">
        <div className="topic-item-meta">
          {item.platform && (
            <span className="topic-item-platform">
              {PLATFORM_ICONS[item.platform.toLowerCase()] || "🕹️"}{" "}
              {PLATFORM_LABELS[item.platform.toLowerCase()] || item.platform}
            </span>
          )}
          {item.category &&
            item.category.toLowerCase().trim() !== (item.platform || "").toLowerCase().trim() && (
              <span
                className="topic-item-category"
                style={{
                  backgroundColor:
                    CATEGORY_COLORS[
                      (item.category?.charCodeAt(0) || 0) % CATEGORY_COLORS.length
                    ] + "22",
                  color:
                    CATEGORY_COLORS[
                      (item.category?.charCodeAt(0) || 0) % CATEGORY_COLORS.length
                    ],
                }}
              >
                {item.category}
              </span>
            )}
          {statusBadge && (
            <span
              className="topic-item-status"
              style={{ color: statusBadge.color, borderColor: statusBadge.color + "44" }}
            >
              {statusBadge.label}
            </span>
          )}
        </div>
        <h3 className="topic-item-title">{item.title}</h3>
        {item.description && (
          <p className="topic-item-desc">{item.description}</p>
        )}
        {/* Achievement / trophy progress bar */}
        {item.achievementsTotal > 0 && (
          <div className="topic-item-progress">
            <div className="topic-progress-bar">
              <div
                className="topic-progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((item.achievementsUnlocked || 0) / item.achievementsTotal) * 100
                    )
                  )}%`,
                }}
              />
            </div>
            <span className="topic-progress-label">
              {item.achievementsUnlocked || 0}/{item.achievementsTotal} achievements
            </span>
          </div>
        )}
        {/* Trophy counts (for PSN / PlayStation) */}
        {item.trophies && (item.trophies.platinum || item.trophies.gold || item.trophies.silver || item.trophies.bronze) ? (
          <div className="topic-item-trophies">
            {item.trophies.platinum > 0 && <span className="topic-trophy-item plat" title="Platinum">🏆 {item.trophies.platinum}</span>}
            {item.trophies.gold > 0 && <span className="topic-trophy-item gold" title="Gold">🥇 {item.trophies.gold}</span>}
            {item.trophies.silver > 0 && <span className="topic-trophy-item silver" title="Silver">🥈 {item.trophies.silver}</span>}
            {item.trophies.bronze > 0 && <span className="topic-trophy-item bronze" title="Bronze">🥉 {item.trophies.bronze}</span>}
          </div>
        ) : null}
        {/* Playtime */}
        {item.playtimeMinutes > 0 && (
          <span className="topic-item-playtime">
            ⏱ {Math.round((item.playtimeMinutes / 60) * 10) / 10}h played
          </span>
        )}
      </div>
    </article>
  );
}

/* ── Default page configs for known routes ── */
const DEFAULT_PAGE_CONFIGS = {
  travel: {
    title: "Travel & Adventures",
    description: "Places I've explored and dream destinations on my bucket list.",
    seoDescription: "Explore travel stories, visited countries, and bucket list adventures by Sonit Mehrotra.",
    enabled: true,
  },
  gaming: {
    title: "Gaming Showcase & Trophies",
    description: "My gaming backlog, completions, platinum trophies, and current playthroughs.",
    seoDescription: "Track gaming achievements, trophy collections, and gaming backlog by Sonit Mehrotra.",
    enabled: true,
  },
  career: {
    title: "Career & Learning Roadmap",
    description: "Technical skills, certifications, learning goals, and career milestones.",
    seoDescription: "Professional growth, skills development roadmap, and tech achievements by Sonit Mehrotra.",
    enabled: true,
  },
  "credit-cards": {
    title: "Credit Card & Rewards Portfolio",
    description: "My curated card collection, reward strategies, and benefits breakdown.",
    seoDescription: "Curated credit card collection, reward point optimizations, and wallet showcase by Sonit Mehrotra.",
    enabled: true,
  },
};

export default function TopicPage({ slug: propSlug }) {
  const { slug: paramSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve slug from prop, URL params, or pathname (e.g. "/gaming" -> "gaming")
  const pathSlug = location.pathname.replace(/^\//, "").split("/")[0];
  const slug = propSlug || paramSlug || pathSlug;

  const [pageConfig, setPageConfig]   = useState(null);
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [gamingPlatformFilter, setGamingPlatformFilter] = useState("all");
  const [gamingStatusFilter, setGamingStatusFilter] = useState("all");
  const [gamingSortBy, setGamingSortBy] = useState("playtime");

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        // 1. Load page config
        const pageSnap = await getDoc(doc(db, "publicPages", slug));

        let config = null;
        if (pageSnap.exists()) {
          const data = pageSnap.data();
          if (data.enabled === false) {
            setNotFound(true);
            setLoading(false);
            return;
          }
          config = { ...(DEFAULT_PAGE_CONFIGS[slug] || {}), ...data };
        } else if (DEFAULT_PAGE_CONFIGS[slug]) {
          config = DEFAULT_PAGE_CONFIGS[slug];
        } else {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setPageConfig(config);

        // 2. Set SEO
        document.title = `${config.title || slug} — Sonit Mehrotra`;
        const metaDesc = document.querySelector("meta[name='description']");
        if (metaDesc) metaDesc.setAttribute("content", config.seoDescription || config.description || "");

        // 3. Load published items for this route
        let loadedItems = [];
        try {
          const showcaseSnap = await getDocs(
            query(
              collection(db, "publicShowcase"),
              where("routeSlug", "==", slug)
            )
          );
          loadedItems = showcaseSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((item) => item.isPublic !== false);
        } catch (e) {
          console.warn("Could not query publicShowcase:", e);
        }

        // Also fetch from gamingProgress if on /gaming
        if (slug === "gaming") {
          try {
            const gamingSnap = await getDocs(
              query(
                collection(db, "gamingProgress"),
                where("isPublic", "==", true)
              )
            );
            const gamingItems = gamingSnap.docs.map((d) => {
              const data = d.data();
              const cleanGenre =
                data.genre && data.genre.toLowerCase().trim() !== (data.platform || "").toLowerCase().trim()
                  ? data.genre
                  : "";
              const hasCustomNote =
                data.personalNotes &&
                !data.personalNotes.startsWith("Synced from Steam") &&
                !data.personalNotes.startsWith("Synced from PSN");

              return {
                id: d.id,
                title: data.title,
                description: hasCustomNote ? data.personalNotes : cleanGenre || "",
                imageUrl: data.coverArtUrl || null,
                platform: data.platform,
                category: cleanGenre,
                status: data.status,
                achievementsTotal: Number(data.achievementsTotal) || 0,
                achievementsUnlocked: Number(data.achievementsUnlocked) || 0,
                playtimeMinutes: (Number(data.playtimeHours) || 0) * 60 || Number(data.playtimeMinutes) || 0,
                playtimeHours: Number(data.playtimeHours) || (data.playtimeMinutes ? Math.round(Number(data.playtimeMinutes) / 6) / 10 : 0),
                trophies: data.trophies || { platinum: 0, gold: 0, silver: 0, bronze: 0 },
                rating: data.rating,
                order: data.order ?? 99,
                createdAt: data.createdAt,
              };
            });
            const existingTitles = new Set(loadedItems.map((i) => i.title?.toLowerCase().trim()));
            gamingItems.forEach((g) => {
              if (!existingTitles.has(g.title?.toLowerCase().trim())) {
                loadedItems.push(g);
              }
            });
          } catch (e) {
            console.warn("Could not query gamingProgress:", e);
          }
        }

        // Also fetch from careerGoals if on /career
        if (slug === "career") {
          try {
            const careerSnap = await getDocs(
              query(
                collection(db, "careerGoals"),
                where("isPublic", "==", true)
              )
            );
            const careerItems = careerSnap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: data.title,
                description: data.description || data.notes || "",
                imageUrl: data.imageUrl || null,
                category: data.category || data.type,
                status: data.status,
                order: data.order ?? 99,
                createdAt: data.createdAt,
              };
            });
            const existingTitles = new Set(loadedItems.map((i) => i.title?.toLowerCase().trim()));
            careerItems.forEach((c) => {
              if (!existingTitles.has(c.title?.toLowerCase().trim())) {
                loadedItems.push(c);
              }
            });
          } catch (e) {
            console.warn("Could not query careerGoals:", e);
          }
        }

        // Also fetch from bucketList if on /travel
        if (slug === "travel") {
          try {
            const bucketSnap = await getDocs(
              query(
                collection(db, "bucketList"),
                where("isPublic", "==", true)
              )
            );
            const travelItems = bucketSnap.docs
              .map((d) => {
                const data = d.data();
                return {
                  id: d.id,
                  title: data.title,
                  description: data.description || "",
                  imageUrl: data.imageUrl || null,
                  category: data.category,
                  status: data.completed ? "completed" : "in_progress",
                  order: data.order ?? 99,
                  createdAt: data.createdAt,
                };
              })
              .filter((item) => !item.category || item.category === "places" || item.category === "travel");
            const existingTitles = new Set(loadedItems.map((i) => i.title?.toLowerCase().trim()));
            travelItems.forEach((t) => {
              if (!existingTitles.has(t.title?.toLowerCase().trim())) {
                loadedItems.push(t);
              }
            });
          } catch (e) {
            console.warn("Could not query bucketList:", e);
          }
        }

        loadedItems.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setItems(loadedItems);
      } catch (err) {
        console.error("TopicPage load error:", err);
        setNotFound(true);
      }

      setLoading(false);
    };

    load();

    return () => {
      // Reset title on unmount
      document.title = "Sonit Mehrotra — Portfolio";
    };
  }, [slug]);

  /* ── Gaming Derived Statistics ── */
  const gamingStats = useMemo(() => {
    if (slug !== "gaming") return null;

    let totalMinutes = 0;
    let totalAch = 0;
    let totalAchUnlocked = 0;
    let steamCount = 0;
    let psnCount = 0;
    let steamMinutes = 0;
    let psnMinutes = 0;
    let steamAch = 0;
    let steamAchUnlocked = 0;
    let psnAch = 0;
    let psnAchUnlocked = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let shelvedCount = 0;
    const trophies = { platinum: 0, gold: 0, silver: 0, bronze: 0 };

    items.forEach((item) => {
      const minutes = item.playtimeMinutes || (Number(item.playtimeHours) || 0) * 60;
      totalMinutes += minutes;

      const achTotal = Number(item.achievementsTotal) || 0;
      const achUnlocked = Number(item.achievementsUnlocked) || 0;
      totalAch += achTotal;
      totalAchUnlocked += achUnlocked;

      if (item.status === "completed") {
        completedCount++;
      } else if (item.status === "in_progress") {
        inProgressCount++;
      } else if (item.status === "abandoned" || item.status === "shelved") {
        shelvedCount++;
      }

      const plat = (item.platform || "").toLowerCase();
      if (plat === "steam") {
        steamCount++;
        steamMinutes += minutes;
        steamAch += achTotal;
        steamAchUnlocked += achUnlocked;
      } else if (plat === "psn" || plat === "playstation") {
        psnCount++;
        psnMinutes += minutes;
        psnAch += achTotal;
        psnAchUnlocked += achUnlocked;
      }

      if (item.trophies) {
        trophies.platinum += Number(item.trophies.platinum) || 0;
        trophies.gold += Number(item.trophies.gold) || 0;
        trophies.silver += Number(item.trophies.silver) || 0;
        trophies.bronze += Number(item.trophies.bronze) || 0;
      }
    });

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const steamHours = Math.round((steamMinutes / 60) * 10) / 10;
    const psnHours = Math.round((psnMinutes / 60) * 10) / 10;
    const completionRate = totalAch > 0 ? Math.round((totalAchUnlocked / totalAch) * 100) : 0;
    const totalTrophies = trophies.platinum + trophies.gold + trophies.silver + trophies.bronze;

    return {
      totalGames: items.length,
      completedCount,
      inProgressCount,
      shelvedCount,
      totalHours,
      totalAch,
      totalAchUnlocked,
      completionRate,
      steam: {
        count: steamCount,
        hours: steamHours,
        achTotal: steamAch,
        achUnlocked: steamAchUnlocked,
      },
      psn: {
        count: psnCount,
        hours: psnHours,
        achTotal: psnAch,
        achUnlocked: psnAchUnlocked,
        trophies,
        totalTrophies,
      },
    };
  }, [items, slug]);

  /* ── Filtered & Sorted Items ── */
  const displayedItems = useMemo(() => {
    if (slug !== "gaming") return items;

    let list = [...items];

    // Status filter (in_progress vs completed vs shelved)
    if (gamingStatusFilter !== "all") {
      list = list.filter((it) => {
        if (gamingStatusFilter === "in_progress") return it.status === "in_progress";
        if (gamingStatusFilter === "completed") return it.status === "completed";
        if (gamingStatusFilter === "abandoned") return it.status === "abandoned" || it.status === "shelved";
        return true;
      });
    }

    // Platform filter
    if (gamingPlatformFilter !== "all") {
      list = list.filter((it) => {
        const p = (it.platform || "").toLowerCase();
        if (gamingPlatformFilter === "steam") return p === "steam";
        if (gamingPlatformFilter === "psn") return p === "psn" || p === "playstation";
        return true;
      });
    }

    list.sort((a, b) => {
      if (gamingSortBy === "playtime") {
        const aMin = a.playtimeMinutes || (Number(a.playtimeHours) || 0) * 60;
        const bMin = b.playtimeMinutes || (Number(b.playtimeHours) || 0) * 60;
        return bMin - aMin;
      }
      if (gamingSortBy === "completion") {
        const aRate = a.achievementsTotal > 0 ? a.achievementsUnlocked / a.achievementsTotal : 0;
        const bRate = b.achievementsTotal > 0 ? b.achievementsUnlocked / b.achievementsTotal : 0;
        return bRate - aRate;
      }
      if (gamingSortBy === "achievements") {
        return (Number(b.achievementsUnlocked) || 0) - (Number(a.achievementsUnlocked) || 0);
      }
      if (gamingSortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (gamingSortBy === "recent") {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      }
      return 0;
    });

    return list;
  }, [items, slug, gamingPlatformFilter, gamingStatusFilter, gamingSortBy]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="topic-loading">
        <div className="topic-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  /* ── 404 ── */
  if (notFound) {
    return (
      <div className="topic-notfound">
        <span className="topic-notfound-icon">🔭</span>
        <h1>Page Not Found</h1>
        <p>This topic page doesn't exist or hasn't been published yet.</p>
        <button className="topic-back-btn" onClick={() => navigate("/")}>
          ← Back to Portfolio
        </button>
      </div>
    );
  }

  const isCreditCards = slug === "credit-cards";
  const isGaming = slug === "gaming";

  return (
    <div className="topic-page">
      {/* ── Hero ── */}
      <header
        className="topic-hero"
        style={
          pageConfig?.heroImageUrl
            ? { backgroundImage: `url(${pageConfig.heroImageUrl})` }
            : {}
        }
      >
        <div className="topic-hero-overlay" />
        <div className="topic-hero-content">
          <h1 className="topic-hero-title">{pageConfig?.title || slug}</h1>
          {pageConfig?.description && (
            <p className="topic-hero-desc">{pageConfig.description}</p>
          )}

          {/* ── Gaming Hero Element (Statistics & Controls Under Back Button) ── */}
          {isGaming && gamingStats && (
            <div id="gaming-hero-element" className="gaming-hero-container">
              {/* Metrics Grid */}
              <div id="gaming-hero-stats" className="gaming-stats-grid">
                <div className="gaming-stat-card">
                  <div className="gaming-stat-icon">⏱️</div>
                  <div className="gaming-stat-info">
                    <span className="gaming-stat-value">{gamingStats.totalHours} hrs</span>
                    <span className="gaming-stat-label">Total Playtime</span>
                    <span className="gaming-stat-sub">
                      Steam: {gamingStats.steam.hours}h • PSN: {gamingStats.psn.hours}h
                    </span>
                  </div>
                </div>

                <div className="gaming-stat-card">
                  <div className="gaming-stat-icon">🎯</div>
                  <div className="gaming-stat-info">
                    <span className="gaming-stat-value">
                      {gamingStats.totalAchUnlocked}
                      <span className="gaming-stat-total"> / {gamingStats.totalAch}</span>
                    </span>
                    <span className="gaming-stat-label">Achievements</span>
                    <div className="gaming-stat-progress-bar">
                      <div
                        className="gaming-stat-progress-fill"
                        style={{ width: `${gamingStats.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="gaming-stat-card">
                  <div className="gaming-stat-icon">⚡</div>
                  <div className="gaming-stat-info">
                    <span className="gaming-stat-value">{gamingStats.completionRate}%</span>
                    <span className="gaming-stat-label">Completion Rate</span>
                    <span className="gaming-stat-sub">
                      {gamingStats.completedCount} / {gamingStats.totalGames} Conquered
                    </span>
                  </div>
                </div>

                <div className="gaming-stat-card">
                  <div className="gaming-stat-icon">🎮</div>
                  <div className="gaming-stat-info">
                    <span className="gaming-stat-value">{gamingStats.totalGames} Games</span>
                    <span className="gaming-stat-label">Platforms & Trophies</span>
                    <span className="gaming-stat-sub">
                      Steam: {gamingStats.steam.count} • PSN: {gamingStats.psn.count}
                      {gamingStats.psn.totalTrophies > 0 ? (
                        <span className="gaming-trophies-badge">
                          (🏆 {gamingStats.psn.trophies.platinum}P {gamingStats.psn.trophies.gold}G)
                        </span>
                      ) : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls: Filter & Sort Bar */}
              <div id="gaming-hero-controls" className="gaming-controls-row">
                <div className="gaming-filters-group">
                  {/* Status Filter (In Progress / Completed) */}
                  <div className="gaming-filter-pills" role="group" aria-label="Status Filter">
                    <button
                      type="button"
                      className={`gaming-pill-btn ${gamingStatusFilter === "all" ? "active" : ""}`}
                      onClick={() => setGamingStatusFilter("all")}
                    >
                      All Status
                    </button>
                    <button
                      type="button"
                      className={`gaming-pill-btn gaming-pill-in-progress ${gamingStatusFilter === "in_progress" ? "active" : ""}`}
                      onClick={() => setGamingStatusFilter("in_progress")}
                    >
                      🕹️ In Progress ({gamingStats.inProgressCount})
                    </button>
                    <button
                      type="button"
                      className={`gaming-pill-btn gaming-pill-completed ${gamingStatusFilter === "completed" ? "active" : ""}`}
                      onClick={() => setGamingStatusFilter("completed")}
                    >
                      🏆 Completed ({gamingStats.completedCount})
                    </button>
                    <button
                      type="button"
                      className={`gaming-pill-btn gaming-pill-shelved ${gamingStatusFilter === "abandoned" ? "active" : ""}`}
                      onClick={() => setGamingStatusFilter("abandoned")}
                    >
                      📦 Shelved ({gamingStats.shelvedCount || 0})
                    </button>
                  </div>

                  <div className="gaming-filter-divider" />

                  {/* Platform Filter */}
                  <div className="gaming-filter-pills" role="group" aria-label="Platform Filter">
                    <button
                      type="button"
                      className={`gaming-pill-btn ${gamingPlatformFilter === "all" ? "active" : ""}`}
                      onClick={() => setGamingPlatformFilter("all")}
                    >
                      All Platforms ({gamingStats.totalGames})
                    </button>
                    <button
                      type="button"
                      className={`gaming-pill-btn ${gamingPlatformFilter === "steam" ? "active" : ""}`}
                      onClick={() => setGamingPlatformFilter("steam")}
                    >
                      🎮 Steam ({gamingStats.steam.count})
                    </button>
                    <button
                      type="button"
                      className={`gaming-pill-btn ${gamingPlatformFilter === "psn" ? "active" : ""}`}
                      onClick={() => setGamingPlatformFilter("psn")}
                    >
                      🎮 PlayStation ({gamingStats.psn.count})
                    </button>
                  </div>
                </div>

                <div className="gaming-sort-wrapper">
                  <label className="gaming-sort-label" htmlFor="gaming-sort-select">
                    Sort by:
                  </label>
                  <select
                    id="gaming-sort-select"
                    className="gaming-sort-dropdown"
                    value={gamingSortBy}
                    onChange={(e) => setGamingSortBy(e.target.value)}
                  >
                    <option value="playtime">⏱️ Most Played</option>
                    <option value="completion">⚡ Completion %</option>
                    <option value="achievements">🎯 Achievements</option>
                    <option value="title">🔤 Title (A to Z)</option>
                    <option value="recent">📅 Date Added</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="topic-body">
        {/* Credit Cards: use specialized showcase component */}
        {isCreditCards ? (
          <CreditCardShowcase />
        ) : displayedItems.length === 0 ? (
          <div className="topic-empty">
            <span className="topic-empty-icon">{items.length > 0 ? "🔍" : "📭"}</span>
            <h2>{items.length > 0 ? "No matching games found" : "Nothing published here yet"}</h2>
            <p>
              {items.length > 0
                ? "Try clearing or changing your status or platform filters."
                : "The admin hasn't published any items to this page yet. Check back soon!"}
            </p>
            {items.length > 0 && (
              <button
                type="button"
                className="topic-reset-btn"
                onClick={() => {
                  setGamingStatusFilter("all");
                  setGamingPlatformFilter("all");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="topic-grid">
            {displayedItems.map((item, i) => (
              <ItemCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="topic-footer">
        <button className="topic-back-btn" onClick={() => navigate("/")}>
          ← Back to Portfolio
        </button>
        <p className="topic-footer-copy">
          Made with ❤️ by Sonit Mehrotra
        </p>
      </footer>
    </div>
  );
}
