# White Widow Manager

Business manager for **White Widow** (GTA V RP) — owner **Pablo the II Escobar**.

## Live (stable after claim)

**https://white-widow-manager.incandescent-impatiens.workers.dev**

Employee: **https://white-widow-manager.incandescent-impatiens.workers.dev/?role=employee**

**Claim once** (locks this URL forever — do not skip):  
https://dash.cloudflare.com/claim-preview?claimToken=EDOb1WPE5CXjsZ0c_m5w7C_txxbwlzc3XwkDVRqMXNI  

After claim, every `npm run deploy` / GitHub Action updates **that same link**.

## Features

See **[FEATURES.md](./FEATURES.md)** (Craft, Personal, Sales, Stash, Crew, Stock, Prices, Discord).

Setup details: **[SETUP.md](./SETUP.md)**

## Deploy (same URL)

```bash
npm install
npx wrangler login --browser=false
npm run deploy
```

## Local

```bash
npm install
npm run db:migrate:local
npm run dev
```
