/**
 * DOM manipulation utilities
 * Provides optimized DOM operations and event management
 */

/**
 * Append multiple elements using DocumentFragment for better performance
 * @param {HTMLElement} container - Container element to append to
 * @param {Array} items - Array of items to create elements from
 * @param {Function} createElementFn - Function that takes an item and returns an HTMLElement
 */
export function appendWithFragment(container, items, createElementFn) {
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const element = createElementFn(item);
        if (element) {
            fragment.appendChild(element);
        }
    });
    container.appendChild(fragment);
}

/**
 * Create an HTML element from an HTML string
 * @param {string} html - HTML string
 * @returns {HTMLElement} Created element
 */
export function createElementFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * Event listener registry for cleanup management
 * Tracks registered listeners for proper cleanup
 */
const eventListenerRegistry = new Map();

/**
 * Add an event listener and register it for later cleanup
 * @param {HTMLElement} element - Element to add listener to
 * @param {string} event - Event type
 * @param {Function} handler - Event handler function
 * @param {Object} options - Event listener options
 */
export function addManagedEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);

    if (!eventListenerRegistry.has(element)) {
        eventListenerRegistry.set(element, []);
    }
    eventListenerRegistry.get(element).push({ event, handler, options });
}

/**
 * Remove all managed event listeners from an element
 * @param {HTMLElement} element - Element to remove listeners from
 */
export function removeAllManagedListeners(element) {
    const listeners = eventListenerRegistry.get(element);
    if (listeners) {
        listeners.forEach(({ event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        eventListenerRegistry.delete(element);
    }
}

/**
 * Remove all managed listeners from all registered elements
 */
export function cleanupAllListeners() {
    eventListenerRegistry.forEach((_, element) => {
        removeAllManagedListeners(element);
    });
}

/**
 * Safely query a selector, returning null if not found
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Context element (default: document)
 * @returns {HTMLElement|null} Found element or null
 */
export function $(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * Query all elements matching a selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Context element (default: document)
 * @returns {Array<HTMLElement>} Array of found elements
 */
export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

/**
 * Set up event delegation on a container
 * @param {HTMLElement} container - Container element
 * @param {string} eventType - Event type to listen for
 * @param {string} selector - CSS selector to match target elements
 * @param {Function} handler - Event handler (receives event and matched element)
 * @returns {Function} Cleanup function
 */
export function delegate(container, eventType, selector, handler) {
    const delegatedHandler = (event) => {
        const target = event.target.closest(selector);
        if (target && container.contains(target)) {
            handler(event, target);
        }
    };

    container.addEventListener(eventType, delegatedHandler);

    return () => container.removeEventListener(eventType, delegatedHandler);
}

/**
 * Set up click action delegation using data-action attributes
 * @param {HTMLElement} container - Container element (default: document.body)
 * @param {Object} actions - Object mapping action names to handlers
 * @returns {Function} Cleanup function
 */
export function setupActionDelegation(container = document.body, actions) {
    const handler = (event) => {
        const actionElement = event.target.closest('[data-action]');
        if (!actionElement) return;

        const action = actionElement.dataset.action;
        if (actions[action]) {
            event.preventDefault();
            actions[action](event, actionElement);
        }
    };

    container.addEventListener('click', handler);

    return () => container.removeEventListener('click', handler);
}
