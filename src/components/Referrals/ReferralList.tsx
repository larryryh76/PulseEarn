import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StateEmpty, StateLoading } from '../system/states'
import { referralStatusMeta, toneChip, REFERRAL_FILTERS, formatJoinDate } from './helpers'
import type { ReferralRecord } from '../../types'

type FilterValue = (typeof REFERRAL_FILTERS)[number]['value']

function ReferralRow({ referral, rewardAmount }: { referral: ReferralRecord; rewardAmount: number }) {
  const meta = referralStatusMeta(referral.status)
  const name = referral.refereeUsername || 'New user'
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9 border border-border">
          <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">Joined {formatJoinDate(referral.createdAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {meta.group === 'rewarded' ? (
          <span className="text-sm font-semibold text-success">+{rewardAmount.toLocaleString()} PTS</span>
        ) : null}
        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', toneChip[meta.tone])}>
          {meta.label}
        </span>
      </div>
    </div>
  )
}

export default function ReferralList({
  referrals,
  loading,
  rewardAmount,
}: {
  referrals: ReferralRecord[]
  loading: boolean
  rewardAmount: number
}) {
  const [filter, setFilter] = useState<FilterValue>('ALL')

  const filtered = useMemo(() => {
    if (filter === 'ALL') return referrals
    return referrals.filter((r) => referralStatusMeta(r.status).group === filter)
  }, [referrals, filter])

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Referral history</h2>
            <p className="text-sm text-muted-foreground">Track every friend you&apos;ve invited and their reward status.</p>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="w-max">
                {REFERRAL_FILTERS.map((f) => (
                  <TabsTrigger key={f.value} value={f.value}>
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Tabs>
        </div>

        {loading ? (
          <StateLoading rows={4} rowClassName="h-16" />
        ) : filtered.length === 0 ? (
          <StateEmpty
            icon={Users}
            title={filter === 'ALL' ? 'No referrals yet' : 'Nothing here yet'}
            description={
              filter === 'ALL'
                ? 'Share your invite code to start growing your network and earning rewards.'
                : 'No referrals match this filter right now.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((referral) => (
              <ReferralRow key={referral.id} referral={referral} rewardAmount={rewardAmount} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
