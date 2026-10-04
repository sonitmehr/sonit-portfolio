import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  exchangeNpssoForCode,
  exchangeCodeForAccessToken,
  getUserTitles,
  getUserPlayedGames,
} from 'psn-api';

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
  return (str || '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[™®©]/g, '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s*ps[45].*$/i, '')
    .replace(/\s+trophies\s*$/i, '')
    .replace(/[:\-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
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

/**
 * Custom Vite Plugin for Local PSN Sync Proxy
 * Bridges between local frontend and PlayStation Network API with playtime and trophies
 */
function psnSyncPlugin(env) {
  return {
    name: 'psn-sync-plugin',
    configureServer(server) {
      server.middlewares.use('/api/psn/games', async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return next();
        }

        const npsso = env.PSN_NPSSO || process.env.PSN_NPSSO;

        if (!npsso) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              error: 'Missing PSN_NPSSO in .env'
            })
          );
        }

        try {
          // 1. Authenticate
          const code = await exchangeNpssoForCode(npsso);
          const auth = await exchangeCodeForAccessToken(code);

          // 2. Fetch played games (contains exact playtime & durations) and trophy titles in parallel
          const [playedRes, titlesRes] = await Promise.all([
            getUserPlayedGames({ accessToken: auth.accessToken }, 'me', { limit: 100 }).catch((e) => {
              console.warn('[PSN Proxy] getUserPlayedGames error:', e.message);
              return { titles: [] };
            }),
            getUserTitles({ accessToken: auth.accessToken }, 'me', { limit: 100 }).catch((e) => {
              console.warn('[PSN Proxy] getUserTitles error:', e.message);
              return { trophyTitles: [] };
            }),
          ]);

          const playedTitles = playedRes.titles || [];
          const trophyTitles = titlesRes.trophyTitles || [];

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

          // 4. Build game objects merging trophies and playtime
          const processedNorms = new Set();
          const games = [];

          for (const title of trophyTitles) {
            const cleaned = cleanTitle(title.trophyTitleName);
            processedNorms.add(cleaned);

            const playInfo = matchPlayInfo(title.trophyTitleName, playMap) || {};
            const earned = title.earnedTrophies || { platinum: 0, gold: 0, silver: 0, bronze: 0 };
            const defined = title.definedTrophies || { platinum: 0, gold: 0, silver: 0, bronze: 0 };

            const platinum = defined.platinum || 0;
            const gold = defined.gold || 0;
            const silver = defined.silver || 0;
            const bronze = defined.bronze || 0;

            const earnedPlatinum = earned.platinum || 0;
            const earnedGold = earned.gold || 0;
            const earnedSilver = earned.silver || 0;
            const earnedBronze = earned.bronze || 0;

            const totalTrophies = platinum + gold + silver + bronze;
            const earnedTrophies = earnedPlatinum + earnedGold + earnedSilver + earnedBronze;
            const hours = playInfo.playtimeHours || 0;

            let status = "not_started";
            if (earnedPlatinum > 0 || (totalTrophies > 0 && earnedTrophies === totalTrophies)) {
              status = "completed";
            } else if (earnedTrophies > 0 || hours > 0) {
              status = "in_progress";
            }

            let difficulty = "moderate";
            let xpValue = 100;
            if (hours >= 50 || earnedTrophies >= 50) {
              difficulty = "epic";
              xpValue = 500;
            } else if (hours >= 20 || earnedTrophies >= 20) {
              difficulty = "challenging";
              xpValue = 250;
            } else if (hours <= 5 && earnedTrophies <= 5) {
              difficulty = "casual";
              xpValue = 50;
            }

            games.push({
              id: `psn_${title.npCommunicationId}`,
              psnCommunicationId: title.npCommunicationId,
              title: title.trophyTitleName,
              platform: "psn",
              genre: playInfo.genres || "",
              playtimeHours: hours,
              playtimeMinutes: playInfo.playtimeMinutes || hours * 60,
              playCount: playInfo.playCount || 0,
              coverArtUrl: title.trophyTitleIconUrl || playInfo.imageUrl || "",
              status,
              priority: (hours >= 20 || earnedTrophies >= 20) ? "high" : "medium",
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
              rating: null,
              personalNotes: "",
              isPublic: false,
            });
          }

          // Also add played titles that might not have trophy sets (e.g. apps/previews)
          for (const item of playedTitles) {
            const norm = cleanTitle(item.name || item.localizedName);
            if (!processedNorms.has(norm)) {
              processedNorms.add(norm);
              const parsed = parsePlayDuration(item.playDuration);
              if (parsed.hours > 0) {
                games.push({
                  id: `psn_${item.titleId}`,
                  psnCommunicationId: item.titleId,
                  title: item.name || item.localizedName,
                  platform: "psn",
                  genre: item.concept?.genres?.join(", ") || "",
                  playtimeHours: parsed.hours,
                  playtimeMinutes: parsed.minutes,
                  playCount: item.playCount || 0,
                  coverArtUrl: item.imageUrl || item.localizedImageUrl || "",
                  status: "in_progress",
                  priority: parsed.hours >= 20 ? "high" : "medium",
                  difficulty: parsed.hours >= 50 ? "epic" : parsed.hours >= 20 ? "challenging" : "casual",
                  xpValue: parsed.hours >= 50 ? 500 : parsed.hours >= 20 ? 250 : 50,
                  achievementsTotal: 0,
                  achievementsUnlocked: 0,
                  trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
                  trophyTotals: { platinum: 0, gold: 0, silver: 0, bronze: 0 },
                  rating: null,
                  personalNotes: "",
                  isPublic: false,
                });
              }
            }
          }

          // Sort by playtime descending, then by trophies unlocked
          games.sort((a, b) => b.playtimeHours - a.playtimeHours || b.achievementsUnlocked - a.achievementsUnlocked);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              count: games.length,
              games,
            })
          );
        } catch (err) {
          console.error('PSN sync proxy error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err.message || 'Failed to fetch PSN games'
            })
          );
        }
      });
    }
  };
}

/**
 * Custom Vite Plugin for Local Steam Sync Proxy
 * Bridges between local frontend and Steam Web API with zero CORS issues
 */
function steamSyncPlugin(env) {
  return {
    name: 'steam-sync-plugin',
    configureServer(server) {
      server.middlewares.use('/api/steam/games', async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return next();
        }

        const steamKey = env.STEAM_API_KEY || process.env.STEAM_API_KEY;
        const steamId = env.STEAM_ID || process.env.STEAM_ID;

        if (!steamKey || !steamId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              error: 'Missing STEAM_API_KEY or STEAM_ID in .env'
            })
          );
        }

        try {
          const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamKey}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Steam API responded with HTTP status ${response.status}`);
          }

          const data = await response.json();
          const rawGames = data.response?.games || [];

          const games = rawGames.map((g) => {
            const hours = Math.round((g.playtime_forever / 60) * 10) / 10;
            let difficulty = "moderate";
            let xpValue = 100;
            if (hours >= 50) {
              difficulty = "epic";
              xpValue = 500;
            } else if (hours >= 20) {
              difficulty = "challenging";
              xpValue = 250;
            } else if (hours <= 5) {
              difficulty = "casual";
              xpValue = 50;
            }

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
            };
          });

          // Sort by playtime descending by default
          games.sort((a, b) => b.playtimeHours - a.playtimeHours);

          // Fetch live Steam achievements in parallel for all played games
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
                      game.achievementsUnlocked = stats.achievements.filter((a) => a.achieved === 1).length;
                      // If 100% achievements unlocked, mark as completed
                      if (game.achievementsTotal > 0 && game.achievementsUnlocked === game.achievementsTotal) {
                        game.status = "completed";
                      }
                    }
                  }
                } catch {
                  // Ignore games without achievements or with restricted stats
                }
              }
            })
          );

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              count: games.length,
              games
            })
          );
        } catch (err) {
          console.error('Steam sync proxy error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err.message || 'Failed to fetch Steam games'
            })
          );
        }
      });
    }
  };
}

/**
 * Custom Vite Plugin for Local Clash of Clans Sync Proxy
 * Bridges between local frontend and Supercell Clash of Clans API
 */
function cocSyncPlugin(env) {
  return {
    name: 'coc-sync-plugin',
    configureServer(server) {
      server.middlewares.use('/api/coc/player', async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return next();
        }

        const token = env.COC_API_TOKEN || process.env.COC_API_TOKEN;
        let playerTag = env.COC_PLAYER_TAG || process.env.COC_PLAYER_TAG;

        if (!token || !playerTag) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              error: 'Missing COC_API_TOKEN or COC_PLAYER_TAG in .env',
            })
          );
        }

        if (!playerTag.startsWith('#')) {
          playerTag = '#' + playerTag;
        }

        try {
          const encodedTag = encodeURIComponent(playerTag);
          const playerRes = await fetch(`https://api.clashofclans.com/v1/players/${encodedTag}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });

          if (!playerRes.ok) {
            const errBody = await playerRes.text();
            throw new Error(`Supercell API error (${playerRes.status}): ${errBody}`);
          }

          const player = await playerRes.json();
          let clan = null;

          if (player.clan && player.clan.tag) {
            try {
              const clanRes = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(player.clan.tag)}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                },
              });
              if (clanRes.ok) {
                clan = await clanRes.json();
              }
            } catch (clanErr) {
              console.warn('[CoC Proxy] Clan fetch error:', clanErr.message);
            }
          }

          const gameEntry = {
            id: `coc_${player.tag.replace('#', '')}`,
            title: "Clash of Clans",
            platform: "supercell",
            genre: "Strategy • Base Building",
            coverArtUrl: "/icons/gaming/coc/clash-of-clans-cover.jpg",
            status: "in_progress",
            priority: "high",
            difficulty: "epic",
            xpValue: 500,
            playtimeHours: 250,
            playtimeMinutes: 15000,
            achievementsTotal: player.achievements ? player.achievements.length : 0,
            achievementsUnlocked: player.achievements ? player.achievements.filter((a) => a.stars === 3).length : 0,
            trophies: {
              platinum: 1,
              gold: player.townHallLevel || 16,
              silver: player.builderHallLevel || 10,
              bronze: player.warStars || 0,
            },
            personalNotes: `Town Hall ${player.townHallLevel} • ${player.clan ? player.clan.name : 'No Clan'}`,
            isPublic: true,
            order: 0,
            cocData: {
              ...player,
              clanDetails: clan,
            },
          };

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              game: gameEntry,
              player,
              clan,
            })
          );
        } catch (err) {
          console.error('[CoC Proxy] Error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err.message || 'Failed to fetch Clash of Clans data',
            })
          );
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), steamSyncPlugin(env), psnSyncPlugin(env), cocSyncPlugin(env)],
  };
});

