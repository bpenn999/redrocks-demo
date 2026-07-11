# HOW WE BUILD SITES — THE RULE

**Never again build a site inside another project's repo.** The standard flow,
same as medicare-on-main, nm-medicare, moab-medicare:

1. **Create the GitHub repo FIRST** (github.com/new — named for the client, e.g. `everything-senior-insurance`)
2. **Start the Claude Code session ON that repo** (pick it as the session's repository)
3. Paste the Ambrose build formula → Claude builds + pushes directly, no zips, no uploads
4. **Cloudflare → Workers & Pages → Create application → connect that repo → Deploy**
5. Done. Every push auto-deploys. Ambrose sequences push daily content.

If a session is opened on the wrong repo, STOP and restart on the right one —
the session cannot push to any other repo, and everything becomes manual pain.

---

## Everything Senior Insurance — where things live
- **Site repo (production):** `bpenn999/everything-senior-insurance` (main) → Cloudflare Worker `everything-senior-insurance`
- **Live URL:** https://everything-senior-insurance.brianinsuranceservices.workers.dev
- **Source-of-truth copy + engine:** this repo's `everything-senior-insurance` branch (`site/` = content + engine; root = rendered site)
- **Daily blog:** Ambrose sequence "Everything Senior — daily Sandy/SLC Medicare blog", 1:00 PM MT daily → writes a Brain-verified local post → pushes to the site repo → auto-deploys
- **Fuel:** Ambrose runs on an Anthropic API key — keep credits topped up (console.anthropic.com → Plans & Billing, auto-reload on)

## Still open for this site
- NPN in the footer (only remaining placeholder)
- Contact form → GoHighLevel (form/webhook)
- Custom domain: point `eseniorins.com` at the Worker (Cloudflare → Custom domains)
- Run the Ambrose `aeo-website-checklist` + `website-quality-loop` once credits are topped up
