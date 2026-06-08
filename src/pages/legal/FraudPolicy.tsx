import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const FraudPolicy: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold mb-8">Fraud & Integrity Policy</h1>
          <p className="text-text-secondary mb-6">Last Updated: May 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Multi-Account Restriction</h2>
            <p className="text-text-secondary leading-relaxed">
              Users are strictly limited to one account per individual. Detection of multiple accounts
              controlled by the same person will result in immediate suspension of all related accounts.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. Automated Completion</h2>
            <p className="text-text-secondary leading-relaxed">
              Use of scripts, bots, or any automated software to complete campaigns or generate points
              is prohibited. Our system utilizes behavioral fingerprinting to detect and block automated activity.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Referral Manipulation</h2>
            <p className="text-text-secondary leading-relaxed">
              Generating referrals through temporary email services or "referral farms" is a violation of
              this policy. Legitimate referrals must be verified active users.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default FraudPolicy;
