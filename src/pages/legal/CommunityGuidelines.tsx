import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const CommunityGuidelines: React.FC = () => {
  return (
    <DocLayout title="Community Guidelines" lastUpdated="June 22, 2026">
      <section>
        <h2>1. Be Respectful</h2>
        <p>
          PulseEarn is a professional community. We expect all users to treat others, including our support team, with respect and professional courtesy. Harassment, hate speech, and abusive language will not be tolerated.
        </p>
      </section>

      <section>
        <h2>2. Honest Participation</h2>
        <p>
          The sustainability of the rewards platform depends on honest data and engagement.
        </p>
        <ul>
          <li>Submit only genuine evidence for tasks.</li>
          <li>Do not attempt to deceive partners or advertisers.</li>
          <li>Provide accurate feedback in surveys and campaigns.</li>
        </ul>
      </section>

      <section>
        <h2>3. No Exploitation</h2>
        <p>
          If you discover a bug or a vulnerability in the platform, report it to the support team through the Bug Report category. Exploiting system errors for personal gain is a violation of our guidelines and will result in account suspension.
        </p>
      </section>

      <section>
        <h2>4. Safety & Privacy</h2>
        <p>
          Do not share your account credentials with anyone. PulseEarn staff will never ask for your password. Be cautious when sharing information in public forums or with other users.
        </p>
      </section>

      <section>
        <h2>5. Content Standards</h2>
        <p>
          If you contribute content to the platform (e.g., campaign comments or feedback), ensure it is appropriate, non-offensive, and compliant with all intellectual property laws.
        </p>
      </section>
    </DocLayout>
  );
};

export default CommunityGuidelines;
