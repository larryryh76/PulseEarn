# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: investigation/click_audit.spec.ts >> clickability and route audit
- Location: investigation/click_audit.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.getAttribute: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[href="/cookies"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - link "PulseEarn Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - generic [ref=e7]:
          - img [ref=e11]
          - generic [ref=e14]:
            - generic [ref=e15]: PulseEarn
            - generic [ref=e16]: Rewards
      - generic [ref=e17]:
        - generic [ref=e18]:
          - link "Sign In" [ref=e19] [cursor=pointer]:
            - /url: /login
          - link "Get Started" [ref=e20] [cursor=pointer]:
            - /url: /signup
        - button "Toggle Theme" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
  - main [ref=e28]:
    - generic [ref=e34]:
      - generic [ref=e35]: Start Earning Rewards Today
      - generic [ref=e39]:
        - heading "EARN REWARDS." [level=1] [ref=e41]:
          - text: EARN
          - text: REWARDS.
        - paragraph [ref=e42]: Discover a transparent reward ecosystem. Earn PTS through verified community activities and market-based forecasting campaigns.
      - generic [ref=e43]:
        - button "Get Started" [ref=e44] [cursor=pointer]:
          - text: Get Started
          - img [ref=e45]
        - button "Learn More" [ref=e47] [cursor=pointer]
      - generic [ref=e50]:
        - generic [ref=e56]: pulseearn.online/dashboard
        - generic [ref=e57]:
          - generic [ref=e58]:
            - generic [ref=e59]:
              - generic [ref=e60]:
                - generic [ref=e61]: Balance
                - img [ref=e62]
              - generic [ref=e64]:
                - generic [ref=e65]: "---,---"
                - generic [ref=e66]: PTS
            - generic [ref=e67]:
              - generic [ref=e69]:
                - img [ref=e70]
                - generic [ref=e73]: Daily Profit
              - generic [ref=e82]:
                - img [ref=e83]
                - generic [ref=e86]: System Status
          - generic [ref=e91]:
            - generic [ref=e93]:
              - img [ref=e94]
              - generic [ref=e96]: Live Feed
            - generic [ref=e110]:
              - img [ref=e112]
              - generic [ref=e116]:
                - paragraph [ref=e117]: Account Status
                - paragraph [ref=e118]: LVL 24
    - generic [ref=e120]:
      - generic [ref=e121]:
        - generic [ref=e122]:
          - generic [ref=e123]: Why PulseEarn?
          - heading "Simple. Fast. Rewarding." [level=2] [ref=e124]:
            - text: Simple. Fast.
            - text: Rewarding.
        - paragraph [ref=e126]: A secure infrastructure for campaign-based rewards and verified user engagement.
      - generic [ref=e127]:
        - generic [ref=e130]:
          - img [ref=e133]
          - heading "Secure Payouts" [level=3] [ref=e135]
          - paragraph [ref=e136]: Receive your verified earnings to your linked wallet after system audit.
        - generic [ref=e139]:
          - img [ref=e142]
          - heading "Secure Platform" [level=3] [ref=e144]
          - paragraph [ref=e145]: State-of-the-art security measures to keep your account and data safe.
        - generic [ref=e148]:
          - img [ref=e151]
          - heading "Market Insights" [level=3] [ref=e154]
          - paragraph [ref=e155]: Access real-time market data and trends to help you make informed predictions.
        - generic [ref=e158]:
          - img [ref=e161]
          - heading "Global Access" [level=3] [ref=e164]
          - paragraph [ref=e165]: PulseEarn is available worldwide. Join our community from anywhere.
        - generic [ref=e168]:
          - img [ref=e171]
          - heading "Earn PTS" [level=3] [ref=e173]
          - paragraph [ref=e174]: Earn PTS for every task you complete and prediction you make.
        - generic [ref=e177]:
          - img [ref=e180]
          - heading "Transparent Logs" [level=3] [ref=e182]
          - paragraph [ref=e183]: Every point you earn is recorded in your personal activity history.
    - generic [ref=e187]:
      - generic [ref=e189]:
        - generic [ref=e192]:
          - img [ref=e194]
          - generic [ref=e196]:
            - generic [ref=e197]:
              - heading "Daily PTS" [level=4] [ref=e198]
              - generic [ref=e199]: Active
            - generic [ref=e201]: +10 PTS
          - button [ref=e202] [cursor=pointer]:
            - img [ref=e203]
        - generic [ref=e207]:
          - img [ref=e209]
          - generic [ref=e211]:
            - generic [ref=e212]:
              - heading "USDT Rewards" [level=4] [ref=e213]
              - generic [ref=e214]: Live
            - generic [ref=e216]: $0.01 USD
          - button [ref=e217] [cursor=pointer]:
            - img [ref=e218]
        - generic [ref=e222]:
          - img [ref=e224]
          - generic [ref=e226]:
            - generic [ref=e227]:
              - heading "Bitcoin Bonuses" [level=4] [ref=e228]
              - generic [ref=e229]: Live
            - generic [ref=e231]: "--- BTC"
          - button [ref=e232] [cursor=pointer]:
            - img [ref=e233]
      - generic [ref=e236]:
        - generic [ref=e237]:
          - img [ref=e238]
          - text: Daily Rewards
        - heading "Grow Your Earnings." [level=2] [ref=e242]:
          - text: Grow Your
          - text: Earnings.
        - paragraph [ref=e243]: Our platform provides daily earning opportunities. Complete tasks and see your balance grow in real-time.
        - generic [ref=e244]:
          - generic [ref=e245]:
            - generic [ref=e247]: "01"
            - generic [ref=e248]:
              - heading "Sign Up" [level=4] [ref=e249]
              - paragraph [ref=e250]: Create your free account in seconds.
          - generic [ref=e251]:
            - generic [ref=e253]: "02"
            - generic [ref=e254]:
              - heading "Complete Tasks" [level=4] [ref=e255]
              - paragraph [ref=e256]: Participate in simple daily activities.
          - generic [ref=e257]:
            - generic [ref=e259]: "03"
            - generic [ref=e260]:
              - heading "Get Paid" [level=4] [ref=e261]
              - paragraph [ref=e262]: Earn points and redeem them for rewards.
    - generic [ref=e265]:
      - generic [ref=e267]:
        - generic [ref=e268]:
          - img [ref=e269]
          - text: Market Predictions
        - heading "Predict & Earn More." [level=2] [ref=e273]:
          - text: Predict &
          - text: Earn More.
        - paragraph [ref=e274]: Use your market knowledge to predict price movements. Correct predictions result in bonus points and rewards.
        - generic [ref=e275]:
          - generic [ref=e279]: Real-time Market Data
          - generic [ref=e283]: Multiple Assets
          - generic [ref=e287]: Instant Settlements
          - generic [ref=e291]: Bonus Multipliers
        - button "Start Predicting" [ref=e293] [cursor=pointer]:
          - text: Start Predicting
          - img [ref=e294]
      - generic [ref=e301]:
        - generic [ref=e302]:
          - generic [ref=e303]:
            - img [ref=e305]
            - generic [ref=e307]:
              - heading "BTC/USDT" [level=4] [ref=e308]
              - paragraph [ref=e309]: Live Market
          - generic [ref=e310]:
            - paragraph [ref=e311]: $0.00
            - text: Live
        - generic [ref=e312]:
          - paragraph [ref=e314]: What is your prediction?
          - generic [ref=e315]:
            - button "Price Up" [ref=e316] [cursor=pointer]:
              - img [ref=e317]
              - generic [ref=e320]: Price Up
            - button "Price Down" [ref=e321] [cursor=pointer]:
              - img [ref=e322]
              - generic [ref=e325]: Price Down
          - button "View Market" [ref=e326] [cursor=pointer]
        - generic [ref=e327]:
          - generic [ref=e328]:
            - img [ref=e329]
            - generic [ref=e332]: Active
          - generic [ref=e333]: Market Feed
    - generic [ref=e337]:
      - generic [ref=e338]:
        - generic [ref=e339]: FAQ
        - heading "Got Questions?" [level=2] [ref=e340]
        - paragraph [ref=e341]: Everything you need to know about getting started with PulseEarn.
      - generic [ref=e342]:
        - button "How do I start earning?" [ref=e344] [cursor=pointer]:
          - generic [ref=e345]: How do I start earning?
          - img [ref=e347]
        - button "How are rewards paid out?" [ref=e349] [cursor=pointer]:
          - generic [ref=e350]: How are rewards paid out?
          - img [ref=e352]
        - button "What is the minimum for withdrawal?" [ref=e354] [cursor=pointer]:
          - generic [ref=e355]: What is the minimum for withdrawal?
          - img [ref=e357]
        - button "How do market predictions work?" [ref=e359] [cursor=pointer]:
          - generic [ref=e360]: How do market predictions work?
          - img [ref=e362]
        - button "Is PulseEarn secure?" [ref=e364] [cursor=pointer]:
          - generic [ref=e365]: Is PulseEarn secure?
          - img [ref=e367]
    - generic [ref=e372]:
      - img [ref=e374]
      - heading "Ready to Start Earning?" [level=2] [ref=e379]:
        - text: Ready to Start
        - text: Earning?
      - paragraph [ref=e380]: Join the growing PulseEarn ecosystem. Create your account in minutes and start earning rewards.
      - generic [ref=e381]:
        - button "Get Started" [ref=e382] [cursor=pointer]:
          - text: Get Started
          - img [ref=e383]
        - button "See Features" [ref=e385] [cursor=pointer]:
          - img [ref=e386]
          - text: See Features
      - generic [ref=e388]:
        - generic [ref=e389]: Secure Account
        - generic [ref=e390]: Fast Payouts
        - generic [ref=e391]: 24/7 Support
  - contentinfo [ref=e392]:
    - generic [ref=e394]:
      - paragraph [ref=e395]: © 2026 PulseEarn.
      - generic [ref=e396]:
        - link "Privacy Policy" [ref=e397] [cursor=pointer]:
          - /url: /privacy
        - link "Terms of Service" [ref=e398] [cursor=pointer]:
          - /url: /terms
        - link "Reward Policy" [ref=e399] [cursor=pointer]:
          - /url: /reward-policy
        - link "Fraud Policy" [ref=e400] [cursor=pointer]:
          - /url: /fraud-policy
        - link "Withdrawal Policy" [ref=e401] [cursor=pointer]:
          - /url: /withdrawal-policy
        - link "Help Center" [ref=e402] [cursor=pointer]:
          - /url: /help
        - link "Support" [ref=e403] [cursor=pointer]:
          - /url: /support
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('clickability and route audit', async ({ page }) => {
  4  |   // 1. Landing Page Links
  5  |   await page.goto('http://localhost:5173/');
  6  |
  7  |   const footerLinks = [
  8  |     '/privacy', '/terms', '/cookies', '/reward-policy',
  9  |     '/fraud-policy', '/verification-policy', '/withdrawal-policy',
  10 |     '/referral-policy', '/community-guidelines', '/support-policy', '/help'
  11 |   ];
  12 |
  13 |   for (const link of footerLinks) {
  14 |     console.log(`Checking link: ${link}`);
> 15 |     const href = await page.getAttribute(`a[href="${link}"]`, 'href');
     |                             ^ Error: page.getAttribute: Test timeout of 30000ms exceeded.
  16 |     if (href) {
  17 |         await page.click(`a[href="${link}"]`);
  18 |         await expect(page).not.toHaveURL(/.*404.*/);
  19 |         await page.goto('http://localhost:5173/');
  20 |     } else {
  21 |         console.warn(`Link not found in footer: ${link}`);
  22 |     }
  23 |   }
  24 |
  25 |   // 2. Auth CTAs
  26 |   const ctas = ['Get Started', 'Sign In', 'Sign Up'];
  27 |   for (const cta of ctas) {
  28 |     const btn = page.getByText(cta, { exact: true }).first();
  29 |     if (await btn.isVisible()) {
  30 |         console.log(`Checking CTA: ${cta}`);
  31 |         await btn.click();
  32 |         await expect(page.url()).toMatch(/\/(signup|login|dashboard)/);
  33 |         await page.goto('http://localhost:5173/');
  34 |     }
  35 |   }
  36 | });
  37 |
```