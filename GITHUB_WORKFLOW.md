# GitHub → Vercel Auto-Deploy Workflow

## How It Works Now

**v0 Workflow** (Automatic):
```
1. Work complete in sandbox
2. Push to GitHub feature branch
3. Automatically create PR to main
4. ← DONE (v0's job finished)
```

**Your Workflow** (Manual merge only):
```
1. Go to: https://github.com/larryryh76/PulseEarn/pulls
2. See the open PR from v0
3. Click "Merge pull request"
4. Vercel auto-deploys to production (NO manual promotion needed)
```

## Complete Flow

```
v0 Completes Work
    ↓
git push origin v0/josepholanrewaju818-2508-a2879678
    ↓
gh pr create (automatic)
    ↓
GitHub PR Created (#200, #201, #202, etc.)
    ↓
📧 You receive notification
    ↓
You click "Merge pull request" on GitHub
    ↓
Changes merged to main
    ↓
Vercel webhook triggered (automatic)
    ↓
Production deployed (automatic)
    ↓
✅ Live on pulseearn.online
```

## Your Action Steps

**Every time v0 finishes work:**

1. **Check GitHub PRs** → https://github.com/larryryh76/PulseEarn/pulls
2. **Click the open PR** (labeled with "v0/josepholanrewaju818-2508-a2879678")
3. **Review the changes** (if needed)
4. **Click "Merge pull request"**
5. **Confirm merge**
6. **Done** - Vercel deploys automatically in 2-5 minutes

## NO Manual Vercel Promotion Needed Anymore

- ~~Vercel dashboard~~
- ~~Manual deployment~~
- ~~Promote to production button~~

Everything is automatic once you merge the PR on GitHub.

## Why This Works

| Step | Who | Automated? |
|------|-----|-----------|
| Push to feature branch | v0 | ✓ Yes |
| Create PR | v0 | ✓ Yes |
| Merge PR to main | You | - (just 1 click) |
| Webhook trigger | GitHub | ✓ Yes |
| Build & deploy | Vercel | ✓ Yes |
| Production live | Vercel | ✓ Yes |

Only **one manual step**: Click "Merge pull request" on GitHub.

## Preview Environment

Before production, Vercel also creates **Preview Deployments** for each PR:
- Link appears in PR comments
- Shows exactly what will go live
- Optional to check before merging

## Current Status

**PR #200 is open now:**
- https://github.com/larryryh76/PulseEarn/pull/200
- Ready to merge whenever you're ready
- All changes: Referral system rebuild + Offerwall certification + cleanup
