# ☕ CafeOSum

> *"Give every independent cafe owner in India the same operational intelligence that a chain like Starbucks has — at a price that works for a 10-table cafe."*

CafeOSum is an all-in-one cafe management and POS (Point of Sale) platform built specifically for **independent cafe owners in India**. It replaces the punching machine, the notebook, the WhatsApp order groups, and the end-of-month GST panic — with a single, affordable, mobile-friendly tool.

---

## The Problem

India's cafe and bar market is worth **$18.83 billion** and growing. Yet ~76% of it is run by independent operators who manage their entire business with:

- A punching machine for billing (no digital record, no GST tracking)
- A physical notebook for inventory (run out of stock before they notice)
- WhatsApp groups for orders (miscommunication, lost orders)
- A calculator at month-end for GST reconciliation

Enterprise POS tools like Petpooja (₹1,200+/mo) or Posist (₹3,000+/mo) are either too expensive or too complex for a 10-table cafe in Indore or Ranchi. **CafeOSum fills that gap.**

---

## Who Is It For?

**Primary — The Cafe Owner (Ramesh / Priya)**
- Runs a 5–15 table independent cafe in a tier-2 or tier-3 Indian city
- Comfortable with WhatsApp and UPI; not familiar with SaaS tools
- Wants to stop guessing which items sell, know when to restock, and stop the GST panic at month-end

**Secondary — The Cafe Staff (Suresh / Kavya)**
- Cashier or waiter operating on a shared tablet or mobile
- Needs to take orders fast and avoid billing mistakes

---

## What It Does

| Module | What the owner gets |
|---|---|
| 🧾 **Billing / POS** | GST-compliant bills with one tap — UPI QR, cash change calculator, card entry. Settle or void with full audit trail. |
| 🪑 **Table Management** | Colour-coded floor view — Free / Occupied / Bill Pending. Seat guests, track turnover. |
| 📋 **Order Entry** | Add items from the menu in 2 taps. Set quantities, add kitchen notes per item. |
| 📊 **Analytics** | Daily, weekly, monthly revenue. Top-selling items. Payment mode breakdown. End-of-day summary. |
| 🍽️ **Menu Management** | Build the full menu with categories, prices, and emoji. Link items to inventory. |
| 📦 **Inventory** | Stock depletes automatically when a bill is settled. Low-stock alerts before you run out. |
| 🔍 **Audit Trail** | Immutable log of every action — bills settled, items voided, menu changes. Nothing is hidden. |
| 🌐 **EN / HI Toggle** | Switch the entire UI between English and हिंदी instantly — every label, button, and error message. |

### Billing features that matter to a cafe owner

- **GST-ready** — CGST + SGST (2.5% each) calculated automatically and printed on every bill
- **Discount support** — apply a flat ₹ amount or % discount at the bill level
- **Comp items** — mark items as complimentary; they show at ₹0 and are excluded from revenue
- **Cash change calculator** — enter cash received, get the exact change to return
- **UPI QR** — display a QR code for any UPI app (GPay, PhonePe, BHIM, Paytm)
- **Void / Refund** — requires owner PIN and a mandatory reason; voided bills stay in history

---

## Try It Now

> **Live demo:** clone and run locally in under 2 minutes.

```bash
git clone https://github.com/SC30GSWNBA/cafeOSum-app.git
cd cafeOSum-app/cafeOSum-app
npm install
npm run dev
```

App runs at `http://localhost:5173`

**Demo credentials**

| Field | Value |
|---|---|
| Email | Any email — e.g. `owner@mycafe.com` |
| Password | `demo@123` |

> First time? Click **Create a free account** and register with any details. The onboarding flow walks you through setting up your cafe in under 5 minutes.

---

## Roadmap

**Sprint 1 (current — MVP)**
- [x] Auth — login, register, forgot password
- [x] Cafe onboarding — name, address, GSTIN
- [x] Table management — visual floor grid
- [x] Order entry — menu browse, add items, notes
- [x] Billing / POS — settle, void, discounts, comp items
- [x] Menu management — categories, items, emoji
- [x] Inventory — stock tracking, auto-deduction on bill settle
- [x] Analytics dashboard — revenue, top items, payment breakdown
- [x] Audit trail — immutable event log
- [x] EN / HI bilingual toggle

**Sprint 2 (coming)**
- [ ] Receipt sharing — WhatsApp, SMS, ESC/POS thermal print
- [ ] OTP / phone-based login
- [ ] Staff management — roles, PINs, per-staff audit view
- [ ] Customer self-ordering portal — QR code at each table
- [ ] Order fulfilment tracking — Ordered → In Prep → Ready → Served
- [ ] AI chatbot — ask *"What was my best-selling item this week?"* in plain language

---

## Project Structure

```
cafeOSum-app/        ← React + Vite source (the main app)
  src/
    pages/           ← One file per page (BillingPage, MenuPage, …)
    components/      ← Shared UI (AppSidebar, LanguageToggle, …)
    store/           ← Zustand stores (billStore, tableStore, …)

Mock_html/           ← Static HTML design mockups (open in any browser)
PRD/                 ← Product Requirements Document v1.0
```

---

## Tech Stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v3 |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Bilingual | Custom `useLanguageStore` — `'en'` / `'hi'` toggle |

---

## Competitive Context

| Product | Price/mo | Gap |
|---|---|---|
| Petpooja | ₹1,200+ | Complex, expensive add-ons |
| Posist | ₹3,000+ | Built for chains, overkill for small cafes |
| BillFeeds | ₹999+ | Billing only — no analytics, no staff management |
| **CafeOSum** | **₹499–799 (planned)** | Full suite — billing + inventory + analytics + AI (Sprint 2) |

---

## License

MIT — free to use, modify, and distribute.

---

*Built with ☕ by Sudip Roy · [PRD v1.0](PRD/CafeOSum_PRD_v1.0.md)*
