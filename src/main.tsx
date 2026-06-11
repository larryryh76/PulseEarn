import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { Web3Provider } from './contexts/Web3Provider'
import { TaskProvider } from './contexts/TaskContext'
import { seedTasks } from './firebase/seed'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Runtime Debug Telemetry
console.log("-----------------------------------------");
console.log("PULSE_EARN_BOOT: Initialize System");
console.log(`PULSE_EARN_BOOT: Environment: ${import.meta.env.MODE}`);
console.log(`PULSE_EARN_BOOT: Admin Link: ${import.meta.env.VITE_ADMIN_EMAIL ? 'CONFIGURED' : 'NOT_SET'}`);
console.log("-----------------------------------------");

// Seed initial tasks if collection is empty
seedTasks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="App Root">
      <Web3Provider>
        <AuthProvider>
          <TaskProvider>
            <Suspense fallback={<div className="min-h-screen bg-[#050507] flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
              <App />
            </Suspense>
          </TaskProvider>
        </AuthProvider>
      </Web3Provider>
    </ErrorBoundary>
  </StrictMode>,
)
