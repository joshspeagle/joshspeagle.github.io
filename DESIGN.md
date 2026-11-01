# Design System Specification (`joshspeagle.com`)

This document specifies the visual design, typography, color palette, angular surface hierarchy, and interactive visualizations of Joshua S. Speagle's academic website. All design tokens live in `assets/data/tokens.json` and compile to `assets/css/tokens.css` via `scripts/build_tokens.py`; layout and component styles live in `assets/css/redesign.css`.

---

## 1. Visual Identity & Core Concept

The visual system combines astronomical observation and statistical computation through an **angular constellation-and-circuit** motif:

- **Substrate:** A deep night-sky navy background (`--bg-0`) in dark mode and warm archival paper (`#f7f5ef`) in light mode, overlaid with a subtle copper coordinate grid (`32px × 32px`).
- **Angular Technical Geometry (`2px–3px` radii & `45°` Chamfers):** Instead of rounded pill buttons or thick left-only sidebars, buttons (`.btn`, `.btn-ghost`, `.cv`), filter chips (`.chip`), and bilingual nameplates (`.hero h1 .zh`) use crisp `45°` chamfered polygon corners (`clip-path: polygon(...)`) and rotated `45°` diamond indicators.
- **Copper Traces (`--copper-rgb`) & Amber Energy (`--energy`):** Precision `45°` copper traces and diamond/via markers anchor section headers and the homepage left-margin rail, while warm amber highlights mark primary actions, active filters, and live posterior samples.

---

## 2. Three-Tier Angular Surface Hierarchy

Components are organized into three distinct visual tiers based on their structural role:

### Tier 1 — Constellation & IC Feature Modules
Used for spotlight and summary modules: the ART research group panel (`.art-panel`), the four homepage research-area cards (`.research-card`), featured publication/software/press spotlight cards (`.feat-card`), interactive data-visualization panels (`.pub-fig`), metric tiles (`.pub-metrics-chip`, `.pub-stat`), opportunity directory cards (`.opp-card`), and award cards (`.award-card`).
- **Surface:** Elevated card fill (`--chip`) with `--shadow-card`, `1px` border (`--border-2`), `3px` border radius (`--radius-card`), a `2.5px` top accent bar (`--edge`), and an angular top-right copper corner bracket (`::before`).

### Tier 2 — Angular Technical Callout Panels & Editorial Blocks
Used for reflective prose callouts (`On Mentorship`, `Teaching Philosophy`, `Community Leadership & EDI`, `.highlight-box`), group values (`.editorial-block`), and the homepage **"Working With Me"** values and fellowship directory (`#join`).
- **Surface:** Full-framed angular technical panels (`1px solid var(--border-2)`) with a `2.5px` top copper rule and a bottom-right copper corner bracket (`::before`).

### Tier 3 — Crisp Angular List Cards
Used for academic records across `publications.html`, `talks.html`, `mentorship.html`, `teaching.html`, `service.html`, `software.html`, and `news.html` (`.paper:not(.feat-card)` and `.item:not(.award-card)`).
- **Surface:** Sharp `2px`-radius cards (`--row-bg`, transitioning to `--row-hover` on hover) with a `1px` technical border (`--border-2`) and a `3px` left category indicator bar (`--edge`).
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
| **Neutral / Coral** | `#536084` / `#ff7b72` | `#94a3b8` / `#c93b2b` | `Secondary` (`--cat-sec`) | `Co-Author` (`--role-other`) | `High School` (`--stage-secondary`) |

---

## 4. Interactive Dashboards & Visualizations by Page

1. **Homepage (`index.html`):**
   - **Hero Canvas (`assets/js/redesign/hero.js`):** Deep-field spiral and elliptical galaxies across the left/center emit glowing violet-cyan-gold signal beams through the constellation network into an open rotated Bayesian posterior (`1σ`, `2σ`, `3σ` credible ellipses and live MCMC/nested-sampling cloud) on the right.
   - **Left-Margin Constellation Rail (`assets/js/redesign/board.js`):** Clean vertical copper rail in the left margin (`W >= 1180px`) with `45°` section-header taps and scroll-coupled amber horizon.
2. **Publications (`publications.html`):**
   - **Research Mix Proportional Bar:** Full-width 4-domain bar paired with an always-visible color-coded full-name legend.
   - **Citations per Year:** Interactive area/line chart with hover tooltips (`assets/js/redesign/pubchart.js`).
   - **Publications by Year & Role:** Multi-hue stacked bar chart using the vibrant `--role-*` palette.
   - **Research Impact by Role (RIQ):** Multi-series trajectory plot with color-coded lines, diamond endpoint markers, and interactive year-band tooltips.
3. **Mentorship (`mentorship.html`):**
   - **2-Panel Mentorship Dashboard:** *Mentorship by Career Stage (Current vs. Former)* paired with *Undergraduate Research Pathways Breakdown*.
   - **Roster Organization:** Current Group Members (15) displayed in a 2-column grid by stage at the top; Former Mentees & Alumni (70) separated below, with Former Undergraduates (56) organized into 3 collapsible pathway accordions (*Senior Thesis & Independent Research*, *Summer Research Fellowships*, *ROP, Work-Study & Academic-Year Research*).
4. **Talks & Events (`talks.html`):**
   - **2-Panel Speaking Dashboard:** Inline SVG *Global Footprint of Talks & Lectures* world map (with proportional location pins, great-circle arcs from Toronto, and hover tooltips) paired with *Speaking Activity by Year & Format* stacked bar chart.
5. **Software & Code (`software.html`):**
   - **2-Panel Software Ecosystem Dashboard:** *Flagship Package Adoption (Monthly PyPI Downloads)* paired with *Software Ecosystem by Domain & Role*, followed by Flagship Packages, the interactive `allsky` showcase, and search/filter controls above a 2-column repository grid.
6. **Teaching (`teaching.html`) & Service (`service.html`):**
   - **Timeline Matrices:** Multi-year *Teaching & Curriculum Timeline (2021–2026)* on `teaching.html` and *Leadership & Governance Timeline (2020–2027)* on `service.html`.
7. **Biography (`biography.html`), Awards (`awards.html`) & News (`news.html`):**
   - **Biography:** 2-column Short Biography + childhood photo (`china_childhood.jpg`) followed by an alternating left/right *Career & Research Evolution Timeline* with research focus tags.
   - **Awards:** Research Prizes & Academic Awards 2-column grid + Competitive Fellowships + Group & Mentee Fellowships showcase.
   - **News:** Featured Press & Research Highlights 3-card spotlight grid above the filterable chronological feed.
