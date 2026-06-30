import { T } from '../../lib/tokens'

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

interface BtnProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: BtnVariant
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
  size?: 'sm' | 'md'
}

const VARIANT_STYLES: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: T.brown900, color: T.white,  border: 'none' },
  secondary: { background: T.white,    color: T.brown600, border: `1px solid ${T.borderMid}` },
  danger:    { background: T.red,      color: T.white,  border: 'none' },
  success:   { background: T.green,    color: T.white,  border: 'none' },
  ghost:     { background: 'transparent', color: T.brown700, border: 'none' },
}

const HOVER_BG: Record<BtnVariant, string> = {
  primary:   T.brown700,
  secondary: T.gray50,
  danger:    '#B91C1C',
  success:   '#256F47',
  ghost:     T.gray50,
}

export function Btn({ children, onClick, variant = 'primary', disabled, type = 'button', fullWidth, size = 'md' }: BtnProps) {
  const varStyle = VARIANT_STYLES[variant]
  const pad = size === 'sm' ? '6px 14px' : '9px 20px'
  const fontSize = size === 'sm' ? 12 : 13

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...varStyle,
        padding: pad, borderRadius: 8,
        fontSize, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'background 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = HOVER_BG[variant]
      }}
      onMouseLeave={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = varStyle.background as string
      }}
    >
      {children}
    </button>
  )
}

export function BtnPrimary(props: Omit<BtnProps, 'variant'>) {
  return <Btn {...props} variant="primary" />
}
export function BtnSecondary(props: Omit<BtnProps, 'variant'>) {
  return <Btn {...props} variant="secondary" />
}
export function BtnDanger(props: Omit<BtnProps, 'variant'>) {
  return <Btn {...props} variant="danger" />
}
export function BtnSuccess(props: Omit<BtnProps, 'variant'>) {
  return <Btn {...props} variant="success" />
}
