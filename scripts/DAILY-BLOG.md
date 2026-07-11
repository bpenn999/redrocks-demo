# Daily auto-blog — how it runs

The site has a working blog engine. A new local Sandy / Salt Lake City Medicare
post is published by:

1. Generating a post JSON (via the Ambrose **medicare-blog-writer** skill + verified Brain data)
2. `node site/engine/add-post.js /tmp/post.json`  → prepends it to `site/content/blog.json`
3. `node site/engine/render.js`                    → rebuilds the site
4. `git commit` + `git push`                       → publishes

`add-post.js` is the entry point. A post JSON needs:
`{ slug, title, date (YYYY-MM-DD), updated, category, read, location, excerpt, keywords[], tldr[], body[{h,p[],list[]}], faq[{q,a}], sources[{name,url}] }`

## Turn on the daily schedule — pick ONE

### Option A — Claude Code Routine (recommended; uses Ambrose)
Create a scheduled Routine (fresh session per fire, cron `0 13 * * *` = ~7am MT)
with the prompt in `scripts/daily-blog-prompt.txt`. In Claude Code on the web:
**Scheduled tasks / Routines → New → paste the prompt → daily**. This is the
`create_trigger` call already prepared in the build session (it just needs your approval).

### Option B — GitHub Actions (no MCP approval needed)
Use `.github/workflows/daily-blog.yml` (scaffold included). It runs the engine on
GitHub's cron. It expects a pre-written `draft.json` (or wire it to the Claude API
with an `ANTHROPIC_API_KEY` repo secret to generate the post in-workflow).

## Compliance (already enforced)
TPMO (76 orgs / 2,345 plans), CMS non-affiliation, and the Integrity statement
render in the sitewide footer. Posts must: state the plan year, cite figure + year +
.gov/KFF source, and use NO banned superlatives (best / cheapest / #1).
