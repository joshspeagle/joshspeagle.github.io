/**
 * Date parsing and formatting utilities
 * Consolidates date handling logic used across the codebase
 */

import { CONFIG } from './config.js';

/**
 * Convert month abbreviation to number (1-12)
 * @param {string} monthAbbr - Month abbreviation (e.g., 'Jan', 'Feb')
 * @returns {number} Month number (1-12) or 0 if invalid
 */
export function monthToNumber(monthAbbr) {
    return CONFIG.months[monthAbbr] || 0;
}

/**
 * Convert month abbreviation to zero-padded string for ISO dates
 * @param {string} monthAbbr - Month abbreviation (e.g., 'Jan', 'Feb')
 * @returns {string} Zero-padded month string (e.g., '01', '02')
 */
export function getISOMonth(monthAbbr) {
    const num = monthToNumber(monthAbbr);
    return num.toString().padStart(2, '0');
}

/**
 * Parse a date string like "Sep 2025" into components
 * @param {string} dateString - Date string in "Mon Year" format
 * @returns {{month: number, year: number}} Parsed date components
 */
export function parseMonthYear(dateString) {
    const parts = dateString.split(' ');
    const month = monthToNumber(parts[0]);
    const year = parseInt(parts[1]) || new Date().getFullYear();
    return { month, year };
}

/**
 * Sort function for items with year and date properties
 * Sorts by year descending, then by month descending (newest first)
 * @param {Object} a - First item with year and date properties
 * @param {Object} b - Second item with year and date properties
 * @returns {number} Sort comparison result
 */
export function sortByDate(a, b) {
    if (b.year !== a.year) return b.year - a.year;
    const monthA = monthToNumber(a.date.split(' ')[0]);
    const monthB = monthToNumber(b.date.split(' ')[0]);
    return monthB - monthA;
}

/**
 * Format a date object or year/month into ISO date string (YYYY-MM)
 * @param {number} year - The year
 * @param {string} monthAbbr - Month abbreviation
 * @returns {string} ISO date string (YYYY-MM)
 */
export function toISODateString(year, monthAbbr) {
    return `${year}-${getISOMonth(monthAbbr)}`;
}
