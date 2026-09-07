# Copy + content pass — Josh's decisions (2026-09-07) and voice

## Voice (from Josh): "I tend to speak a bit more casually/conversationally and supportively, even if I am
formal/academic." Keep it plain, warm, first-person, unforced. NOT dramatic, NOT salesy, no stacked adjectives,
no "cutting-edge"/"pioneering"/"unlock"/"harness" filler, no exclamation-mark enthusiasm except where he wrote it.
Read every page's visible text HOLISTICALLY (hero, Home sections, all pages.* kicker/title/tagline, the 404,
every content.json prose field, generator-side strings like "Why these figures?", the ART panel, opportunities,
values, teaching philosophy, mentorship intro, the software/news/talk blurbs) and make it FLOW. Where a passage
already sounds like him, leave it. Where it sounds artificially forced or dramatic, calm it down. Where two
passages repeat each other, cut one. Prefer shorter sentences. Keep facts exactly as they are.

## Decisions to implement
1. NEWS: delete the "Radcliffe Wave is waving" news item (Feb 2024, Konietzka et al.) entirely.
2. MENTORSHIP: "Isabelle Huang" (completed Master's, Fall 2025–Winter 2026) IS "Isabelle (Liyuan) Huang" (current
   doctoral). Unify the name on both records (use "Isabelle (Liyuan) Huang") and add to the completed record an
   `outcome` note in the existing convention ("continued to PhD at U of T" style — check how other records
   phrase it; the field is not displayed for former mentees, so this is for the data's integrity and search).
3. CV: the CV now lives in THIS repo. Copy /tmp/claude-0/-home-user-joshspeagle-github-io/40b03ea6-f1ab-50f8-9441-a14d6728c996/scratchpad/CV_speagle.pdf
   to the repo root as CV_speagle.pdf, change CV_URL in scripts/build_html.py to the site-relative path (root
   prefix-aware, like the icons: `{root}CV_speagle.pdf`), make sure every "Curriculum Vitae" link (nav, mobile nav,
   footer if present) uses it, add the PDF to check_build's link check scope (it is an internal link now), and
   document in CLAUDE.md + .claude/skills/website-content-update/SKILL.md: "To update the CV: replace
   CV_speagle.pdf at the repo root (same filename), bump site.lastUpdated, rebuild." Note there that the old
   joshspeagle.com/bio-cv/ site comes from the separate `bio-cv` repo and should be archived by Josh.
4. Josh's decisions on the "overbuilt" items:
   a. Teaching "Educational Resources" block: DROP it (remove from content.json and the generator).
   b. Home opportunity cards: build BOTH variants — (i) each card trimmed to ~2 sentences + every existing link,
      (ii) an "If you are… / then…" two-column table (rows = the six audiences; the right column = the short
      blurb + the links) — render both at 1440 and 390 (dark), view them, pick the one that reads better and
      keeps the links usable, and say which you chose and why. Vary the wording (audit B9) either way.
   c. Publications: keep ALL FOUR figures; shorten the "Why these figures?" note (build_html.py) to ~3 sentences
      in his voice — what the pictures are for, the sqrt scale, and one line on RIQ.
   d. Role tiles: keep. Awards page: keep as is. List chrome: stays uniform everywhere.
5. Audit Track B items (audit.md §4): B6 sharper taglines for publications/awards; B7 one register + casing
   across Home H2s; B8 sentence-case CTAs everywhere; B11 one stage vocabulary (Undergraduate vs Undergrad —
   pages_mentorship.py _CHIP_LABEL may be edited); B12 "dauchshund"→"dachshund"; B13 American spelling except
   inside quotes/proper nouns; B14 en dashes for date ranges — do it in the generators' period formatting
   (pages_shared helper) so data strings stay as they are; B15 expand "ADS" once (title/aria) as
   "SAO/NASA Astrophysics Data System"; B16 Teaching sort label "Most recent" → "Newest first"; D30 upgrade the
   seven http:// links to https (NOT briandnord.com, NOT the S3 endpoint); E7 repoint Ting Li and Bob Abraham
   (verify with HEAD requests; fall back to a department directory or Scholar page if unsure).
6. Bump site.lastUpdated in content.json to 2026-09-07.

## Verify
Rebuild (twice, idempotent), check_build passes, linkcheck 0, then diff the visible text of every page against
the previous build and list every change in your report so the owner can skim it. No visual changes.
