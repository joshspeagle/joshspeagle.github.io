/**
 * Configuration constants for the website
 * Centralizes magic numbers and configurable values
 */

export const CONFIG = {
    // Lazy loading thresholds
    lazyLoad: {
        menteeThreshold: 20,
        publicationBatchSize: 20,
        initialBatchSize: 20
    },

    // Timing delays (in milliseconds)
    delays: {
        loadingSimulation: 500,
        dropdownRecentlyOpened: 300,
        navigationTimeout: 5000,
        filterInitDelay: 100,
        chartInitDelay: 100,
        screenReaderDelay: 100,
        themeTransitionDelay: 100,
        themeAnimationDuration: 500,
        chartJsWaitTimeout: 500
    },

    // Chart configuration
    charts: {
        maxBarHeight: 150,
        mobileBreakpoint: 768,
        verySmallBreakpoint: 375
    },

    // Month mapping for date parsing
    months: {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    },

    // Category probability threshold for publication badges
    categoryThreshold: 0.2,

    // Fetch timeout (in milliseconds)
    fetchTimeout: 30000,

    // Debug mode - set to true for development logging
    debugMode: false
};
