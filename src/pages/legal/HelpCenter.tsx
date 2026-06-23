import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const HelpCenter: React.FC = () => {
  return (
    <DocLayout title="Help Center" lastUpdated="June 22, 2026">
      <section>
        <h2>Getting Started</h2>
        <p>
          Welcome to PulseEarn! Our platform is designed to reward your attention and engagement. Here's a quick guide to help you get started:
        </p>
        <ul>
          <li><strong>Create an Account:</strong> Sign up with your email and verify it to unlock all features.</li>
          <li><strong>Complete Tasks:</strong> Browse the Quest Hub for daily missions and sponsored campaigns.</li>
          <li><strong>Earn PTS & XP:</strong> Accumulate points for value and XP for platform seniority.</li>
          <li><strong>Withdraw Rewards:</strong> Convert your points to cryptocurrency or gift cards once you reach the 10,000 PTS threshold.</li>
        </ul>
      </section>

      <section>
        <h2>Frequently Asked Questions</h2>

        <h3>How many points is $1.00?</h3>
        <p>1,000 PTS equals $1.00 USD in our standard reward economy.</p>

        <h3>How do I level up?</h3>
        <p>You level up by earning XP through task completion and referrals. Higher levels unlock better rewards and faster processing.</p>

        <h3>Why is my task still "Under Review"?</h3>
        <p>Manual verification can take 24-48 hours. Our integrity team checks each submission to ensure it meets our quality standards.</p>

        <h3>Can I have more than one account?</h3>
        <p>No. PulseEarn strictly enforces a "one account per person" rule. Multiple accounts will result in a permanent ban and forfeiture of all points.</p>

        <h3>How long do withdrawals take?</h3>
        <p>Standard withdrawals are processed within 72 hours. First-time withdrawals may take longer due to a one-time identity audit.</p>
      </section>

      <section>
        <h2>Common Troubleshooting</h2>
        <ul>
          <li><strong>Missing PTS:</strong> Ensure you completed all task requirements and wait at least 48 hours for manual reviews.</li>
          <li><strong>Login Issues:</strong> Reset your password using the "Forgot Password" link on the login page.</li>
          <li><strong>Verification Failed:</strong> Check the History tab for rejection reasons and ensure your proof is accurate.</li>
        </ul>
      </section>
    </DocLayout>
  );
};

export default HelpCenter;
