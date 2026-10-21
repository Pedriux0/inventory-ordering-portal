# UI/UX Research: Redesign of the Inventory Portal

This research informs the second UI version. The version being shown and submitted is saved as tag **`v2.1.0`**. The redesign happens on the `ui-redesign` branch and doesn't change it.

## 1. What kind of app this is

Research separates **dashboards** ("am I about to run out?") from **work applications** (forms and tables people use all day). This portal is mainly a work application with one operational dashboard, so the research below focuses on:

- **Tables:** products, stock, orders and suppliers.
- **Fast data entry:** orders and receipts, which work like a point of sale.
- **An operational dashboard:** what needs attention right now.
- **Feedback and errors** in forms.

## 2. Findings and how the current UI compares

### A. Data tables

| Finding | Source | Current UI | Change |
|---|---|---|---|
| The first column should be a **human-readable identifier**, not a generated ID ("mystery meat"). | NN/G, *Data Tables: Four Major User Tasks* | Products and Suppliers start with `ID`. | Name first; the ID moves to secondary text. |
| **Default sort** = whatever most needs action (for example, lowest inventory). | Pencil & Paper, *Data Table Design UX Patterns* | Products sorted A–Z. Inventory already puts problems first. | Products and the dashboard show items needing reorder first. |
| Help users keep their place: **sticky header, row hover highlight**, light borders. | NN/G | No sticky header, no hover. | Add both. |
| **Right-align numbers** and use **tabular numerals** so digits line up for comparison. | Denovers, *Enterprise Table UX*; Polaris type guidance | Numbers are left-aligned. | Right-align stock, price and totals with `font-variant-numeric: tabular-nums`. |
| **Secondary text** under the main value adds context without another column. | Denovers | Already used for product descriptions. | Keep it, and use it for supplier contact details. |
| A filter must show clearly **that it's active**. | NN/G | No filters yet. | When search and sort are built (Week 7, req 2.6), show active filters as removable chips (already in mockup 7). |

### B. Viewing and editing one record

| Finding | Source | Current UI | Change |
|---|---|---|---|
| Avoid **modals** for editing, because they hide the table, and users look at other rows while editing. A **nonmodal side panel** keeps the table visible. | NN/G, *Data Tables* | The create/edit form opens above the table and pushes it down the page. | Create and edit happen in a **side panel (drawer)** that slides in from the right while the table stays visible. |
| Make a **high-impact change reviewable**: show the item, the previous quantity, the change and the result **before saving**. | technine.io inventory concept | The receipt form shows the result only after saving. | Live preview in the receipt and order forms: **"Stock 23 → 48"**. |

### C. Fast entry for orders and receipts (POS research)

| Finding | Source | Current UI | Change |
|---|---|---|---|
| **Simplify, then simplify again.** Follow the worker's real steps and design for a new hire. | Dev.Pro, *Designing a POS System: 10 UX Tactics* | Orders work, but the product dropdown is long and hard to scan. | **Searchable product picker** (type to filter) that shows stock and price on each option. |
| **Consistency** reduces how long it takes to understand a screen. | Dev.Pro | Each page lays out its form a little differently. | One page template everywhere: header, primary action, table, drawer. |
| Prevent errors instead of reporting them afterwards. | NN/G form-error guidelines | You only learn about an oversell after submitting. | The quantity field warns as you type ("only 23 in stock"), and the server still enforces it. |
| An **order summary** before confirming. | Dev.Pro (step-by-step flows) | Only an estimated total. | Sticky order summary: each line, its subtotal, the total, then **Place order**. |

### D. Dashboard

| Finding | Source | Current UI | Change |
|---|---|---|---|
| Operational dashboards answer "**what needs my attention now?**" at a glance. | NN/G, *Dashboards: Preattentive* | Four numbers and two tables. | Lead with **Needs attention**: low-stock items, each with a one-click **Receive stock** button. |
| Quantities read best as **length** (bars). Avoid pies, donuts and gauges. | NN/G, *Dashboards: Preattentive* (Cleveland & McGill) | Stock is shown only as a number. | A small **stock bar** compared with the reorder level, on the dashboard and the inventory page. |
| Remove **decorative icons and graphics** from KPI cards so the numbers stand out. | NN/G, *8 Guidelines for Complex Applications* (#8) | The cards are already plain. | Keep them plain, and make each card a link to its filtered list. |
| **Flexible pathways:** let users jump straight to the next step. | NN/G complex apps (#3) | The dashboard only links to pages. | Quick actions: *New order*, *Receive stock*, *New product*. |

### E. Status, colour and accessibility

| Finding | Source | Current UI | Change |
|---|---|---|---|
| **Colour must not be the only cue** (WCAG 1.4.1). | W3C, *Understanding SC 1.4.1* | The badges have text (good). | Keep the text and add a **shape/icon** (⚠ critical, ▼ low). |
| **Flag only the problems**; a missing alert reads as "OK". | UX Stack Exchange answer on status colours (citing WCAG) | Every row shows a green "OK" badge, which is visual noise. | Show badges only for **Low** and **Critical**. Healthy rows stay quiet. |
| Status indicators and their surroundings need **3:1 contrast** (WCAG 1.4.11). | W3C, *Understanding SC 1.4.11* | Not checked. | Check all badge, border and focus colours (Week 9 accessibility tests). |

### F. Feedback and errors

| Finding | Source | Current UI | Change |
|---|---|---|---|
| Show **errors inline, next to the field**, not only in a summary at the top. | NN/G, *10 Guidelines for Reporting Errors in Forms* | One message box at the top of the form. | Client-side checks show each error under its field. Server errors map to fields where possible. |
| **Never use placeholders as labels.** | NN/G via Andrew Coyle and IvyForms | Labels are already visible (good). | Keep them. |
| **Toasts** suit passive success messages but are **wrong for errors**. | NN/G, *Indicators, Validations, and Notifications* | Success messages appear at the top and can scroll out of view. | Success → a short **toast** ("Order #12 confirmed"). Errors stay inline and persistent. |

### G. Look and feel (design system)

| Finding | Source | Change |
|---|---|---|
| Admin tools work best with **quiet greys, one strong primary action per screen**, and type tuned for data. | Shopify Polaris (design system for commerce admin) | Calmer palette. Only one blue primary button per page; others are secondary. |
| A **4px spacing scale**, 8px radius and a subtle 1px shadow. | Polaris tokens | Replace ad-hoc spacing with design tokens (CSS variables). |
| **Inter** (or a system font) with tabular numerals. | Polaris; Denovers | Inter via Google Fonts, with the system font as fallback. |
| A well-designed **empty state** tells you what to do next. | Polaris *EmptyState* | "No suppliers yet. Add your first supplier" with a button. |
| A **light mode by default**. Dark mode is optional. | Dev.Pro (lighting conditions) | Light first. A dark-mode toggle is optional (see the open questions). |

## 3. Proposed redesign plan

UI changes only. **The API and database don't change**, so every test from Milestone 2 stays valid.

**Phase 1: foundation (low risk, biggest visual change)**
1. Design tokens (colours, 4px spacing, radius, Inter font, tabular numerals).
2. A shared `PageHeader` component with the title and one primary action.
3. A shared `DataTable` style: name first, numbers right-aligned, sticky header, row hover.
4. Status badges with an icon, shown only for Low and Critical.
5. Navigation icons next to the labels.

**Phase 2: workflow improvements**
6. A side-panel `Drawer` for creating and editing products and suppliers.
7. A searchable product picker for orders and receipts.
8. A live stock preview ("23 → 48") and an as-you-type over-stock warning.
9. A sticky order summary.
10. Toasts for success, and inline field errors.

**Phase 3: dashboard**
11. "Needs attention" first, with one-click **Receive stock**.
12. Stock bars compared with the reorder level.
13. KPI cards link to their filtered lists, plus quick actions.
14. Empty states with a next step.

**Not in this redesign:** server-side search, sort and pagination. Those are Week 7 (reqs 2.6.1–2.6.4) and need API changes, so they get their own branch.

## 4. Status: all three phases implemented (branch `ui-redesign`)

| Plan item | Where it lives |
|---|---|
| Design tokens, light and **dark mode** (toggle in the top bar and on the login page, remembered per browser) | `client/src/index.css`, `client/src/theme.js` |
| Icons next to every navigation label (lucide-react) | `components/Layout.jsx` |
| Name-first tables, right-aligned numbers, sticky headers, row hover | every page |
| Status badges only for Low and Critical, with an icon | `StockBadge` in `components/ui.jsx` |
| **Side panel** for create, edit, receive and order details (full screen on phones, Escape to close, focus handled) | `components/Drawer.jsx` |
| Type-to-search **product picker** (WAI-ARIA combobox) | `components/ProductPicker.jsx` |
| Live **"23 → 48" preview** before recording a receipt | `pages/Inventory.jsx` |
| **"Only N in stock"** warning while typing, and a sticky **order summary** | `pages/Orders.jsx` |
| **Toasts** for success, **Undo** for deactivating a supplier, **inline field errors** with focus on the first error | `components/Toast.jsx`, `Field` in `components/ui.jsx`, `validation.js` |
| Dashboard: **Needs attention** first with one-click **Receive**, **stock bars**, KPI cards that link to their lists, quick actions | `pages/Dashboard.jsx` |
| "Needs reorder" filter on the inventory page | `pages/Inventory.jsx` |
| Empty states that say what to do next | every list |
| New two-panel login with a show-password button | `pages/Login.jsx` |

**Verification**
- Cypress: 13 frontend tests pass. They cover FE-01–05, FE-10 and FE-11, plus the theme toggle, the dashboard's one-click Receive, the reorder filter, the over-stock warning and Undo.
- Jest: 90 backend tests pass. No API or database changes were made.
- **axe-core accessibility scan (WCAG 2.1 A/AA): 0 violations** on every page, in both themes, including the open drawers and a form showing errors. The scan found one problem first: white text on `#3b82f6` was only 3.7:1 contrast. It was fixed with brand and link colour tokens (`#2563eb`, 5.2:1).

## 5. Decisions made

1. **Icons:** `lucide-react`.
2. **Dark mode:** included.
3. **Drawer:** a side panel on desktop and full screen on phones.

1. **Icons:** add a small icon library (`lucide-react`, about 1 KB per icon, MIT licence) or use simple inline SVGs?
2. **Dark mode:** include a toggle now, or keep light only?
3. **Drawer vs. separate page:** NN/G recommends a side panel for editing. On phones it would open full screen. Agree?

## 6. Sources

- Nielsen Norman Group: [Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/)
- Nielsen Norman Group: [Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/)
- Nielsen Norman Group: [8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/)
- Nielsen Norman Group: [10 Design Guidelines for Reporting Errors in Forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- Nielsen Norman Group: [Indicators, Validations, and Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/)
- Pencil & Paper: [Data Table Design UX Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Denovers: [6 Best Practices for Enterprise Table UX Design](https://www.denovers.com/blog/enterprise-table-ux-design)
- Dev.Pro: [Designing a POS System: 10 UX Tactics](https://dev.pro/insights/designing-a-pos-system-ten-user-experience-tactics-that-improve-usability/)
- technine.io: [Inventory management UI/UX design concept](https://technine.io/en/design-explorations/inventory-management)
- W3C WAI: [Understanding SC 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html) and [SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- Shopify Polaris: [design system](https://polaris.shopify.com/) (tokens summarised by [designsystems.one](https://www.designsystems.one/design-systems/polaris)) and [Empty state](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/empty-state)
- Andrew Coyle: [Form design best practices](https://www.andrewcoyle.com/blog/form-design-best-practices)
- UX Stack Exchange: [Colored circles to signify status](https://ux.stackexchange.com/questions/87378/colored-circles-to-signify-status-a-violation-of-accessibility-guidelines)
