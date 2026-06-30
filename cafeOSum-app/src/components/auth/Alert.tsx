type AlertVariant = 'error' | 'warning' | 'success' | 'info'

const styles: Record<AlertVariant, { bg: string; border: string; color: string; icon: string }> = {
  error:   { bg: '#FEE2E2', border: '#FCA5A5', color: '#DC2626', icon: '⚠' },
  warning: { bg: '#FEF3C7', border: '#FDE68A', color: '#D97706', icon: '📧' },
  success: { bg: '#E8F5EE', border: '#86EFAC', color: '#2E8B57', icon: '✓' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', icon: '⏱' },
}

interface AlertProps {
  variant: AlertVariant
  children: React.ReactNode
  icon?: string
}

export function Alert({ variant, children, icon }: AlertProps) {
  const s = styles[variant]
  return (
    <div
      className="flex items-start gap-2.5 p-3 rounded-lg text-[13px] mb-5 border"
      style={{ background: s.bg, borderColor: s.border, color: s.color }}
    >
      <span className="text-[15px] flex-shrink-0 mt-px">{icon ?? s.icon}</span>
      <div>{children}</div>
    </div>
  )
}
