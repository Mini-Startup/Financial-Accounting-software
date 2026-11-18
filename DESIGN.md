# DESIGN.md — BizzMate FAS Design System

Single source of truth for the visual design, component behavior and keyboard interaction of the whole application. Every screen, modal and component MUST follow this file. If something is not covered here, extend this file first, then build it. Never invent one-off styles.

---

## 0. Product Context & Principles

**What the app is:** A finance / accounting / trading application (trades, clients, brokers, scripts, closing rates, ledgers, imports).

**Who uses it:** Accountants, dealers and back-office staff who are fluent in Excel, Tally and similar desktop finance software. They work for hours at a stretch, mostly **with the keyboard only**, and value speed, density and predictability over decoration.

**Design principles**

1. **Dense but calm.** Show a lot of data without clutter. Think "modern spreadsheet", not "marketing dashboard".
2. **Keyboard first.** Every action reachable and operable without a mouse. Mouse is a convenience, not a requirement.
3. **Numbers are the hero.** Right-aligned, tabular, monospaced-feel digits, consistent decimals, unmistakable positive/negative.
4. **Consistent everywhere.** One button style, one input style, one modal style, one table style, one dropdown style.
5. **Meaning never relies on color alone.** Buy/Sell/Profit/Loss always carry a text label or sign in addition to color.
6. **Quiet chrome, clear focus.** Neutral surfaces; color is reserved for actions, status and focus.

---

## 1. Design Tokens

Implement all values below as CSS variables (and map them in the Tailwind config / theme). Components must reference tokens, never raw hex values.

### 1.1 Color Palette

#### Primary — "Ledger Blue" (actions, links, focus, active navigation)

| Token | Hex | Usage |
|---|---|---|
| primary-50 | `#EFF4FF` | Active row cursor, active nav bg, subtle highlights |
| primary-100 | `#DCE7FD` | Selected rows, hover on subtle surfaces |
| primary-200 | `#BCD0FA` | Selected borders, focus halo tint |
| primary-300 | `#8FB0F5` | Disabled primary button bg |
| primary-400 | `#5F8AEC` | Icons on dark, chart secondary |
| primary-500 | `#3B6BDF` | Focus ring, links hover |
| **primary-600** | **`#2652C8`** | **Main brand / primary button / links** |
| primary-700 | `#1F42A3` | Primary button hover |
| primary-800 | `#1C3782` | Primary button pressed |
| primary-900 | `#1B3068` | Headings on tinted bg, dark accents |

#### Secondary — "Slate" (neutrals: text, borders, surfaces)

| Token | Hex | Usage |
|---|---|---|
| secondary-50 | `#F8FAFC` | App background, sidebar bg, table header bg |
| secondary-100 | `#F1F5F9` | Hover row, input disabled bg, subtle fills |
| secondary-200 | `#E2E8F0` | Default borders, dividers, table row lines |
| secondary-300 | `#CBD5E1` | Input borders, strong dividers |
| secondary-400 | `#94A3B8` | Placeholder text, disabled icons |
| secondary-500 | `#64748B` | Secondary text, helper text, icons |
| secondary-600 | `#475569` | Table header text, labels |
| secondary-700 | `#334155` | Body text (alt), strong secondary text |
| secondary-800 | `#1E293B` | Primary body text on tinted surfaces |
| secondary-900 | `#0F172A` | Headings, primary text |

#### Accent — "Amber" (highlights, attention, search matches, unsaved indicators)

| Token | Hex | Usage |
|---|---|---|
| accent-50 | `#FFFBEB` | Search-match row tint, warning bg |
| accent-100 | `#FEF3C7` | Search-match text highlight |
| accent-200 | `#FDE68A` | Highlight borders |
| accent-300 | `#FCD34D` | Keyboard shortcut hint badge border (hover) |
| accent-400 | `#FBBF24` | Unsaved/edited dot |
| accent-500 | `#F59E0B` | Warning icon |
| accent-600 | `#D97706` | Warning text on light bg |
| accent-700 | `#B45309` | Warning text on accent-50 |
| accent-800 | `#92400E` | Strong warning text |
| accent-900 | `#78350F` | Rare, darkest accent |

#### Trade Side & P&L (reserved — use ONLY for buy/sell and profit/loss)

| Token | Hex | Usage |
|---|---|---|
| buy-50 | `#F0FDF4` | Buy row tint (optional) |
| buy-100 | `#DCFCE7` | BUY badge bg |
| buy-600 | `#16A34A` | Buy icon / profit bar |
| **buy-700** | **`#15803D`** | **BUY badge text, profit numbers** |
| buy-800 | `#166534` | BUY badge text on hover |
| sell-50 | `#FEF2F2` | Sell row tint (optional) |
| sell-100 | `#FEE2E2` | SELL badge bg |
| sell-600 | `#DC2626` | Sell icon / loss bar |
| **sell-700** | **`#B91C1C`** | **SELL badge text, loss/negative numbers** |
| sell-800 | `#991B1B` | SELL badge text on hover |

Rules: BUY = green, SELL = red. Profit = buy-700, Loss = sell-700. Badges always contain the words `BUY` / `SELL`. Negative numbers always show a minus sign (`-1,250.00`) in addition to red. Never use these colors for generic success/error UI.

#### Semantic Status

| Purpose | Background | Text | Border | Icon |
|---|---|---|---|---|
| Success | `#ECFDF5` | `#047857` | `#A7F3D0` | `#10B981` |
| Error / Danger | `#FEF2F2` | `#B91C1C` | `#FECACA` | `#EF4444` |
| Warning | accent-50 | accent-700 | accent-200 | accent-500 |
| Info | primary-50 | primary-700 | primary-200 | primary-500 |
| Neutral | secondary-100 | secondary-700 | secondary-200 | secondary-500 |

Danger button / destructive confirm: bg `#DC2626`, hover `#B91C1C`, pressed `#991B1B`.

#### Surfaces

| Token | Value | Usage |
|---|---|---|
| bg-app | secondary-100 `#F1F5F9` | Page canvas background (contrast workstation surface) |
| bg-surface | `#FFFFFF` | Cards, tables, modals, dropdowns |
| bg-subtle | secondary-100 | Hover, disabled, zebra (if enabled) |
| bg-overlay | `rgba(15, 23, 42, 0.45)` | Modal backdrop (no blur) |
| border-default | secondary-200 | Cards, tables, dividers |
| border-strong | secondary-300 | Inputs, buttons (secondary) |
| text-primary | secondary-900 | Main text |
| text-secondary | secondary-600 | Labels, table headers |
| text-muted | secondary-500 | Helper text, hints |
| text-placeholder | secondary-400 | Placeholders only (never for real information) |
| text-on-primary | `#FFFFFF` | Text on primary/danger buttons |

All text/background pairs must meet WCAG AA (4.5:1 body, 3:1 large text and UI components).

### 1.2 Typography

**Font families**

- **UI font:** `Inter` (via `next/font`), fallback `system-ui, -apple-system, "Segoe UI", sans-serif`.
- **Numeric / code font:** `"JetBrains Mono"`, fallback `ui-monospace, "SFMono-Regular", Consolas, monospace`. Used for trade numbers, codes, IDs, and optionally for numeric table columns.
- All numeric values (amounts, quantities, rates, balances) use `font-variant-numeric: tabular-nums` so digits align in columns.

**Type scale** (base size is **14px** — this is a dense data application)

| Token | Size / Line height | Weight | Usage |
|---|---|---|---|
| text-2xs | 11px / 16px | 500 | Badges, keyboard hints, table footnotes |
| text-xs | 12px / 16px | 400–500 | Helper text, captions, meta text, sub-lines in cells |
| text-sm | 13px / 20px | 400–500 | **Table cells**, compact controls, secondary UI |
| **text-base** | **14px / 20px** | 400–500 | **Default body, inputs, buttons, labels** |
| text-md | 16px / 24px | 500–600 | Card titles, modal section titles |
| text-lg | 18px / 28px | 600 | Modal titles |
| text-xl | 20px / 28px | 600 | Page titles |
| text-2xl | 24px / 32px | 600 | Stat/KPI numbers |
| text-3xl | 30px / 36px | 700 | Dashboard hero figure (rare) |

**Weights:** 400 regular (body), 500 medium (labels, table headers, buttons), 600 semibold (titles, key figures), 700 bold (rare). Never go above 700.

**Text rules**

- Page title: `text-xl`, 600, text-primary. Page subtitle: `text-base`, text-muted, one line.
- Form labels: `text-sm`, 500, text-secondary, placed above the control.
- Table header: `text-xs`, 600, UPPERCASE, letter-spacing `0.04em`, text-secondary.
- Table cell primary line: `text-sm`, 500, text-primary. Secondary line: `text-xs`, 400, text-muted.
- Do not use all-caps anywhere except table headers and badges.
- Links: primary-600, underline on hover/focus. Never rely on color alone in running text.

### 1.3 Spacing (4px base grid)

| Token | Value | Typical use |
|---|---|---|
| space-0.5 | 2px | Icon-to-text micro gap |
| space-1 | 4px | Badge padding-y, tight gaps |
| space-2 | 8px | Gap between related controls, icon + label |
| space-3 | 12px | Cell padding-x, input padding-x, compact card padding |
| space-4 | 16px | Default gap between form fields, card padding |
| space-5 | 20px | Section gap inside modal |
| space-6 | 24px | Page padding, card-to-card gap |
| space-8 | 32px | Large section separation |
| space-10 | 40px | Page top spacing, empty-state padding |

Standard layout rules:

- Page content padding: **24px** (16px below 1024px width).
- Gap between page header, filter bar and table: **16px**.
- Form grid: 2 columns, column gap **16px**, row gap **16px**; 1 column below 640px.
- Modal body padding: **20px 24px**; header/footer padding: **16px 24px**.
- Card padding: **16px** (compact) or **20px** (default).

### 1.4 Unified Primary Roundness Token System (`--app-radius`)

To ensure modern, harmonious aesthetics with zero sharp 90-degree corners and simple whole-app roundness scalability, the application uses a unified roundness architecture anchored to a single master token:

```css
:root {
  --app-radius: 12px;                          /* Master primary roundness knob */
  --radius-xs: 6px;
  --radius-sm: calc(var(--app-radius) - 4px);  /* 8px: tags, small badges, checkboxes */
  --radius-md: 10px;
  --radius-control: var(--app-radius);         /* 12px: inputs, buttons, dropdown triggers */
  --radius-card: calc(var(--app-radius) + 4px);/* 16px: cards, tables, popovers */
  --radius-modal: calc(var(--app-radius) + 8px);/* 20px: modals, dialogs */
  --radius-full: 9999px;                       /* pills, avatars */
}
```

| Token | Calculated Value | Usage |
|---|---|---|
| radius-sm | `8px` | Badges, checkboxes, tooltips, keyboard hints |
| **radius-control / radius-md** | **`10px - 12px`** | **Buttons, inputs, dropdown triggers, search bars** |
| radius-card / radius-xl | `16px` | Cards, table containers, popovers, banners |
| radius-modal / radius-2xl | `20px` | Modals, confirm dialogs, slide-overs |
| radius-full | `9999px` | Avatars, status dots, round pills |

> [!TIP]
> Changing `--app-radius` adjusts the visual curvature across the entire application simultaneously with mathematical harmony. Sharp, boxy 90-degree edges are strictly eliminated.

### 1.5 Borders, Elevation & Focus

- Default border: `1px solid border-default`. Input border: `1px solid border-strong`.
- Elevation is subtle; prefer borders over shadows.

| Token | Value | Usage |
|---|---|---|
| shadow-xs | `0 1px 2px rgba(15,23,42,0.05)` | Buttons (secondary), inputs on focus-less state |
| shadow-sm | `0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)` | Cards |
| shadow-md | `0 4px 12px rgba(15,23,42,0.10)` | Dropdown panels, popovers, toasts |
| shadow-lg | `0 16px 40px rgba(15,23,42,0.18)` | Modals, command palette |

- **Focus ring (global, mandatory):** `:focus-visible { outline: 2px solid primary-500; outline-offset: 2px; }`. For inputs: border becomes primary-500 plus `box-shadow: 0 0 0 3px primary-100`. The focus indicator must be visible on every focusable element and must never be removed (`outline: none` is forbidden unless replaced by an equal-or-stronger indicator).
- Error state: border `#DC2626`, ring `0 0 0 3px #FEE2E2`.
- Disabled: bg secondary-100, text secondary-400, `cursor: not-allowed`; disabled controls are skipped in Tab order only when truly non-interactive (use `aria-disabled` + focusable for controls that explain why they are disabled).

### 1.6 Sizing & Layout Constants

| Item | Value |
|---|---|
| Control height (default: input, select, button) | **36px** |
| Control height small / large | 32px / 40px |
| Icon size (inline / button / nav) | 16px / 16px / 18px |
| Icon stroke | 1.75px (Lucide icon set only) |
| Table row height (compact / default / comfortable) | 32px / **40px** / 48px (two-line rows use 52px) |
| Table header height | 36px |
| Sidebar width (expanded / collapsed) | 240px / 64px |
| Top bar height | 56px |
| Modal widths | sm 440px, md 640px, lg 880px, xl 1100px (max 92vw) |
| Max modal height | 90vh; body scrolls, header & footer fixed |
| Breakpoints | sm 640, md 768, lg 1024, xl 1280, 2xl 1536 |

The app is primarily a desktop app (1280px+); layouts must still not break at 1024px.

---

## 2. Application Shell

### 2.1 Layout

```
┌───────────┬──────────────────────────────────────────────┐
│           │ Top bar (56px): page breadcrumb · global     │
│  Sidebar  │ search hint · user menu                      │
│  240px    ├──────────────────────────────────────────────┤
│           │ Page: title + actions                        │
│           │ Filter bar                                   │
│           │ Table / content card                         │
└───────────┴──────────────────────────────────────────────┘
```

### 2.2 Sidebar (Primary 400 to 600 Gradient with Lighter Active State)

- Background: **Primary 400 to 600 Gradient** (`linear-gradient(180deg, #0A1B4D 0%, #102E7A 45%, #1D4ED8 100%)`) with border `border-r border-blue-900/60`. Rich executive finance gradient matching dashboard header comps.
- Header (56px): logo mark (28px, rounded-lg, `bg-white/20 border border-white/30`, white letter) + app name `text-base` 700 text-white. Pin/collapse button at the right (`text-blue-200 hover:text-white`).
- Section label (e.g., MASTER, DATA, REPORTS): `text-[11px]`, 700, UPPERCASE, letter-spacing `0.06em`, `text-blue-200/70`, padding `16px 12px 6px`. Clean text header, no folder icons.
- Nav item: height **36px**, padding `0 12px`, `rounded-xl`, icon 18px + label `text-sm` 500, gap 10px, `text-blue-100/80`.
  - Hover: `bg-white/10 text-white`.
  - **Active State (Lighter Contrast):** Solid white pill `bg-white text-[#0A1B4D] font-bold shadow-md rounded-xl` with dark navy icon `text-[#0A1B4D]`. Provides luminous contrast on the rich blue gradient canvas.
  - Sub-groups (e.g. "Import Files"): `subGroupActive ? bg-white/20 border border-white/25 text-white font-semibold shadow-xs rounded-xl : text-blue-100/80 hover:bg-white/10`.
  - Sub-item active: `bg-white text-[#0A1B4D] font-bold shadow-sm rounded-lg`.
  - Clean layout: zero ugly curved brackets, zero misaligned vertical tree lines.
- Groups are collapsible with a chevron (14px) at the right; chevron rotates 180° when open.
- Footer: user block with avatar (32px circle), name `text-sm` 600 text-white, role `text-xs` text-blue-200; subtle translucent container `bg-black/25 border-t border-white/10`.
- Collapsed state (64px): icons only, label shown on hover expand.

### 2.3 Page Header

- Row: left = title (`text-xl`) + subtitle (`text-base` muted); right = primary actions (max one primary button + up to two secondary).
- Primary action button shows its keyboard shortcut hint (see §5.7).

---

## 3. Components

### 3.1 Buttons

All buttons: height 36px (default), padding `0 14px`, radius-md, `text-base` 500, icon 16px with 8px gap, `transition: background-color, border-color, box-shadow 120ms ease`. No gradients, no pill shape, no uppercase.

| Variant | Background | Text | Border | Hover | Pressed | Use |
|---|---|---|---|---|---|---|
| **Primary** | primary-600 | white | none | primary-700 | primary-800 | The one main action per view (Add Trade, Save) |
| **Secondary** | white | secondary-800 | 1px secondary-300 | bg secondary-50, border secondary-400 | bg secondary-100 | Cancel, Import, Export, other actions |
| **Ghost** | transparent | secondary-700 | none | bg secondary-100 | bg secondary-200 | Toolbar and row actions |
| **Danger** | `#DC2626` | white | none | `#B91C1C` | `#991B1B` | Delete / destructive confirm |
| **Danger-ghost** | transparent | `#B91C1C` | none | bg `#FEF2F2` | bg `#FEE2E2` | Row delete icon |
| **Link** | transparent | primary-600 | none | underline | — | Inline text actions |

- Sizes: sm 32px (`text-sm`, padding 0 10px), md 36px, lg 40px.
- Icon-only buttons: square (32/36/40px), always with `aria-label` and a tooltip.
- Disabled: primary → bg primary-300, others → text secondary-400 / bg secondary-100.
- Loading: spinner replaces icon, label stays, width unchanged, button is `aria-busy` and not clickable.
- Order in footers/dialogs: **Cancel (secondary) on the left of the primary action, both right-aligned.**
- Only one primary button visible per screen/modal.

### 3.2 Text Input, Number Input, Textarea

- Height 36px, padding `0 12px`, radius-md, bg white, border `1px secondary-300`, `text-base`, text secondary-900, placeholder secondary-400.
- Hover: border secondary-400. Focus: see §1.5. Error: red border + message below. Disabled/readonly: bg secondary-100, text secondary-600.
- Label above (`text-sm` 500 secondary-600), 6px gap. Required marker: red `*` after the label text plus `aria-required="true"` on the control.
- Helper text: `text-xs` secondary-500, 4px below. Error text: `text-xs` `#B91C1C` with a 14px alert icon, replaces helper text.
- Leading/trailing icons or units sit inside the control (12px inset); input padding adjusts.
- **Number inputs:** right-aligned text, tabular numerals, `inputmode="decimal"`, thousands separators on blur (raw value on focus), no spinner arrows, accept pasted values with commas. Select-all on focus.
- **Phone / mobile / WhatsApp / landline inputs:** `type="tel"`, `inputmode="tel"`. The field **blocks invalid characters as the user types** — only digits, a single leading `+`, spaces, hyphens and parentheses are accepted; letters and other symbols are silently rejected (never typed) and pasted text is sanitized. Format is validated on change (after the first blur) and on submit: 7–15 digits (E.164 rules), optional leading `+` and country code. If the format is invalid the field immediately gets the **error state (red border + red ring + inline message)** per §3.13, e.g. "Enter a valid phone number (7–15 digits, e.g. +91 98765 43210)". Empty is valid unless the field is required. "Same as Mobile" copies the value and re-validates.
- **Other format-restricted fields** follow the same two-layer rule — restrict keystrokes where the format is strict, and validate with a red error state when the final value is wrong: Email (valid address pattern), IFSC (4 letters + `0` + 6 alphanumerics, auto-uppercase), UPI ID (`name@handle`), MICR (9 digits), Account No. (digits only), Code (alphanumeric, no spaces, auto-uppercase if the business rule says so), Quantity (whole number, optional leading `-`), Rate/Amount (decimal).
- Textarea: min-height 80px, vertical resize only.
- Placeholders show an example (e.g., `e.g. 250.50`), never replace labels.

### 3.3 Select / Dropdown (Combobox)

One component is used for every dropdown in the app (filters, forms, masters). It is always a **keyboard-operable combobox with type-ahead search**.

**Closed state:** identical to text input (36px, radius-md, border secondary-300) with a 16px chevron at the right. Selected value in text-primary; empty shows placeholder.

**Open panel:**
- Positioned 4px below the control, min-width = control width, max-height **320px** (scrolls), bg white, border `1px secondary-200`, radius-lg, shadow-md, padding 4px.
- A search field is pinned at the top of the panel when the list has more than 7 options (or always in master selects); it receives focus automatically on open.
- Option: height 36px, padding `0 10px`, radius-md, `text-base`. Secondary info (code) shown in a muted `text-xs` mono on the right or after the name.
- Hover **and** keyboard-active option: bg secondary-100. **Selected** option: text primary-700, bg primary-50, 16px check icon at the right.
- Group headers: `text-2xs` UPPERCASE secondary-500, sticky.
- Empty state: "No results" in muted text, centered, 56px tall.
- Multi-select shows checkboxes at the left of options and the closed control shows chips or "3 selected".
- Width must never be smaller than its longest option label; truncate with ellipsis and show a tooltip only as a last resort.

All keyboard behavior is defined in §5.3.

### 3.4 Date Input

- Display and typing format: **DD-MM-YYYY** everywhere (never mix 2-digit and 4-digit years).
- The field is a **typeable masked input** with a calendar icon button at the right (the picker is optional, never the only way).
- Typing digits auto-inserts separators; invalid dates show an inline error on blur.
- Calendar popover: radius-lg, shadow-md, 7-column grid, 36px day cells, today has a primary-600 outline, selected day primary-600 bg with white text, out-of-month days secondary-400. Footer: `Clear` and `Today` ghost buttons.
- Date-range filters use two date inputs side by side labeled "From" and "To" inside one grouped control.

Keyboard behavior in §5.4.

### 3.5 Search Bar

- Height 36px, radius-md, border secondary-300, bg white, leading search icon (16px, secondary-400), width fills available space (min 280px).
- Placeholder is short, e.g. "Search trades…". A secondary help line is not placed inside the placeholder; use a tooltip/help icon for syntax tips.
- Shows a `/` keyboard hint badge at the right when empty and unfocused; shows a clear (×) button when it has text.
- Search is debounced (250ms), shows an inline spinner while loading, highlights matches in results with accent-100 background.
- A search scope dropdown (e.g., "Exchange") is attached to the left of the bar as a segment of the same control (shared border, divider line, no gap).

### 3.6 Filter Bar

- Sits in one white card (padding 12px 16px, radius-lg, border-default) directly above the table.
- Layout: a single row that wraps to a second row on narrow widths. Row 1: search (flex-grow). Row 2: filter controls (all 36px height, equal widths of 180px unless stated, 8px gap), then at far right: column chooser, page-size selector and pagination summary.
- All filter controls use the **same** Select/Date components and visual style as forms. No custom filter chip styles.
- Active filters: control gets a primary-50 background tint and a primary-600 left bar; a "Clear filters" link-button appears at the end of the row.
- Result count is always visible ("27 trades").

### 3.7 Table

The table is the core of the application. It must look and behave like a clean spreadsheet.

**Container:** white card, radius-lg, border-default, no shadow; the table scrolls inside the container (`overflow: auto`) so the page body never scrolls horizontally; header and first data column are sticky.

**Header row:** height 36px, bg secondary-50, bottom border `1px secondary-200`, text per §1.2 (UPPERCASE `text-xs` 600), padding `0 12px`. Sortable columns show a 14px sort icon (secondary-400, active = primary-600 with direction arrow); the whole header cell is a focusable button (`aria-sort` set).

**Body rows:**
- Height 40px (52px when a cell has two lines); bottom border `1px secondary-100`; no vertical lines by default (a "grid lines" option adds `1px secondary-100` vertical borders to emulate Excel).
- Cell padding `0 12px`; text `text-sm`; vertical align middle.
- Hover: bg secondary-50. **Keyboard cursor (active row):** bg primary-50 and a 2px primary-600 inset bar on the left edge plus the focus ring on the row. **Selected (checked) rows:** bg primary-100. Search match rows/text: accent-50 / accent-100.
- Zebra striping is off by default.

**Column rules (alignment is mandatory):**

| Content | Alignment | Font |
|---|---|---|
| Dates | Left | Mono, `text-sm` |
| Text / names / codes | Left | UI, `text-sm` |
| Badges (side, type, exchange) | Left | `text-2xs` badge |
| Quantity, amounts, rates, balances, P&L | **Right** | Tabular nums (mono), `text-sm` |
| Actions | Right (or sticky right) | Icon buttons |
| Checkbox | Center, 44px wide | — |

- Header alignment always matches the column's cell alignment.
- Numeric formatting: thousands separators, fixed decimals per field type (amounts 2, rates per instrument precision), currency symbol as a muted prefix (`$`, `RM`, `₹`), negatives with `-` and sell-700 color, zeros shown as `0.00` not blank. Units/lot size appear as a muted `text-xs` suffix or a separate column, never inline-mixed with the value in different fonts.
- A single data point lives in exactly one column; avoid combining unrelated data in a cell (e.g., do not put client code and rate in one cell). Two-line cells are allowed only for a primary value + a muted descriptor (e.g., security name + expiry).
- Columns have explicit min-widths; text truncates with ellipsis + `title`; headers never wrap.
- Footer row for totals (when applicable): bg secondary-50, top border `1px secondary-300`, 600 weight, right-aligned numbers.
- Row actions: edit and delete as ghost icon buttons (32px), delete uses danger-ghost; both visible (not hover-only) so keyboard users can reach them; also available via row keyboard shortcuts (§5.5).
- Pagination footer: height 48px, left = "1–25 of 27", right = page-size select, first/prev/next/last icon buttons (32px) and a "Page [n]" input.
- Empty state: centered icon (40px, secondary-400), title `text-md` 600, one-line description, optional primary button. Loading state: skeleton rows (same height) with secondary-100 shimmer; never layout shift.
- Column chooser: popover with checkboxes, required columns shown disabled with a "Required" tag; keyboard-operable.

### 3.8 Badges & Tags

Height 20px, padding `0 8px`, radius-sm, `text-2xs` 600, UPPERCASE for status/side labels, 1px border of the same hue.

| Badge | Bg | Text | Border |
|---|---|---|---|
| BUY | buy-100 | buy-700 | `#BBF7D0` |
| SELL | sell-100 | sell-700 | `#FECACA` |
| Trade type (BF, CF, etc.) | secondary-100 | secondary-700 | secondary-200 |
| Exchange (MDEX, SGX, NYME…) | primary-50 | primary-700 | primary-200 |
| Status: Open | primary-50 | primary-700 | primary-200 |
| Status: Closed / Settled | secondary-100 | secondary-600 | secondary-200 |
| Status: Pending | accent-50 | accent-700 | accent-200 |
| Status: Error | `#FEF2F2` | `#B91C1C` | `#FECACA` |

Badges are never interactive unless explicitly built as a chip filter (then they become buttons with a focus ring and an × icon).

### 3.9 Cards

- bg white, border `1px border-default`, radius-lg, shadow-sm (or none inside pages with tables), padding 16/20px.
- Card header: title `text-md` 600 + optional description `text-sm` muted, optional right-aligned actions, bottom divider only if body is separate content.
- **Stat / KPI card:** label `text-xs` 600 UPPERCASE muted; value `text-2xl` 600 tabular; delta line `text-sm` with arrow icon + sign in buy-700/sell-700; min-height 96px.
- **Live-result / summary panel** (used in forms): bg secondary-50, border secondary-200, radius-lg, padding 16px; rows are label (muted) left / value (tabular, right-aligned) right, separated by `1px` dividers; the final result row is 600 weight with a top border.

### 3.10 Modals / Dialogs

One modal style for the entire app. Built on an accessible dialog primitive (focus trap, scroll lock, `role="dialog"`, `aria-modal`, `aria-labelledby`).

- Backdrop: bg-overlay (no blur). Panel: white, radius-xl, shadow-lg, centered, widths per §1.6.
- **Header:** padding `16px 24px`, bottom border border-default, title `text-lg` 600 (+ optional one-line `text-sm` muted description), close icon button (32px ghost) at the right.
- **Body:** padding `20px 24px`, scrolls independently, sections separated by 20px; section headings `text-sm` 600 secondary-700 with a bottom hairline; form grid per §1.3.
- **Footer:** padding `12px 24px`, top border border-default, bg secondary-50, right-aligned buttons: `Cancel` (secondary) then primary action. Optional left side shows a muted hint (e.g., "Ctrl+Enter to save").
- Destructive confirmations use the `sm` modal: danger icon in a sell-100 circle, title, one-line consequence, buttons `Cancel` (default focus) and `Delete` (danger).
- Entry/exit animation: opacity + 8px translate, 150ms ease-out; respects `prefers-reduced-motion`.
- Nested modals are not allowed; use a popover or a replace-in-place step instead.
- Keyboard behavior in §5.6.

### 3.11 Forms

- Labels above controls, left-aligned; 2-column grid; related fields grouped under a section heading; full-width fields (notes, address) span both columns.
- Field order follows the natural data-entry order used by the users (top-left to bottom-right) — this is also the Tab order.
- Validation and error display follow §3.13 exactly: invalid fields turn red with an inline message, an error summary appears at the top of the form, the first invalid field is scrolled into view and focused, and a toast (§3.14) only supplements — never replaces — the on-form errors.
- Required fields are marked; optional fields are not marked "(optional)" unless the form is mostly optional.
- Read-only computed values (rate, profit) show in the summary panel, not in disabled inputs.
- Dependent fields (e.g., client rule depends on client) update instantly; show a subtle "Updating…" state, never block typing.

### 3.12 Tabs, Pagination, Tooltips, Menus

- **Tabs:** underline style; height 40px; text `text-base` 500 secondary-600; active = primary-700 text + 2px primary-600 bottom border; arrow keys move between tabs.
- **Tooltip:** bg secondary-900, white `text-xs`, radius-sm, padding `4px 8px`, 8px offset, delay 400ms on hover, immediate on keyboard focus, dismiss with Esc; never contains required information.
- **Dropdown menu (actions):** same visual as Select panel; items with icon + label + right-aligned shortcut hint; separators `1px secondary-200`; destructive item in `#B91C1C`.
- **Checkbox / radio:** 16px, radius-sm (radio full), border secondary-400, checked = primary-600 bg with white tick, focus ring standard, label click toggles, 8px gap to label; indeterminate state supported for "select all".
- **Switch:** 36×20px, off secondary-300, on primary-600, white knob; Space toggles.
- **Progress / import status:** 6px bar, secondary-200 track, primary-600 fill; completed = `#10B981` (semantic success), failed = `#EF4444` (semantic danger).
- **File drop zone** (used in modals): dashed `1.5px` secondary-300 border, radius-lg, bg secondary-50, padding 32px; hover/drag-over: border primary-500 + bg primary-50; contains icon, title, helper, and a "Browse files" secondary button; fully operable via Enter/Space on the focusable zone.

### 3.13 Form Validation & Error UX — Visible Error States & Input Sanitization

**The Core Rule:** Users must NEVER be left wondering what went wrong or which field is broken. A floating toast message saying "Please resolve highlighted validation errors" is useless if the form does not clearly and visibly highlight the errors.

#### 1. Visual Specification of Invalid Input States
- **Border:** `1.5px solid #DC2626` (semantic danger red).
- **Focus Ring / Halo:** `box-shadow: 0 0 0 3px #FEE2E2` (soft red tint).
- **Background:** subtle danger tint `#FEF2F2` (for immediate high-contrast visibility).
- **Inline Error Message:** Always placed directly below the invalid input:
  - Font: `text-[11px]` (or `text-xs`), weight 500, color `#DC2626`.
  - Icon: 14px `AlertCircle` in `#DC2626`, aligned with the text (`flex items-center gap-1.5 mt-1`).
  - Content: Explains exactly what is wrong and how to fix it (e.g. *"Phone number cannot contain alphabets and must have 10–15 digits"*).
- **Top Error Summary Banner:** When a form submission is attempted with invalid fields, an alert banner appears at the very top of the modal/card body:
  - Background: `#FEF2F2`, border: `1px solid #FECACA`, radius: `radius-xl` (12px).
  - Content: Header saying *"Please correct the highlighted errors before saving:"* followed by a bulleted list of every field and its specific error.
  - **Auto-Scroll & Auto-Focus:** The form immediately scrolls the first invalid field into view and places focus inside it (`el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' });`).

#### 2. Spontaneous Real-Time Sanitization & Phone Validation
- **Phone / Mobile / WhatsApp / Office Phone Inputs:**
  - **Strict Keystroke Filtering & Validation:** Alphabetic characters (`[a-zA-Z]`) are strictly forbidden in phone numbers.
  - **Spontaneous Red Border Feedback:** As soon as an invalid character, letter, or invalid format is present, the field border **spontaneously turns red** (`border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-950 focus:border-red-600 focus:ring-red-200`) and the inline error helper appears immediately under the field. The user does NOT need to blur or click away to see that their entry is invalid.
  - **Format Requirements:** Digits `0–9`, optional single leading `+`, spaces, hyphens `-`, and parentheses `()`. Total digits must be between 10 and 15 digits (standard international and Indian mobile/landline numbers).
  - **Paste Sanitization:** Pasted text containing letters is flagged immediately with spontaneous red border and actionable feedback.
- **Email Inputs (`type="email"`):**
  - Validated against standard email pattern (`name@domain.com`). Invalid format immediately produces red border and helper text.
- **Bank Account Number & MICR Inputs:**
  - Digits only. Letters cannot be typed. MICR strictly requires 9 digits.
- **IFSC Code Inputs:**
  - Auto-uppercased as typed. Standard 11-character format: 4 letters + 0 + 6 alphanumeric characters.
- **Quantity & Rate Inputs:**
  - Numeric characters and a single decimal point only. Thousands commas accepted on paste.

### 3.14 Executive Toast Notifications & System Feedback (Reference Image 2)

Toasts provide elegant, executive confirmation of operations, file transfers, and validation failures.

#### 1. Visual Specification (Image 2 Reference Standard)
- **Position:** Top-right (`top-5 right-5`), stacking vertically with 10px spacing.
- **Dimensions:** Width 380px–440px, padding `16px 20px`, radius `rounded-2xl` (20px).
- **Elevation:** High-end multi-layer soft shadow `shadow-[0_20px_45px_-8px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.04)]`, border `1px solid rgba(226, 232, 240, 0.9)`, solid white card background.
- **Ambient Top-Left Aura:** Soft, blurred radial color aura radiating from the top-left corner matching the state color:
  - **Success:** Emerald aura (`rgba(16, 185, 129, 0.18)`).
  - **Error:** Rose aura (`rgba(244, 63, 94, 0.18)`).
  - **Info / Upload:** Blue aura (`rgba(38, 82, 200, 0.18)`).
  - **Warning:** Amber aura (`rgba(245, 158, 11, 0.18)`).
- **Elevated Circular Disc Icon:**
  - 44px elevated white circular disc with subtle elevation shadow (`shadow-md border border-slate-100`).
  - Inside: 24px inner colored badge with crisp, centered vector icon:
    - **Success:** `#10B981` emerald badge with centered checkmark.
    - **Error:** `#F43F5E` rose badge with centered alert icon.
    - **Upload / Info:** `#2652C8` primary blue badge with cloud/arrow icon.
    - **Warning:** `#F59E0B` amber badge with centered triangle.
- **Typography & Content Layout:**
  - Title: `text-sm font-bold text-slate-900 tracking-tight leading-snug`.
  - Description: `text-xs text-slate-500 font-normal leading-relaxed mt-0.5`.
  - Multi-error list: Clean, structured bulleted list inside a soft tinted container (`bg-rose-50/70 border-rose-100/90 rounded-xl p-3`).
- **Internal Top-Right Close Button:**
  - Tucked neatly inside the top-right corner (`top: 12px; right: 12px;`), NOT hanging outside the card.
- **Progress Bar (Image 2):**
  - Smooth 6px full-width bar (`h-1.5 bg-slate-100 rounded-full overflow-hidden`), filled with dynamic state color (`bg-blue-600` or `bg-emerald-500`).
  - Monospace status label below: e.g. `50% uploaded...`, `100% uploaded!`.
- **Action / Cancel Footer:**
  - Subtle text links: `Cancel` (grey hover) and `Upload More` / `Dismiss` / `Review` (bold primary blue).

#### 2. Form Error & Toast Rules
- **No In-Form Error Banners:** Forms and modals do NOT render large, cluttering error banners at the top of the modal. Forms stay clean, single-screen, and zero-scroll.
- **On-Form Highlighting:** Fields with invalid inputs turn red spontaneously (`border-red-500 ring-2 ring-red-400 bg-red-50/20`) with clean inline feedback directly below the field.
- **Notification Handles Error Summary:** When submission is attempted with invalid inputs, the executive error notification opens with the full, specific list of errors:
  - Title: `Please correct the highlighted errors before saving:`
  - Clean bulleted list: `Account Code: Code is required.`, `Mobile Number: Phone number cannot contain alphabets.`, etc.
  - The first invalid input is automatically scrolled into view and focused.
- **No Phantom Group Errors:** Pre-assigned group fields (`groupName`) must always be recognized so `groupId: Account group is required` is never erroneously emitted.

---

## 4. Iconography, Motion & Content Style

- **Icons:** Lucide only; 16px inline, 18px nav, 1.75 stroke; color inherits text color; decorative icons `aria-hidden`; icon-only buttons always labeled.
- **Motion:** 120–150ms ease-out for hover/focus/open; no bouncing, no parallax; respect `prefers-reduced-motion` (disable translate/scale, keep opacity).
- **Copy:** Sentence case for buttons and labels ("Add trade", not "ADD TRADE"); verbs for actions; plain accounting terminology users already know (Client, Broker, Script, Brokerage, Closing rate); error messages say what happened and how to fix it ("Quantity must be a whole number").
- **Formats:** Dates `DD-MM-YYYY`; time 24-hour `HH:mm`; numbers use thousands separators; currency code or symbol always adjacent to the amount; negative = leading minus.

---

## 5. Keyboard Interaction Specification (mandatory)

Users operate the app without a mouse. Every component must satisfy the rules below. A feature is not complete until it is fully usable by keyboard.

### 5.1 General Rules

1. **Everything reachable by Tab / Shift+Tab** in a logical, visual order (left→right, top→bottom). No positive `tabindex` values. No keyboard traps except intentional modal focus traps.
2. **Focus is always visible** (§1.5 focus ring). Focus is never lost: after closing a modal/popover/menu, focus returns to the element that opened it; after deleting a row, focus moves to the next row (or previous if last).
3. **Native semantics first:** use `<button>`, `<a>`, `<input>`, `<table>` where possible; add ARIA only where needed (combobox, listbox, dialog, grid, menu, tabs).
4. `Enter` activates the primary/default action in the current context; `Space` toggles checkboxes/switches and activates buttons; `Esc` closes the topmost popover/modal/menu and cancels in-progress edits.
5. Clickable `div`s are forbidden; every clickable thing is a button or link.
6. A skip link ("Skip to main content") is the first focusable element on every page.
7. All actions in menus, row buttons and toolbars are reachable by keyboard — nothing may be hover-only.
8. Shortcuts must not fire while typing in an input/textarea/contenteditable (except those using `Ctrl`/`Alt`/`Esc`) and must not override browser/OS shortcuts. Shortcuts are listed in a help dialog (`?` or `Ctrl+/`) and shown as hints (§5.7).

### 5.2 Global Shortcuts & Universal Command Palette (Ctrl+K)

| Shortcut | Action |
|---|---|
| `Ctrl+K` | **Universal Search / Command Palette** (search any page, feature, client, broker, script, or action) |
| `/` | Focus the page search field |
| `Alt+N` | New record on the current page (Add Trade, Add Client, …) |
| `Alt+I` | Import on the current page |
| `Alt+F` | Focus the first filter control |
| `Alt+C` | Open column chooser |
| `Alt+R` | Reset / clear all filters |
| `Alt+1 … Alt+9` | Jump to sidebar sections in order |
| `[` | Collapse / expand sidebar |
| `?` or `Ctrl+/` | Open keyboard shortcut help |
| `Esc` | Close top-most overlay / clear search when focused |

#### Universal Search (`Ctrl+K`) Specification:
- **Instant Global Navigation:** Pressing `Ctrl+K` (or `Cmd+K` on Mac) opens the central Command Palette overlay from any page in the app.
- **Search Capabilities:**
  - **Pages & Routes:** Jump instantly to Trades, Expiry Dates, Clients, Brokers, Scripts, Exchanges, Reports (Net Position, Settlement Audit, Settlement Summary), Currencies, Brokerage, etc.
  - **Entities & Masters:** Search clients by code/name, brokers, and scripts.
  - **Quick Actions:** Trigger "Add Trade", "Import Trade File", "Export Table", "Toggle Sidebar", etc.
- **Keyboard Navigation:**
  - `ArrowDown` / `ArrowUp` to cycle through grouped search results.
  - `Enter` to navigate or execute the selected action.
  - `Esc` to immediately dismiss the palette and return focus to the previous element.

### 5.3 Select / Combobox / Dropdown

| Key | Behavior |
|---|---|
| `Tab` / `Shift+Tab` | Move focus to next/previous control; if a panel is open, **select the active option, close, and move on** |
| `ArrowDown` / `ArrowUp` (closed) | **Open the panel** with the current option active (or first option if none) |
| `Enter` / `Space` (closed) | Open the panel |
| `ArrowDown` / `ArrowUp` (open) | Move active option (wraps at ends; skips disabled options and group headers) |
| `Home` / `End` | First / last option |
| `PageDown` / `PageUp` | Move by 8 options |
| Type characters | Type-ahead: opens the panel (if closed) and filters/jumps to matching option; matching is case-insensitive, supports code and name, and matches words in any position |
| `Enter` (open) | Choose the active option, close panel, keep focus on the control |
| `Esc` (open) | Close panel without changing the value; focus stays on the control |
| `Backspace` (closed, clearable) | Clear value |
| Multi-select: `Space` | Toggle the active option (panel stays open); `Enter` toggles and keeps open; `Esc`/`Tab` closes |
| `Ctrl+A` in multi-select | Select all visible options |

Implementation: `role="combobox"` on the control with `aria-expanded`, `aria-controls`, `aria-activedescendant`; panel `role="listbox"`, options `role="option"` with `aria-selected`. Focus stays on the input while the active option is indicated via `aria-activedescendant`. The active option scrolls into view. Opening a panel never steals scroll position of the page.

### 5.4 Date Input

| Key | Behavior |
|---|---|
| Typing digits | Fills `DD-MM-YYYY` with auto-inserted separators; `Backspace` removes the last digit and separator |
| `ArrowUp` / `ArrowDown` | Increment / decrement the date segment under the cursor (day, month, year) |
| `T` | Today |
| `Alt+ArrowDown` or `F4` | Open calendar popover |
| Calendar: arrows | Move by day (←/→) or week (↑/↓) |
| Calendar: `PageUp` / `PageDown` | Previous / next month; `Shift+PageUp/Down` previous / next year |
| Calendar: `Home` / `End` | Start / end of week |
| Calendar: `Enter` / `Space` | Choose the day, close, focus returns to the input |
| Calendar: `Esc` | Close without change |

Date inputs never require the calendar. Invalid dates are flagged on blur with an inline message.

### 5.5 Table (Grid-style Navigation)

The table is one tab stop (roving tabindex); arrow keys move inside it. `Tab` leaves the table.

| Key | Behavior |
|---|---|
| `ArrowDown` / `ArrowUp` | Move the active row down / up |
| `ArrowLeft` / `ArrowRight` | Move between focusable cells/actions in the active row (checkbox → row → edit → delete) |
| `Home` / `End` | First / last cell in the row |
| `Ctrl+Home` / `Ctrl+End` | First / last row of the page |
| `PageDown` / `PageUp` | Move by one visible page of rows; at the edge, go to next / previous data page |
| `Space` | Toggle selection of the active row |
| `Shift+ArrowDown/Up` | Extend selection |
| `Ctrl+A` | Select all rows on the page (press again for all results) |
| `Enter` | Open / edit the active row (opens the edit modal) |
| `Delete` | Delete the active row (or selected rows) — always opens the confirmation dialog |
| `Alt+ArrowLeft` / `Alt+ArrowRight` | Previous / next data page |
| `S` on a focused header | Cycle sort on that column (also `Enter`/`Space` on the header) |
| `Esc` | Clear selection |

- The active row is always scrolled into view, and sticky header/column never hide it.
- Selection count and bulk actions appear in a bar above the table when ≥ 1 row is selected, and are reachable by Tab from the table.
- Optional inline cell editing (spreadsheet mode): `F2` or typing starts editing; `Enter` commits and moves down; `Tab` commits and moves right; `Esc` cancels.

### 5.6 Modals

1. On open, focus moves to the **first editable field** (or to the least-destructive button in confirmations). A modal never opens with focus on the close button.
2. Focus is trapped inside the modal; `Tab` cycles; `Shift+Tab` reverses.
3. `Esc` closes the modal (if there are unsaved changes, show an inline "Discard changes?" confirmation first).
4. `Ctrl+Enter` submits the form from anywhere in the modal. `Enter` inside a single-line input advances to the **next field** (like a data-entry form); `Enter` on the last field submits. `Enter` inside a textarea inserts a newline.
5. The submit button shows a `Ctrl+Enter` hint; Cancel shows `Esc`.
6. On close, focus returns to the element that opened the modal.
7. After a successful submit in an "add" modal, offer "Save & add another" (`Ctrl+Shift+Enter`) which keeps the modal open, clears the fields (preserving configurable carry-over fields such as date, client, broker) and re-focuses the first field.
8. Page scroll is locked while the modal is open (`useScrollLock` custom hook).

### 5.7 Shortcut Hints in the UI

- Primary buttons and key controls show their shortcut as a `kbd` hint: height 18px, padding `0 5px`, radius-sm, `text-2xs` mono 500, bg secondary-100, border `1px secondary-300`, text secondary-600; on a primary button the hint is `rgba(255,255,255,0.18)` bg with white text.
- Menu items right-align their shortcut in the same style (no border).
- A shortcut help dialog lists all shortcuts grouped by context (Global, Table, Forms, Dropdowns).

### 5.8 Other Components

| Component | Keys |
|---|---|
| Buttons / links | `Enter` (button & link), `Space` (button) |
| Checkbox / switch | `Space` toggles |
| Radio group | Arrows move + select; `Tab` enters/leaves group as one stop |
| Tabs | `ArrowLeft/Right` move, `Home/End` first/last, activation on focus (or Enter if panels are heavy) |
| Dropdown (actions) menu | `Enter`/`Space`/`ArrowDown` opens; arrows move; `Enter` activates; type-ahead; `Esc` closes |
| Popovers (calendar, column chooser) | `Esc` closes and returns focus to trigger; contents Tab-reachable |
| Sidebar | `ArrowUp/Down` move between items when sidebar is focused; `ArrowRight` expands a group, `ArrowLeft` collapses; `Enter` navigates |
| File drop zone | `Enter` / `Space` opens file picker; `Ctrl+V` pastes clipboard data |
| Toasts | Not focus-stealing; errors announced via `role="alert"`; dismiss with `Esc` when focused |
| Pagination | Buttons Tab-reachable; page input accepts typed number + `Enter` |

### 5.9 Accessibility Baseline

- WCAG 2.1 AA contrast; touch/click targets ≥ 32px (≥ 24px minimum for dense table icons with sufficient spacing).
- Every input has a programmatically associated `<label>`; errors are linked with `aria-describedby` and `aria-invalid`.
- Tables use proper `<table>` semantics (`<th scope>`, `aria-sort`, `aria-rowcount` when paginated/virtualized).
- Live regions announce: result count changes after search/filter, toasts, import progress.
- Respect `prefers-reduced-motion` and `prefers-contrast` where feasible.

---

## 6. Implementation Tokens (copy into the project)

```css
:root {
  /* Primary — Ledger Blue */
  --primary-50:#EFF4FF; --primary-100:#DCE7FD; --primary-200:#BCD0FA; --primary-300:#8FB0F5;
  --primary-400:#5F8AEC; --primary-500:#3B6BDF; --primary-600:#2652C8; --primary-700:#1F42A3;
  --primary-800:#1C3782; --primary-900:#1B3068;

  /* Secondary — Slate */
  --secondary-50:#F8FAFC; --secondary-100:#F1F5F9; --secondary-200:#E2E8F0; --secondary-300:#CBD5E1;
  --secondary-400:#94A3B8; --secondary-500:#64748B; --secondary-600:#475569; --secondary-700:#334155;
  --secondary-800:#1E293B; --secondary-900:#0F172A;

  /* Accent — Amber */
  --accent-50:#FFFBEB; --accent-100:#FEF3C7; --accent-200:#FDE68A; --accent-300:#FCD34D;
  --accent-400:#FBBF24; --accent-500:#F59E0B; --accent-600:#D97706; --accent-700:#B45309;
  --accent-800:#92400E; --accent-900:#78350F;

  /* Trade side & P&L (reserved) */
  --buy-50:#F0FDF4; --buy-100:#DCFCE7; --buy-600:#16A34A; --buy-700:#15803D; --buy-800:#166534;
  --sell-50:#FEF2F2; --sell-100:#FEE2E2; --sell-600:#DC2626; --sell-700:#B91C1C; --sell-800:#991B1B;

  /* Semantic */
  --success-bg:#ECFDF5; --success-text:#047857; --success-border:#A7F3D0; --success-icon:#10B981;
  --danger-bg:#FEF2F2;  --danger-text:#B91C1C;  --danger-border:#FECACA;  --danger-icon:#EF4444;

  /* Surfaces & text */
  --bg-app:var(--secondary-50); --bg-surface:#FFFFFF; --bg-subtle:var(--secondary-100);
  --bg-overlay:rgba(15,23,42,.45);
  --border-default:var(--secondary-200); --border-strong:var(--secondary-300);
  --text-primary:var(--secondary-900); --text-secondary:var(--secondary-600);
  --text-muted:var(--secondary-500); --text-placeholder:var(--secondary-400);

  /* Radius */
  --radius-sm:4px; --radius-md:6px; --radius-lg:8px; --radius-xl:12px;

  /* Shadows */
  --shadow-xs:0 1px 2px rgba(15,23,42,.05);
  --shadow-sm:0 1px 3px rgba(15,23,42,.08),0 1px 2px rgba(15,23,42,.04);
  --shadow-md:0 4px 12px rgba(15,23,42,.10);
  --shadow-lg:0 16px 40px rgba(15,23,42,.18);

  /* Sizing */
  --control-h:36px; --control-h-sm:32px; --control-h-lg:40px;
  --row-h:40px; --header-h:36px; --sidebar-w:240px; --sidebar-w-collapsed:64px; --topbar-h:56px;

  /* Typography */
  --font-ui:var(--font-inter), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono:var(--font-jetbrains-mono), ui-monospace, "SFMono-Regular", Consolas, monospace;
}

:focus-visible { outline:2px solid var(--primary-500); outline-offset:2px; }
.num { font-family:var(--font-mono); font-variant-numeric:tabular-nums; text-align:right; }
@media (prefers-reduced-motion: reduce){ *{ animation-duration:.01ms!important; transition-duration:.01ms!important; } }
```

**Engineering rules that keep the design consistent**

1. Build each component once (Button, Input, NumberInput, DateInput, Select/Combobox, SearchBar, Table, Badge, Card, Modal, Tabs, Toast, Tooltip, Checkbox, Switch, FileDropZone, EmptyState) in a shared UI folder; pages only compose them.
2. No raw hex values, pixel radii or ad-hoc shadows in page code; use tokens only.
3. Every modal uses the single `Modal` shell; every dropdown uses the single `Select`; every list screen uses the single `DataTable` + `FilterBar`.
4. Before merging any screen, verify: keyboard-only walkthrough passes (§5), focus ring visible everywhere, numbers right-aligned and tabular, buy/sell badges carry text, no horizontal page scroll at 1280px.
