# Domain move

1. Buy the domain. Bare form (`slimehedron.com`) is canonical; `www` redirects to it.
2. Add a file `CNAME` (no extension) to the repo root, one line, bare domain, nothing else:
   `slimehedron.com`
3. At the registrar, four A records on the apex (`@`):
   `185.199.108.153` `185.199.109.153` `185.199.110.153` `185.199.111.153`
4. Four AAAA records on the apex (`@`):
   `2606:50c0:8000::153` `2606:50c0:8001::153` `2606:50c0:8002::153` `2606:50c0:8003::153`
   Steps 3–4 source: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
5. One CNAME record: host `www`, target `flahmusic.github.io`
6. Delete any leftover parking records on `@` and `www` (old A, AAAA, CNAME, ALIAS, ANAME).
7. Repo → Settings → Pages → Custom domain → bare domain → Save. Wait for the green check.
8. Same page, tick **Enforce HTTPS**. Greyed out until the cert issues — up to 24h. Come back.
9. Verify: `dig slimehedron.com +noall +answer` returns the four A records, site loads over https.
10. Replace `https://flahmusic.github.io/Slimehedron/` with `https://slimehedron.com/` in:
    - `index.html` — `og:url` and `og:image`, two lines in `<head>`
    - `robots.txt` — the `Sitemap:` line
    - `sitemap.xml` — the `<loc>` line; bump `<lastmod>` too
11. Bump the cache version in `sw.js` and deploy. Old clients hold the old shell otherwise.
12. Search Console: add the new domain, submit `https://slimehedron.com/sitemap.xml`.
13. Re-scrape the card at https://developers.facebook.com/tools/debug/ so old previews die.
