import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTableStore } from '../store/tableStore'
import { useBillStore } from '../store/billStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { useMenuStore } from '../store/menuStore'
import { PageShell } from '../components/ui/PageShell'
import { LanguageToggle } from '../components/LanguageToggle'
import { T } from '../lib/tokens'
import { useLanguageStore } from '../store/languageStore'

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function KpiCard({ icon, label, value, sub, accent, onClick }: {
  icon: string
  label: string
  value: string
  sub?: string
  accent?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.white, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.1s',
        flex: 1,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowMd
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 22 }}>{icon}</div>
        {accent && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
            {accent}
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.brown900, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 12, color: T.gray400, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { tables } = useTableStore()
  const { bills } = useBillStore()
  const { ingredients } = useInventoryStore()
  const { isComplete, cafeName } = useOnboardingStore()
  const { items: menuItems } = useMenuStore()

  const today = useMemo(() => {
    const start = todayStart()
    const todayBills = bills.filter((b) => b.settledAt >= start && b.status === 'settled')
    const revenue = todayBills.reduce((s, b) => s + b.grandTotal, 0)
    const gst = todayBills.reduce((s, b) => s + b.cgst + b.sgst, 0)
    return { bills: todayBills, revenue, gst, count: todayBills.length }
  }, [bills])

  const tableCounts = useMemo(() => ({
    free: tables.filter((t) => t.status === 'free').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    pending: tables.filter((t) => t.status === 'bill-pending').length,
    total: tables.length,
  }), [tables])

  const lowStockCount = useMemo(() =>
    ingredients.filter((i) => i.threshold > 0 && i.stock < i.threshold).length,
    [ingredients]
  )
  const noInventory = ingredients.length === 0

  const recentBills = useMemo(() =>
    [...bills]
      .filter((b) => b.status === 'settled')
      .sort((a, b) => b.settledAt - a.settledAt)
      .slice(0, 6),
    [bills]
  )

  const { lang } = useLanguageStore()
  const hi = lang === 'hi'

  const nowLabel = new Date().toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const displayName = user?.cafeName || cafeName || 'Cafe'

  return (
    <PageShell
      activeRoute="/dashboard"
      topbar={
        <>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.brown900 }}>☕ {hi ? 'डैशबोर्ड' : 'Dashboard'}</div>
          <div style={{ flex: 1 }} />
          <LanguageToggle />
          <div style={{ fontSize: 12, color: T.gray400, whiteSpace: 'nowrap' }}>{nowLabel}</div>
        </>
      }
    >
      <div style={{ padding: '24px 28px', maxWidth: 1100, animation: 'fadeUp 0.25s ease both' }}>

        {/* Setup banner */}
        {!isComplete && (
          <div style={{
            marginBottom: 22, padding: '14px 18px',
            background: T.amberBg, border: `1px solid ${T.amberBorder}`,
            borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🏗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.amber }}>{hi ? 'कैफे सेटअप अधूरा है' : 'Cafe setup incomplete'}</div>
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>{hi ? 'मेनू, टेबल और GST विवरण सेट करने के लिए विज़ार्ड पूरा करें।' : 'Complete the wizard to configure your menu, tables, and GST details.'}</div>
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              style={{ padding: '7px 16px', background: T.amber, color: T.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {hi ? 'सेटअप जारी रखें →' : 'Continue Setup →'}
            </button>
          </div>
        )}

        {/* Welcome */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.brown900 }}>{hi ? `वापस स्वागत है, ${displayName} 👋` : `Welcome back, ${displayName} 👋`}</h1>
          <p style={{ fontSize: 13, color: T.gray400, marginTop: 4 }}>{hi ? 'आज आपके कैफे में क्या हो रहा है।' : "Here's what's happening at your cafe today."}</p>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
          <KpiCard
            icon="₹"
            label={hi ? 'आज की आमदनी' : "Today's Revenue"}
            value={today.revenue > 0 ? `₹${today.revenue.toFixed(0)}` : '₹0'}
            sub={today.count > 0 ? `incl. ₹${today.gst.toFixed(0)} GST` : (hi ? 'अभी कोई बिल नहीं' : 'No bills settled yet')}
            accent={today.count > 0 ? (hi ? 'आज' : 'Today') : undefined}
            onClick={() => navigate('/analytics')}
          />
          <KpiCard
            icon="🧾"
            label={hi ? 'आज के बिल' : 'Bills Today'}
            value={String(today.count)}
            sub={today.count > 0 ? `Avg ₹${(today.revenue / today.count).toFixed(0)}/bill` : (hi ? 'अभी कोई गतिविधि नहीं' : 'No activity yet')}
            onClick={() => navigate('/analytics')}
          />
          <KpiCard
            icon="🪑"
            label={hi ? 'व्यस्त टेबल' : 'Tables Occupied'}
            value={`${tableCounts.occupied + tableCounts.pending} / ${tableCounts.total}`}
            sub={hi ? `${tableCounts.free} मुक्त · ${tableCounts.pending} भुगतान बाकी` : `${tableCounts.free} free · ${tableCounts.pending} awaiting payment`}
            onClick={() => navigate('/tables')}
          />
          <KpiCard
            icon="📦"
            label={hi ? 'कम स्टॉक अलर्ट' : 'Low Stock Alerts'}
            value={noInventory ? (hi ? 'सेटअप करें' : 'Setup') : lowStockCount === 0 ? (hi ? 'ठीक है' : 'All Good') : String(lowStockCount)}
            sub={noInventory ? (hi ? 'कोई सामग्री नहीं जोड़ी गई' : 'No ingredients added yet') : lowStockCount === 0 ? (hi ? 'सभी सामग्री पर्याप्त' : 'All ingredients above threshold') : `${lowStockCount} ingredient${lowStockCount !== 1 ? 's' : ''} below threshold`}
            accent={noInventory ? undefined : lowStockCount === 0 ? '✓ OK' : undefined}
            onClick={() => navigate('/inventory')}
          />
        </div>

        {/* Lower section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>

          {/* Quick Actions */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
              {hi ? 'त्वरित क्रियाएं' : 'Quick Actions'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '🪑', label: hi ? 'टेबल प्रबंधन' : 'Manage Tables', sub: hi ? `${tableCounts.occupied} टेबल व्यस्त` : `${tableCounts.occupied} occupied right now`, route: '/tables', accent: T.green },
                { icon: '📈', label: hi ? 'विश्लेषण' : 'View Analytics', sub: hi ? `आज ${today.count} बिल` : `${today.count} bills settled today`, route: '/analytics', accent: T.blue },
                { icon: '📦', label: hi ? 'इन्वेंटरी' : 'Check Inventory', sub: noInventory ? (hi ? 'अभी तक कुछ नहीं जोड़ा' : 'Nothing added yet') : lowStockCount > 0 ? `${lowStockCount} items low on stock` : (hi ? 'सब ठीक है' : 'All stocked up'), route: '/inventory', accent: noInventory ? T.gray400 : lowStockCount > 0 ? T.amber : T.green },
                { icon: '📜', label: hi ? 'ऑडिट लॉग' : 'Audit Log', sub: hi ? 'सभी गतिविधियां देखें' : 'Review all platform events', route: '/audit-log', accent: T.gray400 },
              ].map((item) => (
                <div
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: T.white,
                    border: `1px solid ${T.border}`, borderRadius: 10,
                    cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = T.borderMid
                    el.style.boxShadow = T.shadowSm
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = T.border
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: T.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.brown900 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <span style={{ fontSize: 14, color: T.gray400 }}>→</span>
                </div>
              ))}
            </div>

            {/* Menu summary */}
            <div style={{
              marginTop: 16, padding: '14px 16px',
              background: T.cream, border: `1px solid ${T.border}`, borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>🍽</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.brown900 }}>{menuItems.length} menu items</div>
                <div style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>
                  {isComplete ? 'Setup complete — ready to take orders' : 'Complete setup to add more items'}
                </div>
              </div>
              <button
                onClick={() => navigate('/onboarding')}
                style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12, fontWeight: 600, color: T.brown700, background: T.white, border: `1px solid ${T.borderMid}`, borderRadius: 7, cursor: 'pointer' }}
              >
                Edit Menu
              </button>
            </div>
          </div>

          {/* Recent Bills */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {hi ? 'हाल के बिल' : 'Recent Bills'}
              </div>
              {bills.length > 0 && (
                <button
                  onClick={() => navigate('/analytics')}
                  style={{ fontSize: 12, fontWeight: 600, color: T.brown700, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View all →
                </button>
              )}
            </div>
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {recentBills.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: T.gray400 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.brown900, marginBottom: 4 }}>No bills yet</div>
                  <div style={{ fontSize: 12 }}>Bills will appear here after your first settled order.</div>
                  <button
                    onClick={() => navigate('/tables')}
                    style={{ marginTop: 14, padding: '7px 18px', background: T.brown900, color: T.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Open a table →
                  </button>
                </div>
              ) : (
                <>
                  {recentBills.map((bill, i) => (
                    <div
                      key={bill.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 16px',
                        borderBottom: i < recentBills.length - 1 ? `1px solid ${T.border}` : 'none',
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✓</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.brown900 }}>
                          {bill.tableName}
                          {bill.customerName ? <span style={{ color: T.gray400, fontWeight: 400 }}> · {bill.customerName}</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>
                          {bill.id} · {fmtDate(bill.settledAt)} {fmtTime(bill.settledAt)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.brown900 }}>
                          ₹{bill.grandTotal.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 10, color: T.gray400, textTransform: 'capitalize' }}>{bill.payMode}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '10px 16px', background: T.gray50, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.gray400, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Showing last {recentBills.length} bills</span>
                    <span style={{ color: T.green, fontWeight: 600 }}>₹{today.revenue.toFixed(0)} today</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table status strip */}
        {tables.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.gray400, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
              {hi ? 'फ्लोर स्थिति' : 'Floor Status'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tables.slice(0, 20).map((table) => {
                const color = table.status === 'free' ? T.green : table.status === 'occupied' ? T.amber : T.red
                const bg    = table.status === 'free' ? T.greenBg : table.status === 'occupied' ? T.amberBg : T.redBg
                const border = table.status === 'free' ? T.greenBorder : table.status === 'occupied' ? T.amberBorder : T.redBorder
                return (
                  <div
                    key={table.id}
                    onClick={() => navigate('/tables')}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      background: bg, border: `1px solid ${border}`,
                      fontSize: 12, fontWeight: 600, color, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {table.name}
                  </div>
                )
              })}
              {tables.length > 20 && (
                <div style={{ padding: '5px 12px', borderRadius: 8, background: T.gray50, border: `1px solid ${T.border}`, fontSize: 12, color: T.gray400 }}>
                  +{tables.length - 20} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
