import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const RewardPolicy: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold mb-8">Reward Policy</h1>
          <p className="text-text-secondary mb-6">Last Updated: May 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Point Acquisition</h2>
            <p className="text-text-secondary leading-relaxed">
              Points (PTS) are awarded for completing verified campaigns, referring new users, and
              participating in community events. All points are subject to a verification period
              before becoming eligible for withdrawal.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. Conversion Rate</h2>
            <p className="text-text-secondary leading-relaxed">
              The standard system conversion rate is 1,000 PTS = $1.00 USD. This rate may be adjusted
              based on ecosystem performance and market conditions.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Withdrawal Threshold</h2>
            <p className="text-text-secondary leading-relaxed">
              A minimum balance of 10,000 PTS is required to initiate a withdrawal request.
              Withdrawals are processed within 24-72 hours of approval.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default RewardPolicy;
