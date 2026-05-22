#!/usr/bin/env node
// modelradar — scan a codebase for deprecated or retiring LLM model IDs.
// Zero dependencies. Data: github.com/alexanderkatsovych/modelradar-data
// Part of ModelRadar — https://modelradar.embervalue.com
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DATA_URL =
  'https://raw.githubusercontent.com/alexanderkatsovych/modelradar-data/main/models.json';

const HELP = `modelradar — scan your codebase for deprecated LLM model IDs

Usage:
  modelradar scan [path]      Scan a directory (default: current directory)

Options:
  --max-days=N    Fail if a used model retires within N days (default: 90)
  --strict        Also fail on deprecated models with no imminent retirement
  --json          Output machine-readable JSON
  -h, --help      Show this help

Exit code 1 means a used model is retired or retiring soon — wire it into CI.
Docs: https://modelradar.embervalue.com`;

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.astro', '.nuxt',
  'vendor', '__pycache__', '.venv', 'venv', 'target', '.cache', 'coverage',
]);
const TEXT_EXT = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.php', '.cs', '.swift', '.json', '.yaml', '.yml', '.toml',
  '.txt', '.md', '.sh', '.ini', '.cfg', '.tf',
]);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.env') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(full);
    } else if (e.isFile() && (TEXT_EXT.has(extname(e.name).toLowerCase()) || e.name === '.env')) {
      yield full;
    }
  }
}

function daysUntil(iso) {
  if (!iso) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  const n = new Date();
  return Math.round((t - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 86_400_000);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    console.log(HELP);
    return 0;
  }
  if (cmd !== 'scan') {
    console.error(`modelradar: unknown command "${cmd}". Try "modelradar --help".`);
    return 1;
  }

  const getOpt = (name, def) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
  };
  const scanPath = args.slice(1).find((a) => !a.startsWith('-')) || '.';
  const rawMaxDays = getOpt('max-days', '90');
  const maxDays = Number(rawMaxDays);
  if (!Number.isInteger(maxDays) || maxDays < 0) {
    console.error(
      `modelradar: --max-days must be a non-negative integer (got "${rawMaxDays}").`,
    );
    return 1;
  }
  const strict = args.includes('--strict');
  const asJson = args.includes('--json');
  const useColor = !process.env.NO_COLOR && !asJson;
  const c = (code) => (useColor ? code : '');
  const C = {
    red: c('\x1b[31m'), yellow: c('\x1b[33m'), green: c('\x1b[32m'),
    dim: c('\x1b[2m'), bold: c('\x1b[1m'), reset: c('\x1b[0m'),
  };

  // --- fetch the open dataset ---
  let models;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    models = (await res.json()).models;
  } catch (err) {
    console.error(`modelradar: could not fetch model data — ${err.message}`);
    return 2;
  }
  const byApiId = new Map();
  for (const m of models) if (m.api_id) byApiId.set(m.api_id, m);

  // --- scan the tree ---
  // A model id only counts as "used" when it touches a code delimiter — a
  // quote, backtick, equals or colon — on at least one side. This excludes
  // prose (the word "command" in a sentence) and URL paths (".../gpt-4"),
  // the dominant false positives for short or dictionary-word model ids.
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const DELIM = '[\'"`=:]';
  const idMatchers = [...byApiId.keys()].map((id) => {
    const e = escapeRe(id);
    return {
      id,
      re: new RegExp(`${DELIM}${e}(?![\\w.-])|(?<![\\w.-])${e}${DELIM}`),
    };
  });
  const found = new Map(); // api_id -> Set<file>
  let filesScanned = 0;

  for (const file of walk(scanPath)) {
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (content.length > 2_000_000) continue;
    filesScanned += 1;
    for (const { id, re } of idMatchers) {
      if (content.includes(id) && re.test(content)) {
        if (!found.has(id)) found.set(id, new Set());
        found.get(id).add(file.replace(/\\/g, '/'));
      }
    }
  }

  // --- classify ---
  const results = [];
  for (const [id, files] of found) {
    const m = byApiId.get(id);
    const days = daysUntil(m.retires_on);
    let level = 'ok';
    if (m.status === 'retired') level = 'retired';
    else if (days != null && days >= 0 && days <= maxDays) level = 'critical';
    else if (m.status === 'deprecated') level = 'deprecated';
    results.push({
      id, name: m.name, provider: m.provider, status: m.status,
      retires_on: m.retires_on || null, days, successor: m.successor || null,
      level, files: [...files],
    });
  }
  const order = { retired: 0, critical: 1, deprecated: 2, ok: 3 };
  results.sort((a, b) => order[a.level] - order[b.level] || a.id.localeCompare(b.id));
  const failing = results.filter(
    (r) => r.level === 'retired' || r.level === 'critical' || (strict && r.level === 'deprecated'),
  );

  // --- output ---
  if (asJson) {
    console.log(JSON.stringify({ filesScanned, failing: failing.length, results }, null, 2));
    return failing.length ? 1 : 0;
  }

  const LABEL = { retired: 'RETIRED', critical: 'RETIRING', deprecated: 'DEPRECATED', ok: 'ok' };
  const COLOR = { retired: C.red, critical: C.red, deprecated: C.yellow, ok: C.green };
  console.log(`${C.bold}ModelRadar${C.reset} — scanned ${filesScanned} file(s) in ${scanPath}\n`);
  if (results.length === 0) {
    console.log(`${C.green}No tracked LLM model IDs found.${C.reset}`);
    return 0;
  }
  for (const r of results) {
    const when =
      r.level === 'retired' ? 'already retired'
      : r.retires_on ? `retires ${r.retires_on}${r.days != null ? ` — ${r.days}d` : ''}`
      : r.status === 'deprecated' ? 'deprecated' : 'active';
    const succ = r.successor ? ` ${C.dim}→ ${r.successor}${C.reset}` : '';
    console.log(`  ${COLOR[r.level]}${LABEL[r.level].padEnd(11)}${C.reset} ${r.id}  ${C.dim}${when}${C.reset}${succ}`);
    for (const f of r.files.slice(0, 5)) console.log(`    ${C.dim}${f}${C.reset}`);
    if (r.files.length > 5) console.log(`    ${C.dim}…and ${r.files.length - 5} more file(s)${C.reset}`);
  }
  console.log();
  if (failing.length) {
    console.log(`${C.red}${C.bold}✖ ${failing.length} model(s) need attention.${C.reset} Plan migrations: https://modelradar.embervalue.com`);
    return 1;
  }
  console.log(`${C.green}✓ Every LLM model you use is in good standing.${C.reset}`);
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`modelradar: ${err.message}`);
    process.exitCode = 2;
  });
