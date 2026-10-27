# NYC Move

A small private web app for an apartment search: a map of listings, a shortlist, step-by-step guides and PDFs.

- **Site:** GitHub Pages serves `index.html` (built from `src/` with `python3 scripts/build.py`).
- **Data:** Supabase. Only emails in the `members` table can sign in or read anything. No personal details live in this repo.
- **Daily listings:** `.github/workflows/daily.yml` runs `pipeline/daily.py` each morning.

Secrets (Settings → Secrets and variables → Actions): `APIFY_TOKEN`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `SMTP_USER`, `SMTP_PASS`.
