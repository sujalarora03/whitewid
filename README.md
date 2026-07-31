# White Widow Manager

Small business manager for your GTA V RP shop (**White Widow**).

## Features

- **Craft calculator** — materials needed for batch crafts (Headband / Grape Ape / Exodus seeds, Insecticide) + restock shopping list
- **Sales log** — who sold what, price, profit, **15% commission**
- **Crew** — employees, weekly leaderboard, bonuses
- **Stock & prices** — materials, finished goods, editable store costs
- **Dashboard** — weekly revenue, profit, top performer, most sold
- **Discord** — attach a text channel via webhook; auto-post sales/bonuses, post weekly reports & restock lists

Data saves in your browser (`localStorage`).

## Discord setup

1. In Discord: channel ⚙ → **Integrations** → **Webhooks** → **New Webhook**
2. Copy the webhook URL
3. In the app: **Prices** → **Discord channel** → paste URL → **Test webhook**
4. Toggle auto-post for sales / bonuses as you like

Use **Post week to Discord** on the dashboard (or in Prices) to share the weekly report with the crew.

## Run locally

```bash
npm install
npm run dev
```

Production (includes Discord proxy so webhooks work without CORS issues):

```bash
npm run build
npm start
```

Open http://localhost:4173
