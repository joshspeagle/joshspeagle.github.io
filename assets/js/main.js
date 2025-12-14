/**
 * Main Application Entry Point
 * ES6 Module that orchestrates all site functionality
 */

// Import modules
import { initTheme } from './theme-toggle.js';
import { initAnimations } from './animations.js';
import { initNavigation } from './navigation-toggle.js';
import { CONFIG } from './utils/config.js';

// Content loader will be imported after refactoring
// For now, we'll load it via a dynamic import or keep it separate

/**
 * Initialize main functionality (smooth scrolling, hover effects)
 */
function initializeMainFunctionality() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Enhanced navigation link interactions (desktop only)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('mouseenter', function () {
            if (window.innerWidth > CONFIG.charts.mobileBreakpoint) {
                this.style.transform = 'translateY(-2px) scale(1.05)';
            }
        });

        link.addEventListener('mouseleave', function () {
            if (window.innerWidth > CONFIG.charts.mobileBreakpoint) {
                this.style.transform = 'translateY(-2px) scale(1)';
            }
        });
    });

    // Quick link hover effects
    document.querySelectorAll('.quick-link').forEach(link => {
        link.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });

        link.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(-2px) scale(1)';
        });
    });

    // Publication link hover effects
    document.querySelectorAll('.publication-links li').forEach(item => {
        item.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-3px)';
        });

        item.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(-2px)';
        });
    });

    // Back to top on logo/name click
    const nameElement = document.querySelector('.name');
    if (nameElement) {
        nameElement.style.cursor = 'pointer';
        nameElement.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

/**
 * Initialize the application
 */
async function initApp() {
    // Initialize theme first
    initTheme();

    // Initialize navigation
    initNavigation();

    // Initialize animations
    initAnimations();

    // Initialize main functionality
    initializeMainFunctionality();

    // Load content dynamically
    // The content-loader handles page-specific content loading
    // It's loaded separately to avoid circular dependencies during the transition
}

// Export for use by content-loader (during transition period)
export { initializeMainFunctionality };

// Make available globally during transition
window.initializeMainFunctionality = initializeMainFunctionality;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
