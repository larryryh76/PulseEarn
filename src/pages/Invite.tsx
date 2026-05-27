import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';

const Invite: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) return null;

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section>
          <h1>Referrals</h1>
          <p>Expand the Network</p>
        </section>

        <section className="space-y-6">
          <div className="border border-white/5 p-6">
            <p>Your Referral Code</p>
            <div className="text-3xl font-mono font-bold mt-2">{userData.referralCode}</div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-white/5 p-4">
              <p>Total Invites</p>
              <div className="text-xl font-bold">{userData.stats?.referralsCount || 0}</div>
            </div>
            <div className="border border-white/5 p-4">
              <p>Pending Rewards</p>
              <div className="text-xl font-bold">0 PTS</div>
            </div>
            <div className="border border-white/5 p-4">
              <p>Growth Tier</p>
              <div className="text-xl font-bold">Standard</div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Invite;
