import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const RewardPolicy: React.FC = () => {
  return (
    <DocLayout title="Reward Policy" lastUpdated="June 20, 2026">
      <section>
        <h2>1. Overview</h2>
        <p>
          PulseEarn utilizes a dual-currency system (Points and XP) to reward user engagement. This policy outlines how rewards are earned, calculated, and distributed within our ecosystem.
        </p>
      </section>

      <section>
        <h2>2. Points (PTS)</h2>
        <p>
          Points are our primary reward currency. They represent measurable value and are convertible to real-world rewards.
        </p>
        <ul>
          <li><strong>Standard Conversion:</strong> 1,000 Points = $1.00 USD.</li>
          <li><strong>Minimum Withdrawal:</strong> 10,000 Points ($10.00 USD).</li>
          <li><strong>Maximum Withdrawal:</strong> Limits may apply based on user level and account verification status.</li>
        </ul>
      </section>

      <section>
        <h2>3. XP & Leveling</h2>
        <p>
          Experience Points (XP) represent your platform reputation and seniority. XP cannot be converted to cash but unlocks premium features and higher reward multipliers.
        </p>
        <ul>
          <li><strong>Progression:</strong> Leveling follows an exponential x3 curve (e.g., Level 2 at 1,000 XP, Level 3 at 3,000 XP).</li>
          <li><strong>Benefits:</strong> Higher levels grant access to high-budget campaigns and faster withdrawal processing.</li>
        </ul>
      </section>

      <section>
        <h2>4. Earning Opportunities</h2>
        <p>
          Users can earn rewards through several channels:
        </p>
        <ul>
          <li><strong>Campaigns & Tasks:</strong> Direct rewards for completing partner and platform missions.</li>
          <li><strong>Daily Login:</strong> Incremental rewards for consistent platform engagement.</li>
          <li><strong>Referrals:</strong> Bonuses for onboarding verified new users.</li>
          <li><strong>Predictions:</strong> Forecast-based rewards for accurate market analysis.</li>
        </ul>
      </section>

      <section>
        <h2>5. Verification & Approval</h2>
        <p>
          All rewards are subject to a verification period.
        </p>
        <ul>
          <li><strong>Manual Verification:</strong> Some tasks require admin review of submitted evidence (typically 24-48 hours).</li>
          <li><strong>Instant Verification:</strong> Platform missions may be rewarded automatically upon completion.</li>
          <li><strong>Reversals:</strong> We reserve the right to reverse rewards if the underlying task completion is found to be invalid or fraudulent.</li>
        </ul>
      </section>

      <section>
        <h2>6. Fairness & Integrity</h2>
        <p>
          The reward economy relies on honest participation. Any attempt to "farm" rewards using multiple accounts or automated scripts will result in account termination and forfeiture of all balances.
        </p>
      </section>
    </DocLayout>
  );
};

export default RewardPolicy;
