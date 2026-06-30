

**Cafe-OSum**

*Cafe Management Platform for Independent Cafe Owners in India*

**Product Requirements Document**

| Version | 1.0 – Draft |
| :---- | :---- |
| **Date** | June 2026 |
| **Author** | Roy |
| **Status** | In Discovery |
| **Target Market** | Independent Cafe Owners, India |

# **Table of Contents**

# **1\. Executive Summary**

India's cafe and bar market is valued at USD 18.83 billion (2025) and is growing at \~9% CAGR, with independent operators commanding approximately 76% of market share. Despite this scale, the vast majority of small cafe owners in India rely on manual punching machines for billing and maintain no structured system for inventory, staff, or customer analytics.

Cafe-OSum is a mobile-first, all-in-one cafe management platform designed specifically for independent cafe owners in India. It consolidates billing, table management, order entry, staff management, inventory tracking, and business analytics into a single affordable product — targeting a gap left by existing players who are either too expensive (Posist at ₹3,000+/month), too complex, or too narrowly focused on billing alone.

This PRD covers the full product scope across two releases:

* Sprint 1 (MVP): Core operations platform — auth, onboarding, table management, order entry, billing, staff management, inventory, and analytics.

* Sprint 2 (Enhanced): Customer self-ordering portal, table-level order fulfillment tracking, and a conversational AI chatbot for business intelligence.

# **2\. Problem Statement**

Independent cafe owners in India face a cluster of interconnected operational problems that compound as the business grows.

## **2.1  The Core Pain Points**

| Pain Point | Impact on the Owner |
| :---- | :---- |
| Manual billing (punching machine) | Prone to errors, no digital records, GST reconciliation is painful at month-end. |
| No inventory visibility | Owners cannot tell which items are running low until they run out, causing lost sales and last-minute panic purchases. |
| No staff oversight system | No role-based access, no shift tracking, no accountability — leading to revenue leakage. |
| Zero business analytics | Owners have no data on best-selling items, peak hours, table turnover, or weekly trends — decisions are purely gut-feel. |
| Fragmented toolset | Some use WhatsApp for orders, a notebook for inventory, and a calculator for billing — context-switching creates inefficiency and errors. |
| High software cost | Existing platforms (Petpooja, Posist) price out very small cafes or bundle features they do not need at ₹1,200–3,000+/month. |

## **2.2  Market Opportunity**

* India cafes & bars market: USD 18.83B in 2025 → USD 31.47B by 2031 (8.92% CAGR)

* Coffee shops/cafes segment: USD 424.6M in 2025 → USD 1,152M by 2034 (11.14% CAGR)

* \~76% of market is independent operators — underserved by enterprise POS tools

* Strong growth in tier-2 and tier-3 cities where digital adoption is accelerating

* No player in the market offers a conversational AI layer for small cafe intelligence

# **3\. Target Users & Personas**

## **3.1  Primary Persona — The Cafe Owner**

| Name | Ramesh / Priya |
| :---- | :---- |
| **Age** | 28–45 |
| **Location** | Tier-2 / Tier-3 Indian city (e.g., Indore, Coimbatore, Ranchi) |
| **Setup** | 5–15 table independent cafe, 2–6 staff members |
| **Tech comfort** | Moderate — comfortable with WhatsApp and UPI payments; not familiar with SaaS products |
| **Current tools** | Punching machine, physical notebook, WhatsApp groups for orders |
| **Goals** | Run a tight ship, reduce waste, understand what's selling, grow the business |
| **Frustrations** | Month-end GST panic, unknown inventory levels, inability to track which staff is efficient |

## **3.2  Secondary Persona — The Cafe Staff (Cashier / Waiter)**

| Name | Suresh / Kavya |
| :---- | :---- |
| **Role** | Cashier, waiter, or kitchen staff |
| **Tech comfort** | Low to moderate — primarily operates on a shared tablet or mobile |
| **Goals** | Take orders fast, avoid billing mistakes, finish shift on time |
| **Frustrations** | Miscommunication between table and kitchen, incorrect bills causing customer disputes |

## **3.3  Tertiary Persona (Sprint 2\) — The Cafe Customer**

| Name | Ankita / Rahul |
| :---- | :---- |
| **Age** | 18–35 |
| **Location** | Urban, digitally active |
| **Goals** | Browse the menu on their phone, order without waiting for staff, split bills |
| **Frustrations** | Long wait for waiter attention during peak hours |

# **4\. Product Vision & Goals**

*"Give every independent cafe owner in India the same operational intelligence that a chain like Starbucks has — at a price that works for a 10-table cafe."*

## **4.1  Strategic Goals**

* Reach 500 paying cafe owners within 12 months of launch

* Achieve a net revenue retention rate \> 110% by end of Year 1

* Establish the conversational AI chatbot as a category-defining differentiator in the Indian cafe tech space

* Build a data moat by aggregating anonymised order and inventory data across the platform

## **4.2  Product Principles**

* Mobile-first: Every core workflow must work end-to-end on a mid-range Android phone

* Offline-resilient: Billing and order entry must function without an internet connection and sync when connectivity is restored

* Progressive complexity: A new user can bill their first order in under 5 minutes; power features are discoverable, not mandatory

* India-native: GST-compliant from day one; UPI as a primary payment mode; Hindi UI in Phase 2

# **5\. Success Metrics (KPIs)**

| Metric | Target (6 months) | How Measured |
| :---- | :---- | :---- |
| Monthly Active Cafes (MAC) | 500 cafes | Cafes with at least 1 billed order in the last 30 days |
| Time-to-first-bill | \< 5 minutes | Median time from account creation to first completed billing |
| Order entry error rate | \< 2% | Bills voided or corrected post-print as % of total bills |
| Monthly churn rate | \< 5% | Cafes cancelling subscription / total active cafes |
| Inventory alert accuracy | \> 85% | Alerts triggered correctly vs. actual stockouts reported |
| Analytics engagement | \> 60% | % of active owners who open analytics at least once per week |
| Chatbot satisfaction (Sprint 2\) | \> 4.0 / 5 | In-app thumbs up/down rating per chatbot session |
| NPS score | \> 50 | Quarterly in-app NPS survey |

# **6\. Feature Prioritisation — MoSCoW**

Features are prioritised using the MoSCoW framework. Sprint 1 focuses exclusively on Must Have and Should Have items. Could Have and Won't Have items are planned for Sprint 2 and beyond.

| Feature | Must Have | Should Have | Could Have | Won't Have (v1) |
| :---- | :---: | :---: | :---: | :---: |
| Email & Password Login | ✓ |  |  |  |
| Cafe Onboarding / Account Creation | ✓ |  |  |  |
| Table Management & Occupancy | ✓ |  |  |  |
| Order Entry per Table | ✓ |  |  |  |
| Customer Billing (GST-compliant) | ✓ |  |  |  |
| Inventory Management | ✓ |  |  |  |
| Analytics Dashboard | ✓ |  |  |  |
| Platform Activity Capture | ✓ |  |  |  |
| Hindi / English Language Toggle | ✓ |  |  |  |
| OTP / Phone-based Login |  | ✓ |  |  |
| Staff Management (CRUD \+ Roles) |  | ✓ |  |  |
| Customer Self-Ordering Portal |  |  | ✓ |  |
| Order Fulfilment Tracking |  |  | ✓ |  |
| AI Conversational Chatbot |  |  | ✓ |  |
| Multi-language UI (Hindi etc.) |  |  |  | ✓ |
| Swiggy / Zomato Integration |  |  |  | ✓ |
| Multi-outlet Support |  |  |  | ✓ |
| Loyalty / Rewards Programme |  |  |  | ✓ |

# **7\. Sprint 1 — Feature Specifications (MVP)**

The following sections detail each Sprint 1 feature: context, user stories, acceptance criteria, and open questions for discovery.

## **7.1  F-01: Cafe Owner Authentication**

| Priority | Must Have — Email & Password login. Should Have — OTP / phone-based login (deprioritised to Sprint 2). |
| :---- | :---- |
| **Sprint** | Sprint 1 (Email & Password); Sprint 2 (OTP) |
| **Description** | Secure login and session management for cafe owners. Sprint 1 delivers email address and password as the primary authentication method — familiar, universally supported, and requiring no SMS integration at launch. OTP / phone-based login is planned for Sprint 2 as an enhancement once the core product is stable. |
| **Dependencies** | None — this is the entry point to the product. |

### **F-01a: Email & Password Login (Must Have — Sprint 1\)**

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner* | register with my email address and a password of my choice | I can create my account quickly without needing a phone OTP |
| *Cafe owner* | log in with my email and password on any device | I can access the platform from my phone, tablet, or laptop |
| *Cafe owner* | reset my password via a link sent to my registered email | I can regain access if I forget my password |
| *Cafe owner* | stay logged in on my primary device for 30 days | I am not interrupted mid-shift with a login prompt |

| Acceptance Criteria |
| :---- |
| AC-01a.1: Registration requires email address, password (min 8 characters, at least one number and one special character), and cafe name. |
| AC-01a.2: Email address is validated for format on submission; duplicate emails are rejected with a clear error message. |
| AC-01a.3: Passwords are hashed using bcrypt (cost factor \>= 12\) before storage; plain-text passwords are never stored. |
| AC-01a.4: A verification email is sent after registration; the account is active immediately but a banner prompts email verification. |
| AC-01a.5: 'Forgot Password' flow sends a reset link valid for 1 hour to the registered email. |
| AC-01a.6: After 5 consecutive failed login attempts, the account is locked for 15 minutes; the owner is notified by email. |
| AC-01a.7: Session persists for 30 days on the same device (remember me is on by default); explicit logout clears the session. |
| AC-01a.8: All auth tokens are stored securely (encrypted at rest, TLS in transit); no plain-text credentials stored at any layer. |

### **F-01b: OTP / Phone-Based Login (Should Have — Sprint 2\)**

OTP authentication is deprioritised for Sprint 2\. It will be offered as an additional login method alongside email/password, not as a replacement. The rationale: OTP requires SMS gateway integration (MSG91/Twilio), adds operational cost, and introduces connectivity dependency at the most critical moment — login. Sprint 1 will validate the product with email/password; OTP will be layered on once core workflows are proven.

| Acceptance Criteria |
| :---- |
| AC-01b.1 (Sprint 2): OTP sent via SMS within 5 seconds of mobile number submission. |
| AC-01b.2 (Sprint 2): OTP expires after 10 minutes; resend available after 30 seconds. |
| AC-01b.3 (Sprint 2): Owners can choose to link a mobile number to their existing email/password account for OTP as a second factor. |

**Open Questions for Discovery:**

* Should we support Google / social login as a faster alternative to email/password for tech-comfortable owners?

* Should we support multi-device login simultaneously? (Owner on phone \+ cashier on tablet sharing the same account?)

## **7.2  F-02: New Cafe Owner Onboarding**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | First-time setup flow that collects cafe profile, sets up the menu, configures GST details, and walks the owner through their first order. The goal is for a new owner to complete onboarding in under 10 minutes. |
| **Dependencies** | F-01 (Authentication) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *New cafe owner* | create my cafe profile (name, address, GSTIN, logo) | my bills and receipts are branded and GST-compliant from day one |
| *New cafe owner* | add my menu items (name, price, category, GST rate) during onboarding | I can start taking orders immediately after sign-up |
| *New cafe owner* | follow a step-by-step setup wizard | I am not overwhelmed by a blank dashboard on first login |
| *New cafe owner* | skip non-mandatory steps and come back to them later | I can start billing quickly without completing every profile field |

| Acceptance Criteria |
| :---- |
| AC-02.1: Onboarding wizard has a maximum of 5 steps with a visible progress indicator. |
| AC-02.2: Only cafe name and mobile number are mandatory for first-time setup; all other fields are optional. |
| AC-02.3: Owner can add at least 5 menu items during onboarding (bulk import via CSV available in a later sprint). |
| AC-02.4: GSTIN field validates the format (15-character alphanumeric) and shows an inline error for invalid entries. |
| AC-02.5: A sample menu with 3 demo items is pre-populated that the owner can edit or delete. |
| AC-02.6: First-time users see a contextual tooltip tour of the dashboard after completing onboarding. |
| AC-02.7: Onboarding progress is saved at each step; the owner can close the app and resume from where they left off. |

**Open Questions for Discovery:**

* Should we offer WhatsApp-based onboarding assistance (a human or bot that guides them through setup) for very low-tech owners?

* What is the minimum viable menu size for a cafe to feel confident going live? (Validate with owner interviews.)

## **7.3  F-03: Table Management & Occupancy**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | Owners can define their cafe layout by adding tables with names/numbers and capacity. A real-time occupancy view shows which tables are free, occupied, or have a pending bill — giving both owner and floor staff a shared operational view. |
| **Dependencies** | F-02 (Onboarding — cafe profile) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner* | add tables with a name/number and seating capacity during setup | my floor layout is reflected in the app |
| *Cafe owner / staff* | see a colour-coded occupancy grid at a glance | I know instantly which tables are free without walking the floor |
| *Cafe staff* | mark a table as occupied when guests arrive | the system reflects the current state of the cafe |
| *Cafe owner* | edit or remove tables as the cafe layout changes | the app always matches the physical setup |

| Acceptance Criteria |
| :---- |
| AC-03.1: Owner can add up to 50 tables in a single cafe; each table has a name (e.g., T1, Window Seat) and capacity (number of seats). |
| AC-03.2: Occupancy grid uses three states — Free (green), Occupied (amber), Bill Pending (red) — with distinct colour coding. |
| AC-03.3: Occupancy status updates in real time (\< 3 second latency) across all logged-in devices. |
| AC-03.4: Tapping a table in the grid opens the active order for that table or allows a new order to be started. |
| AC-03.5: A table marked as Bill Pending cannot be re-opened for a new order until the bill is settled. |
| AC-03.6: Occupancy state persists through app restarts (server-side state, not local only). |

**Open Questions for Discovery:**

* Should the initial version support a drag-and-drop visual floor plan, or is a simple list/grid sufficient for MVP?

* Is there a need for 'merge table' functionality (combining two tables for a large group)?

## **7.4  F-04: Customer Order Entry per Table**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | Staff can open a table and add items from the menu to build an order. The flow must be operable with one hand on a phone under peak-hour conditions. Supports modifiers (e.g., extra shot, no sugar), quantity changes, and order edits before billing. |
| **Dependencies** | F-03 (Table Management), F-02 (Menu setup) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe staff* | open a table and quickly add items from the menu to the order | I can take orders at speed during the lunch rush |
| *Cafe staff* | add customisations to items (e.g., extra shot, less ice) | the kitchen knows exactly how to prepare each order |
| *Cafe staff* | edit an order (add / remove items) before the bill is generated | I can accommodate last-minute customer changes |
| *Cafe owner* | see all active orders across all tables from one view | I can monitor the floor without being physically present |

| Acceptance Criteria |
| :---- |
| AC-04.1: Menu items are searchable and browsable by category; search returns results within 300ms. |
| AC-04.2: Staff can add an item to an order in a maximum of 2 taps. |
| AC-04.3: Items support free-text notes for customisation (max 100 characters per item). |
| AC-04.4: Order total (subtotal, GST, grand total) updates in real time as items are added or removed. |
| AC-04.5: Orders can be edited (add/remove items) at any time before the bill is generated. |
| AC-04.6: The order entry screen is functional in offline mode; order data syncs to the server when connectivity is restored. |
| AC-04.7: A 'Send to Kitchen' action is available (for Sprint 2 kitchen display integration; in Sprint 1 this triggers a notification to the owner's device). |

**Open Questions for Discovery:**

* Do cafe owners use a Kitchen Display System (KDS) or printed kitchen tokens? This affects the 'Send to Kitchen' design.

* Are modifiers (e.g., size — small/medium/large) a common pattern in the target cafes, or primarily relevant to coffee chains?

## **7.5  F-05: Customer Billing (GST-Compliant)**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | Generates a GST-compliant bill for a table's order. Supports UPI, cash, and card payment modes. Produces a digital receipt (WhatsApp/SMS) and a printable bill. Handles discounts and complimentary items. |
| **Dependencies** | F-04 (Order Entry), F-02 (GSTIN / tax config) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner / cashier* | generate a GST-compliant bill for a table with one tap | billing is fast and legally compliant |
| *Customer* | pay via UPI, cash, or card | I can use my preferred payment method |
| *Cafe owner* | apply a discount (% or fixed amount) to a bill | I can honour promotional offers or goodwill gestures |
| *Cafe owner* | send the bill as a digital receipt via WhatsApp or SMS | the customer has a record without needing a physical printout |
| *Cafe owner* | void or refund a bill | I can correct billing errors after the fact |

| Acceptance Criteria |
| :---- |
| AC-05.1: Bill automatically applies CGST and SGST based on the configured tax rates for each menu item. |
| AC-05.2: Bill includes: cafe name, GSTIN, date/time, table number, itemised list with quantities and prices, GST breakdowns, and grand total. |
| AC-05.3: Payment modes supported: Cash, UPI (QR code display), Card (manual entry of amount; no card processing in v1). |
| AC-05.4: Bill is marked as Settled only after the owner/cashier confirms payment receipt. |
| AC-05.5: Digital receipt can be shared via WhatsApp (using the WhatsApp share API) or SMS. |
| AC-05.6: Discounts can be applied as a flat amount (₹) or percentage (%) at the bill level. |
| AC-05.7: Complimentary items can be marked as 'Comp' — they appear on the bill with ₹0 value and are excluded from revenue totals. |
| AC-05.8: Void/refund requires the cafe owner's authentication and logs a reason; voided bills are retained in history. |
| AC-05.9: End-of-day billing summary (total bills, revenue, GST collected) is automatically calculated. |

**Open Questions for Discovery:**

* What thermal printer models are most common among target cafes? (Affects receipt printing integration.)

* Should we support split billing (splitting one table's bill across multiple customers) in v1?

* Do owners need bills in both English and Hindi/regional languages?

## **7.6  F-06: Staff Management**

| Priority | Should Have |
| :---- | :---- |
| **Sprint** | Sprint 2 |
| **Description** | Cafe owners can add, edit, and remove staff profiles. Role-based access controls what each staff member can see and do in the app. Basic attendance/shift logging is tracked. |
| **Dependencies** | F-01 (Auth — for role-based login) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner* | add a new staff member with their name, role, and mobile number | they can log in to the app with their own credentials |
| *Cafe owner* | assign roles (Owner, Manager, Cashier, Waiter, Kitchen Staff) | each staff member only sees and can do what is appropriate for their role |
| *Cafe owner* | remove a staff member's access immediately | a departing employee loses access the same day |
| *Cafe owner* | see a log of which staff member performed key actions (billing, voids, etc.) | I have accountability and can audit any discrepancies |

| Acceptance Criteria |
| :---- |
| AC-06.1: Owner can add up to 20 staff members per cafe in v1. |
| AC-06.2: Five roles are supported: Owner, Manager, Cashier, Waiter, Kitchen Staff — each with a predefined permission set. |
| AC-06.3: Role permissions: Owner (full access), Manager (all except deleting staff), Cashier (billing \+ order entry), Waiter (order entry only), Kitchen Staff (view orders only). |
| AC-06.4: Staff log in using their mobile number \+ OTP; they see a filtered view based on their role. |
| AC-06.5: Revoking a staff member's access immediately invalidates their session on all devices. |
| AC-06.6: An audit log records which staff member created, edited, or voided each order and bill — retained for 90 days. |
| AC-06.7: Owner can view a daily summary of actions per staff member. |

**Open Questions for Discovery:**

* Is shift scheduling (assigning staff to specific time slots) a pain point in Sprint 1, or is that a later sprint feature?

* Do owners want attendance tracked automatically (app check-in) or is manual tracking sufficient?

## **7.7  F-07: Inventory Management**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | Track raw ingredient stock levels with recipe-based depletion (when a menu item is sold, the constituent ingredients are automatically deducted). Owners receive low-stock alerts before they run out. |
| **Dependencies** | F-02 (Menu setup — items and recipes), F-04 / F-05 (Order and billing trigger depletion) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner* | define ingredient quantities for each menu item (recipe mapping) | stock depletes automatically when items are sold |
| *Cafe owner* | add stock manually when I receive a delivery | inventory levels are always current |
| *Cafe owner* | receive an alert when any ingredient falls below a threshold I set | I can reorder before I run out |
| *Cafe owner* | see a real-time view of current stock for all ingredients | I know exactly what I have at any moment |
| *Cafe owner* | see which ingredients were consumed this week and at what rate | I can forecast my next purchase quantities |

| Acceptance Criteria |
| :---- |
| AC-07.1: Owner can create an ingredient library with name, unit (grams, ml, pieces), and current stock quantity. |
| AC-07.2: Each menu item can be mapped to one or more ingredients with quantities (e.g., Cappuccino \= 18g espresso \+ 120ml milk). |
| AC-07.3: When a bill is settled, the system automatically deducts the ingredient quantities for all items on that bill. |
| AC-07.4: Low-stock threshold can be set per ingredient; a push notification and in-app alert fires when stock crosses the threshold. |
| AC-07.5: Owner can manually log stock additions (restocking) with date and quantity. |
| AC-07.6: A daily inventory report shows opening stock, consumed quantities, and closing stock for each ingredient. |
| AC-07.7: Ingredients not mapped to any menu item are flagged with a visual indicator. |

**Open Questions for Discovery:**

* How granular do target owners want recipe mapping? Simple cafes may only want item-level tracking (not ingredient-level) in v1.

* Should the system handle ingredient wastage / spoilage logging?

## **7.8  F-08: Analytics Dashboard**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | A visual dashboard giving owners day-on-day, week-on-week, and month-on-month views of their business. Covers revenue, top-selling items, peak hours, table turnover, and staff performance. Designed to answer the questions owners actually ask — not to display abstract metrics. |
| **Dependencies** | F-05 (Billing data), F-06 (Staff data), F-07 (Inventory data) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner* | see today's revenue and how it compares to the same day last week | I can instantly assess if today is a good or bad day |
| *Cafe owner* | see my top 5 best-selling items this week | I know what to keep well-stocked and what to promote |
| *Cafe owner* | see my busiest hours of the day across the week | I can schedule staff to match demand |
| *Cafe owner* | see which tables generate the most revenue | I can optimise table placement or capacity |
| *Cafe owner* | export a monthly revenue and GST report as a PDF or CSV | I can share it with my accountant at month-end |

| Acceptance Criteria |
| :---- |
| AC-08.1: Dashboard has four time-period views: Today, This Week, This Month, Custom Range. |
| AC-08.2: Revenue card shows: total revenue, number of bills, average bill value, GST collected — for the selected period. |
| AC-08.3: A bar chart shows revenue by hour of day for the selected period. |
| AC-08.4: Top 10 items by quantity sold and by revenue are displayed with week-on-week change indicators. |
| AC-08.5: Table performance view shows revenue per table and average turnaround time per table. |
| AC-08.6: Staff performance shows number of orders handled and bills generated per staff member. |
| AC-08.7: A monthly GST report (CGST \+ SGST breakdowns by item category) is exportable as PDF or CSV. |
| AC-08.8: All charts are readable on a 5-inch Android screen without horizontal scrolling. |

**Open Questions for Discovery:**

* Do owners prefer chart-heavy or number-heavy dashboards? (Validate with prototype testing — many low-tech users distrust charts they cannot interpret.)

* Is there appetite for a daily WhatsApp summary instead of (or in addition to) an in-app dashboard?

## **7.9  F-09: Platform Activity Capture (Backend Audit Trail)**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | Every action performed by a cafe owner (or any logged-in user) on the platform is captured in the backend as a structured event. This creates a tamper-proof audit log for accountability, a rich data source for analytics and the AI chatbot, and a foundation for future compliance and fraud-detection requirements. This is a cross-cutting, backend-first requirement — it must be built into the platform architecture from day one, not retrofitted later. |
| **Dependencies** | F-01 (Auth — user identity required), all feature modules emit events |

**Events to Capture (non-exhaustive):**

| Event Category | Example Events | Key Attributes to Capture |
| :---- | :---- | :---- |
| Authentication | Login, logout, failed login attempt, password reset | user\_id, timestamp, IP address, device, success/failure |
| Cafe Setup | Profile updated, table added/edited/deleted, menu item added/edited/deleted | user\_id, entity\_type, entity\_id, before\_state, after\_state, timestamp |
| Order Management | Order created, item added, item removed, order edited, order cancelled | user\_id, order\_id, table\_id, items\_changed, timestamp |
| Billing | Bill generated, bill settled, payment mode selected, discount applied, bill voided/refunded | user\_id, bill\_id, amount, payment\_mode, discount\_value, void\_reason, timestamp |
| Staff Management | Staff added, role changed, access revoked, staff deleted | acting\_user\_id, target\_user\_id, old\_role, new\_role, timestamp |
| Inventory | Stock added, threshold changed, low-stock alert triggered, ingredient mapped | user\_id, ingredient\_id, quantity\_before, quantity\_after, timestamp |
| Analytics | Report viewed, export triggered, date range changed | user\_id, report\_type, date\_range, export\_format, timestamp |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner* | see a complete log of all actions taken on my account (by me or my staff) | I can audit any suspicious activity or billing discrepancy |
| *Platform* | capture every state-changing action in the backend with full context | the audit trail is complete, tamper-proof, and queryable |
| *AI Chatbot (Sprint 2\)* | query the event stream to answer business questions | the chatbot has a rich, reliable data source beyond just billed orders |

| Acceptance Criteria |
| :---- |
| AC-09.1: Every state-changing action on the platform emits a structured event to the backend event store; read-only views (page visits) are not required in v1. |
| AC-09.2: Each event record contains at minimum: event\_id, event\_type, user\_id, cafe\_id, timestamp (UTC), IP address, entity\_type, entity\_id, payload (before/after state for mutations). |
| AC-09.3: Events are written asynchronously and must not add latency to the triggering user action (fire-and-forget with guaranteed delivery via a message queue). |
| AC-09.4: Events are immutable once written — no update or delete operations are permitted on the event store. |
| AC-09.5: Audit log is queryable by the cafe owner in the app filtered by date range, user, and event type — last 90 days visible in-app; full history retained in backend for 3 years. |
| AC-09.6: Bill void and refund events capture the acting user, reason text (mandatory), and the full original bill payload. |
| AC-09.7: Failed login events are captured with IP address and timestamp to support brute-force detection. |
| AC-09.8: The event store schema is designed to support the AI chatbot query layer in Sprint 2 — events must be queryable by time window, event type, and entity ID. |

**Technical Note:**

Implement using an event-sourcing pattern. Recommended stack: a Kafka topic (or a lightweight alternative like AWS SQS \+ DynamoDB Streams for the India-hosted stack) as the event bus, with a read-optimised event store (PostgreSQL with append-only event table, or a time-series DB). Do not use the primary transactional database as the event store — keep them separate from day one to avoid write contention.

**Open Questions for Discovery:**

* Should owners be able to export the full audit log as a CSV for their own records or for an accountant?

* Is real-time alerting (e.g., push notification when a bill is voided) required in Sprint 1 or can it be Sprint 2?

## **7.10  F-10: Hindi / English Language Toggle**

| Priority | Must Have |
| :---- | :---- |
| **Sprint** | Sprint 1 |
| **Description** | A toggle button available on the portal dashboard (post-login) allows the cafe owner or staff to switch the food menu display between English and Hindi. The toggle affects only the menu item names and category labels visible to the user in the order-entry and customer-facing menu screens. All other dashboard content (analytics labels, staff management, inventory fields, system messages) remains in English. Backend storage is always in English — the Hindi translations are a frontend-only rendering layer with no impact on any database record, bill, or report. |
| **Scope** | In scope: menu item names, category labels, and price labels in the order-entry screen. Out of scope: analytics dashboard, staff management, inventory fields, billing fields, system alerts, error messages — all remain English in v1. |
| **Dependencies** | F-02 (Menu setup — item names in English are the source), F-04 (Order entry screen — primary display point) |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner / staff* | toggle the menu display between English and Hindi with a single click | staff who are more comfortable in Hindi can read and enter orders in their preferred language |
| *Cafe owner / staff* | see food item names and category labels in Hindi when the toggle is set to Hindi | menu browsing is faster and less error-prone for Hindi-speaking staff |
| *Cafe owner / staff* | have the toggle setting remembered for my session | I do not have to re-select the language every time I open the order screen |
| *Cafe owner* | always see my bills, analytics, and reports in English | financial records and exports remain consistent and accountant-readable |

| Acceptance Criteria |
| :---- |
| AC-10.1: A language toggle button (EN | HI) is visible in the top navigation bar on all post-login screens. |
| AC-10.2: Default language on first login and for all new accounts is English. |
| AC-10.3: When Hindi is selected, menu item names and food category labels in the order-entry screen are displayed in Hindi (Devanagari script). |
| AC-10.4: Prices are displayed in the same format regardless of language (e.g., ₹120 — numerals remain unchanged). |
| AC-10.5: The selected language persists for the duration of the session; it resets to English on next login (per-session preference, not per-account). |
| AC-10.6: All backend storage, database fields, billing records, receipts, and exports remain exclusively in English — the Hindi display is a frontend translation layer only. |
| AC-10.7: Analytics dashboard, staff management screens, inventory fields, billing summary, system notifications, and error messages remain in English regardless of the toggle state. |
| AC-10.8: If a menu item does not have a Hindi translation defined, the English name is shown as a fallback with no error. |
| AC-10.9: Cafe owners can optionally add a Hindi name for each menu item during menu setup or edit; items without a Hindi name fall back to the English name when Hindi mode is active. |
| AC-10.10: The toggle switch is accessible on both mobile (thumb-reachable zone) and tablet layouts. |

**Translation Approach:**

Two options to evaluate during Sprint 1 technical spike:

* Option A (Recommended for v1): Owner-defined translations — when adding or editing a menu item, an optional 'Hindi Name' field is available. Simple, accurate, zero API cost. Requires owner input but ensures correctness (automated translation of food names can be unreliable for regional items).

* Option B (Later enhancement): Automatic translation via Google Translate API or Bhashini (Government of India's free NLP API). Faster for owners but may produce inaccurate translations for local food items (e.g., 'Vada Pav' or 'Masala Chai' do not benefit from generic translation). Recommended as a Sprint 2 enhancement layered on top of Option A.

**Open Questions for Discovery:**

* Do target cafe owners (particularly in tier-2 cities) read Devanagari script fluently, or do they prefer Romanised Hindi (e.g., 'Chai' rather than 'चाय')? Validate in user interviews.

* Are there other regional languages (Tamil, Telugu, Bengali) that should be in scope for Sprint 2, given the geographic spread of independent cafes?

# **8\. Sprint 2 — Good to Have Features**

These features are validated by the Sprint 1 data layer and user feedback. They represent a significant competitive differentiator and should be prioritised for the second release.

## **8.1  F-13: Customer Self-Ordering Portal**

| Priority | Could Have (Sprint 2\) |
| :---- | :---- |
| **Description** | Customers scan a QR code at their table to access the cafe's digital menu on their own device. They can browse, customise, and place orders without waiting for a waiter. Orders flow directly into the kitchen/owner view. |
| **Dependencies** | F-03 (Table Management — QR per table), F-04 (Order Entry — same backend), F-07 (Inventory — to hide out-of-stock items) |
| **Business Case** | Reduces staff burden during peak hours; reduces order errors from miscommunication; creates a premium customer experience. |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Customer* | scan a QR code at my table to open the cafe's menu on my phone | I can browse and order without waiting for staff |
| *Customer* | customise my order (e.g., no sugar, extra shot) before submitting | my order arrives exactly as I want it |
| *Cafe owner / staff* | see customer-placed orders appear in the same order queue as staff-placed orders | I have one unified view of all active orders |
| *Cafe owner* | generate and print a unique QR code for each table | setup is simple and requires no hardware beyond a printed QR |

| Acceptance Criteria |
| :---- |
| AC-09.1: Each table has a unique QR code that opens a mobile-optimised web page (no app download required). |
| AC-09.2: The customer menu page shows item name, description, price, and available/unavailable status. |
| AC-09.3: Out-of-stock items (based on inventory) are greyed out and cannot be ordered. |
| AC-09.4: Customer can add items to a cart, review the order summary, and confirm — no payment is collected through the portal in v1. |
| AC-09.5: Confirmed orders appear in the staff order queue with a 'Customer Order' label to distinguish them from staff-entered orders. |
| AC-09.6: Staff can accept or reject a customer order; rejection sends a notification to the customer's session. |

## **8.2  F-14: Order Fulfilment Tracking**

| Priority | Could Have (Sprint 2\) |
| :---- | :---- |
| **Description** | Track each order item through preparation states: Ordered → In Preparation → Ready → Served. Customers (via the portal) and staff can see the live status of their order, reducing 'is my order coming?' interruptions. |
| **Dependencies** | F-04 (Order Entry), F-09 (Customer Portal for customer-facing status) |
| **Business Case** | Reduces staff interruptions during kitchen peak; improves perceived service quality. |

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Kitchen staff* | update an order item's status from 'In Preparation' to 'Ready' | floor staff know when to collect and serve the order |
| *Floor staff* | see which items are ready for service at which table | I can prioritise delivery without checking with the kitchen |
| *Customer* | see the live status of my order on my phone | I am not anxious about whether my order is being prepared |

| Acceptance Criteria |
| :---- |
| AC-10.1: Four status states per order item: Ordered, In Preparation, Ready, Served. |
| AC-10.2: Kitchen staff can update item status from a dedicated 'Kitchen View' screen (simplified, large-touch-target UI). |
| AC-10.3: Floor staff see a 'Ready for Service' notification when all items for a table are marked Ready. |
| AC-10.4: Customer portal shows a live progress view per item (polling every 10 seconds). |
| AC-10.5: Average preparation time per item type is calculated and displayed in the analytics dashboard. |

## **8.3  F-15: Conversational AI Chatbot (Business Intelligence)**

| Priority | Could Have (Sprint 2\) |
| :---- | :---- |
| **Description** | A natural-language chatbot that allows cafe owners to query their business data in plain language. Owners type or speak a question and receive an instant, contextualised answer drawn from their own sales, inventory, and staff data. This is the primary product differentiator versus all existing competitors. |
| **Dependencies** | F-05 (Billing data), F-07 (Inventory data), F-08 (Analytics data store) — the chatbot is a natural-language interface on top of the existing analytics layer. |
| **Business Case** | No competitor in the Indian SMB cafe tech space offers this. It creates a category-defining moat and directly addresses the insight gap that manual operations create. |

**Example Queries the Chatbot Should Answer:**

* "What was my best-selling item this week?"

* "How did Sunday's revenue compare to last Sunday?"

* "Which ingredients should I restock before the weekend?"

* "Which table generates the most revenue per hour?"

* "What time of day do I get the most orders?"

* "How many bills did Suresh handle today?"

* "What is my average bill value this month vs last month?"

| As a... | I want to... | So that... |
| :---- | :---- | :---- |
| *Cafe owner* | ask a business question in plain language and get an accurate answer | I do not need to navigate multiple reports to find the answer I need |
| *Cafe owner* | ask about inventory and get a restock recommendation | I make smarter purchasing decisions without manual calculation |
| *Cafe owner* | receive proactive weekly summaries from the chatbot without asking | I am always informed even when I forget to check the dashboard |

| Acceptance Criteria |
| :---- |
| AC-11.1: Chatbot responds to natural-language queries in English; Hindi support in Phase 3\. |
| AC-11.2: Chatbot has access to the last 90 days of the cafe's order, billing, and inventory data. |
| AC-11.3: Response time is under 5 seconds for data queries. |
| AC-11.4: If a query is ambiguous, the chatbot asks a single clarifying question before responding. |
| AC-11.5: The chatbot does not fabricate data; if it cannot answer, it says so and directs the owner to the relevant report. |
| AC-11.6: A thumbs-up / thumbs-down rating is available after every response to capture feedback. |
| AC-11.7: Chatbot sends a proactive weekly WhatsApp or push notification summary every Monday morning. |

**Technical Note:**

The chatbot should be built as a thin NLP layer over a structured query engine — not a pure LLM. This ensures accuracy, auditability, and cost efficiency at scale. Consider using an LLM for intent parsing and query generation, with all data retrieval done via deterministic API calls to the Cafe-OSum data layer.

# **9\. Technical Considerations**

## **9.1  Architecture Principles**

* Mobile-first web app (PWA) for Sprint 1; native Android wrapper can be considered for Sprint 2 if retention data supports it

* Offline-first architecture for billing and order entry — IndexedDB / service worker sync pattern

* Multi-tenant SaaS — each cafe is an isolated data tenant from day one

* GST Engine: configurable tax rule engine to support CGST/SGST splits, exempt items, and composite scheme

## **9.2  Key Integration Points**

| Integration | Purpose | Recommended Approach |
| :---- | :---- | :---- |
| SMS OTP | Auth — OTP delivery | Twilio or MSG91 (MSG91 is cheaper for India, \~₹0.12/SMS) |
| WhatsApp | Digital receipts, chatbot summaries | WhatsApp Business API via 360dialog or Gupshup |
| Payment (UPI) | UPI QR code generation for payments | Razorpay or PayU — do not build payment processing; use their SDKs |
| Thermal Printer | Physical bill printing | Bluetooth thermal print SDK (Sunmi / EPSON ESC/POS commands) |
| AI / NLP (Sprint 2\) | Chatbot intent parsing and response | Claude API (Anthropic) or GPT-4o for intent; own data layer for retrieval |

## **9.3  Non-Functional Requirements**

* Availability: 99.5% uptime (billing is business-critical; downtime \= lost revenue)

* Performance: Order entry and bill generation must complete within 2 seconds on a 4G connection

* Offline: Core billing and order entry must function for up to 4 hours without internet; sync on reconnect

* Security: All data encrypted at rest (AES-256) and in transit (TLS 1.3); GSTIN and financial data treated as PII

* Scalability: Architecture must support 10,000 concurrent active cafes without redesign

# **10\. Risks & Mitigation**

| Risk | Probability | Impact | Mitigation |
| :---- | ----- | ----- | :---- |
| Crowded market — Petpooja incumbency | High | High | Lead with the AI chatbot as a differentiator. Target underserved segments (very small cafes, tier-2 cities) where Petpooja is overkill. |
| Low-tech adoption resistance | High | High | In-person onboarding support for first 50 customers. WhatsApp-based customer success channel. Frictionless OTP auth. |
| Offline sync conflicts (billing data) | Medium | High | Implement last-write-wins with conflict logging. Never lose a bill — offline queue must be append-only. |
| GST rule complexity / compliance errors | Medium | High | Partner with a CA firm to validate the GST engine before launch. Automated test suite covering all GST rate combinations. |
| Chatbot accuracy / hallucination | Medium | Medium | Do not use a pure LLM for data retrieval. Use LLM for intent parsing only; bind all answers to deterministic DB queries. |
| Payment gateway integration delays | Low | Medium | Use Razorpay — proven India integration with strong documentation. Do not build in-app payment in v1. |
| Thermal printer fragmentation | Medium | Low | Support ESC/POS standard (covers 90%+ of thermal printers). Provide a 'print to PDF' fallback. |

# **11\. Discovery Next Steps**

The following actions are required before Sprint 1 development begins. These are owner-discovery gates, not engineering tasks.

## **11.1  User Research (4 weeks)**

1. Recruit 10 independent cafe owners across 2–3 cities (mix of high-footfall and quieter cafes, tier-1 and tier-2).

2. Conduct 45-minute structured interviews covering: current billing workflow, inventory management, staff oversight, biggest operational headaches, and willingness to pay.

3. Shadow at least 3 cafes during a lunch rush to observe order-entry behaviour in real conditions.

4. Test a paper prototype of the occupancy grid and order entry screen; measure time-to-complete on first attempt.

5. Validate the ₹499–799/month price point with at least 5 owners to gauge willingness to pay.

## **11.2  Competitive Teardown (1 week)**

6. Sign up for Petpooja and BillFeeds free trials; map every feature and friction point in their onboarding flows.

7. Document the top 3 complaints about Petpooja from Google Play Store and G2 reviews.

8. Identify any features in competitor products not covered in this PRD.

## **11.3  Technical Spikes (2 weeks)**

9. Validate offline billing sync behaviour: build a proof-of-concept with IndexedDB \+ service worker; test on a Redmi 9 (target device class).

10. Prototype the GST engine: validate CGST/SGST calculation accuracy against the Indian GST rate schedule for food and beverages.

11. Test WhatsApp Business API onboarding time and cost: send a sample receipt via 360dialog to validate the integration path.

## **11.4  Open Questions to Resolve Before Sprint 1 Kick-off**

* Product name: Is Cafe-OSum the final name? Validate with 5 owner interviews for recall and resonance.

* Pricing model: Flat monthly fee vs. per-transaction fee? (Flat is simpler for owners; per-transaction aligns incentives.)

* Android-first or PWA? Confirm whether target owners download apps from the Play Store or prefer browser-based tools.

* Data residency: Does data need to be stored on India-based servers? (Check RBI and DPDP Act requirements.)

* Printer support: Survey target cafes on what printer model they currently use (if any).

# **12\. Appendix**

## **12.1  Competitive Landscape Summary**

| Player | Price/mo | Target | Strength | Weakness | Cafe-OSum Advantage |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Petpooja | ₹1,200+ | SMB Restaurants | Aggregator integration, large install base | Complex, pricey add-ons | Simpler UX, AI chatbot, table occupancy, lower price |
| Posist | ₹3,000+ | Chains & enterprise | Robust, multi-outlet | Overkill for small cafes | Purpose-built for single-outlet independent cafes |
| BillFeeds | ₹999+ | Very small cafes | Low price, no lock-in | Billing only; no analytics or staff management | Full suite: billing \+ staff \+ inventory \+ AI analytics |
| **Cafe-OSum** | **₹499–799** | **Indie cafes, India** | **All-in-one, AI chatbot, mobile-first** | **New entrant, no track record** | **—** |

## **12.2  Feature-to-Sprint Mapping**

| ID | Feature | Sprint | MoSCoW |
| :---- | :---- | :---- | :---- |
| F-01a | Email & Password Login (Cafe Owner Auth) | Sprint 1 (MVP) | Must Have |
| F-02 | Cafe Onboarding / Account Creation | Sprint 1 (MVP) | Must Have |
| F-03 | Table Management & Occupancy | Sprint 1 (MVP) | Must Have |
| F-04 | Customer Order Entry per Table | Sprint 1 (MVP) | Must Have |
| F-05 | Customer Billing (GST-Compliant) | Sprint 1 (MVP) | Must Have |
| F-07 | Inventory Management | Sprint 1 (MVP) | Must Have |
| F-08 | Analytics Dashboard | Sprint 1 (MVP) | Must Have |
| F-09 | Platform Activity Capture (Backend Audit Trail) | Sprint 1 (MVP) | Must Have |
| F-10 | Hindi / English Language Toggle | Sprint 1 (MVP) | Must Have |
| F-01b | OTP / Phone-based Login | Sprint 2 | Should Have |
| F-06 | Staff Management | Sprint 2 | Should Have |
| F-13 | Customer Self-Ordering Portal | Sprint 2 | Could Have |
| F-14 | Order Fulfilment Tracking | Sprint 2 | Could Have |
| F-15 | AI Conversational Chatbot | Sprint 2 | Could Have |

## **12.3  Glossary**

| Term | Definition |
| :---- | :---- |
| GST | Goods and Services Tax — India's unified indirect tax applicable to food and beverages. |
| CGST / SGST | Central GST and State GST — the two components of GST split equally between the federal and state governments. |
| GSTIN | GST Identification Number — the 15-character alphanumeric identifier assigned to each registered business. |
| POS | Point of Sale — the hardware/software system used to process customer transactions. |
| PWA | Progressive Web App — a web application that behaves like a native mobile app, including offline support. |
| MoSCoW | Must Have / Should Have / Could Have / Won't Have — a prioritisation framework for product features. |
| KDS | Kitchen Display System — a screen in the kitchen that shows incoming orders. |
| MAC | Monthly Active Cafes — the number of cafes that have placed at least one bill in the last 30 days. |
| NPS | Net Promoter Score — a metric measuring customer loyalty based on likelihood to recommend. |

*— End of Document —*