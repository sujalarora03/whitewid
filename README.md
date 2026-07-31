# White Widow Manager

Small business manager for your GTA V RP shop (**White Widow**).

## Features

- **Craft calculator** — materials needed for batch crafts + restock shopping list
- **Sales log** — who sold what, price, profit, **15% commission**
- **Crew** — employees, weekly leaderboard, bonuses
- **Stock & prices** — materials, finished goods, editable store costs
- **Dashboard** — weekly revenue, profit, top performer, most sold
- **Discord** — channel webhook for sales, bonuses, weekly reports, restock lists

Data saves in your browser (`localStorage`).

## Free hosting (recommended): Cloudflare Workers

**Cost: $0** on Cloudflare’s free plan — enough for this app.

```bash
npm install
npx wrangler login          # once — opens browser to link your Cloudflare account
npm run deploy              # builds + deploys
```

You’ll get a URL like `https://white-widow-manager.<your-subdomain>.workers.dev`.

Open that link on phone or PC → paste your Discord webhook under **Prices** → use Discord from anywhere. No need to leave your computer on.

### Discord setup (same as before)

1. Discord channel ⚙ → **Integrations** → **Webhooks** → **New Webhook** → copy URL  
2. In the hosted app: **Prices** → paste URL → **Test webhook**

## Local development

```bash
npm install
npm run dev
```

Optional Node server (if you don’t use Cloudflare):

```bash
npm run build
npm start
```

## Note on data

Sales/stock still live in **each browser’s localStorage**. Hosting makes the app + Discord always available; it does not sync a shared database yet. Use one main browser/device for logging, or we can add free Cloudflare D1 sync later if you want shared crew data.
