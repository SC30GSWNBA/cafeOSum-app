import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTableStore } from '../store/tableStore'
import type { TableRecord, TableStatus } from '../store/tableStore'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguageStore } from '../store/languageStore'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal'
import { BtnPrimary, BtnSecondary, BtnDanger, BtnSuccess } from '../components/ui/Btn'
import { PageShell } from '../components/ui/PageShell'
import { toast } from '../store/toastStore'
import { API_BASE } from '../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────
function formatElapsed(openedAt: number | null): string {
  if (!openedAt) return ''
  const mins = Math.floor((Date.now() - openedAt) / 60000)
  return mins < 1 ? '< 1 min' : `${mins} min`
}

function fmtTime(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

type ModalState = 'none' | 'new-order' | 'locked' | 'add-table' | 'edit-table'
type PanelState = 'none' | 'view-order'
type Filter = 'all' | 'free' | 'occupied' | 'bill-pending'
type View = 'grid' | 'manage'

// ── Shared icon-input wrapper style ───────────────────────────────────────
const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 10, top: '50%',
  transform: 'translateY(-50%)', color: '#9E8E7E', fontSize: 13, pointerEvents: 'none',
}


// ── TABLE TILE ────────────────────────────────────────────────────────────
const TILE_COLORS: Record<TableStatus, { bg: string; border: string; status: string; icon: string }> = {
  free: { bg: '#E8F5EE', border: '#86EFAC', status: '#2E8B57', icon: '🪑' },
  occupied: { bg: '#FEF3C7', border: '#FDE68A', status: '#D97706', icon: '🧑‍🤝‍🧑' },
  'bill-pending': { bg: '#FEE2E2', border: '#FCA5A5', status: '#DC2626', icon: '🧾' },
}
const STATUS_LABEL: Record<TableStatus, string> = { free: 'Free', occupied: 'Occupied', 'bill-pending': 'Bill Pending' }
const STATUS_LABEL_HI: Record<TableStatus, string> = { free: 'मुक्त', occupied: 'व्यस्त', 'bill-pending': 'बिल बकाया' }
const ACTION_LABEL: Record<TableStatus, string> = { free: '＋ Start order →', occupied: 'View order →', 'bill-pending': 'Settle now →' }
const ACTION_LABEL_HI: Record<TableStatus, string> = { free: '＋ ऑर्डर शुरू →', occupied: 'ऑर्डर देखें →', 'bill-pending': 'बिल चुकाएं →' }

function TableTile({ table, onClick }: { table: TableRecord; onClick: () => void }) {
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const c = TILE_COLORS[table.status]
  const elapsed = formatElapsed(table.openedAt)
  const isLocked = table.status === 'bill-pending'

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 12, border: `2px solid ${c.border}`, background: c.bg,
        padding: '14px 14px 12px', cursor: isLocked ? 'default' : 'pointer',
        minHeight: 140, position: 'relative', display: 'flex', flexDirection: 'column',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { if (!isLocked) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,31,14,0.1)' } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3B1F0E', lineHeight: 1.2, flex: 1, minWidth: 0 }}>{table.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {elapsed && (
            <div style={{ fontSize: 10, fontWeight: 600, color: c.status, background: isLocked ? 'rgba(220,38,38,0.12)' : 'rgba(217,119,6,0.12)', padding: '2px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              {elapsed}
            </div>
          )}
          <div style={{ fontSize: 18, opacity: 0.7 }}>{c.icon}</div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 8 }} />

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c.status, marginBottom: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.status }} />
        {hi ? STATUS_LABEL_HI[table.status] : STATUS_LABEL[table.status]}
      </div>

      {/* Detail */}
      <div style={{ fontSize: 12, color: '#6B5B4E', lineHeight: 1.5, flex: 1 }}>
        {table.status === 'free' && `${table.seats} seats`}
        {table.status === 'occupied' && (
          <>{table.customerName ? <><strong style={{ color: '#3B1F0E' }}>{table.customerName}</strong><br /></> : null}{table.orderItems} items · ₹{table.orderTotal}</>
        )}
        {table.status === 'bill-pending' && (
          <>{table.customerName ? <><strong style={{ color: '#3B1F0E' }}>{table.customerName}</strong><br /></> : null}₹{table.orderTotal} due</>
        )}
      </div>

      {/* Action */}
      <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: c.status }}>
        {hi ? ACTION_LABEL_HI[table.status] : ACTION_LABEL[table.status]}
      </div>

      {isLocked && <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 14, opacity: 0.4 }}>🔒</div>}
    </div>
  )
}

// ── NEW ORDER MODAL ───────────────────────────────────────────────────────
function NewOrderModal({ table, onClose, onConfirm }: {
  table: TableRecord | null
  onClose: () => void
  onConfirm: (customerName: string, guests: number) => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [guests, setGuests] = useState(2)
  if (!table) return null
  return (
    <Modal onClose={onClose} width={440}>
      <ModalHeader icon="🪑" iconBg="#E8F5EE" title={`${table.name} — Start new order`} sub={`${table.seats} seats · Currently free`} onClose={onClose} />
      <ModalBody>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3B1F0E', marginBottom: 5 }}>
            Customer name
            <span style={{ fontSize: 10, fontWeight: 500, color: '#9E8E7E', background: '#F0EBE3', borderRadius: 4, padding: '1px 5px', marginLeft: 6 }}>Optional</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span style={iconStyle}>👤</span>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Ananya S." className="cafe-input" style={{ padding: '9px 10px 9px 32px' }} />
          </div>
          <div style={{ fontSize: 11, color: '#9E8E7E', marginTop: 4 }}>Helps identify the order in the queue and on the bill.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3B1F0E', marginBottom: 5 }}>Guests</label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>#</span>
              <input type="number" min={1} max={table.seats} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="cafe-input" style={{ padding: '9px 10px 9px 32px' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3B1F0E', marginBottom: 5 }}>Table</label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>🪑</span>
              <input type="text" value={`${table.name} (${table.seats} seats)`} readOnly className="cafe-input" style={{ padding: '9px 10px 9px 32px', background: '#F0EBE3' }} />
            </div>
          </div>
        </div>

        <div style={{ background: '#E8F5EE', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#2E8B57', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✓</span> Table will be marked <strong>Occupied</strong> the moment you open the order.
        </div>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
        <BtnSuccess onClick={() => { onConfirm(customerName, guests); setCustomerName(''); setGuests(2) }}>Open Order →</BtnSuccess>
      </ModalFooter>
    </Modal>
  )
}

// ── VIEW ORDER SLIDE PANEL ────────────────────────────────────────────────
function ViewOrderPanel({ table, onClose, onGenerateBill }: {
  table: TableRecord | null
  onClose: () => void
  onGenerateBill: () => void
}) {
  const navigate = useNavigate()
  if (!table) return null

  const lines = table.orderLines ?? []
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const gst = subtotal * 0.05
  const grandTotal = subtotal + gst

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, background: 'white', borderLeft: '1px solid #F0EBE3', zIndex: 350, overflowY: 'auto', boxShadow: '-4px 0 20px rgba(59,31,14,0.08)' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧑‍🤝‍🧑</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#3B1F0E' }}>{table.name} — Active Order</div>
          <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>● Occupied · {formatElapsed(table.openedAt)}</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, border: '1px solid #DDD5C8', background: 'white', cursor: 'pointer', fontSize: 14, color: '#9E8E7E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      <div style={{ padding: 18 }}>
        {/* Order meta */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9E8E7E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Order Info</div>
          <div style={{ background: '#F9F5F0', borderRadius: 10, padding: '12px 14px' }}>
            {[
              ['Order ID', `#ORD-${String(Math.abs(table.openedAt ?? 0)).slice(-4)}`],
              ['Customer', table.customerName || '—'],
              ['Guests', String(table.guests)],
              ['Opened', fmtTime(table.openedAt)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B5B4E', padding: '3px 0' }}>
                <span>{label}</span><strong style={{ color: '#3B1F0E' }}>{val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9E8E7E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Items Ordered</div>

          {lines.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9E8E7E', fontSize: 13, background: '#F9F5F0', borderRadius: 8 }}>
              No items yet — tap "＋ Add items" to start.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {lines.map((line) => (
                  <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'white', border: '1px solid #F0EBE3' }}>
                    <span style={{ fontSize: 18 }}>{line.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#3B1F0E' }}>{line.name} × {line.qty}</div>
                      {line.note && <div style={{ fontSize: 11, color: '#9E8E7E' }}>✏ {line.note}</div>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#3B1F0E' }}>₹{line.price * line.qty}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#FDF8F2', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#3B1F0E', border: '1px solid #F0EBE3' }}>
                <span>Grand Total</span>
                <div style={{ textAlign: 'right' }}>
                  <div>₹{grandTotal.toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: '#9E8E7E', fontWeight: 400 }}>incl. ₹{gst.toFixed(2)} GST</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onGenerateBill}
            disabled={lines.length === 0}
            style={{ width: '100%', padding: '10px 20px', background: lines.length > 0 ? '#3B1F0E' : '#C0B0A0', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: lines.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >🧾 Generate Bill</button>
          <button
            onClick={() => navigate(`/order/${table.id}`)}
            style={{ width: '100%', padding: '10px 20px', background: 'white', color: '#3B1F0E', border: '1px solid #3B1F0E', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F9F5F0' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}
          >＋ Add items →</button>
        </div>
      </div>
    </div>
  )
}

// ── LOCKED MODAL ──────────────────────────────────────────────────────────
function LockedModal({ table, onClose, onSettle }: {
  table: TableRecord | null
  onClose: () => void
  onSettle: () => void
}) {
  if (!table) return null
  return (
    <Modal onClose={onClose} width={440}>
      <ModalHeader icon="🔒" iconBg="#FEE2E2" title={`${table.name} — Bill Pending`} sub="Cannot start a new order until this bill is settled" onClose={onClose} />
      <ModalBody>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 14px' }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#3B1F0E', marginBottom: 6 }}>Table is awaiting payment</div>
          <div style={{ fontSize: 13, color: '#9E8E7E', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            {table.customerName ? <><strong style={{ color: '#3B1F0E' }}>{table.customerName}</strong> has an</> : 'An'} outstanding bill of{' '}
            <strong style={{ color: '#DC2626' }}>₹{table.orderTotal}</strong>. Settle this bill before opening a new order on this table.
          </div>
        </div>

        <div style={{ background: '#F9F5F0', borderRadius: 10, padding: '12px 14px' }}>
          {[
            ['Order ID', `#ORD-${String(Math.abs(table.openedAt ?? 0)).slice(-4)}`],
            ['Customer', table.customerName || '—'],
            ['Amount due', `₹${table.orderTotal}`],
            ['Open since', formatElapsed(table.openedAt) || '—'],
          ].map(([label, val], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B5B4E', padding: '3px 0' }}>
              <span>{label}</span>
              <strong style={{ color: i === 2 ? '#DC2626' : '#3B1F0E' }}>{val}</strong>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onClose}>Close</BtnSecondary>
        <BtnDanger onClick={onSettle}>Settle Bill Now →</BtnDanger>
      </ModalFooter>
    </Modal>
  )
}

// ── ADD / EDIT TABLE MODAL ────────────────────────────────────────────────
const TABLE_TYPES = ['Indoor', 'Outdoor', 'Private / Booth', 'Counter', 'Bar seating']

function AddEditTableModal({ editTarget, totalCount, onClose, onSave }: {
  editTarget: TableRecord | null
  totalCount: number
  onClose: () => void
  onSave: (name: string, seats: number, type: string) => void
}) {
  const isEdit = editTarget !== null
  const [name, setName] = useState(editTarget?.name ?? '')
  const [seats, setSeats] = useState(editTarget?.seats ?? 4)
  const [type, setType] = useState(editTarget?.type ?? 'Indoor')
  const [nameErr, setNameErr] = useState('')

  const remaining = 50 - totalCount + (isEdit ? 1 : 0)

  const handleSave = () => {
    if (!name.trim()) { setNameErr('Table name is required'); return }
    onSave(name.trim(), seats, type)
  }

  return (
    <Modal onClose={onClose} width={440}>
      <ModalHeader icon="🪑" iconBg="#FDF8F2" title={isEdit ? `Edit ${editTarget!.name}` : 'Add new table'} sub={isEdit ? 'Update table details' : 'Appears on occupancy grid immediately after saving'} onClose={onClose} />
      <ModalBody>
        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3B1F0E', marginBottom: 5 }}>
            Table name / number <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span style={iconStyle}>🪑</span>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameErr('') }}
              placeholder="e.g. Table 11, Window Seat, Rooftop 1"
              className={`cafe-input${nameErr ? ' input-error' : ''}`}
              style={{ padding: '9px 10px 9px 32px' }}
            />
          </div>
          {nameErr
            ? <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{nameErr}</div>
            : <div style={{ fontSize: 11, color: '#9E8E7E', marginTop: 4 }}>Use a name staff will instantly recognise on the floor.</div>
          }
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3B1F0E', marginBottom: 5 }}>
              Seating capacity <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>#</span>
              <input type="number" min={1} max={50} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="cafe-input" style={{ padding: '9px 10px 9px 32px' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3B1F0E', marginBottom: 5 }}>
              Table type <span style={{ fontSize: 10, fontWeight: 500, color: '#9E8E7E', background: '#F0EBE3', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>Optional</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>🏷</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="cafe-input" style={{ padding: '9px 28px 9px 32px', appearance: 'none' }}>
                {TABLE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ background: '#FDF8F2', border: '1px solid #F0EBE3', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#6B5B4E', lineHeight: 1.5 }}>
          ℹ You can add up to <strong>50 tables</strong> per cafe. You have <strong>{remaining} slot{remaining !== 1 ? 's' : ''} remaining</strong>.
        </div>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
        <BtnPrimary onClick={handleSave}>{isEdit ? 'Save Changes' : 'Add Table'}</BtnPrimary>
      </ModalFooter>
    </Modal>
  )
}

// ── MANAGE VIEW ───────────────────────────────────────────────────────────
function ManageView({ tables, onAdd, onEdit, onDelete }: {
  tables: TableRecord[]
  onAdd: () => void
  onEdit: (t: TableRecord) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{ padding: '0 24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3B1F0E' }}>Manage Tables</div>
          <div style={{ fontSize: 13, color: '#9E8E7E', marginTop: 2 }}>Add, edit, or remove tables. Changes reflect immediately on the occupancy grid.</div>
        </div>
        <button
          onClick={onAdd}
          disabled={tables.length >= 50}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#3B1F0E', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: tables.length >= 50 ? 'not-allowed' : 'pointer', opacity: tables.length >= 50 ? 0.5 : 1 }}
        >＋ Add Table</button>
      </div>

      <div style={{ background: 'white', border: '1px solid #F0EBE3', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 110px 100px 100px', padding: '10px 16px', background: '#F9F5F0', borderBottom: '1px solid #F0EBE3' }}>
          {['Table Name', 'Seats', 'Status', 'Since', 'Actions'].map((col) => (
            <div key={col} style={{ fontSize: 11, fontWeight: 700, color: '#9E8E7E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col}</div>
          ))}
        </div>

        {tables.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9E8E7E', fontSize: 13 }}>
            No tables yet. Click "＋ Add Table" to get started.
          </div>
        )}

        {tables.map((t) => {
          const canDelete = t.status === 'free'
          const statusColors = { free: { bg: '#E8F5EE', color: '#2E8B57' }, occupied: { bg: '#FEF3C7', color: '#D97706' }, 'bill-pending': { bg: '#FEE2E2', color: '#DC2626' } }
          const sc = statusColors[t.status]
          const tileIcon = { free: '🪑', occupied: '🧑‍🤝‍🧑', 'bill-pending': '🧾' }[t.status]
          return (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 110px 100px 100px', padding: '12px 16px', borderBottom: '1px solid #F0EBE3', alignItems: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F9F5F0' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#3B1F0E', display: 'flex', alignItems: 'center', gap: 8 }}>
                {tileIcon} {t.name}
              </div>
              <div style={{ fontSize: 13, color: '#6B5B4E' }}>{t.seats} seats</div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                  ● {STATUS_LABEL[t.status]}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#9E8E7E' }}>
                {t.openedAt ? formatElapsed(t.openedAt) + ' ago' : '—'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => onEdit(t)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid #DDD5C8', background: 'white', color: '#6B5B4E' }}>Edit</button>
                <button
                  onClick={() => canDelete && onDelete(t.id)}
                  disabled={!canDelete}
                  style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: canDelete ? 'pointer' : 'not-allowed', border: '1px solid #FCA5A5', background: '#FEE2E2', color: '#DC2626', opacity: canDelete ? 1 : 0.4 }}
                  title={canDelete ? undefined : 'Cannot delete an occupied or bill-pending table'}
                >Delete</button>
              </div>
            </div>
          )
        })}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#FDF8F2', borderTop: '1px solid #F0EBE3', fontSize: 12, color: '#9E8E7E' }}>
          <span>Showing <strong style={{ color: '#3B1F0E' }}>{tables.length} of {tables.length}</strong> tables · <strong style={{ color: '#3B1F0E' }}>{tables.length} of 50</strong> maximum</span>
          <span style={{ color: '#2E8B57' }}>✓ State persists through restarts</span>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export function TablesPage() {
  const navigate = useNavigate()
  const { isAuthenticated, token } = useAuthStore()
  const store = useTableStore()
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'

  const [modal, setModal] = useState<ModalState>('none')
  const [panel, setPanel] = useState<PanelState>('none')
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<View>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<TableRecord | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) navigate('/auth', { replace: true })
  }, [isAuthenticated, navigate])

  // Load tables from API on mount
  useEffect(() => {
    store.fetch()
  }, [])

  // SSE — real-time occupancy updates
  useEffect(() => {
    if (!token) return
    const es = new EventSource(`${API_BASE}/tables/occupancy-stream?token=${encodeURIComponent(token)}`)
    es.onmessage = (e) => {
      try {
        store.applySSE(JSON.parse(e.data))
        setLastSync(new Date())
      } catch {}
    }
    return () => es.close()
  }, [token])

  // Tick for elapsed times
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const selectedTable = store.tables.find((t) => t.id === selectedId) ?? null

  const counts = {
    free: store.tables.filter((t) => t.status === 'free').length,
    occupied: store.tables.filter((t) => t.status === 'occupied').length,
    'bill-pending': store.tables.filter((t) => t.status === 'bill-pending').length,
  }

  const visibleTables = filter === 'all' ? store.tables : store.tables.filter((t) => t.status === filter)

  const handleTileClick = (table: TableRecord) => {
    setSelectedId(table.id)
    if (table.status === 'free') setModal('new-order')
    else if (table.status === 'occupied') setPanel('view-order')
    else setModal('locked')
  }

  const closeAll = () => { setModal('none'); setPanel('none'); setSelectedId(null); setEditTarget(null) }

  const handleOpenOrder = (customerName: string, guests: number) => {
    if (!selectedId) return
    const id = selectedId
    store.openOrder(id, customerName, guests)
    closeAll()
    navigate(`/order/${id}`)
  }

  const handleGenerateBill = async () => {
    if (!selectedId) return
    const id = selectedId
    closeAll()
    await store.generateBill(id)
    navigate(`/billing/${id}`)
  }

  const handleSettle = () => {
    if (!selectedId) return
    navigate(`/billing/${selectedId}`)
    closeAll()
  }

  const handleAddTable = () => {
    if (store.tables.length >= 50) return
    setEditTarget(null)
    setModal('add-table')
  }

  const handleEditTable = (t: TableRecord) => {
    setEditTarget(t)
    setModal('edit-table')
  }

  const handleSaveTable = async (name: string, seats: number, type: string) => {
    try {
      if (editTarget) { await store.edit(editTarget.id, name, seats, type); toast(`${name} updated`) }
      else { await store.add(name, seats, type); toast(`${name} added`) }
      closeAll()
    } catch (err: unknown) {
      toast((err as Error)?.message ?? 'Failed to save table')
    }
  }

  const FILTER_TABS: { key: Filter; label: string }[] = [
    { key: 'all', label: hi ? `सभी टेबल (${store.tables.length})` : `All Tables (${store.tables.length})` },
    { key: 'free', label: hi ? `🟢 मुक्त (${counts.free})` : `🟢 Free (${counts.free})` },
    { key: 'occupied', label: hi ? `🟡 व्यस्त (${counts.occupied})` : `🟡 Occupied (${counts.occupied})` },
    { key: 'bill-pending', label: hi ? `🔴 बिल बकाया (${counts['bill-pending']})` : `🔴 Bill Pending (${counts['bill-pending']})` },
  ]

  return (
    <PageShell
      activeRoute="/tables"
      topbar={
        <>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#3B1F0E', flex: 1 }}>{hi ? 'टेबल' : 'Tables'}</span>
          <LanguageToggle />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2E8B57', background: '#E8F5EE', border: '1px solid #86EFAC', padding: '4px 10px', borderRadius: 20, fontWeight: 500 }}>
            <div className="animate-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#2E8B57' }} />
            {lastSync ? (hi ? `लाइव · ${formatElapsed(lastSync.getTime())} पहले` : `Live · ${formatElapsed(lastSync.getTime()) || '< 1 min'} ago`) : (hi ? 'कनेक्ट हो रहा है…' : 'Connecting…')}
          </div>
          <button onClick={() => store.fetch()} style={{ width: 34, height: 34, borderRadius: 8, background: '#F9F5F0', border: '1px solid #DDD5C8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#6B5B4E' }}>↻</button>
          <BtnPrimary onClick={handleAddTable} disabled={store.tables.length >= 50}>{hi ? '＋ टेबल जोड़ें' : '＋ Add Table'}</BtnPrimary>
        </>
      }
    >
      {/* Summary strip */}
        <div style={{ background: 'white', borderBottom: '1px solid #F0EBE3', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          {[
            { key: 'free' as Filter, dot: '#2E8B57', count: counts.free, label: hi ? 'मुक्त' : 'Free' },
            { key: 'occupied' as Filter, dot: '#D97706', count: counts.occupied, label: hi ? 'व्यस्त' : 'Occupied' },
            { key: 'bill-pending' as Filter, dot: '#DC2626', count: counts['bill-pending'], label: hi ? 'बिल बकाया' : 'Bill Pending' },
          ].map((s, i) => (
            <div key={s.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: i === 0 ? 0 : 24 }}>
                {i > 0 && <div style={{ width: 1, height: 32, background: '#F0EBE3', marginRight: 24 }} />}
                <div
                  onClick={() => { setFilter(filter === s.key ? 'all' : s.key); setView('grid') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', background: filter === s.key ? '#FDF8F2' : 'transparent' }}
                  onMouseEnter={(e) => { if (filter !== s.key) (e.currentTarget as HTMLDivElement).style.background = '#F9F5F0' }}
                  onMouseLeave={(e) => { if (filter !== s.key) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot }} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#3B1F0E', lineHeight: 1 }}>{s.count}</div>
                    <div style={{ fontSize: 12, color: '#9E8E7E' }}>{s.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div style={{ width: 1, height: 32, background: '#F0EBE3' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9E8E7E' }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3B1F0E', lineHeight: 1 }}>{store.tables.length}</div>
              <div style={{ fontSize: 12, color: '#9E8E7E' }}>{hi ? `कुल · ${store.tables.length} / 50` : `Total · ${store.tables.length} of 50`}</div>
            </div>
          </div>
          <div
            onClick={() => setView('manage')}
            style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: '#7C4A1E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >{hi ? '⊞ टेबल प्रबंधन →' : '⊞ Manage Tables →'}</div>
        </div>

        {/* Content */}
        {view === 'grid' ? (
          <>
            {/* Filter tabs */}
            <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  style={{
                    padding: '6px 16px', borderRadius: '8px 8px 0 0',
                    fontSize: 13, fontWeight: filter === tab.key ? 600 : 500,
                    color: filter === tab.key ? '#3B1F0E' : '#9E8E7E',
                    cursor: 'pointer', border: filter === tab.key ? '1px solid #F0EBE3' : '1px solid transparent',
                    borderBottom: 'none', background: filter === tab.key ? 'white' : 'transparent',
                    fontFamily: 'inherit',
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {/* Grid */}
            <div style={{ padding: '0 24px 32px' }}>
              <div style={{ background: 'white', border: '1px solid #F0EBE3', borderRadius: '0 12px 12px 12px', padding: 20 }}>
                {/* AC-03.3 real-time note */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: '#9E8E7E' }}>
                  <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E8B57' }} />
                  Occupancy updates live across all devices
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: 12 }}>
                  {/* Suppress tick usage to force re-render for elapsed times */}
                  {tick >= 0 && visibleTables.map((table) => (
                    <TableTile key={table.id} table={table} onClick={() => handleTileClick(table)} />
                  ))}

                  {/* Add tile */}
                  {filter === 'all' && store.tables.length < 50 && (
                    <div
                      onClick={handleAddTable}
                      style={{ borderRadius: 12, border: '2px dashed #DDD5C8', background: 'white', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6, transition: 'border-color 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#7C4A1E'; (e.currentTarget as HTMLDivElement).style.color = '#7C4A1E' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#DDD5C8'; (e.currentTarget as HTMLDivElement).style.color = '#9E8E7E' }}
                    >
                      <div style={{ fontSize: 22, color: '#9E8E7E' }}>＋</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#9E8E7E' }}>Add Table</div>
                    </div>
                  )}

                  {visibleTables.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center', color: '#9E8E7E', fontSize: 13 }}>
                      No {filter === 'all' ? '' : filter.replace('-', ' ')} tables.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <ManageView
            tables={store.tables}
            onAdd={handleAddTable}
            onEdit={handleEditTable}
            onDelete={async (id) => {
              try {
                await store.remove(id)
                toast('Table removed')
              } catch (err: unknown) {
                toast((err as Error)?.message ?? 'Cannot delete table')
              }
            }}
          />
        )}

      {/* Back to grid link when in manage view */}
      {view === 'manage' && (
        <div style={{ padding: '0 24px 12px' }}>
          <button onClick={() => setView('grid')} style={{ fontSize: 13, color: '#7C4A1E', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Back to Occupancy Grid</button>
        </div>
      )}

      {/* Modals */}
      {modal === 'new-order' && (
        <NewOrderModal table={selectedTable} onClose={closeAll} onConfirm={handleOpenOrder} />
      )}
      {modal === 'locked' && (
        <LockedModal table={selectedTable} onClose={closeAll} onSettle={handleSettle} />
      )}
      {(modal === 'add-table' || modal === 'edit-table') && (
        <AddEditTableModal editTarget={editTarget} totalCount={store.tables.length} onClose={closeAll} onSave={handleSaveTable} />
      )}

      {/* Slide panel */}
      {panel === 'view-order' && (
        <ViewOrderPanel table={selectedTable} onClose={closeAll} onGenerateBill={handleGenerateBill} />
      )}
    </PageShell>
  )
}
