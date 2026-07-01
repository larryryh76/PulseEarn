import { render } from '@react-email/render';
import { PulseEarnEmail } from './src/emails/PulseEarnEmail';
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';

const templates = [
  {
    name: 'VerifyEmail',
    title: 'Verify your account',
    preview: 'Confirm your email to join the network',
    content: 'Welcome to the network! Please verify your email address to unlock full access to the platform and start earning PTS.',
    buttonText: 'Verify Email Address',
    actionUrl: '{{link}}'
  },
  {
    name: 'ResetPassword',
    title: 'Reset your password',
    preview: 'Securely reset your account password',
    content: 'We received a request to reset your password. If this was you, click the button below to choose a new one.',
    buttonText: 'Reset Password',
    actionUrl: '{{link}}'
  },
  {
    name: 'Welcome',
    title: 'Welcome to PulseEarn',
    preview: 'Your journey starts here',
    content: 'Your account is ready. Dive in and explore various tasks and market predictions to build your rewards balance.',
    buttonText: 'Go to Dashboard',
    actionUrl: 'https://pulseearn.online/dashboard'
  },
  {
    name: 'EmailChange',
    title: 'Confirm Email Change',
    preview: 'Verify your new email address',
    content: 'You requested to change your email address. Please confirm the change by clicking the button below.',
    buttonText: 'Confirm Change',
    actionUrl: '{{link}}'
  },
  {
    name: 'WithdrawalApproved',
    title: 'Withdrawal Approved',
    preview: 'Your funds are on the way',
    content: 'Great news! Your withdrawal request has been approved and is currently being processed. You will receive another notification once the transfer is complete.',
    buttonText: 'View History',
    actionUrl: 'https://pulseearn.online/me?tab=history'
  },
  {
    name: 'WithdrawalRejected',
    title: 'Withdrawal Rejected',
    preview: 'Update on your withdrawal request',
    content: 'Your withdrawal request was not approved. The points have been returned to your balance. Please check your dashboard for details or contact support.',
    buttonText: 'Contact Support',
    actionUrl: 'https://pulseearn.online/support'
  },
  {
    name: 'CampaignInvitation',
    title: 'New Campaign Alert',
    preview: 'High-yield opportunities available',
    content: 'A new high-yield reward campaign has just launched. Join now to maximize your earnings before the prize pool is exhausted.',
    buttonText: 'Join Campaign',
    actionUrl: 'https://pulseearn.online/campaigns'
  },
  {
    name: 'RewardReceived',
    title: 'Reward Credited',
    preview: 'You just earned PTS',
    content: 'Congratulations! You have received a new reward for your recent activity. Your balance has been updated.',
    buttonText: 'View Balance',
    actionUrl: 'https://pulseearn.online/me'
  },
  {
    name: 'ReferralReward',
    title: 'Referral Bonus Received',
    preview: 'Your network is growing',
    content: 'One of your referrals has successfully qualified! We have credited your account with a referral bonus.',
    buttonText: 'View Network',
    actionUrl: 'https://pulseearn.online/referrals'
  },
  {
    name: 'SecurityAlert',
    title: 'Security Alert',
    preview: 'Critical update for your account',
    content: 'A new login or security-sensitive action was detected on your account. If this was not you, please secure your account immediately.',
    buttonText: 'Secure Account',
    actionUrl: 'https://pulseearn.online/me'
  }
];

async function build() {
  const outputDir = path.join(process.cwd(), 'api', 'templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const tpl of templates) {
    const html = await render(
      React.createElement(PulseEarnEmail, {
        userFirstname: '{{username}}',
        title: tpl.title,
        preview: tpl.preview,
        content: tpl.content,
        buttonText: tpl.buttonText,
        actionUrl: tpl.actionUrl
      })
    );

    fs.writeFileSync(path.join(outputDir, `${tpl.name}.html`), html);
    console.log(`Built template: ${tpl.name}`);
  }
}

build().catch(console.error);
