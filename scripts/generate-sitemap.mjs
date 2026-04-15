#!/usr/bin/env node
// Generates public/sitemap.xml at build time by fetching all detail-page
// entities from the production API and combining them with the static
// route list. Run by `pnpm build` before vite bundles the app.

import { writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SITE_URL = (
  process.env.SITE_URL || "https://vagrant-story.criticalbit.gg"
).replace(/\/+$/, "")

const API_URL = (
  process.env.SITEMAP_API_URL || "https://vagrant-story-api.criticalbit.gg"
).replace(/\/+$/, "")

const __filename = fileURLToPath(import.meta.url)
const OUT_PATH = resolve(__filename, "../../public/sitemap.xml")

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  // Tools
  { path: "/inventory", priority: "0.9", changefreq: "monthly" },
  { path: "/forge", priority: "0.9", changefreq: "monthly" },
  { path: "/crafting", priority: "0.9", changefreq: "monthly" },
  { path: "/material-grid", priority: "0.8", changefreq: "monthly" },
  { path: "/materials", priority: "0.8", changefreq: "monthly" },
  // Equipment lists
  { path: "/blades", priority: "0.8", changefreq: "monthly" },
  { path: "/grips", priority: "0.8", changefreq: "monthly" },
  { path: "/armor", priority: "0.8", changefreq: "monthly" },
  { path: "/accessories", priority: "0.8", changefreq: "monthly" },
  { path: "/gems", priority: "0.8", changefreq: "monthly" },
  { path: "/consumables", priority: "0.8", changefreq: "monthly" },
  // Combat lists
  { path: "/break-arts", priority: "0.8", changefreq: "monthly" },
  { path: "/battle-abilities", priority: "0.8", changefreq: "monthly" },
  { path: "/spells", priority: "0.8", changefreq: "monthly" },
  { path: "/grimoires", priority: "0.8", changefreq: "monthly" },
  // World lists
  { path: "/bestiary", priority: "0.8", changefreq: "monthly" },
  { path: "/areas", priority: "0.8", changefreq: "monthly" },
  { path: "/workshops", priority: "0.8", changefreq: "monthly" },
  { path: "/chests", priority: "0.8", changefreq: "monthly" },
  { path: "/characters", priority: "0.8", changefreq: "monthly" },
  // Progression lists
  { path: "/keys", priority: "0.8", changefreq: "monthly" },
  { path: "/sigils", priority: "0.8", changefreq: "monthly" },
  { path: "/titles", priority: "0.8", changefreq: "monthly" },
  { path: "/rankings", priority: "0.8", changefreq: "monthly" },
]

async function fetchList(path) {
  const url = `${API_URL}/v1${path}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error(`GET ${url} → expected array, got ${typeof data}`)
  }
  return data
}

// Limits match src/lib/game-api.ts exactly — those values are validated
// against whatever per-endpoint cap the API enforces, so matching them
// guarantees the sitemap covers every entity the app itself can surface.
const ENTITY_ENDPOINTS = [
  { prefix: "/blades", api: "/blades?limit=200" },
  { prefix: "/grips", api: "/grips?limit=200" },
  { prefix: "/gems", api: "/gems?limit=200" },
  { prefix: "/consumables", api: "/consumables?limit=200" },
  { prefix: "/break-arts", api: "/break-arts?limit=200" },
  { prefix: "/battle-abilities", api: "/battle-abilities?limit=200" },
  { prefix: "/spells", api: "/spells?limit=200" },
  { prefix: "/grimoires", api: "/grimoires?limit=500" },
  { prefix: "/bestiary", api: "/enemies?limit=200" },
  { prefix: "/areas", api: "/areas?limit=200" },
  { prefix: "/workshops", api: "/workshops?limit=200" },
  { prefix: "/chests", api: "/chests?limit=500" },
  { prefix: "/characters", api: "/characters?limit=200" },
  { prefix: "/keys", api: "/keys?limit=200" },
  { prefix: "/sigils", api: "/sigils?limit=200" },
  { prefix: "/titles", api: "/titles?limit=200" },
  { prefix: "/rankings", api: "/rankings?limit=200" },
]

async function collectDetailUrls() {
  const urls = []

  const results = await Promise.all([
    ...ENTITY_ENDPOINTS.map(async ({ prefix, api }) => {
      const rows = await fetchList(api)
      return rows.map((row) => `${prefix}/${row.id}`)
    }),
    // Armor and accessories share the same underlying /armor endpoint.
    // Split by armor_type so the sitemap emits each item exactly once
    // under its canonical route.
    (async () => {
      const rows = await fetchList("/armor?limit=200")
      const armorPaths = []
      for (const row of rows) {
        if (row.armor_type === "Accessory") {
          armorPaths.push(`/accessories/${row.id}`)
        } else {
          armorPaths.push(`/armor/${row.id}`)
        }
      }
      return armorPaths
    })(),
  ])

  for (const batch of results) {
    urls.push(...batch)
  }

  return urls
}

function xmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function renderSitemap(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
  for (const entry of entries) {
    lines.push("  <url>")
    lines.push(`    <loc>${xmlEscape(entry.loc)}</loc>`)
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
    if (entry.changefreq)
      lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
    if (entry.priority) lines.push(`    <priority>${entry.priority}</priority>`)
    lines.push("  </url>")
  }
  lines.push("</urlset>")
  lines.push("")
  return lines.join("\n")
}

async function main() {
  const today = new Date().toISOString().slice(0, 10)

  const entries = STATIC_ROUTES.map((route) => ({
    loc: `${SITE_URL}${route.path}`,
    lastmod: today,
    changefreq: route.changefreq,
    priority: route.priority,
  }))

  console.log(`[sitemap] Fetching detail URLs from ${API_URL}`)
  const detailPaths = await collectDetailUrls()
  console.log(`[sitemap] Collected ${detailPaths.length} detail URLs`)

  for (const path of detailPaths) {
    entries.push({
      loc: `${SITE_URL}${path}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.6",
    })
  }

  const xml = renderSitemap(entries)
  await mkdir(dirname(OUT_PATH), { recursive: true })
  await writeFile(OUT_PATH, xml, "utf8")
  console.log(
    `[sitemap] Wrote ${entries.length} URLs → ${OUT_PATH.replace(process.cwd() + "/", "")}`
  )
}

main().catch((err) => {
  console.error("[sitemap] Generation failed:", err.message)
  process.exit(1)
})
