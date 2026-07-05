import { Users, UserPlus, Clock, CheckCircle2, Zap, Target, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useReferrals } from '../hooks/useReferrals'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StateError } from '../components/system/states'
import InvitePanel from '../components/Referrals/InvitePanel'
import ReferralList from '../components/Referrals/ReferralList'
import { nextMilestone } from '../components/Referrals/helpers'
import { cn } from '@/lib/utils'

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 md:px-8 md:pt-28">{children}</div>
)

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone = 'muted',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone?: 'primary' | 'success' | 'warning' | 'muted'
}) {
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

const VERIFICATION_RULES = [
  'Invitee must verify their email address.',
  'Invitee must complete at least one task.',
  'Rewards are paid instantly upon qualification.',
]

export default function Referrals() {
  const { userData } = useAuth()
  const { referrals, loading, error, rewardAmount, summary } = useReferrals()

  const unlocked = (userData?.stats?.tasksCompleted || 0) > 0
  const milestone = nextMilestone(summary.total)

  return (
    <Shell>
      <div className="space-y-8">
        <header className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <UserPlus className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Growth Program</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Referrals</h1>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Invite friends to PulseEarn and earn points for every qualified sign-up. Track your network
              and reward status in real time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryStat icon={Users} label="Total referrals" value={summary.total.toLocaleString()} tone="primary" />
            <SummaryStat icon={CheckCircle2} label="Qualified" value={summary.rewarded.toLocaleString()} tone="success" />
            <SummaryStat icon={Clock} label="Pending" value={summary.pending.toLocaleString()} tone="warning" />
            <SummaryStat icon={Zap} label="PTS earned" value={summary.pointsEarned.toLocaleString()} tone="success" />
          </div>
        </header>

        {error ? <StateError title="Couldn't load referrals" description={error} onRetry={() => window.location.reload()} /> : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: invite + history */}
          <div className="space-y-6 lg:col-span-2">
            <InvitePanel referralCode={userData?.referralCode} unlocked={unlocked} rewardAmount={rewardAmount} />
            <ReferralList referrals={referrals} loading={loading} rewardAmount={rewardAmount} />
          </div>

          {/* Right: progress + rules */}
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Next milestone</h2>
                </div>
                <div className="space-y-2">
                  <Progress value={milestone.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {summary.total.toLocaleString()} / {milestone.target.toLocaleString()} referrals
                    </span>
                    <span className="font-medium text-primary">{milestone.progress}%</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Keep inviting to reach {milestone.target.toLocaleString()} referrals and grow your standing
                  in the community.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">How rewards qualify</h2>
                </div>
                <ul className="space-y-3">
                  {VERIFICATION_RULES.map((rule) => (
                    <li key={rule} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <span className="text-sm leading-relaxed text-muted-foreground">{rule}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Reward per referral</span>
                  <span className="text-sm font-semibold text-foreground">{rewardAmount.toLocaleString()} PTS</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  )
}
