import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useMenuStore } from '../store/menuStore'
import { useTableStore } from '../store/tableStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useLanguageStore } from '../store/languageStore'

const NAV_ITEMS = [
  {
    group: 'Main',
    items: [
      { icon: '⊞', label: 'Dashboard', route: '/dashboard' },
      { icon: '📋', label: 'Menu', route: '/menu' },
      { icon: '🧾', label: 'Billing / POS', route: '/billing' },
      { icon: '📑', label: 'Orders', route: '/orders' },
    ],
  },
  {
    group: 'Floor',
    items: [{ icon: '🪑', label: 'Tables', route: '/tables' }],
  },
  {
    group: 'Management',
    items: [
      { icon: '📦', label: 'Inventory', route: '/inventory' },
      { icon: '👷', label: 'Staff & PINs', route: null },
    ],
  },
  {
    group: 'Insights',
    items: [
      { icon: '📈', label: 'Analytics', route: '/analytics' },
      { icon: '📜', label: 'Audit Log', route: '/audit-log' },
      { icon: '⚙', label: 'Settings', route: null },
    ],
  },
]

export function AppSidebar({ activeRoute }: { activeRoute: string }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const initials = (user?.cafeName ?? 'CA').slice(0, 2).toUpperCase()
  const ingredients = useInventoryStore((s) => s.ingredients)
  const lowStockCount = ingredients.filter((i) => {
    if (i.threshold === 0) return false
    return i.stock < i.threshold
  }).length

  return (
    <aside
      style={{
        width: 240, background: 'white', borderRight: '1px solid #F0EBE3',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', zIndex: 200,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, background: '#3B1F0E', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F0C040', fontSize: 17 }}>
          ☕
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#3B1F0E' }}>
          Cafe<span style={{ color: '#D4A017' }}>OSum</span>
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map((g) => (
          <div key={g.group}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9E8E7E', letterSpacing: '0.8px', textTransform: 'uppercase', padding: '10px 8px 4px' }}>
              {g.group}
            </div>
            {g.items.map((item) => {
              const isActive = activeRoute === item.route
              return (
                <div
                  key={item.label}
                  onClick={() => item.route && navigate(item.route)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 8, cursor: item.route ? 'pointer' : 'default',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#3B1F0E' : item.route ? '#6B5B4E' : '#C0B0A0',
                    background: isActive ? '#FDF8F2' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (item.route && !isActive)
                      (e.currentTarget as HTMLDivElement).style.background = '#F9F5F0'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ fontSize: 15, width: 20, textAlign: 'center', color: isActive ? '#7C4A1E' : 'inherit' }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.label === 'Inventory' && lowStockCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>
                      {lowStockCount} low
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: 12, borderTop: '1px solid #F0EBE3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7C4A1E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#3B1F0E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.cafeName ?? 'My Cafe'}
            </div>
            <div style={{ fontSize: 10, color: '#9E8E7E' }}>Owner</div>
          </div>
        </div>
        <button
          onClick={() => {
            useMenuStore.getState().clearData()
            useTableStore.getState().clearData()
            useInventoryStore.getState().clearData()
            useLanguageStore.getState().setLang('en')
            logout()
            navigate('/auth')
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#DC2626', background: '#FEE2E2', border: 'none', width: '100%' }}
        >
          <span>↪</span> Logout
        </button>
      </div>
    </aside>
  )
}
