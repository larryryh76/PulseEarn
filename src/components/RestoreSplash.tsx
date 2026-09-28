/**
 * The shared identity layer's session-restoration splash.
 *
 * WHY THIS EXISTS AS ITS OWN COMPONENT
 *
 * `AuthProvider` owns the one wait every route in the application shares: the
 * Firebase session restore plus the `users/{uid}` identity document that carries
 * product entitlement. Until that resolves the provider renders no children at
 * all, so this splash — not any route's own loading state — is what a person
 * actually sees while the identity layer settles.
 *
 * That made it the real answer to "the PSEmine loader never seems to change".
 * The PSEmine branded loader is correct, but it sits behind this gate: by the
 * time `PSEMineEntry` can look at `loading`, the identity layer has already
 * finished, so the product's own loader was effectively unreachable and every
 * PSEmine visitor watched an *unbranded, PulseEarn-coloured* bar instead. The
 * lifecycle was fine; the presentation of the wait was not.
 *
 * THE FIX IS PRESENTATION ONLY — AND IT IS EXPLICITLY ROUTE-SCOPED
 *
 * The wait, its duration, its timeout and its failure handling are untouched.
 * What changes is which product's identity is shown while the wait happens:
 *
 *   /mine/*   the PSEmine plane, mark, name and indeterminate rail, using the
 *             product's own loader component and copy
 *   anything else
 *             byte-for-byte the previous neutral splash, so PulseEarn and the
 *             rest of the application are not restyled by this at all
 *
 * The product is decided from `window.location.pathname` rather than a router
 * hook because `AuthProvider` is mounted *outside* `BrowserRouter` (see
 * `src/main.tsx`), so no route context is available here. Reading the path is
 * also the honest signal: this is "which product's chrome should be showing on
 * this URL", not application state.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { PseLoader } from './psemine/PseLoader';

/** Is the current URL inside the PSEmine product? */
function onPseSurface(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/mine' || path.startsWith('/mine/');
}

/**
 * PSEmine's restoration state.
 *
 * It renders the product's ONE loader — the same plate, rail and honest sentence
 * the console and the authentication routes use — on the product's own plane, so
 * the wait before the application appears belongs to PSEmine rather than to the
 * shared identity layer.
 */
const PseRestoreSplash: React.FC = () => (
  <div
    data-testid="identity-restore"
    className="pse pse-surface pse-plane fixed inset-0 z-[100] flex items-center justify-center"
  >
    <PseLoader variant="page" stage="session" />
  </div>
);

/**
 * The neutral restoration state: one indeterminate rail, no brand, no product
 * claim. Deliberately unbranded, because the shared identity layer serves every
 * product and must not assert which one a visitor is heading into.
 */
const NeutralRestoreSplash: React.FC = () => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    data-testid="identity-restore"
    className="fixed inset-0 z-[100] bg-[#050507] flex flex-col items-center justify-center gap-6"
  >
    <div className="flex flex-col items-center gap-3">
      <div className="w-48 h-1 bg-surface-glass rounded-full overflow-hidden relative">
        <motion.div
          initial={{ left: '-100%' }}
          animate={{ left: '100%' }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 w-1/2 bg-primary rounded-full shadow-[0_0_15px_rgba(0,112,255,0.5)]"
        />
      </div>
      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Loading Account</p>
    </div>
  </motion.div>
);

export const RestoreSplash: React.FC = () => (onPseSurface() ? <PseRestoreSplash /> : <NeutralRestoreSplash />);

export default RestoreSplash;
