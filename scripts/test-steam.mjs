import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const STEAM_API_KEY = env.STEAM_API_KEY;
const STEAM_ID = env.STEAM_ID;

console.log('Testing Steam API with Steam ID:', STEAM_ID);

async function testSteam() {
  try {
    // 1. Player Summary
    const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${STEAM_ID}`;
    const sumRes = await fetch(summaryUrl);
    const sumData = await sumRes.json();
    const player = sumData.response?.players?.[0];
    
    if (!player) {
      console.error('Steam Player not found or API Key invalid:', sumData);
      return;
    }
    
    console.log('\n✅ Steam Account Verified:');
    console.log(' - Persona Name:', player.personaname);
    console.log(' - Profile URL:', player.profileurl);
    console.log(' - Visibility State:', player.communityvisibilitystate === 3 ? 'Public' : 'Private/Friends Only');

    // 2. Owned Games
    const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&format=json&include_appinfo=1&include_played_free_games=1`;
    const gamesRes = await fetch(gamesUrl);
    const gamesData = await gamesRes.json();
    const games = gamesData.response?.games || [];
    
    console.log(`\n✅ Owned Games Found: ${games.length}`);
    if (games.length > 0) {
      console.log('Top 5 most played games:');
      games
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 5)
        .forEach((g, idx) => {
          const hours = (g.playtime_forever / 60).toFixed(1);
          console.log(`   ${idx + 1}. ${g.name} — ${hours} hrs (AppID: ${g.appid})`);
        });
    } else {
      console.log('Note: If game count is 0, make sure "Game details" is set to Public in Steam Privacy Settings.');
    }
  } catch (err) {
    console.error('Steam test failed:', err);
  }
}

testSteam();
