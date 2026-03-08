/**
 * Shared page components - Header, Navigation, Quick Links, Footer
 * Used by all pages
 */

/**
 * Get publication icon SVG
 */
export function getPublicationIcon(iconType) {
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';

    const icons = {
        'ads': `<svg width="40" height="40" viewBox="0 0 100 100">
            <circle cx="40" cy="40" r="25" stroke="${isLightMode ? '#1976D2' : '#64b5f6'}" stroke-width="4" fill="none"/>
            <line x1="57" y1="57" x2="75" y2="75" stroke="${isLightMode ? '#1976D2' : '#64b5f6'}" stroke-width="6" stroke-linecap="round"/>
            <text x="40" y="48" font-family="Arial, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="${isLightMode ? '#1976D2' : '#64b5f6'}">a</text>
        </svg>`,
        'scholar': `<svg width="40" height="40" viewBox="0 0 100 100">
            <path d="M50 20 L20 35 L20 45 C20 45 20 70 50 70 C80 70 80 45 80 45 L80 35 Z" stroke="${isLightMode ? '#1976D2' : '#4285f4'}" stroke-width="3" fill="none"/>
            <path d="M20 35 L50 20 L80 35" stroke="${isLightMode ? '#1976D2' : '#4285f4'}" stroke-width="3" fill="none"/>
            <path d="M65 30 L65 15 L70 15 L70 33" stroke="${isLightMode ? '#1976D2' : '#4285f4'}" stroke-width="3" fill="none"/>
        </svg>`,
        'arxiv': `<svg width="40" height="40" viewBox="0 0 100 100">
            <text x="50" y="58" font-family="Georgia, serif" font-size="26" text-anchor="middle" fill="#b31b1b" font-weight="500">arXiv</text>
        </svg>`,
        'orcid': `<svg width="40" height="40" viewBox="0 0 256 256" fill="#A6CE39">
            <path d="M256,128c0,70.7-57.3,128-128,128S0,198.7,0,128S57.3,0,128,0S256,57.3,256,128z"/>
            <path fill="white" d="M86.3,186.2H70.9V79.1h15.4v107.1z M78.6,66.9c-5.2,0-9.4-4.2-9.4-9.4s4.2-9.4,9.4-9.4s9.4,4.2,9.4,9.4S83.8,66.9,78.6,66.9z M194.5,186.2h-26.5c-1.6,0-2.8-1.3-2.8-2.8V128c0-13.1-4.7-22-14.4-22c-10.4,0-15.6,7-15.6,22v55.4c0,1.5-1.3,2.8-2.8,2.8h-26.5c-1.6,0-2.8-1.3-2.8-2.8V79.1c0-1.5,1.3-2.8,2.8-2.8h25.4c1.6,0,2.8,1.3,2.8,2.8v9.5h0.4c5.7-8.8,16.4-14,27.9-14c21.3,0,35,14,35,41.4v67.5C197.3,184.9,196.1,186.2,194.5,186.2z"/>
        </svg>`
    };
    return icons[iconType] || '';
}

const GITHUB_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
</svg>`;

/**
 * Populate header content
 */
export function populateHeader(header) {
    const headerContent = document.querySelector('.header-content');
    if (!headerContent || !header) return;
    if (headerContent.children.length > 0) return; // Already has static content
    headerContent.innerHTML = `
        <h1 class="name">${header.name}</h1>
        <p class="chinese-name">${header.chineseName}</p>
        <p class="tagline">${header.tagline}</p>
    `;
}

/**
 * Populate quick links
 */
export function populateQuickLinks(quickLinks) {
    const quickLinksContainer = document.querySelector('.quick-links-inline');
    if (!quickLinksContainer || !quickLinks) return;
    if (quickLinksContainer.children.length > 0) return; // Already has static content
    quickLinksContainer.innerHTML = quickLinks.map(link => {
        if (link.dropdown && link.items) {
            const dropdownItems = link.items.map(subItem => {
                if (subItem.disabled) {
                    return `<span class="dropdown-item disabled" title="${subItem.disabledReason || 'Coming soon'}">${subItem.text}</span>`;
                } else {
                    return `<a href="${subItem.href}" class="dropdown-item">${subItem.text}</a>`;
                }
            }).join('');

            return `
                <div class="quick-link-dropdown">
                    <button class="quick-link-inline dropdown-toggle" aria-expanded="false" aria-haspopup="true" aria-label="${link.ariaLabel}">
                        ${link.icon} ${link.text}
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="dropdown-menu">
                        ${dropdownItems}
                    </div>
                </div>
            `;
        } else if (link.icon === 'github') {
            return `
                <a href="${link.url}" class="quick-link-inline" aria-label="${link.ariaLabel}">
                    ${GITHUB_SVG}
                    ${link.text}
                </a>
            `;
        } else {
            return `<a href="${link.url}" class="quick-link-inline" aria-label="${link.ariaLabel}">${link.icon} ${link.text}</a>`;
        }
    }).join('');

    initializeQuickLinkDropdowns();
}

/**
 * Populate navigation
 */
export function populateNavigation(navigation) {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer || !navigation) return;
    if (navContainer.children.length > 0) return; // Already has static content

    const currentPage = window.currentPage || 'home';

    if (currentPage === 'home') {
        const navLinks = navigation.map(item =>
            `<a href="${item.href}" class="nav-link">${item.text}</a>`
        ).join('');

        navContainer.innerHTML = navLinks + `
            <button class="nav-toggle" id="navToggle" type="button" aria-label="Toggle navigation">
                <span id="navToggleIcon">+</span>
            </button>
        `;
    } else {
        navContainer.innerHTML = `
            <a href="index.html" class="nav-link home-button">
                <span class="home-icon">🏠</span> Home
            </a>
            <button class="nav-link top-button" data-action="scroll-top" type="button" aria-label="Scroll to top">
                <span class="top-icon">⬆️</span> Top
            </button>
        `;
    }
}

/**
 * Populate footer
 */
export function populateFooter(footer) {
    const footerElement = document.querySelector('.footer .container');
    if (!footerElement || !footer) return;
    if (footerElement.children.length > 0) return; // Already has static content
    footerElement.innerHTML = `
        <p>${footer.copyright}</p>
        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">
            ${footer.credit}
        </p>
    `;
}

/**
 * Initialize quick link dropdown behavior
 */
function initializeQuickLinkDropdowns() {
    const quickLinkDropdowns = document.querySelectorAll('.quick-link-dropdown');
    let scrollTimeout;
    let recentlyOpened = false;

    quickLinkDropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');

        if (toggle && menu) {
            toggle.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const isOpen = dropdown.classList.contains('open');

                document.querySelectorAll('.quick-link-dropdown.open').forEach(openDropdown => {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('open');
                        openDropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
                    }
                });

                if (isOpen) {
                    dropdown.classList.remove('open');
                    this.setAttribute('aria-expanded', 'false');
                } else {
                    dropdown.classList.add('open');
                    this.setAttribute('aria-expanded', 'true');
                    recentlyOpened = true;
                    setTimeout(() => { recentlyOpened = false; }, 300);
                }
            });

            menu.addEventListener('click', function (e) {
                if (e.target.classList.contains('dropdown-item') && !e.target.classList.contains('disabled')) {
                    setTimeout(() => {
                        dropdown.classList.remove('open');
                        toggle.setAttribute('aria-expanded', 'false');
                    }, 150);
                }
            });
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.quick-link-dropdown')) {
            document.querySelectorAll('.quick-link-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }
    });

    window.addEventListener('scroll', function () {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            document.querySelectorAll('.quick-link-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }, 100);
    }, { passive: true });

    document.addEventListener('touchstart', function (e) {
        if (recentlyOpened) return;
        if (!e.target.closest('.quick-link-dropdown')) {
            document.querySelectorAll('.quick-link-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }
    }, { passive: true });
}

/**
 * Initialize keyboard navigation
 */
export function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        if (event.target.classList.contains('skip-link') && event.key === 'Enter') {
            event.preventDefault();
            const targetId = event.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.focus();
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        if (event.key === 'Tab') {
            setTimeout(() => {
                if (document.activeElement.classList.contains('mentee-card') ||
                    document.activeElement.classList.contains('timeline-item') ||
                    document.activeElement.classList.contains('art-highlight')) {
                    document.activeElement.style.outline = '3px solid var(--accent-blue)';
                    document.activeElement.style.outlineOffset = '2px';
                }
            }, 10);
        }
    });

    document.addEventListener('blur', function(event) {
        if (event.target.classList.contains('mentee-card') ||
            event.target.classList.contains('timeline-item') ||
            event.target.classList.contains('art-highlight')) {
            event.target.style.outline = '';
            event.target.style.outlineOffset = '';
        }
    }, true);
}

/**
 * Announce content to screen readers
 */
export function announceToScreenReader(message) {
    let liveRegion = document.getElementById('sr-announcements');

    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-announcements';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = '';
    setTimeout(() => {
        liveRegion.textContent = message;
    }, 100);
}

/**
 * Update publication icons when theme changes
 */
export function updatePublicationIcons() {
    const publicationCards = document.querySelectorAll('.publication-card .card-icon');
    publicationCards.forEach((iconElement, index) => {
        const iconTypes = ['ads', 'scholar', 'arxiv', 'orcid'];
        if (iconTypes[index]) {
            iconElement.innerHTML = getPublicationIcon(iconTypes[index]);
        }
    });

    const publicationLinks = document.querySelectorAll('.pub-link .link-icon');
    publicationLinks.forEach(iconElement => {
        const parentLink = iconElement.closest('.pub-link');
        if (parentLink) {
            const href = parentLink.getAttribute('href');
            let iconType = '';

            if (href.includes('ui.adsabs.harvard.edu') || href.includes('ads')) {
                iconType = 'ads';
            } else if (href.includes('scholar.google') || href.includes('scholar')) {
                iconType = 'scholar';
            } else if (href.includes('orcid.org') || href.includes('orcid')) {
                iconType = 'orcid';
            } else if (href.includes('arxiv.org') || href.includes('arxiv')) {
                iconType = 'arxiv';
            }

            if (iconType) {
                iconElement.innerHTML = getPublicationIcon(iconType);
            }
        }
    });

    const allIcons = document.querySelectorAll('svg[width="40"][height="40"]');
    allIcons.forEach(iconElement => {
        const iconText = iconElement.textContent;
        const iconHTML = iconElement.outerHTML;

        if (iconText === 'a' || iconHTML.includes('L20 35 L20 45')) {
            iconElement.outerHTML = getPublicationIcon('ads');
        } else if (iconHTML.includes('L20 35 L50 20 L80 35')) {
            iconElement.outerHTML = getPublicationIcon('scholar');
        } else if (iconText === 'arXiv') {
            iconElement.outerHTML = getPublicationIcon('arxiv');
        } else if (iconHTML.includes('#A6CE39')) {
            iconElement.outerHTML = getPublicationIcon('orcid');
        }
    });
}
