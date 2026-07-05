import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import {
  onSnapshot,
  type Query,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore'

/**
 * Bridges a Firestore realtime listener into the React Query cache.
 *
 * This is the single source of truth for live collections/documents: ONE listener per query key
 * writes snapshots into the cache, and every component that reads the same key gets the same data
 * with automatic re-render on change. Because the listener owns freshness, the query itself never
 * refetches (staleTime: Infinity in queryClient).
 *
 * @param key       stable React Query key (use `queryKeys` from lib/queryClient)
 * @param ref       a Firestore Query or DocumentReference, or null to disable (e.g. logged out)
 * @param transform maps a raw snapshot into the shape components consume
 */
export function useFirestoreQuery<T>(
  key: QueryKey,
  ref: Query<DocumentData> | DocumentReference<DocumentData> | null,
  transform: (snap: any) => T
) {
  const queryClient = useQueryClient()
  const transformRef = useRef(transform)
  transformRef.current = transform

  // Serialize the key so the effect only re-subscribes when the logical key changes.
  const keyString = JSON.stringify(key)
  const enabled = ref !== null

  useEffect(() => {
    if (!ref) return
    const unsubscribe = onSnapshot(
      ref as any,
      (snap: any) => {
        queryClient.setQueryData(key, transformRef.current(snap))
      },
      (error) => {
        console.error('[v0] Firestore listener error for', keyString, error)
      }
    )
    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyString, enabled])

  return useQuery<T>({
    queryKey: key,
    // The listener populates the cache; this only runs if no cached data exists yet.
    queryFn: () => new Promise<T>(() => {}),
    enabled,
  })
}
