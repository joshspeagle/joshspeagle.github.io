/**
 * Fetch utilities with timeout support
 * Wraps fetch API with configurable timeout handling
 */

import { CONFIG } from './config.js';

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default from CONFIG)
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} Throws error on timeout or network failure
 */
export async function fetchWithTimeout(url, options = {}, timeout = CONFIG.fetchTimeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout}ms: ${url}`);
        }
        throw error;
    }
}

/**
 * Fetch JSON with timeout support
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Parsed JSON data
 */
export async function fetchJSON(url, timeout = CONFIG.fetchTimeout) {
    const response = await fetchWithTimeout(url, {}, timeout);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${url}`);
    }
    return response.json();
}

/**
 * Fetch multiple resources in parallel with timeout
 * @param {Array<string>} urls - Array of URLs to fetch
 * @param {number} timeout - Timeout per request
 * @returns {Promise<Array<Response>>} Array of responses
 */
export async function fetchAllWithTimeout(urls, timeout = CONFIG.fetchTimeout) {
    return Promise.all(urls.map(url => fetchWithTimeout(url, {}, timeout)));
}

/**
 * Fetch multiple JSON resources in parallel
 * @param {Array<string>} urls - Array of URLs to fetch
 * @param {number} timeout - Timeout per request
 * @returns {Promise<Array<Object>>} Array of parsed JSON data
 */
export async function fetchAllJSON(urls, timeout = CONFIG.fetchTimeout) {
    return Promise.all(urls.map(url => fetchJSON(url, timeout)));
}
