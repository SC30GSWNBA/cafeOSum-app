import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../store/authStore'
import { useOnboardingStore } from '../store/onboardingStore'
import type { MenuItem, TableItem } from '../store/onboardingStore'

// ── Zod schema for Step 1 ─────────────────────────────────────────
const step1Schema = z.object({
  cafeName: z.string().min(1, 'Cafe name is required'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\+?[\d\s\-(]{10,}$/, 'Enter a valid 10-digit mobile number'),
  ownerName: z.string().default(''),
  cafeType: z.string().default('Coffee Shop'),
  address: z.string().default(''),
  city: z.string().default(''),
  pincode: z.string().default(''),
  opensAt: z.string().default(''),
  closesAt: z.string().default(''),
})
type Step1Values = z.infer<typeof step1Schema>

// ── GSTIN validation ──────────────────────────────────────────────
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

type GstinState = 'empty' | 'partial' | 'valid' | 'invalid'

function getGstinState(val: string): GstinState {
  if (!val) return 'empty'
  if (val.length < 15) return 'partial'
  return GSTIN_RE.test(val) ? 'valid' : 'invalid'
}

// ── ID generator ──────────────────────────────────────────────────
function uid() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Operating hours options ────────────────────────────────────────
const OPENS_AT_OPTIONS = [
  '7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM',
  '10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM',
  '1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM',
]
const CLOSES_AT_OPTIONS = [
  '7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM',
  '9:30 PM','10:00 PM','10:30 PM','11:00 PM',
]

// ── Shared: TopBar ────────────────────────────────────────────────
function TopBar({ step, onSaveExit }: { step: number; onSaveExit: () => void }) {
  const done = step === 5
  return (
    <div className="sticky top-0 z-50 bg-white" style={{ borderBottom: '1px solid #F0EBE3' }}>
      <div className="flex items-center gap-4 px-6 h-14">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#3B1F0E', color: '#F0C040', fontSize: 16 }}
          >
            ☕
          </div>
          <span className="text-base font-bold" style={{ color: '#3B1F0E' }}>
            Cafe<span style={{ color: '#D4A017' }}>OSum</span>
          </span>
        </div>
        <div className="w-px h-7" style={{ background: '#F0EBE3' }} />
        <span className="text-sm font-semibold" style={{ color: '#3B1F0E' }}>Cafe Setup</span>
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: '#FDF8F2', border: '1px solid #DDD5C8', color: '#7C4A1E' }}
        >
          Step {step} of 5
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: '#E8F5EE', color: '#2E8B57' }}
          >
            ✓ {done ? 'All saved' : 'Progress saved'}
          </span>
          {!done && (
            <button
              onClick={onSaveExit}
              className="text-sm font-medium px-3.5 py-1.5 rounded-lg"
              style={{ color: '#6B5B4E', border: '1px solid #DDD5C8', background: 'white' }}
            >
              Save &amp; exit
            </button>
          )}
        </div>
      </div>
      <div className="h-[3px]" style={{ background: '#F0EBE3' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${step * 20}%`, background: done ? '#2E8B57' : '#7C4A1E' }}
        />
      </div>
    </div>
  )
}

// ── Shared: StepSidebar ───────────────────────────────────────────
const STEP_DEFS = [
  { label: 'Cafe Profile', sub: 'Name, address, logo' },
  { label: 'GST & Billing', sub: 'GSTIN, tax rates' },
  { label: 'Menu Items', sub: 'Add your dishes' },
  { label: 'Table Setup', sub: 'Configure floor layout' },
  { label: 'All Done!', sub: 'Start taking orders' },
]

const TIPS = [
  { bg: '#FEF3C7', color: '#D97706', text: '💡 Tip: Only Cafe Name and Mobile are required. You can skip the rest and fill them in later.' },
  { bg: '#EFF6FF', color: '#1D4ED8', text: '📋 GST tip: Under Composition Scheme (turnover < ₹1.5 Cr), you charge a flat rate instead of CGST/SGST.' },
  { bg: '#E8F5EE', color: '#2E8B57', text: '✓ 3 demo items pre-loaded. Edit or delete them — they\'re just examples to help you get started.' },
  { bg: '#FEF3C7', color: '#D97706', text: '🪑 Tip: Use names like "T1", "Window Seat", or "Outdoor 1" so staff recognise tables instantly.' },
  null,
]

function StepSidebar({
  step,
  cafeName,
  menuCount,
  tableCount,
  onStepClick,
}: {
  step: number
  cafeName: string
  menuCount: number
  tableCount: number
  onStepClick: (n: number) => void
}) {
  const doneSubs = [
    cafeName || 'Completed ✓',
    'GSTIN configured ✓',
    `${menuCount} items added ✓`,
    `${tableCount} tables added ✓`,
    'Ready to go live',
  ]
  const tip = TIPS[step - 1]

  return (
    <aside
      className="bg-white overflow-y-auto p-4 flex-shrink-0"
      style={{
        width: 256,
        borderRight: '1px solid #F0EBE3',
        position: 'sticky',
        top: 59,
        height: 'calc(100vh - 59px)',
      }}
    >
      <div
        className="text-[10px] font-bold tracking-wider uppercase mb-3 pl-1"
        style={{ color: '#9E8E7E' }}
      >
        Setup Steps
      </div>

      {STEP_DEFS.map((s, i) => {
        const n = i + 1
        const isDone = n < step
        const isActive = n === step
        return (
          <div key={n}>
            <button
              onClick={() => isDone && onStepClick(n)}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl mb-1 text-left"
              style={{
                background: isActive ? '#FDF8F2' : 'transparent',
                cursor: isDone ? 'pointer' : 'default',
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 font-bold"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  fontSize: isDone ? 14 : 12,
                  background: isDone ? '#E8F5EE' : isActive ? '#3B1F0E' : 'white',
                  color: isDone ? '#2E8B57' : isActive ? 'white' : '#9E8E7E',
                  border: `2px solid ${isDone ? '#2E8B57' : isActive ? '#3B1F0E' : '#DDD5C8'}`,
                }}
              >
                {isDone ? '✓' : n}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-semibold"
                  style={{
                    color: isDone ? '#9E8E7E' : '#3B1F0E',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {s.label}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#9E8E7E' }}>
                  {isDone ? doneSubs[i] : s.sub}
                </div>
              </div>
            </button>
            {i < 4 && (
              <div
                className="rounded ml-5 mb-1"
                style={{ width: 2, height: 10, background: '#F0EBE3' }}
              />
            )}
          </div>
        )
      })}

      {tip && (
        <div
          className="mt-7 p-3 rounded-xl text-[12px] leading-relaxed"
          style={{ background: tip.bg, color: tip.color }}
        >
          {tip.text}
        </div>
      )}
    </aside>
  )
}

// ── Shared: NavFooter ─────────────────────────────────────────────
function NavFooter({
  onBack,
  onSkip,
  skipLabel,
  onNext,
  finish,
}: {
  onBack?: () => void
  onSkip?: () => void
  skipLabel?: string
  onNext: () => void
  finish?: boolean
}) {
  return (
    <div
      className="sticky bottom-0 bg-white flex items-center justify-between gap-3 px-10 py-3.5 z-40"
      style={{ borderTop: '1px solid #F0EBE3' }}
    >
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ border: '1px solid #DDD5C8', color: '#6B5B4E', background: 'white' }}
          >
            ← Back
          </button>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm font-medium"
            style={{ color: '#9E8E7E', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {skipLabel ?? 'Skip this step →'}
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        className="px-6 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5"
        style={{ background: finish ? '#2E8B57' : '#3B1F0E' }}
      >
        {finish ? 'Go to Dashboard →' : 'Save & Continue →'}
      </button>
    </div>
  )
}

// ── Shared: Card ──────────────────────────────────────────────────
function Card({
  icon,
  title,
  optional,
  children,
}: {
  icon: string
  title: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl p-6 mb-4" style={{ border: '1px solid #F0EBE3' }}>
      <div className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: '#3B1F0E' }}>
        <span className="text-base">{icon}</span>
        {title}
        {optional && (
          <span
            className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ color: '#9E8E7E', background: '#F0EBE3' }}
          >
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Shared: Toggle ────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex-shrink-0 relative transition-colors duration-200"
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? '#2E8B57' : '#DDD5C8',
        border: 'none',
      }}
    >
      <span
        className="absolute top-0.5 transition-all duration-200 rounded-full"
        style={{ width: 18, height: 18, background: 'white', left: checked ? 20 : 2 }}
      />
    </button>
  )
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string
  sub: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-b-0"
      style={{ borderColor: '#F0EBE3' }}
    >
      <div>
        <div className="text-[13px] font-semibold" style={{ color: '#3B1F0E' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: '#9E8E7E' }}>{sub}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ── Shared: InfoCard ──────────────────────────────────────────────
function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-2.5 p-3 rounded-xl text-[13px] mb-4"
      style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}
    >
      <span className="text-[15px] flex-shrink-0">ℹ</span>
      <div>{children}</div>
    </div>
  )
}

// ── Shared: field label ───────────────────────────────────────────
function FieldLabel({
  children,
  required,
  optional,
}: {
  children: React.ReactNode
  required?: boolean
  optional?: boolean
}) {
  return (
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3B1F0E', letterSpacing: '0.1px' }}>
      {children}
      {required && <span className="ml-0.5" style={{ color: '#DC2626' }}>*</span>}
      {optional && (
        <span
          className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ color: '#9E8E7E', background: '#F0EBE3' }}
        >
          Optional
        </span>
      )}
    </label>
  )
}

// ── Shared: icon input wrapper ────────────────────────────────────
const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9E8E7E',
  fontSize: 14,
  pointerEvents: 'none',
}

// ── STEP 1: Cafe Profile ──────────────────────────────────────────
function Step1View({
  onNext,
  onSkip,
}: {
  onNext: (d: Step1Values) => void
  onSkip: () => void
}) {
  const store = useOnboardingStore()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      cafeName: store.cafeName,
      mobile: store.mobile,
      ownerName: store.ownerName,
      cafeType: store.cafeType || 'Coffee Shop',
      address: store.address,
      city: store.city,
      pincode: store.pincode,
      opensAt: store.opensAt || '8:00 AM',
      closesAt: store.closesAt || '10:00 PM',
    },
  })

  const inp = (hasError?: boolean) =>
    `cafe-input${hasError ? ' input-error' : ''}`

  return (
    <>
      <main className="flex-1 px-10 py-8" style={{ maxWidth: 740 }}>
        <div className="mb-6">
          <h2
            className="text-[22px] font-bold mb-1.5"
            style={{ color: '#3B1F0E', letterSpacing: '-0.3px' }}
          >
            Tell us about your cafe
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#9E8E7E' }}>
            This info appears on your bills and receipts. Only cafe name and mobile number are
            required to continue.
          </p>
        </div>

        {/* Logo upload */}
        <Card icon="🏪" title="Cafe Logo" optional>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: '#F0EBE3',
                border: '2px dashed #DDD5C8',
              }}
            >
              {logoPreview
                ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 28 }}>☕</span>
              }
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg"
                style={{ border: '1px solid #DDD5C8', color: '#7C4A1E', background: 'white', cursor: 'pointer' }}
              >
                {logoPreview ? 'Change logo' : 'Upload logo'}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => { setLogoPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="ml-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{ border: '1px solid #DDD5C8', color: '#DC2626', background: 'white', cursor: 'pointer' }}
                >
                  Remove
                </button>
              )}
              <div className="text-[11px] mt-1" style={{ color: '#9E8E7E' }}>
                PNG or JPG, max 2MB. Shown on printed bills and receipts.
              </div>
            </div>
          </div>
        </Card>

        {/* Basic Info */}
        <Card icon="📋" title="Basic Information">
          <div className="grid grid-cols-2 gap-4">
            {/* Cafe name */}
            <div>
              <FieldLabel required>Cafe name</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>☕</span>
                <input
                  {...register('cafeName')}
                  type="text"
                  placeholder="e.g. Brew & Bloom Cafe"
                  className={inp(!!errors.cafeName)}
                  style={{ padding: '8px 11px 8px 32px' }}
                />
              </div>
              {errors.cafeName && (
                <p className="text-[11px] mt-1" style={{ color: '#DC2626' }}>
                  {errors.cafeName.message}
                </p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <FieldLabel required>Mobile number</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>📱</span>
                <input
                  {...register('mobile')}
                  type="tel"
                  placeholder="+91 98765 43210"
                  className={inp(!!errors.mobile)}
                  style={{ padding: '8px 11px 8px 32px' }}
                />
              </div>
              {errors.mobile ? (
                <p className="text-[11px] mt-1" style={{ color: '#DC2626' }}>
                  {errors.mobile.message}
                </p>
              ) : (
                <p className="text-[11px] mt-1" style={{ color: '#9E8E7E' }}>
                  Used for account recovery and order notifications.
                </p>
              )}
            </div>

            {/* Owner name */}
            <div>
              <FieldLabel optional>Owner's name</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>👤</span>
                <input
                  {...register('ownerName')}
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  className="cafe-input"
                  style={{ padding: '8px 11px 8px 32px' }}
                />
              </div>
            </div>

            {/* Cafe type */}
            <div>
              <FieldLabel optional>Cafe type</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>🏷</span>
                <select
                  {...register('cafeType')}
                  className="cafe-input"
                  style={{ padding: '8px 28px 8px 32px', appearance: 'none' }}
                >
                  {['Coffee Shop', 'Bakery Cafe', 'Multi-cuisine Cafe', 'Tea House', 'Other'].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Address — full row */}
            <div className="col-span-2">
              <FieldLabel optional>Address</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>📍</span>
                <input
                  {...register('address')}
                  type="text"
                  placeholder="Street address"
                  className="cafe-input"
                  style={{ padding: '8px 11px 8px 32px' }}
                />
              </div>
            </div>

            {/* City */}
            <div>
              <FieldLabel optional>City</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>🌆</span>
                <input
                  {...register('city')}
                  type="text"
                  placeholder="e.g. Bengaluru"
                  className="cafe-input"
                  style={{ padding: '8px 11px 8px 32px' }}
                />
              </div>
            </div>

            {/* Pincode */}
            <div>
              <FieldLabel optional>Pincode</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>#</span>
                <input
                  {...register('pincode')}
                  type="text"
                  placeholder="560001"
                  className="cafe-input"
                  style={{ padding: '8px 11px 8px 32px' }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Operating hours */}
        <Card icon="🕐" title="Operating Hours" optional>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Opens between</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>🌅</span>
                <select
                  {...register('opensAt')}
                  className="cafe-input"
                  style={{ padding: '8px 28px 8px 32px', appearance: 'none' }}
                >
                  {OPENS_AT_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <p className="text-[11px] mt-1" style={{ color: '#9E8E7E' }}>7:00 AM – 3:00 PM</p>
            </div>
            <div>
              <FieldLabel>Closes at</FieldLabel>
              <div className="relative">
                <span style={iconStyle}>🌙</span>
                <select
                  {...register('closesAt')}
                  className="cafe-input"
                  style={{ padding: '8px 28px 8px 32px', appearance: 'none' }}
                >
                  {CLOSES_AT_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <p className="text-[11px] mt-1" style={{ color: '#9E8E7E' }}>7:00 PM – 11:00 PM</p>
            </div>
          </div>
        </Card>
      </main>

      <NavFooter onSkip={onSkip} skipLabel="Skip this step →" onNext={handleSubmit(onNext)} />
    </>
  )
}

// ── STEP 2: GST & Billing ─────────────────────────────────────────
function Step2View({
  onBack,
  onNext,
  onSkip,
}: {
  onBack: () => void
  onNext: (partial: Partial<ReturnType<typeof useOnboardingStore.getState>>) => void
  onSkip: () => void
}) {
  const store = useOnboardingStore()
  const [isGstRegistered, setIsGstRegistered] = useState(store.isGstRegistered)
  const [gstin, setGstin] = useState(store.gstin.toUpperCase())
  const [gstType, setGstType] = useState(store.gstType)
  const [businessName, setBusinessName] = useState(store.businessName)
  const [defaultCgst, setDefaultCgst] = useState(store.defaultCgst)
  const [defaultSgst] = useState(store.defaultSgst)
  const [printFooterNote, setPrintFooterNote] = useState(store.printFooterNote)
  const [showGstinOnBills, setShowGstinOnBills] = useState(store.showGstinOnBills)
  const [autoWhatsappReceipt, setAutoWhatsappReceipt] = useState(store.autoWhatsappReceipt)

  const gstinSt = getGstinState(gstin)

  const gstinInputClass = (() => {
    if (gstinSt === 'valid') return 'cafe-input input-valid'
    if (gstinSt === 'invalid') return 'cafe-input input-error'
    return 'cafe-input'
  })()

  const gstinMsg = (() => {
    if (gstinSt === 'empty')
      return { text: '15-character alphanumeric — e.g. 29AABCU9603R1ZP. We validate the format before saving.', color: '#9E8E7E' }
    if (gstinSt === 'partial')
      return { text: `${gstin.length} / 15 characters entered…`, color: '#9E8E7E' }
    if (gstinSt === 'valid')
      return { text: '✓ Valid GSTIN format', color: '#2E8B57' }
    return {
      text: '✕ Invalid GSTIN. Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 char + Z + 1 char',
      color: '#DC2626',
    }
  })()

  const handleNext = () => {
    onNext({
      isGstRegistered,
      gstin,
      gstType,
      businessName,
      defaultCgst,
      defaultSgst: defaultCgst.replace('(Food — standard)', '(auto-matched)').replace('(AC restaurant)', '').replace('(Exempt)', ''),
      printFooterNote,
      showGstinOnBills,
      autoWhatsappReceipt,
    })
  }

  const cgstOpts = [
    '2.5% (Food — standard)',
    '6%',
    '9% (AC restaurant)',
    '14%',
    '0% (Exempt)',
  ]

  return (
    <>
      <main className="flex-1 px-10 py-8" style={{ maxWidth: 740 }}>
        <div className="mb-6">
          <h2
            className="text-[22px] font-bold mb-1.5"
            style={{ color: '#3B1F0E', letterSpacing: '-0.3px' }}
          >
            GST &amp; billing setup
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#9E8E7E' }}>
            CafeOSum generates GST-compliant bills from day one. Enter your GSTIN if registered —
            this appears on every receipt.
          </p>
        </div>

        <InfoCard>
          All fields on this step are <strong>optional</strong>. If you skip GSTIN now, bills will
          show your cafe name without a tax number. You can add it anytime from Settings.
        </InfoCard>

        {/* GST Registration */}
        <Card icon="🏛" title="GST Registration">
          <ToggleRow
            label="I am GST registered"
            sub="Turn off if you are not registered under GST"
            checked={isGstRegistered}
            onChange={setIsGstRegistered}
          />

          {isGstRegistered && (
            <div className="mt-4 space-y-4">
              {/* GSTIN field */}
              <div>
                <FieldLabel optional>GSTIN</FieldLabel>
                <div className="relative">
                  <span style={iconStyle}>🔑</span>
                  <input
                    type="text"
                    value={gstin}
                    maxLength={15}
                    placeholder="e.g. 29AABCU9603R1ZP (15 characters)"
                    className={gstinInputClass}
                    style={{ padding: '8px 11px 8px 32px', textTransform: 'uppercase', letterSpacing: '1px' }}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: gstinMsg.color }}>
                  {gstinMsg.text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>GST Registration type</FieldLabel>
                  <div className="relative">
                    <span style={iconStyle}>📄</span>
                    <select
                      value={gstType}
                      onChange={(e) => setGstType(e.target.value)}
                      className="cafe-input"
                      style={{ padding: '8px 28px 8px 32px', appearance: 'none' }}
                    >
                      <option>Regular Taxpayer</option>
                      <option>Composition Scheme</option>
                      <option>Unregistered</option>
                    </select>
                  </div>
                </div>
                <div>
                  <FieldLabel optional>Business legal name</FieldLabel>
                  <div className="relative">
                    <span style={iconStyle}>🏢</span>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="As on GST certificate"
                      className="cafe-input"
                      style={{ padding: '8px 11px 8px 32px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Default Tax Rates */}
        <Card icon="💰" title="Default Tax Rates">
          <InfoCard>
            Food items typically attract <strong>5% GST</strong> (2.5% CGST + 2.5% SGST). AC
            restaurants charge <strong>18% GST</strong>. Set your default here — you can override
            per menu item.
          </InfoCard>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Default CGST rate</FieldLabel>
              <div className="relative">
                <span style={{ ...iconStyle, fontSize: 12, fontWeight: 700 }}>%</span>
                <select
                  value={defaultCgst}
                  onChange={(e) => setDefaultCgst(e.target.value)}
                  className="cafe-input"
                  style={{ padding: '8px 28px 8px 32px', appearance: 'none' }}
                >
                  {cgstOpts.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel>Default SGST rate</FieldLabel>
              <div className="relative">
                <span style={{ ...iconStyle, fontSize: 12, fontWeight: 700 }}>%</span>
                <select
                  className="cafe-input"
                  style={{ padding: '8px 28px 8px 32px', appearance: 'none' }}
                  disabled
                >
                  <option>2.5% (auto-matched)</option>
                </select>
              </div>
              <p className="text-[11px] mt-1" style={{ color: '#9E8E7E' }}>
                SGST always equals CGST under Indian GST rules.
              </p>
            </div>
          </div>
        </Card>

        {/* Billing Preferences */}
        <Card icon="🧾" title="Billing Preferences" optional>
          <ToggleRow
            label="Print bill footer note"
            sub={`e.g. "Thank you for visiting! Come again ☕"`}
            checked={printFooterNote}
            onChange={setPrintFooterNote}
          />
          <ToggleRow
            label="Show GSTIN on bills"
            sub="Required if GST registered"
            checked={showGstinOnBills}
            onChange={setShowGstinOnBills}
          />
          <ToggleRow
            label="Auto-send WhatsApp receipt"
            sub="Send digital receipt to customer after payment"
            checked={autoWhatsappReceipt}
            onChange={setAutoWhatsappReceipt}
          />
        </Card>
      </main>

      <NavFooter
        onBack={onBack}
        onSkip={onSkip}
        skipLabel="Skip GST for now"
        onNext={handleNext}
      />
    </>
  )
}

// ── STEP 3: Menu Setup ────────────────────────────────────────────
const CATEGORIES = ['☕ Coffee', '🍵 Tea', '🥗 Food', '🧁 Bakery', '🧃 Beverages']
const GST_RATES = ['5%', '0%', '12%', '18%']

function Step3View({
  onBack,
  onNext,
  onSkip,
}: {
  onBack: () => void
  onNext: (items: MenuItem[]) => void
  onSkip: () => void
}) {
  const store = useOnboardingStore()
  const [items, setItems] = useState<MenuItem[]>(() => store.menuItems)
  const [filter, setFilter] = useState('All')

  const updateItem = (id: string, field: keyof MenuItem, value: string | number) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: uid(), name: '', price: 0, category: '☕ Coffee', gstRate: '5%', isDemo: false },
    ])
  }

  const visible = filter === 'All' ? items : items.filter((it) => it.category === filter)

  const colLabel = 'text-[11px] font-bold uppercase tracking-[0.5px]'
  const colStyle = { color: '#9E8E7E' }

  return (
    <>
      <main className="flex-1 px-10 py-8" style={{ maxWidth: 740 }}>
        <div className="mb-6">
          <h2
            className="text-[22px] font-bold mb-1.5"
            style={{ color: '#3B1F0E', letterSpacing: '-0.3px' }}
          >
            Build your menu
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#9E8E7E' }}>
            Add the items your cafe serves. We've pre-loaded 3 sample items — edit, delete, or add
            your own. You can always update this from the Menu page.
          </p>
        </div>

        {/* Category filter */}
        <Card icon="🏷" title="Filter by category">
          <div className="flex flex-wrap gap-2">
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: filter === cat ? '#3B1F0E' : 'white',
                  color: filter === cat ? 'white' : '#6B5B4E',
                  border: `1px solid ${filter === cat ? '#3B1F0E' : '#DDD5C8'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>

        {/* Menu items */}
        <Card icon="📋" title="Menu Items">
          <div className="flex items-center mb-4">
            <span className="text-sm font-bold" style={{ color: '#3B1F0E' }}>📋 Menu Items</span>
            <span
              className="ml-2 text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: '#F0EBE3', color: '#6B5B4E' }}
            >
              {items.length} items
            </span>
          </div>

          {/* Header */}
          <div
            className="grid pb-2 mb-0"
            style={{
              gridTemplateColumns: '1fr 90px 110px 80px 36px',
              gap: 8,
              borderBottom: '2px solid #F0EBE3',
            }}
          >
            <div className={colLabel} style={colStyle}>Item Name</div>
            <div className={colLabel} style={colStyle}>Price (₹)</div>
            <div className={colLabel} style={colStyle}>Category</div>
            <div className={colLabel} style={colStyle}>GST</div>
            <div />
          </div>

          {/* Rows */}
          {(filter === 'All' ? items : visible).map((item) => (
            <div
              key={item.id}
              className="grid items-center py-2.5"
              style={{
                gridTemplateColumns: '1fr 90px 110px 80px 36px',
                gap: 8,
                borderBottom: '1px solid #F0EBE3',
                background: item.isDemo ? '#FFFBF5' : 'transparent',
              }}
            >
              <div>
                <div className="relative">
                  <span style={{ ...iconStyle, fontSize: 13 }}>📝</span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Item name"
                    className="cafe-input"
                    style={{ padding: '7px 8px 7px 28px', fontSize: 12 }}
                  />
                </div>
                <input
                  type="text"
                  value={item.hindiName ?? ''}
                  onChange={(e) => updateItem(item.id, 'hindiName', e.target.value)}
                  placeholder="हिंदी नाम (optional)"
                  className="cafe-input"
                  style={{ padding: '4px 8px', fontSize: 11, marginTop: 4, borderColor: '#DDD6FE', background: item.hindiName ? '#F5F3FF' : undefined }}
                />
                {item.isDemo && (
                  <span
                    className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1"
                    style={{ background: '#FEF3C7', color: '#D97706' }}
                  >
                    Demo
                  </span>
                )}
              </div>

              <div className="relative">
                <span style={{ ...iconStyle, fontSize: 12, fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  value={item.price || ''}
                  onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                  className="cafe-input"
                  style={{ padding: '7px 6px 7px 22px', fontSize: 12 }}
                />
              </div>

              <div>
                <select
                  value={item.category}
                  onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                  className="cafe-input"
                  style={{ padding: '7px 20px 7px 6px', fontSize: 12, appearance: 'none' }}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={item.gstRate}
                  onChange={(e) => updateItem(item.id, 'gstRate', e.target.value)}
                  className="cafe-input"
                  style={{ padding: '7px 20px 7px 6px', fontSize: 12, appearance: 'none' }}
                >
                  {GST_RATES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              <button
                onClick={() => deleteItem(item.id)}
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{
                  width: 28,
                  height: 28,
                  border: '1px solid #DDD5C8',
                  background: 'white',
                  color: '#DC2626',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#FEE2E2'
                  e.currentTarget.style.borderColor = '#DC2626'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.borderColor = '#DDD5C8'
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Add item row */}
          <div className="flex items-center gap-2.5 pt-3 mt-1">
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold"
              style={{
                border: '1px dashed #7C4A1E',
                background: '#FDF8F2',
                color: '#7C4A1E',
                cursor: 'pointer',
              }}
            >
              ＋ Add item
            </button>
            <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: '#9E8E7E' }}>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: '#F0EBE3', color: '#9E8E7E' }}
              >
                Sprint 2
              </span>
              Bulk import via CSV — coming soon
            </div>
          </div>
        </Card>
      </main>

      <NavFooter
        onBack={onBack}
        onSkip={onSkip}
        skipLabel="Skip — add menu later"
        onNext={() => onNext(items)}
      />
    </>
  )
}

// ── STEP 4: Table Setup ───────────────────────────────────────────
function Step4View({
  onBack,
  onNext,
  onSkip,
}: {
  onBack: () => void
  onNext: (tables: TableItem[]) => void
  onSkip: () => void
}) {
  const store = useOnboardingStore()
  const [tables, setTables] = useState<TableItem[]>(() =>
    store.tables.length > 0
      ? store.tables
      : [
          { id: uid(), name: 'Table 1', seats: 4 },
          { id: uid(), name: 'Table 2', seats: 4 },
          { id: uid(), name: 'Window Seat', seats: 2 },
        ]
  )

  const updateTable = (id: string, field: keyof TableItem, value: string | number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const deleteTable = (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id))
  }

  const addTable = () => {
    const n = tables.length + 1
    setTables((prev) => [...prev, { id: uid(), name: `Table ${n}`, seats: 4 }])
  }

  const colLabel = 'text-[11px] font-bold uppercase tracking-[0.5px]'
  const colStyle = { color: '#9E8E7E' }

  return (
    <>
      <main className="flex-1 px-10 py-8" style={{ maxWidth: 740 }}>
        <div className="mb-6">
          <h2
            className="text-[22px] font-bold mb-1.5"
            style={{ color: '#3B1F0E', letterSpacing: '-0.3px' }}
          >
            Set up your tables
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#9E8E7E' }}>
            Add the tables in your cafe. Staff will see these on the occupancy grid when taking
            orders. You can add up to 50 tables.
          </p>
        </div>

        {/* Table list */}
        <Card icon="📋" title="Add tables" optional>
          {/* Header */}
          <div
            className="grid pb-2 mb-1"
            style={{
              gridTemplateColumns: '1fr 120px 36px',
              gap: 8,
              borderBottom: '1px solid #F0EBE3',
            }}
          >
            <div className={colLabel} style={colStyle}>Table name / number</div>
            <div className={colLabel} style={colStyle}>Seats</div>
            <div />
          </div>

          {tables.map((t) => (
            <div
              key={t.id}
              className="grid items-center py-2"
              style={{ gridTemplateColumns: '1fr 120px 36px', gap: 8, borderBottom: '1px solid #F0EBE3' }}
            >
              <div className="relative">
                <span style={iconStyle}>🪑</span>
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => updateTable(t.id, 'name', e.target.value)}
                  className="cafe-input"
                  style={{ padding: '7px 8px 7px 28px', fontSize: 12 }}
                />
              </div>
              <div className="relative">
                <span style={{ ...iconStyle, fontSize: 12, fontWeight: 700 }}>#</span>
                <input
                  type="number"
                  value={t.seats}
                  min={1}
                  max={50}
                  onChange={(e) => updateTable(t.id, 'seats', Number(e.target.value))}
                  className="cafe-input"
                  style={{ padding: '7px 6px 7px 22px', fontSize: 12 }}
                />
              </div>
              <button
                onClick={() => deleteTable(t.id)}
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 28,
                  height: 28,
                  border: '1px solid #DDD5C8',
                  background: 'white',
                  color: '#DC2626',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#FEE2E2'
                  e.currentTarget.style.borderColor = '#DC2626'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.borderColor = '#DDD5C8'
                }}
              >
                ✕
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2.5 pt-3 mt-1">
            <button
              onClick={addTable}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold"
              style={{ border: '1px dashed #7C4A1E', background: '#FDF8F2', color: '#7C4A1E', cursor: 'pointer' }}
            >
              ＋ Add table
            </button>
            <div className="ml-auto text-xs" style={{ color: '#9E8E7E' }}>
              {tables.length} of 50 tables added
            </div>
          </div>
        </Card>

        {/* Floor plan preview */}
        <Card icon="🗺" title="Floor plan preview">
          <p className="text-xs mb-3" style={{ color: '#9E8E7E' }}>
            This is how staff will see your tables on the occupancy grid.
          </p>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {[
              { color: '#2E8B57', label: 'Free' },
              { color: '#D97706', label: 'Occupied' },
              { color: '#DC2626', label: 'Bill Pending' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs" style={{ color: '#6B5B4E' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {tables.map((t) => (
              <div
                key={t.id}
                className="flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 80,
                  height: 72,
                  border: '2px solid #2E8B57',
                  background: '#E8F5EE',
                }}
              >
                <span style={{ fontSize: 20 }}>🪑</span>
                <span className="text-[11px] font-semibold" style={{ color: '#2E8B57' }}>
                  {t.name || 'Table'}
                </span>
                <span className="text-[10px]" style={{ color: '#9E8E7E' }}>{t.seats} seats</span>
              </div>
            ))}
            <button
              onClick={addTable}
              className="flex flex-col items-center justify-center gap-1 rounded-xl"
              style={{
                width: 80,
                height: 72,
                border: '2px dashed #DDD5C8',
                background: 'white',
                color: '#9E8E7E',
                cursor: 'pointer',
                fontSize: 22,
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7C4A1E'; e.currentTarget.style.color = '#7C4A1E' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#DDD5C8'; e.currentTarget.style.color = '#9E8E7E' }}
            >
              ＋<span className="text-[11px] font-medium">Add</span>
            </button>
          </div>
        </Card>
      </main>

      <NavFooter
        onBack={onBack}
        onSkip={onSkip}
        skipLabel="Skip — configure tables later"
        onNext={() => onNext(tables)}
      />
    </>
  )
}

// ── STEP 5: All Done! ─────────────────────────────────────────────
function Step5View({
  onBack,
  onFinish,
}: {
  onBack: () => void
  onFinish: () => void
}) {
  const store = useOnboardingStore()
  const [showTour, setShowTour] = useState(false)

  const summaryItems = [
    { icon: '🏪', label: 'Cafe Profile', value: store.cafeName || 'Completed', ok: true },
    {
      icon: '🏛',
      label: 'GST Registration',
      value: store.gstin || (store.isGstRegistered ? 'Configured' : 'Skipped'),
      ok: !!store.gstin,
    },
    { icon: '📋', label: 'Menu Items', value: `${store.menuItems.length} items added`, ok: store.menuItems.length > 0 },
    { icon: '🪑', label: 'Tables', value: `${store.tables.length} tables configured`, ok: store.tables.length > 0 },
  ]

  const quickActions = [
    { icon: '🧾', label: 'Take my first order', sub: 'Open a table and start billing' },
    { icon: '📋', label: 'Add more menu items', sub: 'Build out my full menu' },
    { icon: '📦', label: 'Set up inventory tracking', sub: 'Map ingredients to menu items' },
  ]

  return (
    <>
      <main className="flex-1 px-10 py-8" style={{ maxWidth: 740 }}>
        {/* Completion header */}
        <div className="text-center pt-4 pb-6">
          <div
            className="flex items-center justify-center mx-auto mb-4 text-4xl"
            style={{ width: 72, height: 72, borderRadius: '50%', background: '#E8F5EE' }}
          >
            🎉
          </div>
          <h2 className="text-[26px] font-bold mb-1.5" style={{ color: '#3B1F0E' }}>
            You're all set{store.ownerName ? `, ${store.ownerName}` : ''}!
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#9E8E7E' }}>
            {store.cafeName || 'Your cafe'} is ready to go live.
            <br />
            Here's a summary of what you've configured.
          </p>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {summaryItems.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: '#F9F5F0', border: '1px solid #F0EBE3' }}
            >
              <span className="text-[22px]">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs" style={{ color: '#9E8E7E' }}>{s.label}</div>
                <div className="text-sm font-bold mt-0.5 truncate" style={{ color: '#3B1F0E' }}>
                  {s.value}
                </div>
              </div>
              <span className="text-lg" style={{ color: s.ok ? '#2E8B57' : '#D97706' }}>
                {s.ok ? '✓' : '⚠'}
              </span>
            </div>
          ))}
        </div>

        {/* Guided tour card (AC-02.6) */}
        <div
          className="flex items-center gap-4 p-5 rounded-xl mb-4"
          style={{ background: 'linear-gradient(135deg, #3B1F0E 0%, #7C4A1E 100%)' }}
        >
          <span className="text-4xl">🗺</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-white mb-1">Take a 2-minute guided tour</div>
            <div className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>
              We'll show you how to take your first order, generate a GST bill, and track your
              inventory — step by step.
            </div>
          </div>
          <button
            onClick={() => setShowTour(true)}
            className="px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0"
            style={{ background: '#D4A017', color: '#3B1F0E', border: 'none', cursor: 'pointer' }}
          >
            Start Tour →
          </button>
        </div>

        {/* Tooltip tour preview (AC-02.6) */}
        {showTour && (
          <div className="bg-white rounded-xl p-5 mb-4" style={{ border: '1px solid #F0EBE3' }}>
            <div className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: '#3B1F0E' }}>
              <span>💡</span> Guided tour preview — how tooltips look
            </div>
            <div className="flex gap-4 p-3 rounded-lg" style={{ background: '#F9F5F0' }}>
              <div className="flex flex-col gap-1.5 min-w-[130px]">
                {[
                  { icon: '⊞', label: 'Dashboard', active: true },
                  { icon: '🧾', label: 'Billing / POS', active: false },
                  { icon: '📋', label: 'Orders', active: false },
                  { icon: '📦', label: 'Inventory', active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="px-3 py-2 text-[13px] rounded-lg"
                    style={{
                      background: item.active ? '#FDF8F2' : 'transparent',
                      color: item.active ? '#3B1F0E' : '#9E8E7E',
                      fontWeight: item.active ? 600 : 400,
                      border: item.active ? '2px solid #D4A017' : '2px solid transparent',
                    }}
                  >
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
              <div
                className="relative p-3 rounded-lg text-xs text-white leading-relaxed"
                style={{ background: '#3B1F0E', maxWidth: 200 }}
              >
                <div
                  className="absolute"
                  style={{
                    left: -6,
                    top: 14,
                    width: 0,
                    height: 0,
                    borderTop: '6px solid transparent',
                    borderBottom: '6px solid transparent',
                    borderRight: '6px solid #3B1F0E',
                  }}
                />
                <strong style={{ color: '#F0C040' }}>This is your Dashboard</strong>
                <br />
                Get a real-time overview of today's revenue, live orders, and stock alerts — all in
                one place.
                <div className="flex items-center justify-between mt-2">
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>1 of 6</span>
                  <button
                    style={{ color: '#F0C040', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #F0EBE3' }}>
          <div className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: '#3B1F0E' }}>
            <span>⚡</span> What do you want to do first?
          </div>
          <div className="flex flex-col gap-2.5">
            {quickActions.map((a) => (
              <div
                key={a.label}
                className="flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer"
                style={{ border: '1px solid #F0EBE3' }}
                onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F9F5F0' }}
                onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <span className="text-2xl">{a.icon}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold" style={{ color: '#3B1F0E' }}>{a.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#9E8E7E' }}>{a.sub}</div>
                </div>
                <span style={{ color: '#9E8E7E' }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <NavFooter onBack={onBack} onNext={onFinish} finish />
    </>
  )
}

// ── Main OnboardingPage ───────────────────────────────────────────
export function OnboardingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const store = useOnboardingStore()

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth', { replace: true }); return }
    // If the stored data belongs to a different user, wipe it before they start filling
    if (user?.email) {
      const state = useOnboardingStore.getState()
      if (state.ownerEmail !== null && state.ownerEmail !== user.email) {
        state.reset()
      }
      if (state.ownerEmail !== user.email) {
        state.setOwner(user.email)
      }
    }
  }, [isAuthenticated, navigate, user?.email])

  const handleSaveExit = () => {
    store.finish(user?.email ?? '')
    navigate('/dashboard')
  }

  const handleStep1Next = (data: Step1Values) => {
    store.update({ ...data, step: 2 })
  }

  const handleStep2Next = (data: Partial<typeof store>) => {
    store.update({ ...(data as Parameters<typeof store.update>[0]), step: 3 })
  }

  const handleStep3Next = (items: MenuItem[]) => {
    store.update({ menuItems: items, step: 4 })
  }

  const handleStep4Next = (tables: TableItem[]) => {
    store.update({ tables, step: 5 })
  }

  const handleFinish = () => {
    store.finish(user?.email ?? '')
    navigate('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F9F5F0' }}>
      <TopBar step={store.step} onSaveExit={handleSaveExit} />

      <div className="flex flex-1">
        <StepSidebar
          step={store.step}
          cafeName={store.cafeName}
          menuCount={store.menuItems.length}
          tableCount={store.tables.length}
          onStepClick={store.goToStep}
        />

        <div className="flex flex-col flex-1">
          {store.step === 1 && (
            <Step1View
              onNext={handleStep1Next}
              onSkip={() => store.goToStep(2)}
            />
          )}
          {store.step === 2 && (
            <Step2View
              onBack={() => store.goToStep(1)}
              onNext={handleStep2Next}
              onSkip={() => store.goToStep(3)}
            />
          )}
          {store.step === 3 && (
            <Step3View
              onBack={() => store.goToStep(2)}
              onNext={handleStep3Next}
              onSkip={() => store.goToStep(4)}
            />
          )}
          {store.step === 4 && (
            <Step4View
              onBack={() => store.goToStep(3)}
              onNext={handleStep4Next}
              onSkip={() => store.goToStep(5)}
            />
          )}
          {store.step === 5 && (
            <Step5View
              onBack={() => store.goToStep(4)}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  )
}
