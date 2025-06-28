// Circuit Animations JavaScript - Simple scroll effects and node management

(function () {
    // Initialize circuit animations
    function initCircuitAnimations() {
        // Add circuit nodes to sections
        addCircuitNodes();

        // Set up simple scroll observers
        setupScrollObservers();

        // Add navigation scroll detection
        setupNavigationScroll();

        // Fix timeline rendering
        fixTimelineRendering();
    }

    // Add navigation scroll detection
    function setupNavigationScroll() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        let lastScrollY = 0;
        let ticking = false;

        function updateNav() {
            const scrollY = window.scrollY;

            if (scrollY > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            lastScrollY = scrollY;
            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateNav);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick);

        // Initial check
        updateNav();
    }

    // Add subtle circuit connection nodes to sections
    function addCircuitNodes() {
        const sections = document.querySelectorAll('.section');

        sections.forEach(section => {
            // Only add nodes if they don't exist
            if (!section.querySelector('.circuit-node')) {
                const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

                positions.forEach(position => {
                    const node = document.createElement('div');
                    node.className = `circuit-node ${position}`;
                    section.appendChild(node);
                });
            }
        });
    }

    // Simple scroll observer for fade-in effect
    function setupScrollObservers() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe sections
        document.querySelectorAll('.section').forEach(section => {
            observer.observe(section);
        });

        // Observe timeline items
        document.querySelectorAll('.timeline-item').forEach(item => {
            observer.observe(item);
        });
    }

    // Ensure timeline renders properly
    function fixTimelineRendering() {
        const timelineItems = document.querySelectorAll('.timeline-item');

        timelineItems.forEach((item, index) => {
            // Force reflow to ensure pseudo-elements render
            item.style.display = 'none';
            item.offsetHeight; // Trigger reflow
            item.style.display = '';

            // Add slight delay to stagger appearance
            item.style.transitionDelay = `${index * 0.1}s`;
        });
    }

    // Public API
    window.circuitAnimations = {
        init: initCircuitAnimations,
        refresh: function () {
            addCircuitNodes();
            setupScrollObservers();
            fixTimelineRendering();
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCircuitAnimations);
    } else {
        initCircuitAnimations();
    }

    // Handle dynamic content changes
    const mutationObserver = new MutationObserver(() => {
        // Debounce to avoid excessive calls
        clearTimeout(window.circuitRefreshTimeout);
        window.circuitRefreshTimeout = setTimeout(() => {
            window.circuitAnimations.refresh();
        }, 100);
    });

    // Observe changes to main container
    const container = document.querySelector('.container');
    if (container) {
        mutationObserver.observe(container, {
            childList: true,
            subtree: true
        });
    }
})();