import { QueryClient } from '@tanstack/react-query'

/**
 * Single QueryClient for the whole app — the client-side source of truth.
 *
 * Most PulseEarn data is backed by Firestore realtime listeners (see `useFirestoreQuery`),
 * which push fresh snapshots straight into this cache. For that data `staleTime: Infinity` is
 * correct: the listener — not refetching — keeps it fresh, so we disable window-focus/mount
 * refetches to avoid redundant reads. One-shot fetches (REST calls) can override staleTime
 * per-query.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 10, // keep unused cache for 10 min
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

/**
 * Centralized query keys so every surface reads/invalidates the SAME cache entry.
 * No page should hand-roll ad-hoc keys — add them here.
 */
export const queryKeys = {
  user: (uid: string) => ['user', uid] as const,
  transactions: (uid: string) => ['transactions', uid] as const,
  notifications: (uid: string) => ['notifications', uid] as const,
  activities: (uid: string) => ['activities', uid] as const,
  tasks: () => ['tasks'] as const,
  userTasks: (uid: string) => ['userTasks', uid] as const,
  predictions: () => ['predictions'] as const,
  myPredictions: (uid: string) => ['myPredictions', uid] as const,
  referrals: (uid: string) => ['referrals', uid] as const,
  crypto: () => ['crypto'] as const,
} as const
