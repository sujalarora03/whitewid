# How White Widow Manager works

Owner: **Pablo the II Escobar** · Business: **White Widow**

Everyone who opens the deployed app shares the **same Cloudflare D1 database**. Changes sync within about a second; the server **merges** sales/crafts by id so two people logging at once don’t wipe each other. **Deletes stay deleted** (tombstone ids) so a teammate’s older copy can’t bring a removed sale/craft back. Sidebar should say **Cloud synced** (not Offline). Hit **Refresh** if a teammate’s entry is missing.

---

## Dashboard (owner overview)
Each week you see:
- Revenue, profit, **total commissions**, bonuses
- **Top crafter** (units crafted) and **Top seller** (units sold + commission)
- Full crew table: crafted / what they crafted / sold / revenue / commission / payout
- Most sold items + Discord weekly post

Craft logs and sale logs stay **separate** — the overview joins them.

---

## Craft
Crafters log **production** (who made what). Separate from selling.

| You do | What happens |
|---|---|
| Log business craft | **Finished products** stock goes up; **materials** always go down |
| Personal craft + deduct ON | Materials go down; finished stock unchanged |
| Checkbox OFF | Finished stock still up; materials unchanged |

If mats are short with deduct ON, logging is blocked — restock under **Stock** or use **Request resources on Discord**.

---

## Personal
Craft for yourself (not shop stock). No sale / no commission.

---

## Sales
Sellers log what they sold. This is the normal path for commission.

| Calculated | Formula |
|---|---|
| Revenue | price × qty (or % × principal for Money Whitewash) |
| Cost | material/recipe cost × qty (or 2% for whitewash) |
| Profit | revenue − cost |
| Commission (default 15%) | **sale price (revenue)** × 15% |

**External services** (Money Whitewash, Joints PreMade, Weed Processing) appear under Sales → External. They do not change shop stock.

**Deal types on Sales:**
- **Family** — Grape Ape $600, Insecticide $220; no cost alert
- **Gang** — sell at making cost (no margin); no cost alert

**Cost Info** on Sales / Prices shows the baseline making + selling floors. A normal sale under the floor still saves, and posts to the **cost alert** Discord webhook (Prices → Discord).

Top crafter counts **business crafts only** (Personal tab crafts are excluded).

Someone who crafts **and** sells just uses Craft + Sales. No need to link who made a sold item.

---

## Stash — usually skip
**Verdict: optional / often unused.**

Only useful if you want a sale **held until Pablo clears it** before commission counts. Sellers do **not** pick a crafter here (they usually don’t know). Prefer **Sales** for normal sells.

---

## Orders (pending)
Customer wants something later. Assign crafter/seller for the queue, track status, fulfill when ready (can create a pending stash sale for the seller). Crafting still logged on **Craft**.

---

## Crew / Employee accounts

1. **Owner** unlocks with owner password (`sujal@3301`)
2. **Crew** → create accounts, set passwords, **promote / demote** grades:
   Recruit → Junior Seller → Senior Seller → Manager → CEO → Owner
3. Share: `https://your-app.workers.dev/?role=employee`

**Deletes:** employees can only delete **their own** sales, crafts, stash rows, orders, and material buys. Owner can delete anyone’s. Crew / bonuses stay owner-only.

| Name | Grade | Password |
|---|---|---|
| Sergio Rodriguez | CEO | Sergio |
| Aaron Shore | Junior Seller | Aaron |
| Lovish Raj | Junior Seller | Lovish |
| Pablo The II Escobar | Owner | sujal@3301 |
| andres rodriguez | Junior Seller | andres |
| BITTU DON | Junior Seller | BITTU |
| Love Ryohei | Junior Seller | Love |

Use **Load / reset crew roster** under Crew to apply this list to the shared DB.

---

## Stock
Business inventory + **material purchases** (separate from crafting).

| Action | Meaning |
|---|---|
| Business craft | **Finished** stock goes **up**; **materials** always go **down** |
| Sale (shop item) | **Finished** stock goes **down** by sale qty |
| Log material purchase | Raw mats stock goes up |
| Personal craft + deduct ON | Raw mats stock goes down |
| Edit material / product stock | Manual correction |
| Rebuild from logs (owner) | Recalculate mats + crafted from purchases / crafts / sales |
| Post inventory / `/inv` | Snapshot of raw mats + crafted to Discord |

Buyer can be **Pablo the II Escobar** (owner) or an employee.

---

## Prices
- Business name, **owner name**, commission % of **sale price** (not profit)
- Material store costs (feeds craft/sale costing)
- Product sale prices
- Discord webhook + auto-post toggles (sales, bonuses, crafts, stash)
- Reset all data to defaults

---

## Audit (owner only)
Sidebar **Audit** shows who created/deleted sales, crafts, stash clears, mat buys, stock edits, and roster changes. Searchable; last 400 events kept.

---

## Discord
Under **Prices** you can set Discord webhooks:
1. **Main channel** — sales, bonuses, crafts, stash, material buys, weekly report
2. **Alerts channel** — simple sale/craft alerts **with inventory left** after each action (falls back to main)
3. **Resources channel** — Craft restock lists (falls back to main)
4. **Cost alert channel** — under-floor sales

**Inventory:** business crafts add finished stock; sales deduct it. Pin the live link **`/inv`** in Discord (no bot key) — or **Stock → Post inventory** / **Copy live link**.

Top crafter counts **business crafts only** (personal crafts are excluded).

---

## Data / cloud
| Before | Now |
|---|---|
| Browser localStorage only | **Cloudflare D1** shared DB + local cache |
| Each device different | Same data for whole crew on the deployed URL |

**Fresh start (owner → Prices):** clears sales / crafts / purchases / stock / history but **keeps the same employees and ids**. Old rows stay tombstoned so sync cannot bring them back. Everyone should refresh after a fresh start.

Sidebar shows **Cloud synced** when the shared DB is up to date. Use **Refresh** to pull latest.
