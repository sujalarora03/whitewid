# White Widow Manager

Business manager for **White Widow** (GTA V RP) — owner **Pablo the II Escobar**.

## Features

See **[FEATURES.md](./FEATURES.md)** for what each tab does (Craft, Sales, Stash, Crew, Stock, Prices, Discord).

Shared data: **Cloudflare D1** (free). Deploy once; whole crew uses the same URL/database.

## Deploy

```bash
npm install
npx wrangler login --browser=false
npx wrangler d1 create white-widow
# put the printed database_id into wrangler.jsonc
npm run db:migrate:remote
npm run deploy
```

Details: **[SETUP.md](./SETUP.md)**

## Local

```bash
npm install
npm run db:migrate:local
npm run dev
```
