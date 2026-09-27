import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { campaignStatusView, gbpHour, usePseDocumentTitle } from '../../components/psemine/pse';
import { PSELogo } from '../../components/psemine/PSEBrand';
import { PSEMineCampaignRail, PSEMineToolFamily } from '../../components/psemine/PSEMineProductVisuals';
import { PSEMINE_CONSTANTS } from '../../types/psemine';

const FAQS = [
  ['What do I purchase?', 'A mining tool with a fixed GBP price, hourly capacity and account ownership limit. A verified tool contributes capacity while it is operating.'],
  ['How is capacity calculated?', 'The backend reports tool capacity and qualified referral capacity separately. Their reported sum is your hourly capacity; only active operating time accrues.'],
  ['How long does a campaign last?', 'The campaign is configured for 90 days. Mining ends before settlement, and payout processing follows only when the backend advances the campaign.'],
  ['What currency are earnings in?', 'Campaign accounting and hourly capacity are denominated in GBP. BNB is used only for tool payments and campaign payouts on BNB Smart Chain.'],
  ['When can I request a payout?', 'After the campaign reaches settlement and the backend makes an available balance, eligible requests require at least £10 and a configured payout wallet.'],
  ['How do referrals add capacity?', 'Each of up to five qualified referrals adds £0.30 per hour from the qualification point forward. The backend records qualification; it is never applied retroactively.'],
  ['When is a tool purchase active?', 'Only after the server-issued quote is paid on BNB Smart Chain and the backend verifies the transaction on-chain.'],
  ['Does PSEmine use PulseEarn points or tasks?', 'No. The products share an identity provider, but PSEmine access, campaign records and GBP accounting are separate from PulseEarn rewards.'],
];

export const PSEMineLanding: React.FC = () => {
  const { campaign, loading: campaignLoading } = usePSEMine();
  const { currentUser, loading: authLoading } = usePSEMineAuth();
  usePseDocumentTitle('PSEmine — campaign mining');

  const campaignStatus = campaign
    ? campaignStatusView(campaign.status).label.trim()
    : campaignLoading ? 'Checking campaign' : 'Campaign status unavailable';
  const primaryHref = currentUser ? '/mine/dashboard' : '/mine/signup';
  const primaryLabel = currentUser ? 'Open your console' : 'Create your account';

  return (
    <div className="pm-product pm-landing">
      <header className="pm-landing-header">
        <Link to="/mine" aria-label="PSEmine home"><PSELogo size={31} withWordmark /></Link>
        <nav aria-label="PSEmine public navigation">
          <Link to="/mine/guide">How it works</Link>
          <Link className="pm-button pm-button-secondary" to="/mine/login">Sign in</Link>
          {!authLoading && <Link className="pm-button pm-button-primary" to={primaryHref}>{primaryLabel}</Link>}
        </nav>
      </header>

      <main>
        <section className="pm-hero">
          <div className="pm-hero-copy">
            <p className="pm-eyebrow">A 90-day financial campaign</p>
            <h1>Build capacity. Let time do its work.</h1>
            <p>PSEmine is a campaign-based product where verified mining tools and qualified referrals create hourly GBP capacity. The backend records what accrues, settles the campaign, and opens reviewed BNB payouts when funds are available.</p>
            <div className="pm-hero-actions">
              {!authLoading && <Link className="pm-button pm-button-primary" to={primaryHref}>{primaryLabel}</Link>}
              <Link className="pm-button pm-button-secondary" to="/mine/guide">Read the field manual</Link>
            </div>
            <p className="pm-micro">Campaign: {campaign?.name ?? 'PSEmine 90-day campaign'} · Status: {campaignStatus}</p>
          </div>
          <aside className="pm-console-specimen" aria-label="PSEmine console specimen">
            <div className="pm-specimen-top"><span>Account view</span><span>Backend-reported state</span></div>
            <div className="pm-specimen-total"><span className="pm-eyebrow">Campaign earnings</span><strong>GBP · ledger recorded</strong><span className="pm-micro">No balance is projected ahead</span></div>
            <div className="pm-specimen-grid">
              <div><span>Campaign state</span><strong>{campaignStatus}</strong></div>
              <div><span>Accounting unit</span><strong>GBP (£)</strong></div>
              <div><span>Capacity source</span><strong>Tools + referrals</strong></div>
              <div><span>Settlement</span><strong>After campaign</strong></div>
            </div>
            <p className="pm-micro">A view of the product’s information hierarchy, not a user balance or earnings forecast.</p>
          </aside>
        </section>

        <div className="pm-landing-content">
          <section className="pm-section" aria-labelledby="pm-tools-heading">
            <p className="pm-eyebrow">Tools built for the campaign</p>
            <h2 id="pm-tools-heading">Choose a tool. Know its terms before you buy.</h2>
            <p>Each tier has a fixed GBP price, an hourly capacity contribution, an ownership limit and a clear operating model. Payment is made in BNB at a live, server-issued quote; a tool is activated only after on-chain verification.</p>
            <PSEMineToolFamily />
            <p><Link to="/mine/tools">See all four tools and purchase requirements</Link></p>
          </section>

          <section className="pm-section" aria-labelledby="pm-capacity-heading">
            <p className="pm-eyebrow">One capacity model</p>
            <h2 id="pm-capacity-heading">Capacity is the input. Active time is what accrues.</h2>
            <div className="pm-landing-flow" aria-label="How capacity becomes settlement">
              <span>Tool family</span><span>+ qualified referral lanes</span><span>Total capacity / hour</span><span>Time actively operating</span><span>Campaign earnings in GBP</span><span>Ledger settlement</span><span>Reviewed BNB payout</span>
            </div>
            <p className="pm-landing-note">Referral capacity is capped at five qualified lanes, adding {gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} per hour per qualification from that point forward. The backend reports your actual tools, referrals and combined capacity. Campaign earnings are not projected from capacity.</p>
          </section>

          <section className="pm-section" aria-labelledby="pm-lifecycle-heading">
            <p className="pm-eyebrow">The campaign lifecycle</p>
            <h2 id="pm-lifecycle-heading">A defined campaign, followed by settlement.</h2>
            <p>The 90-day campaign advances through backend-owned operating and payment states. Dates and balances are not guessed in the browser.</p>
            <PSEMineCampaignRail status={campaign?.status} />
          </section>

          <section className="pm-section" aria-labelledby="pm-accounting-heading">
            <p className="pm-eyebrow">Accounting and payment are distinct</p>
            <h2 id="pm-accounting-heading">GBP in the ledger. BNB at the payment boundary.</h2>
            <div className="pm-lifecycle-path">
              <div><h3>Accounting</h3><p>Tool prices, hourly capacity and accrued campaign earnings are denominated in GBP. Accrued earnings are not the same as a settlement-available balance.</p></div>
              <div><h3>Tool payment</h3><p>A live quote binds the exact BNB amount, receiving address, expiry, payer wallet and BNB Smart Chain. A single send attempt is verified by the backend.</p></div>
              <div><h3>Settlement and payout</h3><p>After the campaign closes, the backend finalises settlement. Eligible payout requests are reviewed and processed to the separately configured payout wallet.</p></div>
            </div>
          </section>

          <section className="pm-section" aria-labelledby="pm-security-heading">
            <p className="pm-eyebrow">Security and transparency</p>
            <h2 id="pm-security-heading">The interface presents state. The backend owns value.</h2>
            <p>Entitlement, purchase verification, mining cycles, referral qualification, balances, settlement and payout eligibility are enforced server-side. Payment and payout wallets are separate. The ledger and operational history show recorded events; empty means no record has been returned.</p>
            <p><Link to="/mine/guide">Read the purchase, wallet and settlement security details</Link></p>
          </section>

          <section className="pm-section" aria-labelledby="pm-faq-heading">
            <p className="pm-eyebrow">Questions, answered plainly</p>
            <h2 id="pm-faq-heading">Before you begin</h2>
            <div className="pm-faq">
              {FAQS.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
            </div>
          </section>

          <section className="pm-landing-cta" aria-labelledby="pm-cta-heading">
            <p className="pm-eyebrow">Start with the terms</p>
            <h2 id="pm-cta-heading">See the campaign clearly before you commit.</h2>
            <p>Review the fixed tool economics, the BNB payment safeguards and the settlement rules before creating an account.</p>
            <div className="pm-hero-actions">
              {!authLoading && <Link className="pm-button pm-button-primary" to={primaryHref}>{primaryLabel}</Link>}
              <Link className="pm-button pm-button-secondary" to="/mine/tools">Explore mining tools</Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="pm-landing-footer">
        <div className="pm-footer">
          <Link to="/mine" aria-label="PSEmine home"><PSELogo size={22} withWordmark /></Link>
          <nav aria-label="PSEmine legal"><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/help">Support</Link></nav>
          <span>© {new Date().getFullYear()} PSEmine</span>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineLanding;
