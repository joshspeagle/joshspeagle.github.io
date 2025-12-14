/**
 * Keyboard navigation utilities for filter components
 * Provides accessible keyboard navigation for filter buttons
 */

/**
 * Create a keyboard event handler for filter navigation
 * @param {NodeList|Array} filterBtns - Array of filter button elements
 * @param {Function} onSelect - Callback when a button is selected (Enter/Space)
 * @returns {Function} Returns a function that takes an index and returns the event handler
 */
export function createFilterKeyboardHandler(filterBtns, onSelect) {
    const buttons = Array.from(filterBtns);

    return function (index) {
        return function (e) {
            let targetIndex = index;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = (index + 1) % buttons.length;
                    buttons[targetIndex].focus();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = (index - 1 + buttons.length) % buttons.length;
                    buttons[targetIndex].focus();
                    break;
                case 'Home':
                    e.preventDefault();
                    buttons[0].focus();
                    break;
                case 'End':
                    e.preventDefault();
                    buttons[buttons.length - 1].focus();
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    onSelect(this);
                    break;
            }
        };
    };
}

/**
 * Initialize tabindex management for filter buttons
 * Sets up roving tabindex pattern for accessibility
 * @param {NodeList|Array} filterBtns - Array of filter button elements
 */
export function initializeFilterTabIndex(filterBtns) {
    const buttons = Array.from(filterBtns);

    // Set initial tabindex: first button focusable, rest not
    buttons.forEach((btn, index) => {
        btn.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    // Update tabindex on focus (roving tabindex pattern)
    buttons.forEach(btn => {
        btn.addEventListener('focus', function () {
            buttons.forEach(b => b.setAttribute('tabindex', '-1'));
            this.setAttribute('tabindex', '0');
        });
    });
}

/**
 * Set up complete keyboard navigation for a set of filter buttons
 * Combines keyboard handler and tabindex management
 * @param {NodeList|Array} filterBtns - Array of filter button elements
 * @param {Function} onSelect - Callback when a button is selected
 * @returns {Function} Cleanup function to remove event listeners
 */
export function setupFilterKeyboardNavigation(filterBtns, onSelect) {
    const buttons = Array.from(filterBtns);
    const handlers = [];

    // Initialize tabindex
    initializeFilterTabIndex(buttons);

    // Create and attach keyboard handlers
    const createHandler = createFilterKeyboardHandler(buttons, onSelect);

    buttons.forEach((btn, index) => {
        const handler = createHandler(index).bind(btn);
        btn.addEventListener('keydown', handler);
        handlers.push({ element: btn, handler });
    });

    // Return cleanup function
    return function cleanup() {
        handlers.forEach(({ element, handler }) => {
            element.removeEventListener('keydown', handler);
        });
    };
}
