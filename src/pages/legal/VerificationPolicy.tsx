import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const VerificationPolicy: React.FC = () => {
  return (
    <DocLayout title="Verification Policy" lastUpdated="June 22, 2026">
      <section>
        <h2>1. Purpose of Verification</h2>
        <p>
          To ensure the sustainability of our reward economy, every task completed on PulseEarn must pass a verification check. This prevents abuse and ensures our partners receive the high-quality engagement they pay for.
        </p>
      </section>

      <section>
        <h2>2. Verification Methods</h2>
        <p>
          Depending on the task type, we utilize different verification strategies:
        </p>
        <ul>
          <li><strong>Instant Validation:</strong> System-monitored tasks (e.g., Daily Login, Prediction Entry) are verified automatically by our backend.</li>
          <li><strong>Text-Based Evidence:</strong> Users must provide specific strings (usernames, transaction IDs, or code snippets) as proof of action.</li>
          <li><strong>Screenshot Verification:</strong> For complex tasks, users must upload visual proof. <em>(Note: Currently transitioning to high-integrity text proofs).</em></li>
          <li><strong>External API Sync:</strong> Future integrations will allow direct verification via partner APIs.</li>
        </ul>
      </section>

      <section>
        <h2>3. Submission Standards</h2>
        <p>
          To ensure your rewards are processed quickly, all submissions must:
        </p>
        <ul>
          <li>Be clear and legible (if visual).</li>
          <li>Match the requested data exactly (if text-based).</li>
          <li>Be submitted from the account that performed the action.</li>
          <li>Be unique (reusing proof from another user or a previous task is fraud).</li>
        </ul>
      </section>

      <section>
        <h2>4. Review Timelines</h2>
        <p>
          While many tasks are verified instantly, manual reviews typically take:
        </p>
        <ul>
          <li><strong>Standard Tasks:</strong> 24 to 48 business hours.</li>
          <li><strong>High-Value Campaigns:</strong> Up to 72 hours for deep audit.</li>
          <li><strong>Withdrawal Audits:</strong> Up to 5 business days for first-time requests.</li>
        </ul>
      </section>

      <section>
        <h2>5. Rejections & Corrections</h2>
        <p>
          If a submission is rejected, you will receive a notification in your History. Rejections may occur due to:
        </p>
        <ul>
          <li>Incorrect evidence.</li>
          <li>Duplicate proof submissions.</li>
          <li>Incomplete task requirements.</li>
        </ul>
        <p>In some cases, you may be allowed to resubmit evidence if the error was unintentional.</p>
      </section>
    </DocLayout>
  );
};

export default VerificationPolicy;
