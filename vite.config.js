import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), steamSyncPlugin(env)],
  };
});
