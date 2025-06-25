// Navigation Toggle JavaScript - Collapsible navigation for mobile
document.addEventListener('DOMContentLoaded', function () {
    const nav = document.querySelector('.nav');
    const navToggle = document.getElementById('navToggle');
    const toggleIcon = document.getElementById('navToggleIcon');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!nav || !navToggle || !toggleIcon) {
        console.warn('Navigation toggle elements not found');
        return;
    }

    // Check if navigation should be collapsed based on screen size
    function shouldCollapseNav() {
        return window.innerWidth <= 768;
    }

    // Update active navigation link based on current section
    function updateActiveNavigation() {
        const sections = document.querySelectorAll('.section[id]');
        let current = 'about'; // Default to first section

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.pageYOffset >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });

        // Don't auto-collapse if user manually expanded the navigation
        const userExpanded = sessionStorage.getItem('navManuallyExpanded') === 'true';
        if (shouldCollapseNav() && !userExpanded) {
            nav.classList.add('nav-collapsed');
            toggleIcon.textContent = '+';
        }
    }

    // Toggle navigation expanded/collapsed state
    function toggleNavigation() {
        nav.classList.toggle('nav-collapsed');
        const isCollapsed = nav.classList.contains('nav-collapsed');
        toggleIcon.textContent = isCollapsed ? '+' : '−';

        // Store both collapse state and manual expansion flag
        sessionStorage.setItem('navCollapsed', isCollapsed);
        sessionStorage.setItem('navManuallyExpanded', !isCollapsed);

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

            // Always start collapsed on mobile
            nav.classList.add('nav-collapsed');
            toggleIcon.textContent = '+';
        } else {
            navToggle.style.display = 'none';
            nav.classList.remove('nav-collapsed');
            toggleIcon.textContent = '−';
        }
    }

    // Auto-collapse navigation when clicking a link (on mobile)
    function handleNavLinkClick() {
        if (shouldCollapseNav()) {
            // Reset manual expansion flag when user clicks a link
            sessionStorage.removeItem('navManuallyExpanded');

            setTimeout(() => {
                nav.classList.add('nav-collapsed');
                toggleIcon.textContent = '+';
                sessionStorage.setItem('navCollapsed', 'true');
            }, 300);
        }
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
});