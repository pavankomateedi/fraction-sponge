#!/usr/bin/env node
/* ─────────────────────────────────────────
   run.js — eval harness
   Boots the Fraction Sponge server (if not
   already running), runs every case in
   golden.json through POST /api/tutor, scores
   each response with rules.js (always) and
   judge.js (when JUDGE=1), prints a scorecard,
   exits 0 if pass-rate ≥ threshold else 1.
   ───────────────────────────────────────── */
'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const { runRules } = require('./rules');
const { judgeResponse, makeClient } = require('./judge');

const REPO_ROOT = path.resolve(__dirname, '..');
const GOLDEN_PATH = path.join(__dirname, 'golden.json');
const PORT = Number(process.env.EVAL_PORT || 3100);
const PASS_THRESHOLD = Number(process.env.EVAL_PASS_THRESHOLD || 0.85); // 85% of rule checks must pass
const JUDGE_PASS_THRESHOLD = Number(process.env.EVAL_JUDGE_THRESHOLD || 0.75); // 75% of max judge score
const JUDGE_ENABLED = process.env.JUDGE === '1';
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY || 4);
const TIMEOUT_MS = Number(process.env.EVAL_TIMEOUT_MS || 12000);

// ── ANSI colors (no chalk dep) ──
const c = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  blue:  '\x1b[34m',
  cyan:  '\x1b[36m',
};
const tick = `${c.green}✓${c.reset}`;
const cross = `${c.red}✗${c.reset}`;
const warn = `${c.yellow}!${c.reset}`;

// ── Server lifecycle ──────────────────────────────────────────

let serverProcess = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PORT: String(PORT) };
    serverProcess = spawn('node', ['server.js'], {
      cwd: REPO_ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let booted = false;
    const timer = setTimeout(() => {
      if (!booted) {
        serverProcess.kill();
        reject(new Error(`server failed to boot on port ${PORT} within 10s`));
      }
    }, 10000);

    serverProcess.stdout.on('data', (chunk) => {
      const s = chunk.toString();
      if (process.env.EVAL_VERBOSE === '1') process.stdout.write(`${c.dim}[server] ${s}${c.reset}`);
      if (s.includes('listening on')) {
        booted = true;
        clearTimeout(timer);
        resolve();
      }
    });
    serverProcess.stderr.on('data', (chunk) => {
      if (process.env.EVAL_VERBOSE === '1') process.stderr.write(`${c.dim}[server:err] ${chunk}${c.reset}`);
    });
    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (!booted) {
        clearTimeout(timer);
        reject(new Error(`server exited with code ${code} before booting`));
      }
    });
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    try { serverProcess.kill(); } catch (_) {}
  }
}

// ── HTTP helper ───────────────────────────────────────────────

function postJson(pathname, body, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, body: parsed });
          } catch (_) {
            resolve({ status: res.statusCode, body: { raw } });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`request timeout (${timeoutMs}ms)`));
    });
    req.write(data);
    req.end();
  });
}

async function checkHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('health timeout')));
  });
}

// ── Concurrency helper ────────────────────────────────────────

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { error: err.message || String(err) };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
  const cases = Array.isArray(golden.cases) ? golden.cases : [];
  if (!cases.length) {
    console.error(`${cross} golden.json contains no cases`);
    process.exit(2);
  }

  banner();
  console.log(`${c.bold}Loaded${c.reset} ${cases.length} cases from ${path.relative(REPO_ROOT, GOLDEN_PATH)}`);
  console.log(`${c.bold}Mode${c.reset}   rules ${JUDGE_ENABLED ? '+ judge' : '(rules only — set JUDGE=1 to enable LLM judge)'}`);
  console.log('');

  console.log(`${c.dim}→ Booting server on port ${PORT}…${c.reset}`);
  await startServer();
  const health = await checkHealth();
  const apiNote = health.hasApiKey
    ? `${c.green}Claude API live${c.reset} — testing real model output`
    : `${c.yellow}No ANTHROPIC_API_KEY${c.reset} — testing scripted fallbacks (set the key in .env for real eval)`;
  console.log(`${c.dim}→ Health:${c.reset} ${apiNote}`);
  if (JUDGE_ENABLED && !health.hasApiKey) {
    console.log(`${c.yellow}${warn}${c.reset} JUDGE=1 set but no ANTHROPIC_API_KEY in env — judge will be skipped.`);
  }
  console.log('');

  const judgeClient = JUDGE_ENABLED && health.hasApiKey ? makeClient() : null;

  const results = await mapWithLimit(cases, CONCURRENCY, async (golden) => {
    const t0 = Date.now();
    let response;
    let httpStatus;
    let source = 'unknown';
    try {
      const r = await postJson('/api/tutor', golden.input);
      httpStatus = r.status;
      response = r.body?.message || '';
      source = r.body?.source || 'unknown';
    } catch (err) {
      return {
        golden,
        error: err.message || String(err),
        response: '',
        source: 'error',
        rules: null,
        judge: null,
        ms: Date.now() - t0,
      };
    }

    const rules = response ? runRules(response, golden) : null;
    let judge = null;
    if (judgeClient && response) {
      judge = await judgeResponse(judgeClient, golden, response);
    }

    return {
      golden,
      response,
      source,
      httpStatus,
      rules,
      judge,
      ms: Date.now() - t0,
    };
  });

  printScorecard(results);
  const ok = computeOverall(results);
  stopServer();

  // Persist the report next to evals/ for diffing across runs.
  fs.writeFileSync(
    path.join(__dirname, 'last-run.json'),
    JSON.stringify({ when: new Date().toISOString(), threshold: PASS_THRESHOLD, results }, null, 2)
  );

  process.exit(ok ? 0 : 1);
}

function banner() {
  console.log('');
  console.log(`${c.bold}${c.cyan}╭─ Fraction Sponge · /api/tutor evals ─╮${c.reset}`);
  console.log('');
}

function printScorecard(results) {
  console.log(`${c.bold}Cases${c.reset}`);
  console.log('');
  for (const r of results) {
    const id = r.golden.id;
    const tags = r.golden.tags ? `${c.dim}[${r.golden.tags.join(',')}]${c.reset}` : '';
    if (r.error) {
      console.log(`  ${cross} ${id}  ${c.red}${r.error}${c.reset}  ${tags}`);
      continue;
    }
    const rulePass = r.rules ? `${r.rules.passed}/${r.rules.total}` : '—/—';
    const ruleAllPassed = r.rules && r.rules.failed === 0;
    const mark = ruleAllPassed ? tick : (r.rules?.passed >= 4 ? warn : cross);
    const sourceTag = r.source === 'claude' ? `${c.cyan}claude${c.reset}` : `${c.dim}fallback${c.reset}`;
    let judgeStr = '';
    if (r.judge) {
      if (r.judge.source === 'claude') {
        judgeStr = `  judge ${r.judge.total}/${r.judge.max} (p${r.judge.persona}|t${r.judge.pedagogy}|l${r.judge.answer_leak})`;
      } else {
        judgeStr = `  ${c.yellow}judge=${r.judge.error || 'err'}${c.reset}`;
      }
    }
    console.log(`  ${mark} ${id}  rules ${rulePass}  ${sourceTag}${judgeStr}  ${tags}`);
    if (r.rules) {
      for (const rule of r.rules.results) {
        if (!rule.pass) {
          console.log(`     ${c.red}↳ ${rule.name}${c.reset}: ${rule.detail}`);
        }
      }
    }
    if (r.judge?.note) {
      console.log(`     ${c.dim}↳ judge: ${r.judge.note}${c.reset}`);
    }
    if (process.env.EVAL_SHOW_RESPONSES === '1') {
      console.log(`     ${c.dim}↳ "${r.response.replace(/\n/g, ' ')}"${c.reset}`);
    }
  }
  console.log('');
}

function computeOverall(results) {
  const realResults = results.filter((r) => !r.error && r.rules);
  const totalRuleChecks = realResults.reduce((sum, r) => sum + r.rules.total, 0);
  const passedRuleChecks = realResults.reduce((sum, r) => sum + r.rules.passed, 0);
  const ruleRate = totalRuleChecks ? passedRuleChecks / totalRuleChecks : 0;
  const fullPasses = realResults.filter((r) => r.rules.failed === 0).length;

  console.log(`${c.bold}Summary${c.reset}`);
  console.log(`  Rule checks:  ${passedRuleChecks}/${totalRuleChecks}  (${(ruleRate * 100).toFixed(1)}%)`);
  console.log(`  Full passes:  ${fullPasses}/${realResults.length}  (cases where every rule passed)`);

  let judgeOk = true;
  const judged = realResults.filter((r) => r.judge && r.judge.source === 'claude');
  if (judged.length) {
    const totalJudge = judged.reduce((sum, r) => sum + r.judge.total, 0);
    const maxJudge = judged.reduce((sum, r) => sum + r.judge.max, 0);
    const judgeRate = totalJudge / maxJudge;
    console.log(`  Judge score:  ${totalJudge}/${maxJudge}  (${(judgeRate * 100).toFixed(1)}%) across ${judged.length} cases`);
    judgeOk = judgeRate >= JUDGE_PASS_THRESHOLD;
    if (!judgeOk) {
      console.log(`  ${c.red}↳ judge below threshold ${(JUDGE_PASS_THRESHOLD * 100).toFixed(0)}%${c.reset}`);
    }
  }

  const errs = results.filter((r) => r.error).length;
  if (errs) console.log(`  ${c.red}Errors:       ${errs}${c.reset}`);

  const rulesOk = ruleRate >= PASS_THRESHOLD;
  const ok = rulesOk && judgeOk && errs === 0;

  console.log('');
  if (ok) {
    console.log(`${tick} ${c.bold}${c.green}PASS${c.reset}  threshold ${(PASS_THRESHOLD * 100).toFixed(0)}%, achieved ${(ruleRate * 100).toFixed(1)}%`);
  } else {
    console.log(`${cross} ${c.bold}${c.red}FAIL${c.reset}  threshold ${(PASS_THRESHOLD * 100).toFixed(0)}%, achieved ${(ruleRate * 100).toFixed(1)}%`);
  }
  console.log('');
  return ok;
}

// Cleanup on unexpected exit
process.on('SIGINT',  () => { stopServer(); process.exit(130); });
process.on('SIGTERM', () => { stopServer(); process.exit(143); });
process.on('uncaughtException', (err) => {
  console.error(`${cross} uncaught: ${err.message}`);
  stopServer();
  process.exit(2);
});

main().catch((err) => {
  console.error(`${cross} ${err.message}`);
  stopServer();
  process.exit(2);
});
