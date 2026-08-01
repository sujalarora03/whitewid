# White Widow — setup checklist

Owner: **Pablo the II Escobar**

Shared data uses free **Cloudflare D1**. **One permanent URL** — see **[DEPLOY.md](./DEPLOY.md)**.

---

## A. Production URL (already chosen)

**https://white-widow-manager.incandescent-impatiens.workers.dev**

Employee: **https://white-widow-manager.incandescent-impatiens.workers.dev/?role=employee**

Claim this Cloudflare preview account if you have not already (then ignore all older `*.workers.dev` links).

**Agents / CI must never create a new temporary deploy or new workers.dev link.**

### Deploy updates (same URL)

```bash
git clone https://github.com/sujalarora03/whitewid.git
cd whitewid
npm install
npx wrangler login   # use the Cloudflare account that owns Incandescent Impatiens
npm run deploy       # updates the same URL only
```

### Auto-deploy from GitHub

1. Cloudflare dashboard → API tokens → **Edit Cloudflare Workers**
2. Repo → **Settings → Secrets** → `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
3. Push → workflow **Deploy White Widow** updates the same Worker

Forbidden: `wrangler deploy --temporary`, new D1 databases, renaming the Worker.

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
2. App → **Prices** → paste into **Main channel** → **Test main**  
3. (Optional) Repeat for a second channel used for material restock requests → paste into **Resources channel** → **Test resources**  
   Craft → **Request resources on Discord** posts there.

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
