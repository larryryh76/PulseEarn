import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const VerificationPolicy: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold mb-8">Verification Policy</h1>
          <p className="text-text-secondary mb-6">Last Updated: May 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Automated Verification</h2>
            <p className="text-text-secondary leading-relaxed">
              campaigns marked as "Automated" are verified through API integration or system interaction
              tracking. Points are awarded instantly upon successful completion detection.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. Manual Review</h2>
            <p className="text-text-secondary leading-relaxed">
              Certain high-reward campaigns require manual review of submitted proof (screenshots or links).
              Our moderation team audits these subcampaigns within 12-24 hours.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Proof Requirements</h2>
            <p className="text-text-secondary leading-relaxed">
              Submitted proof must be clear, unedited, and clearly show the completed action.
              Submitting false or unrelated proof is considered a violation of our Fraud Policy.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default VerificationPolicy;
