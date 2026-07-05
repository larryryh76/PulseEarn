import React, { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CheckSquare, Users, BarChart3, Clock } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../hooks/useTasks'
import { db } from '../firebase/config'
import OnboardingOverlay from '../components/OnboardingOverlay'
import DashboardHeader from '../components/Dashboard/DashboardHeader'
import { WalletSnapshotCard, ProgressionCard, StatChip } from '../components/Dashboard/MetricCards'
import DailyRewardCard from '../components/Dashboard/DailyRewardCard'
import ContinueEarning from '../components/Dashboard/ContinueEarning'
import ActivePredictions from '../components/Dashboard/ActivePredictions'
import ActivityFeed from '../components/Dashboard/ActivityFeed'
import NotificationsPanel from '../components/Dashboard/NotificationsPanel'
import { StateError, StateLoading } from '../components/system/states'
import { Skeleton } from '@/components/ui/skeleton'

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 md:px-8 md:pt-28">{children}</div>
)

const Dashboard: React.FC = () => {
  const { userData, currentUser, systemError } = useAuth()
  const { subtasks, loading } = useTasks()
  const [showOnboarding, setShowOnboarding] = useState(false)

  const pendingReviews = useMemo(
    () => subtasks.filter((s) => s.validationState === 'PENDING').length,
    [subtasks],
  )

  React.useEffect(() => {
    if (userData && userData.onboardingCompleted === false) setShowOnboarding(true)
  }, [userData])

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { onboardingCompleted: true })
      } catch (err) {
        console.error('Failed to save onboarding state:', err)
      }
    }
  }

  if (systemError) return null // MaintenanceOverlay handled in AuthContext

  if (loading) {
    return (
      <Shell>
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
          <StateLoading rows={4} rowClassName="h-20" />
        </div>
      </Shell>
    )
  }

  if (!userData) {
    return (
      <Shell>
        <StateError
          title="We couldn't sync your profile"
          description="We could not establish an authoritative connection with your account. Please try again."
          onRetry={() => window.location.reload()}
        />
      </Shell>
    )
  }

  const stats = userData.stats

  return (
    <>
      <AnimatePresence>
        {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      <Shell>
        <div className="space-y-8">
          <DashboardHeader userData={userData} />

          {/* Hero metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <WalletSnapshotCard userData={userData} />
            <ProgressionCard userData={userData} />
            <DailyRewardCard />
          </div>

          {/* Secondary stat strip */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatChip icon={CheckSquare} label="Tasks completed" value={stats?.tasksCompleted ?? 0} tone="primary" />
            <StatChip icon={Users} label="Referrals" value={stats?.referralsCount ?? 0} tone="success" />
            <StatChip icon={BarChart3} label="Predictions" value={stats?.predictionsCount ?? 0} tone="primary" />
            <StatChip icon={Clock} label="Pending reviews" value={pendingReviews} tone="warning" />
          </div>

          {/* Main grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <ContinueEarning />
              <ActivePredictions />
            </div>
            <div className="space-y-6">
              <NotificationsPanel />
              <ActivityFeed />
            </div>
          </div>
        </div>
      </Shell>
    </>
  )
}

export default Dashboard
