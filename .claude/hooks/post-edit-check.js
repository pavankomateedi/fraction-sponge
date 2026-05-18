#!/usr/bin/env node
/* Claude Code PostToolUse hook.
   Reads the tool-use payload from stdin, checks if the file touched is
   tutor-critical, and prints an advisory reminder to run evals.
   Exits 0 always (advisory — never blocks the edit). */
'use strict';

const TUTOR_CRITICAL = [
  'server.js',
  'public/tutorScript.js',
  'public/manipulative.js',
  'public/app.js',
  'evals/golden.json',
  'evals/rules.js',
  'evals/judge.js',
];

let stdin = '';
process.stdin.on('data', (c) => { stdin += c; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(stdin || '{}');
    const filePath = payload?.tool_input?.file_path
                   || payload?.file_path
                   || '';
    const norm = String(filePath).replace(/\\/g, '/');
    const hit = TUTOR_CRITICAL.find((w) => norm.endsWith(w));
    if (!hit) process.exit(0);

    const fileName = norm.split('/').pop();
    const yellow = '\x1b[33m';
    const cyan = '\x1b[36m';
    const reset = '\x1b[0m';
    const dim = '\x1b[2m';

    console.error('');
    console.error(`  ${yellow}!${reset} Tutor-critical file changed: ${cyan}${fileName}${reset}`);
    console.error(`    Run ${cyan}npm run eval${reset} before committing.`);
    console.error(`    (or ${cyan}npm run eval:judge${reset} with ANTHROPIC_API_KEY set)`);
    console.error(`    ${dim}↳ Rubric: evals/rubric.md${reset}`);
    console.error('');
  } catch (_) {
    // Silent — never block on parsing errors
  }
  process.exit(0);
});

// Safety: if stdin never closes (which shouldn't happen), exit after 2s.
setTimeout(() => process.exit(0), 2000).unref();
