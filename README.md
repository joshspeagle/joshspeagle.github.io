# Joshua S. Speagle — Personal Academic Website

Source for **[joshspeagle.com](https://joshspeagle.com)** (served via GitHub Pages from
[`joshspeagle.github.io`](https://joshspeagle.github.io), custom domain set by `CNAME`).

A token-based static site (redesigned June 2026): the HTML is **pre-rendered** from
`assets/data/content.json` by a small Python build, with design tokens
(`tokens.json` → `tokens.css`), self-hosted [@fontsource](https://fontsource.org)
fonts, and an animated hero canvas. The static HTML *is* the SEO layer; JavaScript only
adds interactivity (theme toggle, hero, search/filter/sort lists).

> **Do not hand-edit the `*.html` files** — they are generated. Edit `content.json` and
> rebuild. CI (`.github/workflows/build-check.yml`) fails any push whose committed build
> is stale.

## Structure

```text
*.html                         # 9 pre-rendered pages + 404.html (static shells)
assets/
  css/                         # fonts.css, tokens.css, redesign.css (the only stylesheets)
  js/redesign/                 # hero.js, listview.js, publications.js
  fonts/                       # self-hosted woff2 (vendored from @fontsource)
  data/
    content.json               # all site content (source of truth for pages)
    tokens.json                # design tokens (source -> tokens.css)
    publications_data.json     # publication metadata (pipeline output)
  images/
scripts/                       # build (build_html/build_tokens/setup_fonts),
                               # per-page generators (pages_*.py), and the
                               # publication pipeline (fetch_*/merge_data/postprocessing)
```

## Development

```bash
npm install                    # one-time: fetch self-hosted fonts (@fontsource)
npm run build                  # tokens -> fonts -> regenerate all HTML from content.json
python -m http.server 8000     # local dev server
```

Edit content in `assets/data/content.json`, then re-run `npm run build` (or just
`python scripts/build_html.py`) to regenerate the pages.

## More

See **[CLAUDE.md](CLAUDE.md)** for the full architecture, the content-update checklist,
and the publication pipeline (Google Scholar / NASA ADS / OpenAlex → `publications_data.json`).

## License

[MIT](LICENSE)
