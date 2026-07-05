import { Link } from 'react-router-dom'
import { LayoutGrid, BarChart3, CreditCard, UserPlus, ShieldCheck, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UserData } from '../../types'

const QUICK_ACTIONS: { name: string; path: string; icon: ComponentType<LucideProps> }[] = [
  { name: 'Tasks', path: '/tasks', icon: LayoutGrid },
  { name: 'Predict', path: '/predictions', icon: BarChart3 },
  { name: 'Withdraw', path: '/wallet', icon: CreditCard },
  { name: 'Invite', path: '/referrals', icon: UserPlus },
]

const STATUS_LABEL: Record<NonNullable<UserData['status']>, string> = {
  active: 'Account Active',
  restricted: 'Restricted',
  frozen: 'Frozen',
}

export default function DashboardHeader({ userData }: { userData: UserData }) {
  const status = userData.status ?? 'active'
  const initial = userData.username?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <header className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="size-14 border border-border">
          {userData.avatarUrl ? <AvatarImage src={userData.avatarUrl} alt={userData.username} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{initial}</AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {userData.username}
          </h1>
          <Badge
            variant={status === 'active' ? 'secondary' : 'destructive'}
            className="gap-1.5 font-medium"
          >
            <ShieldCheck className="size-3" />
            {STATUS_LABEL[status]}
          </Badge>
        </div>
      </div>

      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.name} asChild variant="outline" size="sm" className="gap-2">
            <Link to={action.path}>
              <action.icon className="size-4" />
              {action.name}
            </Link>
          </Button>
        ))}
      </nav>
    </header>
  )
}
