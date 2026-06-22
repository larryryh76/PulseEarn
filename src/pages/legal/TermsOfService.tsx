import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const TermsOfService: React.FC = () => {
  return (
    <DocLayout title="Terms of Service" lastUpdated="June 22, 2026">
      <section>
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using PulseEarn (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the Platform.
        </p>
      </section>

      <section>
        <h2>2. Eligibility & Account Security</h2>
        <p>
          You must be at least 18 years old or the legal age of majority in your jurisdiction to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. <strong>Only one account per person is permitted.</strong> Multiple account creation for the purpose of reward exploitation will result in immediate termination.
        </p>
      </section>

      <section>
        <h2>3. Reward Program Rules</h2>
        <p>
          The Platform provides rewards (PTS/XP) for completing specific tasks, campaigns, and referrals.
        </p>
        <ul>
          <li><strong>Good Faith Participation:</strong> You must complete tasks honestly and according to the provided instructions.</li>
          <li><strong>Verification:</strong> All task completions are subject to verification. We reserve the right to deny rewards for incomplete, inaccurate, or fraudulent submissions.</li>
          <li><strong>Conversion:</strong> PTS are convertible to rewards at the current rate specified in our Reward Policy (standard: 1,000 PTS = $1).</li>
          <li><strong>Expiration:</strong> Inactive accounts (no login for 90 days) may have their point balances expired.</li>
        </ul>
      </section>

      <section>
        <h2>4. Prohibited Conduct</h2>
        <p>
          You agree not to:
        </p>
        <ul>
          <li>Use any bots, scripts, or automated tools to complete tasks or simulate user activity.</li>
          <li>Provide false or misleading information during registration or task verification.</li>
          <li>Exploit system vulnerabilities or attempt to manipulate the reward economy.</li>
          <li>Engage in referral fraud, including "self-referring" using multiple accounts.</li>
          <li>Harass, abuse, or harm other users or our support staff.</li>
        </ul>
      </section>

      <section>
        <h2>5. Withdrawals</h2>
        <p>
          Withdrawals are subject to a minimum threshold (10,000 PTS) and must pass a security audit. We reserve the right to delay or deny withdrawals if fraud is suspected. Detailed rules are available in our Withdrawal Policy.
        </p>
      </section>

      <section>
        <h2>6. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
        </p>
      </section>

      <section>
        <h2>7. Limitation of Liability</h2>
        <p>
          PulseEarn is provided "as is" and "as available." To the maximum extent permitted by law, we disclaim all warranties and shall not be liable for any indirect, incidental, special, or consequential damages.
        </p>
      </section>
    </DocLayout>
  );
};

export default TermsOfService;
