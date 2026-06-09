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
          <p className="text-text-secondary mb-12">Last Updated: June 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Data Collection</h2>
            <p className="text-text-secondary leading-relaxed">
              We collect information you provide directly to us when you create an account, such as your email address,
              username, and any proof submitted for task verification. We also automatically collect technical data
              including IP addresses, browser types, and device information to ensure platform security.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. Data Usage</h2>
            <p className="text-text-secondary leading-relaxed">
              Your data is used to manage your account, verify task completions, and process reward distributions.
              We may also use your information to communicate platform updates and security alerts.
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Analytics & Cookies</h2>
            <p className="text-text-secondary leading-relaxed">
              We use internal analytics to monitor platform performance and user engagement.
              Cookies are used to maintain your session state and provide a seamless user experience.
              You can manage your cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">4. Security</h2>
            <p className="text-text-secondary leading-relaxed">
              We implement industry-standard encryption and security protocols to protect your data.
              While we strive to use commercially acceptable means to protect your personal information,
              no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">5. User Rights</h2>
            <p className="text-text-secondary leading-relaxed">
              Users have the right to access, correct, or request the deletion of their personal data.
              If you wish to exercise these rights, please contact our data protection officer through the support hub.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default PrivacyPolicy;
