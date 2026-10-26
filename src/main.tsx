import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// PSEmine product visual layer (brand, loader, authentication family, public
// landing page), scoped to `.pse` so it never restyles PulseEarn.
import './styles/psemine.css'
// The landing page's art-direction layer: the composed surfaces it is built from
// (asymmetric split, application window tail, purchase console, settlement
// statement, trust map) plus the branded loader. Loaded after psemine.css so the
// handful of re-compositions it carries sit later in the cascade by construction.
import './styles/psemine-product.css'
// The authentication family's own additions to that layer (brand lockup at the
// task, the form-as-instrument surface, the password quality meter). Loaded after
// psemine.css so its overrides sit later in the cascade by construction.
import './styles/psemine-auth.css'
// The art-direction layer for the public product surfaces: the instrument-plate
// section header, the PSEmine application window, the equipment faces, the
// printed scales and the rail geometries. Loaded last so a re-composition is
// later in the cascade by construction rather than by specificity tricks.
import './styles/psemine-art.css'
// The document surface: PSEmine's terms, policies and support pages. One surface
// type that nothing else renders, in its own layer so it adds no rules to the
// landing page, authentication, the loader or the console.
import './styles/psemine-docs.css'
// Import the app graph first so page-level CSS is evaluated before the authenticated
// console layer. The console layer then owns the final cascade for authenticated
// routes instead of being silently overridden by CSS imported by route components.
import App from './App.tsx'
import './styles/psemine-console.css'
import './styles/psemine-admin-shell.css'
// The authenticated console's own layer: its fixed graphite palette, shell
// chrome, campaign strip, registers, ledgers, empty states, dialogs, the
// notification sheet and the guide overlay. Loaded last, for the same cascade
// reason as the layers above it.
// Load after the page modules' legacy styles so the new console design owns the cascade.
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Global Handler for Chunk Load Errors (Deployment Refresh)
window.addEventListener('error', (e) => {
  if (e.message.includes('Loading chunk') || e.message.includes('CSS_CHUNK_LOAD_FAILED')) {
    console.warn('Chunk load failed. A new version might be available. Refreshing...');
    window.location.reload();
  }
});

// Batch 4: Clean production telemetry
if (import.meta.env.DEV) {
  console.log("-----------------------------------------");
  console.log("PULSE_EARN_BOOT: Initialize System");
  console.log(`PULSE_EARN_BOOT: Environment: ${import.meta.env.MODE}`);
  console.log(`PULSE_EARN_BOOT: Admin Link: ${import.meta.env.VITE_ADMIN_EMAIL ? 'CONFIGURED' : 'NOT_SET'}`);
  console.log("-----------------------------------------");
}

// Seed initial tasks if collection is empty (Admin check performed inside seedTasks)
// seedTasks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="App Root">
      <ThemeProvider>
        <AuthProvider>
            <Suspense fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-primary/10 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            }>
              <App />
              </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
