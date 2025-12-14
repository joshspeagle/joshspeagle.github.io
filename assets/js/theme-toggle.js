/**
 * Theme Toggle - Dark/Light Mode Functionality
 * ES6 Module version
 */

import { CONFIG } from './utils/config.js';

// Theme constants
const THEME_KEY = 'preferred-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

// SVG Icons
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
</svg>`;

const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

/**
 * Apply theme to document
 * @param {string} theme - 'dark' or 'light'
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Update meta theme-color for mobile browsers
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === DARK_THEME ? '#0d1421' : '#ffffff');

    // Update toggle button icon
    updateToggleIcon(theme);

    // Handle special elements
    handleSpecialElements(theme);
}

/**
 * Create theme toggle button
 * @returns {HTMLButtonElement} The toggle button element
 */
function createThemeToggle() {
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Toggle dark/light mode');
    toggle.setAttribute('type', 'button');

    const currentTheme = document.documentElement.getAttribute('data-theme') || DARK_THEME;
    toggle.innerHTML = currentTheme === DARK_THEME ? moonIcon : sunIcon;

    toggle.addEventListener('click', toggleTheme);
    document.body.appendChild(toggle);

    return toggle;
}

/**
 * Toggle between themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
        toggle.classList.add('switching');
    }

    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);

    setTimeout(() => {
        if (toggle) {
            toggle.classList.remove('switching');
        }
    }, CONFIG.delays.themeAnimationDuration);

    window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: newTheme }
    }));
}

/**
 * Update toggle button icon
 * @param {string} theme - Current theme
 */
function updateToggleIcon(theme) {
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
        toggle.innerHTML = theme === DARK_THEME ? moonIcon : sunIcon;
    }
}

/**
 * Handle special elements that need theme-specific treatment
 * @param {string} theme - Current theme
 */
function handleSpecialElements(theme) {
    const circuitElements = document.querySelectorAll('.circuit-bg, .section::before, .section::after');
    circuitElements.forEach(element => {
        element.style.display = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.display = '';
    });
}

/**
 * Watch for system theme preference changes
 */
function watchSystemTheme() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? DARK_THEME : LIGHT_THEME);
        }
    });
}

/**
 * Set up keyboard shortcut (Ctrl/Cmd + Shift + L)
 */
function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            toggleTheme();
        }
    });
}

/**
 * Initialize the theme system
 */
export function initTheme() {
    // Check for saved theme preference or use what was set inline
    const savedTheme = localStorage.getItem(THEME_KEY);
    const currentTheme = document.documentElement.getAttribute('data-theme') || DARK_THEME;
    const targetTheme = savedTheme || currentTheme;

    // Apply theme if different from current
    if (targetTheme !== currentTheme) {
        applyTheme(targetTheme);
    }

    // Create toggle button
    createThemeToggle();

    // Re-enable transitions after initial load
    setTimeout(() => {
        document.documentElement.classList.remove('no-transition');
    }, CONFIG.delays.themeTransitionDelay);

    // Watch for system theme changes
    watchSystemTheme();

    // Set up keyboard shortcut
    setupKeyboardShortcut();
}

/**
 * Get current theme
 * @returns {string} Current theme ('dark' or 'light')
 */
export function getTheme() {
    return document.documentElement.getAttribute('data-theme') || DARK_THEME;
}

/**
 * Set theme directly
 * @param {string} theme - 'dark' or 'light'
 */
export function setTheme(theme) {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
}

// Export for external use
export { toggleTheme, DARK_THEME, LIGHT_THEME };
