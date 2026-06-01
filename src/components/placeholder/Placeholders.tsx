import React from 'react';
import MainLayout from '../layout/MainLayout';

const Placeholder: React.FC<{ name: string }> = ({ name }) => (
  <MainLayout>
    <div className="pt-32 px-6 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-mono uppercase tracking-[0.2em] text-white/40">{name}</h1>
      <p className="mt-4 text-white/20 font-mono text-sm">[Structural Placeholder - Phase 0 Reset]</p>
    </div>
  </MainLayout>
);

export const DashboardPlaceholder = () => <Placeholder name="Dashboard" />;
export const WalletPlaceholder = () => <Placeholder name="Wallet" />;
export const TasksPlaceholder = () => <Placeholder name="Tasks" />;
export const ProfilePlaceholder = () => <Placeholder name="Profile" />;
export const NotificationsPlaceholder = () => <Placeholder name="Notifications" />;
export const AdminPlaceholder = () => <Placeholder name="Admin Operations" />;
