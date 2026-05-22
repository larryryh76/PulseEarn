import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { Web3Provider } from './contexts/Web3Provider'
import { seedTasks } from './firebase/seed'

// Seed initial tasks if collection is empty
seedTasks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Web3Provider>
  </StrictMode>,
)
