# UX Evaluation of the Redesign (v3.0.0) from the Users' Point of View

**Version evaluated:** the redesign, `v3.0.0` on branch `ui-redesign`. The submission version (`v2.1.0`) wasn't evaluated.

## 1. How this was done

1. **What real users say:** verified reviews of popular small-business inventory tools (Sortly on G2 and Capterra, with 957 Capterra reviews; inFlow on Software Advice), discussions in the r/InventoryManagement community, and studies of warehouse staff using inventory apps.
2. **Task walkthroughs as each role:** Staff, Manager and Admin did their real daily jobs in the running app (`localhost:5174`).
3. **Real tests, not opinions:** suspected problems were **reproduced in a scripted browser**:
   - a slow network, to see the loading states;
   - a double-click;
   - keyboard-only use;
   - each role's menu.
4. **Heuristic review** against Nielsen's 10 usability heuristics (NN/G), with severity rated 0–4 using Nielsen's scale.

Legend: ✅ works well · ⚠️ partly · ❌ missing · 🐞 **failing (a defect we reproduced)**

## 2. Who uses this platform

| Persona | Role | A typical day | What they care about |
|---|---|---|---|
| **Maria** (Staff) | Staff | Unpacks deliveries, records them, rings up orders, answers "do we have X?" | Speed, few clicks, not making mistakes, working from a phone or tablet in the stock room |
| **Morgan** (Manager) | Manager | Checks what's running low, decides what to reorder, manages suppliers | Seeing problems early, knowing **who supplies what**, trusting the numbers |
| **Alex** (Admin) | Admin | Creates accounts, changes roles, deactivates people who leave, checks the audit trail | Control, security, being able to see **who did what** |

## 3. What real inventory users ask for (research themes)

| # | Theme | What users say | Source |
|---|---|---|---|
| R1 | **Simplicity and speed** come first | Sortly's most praised points are "simplicity and ease of use" and a "clean, intuitive interface". A warehouse study found **processing time** was the only factor with a statistically significant effect on system effectiveness. | Capterra (Sortly); RSIS warehouse barcode study |
| R2 | **Low-stock alerts that reach you** | Users praise "notifications for low stock that go straight to phones and emails". | G2 (Sortly) |
| R3 | **Movement history:** who changed what and when | "Seeing the history of product movement so we can see what our team has been doing." Users complain when the audit trail is "pretty basic and limited to a name and date". | G2 (Sortly); Software Advice (inFlow) |
| R4 | **Correcting mistakes** | "Cannot make certain edits to transactions once they are complete". Changing quantities "leaves a lot of room for user error". | Capterra and G2 (Sortly) |
| R5 | **Stock counts and adjustments** | "Not being able to count inventory (cycle count)… and history of the count". "No physical inventory module". | Capterra (Sortly) |
| R6 | **Finding things fast** | "Ease of locating part in my inventory". "A little bit of slow doing searches". | Capterra and G2 (Sortly) |
| R7 | **Reports and exporting** | "Exporting to excel is nice". "Reporting capabilities are fairly basic". "Running reports is not easy". | G2 and Capterra (Sortly) |
| R8 | **Mobile and scanning** in the stock room | Barcode scanning gave 43% faster entry and 72% fewer input errors (SUS 82.5). "Mobile app is particularly useful". | JINTEKS 2025 study; Capterra (Sortly) |
| R9 | **Receiving connected to suppliers and orders** | "Hard to manage deliveries, picking & receiving". | G2 (Sortly) |
| R10 | Most failures are **discipline, not tools**. The tool must make the right action the easy one. | "Most companies don't have an inventory problem, they have a discipline problem." "Nobody logging withdrawals properly?" | r/InventoryManagement |

## 4. Walkthrough results (what each person actually experiences)

### Maria (Staff)
| Task | Steps in v3 | Result |
|---|---|---|
| Morning: "what's running low?" | Log in → dashboard → **Needs attention** is the first thing shown | ✅ Answers it at a glance, with stock bars |
| A delivery arrives | Dashboard **Receive** on the row → product already chosen → pick supplier → type quantity → **Record**. That's 3 clicks plus typing, with a "23 → 48" preview. | ✅ Fast, and the preview catches typos |
| Ring up a 2-product order | Type to search → Enter → quantity → Add product → search → quantity → **Place order** | ✅ Works with the keyboard alone (tested). The "Only N in stock" warning stops overselling. |
| Double-click "Record receipt" on slow Wi-Fi | — | 🐞 **The delivery is recorded twice**, so the stock is inflated (reproduced: 2 receipts from one double-click) |
| "Do we have the USB hub, and what does it cost?" | Products page → scroll and read; there's no search box | ⚠️ Fine with 10 products, painful with 500 (search is planned for Week 7) |
| "I typed 250 instead of 25" | No way to correct or reverse a receipt. Stock can't be edited. | ❌ The only workaround is an order that pretends to be a sale, which corrupts the sales data |
| After placing an order with the keyboard | Focus jumps to the top of the page | ⚠️ Keyboard and screen-reader users lose their place |
| Opens the products page on a slow connection | It says "**No products yet.** Create your first one" while it's still loading | 🐞 **A false empty state** (reproduced). It can push someone to create duplicate products. |
| Working from a phone in the stock room | The layout adapts and the drawer goes full screen, but the wide tables scroll sideways, and there's no camera scanning | ⚠️ Usable but not designed for one-handed stock-room work |

### Morgan (Manager)
| Task | Result |
|---|---|
| See what needs reordering | ✅ The KPI card, the Needs attention list and the "Needs reorder" filter all work well |
| "Who do I reorder this from, and how many?" | ❌ Products aren't linked to suppliers (only through past receipts), and there's no suggested reorder quantity |
| Add or deactivate a supplier | ✅ Drawer form with inline errors. Deactivation has **Undo**. |
| Get told when something goes low | ❌ Only visible if you open the app. No email or notification. |
| Weekly report to the owner | ❌ No reports and no CSV/Excel export |
| "Inventory approval" (req 2.2.5) | ❌ Not built, because the proposal doesn't define it |

### Alex (Admin)
| Task | Result |
|---|---|
| Create an account for a new hire | ❌ **No screen.** The API exists (Milestone 1), but the menu only shows Dashboard, Products, Orders, Inventory and Suppliers (checked). |
| Change a role, or deactivate someone who left | ❌ No screen (API only) |
| Change own password, view profile | ❌ No screen (API only; FE-09 pending) |
| "Who changed this stock number?" | ❌ `audit_logs` is filled with failed logins and access denials, but nothing shows it, and stock movements aren't shown per product |

## 5. What's missing and what's failing, compared with what users need

| User need | Evidence | v3 today | Severity (0–4) | Recommended fix | Where it fits |
|---|---|---|---|---|---|
| **No duplicate records from double-clicks** | R4, heuristic #5 | 🐞 Receipts, products and suppliers can be created twice | **4: fix before any demo** | Disable the submit button while saving (as Orders already does) | Now, about 30 minutes |
| **Truthful loading states** | Heuristic #1 | 🐞 "No products yet" shows while loading (Products, Suppliers, Inventory) | **3** | Show a loading skeleton; only show the empty state after loading finishes | Now, about 1 hour |
| Focus after an action | WCAG 2.4.3 | ⚠️ Focus is lost after placing an order or closing a drawer on save | 2 | Move focus to the toast or the next logical field | Week 9 (accessibility) |
| **Admin screens: users, roles, deactivation** | Admin persona; FE-06/14/15 | ❌ API only | **4: an entire role has nothing to do in the UI** | Users page (table + drawer), reusing the existing pieces | Milestone 1 frontend debt |
| **Profile and change password** | FE-09 | ❌ API only | 3 | Profile page | Milestone 1 frontend debt |
| **Correcting mistakes:** reverse a receipt, cancel an order | R4; heuristic #3 | ❌ Neither exists | **3** | A "reverse receipt" or "void order" that records a counter-movement (keeps the history honest) | Needs an API change; propose it as a new requirement |
| **Movement history per product** | R3; heuristic #6 | ❌ Data exists (receipts and order items) but isn't shown together | 3 | A product detail drawer with a "History" timeline | Small API addition |
| **Search on products and orders** | R6; mockup 7 | ⚠️ Not yet | 3 | Already planned: **Week 7** (2.6.1–2.6.4) | Week 7 |
| **Stock count / adjustment with a reason** | R5 | ❌ | 2 | An "Adjust stock" action with a required reason, written to the audit log | Future (new requirement) |
| **Who supplies what + suggested reorder** | R9; Manager persona | ❌ | 2 | Show the last supplier from receipt history, and suggest "reorder to 3× reorder level" | Future |
| **Alerts outside the app** | R2 | ❌ | 2 | A daily low-stock email (needs a mailer, which is also needed for password reset 2.1.5) | Future |
| **Reports and export** | R7 | ❌ | 2 | CSV export of the stock, orders and receipts tables | Future, easy win |
| **Audit log viewer** | R3; Admin persona | ❌ | 2 | Admin-only page listing `audit_logs` | Future (Week 8 security fits) |
| **Readable dates** | Heuristic #2 | ⚠️ `2026-10-20` | 1 | "Oct 20, 2026" | Now, 15 minutes |
| **Phone use in the stock room** | R8 | ⚠️ Responsive, but tables scroll sideways | 2 | Card rows on phones for stock and orders | Week 11 polish |
| **Barcode / camera scanning** | R8 (43% faster, 72% fewer errors) | ❌ | 1 for this project | Out of scope in the proposal; mention it as future work | Out of scope |
| Customers on orders, units of measure, categories | Domain | ❌ Not in the ERD | 1 | Out of scope (the proposal and ERD don't include them) | Out of scope |

## 6. What already works (confirmed against user expectations)

- **Simplicity (R1):** the core jobs take 3–6 actions. One primary button per screen. No unnecessary features.
- **Low stock is impossible to miss (R2, in-app):** the red KPI card, "Needs attention" first, stock bars, and Critical and Low badges with icons.
- **Error prevention while typing (R4):** the "Only 23 in stock" warning, the "23 → 48" preview, and errors next to each field.
- **Recovering from a risky action (R4):** Undo on supplier deactivation.
- **Finding a product while working (R6):** the type-to-search picker in the receive and order forms, showing stock and price.
- **Accessibility:** 0 axe-core WCAG 2.1 AA violations. Keyboard-only ordering works (tested).

## 7. Nielsen's 10 heuristics: scorecard

| # | Heuristic | Score | Main reason |
|---|---|---|---|
| 1 | Visibility of system status | ⚠️ | Toasts and previews are good. **The false empty state while loading** isn't. |
| 2 | Match with the real world | ⚠️ | Clear wording. ISO dates. No "who supplies this". |
| 3 | User control and freedom | ⚠️ | Undo for suppliers, Escape closes drawers. **No way to reverse a receipt or cancel an order.** |
| 4 | Consistency and standards | ✅ | The same page template, drawer and toast everywhere |
| 5 | Error prevention | ⚠️ | Live stock warnings. **But double-submit creates duplicates.** |
| 6 | Recognition rather than recall | ✅ | The picker shows stock and price, badges have text and icons |
| 7 | Flexibility and efficiency | ⚠️ | Keyboard works and there are quick actions. No search yet (Week 7). |
| 8 | Aesthetic and minimalist design | ✅ | Badges only for problems, no decoration |
| 9 | Recognize and recover from errors | ✅ | Specific errors next to the field, focus on the first error |
| 10 | Help and documentation | ⚠️ | Field hints and empty states, but no first-time guidance per role |

## 8. Recommended order of work

1. **Fix the two defects now (1–2 hours):**
   - disable submit buttons while saving;
   - a loading state instead of the false "No products yet".
   - Also: readable dates.
2. **Give the Admin role its screens (about 1 day):** a Users page and a Profile/password page. The API is already done; this closes FE-06, 09, 14 and 15.
3. **Week 7 as planned:** search, sort and pagination.
4. **Propose two small new requirements:**
   - product movement history;
   - reversing a receipt / voiding an order through a counter-movement.

   These are the two things real users most often say they miss.
5. **Later, or as "future work" in the final report:** low-stock email, CSV export, stock count with a reason, supplier-per-product with suggested reorder, phone card layouts, barcode scanning.

## 9. Sources

- Nielsen Norman Group: [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/), and [10 Usability Heuristics Applied to Complex Applications](https://www.nngroup.com/articles/usability-heuristics-complex-applications/)
- G2: [Sortly reviews](https://www.g2.com/products/sortly/reviews)
- Capterra: [Sortly verified reviews](https://www.capterra.com/p/169199/Sortly-Pro/reviews/) (957 reviews)
- Software Advice: [inFlow Inventory reviews](https://www.softwareadvice.com/scm/inflow-inventory-profile/reviews/)
- r/InventoryManagement: ["Where do small teams usually fail first…"](https://www.reddit.com/r/InventoryManagement/comments/1rn6wlz/where_do_small_teams_usually_fail_first_in/) and ["Most companies don't have an inventory problem"](https://www.reddit.com/r/InventoryManagement/comments/1s1lcqi/most_companies_dontt_have_an_inventory_problem/)
- Sahetapy & Suhirman (2025): [Mobile Application Development for Inventory Management Using Barcode Technology](https://www.researchgate.net/publication/399137277_MOBILE_APPLICATION_DEVELOPMENT_FOR_INVENTORY_MANAGEMENT_USING_BARCODE_TECHNOLOGY), JINTEKS 7(4)
- RSIS International: [Leveraging WMS Barcode Technology for Enhanced Inventory Performance](https://rsisinternational.org/journals/ijriss/articles/leveraging-wms-barcode-technology-for-enhanced-inventory-performance-and-cost-efficiency/)
- W3C: [WCAG 2.1 SC 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)

**The scripted tests behind sections 4–5:**
- Products page on a 1.5 s-latency network → it showed "No products yet…" while loading.
- Double-click on "Record receipt" at 1.2 s latency → it created 2 receipts.
- A keyboard-only order → it succeeded, and focus ended on `<body>`.
- The Admin menu → Dashboard, Products, Orders, Inventory, Suppliers and Sign Out only.
