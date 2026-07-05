import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Share2, Gift, ShieldAlert, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    onCopy()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-sm" aria-label={label} />
        <Button type="button" variant="outline" size="icon" onClick={handle} aria-label={`Copy ${label}`}>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

/** Locked state shown until the user completes their first task. */
function LockedPanel() {
  const navigate = useNavigate()
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
          <Lock className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Unlock your referral network</h2>
          <p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            Complete at least one task to activate your invite code. This keeps the program fair and
            fraud-free for everyone.
          </p>
        </div>
        <Button onClick={() => navigate('/tasks')}>
          Complete your first task
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  )
}

export default function InvitePanel({
  referralCode,
  unlocked,
  rewardAmount,
}: {
  referralCode?: string
  unlocked: boolean
  rewardAmount: number
}) {
  if (!unlocked) return <LockedPanel />

  const code = referralCode || '—'
  const link = `${window.location.origin}/signup?ref=${referralCode || ''}`

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    toast.success('Referral code copied')
  }
  const copyLink = () => {
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied')
  }
  const share = async () => {
    const shareData = {
      title: 'Join me on PulseEarn',
      text: `Use my code ${code} to join PulseEarn and start earning rewards.`,
      url: link,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      copyLink()
    }
  }

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-primary/[0.03]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Gift className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Invite &amp; earn</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Earn {rewardAmount.toLocaleString()} PTS per qualified friend
            </h2>
            <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Share your code or link. You&apos;re rewarded once each friend verifies their email and
              completes their first task.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CopyField label="Your invite code" value={code} onCopy={copyCode} />
          <CopyField label="Referral link" value={link} onCopy={copyLink} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={share} className="flex-1 sm:flex-none">
            <Share2 data-icon="inline-start" />
            Share invite
          </Button>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Creating multiple accounts through your own referral link is strictly prohibited and results
            in immediate suspension. Rewards apply only to genuine, verified users.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
