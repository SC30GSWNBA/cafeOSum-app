import { useToastStore } from '../store/toastStore'
import type { ToastType } from '../store/toastStore'
import { T } from '../lib/tokens'

const ICON: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: T.greenBg,  border: T.greenBorder,  icon: T.green, text: '#1A5C37' },
  error:   { bg: T.redBg,    border: T.redBorder,    icon: T.red,   text: '#991B1B' },
  info:    { bg: T.blueBg,   border: T.blueBorder,   icon: T.blue,  text: '#1E40AF' },
  warning: { bg: T.amberBg,  border: T.amberBorder,  icon: T.amber, text: '#92400E' },
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const c = COLORS[t.type]
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px',
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, boxShadow: T.shadowMd,
              fontSize: 13, color: c.text, fontWeight: 500,
              maxWidth: 340, pointerEvents: 'all', cursor: 'pointer',
              animation: 'toastIn 0.22s cubic-bezier(0.34,1.3,0.64,1)',
              userSelect: 'none',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: c.icon, color: T.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {ICON[t.type]}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
