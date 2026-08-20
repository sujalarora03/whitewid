# How FastLane Mechanic works

Owner: **Pablo the II Escobar** · Business: **FastLane Mechanic**

Everyone who opens the deployed app shares the **same Cloudflare D1 database**.
Sidebar should say **Cloud synced**. Hit **Refresh** if a teammate’s entry is missing.

This is a **separate shop** from White Widow (different Worker, D1, and browser storage).

---

## Craft
Pick a blueprint + quantity. The main output is **stash needed**.

| You do | What happens |
|---|---|
| Log business craft | Finished stock up; stash materials down |
| Not enough stash | Log is blocked until you restock under **Stock** |

Recipes live in `src/data/recipes.ts` (from in-game screenshots).

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
- Business name, commission %
- Stash needed per craft + making cost + sale price
- Material store costs (fill when you know them)
- Product sale prices
