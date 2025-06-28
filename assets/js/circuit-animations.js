// Circuit Animations JavaScript - Scroll-triggered effects and data flow animations

(function () {
    // Initialize circuit animations
    function initCircuitAnimations() {
        // Add circuit nodes to sections
        addCircuitNodes();

        // Set up scroll observers
        setupScrollObservers();

        // Initialize navigation scroll effects
        setupNavigationEffects();

        // Add subtle parallax to circuit patterns
        setupParallaxEffects();
    }

    // Add circuit connection nodes to sections
    function addCircuitNodes() {
        const sections = document.querySelectorAll('.section');

        sections.forEach(section => {
            // Create four corner nodes
            const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

            positions.forEach(position => {
                const node = document.createElement('div');
                node.className = `circuit-node ${position}`;
                section.appendChild(node);
            });
        });
    }

    // Set up intersection observers for scroll-triggered animations
    function setupScrollObservers() {
        // Observer for data flow activation
        const dataFlowObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('data-flow-active');

                    // Stagger node animations
                    const nodes = entry.target.querySelectorAll('.circuit-node');
                    nodes.forEach((node, index) => {
                        setTimeout(() => {
                            node.style.animation = 'circuitPulse 2s ease-in-out infinite';
                            node.style.animationDelay = `${index * 0.2}s`;
                        }, index * 100);
                    });
                } else {
                    // Optional: remove class when out of view to restart animation
                    // entry.target.classList.remove('data-flow-active');
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '-50px'
        });

        // Observe all sections
        document.querySelectorAll('.section').forEach(section => {
            dataFlowObserver.observe(section);
        });

        // Observer for fade-in circuit elements
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1
        });

        // Observe fade-in elements
        document.querySelectorAll('.fade-in-circuit').forEach(element => {
            fadeInObserver.observe(element);
        });
    }

    // Navigation scroll effects
    function setupNavigationEffects() {
        const nav = document.querySelector('.nav');
        let lastScrollY = window.scrollY;
        let ticking = false;

        function updateNavigation() {
            const currentScrollY = window.scrollY;

            // Add scrolled class for data flow animation
            if (currentScrollY > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            lastScrollY = currentScrollY;
            ticking = false;
        }

        function requestUpdate() {
            if (!ticking) {
                requestAnimationFrame(updateNavigation);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestUpdate);
    }

    // Subtle parallax for circuit background patterns
    function setupParallaxEffects() {
        if (window.innerWidth <= 768) return; // Skip on mobile

        let ticking = false;
        const parallaxElements = [];

        // Create parallax data for body pseudo-elements
        const bodyBefore = { element: document.body, speed: 0.1, property: 'before' };
        parallaxElements.push(bodyBefore);

        function updateParallax() {
            const scrolled = window.pageYOffset;

            parallaxElements.forEach(item => {
                const yPos = -(scrolled * item.speed);

                // Update CSS custom property for pseudo-element positioning
                document.documentElement.style.setProperty(
                    `--circuit-parallax-${item.property}`,
                    `${yPos}px`
                );
            });

            ticking = false;
        }

        function requestParallaxUpdate() {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestParallaxUpdate);
    }

    // Enhanced hover effects for publication cards
    function enhancePublicationCards() {
        const cards = document.querySelectorAll('.publication-card');

        cards.forEach(card => {
            card.addEventListener('mouseenter', function (e) {
                // Add circuit glow effect
                this.classList.add('circuit-glow');

                // Create ripple effect from mouse position
                const rect = this.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                this.style.setProperty('--mouse-x', `${x}%`);
                this.style.setProperty('--mouse-y', `${y}%`);
            });

            card.addEventListener('mouseleave', function () {
                this.classList.remove('circuit-glow');
            });
        });
    }

    // Initialize animations based on user preference
    function respectMotionPreference() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        }
    }

    // Public API
    window.circuitAnimations = {
        init: initCircuitAnimations,
        refresh: function () {
            // Refresh animations after dynamic content load
            addCircuitNodes();
            setupScrollObservers();
            enhancePublicationCards();
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            respectMotionPreference();
            initCircuitAnimations();
            enhancePublicationCards();
        });
    } else {
        respectMotionPreference();
        initCircuitAnimations();
        enhancePublicationCards();
    }

    // Reinitialize after theme change
    window.addEventListener('themeChanged', () => {
        // Force reflow for smooth transitions
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.display = 'none';
            section.offsetHeight;
            section.style.display = '';
        });
    });
})();