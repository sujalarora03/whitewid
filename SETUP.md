# White Widow — setup checklist

Do these once. Takes ~10 minutes.

---

## A. Run the app (pick one)

### Option 1 — Free online (best)

On **your computer** (needs a free [Cloudflare](https://dash.cloudflare.com/sign-up) account):

```bash
git clone https://github.com/sujalarora03/whitewid.git
cd whitewid
git checkout cursor/white-widow-manager-f14d
npm install
npx wrangler login --browser=false
npm run deploy
```

**If no browser opens:** `--browser=false` prints a URL in the terminal — copy it and open it yourself, then click **Allow**.

**Still stuck?** Skip OAuth and use an API token instead:

1. Open https://dash.cloudflare.com/profile/api-tokens  
2. **Create Token** → use template **Edit Cloudflare Workers** → Create  
3. Copy the token, then in your terminal:

```bash
# Windows (PowerShell)
$env:CLOUDFLARE_API_TOKEN="paste_token_here"
npm run deploy

# Mac / Linux
export CLOUDFLARE_API_TOKEN="paste_token_here"
npm run deploy
```

Copy the `*.workers.dev` URL Wrangler prints after deploy. That’s your app — bookmark it.

### Option 2 — Local only

```bash
npm install
npm run dev
```

Open http://localhost:5173  
(Discord works while this terminal is open.)

---

## B. Connect Discord

1. Open Discord → your server → the text channel for sales (e.g. `#white-widow`)
2. Channel **⚙** → **Integrations** → **Webhooks** → **New Webhook**
3. Name it `White Widow`, choose that channel → **Copy Webhook URL**
4. In the app → **Prices** tab → **Discord channel**
5. Paste the URL → **Test webhook**
6. Leave **Auto-post sales** and **Auto-post bonuses** on

You should see a “connected” message in Discord.

---

## C. First-day use

1. **Crew** — add employees (Sergio is already there)
2. **Prices** — set **sale prices** for crafted seeds if you know them
3. **Stock** — enter material amounts after you buy from the store
4. **Sales** — each sale: employee → product → qty → price → **Save sale**
5. **Dashboard** — end of week → **Post week to Discord**

---

## D. Who logs sales?

Anyone with the app URL can open **Sales** and log.  
Data is stored in **that browser** — use one main phone/PC for logging so numbers stay in one place.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Test webhook fails | App must be running (`npm run dev` / deployed). URL must start with `https://discord.com/api/webhooks/` |
| Wrong channel | Edit the webhook in Discord and change its channel, or make a new webhook |
| Lost data | Same browser/device; clearing site data wipes localStorage |
| Deploy login | Run `npx wrangler login` again in the same folder |
