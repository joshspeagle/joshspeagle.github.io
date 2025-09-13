// Optimized Animations JavaScript - Scroll animations and visual effects
function initializeAnimations() {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        // Skip animations for users who prefer reduced motion
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('visible');
        });
        return;
    }

    // Intersection Observer for fade-in animations with mobile-optimized settings
    const isMobile = window.innerWidth <= 768;
    const observerOptions = {
        threshold: isMobile ? 0.05 : 0.1, // Lower threshold for mobile
        rootMargin: isMobile ? '0px 0px -20px 0px' : '0px 0px -50px 0px' // Less margin for mobile
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Disconnect observer for this element to improve performance
                observer.unobserve(entry.target);

                // Optimized staggered animation using requestAnimationFrame
                const animatedElements = entry.target.querySelectorAll('.highlight-box, .contact-info, .dog-photo');
                animatedElements.forEach((element, index) => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            element.style.opacity = '1';
                            element.style.transform = 'translateY(0)';
                        }, index * 50); // Reduced from 100ms to 50ms for snappier feel
                    });
                });
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });

    // Initialize animated elements with hidden state
    document.querySelectorAll('.highlight-box, .contact-info, .dog-photo').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    // Optimized parallax effect with better performance
    let ticking = false;
    const header = document.querySelector('.header'); // Cache DOM query

    function updateParallax() {
        if (header) {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.3; // Reduced intensity for subtler effect
            header.style.transform = `translate3d(0, ${rate}px, 0)`; // Use translate3d for hardware acceleration
        }
        ticking = false;
    }

    function requestParallaxUpdate() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    // Enable parallax on larger screens only and respect motion preferences
    if (window.innerWidth > 768 && !prefersReducedMotion) {
        window.addEventListener('scroll', requestParallaxUpdate, { passive: true }); // Passive listener for better performance
    }

    // Smooth reveal animation for publication links
    const publicationLinks = document.querySelectorAll('.publication-links li');
    publicationLinks.forEach((link, index) => {
        link.style.opacity = '0';
        link.style.transform = 'translateX(-20px)';
        link.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;

        setTimeout(() => {
            link.style.opacity = '1';
            link.style.transform = 'translateX(0)';
        }, 500 + (index * 100));
    });

    // Optimized timeline animation with observer reuse
    const timelineItems = document.querySelectorAll('.timeline-item');
    if (timelineItems.length > 0) {
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            entry.target.classList.add('visible');
                        }, index * 50); // Reduced delay for snappier animations
                    });
                    // Disconnect after animating to improve performance
                    timelineObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        timelineItems.forEach(item => {
            timelineObserver.observe(item);
        });
    }

    // Add CSS for active navigation state (if not already added)
    if (!document.getElementById('animation-styles')) {
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
}

// Initialize animations when DOM is ready (fallback for direct page load)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimations);
} else {
    // DOM is already loaded, initialize immediately
    initializeAnimations();
}

// Export for use by content loader
window.initializeAnimations = initializeAnimations;