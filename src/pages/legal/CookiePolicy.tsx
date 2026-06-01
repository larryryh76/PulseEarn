import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const CookiePolicy: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
          <p className="text-text-secondary mb-6">Last Updated: May 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Use of Cookies</h2>
            <p className="text-text-secondary leading-relaxed">
              PulseEarn uses essential cookies to manage your session and maintain authentication.
              These are necessary for the platform to function correctly and cannot be disabled.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. Performance & Analytics</h2>
            <p className="text-text-secondary leading-relaxed">
              We may use anonymous analytics cookies to understand how users interact with the system
              to optimize mission delivery and system performance.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default CookiePolicy;
