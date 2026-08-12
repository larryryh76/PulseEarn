import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const SupportPolicy: React.FC = () => {
  return (
    <DocLayout title="Support Policy" lastUpdated="June 22, 2026">
      <section>
        <h2>1. Support Availability</h2>
        <p>
          PulseEarn provides support through our dedicated Support Hub. Our team is available Monday through Friday, 9:00 AM to 6:00 PM (UTC). While we strive to provide 24/7 coverage, response times may be slower during weekends and public holidays.
        </p>
      </section>

      <section>
        <h2>2. Response Timelines</h2>
        <p>
          We aim to address all inquiries within the following timeframes:
        </p>
        <ul>
          <li><strong>General Inquiries:</strong> 24 to 48 hours.</li>
          <li><strong>Account & Security Issues:</strong> 12 to 24 hours.</li>
          <li><strong>Withdrawal Issues:</strong> 48 to 72 hours.</li>
          <li><strong>Bug Reports:</strong> 3 to 5 business days for investigation.</li>
        </ul>
      </section>

      <section>
        <h2>3. Proper Use of Support</h2>
        <p>
          To ensure we can help everyone efficiently:
        </p>
        <ul>
          <li><strong>Single Ticket:</strong> Do not open multiple tickets for the same issue.</li>
          <li><strong>Accuracy:</strong> Provide all requested details, including transaction IDs and task names.</li>
          <li><strong>Professionalism:</strong> Use clear, respectful language. Tickets containing abuse will be closed immediately.</li>
        </ul>
      </section>

      <section>
        <h2>4. Escatlation & Appeals</h2>
        <p>
          If you are unsatisfied with a support resolution, you may request an escalation for senior review. For account suspensions, please follow the formal appeals process outlined in our Fraud & Integrity Policy.
        </p>
      </section>

      <section>
        <h2>5. Language Support</h2>
        <p>
          Primary support is provided in English. We may use automated translation for other languages, but for complex issues, we recommend communicating in English to ensure accuracy.
        </p>
      </section>
    </DocLayout>
  );
};

export default SupportPolicy;
