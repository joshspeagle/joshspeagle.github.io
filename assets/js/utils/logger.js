/**
 * Conditional logger utility
 * Logs are disabled in production (CONFIG.debugMode = false)
 */

import { CONFIG } from './config.js';

export const logger = {
    log: (...args) => {
        if (CONFIG.debugMode) console.log('[DEBUG]', ...args);
    },
    warn: (...args) => {
        if (CONFIG.debugMode) console.warn('[WARN]', ...args);
    },
    error: (...args) => {
        // Always log errors, even in production
        console.error('[ERROR]', ...args);
    },
    info: (...args) => {
        if (CONFIG.debugMode) console.info('[INFO]', ...args);
    }
};
