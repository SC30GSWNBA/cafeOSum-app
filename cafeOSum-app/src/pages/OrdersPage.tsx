import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useTableStore } from '../store/tableStore'
import { useBillStore } from '../store/billStore'
import { useLanguageStore } from '../store/languageStore'
import { useOnboardingStore } from '../store/onboardingStore'

const C = {
  brownDark: '#3B1F0E', brownMid: '#7C4A1E',
  gold: '#D4A017', cream: '#FDF8F2',
  gray50: '#F9F5F0', gray100: '#F0EBE3', gray200: '#DDD5C8',
  gray400: '#9E8E7E', gray600: '#6B5B4E',
  green: '#2E8B57', greenBg: '#E8F5EE', greenBorder: '#86EFAC',
  amber: '#D97706', amberBg: '#FEF3C7', amberBorder: '#FDE68A',
  red: '#DC2626', redBg: '#FEE2E2', redBorder: '#FCA5A5',
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function elapsed(openedAt: number | null): string {
  if (!openedAt) return '—'
  const secs = Math.floor((Date.now() - openedAt) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const PAY_ICON: Record<string, string> = { upi: '💳', cash: '💵', card: '🏦' }

export function OrdersPage() {
  const navigate = useNavigate()
  const tableStore = useTableStore()
  const billStore = useBillStore()
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const menuItems = useOnboardingStore((s) => s.menuItems)

  useEffect(() => {
    tableStore.fetch()
    billStore.fetch()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const liveTables = tableStore.tables.filter((t) => t.status === 'occupied' || t.status === 'bill-pending')
  const recentBills = [...billStore.bills].sort((a, b) => b.settledAt - a.settledAt).slice(0, 20)

  const liveRevenue = liveTables.reduce((s, t) => s + t.orderTotal, 0)
  const liveItems = liveTables.reduce((s, t) => s + t.orderItems, 0)

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.gray50, overflow: 'hidden' }}>
      <AppSidebar activeRoute="/orders" />

      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'white', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: C.gray600 }}
          >←</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.brownDark }}>{hi ? 'ऑर्डर' : 'Orders'}</span>
          <LanguageToggle />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => navigate('/tables')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >🪑 {hi ? 'टेबल प्रबंधन' : 'Manage Tables'}</button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Stat row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: hi ? 'सक्रिय टेबल' : 'Active Tables', value: liveTables.length, sub: hi ? `${liveTables.length} टेबल सेवा में` : (liveTables.length === 1 ? '1 table in service' : `${liveTables.length} tables in service`), color: C.green },
              { label: hi ? 'ऑर्डर में वस्तुएं' : 'Items in Flight', value: liveItems, sub: hi ? 'सभी खुले ऑर्डर में' : 'across all open orders', color: C.amber },
              { label: hi ? 'लाइव ऑर्डर मूल्य' : 'Live Order Value', value: `₹${liveRevenue.toFixed(0)}`, sub: hi ? 'अभी बिल नहीं' : 'not yet billed', color: C.brownDark },
            ].map((s) => (
              <div key={s.label} style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(59,31,14,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Live Orders ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.brownDark, margin: 0 }}>{hi ? 'लाइव ऑर्डर' : 'Live Orders'}</h2>
              {liveTables.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}` }}>
                  {liveTables.length} {hi ? 'सक्रिय' : 'active'}
                </span>
              )}
            </div>

            {liveTables.length === 0 ? (
              <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', color: C.gray400 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🪑</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{hi ? 'अभी कोई सक्रिय ऑर्डर नहीं' : 'No active orders right now'}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{hi ? 'ऑर्डर शुरू करने के लिए फ्लोर व्यू से टेबल खोलें' : 'Open a table from the Floor view to start taking orders'}</div>
                <button
                  onClick={() => navigate('/tables')}
                  style={{ marginTop: 14, padding: '8px 18px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >{hi ? 'टेबल पर जाएं →' : 'Go to Tables →'}</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {liveTables.map((t) => {
                  const isPending = t.status === 'bill-pending'
                  return (
                    <div
                      key={t.id}
                      style={{ background: 'white', border: `1.5px solid ${isPending ? C.redBorder : C.amberBorder}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(59,31,14,0.06)' }}
                    >
                      {/* Card header */}
                      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 8, background: isPending ? C.redBg : C.amberBg }}>
                        <span style={{ fontSize: 20 }}>{isPending ? '🧾' : '🧑‍🤝‍🧑'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>{t.name}</div>
                          {t.customerName && <div style={{ fontSize: 11, color: C.gray400 }}>{t.customerName}{t.guests ? ` · ${t.guests} pax` : ''}</div>}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                          background: isPending ? C.redBg : C.amberBg,
                          color: isPending ? C.red : C.amber,
                          border: `1px solid ${isPending ? C.redBorder : C.amberBorder}`,
                        }}>
                          {isPending
                            ? (lang === 'hi' ? '🧾 बिल बकाया' : '🧾 Bill Pending')
                            : (lang === 'hi' ? '🧑‍🤝‍🧑 व्यस्त' : '🧑‍🤝‍🧑 Occupied')}
                        </span>
                      </div>

                      {/* Order lines */}
                      <div style={{ padding: '10px 14px', maxHeight: 180, overflowY: 'auto' }}>
                        {t.orderLines.length === 0 ? (
                          <div style={{ fontSize: 12, color: C.gray400, textAlign: 'center', padding: '10px 0' }}>{hi ? 'अभी कोई वस्तु नहीं' : 'No items added yet'}</div>
                        ) : t.orderLines.map((line) => (
                          <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                            <span style={{ fontSize: 14 }}>{line.emoji}</span>
                            <span style={{ flex: 1, color: C.brownDark, fontWeight: 500 }}>
                              {hi ? (menuItems.find((m) => m.id === line.menuItemId)?.hindiName ?? line.name) : line.name}
                            </span>
                            <span style={{ color: C.gray400 }}>×{line.qty}</span>
                            <span style={{ color: C.brownDark, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>₹{(line.price * line.qty).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Card footer */}
                      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 11, color: C.gray400 }}>⏱ {elapsed(t.openedAt)}</div>
                        <div style={{ flex: 1 }} />
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.brownDark }}>₹{t.orderTotal.toFixed(0)}</div>
                        <button
                          onClick={() => navigate(isPending ? `/billing/${t.id}` : `/order/${t.id}`)}
                          style={{ padding: '6px 12px', background: isPending ? C.red : C.amber, color: 'white', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >{isPending ? (lang === 'hi' ? 'भुगतान →' : 'Collect →') : (lang === 'hi' ? 'देखें →' : 'View →')}</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Recent Bills ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.brownDark, margin: 0 }}>{hi ? 'हाल के बिल' : 'Recent Bills'}</h2>
              {recentBills.length > 0 && (
                <span style={{ fontSize: 11, color: C.gray400 }}>Last {recentBills.length}</span>
              )}
            </div>

            {recentBills.length === 0 ? (
              <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: '24px', textAlign: 'center', color: C.gray400, fontSize: 13 }}>
                {hi ? 'आज कोई बिल नहीं।' : 'No bills settled yet today.'}
              </div>
            ) : (
              <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(59,31,14,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {(hi ? ['बिल #', 'टेबल', 'वस्तुएं', 'राशि', 'भुगतान', 'समय', 'स्थिति'] : ['Bill #', 'Table', 'Items', 'Amount', 'Pay Mode', 'Time', 'Status']).map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 14px', background: C.gray50, color: C.gray400, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.gray100}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentBills.map((b, idx) => (
                      <tr key={b.id} style={{ background: idx % 2 === 0 ? 'white' : C.gray50 }}>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.gray100}`, fontWeight: 700, color: C.brownDark }}>{b.id}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.gray100}`, color: C.brownDark }}>{b.tableName}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.gray100}`, color: C.gray600 }}>{hi ? `${b.lines.length} वस्तु` : `${b.lines.length} item${b.lines.length !== 1 ? 's' : ''}`}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.gray100}`, fontWeight: 700, color: C.brownDark }}>₹{b.grandTotal.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.gray100}`, color: C.gray600 }}>{PAY_ICON[b.payMode]} {b.payMode.toUpperCase()}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.gray100}`, color: C.gray400, whiteSpace: 'nowrap' }}>{fmtDate(b.settledAt)} {fmtTime(b.settledAt)}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.gray100}` }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: b.status === 'settled' ? C.greenBg : C.redBg,
                            color: b.status === 'settled' ? C.green : C.red,
                            border: `1px solid ${b.status === 'settled' ? C.greenBorder : C.redBorder}`,
                          }}>
                            {b.status === 'settled' ? (hi ? '✓ चुकाया' : '✓ Settled') : (hi ? '✕ रद्द' : '✕ Voided')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
