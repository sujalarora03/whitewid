# How this shop manager works

Owner: **Pablo the II Escobar** · Default name: **New Shop** (rename under Rate card)

Everyone who opens the deployed app shares the **same Cloudflare D1 database**.
Sidebar should say **Cloud synced**. Hit **Refresh** if a teammate’s entry is missing.

This copy is a **second business**. White Widow stays on its own Worker / D1.

---

## Craft
Crafters log **production**. Pick item + qty — output is **stash needed**.

| You do | What happens |
|---|---|
| Log business craft | Finished stock up; stash materials down |
| Not enough stash | Log is blocked until you restock under **Stock** |

Recipes are added from in-game screenshots into `src/data/recipes.ts`.

---

## Sales
Sellers log what they sold. Commission is **sale price × commission %** (default 15%).

---

## Crew / Employees

1. Owner unlocks with owner password (`sujal@3301`)
2. **Crew** → create accounts, set passwords, promote / demote grades
3. Share: `https://your-app.workers.dev/?role=employee`

---

## Rate card
- Business name, owner name, commission %
- Stash needed per craft + making cost + sale price
- Material store costs
- Product sale prices
- Discord webhooks (optional)

---

## Stock
Business inventory + material purchases (separate from crafting).
