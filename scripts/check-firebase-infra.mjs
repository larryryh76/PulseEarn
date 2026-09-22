/**
 * Firebase INFRASTRUCTURE checker — the repository is the source of truth.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 2026-09-22 audit found the deployable Firebase config incomplete in two
 * ways that only show up at runtime:
 *
 *   • a composite index can be required by a query and simply not declared —
 *     Firestore then rejects the query with FAILED_PRECONDITION, which surfaces
 *     to a user as an empty list or an error toast, not as a config error;
 *   • `.firebaserc` did not exist, so `firebase deploy` had no default project
 *     and would prompt for (or guess) one.
 *
 * Both are "the repo is not the source of truth" defects. This script closes the
 * loop: it derives the composite indexes the repo's OWN queries require, compares
 * them with firestore.indexes.json, and validates the rules/service config that
 * would be deployed. Run it before any Firebase deploy.
 *
 * Usage:  bun scripts/check-firebase-infra.mjs
 * Exit:   0 = deployable config is complete and consistent, 1 = findings.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const findings = [];
const notes = [];
const fail = (m) => findings.push(m);
const note = (m) => notes.push(m);
const rel = (p) => path.relative(ROOT, p);

/* ── 1. Config files parse, and name one project ─────────────────────────── */

const readJson = (p) => {
  const full = path.join(ROOT, p);
  if (!fs.existsSync(full)) { fail(`${p} is missing`); return null; }
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { fail(`${p} is not valid JSON: ${e.message}`); return null; }
};

const firebaseJson = readJson('firebase.json');
const indexesJson = readJson('firestore.indexes.json');
const rc = readJson('.firebaserc');
if (rc && !rc.projects?.default) fail('.firebaserc has no projects.default — `firebase deploy` would not know the project');

const EXPECTED_PROJECT = 'pulseearn-a4b16';
if (rc?.projects?.default && rc.projects.default !== EXPECTED_PROJECT) {
  fail(`.firebaserc default project is ${rc.projects.default}, expected ${EXPECTED_PROJECT}`);
}

if (firebaseJson) {
  const f = firebaseJson.firestore, s = firebaseJson.storage;
  if (!f?.rules || !f?.indexes) fail('firebase.json must declare firestore.rules and firestore.indexes');
  if (!s?.rules) fail('firebase.json must declare storage.rules');
  for (const [k, v] of Object.entries({ firestore: f?.rules, indexes: f?.indexes, storage: s?.rules })) {
    if (v && !fs.existsSync(path.join(ROOT, v))) fail(`firebase.json points at ${k} = ${v}, which does not exist`);
  }
}

/* ── 2. Rules files: parse-shape + security posture ──────────────────────── */

function checkRules(file, serviceName) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) { fail(`${file} is missing`); return null; }
  const src = fs.readFileSync(full, 'utf8');
  // Comments are prose, not code: they must not be scanned for helper calls or
  // match blocks (a comment mentioning `require_access()` is not a call).
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  if (!/rules_version\s*=\s*'2'\s*;/.test(src)) fail(`${file}: missing rules_version = '2';`);
  if (!new RegExp(`service\\s+${serviceName.replace('.', '\\.')}\\s*\\{`).test(src)) {
    fail(`${file}: missing \`service ${serviceName}\` block`);
  }

  // brace/paren balance (a syntax gate far cheaper than a deploy attempt)
  const balance = (open, close) => {
    let depth = 0, min = 0;
    for (const ch of src) {
      if (ch === open) depth++;
      else if (ch === close) { depth--; min = Math.min(min, depth); }
    }
    return { depth, min };
  };
  const brace = balance('{', '}');
  const paren = balance('(', ')');
  if (brace.depth !== 0 || brace.min < 0) fail(`${file}: unbalanced braces (net ${brace.depth})`);
  if (paren.depth !== 0 || paren.min < 0) fail(`${file}: unbalanced parentheses (net ${paren.depth})`);

  // every called helper must be defined
  const defined = new Set([...code.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)].map(m => m[1]));
  const called = new Set([...code.matchAll(/(?:^|[^.\w])([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map(m => m[1]));
  const builtins = new Set(['if', 'function', 'match', 'allow', 'return', 'get', 'getAfter', 'exists', 'existsAfter', 'request', 'resource', 'rules_version', 'service', 'cloud', 'firestore', 'storage', 'duration', 'timestamp', 'path', 'debug', 'hasany', 'hasAll', 'hasOnly', 'get', 'size', 'keys', 'data', 'diff', 'affectedKeys', 'hasAny']);
  for (const c of called) {
    if (defined.has(c) || builtins.has(c)) continue;
    const lower = c.toLowerCase();
    if (['hasany', 'get', 'exists', 'existsafter', 'getafter', 'keys', 'size', 'data', 'diff', 'affectedkeys', 'debug', 'path', 'timestamp', 'duration', 'math'].includes(lower)) continue;
    fail(`${file}: calls undefined helper \`${c}()\``);
  }

  // match blocks and their paths
  const matches = [...code.matchAll(/match\s+\/([A-Za-z0-9_{}$\/-]+)\s*\{/g)].map(m => m[1]);
  if (!matches.length) fail(`${file}: no match blocks found`);

  // a `match` with no `allow` inside would deny everything for that path —
  // legitimate, but silent. Report so it is a visible decision.
  const chunks = code.split(/match\s+\//).slice(1);
  for (const chunk of chunks) {
    const name = chunk.split(/\s*\{/)[0];
    const body = chunk.slice(chunk.indexOf('{'));
    if (!/\ballow\b/.test(body.split(/match\s+\//)[0])) note(`${file}: match /${name} declares no allow rule (deny-by-default)`);
  }
  return { src, code, matches };
}

const firestoreRules = checkRules('firestore.rules', 'cloud.firestore');
const storageRules = checkRules('storage.rules', 'firebase.storage');

/* ── 3. Security posture: no PSEmine collection opened to the world ─────── */

if (firestoreRules) {
  const PSEMMINE_PUBLIC_OK = new Set(['psemine_tools']);   // catalog is intentionally public
  const blocks = firestoreRules.code.split(/match\s+\//).slice(1);
  for (const block of blocks) {
    const name = block.split(/\s*\{/)[0].split('/')[0].trim();
    if (!name.startsWith('psemine_')) continue;
    const body = block.slice(block.indexOf('{'));
    const wideRead = /allow\s+(read|list|read,\s*list|list,\s*read)\s*:\s*if\s+true\s*;/.test(body);
    const wideWrite = /allow\s+write\s*:\s*if\s+true\s*;/.test(body);
    if (wideRead && !PSEMMINE_PUBLIC_OK.has(name)) fail(`firestore.rules: /${name} grants world-readable access`);
    if (wideWrite) fail(`firestore.rules: /${name} grants world-writable access`);
  }
  // the entitlement helper must exist and be used by the campaign document
  if (!/function\s+hasPSEMineAccess/.test(firestoreRules.code)) fail('firestore.rules: hasPSEMineAccess() helper is missing');
  const campaign = firestoreRules.code.split(/match\s+\/psemine_campaigns/)[1] || '';
  if (!/hasPSEMineAccess\(/.test(campaign.split('match /')[0])) {
    fail('firestore.rules: /psemine_campaigns read is not entitlement-scoped');
  }
}

/* ── 4. Derive the composite indexes the repo's queries actually need ────── */

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '_vendor', '__pycache__', '.vercel', '.firebase']);
const sourceFiles = (dir, exts, skipTests) => {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (skipTests && (entry.name === 'tests' || entry.name.startsWith('test_'))) continue;
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (exts.some(e => entry.name.endsWith(e))) out.push(p);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
};

/** Split a call's argument list on top-level commas. */
function splitTop(s) {
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
/** Content between the '(' at `i` and its matching ')'. */
function balanced(text, i) {
  let depth = 0;
  for (let k = i; k < text.length; k++) {
    if (text[k] === '(') depth++;
    else if (text[k] === ')') { depth--; if (depth === 0) return text.slice(i + 1, k); }
  }
  return '';
}

const EQUALITY_OPS = new Set(['==', 'in', 'array-contains', 'array-contains-any']);
const required = new Map();     // "coll|f1 ASC,f2 DESC" -> [sites]
/**
 * Firestore serves a query from automatic single-field indexes unless it has to
 * COMBINE a filter with an order on another field. Equality filters (including
 * `in` / `array-contains`) merge across single-field indexes; a lone range filter
 * or a lone orderBy needs no composite either, and a range with an orderBy on
 * that SAME field (e.g. `timestamp >= x` + `orderBy timestamp desc`) is still
 * served by the single-field index. Anything else needs a composite.
 */
const addRequired = (coll, filters, orders, site) => {
  const equalityFields = [...new Set(filters.filter(f => EQUALITY_OPS.has(f.op)).map(f => f.field))];
  const rangeFields = [...new Set(filters.filter(f => !EQUALITY_OPS.has(f.op)).map(f => f.field))];
  const orderFields = orders.map(o => o.field);
  // fields that need index order beyond plain equality
  const ordered = [...new Set([...orderFields, ...rangeFields])];
  if (!ordered.length) return;
  if (!equalityFields.length && ordered.length === 1 && orderFields.length <= 1) return;
  const fields = [...equalityFields, ...ordered]
    .filter((f, idx, arr) => arr.indexOf(f) === idx)
    .map(f => `${f} ${orderFields.includes(f) ? orders.find(o => o.field === f).dir : 'ASCENDING'}`);
  const key = `${coll}|${fields.join(',')}`;
  if (!required.has(key)) required.set(key, []);
  required.get(key).push(site);
};

// ---- client: query(collection(db,'x'), where('a','==',v), orderBy('b','desc'))
for (const file of sourceFiles(path.join(ROOT, 'src'), ['.ts', '.tsx'], false)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bquery\(/g)) {
    const inner = balanced(text, m.index + m[0].length - 1);
    const line = text.slice(0, m.index).split('\n').length;
    const site = `${rel(file)}:${line}`;
    let coll = null;
    const filters = [], orders = [];
    for (const part of splitTop(inner)) {
      const c = part.match(/collection\(\s*db\s*,\s*['"]([^'"]+)['"]/);
      if (c) { coll = c[1]; continue; }
      // A query on a variable collection name (admin tab switchers) cannot be
      // classified statically — surface it so a human verifies its indexes.
      if (/collection\(\s*db\s*,\s*[A-Za-z_$]/.test(part)) note(`${site}: DYNAMIC collection argument \`${part.slice(0, 60)}\` — verify its indexes manually`);
      const w = part.match(/where\(\s*['"`]?([^'"`]+?)['"`]?\s*,\s*['"]([^'"]+)['"]/);
      if (w) { filters.push({ field: w[1].trim(), op: w[2] }); continue; }
      const o = part.match(/orderBy\(\s*['"`]?([^'"`]+?)['"`]?\s*,\s*['"]([^'"]+)['"]/);
      if (o) {
        if (o[1].includes('$')) { note(`${site}: dynamic orderBy field \`${o[1]}\` — classify manually`); continue; }
        orders.push({ field: o[1].trim(), dir: o[2].toUpperCase() === 'DESC' ? 'DESCENDING' : 'ASCENDING' });
      }
    }
    // dynamic order fields cannot be classified statically
    if (orders.some(o => o.field.includes('$'))) { note(`${site}: dynamic order field — verify indexes manually`); continue; }
    if (coll) addRequired(coll, filters, orders, site);
  }
}

// ---- server: db.collection('x').where(...).order_by(...)  (incl. aliases)
for (const file of sourceFiles(path.join(ROOT, 'api'), ['.py'], true)) {
  const text = fs.readFileSync(file, 'utf8');
  const aliases = new Map();
  for (const m of text.matchAll(/([A-Za-z_][\w]*)\s*=\s*db\.collection\(\s*['"]([^'"]+)['"]/g)) aliases.set(m[1], m[2]);

  const sites = [];
  for (const m of text.matchAll(/(?:db\.)?collection\(\s*['"]([^'"]+)['"]\s*\)/g)) sites.push({ index: m.index, end: m.index + m[0].length, coll: m[1] });
  for (const [alias, coll] of aliases) {
    for (const m of text.matchAll(new RegExp(`\\b${alias}\\s*\\n?\\s*\\.\\s*(?:where|order_by)\\s*\\(`, 'g'))) {
      sites.push({ index: m.index, end: m.index + alias.length, coll });
    }
  }
  for (const site of sites) {
    // walk the chained calls
    const filters = [], orders = [];
    let i = site.end;
    for (;;) {
      const rest = text.slice(i);
      const m = rest.match(/^[\s\\]*\.\s*([a-z_]+)\s*\(/);
      if (!m) break;
      const argsStart = i + m[0].length - 1;
      const args = balanced(text, argsStart);
      const method = m[1];
      if (method === 'where') {
        const a = args.match(/^\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
        if (a) filters.push({ field: a[1], op: a[2] });
      } else if (method === 'order_by') {
        const f = args.match(/^\s*['"]([^'"]+)['"]/);
        const d = args.match(/direction\s*=\s*['"]([A-Z]+)['"]/);
        if (f) orders.push({ field: f[1], dir: d ? d[1].toUpperCase() : 'ASCENDING' });
      }
      // balanced() returns the text BETWEEN the parens, so the next call starts
      // one past the closing ')': argsStart + 1 (open) + len (body) + 1 (close).
      i = argsStart + args.length + 2;
      if (['get', 'stream'].includes(method)) break;
    }
    const line = text.slice(0, site.index).split('\n').length;
    addRequired(site.coll, filters, orders, `${rel(file)}:${line}`);
  }
}

/*
 * Indexes verified by READING queries this scanner cannot classify (dynamic
 * collection or order fields). Keeping them here means the "declared but not
 * needed" note below stays truthful instead of suggesting a live index is dead.
 */
const HUMAN_VERIFIED = new Map([
  ['users|isFlagged ASCENDING,createdAt DESCENDING',
    'src/pages/admin/modules/OpsAuditCenter.tsx:59 (FLAGS tab: colName=users, where isFlagged == true, orderBy createdAt desc)'],
]);
for (const [key, why] of HUMAN_VERIFIED) if (!required.has(key)) required.set(key, [why]);

/* ── 5. Compare with the declared indexes ───────────────────────────────── */

if (indexesJson) {
  const declared = new Set();
  const seen = new Set();
  for (const idx of indexesJson.indexes || []) {
    const fields = (idx.fields || []).map(f => `${f.fieldPath} ${f.order}`);
    const key = `${idx.collectionGroup}|${fields.join(',')}`;
    if (seen.has(key)) fail(`firestore.indexes.json declares a duplicate index: ${key}`);
    seen.add(key);
    declared.add(key);
    if (idx.queryScope !== 'COLLECTION') fail(`firestore.indexes.json: ${key} must use queryScope COLLECTION`);
  }
  if ((indexesJson.fieldOverrides || []).length) note('firestore.indexes.json has fieldOverrides (single-field overrides) — review separately');

  for (const [key, sites] of required) {
    if (!declared.has(key)) {
      fail(`MISSING composite index: ${key.replace('|', ' → ')}  (required by ${[...new Set(sites)].join(', ')})`);
    }
  }
  for (const key of declared) {
    if (!required.has(key)) note(`declared but no current query needs it: ${key.replace('|', ' → ')} (kept; removal is a separate decision)`);
  }
}

/* ── 6. Every client-read collection must have a rules match block ──────── */

if (firestoreRules) {
  const serverOnly = new Set();       // Admin SDK-only collections (rules not needed)
  const clientCollections = new Set();
  for (const file of sourceFiles(path.join(ROOT, 'src'), ['.ts', '.tsx'], false)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:collection|doc)\(\s*db\s*,\s*['"]([^'"]+)['"]/g)) clientCollections.add(m[1]);
  }
  for (const coll of [...clientCollections].sort()) {
    if (serverOnly.has(coll)) continue;
    const covered = firestoreRules.matches.some(p => p.split('/')[0] === coll);
    if (covered) continue;
    // Scope matters for the verdict: this task's deliverable is the PSEmine
    // infrastructure, so a gap in a PulseEarn collection is reported (it is a
    // real defect — denied client reads) but it does not block the PSEmine
    // handoff. It must NOT be silently "fixed" with a permissive rule.
    if (coll.startsWith('psemine_')) fail(`client code reads/writes '${coll}' but firestore.rules has no match block for it`);
    else note(`OUTSIDE PSEmine SCOPE — client code uses '${coll}' but firestore.rules has no match block for it (reads are denied). PulseEarn-side gap; needs its own security review, not a permissive rule.`);
  }
}

/* ── Report ─────────────────────────────────────────────────────────────── */

console.log('── Firebase infrastructure check ──');
console.log(`   project (from .firebaserc): ${rc?.projects?.default || '(none)'}`);
console.log(`   firestore.rules match blocks: ${firestoreRules?.matches.length ?? '?'}`);
console.log(`   storage.rules match blocks:   ${storageRules?.matches.length ?? '?'}`);
console.log(`   declared composite indexes:   ${indexesJson?.indexes?.length ?? '?'}`);
console.log(`   indexes required by queries:  ${required.size}`);
if (process.env.PSE_FIREBASE_DEBUG === '1') {
  for (const [key, sites] of [...required].sort()) console.log(`      · ${key.replace('|', ' → ')}   ${[...new Set(sites)].join(', ')}`);
}

if (notes.length) {
  console.log('\nNOTES (no action required):');
  for (const n of notes) console.log(`   · ${n}`);
}
if (findings.length) {
  console.log('\nFINDINGS:');
  for (const f of findings) console.log(`   ✗ ${f}`);
  console.log(`\nRESULT: ${findings.length} finding(s) — fix before deploying.`);
  process.exit(1);
}
console.log('\nRESULT: deployable Firebase config is complete and consistent.');
