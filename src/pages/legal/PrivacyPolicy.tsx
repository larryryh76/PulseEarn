import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const PrivacyPolicy: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-text-secondary mb-6">Last Updated: May 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p className="text-text-secondary leading-relaxed">
              PulseEarn collects essential data to provide our rewards service, including your email address,
              system interaction logs, and on-chain public addresses if provided. We do not sell your personal
              information to third parties.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. How We Use Data</h2>
            <p className="text-text-secondary leading-relaxed">
              Data is used to verify task completions, prevent fraud, and calculate accurate reward distributions.
              Interaction logs help us improve the system's performance and security.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Security Standards</h2>
            <p className="text-text-secondary leading-relaxed">
              We implement industry-standard encryption and transactional integrity checks to protect your
              accumulated points and personal identity.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default PrivacyPolicy;
