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
