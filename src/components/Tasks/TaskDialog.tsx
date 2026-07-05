import { useState } from 'react'
import toast from 'react-hot-toast'
import { Zap, Sparkles, ExternalLink, Send, Loader2, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { auth } from '../../firebase/config'
import { safeFetch } from '../../utils/api'
import type { Task } from '../../types'
import { categoryMeta, verificationMeta, toneChip, submitErrorMessage } from './helpers'

export default function TaskDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [proof, setProof] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requiresProof = task ? task.verificationType !== 'automated' : false

  const handleClose = (next: boolean) => {
    if (isSubmitting) return
    if (!next) setProof('')
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    if (!task) return
    if (requiresProof && !proof.trim()) {
      toast.error('Please provide proof of completion.')
      return
    }
    setIsSubmitting(true)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const data = await safeFetch('/api/tasks/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, proof: proof || 'AUTOMATED_VALIDATION' }),
      })
      if (data.success) {
        toast.success(data.automated ? 'Task completed!' : 'Submitted for review')
        setProof('')
        onOpenChange(false)
      } else {
        toast.error(submitErrorMessage(data.error, data.message))
      }
    } catch {
      toast.error('System error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!task) return null

  const cat = categoryMeta(task.category)
  const CatIcon = cat.icon
  const verify = verificationMeta(task.verificationType)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('flex size-11 items-center justify-center rounded-xl border', toneChip[cat.tone])}>
              <CatIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {cat.label} · {verify.label}
              </Badge>
              <DialogTitle className="text-balance text-lg leading-tight">{task.title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-pretty pt-1 leading-relaxed">
            {task.description || 'Follow the instructions below to complete this objective and claim your reward.'}
          </DialogDescription>
        </DialogHeader>

        {/* Reward summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Reward</p>
            <p className="mt-1 flex items-baseline gap-1 text-xl font-semibold text-success">
              <Zap className="size-4" />+{task.rewardAmount.toLocaleString()}
              <span className="text-[10px] font-medium uppercase text-muted-foreground">PTS</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Experience</p>
            <p className="mt-1 flex items-baseline gap-1 text-xl font-semibold text-primary">
              <Sparkles className="size-4" />+{task.xpReward.toLocaleString()}
              <span className="text-[10px] font-medium uppercase text-muted-foreground">XP</span>
            </p>
          </div>
        </div>

        {/* Instructions */}
        {task.instructions ? (
          <div className="rounded-xl border border-border p-4">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Instructions</p>
            <p className="text-sm leading-relaxed text-foreground">{task.instructions}</p>
          </div>
        ) : null}

        {/* Action link */}
        {task.actionUrl ? (
          <Button asChild variant="outline" className="w-full">
            <a href={task.actionUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Open task link
            </a>
          </Button>
        ) : null}

        {/* Proof input for manual verification */}
        {requiresProof ? (
          <div className="space-y-2">
            <Label htmlFor="task-proof" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5" />
              Proof of completion
            </Label>
            <textarea
              id="task-proof"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder={task.proofRequirements || 'Enter a URL, username, or details as proof…'}
              className="h-28 w-full resize-none rounded-xl border border-border bg-transparent p-3 text-sm outline-none transition-colors focus:border-primary/50"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="size-4" />
                {task.verificationType === 'automated' ? 'Claim reward' : 'Submit for review'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
