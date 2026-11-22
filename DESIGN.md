# Design System Specification (`joshspeagle.com`)

This document specifies the visual design, typography, color palette, angular surface hierarchy, and interactive visualizations of Joshua S. Speagle's academic website. All design tokens live in `assets/data/tokens.json` and compile to `assets/css/tokens.css` via `scripts/build_tokens.py`; layout and component styles live in `assets/css/redesign.css`.

---

## 1. Visual Identity & Core Concept

The visual system combines astronomical observation and statistical computation through an **editorial constellation-and-circuit** motif:

- **Substrate:** A deep night-sky navy background (`--bg-0`) in dark mode and warm archival paper in light mode, overlaid with a subtle copper coordinate grid (`32px × 32px`).
- **Crisp Technical Geometry (`3px` Radii):** Buttons (`.btn`, `.btn-ghost`, `.cv`), filter chips (`.chip`), tabs (`.pub-tab`), and bilingual nameplates (`.hero h1 .zh`) use crisp `3px` radii aligned with the long-form editorial dialect paired with rotated `45°` diamond indicators.
- **Copper Traces (`--copper-rgb`) & Amber Energy (`--energy`):** Precision `45°` copper traces and diamond/via markers anchor section headers and the homepage left-margin navigation rail (`#board-nav`), while warm amber highlights mark primary actions, active cross-filters, and live posterior samples.

---

## 2. Three-Tier Surface Hierarchy

Components are organized into three distinct visual tiers based on their structural role:

### Tier 1 — Constellation & Editorial Feature Modules
Used for spotlight and summary modules: the ART research group panel (`.art-panel`), the four homepage research-area cards (`.research-card`), featured publication/software/press spotlight cards (`.feat-card`), interactive data-visualization panels (`.pub-fig`), metric strips (`.pub-metrics-chip`, `.pub-stat`), opportunity directory cards (`.opp-card`), and award cards (`.award-card`).
- **Surface:** Elevated card fill (`--chip`) with softened `--shadow-card`, `1px` border (`--border-2`), `3px` border radius (`--radius-card`), and a `2.5px` top accent bar (`--edge`).

### Tier 2 — Editorial Callout Panels
Used for reflective prose callouts (`On Mentorship`, `Teaching Philosophy`, `Community Leadership & EDI`, `.highlight-box`), group values (`.value-card`), and the homepage **"Working With Me"** directory (`#join`).
- **Surface:** Clean framed panels (`1px solid var(--border-2)`, `3px` radius) with a `2.5px` top copper rule.

### Tier 3 — Crisp Academic Record Cards
Used for searchable/filterable academic records across `publications.html`, `talks.html`, `mentorship.html`, `teaching.html`, `service.html`, `software.html`, and `news.html` (`.paper:not(.feat-card)` and `.item:not(.award-card)`).
- **Surface:** Crisp `3px`-radius cards (`--row-bg`, transitioning to `--row-hover` on hover) with a `1px` technical border (`--border-2`) and a `3px` left category indicator bar (`--edge`).
- **Expandable Abstracts & Consolidated Card Footer:** Every publication card includes an inline `<details class="paper-abs-toggle">` disclosure and a unified footer bar pairing category/role badges on the left with outbound resource micro-buttons (`.reslink`) on the right.

---

## 3. Unified Semantic Color Palette

All colors are defined in `assets/data/tokens.json` with paired `dark` and `light` values that satisfy WCAG AA contrast requirements and separate by at least `8` relative-luminance points in both themes. The **four signature brand hues** are reused consistently across Research Areas, Authorship Roles, and Mentorship Career Stages:

| Brand Hue | Dark Token | Light Token | Research Area (`--cat-*`) | Authorship Role (`--role-*`) | Mentorship Stage (`--stage-*`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Violet** | `#967dff` | `#4324a8` | `Statistical Learning & AI` (`--cat-sla`) | `Postdoc-Led` (`--role-postdoc`) | `Postdoctoral Fellows` (`--stage-postdoc`) |
| **Cyan-Teal** | `#2bc8d8` | `#0e8d9c` | `Interpretability & Insight` (`--cat-ii`) | `Student-Led` (`--role-student`) | `Doctoral Students (PhD)` (`--stage-doctoral`) |
| **Sky Cobalt** | `#58a6ff` | `#1964c8` | `Inference & Computation` (`--cat-ic`) | `Significant Contribution` (`--role-significant`) | `Master's Students` (`--stage-masters`) |
| **Warm Gold** | `#ffc266` | `#de8500` | `Discovery & Understanding` (`--cat-du`) | `Primary / Lead Author` (`--role-primary`) | `Undergraduate Researchers` (`--stage-bachelors`) |
| **Neutral / Magenta** | `#6676a1` / `#f472b6` | `#64748b` / `#b1257a` | `Secondary` (`--cat-sec`) | `Co-Author` (`--role-other`) | `High School` (`--stage-secondary`) |

---

## 4. Interactive Dashboards & Visualizations by Page

Every dashboard visualization integrates directly with the shared `[data-listview]` filter engine (`assets/js/redesign/listview.js`) via declarative `[data-lv-trigger]` controls, exact year filters (`data-lv-year`), non-chip facets (`data-lv-facet`), and URL query deep-links (`?cat=...&year=...&q=...`):

1. **Homepage (`index.html`):**
   - **Hero Canvas (`assets/js/redesign/hero.js`):** Prior-to-posterior corner flow diagram inside a clean right-hand desktop stage (`W > 960px`) and stacked mobile/tablet frame (`W <= 960px`), continuously morphing an isotropic Gaussian prior into a bimodal crescent posterior with marching-squares iso-density contours, live 1D marginals, curved streamlines, and advected tracer samples.
   - **Left-Margin Constellation Rail (`assets/js/redesign/board.js` & `#board-nav`):** Vertical copper rail in the left margin (`W >= 1180px`) with scroll-coupled amber horizon paired with a compact fixed section-navigation rail (`W >= 1440px`) tracking the active homepage section.
   - **Hub Routing:** Clickable Research Area cards link directly to pre-filtered `publications.html?cat=<key>#pub-root`; About links to `biography.html` and `service.html`; Latest Highlights surfaces the three most recent news updates above the Research Group & Working With Me sections.
2. **Publications (`publications.html`):**
   - **Compact Telemetry Strip & Role Filter:** Five compact summary tiles linking to curated ADS libraries above a clickable Research Mix cross-filter, an authorship-role filter bar, and a tabbed **Portfolio Explorer** (`role="tablist"` in `assets/js/redesign/pubchart.js`).
   - **Research Mix Proportional Bar:** Interactive 4-domain bar + clickable full-name legend that cross-filters papers by research domain.
   - **Portfolio Explorer Tabs (`Citations per year` · `Publications by year & role` · `Research impact by role (RIQ)`):** Houses all three trend charts cleanly above `Featured work` while allowing visitors to click any year bar or role label to filter the publication archive (all tab panels expand together under `@media print`).
3. **Mentorship (`mentorship.html`):**
   - **Group Values & Interactive Dashboard:** Canonical `#group-values` section plus clickable telemetry strip, *Mentorship by Career Stage (Current vs. Alumni)* bar triggers, and *Undergraduate Research Pathways* bar triggers that filter the roster and auto-expand matching collapsible `<details>` pathways.
4. **Talks & Events (`talks.html`):**
   - **3-D Globe + Cross-Filtered Speaking Charts:** Interactive 3D orthographic Globe / 2D Map (`assets/js/redesign/talks-globe.js`) with city-archive filtering, paired with clickable *Speaking Activity by Year & Format* bars and clickable *Speaking Topics by Research Theme* rows.
5. **Software & Code (`software.html`):**
   - **2-Panel Interactive Ecosystem Dashboard:** Clickable *Flagship Package Adoption* bars (filter directly to a package), clickable *Ecosystem by Domain & Role* bars and role legend keys, Flagship Packages, the interactive `allsky` showcase, and search/sort controls above a 2-column repository grid.
6. **Teaching (`teaching.html`), Service (`service.html`) & News (`news.html`):**
   - **Interactive Timelines & Telemetry Strips:** Clickable course/workshop rows in *Teaching & Curriculum Timeline (2021–22 to 2026–27)*, clickable category headings and expandable sub-rows in *Leadership & Governance Timeline (2020–2027)*, and clickable summary telemetry strips filtering records in place.
7. **Biography (`biography.html`) & Awards (`awards.html`):**
   - **Biography:** 2-column Short Biography + childhood photo (`china_childhood.jpg`) followed by an alternating left/right *Career & Research Evolution Timeline* with research focus tags.
   - **Awards:** Research Prizes & Academic Awards 2-column grid + Competitive Fellowships + Group & Mentee Fellowships showcase.
8. **Writing (`writing.html` & `writing/dl-tuning-playbook/`):**
   - **Editorial index:** Each series is one framed panel (`.wr-series`) with its summary and entry links in a sticky left column and a book-style table of contents on the right (act headings, then numbered parts with a one-line summary). Standalone essays render below as a plain dated list. The series pages under `writing/<series-slug>/` keep their own reading-focused design.
