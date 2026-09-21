import fs from 'fs';
import path from 'path';

function log(msg) {
  console.log(msg);
  fs.appendFileSync('scripts/psn-log.txt', msg + '\n');
}

fs.writeFileSync('scripts/psn-log.txt', 'Starting PSN test...\n');

try {
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });

  const npsso = env.PSN_NPSSO;
  log('NPSSO length: ' + (npsso ? npsso.length : 0));

  const authUrl = 'https://ca.account.sony.com/api/authz/v3/oauth/authorize?access_type=offline&client_id=09515139-db77-4971-a34c-7c5e0f749733&redirect_uri=com.scee.psx.sciweb%3A%2F%2Fva.authz.api.playstation.com%2Fredirect&response_type=code&scope=psn%3Amobile.core';

  log('Fetching authUrl with timeout...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const authRes = await fetch(authUrl, {
    headers: {
      'Cookie': `npsso=${npsso}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    redirect: 'manual',
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  log('Status: ' + authRes.status);
  const location = authRes.headers.get('location');
  log('Location header: ' + (location ? location.slice(0, 80) + '...' : 'none'));

  if (location && location.includes('code=')) {
    const urlObj = new URL(location);
    const code = urlObj.searchParams.get('code');
    log('SUCCESS! Authorization code: ' + (code ? code.slice(0, 10) + '...' : 'none'));
  } else {
    log('No code in redirect. Headers: ' + JSON.stringify([...authRes.headers.entries()]));
    const body = await authRes.text();
    log('Body: ' + body.slice(0, 300));
  }
} catch (e) {
  log('Error caught: ' + e.message + '\n' + e.stack);
}
