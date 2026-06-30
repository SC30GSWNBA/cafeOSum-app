import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useOnboardingStore, type MenuItem } from '../store/onboardingStore'
import { useLanguageStore } from '../store/languageStore'

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

const GST_RATES = ['0%', '5%', '12%', '18%']
const CATEGORY_PRESETS = ['🍵 Tea', '☕ Coffee', '🥗 Food', '🍔 Snacks', '🧁 Desserts', '🥤 Drinks', '🍱 Meals']

const CAT_HI: Record<string, string> = {
  '🍵 Tea':      '🍵 चाय',
  '☕ Coffee':   '☕ कॉफी',
  '🥗 Food':     '🥗 खाना',
  '🍔 Snacks':   '🍔 नाश्ता',
  '🧁 Desserts': '🧁 मिठाई',
  '🥤 Drinks':   '🥤 पेय',
  '🍱 Meals':    '🍱 भोजन',
}

function catEmoji(cat: string) { return cat.trim().split(' ')[0] || '🍽️' }

type ModalMode = 'none' | 'add' | 'edit' | 'delete'

interface FormState {
  name: string; hindiName: string; price: string; category: string; gstRate: string
}

const EMPTY_FORM: FormState = { name: '', hindiName: '', price: '', category: '', gstRate: '5%' }

export function MenuPage() {
  const navigate = useNavigate()
  const ob = useOnboardingStore()
  const [catFilter, setCatFilter] = useState('All')
  const [mode, setMode] = useState<ModalMode>('none')
  const [target, setTarget] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [err, setErr] = useState('')
  const [showCatSuggestions, setShowCatSuggestions] = useState(false)

  const { lang } = useLanguageStore()
  const hi = lang === 'hi'
  const items = ob.menuItems
  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))]
  const filtered = catFilter === 'All' ? items : items.filter((i) => i.category === catFilter)

  function openAdd() {
    setForm(EMPTY_FORM); setErr(''); setMode('add')
  }

  function openEdit(item: MenuItem) {
    setForm({ name: item.name, hindiName: item.hindiName ?? '', price: String(item.price), category: item.category, gstRate: item.gstRate })
    setErr(''); setTarget(item); setMode('edit')
  }

  function openDelete(item: MenuItem) { setTarget(item); setMode('delete') }

  function closeModal() { setMode('none'); setTarget(null); setErr('') }

  function handleSave() {
    if (!form.name.trim()) { setErr(hi ? 'वस्तु का नाम आवश्यक है' : 'Item name is required'); return }
    const price = parseFloat(form.price)
    if (!form.price || isNaN(price) || price <= 0) { setErr(hi ? 'वैध मूल्य दर्ज करें' : 'Enter a valid price'); return }
    if (!form.category.trim()) { setErr(hi ? 'श्रेणी आवश्यक है' : 'Category is required'); return }

    const data = {
      name: form.name.trim(),
      hindiName: form.hindiName.trim() || undefined,
      price,
      category: form.category.trim(),
      gstRate: form.gstRate,
    }

    if (mode === 'add') {
      const newItem: MenuItem = { ...data, id: `item-${Date.now()}`, isDemo: false }
      ob.update({ menuItems: [...items, newItem] })
    } else if (mode === 'edit' && target) {
      ob.update({ menuItems: items.map((i) => (i.id === target.id ? { ...i, ...data } : i)) })
    }
    closeModal()
  }

  function handleDelete() {
    if (!target) return
    ob.update({ menuItems: items.filter((i) => i.id !== target.id) })
    closeModal()
  }

  function setF(k: keyof FormState, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  const isOpen = mode !== 'none'

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.gray50, overflow: 'hidden' }}>
      <AppSidebar activeRoute="/menu" />

      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'white', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: C.gray600 }}
          >←</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.brownDark }}>{hi ? 'मेनू प्रबंधन' : 'Menu Management'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 20, fontSize: 12, fontWeight: 600, color: C.amber }}>
            📋 {items.length} {hi ? 'वस्तुएं' : 'items'}
          </div>
          <LanguageToggle />
          <div style={{ flex: 1 }} />
          <button
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >{hi ? '+ वस्तु जोड़ें' : '+ Add Item'}</button>
        </header>

        {/* Category filter */}
        <div style={{ background: 'white', borderBottom: `1px solid ${C.gray100}`, padding: '0 18px', display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0 }}>
          {categories.map((cat) => {
            const isActive = catFilter === cat
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 12, fontWeight: isActive ? 700 : 500, fontFamily: 'inherit',
                  color: isActive ? C.brownDark : C.gray400,
                  borderBottom: `2px solid ${isActive ? C.brownDark : 'transparent'}`,
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >{cat === 'All' ? (hi ? '🍽️ सभी' : '🍽️ All') : (hi ? (CAT_HI[cat] ?? cat) : cat)}</button>
            )
          })}
        </div>

        {/* Items grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.gray400, fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
              {hi ? 'इस श्रेणी में कोई वस्तु नहीं।' : 'No items in this category.'} <button onClick={openAdd} style={{ color: C.brownMid, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{hi ? 'जोड़ें →' : 'Add one →'}</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 4px rgba(59,31,14,0.05)' }}
                >
                  {/* Category emoji + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 28 }}>{catEmoji(item.category)}</span>
                    <div style={{ flex: 1 }} />
                    {item.isDemo && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}` }}>DEMO</span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}` }}>GST {item.gstRate}</span>
                  </div>

                  {/* Name */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>
                      {lang === 'hi' && item.hindiName ? item.hindiName : item.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>
                      {lang === 'hi' ? item.name : (item.hindiName ?? '')}
                    </div>
                  </div>

                  {/* Category label */}
                  <div style={{ fontSize: 11, color: C.gray600 }}>{item.category}</div>

                  {/* Price + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.brownDark }}>₹{item.price}</span>
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => openEdit(item)}
                      style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.gray200}`, background: C.gray50, cursor: 'pointer', fontSize: 14, color: C.gray600 }}
                      title="Edit"
                    >✏️</button>
                    <button
                      onClick={() => openDelete(item)}
                      style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.redBorder}`, background: C.redBg, cursor: 'pointer', fontSize: 14, color: C.red }}
                      title="Delete"
                    >🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {(mode === 'add' || mode === 'edit') && (
        <div
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{ position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'white', borderRadius: 16, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📋</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{mode === 'add' ? (hi ? 'मेनू वस्तु जोड़ें' : 'Add Menu Item') : (hi ? 'मेनू वस्तु बदलें' : 'Edit Menu Item')}</div>
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{mode === 'edit' ? target?.name : (hi ? 'नई वस्तु ऑर्डर एंट्री में दिखेगी' : 'New item visible in order entry')}</div>
              </div>
              <button onClick={closeModal} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'वस्तु का नाम *' : 'Item Name *'}</label>
                <input
                  value={form.name}
                  onChange={(e) => setF('name', e.target.value)}
                  placeholder="e.g. Masala Chai"
                  style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Hindi Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'हिंदी नाम' : 'Hindi Name'} <span style={{ color: C.gray400, fontWeight: 400 }}>{hi ? '(वैकल्पिक)' : '(optional)'}</span></label>
                <input
                  value={form.hindiName}
                  onChange={(e) => setF('hindiName', e.target.value)}
                  placeholder="e.g. मसाला चाय"
                  style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Price + GST */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'मूल्य (₹) *' : 'Price (₹) *'}</label>
                  <input
                    type="number" min={0} value={form.price}
                    onChange={(e) => setF('price', e.target.value)}
                    placeholder="0.00"
                    style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'GST दर' : 'GST Rate'}</label>
                  <select
                    value={form.gstRate}
                    onChange={(e) => setF('gstRate', e.target.value)}
                    style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'श्रेणी *' : 'Category *'}</label>
                <input
                  value={form.category}
                  onChange={(e) => { setF('category', e.target.value); setShowCatSuggestions(true) }}
                  onFocus={() => setShowCatSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCatSuggestions(false), 150)}
                  placeholder="e.g. 🍵 Tea"
                  style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }}
                />
                {showCatSuggestions && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${C.gray200}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(59,31,14,0.12)', zIndex: 10, overflow: 'hidden', marginTop: 2 }}>
                    {CATEGORY_PRESETS.filter((p) => p.toLowerCase().includes(form.category.toLowerCase())).map((p) => (
                      <button
                        key={p}
                        onMouseDown={() => { setF('category', p); setShowCatSuggestions(false) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'white', cursor: 'pointer', fontSize: 13, color: C.brownDark, fontFamily: 'inherit' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.gray50 }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}
                      >{p}</button>
                    ))}
                  </div>
                )}
              </div>

              {err && <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>⚠️ {err}</div>}
            </div>

            {/* Footer */}
            <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'रद्द करें' : 'Cancel'}</button>
              <button onClick={handleSave} style={{ padding: '9px 20px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {mode === 'add' ? (hi ? '+ वस्तु जोड़ें' : '+ Add Item') : (hi ? '✓ बदलाव सहेजें' : '✓ Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {mode === 'delete' && target && (
        <div
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{ position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'white', borderRadius: 16, width: 400, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🗑️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{hi ? 'वस्तु हटाएं?' : 'Delete Item?'}</div>
                <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{target.name} · ₹{target.price}</div>
              </div>
              <button onClick={closeModal} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
            </div>
            <div style={{ padding: 18, fontSize: 13, color: C.gray600, lineHeight: 1.6 }}>
              {hi ? <><strong>{target.name}</strong> को मेनू से हटा दिया जाएगा। मौजूदा बिल प्रभावित नहीं होंगे।</> : <>This will remove <strong>{target.name}</strong> from the menu. Existing bills will not be affected.</>}
            </div>
            <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'रद्द करें' : 'Cancel'}</button>
              <button onClick={handleDelete} style={{ padding: '9px 20px', background: C.red, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'हटाएं' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
