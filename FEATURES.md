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

## Personal
When someone wants to **craft for themselves** (not for the shop).

| You do | What happens |
|---|---|
| Pick recipe + qty | See full material list + reference cost |
| Log personal craft | Logged under that person; **no** finished stock added to business |
| “Took materials from business stock” ON | Shared mats drop |
| Checkbox OFF (default) | Own mats / bought yourself |

Does **not** create a sale or commission. Business Craft tab stays for shop production.

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
When something leaves the **shop stash**. Crew often splits roles: crafters, sellers, or both.

| Field | Meaning |
|---|---|
| **Seller** | Who sold it — gets commission when you clear |
| **Crafter** | Who made it — can be a different person; craft log credits them |
| Log craft + sale | Optional — records the craft under the crafter |
| Owner **Clear** | Confirms the sale (profit + seller commission) |

Use **Sales** for simple sells with no crafter split / no owner clear.

---

## Orders (pending)
Customer wants something later — queue it before it’s crafted/sold.

| Step | What happens |
|---|---|
| Add order | Customer + item + qty + optional crafter/seller |
| Status | Open → Crafting → Ready → Fulfilled / Cancelled |
| **Fulfill → stash** | Creates a stash sale (crafter + seller marked); owner still clears stash for commission |

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
