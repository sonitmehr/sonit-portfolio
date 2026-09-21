import React, { useState, useEffect } from "react";
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

/* ── Platform icon map for gaming items ── */
const PLATFORM_ICONS = { steam: "🎮", psn: "🎮", switch: "🕹️", xbox: "🎮", pc: "💻", other: "🕹️" };

/* ── Status badge ── */
const STATUS_BADGES = {
  completed:    { label: "Completed",    color: "#00b894" },
  in_progress:  { label: "In Progress",  color: "#fdcb6e" },
  todo:         { label: "To Do",        color: "#636e72" },
  proficient:   { label: "Proficient",   color: "#00b894" },
  learning:     { label: "Learning",     color: "#6c5ce7" },
  not_started:  { label: "Not Started",  color: "#636e72" },
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
              {PLATFORM_ICONS[item.platform] || "🕹️"} {item.platform}
            </span>
          )}
          {item.category && (
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
        {/* Playtime */}
        {item.playtimeMinutes > 0 && (
          <span className="topic-item-playtime">
            ⏱ {Math.round(item.playtimeMinutes / 60)}h played
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
              return {
                id: d.id,
                title: data.title,
                description: data.personalNotes || data.genre || "",
                imageUrl: data.coverArtUrl || null,
                platform: data.platform,
                category: data.genre,
                status: data.status,
                achievementsTotal: Number(data.achievementsTotal) || 0,
                achievementsUnlocked: Number(data.achievementsUnlocked) || 0,
                playtimeMinutes: (Number(data.playtimeHours) || 0) * 60,
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
          <button className="topic-back-link" onClick={() => navigate("/")}>
            ← Sonit's Portfolio
          </button>
          <h1 className="topic-hero-title">{pageConfig?.title || slug}</h1>
          {pageConfig?.description && (
            <p className="topic-hero-desc">{pageConfig.description}</p>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="topic-body">
        {/* Credit Cards: use specialized showcase component */}
        {isCreditCards ? (
          <CreditCardShowcase />
        ) : items.length === 0 ? (
          <div className="topic-empty">
            <span className="topic-empty-icon">📭</span>
            <h2>Nothing published here yet</h2>
            <p>
              The admin hasn't published any items to this page yet. Check back
              soon!
            </p>
          </div>
        ) : (
          <div className="topic-grid">
            {items.map((item, i) => (
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
