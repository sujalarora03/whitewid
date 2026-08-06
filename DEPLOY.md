# Deploy policy — ONE stable URL

**Canonical live app (do not replace):**  
https://white-widow-manager.incandescent-impatiens.workers.dev

Employee:  
https://white-widow-manager.incandescent-impatiens.workers.dev/?role=employee

Cloudflare account / D1 for this Worker is already bound in `wrangler.jsonc`  
(`database_name`: `white-widow`, `database_id`: `9a65ccb3-e21b-4591-b9b5-4c385d4ff308`).

## Hard rules (agents + humans)

1. **Never** run `wrangler deploy --temporary`.
2. **Never** create a new temporary Cloudflare preview account for this project.
3. **Never** invent a new `*.workers.dev` URL or change the Worker `name` in `wrangler.jsonc` (`white-widow-manager`).
4. **Never** create a new D1 database or change `database_id` unless the user explicitly asks to migrate.
5. All production updates must target the **same** claimed account / URL above via:
   - `npx wrangler login` (user’s claimed account) then `npm run deploy`, or
   - GitHub Actions with secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for that account.

If deploy auth fails, **stop and ask the user to run `wrangler login` / refresh the API token**. Do not mint a new preview link as a workaround.
