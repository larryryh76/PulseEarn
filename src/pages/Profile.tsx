import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getXpProgress } from '../utils/progression';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { userTasks } = useTasks();

  if (!userData) return null;

  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section>
          <h1>Profile</h1>
          <p>Identity Center</p>
        </section>

        <section className="space-y-4">
          <div>
            <p>Username</p>
            <div className="text-xl font-bold">{userData.username}</div>
          </div>
          <div>
            <p>Email</p>
            <div className="text-sm">{userData.email}</div>
          </div>
          <div>
            <p>Role</p>
            <div className="text-sm uppercase font-bold">{userData.role}</div>
          </div>
        </section>

        <section className="space-y-4">
          <h2>Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-white/5 p-4">
              <p>Tier</p>
              <div className="text-2xl font-bold">Lvl {userData.level}</div>
            </div>
            <div className="border border-white/5 p-4">
              <p>XP</p>
              <div className="text-2xl font-bold">{userData.xp}</div>
              <p>{Math.round(xpInfo.progress)}% to next level</p>
            </div>
            <div className="border border-white/5 p-4">
              <p>Tasks Completed</p>
              <div className="text-2xl font-bold">{completedCount}</div>
            </div>
            <div className="border border-white/5 p-4">
              <p>Referrals</p>
              <div className="text-2xl font-bold">{userData.stats?.referralsCount || 0}</div>
            </div>
          </div>
        </section>

        <section>
          <button
            onClick={() => logout()}
            className="bg-danger px-6 py-2 rounded font-bold"
          >
            Logout
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
