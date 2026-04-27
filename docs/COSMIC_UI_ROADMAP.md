# Cosmic UI Roadmap — Handoff Brief for Codex

**Last updated:** 2026-04-28
**Author of base:** Claude Opus 4.7 (Phase 0–3c done, full-width fix done, chip unification done)
**Repo root:** `D:/UNG DUNG AI/TOOL AI 2026/CVF-Workspace/tan-thuan-web`
**App root:** `apps/web/`
**Current branch:** `main` (8 commits pushed to `origin/main`)

---

## 0. Reading order before touching anything

1. `apps/web/CLAUDE.md` (if exists) and project root `CLAUDE.md` — house rules.
2. `apps/web/src/components/cosmic/index.ts` — design system primitives (13 components). **All new UI must use these.** Do not write inline-styled cards / buttons / inputs.
3. `apps/web/src/app/globals.css` — palette tokens (`--color-*`), `.cvf-input`, `.cvf-card`, `.cvf-login-*` decorative classes.
4. Existing finished pages as reference of "the right shape":
   - `src/app/start-shift/page.tsx` — Card + ChipPicker + sticky submit footer pattern.
   - `src/app/history/page.tsx` — Card + Drawer + KPICard + empty state pattern.
   - `src/app/admin/page.tsx` — tab bar pattern.
   - `src/app/settings/page.tsx` — vertical tab pattern.

## Inviolable rules

| Rule | Why |
|---|---|
| **Never modify** `src/lib/`, `src/services/`, `src/components/AuthProvider.tsx`, `src/lib/db.ts`, `src/types/` unless task explicitly says so | Business logic / data layer; out of UI scope |
| **Never** revert any `feat(ui): cosmic phase N` commit | UI baseline |
| **No inline styles** for static colors — use Tailwind + CSS vars (`text-[var(--color-*)]`). Inline style allowed only for dynamic colors (e.g. tone-driven) | Maintainability |
| Keep `cvf-input` / `cvf-card` working | Many existing forms still use them |
| Each file ≤ 200 lines (GC-023) | Per repo policy |
| Every task ends with: `npm run typecheck` clean + `npm run lint` no NEW errors + `npm run test` 84+ pass + 1 commit per task | Gates |
| No `any` type unless commented why | TS strict |
| Preserve test selectors used by `apps/web/e2e/*.spec.ts` (button text "Đăng nhập", `input[type=password]`, etc.) | E2E pass |

## Quality gate commands (run from `apps/web/`)

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (ignore pre-existing errors in lib/useApi.ts:52)
npm run test         # vitest run
npm run build        # next build (sanity, takes ~2 min)
```

## Commit convention

```
<type>(ui): <scope> — <imperative summary>

<body explaining what changed and why>

Co-Authored-By: <Codex identity>
```

Types: `feat` (new), `fix` (bug), `refactor` (no behavior change), `chore`. Every commit must compile + lint + test green.

---

## Phase 4 — Wire real data into placeholder UI (priority P1)

**Goal:** Replace `"—"` placeholders and ephemeral component state with real persistence/API.

### Task 4.1 — Leave KPI cards (S, ~2h)

**File:** `src/app/leave/page.tsx`

**Current state:** lines ~98–127 render 4 `<KPICard>` with `value="—"` and hint "Chờ kết nối dữ liệu".

**Do:** Read existing leave reports via `getAllReports()` from `src/services/reportService.ts`. Filter `LoaiBaoCao === "NghiPhep"`. Compute:
- `Yêu cầu tháng này` = count where `Created` in current month.
- `Chờ phê duyệt` = count where `TrangThai === "Draft"`.
- `Đã duyệt` = count where `TrangThai === "Approved"` *(value doesn't exist yet; treat as 0 until 4.2 lands)*.
- `Từ chối` = count where `TrangThai === "Rejected"` *(same)*.

**Acceptance:**
- 4 cards show real numbers from localStorage.
- Submitting a new leave (existing form) → page revisit shows `+1` on `Yêu cầu tháng này` + `Chờ phê duyệt`.
- Hint text drops the "Chờ kết nối dữ liệu" copy.

**Don't touch:** existing `saveReport()` call, `CascadingSelect` integration.

### Task 4.2 — Leave request list with approve/reject (M, ~6h)

**File:** `src/app/leave/page.tsx`

**Do:**
1. Extend `BaoCao` type in `src/types/index.ts`: add `TrangThai?: "Draft" | "Approved" | "Rejected"` value `"Approved"` and `"Rejected"` to the union if missing. (Read the file first.)
2. Add `updateReport(id, patch)` function in `src/services/reportService.ts` — pure localStorage mutation, sibling to `saveReport()`.
3. Below the form section in `/leave`, add a `<Card noPad>` with `<CardHeader>` "Danh sách yêu cầu nghỉ phép". Inside: a table (mirror history page style) listing all `LoaiBaoCao === "NghiPhep"` reports.
4. Columns: Ngày | Ca | Người nghỉ | Bộ phận | Lý do | Trạng thái (Badge) | Hành động.
5. Hành động column: when status is `Draft`, show 2 cosmic Buttons "Duyệt" (success) and "Từ chối" (danger). On click → `updateReport(id, { TrangThai: "Approved", Modified: now })`. Re-render KPI count.
6. RBAC: hide approve/reject buttons unless `useAuth().role === "admin"`.

**Acceptance:**
- Admin sees 2 action buttons on draft rows; non-admin doesn't.
- Click "Duyệt" → status badge flips to green "Đã duyệt", buttons disappear.
- KPI cards from 4.1 update on next render.
- Type check + 84 unit tests still pass.

### Task 4.3 — Settings/Display persist (S, ~2h)

**File:** `src/app/settings/page.tsx`

**Current state:** `language` and `density` are component-local `useState`; reset on navigate.

**Do:**
1. Create `src/lib/userPreferences.ts`:
   ```ts
   export type Language = "vi" | "en";
   export type Density = "compact" | "comfortable" | "spacious";
   export interface UserPreferences { language: Language; density: Density; }
   export function getPreferences(): UserPreferences { /* read localStorage key 'ttport.prefs' with defaults vi+comfortable */ }
   export function setPreferences(patch: Partial<UserPreferences>): void { /* merge + write */ }
   ```
2. In Settings/Display tab: load on mount via `useEffect`, write on chip change.
3. Apply density at app shell level: emit a `data-density` attribute on `<body>` or `<html>` from a new `<DensityProvider>` component wired in `apps/web/src/app/layout.tsx`.
4. Add CSS in `globals.css`:
   ```css
   :root[data-density="compact"] { --space-y: 0.5rem; ... }
   :root[data-density="spacious"] { --space-y: 1.5rem; ... }
   ```
   *(Optional — start with spec only, full density implementation can be Phase 7. For now just persist + read back.)*
5. Language toggle persists but **don't** wire i18n yet — that's Phase 7.

**Acceptance:**
- Pick "English" → reload page → still "English".
- No console error on first render (handle SSR-undefined `localStorage`).

### Task 4.4 — Settings/Notifications persist (S, ~2h)

**File:** `src/app/settings/page.tsx`

**Do:**
- Same pattern as 4.3 but for 4 toggles (`notifShift`, `notifAlert`, `notifLeave`, `notifEmail`).
- Storage key: `ttport.notifications`.
- Wire `notifEmail` toggle to call existing `enablePushNotifications()` in `src/lib/notificationService.ts` when toggled on (already imported in `AppHeader.tsx` — pattern to follow).

**Acceptance:**
- Toggle states survive reload.
- Toggling `notifEmail` ON triggers permission prompt once.

### Task 4.5 — Header shift status pill (M, ~6h)

**File:** `src/components/layout/AppHeader.tsx`, `src/lib/shiftSession.ts` (new)

**Do:**
1. Create `src/lib/shiftSession.ts`:
   - `interface ActiveShift { shift: string; startedAt: string; supervisor: string; }`
   - `getActiveShift(): ActiveShift | null` — query latest `BaoCao` where `LoaiBaoCao === "NhanSu"` (start-shift report) for today, return null if none / if matching end-shift report exists.
   - `getShiftElapsed(active: ActiveShift): string` — return `"3h 12m"` from now − startedAt.
2. In `AppHeader.tsx` between title block and right-side icons, render a `<StatusPill tone="success">` (cosmic primitive) with text `Ca {shift} đang chạy · {elapsed}` if active. Hide if null.
3. Update once on mount and every 60s via `setInterval`.
4. Click on the pill → `router.push("/end-shift")`.

**Acceptance:**
- After submitting start-shift report, refreshing any page shows the pill.
- After submitting end-shift report for the same shift, pill disappears.
- 60s tick updates elapsed time.

---

## Phase 5 — Cosmic features that need new data shape

Tackle only after Phase 4. Each task here may need schema changes — review with stakeholder first if you're an autonomous agent.

### Task 5.1 — Dashboard hourly throughput chart (M)

Reuse Recharts `BarChart`. Need backend aggregation `groupBy hour` from vessel/report data — currently aggregations are daily. Add new function in `src/services/reportService.ts`: `getThroughputByHour(date: string): { hour: number; teus: number; }[]`.

### Task 5.2 — Dashboard cargo classification donut (S)

Use Recharts `PieChart`. Source: vessel reports of the day, group by direction (`nhap_tau` vs `xuat_tau` vs `shift_in/out`). UI: cosmic Card + percentage legend.

### Task 5.3 — Dashboard alerts side panel (S)

Already have `apiClient.getOperationsDashboard(date).alerts` from admin page. Lift the same query into `/dashboard` and render in a right-side cosmic Card. Reuse the existing AlertCircle styling from admin OperationsSection.

### Task 5.4 — End-shift live KPI cards (M)

Above the work-items section, add a 4-card row (cosmic KPICard):
- TEU bốc (sum from current shift's vessel reports loaded ops)
- TEU dỡ (sum unloaded)
- Tổng TEU
- Năng suất TEU/h = total / elapsed-hours

Compute live from `vesselService.getVesselReports({ date: today, shift })`. Refresh every 30s while page open.

### Task 5.5 — End-shift incidents form (M)

Add a cosmic Card below work-items:
- Numeric input "Số sự cố"
- If > 0, show conditional `<TextAreaInput>` "Mô tả sự cố"
- Persist in the existing `BaoCao.GhiChu` as JSON `{ incidents: N, description: "..." }` OR add `Incidents?: string` field to type — pick simpler.

### Task 5.6 — Ship-report row drawer (S)

Replace existing edit modal with cosmic `Drawer`. The drawer has same form content but slides from right. Modal stays for delete-confirm only.

### Task 5.7 — Ship-report berth utilization side card (M)

Need `Berth` field in `VesselData` and a list of berths. Render a cosmic Card with horizontal bars (cosmic ProgressBar) per berth. Color by utilization %.

### Task 5.8 — Inventory zone cards + yard grid (L)

Need data per zone (currently inventory is global). Schema migration in `db.ts`. UI: `View` toggle → grid mode renders SVG matrix of slots used/empty per zone.

### Task 5.9 — History shift filter chip (S)

Add a `ChipPicker` row above the table: `Tất cả / Sáng / Chiều / Đêm` matching existing `Ca` field.

### Task 5.10 — Admin Logs tab (M)

New `AuditLog` table in IndexedDB. Hook `logger.info()` to also write a row. UI: tab "Nhật ký" inside `/admin` rendering a table of (time, user, action, type) with cosmic Badge per type.

### Task 5.11 — Admin Backup tab actions (S)

UI cards already designed in admin redesign. Wire to existing `src/lib/backupService.ts` exports — call download / import flows.

### Task 5.12 — Admin Users CRUD (L)

Need user management API (currently only `login` / `changePassword`). Out of scope until backend story exists. Skip unless stakeholder green-lights schema.

---

## Phase 6 — Tech debt cleanup (parallel-safe with Phase 5)

### Task 6.1 — Fix `lib/useApi.ts` ESLint errors (S)

**File:** `src/lib/useApi.ts:52`

ESLint complains: "Expected the dependency list for useCallback to be an array literal." Pre-existing since initial commit. Refactor to inline array literal — likely involves restructuring the generic `useApi` so deps can be statically known. Read the function carefully; it's tricky.

**Acceptance:** `npm run lint` shows 0 errors and 0 warnings.

### Task 6.2 — Migrate hardcoded colors (M)

196 occurrences of `bg-gray-*`, `bg-slate-*`, `text-blue-*` etc. across `src/components/`. Audit list:

```bash
grep -rn 'bg-\(gray\|slate\|blue\|red\|green\|yellow\|amber\|orange\|purple\|rose\|indigo\|sky\|emerald\|cyan\)-[0-9]' apps/web/src
```

Replace with CSS-var equivalents:
- `bg-gray-800` / `bg-slate-800` → `bg-[var(--color-surface)]` or `bg-[var(--color-elevated)]`
- `bg-gray-700` → `bg-[var(--color-elevated)]`
- `text-gray-300` → `text-[var(--color-text-secondary)]`
- `text-blue-*` accent colors → `text-[var(--color-accent)]` or `-info`
- `text-green-400` → `text-[var(--color-success)]`
- `text-red-400` → `text-[var(--color-danger)]`
- `text-yellow-400` → `text-[var(--color-warning)]`

Do per-component. One commit per logical group (e.g. `dashboard/`, `ship-report/`).

### Task 6.3 — Migrate `cvf-card` to cosmic Card (M)

Find: `grep -rn 'cvf-card' apps/web/src` — should be 30+ uses in non-redesigned components. Replace `<div className="cvf-card rounded-xl p-X">` with `<Card>` (or `<Card noPad>` + manual padding).

Don't touch: AuthProvider, ConnectionStatus, anything in `lib/`. Do touch: form components like `WorkItemForm.tsx`, `PersonnelForm.tsx`, `ReportForm.tsx`, etc.

### Task 6.4 — Storybook for cosmic primitives (M)

Install Storybook 8: `npx storybook@latest init`. Write 1 story file per primitive in `src/components/cosmic/*.stories.tsx`. Visual catalog + a11y addon. Deploy as static via Netlify branch deploy.

### Task 6.5 — Visual regression tests (M)

Use Playwright `page.screenshot()` against 10 redesigned routes. Baseline images committed to `apps/web/e2e/__screenshots__/`. Run on CI as `test:visual` script.

### Task 6.6 — E2E for new interactions (S)

Add `apps/web/e2e/cosmic.spec.ts`:
- Sidebar collapse persist (set localStorage, reload, verify width).
- History row → drawer opens → ESC closes.
- Settings tab navigation works.

### Task 6.7 — Bundle size audit (S)

Run `npm run build` → inspect `.next/analyze` (add `@next/bundle-analyzer` if not present). Confirm cosmic primitives didn't add >5kb gzipped to first-load JS.

---

## Phase 7 — Future-proofing (P3, evaluate before starting)

### Task 7.1 — Light theme support (M)

`globals.css` palette currently dark-only. Audit which rgba values would break in light. Add `[data-theme="light"]` overrides. Wire to Settings/Display.

### Task 7.2 — i18n with `next-intl` (L)

Install `next-intl`. Extract all user-facing strings into `messages/vi.json` + `messages/en.json`. Wire language preference from Phase 4.3.

### Task 7.3 — Dashboard widget personalization (L)

Allow drag-reorder of KPI cards. Use `dnd-kit`. Persist order in `userPreferences`.

### Task 7.4 — PWA install + offline shell (M)

Service worker + manifest already partially scaffolded (`syncService.ts`). Complete install banner + offline route.

---

## Suggested execution order

```
Sprint 1 (week 1):  Task 4.1, 4.3, 4.4, 4.5  +  Task 6.1
Sprint 2 (week 2):  Task 4.2  +  Task 5.6, 5.9  +  Task 6.2 (dashboard subset)
Sprint 3 (week 3):  Task 5.1, 5.2, 5.3  +  Task 6.6
Sprint 4 (week 4):  Task 5.4, 5.5  +  Task 6.3 (cvf-card migration)
Sprint 5 (week 5):  Task 5.7, 5.10, 5.11  +  Task 6.4 (Storybook)
Sprint 6 (week 6):  Task 5.8  +  Task 6.5 (visual regression)
Backlog / when needed:  5.12, 7.x
```

## Definition of Done — for every task

1. ✅ `npm run typecheck` zero errors
2. ✅ `npm run lint` zero NEW errors (pre-existing `useApi.ts:52` and `ship-report:235` allowed until Task 6.1 closes them)
3. ✅ `npm run test` ≥ 84 pass (current baseline)
4. ✅ Visual sanity in dev: load each touched page, hit happy path
5. ✅ Single commit per task, message follows convention
6. ✅ Acceptance criteria from this doc explicitly verified in commit body

## When to ask for human review

- Schema changes to `BaoCao`, `VesselData`, `Employee`, `User` — always confirm.
- Any new dependency in `package.json`.
- Any change in `apps/web/netlify.toml`, `next.config.ts`, `eslint.config.mjs`.
- Behavior changes that break an existing E2E spec.

---

## Reference: cosmic primitives signature

```ts
// All exports from src/components/cosmic/index.ts

<Card accent?="accent|success|warning|danger|info" noPad?>
<CardHeader title subtitle? action? />

<Badge tone="success|warning|danger|info|accent|muted" dot? />

<Button variant="primary|secondary|danger|success|ghost" size="sm|md|lg" icon={LucideIcon} iconPosition?="left|right" />

<Sparkline data={number[]} color? width? height? />

<KPICard icon={LucideIcon} label value unit? delta? deltaDir?="up|down" spark? tone? hint? onClick? />

<ProgressBar value max? color? height? label? />

<Toggle checked onChange ariaLabel? disabled? />

<SectionLabel>...</SectionLabel>

<SegmentedTabs<T> value onChange options={[{value, label}]} size? />

<Drawer open onClose title? subtitle? width? footer? />

<TextInput label? note? error? required? icon? {...inputProps} />
<SelectInput options={[{value, label}]} {...selectProps} />
<TextAreaInput {...textareaProps} />

<StatusPill tone="success|warning|danger|info" pulse? />

<ChipPicker<T> label? required? value onChange options={[{value, label, hint?, disabled?}]} columns?=2|3|4|5|6 size?="sm|md" hint? />
```

## Reference: palette tokens (from `globals.css`)

```css
--color-bg: #0b1d35
--color-surface: #0f2847
--color-elevated: #1a3a62
--color-border: rgba(14,165,233,0.12)
--color-border-strong: rgba(14,165,233,0.25)
--color-accent: #0ea5e9
--color-accent-hover: #38bdf8
--color-accent-dim: rgba(14,165,233,0.10)
--color-success: #10b981
--color-warning: #f59e0b
--color-danger: #f43f5e
--color-info: #818cf8
--color-text-primary: #f0f6ff
--color-text-secondary: #94a3b8
--color-text-muted: #64748b
```

---

## Out of scope for this roadmap

- Backend / API new endpoints — frontend reads what `apiClient` already exposes.
- Database migrations beyond simple type extensions in `src/types/`.
- Authentication / authorization redesign — uses existing `useAuth()`.
- Build / deploy infra — Netlify config stays as-is.
- 3D digital twin (`Tan Thuan Digital Twin/` sibling project).

---

**End of roadmap.** Pick a task, do the work, commit, repeat.
