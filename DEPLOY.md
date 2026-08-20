# Deploys Shop Manager (manual until D1 exists)

This is a **separate** Worker from White Widow. Do not point this config at
`white-widow-manager` or the `white-widow` D1 database.

## Before first remote deploy

```bash
npx wrangler login
npx wrangler d1 create second-shop
```

Put the returned `database_id` into `wrangler.jsonc`, then:

```bash
npm run db:migrate:remote
npm run deploy
```

That creates `https://second-shop-manager.<account>.workers.dev` — a new URL,
not the White Widow one.

## Hard rules

1. **Never** run `wrangler deploy --temporary`.
2. **Never** reuse White Widow’s Worker name or D1 `database_id`.
3. Do not auto-deploy to `main` until the real D1 id is in `wrangler.jsonc`.
