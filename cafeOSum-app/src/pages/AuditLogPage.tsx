import { useEffect, useMemo, useState } from 'react'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguageStore } from '../store/languageStore'
import { useAuditStore, type AuditEvent, type EventCategory, type EventStatus } from '../store/auditStore'

// ── Design tokens ────────────────────────────────────────────────────────────
const BD = '#3B1F0E'
const WHITE = '#FFFFFF'
const G50 = '#F9F5F0'
const G100 = '#F0EBE3'
const G200 = '#DDD5C8'
const G400 = '#9E8E7E'
const G600 = '#6B5B4E'
const GREEN = '#2E8B57'
const GRN_BG = '#E8F5EE'
const RED = '#DC2626'
const RED_BG = '#FEE2E2'
const RED_BD = '#FCA5A5'
const BLUE = '#2563EB'
const BLUE_BG = '#EFF6FF'
const BLUE_BD = '#BFDBFE'
const AMBER = '#D97706'
const AMBER_BG = '#FEF3C7'
const PURPLE = '#7C3AED'
const PURPLE_BG = '#F3E8FF'
const TEAL = '#059669'
const TEAL_BG = '#ECFDF5'
const ORANGE = '#EA580C'
const ORANGE_BG = '#FFF7ED'
const INDIGO = '#4F46E5'
const INDIGO_BG = '#EEF2FF'

const PAGE_SIZE = 20

const ALL_CATS: EventCategory[] = ['Auth', 'Billing', 'Orders', 'Setup', 'Inventory', 'Staff', 'Analytics']

const CAT_STYLE: Record<EventCategory, { bg: string; color: string }> = {
  Auth:      { bg: BLUE_BG,   color: BLUE },
  Billing:   { bg: AMBER_BG,  color: AMBER },
  Orders:    { bg: GRN_BG,    color: GREEN },
  Setup:     { bg: PURPLE_BG, color: PURPLE },
  Inventory: { bg: TEAL_BG,   color: TEAL },
  Staff:     { bg: ORANGE_BG, color: ORANGE },
  Analytics: { bg: INDIGO_BG, color: INDIGO },
}

function fmtTs(ts: number): string {
  const d = new Date(ts)
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

function fmtTsUtc(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function dateBoundary(range: string): number {
  const now = Date.now()
  if (range === 'today') {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime()
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return now - days * 86_400_000
}

function statusIcon(s: EventStatus): string {
  return s === 'ok' ? '✓' : s === 'warn' ? '⚠' : '✕'
}
function statusColor(s: EventStatus): string {
  return s === 'ok' ? GREEN : s === 'warn' ? AMBER : RED
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px', border: `1.5px solid ${G200}`, borderRadius: 7,
  fontSize: 12, color: BD, background: WHITE, outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
}
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '9px 12px', background: G50, color: G400,
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
  borderBottom: `1px solid ${G100}`, whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '10px 12px', borderBottom: `1px solid ${G100}`, verticalAlign: 'middle',
}

// ── Page component ───────────────────────────────────────────────────────────
export function AuditLogPage() {
  const allEvents = useAuditStore((s) => s.events)
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'

  const [tab, setTab] = useState<'log' | 'schema'>('log')
  const [dateRange, setDateRange] = useState('90d')
  const [userFilter, setUserFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const uniqueUsers = useMemo(
    () => [...new Set(allEvents.map((e) => e.userId).filter((u) => u && u !== '—'))].sort(),
    [allEvents]
  )

  const filtered = useMemo(() => {
    const boundary = dateBoundary(dateRange)
    return allEvents.filter((e) => {
      if (e.timestamp < boundary) return false
      if (userFilter !== 'all' && e.userId !== userFilter) return false
      if (catFilter !== 'all' && e.category !== catFilter) return false
      return true
    })
  }, [allEvents, dateRange, userFilter, catFilter])

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [dateRange, userFilter, catFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageEvents = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const selectedEvent: AuditEvent | null = useMemo(
    () => allEvents.find((e) => e.eventId === selectedId) ?? null,
    [allEvents, selectedId]
  )

  const bruteForceIps = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.filter((e) => e.eventType === 'FAILED_LOGIN').forEach((e) => {
      counts[e.ipAddress] = (counts[e.ipAddress] ?? 0) + 1
    })
    return Object.entries(counts).filter(([, n]) => n >= 5).map(([ip]) => ip)
  }, [filtered])

  const hasFilters = userFilter !== 'all' || catFilter !== 'all' || dateRange !== '90d'

  // ── Inner view functions ──────────────────────────────────────────────────

  function FilterBar() {
    return (
      <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: G600, whiteSpace: 'nowrap' }}>{hi ? 'तारीख सीमा:' : 'Date Range:'}</span>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={selStyle}>
          <option value="today">{hi ? 'आज' : 'Today'}</option>
          <option value="7d">{hi ? 'पिछले 7 दिन' : 'Last 7 Days'}</option>
          <option value="30d">{hi ? 'पिछले 30 दिन' : 'Last 30 Days'}</option>
          <option value="90d">{hi ? 'पिछले 90 दिन' : 'Last 90 Days'}</option>
        </select>
        <div style={{ width: 1, height: 20, background: G200 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: G600, whiteSpace: 'nowrap' }}>{hi ? 'उपयोगकर्ता:' : 'User:'}</span>
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={selStyle}>
          <option value="all">{hi ? 'सभी उपयोगकर्ता' : 'All Users'}</option>
          {uniqueUsers.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <div style={{ width: 1, height: 20, background: G200 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: G600, whiteSpace: 'nowrap' }}>{hi ? 'श्रेणी:' : 'Category:'}</span>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={selStyle}>
          <option value="all">{hi ? 'सभी श्रेणियां' : 'All Categories'}</option>
          {ALL_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setDateRange('90d'); setUserFilter('all'); setCatFilter('all') }}
            style={{ marginLeft: 'auto', padding: '5px 12px', background: G50, border: `1px solid ${G200}`, borderRadius: 6, fontSize: 12, color: G600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {hi ? 'फ़िल्टर हटाएं' : 'Clear filters'}
          </button>
        )}
      </div>
    )
  }

  function ActiveChips() {
    if (!hasFilters) return null
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {userFilter !== 'all' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: BD, color: WHITE, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
            👤 {userFilter}
            <span onClick={() => setUserFilter('all')} style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}>×</span>
          </span>
        )}
        {catFilter !== 'all' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: AMBER, color: WHITE, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
            {catFilter}
            <span onClick={() => setCatFilter('all')} style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}>×</span>
          </span>
        )}
        {dateRange !== '90d' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#6B5B4E', color: WHITE, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
            {dateRange === 'today' ? (hi ? 'आज' : 'Today') : dateRange === '7d' ? (hi ? 'पिछले 7 दिन' : 'Last 7 days') : (hi ? 'पिछले 30 दिन' : 'Last 30 days')}
            <span onClick={() => setDateRange('90d')} style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}>×</span>
          </span>
        )}
      </div>
    )
  }

  function DetailPanel() {
    if (!selectedEvent) return null
    const cs = CAT_STYLE[selectedEvent.category]
    const fields = [
      { key: 'event_id', val: selectedEvent.eventId },
      { key: 'event_type', val: selectedEvent.eventType },
      { key: 'user_id', val: selectedEvent.userId },
      { key: 'cafe_id', val: selectedEvent.cafeId },
      { key: 'timestamp (UTC)', val: fmtTsUtc(selectedEvent.timestamp) },
      { key: 'ip_address', val: selectedEvent.ipAddress },
      { key: 'entity_type', val: selectedEvent.entityType },
      { key: 'entity_id', val: selectedEvent.entityId },
    ]
    return (
      <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${G100}` }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: cs.bg, color: cs.color }}>
            {selectedEvent.category}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: BD }}>{selectedEvent.eventType}</div>
            <div style={{ fontSize: 11, color: G400, marginTop: 3 }}>{selectedEvent.eventId} · {fmtTs(selectedEvent.timestamp)} · {selectedEvent.userId}</div>
          </div>
          <span style={{ fontSize: 18, color: statusColor(selectedEvent.status) }}>{statusIcon(selectedEvent.status)}</span>
          <button
            onClick={() => setSelectedId(null)}
            style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${G200}`, background: WHITE, cursor: 'pointer', fontSize: 13, color: G400 }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {fields.map((f) => (
            <div key={f.key} style={{ background: G50, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: G400, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{f.key}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: BD, wordBreak: 'break-all' }}>{f.val}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: G600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>payload</div>
        <pre style={{ background: BD, borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#E8D5B8', lineHeight: 1.8, overflowX: 'auto', margin: 0 }}>
          {JSON.stringify(selectedEvent.payload, null, 2)}
        </pre>
      </div>
    )
  }

  function Paginator() {
    if (pageCount <= 1) return null
    const pages = Array.from({ length: Math.min(pageCount, 7) }, (_, i) => i + 1)
    const from = (page - 1) * PAGE_SIZE + 1
    const to = Math.min(page * PAGE_SIZE, filtered.length)
    const btnBase: React.CSSProperties = { padding: '5px 11px', border: `1px solid ${G200}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', background: WHITE, color: G600 }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1 }}>←</button>
        {pages.map((p) => (
          <button key={p} onClick={() => setPage(p)} style={{ ...btnBase, background: p === page ? BD : WHITE, color: p === page ? WHITE : G600, borderColor: p === page ? BD : G200, fontWeight: p === page ? 700 : 500 }}>
            {p}
          </button>
        ))}
        {pageCount > 7 && <span style={{ color: G400, fontSize: 12 }}>…{pageCount}</span>}
        <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} style={{ ...btnBase, opacity: page === pageCount ? 0.4 : 1 }}>→</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: G400 }}>{hi ? `${from}–${to} दिखाए जा रहे हैं, कुल ${filtered.length} इवेंट` : `Showing ${from}–${to} of ${filtered.length} events`}</span>
      </div>
    )
  }

  function LogView() {
    return (
      <div>
        {FilterBar()}
        {ActiveChips()}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: BLUE_BG, border: `1px solid ${BLUE_BD}`, borderRadius: 8, fontSize: 12, color: BLUE, marginBottom: 12, lineHeight: 1.6, flexWrap: 'wrap' }}>
          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: BLUE, color: WHITE, whiteSpace: 'nowrap' }}>90 days in-app</span>
          {hi ? 'इवेंट अपरिवर्तनीय हैं — इवेंट स्टोर पर कोई संपादन या हटाना अनुमत नहीं है।' : 'Events are immutable — no edit or delete operations are permitted on the event store.'}
        </div>

        {bruteForceIps.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: RED_BG, border: `1.5px solid ${RED_BD}`, borderRadius: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🚨</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 4 }}>{hi ? 'ब्रूट-फोर्स चेतावनी सक्रिय' : 'Brute-Force Detection Triggered'}</div>
              <div style={{ fontSize: 12, color: G600, lineHeight: 1.6 }}>
                {hi
                  ? <>{bruteForceIps.length}+ लगातार FAILED_LOGIN <strong>{bruteForceIps.join(', ')}</strong> से। खाता 15 मिनट के लिए स्वतः बंद।</>
                  : <>5+ consecutive FAILED_LOGIN events from <strong>{bruteForceIps.join(', ')}</strong>. Account auto-locked for 15 minutes.</>
                }
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: BD, marginBottom: 8 }}>{hi ? 'अभी कोई गतिविधि नहीं' : 'No activity yet'}</div>
            <div style={{ fontSize: 13, color: G400 }}>
              {hasFilters
                ? (hi ? 'आपके फ़िल्टर से कोई इवेंट नहीं मिला। तारीख सीमा या श्रेणी बदलें।' : 'No events match your current filters. Try adjusting the date range or category.')
                : (hi ? 'जैसे-जैसे आप प्लेटफ़ॉर्म उपयोग करेंगे — बिलिंग, लॉगिन, ऑर्डर — गतिविधियां यहाँ दिखेंगी।' : 'Activity events will appear here as you use the platform — billing, auth, orders, and more.')}
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                  <thead>
                    <tr>
                      {(hi ? ['इवेंट ID', 'समय (IST)', 'श्रेणी', 'इवेंट प्रकार', 'उपयोगकर्ता', 'सारांश', 'IP', ''] : ['Event ID', 'Timestamp (IST)', 'Category', 'Event Type', 'User', 'Summary', 'IP', '']).map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageEvents.map((evt) => {
                      const isSelected = evt.eventId === selectedId
                      const cs = CAT_STYLE[evt.category]
                      return (
                        <tr
                          key={evt.eventId}
                          onClick={() => setSelectedId(isSelected ? null : evt.eventId)}
                          style={{ cursor: 'pointer', background: isSelected ? '#FDF8F2' : WHITE }}
                          onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = G50 }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? '#FDF8F2' : WHITE }}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: G400 }}>{evt.eventId}</span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: 11, color: G600, whiteSpace: 'nowrap' }}>{fmtTs(evt.timestamp)}</td>
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cs.bg, color: cs.color }}>
                              {evt.category}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: BD }}>{evt.eventType}</span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: 12, color: G600 }}>{evt.userId}</td>
                          <td style={{ ...tdStyle, fontSize: 12, color: BD, maxWidth: 260 }}>{evt.summary}</td>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: G600, background: G100, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                              {evt.ipAddress}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{ color: statusColor(evt.status), fontSize: 14 }}>{statusIcon(evt.status)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {DetailPanel()}
            {Paginator()}
          </>
        )}
      </div>
    )
  }

  function SchemaView() {
    const SCHEMA_FIELDS = [
      { field: 'event_id',    type: 'UUID',     desc: 'Globally unique, immutable identifier for this event' },
      { field: 'event_type',  type: 'ENUM',     desc: 'e.g. BILL_SETTLED, FAILED_LOGIN, STOCK_ADDED' },
      { field: 'user_id',     type: 'String',   desc: 'Acting user — null for system-triggered events' },
      { field: 'cafe_id',     type: 'String',   desc: 'Multi-tenant isolation key; all queries scoped to cafe_id' },
      { field: 'timestamp',   type: 'DateTime', desc: 'UTC timestamp at event emission, ISO 8601 — primary index for time-window queries (AC-09.8)' },
      { field: 'ip_address',  type: 'String',   desc: 'Client IP — mandatory on auth events for brute-force detection (AC-09.7)' },
      { field: 'entity_type', type: 'String',   desc: 'e.g. Bill, Order, Ingredient, Staff, Table, Session' },
      { field: 'entity_id',   type: 'String',   desc: 'FK to affected entity — indexed for entity-level queries (AC-09.8)' },
      { field: 'payload',     type: 'JSON',     desc: 'before_state + after_state for mutations; full original object for BILL_VOIDED / BILL_REFUNDED (AC-09.6)' },
    ]
    const CATEGORIES = [
      { label: 'Auth',      color: BLUE,   bg: BLUE_BG,   events: 'LOGIN · LOGOUT\nFAILED_LOGIN · PASSWORD_RESET' },
      { label: 'Billing',   color: AMBER,  bg: AMBER_BG,  events: 'BILL_GENERATED · BILL_SETTLED\nDISCOUNT_APPLIED · BILL_VOIDED' },
      { label: 'Orders',    color: GREEN,  bg: GRN_BG,    events: 'ORDER_CREATED · ITEM_ADDED\nITEM_REMOVED · ORDER_CANCELLED' },
      { label: 'Setup',     color: PURPLE, bg: PURPLE_BG, events: 'PROFILE_UPDATED · TABLE_ADDED\nTABLE_EDITED · MENU_ITEM_ADDED' },
      { label: 'Inventory', color: TEAL,   bg: TEAL_BG,   events: 'STOCK_ADDED · THRESHOLD_CHANGED\nLOW_STOCK_ALERT · INGREDIENT_MAPPED' },
      { label: 'Staff',     color: ORANGE, bg: ORANGE_BG, events: 'STAFF_ADDED · ROLE_CHANGED\nACCESS_REVOKED · STAFF_DELETED' },
    ]
    const AI_DIMS = [
      { dim: 'Time window', field: 'timestamp',       example: '"What happened last Sunday evening?"' },
      { dim: 'Event type',  field: 'event_type',      example: '"How many bills were voided this week?"' },
      { dim: 'Entity',      field: 'entity_id',       example: '"Show me all changes to Cappuccino this month"' },
      { dim: 'User filter', field: 'user_id',         example: '"How many bills did Priya generate today?"' },
      { dim: 'Category',    field: 'event_type prefix', example: '"Any suspicious login activity this week?"' },
    ]
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: BLUE_BG, border: `1px solid ${BLUE_BD}`, borderRadius: 8, fontSize: 12, color: BLUE, marginBottom: 16, lineHeight: 1.6 }}>
          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: BLUE, color: WHITE, whiteSpace: 'nowrap' }}>AC-09.3</span>
          {hi ? <>इवेंट <strong>असमकालिक रूप से</strong> लिखे जाते हैं (fire-and-forget) — उपयोगकर्ता क्रिया पर कोई विलंब नहीं।</> : <>Events are written <strong>asynchronously</strong> (fire-and-forget) — zero latency added to the triggering user action.</>}
        </div>

        <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BD, padding: '12px 16px', background: G50, borderBottom: `1px solid ${G100}` }}>
            {hi ? 'प्रति इवेंट रिकॉर्ड आवश्यक फ़ील्ड — AC-09.2 (9 फ़ील्ड)' : 'Required Fields per Event Record — AC-09.2 (9 fields)'}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr>
                  {(hi ? ['फ़ील्ड', 'प्रकार', 'आवश्यक', 'विवरण'] : ['Field', 'Type', 'Required', 'Description']).map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCHEMA_FIELDS.map((f, i) => (
                  <tr key={f.field}>
                    <td style={{ ...tdStyle, borderBottom: i < SCHEMA_FIELDS.length - 1 ? `1px solid ${G100}` : 'none' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: BD }}>{f.field}</span>
                    </td>
                    <td style={{ ...tdStyle, borderBottom: i < SCHEMA_FIELDS.length - 1 ? `1px solid ${G100}` : 'none' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: BLUE, background: BLUE_BG, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{f.type}</span>
                    </td>
                    <td style={{ ...tdStyle, borderBottom: i < SCHEMA_FIELDS.length - 1 ? `1px solid ${G100}` : 'none' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: GRN_BG, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{hi ? 'अनिवार्य' : 'Required'}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: G600, borderBottom: i < SCHEMA_FIELDS.length - 1 ? `1px solid ${G100}` : 'none' }}>{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: BD, marginBottom: 12 }}>{hi ? 'इवेंट श्रेणियां और प्रकार' : 'Event Categories & Types'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {CATEGORIES.map((c) => (
            <div key={c.label} style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 11, color: G600, lineHeight: 1.9, fontFamily: 'monospace', whiteSpace: 'pre-line' }}>{c.events}</div>
            </div>
          ))}
        </div>

        <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BD, padding: '12px 16px', background: G50, borderBottom: `1px solid ${G100}` }}>
            {hi ? 'Sprint 2 AI चैटबॉट क्वेरी आयाम — AC-09.8' : 'Sprint 2 AI Chatbot Query Dimensions — AC-09.8'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(hi ? ['क्वेरी आयाम', 'स्कीमा फ़ील्ड', 'चैटबॉट प्रश्न उदाहरण'] : ['Query Dimension', 'Schema Field', 'Example Chatbot Question']).map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AI_DIMS.map((r, i) => (
                <tr key={r.dim}>
                  <td style={{ ...tdStyle, fontWeight: 700, fontSize: 12, borderBottom: i < AI_DIMS.length - 1 ? `1px solid ${G100}` : 'none' }}>{r.dim}</td>
                  <td style={{ ...tdStyle, borderBottom: i < AI_DIMS.length - 1 ? `1px solid ${G100}` : 'none' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: BD }}>{r.field}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: G600, borderBottom: i < AI_DIMS.length - 1 ? `1px solid ${G100}` : 'none' }}>{r.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const TABS: { key: 'log' | 'schema'; label: string }[] = [
    { key: 'log',    label: hi ? '📋 गतिविधि लॉग' : '📋 Activity Log' },
    { key: 'schema', label: hi ? '📐 इवेंट स्कीमा' : '📐 Event Schema' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: G50, overflow: 'hidden' }}>
      <AppSidebar activeRoute="/audit-log" />
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ height: 56, background: WHITE, borderBottom: `1px solid ${G100}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: BD }}>📜 {hi ? 'ऑडिट लॉग' : 'Audit Log'}</span>
          <LanguageToggle />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => alert('CSV export is available in Sprint 2')}
            style={{ padding: '7px 14px', background: G50, color: BD, border: `1px solid ${G200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {hi ? '📊 CSV निर्यात' : '📊 Export CSV'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ background: WHITE, borderBottom: `1px solid ${G100}`, padding: '0 18px', display: 'flex', gap: 4, flexShrink: 0 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: tab === t.key ? `2px solid ${BD}` : '2px solid transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? BD : G400, fontFamily: 'inherit', marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {tab === 'log' && LogView()}
          {tab === 'schema' && SchemaView()}
        </div>

      </div>
    </div>
  )
}
