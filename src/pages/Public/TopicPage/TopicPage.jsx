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
import * as cache from "../../../lib/cache";
import CreditCardShowcase from "./CreditCardShowcase";
import ClashOfClansModal from "../../../components/Gaming/ClashOfClansModal";
import {
  TrophyIcon,
  PlatformIcon,
  SteamRibbonIcon,
  GamingPlatformTag,
} from "../../../components/Gaming/GamingIcons";
import "./TopicPage.css";


/* Cache TTL: 1 hour for public page data */
const CACHE_TTL = 60 * 60 * 1000;

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
/* ── Status badge ── */
const STATUS_BADGES = {
  completed:    { label: "Completed",    color: "#00b894" },
  in_progress:  { label: "Playing Now",  color: "#4ECDC4" },
  todo:         { label: "To Do",        color: "#636e72" },
  proficient:   { label: "Proficient",   color: "#00b894" },
  learning:     { label: "Learning",     color: "#6c5ce7" },
  not_started:  { label: "Backlog",      color: "#a29bfe" },
  abandoned:    { label: "Backlog",      color: "#a29bfe" },
  shelved:      { label: "Backlog",      color: "#a29bfe" },
};

function ItemCard({ item, index, isHighlighted = false, onOpenCocModal }) {
  const statusBadge = STATUS_BADGES[item.status] || null;
  const isPlaying = isHighlighted || item.status === "in_progress";
  const normPlatform = String(item.platform || "").toLowerCase().trim();
  const isPsn = normPlatform === "psn" || normPlatform === "playstation";
  const isSupercell =
    normPlatform === "supercell" ||
    normPlatform === "coc" ||
    item.isCoc ||
    (item.title && item.title.toLowerCase().includes("clash of clans"));

  const handleCardClick = () => {
    if (isSupercell && onOpenCocModal) {
      onOpenCocModal(item);
    }
  };

  const handleKeyDown = (e) => {
    if (isSupercell && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpenCocModal && onOpenCocModal(item);
    }
  };

  return (
    <article
      className={`topic-item-card ${isPlaying ? "topic-item-card-playing" : ""} ${isSupercell ? "topic-item-card-coc" : ""}`}
      style={{ "--fade-delay": `${index * 0.06}s` }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role={isSupercell ? "button" : undefined}
      tabIndex={isSupercell ? 0 : undefined}
      aria-label={isSupercell ? `View Clash of Clans village and hero details for ${item.title}` : undefined}
    >
      {item.imageUrl && (
        <div className={`topic-item-img-wrap ${isSupercell ? "topic-item-img-wrap-coc" : ""}`}>
          {isSupercell && (
            <div
              className="topic-item-img-blur-bg"
              style={{ backgroundImage: `url(${item.imageUrl})` }}
              aria-hidden="true"
            />
          )}
          <img
            src={item.imageUrl}
            alt={item.title}
            className={`topic-item-img ${isSupercell ? "topic-item-img-coc" : ""}`}
            loading="lazy"
            onError={(e) => (e.target.parentElement.style.display = "none")}
          />
        </div>
      )}
      <div className="topic-item-body">
        <div className="topic-item-meta">
          {item.platform && (
            <span
              className="topic-platform-logo-wrap"
              title={isSupercell ? "Supercell" : isPsn ? "PlayStation" : "Steam"}
            >
              <PlatformIcon
                platform={item.platform}
                size={16}
                variant={isPsn ? "white" : "default"}
              />
            </span>
          )}
          {/* Completed status: for PSN show platinum icon in place of "completed"; for Steam show ribbon without "Perfect" */}
          {item.status === "completed" ? (
            isPsn ? (
              <span className="topic-status-icon-wrap" title="Platinum">
                <TrophyIcon type="platinum" size={18} />
              </span>
            ) : (
              <span className="topic-status-icon-wrap" title="100% Achievements Unlocked">
                <SteamRibbonIcon size={18} />
              </span>
            )
          ) : null}
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
        {!isSupercell && item.trophies && (item.trophies.platinum || item.trophies.gold || item.trophies.silver || item.trophies.bronze) ? (
          <div className="topic-item-trophies">
            {item.trophies.platinum > 0 && (
              <span className="topic-trophy-item plat" title="Platinum Trophy">
                <TrophyIcon type="platinum" size={15} /> <span>{item.trophies.platinum}</span>
              </span>
            )}
            {item.trophies.gold > 0 && (
              <span className="topic-trophy-item gold" title="Gold Trophy">
                <TrophyIcon type="gold" size={15} /> <span>{item.trophies.gold}</span>
              </span>
            )}
            {item.trophies.silver > 0 && (
              <span className="topic-trophy-item silver" title="Silver Trophy">
                <TrophyIcon type="silver" size={15} /> <span>{item.trophies.silver}</span>
              </span>
            )}
            {item.trophies.bronze > 0 && (
              <span className="topic-trophy-item bronze" title="Bronze Trophy">
                <TrophyIcon type="bronze" size={15} /> <span>{item.trophies.bronze}</span>
              </span>
            )}
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
  const [selectedCocItem, setSelectedCocItem] = useState(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      // ── Check cache first (show immediately, then revalidate in background) ──
      const cachedPayload = cache.get(`topic-${slug}`);
      if (cachedPayload) {
        const { config: cachedConfig, items: cachedItems } = cachedPayload;
        if (cachedConfig) setPageConfig(cachedConfig);
        if (cachedItems) setItems(cachedItems);
        if (cachedConfig) {
          document.title = `${cachedConfig.title || slug} — Sonit Mehrotra`;
          const metaDesc = document.querySelector("meta[name='description']");
          if (metaDesc) metaDesc.setAttribute("content", cachedConfig.seoDescription || cachedConfig.description || "");
        }
        setLoading(false);
      }
      // ──────────────────────────────────────────────────────────────────────

      // 1. Resolve page config (default to built-in config if known)
      let config = DEFAULT_PAGE_CONFIGS[slug] || null;

      try {
        const pageSnap = await getDoc(doc(db, "publicPages", slug));
        if (pageSnap.exists()) {
          const data = pageSnap.data();
          if (data.enabled === false) {
            setNotFound(true);
            setLoading(false);
            return;
          }
          config = { ...(DEFAULT_PAGE_CONFIGS[slug] || {}), ...data };
        }
      } catch (err) {
        console.warn(`Could not load Firestore publicPages config for /${slug}, using default:`, err);
      }

      if (!config) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPageConfig(config);

      try {
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

              const isSupercellItem =
                (data.platform || "").toLowerCase() === "supercell" ||
                (data.platform || "").toLowerCase() === "coc" ||
                (data.title && data.title.toLowerCase().includes("clash of clans"));

              return {
                id: d.id,
                title: data.title,
                description: hasCustomNote ? data.personalNotes : cleanGenre || "",
                imageUrl:
                  data.coverArtUrl === "/icons/gaming/clash-of-clans-cover.jpg"
                    ? "/icons/gaming/coc/clash-of-clans-cover.jpg"
                    : data.coverArtUrl || (isSupercellItem ? "/icons/gaming/coc/clash-of-clans-cover.jpg" : null),
                platform: data.platform,
                category: cleanGenre,
                status: data.status,
                achievementsTotal: Number(data.achievementsTotal) || 0,
                achievementsUnlocked: Number(data.achievementsUnlocked) || 0,
                playtimeMinutes: (Number(data.playtimeHours) || 0) * 60 || Number(data.playtimeMinutes) || 0,
                playtimeHours: Number(data.playtimeHours) || (data.playtimeMinutes ? Math.round(Number(data.playtimeMinutes) / 6) / 10 : 0),
                trophies: data.trophies || { platinum: 0, gold: 0, silver: 0, bronze: 0 },
                rating: data.rating,
                order: data.order ?? (isSupercellItem ? 0 : 99),
                createdAt: data.createdAt,
                cocData: data.cocData || null,
                isCoc: isSupercellItem,
              };
            });
            const existingTitles = new Set(loadedItems.map((i) => i.title?.toLowerCase().trim()));
            gamingItems.forEach((g) => {
              if (!existingTitles.has(g.title?.toLowerCase().trim())) {
                loadedItems.push(g);
              }
            });

            // Also check local Clash of Clans API proxy for live profile data
            try {
              const cocRes = await fetch("/api/coc/player").catch(() => null);
              if (cocRes && cocRes.ok) {
                const cocJson = await cocRes.json();
                if (cocJson.success && cocJson.game) {
                  const liveCoc = {
                    ...cocJson.game,
                    imageUrl: cocJson.game.coverArtUrl || "/icons/gaming/coc/clash-of-clans-cover.jpg",
                    isCoc: true,
                    cocData: cocJson.game.cocData || cocJson.player,
                    order: 0,
                  };
                  const existingIdx = loadedItems.findIndex(
                    (i) =>
                      (i.platform || "").toLowerCase() === "supercell" ||
                      (i.platform || "").toLowerCase() === "coc" ||
                      (i.title && i.title.toLowerCase().includes("clash of clans"))
                  );
                  if (existingIdx !== -1) {
                    loadedItems[existingIdx] = {
                      ...loadedItems[existingIdx],
                      ...liveCoc,
                    };
                  } else {
                    loadedItems.unshift(liveCoc);
                  }
                }
              }
            } catch (err) {
              console.warn("Local CoC fetch notice:", err);
            }
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

        // ── Persist to cache for 1 hour ──────────────────────────────────────
        // Firestore Timestamps are not JSON-serialisable — strip them before caching
        const serializableItems = loadedItems.map(({ createdAt, ...rest }) => rest);
        cache.set(`topic-${slug}`, { config, items: serializableItems }, CACHE_TTL);
        // ────────────────────────────────────────────────────────────────────

      } catch (err) {
        console.error("TopicPage load error:", err);
        if (!DEFAULT_PAGE_CONFIGS[slug]) {
          setNotFound(true);
        }
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
    let supercellCount = 0;
    let steamMinutes = 0;
    let psnMinutes = 0;
    let steamAch = 0;
    let steamAchUnlocked = 0;
    let steamCompletedCount = 0;
    let psnAch = 0;
    let psnAchUnlocked = 0;
    let psnCompletedCount = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let backlogCount = 0;
    const trophies = { platinum: 0, gold: 0, silver: 0, bronze: 0 };

    items.forEach((item) => {
      const minutes = item.playtimeMinutes || (Number(item.playtimeHours) || 0) * 60;
      totalMinutes += minutes;

      const achTotal = Number(item.achievementsTotal) || 0;
      const achUnlocked = Number(item.achievementsUnlocked) || 0;
      totalAch += achTotal;
      totalAchUnlocked += achUnlocked;

      const isCompleted = item.status === "completed";
      if (isCompleted) {
        completedCount++;
      } else if (item.status === "in_progress") {
        inProgressCount++;
      } else {
        backlogCount++;
      }

      const plat = (item.platform || "").toLowerCase();
      if (plat === "steam") {
        steamCount++;
        steamMinutes += minutes;
        steamAch += achTotal;
        steamAchUnlocked += achUnlocked;
        if (isCompleted) steamCompletedCount++;
      } else if (plat === "psn" || plat === "playstation") {
        psnCount++;
        psnMinutes += minutes;
        psnAch += achTotal;
        psnAchUnlocked += achUnlocked;
        if (isCompleted) psnCompletedCount++;
      } else if (plat === "supercell" || plat === "coc" || item.isCoc) {
        supercellCount++;
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
      backlogCount,
      shelvedCount: backlogCount,
      totalHours,
      totalAch,
      totalAchUnlocked,
      completionRate,
      steam: {
        count: steamCount,
        hours: steamHours,
        achTotal: steamAch,
        achUnlocked: steamAchUnlocked,
        completedCount: steamCompletedCount,
      },
      psn: {
        count: psnCount,
        hours: psnHours,
        achTotal: psnAch,
        achUnlocked: psnAchUnlocked,
        completedCount: psnCompletedCount,
        trophies,
        totalTrophies,
      },
      supercell: {
        count: supercellCount,
      },
    };
  }, [items, slug]);

  /* ── Filtered & Curated Gaming Items ── */
  const displayedItems = useMemo(() => {
    if (slug !== "gaming") return items;

    let list = [...items];

    // Status filter (in_progress vs completed vs backlog)
    if (gamingStatusFilter !== "all") {
      list = list.filter((it) => {
        if (gamingStatusFilter === "in_progress") return it.status === "in_progress";
        if (gamingStatusFilter === "completed") return it.status === "completed";
        if (gamingStatusFilter === "backlog" || gamingStatusFilter === "abandoned") {
          return it.status !== "in_progress" && it.status !== "completed";
        }
        return true;
      });
    }

    // Platform filter
    if (gamingPlatformFilter !== "all") {
      list = list.filter((it) => {
        const p = (it.platform || "").toLowerCase();
        if (gamingPlatformFilter === "steam") return p === "steam";
        if (gamingPlatformFilter === "psn") return p === "psn" || p === "playstation";
        if (gamingPlatformFilter === "supercell") return p === "supercell" || p === "coc" || it.isCoc;
        return true;
      });
    }

    // Fixed curated ranking: order first, then playtime descending, then achievements
    list.sort((a, b) => {
      const aOrder = a.order ?? 99;
      const bOrder = b.order ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aMin = a.playtimeMinutes || (Number(a.playtimeHours) || 0) * 60;
      const bMin = b.playtimeMinutes || (Number(b.playtimeHours) || 0) * 60;
      if (bMin !== aMin) return bMin - aMin;
      return (Number(b.achievementsUnlocked) || 0) - (Number(a.achievementsUnlocked) || 0);
    });

    return list;
  }, [items, slug, gamingPlatformFilter, gamingStatusFilter]);


  // Curated gaming tiers: 1. Playing Now -> 2. Completed -> 3. Backlog
  const playingNowGames = useMemo(() => {
    return displayedItems.filter((it) => it.status === "in_progress");
  }, [displayedItems]);

  const completedGames = useMemo(() => {
    return displayedItems.filter((it) => it.status === "completed");
  }, [displayedItems]);

  const backlogGames = useMemo(() => {
    return displayedItems.filter((it) => it.status !== "in_progress" && it.status !== "completed");
  }, [displayedItems]);

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
                  <div className="gaming-stat-info">
                    <span className="gaming-stat-value">{gamingStats.totalHours} hrs</span>
                    <span className="gaming-stat-label">Total Playtime</span>
                    <span className="gaming-stat-sub" style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <PlatformIcon platform="steam" size={12} /> {gamingStats.steam.hours}h
                      </span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <PlatformIcon platform="psn" size={12} /> {gamingStats.psn.hours}h
                      </span>
                    </span>
                  </div>
                </div>

                <div className="gaming-stat-card">
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
                  <div className="gaming-stat-info">
                    <span className="gaming-stat-value">{gamingStats.completionRate}%</span>
                    <span className="gaming-stat-label">Completion Rate</span>
                  </div>
                </div>

                <div className="gaming-stat-card">
                  <div className="gaming-stat-info">
                    <span className="gaming-stat-value">{gamingStats.totalGames} Games</span>
                    <span className="gaming-stat-label">Platforms & Trophies</span>
                    <span className="gaming-stat-sub" style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <PlatformIcon platform="steam" size={12} /> {gamingStats.steam.count}
                      </span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <PlatformIcon platform="psn" size={12} /> {gamingStats.psn.count}
                      </span>
                      {gamingStats.supercell?.count > 0 && (
                        <>
                          <span>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <PlatformIcon platform="supercell" size={12} /> {gamingStats.supercell.count}
                          </span>
                        </>
                      )}
                      {(gamingStats.psn.trophies.platinum > 0 || (gamingStats.steam.completedCount || 0) > 0) && (
                        <>
                          <span>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            {gamingStats.psn.trophies.platinum > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }} title={`${gamingStats.psn.trophies.platinum} Platinum Trophies`}>
                                {gamingStats.psn.trophies.platinum}
                                <TrophyIcon type="platinum" size={13} />
                              </span>
                            )}
                            {(gamingStats.steam.completedCount || 0) > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }} title={`${gamingStats.steam.completedCount} Steam 100% Completions`}>
                                {gamingStats.steam.completedCount}
                                <SteamRibbonIcon size={14} />
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls: Filter Bar (Sort removed to preserve curated display) */}
              <div id="gaming-hero-controls" className="gaming-controls-row">
                <div className="gaming-filters-group">
                  {/* Status Filter (Playing Now / Completed / Backlog) */}
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
                      🕹️ Playing Now ({gamingStats.inProgressCount})
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
                      className={`gaming-pill-btn gaming-pill-shelved ${gamingStatusFilter === "backlog" || gamingStatusFilter === "abandoned" ? "active" : ""}`}
                      onClick={() => setGamingStatusFilter("backlog")}
                    >
                      📦 Backlog ({gamingStats.backlogCount || 0})
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
                      title="Steam"
                    >
                      <PlatformIcon platform="steam" size={16} /> ({gamingStats.steam.count})
                    </button>
                    <button
                      type="button"
                      className={`gaming-pill-btn ${gamingPlatformFilter === "psn" ? "active" : ""}`}
                      onClick={() => setGamingPlatformFilter("psn")}
                      title="PlayStation"
                    >
                      <PlatformIcon platform="psn" size={16} /> ({gamingStats.psn.count})
                    </button>
                    {gamingStats.supercell?.count > 0 && (
                      <button
                        type="button"
                        className={`gaming-pill-btn ${gamingPlatformFilter === "supercell" ? "active" : ""}`}
                        onClick={() => setGamingPlatformFilter("supercell")}
                        title="Supercell"
                      >
                        <PlatformIcon platform="supercell" size={16} /> ({gamingStats.supercell.count})
                      </button>
                    )}
                  </div>
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
        ) : isGaming ? (
          <div className="gaming-sections-container">
            {/* 1. Playing Now (highlighted first, if any) */}
            {playingNowGames.length > 0 && (
              <section className="gaming-section gaming-section-playing">
                <div className="gaming-section-header">
                  <div className="gaming-section-title-wrap">
                    <h2 className="gaming-section-title">Playing Now</h2>
                  </div>
                  <span className="gaming-section-count">
                    {playingNowGames.length} {playingNowGames.length === 1 ? "game" : "games"}
                  </span>
                </div>
                <div className="topic-grid gaming-grid-playing">
                  {playingNowGames.map((item, i) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      index={i}
                      isHighlighted={true}
                      onOpenCocModal={setSelectedCocItem}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 2. Completed (with spacing below Playing Now, if any) */}
            {completedGames.length > 0 && (
              <section className="gaming-section gaming-section-completed">
                <div className="gaming-section-header">
                  <div className="gaming-section-title-wrap">
                    <h2 className="gaming-section-title">Completed</h2>
                  </div>
                  <span className="gaming-section-count">
                    {completedGames.length} {completedGames.length === 1 ? "game" : "games"}
                  </span>
                </div>
                <div className="topic-grid">
                  {completedGames.map((item, i) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      index={i}
                      onOpenCocModal={setSelectedCocItem}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 3. Backlog (lower most section, if any) */}
            {backlogGames.length > 0 && (
              <section className="gaming-section gaming-section-backlog">
                <div className="gaming-section-header">
                  <div className="gaming-section-title-wrap">
                    <h2 className="gaming-section-title">Backlog</h2>
                  </div>
                  <span className="gaming-section-count">
                    {backlogGames.length} {backlogGames.length === 1 ? "game" : "games"}
                  </span>
                </div>
                <div className="topic-grid gaming-grid-backlog">
                  {backlogGames.map((item, i) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      index={i}
                      onOpenCocModal={setSelectedCocItem}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="topic-grid">
            {displayedItems.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                onOpenCocModal={setSelectedCocItem}
              />
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

      {/* ── Clash of Clans Village Showcase Modal ── */}
      <ClashOfClansModal
        isOpen={Boolean(selectedCocItem)}
        onClose={() => setSelectedCocItem(null)}
        cocData={selectedCocItem?.cocData}
        onRefresh={async () => {
          try {
            const res = await fetch("/api/coc/player");
            if (res.ok) {
              const json = await res.json();
              if (json.success && json.game) {
                setSelectedCocItem((prev) => ({
                  ...prev,
                  ...json.game,
                  cocData: json.game.cocData || json.player,
                }));
              }
            }
          } catch (e) {
            console.warn("Refresh error:", e);
          }
        }}
      />
    </div>
  );
}

