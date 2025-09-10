// Enhanced Navigation Toggle JavaScript - Supports dropdown navigation and multi-page sites
function initializeNavigation() {
    const nav = document.querySelector('.nav');
    const navToggle = document.getElementById('navToggle');
    const toggleIcon = document.getElementById('navToggleIcon');
    const navLinks = document.querySelectorAll('.nav-link:not(.dropdown-toggle)');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    if (!nav || !navToggle || !toggleIcon) {
        console.warn('Navigation toggle elements not found');
        return;
    }

    // Check if navigation should be collapsed based on screen size
    function shouldCollapseNav() {
        return window.innerWidth <= 768;
    }

    // Get current page type for highlighting
    function getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('mentorship')) return 'mentorship';
        if (path.includes('publications')) return 'publications';
        if (path.includes('talks')) return 'talks';
        if (path.includes('teaching')) return 'teaching';
        return 'home';
    }

    // Update active navigation link based on current section or page
    function updateActiveNavigation() {
        const currentPage = getCurrentPage();
        
        // Clear all active states
        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
        dropdownToggles.forEach(toggle => toggle.classList.remove('active'));

        if (currentPage === 'home') {
            // Home page - highlight based on scroll position
            const sections = document.querySelectorAll('.section[id]');
            let current = 'about'; // Default to first section

            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                if (window.pageYOffset >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        } else {
            // Sub-page - highlight appropriate dropdown item and parent
            const dropdownItems = document.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(item => {
                const href = item.getAttribute('href');
                if (href && href.includes(currentPage)) {
                    item.classList.add('active');
                    // Also highlight the parent dropdown toggle
                    const parentDropdown = item.closest('.nav-dropdown');
                    if (parentDropdown) {
                        const parentToggle = parentDropdown.querySelector('.dropdown-toggle');
                        if (parentToggle) {
                            parentToggle.classList.add('active');
                        }
                    }
                }
            });
        }

        // Don't auto-collapse if user manually expanded the navigation
        const userExpanded = sessionStorage.getItem('navManuallyExpanded') === 'true';
        if (shouldCollapseNav() && !userExpanded) {
            nav.classList.add('nav-collapsed');
            toggleIcon.textContent = '+';
            
            // Also close any open dropdowns
            document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }
    }

    // Toggle navigation expanded/collapsed state
    function toggleNavigation() {
        nav.classList.toggle('nav-collapsed');
        const isCollapsed = nav.classList.contains('nav-collapsed');

        // Add/remove manual expansion marker
        if (isCollapsed) {
            nav.classList.remove('nav-expanded');
        } else {
            nav.classList.add('nav-expanded');
        }

        toggleIcon.textContent = isCollapsed ? '+' : '−';

        // Visual feedback
        navToggle.style.transform = 'scale(0.9)';
        setTimeout(() => {
            navToggle.style.transform = 'scale(1)';
        }, 100);
    }

    // Apply mobile navigation state
    function applyMobileNavState() {
        if (shouldCollapseNav()) {
            navToggle.style.display = 'flex';

            // Only auto-collapse if not manually expanded
            if (!nav.classList.contains('nav-expanded')) {
                nav.classList.add('nav-collapsed');
                toggleIcon.textContent = '+';
            }
        } else {
            navToggle.style.display = 'none';
            nav.classList.remove('nav-collapsed', 'nav-expanded');
            toggleIcon.textContent = '−';
        }
    }

    // Auto-collapse navigation when clicking a link (on mobile)
    function handleNavLinkClick() {
        if (shouldCollapseNav()) {
            setTimeout(() => {
                nav.classList.add('nav-collapsed');
                nav.classList.remove('nav-expanded'); // Clear manual expansion
                toggleIcon.textContent = '+';
                
                // Also close any open dropdowns
                document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                    dropdown.classList.remove('open');
                    dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
                });
            }, 300);
        }
    }

    // Handle dropdown item clicks (close dropdown and collapse mobile nav)
    function handleDropdownItemClick() {
        // Close the dropdown
        const dropdown = this.closest('.nav-dropdown');
        if (dropdown) {
            dropdown.classList.remove('open');
            dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        }
        
        // Handle mobile collapse
        handleNavLinkClick();
    }

    // Event listeners
    navToggle.addEventListener('click', toggleNavigation);
    navToggle.addEventListener('touchend', function (e) {
        e.preventDefault();
        toggleNavigation();
    });

    // Add click handlers to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
    });

    // Add click handlers to dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', handleDropdownItemClick);
    });

    // Update active navigation on scroll
    window.addEventListener('scroll', updateActiveNavigation);
    window.addEventListener('resize', applyMobileNavState);

    // Initialize
    window.addEventListener('load', function () {
        updateActiveNavigation(); // Set initial active section
        applyMobileNavState();     // Apply mobile state after active section is set
    });

    // Also initialize immediately
    updateActiveNavigation();
    applyMobileNavState();
}

// Initialize navigation when DOM is ready (fallback for direct page load)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
    // DOM is already loaded, initialize immediately
    initializeNavigation();
}

// Export for use by content loader
window.initializeNavigation = initializeNavigation;