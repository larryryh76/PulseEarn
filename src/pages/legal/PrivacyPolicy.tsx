import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const PrivacyPolicy: React.FC = () => {
  return (
    <DocLayout title="Privacy Policy" lastUpdated="June 20, 2026">
      <section>
        <h2>1. Introduction</h2>
        <p>
          PulseEarn ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our platform.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p>
          We collect information that you provide directly to us when you create an account, participate in campaigns, or communicate with us. This includes:
        </p>
        <ul>
          <li><strong>Account Data:</strong> Email address, username, and password.</li>
          <li><strong>Verification Data:</strong> Proof of task completion, including text-based evidence and metadata.</li>
          <li><strong>Technical Data:</strong> IP address, browser type, device information, and usage patterns.</li>
          <li><strong>Referral Data:</strong> Linkage between referrers and referees for reward distribution.</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>
          We use the collected data for the following purposes:
        </p>
        <ul>
          <li>To provide, operate, and maintain our platform.</li>
          <li>To verify task completions and distribute rewards (Points/XP).</li>
          <li>To prevent fraud, multiple account creation, and system abuse.</li>
          <li>To communicate with you regarding account updates, security alerts, and support inquiries.</li>
          <li>To analyze platform performance and improve user experience.</li>
        </ul>
      </section>

      <section>
        <h2>4. Data Sharing & Disclosure</h2>
        <p>
          We do not sell your personal data to third parties. We may share information with:
        </p>
        <ul>
          <li><strong>Service Providers:</strong> Partners who assist in platform operations (e.g., Firebase, Vercel).</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
          <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition.</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>
          We implement industry-standard security measures, including encryption and secure protocols, to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>
          You have the right to access, correct, or request the deletion of your personal data. You may also opt-out of non-essential communications through your profile settings. For data deletion requests, please contact our support hub.
        </p>
      </section>

      <section>
        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
        </p>
      </section>
    </DocLayout>
  );
};

export default PrivacyPolicy;
