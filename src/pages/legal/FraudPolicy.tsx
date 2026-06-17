import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const FraudPolicy: React.FC = () => {
  return (
    <DocLayout title="Fraud & Integrity Policy" lastUpdated="June 20, 2026">
      <section>
        <h2>1. Commitment to Integrity</h2>
        <p>
          PulseEarn maintains a zero-tolerance policy regarding fraud. Our platform's value is built on high-quality user engagement, and we deploy sophisticated detection systems to protect our partners and honest users.
        </p>
      </section>

      <section>
        <h2>2. Prohibited Activities</h2>
        <p>
          The following activities are strictly prohibited and will result in immediate account suspension:
        </p>
        <ul>
          <li><strong>Multiple Accounts:</strong> Creating or maintaining more than one account per individual.</li>
          <li><strong>Automation:</strong> Using bots, scripts, click-farms, or any automated software to interact with the platform.</li>
          <li><strong>Verification Fraud:</strong> Submitting fake, stolen, or manipulated screenshots and evidence for task completion.</li>
          <li><strong>Referral Abuse:</strong> Self-referring or using incentivized traffic to generate fake referral bonuses.</li>
          <li><strong>Identity Masking:</strong> Using VPNs, proxies, or virtual machines to bypass regional restrictions or mask fraudulent activity.</li>
        </ul>
      </section>

      <section>
        <h2>3. Detection Systems</h2>
        <p>
          We utilize a combination of automated heuristics and manual audits to identify suspicious patterns, including:
        </p>
        <ul>
          <li>Device fingerprinting and IP analysis.</li>
          <li>Behavioral mapping of task completion times and patterns.</li>
          <li>Evidence verification using image analysis and metadata inspection.</li>
        </ul>
      </section>

      <section>
        <h2>4. Consequences of Fraud</h2>
        <p>
          If an account is flagged for fraudulent activity:
        </p>
        <ul>
          <li><strong>Immediate Suspension:</strong> Access to the platform and rewards will be revoked.</li>
          <li><strong>Forfeiture of Funds:</strong> All earned points and pending withdrawals will be permanently forfeited.</li>
          <li><strong>Partner Reporting:</strong> Information regarding the fraud may be shared with our offerwall and advertising partners.</li>
          <li><strong>Permanent Ban:</strong> The user may be permanently blacklisted from the PulseEarn ecosystem.</li>
        </ul>
      </section>

      <section>
        <h2>5. Appeals Process</h2>
        <p>
          Users who believe their account was suspended in error may file an appeal through the Support Hub. Appeals must be filed within 14 days of suspension and must include proof of identity and a detailed explanation of the activity.
        </p>
      </section>
    </DocLayout>
  );
};

export default FraudPolicy;
