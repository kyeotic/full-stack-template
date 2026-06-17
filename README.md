# full-stack-template

## Setup after cloning

Find+replace two placeholder tokens across the repo:

| Token          | Meaning                                  | Example         |
| -------------- | ---------------------------------------- | --------------- |
| `APP_TMP_ID`   | slug-safe id (npm/worker name, domain)   | `chore-tracker` |
| `APP_TMP_NAME` | friendly display name (PWA, page title)  | `Chore Tracker` |

Do **not** replace `APP_NAME_KV` — it's the Cloudflare KV binding identifier and must
stay as written.

## KV namespaces

Create the Cloudflare KV namespaces and wire their IDs into `wrangler.jsonc`:

```bash
npm run cf:init
```

This creates the prod + preview namespaces (`wrangler kv namespace create APP_NAME_KV`,
once with `--preview`) and replaces the `<prod-namespace-id>` / `<preview-namespace-id>`
placeholders with the real IDs. Requires wrangler to be authenticated (`wrangler login`).

It's safe to leave in place: once real IDs are present it skips creating new namespaces,
so it won't make duplicates if run again. To re-bootstrap (e.g. a new account), restore
the placeholders in `wrangler.jsonc` first.

Then deploy:

```bash
npm run deploy        # build + deploy worker (needs KV IDs in place first)
npm run deploy:infra  # terraform: DNS + workers domain (run after first worker deploy)
```