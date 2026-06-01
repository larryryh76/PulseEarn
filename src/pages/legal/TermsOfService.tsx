import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const TermsOfService: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-text-secondary mb-6">Last Updated: May 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-text-secondary leading-relaxed">
              By accessing the PulseEarn platform, you agree to comply with these terms. Our system
              is designed to reward genuine engagement. Any attempt to manipulate rewards using bots,
              scripts, or multiple accounts is a violation of these terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. Reward Eligibility</h2>
            <p className="text-text-secondary leading-relaxed">
              Rewards (PTS) are subject to verification. We reserve the right to reverse points if
              fraud or system exploitation is detected. Minimum withdrawal thresholds must be met
              before redemptions can be processed.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Account Responsibility</h2>
            <p className="text-text-secondary leading-relaxed">
              Users are responsible for maintaining the security of their accounts. PulseEarn is not
              liable for losses resulting from unauthorized access due to compromised credentials.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default TermsOfService;
