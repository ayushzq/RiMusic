# BaseKey CRM

**BaseKey** is a modern, serverless WhatsApp Business CRM built on Next.js — designed to let a team manage WhatsApp contacts, run conversations, build no-code chatbot flows, send bulk campaigns, and manage WhatsApp message templates, all from one dashboard, with a developer API for external integrations.

> ⚠️ **Status:** BaseKey is under active development. Several flagship features (see below) are UI-complete but not yet fully wired end-to-end — see `BaseKey-CRM-Audit-Report.md` in this repo for a full, file-by-file breakdown of what's production-ready today versus what still needs backend work.

---

## ✨ Key Features

### Fully functional today
- **Authentication** — Email/password + OTP verification, plus Google, GitHub, Facebook, and X (Twitter) social login via NextAuth, with role-based access (Admin / Agent) and per-agent page permissions.
- **Live Chat** — Agent-facing conversation view: contact list, threaded messages, media, delete/clear, all backed by Postgres.
- **Contacts Management** — List, CSV import, Google Contacts sync, bulk delete.
- **WhatsApp Template Management** — Create, list, and track approval status of Meta message templates, media uploads included.
- **Analytics Dashboard** — Real-time-computed stats (inbound/outbound volume, delivery/read rates, contact source breakdown, time-series charts) — no mock data, all derived from actual message history.
- **Developer API** — Secure, revocable, expirable API keys that let external systems trigger WhatsApp template sends via a single authenticated endpoint (`/api/v1/trigger`).
- **Visual Chatbot Flow Builder (design surface)** — Drag-and-drop canvas (built on React Flow) for composing text, button, list, and media reply nodes into a conversation flow.

### In progress / needs backend work
- **Automated Flow Execution** — the visual flow builder currently saves to a different data store than the runtime engine reads from; flows built in the UI do not yet drive live conversations. *(Root cause and fix plan documented in the audit report.)*
- **AI (Gemini) Auto-Reply** — schema and dependencies are in place; the actual model call is not yet implemented.
- **Bulk Campaigns** — campaign records are created and tracked, but the actual bulk-send job (and delivery stat updates) is not yet implemented.
- **Settings Page** — configuration currently lives in a modal; a dedicated settings page is planned.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, `tailwindcss-animate`, Radix UI primitives |
| State management | Zustand (+ Immer middleware) |
| Database / ORM | PostgreSQL (Neon), Prisma ORM |
| Auth | NextAuth.js (Google, GitHub, Facebook, X, and Credentials/OTP providers), bcrypt for password hashing |
| Flow builder | `@xyflow/react` (React Flow) |
| Media | Cloudinary (`next-cloudinary`) |
| Email | Resend |
| Realtime (planned) | Socket.io |
| AI (planned) | Google Generative AI SDK (Gemini) |
| Messaging | Meta WhatsApp Cloud API (Graph API) |

---

## 🏗️ Project Architecture

```
app/
├── api/                  # Backend — Next.js Route Handlers
│   ├── auth/             # Register, login, OTP, password reset, NextAuth config
│   ├── campaigns/        # Campaign CRUD
│   ├── chat/             # Agent chat: contacts + messages
│   ├── config/           # WhatsApp/system settings (SystemSettings)
│   ├── contacts/         # Contact list, import, delete
│   ├── dashboard-stats/  # Analytics aggregation
│   ├── flows/save/       # Chatbot flow persistence
│   ├── keys/             # Developer API key management
│   ├── team/              # Team/agent management
│   ├── upload/            # Media upload handling
│   ├── v1/trigger/       # Public developer API — send a template message
│   ├── webhook/           # Meta WhatsApp webhook (inbound messages + status)
│   └── whatsapp/templates/ # WhatsApp template CRUD (Meta-facing)
│
├── dashboard/, chat/, contacts/, campaigns/,
├── chatbot-builder/, template/, developers/, help/, login/  # Frontend pages (App Router)
│
components/
├── chat/                 # Chat UI (bubbles, input, sidebar, theming)
├── chatbot/               # Flow builder canvas, node types, properties panel
├── template-builder/      # Template creation/preview/media UI
├── login/                 # Auth screens
└── Sidebar.tsx, DashboardLayout.tsx, ConfigModal.tsx, ThemeSelector.tsx

lib/
├── chatLogic.ts           # Shared types + client-side API helpers
└── whatsapp/               # Flow execution engine, Meta message sender, category rules

store/                     # Zustand stores (chat UI state, chatbot builder state)
prisma/                    # Database schema + migrations
validators/, types/        # Zod validation schemas and shared TypeScript types
```

**Data flow, at a glance:**
`WhatsApp User → Meta Cloud API → /api/webhook → Prisma (Contact/Message) → Flow Engine / AI Bot → sendWhatsAppMessage() → Meta Cloud API → WhatsApp User`

Agents interact with the same underlying Postgres data through the Chat, Contacts, Campaigns, and Team pages, all served by the corresponding routes under `app/api/`.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (this project is built against [Neon](https://neon.tech))
- A Meta WhatsApp Business Cloud API app (phone number ID, business account ID, access token)
- (Optional, for social login) OAuth app credentials for Google / GitHub / Facebook / X
- (Optional) Cloudinary account for media uploads, Resend account for transactional email

### 1. Clone and install
```bash
git clone <your-repo-url>
cd basekey-crm
npm install
```

### 2. Configure environment variables
Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="generate-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Social login providers (optional — omit any you don't use)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Cloudinary (media uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Resend)
RESEND_API_KEY=

# Gemini (once AI bot feature is implemented)
GEMINI_API_KEY=
```

> WhatsApp credentials (`accessToken`, `phoneNumberId`, `businessAccountId`, `verifyToken`) are configured **at runtime** through the in-app Settings modal, not via `.env` — they're stored in the `SystemSettings` table.

### 3. Set up the database
```bash
npx prisma generate
npx prisma migrate deploy   # or `npx prisma migrate dev` in local development
```

### 4. Run the development server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 5. Connect WhatsApp
1. Log in as an Admin.
2. Open **Settings** (currently via the "Connect" prompt in the sidebar) and enter your WhatsApp Cloud API credentials.
3. Point your Meta app's webhook at `https://<your-domain>/api/webhook`, using the verify token you configured in step 2.

### Production build
```bash
npm run build
npm start
```
`npm run build` automatically runs `prisma generate` first (see `postinstall`/`build` scripts in `package.json`).

---

## 📄 License

Proprietary — all rights reserved.
