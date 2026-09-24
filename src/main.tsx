import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// PSEmine — DUTY & LEDGER — the single authoritative PSEmine style layer,
// loaded after the global stylesheet. It owns the product's palette, type
// ramp, surfaces, instruments and controls, and the retired v2/v3 layers are
// gone, so no PSEmine surface can render a token this file does not define.
import './styles/psemine.css'
import App from './App.tsx'
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
