# Shop Manager (second business)

Boilerplate for a **new** GTA V RP shop — Craft, Sales, Employees, Rate card.

Rename the business under **Rate card**. Owner stays **Pablo the II Escobar**.

This is **not** White Widow. Recipes start empty. Paste screenshots of each
craftable item (one by one) and the catalog in `src/data/recipes.ts` is filled
in. Craft then shows **stash needed** for any quantity.

## Local

```bash
npm install
npm run db:migrate:local
npm run dev
```

Employee desk: add `?role=employee` to the local URL.

Owner PIN: `sujal@3301`

## Craft / stash

Pick a recipe + quantity. The main output is how much stash (materials) that
batch needs, compared with current stock.

## Rate card

Per-craft stash list, making cost, and sale prices. Fill sale prices as you
know them.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** — uses Worker `second-shop-manager` and D1
`second-shop`. Do not deploy over White Widow.
