# White Widow — setup checklist

Owner: **Pablo the II Escobar**

Shared data uses free **Cloudflare D1**. One account → one stable URL forever.

---

## A. Make the URL permanent (do this once)

Preview deploys get random subdomains and expire unless claimed.

1. Open the **claim** link for the current preview account (agent will paste it; also in the PR).
2. Sign in / create a Cloudflare account and **claim** it.
3. Bookmark this forever:

**https://white-widow-manager.incandescent-impatiens.workers.dev**

Employee link:

**https://white-widow-manager.incandescent-impatiens.workers.dev/?role=employee**

After claim, `npm run deploy` (or GitHub Actions) **updates that same URL** — it does not create a new one.

### Future deploys from your PC

```bash
git clone https://github.com/sujalarora03/whitewid.git
cd whitewid
npm install
npx wrangler login --browser=false   # open the printed URL, approve
npm run deploy                       # same URL every time
```

### Auto-deploy from GitHub

1. Cloudflare dashboard → **Manage account → Account API tokens → Create** → template **Edit Cloudflare Workers**
2. Repo → **Settings → Secrets and variables → Actions** → add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` (from `npx wrangler whoami` or the dashboard URL)
3. Push to `main` or `cursor/white-widow-manager-f14d` → workflow **Deploy White Widow** updates the same Worker

Do **not** use `wrangler deploy --temporary` after you have a claimed/permanent account — that is what was minting new URLs.

---

## B. First-time DB on a brand-new account (only if starting fresh)

```bash
npx wrangler login --browser=false
npx wrangler d1 create white-widow
# paste the printed database_id into wrangler.jsonc → d1_databases[0].database_id
npm run db:migrate:remote
npm run deploy
```

Then open the app once as Owner → **Crew → Load / reset crew roster**.

---

## C. Discord

1. Channel ⚙ → Integrations → Webhooks → New Webhook → copy URL  
2. App → **Prices** → paste → **Test webhook**

---

## D. Local development

```bash
npm install
npm run db:migrate:local
npm run dev
```

Open http://localhost:5173  
Local D1 is separate from production until you deploy.

---

## E. Day-to-day

**Owner (Pablo):** unlock with `sujal@3301` — clear stash, Crew grades, prices, Personal tab.

**Employees:** `?role=employee` → first-name password → log sales / stash / crafts / personal / mats.

| Name | Grade | Password |
|---|---|---|
| Sergio Rodriguez | CEO | Sergio |
| Aaron Shore | Junior Seller | Aaron |
| Lovish Raj | Junior Seller | Lovish |
| Pablo The II Escobar | Owner | sujal@3301 |
| andres rodriguez | Junior Seller | andres |
| BITTU DON | Junior Seller | BITTU |
| Love Ryohei | Junior Seller | Love |

Grades: Recruit → Junior Seller → Senior Seller → Manager → CEO → Owner

**“Offline (local only)”** = browser could not reach `/api/state` (wrong/expired URL, or local Vite without the Worker). Use the bookmarked workers.dev link and hit **Refresh**.
