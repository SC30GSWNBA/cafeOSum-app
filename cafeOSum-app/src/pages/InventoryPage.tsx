import { useMemo, useState } from 'react'
import { AppSidebar } from '../components/AppSidebar'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguageStore } from '../store/languageStore'
import { useInventoryStore, type IngredientUnit } from '../store/inventoryStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { useAuthStore } from '../store/authStore'

type View = 'stock' | 'recipes' | 'autodeduct' | 'lowstock' | 'restock' | 'report' | 'unmapped'
type Modal = 'none' | 'add-ingredient' | 'edit-ingredient' | 'add-recipe' | 'quick-restock'

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

function ingStatus(stock: number, threshold: number): 'ok' | 'low' | 'critical' {
  if (threshold === 0) return 'ok'
  const ratio = stock / threshold
  if (ratio <= 0.6) return 'critical'
  if (ratio <= 1.0) return 'low'
  return 'ok'
}

function todayStart(): number {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
}

function StatusBadge({ status }: { status: 'ok' | 'low' | 'critical' }) {
  const { lang } = useLanguageStore()
  const map = {
    ok:       { bg: C.greenBg, border: C.greenBorder, color: C.green, label: lang === 'hi' ? '✓ ठीक' : '✓ OK' },
    low:      { bg: C.amberBg, border: C.amberBorder, color: C.amber, label: lang === 'hi' ? '⚠ कम' : '⚠ Low' },
    critical: { bg: C.redBg,   border: C.redBorder,   color: C.red,   label: lang === 'hi' ? '🔴 गंभीर' : '🔴 Critical' },
  }
  const s = map[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {s.label}
    </span>
  )
}

function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
  const status = ingStatus(stock, threshold)
  const maxDisplay = Math.max(stock, threshold * 2, 1)
  const pct = Math.min(100, (stock / maxDisplay) * 100)
  const fillColor = status === 'ok' ? C.green : status === 'low' ? C.amber : C.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.brownDark, minWidth: 48, whiteSpace: 'nowrap' }}>{stock}</span>
      <div style={{ flex: 1, height: 6, background: C.gray100, borderRadius: 3, minWidth: 80, maxWidth: 130 }}>
        <div style={{ height: '100%', borderRadius: 3, background: fillColor, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 11, color: C.gray400, whiteSpace: 'nowrap' }}>/ {threshold}</span>
    </div>
  )
}

const UNITS: IngredientUnit[] = ['g', 'ml', 'pcs', 'kg', 'L']

interface IngForm {
  name: string
  unit: IngredientUnit
  stock: string
  threshold: string
  supplier: string
}

const BLANK_ING: IngForm = { name: '', unit: 'g', stock: '', threshold: '', supplier: '' }

export function InventoryPage() {
  const store = useInventoryStore()
  const { menuItems } = useOnboardingStore()
  const { user } = useAuthStore()
  const ownerName = useOnboardingStore((s) => s.ownerName) || user?.cafeName || 'Owner'
  const { lang } = useLanguageStore()
  const hi = lang === 'hi'

  const [view, setView] = useState<View>('stock')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Modal>('none')

  // Ingredient form state (add + edit)
  const [ingForm, setIngForm] = useState<IngForm>(BLANK_ING)
  const [editIngId, setEditIngId] = useState<string | null>(null)
  const [ingError, setIngError] = useState('')

  // Recipe form state
  const [recipeMenuItemId, setRecipeMenuItemId] = useState('')
  const [recipeRows, setRecipeRows] = useState<Array<{ ingredientId: string; qty: string }>>([{ ingredientId: '', qty: '' }])
  const [recipeError, setRecipeError] = useState('')
  const [editingRecipeForMenuItemId, setEditingRecipeForMenuItemId] = useState<string | null>(null)

  // Quick restock modal
  const [quickIngId, setQuickIngId] = useState<string | null>(null)
  const [quickQty, setQuickQty] = useState('')
  const [quickNote, setQuickNote] = useState('')
  const [quickSuccess, setQuickSuccess] = useState(false)

  // Restock form (in Restock view)
  const [rstIngId, setRstIngId] = useState('')
  const [rstQty, setRstQty] = useState('')
  const [rstDate, setRstDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rstNote, setRstNote] = useState('')
  const [rstSuccess, setRstSuccess] = useState(false)

  // Computed
  const filteredIngredients = useMemo(() => {
    if (!search) return store.ingredients
    const q = search.toLowerCase()
    return store.ingredients.filter((i) => i.name.toLowerCase().includes(q))
  }, [store.ingredients, search])

  const mappedIngredientIds = useMemo(() => {
    const ids = new Set<string>()
    for (const r of store.recipes) for (const ri of r.ingredients) ids.add(ri.ingredientId)
    return ids
  }, [store.recipes])

  const unmappedIngredients = useMemo(
    () => store.ingredients.filter((i) => !mappedIngredientIds.has(i.id)),
    [store.ingredients, mappedIngredientIds]
  )

  const lowStockIngredients = useMemo(
    () => store.ingredients.filter((i) => ingStatus(i.stock, i.threshold) !== 'ok'),
    [store.ingredients]
  )

  const dailyReport = useMemo(() => {
    const start = todayStart()
    const todayLogs = store.deductionLogs.filter((l) => l.at >= start)
    const consumed: Record<string, number> = {}
    for (const log of todayLogs) {
      for (const e of log.entries) {
        consumed[e.ingredientId] = (consumed[e.ingredientId] ?? 0) + e.qty
      }
    }
    return store.ingredients.map((ing) => ({
      ...ing,
      consumed: consumed[ing.id] ?? 0,
      opening: ing.stock + (consumed[ing.id] ?? 0),
      closing: ing.stock,
      status: ingStatus(ing.stock, ing.threshold),
    }))
  }, [store.ingredients, store.deductionLogs])

  // Menu items that don't already have a recipe
  const unmappedMenuItems = useMemo(
    () => menuItems.filter((m) => !store.recipes.find((r) => r.menuItemId === m.id)),
    [menuItems, store.recipes]
  )

  // ─── Actions ───────────────────────────────────────────────────────────────

  function openAddIngredient() {
    setIngForm(BLANK_ING)
    setEditIngId(null)
    setIngError('')
    setModal('add-ingredient')
  }

  function openEditIngredient(id: string) {
    const ing = store.ingredients.find((i) => i.id === id)
    if (!ing) return
    setIngForm({ name: ing.name, unit: ing.unit, stock: String(ing.stock), threshold: String(ing.threshold), supplier: ing.supplier ?? '' })
    setEditIngId(id)
    setIngError('')
    setModal('edit-ingredient')
  }

  function handleSaveIngredient() {
    if (!ingForm.name.trim()) { setIngError('Name is required'); return }
    const stock = parseFloat(ingForm.stock)
    const threshold = parseFloat(ingForm.threshold)
    if (isNaN(stock) || stock < 0) { setIngError('Enter a valid stock quantity'); return }
    if (isNaN(threshold) || threshold < 0) { setIngError('Enter a valid threshold'); return }
    const data = { name: ingForm.name.trim(), unit: ingForm.unit, stock, threshold, supplier: ingForm.supplier.trim() || undefined }
    if (modal === 'edit-ingredient' && editIngId) {
      store.updateIngredient(editIngId, data)
    } else {
      store.addIngredient(data)
    }
    setModal('none')
  }

  function openAddRecipe(preselectedMenuItemId?: string) {
    setEditingRecipeForMenuItemId(null)
    setRecipeMenuItemId(preselectedMenuItemId ?? '')
    setRecipeRows([{ ingredientId: '', qty: '' }])
    setRecipeError('')
    setModal('add-recipe')
  }

  function openEditRecipe(menuItemId: string) {
    const recipe = store.recipes.find((r) => r.menuItemId === menuItemId)
    if (!recipe) return
    setEditingRecipeForMenuItemId(menuItemId)
    setRecipeMenuItemId(menuItemId)
    setRecipeRows(recipe.ingredients.map((ri) => ({ ingredientId: ri.ingredientId, qty: String(ri.qty) })))
    setRecipeError('')
    setModal('add-recipe')
  }

  function handleSaveRecipe() {
    if (!recipeMenuItemId) { setRecipeError('Select a menu item'); return }
    const validRows = recipeRows.filter((r) => r.ingredientId && parseFloat(r.qty) > 0)
    if (validRows.length === 0) { setRecipeError('Add at least one ingredient with a quantity > 0'); return }
    const menuItem = menuItems.find((m) => m.id === recipeMenuItemId)
    if (!menuItem) return
    const emoji = menuItem.category.split(' ')[0]
    store.addOrUpdateRecipe({
      menuItemId: recipeMenuItemId,
      menuItemName: menuItem.name,
      menuItemEmoji: emoji,
      ingredients: validRows.map((r) => ({ ingredientId: r.ingredientId, qty: parseFloat(r.qty) })),
    })
    setModal('none')
  }

  function openQuickRestock(ingId: string) {
    setQuickIngId(ingId)
    setQuickQty('')
    setQuickNote('')
    setQuickSuccess(false)
    setModal('quick-restock')
  }

  function handleQuickRestock() {
    const qty = parseFloat(quickQty)
    if (!quickIngId || isNaN(qty) || qty <= 0) return
    store.logRestock({ ingredientId: quickIngId, qty, date: new Date().toISOString().slice(0, 10), note: quickNote.trim() || undefined, loggedBy: ownerName })
    setQuickSuccess(true)
    setTimeout(() => setModal('none'), 1200)
  }

  function handleLogRestock() {
    const qty = parseFloat(rstQty)
    if (!rstIngId || isNaN(qty) || qty <= 0) return
    store.logRestock({ ingredientId: rstIngId, qty, date: rstDate, note: rstNote.trim() || undefined, loggedBy: ownerName })
    setRstIngId('')
    setRstQty('')
    setRstNote('')
    setRstSuccess(true)
    setTimeout(() => setRstSuccess(false), 2000)
  }

  // ─── Ingredient Table ───────────────────────────────────────────────────────

  function IngredientTable({ items }: { items: typeof store.ingredients }) {
    if (items.length === 0) {
      return (
        <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center', color: C.gray400, fontSize: 13 }}>
          {hi ? 'कोई सामग्री नहीं।' : 'No ingredients to show.'}
        </div>
      )
    }
    return (
      <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {(hi ? ['सामग्री', 'स्टॉक ▸ सीमा', 'अलर्ट', 'स्थिति', 'रेसिपी लिंक', 'क्रियाएं'] : ['Ingredient', 'Stock ▸ Threshold', 'Alert At', 'Status', 'Recipe Link', 'Actions']).map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: C.gray50, color: C.gray400, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${C.gray100}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((ing, idx) => {
              const status = ingStatus(ing.stock, ing.threshold)
              const isMapped = mappedIngredientIds.has(ing.id)
              return (
                <tr key={ing.id} style={{ borderBottom: idx < items.length - 1 ? `1px solid ${C.gray100}` : 'none' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: 600, color: C.brownDark, fontSize: 13 }}>{ing.name}</div>
                    <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{ing.unit}{ing.supplier ? ` · ${ing.supplier}` : ''}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <StockBar stock={ing.stock} threshold={ing.threshold} />
                  </td>
                  <td style={{ padding: '11px 14px', color: C.gray600, fontSize: 13 }}>
                    {ing.threshold} {ing.unit}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <StatusBadge status={status} />
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {isMapped
                      ? <span style={{ fontSize: 11, color: C.gray400 }}>{hi ? 'जुड़ा' : 'Linked'}</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.blueBg, border: `1px solid ${C.blueBorder}`, color: C.blue }}>{hi ? '🔗 नहीं जुड़ा' : '🔗 Unmapped'}</span>
                    }
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openQuickRestock(ing.id)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.greenBorder}`, background: C.greenBg, fontSize: 11, fontWeight: 600, color: C.green, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {hi ? '+ भरें' : '+ Restock'}
                      </button>
                      <button onClick={() => openEditIngredient(ing.id)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.gray200}`, background: 'white', fontSize: 11, fontWeight: 600, color: C.gray600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {hi ? '✏️ बदलें' : '✏️ Edit'}
                      </button>
                      {!isMapped && (
                        <button onClick={() => openAddRecipe()} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.blueBorder}`, background: C.blueBg, fontSize: 11, fontWeight: 600, color: C.blue, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {hi ? '🔗 जोड़ें' : '🔗 Map'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // ─── Views ─────────────────────────────────────────────────────────────────

  function StockView() {
    const total = store.ingredients.length
    const lowCount = lowStockIngredients.length
    const unmappedCount = unmappedIngredients.length
    const recipesLinked = store.recipes.length
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { val: total,       lbl: hi ? 'कुल सामग्री' : 'Total Ingredients', accent: false },
            { val: lowCount,    lbl: hi ? 'कम / गंभीर' : 'Low / Critical',    accent: lowCount > 0, bg: C.amberBg, border: C.amberBorder, color: C.amber },
            { val: unmappedCount, lbl: hi ? 'नहीं जुड़ा' : 'Unmapped',        accent: unmappedCount > 0, bg: C.blueBg, border: C.blueBorder, color: C.blue },
            { val: recipesLinked, lbl: hi ? 'रेसिपी जुड़ी' : 'Recipes Linked',  accent: false },
          ].map((chip) => (
            <div key={chip.lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: chip.accent ? chip.bg : 'white', border: `1px solid ${chip.accent ? chip.border : C.gray100}` }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: chip.accent ? chip.color : C.brownDark }}>{chip.val}</span>
              <span style={{ fontSize: 12, color: C.gray400, fontWeight: 500 }}>{chip.lbl}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark, marginBottom: 14 }}>{hi ? 'सामग्री सूची' : 'Ingredient Library'}</div>
        {IngredientTable({ items: filteredIngredients })}
      </div>
    )
  }

  function RecipesView() {
    if (store.recipes.length === 0) {
      return (
        <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark, marginBottom: 6 }}>{hi ? 'कोई रेसिपी नहीं' : 'No recipes mapped yet'}</div>
          <div style={{ fontSize: 13, color: C.gray400, marginBottom: 20 }}>{hi ? 'बिल चुकाने पर स्टॉक स्वतः घटे, इसके लिए मेनू आइटम को सामग्री से जोड़ें।' : 'Link menu items to ingredients so stock auto-deducts when bills are settled.'}</div>
          <button onClick={() => openAddRecipe()} style={{ padding: '9px 20px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {hi ? '+ पहली रेसिपी जोड़ें' : '+ Add First Recipe'}
          </button>
        </div>
      )
    }
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{hi ? 'रेसिपी मैपिंग' : 'Recipe Mapping'}</div>
            <div style={{ fontSize: 12, color: C.gray400, marginTop: 3 }}>{hi ? 'बिल चुकाने पर इन आइटम का स्टॉक स्वतः घटता है' : 'Stock auto-deducts when a bill containing these items is settled'}</div>
          </div>
          <button onClick={() => openAddRecipe()} style={{ padding: '7px 14px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {hi ? '+ नई रेसिपी' : '+ New Recipe'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {store.recipes.map((recipe) => {
            const hasLow = recipe.ingredients.some((ri) => {
              const ing = store.ingredients.find((i) => i.id === ri.ingredientId)
              return ing && ingStatus(ing.stock, ing.threshold) !== 'ok'
            })
            return (
              <div key={recipe.menuItemId} style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.gray100}` }}>
                  <span style={{ fontSize: 22 }}>{recipe.menuItemEmoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.brownDark }}>{recipe.menuItemName}</div>
                    <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{hi ? `${recipe.ingredients.length} सामग्री` : `${recipe.ingredients.length} ingredient${recipe.ingredients.length !== 1 ? 's' : ''}`}</div>
                  </div>
                  {hasLow
                    ? <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.amberBg, border: `1px solid ${C.amberBorder}`, color: C.amber }}>{hi ? '⚠ कम स्टॉक' : '⚠ Low Stock'}</span>
                    : <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green }}>{hi ? '✓ उपलब्ध' : '✓ Stocked'}</span>
                  }
                </div>
                <div style={{ padding: '10px 16px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {recipe.ingredients.map((ri) => {
                      const ing = store.ingredients.find((i) => i.id === ri.ingredientId)
                      if (!ing) return null
                      const low = ingStatus(ing.stock, ing.threshold) !== 'ok'
                      return (
                        <div key={ri.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.gray50, borderRadius: 7, fontSize: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: C.brownDark, minWidth: 60 }}>{ri.qty} {ing.unit}</span>
                          <span style={{ color: C.gray600, fontWeight: 500, flex: 1 }}>{ing.name}</span>
                          <span style={{ fontSize: 11, color: low ? C.amber : C.gray400, fontWeight: low ? 600 : 400, whiteSpace: 'nowrap' }}>
                            {low ? '⚠ ' : ''}{ing.stock} {ing.unit} {hi ? 'बचा' : 'left'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => openEditRecipe(recipe.menuItemId)} style={{ flex: 1, padding: 7, borderRadius: 7, border: `1.5px dashed ${C.gray200}`, background: 'white', fontSize: 12, fontWeight: 600, color: C.gray400, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {hi ? '✏️ बदलें' : '✏️ Edit Recipe'}
                    </button>
                    <button onClick={() => { if (confirm(`Remove recipe for ${recipe.menuItemName}?`)) store.removeRecipe(recipe.menuItemId) }} style={{ padding: '7px 12px', borderRadius: 7, border: `1px solid ${C.redBorder}`, background: C.redBg, fontSize: 12, fontWeight: 600, color: C.red, cursor: 'pointer', fontFamily: 'inherit' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {/* Un-mapped menu items hint */}
          {unmappedMenuItems.slice(0, 2).map((m) => (
            <div key={m.id} style={{ background: C.gray50, border: `1.5px dashed ${C.gray200}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 120 }}>
              <span style={{ fontSize: 22 }}>{m.category.split(' ')[0]}</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.gray600 }}>{m.name}</div>
              <button onClick={() => { setRecipeMenuItemId(m.id); openAddRecipe(m.id) }} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${C.gray200}`, background: 'white', fontSize: 12, fontWeight: 600, color: C.brownMid, cursor: 'pointer', fontFamily: 'inherit' }}>
                {hi ? '+ रेसिपी जोड़ें' : '+ Add Recipe'}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function AutoDeductView() {
    const latest = store.deductionLogs[0]
    if (!latest) {
      return (
        <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.blue, marginBottom: 6 }}>{hi ? 'अभी कोई कटौती नहीं' : 'No deductions yet'}</div>
          <div style={{ fontSize: 13, color: C.gray600 }}>{hi ? 'बिल चुकाने पर स्टॉक कटौती यहाँ दिखती है।' : 'Stock deductions appear here automatically when bills are settled. Settle a bill to see the first auto-deduction.'}</div>
        </div>
      )
    }
    const billDate = new Date(latest.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    return (
      <div>
        <div style={{ padding: '13px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
          <span style={{ fontSize: 20 }}>🧾</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{hi ? `✅ कटौती हुई — बिल #${latest.billId} चुकाया` : `✅ Deduction triggered — Bill #${latest.billId} settled`}</div>
            <div style={{ fontSize: 12, color: C.gray400, marginTop: 3 }}>{billDate}</div>
          </div>
        </div>
        <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {(hi ? ['सामग्री', 'पहले', 'कटौती — कारण', 'बाद', 'स्थिति'] : ['Ingredient', 'Before', 'Deducted — Why', 'After', 'Status']).map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: C.gray50, color: C.gray400, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${C.gray100}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latest.entries.map((e, idx) => {
                const status = ingStatus(e.after, store.ingredients.find((i) => i.id === e.ingredientId)?.threshold ?? 1)
                const isLast = idx === latest.entries.length - 1
                return (
                  <tr key={e.ingredientId} style={{ borderBottom: isLast ? 'none' : `1px solid ${C.gray100}` }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: C.brownDark }}>{e.ingredientName} <span style={{ fontSize: 11, color: C.gray400 }}>({e.unit})</span></td>
                    <td style={{ padding: '11px 14px', color: C.gray600 }}>{e.before} {e.unit}</td>
                    <td style={{ padding: '11px 14px', color: C.red, fontWeight: 700 }}>
                      −{e.qty} {e.unit}
                      <span style={{ display: 'block', fontSize: 11, color: C.gray400, fontWeight: 400, marginTop: 2 }}>{e.why}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: status === 'ok' ? C.brownDark : status === 'low' ? C.amber : C.red }}>{e.after} {e.unit}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {store.deductionLogs.length > 1 && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.gray400, textAlign: 'center' }}>
            {store.deductionLogs.length - 1} earlier deduction{store.deductionLogs.length > 2 ? 's' : ''} not shown. All history is tracked.
          </div>
        )}
      </div>
    )
  }

  function LowStockView() {
    const lowItems = store.ingredients.filter((i) => ingStatus(i.stock, i.threshold) !== 'ok')
    const criticalCount = store.ingredients.filter((i) => ingStatus(i.stock, i.threshold) === 'critical').length
    return (
      <div>
        {lowItems.length === 0 ? (
          <div style={{ padding: '13px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{hi ? 'सभी सामग्री पर्याप्त' : 'All ingredients are well-stocked'}</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 3 }}>{hi ? 'अभी कोई सामग्री सीमा से नीचे नहीं।' : 'No items are below their alert threshold right now.'}</div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '13px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, background: criticalCount > 0 ? C.redBg : C.amberBg, border: `1px solid ${criticalCount > 0 ? C.redBorder : C.amberBorder}` }}>
            <span style={{ fontSize: 20 }}>{criticalCount > 0 ? '🔴' : '⚠️'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: criticalCount > 0 ? C.red : C.amber }}>
                {hi ? `${lowItems.length} सामग्री सीमा से नीचे` : `${lowItems.length} Ingredient${lowItems.length !== 1 ? 's' : ''} Below Alert Threshold`}
                {criticalCount > 0 ? (hi ? ` · ${criticalCount} गंभीर` : ` · ${criticalCount} Critical`) : ''}
              </div>
              <div style={{ fontSize: 12, color: C.gray600, marginTop: 3, lineHeight: 1.6 }}>
                {hi ? 'खत्म होने से पहले भरें। सीमा बदलने के लिए पंक्ति संपादित करें।' : 'Restock before you run out. Edit any row to adjust its alert threshold.'}
              </div>
            </div>
          </div>
        )}
        {IngredientTable({ items: store.ingredients.filter((i) => ingStatus(i.stock, i.threshold) !== 'ok') })}
      </div>
    )
  }

  function RestockView() {
    const selectedIng = store.ingredients.find((i) => i.id === rstIngId)
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark, marginBottom: 3 }}>{hi ? 'पुनः भरपाई दर्ज करें' : 'Log a Restock'}</div>
          <div style={{ fontSize: 12, color: C.gray400 }}>{hi ? 'प्रत्येक प्रविष्टि तारीख, मात्रा और उपयोगकर्ता के साथ दर्ज होती है।' : 'Each entry is recorded with date, quantity, and user — feeds into the Daily Report'}</div>
        </div>
        <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'सामग्री' : 'Ingredient'}</label>
              <select value={rstIngId} onChange={(e) => setRstIngId(e.target.value)} style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="">{hi ? 'सामग्री चुनें…' : 'Select ingredient…'}</option>
                {store.ingredients.map((i) => {
                  const s = ingStatus(i.stock, i.threshold)
                  const tag = s === 'critical' ? ' 🔴 CRITICAL' : s === 'low' ? ' ⚠️ LOW' : ''
                  return <option key={i.id} value={i.id}>{i.name} — {i.stock}{i.unit} left{tag}</option>
                })}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'मात्रा जोड़ें' : 'Quantity Added'}</label>
              <input type="number" value={rstQty} onChange={(e) => setRstQty(e.target.value)} placeholder="e.g. 500" min="0" style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'इकाई (स्वतः)' : 'Unit (auto-filled)'}</label>
              <input readOnly value={selectedIng?.unit ?? '—'} style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.gray400, background: C.gray100, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'तारीख' : 'Date'}</label>
              <input type="date" value={rstDate} onChange={(e) => setRstDate(e.target.value)} style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'आपूर्तिकर्ता / नोट (वैकल्पिक)' : 'Supplier / Note (optional)'}</label>
              <input type="text" value={rstNote} onChange={(e) => setRstNote(e.target.value)} placeholder={hi ? 'जैसे अरुण ट्रेडर्स' : 'e.g. Arun Traders · Invoice #2451'} style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            <button onClick={handleLogRestock} disabled={!rstIngId || !rstQty} style={{ padding: '9px 20px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !rstIngId || !rstQty ? 0.5 : 1 }}>
              {hi ? '✅ दर्ज करें' : '✅ Log Restock'}
            </button>
            <button onClick={() => { setRstIngId(''); setRstQty(''); setRstNote('') }} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {hi ? 'साफ़' : 'Clear'}
            </button>
            {rstSuccess && <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{hi ? '✅ दर्ज!' : '✅ Logged!'}</span>}
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: C.brownDark, marginBottom: 10 }}>{hi ? 'हाल की भरपाई' : 'Recent Restock Log'}</div>
        {store.restockEntries.length === 0 ? (
          <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', color: C.gray400, fontSize: 13 }}>
            {hi ? 'अभी कोई भरपाई नहीं। ऊपर पहली डिलीवरी दर्ज करें।' : 'No restock entries yet. Log your first delivery above.'}
          </div>
        ) : (
          <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: C.gray50, borderBottom: `1px solid ${C.gray100}`, fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {hi ? 'भरपाई इतिहास' : 'Restock History'}
            </div>
            {store.restockEntries.slice(0, 20).map((entry, idx) => {
              const ing = store.ingredients.find((i) => i.id === entry.ingredientId)
              const dateStr = new Date(entry.loggedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              const timeStr = new Date(entry.loggedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: idx < store.restockEntries.length - 1 ? `1px solid ${C.gray100}` : 'none', fontSize: 13 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
                  <div style={{ fontWeight: 600, color: C.brownDark, flex: 1 }}>{ing?.name ?? entry.ingredientId}</div>
                  <div style={{ fontWeight: 700, color: C.green, whiteSpace: 'nowrap' }}>+{entry.qty} {ing?.unit}</div>
                  <div style={{ fontSize: 11, color: C.gray400, whiteSpace: 'nowrap' }}>
                    {dateStr} {timeStr}{entry.note ? ` · ${entry.note}` : ''}{entry.loggedBy ? ` · ${entry.loggedBy}` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function ReportView() {
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ padding: '6px 14px', background: C.brownDark, color: 'white', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>📅 {dateStr}</span>
          <span style={{ fontSize: 12, color: C.gray400 }}>{hi ? 'शुरुआत → आज का उपभोग → बंद स्टॉक' : 'Opening → Consumed Today → Closing Stock'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {['📄 Export PDF', '📊 Export CSV'].map((label) => (
              <button key={label} onClick={() => alert('Export available in Sprint 2')} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', fontSize: 12, fontWeight: 600, color: C.gray600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background: 'white', border: `1px solid ${C.gray100}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {(hi ? ['सामग्री', 'इकाई', 'शुरुआती स्टॉक', 'आज उपभोग', 'बंद स्टॉक', 'स्थिति'] : ['Ingredient', 'Unit', 'Opening Stock', 'Consumed Today', 'Closing Stock', 'Status']).map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', background: C.gray50, color: C.gray400, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${C.gray100}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyReport.map((row, idx) => (
                <tr key={row.id} style={{ borderBottom: idx < dailyReport.length - 1 ? `1px solid ${C.gray100}` : 'none' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: C.brownDark }}>{row.name}</td>
                  <td style={{ padding: '11px 14px', color: C.gray400 }}>{row.unit}</td>
                  <td style={{ padding: '11px 14px', color: C.brownDark }}>{row.opening}</td>
                  <td style={{ padding: '11px 14px', color: row.consumed > 0 ? C.red : C.gray400, fontWeight: row.consumed > 0 ? 600 : 400 }}>
                    {row.consumed > 0 ? `−${row.consumed}` : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: row.status === 'ok' ? C.brownDark : row.status === 'low' ? C.amber : C.red }}>
                    {row.closing}
                  </td>
                  <td style={{ padding: '11px 14px' }}><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function UnmappedView() {
    const items = store.ingredients.filter((i) => !mappedIngredientIds.has(i.id))
    return (
      <div>
        <div style={{ padding: '13px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, background: C.blueBg, border: `1px solid ${C.blueBorder}` }}>
          <span style={{ fontSize: 20 }}>🔗</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>
              {hi ? `${items.length} सामग्री किसी रेसिपी से नहीं जुड़ी` : `${items.length} Ingredient${items.length !== 1 ? 's' : ''} Not Linked to Any Recipe`}
            </div>
            <div style={{ fontSize: 12, color: C.gray600, marginTop: 3, lineHeight: 1.6 }}>
              {hi ? <>नहीं जुड़ी सामग्री बिल चुकाने पर स्वतः नहीं घटेगी। <strong>रेसिपी</strong> टैब पर जाकर जोड़ें।</> : <>Unmapped ingredients won't auto-deduct when bills are settled. Go to <strong>Recipes</strong> tab to link them to menu items.</>}
            </div>
          </div>
        </div>
        {IngredientTable({ items })}
      </div>
    )
  }

  // ─── Quick Restock Modal ────────────────────────────────────────────────────

  function QuickRestockModal() {
    const ing = store.ingredients.find((i) => i.id === quickIngId)
    if (!ing) return null
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: 16, width: 400, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{hi ? `भरपाई: ${ing.name}` : `Restock: ${ing.name}`}</div>
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{hi ? `वर्तमान: ${ing.stock} ${ing.unit} · सीमा: ${ing.threshold} ${ing.unit}` : `Current: ${ing.stock} ${ing.unit} · Threshold: ${ing.threshold} ${ing.unit}`}</div>
            </div>
            <button onClick={() => setModal('none')} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quickSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: C.green, fontSize: 16, fontWeight: 700 }}>{hi ? '✅ दर्ज!' : '✅ Logged!'}</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? `मात्रा जोड़ें (${ing.unit})` : `Quantity Added (${ing.unit})`}</label>
                  <input type="number" value={quickQty} onChange={(e) => setQuickQty(e.target.value)} placeholder={`e.g. 500`} min="0" autoFocus style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>{hi ? 'आपूर्तिकर्ता / नोट (वैकल्पिक)' : 'Supplier / Note (optional)'}</label>
                  <input type="text" value={quickNote} onChange={(e) => setQuickNote(e.target.value)} placeholder={hi ? 'जैसे अरुण ट्रेडर्स' : 'e.g. Arun Traders'} style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </>
            )}
          </div>
          {!quickSuccess && (
            <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal('none')} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'रद्द' : 'Cancel'}</button>
              <button onClick={handleQuickRestock} disabled={!quickQty || parseFloat(quickQty) <= 0} style={{ padding: '9px 20px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !quickQty || parseFloat(quickQty) <= 0 ? 0.5 : 1 }}>
                {hi ? '✅ दर्ज करें' : '✅ Log Restock'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Add/Edit Ingredient Modal ──────────────────────────────────────────────

  function IngredientModal() {
    const isEdit = modal === 'edit-ingredient'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: 16, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{isEdit ? (hi ? 'सामग्री बदलें' : 'Edit Ingredient') : (hi ? 'नई सामग्री जोड़ें' : 'Add New Ingredient')}</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{hi ? 'नाम, इकाई, स्टॉक और न्यूनतम सीमा' : 'Name, unit, opening stock, and low-stock threshold'}</div>
            </div>
            <button onClick={() => setModal('none')} style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Ingredient Name *</label>
                <input type="text" value={ingForm.name} onChange={(e) => setIngForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Almond Milk" autoFocus style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Unit of Measurement *</label>
                <select value={ingForm.unit} onChange={(e) => setIngForm((f) => ({ ...f, unit: e.target.value as IngredientUnit }))} style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <span style={{ fontSize: 11, color: C.gray400 }}>Use the unit your supplier bills in</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Current Stock Quantity *</label>
                <input type="number" value={ingForm.stock} onChange={(e) => setIngForm((f) => ({ ...f, stock: e.target.value }))} placeholder="e.g. 500" min="0" style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Low-stock Alert Threshold *</label>
                <input type="number" value={ingForm.threshold} onChange={(e) => setIngForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="e.g. 100" min="0" style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
                <span style={{ fontSize: 11, color: C.gray400 }}>Alert fires when stock drops below this</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Supplier (optional)</label>
                <input type="text" value={ingForm.supplier} onChange={(e) => setIngForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="e.g. Arun Traders" style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
            {ingError && <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{ingError}</div>}
            <div style={{ fontSize: 11, color: C.gray400, background: C.gray50, border: `1px solid ${C.gray100}`, borderRadius: 7, padding: '8px 10px', lineHeight: 1.6 }}>
              📋 After adding, go to <strong>Recipes</strong> tab to link this ingredient to menu items for automatic deduction.
            </div>
          </div>
          <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal('none')} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'रद्द' : 'Cancel'}</button>
            <button onClick={handleSaveIngredient} style={{ padding: '9px 20px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {isEdit ? (hi ? '💾 बदलाव सहेजें' : '💾 Save Changes') : (hi ? '📦 सामग्री जोड़ें' : '📦 Add Ingredient')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Add/Edit Recipe Modal ──────────────────────────────────────────────────

  function RecipeModal() {
    const isEdit = !!editingRecipeForMenuItemId
    const availableMenuItems = isEdit
      ? menuItems
      : [...menuItems.filter((m) => !store.recipes.find((r) => r.menuItemId === m.id)), ...menuItems.filter((m) => !!store.recipes.find((r) => r.menuItemId === m.id))]

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(59,31,14,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: 16, width: 520, maxWidth: '95vw', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(59,31,14,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔗</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.brownDark }}>{isEdit ? (hi ? 'रेसिपी बदलें' : 'Edit Recipe') : (hi ? 'रेसिपी जोड़ें' : 'Add Recipe')}</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{hi ? 'मेनू आइटम को सामग्री से जोड़ें — बिल पर स्वतः कटौती होगी' : 'Map ingredients to a menu item for automatic stock deduction'}</div>
            </div>
            <button onClick={() => setModal('none')} style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.gray200}`, background: 'white', cursor: 'pointer', fontSize: 14, color: C.gray400 }}>✕</button>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Menu Item *</label>
              <select value={recipeMenuItemId} onChange={(e) => setRecipeMenuItemId(e.target.value)} disabled={isEdit} style={{ padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: isEdit ? C.gray100 : C.gray50, outline: 'none', fontFamily: 'inherit', cursor: isEdit ? 'default' : 'pointer' }}>
                <option value="">Select a menu item…</option>
                {availableMenuItems.map((m) => (
                  <option key={m.id} value={m.id}>{m.category.split(' ')[0]} {m.name}{store.recipes.find((r) => r.menuItemId === m.id) ? ' (has recipe)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 8 }}>Ingredients *</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recipeRows.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={row.ingredientId} onChange={(e) => { const r = [...recipeRows]; r[idx] = { ...r[idx], ingredientId: e.target.value }; setRecipeRows(r) }} style={{ flex: 2, padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                      <option value="">Select ingredient…</option>
                      {store.ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                    <input type="number" value={row.qty} onChange={(e) => { const r = [...recipeRows]; r[idx] = { ...r[idx], qty: e.target.value }; setRecipeRows(r) }} placeholder="Qty" min="0" style={{ flex: 1, padding: '9px 12px', border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, color: C.brownDark, background: C.gray50, outline: 'none', fontFamily: 'inherit' }} />
                    {row.ingredientId && <span style={{ fontSize: 11, color: C.gray400, minWidth: 24 }}>{store.ingredients.find((i) => i.id === row.ingredientId)?.unit}</span>}
                    {recipeRows.length > 1 && (
                      <button onClick={() => setRecipeRows(recipeRows.filter((_, i) => i !== idx))} style={{ width: 28, height: 28, border: `1px solid ${C.redBorder}`, background: C.redBg, borderRadius: 6, fontSize: 13, color: C.red, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setRecipeRows([...recipeRows, { ingredientId: '', qty: '' }])} style={{ marginTop: 8, width: '100%', padding: 8, borderRadius: 7, border: `1.5px dashed ${C.gray200}`, background: 'white', fontSize: 12, fontWeight: 600, color: C.gray400, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Add Ingredient Row
              </button>
            </div>

            {recipeError && <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{recipeError}</div>}
          </div>
          <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
            <button onClick={() => setModal('none')} style={{ padding: '9px 20px', background: 'white', color: C.gray600, border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{hi ? 'रद्द' : 'Cancel'}</button>
            <button onClick={handleSaveRecipe} style={{ padding: '9px 20px', background: C.brownDark, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {isEdit ? (hi ? '💾 रेसिपी अपडेट करें' : '💾 Update Recipe') : (hi ? '🔗 रेसिपी सहेजें' : '🔗 Save Recipe')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Tab definitions ────────────────────────────────────────────────────────

  const TABS: Array<{ id: View; label: string; badge?: number }> = [
    { id: 'stock',      label: hi ? 'स्टॉक' : 'Stock' },
    { id: 'recipes',    label: hi ? 'रेसिपी' : 'Recipes' },
    { id: 'autodeduct', label: hi ? 'स्वतः काटें' : 'Auto-deduct' },
    { id: 'lowstock',   label: hi ? 'कम स्टॉक' : 'Low Stock', badge: lowStockIngredients.length || undefined },
    { id: 'restock',    label: hi ? 'पुनः भरें' : 'Restock' },
    { id: 'report',     label: hi ? 'दैनिक रिपोर्ट' : 'Daily Report' },
    { id: 'unmapped',   label: hi ? 'अनमैप्ड' : 'Unmapped', badge: unmappedIngredients.length || undefined },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.gray50, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <AppSidebar activeRoute="/inventory" />
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: 'white', borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.brownDark }}>📦 {hi ? 'इन्वेंटरी' : 'Inventory'}</span>
          <LanguageToggle />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, background: C.gray50, fontSize: 13, color: C.gray400, minWidth: 200 }}>
            <span>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={hi ? 'सामग्री खोजें…' : 'Search ingredients…'}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: C.brownDark, width: '100%', fontFamily: 'inherit' }}
            />
          </div>
          <button onClick={openAddIngredient} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.gray50, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.brownDark, fontFamily: 'inherit' }}>
            {hi ? '+ सामग्री जोड़ें' : '+ Add Ingredient'}
          </button>
          <button onClick={() => setView('restock')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: C.brownDark, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {hi ? '📥 पुनः भरें' : '📥 Restock'}
          </button>
        </header>

        {/* Tab Strip */}
        <div style={{ background: 'white', borderBottom: `1px solid ${C.gray100}`, padding: '0 18px', display: 'flex', gap: 2, flexShrink: 0 }}>
          {TABS.map((tab) => {
            const isActive = view === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  padding: '10px 14px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.brownDark : C.gray400, cursor: 'pointer', borderBottom: isActive ? `2px solid ${C.brownDark}` : '2px solid transparent',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span style={{ padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: tab.id === 'unmapped' ? C.blueBg : C.amberBg, color: tab.id === 'unmapped' ? C.blue : C.amber, border: `1px solid ${tab.id === 'unmapped' ? C.blueBorder : C.amberBorder}` }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {view === 'stock'      && StockView()}
          {view === 'recipes'    && RecipesView()}
          {view === 'autodeduct' && AutoDeductView()}
          {view === 'lowstock'   && LowStockView()}
          {view === 'restock'    && RestockView()}
          {view === 'report'     && ReportView()}
          {view === 'unmapped'   && UnmappedView()}
        </div>
      </div>

      {/* Modals */}
      {(modal === 'add-ingredient' || modal === 'edit-ingredient') && IngredientModal()}
      {modal === 'add-recipe' && RecipeModal()}
      {modal === 'quick-restock' && QuickRestockModal()}
    </div>
  )
}
