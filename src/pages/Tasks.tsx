import { useMemo, useState } from 'react'
import { Search, Target, Zap, CheckCircle2, ListChecks } from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { StateEmpty, StateLoading } from '../components/system/states'
import TaskCard, { type TaskWithStatus } from '../components/Tasks/TaskCard'
import TaskDialog from '../components/Tasks/TaskDialog'
import { CATEGORY_FILTERS } from '../components/Tasks/helpers'
import type { Task, TaskCategory } from '../types'

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 md:px-8 md:pt-28">{children}</div>
)

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { tasks, loading, getTaskStatus } = useTasks()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'ALL' | TaskCategory>('ALL')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const entries = useMemo<TaskWithStatus[]>(() => {
    return (tasks || []).map((task) => {
      const s = getTaskStatus(task)
      return { task, status: s.status, nextAvailable: s.nextAvailable }
    })
  }, [tasks, getTaskStatus])

  const summary = useMemo(() => {
    const available = entries.filter((e) => e.status === 'available' || e.status === 'rejected')
    const completed = entries.filter((e) => e.status === 'completed' || e.status === 'pending')
    const potential = available.reduce((sum, e) => sum + (e.task.rewardAmount || 0), 0)
    return { availableCount: available.length, completedCount: completed.length, potential }
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter((e) => (category === 'ALL' ? true : e.task.category === category))
      .filter((e) => (q ? e.task.title.toLowerCase().includes(q) || (e.task.subtitle || '').toLowerCase().includes(q) : true))
      .sort((a, b) => {
        // Actionable tasks first, then by reward desc.
        const rank = (s: TaskWithStatus['status']) => (s === 'available' || s === 'rejected' ? 0 : 1)
        if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status)
        return (b.task.rewardAmount || 0) - (a.task.rewardAmount || 0)
      })
  }, [entries, category, search])

  const openTask = (task: Task) => {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  return (
    <Shell>
      <div className="space-y-8">
        <header className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Target className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Earning Marketplace</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Tasks</h1>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Complete objectives from partners and the community to earn Pulse points and experience. New tasks are added regularly.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryStat icon={ListChecks} label="Tasks available" value={summary.availableCount.toLocaleString()} />
            <SummaryStat icon={Zap} label="Potential rewards" value={`${summary.potential.toLocaleString()} PTS`} />
            <SummaryStat icon={CheckCircle2} label="Completed or in review" value={summary.completedCount.toLocaleString()} />
          </div>
        </header>

        {/* Controls */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-9"
              aria-label="Search tasks"
            />
          </div>

          <Tabs value={category} onValueChange={(v) => setCategory(v as 'ALL' | TaskCategory)}>
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="w-max">
                {CATEGORY_FILTERS.map((f) => (
                  <TabsTrigger key={f.value} value={f.value}>
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Tabs>
        </div>

        {/* Grid */}
        {loading ? (
          <StateLoading rows={6} rowClassName="h-44 rounded-xl" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" />
        ) : filtered.length === 0 ? (
          <StateEmpty
            icon={Target}
            title={search || category !== 'ALL' ? 'No matching tasks' : 'No tasks available'}
            description={
              search || category !== 'ALL'
                ? 'Try a different search term or category filter.'
                : "You're all caught up. Check back soon for new earning opportunities."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <TaskCard key={entry.task.id} entry={entry} onSelect={openTask} />
            ))}
          </div>
        )}
      </div>

      <TaskDialog task={selectedTask} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Shell>
  )
}
