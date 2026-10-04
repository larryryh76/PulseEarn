/**
 * PSEmine product documents — terms, policies, disclosure and support.
 *
 * WHY THESE SURFACES EXIST, AND WHY THEY LOOK LIKE THIS
 *
 * PSEmine is a paid product: a person spends BNB and is later paid in BNB. Every
 * one of those steps needs a document that states what was agreed, and the
 * document has to be reachable at the moment the person acts — before sign-up,
 * before a purchase, before a payout wallet is set — not only from a footer.
 *
 * HOW THE TEXT IS MAINTAINED.
 *
 * Every document is stored as numbered, individually replaceable sections keyed
 * by a stable `id`, and carries a `status`, `revision` and `updated` date. A
 * reviewer replaces one clause by editing one object rather than rewriting a
 * page; the composition does not change when a clause does.
 *
 * INTERNAL BUILD STATE — NEVER RENDERED.
 *
 * Formal legal review of the clause sets below is not complete. That is tracked
 * here, in the repository, and deliberately NOT printed: a reader of a published
 * policy is not served by the product team's editorial notes, and a document that
 * announces itself as unfinished undermines the very terms it states. The
 * reader-facing `status` therefore states the document's version, not its review
 * state. Open at REVISION 1.0: terms, campaign-terms, purchase-terms,
 * payout-policy, referral-terms, risk, privacy, cookies.
 *
 * No clause promises a return, and none claims an approval that has not been
 * given.
 *
 * FIGURES ARE NOT RETYPED HERE. Any number the documents state is interpolated
 * from the product's own constants, so a policy cannot drift from the product.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PSEmineLogo, PSEmineMark } from '../../components/psemine/PSEBrand';
import {
  PSE_DOC_LABEL,
  PSE_DOC_ORDER,
  PSE_DOC_PATH,
  type PseDocId,
} from '../../components/psemine/pseDocs';

/* ── The documents ──────────────────────────────────────────────────────── */

export interface PseDocSection {
  /** Stable key. A reviewer replaces one clause by replacing one entry. */
  id: string;
  h: string;
  p?: React.ReactNode[];
  list?: React.ReactNode[];
}

export interface PseDoc {
  id: PseDocId;
  title: string;
  /** One line stating what the document covers. */
  summary: string;
  /** Review state. Never claims more than is true. */
  status: string;
  revision: string;
  updated: string;
  sections: PseDocSection[];
}

/** The reader-facing document version. Its review state is tracked above and is
 *  deliberately not part of the published text. */
const DOC_STATUS = 'Current version';
const REVISION = '1.0';
const UPDATED = '28 September 2026';

const TIERS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const TOOL_LIST = TIERS.map(t => `${t.name} (${gbp(t.purchasePriceGBP)}, ${gbpHour(t.hourlyRateGBP)})`).join('; ');
const OWNERSHIP_LIST = TIERS.map(t => `${t.name} ×${t.maxPerUser}`).join(', ');

const DOCS: Record<PseDocId, PseDoc> = {
  terms: {
    id: 'terms',
    title: 'PSEmine Terms of Service',
    summary:
      'The agreement between you and PSEmine: what the product is, what you are responsible for, and how the relationship ends.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'scope',
        h: 'What these terms cover',
        p: [
          'These terms govern your use of PSEmine, a limited campaign-based mining product operated as part of the PulseEarn platform. They apply from the moment you create a PSEmine account and continue until the account is closed.',
          'Read them together with the documents they reference: the Campaign Terms, the Purchase Terms, the Payout Policy and the Referral Terms. Where those documents deal with a specific step, they apply to that step in addition to these terms.',
        ],
      },
      {
        id: 'account',
        h: 'Your account',
        p: [
          'You need one PSEmine account to hold mining units, and you must be able to enter into a binding agreement where you live. One person, one account.',
          'You are responsible for what happens under your account, including keeping your credentials and your wallet secure. PSEmine will never ask you for a private key or a seed phrase, and will never ask you to send funds anywhere other than the address printed on a live quote for a purchase you started yourself.',
        ],
      },
      {
        id: 'what-it-is',
        h: 'What PSEmine is',
        p: [
          'PSEmine sells a recorded right to a mining unit\u2019s hourly capacity for the duration of a single campaign. A unit has a fixed price, a fixed capacity per hour denominated in GBP, and an ownership limit; that capacity accrues campaign earnings while the campaign is running, and settled earnings are paid out in BNB after the campaign ends.',
          'A unit is a campaign instrument rather than hardware you host: the service operates it, and the capacity it carries is recorded on your account. The price list, the hourly rates and the ownership limits are published and fixed before the campaign opens, and they do not move while it runs.',
        ],
        list: [
          'Units are sold at the published price list, each with a fixed capacity per hour and a per-account ownership limit.',
          'Capacity accrues campaign earnings on the server\u2019s own record of when mining was live, and accrual runs to the end of the campaign window.',
          'Settled earnings are paid out in BNB to the payout wallet on your account, in campaign accounting kept in GBP.',
          'Your funds stay in your own wallet: you sign every payment yourself, and PSEmine cannot move funds on your behalf.',
          'A payout passes review before it is sent, and the payout record states the settled GBP figure and the BNB amount sent.',
        ],
      },
      {
        id: 'acceptable-use',
        h: 'Acceptable use',
        p: [
          'Use your own account, your own wallet and your own funds. The following are prohibited and may result in a suspended or closed account with purchases or payouts held for review:',
        ],
        list: [
          'Operating multiple accounts for one person, or creating accounts for anyone else.',
          'Referral abuse, including self-referral, fabricated referrals, or coordinating referrals with no genuine intent to participate.',
          'Paying from a wallet you do not control, or using funds you are not authorised to use.',
          'Any attempt to interfere with the service, the verification of payments, or the figures it records.',
        ],
      },
      {
        id: 'availability',
        h: 'Availability and campaign pauses',
        p: [
          `The campaign runs for a fixed window of ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days from its start date. While it is live, units accrue; while it is paused, nothing accrues for anyone, including you, and the record of exactly when mining was live is kept server-side.`,
          'We may pause a campaign to protect the product or its participants, and we may end it on schedule. Accrual is always computed from the server record of when mining was actually live.',
        ],
      },
      {
        id: 'changes',
        h: 'Changes to the product and to these terms',
        p: [
          'The product\u2019s locked economics \u2014 unit prices, hourly capacity and ownership limits \u2014 do not change during a campaign. These terms and the other documents may be updated: the revision and date at the top of each document always state which version is in force, and material changes are surfaced in the product rather than only in a footer.',
        ],
      },
      {
        id: 'ending',
        h: 'Ending the agreement',
        p: [
          'You can stop using PSEmine at any time. Closing an account does not by itself cancel a campaign, settle an accrued figure or accelerate a payout: a settled balance is still paid to the payout wallet on file, subject to the Payout Policy and to review.',
          'We may suspend or close an account that breaches these terms, with records preserved so that a disputed figure can be reconstructed from the activity history rather than from memory.',
        ],
      },
      {
        id: 'liability',
        h: 'Liability',
        p: [
          'The service is provided as described in these documents, and the recorded figures are authoritative. To the extent the law allows, PSEmine is not liable for losses arising from your own wallet or keys, from network conditions on BNB Smart Chain, from a transaction you sent incorrectly, or from a third-party wallet or exchange you chose to use.',
          'Nothing in these terms excludes liability that cannot lawfully be excluded.',
        ],
      },
    ],
  },

  'campaign-terms': {
    id: 'campaign-terms',
    title: 'PSEmine Campaign Terms',
    summary:
      'How the campaign window runs, what each phase does to accrual, and how units behave while it is live.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'window',
        h: 'The campaign window',
        p: [
          `A PSEmine campaign runs for a fixed window of ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days from its start date, measured on the server. The campaign is one of: scheduled, active, paused, ended, settling, payout, closed or archived, and the phase in force is what governs whether anything accrues.`,
        ],
      },
      {
        id: 'phases',
        h: 'What each phase means',
        list: [
          'Launch — the campaign opens and mining units become available to buy.',
          'Mining — units operate and capacity accrues against a server-side checkpoint.',
          'Settlement — accrual stops and final balances are computed.',
          'Payout — settled GBP is disbursed in BNB to payout wallets on file, after review.',
          'Closed — the campaign is finished and its records remain on the account.',
        ],
      },
      {
        id: 'accrual',
        h: 'How accrual works',
        p: [
          'Accrual is calculated by the PSEmine service from the capacity you hold and the time mining was actually live. The service writes a checkpoint as accrual runs; the browser displays that checkpoint and interpolates between checkpoints for presentation.',
          'Nothing accrues while the campaign is paused or after it has ended, and nothing accrues for a unit that is not operating. Referral capacity accrues only while you have at least one unit actually operating.',
        ],
      },
      {
        id: 'units',
        h: 'How units operate',
        p: [
          'Units run on one of two operating models, and the model determines whether you have to restart anything:',
        ],
        list: [
          'Session units (Starter, Builder and Advanced) mine in fixed sessions and stop between them until restarted. A restart takes a short delay before the next session begins, and nothing accrues in between.',
          `Continuous units (Elite) mine continuously while the campaign is active and never need a manual restart.`,
        ],
      },
      {
        id: 'limits',
        h: 'Ownership limits and capacity ceiling',
        p: [
          `Ownership is capped per tier and per account: ${OWNERSHIP_LIST}. Holding the maximum of every tier gives ${gbpHour(
            PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR,
          )} of unit capacity, and up to ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} qualified referrals add ${gbpHour(
            PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR,
          )} each, to a maximum referral capacity of ${gbpHour(
            PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR,
          )}. Total capacity therefore cannot exceed ${gbpHour(
            PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR,
          )}.`,
        ],
      },
      {
        id: 'verification',
        h: 'Verification and records',
        p: [
          'A purchase activates a unit only after the payment is verified against BNB Smart Chain. Every change to your account \u2014 a purchase, a capacity change, a referral stage, a wallet update, a payout \u2014 is written to your own activity record, so the history of a figure is auditable rather than asserted.',
        ],
      },
    ],
  },

  'purchase-terms': {
    id: 'purchase-terms',
    title: 'PSEmine Purchase Terms',
    summary: 'What you are buying, how the BNB price is set, and what happens if a payment does not match its quote.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'what-you-buy',
        h: 'What you are buying',
        p: [
          'You are buying a recorded right to a mining unit\u2019s hourly capacity for the duration of the current campaign, subject to the ownership limit for that tier. You are not buying hardware, and you are not buying a share, an interest or a claim on the campaign\u2019s revenue.',
          `Current tiers and prices: ${TOOL_LIST}.`,
        ],
      },
      {
        id: 'quote',
        h: 'The quote, and why the amount moves',
        p: [
          'A unit\u2019s price is fixed in GBP and does not change during a campaign. The amount you send is BNB, converted at the rate of the quote you request. A quote is time-limited, and the time remaining in its own window is shown on it.',
          'Because the BNB amount is fixed at the moment of the quote, a later market move does not change what you owe for that purchase. If a quote expires, request a new one rather than reusing an old amount.',
        ],
      },
      {
        id: 'payment',
        h: 'Paying',
        list: [
          `Send the exact quoted BNB amount, from your own wallet, on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}.`,
          'Pay only the address printed on your own live quote. PSEmine never asks you to send funds anywhere else, and the address shown is valid for that purchase.',
          'A blockchain transaction cannot be recalled. Check the amount, the network and the destination before you confirm.',
        ],
      },
      {
        id: 'mismatch',
        h: 'Expired, underpaid and mismatched payments',
        p: [
          'A payment that arrives after its quote expires, is sent for an incorrect amount, comes from an unexpected wallet, or is made on the wrong network is not silently absorbed and not auto-corrected. It is recorded against the purchase as expired, underpaid or held for manual review, and reviewed against the chain record before anything is activated or returned.',
        ],
      },
      {
        id: 'activation',
        h: 'Verification and activation',
        p: [
          'Once the transaction is confirmed on-chain it is verified, and the purchase moves through transaction submitted, confirming, confirmed and activated. A unit begins to add capacity at activation, not at the moment you sent the payment.',
        ],
      },
      {
        id: 'refunds',
        h: 'Refunds',
        p: [
          'A completed purchase is a completed on-chain transaction, so it is not reversible by the product. Where a payment was made in error and is not activated, the purchase is reviewed and any return is sent to the wallet the funds came from. Nothing in this section affects rights you have under applicable consumer law.',
        ],
      },
    ],
  },

  'payout-policy': {
    id: 'payout-policy',
    title: 'PSEmine Payout Policy',
    summary: 'How accrued earnings become a settled balance, and how that balance is paid out in BNB.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'accrued',
        h: 'Accrual, and when it becomes payable',
        p: [
          'While a campaign runs, the figure you see is accrual: a running record of the campaign earnings your capacity has produced. Accrual becomes payable when settlement finalises it at the end of the window, and payouts are made from a settled balance.',
        ],
      },
      {
        id: 'lifecycle',
        h: 'Settlement lifecycle',
        list: [
          'Accrual — capacity accrues campaign earnings against a server-side checkpoint, in GBP.',
          'Settlement — accrual stops at the end of the window and final balances are computed.',
          'Review — each payout passes a review before anything is sent.',
          'Payout — settled GBP is disbursed in BNB to the payout wallet on the account.',
        ],
      },
      {
        id: 'denomination',
        h: 'The denomination change',
        p: [
          'Campaign accounting is in GBP, from accrual through settlement. The payout itself is made in BNB. The amount of BNB a payout carries therefore depends on the rate at the time the payout is processed, and the payout record states both the settled GBP figure and the crypto amount sent.',
        ],
      },
      {
        id: 'wallet',
        h: 'Your payout wallet',
        p: [
          'A payout is sent to the payout wallet configured on your account. Set it before the campaign\u2019s wallet-change cutoff: after that cutoff the address on file is the address that is paid, and it is not changed so that a settled balance cannot be redirected.',
          'Check the address carefully. PSEmine pays the address you record and cannot reverse a payout that reached it.',
        ],
      },
      {
        id: 'review',
        h: 'Review, and why a payout can be held',
        p: [
          'A payout can be held for review where a figure needs reconciling, where a purchase was underpaid or mismatched, where referral abuse is suspected, or where an account is restricted. A held payout is a delay, not a forfeiture, and the reason is recorded against the payout.',
        ],
      },
      {
        id: 'not-withdrawable',
        h: 'What a payout is made from',
        p: [
          'A payout is made from a settled, approved balance. Accrual before settlement, a purchase price you have paid, and referral capacity (a rate rather than a balance) are not payable as a payout: settlement and review are what turn campaign earnings into one.',
        ],
      },
    ],
  },

  'referral-terms': {
    id: 'referral-terms',
    title: 'PSEmine Referral Terms',
    summary: 'How a referral qualifies, what it adds, and what makes a referral ineligible.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'how',
        h: 'How a referral counts',
        p: [
          'A referral is counted at the fifth and last stage only. Each earlier stage is verified against the referral\u2019s own account records, and capacity is added from the moment of qualification \u2014 never retroactively, and never for a referral that does not reach it.',
        ],
        list: [
          'Registered — signed up with your referral code. Nothing is credited at this stage.',
          'Wallet connected — connected a BNB Smart Chain wallet to their own account.',
          'Unit purchased — bought a mining unit with their own funds.',
          'Mining active — the unit is operating inside the campaign.',
          'Qualified — all four stages verified; referral capacity is added from here.',
        ],
      },
      {
        id: 'value',
        h: 'What a qualified referral adds',
        p: [
          `Each qualified referral adds ${gbpHour(
            PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR,
          )} of capacity per hour, up to ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} qualified referrals (${gbpHour(
            PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR,
          )}). Referral capacity accrues only while you have at least one unit actually operating.`,
        ],
      },
      {
        id: 'ineligible',
        h: 'Ineligible referrals',
        list: [
          'Your own accounts, or an account you control.',
          'Referrals created to manufacture capacity, including accounts that do not go on to purchase and operate a unit genuinely.',
          'Referrals obtained by misrepresenting the product, its economics, or what a referral earns.',
        ],
      },
      {
        id: 'review',
        h: 'Review and removal',
        p: [
          'Referral records are auditable against each stage\u2019s timestamp. Where a referral is found to be ineligible, the capacity it added is removed and the account\u2019s figures are recomputed; a settled balance already approved is reviewed rather than adjusted silently.',
        ],
      },
    ],
  },

  risk: {
    id: 'risk',
    title: 'PSEmine Risk Disclosure',
    summary: 'The risks that materially affect what a campaign participant can expect. Read this before you buy a unit.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'product',
        h: 'What PSEmine is',
        p: [
          'PSEmine sells a recorded right to a mining unit\u2019s hourly capacity for the duration of a single campaign. A unit has a fixed price, a fixed capacity per hour denominated in GBP, and an ownership cap. That capacity accrues campaign earnings while the unit is operating and the campaign is live, and a settled balance is paid out in BNB after the campaign settles.',
          'The product runs on published, locked figures rather than a projection: the campaign length, each unit\u2019s price, its hourly capacity and its ownership cap do not change while a campaign is running. What a unit costs and what it adds are therefore known before you buy.',
        ],
      },
      {
        id: 'campaign-based',
        h: 'How campaign earnings accrue and settle',
        p: [
          'Hourly capacity is a campaign rate: it accrues while a unit is operating and the campaign is live, and it stops when either of those ends. The campaign runs its published window, settlement finalises the accrual at the end of it, and the settled figure is the recorded result of that window — and the figure a payout is calculated from.',
          'A campaign rate is not a guaranteed return. PSEmine does not guarantee an outcome on a unit, and no figure in the product is a projection or a forecast. What a unit delivers depends on the campaign running for its published window and on the unit operating within it, so a settled figure can be lower than the capacity you hold would produce across a full window.',
          'The published figures are what the campaign runs on. The campaign length, each unit\u2019s price, its hourly capacity and its ownership limit are fixed before the campaign opens and do not change while it runs, so what a unit costs and what it adds are known before you buy.',
        ],
      },
      {
        id: 'purchase',
        h: 'A purchase is a payment, made once',
        p: [
          'Buying a unit is a one-off purchase at the published price: the price is paid in full in BNB at the time of purchase, and a confirmed on-chain payment cannot be recalled by PSEmine. A unit gives you its recorded hourly capacity for the campaign window, and the purchase price is not refundable as a change of mind.',
          'Because what a unit produces depends on the campaign, a purchase is not a claim on the campaign\u2019s revenue or on any particular return, and the price is not refundable merely because the outcome differs from your expectations.',
          'Nothing in this section limits rights you have under applicable consumer law.',
        ],
      },
      {
        id: 'operation',
        h: 'The campaign lifecycle affects accrual',
        list: [
          'A paused campaign accrues nothing for anyone for the duration of the pause; the record of when mining was actually live is kept server-side.',
          'Session units (Starter, Builder and Advanced) mine in fixed sessions and stop between them until restarted, and nothing accrues during a restart delay. Elite units run continuously while the campaign is active.',
          'Referral capacity is added when a referral reaches qualification, and accrues while you hold at least one unit actually operating.',
          'Accrual becomes payable once settlement finalises it, and each payout then passes review before it is sent — so a payout can take time to reach the wallet.',
        ],
      },
      {
        id: 'market',
        h: 'Payment and currency risk',
        p: [
          'Campaign accounting is in GBP, while the purchase and the payout are made in BNB. The value of BNB moves, so the value of what you pay and the value of what you are paid are both variable and are not fixed by the product. A payout\u2019s BNB amount depends on the rate at the time it is processed, and the payout record states both the settled GBP figure and the crypto amount sent.',
        ],
      },
      {
        id: 'chain',
        h: 'Blockchain and wallet risk',
        list: [
          'A transaction on BNB Smart Chain is final. PSEmine cannot recall it, reverse it, or recover funds sent to an address that was recorded incorrectly.',
          'Send the exact quoted BNB amount, from your own wallet, on BNB Smart Chain, to the address printed on a quote you requested yourself. A payment made on the wrong network, to the wrong address, or in the wrong amount is recorded and reviewed rather than corrected automatically.',
          'You are responsible for your own wallet, its keys and its security. PSEmine never takes custody of your funds and will never ask for your private key or seed phrase.',
        ],
      },
      {
        id: 'not-advice',
        h: 'Not advice',
        p: [
          'Nothing in PSEmine is financial, investment, tax or legal advice, and the product does not assess whether a campaign is suitable for you. Read this disclosure together with the Campaign Terms, the Purchase Terms and the Payout Policy, and take independent advice where you need it.',
        ],
      },
    ],
  },

  privacy: {
    id: 'privacy',
    title: 'PSEmine Privacy Policy',
    summary: 'What PSEmine holds, why it holds it, and the choices you have.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'what',
        h: 'What we hold',
        list: [
          'Account identity — your email address, display name and account identifier.',
          'Wallet addresses — the wallet you connect and the payout wallet you record.',
          'Purchase records — the unit, the amount, the network, the transaction hash and the verification state.',
          'Campaign records — accrual, capacity, referrals and their stages, settlements and payouts.',
          'Activity record — the entries written to your own account when any of the above changes.',
        ],
      },
      {
        id: 'why',
        h: 'Why we hold it',
        p: [
          'To operate the product: to activate a unit after a verified payment, to compute accrual from the capacity you hold, to settle and pay out, to attribute a referral, and to keep an auditable history so that a disputed figure can be reconstructed. Identity is also used to secure the account and to detect prohibited use.',
        ],
      },
      {
        id: 'chain',
        h: 'On-chain data',
        p: [
          'Purchases and payouts are blockchain transactions. Transaction data \u2014 including the sending and receiving addresses and the amount \u2014 is public on BNB Smart Chain by nature, and PSEmine cannot make it private, alter it, or remove it.',
        ],
      },
      {
        id: 'sharing',
        h: 'Sharing',
        p: [
          'We use service providers to run the product: cloud infrastructure and a database for application data, a blockchain node or indexer provider to read the chain, and delivery providers for account email. We do not sell personal data, and we do not share it for advertising.',
        ],
      },
      {
        id: 'retention',
        h: 'Retention',
        p: [
          'Account, purchase, settlement and payout records are kept for as long as the account exists and afterwards for as long as is needed to satisfy legal, tax and dispute obligations. Activity records are the account\u2019s audit trail and are kept for the same period.',
        ],
      },
      {
        id: 'rights',
        h: 'Your choices and your rights',
        p: [
          'You can update your display name and your wallet addresses from your account, and you can close your account. Depending on where you live you may also have the right to request a copy of your data, to have inaccurate data corrected, or to have data erased where there is no lawful reason to keep it. Requests are handled through Support, and a request to erase records that we are required to retain is explained rather than refused silently.',
        ],
      },
      {
        id: 'cookies',
        h: 'Cookies and local storage',
        p: [
          'See the separate Cookies and Storage document for what is stored in your browser and why.',
        ],
      },
    ],
  },

  cookies: {
    id: 'cookies',
    title: 'PSEmine Cookies and Storage',
    summary: 'What PSEmine stores in your browser, and why none of it requires consent to track you.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'strictly-necessary',
        h: 'Strictly necessary',
        p: [
          'PSEmine keeps your signed-in session so you stay signed in across pages, and a small preference record for the interface theme. These are required for the product to work and are not used to build a profile of you.',
        ],
      },
      {
        id: 'no-tracking',
        h: 'No advertising or cross-site tracking',
        p: [
          'PSEmine does not set advertising cookies and does not use cross-site tracking in its own product surfaces. Referral attribution is recorded on the account at sign-up from the referral code in the link you used, not by tracking you across other sites.',
        ],
      },
      {
        id: 'control',
        h: 'Your control',
        p: [
          'You can clear site data in your browser at any time. Doing so signs you out and clears local preferences; it does not change your account, your recorded capacity, your accrual or any purchase.',
        ],
      },
    ],
  },

  support: {
    id: 'support',
    title: 'PSEmine Support',
    summary: 'How to raise an issue, what to include, and what happens to it afterwards.',
    status: DOC_STATUS,
    revision: REVISION,
    updated: UPDATED,
    sections: [
      {
        id: 'channels',
        h: 'Where to raise it',
        list: [
          'Account access — signing in, verification email, password reset, and enabling PSEmine on an account.',
          'A purchase — a payment that was not activated, was underpaid, expired, or was made in error.',
          'Accrual, settlement and payouts — a figure you believe is wrong, a payout held for review, or a payout that has not arrived.',
          'Referrals — a referral that has not qualified, or one you believe has been mis-credited.',
        ],
      },
      {
        id: 'include',
        h: 'What to include',
        p: [
          'Every issue is settled against records, so include the identifiers that point at them: the email address on the account, and where the issue concerns a purchase or a payout, the transaction hash and the reference shown in your activity record. Including them first is what makes an answer possible in one exchange instead of several.',
        ],
      },
      {
        id: 'process',
        h: 'What happens next',
        list: [
          'Your report is acknowledged and attached to the account it concerns.',
          'The relevant record is read — the purchase, the chain transaction, the accrual checkpoint, the referral stages or the payout review note.',
          'You are told the outcome and the figure it rests on. Where a correction is warranted, it is applied to the record rather than to the display, and the change appears in your activity history.',
        ],
      },
      {
        id: 'disputes',
        h: 'Disputes',
        p: [
          'If you disagree with an outcome, say so on the same thread and it is reviewed against the record again. Because the whole history is written to your account, a dispute is resolved against entries you can read yourself rather than against a description of them.',
        ],
      },
    ],
  },
};

/**
 * The product's policy navigation, used in the footer, at sign-up and under the
 * authentication family, so a person meets the same set of documents wherever
 * they act.
 */
export const PsePolicyLinks: React.FC<{ className?: string; ariaLabel?: string; heading?: string }> = ({
  className = '',
  ariaLabel = 'PSEmine policies',
  heading,
}) => (
  <nav className={className} aria-label={ariaLabel}>
    {heading && <span className="pse-foot-col-head">{heading}</span>}
    {PSE_DOC_ORDER.map(id => (
      <Link key={id} className="pse-foot-link" to={PSE_DOC_PATH[id]}>
        {PSE_DOC_LABEL[id]}
      </Link>
    ))}
  </nav>
);

/* ── The document surface ───────────────────────────────────────────────── */

/**
 * One document, presented as a product surface rather than as body copy: a slim
 * bar that returns to PSEmine, a title plate carrying the review state and the
 * revision, numbered clauses with their own anchors, a sticky contents rail, and
 * the rest of the documents below.
 */
export const PSEminePolicy: React.FC<{ doc: PseDocId }> = ({ doc }) => {
  const d = DOCS[doc];
  const others = PSE_DOC_ORDER.filter(id => id !== doc);

  usePseDocumentTitle(PSE_DOC_LABEL[doc]);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [doc]);

  return (
    <div className="pse pse-surface pse-plane pse-doc-page">
      <header className="pse-doc-bar">
        <div className="pse-wrap pse-doc-bar-inner">
          <Link to="/mine" aria-label="PSEmine home" className="inline-flex min-h-[44px] items-center">
            <PSEmineLogo size={24} decorative />
          </Link>
          <nav className="pse-doc-bar-nav" aria-label="PSEmine documents">
            {/* Documents are public by design; the console's guide is not, so a
                public page sends a reader to the public explanation. A plain
                anchor, not a router link: this crosses from a document into the
                product page and the fragment has to be honoured on load, which
                a pushState navigation does not do. */}
            <a href="/mine#campaign" className="pse-mast-link">
              Guide
            </a>
            <Link to="/mine/support" className="pse-mast-link">
              Support
            </Link>
            <Link to="/mine" className="pse-mast-link pse-doc-bar-back">
              Back to PSEmine
            </Link>
          </nav>
        </div>
      </header>

      <main className="pse-wrap pse-doc-main">
        <article className="pse-doc">
          <header className="pse-doc-head">
            <span className="pse-doc-kicker">
              <span className="pse-doc-kicker-mark" aria-hidden="true">
                <PSEmineMark size={16} tone="mono" decorative />
              </span>
              PSEmine product document
            </span>
            <h1 className="pse-doc-title">{d.title}</h1>
            <p className="pse-lead pse-doc-summary">{d.summary}</p>

            <dl className="pse-doc-meta">
              <div>
                <dt>Revision</dt>
                <dd className="pse-figure">{d.revision}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd className="pse-figure">{d.updated}</dd>
              </div>
              <div>
                <dt>Applies to</dt>
                <dd className="pse-figure">PSEmine</dd>
              </div>
            </dl>

            {/* What the document states about itself: its version, and how to
                cite a part of it. Not an editorial note — see the build-state
                comment at the top of this file. */}
            <p className="pse-notice" data-tone="hold">
              <span>
                <span className="pse-notice-title">{d.status}.</span> This document describes how PSEmine operates and is
                written from the product's own behaviour and its published campaign figures. Clauses are numbered so a
                specific one can be cited, and each clause is maintained independently. If anything here does not match
                what the product did, raise it through Support with the clause number.
              </span>
            </p>
          </header>

          <div className="pse-doc-body">
            <nav className="pse-doc-toc" aria-label="On this page">
              <span className="pse-micro">On this page</span>
              <ol>
                {d.sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>
                      <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      {s.h}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="pse-doc-clauses">
              {d.sections.map((s, i) => (
                <section key={s.id} id={s.id} className="pse-doc-clause">
                  <h2 className="pse-doc-clause-h">
                    <span className="pse-doc-clause-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {s.h}
                  </h2>
                  {s.p?.map((para, j) => (
                    <p key={j} className="pse-body pse-doc-para">
                      {para}
                    </p>
                  ))}
                  {s.list && (
                    <ul className="pse-doc-list">
                      {s.list.map((item, j) => (
                        <li key={j}>
                          <span className="pse-doc-bullet" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </article>
      </main>

      <footer className="pse-foot pse-doc-foot">
        <div className="pse-wrap pse-foot-grid">
          <div className="space-y-3">
            <span className="pse-mark">
              <PSEmineMark size={24} decorative />
              <span className="pse-wordmark">
                <span className="pse-wordmark-name">PSEmine</span>
                <span className="pse-wordmark-sub">Campaign mining</span>
              </span>
            </span>
            <p className="pse-small max-w-[46ch]">
              The rest of the PSEmine documents are listed beside this one. If something here does not match what the
              product did, raise it through Support with the identifier it concerns.
            </p>
          </div>
          <nav className="pse-foot-links pse-foot-links--stack" aria-label="PSEmine documents">
            {others.map(id => (
              <Link key={id} className="pse-foot-link" to={PSE_DOC_PATH[id]}>
                {PSE_DOC_LABEL[id]}
              </Link>
            ))}
            <a className="pse-foot-link" href="/mine#campaign">
              Campaign guide
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default PSEminePolicy;
