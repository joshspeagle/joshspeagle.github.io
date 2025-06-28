// Theme Toggle JavaScript - Dark/Light Mode Functionality

(function () {
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

    // Initialize theme system
    function initThemeSystem() {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem(THEME_KEY) || DARK_THEME;

        // Prevent flash of unstyled content
        document.documentElement.classList.add('no-transition');

        // Apply theme
        applyTheme(savedTheme);

        // Create and insert toggle button
        createThemeToggle();

        // Re-enable transitions after initial load
        setTimeout(() => {
            document.documentElement.classList.remove('no-transition');
        }, 100);

        // Listen for system theme changes
        watchSystemTheme();
    }

    // Apply theme to document
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content',
                theme === DARK_THEME ? '#0d1421' : '#ffffff'
            );
        } else {
            // Create meta tag if it doesn't exist
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = theme === DARK_THEME ? '#0d1421' : '#ffffff';
            document.head.appendChild(meta);
        }

        // Update toggle button icon
        updateToggleIcon(theme);

        // Handle special elements that need theme-specific treatment
        handleSpecialElements(theme);
    }

    // Create theme toggle button
    function createThemeToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle dark/light mode');
        toggle.setAttribute('type', 'button');

        // Set initial icon
        const currentTheme = document.documentElement.getAttribute('data-theme');
        toggle.innerHTML = currentTheme === DARK_THEME ? moonIcon : sunIcon;

        // Add click handler
        toggle.addEventListener('click', toggleTheme);

        // Insert into page
        document.body.appendChild(toggle);

        return toggle;
    }

    // Toggle between themes
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

        // Add switching animation class
        const toggle = document.querySelector('.theme-toggle');
        toggle.classList.add('switching');

        // Apply new theme
        applyTheme(newTheme);

        // Save preference
        localStorage.setItem(THEME_KEY, newTheme);

        // Remove animation class after animation completes
        setTimeout(() => {
            toggle.classList.remove('switching');
        }, 500);

        // Trigger custom event for other scripts to listen to
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: newTheme }
        }));
    }

    // Update toggle button icon
    function updateToggleIcon(theme) {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.innerHTML = theme === DARK_THEME ? moonIcon : sunIcon;
        }
    }

    // Handle special elements that need theme-specific treatment
    function handleSpecialElements(theme) {
        // Handle images that need to be swapped
        const artLogo = document.querySelector('.art-logo-img');
        if (artLogo) {
            if (theme === LIGHT_THEME) {
                artLogo.classList.add('theme-invert');
            } else {
                artLogo.classList.remove('theme-invert');
            }
        }

        // Handle cosmic elements in header
        const cosmicElements = document.querySelectorAll('[class^="cosmic-element"]');
        cosmicElements.forEach(element => {
            if (theme === LIGHT_THEME) {
                element.style.opacity = '0.4'; // Dim in light mode
            } else {
                element.style.opacity = '0.7'; // Original opacity
            }
        });

        // Update gradient backgrounds
        const body = document.body;
        if (!body.classList.contains('gradient-bg-main')) {
            body.classList.add('gradient-bg-main');
        }

        const header = document.querySelector('.header');
        if (header && !header.classList.contains('gradient-bg-header')) {
            header.classList.add('gradient-bg-header');
        }
    }

    // Watch for system theme preference changes
    function watchSystemTheme() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Only auto-switch if user hasn't manually set a preference
        mediaQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem(THEME_KEY)) {
                applyTheme(e.matches ? DARK_THEME : LIGHT_THEME);
            }
        });
    }

    // Keyboard shortcut for theme toggle (Ctrl/Cmd + Shift + L)
    function setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    // Public API
    window.themeSystem = {
        toggle: toggleTheme,
        setTheme: applyTheme,
        getTheme: () => document.documentElement.getAttribute('data-theme')
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initThemeSystem();
            setupKeyboardShortcut();
        });
    } else {
        initThemeSystem();
        setupKeyboardShortcut();
    }
})();