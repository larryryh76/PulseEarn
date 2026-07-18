# PULSEEARN ENGINEERING CONSTITUTION
## Version 1.0

---

# PREAMBLE

This document establishes the permanent development standards for PulseEarn.
Every AI agent, developer, and contributor MUST follow these rules.
No exceptions.

---

# PART 11: MASTER IMPLEMENTATION ROADMAP

## Development Phases (In Order)

### Phase 0: DISCOVERY
Before modifying anything:
- Map all pages, components, routes
- Map services, contexts, hooks
- Map Firestore collections, APIs, callbacks
- Understand existing systems
- **Never modify systems that have not been inspected**

### Phase 1: STABILIZATION
Verify existing systems work:
- Authentication ✅
- Backend ✅
- Firestore ✅
- Storage ✅
- Callbacks ✅
- Transactions ✅
- Notifications ✅
- Uploads ✅
- Admin Permissions ✅
- Moderator Permissions ✅

**Fix production issues before adding features.**

### Phase 2: ECONOMY
Protect the sacred systems:
- PointTransactionEngine
- Wallet
- Ledger
- XP
- Levels (derived from XP)
- Referrals
- Withdrawals
- Fraud Detection

**Everything must be transactional.**

### Phase 3: MARKETPLACE FOUNDATION
Build the architecture:
- Marketplace.tsx (presentation)
- MarketplaceEngine (orchestration)
- OpportunityNormalizer (data transformation)
- RecommendationEngine (personalization)
- Category System
- Provider Adapter Layer

### Phase 4: PROVIDER INTEGRATION
Connect external providers:
- Tier A (API-capable)
- Tier B (Hosted)
- Adapters
- Callbacks
- Launch flows
- Return flows

### Phase 5: USER EXPERIENCE
Polish the frontend:
- Hero Section
- Premium carousels
- Sticky category navigation
- Framer Motion animations
- Visual hierarchy
- Micro-interactions
- Loading states
- Empty states

### Phase 6: ADMIN
Add operations modules:
- Marketplace Operations (overview)
- Provider Health
- Analytics
- Diagnostics

### Phase 7: MODERATOR
Enhance moderation:
- Approvals
- Reports
- Marketplace moderation
- Task verification

### Phase 8: PERFORMANCE
Optimize:
- Caching
- Image loading
- Firestore reads
- Lazy loading
- Bundle size
- Render performance

### Phase 9: POLISH
Final review:
- UX consistency
- Accessibility
- Responsiveness
- Error states
- Edge cases

### Phase 10: CERTIFICATION
Full production audit:
- User journeys
- Admin journeys
- Moderator journeys
- Provider flows
- All callbacks
- Rewards
- Withdrawals
- Security

**Only after successful audit is release considered production-ready.**

---

# PART 12: PERMANENT ENGINEERING RULES

## The 20 Immutable Laws

### Law 1: Understand Before Modifying
> Never change code you do not understand.

Always investigate the entire subsystem, not just the visible bug.

### Law 2: Search Before Fixing
> Investigate root cause, not symptoms.

Never patch symptoms. Solve the underlying problem.

### Law 3: Backend is the Source of Truth
> The frontend reflects. Never invent frontend logic.

If the frontend and backend disagree, the backend wins.

### Law 4: Single Source of Truth
> Never duplicate business logic.

One system owns each domain. Others consume.

### Law 5: PointTransactionEngine is Sacred
> Every point mutation MUST pass through PointTransactionEngine.

Always. No exceptions.

### Law 6: Never Write Directly to Balances
> Balances are projections of the ledger.

Never manually edit balances. The ledger is the truth.

### Law 7: XP is Authoritative, Levels are Derived
> Never manually edit levels.

XP changes → Level recalculates automatically.

### Law 8: Users See Opportunities, Never Providers
> Providers remain invisible infrastructure.

Users think "I'm earning through PulseEarn."
Never "I'm opening TimeWall."

### Law 9: Clear Ownership
> Marketplace owns discovery. Task Engine owns tasks. etc.

Keep ownership boundaries clear.

### Law 10: Admin Remains Modular
> Never merge operational modules.

Each module has one responsibility. Keep it that way.

### Law 11: Dead UI is Forbidden
> If something looks clickable, it MUST work.

Never ship dead UI. Disable visually instead.

### Law 12: No Fake Production Data
> Never show fake statistics.

No placeholder rewards. No mock provider metrics.

### Law 13: Production Logic is Protected
> Never remove production logic during redesign.

Presentation changes. Logic remains.

### Law 14: Existing Workflows are Sacred
> Never break existing workflows.

Everything must continue functioning after changes.

### Law 15: Audit Everything
> Every important action creates:
- Transaction
- Audit Log
- Notification
- Activity
- History

Nothing important happens silently.

### Law 16: Visual Improvements Don't Justify Regressions
> Production first.

Never sacrifice production stability for visual polish.

### Law 17: Performance is a Feature
> Fast software builds trust.

Optimize early. Don't ship slow.

### Law 18: Consistency Beats Novelty
> Use the same patterns everywhere.

Spacing, typography, motion, colors, components.

### Law 19: Think Long-Term
> Every decision should make adding the next feature easier.

Architecture decisions should enable scale, not create obstacles.

### Law 20: Marketplace is the Product
> Marketplace becomes PulseEarn itself.

Every future decision should begin with Marketplace.

---

# ARCHITECTURE PRINCIPLES

## File Classification

### KEEP (Protected Systems)
- Authentication
- PointTransactionEngine
- MarketplaceEngine
- OfferwallProviderEngine
- All System Engines
- Core Types
- Firestore Rules
- API Backend
- Admin Modules

### MERGE (Into Existing)
- Tasks → Marketplace
- Offerwalls → Marketplace

### REBUILD (Premium Required)
- Marketplace Hero
- Category Navigation
- Carousels
- Animations
- Visual Hierarchy

### DELETE (Only If Unused)
- Dead components
- Placeholder code
- Duplicate logic

---

# PROVIDER INTEGRATION RULES

## Provider Tiers

### Tier A: API-Capable
- Inventory displayed in PulseEarn
- Users browse inside PulseEarn
- Examples: AdGem, future API providers

### Tier B: Hosted
- Inventory in provider dashboards
- PulseEarn launches hosted experience
- Users never browse provider pages

## Provider Flow
```
Marketplace
    ↓
Opportunity
    ↓
Marketplace Engine
    ↓
Provider Adapter
    ↓
Provider
    ↓
Callback
    ↓
PointTransactionEngine
    ↓
Wallet
    ↓
Notification
    ↓
Marketplace Refresh
```

**Providers never become navigation.**

---

# DATA PROTECTION

## Sacred Collections (Never Delete)
- users
- transactions
- tasks
- campaigns
- task_claims
- referrals
- withdrawals
- offerwall_providers
- offerwall_callbacks

## Protected Rules
- All writes go through Admin SDK for critical operations
- Client-side rules restrict dangerous mutations
- Server-side validation is authoritative

---

# API DESIGN

## All Mutations Must
1. Validate authentication
2. Check authorization
3. Validate input
4. Execute atomically
5. Create audit log
6. Return meaningful errors

## Never Expose
- Provider secrets
- API keys
- Callback secrets
- Admin credentials

---

# UI/UX STANDARDS

## Quality Target
Match the quality of:
- Apple App Store
- Steam
- Netflix
- Spotify
- Linear

## Never Build
- Crypto dashboards
- Generic Tailwind templates
- Offerwall clones
- Dashboard-heavy interfaces

## Design Principles
1. Premium over cluttered
2. Discovery over lists
3. Smooth over static
4. Minimal over maximal
5. Modern over legacy

---

# RELEASE CHECKLIST

Before every production release, verify:

### Authentication ✅
- Login/Logout works
- Token refresh works
- Role-based access works

### Transactions ✅
- Points credit successfully
- Points debit successfully
- Chargebacks work
- Refunds work

### Marketplace ✅
- Opportunities load
- Search works
- Filters work
- Categories display correctly

### Providers ✅
- Callbacks process
- Rewards credit
- Health status accurate

### Admin ✅
- All modules accessible
- Data displays correctly
- Actions work

### Mobile ✅
- Touch targets large enough
- Layout responsive
- Performance acceptable

### Security ✅
- No XSS vulnerabilities
- No injection attacks
- Proper CORS
- Secrets not exposed

---

# AI WORKFLOW STANDARD

Every task follows this workflow:

1. **Discover** - Understand the codebase
2. **Map** - Identify files and relationships
3. **Classify** - KEEP, MERGE, REBUILD, DELETE
4. **Plan** - Design the solution
5. **Implement** - Write code
6. **Verify** - Test the solution
7. **Review** - Check for violations
8. **Deploy** - Release safely
9. **Monitor** - Watch for issues

Never skip steps.

---

# FINAL PRINCIPLE

**PulseEarn is not a task application.**
**It is a premium rewards economy platform.**

Marketplace is the face.
Economy is the heart.
Transaction Engine is the brain.
Providers are invisible infrastructure.

This architecture allows PulseEarn to scale from:
2 providers → 20+ providers
100 users → 1,000,000 users
1 campaign → unlimited campaigns

Without redesigning the product.

---

*This document is the permanent architectural constitution of PulseEarn.*
*Every future decision must reinforce this vision.*
*Last updated: 2024*
