import { useMemo, useState } from 'react'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguageStore } from '../store/languageStore'
import { useBillStore } from '../store/billStore'
import { useAuthStore } from '../store/authStore'
import type { BillRecord } from '../store/billStore'

type Tab = 'today' | 'week' | 'month' | 'custom' | 'topitems' | 'tableperf' | 'staffperf' | 'gst'
type TopMode = 'qty' | 'rev'

// Design tokens (match other pages)
const BD = '#3B1F0E'
const BM = '#7C4A1E'
const GOLD = '#D4A017'
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

// ── Pure helpers (outside component) ────────────────────────────────────────

function inr(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function pctChg(curr: number, prev: number): { label: string; dir: 'up' | 'down' | 'flat' } {
  if (prev === 0 && curr === 0) return { label: '—', dir: 'flat' }
  if (prev === 0) return { label: 'New', dir: 'up' }
  const d = ((curr - prev) / prev) * 100
  if (Math.abs(d) < 0.05) return { label: '±0%', dir: 'flat' }
  return { label: `${d > 0 ? '+' : ''}${d.toFixed(1)}%`, dir: d > 0 ? 'up' : 'down' }
}

function dayStart(ts: number): number {
  const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime()
}

function weekStart(ts: number): number {
  const d = new Date(ts)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function monthStart(ts: number): number {
  const d = new Date(ts); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime()
}

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

interface Range { from: number; to: number }
interface PeriodDef { curr: Range; prev: Range; compareLabel: string }

function periodDef(kind: 'today' | 'week' | 'month', now: number): PeriodDef {
  if (kind === 'today') {
    const from = dayStart(now)
    return { curr: { from, to: now }, prev: { from: from - WEEK_MS, to: from - WEEK_MS + DAY_MS }, compareLabel: 'vs last week same day' }
  }
  if (kind === 'week') {
    const from = weekStart(now)
    return { curr: { from, to: now }, prev: { from: from - WEEK_MS, to: from }, compareLabel: 'vs prev week' }
  }
  // month
  const from = monthStart(now)
  const pm = new Date(from); pm.setMonth(pm.getMonth() - 1)
  return { curr: { from, to: now }, prev: { from: pm.getTime(), to: from }, compareLabel: 'vs prev month' }
}

const CHART_HOURS = [9,10,11,12,13,14,15,16,17,18,19,20,21]
const CHART_LABELS = ['9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm']

function computeHourly(bills: BillRecord[]) {
  const m: Record<number, number> = {}
  CHART_HOURS.forEach(h => { m[h] = 0 })
  for (const b of bills) {
    const h = new Date(b.billedAt).getHours()
    if (h >= 9 && h <= 21) m[h] += b.grandTotal
  }
  return CHART_HOURS.map((h, i) => ({ h, label: CHART_LABELS[i], value: m[h] }))
}

function computeKPI(bills: BillRecord[]) {
  const revenue = bills.reduce((s, b) => s + b.grandTotal, 0)
  const billCount = bills.length
  const avgBill = billCount > 0 ? revenue / billCount : 0
  const gst = bills.reduce((s, b) => s + b.cgst + b.sgst, 0)
  return { revenue, billCount, avgBill, gst }
}

// ── Component ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('today')
  const [topMode, setTopMode] = useState<TopMode>('qty')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [customApplied, setCustomApplied] = useState(false)

  const allBills = useBillStore(s => s.bills)
  const user = useAuthStore(s => s.user)
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const settled = useMemo(() => allBills.filter(b => b.status === 'settled'), [allBills])

  // Stable "now" so period boundaries don't shift on re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [])

  const todayDef  = useMemo(() => periodDef('today', now), [now])
  const weekDef   = useMemo(() => periodDef('week',  now), [now])
  const monthDef  = useMemo(() => periodDef('month', now), [now])

  // Active period definition for period tabs
  const customDef = useMemo((): PeriodDef | null => {
    if (!customApplied || !customFrom || !customTo) return null
    const from = new Date(customFrom + 'T00:00:00').getTime()
    const to   = new Date(customTo   + 'T23:59:59').getTime()
    if (isNaN(from) || isNaN(to) || from > to) return null
    const len = to - from
    return { curr: { from, to }, prev: { from: from - len, to: from }, compareLabel: 'vs equivalent prior period' }
  }, [customApplied, customFrom, customTo])

  const activeDef = useMemo((): PeriodDef | null => {
    if (tab === 'today') return todayDef
    if (tab === 'week')  return weekDef
    if (tab === 'month') return monthDef
    if (tab === 'custom') return customDef
    return null
  }, [tab, todayDef, weekDef, monthDef, customDef])

  const periodBills = useMemo(() => {
    if (!activeDef) return []
    return settled.filter(b => b.billedAt >= activeDef.curr.from && b.billedAt <= activeDef.curr.to)
  }, [settled, activeDef])

  const prevBills = useMemo(() => {
    if (!activeDef) return []
    return settled.filter(b => b.billedAt >= activeDef.prev.from && b.billedAt < activeDef.prev.to)
  }, [settled, activeDef])

  const kpi     = useMemo(() => computeKPI(periodBills), [periodBills])
  const prevKpi = useMemo(() => computeKPI(prevBills),   [prevBills])
  const hourly  = useMemo(() => computeHourly(periodBills), [periodBills])

  const periodLabel = useMemo(() => {
    const locale = hi ? 'hi-IN' : 'en-IN'
    const fmt = (ts: number) => new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    if (tab === 'today')  return hi
      ? `आज — ${new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
      : `Today — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    if (tab === 'week')   return hi ? `इस सप्ताह — ${fmt(weekDef.curr.from)} से ${fmt(now)}` : `This Week — ${fmt(weekDef.curr.from)} to ${fmt(now)}`
    if (tab === 'month')  return hi
      ? `इस माह — ${new Date().toLocaleDateString('hi-IN', { month: 'long', year: 'numeric' })}`
      : `This Month — ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
    if (tab === 'custom' && customDef) return hi ? `कस्टम — ${customFrom} से ${customTo}` : `Custom — ${customFrom} to ${customTo}`
    return ''
  }, [tab, weekDef, now, customDef, customFrom, customTo, hi])

  // Top items: always this week vs prev week
  const topWeekBills = useMemo(() => settled.filter(b => b.billedAt >= weekDef.curr.from), [settled, weekDef])
  const topPrevBills = useMemo(() => settled.filter(b => b.billedAt >= weekDef.prev.from && b.billedAt < weekDef.prev.to), [settled, weekDef])

  const allTopItems = useMemo(() => {
    const agg = (bs: BillRecord[]) => {
      const m: Record<string, { name: string; emoji: string; qty: number; rev: number }> = {}
      for (const b of bs) {
        const cs = new Set(b.compIds)
        for (const l of b.lines) {
          if (cs.has(l.id)) continue
          if (!m[l.menuItemId]) m[l.menuItemId] = { name: l.name, emoji: l.emoji, qty: 0, rev: 0 }
          m[l.menuItemId].qty += l.qty
          m[l.menuItemId].rev += l.price * l.qty
        }
      }
      return m
    }
    const curr = agg(topWeekBills)
    const prev = agg(topPrevBills)
    return Object.entries(curr).map(([id, v]) => ({
      id, ...v, prevQty: prev[id]?.qty ?? 0, prevRev: prev[id]?.rev ?? 0,
    }))
  }, [topWeekBills, topPrevBills])

  // Table performance: all time
  const tablePerf = useMemo(() => {
    const m: Record<string, { name: string; rev: number; count: number }> = {}
    for (const b of settled) {
      if (!m[b.tableId]) m[b.tableId] = { name: b.tableName, rev: 0, count: 0 }
      m[b.tableId].rev   += b.grandTotal
      m[b.tableId].count += 1
    }
    const arr = Object.entries(m).map(([id, v]) => ({ tableId: id, ...v })).sort((a, b) => b.rev - a.rev)
    const maxRev = arr[0]?.rev ?? 1
    return arr.map(r => ({ ...r, bar: Math.round((r.rev / maxRev) * 100) }))
  }, [settled])

  // Staff stats: all settled bills (owner)
  const staffStats = useMemo(() => computeKPI(settled), [settled])

  // GST report: current month
  const monthBills = useMemo(() => settled.filter(b => b.billedAt >= monthDef.curr.from), [settled, monthDef])
  const gstData = useMemo(() => ({
    netSales: monthBills.reduce((s, b) => s + b.taxable, 0),
    cgst:     monthBills.reduce((s, b) => s + b.cgst, 0),
    sgst:     monthBills.reduce((s, b) => s + b.sgst, 0),
    get total() { return this.cgst + this.sgst },
    billCount: monthBills.length,
  }), [monthBills])

  // ── Shared sub-renders (called as functions, not JSX components) ──────────

  function KpiCards() {
    const cards = [
      { label: hi ? 'कुल आमदनी' : 'Total Revenue',   value: inr(kpi.revenue),  chg: pctChg(kpi.revenue,  prevKpi.revenue)  },
      { label: hi ? 'कुल बिल' : 'Bills Generated',   value: String(kpi.billCount), chg: pctChg(kpi.billCount, prevKpi.billCount) },
      { label: hi ? 'औसत बिल' : 'Avg Bill Value',    value: kpi.billCount > 0 ? inr(kpi.avgBill) : '—', chg: pctChg(kpi.avgBill, prevKpi.avgBill) },
      { label: hi ? 'जीएसटी संग्रह' : 'GST Collected', value: inr(kpi.gst), chg: { label: '5% (CGST + SGST)', dir: 'flat' as const } },
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: G400, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: BD, lineHeight: 1 }}>{c.value}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 20, marginTop: 6, background: c.chg.dir === 'up' ? GRN_BG : c.chg.dir === 'down' ? RED_BG : G100, color: c.chg.dir === 'up' ? GREEN : c.chg.dir === 'down' ? RED : G400 }}>
              {c.chg.dir === 'up' ? '▲' : c.chg.dir === 'down' ? '▼' : '—'} {c.chg.label}
            </div>
          </div>
        ))}
      </div>
    )
  }

  function HourlyChart() {
    const maxVal = Math.max(...hourly.map(h => h.value), 1)
    const peakH  = hourly.reduce((m, h) => h.value > m.value ? h : m, hourly[0])
    const isEmpty = hourly.every(h => h.value === 0)
    const CHART_H = 120

    return (
      <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: '18px 18px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: BD, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{hi ? 'घंटेवार आमदनी' : 'Revenue by Hour of Day'}</span>
          {!isEmpty && <span style={{ fontSize: 11, color: G400, fontWeight: 400 }}>{hi ? 'गोल्ड = पीक घंटा' : 'Gold bar = peak hour'}</span>}
        </div>
        {isEmpty ? (
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G400, fontSize: 13 }}>
            {hi ? 'इस अवधि में कोई आमदनी नहीं' : 'No revenue data for this period yet'}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: CHART_H, borderBottom: `1px solid ${G100}` }}>
              {hourly.map(({ h, value }) => {
                const px   = value > 0 ? Math.max(4, Math.round((value / maxVal) * (CHART_H - 22))) : 3
                const lbl  = value >= 1000 ? `₹${(value / 1000).toFixed(1)}k` : value > 0 ? `₹${value}` : ''
                const peak = h === peakH.h && value > 0
                return (
                  <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    {lbl && <span style={{ fontSize: 9, color: G400, marginBottom: 2, whiteSpace: 'nowrap' }}>{lbl}</span>}
                    <div style={{ width: '100%', height: px, borderRadius: '3px 3px 0 0', background: peak ? GOLD : BM, minHeight: 3 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {hourly.map(({ h, label }) => (
                <span key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: G400 }}>{label}</span>
              ))}
            </div>
            {peakH.value > 0 && (
              <div style={{ fontSize: 11, color: G400, marginTop: 8 }}>
                Peak: {CHART_LABELS[CHART_HOURS.indexOf(peakH.h)]} ({inr(peakH.value)}) · {activeDef?.compareLabel ?? ''}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  function PeriodView() {
    return (
      <div>
        {periodLabel && (
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: BD }}>{periodLabel}</span>
          </div>
        )}
        {KpiCards()}
        {HourlyChart()}
      </div>
    )
  }

  function CustomRangeView() {
    const todayStr = new Date().toISOString().slice(0, 10)
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: BD }}>{hi ? 'कस्टम दिनांक सीमा' : 'Custom Date Range'}</div>
          <div style={{ fontSize: 12, color: G400, marginTop: 3 }}>{hi ? 'किसी भी अवधि के लिए विश्लेषण देखें' : 'Select any window to load analytics for that period'}</div>
        </div>
        <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 24, maxWidth: 500, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: G600 }}>{hi ? 'शुरू तारीख' : 'From Date'}</label>
              <input
                type="date"
                value={customFrom}
                max={todayStr}
                onChange={e => { setCustomFrom(e.target.value); setCustomApplied(false) }}
                style={{ padding: '9px 12px', border: `1.5px solid ${G200}`, borderRadius: 8, fontSize: 13, color: BD, background: G50, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: G600 }}>{hi ? 'समाप्त तारीख' : 'To Date'}</label>
              <input
                type="date"
                value={customTo}
                max={todayStr}
                onChange={e => { setCustomTo(e.target.value); setCustomApplied(false) }}
                style={{ padding: '9px 12px', border: `1.5px solid ${G200}`, borderRadius: 8, fontSize: 13, color: BD, background: G50, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <button
            onClick={() => { if (customFrom && customTo && customFrom <= customTo) setCustomApplied(true) }}
            style={{ padding: '9px 20px', background: BD, color: WHITE, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {hi ? 'लागू करें →' : 'Apply Range →'}
          </button>
          {!customApplied && (
            <div style={{ marginTop: 18, background: G50, border: `1.5px dashed ${G200}`, borderRadius: 10, padding: 28, textAlign: 'center', color: G400, fontSize: 13, lineHeight: 1.8 }}>
              {hi ? <>📊 ऊपर तारीख चुनें और <strong>लागू करें</strong> पर क्लिक करें।<br />चुनी अवधि के KPI और घंटेवार आमदनी दिखेगी।</> : <>📊 Select a date range above and click <strong>Apply Range</strong>.<br />Shows KPI cards and hourly revenue chart for the chosen window.</>}
            </div>
          )}
        </div>
        {customApplied && customDef && PeriodView()}
      </div>
    )
  }

  function TopItemsView() {
    const sorted = [...allTopItems]
      .sort((a, b) => topMode === 'qty' ? b.qty - a.qty : b.rev - a.rev)
      .slice(0, 10)

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: BD }}>{hi ? 'टॉप 10 वस्तु — इस सप्ताह' : 'Top 10 Items — This Week'}</div>
            <div style={{ fontSize: 12, color: G400, marginTop: 3 }}>{hi ? 'पिछले 7 दिनों से तुलना' : 'Week-on-week change vs. previous 7 days'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: G100, borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {(['qty', 'rev'] as TopMode[]).map(m => (
            <button
              key={m}
              onClick={() => setTopMode(m)}
              style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: topMode === m ? BD : G400, background: topMode === m ? WHITE : 'transparent', boxShadow: topMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}
            >
              {m === 'qty' ? (hi ? 'मात्रा से' : 'By Quantity Sold') : (hi ? 'आमदनी से' : 'By Revenue')}
            </button>
          ))}
        </div>
        {sorted.length === 0 ? (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 40, textAlign: 'center', color: G400, fontSize: 14 }}>
            {hi ? 'इस सप्ताह कोई बिक्री नहीं' : 'No items sold this week yet'}
          </div>
        ) : (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>
                  {(hi ? ['#', 'वस्तु', 'बेची मात्रा', 'आमदनी', 'बदलाव'] : ['#', 'Item', 'Qty Sold', 'Revenue', 'WoW Change']).map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: G50, color: G400, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${G100}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => {
                  const chg = topMode === 'qty' ? pctChg(item.qty, item.prevQty) : pctChg(item.rev, item.prevRev)
                  return (
                    <tr key={item.id} style={{ borderBottom: i < sorted.length - 1 ? `1px solid ${G100}` : 'none' }}>
                      <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: G400, width: 36 }}>{i + 1}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 600, color: BD, fontSize: 13 }}>{item.emoji} {item.name}</div>
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{item.qty}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(item.rev)}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: chg.dir === 'up' ? GRN_BG : chg.dir === 'down' ? RED_BG : G100, color: chg.dir === 'up' ? GREEN : chg.dir === 'down' ? RED : G400 }}>
                          {chg.dir === 'up' ? '▲' : chg.dir === 'down' ? '▼' : '—'} {chg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function TablePerfView() {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: BD }}>{hi ? 'टेबल प्रदर्शन — सभी समय' : 'Table Performance — All Time'}</div>
          <div style={{ fontSize: 12, color: G400, marginTop: 3 }}>{hi ? 'सभी चुकाए बिल में प्रति टेबल आमदनी और बिल' : 'Revenue and bills generated per table across all settled bills'}</div>
        </div>
        {tablePerf.length === 0 ? (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 40, textAlign: 'center', color: G400, fontSize: 14 }}>
            {hi ? 'अभी कोई बिल नहीं' : 'No settled bills recorded yet'}
          </div>
        ) : (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr>
                  {(hi ? ['टेबल', 'कुल आमदनी', 'बिल', 'औसत/बिल', 'हिस्सेदारी'] : ['Table', 'Total Revenue', 'Bills', 'Avg / Bill', 'Revenue Share']).map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: G50, color: G400, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${G100}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablePerf.map((t, i) => (
                  <tr key={t.tableId} style={{ borderBottom: i < tablePerf.length - 1 ? `1px solid ${G100}` : 'none' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: BD, fontSize: 13 }}>{t.name}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(t.rev)}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13 }}>{t.count}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: G600 }}>{inr(t.count > 0 ? t.rev / t.count : 0)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: G100, borderRadius: 3, flexShrink: 0 }}>
                          <div style={{ width: `${t.bar}%`, height: '100%', borderRadius: 3, background: BM }} />
                        </div>
                        <span style={{ fontSize: 11, color: G400 }}>{t.bar}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function StaffPerfView() {
    const cafeName = user?.cafeName ?? 'My Cafe'
    const initials = cafeName.slice(0, 2).toUpperCase()
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: BD }}>{hi ? 'स्टाफ प्रदर्शन — सभी समय' : 'Staff Performance — All Time'}</div>
          <div style={{ fontSize: 12, color: G400, marginTop: 3 }}>{hi ? 'बिल और आमदनी · Staff & PINs सेट होने पर विस्तृत रिपोर्ट' : 'Bills and revenue handled · Per-staff breakdown available once Staff & PINs is set up'}</div>
        </div>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#2563EB' }}>
          ℹ️ All bills are currently attributed to the cafe owner. Add staff members under Staff &amp; PINs to see per-person analytics.
        </div>
        {settled.length === 0 ? (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 40, textAlign: 'center', color: G400, fontSize: 14 }}>
            {hi ? 'अभी कोई बिल नहीं' : 'No settled bills recorded yet'}
          </div>
        ) : (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>
                  {(hi ? ['स्टाफ', 'बिल', 'आमदनी', 'औसत बिल'] : ['Staff Member', 'Bills Generated', 'Revenue Handled', 'Avg Bill']).map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: G50, color: G400, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${G100}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: BM, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: BD, fontSize: 13 }}>{cafeName}</div>
                        <div style={{ fontSize: 11, color: G400 }}>{hi ? 'मालिक' : 'Owner'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{staffStats.billCount}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(staffStats.revenue)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: G600 }}>{staffStats.billCount > 0 ? inr(staffStats.avgBill) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function GstReportView() {
    const monthName = new Date().toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { month: 'long', year: 'numeric' })
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ padding: '6px 14px', background: BD, color: WHITE, borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            📅 {monthName}
          </span>
          <span style={{ fontSize: 12, color: G400 }}>{hi ? `सीजीएसटी + एसजीएसटी · इस माह ${gstData.billCount} बिल चुकाए` : `CGST + SGST breakdown · ${gstData.billCount} settled bills this month`}</span>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {([['📄 Export PDF', '📄 PDF निर्यात'], ['📊 Export CSV', '📊 CSV निर्यात']] as const).map(([en, hiLabel]) => (
              <button
                key={en}
                onClick={() => alert(`${en.includes('PDF') ? 'PDF' : 'CSV'} export — available in Sprint 2`)}
                style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${G200}`, background: WHITE, fontSize: 12, fontWeight: 600, color: G600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {hi ? hiLabel : en}
              </button>
            ))}
          </div>
        </div>
        {gstData.billCount === 0 ? (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, padding: 40, textAlign: 'center', color: G400, fontSize: 14 }}>
            {hi ? 'इस माह कोई बिल नहीं' : 'No bills settled this month yet'}
          </div>
        ) : (
          <div style={{ background: WHITE, border: `1px solid ${G100}`, borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr>
                  {(hi ? ['श्रेणी', 'जीएसटी दर', 'शुद्ध बिक्री', 'सीजीएसटी 2.5%', 'एसजीएसटी 2.5%', 'कुल जीएसटी'] : ['Category', 'GST Rate', 'Net Sales (ex-GST)', 'CGST 2.5%', 'SGST 2.5%', 'Total GST']).map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: G50, color: G400, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${G100}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `2px solid ${G200}` }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: BD, fontSize: 13 }}>{hi ? 'सभी श्रेणियां' : 'All Categories'}</td>
                  <td style={{ padding: '11px 14px', color: G400, fontSize: 13 }}>5%</td>
                  <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13 }}>{inr(gstData.netSales)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: BM, fontSize: 13 }}>{inr(gstData.cgst)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: BM, fontSize: 13 }}>{inr(gstData.sgst)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(gstData.total)}</td>
                </tr>
                <tr style={{ background: G50 }}>
                  <td colSpan={2} style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{hi ? 'कुल योग' : 'TOTAL'}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(gstData.netSales)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(gstData.cgst)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(gstData.sgst)}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: BD, fontSize: 13 }}>{inr(gstData.total)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: '10px 14px', fontSize: 11, color: G400, borderTop: `1px solid ${G100}` }}>
              ℹ️ Category-level breakdown (Hot Beverages, Snacks, etc.) will be available once menu categories are configured.
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Tab definitions ──────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string }[] = [
    { key: 'today',     label: hi ? 'आज'                 : 'Today'        },
    { key: 'week',      label: hi ? 'इस सप्ताह'          : 'This Week'    },
    { key: 'month',     label: hi ? 'इस माह'             : 'This Month'   },
    { key: 'custom',    label: hi ? 'कस्टम'              : 'Custom Range' },
    { key: 'topitems',  label: hi ? '🔝 टॉप वस्तु'       : '🔝 Top Items' },
    { key: 'tableperf', label: hi ? '🪑 टेबल प्रदर्शन'   : '🪑 Table Perf'},
    { key: 'staffperf', label: hi ? '👷 स्टाफ'           : '👷 Staff'     },
    { key: 'gst',       label: hi ? '🧾 जीएसटी रिपोर्ट' : '🧾 GST Report'},
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', background: G50, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <AppSidebar activeRoute="/analytics" />

      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ height: 56, background: WHITE, borderBottom: `1px solid ${G100}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: BD }}>📈 {hi ? 'विश्लेषण' : 'Analytics'}</span>
          <LanguageToggle />
          <div style={{ flex: 1 }} />
          {([['📄 Export PDF', '📄 PDF निर्यात'], ['📊 Export CSV', '📊 CSV निर्यात']] as const).map(([en, hiLabel]) => (
            <button
              key={en}
              onClick={() => alert(`${en.includes('PDF') ? 'PDF' : 'CSV'} export — available in Sprint 2`)}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${G200}`, background: G50, color: BD, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {hi ? hiLabel : en}
            </button>
          ))}
        </div>

        {/* Tab strip */}
        <div style={{ background: WHITE, borderBottom: `1px solid ${G100}`, padding: '0 18px', display: 'flex', gap: 0, overflowX: 'auto', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ padding: '12px 16px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? BD : G400, borderBottom: tab === t.key ? `2px solid ${BD}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {tab === 'today'     && PeriodView()}
          {tab === 'week'      && PeriodView()}
          {tab === 'month'     && PeriodView()}
          {tab === 'custom'    && CustomRangeView()}
          {tab === 'topitems'  && TopItemsView()}
          {tab === 'tableperf' && TablePerfView()}
          {tab === 'staffperf' && StaffPerfView()}
          {tab === 'gst'       && GstReportView()}
        </div>
      </div>
    </div>
  )
}
