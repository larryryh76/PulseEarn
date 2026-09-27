/**
 * Public campaign status for PSEmine's pre-sign-in surfaces.
 *
 * The public landing page and the authentication family render outside the
 * authenticated providers by design (they must work with no session at all), so
 * they cannot read the campaign from PSEMineProvider. The canonical anonymous
 * contract for campaign terms is `GET /api/mine/campaign/status`, which the
 * backend projects server-side.
 *
 * This hook exists so those surfaces show the campaign THAT THE SERVER REPORTS —
 * its real status, its real duration and its real purchase/mining/referral flags.
 * When the call fails the surface is told so and says so; it never substitutes a
 * plausible-looking status, and it never reads a campaign document directly.
 *
 * Read-only. Carries no token, creates no server-side state, and is safe to call
 * before any identity exists.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPublicCampaign, type PsePublicCampaign } from '../../engines/psemine/pseMineApi';
import { logPseDiagnostic, toPseErrorInfo, type PseErrorInfo } from '../../engines/psemine/pseErrors';

export interface PublicCampaignState {
  /** The server's campaign projection, or null when it could not be read. */
  campaign: PsePublicCampaign | null;
  /** True only while the first read is in flight. */
  loading: boolean;
  /** True while an explicit retry is in flight. */
  refreshing: boolean;
  /** Why the campaign could not be read. Null on success. */
  error: PseErrorInfo | null;
  /** Re-runs the real read. */
  refresh: () => Promise<void>;
}

export function usePublicCampaign(): PublicCampaignState {
  const [campaign, setCampaign] = useState<PsePublicCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<PseErrorInfo | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (isRetry: boolean) => {
    if (isRetry) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await fetchPublicCampaign();
      if (!mounted.current) return;
      setCampaign(next);
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      const info = toPseErrorInfo(e, 'GET /api/mine/campaign/status');
      logPseDiagnostic('public campaign status', info);
      // A failed read keeps the last known campaign out of the UI: showing a
      // stale status as if it were current is exactly the kind of quiet lie this
      // hook exists to avoid.
      setCampaign(null);
      setError(info);
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void run(false);
  }, [run]);

  const refresh = useCallback(() => run(true), [run]);

  return { campaign, loading, refreshing, error, refresh };
}

export default usePublicCampaign;
