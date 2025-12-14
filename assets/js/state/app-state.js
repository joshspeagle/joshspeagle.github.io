/**
 * Application state management
 * Centralizes global state with proper initialization and cleanup
 */

class AppState {
    constructor() {
        this.reset();
    }

    /**
     * Reset all state to initial values
     */
    reset() {
        // Publications state
        this.publications = {
            allData: [],
            isLoading: false,
            loadedCount: 0
        };

        // Mentees state
        this.mentees = {
            allData: null,
            isLoading: false
        };

        // Filter states
        this.filters = {
            talks: {
                enabled: new Set()
            },
            teaching: {
                currentFilter: 'all',
                filterType: 'general'
            }
        };

        // Cleanup handlers registry
        this._cleanupHandlers = [];
        this._observers = [];
    }

    // === Publications ===

    setPublicationsData(data) {
        this.publications.allData = data;
    }

    getPublicationsData() {
        return this.publications.allData;
    }

    setPublicationsLoading(isLoading) {
        this.publications.isLoading = isLoading;
    }

    isPublicationsLoading() {
        return this.publications.isLoading;
    }

    setPublicationsLoadedCount(count) {
        this.publications.loadedCount = count;
    }

    getPublicationsLoadedCount() {
        return this.publications.loadedCount;
    }

    // === Mentees ===

    setMenteesData(data) {
        this.mentees.allData = data;
    }

    getMenteesData() {
        return this.mentees.allData;
    }

    setMenteesLoading(isLoading) {
        this.mentees.isLoading = isLoading;
    }

    isMenteesLoading() {
        return this.mentees.isLoading;
    }

    // === Talks Filters ===

    setTalksEnabledCategories(categories) {
        this.filters.talks.enabled = new Set(categories);
    }

    getTalksEnabledCategories() {
        return this.filters.talks.enabled;
    }

    toggleTalksCategory(category) {
        if (this.filters.talks.enabled.has(category)) {
            this.filters.talks.enabled.delete(category);
        } else {
            this.filters.talks.enabled.add(category);
        }
        return this.filters.talks.enabled.has(category);
    }

    // === Teaching Filters ===

    setTeachingFilter(filter, type = 'general') {
        this.filters.teaching.currentFilter = filter;
        this.filters.teaching.filterType = type;
    }

    getTeachingFilter() {
        return this.filters.teaching;
    }

    // === Cleanup Management ===

    /**
     * Register a cleanup handler to be called on reset/cleanup
     * @param {Function} handler - Cleanup function
     */
    registerCleanupHandler(handler) {
        this._cleanupHandlers.push(handler);
    }

    /**
     * Register an observer to be disconnected on cleanup
     * @param {MutationObserver|IntersectionObserver|ResizeObserver} observer
     */
    registerObserver(observer) {
        this._observers.push(observer);
    }

    /**
     * Run all cleanup handlers and observers
     */
    cleanup() {
        // Run cleanup handlers
        this._cleanupHandlers.forEach(handler => {
            try {
                handler();
            } catch (e) {
                console.error('Cleanup handler error:', e);
            }
        });

        // Disconnect observers
        this._observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (e) {
                console.error('Observer disconnect error:', e);
            }
        });

        // Reset state
        this.reset();
    }
}

// Export singleton instance
export const appState = new AppState();

// Also export class for testing or multiple instances
export { AppState };
