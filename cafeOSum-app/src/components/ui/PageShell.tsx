import { AppSidebar } from '../AppSidebar'
import { T } from '../../lib/tokens'

interface PageShellProps {
  activeRoute: string
  topbar: React.ReactNode
  children: React.ReactNode
  /** true = content fills viewport height with no outer scroll (split-panel pages) */
  fixed?: boolean
}

export function PageShell({ activeRoute, topbar, children, fixed = false }: PageShellProps) {
  return (
    <div style={{
      display: 'flex',
      height: fixed ? '100vh' : undefined,
      minHeight: fixed ? undefined : '100vh',
      background: T.bg,
      overflow: fixed ? 'hidden' : undefined,
    }}>
      <AppSidebar activeRoute={activeRoute} />
      <div style={{
        marginLeft: 240, flex: 1,
        display: 'flex', flexDirection: 'column',
        height: fixed ? '100%' : undefined,
        minHeight: fixed ? undefined : '100vh',
        overflow: fixed ? 'hidden' : undefined,
      }}>
        <header style={{
          height: 56, flexShrink: 0,
          background: T.white, borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          {topbar}
        </header>
        {children}
      </div>
    </div>
  )
}
