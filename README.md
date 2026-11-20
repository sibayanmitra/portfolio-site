# portfolio-site

Personal research portfolio. Plain static HTML/CSS/JS hosted on Vercel, with a guestbook
stored in Supabase (free tier) through its REST API.

## Files
- `index.html`, `styles.css`, `app.js` — the site
- `config.js` — Supabase project URL and publishable (anon) key; public by design
- `supabase/schema.sql` — guestbook table and row-level-security policies (read + insert only)
- `vercel.json` — security headers

## Local preview
```
python3 -m http.server 8000
```

## Moderating the guestbook
Delete rows from the `guestbook` table in the Supabase dashboard (Table editor).
Visitors can only read and add entries.
