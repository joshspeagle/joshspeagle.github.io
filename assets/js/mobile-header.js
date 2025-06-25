// Mobile Header JavaScript - Header toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    const header = document.getElementById('header');
    const headerToggle = document.getElementById('headerToggle');
    const toggleIcon = document.getElementById('toggleIcon');

    if (!header || !headerToggle || !toggleIcon) {
        console.warn('Mobile header elements not found');
        return;
    }

    // Check screen size and apply mobile optimizations
    function checkScreenSize() {
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;

        if (isMobile) {
            headerToggle.style.display = 'flex';
            header.classList.add('mobile-default');

            // Auto-compact on very small screens like iPhone SE
            if (isSmallMobile && !header.classList.contains('compact')) {
                header.classList.add('compact');
                toggleIcon.textContent = '+';
            }
        } else {
            headerToggle.style.display = 'none';
            header.classList.remove('compact', 'mobile-default');
            toggleIcon.textContent = '−';
        }
    }

    // Toggle header compact state
    function toggleHeader() {
        header.classList.toggle('compact');
        const isCompact = header.classList.contains('compact');
        toggleIcon.textContent = isCompact ? '+' : '−';

        // Store preference in sessionStorage
        sessionStorage.setItem('headerCompact', isCompact);

        // Visual feedback
        headerToggle.style.transform = 'scale(0.9)';
        setTimeout(() => {
            headerToggle.style.transform = 'scale(1)';
        }, 100);
    }

    // Restore header state from sessionStorage
    function restoreHeaderState() {
        const isCompact = sessionStorage.getItem('headerCompact') === 'true';
        if (isCompact && window.innerWidth <= 768) {
            header.classList.add('compact');
            toggleIcon.textContent = '+';
        }
    }

    // Event listeners
    headerToggle.addEventListener('click', toggleHeader);
    headerToggle.addEventListener('touchstart', toggleHeader); // Better mobile support
    window.addEventListener('resize', checkScreenSize);

    // Initialize
    checkScreenSize();
    restoreHeaderState();

    // Optional: Auto-compact on scroll (uncomment if desired)
    /*
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        if (window.innerWidth <= 768) {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down - auto compact
                if (!header.classList.contains('compact')) {
                    header.classList.add('compact');
                    toggleIcon.textContent = '+';
                }
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        }
    });
    */
});