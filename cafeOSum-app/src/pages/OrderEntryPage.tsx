import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTableStore, type TableStore } from '../store/tableStore'
import { useMenuStore, type MenuItem } from '../store/menuStore'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguageStore } from '../store/languageStore'
import { useAuditStore } from '../store/auditStore'

const HINDI_CAT: Record<string, string> = {
  '🍵 Tea':       '🍵 चाय',
  '☕ Coffee':    '☕ कॉफ़ी',
  '🥗 Food':      '🥗 खाना',
  '🍔 Snacks':    '🍔 स्नैक्स',
  '🧁 Desserts':  '🧁 मिठाइयाँ',
  '🥤 Drinks':    '🥤 पेय',
  '🍺 Beverages': '🍺 पेय',
  '🍱 Meals':     '🍱 भोजन',
}

// 2.5% CGST + 2.5% SGST = 5% total food GST
const CGST_RATE = 0.025
const SGST_RATE = 0.025

function categoryEmoji(category: string): string {
  return category.trim().split(' ')[0] || '☕'
}

function fmtCurrency(n: number) {
  return `₹${n.toFixed(2)}`
}

// ── MENU ITEM CARD ────────────────────────────────────────────────────────
function MenuItemCard({
  item,
  qtyInCart,
  onAdd,
  displayName,
  subLabel,
}: {
  item: MenuItem
  qtyInCart: number
  onAdd: () => void
  displayName?: string
  subLabel?: string
}) {
  const emoji = categoryEmoji(item.category)
  const inCart = qtyInCart > 0

  return (
    <div
      style={{
        background: inCart ? '#FFFDF5' : 'white',
        border: `1.5px solid ${inCart ? '#FDE68A' : '#F0EBE3'}`,
        borderRadius: 12,
        padding: '12px 12px 42px',
        position: 'relative',
        cursor: 'default',
        minHeight: 120,
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = inCart ? '#FDE68A' : '#7C4A1E'
        el.style.boxShadow = '0 4px 12px rgba(59,31,14,0.08)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = inCart ? '#FDE68A' : '#F0EBE3'
        el.style.boxShadow = 'none'
        el.style.transform = 'none'
      }}
    >
      {/* Qty badge */}
      {inCart && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: '#D97706', color: 'white',
          fontSize: 10, fontWeight: 700,
          borderRadius: 10, padding: '1px 6px', minWidth: 20, textAlign: 'center',
        }}>
          {qtyInCart}
        </div>
      )}

      <div style={{ fontSize: 26, marginBottom: 7 }}>{emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#3B1F0E', lineHeight: 1.35, marginBottom: 2 }}>
        {displayName ?? item.name}
      </div>
      {subLabel && (
        <div style={{ fontSize: 10, color: '#9E8E7E', marginBottom: 2, lineHeight: 1.3 }}>{subLabel}</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#3B1F0E' }}>₹{item.price}</div>

      {/* Add button */}
      <button
        onClick={onAdd}
        style={{
          position: 'absolute', bottom: 10, right: 10,
          width: 28, height: 28, borderRadius: '50%',
          background: inCart ? '#D97706' : '#3B1F0E',
          color: 'white', border: 'none',
          fontSize: 18, lineHeight: 1, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s, transform 0.1s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.12)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
      >
        +
      </button>
    </div>
  )
}

// ── CART LINE ─────────────────────────────────────────────────────────────
function CartLine({
  line,
  tableId,
  store,
}: {
  line: { id: string; menuItemId: string; name: string; emoji: string; price: number; qty: number; note: string; sentToKitchen: boolean }
  tableId: string
  store: TableStore
}) {
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const [noteOpen, setNoteOpen] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const lineTotal = line.price * line.qty
  const hasNote = line.note.length > 0
  const nearLimit = line.note.length > 80

  const toggleNote = () => {
    const next = !noteOpen
    setNoteOpen(next)
    if (next) setTimeout(() => taRef.current?.focus(), 50)
  }

  return (
    <div
      style={{
        border: `1px solid ${line.sentToKitchen ? '#86EFAC' : '#F0EBE3'}`,
        background: line.sentToKitchen ? '#E8F5EE' : 'white',
        borderRadius: 10, marginBottom: 8, overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px 6px' }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>{line.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#3B1F0E', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name}</span>
            {line.sentToKitchen && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#2E8B57', background: 'white', border: '1px solid #86EFAC', padding: '1px 5px', borderRadius: 5, flexShrink: 0 }}>
                {hi ? '🍳 भेजा' : '🍳 Sent'}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#9E8E7E', marginTop: 2 }}>₹{line.price} {hi ? 'प्रति' : 'each'}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3B1F0E', flexShrink: 0 }}>
          ₹{lineTotal}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px 8px' }}>
        <button
          onClick={() => store.updateOrderLineQty(tableId, line.id, -1)}
          style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #DDD5C8', background: '#F9F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', color: '#3B1F0E', fontWeight: 600 }}
        >−</button>
        <div style={{ minWidth: 26, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{line.qty}</div>
        <button
          onClick={() => store.updateOrderLineQty(tableId, line.id, 1)}
          style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #DDD5C8', background: '#F9F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', color: '#3B1F0E', fontWeight: 600 }}
        >+</button>

        <button
          onClick={toggleNote}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 600,
            color: hasNote ? '#2563EB' : '#9E8E7E',
            padding: '3px 8px', borderRadius: 6,
            border: `1px solid ${hasNote ? '#BFDBFE' : '#DDD5C8'}`,
            background: hasNote ? '#EFF6FF' : 'white',
            cursor: 'pointer',
          }}
        >
          ✏ {hasNote ? (hi ? 'नोट' : 'Note') : (hi ? 'नोट जोड़ें' : 'Add note')}
        </button>

        <button
          onClick={() => store.removeOrderLine(tableId, line.id)}
          style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: 'pointer', color: '#DC2626' }}
        >✕</button>
      </div>

      {/* Note area */}
      {noteOpen && (
        <div style={{ padding: '0 10px 10px' }}>
          <div style={{ position: 'relative' }}>
            <textarea
              ref={taRef}
              rows={2}
              maxLength={100}
              value={line.note}
              onChange={(e) => store.updateOrderLineNote(tableId, line.id, e.target.value)}
              placeholder={hi ? 'जैसे: बिना चीनी, ज़्यादा गर्म… (100 अक्षर)' : 'e.g. No sugar, extra hot, less milk… (max 100 chars)'}
              style={{
                width: '100%', resize: 'none', border: '1px solid #DDD5C8',
                borderRadius: 8, padding: '7px 38px 7px 10px',
                fontSize: 12, color: '#3B1F0E', background: '#F9F5F0',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#7C4A1E'; e.currentTarget.style.background = 'white' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#DDD5C8'; e.currentTarget.style.background = '#F9F5F0' }}
            />
            <div style={{ position: 'absolute', bottom: 6, right: 7, fontSize: 10, color: nearLimit ? '#D97706' : '#9E8E7E', pointerEvents: 'none' }}>
              {line.note.length}/100
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── KITCHEN CONFIRM MODAL ─────────────────────────────────────────────────
function KitchenModal({
  tableName,
  customerName,
  orderId,
  lines,
  onClose,
  onConfirm,
}: {
  tableName: string
  customerName: string
  orderId: string
  lines: { id: string; name: string; qty: number; note: string }[]
  onClose: () => void
  onConfirm: () => void
}) {
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.35)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 16, width: 420, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍳</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#3B1F0E' }}>{hi ? 'ऑर्डर किचन में भेजें?' : 'Send order to kitchen?'}</div>
            <div style={{ fontSize: 12, color: '#9E8E7E', marginTop: 2 }}>{tableName}{customerName ? ` · ${customerName}` : ''} · {orderId}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, border: '1px solid #DDD5C8', background: 'white', cursor: 'pointer', fontSize: 14, color: '#9E8E7E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {lines.map((l) => (
              <div key={l.id} style={{ display: 'flex', gap: 10, padding: '9px 12px', background: '#F9F5F0', border: '1px solid #F0EBE3', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3B1F0E', minWidth: 28 }}>×{l.qty}</div>
                <div>
                  <div style={{ fontSize: 13, color: '#3B1F0E' }}>{l.name}</div>
                  {l.note && <div style={{ fontSize: 11, color: '#9E8E7E', fontStyle: 'italic', marginTop: 2 }}>✏ {l.note}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
            <strong>Note:</strong> Kitchen Display System integration is planned for Sprint 2. This marks all items as "Sent to Kitchen" and notifies the owner.
          </div>
        </div>

        <div style={{ padding: '13px 18px', borderTop: '1px solid #F0EBE3', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', background: 'white', color: '#6B5B4E', border: '1px solid #DDD5C8', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{hi ? 'रद्द करें' : 'Cancel'}</button>
          <button onClick={onConfirm} style={{ padding: '9px 20px', background: '#2E8B57', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{hi ? '🍳 किचन भेजें' : '🍳 Send to Kitchen'}</button>
        </div>
      </div>
    </div>
  )
}

// ── KITCHEN SENT MODAL ─────────────────────────────────────────────────────
function KitchenSentModal({ totalItems, onClose }: { totalItems: number; onClose: () => void }) {
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.35)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 16, width: 380, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '30px 20px 20px', textAlign: 'center' }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>
            ✅
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#3B1F0E', marginBottom: 8 }}>{hi ? 'ऑर्डर किचन में भेजा!' : 'Order sent to kitchen!'}</div>
          <div style={{ fontSize: 13, color: '#9E8E7E', lineHeight: 1.65, maxWidth: 280, margin: '0 auto 18px' }}>
            {hi ? 'आइटम भेजे गए के रूप में चिह्नित हो गए हैं। मालिक को उनके डिवाइस पर सूचना मिलेगी।' : 'Items have been marked as sent. The owner will be notified on their device.'}
          </div>
          <div style={{ background: '#E8F5EE', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#2E8B57', fontWeight: 500 }}>
            {hi ? `🍳 किचन को सूचना · ${totalItems} आइटम` : `🍳 Kitchen notified · ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ padding: '13px 18px', borderTop: '1px solid #F0EBE3', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '9px 28px', background: '#3B1F0E', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{hi ? 'ठीक है' : 'Done'}</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export function OrderEntryPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const store = useTableStore()
  const menuStore = useMenuStore()
  const menuItems = menuStore.items
  const { lang } = useLanguageStore()

  // Load menu items from API on mount
  useEffect(() => { menuStore.fetch() }, [])
  const hi = lang === 'hi'

  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('All')
  const [syncSecs, setSyncSecs] = useState(2)
  const [modal, setModal] = useState<'none' | 'kitchen' | 'sent'>('none')

  const table = store.tables.find((t) => t.id === tableId) ?? null
  const orderLines = table?.orderLines ?? []

  // Auth + table guard — allow 'bill-pending' so generateBill() → navigate('/billing/…') isn't
  // overridden by this effect re-firing with the updated status before the route change settles
  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth', { replace: true }); return }
    if (!table || (table.status !== 'occupied' && table.status !== 'bill-pending'))
      navigate('/tables', { replace: true })
  }, [isAuthenticated, table, navigate])

  // Sync counter
  useEffect(() => {
    const t = setInterval(() => setSyncSecs((s) => (s >= 29 ? 1 : s + 1)), 1000)
    return () => clearInterval(t)
  }, [])

  if (!table || (table.status !== 'occupied' && table.status !== 'bill-pending')) return null

  // ── Categories & filtering
  const allCategories = ['All', ...Array.from(new Set(menuItems.map((m) => m.category)))]

  const visibleItems = menuItems.filter((m) => {
    const q = search.toLowerCase().trim()
    const catOk = activeCat === 'All' || m.category === activeCat
    const searchOk = !q || m.name.toLowerCase().includes(q)
    return catOk && searchOk
  })

  const qtyInCart = (menuItemId: string) => {
    const line = orderLines.find((l) => l.menuItemId === menuItemId)
    return line?.qty ?? 0
  }

  const handleAddItem = (item: MenuItem) => {
    store.addOrderLine(tableId!, {
      menuItemId: item.id,
      name: item.name,
      emoji: categoryEmoji(item.category),
      price: item.price,
    })
  }

  // ── Totals
  const subtotal = orderLines.reduce((s, l) => s + l.price * l.qty, 0)
  const cgst = subtotal * CGST_RATE
  const sgst = subtotal * SGST_RATE
  const grandTotal = subtotal + cgst + sgst
  const totalQty = orderLines.reduce((s, l) => s + l.qty, 0)

  const orderId = `#ORD-${String(Math.abs(table.openedAt ?? 0)).slice(-4)}`
  const hasUnsentItems = orderLines.some((l) => !l.sentToKitchen)

  // ── Kitchen actions
  const handleKitchenConfirm = async () => {
    await store.markKitchenSent(tableId!)
    useAuditStore.getState().addEvent({
      eventType: 'ORDER_CREATED',
      category: 'Orders',
      userId: 'Owner',
      entityType: 'Order',
      entityId: orderId,
      payload: { table: table.name, items_count: orderLines.length, total_qty: totalQty, grand_total: grandTotal },
      status: 'ok',
      summary: `Order sent to kitchen · ${table.name} · ${orderLines.length} item${orderLines.length !== 1 ? 's' : ''}`,
    })
    setModal('sent')
  }

  const handleGenerateBill = async () => {
    await store.generateBill(tableId!)
    navigate(`/billing/${tableId}`)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F9F5F0', overflow: 'hidden' }}>
      <AppSidebar activeRoute="/tables" />

      {/* Main wrapper */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'white', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          {/* Back */}
          <button
            onClick={() => navigate('/tables')}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #DDD5C8', background: '#F9F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#6B5B4E', flexShrink: 0 }}
            title="Back to Tables"
          >←</button>

          <span style={{ fontSize: 18, fontWeight: 700, color: '#3B1F0E', whiteSpace: 'nowrap' }}>{hi ? 'ऑर्डर एंट्री' : 'Order Entry'}</span>

          {/* Table badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#D97706', whiteSpace: 'nowrap' }}>
            🧑‍🤝‍🧑 {table.name}{table.customerName ? ` · ${table.customerName}` : ''}{table.guests ? ` · ${table.guests} ${hi ? 'अतिथि' : `guest${table.guests !== 1 ? 's' : ''}`}` : ''}
          </div>

          {/* Sync pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2E8B57', background: '#E8F5EE', border: '1px solid #86EFAC', padding: '4px 10px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>
            <div className="animate-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#2E8B57', flexShrink: 0 }} />
            {hi ? `लाइव · ${syncSecs}s पहले` : `Live · ${syncSecs}s ago`}
          </div>

          <LanguageToggle />

          <div style={{ flex: 1 }} />

          {/* Send to Kitchen button */}
          <button
            onClick={() => hasUnsentItems && setModal('kitchen')}
            disabled={!hasUnsentItems}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: hasUnsentItems ? '#3B1F0E' : '#C0B0A0', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: hasUnsentItems ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => { if (hasUnsentItems) (e.currentTarget as HTMLButtonElement).style.background = '#7C4A1E' }}
            onMouseLeave={(e) => { if (hasUnsentItems) (e.currentTarget as HTMLButtonElement).style.background = '#3B1F0E' }}
          >
            {hi ? '🍳 किचन भेजें' : '🍳 Send to Kitchen'}
          </button>
        </header>

        {/* Kitchen sent banner */}
        {orderLines.some((l) => l.sentToKitchen) && (
          <div style={{ background: '#E8F5EE', borderBottom: '1px solid #86EFAC', padding: '7px 18px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#2E8B57', fontWeight: 600, flexShrink: 0 }}>
            <span>✅</span>
            <span>{hi ? 'कुछ आइटम किचन में भेजे गए हैं' : 'Some items have been sent to the kitchen'}</span>
          </div>
        )}

        {/* Split area */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

          {/* ── MENU PANEL (LEFT) ── */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Controls */}
            <div style={{ padding: '12px 18px 10px', background: 'white', borderBottom: '1px solid #F0EBE3', flexShrink: 0 }}>
              {/* Search */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9F5F0', border: '1px solid #DDD5C8', borderRadius: 10, padding: '8px 12px', marginBottom: 10, transition: 'border-color 0.15s' }}
                onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#7C4A1E'; (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#DDD5C8'; (e.currentTarget as HTMLDivElement).style.background = '#F9F5F0' }}
              >
                <span style={{ fontSize: 14, color: '#9E8E7E', flexShrink: 0 }}>🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    if (e.target.value) setActiveCat('All')
                  }}
                  placeholder={hi ? 'मेनू आइटम खोजें…' : 'Search menu items…'}
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: '#3B1F0E', outline: 'none', fontFamily: 'inherit' }}
                />
                {search && (
                  <span
                    onClick={() => setSearch('')}
                    style={{ fontSize: 12, color: '#9E8E7E', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                  >✕</span>
                )}
                {search && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#2E8B57', background: '#E8F5EE', border: '1px solid #86EFAC', padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                    ⚡ &lt;300ms
                  </span>
                )}
              </div>

              {/* Category chips */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {allCategories.map((cat) => {
                  const isActive = activeCat === cat
                  const chipLabel = cat === 'All'
                    ? (lang === 'hi' ? '⊞ सभी' : '⊞ All')
                    : (lang === 'hi' ? (HINDI_CAT[cat] ?? cat) : cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCat(cat)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                        borderRadius: 20, border: `1px solid ${isActive ? '#3B1F0E' : '#DDD5C8'}`,
                        background: isActive ? '#3B1F0E' : 'white',
                        color: isActive ? 'white' : '#6B5B4E',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {chipLabel}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Menu grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', background: '#F9F5F0' }}>
              {search && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#2563EB', display: 'flex', gap: 6, alignItems: 'center' }}>
                  🔍 <strong>{visibleItems.length} {hi ? 'परिणाम' : `result${visibleItems.length !== 1 ? 's' : ''}`}</strong> {hi ? `"${search}" के लिए` : `for "${search}"`}
                </div>
              )}

              {visibleItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9E8E7E' }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#3B1F0E' }}>{hi ? 'कोई आइटम नहीं मिला' : 'No items found'}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{hi ? 'अलग खोज शब्द आज़माएं' : 'Try a different search term'}</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {visibleItems.map((item) => {
                    const isHindi = lang === 'hi'
                    const displayName = isHindi ? (item.hindiName ?? item.name) : item.name
                    const subLabel = isHindi && item.hindiName ? item.name : undefined
                    return (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        qtyInCart={qtyInCart(item.id)}
                        onAdd={() => handleAddItem(item)}
                        displayName={displayName}
                        subLabel={subLabel}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── CART PANEL (RIGHT) ── */}
          <div style={{ width: 356, flexShrink: 0, borderLeft: '1px solid #F0EBE3', background: 'white', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Cart header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🧑‍🤝‍🧑</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3B1F0E' }}>{table.name} — {hi ? 'सक्रिय ऑर्डर' : 'Active Order'}</div>
                <div style={{ fontSize: 11, color: '#9E8E7E', marginTop: 2 }}>
                  {table.customerName || (hi ? 'वॉक-इन' : 'Walk-in')} · {table.guests} {hi ? 'अतिथि' : `guest${table.guests !== 1 ? 's' : ''}`} · {orderId}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#7C4A1E', background: '#FDF8F2', padding: '3px 9px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                {totalQty} {hi ? 'आइटम' : `item${totalQty !== 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Cart body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 13px' }}>
              {orderLines.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 34, marginBottom: 10, opacity: 0.4 }}>🛒</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#3B1F0E', marginBottom: 4 }}>{hi ? 'अभी कोई आइटम नहीं' : 'No items yet'}</div>
                  <div style={{ fontSize: 12, color: '#9E8E7E', lineHeight: 1.5 }}>
                    {hi ? <>किसी भी मेनू आइटम पर <strong>+</strong> दबाएं।</> : <>Tap the <strong>+</strong> on any menu item to add it.</>}
                  </div>
                </div>
              ) : (
                <>
                  {orderLines.map((line) => (
                    <CartLine key={line.id} line={line} tableId={tableId!} store={store} />
                  ))}
                </>
              )}
            </div>

            {/* Cart footer */}
            <div style={{ borderTop: '1px solid #F0EBE3', padding: '13px 14px', background: 'white', flexShrink: 0 }}>
              {orderLines.length > 0 ? (
                <>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#2E8B57', background: '#E8F5EE', border: '1px solid #86EFAC', padding: '2px 7px', borderRadius: 8, marginBottom: 9 }}>
                    {hi ? '⚡ रियल-टाइम कुल' : '⚡ Real-time totals'}
                  </div>
                  {[
                    [hi ? 'उप-कुल' : 'Subtotal', fmtCurrency(subtotal)],
                    ['CGST 2.5%', fmtCurrency(cgst)],
                    ['SGST 2.5%', fmtCurrency(sgst)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B5B4E', padding: '3px 0' }}>
                      <span>{label}</span><span>{val}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: '#F0EBE3', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 15, fontWeight: 700, color: '#3B1F0E', padding: '2px 0', marginBottom: 12 }}>
                    <div>
                      <div>{hi ? 'कुल योग' : 'Grand Total'}</div>
                      <div style={{ fontSize: 11, color: '#9E8E7E', fontWeight: 400, marginTop: 3 }}>{hi ? `GST सहित ${fmtCurrency(cgst + sgst)}` : `incl. ${fmtCurrency(cgst + sgst)} GST`}</div>
                    </div>
                    <div>{fmtCurrency(grandTotal)}</div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#9E8E7E', textAlign: 'center', padding: '4px 0', marginBottom: 12 }}>
                  {hi ? 'कुल देखने के लिए आइटम जोड़ें' : 'Add items to see the running total'}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <button
                  onClick={() => hasUnsentItems && setModal('kitchen')}
                  disabled={!hasUnsentItems}
                  style={{ padding: '9px 14px', background: hasUnsentItems ? '#2E8B57' : '#C0B0A0', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: hasUnsentItems ? 'pointer' : 'not-allowed', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {hi ? '🍳 किचन भेजें' : '🍳 Send to Kitchen'}
                </button>
                <button
                  onClick={handleGenerateBill}
                  disabled={orderLines.length === 0}
                  style={{ padding: '9px 14px', background: orderLines.length > 0 ? '#3B1F0E' : 'white', color: orderLines.length > 0 ? 'white' : '#9E8E7E', border: `1px solid ${orderLines.length > 0 ? '#3B1F0E' : '#DDD5C8'}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: orderLines.length > 0 ? 'pointer' : 'not-allowed', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {hi ? '🧾 बिल बनाएं' : '🧾 Generate Bill'}
                </button>
              </div>
            </div>
          </div>

        </div>{/* /split-area */}
      </div>{/* /main-wrapper */}

      {/* Modals */}
      {modal === 'kitchen' && (
        <KitchenModal
          tableName={table.name}
          customerName={table.customerName}
          orderId={orderId}
          lines={orderLines}
          onClose={() => setModal('none')}
          onConfirm={handleKitchenConfirm}
        />
      )}
      {modal === 'sent' && (
        <KitchenSentModal
          totalItems={totalQty}
          onClose={() => setModal('none')}
        />
      )}
    </div>
  )
}
