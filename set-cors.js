#!/usr/bin/env node
/**
 * set-cors.js — applique les règles CORS sur le bucket Firebase Storage
 * sans avoir besoin de gsutil / gcloud.
 * Usage: node set-cors.js
 */
const https = require('https');
const fs = require('fs');

const BUCKET = 'rpe-gen2-eeaee.firebasestorage.app';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const CORS_CONFIG = [
  {
    origin: [
      'https://rpe-gen2-eeaee.web.app',
      'https://rpe-volleyball-sable.web.app',
      'http://localhost:5173',
      'http://localhost:4173',
    ],
    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable'],
    maxAgeSeconds: 3600,
  },
];

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function refreshToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  }).toString();

  const res = await httpsRequest(
    {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body,
  );

  if (res.status !== 200) {
    throw new Error(`Token refresh failed: ${res.status} ${res.body}`);
  }
  return JSON.parse(res.body).access_token;
}

async function setCors(accessToken) {
  const payload = JSON.stringify({ cors: CORS_CONFIG });
  const res = await httpsRequest(
    {
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${encodeURIComponent(BUCKET)}?fields=cors`,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    payload,
  );
  return res;
}

async function main() {
  const configPath = `${process.env.HOME}/.config/configstore/firebase-tools.json`;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens;

  if (!tokens?.refresh_token) {
    console.error('❌ Pas de refresh_token dans firebase-tools.json. Lance: firebase login');
    process.exit(1);
  }

  console.log('🔄 Rafraîchissement du token OAuth...');
  const accessToken = await refreshToken(tokens.refresh_token);
  console.log('✅ Token obtenu');

  console.log(`🌐 Application des règles CORS sur gs://${BUCKET}...`);
  const res = await setCors(accessToken);

  if (res.status === 200) {
    const data = JSON.parse(res.body);
    console.log('✅ CORS configuré avec succès !');
    console.log('Origins autorisées:');
    data.cors?.forEach((rule) => {
      rule.origin?.forEach((o) => console.log('  •', o));
    });
  } else {
    console.error(`❌ Erreur ${res.status}:`, res.body);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
