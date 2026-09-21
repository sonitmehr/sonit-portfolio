import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import "./ExploreMore.css";

const CACHE_KEY = "explore_more_config";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const DEFAULT_ROUTES = [
  {
    slug: "travel",
    label: "Travel",
    icon: "✈️",
    description: "Places I've been and dream destinations on my bucket list.",
    gradient: "linear-gradient(135deg, #4ecdc4, #44a3ab)",
    enabled: true,
    order: 1,
  },
  {
    slug: "gaming",
    label: "Gaming",
    icon: "🎮",
    description: "My gaming backlog, completions, and trophy progress.",
    gradient: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
    enabled: true,
    order: 2,
  },
  {
    slug: "career",
    label: "Career",
    icon: "🚀",
    description: "Skills roadmap, learning goals, and career milestones.",
    gradient: "linear-gradient(135deg, #fd7b52, #fdcb6e)",
    enabled: true,
    order: 3,
  },
  {
    slug: "credit-cards",
    label: "Credit Cards",
    icon: "💳",
    description: "My card collection — rewards, benefits, and wallet showcase.",
    gradient: "linear-gradient(135deg, #00b894, #55efc4)",
    enabled: true,
    order: 4,
  },
];

const ROUTE_META = {
  travel: {
    label: "Travel",
    icon: "✈️",
    description: "Places I've been and dream destinations on my bucket list.",
    gradient: "linear-gradient(135deg, #4ecdc4, #44a3ab)",
    order: 1,
  },
  gaming: {
    label: "Gaming",
    icon: "🎮",
    description: "My gaming backlog, completions, and trophy progress.",
    gradient: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
    order: 2,
  },
  career: {
    label: "Career",
    icon: "🚀",
    description: "Skills roadmap, learning goals, and career milestones.",
    gradient: "linear-gradient(135deg, #fd7b52, #fdcb6e)",
    order: 3,
  },
  "credit-cards": {
    label: "Credit Cards",
    icon: "💳",
    description: "My card collection — rewards, benefits, and wallet showcase.",
    gradient: "linear-gradient(135deg, #00b894, #55efc4)",
    order: 4,
  },
};

function ExploreMore() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRoutes = async () => {
      // Check localStorage cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setRoutes(data);
            setLoading(false);
            return;
          }
        }
      } catch (_) {}

      // Fetch from Firestore
      try {
        // 1. Try reading publicPages collection first
        const pagesSnap = await getDocs(collection(db, "publicPages"));
        if (!pagesSnap.empty) {
          const compiled = [];
          pagesSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const slug = docSnap.id;
            if (data.enabled) {
              compiled.push({
                slug,
                label: data.label || data.title || ROUTE_META[slug]?.label || slug,
                icon: data.icon || ROUTE_META[slug]?.icon || "🔗",
                description:
                  data.description ||
                  ROUTE_META[slug]?.description ||
                  `Explore my ${data.label || slug} page.`,
                gradient:
                  data.gradient ||
                  ROUTE_META[slug]?.gradient ||
                  "linear-gradient(135deg, #636e72, #b2bec3)",
                enabled: true,
                order: data.order ?? ROUTE_META[slug]?.order ?? 99,
              });
            }
          });

          if (compiled.length > 0) {
            compiled.sort((a, b) => (a.order || 99) - (b.order || 99));
            setRoutes(compiled);
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ data: compiled, timestamp: Date.now() })
            );
            setLoading(false);
            return;
          }
        }

        // 2. Fallback to config/site if present
        const siteRef = doc(db, "config", "site");
        const snap = await getDoc(siteRef);
        if (snap.exists()) {
          const data = snap.data();
          const publicRoutes = data.publicRoutes || {};
          const compiled = Object.entries(publicRoutes)
            .filter(([, r]) => r.enabled)
            .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))
            .map(([slug, r]) => ({
              slug,
              label: r.label || slug,
              icon: r.icon || "🔗",
              description:
                ROUTE_META[slug]?.description ||
                `Explore my ${r.label || slug} page.`,
              gradient:
                ROUTE_META[slug]?.gradient ||
                "linear-gradient(135deg, #636e72, #b2bec3)",
              enabled: r.enabled,
              order: r.order,
            }));

          if (compiled.length > 0) {
            setRoutes(compiled);
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ data: compiled, timestamp: Date.now() })
            );
            setLoading(false);
            return;
          }
        }

        // 3. Defaults fallback
        setRoutes(DEFAULT_ROUTES);
      } catch (err) {
        console.warn("ExploreMore: Using default routes fallback:", err.message);
        setRoutes(DEFAULT_ROUTES);
      }

      setLoading(false);
    };

    loadRoutes();
  }, []);

  if (loading || routes.length === 0) return null;

  return (
    <section id="explore-more" className="explore-more-section">
      <div className="explore-more-container">
        <div className="explore-more-header">
          <span className="explore-more-eyebrow">Beyond the Portfolio</span>
          <h2 className="explore-more-title">Get to Know Me Better</h2>
          <p className="explore-more-desc">
            I track a lot more than just code. Explore my personal projects,
            adventures, and collections.
          </p>
        </div>

        <div className="explore-more-grid">
          {routes.map((route, idx) => (
            <div
              key={route.slug}
              className="explore-card"
              style={{ "--card-gradient": route.gradient, "--delay": `${idx * 0.1}s` }}
              onClick={() => navigate(`/${route.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/${route.slug}`)}
            >
              <div className="explore-card-glow" />
              <div className="explore-card-inner">
                <div className="explore-card-icon">{route.icon}</div>
                <div className="explore-card-body">
                  <h3 className="explore-card-title">{route.label}</h3>
                  <p className="explore-card-desc">{route.description}</p>
                </div>
                <div className="explore-card-cta">
                  <span>Explore</span>
                  <span className="explore-card-arrow">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ExploreMore;
