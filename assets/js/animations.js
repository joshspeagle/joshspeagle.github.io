/**
 * Animations - Scroll animations and visual effects
 * ES6 Module version
 */

import { CONFIG } from './utils/config.js';
import { appState } from './state/app-state.js';

/**
 * Initialize all animations
 */
export function initAnimations() {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        // Skip animations for users who prefer reduced motion
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('visible');
        });
        return;
    }

    // Initialize section observer
    initSectionObserver();

    // Initialize timeline observer
    initTimelineObserver();

    // Initialize parallax effect
    initParallax(prefersReducedMotion);

    // Initialize animated elements
    initAnimatedElements();

    // Initialize publication links animation
    initPublicationLinksAnimation();

    // Add active navigation styles
    addNavigationStyles();
}

/**
 * Initialize intersection observer for sections
 */
function initSectionObserver() {
    const isMobile = window.innerWidth <= CONFIG.charts.mobileBreakpoint;
    const observerOptions = {
        threshold: isMobile ? 0.05 : 0.1,
        rootMargin: isMobile ? '0px 0px -20px 0px' : '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);

                // Staggered animation for child elements
                const animatedElements = entry.target.querySelectorAll('.highlight-box, .contact-info, .dog-photo');
                animatedElements.forEach((element, index) => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            element.style.opacity = '1';
                            element.style.transform = 'translateY(0)';
                        }, index * 50);
                    });
                });
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });

    // Register for cleanup
    appState.registerObserver(observer);
}

/**
 * Initialize timeline animation observer
 */
function initTimelineObserver() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    if (timelineItems.length === 0) return;

    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 50);
                });
                timelineObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    timelineItems.forEach(item => {
        timelineObserver.observe(item);
    });

    // Register for cleanup
    appState.registerObserver(timelineObserver);
}

/**
 * Initialize parallax effect for header
 * @param {boolean} prefersReducedMotion - User's motion preference
 */
function initParallax(prefersReducedMotion) {
    if (window.innerWidth <= CONFIG.charts.mobileBreakpoint || prefersReducedMotion) {
        return;
    }

    let ticking = false;
    const header = document.querySelector('.header');

    function updateParallax() {
        if (header) {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.3;
            header.style.transform = `translate3d(0, ${rate}px, 0)`;
        }
        ticking = false;
    }

    function requestParallaxUpdate() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });

    // Register cleanup
    appState.registerCleanupHandler(() => {
        window.removeEventListener('scroll', requestParallaxUpdate);
    });
}

/**
 * Initialize animated elements with hidden state
 */
function initAnimatedElements() {
    document.querySelectorAll('.highlight-box, .contact-info, .dog-photo').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
}

/**
 * Initialize publication links reveal animation
 */
function initPublicationLinksAnimation() {
    const publicationLinks = document.querySelectorAll('.publication-links li');
    publicationLinks.forEach((link, index) => {
        link.style.opacity = '0';
        link.style.transform = 'translateX(-20px)';
        link.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;

        setTimeout(() => {
            link.style.opacity = '1';
            link.style.transform = 'translateX(0)';
        }, CONFIG.delays.loadingSimulation + (index * 100));
    });
}

/**
 * Add CSS for active navigation state
 */
function addNavigationStyles() {
    if (document.getElementById('animation-styles')) return;

    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
        .nav-link.active {
            background: rgba(100, 181, 246, 0.3) !important;
            border-color: #64b5f6 !important;
            color: #ffffff !important;
        }
    `;
    document.head.appendChild(style);
}

// Expose globally for content-loader to call after content is loaded
window.initializeAnimations = initAnimations;
