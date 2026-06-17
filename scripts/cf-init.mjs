#!/usr/bin/env node
// Creates the prod + preview KV namespaces in Cloudflare and writes their IDs
// into wrangler.jsonc, replacing the <prod-namespace-id>/<preview-namespace-id>
// placeholders. Safe to leave in package.json — it refuses to run again once the
// placeholders are gone, so it won't create duplicate namespaces.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BINDING = 'APP_NAME_KV'
const PROD_PLACEHOLDER = '<prod-namespace-id>'
const PREVIEW_PLACEHOLDER = '<preview-namespace-id>'
const ID_RE = /[0-9a-f]{32}/i

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wranglerPath = join(root, 'wrangler.jsonc')

let config = readFileSync(wranglerPath, 'utf8')

if (!config.includes(PROD_PLACEHOLDER)) {
  console.log(
    'wrangler.jsonc already has a KV namespace id — skipping to avoid creating duplicate namespaces.',
  )
  process.exit(0)
}

function createNamespace(preview) {
  const cmd = `npx wrangler kv namespace create ${BINDING}${preview ? ' --preview' : ''}`
  console.log(`\n$ ${cmd}`)
  const out = execSync(cmd, { encoding: 'utf8' })
  process.stdout.write(out)
  const match = out.match(ID_RE)
  if (!match) {
    throw new Error(`Could not parse namespace id from wrangler output:\n${out}`)
  }
  return match[0]
}

const prodId = createNamespace(false)
const previewId = createNamespace(true)

config = config
  .replace(PROD_PLACEHOLDER, prodId)
  .replace(PREVIEW_PLACEHOLDER, previewId)

writeFileSync(wranglerPath, config)

console.log(
  `\nUpdated wrangler.jsonc:\n  id         = ${prodId}\n  preview_id = ${previewId}\n\nYou can now run: npm run deploy`,
)
