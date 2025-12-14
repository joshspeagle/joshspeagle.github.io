# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal academic website for Joshua S. Speagle, built as a static HTML/CSS/JavaScript site. Features dynamic content loading, light/dark theme switching, and responsive design. Hosted on GitHub Pages at joshspeagle.github.io.

## Development Environment

**Python Package Management**: Use `uv pip install` instead of `pip install` when installing packages.

**Local Development**: No build process required. Open `index.html` in a browser or run:
```bash
python -m http.server 8000
```

## Architecture

### Content Management

- **Content Source**: `assets/data/content.json` (~2,600 lines) - all site content
- **Publications Data**: `assets/data/publications_data.json` - publication metadata with categories
- **Dynamic Loading**: `content-loader.js` loads content asynchronously on page load
- **Page Detection**: `window.currentPage` variable determines which content to render

### File Organization

```
├── index.html                    # Main page
├── publications.html             # Publications with statistics dashboard
├── mentorship.html               # Mentorship with lazy loading
├── talks.html                    # Talks with category filtering
├── teaching.html                 # Teaching with course filtering
├── awards.html                   # Awards & Honors
├── service.html                  # Leadership & Service
├── assets/
│   ├── css/
│   │   ├── theme-variables.css   # CSS custom properties (MUST LOAD FIRST)
│   │   ├── main.css              # Core styles (~230 lines)
│   │   ├── components.css        # UI components (~4,600 lines)
│   │   ├── circuit-components.css # Circuit board visual effects (~400 lines)
│   │   ├── publications-stats.css # Publication dashboard (~600 lines)
│   │   └── mobile.css            # Responsive styles (~640 lines)
│   ├── js/
│   │   ├── main.js               # ES6 module entry point
│   │   ├── content-loader.js     # Content rendering (~2,600 lines)
│   │   ├── publications-stats.js # Chart.js visualizations (~1,100 lines)
│   │   ├── navigation-toggle.js  # Mobile nav (ES6 module)
│   │   ├── theme-toggle.js       # Dark/light mode (ES6 module)
│   │   ├── animations.js         # Visual effects (ES6 module)
│   │   ├── utils/                # Utility modules
│   │   │   ├── config.js         # Configuration constants
│   │   │   ├── logger.js         # Conditional logging (debug mode)
│   │   │   ├── date-utils.js     # Date parsing utilities
│   │   │   ├── publication-utils.js # Publication category helpers
│   │   │   ├── keyboard-nav.js   # Keyboard navigation handlers
│   │   │   ├── fetch-utils.js    # Fetch with timeout wrapper
│   │   │   └── dom-utils.js      # DOM manipulation utilities
│   │   └── state/
│   │       └── app-state.js      # Application state management
│   ├── data/
│   │   ├── content.json          # Site content
│   │   └── publications_data.json # Publication data
│   └── images/                   # Image assets
├── scripts/                      # Python publication pipeline
│   ├── process_publications.py   # Post-processing orchestrator
│   ├── update_publications_unified.py # Unified fetch pipeline
│   ├── fetch_ads.py              # NASA ADS fetching
│   ├── fetch_openalex.py         # OpenAlex fetching
│   ├── fetch_google_scholar.py   # Google Scholar fetching
│   ├── merge_data.py             # Data source consolidation
│   ├── apply_binary_priority_scoring.py # Category scoring
│   ├── apply_authorship_categories.py # Authorship detection
│   ├── enhanced_methodological_keywords.py # Category keywords
│   ├── flag_featured_publications.py # Featured paper flags
│   ├── fix_citations_timeline.py # Citation data cleaning
│   ├── update_ads_library_cache.py # ADS cache updates
│   └── config.py                 # Configuration
└── docs/                         # PDF documents (CV, etc.)
```

## Key Patterns

- **Content Updates**: Edit `content.json`, not HTML/JS files
- **Card Components**: Use `.research-card` and `.research-grid` for layouts
- **Theme Colors**: Use CSS custom properties from `theme-variables.css`
- **Responsive**: Mobile-first with desktop enhancements
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, ARIA labels

## JavaScript Architecture

### ES6 Modules
The site uses ES6 modules with `main.js` as the entry point:
```javascript
// main.js imports and initializes all modules
import { initTheme } from './theme-toggle.js';
import { initAnimations } from './animations.js';
import { initNavigation } from './navigation-toggle.js';
```

### Configuration Constants
Magic numbers and configurable values are centralized in `utils/config.js`:
```javascript
import { CONFIG } from './utils/config.js';
// Access: CONFIG.lazyLoad.menteeThreshold, CONFIG.delays.loadingSimulation, etc.
```

### Event Delegation
Interactive elements use `data-action` attributes instead of inline `onclick`:
```html
<button data-action="load-more-publications">Load More</button>
```

Event delegation handler in `content-loader.js` processes these actions.

### CSS Load Order
**Critical**: CSS files must load in this order to work correctly:
1. `theme-variables.css` - CSS custom properties (must be first)
2. `main.css` - Core styles
3. `components.css` - UI components
4. `circuit-components.css` - Decorative effects
5. `mobile.css` - Responsive overrides

HTML files include an inline theme detection script to prevent flash of wrong theme:
```html
<script>
    (function() {
        const theme = localStorage.getItem('preferred-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
    })();
</script>
```

## Content Editing Guidelines

### Adding Mentees
```json
{
  "name": "Name",
  "timeline": "Season Year-Season Year",
  "supervision": "Primary Supervisor",
  "status": "Graduate student (<a href='url'>Institution</a>)",
  "cosupervisors": "<a href='url'>Name</a> (<a href='dept'>Dept</a>)",
  "project": "Project description",
  "fellowships": ["Fellowship Name"]
}
```

### Publication Categories
- Four categories: Statistical Learning & AI, Interpretability & Insight, Inference & Computation, Discovery & Understanding
- Papers show badges for categories with ≥20% probability
- Student-led papers get orange highlighting

## Publication Pipeline

The `scripts/` directory contains a Python pipeline for fetching and processing publication data.

### Before Running the Pipeline

**IMPORTANT**: Before running the publication update pipeline, ask the user to update their ADS libraries first! Authorship categories (primary, significant, student, postdoc) are pulled from manually curated ADS libraries:
- Primary author library
- Significant contributor library
- Student-led papers library
- Postdoc-led papers library

The user should add any new papers to the appropriate ADS libraries before running the pipeline.

### Running the Pipeline

```bash
cd scripts
python -X utf8 update_publications_unified.py
```

The `-X utf8` flag is required on Windows to handle emoji output.

### What the Pipeline Does

1. **Backs up** existing `publications_data.json` (with `PRE_UPDATE` timestamp)
2. **Fetches** from Google Scholar, ADS, and OpenAlex
3. **Merges** data from all sources
4. **Runs post-processing**:
   - `flag_featured_publications.py` - flags featured papers
   - `apply_binary_priority_scoring.py` - assigns research categories
   - `fix_citations_timeline.py` - cleans citation data
   - `update_ads_library_cache.py` - syncs ADS library bibcodes
   - `apply_authorship_categories.py` - applies authorship categories from ADS libraries
5. **Deploys** to `assets/data/publications_data.json`

### Authorship Categories

Authorship categories are managed via ADS libraries, not automatically detected:
- `ads_library_cache.json` stores bibcodes for each category
- `update_ads_library_cache.py` syncs from ADS libraries to local cache
- `apply_authorship_categories.py` applies categories to publications

### Requirements

- `.env` file with `ADS_API_KEY` (required) and `OPENALEX_EMAIL` (optional)
- Python packages: `scholarly`, `ads`, `pyalex`, `rich`, `python-dotenv`

## Page Features

| Page | Key Features |
|------|-------------|
| **Home** | Research cards, opportunity cards, biography |
| **Publications** | Chart.js statistics, category badges, ADS links |
| **Mentorship** | Lazy loading, mentee charts, outcome tracking |
| **Talks** | Chronological layout, toggle-based category filtering, invited talks highlighted |
| **Teaching** | Department filtering, level badges |
| **Awards** | Achievement cards |
| **Service** | Organizational grouping, multi-period support |

## Development Notes

- **Deployment**: Push to `master` branch, GitHub Pages auto-deploys
- **Theme**: Toggle persists in localStorage
- **Charts**: Chart.js loaded from CDN on publications page
- **Icons**: Mix of emoji and inline SVG for theme compatibility
