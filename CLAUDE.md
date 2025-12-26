# ザイロク (Zairoku) - Field Tool Management Web App Development Plan

## Service Name 📛

**公式サービス名: ザイロク (Zairoku)**

- すべてのコード、メール、ドキュメント、UI 表示で「ザイロク」を使用してください
- 英語表記が必要な場合は「Zairoku」を使用してください
- 旧称「Field Tool Manager」は使用しないでください

## Language Instruction 🗣️ (Token Optimized)

1. **Reasoning & Thinking:** Conduct ALL internal thinking processes, planning, and code analysis in **English**. (Optimizes token usage and logic).
2. **Final Output:** **ALWAYS output all final responses to the user in Japanese (日本語)**.
3. **Commit Messages:** Use **English** for Git commit messages (e.g., `fix: update inventory logic`).

## 🔰 User Operation Guide Protocol (Strict)

**When asking the user to perform manual tasks (Vercel, Supabase, Stripe dashboards):**

1. **Direct URL:** ALWAYS provide the direct link to the dashboard page.
2. **Visual Path:** Describe navigation clearly (e.g., "Settings > Environment Variables").
3. **Step-by-Step:** Break down actions into numbered lists.
4. **Exact Values:** Provide exact text to copy/paste in code blocks.

## 🤖 Agent System & Workflow

This project operates under a multi-agent system defined in **`AGENTS.md`**.

- **Mandatory:** Always check if `AGENTS.md` is loaded. If loaded, act according to the assigned role.
- **Commands:**
  - `dev`: `npm run dev`
  - `build`: `npm run build`
  - `deploy`: `npm run build && git push origin main` (⚠️ Ensure remote DB migrations are applied FIRST)
  - `team`: `/add AGENTS.md` (Initialize Agents)

## 🚨 CRITICAL: Debugging Protocol

**When the user says "Debug this", "Check this", or reports "Production issue":**

1. **DO NOT FIX ANYTHING immediately.**
2. **ONLY investigate and report findings.**
3. **Mandatory Check Steps (DevOps Role):**
   - **Environment Variables:** Verify `.env.local` keys match Vercel Settings (especially `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`).
   - **RLS Policies:** Check Supabase RLS policies (SELECT/INSERT permissions).
   - **Logs:** Ask for server logs or browser console errors.
   - **Schema & Types:** Check if DB schema matches TypeScript types.
4. **Wait for explicit permission** before making any changes.

## Goal and Context 🎯

The primary goal is to build a multi-tenant SaaS for analog tool management in field operations. Real-time inventory, location tracking, and QR code check-in/out are core features.

### Background

- **Problem:** Manual management of tools/consumables/heavy machinery.
- **Solution:** Unique ID + QR code for check-in/check-out via smartphone.

## Technology Stack 🛠️

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Payment:** Stripe (Future/Invoice-based initially)

---

## Project Documentation Files Overview 📚

### Core Documentation Files

#### 1. **`CLAUDE.md`** (This File)

- **Purpose**: Master instructions for Claude AI. Always refer to this first.

#### 2. **`AGENTS.md`** ⭐ TEAM CONFIG

- **Purpose**: Defines AI agent roles (PM, CTO, DevOps, Scribe) and behavioral rules.
- **Usage**: Load this to activate the team mode.

#### 3. **`CHANGELOG.md`** ⭐ HISTORY

- **Purpose**: Records all development changes and fixes.
- **Usage**: Scribe agent updates this file after every successful task.

#### 4. **`docs/SPECIFICATION_SAAS_FINAL.md`** ⭐ MAIN SPEC

- **Purpose**: Final SaaS multi-tenant system specification (ACTIVE).
- **Usage**: This is the PRIMARY specification document.

#### 5. **`docs/ENVIRONMENT_SETUP.md`** ⭐ CRITICAL

- **Purpose**: Deployment guide and env setup.
- **Usage**: Reference this for "Local vs Production" differences.

### Feature Specifications

#### 6. **`docs/ROLE_BASED_ACCESS_CONTROL.md`** ⭐ CRITICAL

- **Purpose**: RBAC specification (Admin/Leader/Staff).
- **Usage**: MUST implement according to this specification for all features.

#### 7. **`docs/STAFF_MANAGEMENT.md`**

- **Purpose**: Staff limits (Plan-based), CSV import, Roles.

#### 8. **`docs/WORK_REPORT_SPEC.md`**

- **Purpose**: Work report feature (Hybrid design, Photos, Approval flow).

#### 9. **`docs/INVOICE_MANAGEMENT_SPEC.md`**

- **Purpose**: Estimates, Invoices, Orders, Payments.

#### 10. **`docs/PACKAGE_CONTROL_IMPLEMENTATION.md`**

- **Purpose**: SaaS Plan Logic (Asset Pack vs DX Pack).

### Database & Environment

#### 11. **`docs/DATABASE_SCHEMA.md`** ⭐ CRITICAL

- **Purpose**: ER Diagram, Table Definitions, RLS Policies.
- **Rule**: **NEVER** modify DB schema without updating this file.

#### 12. **`docs/MIGRATIONS.md`** ⭐ CRITICAL

- **Purpose**: SQL Migration history.
- **Rule**: **NEVER** execute migration without logging SQL here.

_(Note: `docs/SPECIFICATION.md` is DEPRECATED. `docs/ADDITIONAL_FEATURES_SPEC.md` is for future Stripe integration.)_

---

## Important Instruction Reminders ⚠️

### 1. File & Documentation Rules

- **General Rule:** NEVER proactively create documentation files (\*.md) unless explicitly requested.
- **EXCEPTION:** You ARE expected to update **`CHANGELOG.md`** and **`MIGRATIONS.md`** when completing tasks.
- **Priority:** Always prefer editing existing files over creating new ones.

### 2. UI/UX Preservation (Strict)

- **DO NOT change existing UI/UX (layout, colors, spacing)** unless explicitly requested.
- Focus on logic/backend fixes only.

### 3. Database Integrity & TypeScript

- **Step 1:** Check `DATABASE_SCHEMA.md`.
- **Step 2:** Modify Database.
- **Step 3:** Update `DATABASE_SCHEMA.md` AND `MIGRATIONS.md`.
- **Step 4:** **Regenerate TypeScript types** (or update interfaces) to match the new schema.

### 4. Security & Multi-tenant

- **Secrets:** Never hardcode secrets. Use environment variables.
- **Isolation:** Always ensure data is filtered by `company_id`.
- **Super Admin:** Refer to `docs/SUPER_ADMIN_GUIDE.md`.

### ⚠️ セキュリティ重要事項 (Original Rules)

- **環境変数**: デフォルト値（`|| 'default'`）をコードに書かない。未設定時はエラーにする。
- **秘密情報**: パスワードや API キーをソースコードに書かない。`.env.local`のみに記述する。
