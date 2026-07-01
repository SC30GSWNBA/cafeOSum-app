import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useTableStore } from '../store/tableStore'
import { useLanguageStore } from '../store/languageStore'

const C = {
  brownDark: '#3B1F0E', brownMid: '#7C4A1E',
  gold: '#D4A017',
  gray50: '#F9F5F0', gray100: '#F0EBE3', gray200: '#DDD5C8',
  gray400: '#9E8E7E', gray600: '#6B5B4E',
  green: '#2E8B57', greenBg: '#E8F5EE', greenBorder: '#86EFAC',
  amber: '#D97706', amberBg: '#FEF3C7', amberBorder: '#FDE68A',
  red: '#DC2626', redBg: '#FEE2E2', redBorder: '#FCA5A5',
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
}

function fmt(n: number) { return `₹${n.toFixed(0)}` }
function elapsed(openedAt: number | null) {
  if (!openedAt) return '—'
  const mins = Math.floor((Date.now() - openedAt) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function BillingOverviewPage() {
  const navigate = useNavigate()
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const store = useTableStore()
  const tables = store.tables

  const occupied = tables.filter((t) => t.status === 'occupied')
  const billPending = tables.filter((t) => t.status === 'bill-pending')
  const totalLive = [...occupied, ...billPending].reduce((s, t) => s + t.orderTotal, 0)

  const [generatingId, setGeneratingId] = useState<string | null>(null)

  async function handleGenerateBill(tableId: string) {
    setGeneratingId(tableId)
    try {
      await store.generateBill(tableId)
      navigate(`/billing/${tableId}`)
    } finally {
      setGeneratingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.gray50, overflow: 'hidden' }}>
      <AppSidebar activeRoute="/billing" />

      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'white', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.brownDark }}>
            {hi ? 'बिलिंग / POS' : 'Billing / POS'}
          </span>
          <LanguageToggle />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => navigate('/tables')}
            style={{ padding: '7px 14px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {hi ? '🪑 टेबल देखें' : '🪑 View Floor'}
          </button>
        </header>

        {/* Summary strip */}
        <div style={{ background: 'white', borderBottom: `1px solid ${C.gray100}`, padding: '10px 20px', display: 'flex', gap: 24, flexShrink: 0 }}>
          {[
            { label: hi ? 'सक्रिय ऑर्डर' : 'Active Orders', value: occupied.length, color: C.amber, bg: C.amberBg, border: C.amberBorder, dot: C.amber },
            { label: hi ? 'बिल प्रतीक्षित' : 'Pending Bills', value: billPending.length, color: C.red, bg: C.redBg, border: C.redBorder, dot: C.red },
            { label: hi ? 'लाइव राजस्व' : 'Live Revenue', value: fmt(totalLive), color: C.green, bg: C.greenBg, border: C.greenBorder, dot: C.green },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 12, color: s.color, opacity: 0.8 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Active Orders */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>{hi ? '🟡 सक्रिय ऑर्डर' : '🟡 Active Orders'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}` }}>{occupied.length}</span>
            </div>

            {occupied.length === 0 ? (
              <div style={{ padding: '20px', background: 'white', borderRadius: 12, border: `1px dashed ${C.gray200}`, textAlign: 'center', fontSize: 13, color: C.gray400 }}>
                {hi ? 'कोई सक्रिय ऑर्डर नहीं' : 'No active orders right now'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {occupied.map((t) => (
                  <div key={t.id} style={{ background: 'white', border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 4px rgba(59,31,14,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>🪑</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>{t.name}</div>
                        {t.customerName && <div style={{ fontSize: 11, color: C.gray400 }}>{t.customerName}{t.guests > 0 ? ` · ${t.guests} ${hi ? 'अतिथि' : 'guests'}` : ''}</div>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}` }}>
                        {elapsed(t.openedAt)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, background: C.gray50, borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.brownDark }}>{t.orderItems}</div>
                        <div style={{ fontSize: 10, color: C.gray400 }}>{hi ? 'वस्तुएं' : 'items'}</div>
                      </div>
                      <div style={{ flex: 1, background: C.gray50, borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.brownDark }}>{fmt(t.orderTotal)}</div>
                        <div style={{ fontSize: 10, color: C.gray400 }}>{hi ? 'कुल' : 'subtotal'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => navigate(`/order/${t.id}`)}
                        style={{ flex: 1, padding: '8px', background: 'white', color: C.brownMid, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {hi ? '+ ऑर्डर' : '+ Order'}
                      </button>
                      <button
                        onClick={() => handleGenerateBill(t.id)}
                        disabled={generatingId === t.id}
                        style={{ flex: 1, padding: '8px', background: generatingId === t.id ? C.gray400 : C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: generatingId === t.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                      >
                        {generatingId === t.id ? '…' : (hi ? 'बिल बनाएं →' : 'Generate Bill →')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pending Settlement */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>{hi ? '🔴 भुगतान प्रतीक्षित' : '🔴 Pending Settlement'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}` }}>{billPending.length}</span>
            </div>

            {billPending.length === 0 ? (
              <div style={{ padding: '20px', background: 'white', borderRadius: 12, border: `1px dashed ${C.gray200}`, textAlign: 'center', fontSize: 13, color: C.gray400 }}>
                {hi ? 'कोई लंबित भुगतान नहीं' : 'No bills pending settlement'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {billPending.map((t) => (
                  <div key={t.id} style={{ background: 'white', border: `1px solid ${C.redBorder}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 4px rgba(59,31,14,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>🧾</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>{t.name}</div>
                        {t.customerName && <div style={{ fontSize: 11, color: C.gray400 }}>{t.customerName}</div>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}` }}>
                        {hi ? 'बिल तैयार' : 'BILL READY'}
                      </span>
                    </div>

                    <div style={{ background: C.gray50, borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.gray600 }}>{hi ? 'बिल राशि' : 'Bill Amount'}</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: C.brownDark }}>{fmt(t.orderTotal)}</span>
                    </div>

                    <button
                      onClick={() => navigate(`/billing/${t.id}`)}
                      style={{ padding: '9px', background: C.red, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {hi ? '💳 भुगतान करें →' : '💳 Settle Bill →'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* All-clear empty state */}
          {occupied.length === 0 && billPending.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: C.gray400, paddingBottom: 60 }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.gray600 }}>{hi ? 'सभी टेबल खाली हैं' : 'All clear!'}</div>
              <div style={{ fontSize: 13 }}>{hi ? 'कोई सक्रिय ऑर्डर या लंबित बिल नहीं' : 'No active orders or pending bills'}</div>
              <button
                onClick={() => navigate('/tables')}
                style={{ marginTop: 8, padding: '9px 20px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {hi ? '🪑 टेबल देखें' : '🪑 View Floor'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
