import React from 'react';
import DocLayout from '../../components/layout/DocLayout';

const CookiePolicy: React.FC = () => {
  return (
    <DocLayout title="Cookie Policy" lastUpdated="June 20, 2026">
      <section>
        <h2>1. What are Cookies?</h2>
        <p>
          Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
        </p>
      </section>

      <section>
        <h2>2. How We Use Cookies</h2>
        <p>
          PulseEarn uses cookies for the following purposes:
        </p>
        <ul>
          <li><strong>Essential Cookies:</strong> Necessary for the website to function, such as maintaining your login session and security features.</li>
          <li><strong>Preference Cookies:</strong> Used to remember your settings, such as your theme (Light/Dark mode) and language preferences.</li>
          <li><strong>Performance & Analytics:</strong> Help us understand how visitors interact with the platform so we can improve the user experience.</li>
        </ul>
      </section>

      <section>
        <h2>3. Third-Party Cookies</h2>
        <p>
          In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the service, deliver advertisements on and through the service, and so on. Partners may include Google Analytics, Firebase, and our offerwall providers.
        </p>
      </section>

      <section>
        <h2>4. Your Choices</h2>
        <p>
          Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noreferrer" className="text-primary underline">www.aboutcookies.org</a>.
        </p>
        <p>
          Please note that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, and some of our pages might not display properly.
        </p>
      </section>
    </DocLayout>
  );
};

export default CookiePolicy;
