/**
 * Firebase Cloud Functions — Sonit Portfolio Gaming Sync
 *
 * Functions:
 *   syncSteamGames      — Scheduled monthly cron (1st of month, 02:00 IST)
 *   syncPSNGames        — Scheduled monthly cron (1st of month, 02:30 IST)
 *   triggerGamingSync   — HTTPS Callable (admin on-demand from any device)
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { defineString } = require("firebase-functions/params");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

// PSN API imports
const {
  exchangeNpssoForCode,
  exchangeCodeForAccessToken,
  getUserTitles,
  getUserPlayedGames,
  getTitleTrophies,
  getUserTrophiesEarnedForTitle,
} = require("psn-api");

initializeApp();
const db = getFirestore();

// ── Environment params ─────────────────────────────────────────────────────
const STEAM_API_KEY = defineString("STEAM_API_KEY");
const STEAM_ID = defineString("STEAM_ID");
const PSN_NPSSO = defineString("PSN_NPSSO");
const ADMIN_UID = defineString("ADMIN_UID");

// ── Helpers ────────────────────────────────────────────────────────────────
function parsePlayDuration(durationStr) {
  if (!durationStr) return { hours: 0, minutes: 0 };
  const h = (durationStr.match(/(\d+)H/) || [])[1] || 0;
  const m = (durationStr.match(/(\d+)M/) || [])[1] || 0;
  const hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  return {
    hours: Math.round((hours + minutes / 60) * 10) / 10,
    minutes: hours * 60 + minutes,
  };
}

function cleanTitle(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[™®©]/g, "")
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\s*ps[45].*$/i, "")
    .replace(/\s+trophies\s*$/i, "")
    .replace(/[:\-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(str) {
  return cleanTitle(str);
}

const PSN_TITLE_ALIASES = {
  "marvel's spider man remastered": "marvel's spider man",
  "assassin's creed ii": "assassin's creed the ezio collection",
  "little nightmares enhanced edition": "little nightmares",
  "five nights at freddys help wanted": "five nights at freddy's vr help wanted",
};

function matchPlayInfo(trophyTitleName, playMap) {
  const cleaned = cleanTitle(trophyTitleName);
  if (playMap.has(cleaned)) return playMap.get(cleaned);
  const alias = PSN_TITLE_ALIASES[cleaned];
  if (alias && playMap.has(alias)) return playMap.get(alias);
  for (const [key, val] of playMap.entries()) {
    if (key.length > 5 && (cleaned.startsWith(key) || key.startsWith(cleaned))) {
      return val;
    }
  }
  return null;
}

function getDifficultyFromHours(hours) {
  if (hours >= 50) return { difficulty: "epic", xpValue: 500 };
  if (hours >= 20) return { difficulty: "challenging", xpValue: 250 };
  if (hours <= 5) return { difficulty: "casual", xpValue: 50 };
  return { difficulty: "moderate", xpValue: 100 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Steam Sync Logic
// ─────────────────────────────────────────────────────────────────────────────
async function doSteamSync() {
  const steamKey = STEAM_API_KEY.value();
  const steamId = STEAM_ID.value();

  if (!steamKey || !steamId) {
    throw new Error("Missing STEAM_API_KEY or STEAM_ID environment variables.");
  }

  // 1. Fetch owned games
  const ownedUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamKey}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`;
  const ownedRes = await fetch(ownedUrl);
  if (!ownedRes.ok) {
    throw new Error(`Steam API error: HTTP ${ownedRes.status}`);
  }
  const ownedData = await ownedRes.json();
  const rawGames = ownedData.response?.games || [];

  // 2. Build game objects
  const games = rawGames.map((g) => {
    const hours = Math.round((g.playtime_forever / 60) * 10) / 10;
    const { difficulty, xpValue } = getDifficultyFromHours(hours);
    return {
      id: `steam_${g.appid}`,
      steamAppId: g.appid,
      title: g.name,
      platform: "steam",
      genre: "",
      playtimeHours: hours,
      playtimeMinutes: g.playtime_forever,
      coverArtUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appid}/header.jpg`,
      status: hours > 0 ? "in_progress" : "not_started",
      priority: hours >= 20 ? "high" : "medium",
      difficulty,
      xpValue,
      achievementsTotal: 0,
      achievementsUnlocked: 0,
      trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
      rating: null,
      personalNotes: "",
      isPublic: false,
      lastSyncedAt: FieldValue.serverTimestamp(),
    };
  });

  // 3. Fetch achievements in parallel for played games
  await Promise.allSettled(
    games.map(async (game) => {
      if (game.playtimeMinutes > 0) {
        try {
          const achUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${game.steamAppId}&key=${steamKey}&steamid=${steamId}`;
          const achRes = await fetch(achUrl);
          if (achRes.ok) {
            const achData = await achRes.json();
            const stats = achData.playerstats;
            if (stats && Array.isArray(stats.achievements)) {
              game.achievementsTotal = stats.achievements.length;
              game.achievementsUnlocked = stats.achievements.filter(
                (a) => a.achieved === 1
              ).length;
              if (
                game.achievementsTotal > 0 &&
                game.achievementsUnlocked === game.achievementsTotal
              ) {
                game.status = "completed";
              }
            }
          }
        } catch {
          // Ignore — game may have no achievements or restricted stats
        }
      }
    })
  );

  // 4. Upsert to Firestore in batches of 400
  const BATCH_SIZE = 400;
  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = games.slice(i, i + BATCH_SIZE);
    for (const game of chunk) {
      const docRef = db.collection("gamingProgress").doc(game.id);
      // Merge so existing admin edits (notes, rating, isPublic) are preserved
      const { id, ...data } = game;
      batch.set(docRef, data, { merge: true });
    }
    await batch.commit();
  }

  return { synced: games.length, platform: "steam" };
}

// ─────────────────────────────────────────────────────────────────────────────
// PSN Sync Logic
// ─────────────────────────────────────────────────────────────────────────────
async function doPSNSync() {
  const npsso = PSN_NPSSO.value();

  if (!npsso) {
    throw new Error("Missing PSN_NPSSO environment variable.");
  }

  // 1. Authenticate
  const code = await exchangeNpssoForCode(npsso);
  const auth = await exchangeCodeForAccessToken(code);

  // Pre-fetch existing PSN documents to safeguard against overwriting non-zero playtimes
  const existingSnaps = await db.collection("gamingProgress").where("platform", "==", "psn").get();
  const existingMap = new Map();
  existingSnaps.forEach((doc) => existingMap.set(doc.id, doc.data()));

  // 2. Fetch played games (contains exact playtime & durations) and trophy titles in parallel
  const [playedRes, titlesRes] = await Promise.all([
    getUserPlayedGames({ accessToken: auth.accessToken }, "me", { limit: 100 }).catch((err) => {
      console.error("[PSN Sync] getUserPlayedGames error:", err?.message || err);
      return { titles: [] };
    }),
    getUserTitles({ accessToken: auth.accessToken }, "me", { limit: 200 }).catch((err) => {
      console.error("[PSN Sync] getUserTitles error:", err?.message || err);
      return { trophyTitles: [] };
    }),
  ]);

  const playedTitles = playedRes.titles || [];
  const allTitles = titlesRes.trophyTitles || [];

  if (allTitles.length === 0 && playedTitles.length === 0) {
    return { synced: 0, platform: "psn" };
  }

  // 3. Build lookup map from played games (playtime, playCount, categories, dates)
  const playMap = new Map();
  for (const item of playedTitles) {
    const parsed = parsePlayDuration(item.playDuration);
    const cleaned = cleanTitle(item.name || item.localizedName);
    playMap.set(cleaned, {
      playtimeHours: parsed.hours,
      playtimeMinutes: parsed.minutes,
      playCount: item.playCount || 0,
      firstPlayed: item.firstPlayedDateTime || null,
      lastPlayed: item.lastPlayedDateTime || null,
      category: item.category || "",
      imageUrl: item.imageUrl || item.localizedImageUrl || "",
      genres: item.concept?.genres?.join(", ") || "",
    });
  }

  // 4. Build game objects + fetch trophy details in parallel
  const processedNorms = new Set();
  const games = await Promise.allSettled(
    allTitles.map(async (title) => {
      const npCommunicationId = title.npCommunicationId;
      const docId = `psn_${npCommunicationId}`;
      const cleaned = cleanTitle(title.trophyTitleName);
      processedNorms.add(cleaned);

      const playInfo = matchPlayInfo(title.trophyTitleName, playMap) || {};
      let hours = playInfo.playtimeHours || 0;
      let minutes = playInfo.playtimeMinutes || Math.round(hours * 60);
      let playCount = playInfo.playCount || 0;
      let genre = playInfo.genres || "";

      // Safeguard: If playInfo returned 0 hours, preserve existing valid playtime in DB
      const existing = existingMap.get(docId);
      if (hours === 0 && existing && (Number(existing.playtimeHours) > 0 || Number(existing.playtimeMinutes) > 0)) {
        hours = Number(existing.playtimeHours) || Math.round((Number(existing.playtimeMinutes) / 60) * 10) / 10;
        minutes = Number(existing.playtimeMinutes) || Math.round(hours * 60);
        playCount = Number(existing.playCount) || playCount;
        if (!genre && existing.genre) genre = existing.genre;
      }

      let platinum = 0, gold = 0, silver = 0, bronze = 0;
      let earnedPlatinum = 0, earnedGold = 0, earnedSilver = 0, earnedBronze = 0;

      try {
        // Get total trophies for the title
        const trophyRes = await getTitleTrophies(
          { accessToken: auth.accessToken },
          npCommunicationId,
          "all",
          { npServiceName: title.trophyTitlePlatform?.includes("PS5") ? "trophy2" : "trophy" }
        );
        for (const t of trophyRes.trophies || []) {
          if (t.trophyType === "platinum") platinum++;
          else if (t.trophyType === "gold") gold++;
          else if (t.trophyType === "silver") silver++;
          else if (t.trophyType === "bronze") bronze++;
        }

        // Get earned trophies
        const earnedRes = await getUserTrophiesEarnedForTitle(
          { accessToken: auth.accessToken },
          "me",
          npCommunicationId,
          "all",
          { npServiceName: title.trophyTitlePlatform?.includes("PS5") ? "trophy2" : "trophy" }
        );
        for (const t of earnedRes.trophies || []) {
          if (!t.earned) continue;
          if (t.trophyType === "platinum") earnedPlatinum++;
          else if (t.trophyType === "gold") earnedGold++;
          else if (t.trophyType === "silver") earnedSilver++;
          else if (t.trophyType === "bronze") earnedBronze++;
        }
      } catch {
        // Trophy details might fail for some titles — continue with zeros
      }

      const totalTrophies = platinum + gold + silver + bronze;
      const earnedTrophies = earnedPlatinum + earnedGold + earnedSilver + earnedBronze;
      const completionPct = totalTrophies > 0 ? Math.round((earnedTrophies / totalTrophies) * 100) : 0;

      let status = "not_started";
      if (earnedPlatinum > 0 || (totalTrophies > 0 && earnedTrophies === totalTrophies)) status = "completed";
      else if (earnedTrophies > 0 || hours > 0) status = "in_progress";

      const { difficulty, xpValue } = getDifficultyFromHours(
        hours > 0 ? hours : (earnedTrophies >= 50 ? 50 : earnedTrophies >= 20 ? 25 : 5)
      );

      return {
        id: docId,
        psnCommunicationId: npCommunicationId,
        title: title.trophyTitleName,
        platform: "psn",
        genre,
        playtimeHours: hours,
        playtimeMinutes: minutes,
        playCount,
        coverArtUrl: title.trophyTitleIconUrl || playInfo.imageUrl || "",
        status: (existing?.status && status === "not_started") ? existing.status : status,
        priority: (completionPct >= 50 || hours >= 20) ? "high" : (existing?.priority || "medium"),
        difficulty,
        xpValue,
        achievementsTotal: totalTrophies,
        achievementsUnlocked: earnedTrophies,
        trophies: {
          platinum: earnedPlatinum,
          gold: earnedGold,
          silver: earnedSilver,
          bronze: earnedBronze,
        },
        trophyTotals: { platinum, gold, silver, bronze },
        rating: existing?.rating ?? null,
        personalNotes: existing?.personalNotes || "",
        isPublic: existing ? Boolean(existing.isPublic) : false,
        lastSyncedAt: FieldValue.serverTimestamp(),
      };
    })
  );

  // 4. Filter successful results
  const successfulGames = games
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  // 5. Upsert to Firestore in batches of 400
  const BATCH_SIZE = 400;
  for (let i = 0; i < successfulGames.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = successfulGames.slice(i, i + BATCH_SIZE);
    for (const game of chunk) {
      const docRef = db.collection("gamingProgress").doc(game.id);
      const { id, ...data } = game;
      batch.set(docRef, data, { merge: true });
    }
    await batch.commit();
  }

  return { synced: successfulGames.length, platform: "psn" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scheduled: syncSteamGames
 * Runs on the 1st of every month at 02:00 IST (20:30 UTC previous day).
 */
exports.syncSteamGames = onSchedule(
  {
    schedule: "30 20 1 * *", // 1st of every month at 20:30 UTC (02:00 IST)
    timeZone: "UTC",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    console.log("[syncSteamGames] Starting scheduled Steam sync...");
    try {
      const result = await doSteamSync();
      console.log(`[syncSteamGames] Done — synced ${result.synced} games.`);
    } catch (err) {
      console.error("[syncSteamGames] Failed:", err);
    }
  }
);

/**
 * Scheduled: syncPSNGames
 * Runs on the 1st of every month at 02:30 IST (21:00 UTC previous day).
 */
exports.syncPSNGames = onSchedule(
  {
    schedule: "0 21 1 * *",
    timeZone: "UTC",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    console.log("[syncPSNGames] Starting scheduled PSN sync...");
    try {
      const result = await doPSNSync();
      console.log(`[syncPSNGames] Done — synced ${result.synced} titles.`);
    } catch (err) {
      console.error("[syncPSNGames] Failed:", err);
    }
  }
);

/**
 * HTTPS Callable: triggerGamingSync
 * On-demand trigger — callable from the Admin UI on any device.
 * Only the admin UID is allowed.
 *
 * Client usage:
 *   const fn = httpsCallable(functions, 'triggerGamingSync');
 *   const result = await fn({ platform: 'steam' | 'psn' | 'both' });
 */
exports.triggerGamingSync = onCall(
  {
    timeoutSeconds: 540,
    memory: "512MiB",
    enforceAppCheck: false, // Set to true once App Check is confirmed working
  },
  async (request) => {
    // Auth check — only admin
    const uid = request.auth?.uid;
    const adminUid = ADMIN_UID.value();

    if (!uid || uid !== adminUid) {
      throw new HttpsError("permission-denied", "Only the admin can trigger gaming sync.");
    }

    const platform = request.data?.platform || "both";
    const results = {};

    if (platform === "steam" || platform === "both") {
      try {
        results.steam = await doSteamSync();
      } catch (err) {
        results.steam = { error: err.message };
      }
    }

    if (platform === "psn" || platform === "both") {
      try {
        results.psn = await doPSNSync();
      } catch (err) {
        results.psn = { error: err.message };
      }
    }

    return { success: true, results };
  }
);
