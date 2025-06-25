// Mobile Header JavaScript - Header toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    const header = document.getElementById('header');
    const headerToggle = document.getElementById('headerToggle');
    const toggleIcon = document.getElementById('toggleIcon');

    if (!header || !headerToggle || !toggleIcon) {
        console.warn('Mobile header elements not found');
        return;
    }

    // Check screen size and show/hide toggle accordingly
    function checkScreenSize() {
        if (window.innerWidth <= 768) {
            headerToggle.style.display = 'flex';
        } else {
            headerToggle.style.display = 'none';
            header.classList.remove('compact');
            toggleIcon.textContent = '−';
        }
    }

    // Toggle header compact state
    function toggleHeader() {
        header.classList.toggle('compact');
        toggleIcon.textContent = header.classList.contains('compact') ? '+' : '−';

        // Store preference in sessionStorage
        sessionStorage.setItem('headerCompact', header.classList.contains('compact'));
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