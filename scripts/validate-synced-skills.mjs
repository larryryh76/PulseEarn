#!/usr/bin/env node
/**
 * Validates the content synced into `.agents/skills/` by
 * `.github/workflows/sync-skills.yml`.
 *
 * WHY THIS EXISTS
 *
 * The skills are fetched from three upstream repositories by a third-party
 * action, so nothing in this repository is typechecked or otherwise checked as
 * they land: they are data (JSON, CSV, Markdown, HTML, CSS) that the app never
 * imports. A daily sync that silently lands a truncated manifest, a ragged CSV
 * or a package whose `manifest.json` disagrees with its own folder is invisible
 * until someone tries to use the skill.
 *
 * This script is the check that stands between a sync and `main`. It validates
 * the *contracts* the upstream content documents for itself:
 *
 *   - `.github/sync.yml` mapping destinations exist in the tree.
 *   - Every JSON file in the synced paths parses.
 *   - Every CSV parses with a stable header and no ragged row.
 *   - Every design-system package satisfies the project manifest contract
 *     declared in `design-systems/README.md` and `_schema/AGENTS.md`.
 *   - Every SKILL.md has front matter whose `name` matches its directory.
 *
 * It also reports (without failing) relative Markdown references that point at
 * files the sync configuration does not copy, so the gap is visible on every
 * run instead of being discovered mid-task.
 *
 * PHP-FREE, DEPENDENCY-FREE: Node builtins only, because it runs before (and
 * independently of) `bun install` in the workflow.
 *
 * Usage:
 *   node scripts/validate-synced-skills.mjs            # validate (CI gate)
 *   node scripts/validate-synced-skills.mjs --inventory # also list the catalog
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, extname, resolve } from 'node:path';

const ROOT = process.cwd();
const SKILLS_DIR = join(ROOT, '.agents/skills');
const INVENTORY = process.argv.includes('--inventory');

const fails = [];
const warns = [];
let checks = 0;

const fail = (label, detail = '') => fails.push(detail ? `${label} — ${detail}` : label);
const warn = (label, detail = '') => warns.push(detail ? `${label} — ${detail}` : label);
const check = (ok, label, detail = '') => {
  checks += 1;
  if (!ok) fail(label, detail);
  return ok;
};

/** Recursive file listing, deterministic order, no symlink following. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, embedded
 * newlines. Returns rows of raw strings, or null with a reason on malformed
 * input — a naive `split(',')` would report false failures on this catalog.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* handled by \n */ }
    else field += c;
  }
  if (quoted) return { error: 'unterminated quoted field' };
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return { rows: rows.filter(r => !(r.length === 1 && r[0] === '')) };
}

/*
 * ── design-system project manifest contract ──────────────────────────────
 *
 * A faithful port of `design-systems/_schema/manifest.schema.ts`, which the
 * catalog's own `_schema/AGENTS.md` names as the source of truth. It is ported
 * rather than imported because the schema is TypeScript that ships inside the
 * synced content and cannot be imported by a plain Node script.
 */

const SCHEMA_VERSION = 'od-design-system-project/v1';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MANIFEST_KEYS = new Set([
  'schemaVersion', 'id', 'name', 'category', 'description', 'source', 'files',
  'assetsDir', 'previewDir', 'usage', 'componentsManifest', 'importMode',
  'craft', 'fonts', 'preview', 'sourceFiles',
]);
const SOURCE_KEYS = {
  bundled: ['type', 'origin'],
  local: ['type', 'path', 'importedAt'],
  github: ['type', 'url', 'branch', 'commit', 'importedAt'],
  shadcn: ['type', 'reference', 'registryUrl', 'item', 'homepage', 'importedAt'],
};
const FILES_KEYS = ['design', 'tokens', 'designTokens', 'tailwind', 'components'];
const CRAFT_KEYS = ['applies', 'suggested', 'exemptions'];
const FONT_KEYS = ['family', 'file', 'weight', 'style'];
const PREVIEW_KEYS = ['dir', 'pages'];
const PREVIEW_PAGE_KEYS = ['path', 'role', 'title'];
const SOURCE_FILE_KEYS = ['scanned', 'evidence', 'tokens', 'report', 'snippets'];
const IMPORT_MODES = ['normalized', 'hybrid', 'verbatim'];

const isRecord = v => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Collects contract violations for one manifest, with the slug as the label. */
function validateManifest(slug, manifest) {
  const bad = (message) => fail(`${slug}: ${message}`);
  const nonEmpty = (label, value) => {
    if (typeof value !== 'string' || value.trim() === '') bad(`${label} must be a non-empty string`);
  };
  const literal = (label, value, expected) => {
    if (value !== expected) bad(`${label} must be ${JSON.stringify(expected)} (found ${JSON.stringify(value)})`);
  };
  const safePath = (label, value) => {
    if (typeof value !== 'string' || value.trim() === '') { bad(`${label} must be a non-empty relative path`); return; }
    if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.includes('\\')) {
      bad(`${label} must be a safe relative path`);
      return;
    }
    if (value.split('/').some(seg => seg === '' || seg === '.' || seg === '..')) {
      bad(`${label} must be a safe relative path without empty, "." or ".." segments`);
    }
  };
  const knownKeys = (label, value, allowed) => {
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) bad(`${label}.${key} is not part of the v1 design-system project schema`);
    }
  };
  const slugList = (label, value) => {
    if (!Array.isArray(value)) { bad(`${label} must be an array of lowercase slugs`); return; }
    value.forEach((entry, i) => {
      if (typeof entry !== 'string' || !SLUG.test(entry)) bad(`${label}[${i}] must be a lowercase slug`);
    });
  };

  checks += 1;
  knownKeys('$', manifest, [...MANIFEST_KEYS]);
  literal('$.schemaVersion', manifest.schemaVersion, SCHEMA_VERSION);
  if (typeof manifest.id !== 'string' || !SLUG.test(manifest.id)) {
    bad('$.id must be a lowercase slug matching /^[a-z0-9]+(?:-[a-z0-9]+)*$/');
  } else if (manifest.id !== slug) {
    bad(`$.id must equal the folder slug (id=${manifest.id}, folder=${slug})`);
  }
  nonEmpty('$.name', manifest.name);
  nonEmpty('$.category', manifest.category);
  if (manifest.description !== undefined) nonEmpty('$.description', manifest.description);

  /* source ─ type discriminates the allowed key set. */
  if (!isRecord(manifest.source)) bad('$.source must be an object');
  else {
    const type = manifest.source.type;
    if (!SOURCE_KEYS[type]) bad('$.source.type must be one of bundled, local, github, shadcn');
    else {
      knownKeys('$.source', manifest.source, SOURCE_KEYS[type]);
      if (type === 'bundled') {
        if (manifest.source.origin !== undefined) nonEmpty('$.source.origin', manifest.source.origin);
      } else if (type === 'local') {
        nonEmpty('$.source.path', manifest.source.path);
      } else if (type === 'github') {
        nonEmpty('$.source.url', manifest.source.url);
      } else {
        nonEmpty('$.source.reference', manifest.source.reference);
      }
    }
  }

  /* files ─ fixed canonical names, not free-form paths. */
  if (!isRecord(manifest.files)) bad('$.files must be an object');
  else {
    knownKeys('$.files', manifest.files, FILES_KEYS);
    literal('$.files.design', manifest.files.design, 'DESIGN.md');
    literal('$.files.tokens', manifest.files.tokens, 'tokens.css');
    if (manifest.files.designTokens !== undefined) literal('$.files.designTokens', manifest.files.designTokens, 'design-tokens.json');
    if (manifest.files.tailwind !== undefined) literal('$.files.tailwind', manifest.files.tailwind, 'tailwind-v4.css');
    if (manifest.files.components !== undefined) literal('$.files.components', manifest.files.components, 'components.html');
  }

  if (manifest.assetsDir !== undefined) literal('$.assetsDir', manifest.assetsDir, 'assets');
  if (manifest.previewDir !== undefined) literal('$.previewDir', manifest.previewDir, 'preview');
  if (manifest.usage !== undefined) safePath('$.usage', manifest.usage);
  if (manifest.componentsManifest !== undefined) safePath('$.componentsManifest', manifest.componentsManifest);
  if (manifest.importMode !== undefined && !IMPORT_MODES.includes(manifest.importMode)) {
    bad('$.importMode must be one of normalized, hybrid, verbatim');
  }

  if (manifest.craft !== undefined) {
    if (!isRecord(manifest.craft)) bad('$.craft must be an object');
    else {
      knownKeys('$.craft', manifest.craft, CRAFT_KEYS);
      for (const key of CRAFT_KEYS) slugList(`$.craft.${key}`, manifest.craft[key]);
    }
  }

  if (manifest.fonts !== undefined) {
    if (!Array.isArray(manifest.fonts)) bad('$.fonts must be an array');
    else manifest.fonts.forEach((font, i) => {
      if (!isRecord(font)) { bad(`$.fonts[${i}] must be an object`); return; }
      knownKeys(`$.fonts[${i}]`, font, FONT_KEYS);
      nonEmpty(`$.fonts[${i}].family`, font.family);
      safePath(`$.fonts[${i}].file`, font.file);
    });
  }

  if (manifest.preview !== undefined) {
    if (!isRecord(manifest.preview)) bad('$.preview must be an object');
    else {
      knownKeys('$.preview', manifest.preview, PREVIEW_KEYS);
      safePath('$.preview.dir', manifest.preview.dir);
      if (!Array.isArray(manifest.preview.pages)) bad('$.preview.pages must be an array');
      else manifest.preview.pages.forEach((page, i) => {
        if (!isRecord(page)) { bad(`$.preview.pages[${i}] must be an object`); return; }
        knownKeys(`$.preview.pages[${i}]`, page, PREVIEW_PAGE_KEYS);
        safePath(`$.preview.pages[${i}].path`, page.path);
      });
    }
  }

  if (manifest.sourceFiles !== undefined) {
    if (!isRecord(manifest.sourceFiles)) bad('$.sourceFiles must be an object');
    else {
      knownKeys('$.sourceFiles', manifest.sourceFiles, SOURCE_FILE_KEYS);
      for (const key of SOURCE_FILE_KEYS) {
        if (manifest.sourceFiles[key] !== undefined) safePath(`$.sourceFiles.${key}`, manifest.sourceFiles[key]);
      }
    }
  }
}

/* ── 1. sync mapping destinations ───────────────────────────────────────── */

const syncConfigPath = join(ROOT, '.github/sync.yml');
if (!existsSync(syncConfigPath)) {
  fail('.github/sync.yml is missing');
} else {
  const syncText = readFileSync(syncConfigPath, 'utf8');
  const mappings = [...syncText.matchAll(/^\s*-\s*source:\s*(\S+)\s*\n\s*dest:\s*(\S+)\s*$/gm)]
    .map(m => ({ source: m[1], dest: m[2] }));
  if (!check(mappings.length > 0, '.github/sync.yml declares sync mappings')) {
    // nothing more to check without mappings
  } else {
    for (const { dest } of mappings) {
      const full = join(ROOT, dest);
      if (dest.endsWith('/')) {
        // A directory destination is materialised by the sync itself; what must
        // already exist is the skill directory it is created inside.
        const parent = dirname(full);
        if (!check(existsSync(parent), `sync destination parent exists: ${relative(ROOT, parent)}`)) continue;
        if (!existsSync(full)) console.log(`sync will create: ${dest}`);
      } else {
        check(existsSync(full), `sync destination exists: ${dest}`);
      }
    }
    console.log(`sync mappings: ${mappings.length}`);
  }
}

/* ── 2. walk the synced paths ───────────────────────────────────────────── */

if (!existsSync(SKILLS_DIR)) {
  fail('.agents/skills is missing');
} else {
  const files = walk(SKILLS_DIR);
  const byExt = new Map();
  for (const file of files) {
    const ext = extname(file).toLowerCase() || '(none)';
    byExt.set(ext, (byExt.get(ext) ?? 0) + 1);
  }
  console.log(`synced files: ${files.length}`);
  console.log(`  ${[...byExt.entries()].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e}:${n}`).join('  ')}`);

  /* JSON ─ parses. */
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  let badJson = 0;
  for (const file of jsonFiles) {
    try {
      JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      badJson += 1;
      fail(`JSON does not parse: ${relative(ROOT, file)}`, String(err.message).slice(0, 120));
    }
  }
  check(badJson === 0, `all ${jsonFiles.length} JSON files parse`);

  /* CSV ─ stable header, no ragged rows. */
  const csvFiles = files.filter(f => f.endsWith('.csv'));
  let badCsv = 0;
  for (const file of csvFiles) {
    const parsed = parseCsv(readFileSync(file, 'utf8'));
    const rel = relative(ROOT, file);
    if (parsed.error) { badCsv += 1; fail(`CSV does not parse: ${rel}`, parsed.error); continue; }
    const [header, ...body] = parsed.rows;
    if (!header || header.length < 2) { badCsv += 1; fail(`CSV has no usable header: ${rel}`); continue; }
    const ragged = body.findIndex(r => r.length !== header.length);
    if (ragged !== -1) {
      badCsv += 1;
      fail(`CSV row is ragged: ${rel}`, `row ${ragged + 2} has ${body[ragged].length} of ${header.length} columns`);
    }
  }
  check(badCsv === 0, `all ${csvFiles.length} CSV files parse with a stable header`);

  /* SKILL.md ─ front matter, name matches directory. */
  const skillDocs = files.filter(f => f.endsWith('/SKILL.md'));
  check(skillDocs.length > 0, 'at least one SKILL.md is present');
  for (const file of skillDocs) {
    const rel = relative(ROOT, file);
    const text = readFileSync(file, 'utf8');
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!check(Boolean(fm), `${rel} has YAML front matter`)) continue;
    const name = /^name:\s*(.+?)\s*$/m.exec(fm[1])?.[1]?.replace(/^["']|["']$/g, '');
    const hasDescription = /^description:\s*\S/m.test(fm[1]);
    check(Boolean(name), `${rel} front matter declares name`);
    check(hasDescription, `${rel} front matter declares description`);
    const dir = file.split('/').slice(-2, -1)[0];
    check(name === dir, `${rel} front matter name matches its directory`, `name=${name} dir=${dir}`);
  }

  /*
   * Relative references ─ visible gap, not a hard failure.
   *
   * Two idioms are in use upstream: Markdown links (`](references/x.md)`) and
   * backticked paths in prose (`` `references/x.md` ``). Both are collected,
   * because a skill whose own instructions point at a file the sync does not
   * copy cannot be followed, and that is worth seeing on every run.
   */
  /**
   * A prose path may be written from the package root, the skill root or the
   * repository root, so resolve it against the file's own directory and then
   * each ancestor before calling it missing. Only a path that resolves nowhere
   * is a real gap.
   */
  const resolvesFromAncestor = (file, target) => {
    if (target.startsWith('/')) return existsSync(join(ROOT, target));
    let dir = dirname(file);
    while (dir.startsWith(SKILLS_DIR)) {
      if (existsSync(resolve(dir, target))) return true;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return false;
  };

  const reported = new Set();
  for (const file of files.filter(f => f.endsWith('.md'))) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    const targets = [
      ...[...text.matchAll(/\]\(([^)#?\s]+)\)/g)].map(m => m[1]),
      // Backticked paths only: bare filenames are prose, not references.
      ...[...text.matchAll(/`([a-zA-Z0-9_][a-zA-Z0-9_./-]*\/[a-zA-Z0-9_.-]+\.(?:md|csv|json|html|css|ts|py))`/g)].map(m => m[1]),
    ];
    for (const target of targets) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue; // scheme or anchor
      if (resolvesFromAncestor(file, target)) continue;
      const full = target.startsWith('/') ? join(ROOT, target) : resolve(dirname(file), target);
      const dest = relative(ROOT, full);
      const key = `${rel} → ${target}`;
      if (reported.has(key)) continue;
      reported.add(key);
      // Covered by a sync mapping but absent, or outside the synced paths.
      if (dest.startsWith('.agents/skills/')) warn(`referenced file is missing: ${key}`);
      else warn(`reference escapes the synced tree: ${key}`);
    }
  }
}

/* ── 3. design-system package contract ──────────────────────────────────── */

const DS_DIR = join(SKILLS_DIR, 'open-design/design-systems');
const packages = [];
if (existsSync(DS_DIR)) {
  const entries = readdirSync(DS_DIR).sort();
  for (const slug of entries) {
    const dir = join(DS_DIR, slug);
    if (!statSync(dir).isDirectory()) continue;
    if (slug.startsWith('_')) continue; // _schema
    packages.push({ slug, dir });
  }

  const categories = new Map();
  for (const { slug, dir } of packages) {
    const manifestPath = join(dir, 'manifest.json');
    if (!check(existsSync(manifestPath), `${slug}: manifest.json is present`)) continue;

    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      fail(`${slug}: manifest.json does not parse`, String(err.message).slice(0, 100));
      continue;
    }

    // The machine-enforced contract, ported from _schema/manifest.schema.ts.
    validateManifest(slug, manifest);

    if (manifest.category) categories.set(manifest.category, (categories.get(manifest.category) ?? 0) + 1);

    // Required canonical files, plus every rich path the manifest declares.
    const declared = [
      manifest.files?.design ?? 'DESIGN.md',
      manifest.files?.tokens ?? 'tokens.css',
      ...Object.values(manifest.files ?? {}),
      manifest.usage,
      manifest.componentsManifest,
      manifest.preview?.dir,
      // Every indexed preview page and webfont is a declared, present path too.
      ...(Array.isArray(manifest.preview?.pages) ? manifest.preview.pages.map(p => p?.path) : []),
      ...(Array.isArray(manifest.fonts) ? manifest.fonts.map(f => f?.file) : []),
      ...Object.values(manifest.sourceFiles ?? {}),
    ].filter(Boolean);
    for (const rel of new Set(declared)) {
      check(existsSync(join(dir, rel)), `${slug}: declared path exists (${rel})`);
    }

    const designPath = join(dir, manifest.files?.design ?? 'DESIGN.md');
    if (existsSync(designPath)) {
      const headings = readFileSync(designPath, 'utf8').match(/^##\s+\S/gm) ?? [];
      check(headings.length >= 7, `${slug}: DESIGN.md has at least seven H2 sections`, `found ${headings.length}`);
    }

    const tokensPath = join(dir, manifest.files?.tokens ?? 'tokens.css');
    if (existsSync(tokensPath)) {
      const css = readFileSync(tokensPath, 'utf8');
      check(css.includes(':root'), `${slug}: tokens.css declares a :root block`);
      const customProps = css.match(/--[a-z0-9-]+\s*:/gi) ?? [];
      check(customProps.length >= 10, `${slug}: tokens.css declares tokens`, `found ${customProps.length}`);
    }
  }

  console.log(`design-system packages: ${packages.length}`);
  if (INVENTORY) {
    for (const { slug, dir } of packages) {
      let manifest = {};
      try { manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')); } catch { /* reported above */ }
      const files = walk(dir).length;
      console.log(`  ${slug.padEnd(22)} ${String(files).padStart(3)} files  ${manifest.category ?? '?'}  — ${manifest.name ?? '?'}`);
    }
    console.log('\ncategories:');
    for (const [category, n] of [...categories.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(3)}  ${category}`);
    }
  }
}

/* ── Report ─────────────────────────────────────────────────────────────── */

console.log('');
for (const w of warns) console.log(`WARN  ${w}`);
for (const f of fails) console.log(`FAIL  ${f}`);

let total = 0;
function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  return walk(dir).length;
}
total = countFiles(SKILLS_DIR);

if (fails.length > 0) {
  console.log(`\nSKILL SYNC VALIDATION FAILED — ${fails.length} of ${checks} checks failed (${total} files scanned).`);
  process.exit(1);
}
console.log(
  `\nSKILL SYNC VALIDATION PASSED — ${checks} checks, ${total} files scanned, ${packages.length} design-system packages, ${warns.length} warning(s).`,
);
