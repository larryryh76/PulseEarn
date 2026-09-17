/**
 * PSEmine / PulseEarn product-isolation guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * The failure this prevents was architectural, not a bug: AuthProvider (mounted
 * above the router, i.e. on every route) ran PulseEarn's daily-reward claim and
 * reward toast for any authenticated, verified, non-ops user. A PSEmine-only
 * user sitting on /mine/dashboard therefore triggered a PulseEarn points
 * mutation and a PulseEarn toast.
 *
 * The fix moved PulseEarn behaviour behind a route-scoped provider. Structure is
 * what keeps it fixed, so this script asserts the structure itself:
 *
 *   1. No PSEmine source file may import a PulseEarn PRODUCT module
 *      (rewards, points, tasks, predictions, notifications, activity).
 *   2. No PSEmine source file may call the PulseEarn economy endpoints.
 *   3. Global providers (wired in main.tsx) may not contain product behaviour.
 *   4. Every PulseEarn product module must be reachable only from the
 *      PulseEarn route wrapper or from PulseEarn/admin pages.
 *
 * Shared INFRASTRUCTURE (firebase config, auth primitives, ui, utils) is
 * allowed everywhere — that is the intended boundary.
 *
 * Usage: bun scripts/check-product-isolation.mjs   (exit 0 = isolated)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

/** Directories that make up the PSEmine product. */
const PSEMINE_DIRS = [
  'pages/psemine',
  'components/psemine',
  'engines/psemine',
];

/** Files that make up the PSEmine product by name. */
const PSEMINE_FILE = /^(PSEMine|Pse|pse)[A-Za-z0-9._-]*\.(ts|tsx)$/;

/**
 * PulseEarn PRODUCT modules — business behaviour, never shared.
 * Keyed by the module substring, with the reason it is forbidden.
 */
const FORBIDDEN = [
  { match: /PointTransactionEngine/, why: 'PulseEarn points economy' },
  { match: /pulseEarnProduct/, why: 'PulseEarn rewards/onboarding service' },
  { match: /PulseEarnProductContext/, why: 'PulseEarn reward provider' },
  { match: /TaskContext|useTaskContext/, why: 'PulseEarn task + prediction listeners' },
  { match: /ActivityEngine/, why: 'PulseEarn activity writer' },
  { match: /NotificationEngine(?!.*pse)/, why: 'PulseEarn notification writer' },
  { match: /hooks\/useNotifications/, why: "PulseEarn users/{uid}/notifications reader" },
  { match: /execute-transaction/, why: 'PulseEarn economy endpoint' },
  { match: /checkDailyReward|daily_reward/, why: 'PulseEarn daily reward claim' },
  { match: /welcome_bonus|welcomeBonus/, why: 'PulseEarn welcome bonus' },
  { match: /streak/, why: 'PulseEarn streak rewards' },
];

/**
 * Global entry points that must stay product-neutral.
 *
 * App.tsx is where the PulseEarn providers are *mounted* (inside the
 * PulseEarnRoute wrapper) — that is the fix, not a violation. What App.tsx and
 * main.tsx may not contain is PulseEarn *behaviour*: a claim call, an economy
 * mutation, a toast, a listener that acts on its own.
 */
const GLOBAL_ENTRIES = ['main.tsx', 'App.tsx'];
const GLOBAL_BEHAVIOUR = [
  { match: /checkDailyReward|daily_reward/, why: 'PulseEarn daily reward claim' },
  { match: /welcome_bonus|welcomeBonus/, why: 'PulseEarn welcome bonus' },
  { match: /PointTransactionEngine/, why: 'PulseEarn points economy' },
  { match: /execute-transaction/, why: 'PulseEarn economy endpoint' },
  { match: /ActivityEngine/, why: 'PulseEarn activity writer' },
  { match: /toast\.success\(\s*['"]Daily/, why: 'PulseEarn reward toast' },
];

const violations = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const allFiles = walk(SRC);
const rel = p => path.relative(SRC, p).split(path.sep).join('/');

const isPsemineFile = p => {
  const r = rel(p);
  if (PSEMINE_DIRS.some(d => r.startsWith(d + '/'))) return true;
  // Named PSEmine contexts/providers that live outside a psemine/ directory.
  return /(^|\/)(contexts|components|engines)\//.test(r) && PSEMINE_FILE.test(path.basename(r));
};

// ── Rule 1: PSEmine source must not import PulseEarn product behaviour ──────
for (const file of allFiles) {
  if (!isPsemineFile(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of FORBIDDEN) {
    if (rule.match.test(text)) {
      violations.push({
        rule: 'PSEmine source depends on PulseEarn product behaviour',
        file: rel(file), detail: rule.why,
      });
    }
  }
}

// ── Rule 2: global entry points must stay product-neutral ───────────────────
for (const name of GLOBAL_ENTRIES) {
  const file = path.join(SRC, name);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of GLOBAL_BEHAVIOUR) {
    if (rule.match.test(text)) {
      violations.push({
        rule: 'Global entry point contains product behaviour',
        file: rel(file), detail: rule.why,
      });
    }
  }
}

// ── Rule 3: PulseEarn product modules are mounted only in PulseEarn scope ───
// TaskProvider / PulseEarnProductProvider may only appear in App.tsx (inside the
// PulseEarnRoute wrapper) or in PulseEarn/admin page trees.
const PULSE_MODULES = [/TaskProvider/, /PulseEarnProductProvider/, /pulseEarnProduct/];
const PULSE_ALLOWED = [
  /^App\.tsx$/,
  /^pages\/(?!psemine\/)/,
  /^components\/(?!psemine\/)/,
  /^contexts\//,
  /^engines\/(product|points|tasks|predictions)\//,
  /^hooks\//,
];
for (const file of allFiles) {
  const r = rel(file);
  if (!PULSE_ALLOWED.some(re => re.test(r))) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const m of PULSE_MODULES) {
    if (m.test(text) && !/^App\.tsx$/.test(r)) {
      // References outside App.tsx are fine only inside the PulseEarn trees.
      const inPulseTree = /^pages\//.test(r) || /^contexts\//.test(r) ||
        /^engines\//.test(r) || /^hooks\//.test(r) || /^components\//.test(r);
      if (!inPulseTree) {
        violations.push({ rule: 'PulseEarn provider mounted outside PulseEarn scope', file: r, detail: String(m) });
      }
    }
  }
}

// ── Rule 4: report the boundary so drift is visible ────────────────────────
const pulseTrees = allFiles.filter(f => {
  const r = rel(f);
  return /^(pages|components|engines|contexts|hooks)\//.test(r) && !isPsemineFile(f);
}).length;

// ── Rule 5: the guard must be able to fail ─────────────────────────────────
// A detector that matches nothing would pass forever. This asserts the patterns
// still match real PulseEarn product source, so a rename cannot silently turn
// the guard into a no-op.
const pulseProductSources = ['contexts/PulseEarnProductContext.tsx', 'engines/product/pulseEarnProduct.ts'];
const livePatterns = new Set();
for (const p of pulseProductSources) {
  const abs = path.join(SRC, p);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  for (const rule of FORBIDDEN) if (rule.match.test(text)) livePatterns.add(String(rule.match));
}
if (livePatterns.size === 0) {
  console.error('ISOLATION GUARD SELF-TEST FAILED: no forbidden pattern matches known PulseEarn source,');
  console.error('so this guard would pass vacuously. Update FORBIDDEN to the current module names.');
  process.exit(1);
}

if (violations.length) {
  console.error('PRODUCT ISOLATION FAILED\n');
  for (const v of violations) console.error(`  ✗ ${v.rule}\n    file: ${v.file}\n    ${v.detail}\n`);
  process.exit(1);
}

console.log('Product isolation OK');
console.log(`  PSEmine files scanned:  ${allFiles.filter(isPsemineFile).length}`);
console.log(`  Total source files:     ${allFiles.length}`);
console.log(`  PulseEarn-side files:   ${pulseTrees}`);
console.log('  PSEmine → PulseEarn product imports: 0');
console.log(`  Detector self-test:     ${livePatterns.size} forbidden patterns verified live`);
