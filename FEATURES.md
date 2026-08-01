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
When someone buys from the **shop stash** and you still need to settle it as owner.

1. Employee logs the stash buy → status **pending**
2. You open **Stash** and hit **Clear** (or Clear all)
3. Cleared history is kept for records

Dashboard warns you when clears are waiting. Can post pending/cleared to Discord.

---

## Crew
- Add / disable employees
- See this week’s sales, profit, commission, bonuses, **payout**
- Give bonuses (extra money on top of commission — not part of cost)

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
- Stash pending / cleared
- Weekly report
- Restock shopping lists

---

## Data / cloud
| Before | Now |
|---|---|
| Browser localStorage only | **Cloudflare D1** shared DB + local cache |
| Each device different | Same data for whole crew on the deployed URL |

Sidebar shows **Cloud synced** when the shared DB is up to date. Use **Refresh** to pull latest.
