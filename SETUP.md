# FastLane Mechanic — setup

Owner: **Pablo the II Escobar**

## Local

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Remote

1. `npx wrangler login`
2. `npx wrangler d1 create fastlane-mechanic` — paste `database_id` into `wrangler.jsonc`
3. `npm run db:migrate:remote`
4. `npm run deploy`

Do **not** use the White Widow Worker name or D1 id.

## Accounts

**Owner:** unlock with `sujal@3301`

Create crew under **Crew**. Share `?role=employee` for the employee desk.

## Adding crafts

Paste the next FastLane blueprint screenshot. Recipes go in `src/data/recipes.ts`.
