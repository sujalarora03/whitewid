# White Widow — setup checklist

Owner: **Pablo the II Escobar**

Do these once. Shared data uses free **Cloudflare D1**.

---

## A. Deploy with shared database (recommended)

```bash
git clone https://github.com/sujalarora03/whitewid.git
cd whitewid
git checkout cursor/white-widow-manager-f14d
npm install

# Login (prints a URL if browser does not open)
npx wrangler login --browser=false

# Create the free D1 database (copy the database_id it prints)
npx wrangler d1 create white-widow
```

1. Open `wrangler.jsonc`
2. Replace `"database_id": "local-white-widow-db"` with the **real id** from the create command
3. Then:

```bash
npm run db:migrate:remote
npm run deploy
```

Bookmark the `*.workers.dev` URL — everyone on the crew uses this same link and same database.

**Stuck on login?** API token method:

1. https://dash.cloudflare.com/profile/api-tokens → Create → **Edit Cloudflare Workers**
2. PowerShell: `$env:CLOUDFLARE_API_TOKEN="your_token"`
3. Re-run create / migrate / deploy

---

## B. Discord

1. Channel ⚙ → Integrations → Webhooks → New Webhook → copy URL  
2. App → **Prices** → paste → **Test webhook**

---

## C. Local development

```bash
npm install
npm run db:migrate:local
npm run dev
```

Open http://localhost:5173  
Local D1 is separate from production until you deploy.

---

## D. Day-to-day

**Owner (Pablo):** unlock with owner password `sujal@3301` — clear stash, Crew grades, prices.

**Employees:** `?role=employee` → login with name + first-name password → log sales / stash / crafts / mats.

| Name | Grade | Password |
|---|---|---|
| Sergio Rodriguez | CEO | Sergio |
| Aaron Shore | Junior Seller | Aaron |
| Lovish Raj | Junior Seller | Lovish |
| Pablo The II Escobar | Owner | sujal@3301 |
| andres rodriguez | Junior Seller | andres |
| BITTU DON | Junior Seller | BITTU |
| Love Ryohei | Junior Seller | Love |

Grades (promote / demote in Crew): Recruit → Junior Seller → Senior Seller → Manager → CEO → Owner

1. **Crew** (owner) — roster is seeded; use Promote / Demote or the grade dropdown  
2. Employees use the web link themselves  
3. You clear pending stash sales when you settle 
