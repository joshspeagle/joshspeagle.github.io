/**
 * Navigation Toggle - Dropdown navigation and multi-page site support
 * ES6 Module version
 */

import { CONFIG } from './utils/config.js';
import { appState } from './state/app-state.js';
import { logger } from './utils/logger.js';

/**
 * Initialize navigation system
 */
export function initNavigation() {
    const nav = document.querySelector('.nav');
    const navToggle = document.getElementById('navToggle');
    const toggleIcon = document.getElementById('navToggleIcon');
    const navLinks = document.querySelectorAll('.nav-link:not(.dropdown-toggle)');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    if (!nav) {
        logger.warn('Navigation element not found');
        return;
    }

    const hasToggle = navToggle && toggleIcon;

    // Store cleanup handlers
    const cleanupHandlers = [];

    /**
     * Check if navigation should be collapsed based on screen size
     */
    function shouldCollapseNav() {
        return window.innerWidth <= CONFIG.charts.mobileBreakpoint;
    }

    /**
     * Get current page type for highlighting
     */
    function getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('mentorship')) return 'mentorship';
        if (path.includes('publications')) return 'publications';
        if (path.includes('talks')) return 'talks';
        if (path.includes('teaching')) return 'teaching';
        if (path.includes('awards')) return 'awards';
        if (path.includes('service')) return 'service';
        return 'home';
    }

    /**
     * Update active navigation link based on current section or page
     */
    function updateActiveNavigation() {
        const currentPage = getCurrentPage();

        // Clear all active states
        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
        dropdownToggles.forEach(toggle => toggle.classList.remove('active'));

        if (currentPage === 'home') {
            // Home page - highlight based on scroll position
            const sections = document.querySelectorAll('.section[id]');
            let current = 'about';

            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                if (window.pageYOffset >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        } else {
            // Sub-page - highlight appropriate dropdown item and parent
            const dropdownItems = document.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(item => {
                const href = item.getAttribute('href');
                if (href && href.includes(currentPage)) {
                    item.classList.add('active');
                    const parentDropdown = item.closest('.nav-dropdown');
                    if (parentDropdown) {
                        const parentToggle = parentDropdown.querySelector('.dropdown-toggle');
                        if (parentToggle) {
                            parentToggle.classList.add('active');
                        }
                    }
                }
            });
        }

        // Auto-collapse on mobile if not manually expanded
        const userExpanded = nav.classList.contains('nav-expanded');
        const lastManualToggle = sessionStorage.getItem('navLastManualToggle');
        const timeSinceManualToggle = lastManualToggle ? Date.now() - parseInt(lastManualToggle) : Infinity;
        const recentManualToggle = timeSinceManualToggle < CONFIG.delays.navigationTimeout;

        if (hasToggle && shouldCollapseNav() && !userExpanded && !recentManualToggle) {
            nav.classList.add('nav-collapsed');
            toggleIcon.textContent = '+';

            document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }
    }

    /**
     * Toggle navigation expanded/collapsed state
     */
    function toggleNavigation() {
        nav.classList.toggle('nav-collapsed');
        const isCollapsed = nav.classList.contains('nav-collapsed');

        if (isCollapsed) {
            nav.classList.remove('nav-expanded');
        } else {
            nav.classList.add('nav-expanded');
        }

        sessionStorage.setItem('navLastManualToggle', Date.now().toString());

        if (hasToggle) {
            toggleIcon.textContent = isCollapsed ? '+' : '−';
            navToggle.style.transform = 'scale(0.9)';
            setTimeout(() => {
                navToggle.style.transform = 'scale(1)';
            }, 100);
        }
    }

    /**
     * Apply mobile navigation state
     */
    function applyMobileNavState() {
        if (!hasToggle) return;

        if (shouldCollapseNav()) {
            navToggle.style.display = 'flex';

            if (!nav.classList.contains('nav-expanded')) {
                nav.classList.add('nav-collapsed');
                toggleIcon.textContent = '+';
            }
        } else {
            navToggle.style.display = 'none';
            nav.classList.remove('nav-collapsed', 'nav-expanded');
            toggleIcon.textContent = '−';
        }
    }

    /**
     * Handle nav link click - auto-collapse on mobile
     */
    function handleNavLinkClick() {
        if (hasToggle && shouldCollapseNav()) {
            setTimeout(() => {
                nav.classList.add('nav-collapsed');
                nav.classList.remove('nav-expanded');
                if (hasToggle) {
                    toggleIcon.textContent = '+';
                }

                document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                    dropdown.classList.remove('open');
                    dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
                });
            }, CONFIG.delays.dropdownRecentlyOpened);
        }
    }

    /**
     * Handle dropdown item clicks
     */
    function handleDropdownItemClick() {
        const dropdown = this.closest('.nav-dropdown');
        if (dropdown) {
            dropdown.classList.remove('open');
            dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        }

        if (navToggle && shouldCollapseNav()) {
            handleNavLinkClick();
        }
    }

    // Set up event listeners
    if (hasToggle) {
        navToggle.addEventListener('click', toggleNavigation);
        const touchHandler = function (e) {
            e.preventDefault();
            toggleNavigation();
        };
        navToggle.addEventListener('touchend', touchHandler);
        cleanupHandlers.push(() => {
            navToggle.removeEventListener('click', toggleNavigation);
            navToggle.removeEventListener('touchend', touchHandler);
        });
    }

    // Nav link click handlers
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
        cleanupHandlers.push(() => link.removeEventListener('click', handleNavLinkClick));
    });

    // Dropdown item click handlers
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', handleDropdownItemClick);
        cleanupHandlers.push(() => item.removeEventListener('click', handleDropdownItemClick));
    });

    // Scroll handler for active navigation
    window.addEventListener('scroll', updateActiveNavigation);
    cleanupHandlers.push(() => window.removeEventListener('scroll', updateActiveNavigation));

    // Resize handler
    window.addEventListener('resize', applyMobileNavState);
    cleanupHandlers.push(() => window.removeEventListener('resize', applyMobileNavState));

    // Initialize
    updateActiveNavigation();
    applyMobileNavState();

    // Register cleanup
    appState.registerCleanupHandler(() => {
        cleanupHandlers.forEach(cleanup => cleanup());
    });
}
