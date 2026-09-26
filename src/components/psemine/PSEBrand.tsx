const MARK_BLUE = '#2F6BFF';
const MARK_CYAN = '#22D3EE';
const MARK_BONE = '#EDEEEC';
const MARK_STEEL = 'rgba(255,255,255,0.42)';
const MARK_CUT = '#0F0F12';

export function PSELogo({ size = 32, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  return (
    <span>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="PSEmine emblem">
        <path d="M8 8L20 4V34L8 42V8Z" fill={MARK_BLUE} />
        <path d="M22 4L38 12L42 16L22 24V4Z" fill={MARK_BONE} />
        <path d="M22 24L42 16L36 30L22 34V24Z" fill={MARK_STEEL} />
        <path d="M22 10L32 15L22 20V10Z" fill={MARK_CUT} />
        <path d="M22 37L32 32L36 35L22 44V37Z" fill={MARK_CYAN} />
      </svg>
      {withWordmark && (
        <span>
          {' '}PSEmine<br />90-day campaign
        </span>
      )}
    </span>
  );
}
