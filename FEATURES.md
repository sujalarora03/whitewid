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
| Log business craft | **Finished products** stock goes up (see Stock tab) |
| “Deduct from business material stock” ON | **Shared materials** stock goes down (floors at 0) |
| Checkbox OFF | Finished stock still up; materials unchanged |

You can craft even if mats are short. Restock materials under **Stock**.

---

## Personal
Craft for yourself (not shop stock). No sale / no commission.

---

## Sales
Sellers log what they sold. This is the normal path for commission.

| Calculated | Formula |
|---|---|
| Revenue | price × qty |
| Cost | material/recipe cost × qty |
| Profit | revenue − cost |
| Commission (default 15%) | profit × 15% |

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
| Log material purchase | Who bought mats from the store for the business; stock goes up |
| Edit material / product stock | Manual correction |
| Finished products | Seeds, cigarettes, supplies available to sell/craft |

Buyer can be **Pablo the II Escobar** (owner) or an employee.

---

## Prices
- Business name, **owner name**, commission %
- Material store costs (feeds craft/sale costing)
- Product sale prices
- Discord webhook + auto-post toggles (sales, bonuses, crafts, stash)
- Reset all data to defaults

---

## Discord
Under **Prices** you can set **two** Discord webhooks:
1. **Main channel** — sales, bonuses, crafts, stash, material buys, weekly report
2. **Resources channel** — Craft “Request resources” restock lists (falls back to main if empty)

Paste each channel’s webhook URL and use **Test main** / **Test resources**.

---

## Data / cloud
| Before | Now |
|---|---|
| Browser localStorage only | **Cloudflare D1** shared DB + local cache |
| Each device different | Same data for whole crew on the deployed URL |

Sidebar shows **Cloud synced** when the shared DB is up to date. Use **Refresh** to pull latest.
