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
          <p className="text-text-secondary mb-12">Last Updated: June 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Eligibility</h2>
            <p className="text-text-secondary leading-relaxed">
              To use PulseEarn, you must be at least 18 years of age or the legal age of majority in your jurisdiction.
              By creating an account, you represent and warrant that you meet these eligibility requirements.
              Only one account per individual is permitted.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. User Conduct</h2>
            <p className="text-text-secondary leading-relaxed">
              Users agree to provide accurate information and engage with the platform in good faith.
              Prohibited activities include using automated scripts, bots, or any form of unauthorized software
              to complete tasks or generate rewards. Any attempt to exploit system vulnerabilities is strictly prohibited.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Campaign & Reward Rules</h2>
            <p className="text-text-secondary leading-relaxed">
              Rewards (PTS) are granted based on the successful completion of verified tasks and campaigns.
              PulseEarn reserves the right to define the specific requirements for each reward.
              Rewards are subject to audit and may be reversed if the underlying activity is found to be invalid or fraudulent.
              Withdrawals are subject to a minimum threshold of 10,000 PTS.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">4. Fraud Policy</h2>
            <p className="text-text-secondary leading-relaxed">
              Our automated fraud detection systems monitor all platform activity.
              Fraudulent behavior, including but not limited to referral abuse, duplicate submissions,
              and identity masking, will result in immediate disqualification from the reward program.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">5. Account Suspension & Termination</h2>
            <p className="text-text-secondary leading-relaxed">
              PulseEarn reserves the right to suspend or terminate any account at its sole discretion,
              without prior notice, if a user is found to be in violation of these terms.
              Forfeiture of all accumulated rewards will occur upon account termination for cause.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">6. Limitation of Liability</h2>
            <p className="text-text-secondary leading-relaxed">
              PulseEarn is provided "as is" without any warranties. We are not liable for any indirect,
              incidental, or consequential damages arising from your use of the platform.
              Our total liability for any claim shall not exceed the total rewards earned by the user in the preceding 30 days.
            </p>
          </section>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default TermsOfService;
