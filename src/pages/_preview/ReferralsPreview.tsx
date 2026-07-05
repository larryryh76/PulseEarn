import { Users, CheckCircle2, Clock, Zap, Target, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import InvitePanel from '../../components/Referrals/InvitePanel'
import ReferralList from '../../components/Referrals/ReferralList'
import { nextMilestone } from '../../components/Referrals/helpers'
import { cn } from '@/lib/utils'
import type { ReferralRecord, ReferralStatus } from '../../types'

/* TEMPORARY visual harness for the rebuilt Referrals surface. Renders the presentational
   components with static data (the real page's useReferrals hook needs live Firestore). Removed after review. */

const mkRef = (username: string, status: ReferralStatus, daysAgo: number): ReferralRecord =>
  ({
    id: Math.random().toString(36).slice(2),
    referrerId: 'me',
    refereeId: Math.random().toString(36).slice(2),
    refereeUsername: username,
    status,
    createdAt: { toDate: () => new Date(Date.now() - daysAgo * 86400000), toMillis: () => Date.now() - daysAgo * 86400000 },
    updatedAt: { toDate: () => new Date(), toMillis: () => Date.now() },
    fraudFlags: [],
  }) as unknown as ReferralRecord

const referrals: ReferralRecord[] = [
  mkRef('crypto_maya', 'REWARDED', 2),
  mkRef('devon.eth', 'REWARDED', 5),
  mkRef('sarah_k', 'REGISTERED', 1),
  mkRef('mike_t', 'VERIFIED', 3),
  mkRef('spammer99', 'FLAGGED', 4),
]

const reward = 50
const summary = { total: 5, rewarded: 2, pending: 2, flagged: 1, pointsEarned: 100 }
const milestone = nextMilestone(summary.total)

function SummaryStat({ icon: Icon, label, value, tone = 'muted' }: any) {
  const toneText: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    muted: 'text-muted-foreground',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Icon className={cn('size-4', toneText[tone])} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReferralsPreview() {
  return (
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 md:px-8 md:pt-28">
        <div className="space-y-8">
          <header className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Referrals</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">Growth program preview.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryStat icon={Users} label="Total referrals" value="5" tone="primary" />
              <SummaryStat icon={CheckCircle2} label="Qualified" value="2" tone="success" />
              <SummaryStat icon={Clock} label="Pending" value="2" tone="warning" />
              <SummaryStat icon={Zap} label="PTS earned" value="100" tone="success" />
            </div>
          </header>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <InvitePanel referralCode="PULSE-8X2K" unlocked rewardAmount={reward} />
              <ReferralList referrals={referrals} loading={false} rewardAmount={reward} />
            </div>
            <div className="space-y-6">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Next milestone</h2>
                  </div>
                  <Progress value={milestone.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>5 / {milestone.target} referrals</span>
                    <span className="font-medium text-primary">{milestone.progress}%</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">How rewards qualify</h2>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted-foreground">Reward per referral</span>
                    <span className="text-sm font-semibold text-foreground">50 PTS</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
  )
}
