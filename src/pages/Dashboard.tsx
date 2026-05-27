import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getXpProgress } from '../utils/progression';
import { PTS_TO_USD, formatUSD } from '../utils/finance';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { activities } = useTasks();
  const { marketData } = useCryptoData();

  if (!userData) return <div>Loading account...</div>;

  const xp = getXpProgress(userData.xp || 0);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section>
          <h1>Dashboard</h1>
          <p>Welcome, {userData.username}</p>
        </section>

        <section className="grid gap-6">
          <div>
            <h3>Balance</h3>
            <div className="text-4xl font-bold">{userData.points.toLocaleString()} PTS</div>
            <p>≈ {formatUSD(PTS_TO_USD(userData.points))}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p>Tier</p>
              <div className="font-bold">Lvl {userData.level}</div>
            </div>
            <div>
              <p>Streak</p>
              <div className="font-bold">{userData.streak || 0} Days</div>
            </div>
            <div>
              <p>24h Earned</p>
              <div className="font-bold">+{userData.totalEarnedToday || 0}</div>
            </div>
            <div>
              <p>XP Progress</p>
              <div className="font-bold">{Math.round(xp.progress)}%</div>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-8">
          <div>
            <h3>Market Signal</h3>
            <div className="space-y-2 mt-4">
              {marketData.slice(0, 5).map(coin => (
                <div key={coin.id} className="flex justify-between border-b border-white/5 py-2">
                  <span>{coin.symbol.toUpperCase()}</span>
                  <span className="font-mono">{formatUSD(coin.current_price)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Recent Activity</h3>
            <div className="space-y-2 mt-4">
              {activities.length === 0 ? (
                <p>No activity recorded</p>
              ) : activities.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex justify-between border-b border-white/5 py-2">
                  <span>{activity.type.replace(/_/g, ' ')}</span>
                  <span className="text-success">+{activity.points}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
