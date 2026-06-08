import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';

const Contact: React.FC = () => {
  return (
    <MainLayout>
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-8">Contact Support</h1>
          <p className="text-text-secondary mb-12 text-lg">
            Our specialized operations team is available to assist with technical queries and account verification.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="system-card p-8">
               <h2 className="text-xl font-bold mb-4">Operations Hub</h2>
               <p className="text-text-secondary mb-2">Technical & Platform Support</p>
               <p className="text-primary font-mono">support@pulseearn.io</p>
            </div>
            <div className="system-card p-8">
               <h2 className="text-xl font-bold mb-4">Security Center</h2>
               <p className="text-text-secondary mb-2">Fraud & Integrity Reports</p>
               <p className="text-danger font-mono">security@pulseearn.io</p>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Contact;
