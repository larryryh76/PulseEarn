import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// PSEmine design system v2 (scoped to .pse-scope) — loaded after the global
// stylesheet so the product's own token scale and primitives layer on top of it.
import './styles/psemine-v2.css'
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
