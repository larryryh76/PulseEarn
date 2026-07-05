import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, ArrowUpRight, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import AnimatedNumber from '../ui/AnimatedNumber'
import { formatUSD } from '../../utils/finance'
import { getXpProgress, getLevelTier } from '../../utils/progression'
import type { UserData } from '../../types'

/** Wallet snapshot — primary balance + USD estimate + weekly earnings. */
export function WalletSnapshotCard({ userData }: { userData: UserData }) {
  const points = userData.points || 0
  const weekly = userData.stats?.weeklyEarnings || 0

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-primary/[0.03]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative flex h-full flex-col justify-between gap-6 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Pulse Balance</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                <AnimatedNumber value={points} />
              </span>
              <span className="text-sm font-medium text-primary">PTS</span>
            </div>
            <p className="text-xs text-muted-foreground">≈ {formatUSD(points / 1000)} USD</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpRight className="size-3.5 text-success" />
            <span className="font-medium text-success">+{weekly.toLocaleString()}</span>
            <span className="text-muted-foreground">this week</span>
          </div>
          <Link
            to="/wallet"
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Withdraw
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

/** Progression — level, tier, XP progress toward next level. */
export function ProgressionCard({ userData }: { userData: UserData }) {
  const xp = userData.xp || 0
  const level = userData.level || 1
  const { progress, nextLevelXp } = getXpProgress(xp)
  const tier = getLevelTier(level)

  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Progression</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold tracking-tight text-foreground">Level {level}</span>
              <Badge variant="secondary" className={cn('font-medium', tier.color)}>
                {tier.title}
              </Badge>
            </div>
          </div>
          <div className={cn('flex size-10 items-center justify-center rounded-xl border border-border bg-muted', tier.color)}>
            <TrendingUp className="size-5" />
          </div>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Compact stat chip used in the secondary metric strip. */
export function StatChip({
  icon: Icon,
  label,
  value,
  tone = 'muted',
}: {
  icon: ComponentType<LucideProps>
  label: string
  value: string | number
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
