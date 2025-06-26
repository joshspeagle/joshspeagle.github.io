// Main JavaScript - Core functionality
function initializeMainFunctionality() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Enhanced navigation link interactions
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('mouseenter', function () {
            if (window.innerWidth > 768) { // Only on desktop
                this.style.transform = 'translateY(-2px) scale(1.05)';
            }
        });

        link.addEventListener('mouseleave', function () {
            if (window.innerWidth > 768) { // Only on desktop
                this.style.transform = 'translateY(-2px) scale(1)';
            }
        });
    });

    // Quick link hover effects
    document.querySelectorAll('.quick-link').forEach(link => {
        link.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });

        link.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(-2px) scale(1)';
        });
    });

    // Publication link hover effects
    document.querySelectorAll('.publication-links li').forEach(item => {
        item.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-3px)';
        });

        item.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(-2px)';
        });
    });

    // Back to top on logo/name click
    const nameElement = document.querySelector('.name');
    if (nameElement) {
        nameElement.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.style.cursor = 'pointer';
        });
    }
}

// Wait for content to be loaded, then initialize
document.addEventListener('DOMContentLoaded', function () {
    // The content loader will call initializeMainFunctionality after loading content
    // This is just a fallback in case the page is loaded directly with content
    if (document.querySelector('.name')) {
        initializeMainFunctionality();
    }
});

// Export for use by content loader
window.initializeMainFunctionality = initializeMainFunctionality;