# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: investigation/api_deep_test.spec.ts >> API Force Database Init
- Location: investigation/api_deep_test.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForRequest: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img [ref=e8]
        - generic [ref=e10]: Ops Control
      - button [ref=e11] [cursor=pointer]:
        - img [ref=e12]
    - navigation [ref=e14]:
      - generic [ref=e15]:
        - paragraph [ref=e16]: CORE
        - link "Overview" [ref=e17] [cursor=pointer]:
          - /url: /admin/overview
          - img [ref=e18]
          - generic [ref=e23]: Overview
        - link "Task Library" [ref=e25] [cursor=pointer]:
          - /url: /admin/tasks
          - img [ref=e26]
          - generic [ref=e28]: Task Library
        - link "Markets" [ref=e29] [cursor=pointer]:
          - /url: /admin/predictions
          - img [ref=e30]
          - generic [ref=e33]: Markets
      - generic [ref=e34]:
        - paragraph [ref=e35]: ECONOMY
        - link "Approvals" [ref=e36] [cursor=pointer]:
          - /url: /admin/validation
          - img [ref=e37]
          - generic [ref=e40]: Approvals
        - link "Withdrawals" [ref=e41] [cursor=pointer]:
          - /url: /admin/withdrawals
          - img [ref=e42]
          - generic [ref=e44]: Withdrawals
        - link "Transactions" [ref=e45] [cursor=pointer]:
          - /url: /admin/ledger
          - img [ref=e46]
          - generic [ref=e48]: Transactions
        - link "Economy Hub" [ref=e49] [cursor=pointer]:
          - /url: /admin/economy
          - img [ref=e50]
          - generic [ref=e52]: Economy Hub
        - link "XP Engine" [ref=e53] [cursor=pointer]:
          - /url: /admin/xp
          - img [ref=e54]
          - generic [ref=e60]: XP Engine
      - generic [ref=e61]:
        - paragraph [ref=e62]: SYSTEM
        - link "User Directory" [ref=e63] [cursor=pointer]:
          - /url: /admin/users
          - img [ref=e64]
          - generic [ref=e69]: User Directory
        - link "Offerwalls" [ref=e70] [cursor=pointer]:
          - /url: /admin/offerwalls
          - img [ref=e71]
          - generic [ref=e74]: Offerwalls
        - link "Moderators" [ref=e75] [cursor=pointer]:
          - /url: /admin/moderators
          - img [ref=e76]
          - generic [ref=e79]: Moderators
        - link "Support Desk" [ref=e80] [cursor=pointer]:
          - /url: /admin/support
          - img [ref=e81]
          - generic [ref=e83]: Support Desk
        - link "Broadcasts" [ref=e84] [cursor=pointer]:
          - /url: /admin/broadcasts
          - img [ref=e85]
          - generic [ref=e88]: Broadcasts
      - generic [ref=e89]:
        - paragraph [ref=e90]: SECURITY
        - link "Threat Stream" [ref=e91] [cursor=pointer]:
          - /url: /admin/security
          - img [ref=e92]
          - generic [ref=e94]: Threat Stream
        - link "Audit Logs" [ref=e95] [cursor=pointer]:
          - /url: /admin/audit
          - img [ref=e96]
          - generic [ref=e99]: Audit Logs
        - link "System Health" [ref=e100] [cursor=pointer]:
          - /url: /admin/health
          - img [ref=e101]
          - generic [ref=e103]: System Health
    - generic [ref=e104]:
      - generic [ref=e107]:
        - paragraph [ref=e108]: User_HQHTJ
        - paragraph [ref=e109]: admin@pulse.com
      - button "Terminate Session" [ref=e110] [cursor=pointer]:
        - img [ref=e111]
        - generic [ref=e114]: Terminate Session
  - generic [ref=e115]:
    - banner [ref=e116]:
      - generic [ref=e121]: ONLINE
    - main [ref=e122]:
      - generic [ref=e124]:
        - generic [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]:
              - img [ref=e128]
              - heading "Overview" [level=1] [ref=e130]
            - generic [ref=e131]:
              - generic [ref=e132]: "System: Online"
              - generic [ref=e135]: "Sync: 10:11:28 AM"
              - generic [ref=e137]: "Engine: 5.0.0-PRO"
              - generic [ref=e138]:
                - img [ref=e139]
                - text: "CRITICAL: Liability Reporting Offline"
          - button "Refresh Feed" [ref=e141] [cursor=pointer]:
            - img [ref=e142]
            - text: Refresh Feed
        - generic [ref=e147]:
          - generic [ref=e148] [cursor=pointer]:
            - generic [ref=e149]:
              - img [ref=e151]
              - generic [ref=e156]: Audit
            - paragraph [ref=e157]: Total Users
            - paragraph [ref=e158]: "41"
          - generic [ref=e159] [cursor=pointer]:
            - generic [ref=e160]:
              - img [ref=e162]
              - generic [ref=e164]: Audit
            - paragraph [ref=e165]: 24h PTS Volume
            - paragraph [ref=e166]: "0"
          - generic [ref=e167] [cursor=pointer]:
            - generic [ref=e168]:
              - img [ref=e170]
              - generic [ref=e173]: Audit
            - paragraph [ref=e174]: 24h Offerwall Payouts
            - paragraph [ref=e175]: "0"
          - generic [ref=e176] [cursor=pointer]:
            - generic [ref=e177]:
              - img [ref=e179]
              - generic [ref=e181]: Audit
            - paragraph [ref=e182]: USD Liability
            - paragraph [ref=e183]: $0.00
          - generic [ref=e184] [cursor=pointer]:
            - generic [ref=e185]:
              - img [ref=e187]
              - generic [ref=e191]: Audit
            - paragraph [ref=e192]: Active Campaigns
            - paragraph [ref=e193]: "0"
        - generic [ref=e194]:
          - generic [ref=e195]:
            - heading "Live Event Feed" [level=2] [ref=e196]:
              - img [ref=e197]
              - text: Live Event Feed
            - generic [ref=e199]:
              - button "Daily Login Bonus RHCtiop146Tg... +10 10:05:17 PM" [ref=e200] [cursor=pointer]:
                - generic [ref=e201]:
                  - img [ref=e203]
                  - generic [ref=e206]:
                    - paragraph [ref=e207]: Daily Login Bonus
                    - paragraph [ref=e208]: RHCtiop146Tg...
                - generic [ref=e209]:
                  - paragraph [ref=e210]: "+10"
                  - paragraph [ref=e211]: 10:05:17 PM
              - button "Welcome Bonus hpnBzb8KvuNv... +30 4:13:07 AM" [ref=e212] [cursor=pointer]:
                - generic [ref=e213]:
                  - img [ref=e215]
                  - generic [ref=e218]:
                    - paragraph [ref=e219]: Welcome Bonus
                    - paragraph [ref=e220]: hpnBzb8KvuNv...
                - generic [ref=e221]:
                  - paragraph [ref=e222]: "+30"
                  - paragraph [ref=e223]: 4:13:07 AM
              - button "Daily Login Bonus hpnBzb8KvuNv... +10 4:13:01 AM" [ref=e224] [cursor=pointer]:
                - generic [ref=e225]:
                  - img [ref=e227]
                  - generic [ref=e230]:
                    - paragraph [ref=e231]: Daily Login Bonus
                    - paragraph [ref=e232]: hpnBzb8KvuNv...
                - generic [ref=e233]:
                  - paragraph [ref=e234]: "+10"
                  - paragraph [ref=e235]: 4:13:01 AM
              - button "Daily Login Bonus bNWOa4IcgvY8... +10 3:51:15 PM" [ref=e236] [cursor=pointer]:
                - generic [ref=e237]:
                  - img [ref=e239]
                  - generic [ref=e242]:
                    - paragraph [ref=e243]: Daily Login Bonus
                    - paragraph [ref=e244]: bNWOa4IcgvY8...
                - generic [ref=e245]:
                  - paragraph [ref=e246]: "+10"
                  - paragraph [ref=e247]: 3:51:15 PM
              - button "Daily Login Bonus Xt7ZquBCYhUY... +10 11:21:27 AM" [ref=e248] [cursor=pointer]:
                - generic [ref=e249]:
                  - img [ref=e251]
                  - generic [ref=e254]:
                    - paragraph [ref=e255]: Daily Login Bonus
                    - paragraph [ref=e256]: Xt7ZquBCYhUY...
                - generic [ref=e257]:
                  - paragraph [ref=e258]: "+10"
                  - paragraph [ref=e259]: 11:21:27 AM
          - generic [ref=e260]:
            - heading "Critical Attention" [level=2] [ref=e261]:
              - img [ref=e262]
              - text: Critical Attention
            - generic [ref=e264]:
              - button "Pending Payouts 0" [ref=e265] [cursor=pointer]:
                - generic [ref=e266]:
                  - img [ref=e268]
                  - paragraph [ref=e270]: Pending Payouts
                - generic [ref=e271]:
                  - generic [ref=e272]: "0"
                  - img [ref=e273]
              - button "Open Inquiries 1" [ref=e275] [cursor=pointer]:
                - generic [ref=e276]:
                  - img [ref=e278]
                  - paragraph [ref=e280]: Open Inquiries
                - generic [ref=e281]:
                  - generic [ref=e282]: "1"
                  - img [ref=e283]
              - button "Unresolved Threats 8861" [ref=e285] [cursor=pointer]:
                - generic [ref=e286]:
                  - img [ref=e288]
                  - paragraph [ref=e290]: Unresolved Threats
                - generic [ref=e291]:
                  - generic [ref=e292]: "8861"
                  - img [ref=e293]
        - generic [ref=e295]:
          - heading "Operational Priority Queues" [level=2] [ref=e296]:
            - img [ref=e297]
            - text: Operational Priority Queues
          - generic [ref=e300]:
            - generic [ref=e301] [cursor=pointer]:
              - generic [ref=e302]:
                - paragraph [ref=e303]: Pending Withdrawals
                - paragraph [ref=e304]: "0"
              - img [ref=e305]
            - generic [ref=e307] [cursor=pointer]:
              - generic [ref=e308]:
                - paragraph [ref=e309]: Pending Approvals
                - paragraph [ref=e310]: "0"
              - img [ref=e311]
            - generic [ref=e314] [cursor=pointer]:
              - generic [ref=e315]:
                - paragraph [ref=e316]: Open Tickets
                - paragraph [ref=e317]: "1"
              - img [ref=e318]
        - generic [ref=e320]:
          - generic [ref=e321]:
            - heading "Recent Transactions" [level=3] [ref=e323]:
              - img [ref=e324]
              - text: Recent Transactions
            - generic [ref=e327]:
              - table [ref=e329]:
                - rowgroup [ref=e330]:
                  - row "Transaction Amount" [ref=e331]:
                    - columnheader "Transaction" [ref=e332]:
                      - generic [ref=e333]: Transaction
                    - columnheader "Amount" [ref=e334]:
                      - generic [ref=e335]: Amount
                - rowgroup [ref=e336]:
                  - 'row "Daily Login Bonus ID: DAILY_2026 +10 PTS 10:05:17 PM" [ref=e337] [cursor=pointer]':
                    - 'cell "Daily Login Bonus ID: DAILY_2026" [ref=e338]':
                      - generic [ref=e341]:
                        - paragraph [ref=e342]: Daily Login Bonus
                        - paragraph [ref=e343]: "ID: DAILY_2026"
                    - cell "+10 PTS 10:05:17 PM" [ref=e344]:
                      - generic [ref=e345]:
                        - paragraph [ref=e346]: +10 PTS
                        - paragraph [ref=e347]: 10:05:17 PM
                  - 'row "Welcome Bonus ID: WELCOME_HP +30 PTS 4:13:07 AM" [ref=e348] [cursor=pointer]':
                    - 'cell "Welcome Bonus ID: WELCOME_HP" [ref=e349]':
                      - generic [ref=e352]:
                        - paragraph [ref=e353]: Welcome Bonus
                        - paragraph [ref=e354]: "ID: WELCOME_HP"
                    - cell "+30 PTS 4:13:07 AM" [ref=e355]:
                      - generic [ref=e356]:
                        - paragraph [ref=e357]: +30 PTS
                        - paragraph [ref=e358]: 4:13:07 AM
                  - 'row "Daily Login Bonus ID: DAILY_2026 +10 PTS 4:13:01 AM" [ref=e359] [cursor=pointer]':
                    - 'cell "Daily Login Bonus ID: DAILY_2026" [ref=e360]':
                      - generic [ref=e363]:
                        - paragraph [ref=e364]: Daily Login Bonus
                        - paragraph [ref=e365]: "ID: DAILY_2026"
                    - cell "+10 PTS 4:13:01 AM" [ref=e366]:
                      - generic [ref=e367]:
                        - paragraph [ref=e368]: +10 PTS
                        - paragraph [ref=e369]: 4:13:01 AM
                  - 'row "Daily Login Bonus ID: DAILY_2026 +10 PTS 3:51:15 PM" [ref=e370] [cursor=pointer]':
                    - 'cell "Daily Login Bonus ID: DAILY_2026" [ref=e371]':
                      - generic [ref=e374]:
                        - paragraph [ref=e375]: Daily Login Bonus
                        - paragraph [ref=e376]: "ID: DAILY_2026"
                    - cell "+10 PTS 3:51:15 PM" [ref=e377]:
                      - generic [ref=e378]:
                        - paragraph [ref=e379]: +10 PTS
                        - paragraph [ref=e380]: 3:51:15 PM
                  - 'row "Daily Login Bonus ID: DAILY_2026 +10 PTS 11:21:27 AM" [ref=e381] [cursor=pointer]':
                    - 'cell "Daily Login Bonus ID: DAILY_2026" [ref=e382]':
                      - generic [ref=e385]:
                        - paragraph [ref=e386]: Daily Login Bonus
                        - paragraph [ref=e387]: "ID: DAILY_2026"
                    - cell "+10 PTS 11:21:27 AM" [ref=e388]:
                      - generic [ref=e389]:
                        - paragraph [ref=e390]: +10 PTS
                        - paragraph [ref=e391]: 11:21:27 AM
                  - 'row "Welcome Bonus ID: WELCOME_XT +30 PTS 11:19:26 AM" [ref=e392] [cursor=pointer]':
                    - 'cell "Welcome Bonus ID: WELCOME_XT" [ref=e393]':
                      - generic [ref=e396]:
                        - paragraph [ref=e397]: Welcome Bonus
                        - paragraph [ref=e398]: "ID: WELCOME_XT"
                    - cell "+30 PTS 11:19:26 AM" [ref=e399]:
                      - generic [ref=e400]:
                        - paragraph [ref=e401]: +30 PTS
                        - paragraph [ref=e402]: 11:19:26 AM
                  - 'row "Welcome Bonus ID: WELCOME_3D +30 PTS 10:08:29 PM" [ref=e403] [cursor=pointer]':
                    - 'cell "Welcome Bonus ID: WELCOME_3D" [ref=e404]':
                      - generic [ref=e407]:
                        - paragraph [ref=e408]: Welcome Bonus
                        - paragraph [ref=e409]: "ID: WELCOME_3D"
                    - cell "+30 PTS 10:08:29 PM" [ref=e410]:
                      - generic [ref=e411]:
                        - paragraph [ref=e412]: +30 PTS
                        - paragraph [ref=e413]: 10:08:29 PM
                  - 'row "Welcome Bonus ID: WELCOME_4S +30 PTS 8:59:01 PM" [ref=e414] [cursor=pointer]':
                    - 'cell "Welcome Bonus ID: WELCOME_4S" [ref=e415]':
                      - generic [ref=e418]:
                        - paragraph [ref=e419]: Welcome Bonus
                        - paragraph [ref=e420]: "ID: WELCOME_4S"
                    - cell "+30 PTS 8:59:01 PM" [ref=e421]:
                      - generic [ref=e422]:
                        - paragraph [ref=e423]: +30 PTS
                        - paragraph [ref=e424]: 8:59:01 PM
                  - 'row "Welcome Bonus ID: WELCOME_XO +30 PTS 8:44:37 PM" [ref=e425] [cursor=pointer]':
                    - 'cell "Welcome Bonus ID: WELCOME_XO" [ref=e426]':
                      - generic [ref=e429]:
                        - paragraph [ref=e430]: Welcome Bonus
                        - paragraph [ref=e431]: "ID: WELCOME_XO"
                    - cell "+30 PTS 8:44:37 PM" [ref=e432]:
                      - generic [ref=e433]:
                        - paragraph [ref=e434]: +30 PTS
                        - paragraph [ref=e435]: 8:44:37 PM
                  - 'row "Welcome Bonus ID: WELCOME_H8 +30 PTS 8:43:26 PM" [ref=e436] [cursor=pointer]':
                    - 'cell "Welcome Bonus ID: WELCOME_H8" [ref=e437]':
                      - generic [ref=e440]:
                        - paragraph [ref=e441]: Welcome Bonus
                        - paragraph [ref=e442]: "ID: WELCOME_H8"
                    - cell "+30 PTS 8:43:26 PM" [ref=e443]:
                      - generic [ref=e444]:
                        - paragraph [ref=e445]: +30 PTS
                        - paragraph [ref=e446]: 8:43:26 PM
              - button "Load More Records" [ref=e448] [cursor=pointer]:
                - img [ref=e449]
                - text: Load More Records
          - generic [ref=e451]:
            - generic [ref=e452]:
              - generic [ref=e453]:
                - img [ref=e455]
                - generic [ref=e457]: SYSTEM_SECURE
              - generic [ref=e458]:
                - heading "Security Alerts" [level=3] [ref=e459]
                - paragraph [ref=e460]: System detected 8861 security alerts requiring administrative review.
            - button "Review Security" [ref=e461] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('API Force Database Init', async ({ page }) => {
  4  |   await page.goto('https://www.pulseearn.online/login');
  5  |   await page.fill('input[type="email"]', 'admin@pulse.com');
  6  |   await page.fill('input[type="password"]', 'dereal01');
  7  |   await page.click('button:has-text("Sign In")');
  8  |   await page.waitForTimeout(10000);
  9  |
  10 |   // Monitor network for outgoing API calls to catch the token
  11 |   const [request] = await Promise.all([
> 12 |     page.waitForRequest(req => req.url().includes('/api/')),
     |          ^ Error: page.waitForRequest: Test timeout of 30000ms exceeded.
  13 |     page.goto('https://www.pulseearn.online/admin/overview')
  14 |   ]);
  15 |
  16 |   const authHeader = request.headers()['authorization'];
  17 |   console.log('Auth Header Present:', !!authHeader);
  18 |
  19 |   if (authHeader) {
  20 |      const healthRes = await page.request.get('https://www.pulseearn.online/api/health', {
  21 |         headers: { 'Authorization': authHeader }
  22 |      });
  23 |      const health = await healthRes.json();
  24 |      console.log('Health with Auth:', health);
  25 |   }
  26 | });
  27 |
```