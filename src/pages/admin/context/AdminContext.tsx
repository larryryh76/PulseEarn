import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../utils/AdminLogger';

interface AdminContextType {
  isInitialized: boolean;
  systemStatus: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  lastError: string | null;
  logAdminAction: (action: string, metadata: any) => Promise<void>;
  healthCheck: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData, currentUser } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'ONLINE' | 'OFFLINE' | 'MAINTENANCE'>('ONLINE');
  const [lastError, setLastError] = useState<string | null>(null);

  const healthCheck = async () => {
    try {
      // Perform a lightweight read to verify backend connectivity
      const testQuery = query(collection(db, 'system_config'), limit(1));
      const snap = await getDocs(testQuery);

      // Verification: Config must exist for the system to be "Healthy"
      if (snap.empty) {
        throw new Error("CORE_CONFIG_MISSING: The 'system_config' collection is empty. Run seed or check database.");
      }

      return true;
    } catch (err: any) {
      logger.log('ERROR', 'CORE', 'Health check failed', { error: err.message });
      setLastError(err.message);
      return false;
    }
  };

  useEffect(() => {
    const initializeAdmin = async () => {
      // 1. Session Validation
      if (!currentUser) {
        setIsInitialized(false);
        return;
      }

      // 2. Role Verification
      if (userData?.role !== 'admin' && currentUser.email?.toLowerCase() !== import.meta.env.VITE_ADMIN_EMAIL) {
        logger.log('WARN', 'AUTH', 'Unauthorized access attempt', { uid: currentUser.uid, email: currentUser.email });
        setIsInitialized(false);
        return;
      }

      logger.log('INFO', 'BOOT', 'Initiating Admin sub-system boot sequence...');

      try {
        // 3. Backend Connectivity Check
        const isHealthy = await healthCheck();
        if (!isHealthy) {
          throw new Error("Backend connection established but authority refused. Check network or Firestore rules.");
        }

        setSystemStatus('ONLINE');
        setIsInitialized(true);
        logger.log('INFO', 'BOOT', 'Boot sequence finalized. Admin  Online.');
      } catch (err: any) {
        logger.log('FATAL', 'BOOT', 'Admin initialization sequence failed', { error: err.message });
        setLastError(err.message);
        setSystemStatus('OFFLINE');
        setIsInitialized(true); // Still initialize but in error/offline state
      }
    };

    initializeAdmin();
  }, [currentUser, userData]);

  const logAdminAction = async (action: string, metadata: any) => {
    try {
      // Internal logging for admin actions
      console.log(`[AdminAudit] ${action}`, metadata);
    } catch (err) {
      console.error("[AdminAudit] Failed to log action:", err);
    }
  };

  return (
    <AdminContext.Provider value={{ isInitialized, systemStatus, lastError, logAdminAction, healthCheck }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
