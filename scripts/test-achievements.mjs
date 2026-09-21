import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const key = env.STEAM_API_KEY;
const steamid = env.STEAM_ID;

// Test Sniper Elite 4 (312660) and Portal 2 (620)
const testAppIds = [312660, 620, 550];

for (const appid of testAppIds) {
  try {
    const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${key}&steamid=${steamid}`;
    const res = await fetch(url);
    const data = await res.json();
    const stats = data.playerstats;
    if (stats && stats.achievements) {
      const total = stats.achievements.length;
      const unlocked = stats.achievements.filter(a => a.achieved === 1).length;
      console.log(`✅ ${stats.gameName} (AppID: ${appid}): ${unlocked} / ${total} achievements unlocked (${Math.round(unlocked/total*100)}%)`);
    } else {
      console.log(`⚠️ AppID ${appid}:`, data);
    }
  } catch (e) {
    console.error(`Error for ${appid}:`, e.message);
  }
}
