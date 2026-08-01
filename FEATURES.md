# How White Widow Manager works

Owner: **Pablo the II Escobar** · Business: **White Widow**

Everyone who opens the deployed app shares the **same Cloudflare D1 database**. Changes sync to the cloud within about a second.

---

## Dashboard
Weekly overview for you as owner:
- Revenue, profit, commissions, bonuses
- Crafts this week
- Pending stash buys waiting for your clear
- Top employee + most sold items
- Button to post the weekly report to Discord

---

## Craft
Log **production** (who made what) — even if nothing was sold yet.

| You do | What happens |
|---|---|
| Pick who crafted + recipe + qty → Log craft | Finished product stock goes up |
| “Deduct from business material stock” ON | Shared materials drop (business stock) |
| Checkbox OFF | Craft is logged only; stock not touched |

**Does not mean** the crafter bought the materials. Material buys are under **Stock**.

Also shows recipe costs and a restock list if business stock is short.

---

## Sales
Normal shop sales (employee sold an item for a price).

| Calculated | Formula |
|---|---|
| Revenue | price × qty |
| Cost | material/recipe cost × qty |
| Profit | revenue − cost |
| Commission (default 15%) | profit × 15% |
| You keep | profit − commission |

Optional Discord post when a sale is saved.

---

## Stash
When a customer buys from the **shop stash**.

This is a **pending sale** until you (Pablo) clear it.

| Step | What happens |
|---|---|
| Log stash purchase | Pending sale created (stock or craft handled) |
| Optional: “Crafted then sold” | Also logs the craft for that employee in the same step |
| You hit **Clear → confirm sale** | Real sale is created → profit + 15% commission count on Dashboard / Crew |

So stash purchase = sold (and optionally crafted) → waits for owner clear → then counts as a confirmed sale.

Use normal **Sales** tab only for sells that don’t need owner clear.

---

## Crew / Employee web link

Same deployed URL for everyone.

1. Open the app → switch to **Employee** (top of sidebar)
2. Or share: `https://your-app.workers.dev/?role=employee`
3. On **My desk**, pick your name
4. Log **Sales**, **Stash**, **Craft**, **Stock** (mat buys)

Employees cannot clear stash, edit prices, manage crew, or change stock numbers manually — that’s owner-only.

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
Paste a channel webhook under Prices. The app can post:
- Sales
- Bonuses
- Crafts
- Stash pending / cleared (**includes flow, profit, commission**)
- Material purchases (who bought mats for the business)
- Weekly report
- Restock shopping lists

---

## Data / cloud
| Before | Now |
|---|---|
| Browser localStorage only | **Cloudflare D1** shared DB + local cache |
| Each device different | Same data for whole crew on the deployed URL |

Sidebar shows **Cloud synced** when the shared DB is up to date. Use **Refresh** to pull latest.
