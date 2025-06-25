// Main JavaScript - Core functionality
document.addEventListener('DOMContentLoaded', function () {

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
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });

        link.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(-2px) scale(1)';
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

    // Add active state to navigation based on scroll position
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateActiveNav() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav);

    // Initialize
    updateActiveNav();
});