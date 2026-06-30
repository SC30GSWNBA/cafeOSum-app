import { useEffect } from 'react'
import { T } from '../../lib/tokens'

interface ModalProps {
  onClose: () => void
  width?: number
  children: React.ReactNode
}

export function Modal({ onClose, width = 460, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(59,31,14,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: T.white, borderRadius: 16,
          width, maxWidth: '95vw',
          boxShadow: T.shadowLg, overflow: 'hidden',
          animation: 'modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({
  icon, iconBg, title, sub, onClose,
}: {
  icon: string
  iconBg: string
  title: string
  sub?: string
  onClose: () => void
}) {
  return (
    <div style={{
      padding: '18px 20px 16px', borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.brown900 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: T.gray400, marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={onClose}
        style={{
          width: 30, height: 30, borderRadius: 8,
          border: `1px solid ${T.borderMid}`, background: T.white,
          cursor: 'pointer', fontSize: 14, color: T.gray400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >✕</button>
    </div>
  )
}

export function ModalBody({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: 20, ...style }}>
      {children}
    </div>
  )
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 20px', borderTop: `1px solid ${T.border}`,
      display: 'flex', gap: 10, justifyContent: 'flex-end',
    }}>
      {children}
    </div>
  )
}
