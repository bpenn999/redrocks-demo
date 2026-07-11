#!/usr/bin/env node
/* ============================================================
   engine/add-post.js — the daily blog engine entry point.
   Prepends a new article to content/agency.json → learn[], then
   you re-run render.js to publish it.

   Daily automation flow (Ambrose):
     1. Ambrose medicare-blog-writer / blog-post-writer drafts a post
        as JSON: { slug, title, category, read, excerpt, body:[{h,p:[],list:[]}] }
     2. node site/engine/add-post.js '<json>'      # or a path to a .json file
     3. node site/engine/render.js                 # rebuild the site
     4. commit + deploy

   Usage:
     node site/engine/add-post.js ./draft.json
     node site/engine/add-post.js '{"slug":"...","title":"...", ...}'
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const CONTENT = path.resolve(__dirname, '..', 'content', 'blog.json');
const arg = process.argv[2];
if (!arg) { console.error('Provide a post as a JSON string or a path to a .json file.'); process.exit(1); }

let post;
try {
  post = fs.existsSync(arg) ? JSON.parse(fs.readFileSync(arg, 'utf8')) : JSON.parse(arg);
} catch (e) { console.error('Could not parse post JSON:', e.message); process.exit(1); }

for (const k of ['slug', 'title', 'excerpt', 'body']) {
  if (!post[k]) { console.error(`Post is missing required field: ${k}`); process.exit(1); }
}
post.category = post.category || 'News';
post.read = post.read || '5 min';
if (!post.date) { console.error('Post is missing required field: date (YYYY-MM-DD)'); process.exit(1); }
post.updated = post.updated || post.date;

const doc = fs.existsSync(CONTENT) ? JSON.parse(fs.readFileSync(CONTENT, 'utf8')) : { posts: [] };
doc.posts = doc.posts || [];
if (doc.posts.some(l => l.slug === post.slug)) {
  console.error(`A post with slug "${post.slug}" already exists — skipping.`);
  process.exit(2);
}
doc.posts.unshift(post); // newest first
fs.writeFileSync(CONTENT, JSON.stringify(doc, null, 2) + '\n');
console.log(`✓ Added "${post.title}" (/blog/${post.slug}/). Now run: node site/engine/render.js`);
