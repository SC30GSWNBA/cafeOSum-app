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
| 🪑 **Table Management** | Colour-coded floor view — Free / Occupied / Bill Pending. Seat guests, track turnover. Order state is restored even after page refresh. |
| 📋 **Order Entry** | Add items from the menu in 2 taps. Set quantities, add kitchen notes per item. Send to kitchen in one tap. |
| 📊 **Analytics** | Daily, weekly, monthly revenue. Top-selling items. Payment mode breakdown. End-of-day summary. |
| 🍽️ **Menu Management** | Build the full menu with categories, prices, and emoji. Link items to inventory via recipes. |
| 📦 **Inventory** | Stock depletes automatically when a bill is settled. Low-stock alerts before you run out. |
| 🔍 **Audit Trail** | Immutable log of every action — bills settled, items voided, menu changes, login events. Persists across sessions. |
| 🌐 **EN / HI Toggle** | Switch the entire UI between English and हिंदी instantly — every label, button, and error message. |

### Billing features that matter to a cafe owner

- **GST-ready** — CGST + SGST (2.5% each) calculated automatically and printed on every bill
- **Discount support** — apply a flat ₹ amount or % discount at the bill level
- **Comp items** — mark items as complimentary; they show at ₹0 and are excluded from revenue
- **Cash change calculator** — enter cash received, get the exact change to return
- **UPI QR** — display a QR code for any UPI app (GPay, PhonePe, BHIM, Paytm)
- **Void / Refund** — requires a mandatory reason; voided bills stay in history with full traceability

---

## Live Demo

**Try the deployed app now — no setup required.**

> [https://caseosum.netlify.app](https://caseosum.netlify.app)

- Frontend hosted on **Netlify**
- Backend API hosted on **Railway**
- Database on **Supabase (PostgreSQL)**

Click **Create a free account** to register and walk through the onboarding flow in under 5 minutes.

---

## Run Locally

> Follow these steps only if you want to run the app on your own machine. For a quick look, use the [live demo](#live-demo) above.

### 1. Clone the repo

```bash
git clone https://github.com/SC30GSWNBA/cafeOSum-app.git
cd cafeOSum-app
```

### 2. Start the backend

```bash
cd cafeOSum-backend
npm install
```

Create a `.env` file (use `.env.example` as the template):

```bash
cp .env.example .env
# Fill in your DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

Run the database migration (requires a running Postgres / Supabase instance):

```bash
npx prisma migrate deploy
npm run dev
```

Backend runs at `http://localhost:3001`

### 3. Start the frontend

```bash
cd ../cafeOSum-app
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Register and go

- Open `http://localhost:5173`
- Click **Create a free account**
- The onboarding flow walks you through setting up your cafe in under 5 minutes

---

## Roadmap

**Sprint 1 — MVP (complete)**
- [x] Auth — register, login, JWT refresh, forgot / reset password, rate-limiting
- [x] Cafe onboarding — name, address, GSTIN, table seeding
- [x] Table management — visual floor grid with real-time status via SSE
- [x] Order entry — menu browse, add items, notes, send to kitchen
- [x] Billing / POS — settle, void, discounts, comp items, GST engine
- [x] Menu management — categories, items, emoji, recipe linking
- [x] Inventory — stock tracking, auto-deduction on bill settle, low-stock alerts
- [x] Analytics dashboard — revenue, top items, payment breakdown, end-of-day summary
- [x] Audit trail — immutable event log persisted to database via async queue
- [x] EN / HI bilingual toggle
- [x] Full REST backend — Fastify + Prisma + Supabase (all modules live)
- [x] Frontend fully wired to API — all pages call real endpoints, no localStorage stubs

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
cafeOSum-app/              ← React + Vite frontend
  src/
    lib/
      api.ts               ← Central apiFetch helper (JWT, auto-refresh on 401)
    pages/                 ← One file per page (BillingPage, MenuPage, TablesPage, …)
    components/            ← Shared UI (AppSidebar, LanguageToggle, …)
    store/                 ← Zustand stores — all wired to real API endpoints
    types/
      index.ts             ← Shared TypeScript interfaces

cafeOSum-backend/          ← Fastify REST API
  prisma/
    schema.prisma          ← 10-model schema (User, Cafe, Table, Order, OrderLine,
                              Bill, MenuItem, Ingredient, Recipe, AuditEvent)
  src/
    server.ts              ← Fastify entry point — plugins, routes, SSE
    lib/
      gst.ts               ← GST engine (CGST + SGST, taxable amount, comp exclusion)
      validators.ts        ← Zod schemas for all request bodies
    modules/
      auth/                ← Register, login, refresh, logout, forgot/reset password
      cafe/                ← Cafe profile, GSTIN, onboarding
      tables/              ← CRUD + status updates + SSE occupancy broadcasts
      orders/              ← Create order, add lines, kitchen-sent, active order lookup
      billing/             ← Generate bill, settle, void, pending bill lookup
      inventory/           ← Ingredients, recipes, stock restock, auto-deduct
      analytics/           ← Revenue aggregates, top items, payment breakdown
      audit/               ← Audit event query with pagination
    shared/
      middleware/
        authGuard.ts       ← JWT verification middleware
      db/
        prisma.ts          ← Singleton Prisma client
      queue/
        auditQueue.ts      ← pg-boss async audit queue (fire-and-forget emit)
      sse/
        occupancyHub.ts    ← Server-Sent Events hub for real-time table status

Mock_html/                 ← Static HTML design mockups (open in any browser)
PRD/                       ← Product Requirements Document v1.0
```

---

## Tech Stack

### Frontend

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 |
| State | Zustand 5 (with `persist` middleware for durable stores) |
| Forms | React Hook Form + Zod |
| Routing | React Router v7 |
| API | Custom `apiFetch` — automatic JWT refresh on 401 |
| Bilingual | Custom `useLanguageStore` — `'en'` / `'hi'` toggle |
| Hosting | Netlify |

### Backend

| | |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Fastify 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL via Supabase |
| Auth | JWT (access token 15 min / refresh token 30 days) |
| Async jobs | pg-boss (audit event queue) |
| Real-time | Server-Sent Events (table occupancy broadcasts) |
| GST | Custom engine — CGST + SGST split, comp-line exclusion, discount support |
| Hosting | Railway |

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
