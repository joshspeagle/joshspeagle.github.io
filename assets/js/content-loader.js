/**
 * Content Loader - Slim orchestrator that dynamically loads page-specific modules
 *
 * Fetches content.json and delegates rendering to page modules in assets/js/pages/.
 * Shared elements (header, nav, quick links, footer) have "skip if populated" guards
 * so static HTML from the build script is preserved.
 */

import {
    populateHeader,
    populateQuickLinks,
    populateNavigation,
    populateFooter,
    initializeKeyboardNavigation,
    announceToScreenReader,
    updatePublicationIcons
} from './pages/shared.js';

document.addEventListener('DOMContentLoaded', async function () {
    try {
        document.body.classList.add('loading');

        // Initialize keyboard navigation for all pages
        initializeKeyboardNavigation();

        // Update publication icons when theme changes
        window.addEventListener('themeChanged', function () {
            updatePublicationIcons();
        });

        const currentPage = window.currentPage || 'home';

        // Load content JSON
        const response = await fetch('assets/data/content.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid content data structure');
        }

        // Populate shared elements (guards skip if static HTML already present)
        populateHeader(data.header);
        populateQuickLinks(data.quickLinks);
        populateNavigation(data.navigation);

        // Load page-specific content
        if (currentPage === 'home') {
            const { populateSections } = await import('./pages/home.js');
            populateSections(data.sections);
        } else {
            await loadPageContent(currentPage, data);
        }

        // Populate footer
        populateFooter(data.footer);

        document.body.classList.remove('loading');

        // Announce page load to screen readers
        const pageDescriptions = {
            home: 'Home page loaded with about, research, collaboration and biography sections',
            publications: 'Publications page loaded with research metrics and publication list',
            mentorship: 'Mentorship page loaded with supervision overview and mentee information',
            talks: 'Talks page loaded with presentation history',
            teaching: 'Teaching page loaded with course information and philosophy',
            awards: 'Awards page loaded',
            service: 'Service page loaded'
        };
        announceToScreenReader(`${document.title}. ${pageDescriptions[currentPage] || 'Page loaded successfully'}`);

        // Re-initialize modules after content is loaded
        requestAnimationFrame(() => {
            if (typeof window.initializeMainFunctionality === 'function') {
                window.initializeMainFunctionality();
            }
        });

    } catch (error) {
        console.error('Error loading content:', error);
        document.body.classList.remove('loading');

        const errorContainer = document.createElement('div');
        errorContainer.innerHTML = `
            <div style="text-align: center; padding: 50px; color: var(--text-primary);">
                <h2>Content Loading Error</h2>
                <p>We're having trouble loading the page content. Please try:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li>Refreshing the page</li>
                    <li>Checking your internet connection</li>
                    <li>Trying again in a few moments</li>
                </ul>
                <button data-action="refresh-page" style="background: var(--accent-blue); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px;">
                    Refresh Page
                </button>
            </div>
        `;
        document.body.appendChild(errorContainer);
    }
});

/**
 * Load page-specific content using dynamic imports
 */
async function loadPageContent(pageType, data) {
    // Set page title and description from content data
    if (data.pages && data.pages[pageType]) {
        const pageInfo = data.pages[pageType];
        document.title = `${pageInfo.title} | Joshua S. Speagle`;
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', pageInfo.description);
        }
    }

    // Set page header
    const pageTitle = document.getElementById('page-title');
    const pageTagline = document.getElementById('page-tagline');
    const sectionData = data.sections && data.sections[pageType];

    if (sectionData) {
        if (pageTitle && sectionData.title) pageTitle.textContent = sectionData.title;
        if (pageTagline) {
            pageTagline.textContent = sectionData.tagline || (data.header && data.header.tagline) || '';
        }
    }

    // Load and render page-specific content
    switch (pageType) {
        case 'publications': {
            const contentEl = document.getElementById('publications-content');
            if (contentEl) {
                const { loadPublicationsContent } = await import('./pages/publications.js');
                loadPublicationsContent(contentEl, sectionData);
            }
            break;
        }
        case 'mentorship': {
            // Show loading indicators
            const overview = document.getElementById('mentorship-overview');
            const current = document.getElementById('mentorship-current');
            const former = document.getElementById('mentorship-former');
            if (overview) overview.innerHTML = '<div class="loading-indicator">Loading overview...</div>';
            if (current) current.innerHTML = '<div class="loading-indicator">Loading current mentees...</div>';
            if (former) former.innerHTML = '<div class="loading-indicator">Loading former mentees...</div>';

            const { populateMentorshipSections, initializeMentorshipInteractivity } = await import('./pages/mentorship.js');
            setTimeout(() => {
                populateMentorshipSections(sectionData);
                requestAnimationFrame(() => {
                    initializeMentorshipInteractivity();
                });
            }, 0);
            break;
        }
        case 'talks': {
            const contentEl = document.getElementById('talks-content');
            if (contentEl) {
                const { createTalksContent } = await import('./pages/talks.js');
                contentEl.innerHTML = createTalksContent(sectionData);
            }
            break;
        }
        case 'teaching': {
            const contentEl = document.getElementById('teaching-content');
            if (contentEl) {
                const { createTeachingContent, initializeTeachingFiltering } = await import('./pages/teaching.js');
                contentEl.innerHTML = createTeachingContent(sectionData);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        initializeTeachingFiltering();
                    });
                });
            }
            break;
        }
        case 'awards': {
            const contentEl = document.getElementById('awards-content');
            if (contentEl) {
                const { createAwardsContent } = await import('./pages/awards.js');
                contentEl.innerHTML = createAwardsContent(sectionData);
            }
            break;
        }
        case 'service': {
            const contentEl = document.getElementById('service-content');
            if (contentEl) {
                const { createServiceContent } = await import('./pages/service.js');
                contentEl.innerHTML = createServiceContent(sectionData);
            }
            break;
        }
    }
}

// Event delegation for data-action handlers
document.addEventListener('click', function (e) {
    const actionElement = e.target.closest('[data-action]');
    if (!actionElement) return;

    const action = actionElement.dataset.action;

    switch (action) {
        case 'refresh-page':
            window.location.reload();
            break;

        case 'scroll-top':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;

        case 'load-more-publications':
            if (typeof window.loadMorePublications === 'function') {
                window.loadMorePublications();
            }
            break;

        case 'load-more-mentees': {
            const sectionId = actionElement.dataset.section;
            const type = actionElement.dataset.type;
            const isCompleted = actionElement.dataset.completed === 'true';
            if (typeof window.loadMoreMentees === 'function') {
                window.loadMoreMentees(sectionId, type, isCompleted);
            }
            break;
        }
    }
});
