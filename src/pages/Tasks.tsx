import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';

const Tasks: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section>
          <h1>Marketplace</h1>
          <p>Missions & Rewards</p>
        </section>

        <section className="border-2 border-dashed border-white/10 p-20 text-center rounded">
          <h2 className="text-white/40">Marketplace Rebuilding</h2>
          <p className="mt-2">Structural optimization in progress.</p>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
