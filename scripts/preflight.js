#!/usr/bin/env node
/* ─────────────────────────────────────────
   preflight.js — green-or-red status check
   Run this in the minute before recording
   your demo or starting the iPad on-device
   test. One command, one screen, all the
   things that can break, surfaced.
   ───────────────────────────────────────── */
'use strict';

const http = require('http');
const https = require('https');

const URL_STR = (process.argv[2] || process.env.PREFLIGHT_URL || 'https://web-production-44b1.up.railway.app').trim();
const TIMEOUT_MS = 15000;

let TARGET;
try {
  TARGET = new URL(URL_STR);
} catch (_) {
  console.error(`✗ invalid URL: ${URL_STR}`);
  process.exit(2);
}
const TRANSPORT = TARGET.protocol === 'https:' ? https : http;
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const tick = `${c.green}✓${c.reset}`;
const cross = `${c.red}✗${c.reset}`;
const warn = `${c.yellow}!${c.reset}`;

function req(pathname, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = TARGET.protocol === 'https:';
    const opts = {
      hostname: TARGET.hostname,
      port: TARGET.port || (isHttps ? 443 : 80),
      path: pathname,
      method,
      headers: {},
      timeout: TIMEOUT_MS,
    };
    let payload = null;
    if (body) {
      payload = Buffer.from(JSON.stringify(body));
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = payload.length;
    }
    const t0 = Date.now();
    const r = TRANSPORT.request(opts, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const ms = Date.now() - t0;
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, ms, raw, body: parsed });
      });
    });
    r.on('error', reject);
    r.on('timeout', () => r.destroy(new Error(`timeout ${TIMEOUT_MS}ms`)));
    if (payload) r.write(payload);
    r.end();
  });
}

const checks = [];
function record(name, pass, note) {
  checks.push({ name, pass, note });
  const sym = pass === true ? tick : (pass === 'warn' ? warn : cross);
  console.log(`  ${sym} ${name}${note ? `  ${c.dim}${note}${c.reset}` : ''}`);
}

async function main() {
  console.log('');
  console.log(`${c.bold}${c.cyan}╭─ Fraction Fruit Lab · pre-flight ──╮${c.reset}`);
  console.log(`${c.dim}Target: ${TARGET.origin}${c.reset}`);
  console.log('');

  // 1. Index loads
  try {
    const r = await req('/');
    // Tolerate any "Fraction <something> Lab" title — survives future renames.
    const ok = r.status === 200 && r.raw.length > 1000 && /<title>Fraction /i.test(r.raw);
    record('index.html serves', ok, `HTTP ${r.status}, ${r.raw.length}B, ${r.ms}ms`);
  } catch (err) {
    record('index.html serves', false, err.message);
  }

  // 2. Health endpoint
  let hasKey = false;
  try {
    const r = await req('/api/health');
    const b = r.body;
    const ok = r.status === 200 && b && b.ok === true;
    hasKey = b && b.hasApiKey === true;
    record('/api/health', ok, `${b?.questionCount || '?'} questions, model ${b?.model || '?'}, ${r.ms}ms`);
    if (!hasKey) {
      record('Claude API key live', 'warn', 'hasApiKey: false — server will use scripted fallback only');
    } else {
      record('Claude API key live', true, 'hasApiKey: true');
    }
  } catch (err) {
    record('/api/health', false, err.message);
  }

  // 3. Static assets
  for (const f of ['style.css', 'manipulative.js', 'tutorScript.js', 'app.js']) {
    try {
      const r = await req(`/${f}`);
      record(`static: ${f}`, r.status === 200 && r.raw.length > 100, `HTTP ${r.status}, ${r.raw.length}B, ${r.ms}ms`);
    } catch (err) {
      record(`static: ${f}`, false, err.message);
    }
  }

  // 4. Live /api/tutor call (real Claude if key set, else scripted fallback)
  try {
    const r = await req('/api/tutor', 'POST', {
      qId: 'q1',
      prompt: 'Quick question — which is bigger: 1/2 or 2/4?',
      studentAnswer: '1/2 is bigger',
      attemptNumber: 1,
      mode: 'hint',
    });
    const msg = r.body?.message || '';
    const src = r.body?.source || '?';
    const ok = r.status === 200 && msg.length > 10 && msg.length < 400;
    record('/api/tutor returns a hint', ok, `source=${src}, ${msg.length}B, ${r.ms}ms`);
    if (ok) {
      console.log(`     ${c.dim}↳ "${msg}"${c.reset}`);
    }
  } catch (err) {
    record('/api/tutor returns a hint', false, err.message);
  }

  // 5. Latency check (under 2s for any single endpoint)
  const slow = checks.filter((x) => x.note && /(\d+)ms/.test(x.note) && parseInt(/(\d+)ms/.exec(x.note)[1], 10) > 2000);
  if (slow.length) {
    record('latency under 2s', 'warn', `${slow.length} slow response(s)`);
  } else {
    record('latency under 2s', true, 'all endpoints responded within 2s');
  }

  // ── Summary ──
  console.log('');
  const failed = checks.filter((x) => x.pass === false).length;
  const warned = checks.filter((x) => x.pass === 'warn').length;
  const passed = checks.filter((x) => x.pass === true).length;

  if (failed === 0 && warned === 0) {
    console.log(`${c.bold}${c.green}✓ READY TO DEMO${c.reset}  (${passed}/${checks.length} checks green)`);
  } else if (failed === 0) {
    console.log(`${c.bold}${c.yellow}! DEMO OK with warnings${c.reset}  (${passed} green, ${warned} warn)`);
    console.log(`${c.dim}  warnings won't block the demo, but review them.${c.reset}`);
  } else {
    console.log(`${c.bold}${c.red}✗ NOT READY${c.reset}  (${failed} failures, ${warned} warnings, ${passed} green)`);
    console.log(`${c.dim}  fix the failures above before recording.${c.reset}`);
  }
  console.log('');

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${cross} preflight crashed: ${err.message}`);
  process.exit(2);
});
