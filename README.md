# ☕ CafeOSum — Cafe Management & POS System

A full-featured cafe management and point-of-sale (POS) web app built with React, TypeScript, and Vite. Designed for small-to-medium cafes and restaurants in India, with bilingual (English / Hindi) support throughout.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | At-a-glance revenue, orders, and table stats for the day |
| **Tables** | Visual floor plan — open tables, seat guests, track bill status |
| **Order Entry** | Add items from the menu, set quantities, add notes per item |
| **Billing / POS** | Generate bills, apply discounts, collect payment (UPI / Cash / Card), settle or void |
| **Menu Management** | Create and organise menu items with emoji, price, category, and inventory linking |
| **Analytics** | Revenue trends, top-selling items, payment mode breakdown |
| **Inventory** | Track stock levels; auto-deduct when bills are settled |
| **Audit Trail** | Immutable log of all key events (bills settled, voided, menu changes, etc.) |
| **Onboarding** | One-time cafe setup — name, address, GSTIN, owner details |
| **Auth** | Login / Register / Forgot Password flow with demo mode |

### Highlights

- **Bilingual UI** — toggle between English and हिंदी at any point; every label, button, modal, and error message switches instantly
- **GST-ready bills** — auto-calculates CGST + SGST (2.5% each) and prints on the bill
- **Comp items** — mark individual line items as complimentary; they appear struck-through at ₹0
- **End-of-Day Summary** — revenue, GST collected, discounts given, and payment mode breakdown in one modal
- **Receipt sharing** — WhatsApp, SMS, and print buttons (Sprint 2)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v3 (utility-first, inline styles for page components) |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Language | `useLanguageStore` (Zustand) — `'en'` / `'hi'` toggle |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repo
git clone https://github.com/SC30GSWNBA/cafeOSum-app.git
cd cafeOSum-app/cafeOSum-app

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Demo Login

| Field | Value |
|---|---|
| Email | Any email (e.g. `demo@cafe.com`) |
| Password | `demo@123` |

> New user? Click **Create a free account** on the login screen and register with any details.

---

## Project Structure

```
cafeOSum-app/          ← React + Vite app
  src/
    pages/             ← One file per page (BillingPage, MenuPage, …)
    components/        ← Shared UI (AppSidebar, LanguageToggle, …)
    store/             ← Zustand stores (billStore, tableStore, …)
  public/
  index.html
  vite.config.ts
  tailwind.config.js

*.html                 ← Static design mockups (no build needed)
CafeOSum_PRD_v1.0.md   ← Product Requirements Document v1.0
```

---

## Scripts

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build → dist/
npm run preview   # Preview the production build locally
```

---

## Roadmap

- [ ] **Sprint 2** — Receipt sharing (WhatsApp, SMS, ESC/POS print)
- [ ] **Sprint 2** — Real-time multi-device sync
- [ ] **F-06** — Staff accounts and PIN management
- [ ] **F-09** — Full Audit Trail UI with filters and export
- [ ] **Cloud** — Backend + database (currently all state is in-memory via Zustand)

---

## License

MIT — free to use, modify, and distribute.

---

*Built with ☕ by Sudip Roy*
