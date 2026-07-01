import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useAuthStore } from '../store/authStore'
import { useTableStore } from '../store/tableStore'
import { useBillStore } from '../store/billStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useAuditStore } from '../store/auditStore'
import { useLanguageStore } from '../store/languageStore'
import { apiFetch } from '../lib/api'

const CGST = 0.025
const SGST = 0.025

type DiscType = 'none' | 'flat' | 'pct'
type PayMode = 'upi' | 'cash' | 'card'
type Stage = 'billing' | 'settled' | 'voided'
type ModalType = 'none' | 'settle' | 'void' | 'eod'

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

function fmt(n: number) { return `₹${n.toFixed(2)}` }

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
}

// ── QR pixel art (static decorative) ───────────────────────────────────────
const QR_PATTERN = [
  1,1,1,0,0,1,1, 1,0,1,1,0,1,0, 1,0,1,0,1,0,1, 0,1,0,1,1,1,0,
  1,0,1,0,1,0,1, 1,1,0,1,0,0,1, 1,1,1,0,1,1,0, 0,0,1,1,0,1,1,
  1,0,0,1,1,0,1, 1,1,0,0,0,1,0, 0,1,1,1,0,0,1, 1,0,1,0,1,1,0,
  1,1,0,1,0,0,1, 0,1,1,0,1,0,0, 1,0,0,1,1,1,1, 1,1,1,1,0,0,0,
  0,0,1,0,1,0,1, 1,0,0,1,0,1,0, 0,1,1,0,1,1,1, 1,0,1,1,0,0,1,
  0,1,0,0,1,0,0, 1,1,0,1,0,1,1, 1,0,1,0,0,1,0, 0,1,1,1,0,0,1,
  1,0,0,0,1,1,0, 0,1,1,0,0,1,1, 1,1,0,1,1,0,0, 0,0,1,0,1,0,1,
]

// ── Modal helpers ────────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.45)', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// ── EOD Modal ────────────────────────────────────────────────────────────────
function EODModal({ onClose }: { onClose: () => void }) {
  const billStore = useBillStore()
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const start = todayStart()
  const todayBills = billStore.bills.filter((b) => b.settledAt >= start && b.status === 'settled')
  const totalRevenue = todayBills.reduce((s, b) => s + b.grandTotal, 0)
  const totalGst = todayBills.reduce((s, b) => s + b.cgst + b.sgst, 0)
  const totalDisc = todayBills.reduce((s, b) => s + b.discountAmt, 0)
  const byMode = { upi: 0, cash: 0, card: 0 }
  const byModeAmt = { upi: 0, cash: 0, card: 0 }
  todayBills.forEach((b) => { byMode[b.payMode]++; byModeAmt[b.payMode] += b.grandTotal })

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const discBillCount = todayBills.filter(b => b.discountAmt > 0).length

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{hi ? 'दिन का सारांश' : 'End-of-Day Summary'}</div>
          <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{today}</div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            {
              label: hi ? 'कुल राजस्व' : 'Total Revenue',
              val: fmt(totalRevenue),
              sub: hi ? `${todayBills.length} बिल निपटाए` : `${todayBills.length} bills settled`,
              color: C.green,
            },
            {
              label: hi ? 'बिल बनाए' : 'Bills Generated',
              val: String(todayBills.length),
              sub: todayBills.length ? (hi ? `औसत ${fmt(totalRevenue / todayBills.length)}/बिल` : `Avg ${fmt(totalRevenue / todayBills.length)}/bill`) : '—',
              color: C.brownDark,
            },
            {
              label: hi ? 'GST संग्रहित' : 'GST Collected',
              val: fmt(totalGst),
              sub: `CGST ${fmt(totalGst / 2)} + SGST ${fmt(totalGst / 2)}`,
              color: C.amber,
            },
            {
              label: hi ? 'दी गई छूट' : 'Discounts Given',
              val: fmt(totalDisc),
              sub: hi ? `${discBillCount} बिल में` : `Across ${discBillCount} bills`,
              color: C.brownDark,
            },
          ].map((card) => (
            <div key={card.label} style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color, marginTop: 4 }}>{card.val}</div>
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {[
                  hi ? 'भुगतान विधि' : 'Payment Mode',
                  hi ? 'बिल' : 'Bills',
                  hi ? 'राशि' : 'Amount',
                  '%',
                ].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '7px 12px', background: C.gray50, color: C.gray400, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([['💳 UPI', 'upi'], [hi ? '💵 नकद' : '💵 Cash', 'cash'], [hi ? '🏦 कार्ड' : '🏦 Card', 'card']] as [string, PayMode][]).map(([label, mode]) => (
                <tr key={mode}>
                  <td style={{ padding: '8px 12px', borderTop: `1px solid ${C.gray100}`, color: C.brownDark, fontWeight: 500 }}>{label}</td>
                  <td style={{ padding: '8px 12px', borderTop: `1px solid ${C.gray100}`, color: C.brownDark }}>{byMode[mode]}</td>
                  <td style={{ padding: '8px 12px', borderTop: `1px solid ${C.gray100}`, color: C.brownDark }}>{fmt(byModeAmt[mode])}</td>
                  <td style={{ padding: '8px 12px', borderTop: `1px solid ${C.gray100}`, color: C.brownDark }}>{totalRevenue > 0 ? Math.round((byModeAmt[mode] / totalRevenue) * 100) + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {[
            hi ? '📄 PDF निर्यात' : '📄 Export PDF',
            hi ? '📊 CSV निर्यात' : '📊 Export CSV',
            hi ? '📱 WhatsApp सारांश' : '📱 WhatsApp Summary',
          ].map((label) => (
            <button key={label} onClick={() => alert('Export available in Sprint 2')} style={{ flex: 1, padding: '9px 6px', borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', fontSize: 11, fontWeight: 600, color: C.gray600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function BillingPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const tableStore = useTableStore()
  const billStore = useBillStore()
  const ob = useOnboardingStore()
  const inventoryStore = useInventoryStore()

  const table = tableStore.tables.find((t) => t.id === tableId)

  // ── local state ────────────────────────────────────────────────────────────
  const [compIds, setCompIds] = useState<Set<string>>(new Set())
  const [discType, setDiscType] = useState<DiscType>('none')
  const [discVal, setDiscVal] = useState(0)
  const [discInput, setDiscInput] = useState('')
  const [payMode, setPayMode] = useState<PayMode>('upi')
  const [cashReceived, setCashReceived] = useState('')
  const [modal, setModal] = useState<ModalType>('none')
  const [stage, setStage] = useState<Stage>('billing')
  const [settledBillId, setSettledBillId] = useState('')
  const [settledMode, setSettledMode] = useState<PayMode>('upi')
  const [settledAt, setSettledAt] = useState(0)
  const [voidPin, setVoidPin] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [voidError, setVoidError] = useState('')
  const [settledApiBillId, setSettledApiBillId] = useState('')
  const billNumRef = useRef(`BILL-${String(billStore.nextSeq).padStart(4, '0')}`)

  // After settling, tableStore.settle() clears orderLines — read from the saved bill instead
  const _settledBill = stage === 'settled' && settledBillId
    ? billStore.bills.find((b) => b.id === settledBillId)
    : undefined
  const lines = _settledBill?.lines ?? (table?.orderLines ?? [])

  // ── guard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth', { replace: true }); return }
    if (stage === 'billing' && (!table || table.status !== 'bill-pending')) {
      navigate('/tables', { replace: true })
    }
  }, [isAuthenticated, table, stage, navigate])

  // ── totals ─────────────────────────────────────────────────────────────────
  function calcTotals() {
    const subtotal = lines.reduce((s, l) => compIds.has(l.id) ? s : s + l.price * l.qty, 0)
    let discountAmt = 0
    if (discType === 'flat') discountAmt = Math.min(discVal, subtotal)
    if (discType === 'pct') discountAmt = subtotal * (discVal / 100)
    discountAmt = Math.round(discountAmt * 100) / 100
    const taxable = Math.max(0, subtotal - discountAmt)
    const cgst = Math.round(taxable * CGST * 100) / 100
    const sgst = Math.round(taxable * SGST * 100) / 100
    const grandTotal = Math.round((taxable + cgst + sgst) * 100) / 100
    return { subtotal, discountAmt, taxable, cgst, sgst, gst: cgst + sgst, grandTotal }
  }

  const rawTotals = calcTotals()
  const totals = _settledBill
    ? {
        subtotal: _settledBill.subtotal,
        discountAmt: _settledBill.discountAmt,
        taxable: _settledBill.taxable,
        cgst: _settledBill.cgst,
        sgst: _settledBill.sgst,
        gst: _settledBill.cgst + _settledBill.sgst,
        grandTotal: _settledBill.grandTotal,
      }
    : rawTotals

  // ── actions ────────────────────────────────────────────────────────────────
  function toggleComp(lineId: string) {
    setCompIds((prev) => {
      const next = new Set(prev)
      next.has(lineId) ? next.delete(lineId) : next.add(lineId)
      return next
    })
  }

  function handleDiscType(type: DiscType) {
    setDiscType(type)
    setDiscVal(0)
    setDiscInput('')
  }

  function handleDiscInput(val: string) {
    setDiscInput(val)
    setDiscVal(parseFloat(val) || 0)
  }

  async function handleSettle() {
    const t = calcTotals()
    const now = Date.now()
    const apiBillId = table?.billId  // capture before settle() clears it

    if (apiBillId) {
      try {
        await apiFetch('POST', `/billing/${apiBillId}/settle`, {
          paymentMode: payMode,
          cashTendered: payMode === 'cash' ? parseFloat(cashReceived) || undefined : undefined,
          discountValue: discVal,
          discountType: discType === 'none' ? undefined : discType === 'pct' ? 'percent' : 'flat',
          compLineIds: [],
        })
      } catch {
        // non-fatal: local settle proceeds regardless
      }
    }

    const id = billStore.addBill({
      tableId: table!.id,
      tableName: table!.name,
      customerName: table!.customerName,
      guests: table!.guests,
      lines: lines.map((l) => ({ ...l })),
      compIds: [...compIds],
      discType, discVal, payMode,
      subtotal: t.subtotal,
      discountAmt: t.discountAmt,
      taxable: t.taxable,
      cgst: t.cgst,
      sgst: t.sgst,
      grandTotal: t.grandTotal,
      billedAt: table!.openedAt ?? now,
      settledAt: now,
      status: 'settled',
    })
    inventoryStore.deductForBill(lines, [...compIds], id, now)
    tableStore.settle(table!.id)
    useAuditStore.getState().addEvent({
      eventType: 'BILL_SETTLED',
      category: 'Billing',
      userId: 'Owner',
      entityType: 'Bill',
      entityId: id,
      payload: {
        bill_id: id,
        table: table!.name,
        amount: t.grandTotal,
        payment_mode: payMode.toUpperCase(),
        gst_amount: t.cgst + t.sgst,
        items_count: lines.length,
        before_state: { status: 'PENDING' },
        after_state: { status: 'SETTLED', settled_at: new Date(now).toISOString() },
      },
      status: 'ok',
      summary: `Bill settled · ₹${Math.round(t.grandTotal).toLocaleString('en-IN')} · ${payMode.toUpperCase()}`,
    })
    setSettledBillId(id)
    setSettledApiBillId(apiBillId ?? '')
    setSettledMode(payMode)
    setSettledAt(now)
    setStage('settled')
    setModal('none')
  }

  async function handleVoid() {
    setVoidError('')
    if (voidPin.length < 4) { setVoidError(hi ? '4 अंकीय PIN डालें' : 'Enter 4-digit PIN'); return }
    if (!voidReason.trim()) { setVoidError(hi ? 'कारण आवश्यक है' : 'Reason is required'); return }
    const now = Date.now()
    const reason = voidReason.trim()

    // API void call — use DB bill ID from the appropriate stage
    const apiBillId = stage === 'settled' ? settledApiBillId : table?.billId
    if (apiBillId) {
      try {
        await apiFetch('POST', `/billing/${apiBillId}/void`, { pin: voidPin, reason })
      } catch {
        // non-fatal: local void proceeds
      }
    }
    if (stage === 'settled' && settledBillId) {
      billStore.voidBill(settledBillId, reason)
      useAuditStore.getState().addEvent({
        eventType: 'BILL_VOIDED',
        category: 'Billing',
        userId: 'Owner',
        entityType: 'Bill',
        entityId: settledBillId,
        payload: {
          void_reason: reason,
          original_bill: {
            bill_id: settledBillId,
            table: table!.name,
            grand_total: totals.grandTotal,
            payment_mode: settledMode.toUpperCase(),
            items: lines.map((l) => ({ name: l.name, qty: l.qty, unit_price: l.price })),
          },
        },
        status: 'warn',
        summary: `Bill voided · ₹${Math.round(totals.grandTotal).toLocaleString('en-IN')} · ${reason.slice(0, 60)}`,
      })
    } else {
      const vid = billStore.addBill({
        tableId: table!.id, tableName: table!.name,
        customerName: table!.customerName, guests: table!.guests,
        lines: lines.map((l) => ({ ...l })), compIds: [...compIds],
        discType, discVal, payMode,
        subtotal: totals.subtotal, discountAmt: totals.discountAmt,
        taxable: totals.taxable, cgst: totals.cgst, sgst: totals.sgst,
        grandTotal: totals.grandTotal,
        billedAt: table!.openedAt ?? now,
        settledAt: now, status: 'voided',
        voidReason: reason, voidedAt: now,
      })
      tableStore.settle(table!.id)
      useAuditStore.getState().addEvent({
        eventType: 'BILL_VOIDED',
        category: 'Billing',
        userId: 'Owner',
        entityType: 'Bill',
        entityId: vid,
        payload: {
          void_reason: reason,
          original_bill: {
            bill_id: vid,
            table: table!.name,
            grand_total: totals.grandTotal,
            items: lines.map((l) => ({ name: l.name, qty: l.qty, unit_price: l.price })),
          },
        },
        status: 'warn',
        summary: `Bill voided · ₹${Math.round(totals.grandTotal).toLocaleString('en-IN')} · ${reason.slice(0, 60)}`,
      })
    }
    setStage('voided')
    setModal('none')
  }

  // ── cash change ────────────────────────────────────────────────────────────
  const cashAmt = parseFloat(cashReceived) || 0
  const cashChange = cashAmt - totals.grandTotal
  const quickCash = (() => {
    const g = totals.grandTotal
    const rounds = [
      Math.ceil(g / 10) * 10,
      Math.ceil(g / 50) * 50,
      Math.ceil(g / 100) * 100,
      Math.ceil(g / 500) * 500,
    ]
    return [...new Set(rounds)].filter((v) => v >= g).slice(0, 4)
  })()

  // ── bill number / dates ───────────────────────────────────────────────────
  const billNum = stage === 'settled' ? settledBillId : billNumRef.current
  const billDate = table?.openedAt ? fmtDate(table.openedAt) : fmtDate(Date.now())
  const billTime = table?.openedAt ? fmtTime(table.openedAt) : fmtTime(Date.now())

  // ── cafe info ─────────────────────────────────────────────────────────────
  const cafeName = ob.cafeName || 'My Cafe'
  const gstin = ob.gstin || ''
  const address = [ob.address, ob.city, ob.pincode].filter(Boolean).join(', ')
  const mobile = ob.mobile || ''
  const ownerName = ob.ownerName || 'Owner'
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const payModeLabel = { upi: 'UPI', cash: hi ? 'नकद' : 'Cash', card: hi ? 'कार्ड' : 'Card' }[stage === 'settled' ? settledMode : payMode]

  if (!table && stage === 'billing') return null

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: C.gray50, overflow: 'hidden' }}>
      <AppSidebar activeRoute="/billing" />

      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'white', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => navigate('/tables')}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: C.gray600 }}
          >←</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.brownDark }}>{hi ? 'बिलिंग / POS' : 'Billing / POS'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 20, fontSize: 12, fontWeight: 600, color: C.amber }}>
            🧾 {table?.name ?? 'Table'}{table?.customerName ? ` · ${table.customerName}` : ''} · {billNum}
          </div>
          <LanguageToggle />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setModal('eod')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: C.amberBg, border: `1px solid ${C.amberBorder}`, fontSize: 12, fontWeight: 600, color: C.amber, cursor: 'pointer' }}
          >{hi ? '📊 दिन सारांश' : '📊 Day Summary'}</button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            ...(stage === 'settled' ? { background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green }
              : stage === 'voided' ? { background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red }
              : { background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green }),
          }}>
            {stage === 'settled'
              ? (hi ? '✅ निपटाया' : '✅ Settled')
              : stage === 'voided'
              ? (hi ? '🚫 रद्द' : '🚫 Voided')
              : (hi ? '🔓 खुला' : '🔓 Open')}
          </div>
        </header>

        {/* Split area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* ── BILL PANEL ── */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
            <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(59,31,14,0.06)', position: 'relative' }}>

              {/* PAID / VOIDED stamps */}
              {stage === 'settled' && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-20deg)', fontSize: 48, fontWeight: 900, color: 'rgba(46,139,87,0.18)', letterSpacing: 4, border: '5px solid rgba(46,139,87,0.18)', padding: '6px 14px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10 }}>{hi ? 'भुगतान ✓' : 'PAID ✓'}</div>
              )}
              {stage === 'voided' && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-20deg)', fontSize: 48, fontWeight: 900, color: 'rgba(220,38,38,0.18)', letterSpacing: 4, border: '5px solid rgba(220,38,38,0.18)', padding: '6px 14px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10 }}>{hi ? 'रद्द' : 'VOIDED'}</div>
              )}

              {/* Cafe header */}
              <div style={{ padding: '20px 24px 16px', textAlign: 'center', borderBottom: `2px dashed ${C.gray200}` }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>☕</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.brownDark, letterSpacing: '-0.5px' }}>
                  {cafeName.slice(0, -3) || cafeName}<span style={{ color: C.gold }}>{cafeName.slice(-3)}</span>
                </div>
                {address && <div style={{ fontSize: 11, color: C.gray400, marginTop: 3, lineHeight: 1.6 }}>{address}{mobile ? `  ·  ${hi ? 'दूरभाष:' : 'Tel:'} ${mobile}` : ''}</div>}
                {gstin && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: C.cream, border: `1px solid ${C.gray200}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: C.brownDark, letterSpacing: '0.5px' }}>
                    <span>GSTIN</span>
                    <strong>{gstin}</strong>
                    <span style={{ fontSize: 10, color: C.green }}>{hi ? '✓ सत्यापित' : '✓ Verified'}</span>
                  </div>
                )}
                {!gstin && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: C.amber }}>
                    {hi ? '⚠️ GSTIN कॉन्फ़िगर नहीं — ऑनबोर्डिंग में जोड़ें' : '⚠️ GSTIN not configured — add in Onboarding'}
                  </div>
                )}
              </div>

              {/* Bill meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', padding: '14px 24px', borderBottom: `1px solid ${C.gray100}`, background: C.gray50 }}>
                {[
                  [hi ? 'बिल #' : 'Bill #', billNum],
                  [hi ? 'तारीख' : 'Date', billDate],
                  [hi ? 'समय' : 'Time', billTime],
                  [hi ? 'टेबल' : 'Table', table?.name ?? '—'],
                  [hi ? 'ग्राहक' : 'Customer', `${table?.customerName || '—'}${table?.guests ? ` (${table.guests} ${hi ? 'अतिथि' : 'pax'})` : ''}`],
                  [hi ? 'कैशियर' : 'Cashier', ownerName],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                    <span style={{ color: C.gray400, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}:</span>
                    <span style={{ color: C.brownDark, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Items table */}
              <div style={{ padding: '14px 24px', borderBottom: `2px dashed ${C.gray200}` }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 80px 80px', gap: 4, paddingBottom: 8, borderBottom: `1px solid ${C.gray200}`, fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>{hi ? 'वस्तु' : 'Item'}</span>
                  <span style={{ textAlign: 'right' }}>{hi ? 'मात्रा' : 'Qty'}</span>
                  <span style={{ textAlign: 'right' }}>{hi ? 'दर' : 'Rate'}</span>
                  <span />
                  <span style={{ textAlign: 'right' }}>{hi ? 'राशि' : 'Amount'}</span>
                </div>

                {/* Rows */}
                {lines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: C.gray400 }}>{hi ? 'इस ऑर्डर में कोई आइटम नहीं' : 'No items on this order'}</div>
                ) : lines.map((line) => {
                  const isComp = compIds.has(line.id)
                  const lineAmt = line.price * line.qty
                  return (
                    <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 80px 80px', gap: 4, padding: '9px 0', borderBottom: `1px solid ${C.gray100}`, alignItems: 'center', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{line.emoji}</span>
                        <div>
                          <span style={{ fontWeight: 600, color: C.brownDark }}>{line.name}</span>
                          {isComp && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '1px 5px', background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 4 }}>COMP</span>}
                          {line.note && <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>📝 {line.note}</div>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', color: C.gray600 }}>×{line.qty}</div>
                      <div style={{ textAlign: 'right', color: C.gray600 }}>{fmt(line.price)}</div>
                      <div>
                        {stage === 'billing' && (
                          <button
                            onClick={() => toggleComp(line.id)}
                            style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                              border: isComp ? `1px solid ${C.blueBorder}` : `1px dashed ${C.gray200}`,
                              background: isComp ? C.blueBg : 'white', cursor: 'pointer',
                              color: isComp ? C.blue : C.gray400, fontFamily: 'inherit', whiteSpace: 'nowrap',
                            }}
                          >{isComp ? (hi ? '★ कॉम्प' : '★ Comp') : (hi ? 'कॉम्प' : 'Comp')}</button>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>
                        {isComp
                          ? <><span style={{ color: C.gray400, textDecoration: 'line-through', marginRight: 4 }}>{fmt(lineAmt)}</span><span style={{ color: C.blue, fontWeight: 700 }}>₹0</span></>
                          : fmt(lineAmt)
                        }
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div style={{ padding: '14px 24px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.gray600, padding: '4px 0' }}>
                  <span>{hi ? 'उप-योग' : 'Subtotal'}</span><span>{fmt(totals.subtotal)}</span>
                </div>
                {totals.discountAmt > 0 && (<>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.green, fontWeight: 600, padding: '4px 0' }}>
                    <span>{hi ? 'छूट' : 'Discount'} {discType === 'flat' ? `(−₹${discVal})` : `(${discVal}%)`}</span>
                    <span>−{fmt(totals.discountAmt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.brownDark, fontWeight: 600, padding: '9px 0 4px', borderTop: `1px solid ${C.gray100}`, marginTop: 4 }}>
                    <span>{hi ? 'कर योग्य राशि' : 'Taxable Amount'}</span><span>{fmt(totals.taxable)}</span>
                  </div>
                </>)}
                <div style={{ borderTop: `1px solid ${C.gray100}`, paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.gray600, padding: '4px 0' }}>
                    <span>{hi ? 'सीजीएसटी @ 2.5%' : 'CGST @ 2.5%'}</span><span>{fmt(totals.cgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.gray600, padding: '4px 0' }}>
                    <span>{hi ? 'एसजीएसटी @ 2.5%' : 'SGST @ 2.5%'}</span><span>{fmt(totals.sgst)}</span>
                  </div>
                </div>
                <div style={{ height: 1, background: C.gray200, margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 800, color: C.brownDark, padding: '6px 0 0' }}>
                  <div>
                    <div>{hi ? 'कुल राशि' : 'Grand Total'}</div>
                    <div style={{ fontSize: 11, color: C.gray400, fontWeight: 400, marginTop: 3 }}>{hi ? 'जीएसटी सहित' : 'incl. GST'} {fmt(totals.gst)}</div>
                  </div>
                  <div>{fmt(totals.grandTotal)}</div>
                </div>
              </div>

              {/* Settled banner */}
              {stage === 'settled' && (
                <div style={{ background: C.greenBg, borderTop: `2px dashed ${C.greenBorder}`, padding: '12px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>{hi ? '✅ भुगतान प्राप्त हुआ' : '✅ PAYMENT RECEIVED'}</div>
                  <div style={{ fontSize: 12, color: C.gray400, marginTop: 3 }}>
                    {hi ? `${payModeLabel} द्वारा निपटाया · ${fmtDate(settledAt)}, ${fmtTime(settledAt)}` : `Settled via ${payModeLabel} · ${fmtDate(settledAt)}, ${fmtTime(settledAt)}`}
                  </div>
                </div>
              )}
              {stage === 'voided' && (
                <div style={{ background: C.redBg, borderTop: `2px dashed ${C.redBorder}`, padding: '12px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>{hi ? '🚫 बिल रद्द' : '🚫 BILL VOIDED'}</div>
                  <div style={{ fontSize: 12, color: C.gray400, marginTop: 3 }}>{hi ? 'टेबल अगले ऑर्डर के लिए खाली है' : 'Table is now free for the next order'}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── PAYMENT PANEL ── */}
          <div style={{ width: 340, flexShrink: 0, borderLeft: `1px solid ${C.gray100}`, background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Panel header */}
            <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: stage === 'voided' ? C.redBg : C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {stage === 'settled' ? '✅' : stage === 'voided' ? '🚫' : '💳'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>
                  {stage === 'settled'
                    ? (hi ? 'भुगतान निपटाया' : 'Payment Settled')
                    : stage === 'voided'
                    ? (hi ? 'बिल रद्द' : 'Bill Voided')
                    : (hi ? 'भुगतान लें' : 'Collect Payment')}
                </div>
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{table?.name ?? 'Table'} · {billNum}</div>
              </div>
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ─ Settled state ─ */}
              {stage === 'settled' && (
                <>
                  <div style={{ background: C.greenBg, border: `1.5px solid ${C.greenBorder}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>
                      {hi ? `${payModeLabel} द्वारा बिल निपटाया` : `Bill Settled via ${payModeLabel}`}
                    </div>
                    <div style={{ fontSize: 12, color: C.gray400, marginTop: 4, lineHeight: 1.5 }}>
                      {fmtDate(settledAt)}, {fmtTime(settledAt)}<br />{hi ? 'टेबल अगले ऑर्डर के लिए खाली है' : 'Table is now free for the next order'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: C.gray400, marginBottom: 8 }}>{hi ? 'रसीद साझा करें' : 'Share Receipt'}</div>
                    {[
                      {
                        icon: '💬',
                        label: hi ? 'WhatsApp पर भेजें' : 'Send via WhatsApp',
                        sub: hi ? 'बिल के साथ WhatsApp खुलेगा' : 'Opens WhatsApp with bill text',
                        style: { border: `1.5px solid #25D366`, background: '#F0FDF4', color: '#15803D' },
                      },
                      {
                        icon: '📱',
                        label: hi ? 'SMS पर भेजें' : 'Send via SMS',
                        sub: hi ? 'ग्राहक को सादा रसीद' : 'Plain-text receipt to customer',
                        style: { border: `1.5px solid ${C.blueBorder}`, background: C.blueBg, color: C.blue },
                      },
                      {
                        icon: '🖨️',
                        label: hi ? 'बिल प्रिंट करें' : 'Print Bill',
                        sub: hi ? 'थर्मल या PDF प्रिंट' : 'ESC/POS thermal or PDF',
                        style: { border: `1.5px solid ${C.gray200}`, background: 'white', color: C.brownDark },
                      },
                    ].map((btn) => (
                      <button key={btn.label} onClick={() => alert('Receipt sharing available in Sprint 2')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', width: '100%', marginBottom: 7, ...btn.style }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{btn.icon}</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{btn.label}</div>
                          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>{btn.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* ─ Voided state ─ */}
              {stage === 'voided' && (
                <div style={{ background: C.redBg, border: `1.5px solid ${C.redBorder}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🚫</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>{hi ? 'बिल रद्द' : 'Bill Voided'}</div>
                  <div style={{ fontSize: 12, color: C.gray400, marginTop: 4, lineHeight: 1.5 }}>
                    {hi ? 'रद्द बिल इतिहास में सुरक्षित है।' : 'Voided bill retained in history.'}<br />{hi ? 'टेबल खाली है।' : 'Table is now free.'}
                  </div>
                </div>
              )}

              {/* ─ Billing state ─ */}
              {stage === 'billing' && (<>

                {/* Discount */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: C.gray400, marginBottom: 8 }}>{hi ? 'छूट' : 'Discount'}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {([
                      ['none', hi ? 'कोई छूट नहीं' : 'No Discount'],
                      ['flat', hi ? '₹ फ्लैट' : '₹ Flat'],
                      ['pct', hi ? '% छूट' : '% Off'],
                    ] as [DiscType, string][]).map(([type, label]) => (
                      <button key={type} onClick={() => handleDiscType(type)} style={{ flex: 1, padding: '7px 6px', borderRadius: 7, border: `1px solid ${discType === type ? C.greenBorder : C.gray200}`, background: discType === type ? C.greenBg : C.gray50, fontSize: 12, fontWeight: 600, color: discType === type ? C.green : C.gray400, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                    ))}
                  </div>
                  {discType !== 'none' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="number" value={discInput} onChange={(e) => handleDiscInput(e.target.value)}
                          placeholder={discType === 'flat' ? 'e.g. 50' : 'e.g. 10'}
                          min={0} max={discType === 'pct' ? 100 : undefined}
                          style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.gray400 }}>{discType === 'flat' ? '₹' : '%'}</span>
                      </div>
                      {totals.discountAmt > 0 && (
                        <div style={{ fontSize: 12, color: C.green, fontWeight: 600, background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 7, padding: '6px 10px' }}>
                          {hi ? `छूट: −${fmt(totals.discountAmt)} · कुल: ${fmt(totals.grandTotal)}` : `Discount: −${fmt(totals.discountAmt)} · Grand Total: ${fmt(totals.grandTotal)}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment mode */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: C.gray400, marginBottom: 8 }}>{hi ? 'भुगतान विधि' : 'Payment Mode'}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {([['upi', '💳 UPI'], ['cash', hi ? '💵 नकद' : '💵 Cash'], ['card', hi ? '🏦 कार्ड' : '🏦 Card']] as [PayMode, string][]).map(([mode, label]) => (
                      <button key={mode} onClick={() => setPayMode(mode)} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1.5px solid ${payMode === mode ? C.brownDark : C.gray200}`, background: payMode === mode ? C.brownDark : C.gray50, fontSize: 12, fontWeight: 600, color: payMode === mode ? 'white' : C.gray400, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                    ))}
                  </div>

                  {/* UPI */}
                  {payMode === 'upi' && (
                    <div>
                      <div style={{ background: C.gray50, border: `2px dashed ${C.gray200}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, width: 120, margin: '0 auto 12px', padding: 10, background: 'white', borderRadius: 8, border: `2px solid ${C.brownDark}` }}>
                          {QR_PATTERN.map((v, i) => (
                            <span key={i} style={{ height: 14, borderRadius: 1, background: v ? C.brownDark : 'transparent' }} />
                          ))}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: C.brownDark }}>{fmt(totals.grandTotal)}</div>
                        <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{hi ? 'किसी भी UPI ऐप से QR स्कैन करें' : 'Scan QR to pay via any UPI app'}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.brownMid, marginTop: 8 }}>📲 UPI: cafeOSum@upi</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                          {['GPay', 'PhonePe', 'BHIM', 'Paytm'].map((app) => (
                            <span key={app} style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${C.gray200}`, background: 'white', fontSize: 11, fontWeight: 600, color: C.gray600 }}>{app}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginTop: 10, background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                        {hi
                          ? <>⚠️ <strong>निपटाने से पहले पुष्टि करें:</strong> नीचे "बिल निपटाएं" दबाने से पहले अपने UPI ऐप या बैंक में भुगतान सत्यापित करें।</>
                          : <>⚠️ <strong>Confirm before settling:</strong> Verify payment received in your UPI app or bank before tapping "Settle Bill" below.</>
                        }
                      </div>
                    </div>
                  )}

                  {/* Cash */}
                  {payMode === 'cash' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 3 }}>{hi ? 'देय कुल राशि' : 'Grand Total due'}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: C.brownDark, padding: '4px 0' }}>{fmt(totals.grandTotal)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4 }}>{hi ? 'प्राप्त नकद (₹)' : 'Cash Received (₹)'}</div>
                        <input
                          type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="₹ 0"
                          style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.gray200}`, borderRadius: 9, fontSize: 18, fontWeight: 700, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4 }}>{hi ? 'त्वरित राशि' : 'Quick amounts'}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {quickCash.map((v) => (
                            <button key={v} onClick={() => setCashReceived(String(v))} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${C.gray200}`, background: C.gray50, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.brownDark }}>₹{v}</button>
                          ))}
                        </div>
                      </div>
                      {cashAmt > 0 && cashAmt >= totals.grandTotal && (
                        cashChange < 0.01
                          ? <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 9, padding: '10px 14px', fontSize: 12, color: C.blue, fontWeight: 600, textAlign: 'center' }}>{hi ? '✅ सटीक राशि — वापसी नहीं' : '✅ Exact amount — no change needed'}</div>
                          : <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 9, padding: '12px 14px' }}>
                              <div style={{ fontSize: 11, color: C.gray400, fontWeight: 500 }}>{hi ? 'ग्राहक को वापसी दें' : 'Return Change to Customer'}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 2 }}>{fmt(cashChange)}</div>
                            </div>
                      )}
                    </div>
                  )}

                  {/* Card */}
                  {payMode === 'card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                        {hi
                          ? <>💳 <strong>v1 में कार्ड प्रोसेसिंग नहीं</strong> — अपने POS टर्मिनल पर कार्ड स्वाइप करें, फिर यहाँ राशि दर्ज करें।</>
                          : <>💳 <strong>No card processing in v1</strong> — Swipe/tap the customer's card on your physical POS terminal, then enter the amount collected here to record the transaction.</>
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4 }}>{hi ? 'कार्ड से प्राप्त राशि (₹)' : 'Amount collected via card (₹)'}</div>
                        <input type="number" placeholder="₹ 0" style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.gray200}`, borderRadius: 9, fontSize: 18, fontWeight: 700, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ background: C.gray50, border: `1px solid ${C.gray100}`, borderRadius: 8, padding: '9px 12px', fontSize: 12, color: C.gray600 }}>
                        {hi ? 'कुल राशि' : 'Grand Total'}: <strong style={{ color: C.brownDark }}>{fmt(totals.grandTotal)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </>)}
            </div>

            {/* Pay footer */}
            <div style={{ borderTop: `1px solid ${C.gray100}`, padding: '13px 15px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.gray400, fontWeight: 500 }}>{hi ? 'कुल राशि' : 'Grand Total'}</div>
                  <div style={{ fontSize: 11, color: C.gray400 }}>{hi ? 'जीएसटी सहित' : 'incl. GST'} {fmt(totals.gst)}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.brownDark }}>{fmt(totals.grandTotal)}</div>
              </div>
              {stage === 'billing' && (
                <>
                  <button
                    onClick={() => setModal('settle')}
                    disabled={lines.length === 0}
                    style={{ width: '100%', padding: '11px 14px', background: lines.length === 0 ? C.gray200 : C.green, color: lines.length === 0 ? C.gray400 : 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: lines.length === 0 ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >{hi ? '✅ बिल निपटाएं' : '✅ Settle Bill'}</button>
                  <button
                    onClick={() => { setVoidPin(''); setVoidReason(''); setVoidError(''); setModal('void') }}
                    style={{ width: '100%', padding: '8px 14px', background: 'white', color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 7 }}
                  >{hi ? '🚫 रद्द / वापसी' : '🚫 Void / Refund'}</button>
                </>
              )}
              {stage === 'settled' && (
                <>
                  <button disabled style={{ width: '100%', padding: '11px 14px', background: C.gray200, color: C.gray400, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'default', fontFamily: 'inherit', marginBottom: 7 }}>{hi ? '✅ बिल निपटाया' : '✅ Bill Settled'}</button>
                  <button
                    onClick={() => { setVoidPin(''); setVoidReason(''); setVoidError(''); setModal('void') }}
                    style={{ width: '100%', padding: '8px 14px', background: 'white', color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >{hi ? '🚫 रद्द / वापसी' : '🚫 Void / Refund'}</button>
                </>
              )}
              {stage === 'voided' && (
                <button onClick={() => navigate('/tables')} style={{ width: '100%', padding: '11px 14px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? '← टेबल पर वापस' : '← Back to Tables'}</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SETTLE MODAL ── */}
      {modal === 'settle' && (
        <ModalOverlay onClose={() => setModal('none')}>
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✅</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{hi ? 'भुगतान प्राप्ति की पुष्टि करें?' : 'Confirm Payment Received?'}</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>
                {hi ? `${payModeLabel} द्वारा निपटाना — आगे बढ़ने से पहले पुष्टि करें।` : `Settling via ${payModeLabel} — confirm payment before proceeding.`}
              </div>
            </div>
            <button onClick={() => setModal('none')} style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: C.greenBg, border: `1.5px solid ${C.greenBorder}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.brownDark }}>{fmt(totals.grandTotal)}</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{hi ? 'देय कुल राशि' : 'Total amount to collect'}</div>
            </div>
            <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.7 }}>
              {hi
                ? <>पुष्टि होने पर, बिल <strong>निपटाया हुआ</strong> मान लिया जाएगा और {table?.name ?? 'टेबल'} अगले ऑर्डर के लिए खाली हो जाएगी। यह क्रिया पूर्ववत नहीं की जा सकती।</>
                : <>Once confirmed, the bill will be marked as <strong>Settled</strong> and {table?.name ?? 'the table'} will be freed for the next order. This action cannot be undone.</>
              }
            </div>
          </div>
          <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal('none')} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'वापस जाएं' : 'Go Back'}</button>
            <button onClick={handleSettle} style={{ padding: '9px 20px', background: C.green, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? '✅ हाँ, भुगतान मिला' : '✅ Yes, Payment Received'}</button>
          </div>
        </ModalOverlay>
      )}

      {/* ── VOID MODAL ── */}
      {modal === 'void' && (
        <ModalOverlay onClose={() => setModal('none')}>
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚫</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{hi ? 'बिल रद्द / वापसी' : 'Void / Refund Bill'}</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{billNum} · {table?.name ?? 'Table'} · {fmt(totals.grandTotal)}</div>
            </div>
            <button onClick={() => setModal('none')} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: C.red, lineHeight: 1.5, fontWeight: 500 }}>
              {hi
                ? <>⚠️ इस क्रिया के लिए <strong>मालिक की पुष्टि</strong> आवश्यक है। रद्द बिल इतिहास में रखे जाते हैं और हटाए नहीं जा सकते। कारण अनिवार्य है।</>
                : <>⚠️ This action requires <strong>Owner authentication</strong>. Voided bills are retained in history and cannot be deleted. A reason is mandatory.</>
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'मालिक PIN' : 'Owner PIN'}</label>
              <div style={{ fontSize: 11, color: C.gray400, marginBottom: 4 }}>Sprint 1 preview: any 4-digit code accepted — F-06 Staff & PINs will enforce real PIN management.</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${i < voidPin.length ? C.brownMid : C.gray200}`, background: i < voidPin.length ? C.cream : C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: C.brownDark }}>
                    {i < voidPin.length ? '●' : ''}
                  </div>
                ))}
              </div>
              <input
                type="password" maxLength={4} value={voidPin} onChange={(e) => setVoidPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={hi ? '4 अंकीय मालिक PIN डालें' : 'Enter 4-digit owner PIN'}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'रद्द का कारण (अनिवार्य)' : 'Reason for void (mandatory)'}</label>
              <textarea
                value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
                placeholder={hi ? 'जैसे: ग्राहक ने मना किया, गलत आइटम, डुप्लीकेट बिल…' : 'e.g. Customer changed mind, wrong item entered, duplicate bill…'}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 80 }}
              />
            </div>
            {voidError && <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>⚠️ {voidError}</div>}
            <div style={{ fontSize: 11, color: C.gray400, background: C.gray50, border: `1px solid ${C.gray100}`, borderRadius: 7, padding: '8px 10px', lineHeight: 1.6 }}>
              {hi
                ? '📋 यह रद्दीकरण ऑडिट ट्रेल में दर्ज होगा: उपयोगकर्ता, समय, कारण और मूल बिल विवरण।'
                : '📋 This void will be logged to the Audit Trail (F-09) with: acting user, timestamp, reason, and full original bill payload.'
              }
            </div>
          </div>
          <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal('none')} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'रद्द करें' : 'Cancel'}</button>
            <button onClick={handleVoid} style={{ padding: '9px 20px', background: C.red, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? '🚫 रद्द की पुष्टि करें' : '🚫 Confirm Void'}</button>
          </div>
        </ModalOverlay>
      )}

      {/* ── EOD MODAL ── */}
      {modal === 'eod' && <EODModal onClose={() => setModal('none')} />}
    </div>
  )
}
