import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const Support: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold mb-8">Support Center</h1>
          <p className="text-text-secondary mb-12">
            Welcome to the PulseEarn Support Center. Access our knowledge base or reach out to our team.
          </p>

          <div className="space-y-8 not-prose">
             <div className="system-card p-6">
                <h3 className="text-lg font-bold mb-2">How do I verify my account?</h3>
                <p className="text-sm text-text-secondary">Verification is handled automatically through our validation engine. Ensure you follow all mission instructions carefully.</p>
             </div>
             <div className="system-card p-6">
                <h3 className="text-lg font-bold mb-2">When will I receive my rewards?</h3>
                <p className="text-sm text-text-secondary">Automated tasks reward points instantly. Manual review tasks typically take 24-48 hours for processing.</p>
             </div>
             <div className="system-card p-6">
                <h3 className="text-lg font-bold mb-2">What is the withdrawal process?</h3>
                <p className="text-sm text-text-secondary">Once you reach the 10,000 PTS threshold, you can initiate a payout request from your Wallet terminal.</p>
             </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Support;
