// Animations JavaScript - Scroll animations and visual effects
document.addEventListener('DOMContentLoaded', function () {

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Add staggered animation for elements within sections
                const animatedElements = entry.target.querySelectorAll('.highlight-box, .contact-info, .dog-photo');
                animatedElements.forEach((element, index) => {
                    setTimeout(() => {
                        element.style.opacity = '1';
                        element.style.transform = 'translateY(0)';
                    }, index * 100);
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

    // Parallax effect for header background
    let ticking = false;

    function updateParallax() {
        const scrolled = window.pageYOffset;
        const header = document.querySelector('.header');

        if (header) {
            const rate = scrolled * -0.5;
            header.style.transform = `translateY(${rate}px)`;
        }

        ticking = false;
    }

    function requestParallaxUpdate() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    // Enable parallax on larger screens only
    if (window.innerWidth > 768) {
        window.addEventListener('scroll', requestParallaxUpdate);
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

    // Typing effect for the tagline (optional - only if you want this effect)
    function addTypingEffect() {
        const tagline = document.querySelector('.tagline');
        if (!tagline) return;

        const text = tagline.textContent;
        tagline.textContent = '';
        tagline.style.borderRight = '2px solid #64b5f6';

        let i = 0;
        function typeWriter() {
            if (i < text.length) {
                tagline.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            } else {
                // Remove cursor after typing is complete
                setTimeout(() => {
                    tagline.style.borderRight = 'none';
                }, 1000);
            }
        }

        // Start typing after a short delay
        setTimeout(typeWriter, 1000);
    }

    // Uncomment the line below if you want the typing effect
    // addTypingEffect();

    // Add CSS for active navigation state
    const style = document.createElement('style');
    style.textContent = `
        .nav-link.active {
            background: rgba(100, 181, 246, 0.3) !important;
            border-color: #64b5f6 !important;
            color: #ffffff !important;
        }
    `;
    document.head.appendChild(style);
});