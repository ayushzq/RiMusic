# BaseKey CRM — Full Codebase Audit Report

**Repository analyzed:** `RiMusic-master.zip` (project internally named `basekey-crm`, deployed as SUPERKEY at `superkey-app.vercel.app`)
**Stack confirmed:** Next.js 15 (App Router) + TypeScript, Prisma + PostgreSQL (Neon), NextAuth, Zustand, React Flow (`@xyflow/react`), Tailwind CSS
**Audit type:** Static code audit (no code was written, refactored, or executed). Every finding below is traced to an exact file and line so your team can verify it directly.

---

## 0. Executive Summary

BaseKey is a genuinely ambitious WhatsApp Business CRM — auth, contacts, chat, campaigns, a visual flow builder, template management, and a developer API are all *present in code*. The backend engineering quality is actually good in several modules (auth, API trigger endpoint, dashboard stats aggregation). But there is **one critical, project-breaking bug** and a handful of serious frontend/backend mismatches that mean several flagship features do not work end-to-end today.

| Severity | Count | Examples |
|---|---|---|
| 🔴 Critical (feature completely broken) | 3 | Flow Engine (Firebase/Postgres split-brain), AI Bot (not implemented), Settings page (404) |
| 🟠 High (broken link / silent failure) | 4 | `/api/templates` 404 in Campaigns, Flow Builder doesn't load saved flow, Campaigns don't actually send, no route auth on 2 sensitive APIs |
| 🟡 Medium (incomplete / inconsistent) | 6 | Dead components, duplicate layout code, orphaned files, stale docs |
| 🟢 Working well | 6 | Auth (NextAuth + OTP), Contacts, Chat, Templates, Dashboard Stats, Developer API |

---

## 1. Feature Functionality Audit

### 🤖 AI Integration (Gemini)
**Status: ❌ Missing — not implemented (schema + package installed, zero usage)**

- `@google/generative-ai` is listed in `package.json`, and `SystemSettings` in `prisma/schema.prisma` has `isAiBotActive` and `geminiSystemPrompt` fields — the *scaffolding* is there.
- A repo-wide search for `GoogleGenerativeAI`, `gemini`, or `GEMINI_API_KEY` returns **zero matches** in any `.ts`/`.tsx` file and zero `.env` reference.
- In `app/api/webhook/route.ts`, the code path for when `isAiBotActive` is true literally does nothing but log and leave a comment: `// Yahan par aage chal kar Gemini Bot connect hoga` ("Gemini bot will be connected here later").
- **Real-world effect:** flipping the "AI Bot" toggle in Settings currently does not fail loudly — it just silently stops the visual flow engine from running and replies with *nothing at all*. The contact gets no response.

### 🖱️ Drag-and-Drop (UI Interactions)
**Status: 🟡 Partially implemented — works, but only in one place, and it's disconnected from execution**

- Native HTML5 drag-and-drop (`onDragStart`, `onDragOver`, `onDrop`) is implemented once, in `components/chatbot/ChatbotCanvas.tsx`, for dragging node types from the palette onto the React Flow canvas.
- This is the *only* drag-and-drop interaction anywhere in the codebase — no Kanban-style dragging for Campaigns, Contacts, or Team, and no drag-to-upload on `MediaUploader.tsx`.
- The DnD interaction itself is well-built (uses `dataTransfer`, proper `preventDefault`), but see §1.5 Flow Builder for why the thing you build with it never reaches production.

### 📢 Campaign Management
**Status: 🟠 Partially implemented — UI + DB model exist, but nothing is actually sent**

- `app/campaigns/page.tsx` calls `fetch("/api/templates")` to populate the template dropdown — **this route does not exist**. The real route is `app/api/whatsapp/templates/route.ts`. Every campaign-creation attempt will fail to load templates (silent `catch` → empty array, dropdown stays empty).
- `POST /api/campaigns` (`app/api/campaigns/route.ts`) creates a `Campaign` row with `status: "running"` and sets `audience` to the total contact count — but never actually calls the WhatsApp send API. The code comment admits this: `// (Asli production me yahan se WhatsApp API ko trigger jayega)` ("in real production the WhatsApp API would be triggered from here").
- `sent`, `delivered`, `read` fields on the `Campaign` model default to `0` and there is no code anywhere that increments them — a campaign will show "running" forever with 0/0/0 stats.
- No background job / queue / cron exists in the repo (no `bull`, `bullmq`, Vercel Cron config, or `pg-boss`) to actually process bulk sends.
- No `PATCH`/`PUT` endpoint to pause/complete a campaign, no `DELETE`.

### 👥 Team Collaboration
**Status: 🟢 Functional (CRUD works), 🟡 "live status" is cosmetic**

- `GET/POST/DELETE /api/team` are fully implemented against Prisma's `User` model, and `app/dashboard/team/page.tsx` wires up create/list/delete correctly.
- The schema has real-time-oriented fields (`status: ONLINE/BUSY/OFFLINE`, `lastSeen`, `currentActivity`) suggesting a live presence system — but there is no Socket.io server code, no polling, and no cron to flip a user to `OFFLINE` after inactivity, despite `socket.io`/`socket.io-client` being dependencies. Presence will show whatever was set at account creation (`"Account Created"`) until someone manually changes it.

### ❓ Help Section
**Status: 🟡 Present but 100% static / cosmetic**

- `app/help/page.tsx` is a hardcoded FAQ accordion with 4 fixed Q&As and a "Contact Support" banner that does not appear to hit any ticketing/email API.
- One FAQ answer is factually wrong for the current codebase: *"Is my data secure in Firebase? Yes! All contacts... are securely stored... in Firebase Realtime Database"* — the app has migrated to Postgres/Prisma for all of this (confirmed in `lib/chatLogic.ts` header comments: *"FIREBASE REMOVED ❌"*). This is stale documentation actively telling users something untrue about where their data lives.
- The search icon in the header has no wired search/filter logic behind it.

### 📄 Developer/API Documentation Page
**Status: 🟢 Functional — the best-built page in the app**

- `app/developers/page.tsx` correctly fetches `/api/config` and `/api/keys`, generates/revokes API keys, and renders live `curl` examples pointing at the real `/api/v1/trigger` endpoint.
- `app/api/v1/trigger/route.ts` (the public-facing send API) is genuinely solid: Bearer-token auth, key revocation/expiry checks, template-lock enforcement, a 15s abort-controller timeout on the Meta call, and it correctly logs the sent message back into `Message`/`Contact` for analytics. This is the most production-ready module in the repo.

### 💬 Chat System
**Status: 🟢 Functional for manual/agent chat — 🔴 Broken for automated replies**

- `app/chat/page.tsx` + `app/api/chat/contacts`, `app/api/chat/messages` are correctly wired for an agent manually messaging a contact (list, load thread, send, delete, clear).
- However, **incoming-message automation is broken** — see §1.5, the Flow Engine cannot execute, so unattended contacts get no bot response even with a saved flow.
- There are 4 orphaned duplicate files in `components/` root (`ChatBubble.tsx.txt`, `ChatInput.tsx.txt`, `ChatUI.tsx.txt`, `TemplatePicker.tsx.txt`) that are **not imported anywhere** — the live versions actually used by `app/chat/page.tsx` live in `components/chat/`. These are dead leftovers from a refactor and should be deleted, not shipped.

### ⚙️ Configuration & Settings
**Status: 🔴 Broken — the main nav link 404s**

- `components/Sidebar.tsx` (line ~150) defines a nav item `{ href: "/settings", label: "Settings" }` rendered as a real Next.js `<Link>`.
- There is **no `app/settings/page.tsx`** anywhere in the project. Clicking "Settings" in the sidebar takes the admin to a Next.js 404 page.
- The actual settings UI exists as `components/ConfigModal.tsx`, a popup — but it's wired to a **different** trigger (a "Connect" button shown when WhatsApp isn't linked), not to the Settings nav item. So there are two disconnected settings entry points, and the main one is dead.

### 🌊 WhatsApp Flow Builder (Chatbot Builder)
**Status: 🔴 Critically broken — this is the single most important bug in the codebase**

This deserves its own breakdown because it affects Flow Builder, the AI/Bot toggle, and the entire "automated WhatsApp bot" value proposition simultaneously:

1. **Save path (Postgres):** `app/api/flows/save/route.ts` saves the visual flow built in the UI via **Prisma**, to a Postgres `ChatFlow` row with a fixed id `"main_flow"`. Toast message on success literally says *"Flow successfully Neon DB mein save ho gaya!"*
2. **Read/execute path (Firebase):** `lib/whatsapp/engine.ts` — the engine that actually runs the bot when a WhatsApp message arrives — reads the flow from **Firebase Realtime Database** at path `users/${phoneId}/chatFlows/main_flow`, and reads/writes the contact's conversation position (`activeFlowNodeId`) to Firebase at `chats/${phoneId}/${from}/info`.
3. These are two completely different databases. **A flow saved through the builder can never be read by the engine that's supposed to run it.**
4. It gets worse: `firebase-admin` is called (`admin.database()`) but **is never initialized anywhere in the codebase** — there is no `admin.initializeApp(...)` call in the entire project. This means every single call to `runFlowEngine()` will throw at runtime (Firebase throws "the default Firebase app does not exist" when you call a service before `initializeApp`).
5. This function is called from `app/api/webhook/route.ts` on every inbound text/button/list message when the AI bot is off — i.e., **on every message your CRM receives**, wrapped in a try/catch that silently swallows the error (`console.error("Flow engine error:", engineError)`), so nothing crashes visibly, but no automated reply ever goes out.
6. Compounding this: the Prisma `Contact` model *already has* an `activeFlowNodeId String?` field clearly provisioned for exactly this purpose — it is defined but never read or written by the engine, which insists on using the (broken) Firebase path instead. This strongly suggests a partial migration from Firebase → Postgres that was completed everywhere except `engine.ts`.
7. Separately: `app/chatbot-builder/page.tsx` has **no `GET` call to load an existing flow on mount** — there is no `GET /api/flows` route at all, only `POST /api/flows/save`. Every time an admin opens the Flow Builder, they see the hardcoded `initialNodes` default, not whatever they last saved. Editing therefore always starts from scratch and any "save" silently overwrites the previous flow with a fresh default-based edit unless the admin rebuilds it from memory each time.

**Net effect:** the flow builder UI is fully functional as a design tool, but nothing you build in it will ever run on a real WhatsApp conversation, and you can't even reliably see what you last saved.

### 📋 Template Management
**Status: 🟢 Functional and consistent**

- `components/template-builder/TemplateBuilderUI.tsx` correctly calls `/api/whatsapp/templates` for list/create/status, and the file header explicitly confirms the Firebase-to-Prisma migration was done properly here (`"Firebase (auth + realtime database) poori tarah hata diya gaya hai"`).
- This is a good reference for how the rest of the app *should* look post-migration.
- Minor clutter: `components/template-builder/1` is a stray, near-empty text file (contains only a path fragment) accidentally committed — not code, just repo noise.

### 📇 Contacts Management
**Status: 🟢 Functional**

- `GET/DELETE /api/contacts`, CSV import (`/api/contacts/import`), and Google Contacts sync (direct client call to the Google People API in `app/contacts/page.tsx`) are all wired and consistent with the `Contact` Prisma model.
- No `PATCH`/edit-contact endpoint exists — only create-via-import and delete. If a UI ever needs "edit contact name/email," there's no backend for it yet.

### 📊 Main Dashboard
**Status: 🟢 Functional — best backend logic in the app after the Developer API**

- `app/api/dashboard-stats/route.ts` computes real, non-mocked analytics (contact source breakdown, inbound/outbound message stats, delivery/read cascading logic, time-bucketed chart data) directly from `Message`/`Contact` rows.
- Correctly reflects `isAiBotActive` from `SystemSettings`. One caveat: since Campaigns never actually send anything (see above), the "campaign" source breakdown on this dashboard will always show 0 in a fresh deployment.

---

## 2. Frontend & Backend Mismatch Report

| # | Frontend expects | Backend reality | Impact |
|---|---|---|---|
| 1 | `app/campaigns/page.tsx` calls `GET /api/templates` | Route doesn't exist. Real route is `GET /api/whatsapp/templates` | Template dropdown in "New Campaign" modal is always empty; campaigns cannot reference a real template |
| 2 | `components/Sidebar.tsx` links to `/settings` | No `app/settings/page.tsx` exists | 404 on a primary nav item |
| 3 | `app/chatbot-builder/page.tsx` expects to resume editing a previously saved flow | No `GET` handler exists for flows at all (only `POST /api/flows/save`) | Builder always opens with default nodes; last saved work is invisible in the UI |
| 4 | `lib/whatsapp/engine.ts` expects flow + conversation state to live in Firebase RTDB | `app/api/flows/save/route.ts` and the `Contact.activeFlowNodeId` field put everything in Postgres via Prisma | Bot logic can never execute; Firebase Admin isn't even initialized, so every call throws (caught silently) |
| 5 | `app/campaigns/page.tsx` shows a campaign as `"running"` with live `sent/delivered/read` | `POST /api/campaigns` never triggers Meta's API and nothing ever updates those columns | Campaign feature is a static record, not a real broadcast tool |
| 6 | `GET /api/contacts` and `GET /api/dashboard-stats` have no auth check | `GET /api/campaigns` and `POST /api/flows/save` correctly require `getServerSession()` | Inconsistent authorization — contact lists and business analytics are reachable by anyone who can hit the API route directly (e.g., unauthenticated `fetch` to `/api/contacts`), while campaigns are protected. This is a data-exposure inconsistency worth a security pass. |
| 7 | `app/help/page.tsx` tells users data lives in "Firebase Realtime Database" | All data (`lib/chatLogic.ts` comments confirm) has moved to Prisma/Postgres | User-facing factual error about where their data is stored |
| 8 | Sidebar "Settings" `Link` vs. `ConfigModal` "Connect" button | Two different, disconnected entry points to the same underlying settings state | Confusing UX — the visible primary entry point (nav link) is broken; the working one is hidden behind a conditional banner |

---

## 3. UI/UX & Professionalism Audit

**General observation:** the visual design language (WhatsApp-green accents, card-based dashboard, sidebar nav) is coherent and modern-looking at the component level. The issues are structural/consistency issues rather than "ugly" issues.

1. **No shared layout component is actually used.** `components/DashboardLayout.tsx` exists but is imported by **zero pages** — every single page (`dashboard`, `chat`, `contacts`, `campaigns`, `help`, `template`, `chatbot-builder`, `dashboard/team`) manually re-implements the same `<div className="flex h-[100dvh] ..."><Sidebar /><main>...` wrapper by hand. This is copy-pasted boilerplate across 8+ files instead of one shared layout — any future change to spacing, padding, or the mobile bottom-nav offset (`pb-[70px]`) has to be hunted down and edited in 8 places individually, and they will drift out of sync over time (they already show minor inconsistencies in background color hex values between pages, e.g. `#F5F7F9` on Help vs `#F4F7F6` on Template).
2. **Settings has no dedicated page**, only a modal — for a CRM with this much configuration surface (WhatsApp tokens, verify token, business account ID, AI prompt), a full settings page with sections (WhatsApp, AI Bot, Team defaults, Notifications) would be far more professional and scalable than a single modal doing everything.
3. **Campaigns UI has no empty/failure/progress states** matching its actual backend behavior — since nothing is ever really "sending," there's no visual distinction the user can trust between a campaign that's genuinely broadcasting vs. one that's just a static row. This will actively mislead a real business user into thinking messages went out.
4. **Repo hygiene directly affects professionalism of the delivered product**, not just the UI: the presence of a `Dummy/` folder (with an oddly named file `Dummy/H` and duplicate `.txt`-suffixed component backups), a near-empty root `README.md` (2 bytes), a stray `webhook-route.ts` duplicate sitting outside the `app/api` structure, and — notably — an `mnt/user-data/outputs/` directory containing generated Privacy Policy/Terms markdown files that has been **accidentally committed into the actual product repository**. This is exactly the kind of clutter a client, investor, or new developer sees first when they open the repo, and it undermines trust before they've even read a line of business logic.
5. **Design-system consistency:** color tokens are hardcoded per-page as raw hex (`#00A884`, `#25D366`, `#075E54`, `#F5F7F9`) rather than defined once in `tailwind.config.ts` as named theme colors and reused via class names like `bg-brand-primary`. This makes a future rebrand or dark-mode pass far more error-prone than it needs to be, despite `ThemeSelector.tsx` and `next-themes` already being present as dependencies, suggesting theming was intended but not fully centralized.
6. **Forms feedback:** several forms (Campaign creation, Team creation) use `alert()` for error states (`alert("Please fill all required fields!")`) instead of the `sonner` toast library that's already installed and used elsewhere in the app (e.g., flow save success). This is visually jarring and inconsistent with the rest of the product's polish.

---

## 4. Actionable Fix Strategy (Conceptual — No Code)

Ordered by priority (fix top-to-bottom to unblock the most value fastest).

### P0 — Fix the Flow Engine (unblocks Flow Builder + indirectly the AI Bot toggle)
- Decide on **one** source of truth for chat-flow state: Postgres (recommended, since everything else already migrated there and the `Contact.activeFlowNodeId` column is sitting ready and unused).
- Rewrite `lib/whatsapp/engine.ts` conceptually to: (a) load the active `ChatFlow` row via Prisma instead of Firebase, (b) read/write the walking cursor to `Contact.activeFlowNodeId` via Prisma instead of the Firebase `chats/.../info` path.
- Once that's done, remove the `firebase-admin` dependency entirely (it's fully unused elsewhere) — this also removes the need to ever call `admin.initializeApp()`, closing the current silent-crash hole.
- Add a `GET /api/flows` (or `GET /api/flows/[id]`) endpoint and call it on `chatbot-builder` page mount so admins see their real, last-saved flow instead of the hardcoded default every time they open the builder.

### P0 — Fix or remove the "Settings" nav link
- Either build a real `app/settings/page.tsx` (recommended — a CRM this configuration-heavy deserves a dedicated page with sections rather than a single modal), or change the Sidebar item's `onClick` to open `ConfigModal` directly instead of using a dead `<Link href="/settings">`.

### P0 — Decide what "AI Integration" actually means and build it, or remove the toggle
- Since `isAiBotActive` and `geminiSystemPrompt` already exist on `SystemSettings`, the conceptual fix is: when a message arrives and the toggle is on, fetch `geminiSystemPrompt`, call the Gemini API with the conversation context, and send the model's reply back through the same `sendWhatsAppMessage()` helper already used by the Flow Engine (`lib/whatsapp/sender.ts`) — no new sending infrastructure is needed, only the "ask Gemini for a reply" step.
- Until that's built, the toggle should be visibly marked "Coming Soon" / disabled in the UI, because right now turning it on silently disables the working Flow Engine and replaces it with nothing.

### P1 — Make Campaigns actually send messages
- Fix the immediate 404 first: point the Campaigns page at `/api/whatsapp/templates` instead of the non-existent `/api/templates`.
- Conceptually, campaign sending needs a background job system, because looping over potentially thousands of contacts inside a single serverless request will time out. The standard pattern: on `POST /api/campaigns`, create the `Campaign` row as `"scheduled"`, then enqueue a background job (Vercel Cron hitting a `/api/campaigns/process` endpoint in batches, or a queue like `pg-boss`/Upstash QStash since the project is already on Postgres/serverless) that walks the contact list in batches, calls the same Meta template-send logic already proven to work in `app/api/v1/trigger/route.ts`, and increments `sent`/`delivered`/`read` on each webhook status callback (the webhook already receives Meta status updates — those handlers just need to also look up and increment the related `Campaign` row, not just the `Message` row).

### P1 — Standardize authentication across all API routes
- Audit every route under `app/api/` and apply `getServerSession()` consistently — currently `campaigns` and `flows/save` check it, but `contacts`, `dashboard-stats`, `team`, `keys`, and `config` GET handlers do not. Conceptually: wrap all internal (non-public, non-webhook, non-`v1/trigger`) routes in the same auth guard so business data can't be read by an unauthenticated direct request to the API URL.

### P2 — Repo hygiene pass
- Delete `Dummy/`, the root-level `.tsx.txt` duplicate components, `webhook-route.ts` (dead duplicate of the real webhook route), `components/template-builder/1`, and the accidentally committed `mnt/user-data/outputs/` folder.
- Replace the 2-byte root `README.md` with the one generated below.
- Remove the unused `firebase.js` config file at the repo root once `engine.ts` is migrated off Firebase (per P0 above) — nothing else imports it.

### P2 — Consolidate layout code
- Actually adopt `components/DashboardLayout.tsx` as the shared wrapper (`<Sidebar/>` + scrollable main area + mobile bottom padding) and have every page under `app/` use it, instead of each page hand-rolling the same markup. This turns future spacing/branding changes into a one-file edit instead of an eight-file hunt.

### P2 — Centralize the design system
- Move the repeated raw hex colors (`#00A884`, `#25D366`, `#075E54`, etc.) into named tokens in `tailwind.config.ts` (e.g. `brand.primary`, `brand.dark`) and reference them via class names everywhere, so theming/rebranding is a config change, not a find-and-replace across the codebase.
- Replace remaining `alert()` calls with the `sonner` toast component already used elsewhere, for consistent form-error UX.

### P3 — Fill in the smaller gaps
- Add a `PATCH /api/contacts/:id` for editing a contact's name/email (currently only create/delete exist).
- Add `PATCH`/`DELETE` for `/api/campaigns` so a running campaign can be paused/cancelled from the UI.
- Wire the Help Center's search bar to actually filter the FAQ list, and correct the FAQ that still claims data is stored in Firebase.
- If team presence (`ONLINE`/`OFFLINE`/`lastSeen`) is meant to be real-time, either wire up the already-installed `socket.io` server/client pair, or replace the ambition with a simpler "last active" timestamp updated on each authenticated request — whichever matches the actual product goal.

---

## 5. README.md

A polished `README.md`, ready to replace the current placeholder, has been generated as a separate file: **`README.md`** (see accompanying file).

---

*This report reflects the codebase exactly as uploaded, file-by-file. No source files were modified as part of this audit.*
