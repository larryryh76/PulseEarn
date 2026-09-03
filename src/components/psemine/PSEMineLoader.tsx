import React, { useEffect, useState } from 'react'
import { PSEMineWordmark } from './PSEMineWordmark'
import { Loader2, RefreshCw } from 'lucide-react'

interface PSEMineLoaderProps {
  message?: string
  onRetry?: () => void
  timeoutSeconds?: number
}

export const PSEMineLoader: React.FC<PSEMineLoaderProps> = ({
  message = 'Loading PSEmine Campaign Workspace...',
  onRetry,
  timeoutSeconds = 15,
}) => {
  const [showTimeoutNotice, setShowTimeoutNotice] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeoutNotice(true)
    }, timeoutSeconds * 1000)
    return () => clearTimeout(timer)
  }, [timeoutSeconds])

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--pm-bg, #090B0E)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'var(--pm-font, inherit)',
      }}
    >
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
        <PSEMineWordmark />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 24px',
          borderRadius: '12px',
          background: 'var(--pm-surface, #12161F)',
          border: '1px solid var(--pm-line, rgba(255, 255, 255, 0.08))',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          marginBottom: showTimeoutNotice ? '16px' : '0',
        }}
      >
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--pm-cyan, #8BE5EF)' }} />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--pm-text, #E2E8F0)',
          }}
        >
          {message}
        </span>
      </div>

      {showTimeoutNotice && (
        <div
          style={{
            marginTop: '16px',
            maxWidth: '380px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#FCA5A5',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: '0 0 12px' }}>
            Loading is taking longer than expected. Please check your network connection.
          </p>
          <button
            onClick={() => {
              setShowTimeoutNotice(false)
              if (onRetry) {
                onRetry()
              } else {
                window.location.reload()
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'var(--pm-cyan, #8BE5EF)',
              color: '#090B0E',
              fontWeight: 800,
              border: 0,
              cursor: 'pointer',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <RefreshCw size={14} /> Retry Loading
          </button>
        </div>
      )}
    </div>
  )
}

export default PSEMineLoader
