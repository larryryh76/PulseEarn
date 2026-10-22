/**
 * Console harness entry — mounts the REAL page components inside the REAL shell,
 * with fixture-backed provider hooks (see mocks.tsx).
 *
 * The route table mirrors src/App.tsx's console branch, minus the authentication
 * guard, because the fixture IS the authenticated session. Nothing else is
 * simulated: the shell, the dock, the campaign band, the footer, the page
 * headers, the registers, the skeletons and the empty states are the product's
 * own.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PSEMineShell } from '../../src/components/psemine/PSEMineShell';
import { PSEMineDashboard } from '../../src/pages/psemine/PSEMineDashboard';
import { PSEMineTools } from '../../src/pages/psemine/PSEMineTools';
import { PSEMineWallet } from '../../src/pages/psemine/PSEMineWallet';
import { PSEMineReferrals } from '../../src/pages/psemine/PSEMineReferrals';
import { PSEMineActivity } from '../../src/pages/psemine/PSEMineActivity';
import { PSEMineMe } from '../../src/pages/psemine/PSEMineMe';
import { buildFixture, type Scenario } from './fixture';

const params = new URLSearchParams(window.location.search);
const scenario = (params.get('scenario') || 'full') as Scenario;
const path = params.get('path') || '/mine/dashboard';

window.__PSE_FIXTURE__ = buildFixture(scenario);

const PAGES: Record<string, React.ReactElement> = {
  '/mine/dashboard': <PSEMineDashboard />,
  '/mine/tools': <PSEMineTools />,
  '/mine/wallet': <PSEMineWallet />,
  '/mine/referrals': <PSEMineReferrals />,
  '/mine/activity': <PSEMineActivity />,
  '/mine/me': <PSEMineMe />,
  /* The guide is an overlay on the console, not a page: the shell opens it for
     /mine/guide, so the harness pairs that path with a real console page beneath
     it — exactly what a reader sees when they deep-link the guide. */
  '/mine/guide': <PSEMineDashboard />,
};

const page = PAGES[path] ?? PAGES['/mine/dashboard'];

createRoot(document.getElementById('root') as HTMLElement).render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route element={<PSEMineShell />}>
        <Route path="*" element={page} />
      </Route>
    </Routes>
  </MemoryRouter>,
);
