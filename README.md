# full-stack-template

## Setup after cloning

Find+replace two placeholder tokens across the repo:

| Token          | Meaning                                  | Example         |
| -------------- | ---------------------------------------- | --------------- |
| `APP_TMP_ID`   | slug-safe id (npm/worker name, domain)   | `chore-tracker` |
| `APP_TMP_NAME` | friendly display name (PWA, page title)  | `Chore Tracker` |

Do **not** replace `APP_NAME_KV` — it's the Cloudflare KV binding identifier and must
stay as written.

Then fill in the real KV namespace IDs in `wrangler.jsonc` (`id` / `preview_id`).