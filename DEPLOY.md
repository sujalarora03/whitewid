# Deploy FastLane Mechanic (manual until D1 exists)

This Worker is **FastLane Mechanic only**. Do not point this config at
White Widow (`white-widow-manager` / `white-widow` D1).

## Before first remote deploy

```bash
npx wrangler login
npx wrangler d1 create fastlane-mechanic
```

Put the returned `database_id` into `wrangler.jsonc`, then:

```bash
npm run db:migrate:remote
npm run deploy
```

That creates `https://fastlane-mechanic.<account>.workers.dev`.

## Hard rules

1. **Never** run `wrangler deploy --temporary`.
2. **Never** reuse White Widow’s Worker name or D1 `database_id`.
3. Do not auto-deploy until the real D1 id is in `wrangler.jsonc`.
