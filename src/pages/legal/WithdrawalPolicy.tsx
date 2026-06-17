import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const WithdrawalPolicy: React.FC = () => {
  return (
    <DocLayout title="Withdrawal Policy" lastUpdated="June 20, 2026">
      <section>
        <h2>1. Withdrawal Eligibility</h2>
        <p>
          To be eligible for a withdrawal on PulseEarn, your account must meet the following criteria:
        </p>
        <ul>
          <li><strong>Verified Email:</strong> Your registered email address must be verified.</li>
          <li><strong>Minimum Balance:</strong> You must have a minimum balance of 10,000 Points ($10.00 USD).</li>
          <li><strong>Good Standing:</strong> Your account must not be flagged for fraudulent activity or pending investigation.</li>
        </ul>
      </section>

      <section>
        <h2>2. Conversion Rates & Fees</h2>
        <p>
          Withdrawals are calculated based on the following standard conversion rate:
        </p>
        <ul>
          <li><strong>1,000 Points = $1.00 USD</strong></li>
          <li>PulseEarn does not currently charge withdrawal fees, but external payment processors or network fees (for crypto) may be deducted from the final amount.</li>
        </ul>
      </section>

      <section>
        <h2>3. Review & Audit Process</h2>
        <p>
          Every withdrawal request undergoes a security audit to ensure all underlying points were earned legitimately.
        </p>
        <ul>
          <li><strong>Processing Time:</strong> Standard requests are processed within 24 to 72 business hours.</li>
          <li><strong>High-Value Requests:</strong> Withdrawals over $50.00 may require up to 5 business days for a deep audit.</li>
          <li><strong>First-Time Requests:</strong> Initial withdrawals are subject to enhanced verification.</li>
        </ul>
      </section>

      <section>
        <h2>4. Rejection Conditions</h2>
        <p>
          A withdrawal request may be rejected if:
        </p>
        <ul>
          <li>Points were earned through fraudulent activity (e.g., botting, multi-accounting).</li>
          <li>Task evidence is found to be fake or reused.</li>
          <li>Referral bonuses were generated through self-referral.</li>
        </ul>
        <p>If a request is rejected, the points will be returned to your balance or forfeited, depending on the severity of the violation.</p>
      </section>

      <section>
        <h2>5. Supported Methods</h2>
        <p>
          We support various withdrawal methods including:
        </p>
        <ul>
          <li>Cryptocurrency (USDT, LTC, SOL).</li>
          <li>Gift Cards (Amazon, Steam, Roblox).</li>
          <li>Third-party payment processors (PayPal - availability varies by region).</li>
        </ul>
      </section>
    </DocLayout>
  );
};

export default WithdrawalPolicy;
