// Enhanced Content Loader - Dynamically loads content from JSON with dropdown and page support
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Add loading indicator
        document.body.classList.add('loading');
        
        // Initialize keyboard navigation for all pages
        initializeKeyboardNavigation();
        
        // Add theme change listener to update publication icons
        window.addEventListener('themeChanged', function(event) {
            updatePublicationIcons();
        });

        // Determine current page type
        const currentPage = window.currentPage || 'home';

        // Load the content JSON with error handling
        const response = await fetch('assets/data/content.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Validate data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid content data structure');
        }

        // Populate header for all pages
        populateHeader(data.header);

        // Populate quick links (always shown for navigation)
        populateQuickLinks(data.quickLinks);

        // Populate navigation (always shown)
        populateNavigation(data.navigation);

        // Populate content based on page type
        if (currentPage === 'home') {
            // Populate all sections for home page
            populateSections(data.sections);
        } else {
            // Populate specific page content
            populatePageContent(currentPage, data);
        }

        // Populate footer
        populateFooter(data.footer);

        // Remove loading indicator
        document.body.classList.remove('loading');

        // Announce page load completion to screen readers
        const pageTitle = document.title;
        const currentPageType = window.currentPage || 'home';
        let pageDescription = '';
        
        switch (currentPageType) {
            case 'home':
                pageDescription = 'Home page loaded with about, research, collaboration and biography sections';
                break;
            case 'publications':
                pageDescription = 'Publications page loaded with research metrics and publication list';
                break;
            case 'mentorship':
                pageDescription = 'Mentorship page loaded with supervision overview and mentee information';
                break;
            case 'talks':
                pageDescription = 'Talks page loaded with presentation history';
                break;
            case 'teaching':
                pageDescription = 'Teaching page loaded with course information and philosophy';
                break;
            default:
                pageDescription = 'Page loaded successfully';
        }
        
        announceToScreenReader(`${pageTitle}. ${pageDescription}`);

        // Re-initialize all functionality after content is loaded
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            if (typeof initializeMainFunctionality === 'function') {
                initializeMainFunctionality();
            }
            if (typeof initializeAnimations === 'function') {
                initializeAnimations();
            }
            if (typeof initializeNavigation === 'function') {
                initializeNavigation();
            }

            // Listen for theme changes to update publication icons
            window.addEventListener('themeChanged', () => {
                updatePublicationIcons();
            });
        });

    } catch (error) {
        console.error('Error loading content:', error);

        // Remove loading indicator
        document.body.classList.remove('loading');

        // User-friendly error handling
        const errorContainer = document.createElement('div');
        errorContainer.innerHTML = `
            <div style="text-align: center; padding: 50px; color: var(--text-primary);">
                <h2>Content Loading Error</h2>
                <p>We're having trouble loading the page content. Please try:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li>Refreshing the page</li>
                    <li>Checking your internet connection</li>
                    <li>Trying again in a few moments</li>
                </ul>
                <button onclick="window.location.reload()" style="background: var(--accent-blue); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px;">
                    Refresh Page
                </button>
            </div>
        `;
        document.body.appendChild(errorContainer);
    }
});

function populateHeader(header) {
    const headerContent = document.querySelector('.header-content');
    if (headerContent && header) {
        headerContent.innerHTML = `
            <h1 class="name">${header.name}</h1>
            <p class="chinese-name">${header.chineseName}</p>
            <p class="tagline">${header.tagline}</p>
        `;
    }
}

function populateQuickLinks(quickLinks) {
    const quickLinksContainer = document.querySelector('.quick-links-inline');
    if (quickLinksContainer && quickLinks) {
        quickLinksContainer.innerHTML = quickLinks.map(link => {
            if (link.dropdown && link.items) {
                // Create dropdown for quick links
                const dropdownItems = link.items.map(subItem => {
                    if (subItem.disabled) {
                        return `<span class="dropdown-item disabled" title="${subItem.disabledReason || 'Coming soon'}">${subItem.text}</span>`;
                    } else {
                        return `<a href="${subItem.href}" class="dropdown-item">${subItem.text}</a>`;
                    }
                }).join('');

                return `
                    <div class="quick-link-dropdown">
                        <button class="quick-link-inline dropdown-toggle" aria-expanded="false" aria-haspopup="true" aria-label="${link.ariaLabel}">
                            ${link.icon} ${link.text}
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div class="dropdown-menu">
                            ${dropdownItems}
                        </div>
                    </div>
                `;
            } else if (link.icon === 'github') {
                return `
                    <a href="${link.url}" class="quick-link-inline" aria-label="${link.ariaLabel}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                        ${link.text}
                    </a>
                `;
            } else {
                return `<a href="${link.url}" class="quick-link-inline" aria-label="${link.ariaLabel}">${link.icon} ${link.text}</a>`;
            }
        }).join('');

        // Initialize dropdowns for quick links if they exist
        initializeQuickLinkDropdowns();
    }
}

function populateNavigation(navigation) {
    const navContainer = document.querySelector('.nav-container');
    if (navContainer && navigation) {
        // Check if we're on an individual page (not home)
        const currentPage = window.currentPage || 'home';

        if (currentPage === 'home') {
            // Home page: show full navigation
            const navLinks = navigation.map(item =>
                `<a href="${item.href}" class="nav-link">${item.text}</a>`
            ).join('');

            navContainer.innerHTML = navLinks + `
                <button class="nav-toggle" id="navToggle" type="button" aria-label="Toggle navigation">
                    <span id="navToggleIcon">+</span>
                </button>
            `;
        } else {
            // Individual pages: show only "Back to Home" button
            navContainer.innerHTML = `
                <a href="index.html" class="nav-link home-button">
                    <span class="home-icon">←</span> Back to Home
                </a>
                <button class="nav-toggle" id="navToggle" type="button" aria-label="Toggle navigation">
                    <span id="navToggleIcon">+</span>
                </button>
            `;
        }
    }
}

function initializeQuickLinkDropdowns() {
    const quickLinkDropdowns = document.querySelectorAll('.quick-link-dropdown');

    quickLinkDropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');

        if (toggle && menu) {
            toggle.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const isOpen = dropdown.classList.contains('open');

                // Close all other dropdowns
                document.querySelectorAll('.quick-link-dropdown.open').forEach(openDropdown => {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('open');
                        openDropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
                    }
                });

                // Toggle current dropdown
                if (isOpen) {
                    dropdown.classList.remove('open');
                    this.setAttribute('aria-expanded', 'false');
                } else {
                    dropdown.classList.add('open');
                    this.setAttribute('aria-expanded', 'true');
                }
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.quick-link-dropdown')) {
            document.querySelectorAll('.quick-link-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }
    });
}

function initializeDropdowns() {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const dropdown = this.parentNode;
            const menu = dropdown.querySelector('.dropdown-menu');
            const isOpen = dropdown.classList.contains('open');

            // Close all other dropdowns
            document.querySelectorAll('.nav-dropdown.open').forEach(openDropdown => {
                if (openDropdown !== dropdown) {
                    openDropdown.classList.remove('open');
                    openDropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle current dropdown
            if (isOpen) {
                dropdown.classList.remove('open');
                this.setAttribute('aria-expanded', 'false');
            } else {
                dropdown.classList.add('open');
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Keyboard navigation for accessibility
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            } else if (e.key === 'Escape') {
                const dropdown = this.parentNode;
                dropdown.classList.remove('open');
                this.setAttribute('aria-expanded', 'false');
                this.focus();
            }
        });
    });
}

function populateSections(sections) {
    // About Section
    const aboutSection = document.getElementById('about');
    if (aboutSection && sections.about) {
        const about = sections.about;
        aboutSection.innerHTML = `
            <div class="intro-grid" role="region" aria-labelledby="about-heading">
                <section role="main" aria-labelledby="about-heading">
                    <h2 id="about-heading" class="section-title">${about.title}</h2>
                    <p aria-describedby="about-highlight">${about.content}</p>
                    
                    <aside class="highlight-box" role="complementary" aria-labelledby="highlight-heading">
                        <h3 id="highlight-heading">${about.highlightBox.title}</h3>
                        <p id="about-highlight">${about.highlightBox.content}</p>
                    </aside>
                    
                    <address class="contact-info" role="contentinfo" aria-labelledby="contact-heading">
                        <h3 id="contact-heading">${about.contactInfo.title}</h3>
                        <p><strong>Email:</strong> <a href="mailto:${about.contactInfo.email}" aria-label="Send email to ${about.contactInfo.email}">${about.contactInfo.email}</a></p>
                        <p><strong>Office:</strong> <span aria-label="Office location">${about.contactInfo.office}</span></p>
                    </address>
                </section>
                <figure class="profile-figure" role="img" aria-labelledby="profile-caption">
                    <img src="${about.profileImage.src}" alt="${about.profileImage.alt}" class="profile-image">
                    <figcaption id="profile-caption" style="text-align: center; font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.8;">
                        ${about.profileImage.credit} <a href="${about.profileImage.creditLink}" aria-label="Photo credit link">${about.profileImage.creditName}</a>
                    </figcaption>
                </figure>
            </div>
        `;
    }

    // Team Section
    const teamSection = document.getElementById('team');
    if (teamSection && sections.team) {
        const team = sections.team;
        teamSection.innerHTML = `
            <div class="art-showcase" role="region" aria-labelledby="team-heading">
                <figure class="art-logo" role="img" aria-labelledby="team-logo-caption">
                    <img src="${team.logo.src}" alt="${team.logo.alt}" class="art-logo-img">
                    <figcaption id="team-logo-caption" class="sr-only">Astrostatistics Research Team logo</figcaption>
                </figure>
                <section class="art-content" aria-labelledby="team-heading">
                    <h2 id="team-heading" class="section-title">${team.title}</h2>
                    <p class="art-tagline" aria-describedby="team-description">${team.tagline}</p>
                    
                    <p id="team-description">${team.content}</p>
                    
                    <div class="art-highlights" role="list" aria-label="Team highlights">
                        ${team.highlights.map((highlight, index) => `
                            <article class="art-highlight" role="listitem" aria-labelledby="highlight-${index}-title">
                                <h4 id="highlight-${index}-title">${highlight.icon} ${highlight.title}</h4>
                                <p aria-describedby="highlight-${index}-title">${highlight.content}</p>
                            </article>
                        `).join('')}
                    </div>
                    
                    <nav class="art-cta" role="navigation" aria-label="Team related links">
                        ${team.cta.map(button => `
                            <a href="${button.url}" 
                               class="art-button${button.type === 'secondary' ? '-secondary' : ''}"
                               aria-label="${button.text} - opens ${button.url.includes('http') ? 'external link' : 'page'}"
                               ${button.url.includes('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${button.text}</a>
                        `).join('')}
                    </nav>
                </section>
            </div>
        `;
    }

    // Research Section
    const researchSection = document.getElementById('research');
    if (researchSection && sections.research) {
        const research = sections.research;
        researchSection.innerHTML = `
            <section role="region" aria-labelledby="research-heading">
                <h2 id="research-heading" class="section-title">${research.title}</h2>
                
                <p aria-describedby="research-areas-list">${research.intro}</p>
                <ul id="research-areas-list" class="research-areas" role="list" aria-label="Research focus areas">
                    ${research.areas.map((area, index) => `
                        <li role="listitem" aria-labelledby="area-${index}-title">
                            <strong id="area-${index}-title">${area.icon} ${area.title}:</strong> 
                            <span aria-describedby="area-${index}-title">${area.description}</span>
                        </li>
                    `).join('')}
                </ul>
                
                <p>${research.additionalContent}</p>
                
                <aside class="highlight-box" role="complementary" aria-labelledby="publications-heading">
                    <h3 id="publications-heading">${research.publications.title}</h3>
                    <p aria-describedby="publications-cards">${research.publications.intro}</p>
                    <div id="publications-cards" class="publication-cards" role="list" aria-label="Key publications">
                        ${research.publications.links.map(pub => createPublicationCard(pub)).join('')}
                    </div>
                </aside>
            </section>
        `;
    }

    // Collaboration Section
    const collaborationSection = document.getElementById('collaboration');
    if (collaborationSection && sections.collaboration) {
        const collab = sections.collaboration;
        collaborationSection.innerHTML = `
            <section role="region" aria-labelledby="collaboration-heading">
                <h2 id="collaboration-heading" class="section-title">${collab.title}</h2>
                
                <p aria-describedby="values-section">${collab.intro}</p>
                
                <aside class="highlight-box" role="complementary" aria-labelledby="values-heading">
                    <h3 id="values-heading"><strong>${collab.values.title}</strong></h3>
                    <div class="two-column" role="list" aria-label="Collaboration values">
                        ${collab.values.items.map((value, index) => `
                            <article role="listitem" aria-labelledby="value-${index}-title">
                                <h4 id="value-${index}-title">${value.title}</h4>
                                <p aria-describedby="value-${index}-title">${value.content}</p>
                            </article>
                        `).join('')}
                    </div>
                </aside>
                
                <aside id="values-section" class="highlight-box" role="complementary" aria-labelledby="opportunities-heading">
                    <h3 id="opportunities-heading">${collab.opportunities.title}</h3>
                    <div role="list" aria-label="Collaboration opportunities">
                        ${collab.opportunities.categories.map(category => createOpportunityCategory(category)).join('')}
                    </div>
                </aside>
            </section>
        `;
    }

    // Biography Section
    const bioSection = document.getElementById('bio');
    if (bioSection && sections.biography) {
        const bio = sections.biography;
        bioSection.innerHTML = `
            <section role="region" aria-labelledby="bio-heading">
                <h2 id="bio-heading" class="section-title">${bio.title}</h2>
                
                <div class="timeline-container" role="list" aria-label="Career timeline">
                    <div class="timeline-line" aria-hidden="true"></div>
                    ${bio.timeline.map(item => createTimelineItem(item)).join('')}
                </div>
                
                <p aria-labelledby="personal-note">${bio.personalNote}</p>
                
                <aside class="dog-photos" role="complementary" aria-labelledby="personal-photos-heading">
                    <h3 id="personal-photos-heading" class="sr-only">Personal Photos</h3>
                    ${bio.dogPhotos.map((photo, index) => `
                        <figure class="dog-photo" role="img" aria-labelledby="photo-${index}-caption">
                            <img src="${photo.src}" alt="${photo.alt}">
                            <figcaption id="photo-${index}-caption">
                                ${photo.caption} ${photo.creditLink ? `<a href="${photo.creditLink}" aria-label="Photo credit link">${photo.creditName}</a>` : ''}
                            </figcaption>
                        </figure>
                    `).join('')}
                </aside>
            </section>
        `;
    }
}

function createPublicationCard(pub) {
    const iconSvg = getPublicationIcon(pub.icon);
    return `
        <a href="${pub.url}" class="publication-card" aria-label="View publications on ${pub.name}">
            <div class="card-icon">
                ${iconSvg}
            </div>
            <div class="card-content">
                <h4>${pub.name}</h4>
                <p>${pub.description}</p>
            </div>
            <div class="card-arrow">→</div>
        </a>
    `;
}

function getPublicationIcon(iconType) {
    // Check current theme
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';

    const icons = {
        'ads': `<svg width="40" height="40" viewBox="0 0 100 100">
            <circle cx="40" cy="40" r="25" stroke="${isLightMode ? '#1976D2' : '#64b5f6'}" stroke-width="4" fill="none"/>
            <line x1="57" y1="57" x2="75" y2="75" stroke="${isLightMode ? '#1976D2' : '#64b5f6'}" stroke-width="6" stroke-linecap="round"/>
            <text x="40" y="48" font-family="Arial, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="${isLightMode ? '#1976D2' : '#64b5f6'}">a</text>
        </svg>`,
        'scholar': `<svg width="40" height="40" viewBox="0 0 100 100">
            <path d="M50 20 L20 35 L20 45 C20 45 20 70 50 70 C80 70 80 45 80 45 L80 35 Z" stroke="${isLightMode ? '#1976D2' : '#4285f4'}" stroke-width="3" fill="none"/>
            <path d="M20 35 L50 20 L80 35" stroke="${isLightMode ? '#1976D2' : '#4285f4'}" stroke-width="3" fill="none"/>
            <path d="M65 30 L65 15 L70 15 L70 33" stroke="${isLightMode ? '#1976D2' : '#4285f4'}" stroke-width="3" fill="none"/>
        </svg>`,
        'arxiv': `<svg width="40" height="40" viewBox="0 0 100 100">
            <text x="50" y="58" font-family="Georgia, serif" font-size="26" text-anchor="middle" fill="#b31b1b" font-weight="500">arXiv</text>
        </svg>`,
        'orcid': `<svg width="40" height="40" viewBox="0 0 256 256" fill="#A6CE39">
            <path d="M256,128c0,70.7-57.3,128-128,128S0,198.7,0,128S57.3,0,128,0S256,57.3,256,128z"/>
            <path fill="white" d="M86.3,186.2H70.9V79.1h15.4v107.1z M78.6,66.9c-5.2,0-9.4-4.2-9.4-9.4s4.2-9.4,9.4-9.4s9.4,4.2,9.4,9.4S83.8,66.9,78.6,66.9z M194.5,186.2h-26.5c-1.6,0-2.8-1.3-2.8-2.8V128c0-13.1-4.7-22-14.4-22c-10.4,0-15.6,7-15.6,22v55.4c0,1.5-1.3,2.8-2.8,2.8h-26.5c-1.6,0-2.8-1.3-2.8-2.8V79.1c0-1.5,1.3-2.8,2.8-2.8h25.4c1.6,0,2.8,1.3,2.8,2.8v9.5h0.4c5.7-8.8,16.4-14,27.9-14c21.3,0,35,14,35,41.4v67.5C197.3,184.9,196.1,186.2,194.5,186.2z"/>
        </svg>`
    };
    return icons[iconType] || '';
}

function createOpportunityCategory(category) {
    let html = `
        <h4>${category.title}</h4>
        <p>${category.content}</p>
    `;

    if (category.fellowships) {
        html += `<p><strong>${category.fellowships.intro}</strong> `;
        html += category.fellowships.links.map(link =>
            `<a href="${link.url}">${link.name}</a>${link.note ? ` (${link.note})` : ''}`
        ).join(', ');
        html += '</p>';
    }

    if (category.programs) {
        html += `<p><strong>${category.programs.intro}</strong> `;
        html += category.programs.links.map(link =>
            `<a href="${link.url}">${link.name}</a>`
        ).join(', ');
        html += '</p>';
    }

    if (category.subcategories) {
        category.subcategories.forEach(subcat => {
            html += `<p><strong>${subcat.title}</strong> `;
            html += subcat.opportunities.map(opp => {
                if (opp.url) {
                    return `<a href="${opp.url}">${opp.name}</a>${opp.abbr ? ` (${opp.abbr})` : ''}`;
                } else {
                    return `${opp.name}${opp.note ? ` (${opp.note})` : ''}`;
                }
            }).join(', ');
            html += '</p>';
        });
    }

    return html;
}

function createTimelineItem(item) {
    const itemId = item.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `
        <article class="timeline-item ${item.position}" role="listitem" aria-labelledby="timeline-${itemId}-title">
            <div class="timeline-dot${item.current ? ' current' : ''}" aria-hidden="true"></div>
            <div class="timeline-content${item.current ? ' current' : ''}">
                <h3 id="timeline-${itemId}-title">${item.title}</h3>
                <time class="timeline-date" datetime="${item.date}">${item.date}</time>
                <p aria-describedby="timeline-${itemId}-title">${item.content}</p>
                <div class="timeline-location" aria-label="Location: ${item.location}">📍 ${item.location}</div>
            </div>
        </article>
    `;
}

function populatePageContent(pageType, data) {
    // Set page title and description
    if (data.pages && data.pages[pageType]) {
        const pageInfo = data.pages[pageType];
        document.title = `${pageInfo.title} | Joshua S. Speagle`;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', pageInfo.description);
        }
    }

    // Populate page header
    const pageTitle = document.getElementById('page-title');
    const pageTagline = document.getElementById('page-tagline');

    if (data.sections && data.sections[pageType]) {
        const sectionData = data.sections[pageType];

        if (pageTitle && sectionData.title) {
            pageTitle.textContent = sectionData.title;
        }

        // Show page-specific tagline, fallback to main tagline if not available
        if (pageTagline) {
            if (sectionData && sectionData.tagline) {
                pageTagline.textContent = sectionData.tagline;
            } else if (data.header && data.header.tagline) {
                pageTagline.textContent = data.header.tagline;
            }
        }

        // Populate specific page content
        switch (pageType) {
            case 'mentorship':
                populateMentorshipSections(sectionData);
                // Initialize interactive features for mentorship page
                requestAnimationFrame(() => {
                    initializeMentorshipInteractivity();
                });
                break;
            case 'publications':
                const publicationsSection = document.getElementById(`${pageType}-content`);
                if (publicationsSection) {
                    // Try to load dynamic publication data first
                    loadPublicationsContent(publicationsSection, sectionData);
                }
                break;
            case 'talks':
                const talksSection = document.getElementById(`${pageType}-content`);
                if (talksSection) {
                    talksSection.innerHTML = createTalksContent(sectionData);
                }
                break;
            case 'teaching':
                const teachingSection = document.getElementById(`${pageType}-content`);
                if (teachingSection) {
                    teachingSection.innerHTML = createTeachingContent(sectionData);
                }
                break;
        }
    }
}

// New function to populate individual mentorship sections
function populateMentorshipSections(data) {
    // Calculate dynamic statistics from mentee data
    const stats = calculateMentorshipStats(data.menteesByStage);

    // Populate introduction section
    const introSection = document.getElementById('mentorship-intro');
    if (introSection) {
        introSection.innerHTML = createMentorshipIntro(data);
    }

    // Populate overview section
    const overviewSection = document.getElementById('mentorship-overview');
    if (overviewSection) {
        overviewSection.innerHTML = createMentorshipOverview(data, stats);
    }

    // Populate current mentees section
    const currentSection = document.getElementById('mentorship-current');
    if (currentSection) {
        currentSection.innerHTML = createCurrentMentees(data);
    }

    // Populate former mentees section (if there are any)
    const formerSection = document.getElementById('mentorship-former');
    if (formerSection && data.menteesByStage.completed && (
        (data.menteesByStage.completed.postdoctoral && data.menteesByStage.completed.postdoctoral.length > 0) ||
        (data.menteesByStage.completed.doctoral && data.menteesByStage.completed.doctoral.length > 0) ||
        (data.menteesByStage.completed.bachelors && data.menteesByStage.completed.bachelors.length > 0)
    )) {
        formerSection.innerHTML = createFormerMentees(data);
    }
}

// Create mentorship introduction content
function createMentorshipIntro(data) {
    return `
        <section role="banner" aria-labelledby="mentorship-main-heading">
            <h1 id="mentorship-main-heading" class="section-title">Mentorship & Supervision</h1>
            <p class="tagline" aria-describedby="intro-content">${data.tagline}</p>
            <div class="intro-text" role="region" aria-labelledby="mentorship-main-heading">
                <p id="intro-content">${data.introduction.content}</p>
            </div>
        </section>
    `;
}

// Create mentorship overview content
function createMentorshipOverview(data, stats) {
    return `
        <section role="region" aria-labelledby="overview-heading">
            <h2 id="overview-heading" class="section-title">Overview</h2>
            <div class="supervision-overview-container">
                <section class="supervision-stats" role="region" aria-labelledby="stats-heading">
                    <h3 id="stats-heading">Supervision Overview</h3>
                    <div class="stats-column" role="list" aria-label="Supervision statistics">
                        <div class="stat" role="listitem" aria-labelledby="total-stat">
                            <strong id="total-stat" aria-describedby="total-desc">${stats.total}</strong>
                            <span id="total-desc">Total</span>
                        </div>
                        <div class="stat" role="listitem" aria-labelledby="current-stat">
                            <strong id="current-stat" aria-describedby="current-desc">${stats.current}</strong>
                            <span id="current-desc">Current</span>
                        </div>
                        <div class="stat" role="listitem" aria-labelledby="former-stat">
                            <strong id="former-stat" aria-describedby="former-desc">${stats.completed}</strong>
                            <span id="former-desc">Former</span>
                        </div>
                    </div>
                </section>
                
                <section class="career-stage-breakdowns" role="region" aria-labelledby="breakdown-heading">
                    <h3 id="breakdown-heading">Career Stage Breakdown</h3>
                    <div class="dual-chart-container" role="img" aria-labelledby="charts-description">
                        <p id="charts-description" class="sr-only">Bar charts showing distribution of mentees by career stage for current and former supervision</p>
                        <div class="chart-section" role="img" aria-labelledby="current-chart-title">
                            <h4 id="current-chart-title">Current</h4>
                            <div class="chart-container" aria-label="Current mentees by career stage">
                                ${createInteractiveBarChart(countCurrentMentees(data.menteesByStage))}
                            </div>
                        </div>
                        <div class="chart-section" role="img" aria-labelledby="former-chart-title">
                            <h4 id="former-chart-title">Former</h4>
                            <div class="chart-container" aria-label="Former mentees by career stage">
                                ${createInteractiveBarChart(countFormerMentees(data.menteesByStage.completed))}
                            </div>
                        </div>
                    </div>
                    <div class="shared-legend" role="list" aria-label="Chart legend">
                        <div class="legend-item" role="listitem">
                            <span class="legend-color postdoc" aria-hidden="true"></span>
                            <span>Postdoctoral</span>
                        </div>
                        <div class="legend-item" role="listitem">
                            <span class="legend-color doctoral" aria-hidden="true"></span>
                            <span>Doctoral/Masters</span>
                        </div>
                        <div class="legend-item" role="listitem">
                            <span class="legend-color bachelors" aria-hidden="true"></span>
                            <span>Bachelors/Other</span>
                        </div>
                    </div>
                </section>
            </div>
        </section>
    `;
}

// Create current mentees content
function createCurrentMentees(data) {
    return `
        <section role="region" aria-labelledby="current-mentees-heading">
            <h2 id="current-mentees-heading" class="section-title">Current Mentees</h2>
            ${createMenteeSection('Postdoctoral Researchers', data.menteesByStage.postdoctoral, 'postdoc')}
            ${createMenteeSection('Doctoral & Masters Students', data.menteesByStage.doctoral, 'doctoral')}
            ${createMenteeSection('Bachelors Students & Other Researchers', data.menteesByStage.bachelors, 'bachelors')}
        </section>
    `;
}

// Create former mentees content
function createFormerMentees(data) {
    return `
        <section role="region" aria-labelledby="former-mentees-heading">
            <h2 id="former-mentees-heading" class="section-title">Former Mentees</h2>
            ${createMenteeSection('Postdoctoral Researchers', data.menteesByStage.completed.postdoctoral, 'postdoc', true)}
            ${createMenteeSection('Doctoral & Masters Students', data.menteesByStage.completed.doctoral, 'doctoral', true)}
            ${createMenteeSection('Bachelors Students & Other Researchers', data.menteesByStage.completed.bachelors, 'bachelors', true)}
        </section>
    `;
}

function createMenteeSection(title, mentees, type, isCompleted = false) {
    if (!mentees || mentees.length === 0) return '';

    // Filter out placeholder entries
    const realMentees = mentees.filter(mentee => mentee.privacy !== 'placeholder');
    const sectionId = title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    if (realMentees.length === 0 && mentees.length > 0) {
        return `
            <section class="mentee-section" role="region" aria-labelledby="${sectionId}-heading">
                <h4 id="${sectionId}-heading">${title}</h4>
                <p class="privacy-note" role="note"><em>Mentee information will be displayed with appropriate permissions.</em></p>
            </section>
        `;
    }

    if (realMentees.length === 0) return '';

    return `
        <section class="mentee-section" role="region" aria-labelledby="${sectionId}-heading">
            <h4 id="${sectionId}-heading">${title}</h4>
            <div class="mentee-cards" role="list" aria-label="Mentees in ${title} category">
                ${realMentees.map(mentee => createMenteeCard(mentee, type, isCompleted)).join('')}
            </div>
        </section>
    `;
}

function createMenteeCard(mentee, type, isCompleted = false) {
    // Determine if this mentee uses the new multiple projects format
    const hasMultipleProjects = mentee.projects && Array.isArray(mentee.projects);

    // Generate supervision badge with career stage context
    // For multiple projects, use the first project's supervision type or fall back to legacy field
    const primarySupervisionType = hasMultipleProjects ?
        (mentee.projects[0]?.supervisionType || mentee.supervisionType) :
        mentee.supervisionType;

    const supervisionLevel = primarySupervisionType === 'Primary Supervisor' ? 'primary' :
        primarySupervisionType === 'Co-Supervisor' ? 'co' : 'secondary';
    const supervisionBadge = `<span class="supervision-badge ${supervisionLevel} ${type}-context" role="status" aria-label="Supervision type: ${primarySupervisionType}">${primarySupervisionType}</span>`;

    // Generate projects content
    let projectsContent;
    if (hasMultipleProjects) {
        // Multiple projects format - keep same styling as single projects
        const projectLabel = type === 'bachelors' ? 'Project' : 'Research Interests';
        projectsContent = '';

        mentee.projects.forEach((project, index) => {
            // Each project gets the same format as single projects
            projectsContent += `<p class="project"><strong>${projectLabel}:</strong> ${project.title}</p>`;

            // Co-supervisors on separate line, matching single-project format
            if (project.coSupervisors && project.coSupervisors.length > 0) {
                projectsContent += `<p class="co-supervisors">Co-supervisors: ${project.coSupervisors.join(', ')}</p>`;
            }
        });
    } else {
        // Legacy single project format
        const projectLabel = type === 'bachelors' ? 'Project' : 'Research Interests';
        projectsContent = `<p class="project"><strong>${projectLabel}:</strong> ${mentee.project}</p>`;

        // Legacy co-supervisors (separate from project)
        const coSupervisorsText = mentee.coSupervisors && mentee.coSupervisors.length > 0
            ? `<p class="co-supervisors">Co-supervisors: ${mentee.coSupervisors.join(', ')}</p>`
            : '';
        projectsContent += coSupervisorsText;
    }

    // Combine fellowships/positions into a single inline block
    const awards = mentee.fellowships || mentee.scholarships || [];
    const awardsText = awards && awards.length > 0
        ? `<div class="position-info" role="list" aria-label="Awards and fellowships">${awards.map(award => `<span class="position-badge" role="listitem">${award}</span>`).join('')}</div>`
        : '';

    // Remove redundant "Status:" label for current mentees, keep "Outcome:" for former
    const statusText = isCompleted
        ? (mentee.outcome && mentee.outcome.trim() !== '' ? `<p class="outcome"><strong>Outcome:</strong> ${mentee.outcome}</p>` : '') +
        (mentee.currentStatus && mentee.currentStatus.trim() !== '' ? `<p class="current-status">${mentee.currentStatus}</p>` : '')
        : (mentee.currentStatus && mentee.currentStatus.trim() !== '' ? `<p class="current-status">${mentee.currentStatus}</p>` : '');

    const menteeId = mentee.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `
        <article class="mentee-card ${type}" role="listitem" aria-labelledby="mentee-${menteeId}-name">
            <header class="mentee-header">
                <h5 id="mentee-${menteeId}-name" class="mentee-name">${mentee.name}</h5>
                <time class="timeline" datetime="${mentee.timelinePeriod}">${mentee.timelinePeriod}</time>
            </header>
            
            <div class="badge-row" role="group" aria-labelledby="mentee-${menteeId}-name">
                ${supervisionBadge}
                ${awardsText}
            </div>
            
            <div class="mentee-content" aria-describedby="mentee-${menteeId}-name">
                ${projectsContent}
                ${statusText}
                <p class="career-context" role="note"><em>My role: ${mentee.myCareerStage}</em></p>
            </div>
        </article>
    `;
}

// Dynamic statistics calculation function
function calculateMentorshipStats(menteesByStage) {
    // Use our new counting functions
    const currentCounts = countCurrentMentees(menteesByStage);
    const formerCounts = countFormerMentees(menteesByStage.completed || {});

    const totalCurrent = currentCounts.postdoctoral + currentCounts.doctoral + currentCounts.bachelors;
    const totalCompleted = formerCounts.postdoctoral + formerCounts.doctoral + formerCounts.bachelors;
    const totalOverall = totalCurrent + totalCompleted;

    return {
        total: totalOverall,
        current: totalCurrent,
        completed: totalCompleted,
        breakdown: {
            postdoctoral: currentCounts.postdoctoral + formerCounts.postdoctoral,
            doctoral: currentCounts.doctoral + formerCounts.doctoral,
            bachelors: currentCounts.bachelors + formerCounts.bachelors
        }
    };
}

// Simple counting function for current mentees
function countCurrentMentees(menteesByStage) {
    console.log('countCurrentMentees called with:', menteesByStage);
    if (!menteesByStage) {
        console.log('No menteesByStage data');
        return { postdoctoral: 0, doctoral: 0, bachelors: 0 };
    }

    const postdoctoral = (menteesByStage.postdoctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const doctoral = (menteesByStage.doctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const bachelors = (menteesByStage.bachelors || []).filter(m => m.privacy !== 'placeholder').length;

    const result = { postdoctoral, doctoral, bachelors };
    console.log('countCurrentMentees result:', result);
    return result;
}

// Simple counting function for former mentees
function countFormerMentees(completedMentees) {
    console.log('countFormerMentees called with:', completedMentees);
    if (!completedMentees) {
        console.log('No completedMentees data');
        return { postdoctoral: 0, doctoral: 0, bachelors: 0 };
    }

    const postdoctoral = (completedMentees.postdoctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const doctoral = (completedMentees.doctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const bachelors = (completedMentees.bachelors || []).filter(m => m.privacy !== 'placeholder').length;

    const result = { postdoctoral, doctoral, bachelors };
    console.log('countFormerMentees result:', result);
    return result;
}

// Simple bar chart function
function createInteractiveBarChart(counts) {
    console.log('createInteractiveBarChart called with counts:', counts);

    // Handle empty data
    const total = counts.postdoctoral + counts.doctoral + counts.bachelors;
    console.log('Total count:', total);
    if (total === 0) {
        console.log('Returning no-data message');
        return '<p class="no-data">No mentee data available</p>';
    }

    // Calculate heights - use 150px max height for good visibility
    const maxCount = Math.max(counts.postdoctoral, counts.doctoral, counts.bachelors);
    const maxHeight = 150;
    console.log('Max count:', maxCount, 'Max height:', maxHeight);

    // Calculate individual bar heights with square root scaling for better visual comparison
    const maxSqrt = Math.sqrt(maxCount);
    const postdocHeight = maxCount > 0 ? Math.max((Math.sqrt(counts.postdoctoral) / maxSqrt) * maxHeight, 15) : 0;
    const doctoralHeight = maxCount > 0 ? Math.max((Math.sqrt(counts.doctoral) / maxSqrt) * maxHeight, 15) : 0;
    const bachelorsHeight = maxCount > 0 ? Math.max((Math.sqrt(counts.bachelors) / maxSqrt) * maxHeight, 15) : 0;

    console.log('Calculated heights:', { postdocHeight, doctoralHeight, bachelorsHeight });

    return `
        <div class="vertical-bar-chart">
            <div class="bars-container">
                <div class="bar-column">
                    <div class="bar-segment postdoc" style="height: ${postdocHeight}px;"></div>
                    <div class="count">${counts.postdoctoral}</div>
                </div>
                <div class="bar-column">
                    <div class="bar-segment doctoral" style="height: ${doctoralHeight}px;"></div>
                    <div class="count">${counts.doctoral}</div>
                </div>
                <div class="bar-column">
                    <div class="bar-segment bachelors" style="height: ${bachelorsHeight}px;"></div>
                    <div class="count">${counts.bachelors}</div>
                </div>
            </div>
        </div>
    `;
}

function formatDataSources(sources) {
    const sourceMapping = {
        'google_scholar': 'Google Scholar',
        'ads': 'ADS',
        'openalex': 'OpenAlex'
    };

    return sources.map(source => sourceMapping[source] || source).join(' & ');
}

async function loadPublicationsContent(publicationsSection, staticData) {
    try {
        // Show loading state
        publicationsSection.innerHTML = '<div class="loading-indicator">Loading publication data...</div>';

        // Try to fetch dynamic publication data and mentorship data in parallel
        const [publicationsResponse, mentorshipResponse] = await Promise.all([
            fetch('assets/data/publications_data.json'),
            fetch('assets/data/content.json')
        ]);

        if (publicationsResponse.ok) {
            const dynamicData = await publicationsResponse.json();
            
            // Get mentorship data for student categorization
            let mentorshipData = {};
            if (mentorshipResponse.ok) {
                const contentData = await mentorshipResponse.json();
                mentorshipData = contentData.mentorship || {};
            }

            // Create enhanced content with dynamic data
            publicationsSection.innerHTML = createDynamicPublicationsContent(dynamicData, staticData);

            // Initialize statistics dashboard
            console.log('Checking for PublicationsStats:', !!window.PublicationsStats);
            console.log('Publications data exists:', !!dynamicData.publications);
            console.log('Publications count:', dynamicData.publications?.length);
            
            if (window.PublicationsStats && dynamicData.publications) {
                console.log('Initializing statistics dashboard...');
                
                // Wait for Chart.js to be fully loaded
                const initializeStats = () => {
                    try {
                        const stats = new PublicationsStats(dynamicData, mentorshipData);
                        console.log('PublicationsStats instance created:', stats);
                        stats.renderDashboard('publications-statistics');
                        console.log('Dashboard rendering initiated');
                        
                        // Store instance for potential cleanup/theme updates
                        window.currentPublicationsStats = stats;
                    } catch (error) {
                        console.error('Error initializing statistics:', error);
                    }
                };
                
                // Store publications data globally for infinite scrolling
                // Include ALL publications (not just 2020+) and exclude only featured ones
                allPublicationsData = dynamicData.publications
                    .filter(pub => pub.year && !pub.featured) 
                    .sort((a, b) => {
                        if (b.year !== a.year) return b.year - a.year; 
                        return a.title.localeCompare(b.title); 
                    });
                
                console.log('Global publications data set:', allPublicationsData.length, 'publications');
                
                // Check if Chart.js is loaded, if not wait a bit
                if (window.Chart && Chart.defaults) {
                    requestAnimationFrame(initializeStats);
                } else {
                    console.log('Waiting for Chart.js to load...');
                    setTimeout(() => {
                        if (window.Chart && Chart.defaults) {
                            requestAnimationFrame(initializeStats);
                        } else {
                            console.error('Chart.js failed to load after waiting');
                        }
                    }, 500);
                }
                
                // Initialize infinite scrolling for publications
                requestAnimationFrame(() => {
                    initializeInfiniteScrolling();
                    console.log('Infinite scrolling initialized for publications');
                    
                    // Announce initial publications loaded to screen readers
                    const initialCount = Math.min(20, dynamicData.publications.length); // Default display limit
                    const totalCount = dynamicData.publications.length;
                    announceToScreenReader(`Publications page loaded. Showing ${initialCount} of ${totalCount} publications.`);
                });
            } else {
                console.warn('Cannot initialize statistics dashboard:', {
                    hasPublicationsStats: !!window.PublicationsStats,
                    hasPublications: !!dynamicData.publications,
                    publicationsCount: dynamicData.publications?.length
                });
            }

            console.log('Loaded dynamic publication data:', {
                papers: dynamicData.metrics?.totalPapers,
                lastUpdated: dynamicData.lastUpdated
            });
        } else {
            // Fall back to static data
            console.log('Dynamic data not available, using static content');
            publicationsSection.innerHTML = createPublicationsContent(staticData);
        }
    } catch (error) {
        // Fall back to static data on error
        console.warn('Failed to load dynamic publication data:', error);
        publicationsSection.innerHTML = createPublicationsContent(staticData);
    }
}

function createDynamicPublicationsContent(dynamicData, staticData) {
    const metrics = dynamicData.metrics || {};
    const lastUpdated = dynamicData.lastUpdated ?
        new Date(dynamicData.lastUpdated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Unknown';

    return `
        <section class="highlight-box" role="region" aria-labelledby="research-areas-heading">
            <h3 id="research-areas-heading">${staticData.categories.title}</h3>
            <div class="content-grid" role="list" aria-label="Research areas">
                ${staticData.categories.areas.map((area, index) => `
                    <div role="listitem" aria-describedby="area-${index}-desc">
                        <h4>${area.icon} ${area.title}</h4>
                        <p id="area-${index}-desc">${area.description}</p>
                    </div>
                `).join('')}
            </div>
        </section>
        
        <section class="page-intro" role="region" aria-labelledby="overview-heading">
            <h2 id="overview-heading" class="sr-only">Publications Overview</h2>
            <div class="content-grid">
                <section role="region" aria-labelledby="metrics-heading">
                    <h3 id="metrics-heading">Research Metrics</h3>
                    <div class="metrics-grid" role="list" aria-label="Publication metrics">
                        <div class="metric" role="listitem">
                            <strong aria-describedby="publications-desc">${metrics.totalPapers || staticData.metrics.totalPapers}</strong>
                            <span id="publications-desc">Publications</span>
                        </div>
                        <div class="metric" role="listitem">
                            <strong aria-describedby="citations-desc">${metrics.totalCitations || staticData.metrics.citations}</strong>
                            <span id="citations-desc">Citations</span>
                        </div>
                        <div class="metric" role="listitem">
                            <strong aria-describedby="hindex-desc">${metrics.hIndex || staticData.metrics.hIndex}</strong>
                            <span id="hindex-desc">h-index</span>
                        </div>
                        <div class="metric" role="listitem">
                            <strong aria-describedby="i10index-desc">${metrics.i10Index || 'N/A'}</strong>
                            <span id="i10index-desc">i10-index</span>
                        </div>
                    </div>
                    <p><em>Last updated: <time datetime="${dynamicData.lastUpdated || ''}">${lastUpdated}</time></em></p>
                    ${metrics.sources ? `<p><small>Data sources: ${formatDataSources(metrics.sources)}</small></p>` : ''}
                </section>
                
                <nav role="navigation" aria-labelledby="pub-links-heading">
                    <h3 id="pub-links-heading">Publication Links</h3>
                    <div class="publication-links" role="list">
                        <a href="${staticData.links.ads}" class="pub-link pub-link-horizontal" role="listitem" aria-label="View publications on ADS">
                            <div class="link-icon">${getPublicationIcon('ads')}</div>
                            <span>Astrophysics Data System</span>
                        </a>
                        <a href="${staticData.links.scholar}" class="pub-link pub-link-horizontal" role="listitem" aria-label="View publications on Google Scholar">
                            <div class="link-icon">${getPublicationIcon('scholar')}</div>
                            <span>Google Scholar</span>
                        </a>
                        <a href="${staticData.links.orcid}" class="pub-link pub-link-horizontal" role="listitem" aria-label="View ORCID profile">
                            <div class="link-icon">${getPublicationIcon('orcid')}</div>
                            <span>ORCID Profile</span>
                        </a>
                    </div>
                </nav>
            </div>
        </section>
        
        <section id="publications-statistics" role="region" aria-labelledby="stats-heading">
            <h2 id="stats-heading" class="sr-only">Publication Statistics</h2>
            <!-- Statistics dashboard will be rendered here -->
        </section>
        
        ${createFeaturedPublications(dynamicData, staticData)}
        
        ${createRecentPublications(dynamicData)}
    `;
}

function createFeaturedPublications(dynamicData, staticData) {
    const publications = dynamicData.publications || [];

    // Find publications marked as featured (no limit)
    const featuredPapers = publications
        .filter(pub => pub.featured === true)
        .sort((a, b) => {
            // Sort featured papers by year descending, then by title
            if (b.year !== a.year) return b.year - a.year;
            return a.title.localeCompare(b.title);
        });

    // Fallback to static data if no featured papers in dynamic data
    if (featuredPapers.length === 0 && staticData.featured && staticData.featured.papers) {
        return createStaticFeaturedPublications(staticData);
    }

    if (featuredPapers.length === 0) {
        return '';
    }

    return `
        <section class="highlight-box" role="region" aria-labelledby="featured-heading">
            <h3 id="featured-heading">Featured Publications</h3>
            <div class="featured-publications" role="list" aria-label="Featured publications list">
                ${featuredPapers.map(paper => {
        // Shorten author list if too long
        const authors = paper.authors || [];
        let authorString = '';
        if (authors.length === 0) {
            authorString = 'Authors not available';
        } else if (authors.length <= 4) {
            authorString = authors.join(', ');
        } else {
            authorString = authors.slice(0, 3).join(', ') + `, et al. (${authors.length} authors)`;
        }

        // Find arXiv link
        let arxivLink = '';
        if (paper.arxivId) {
            arxivLink = `https://arxiv.org/abs/${paper.arxivId}`;
        } else if (paper.scholarUrl && paper.scholarUrl.includes('arxiv')) {
            arxivLink = paper.scholarUrl;
        } else if (paper.adsUrl) {
            arxivLink = paper.adsUrl;
        }

        // Check if this is a student-led publication
        const isStudentPaper = isStudentLed(paper);
        
        // Get publication categories and create badges
        const categoryBadges = createCategoryBadges(paper);
        const studentBadge = isStudentPaper ? 
            `<span class="student-led-badge" title="Student-Led Research">🎓 Student-Led</span>` : '';
        
        // Apply student-led highlighting class if this featured paper is also student-led
        const paperClass = isStudentPaper ? 'featured-paper student-led-paper' : 'featured-paper';

        return `
                        <div class="${paperClass}">
                            <div class="paper-header">
                                <h4><a href="${arxivLink}" target="_blank" rel="noopener noreferrer">${paper.title}</a></h4>
                                <div class="paper-badges">
                                    ${categoryBadges}
                                    ${studentBadge}
                                </div>
                            </div>
                            <p class="authors">${authorString}</p>
                            <p class="paper-details">${paper.year}${paper.journal ? ` • ${paper.journal}` : ''}${paper.citations ? ` • ${paper.citations} citations` : ''}</p>
                            ${paper.abstract ? `<p class="abstract">${paper.abstract}</p>` : ''}
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

function createStaticFeaturedPublications(staticData) {
    // Fallback for static data format
    const featuredPapers = staticData.featured.papers;

    return `
        <div class="highlight-box">
            <h3>Featured Publications</h3>
            <div class="featured-publications">
                ${featuredPapers.map(paper => `
                    <div class="featured-paper">
                        <h4>${paper.title}</h4>
                        <p class="authors">${paper.authors}</p>
                        <p class="paper-details">${paper.journal} (${paper.year})</p>
                        ${paper.description ? `<p class="abstract">${paper.description}</p>` : ''}
                        <div class="paper-links">
                            ${paper.doi ? `<a href="https://doi.org/${paper.doi}" target="_blank">DOI</a>` : ''}
                            ${paper.arxiv ? `<a href="https://arxiv.org/abs/${paper.arxiv}" target="_blank">arXiv</a>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createRecentPublications(dynamicData) {
    const publications = dynamicData.publications || [];
    if (publications.length === 0) {
        return '';
    }

    // Get all publications, excluding featured ones (remove limit for infinite scrolling)
    const allPubs = publications
        .filter(pub => pub.year && !pub.featured) // Exclude featured papers, include all years
        .sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year; // Sort by year descending
            return a.title.localeCompare(b.title); // Then by title for consistency
        });

    if (allPubs.length === 0) {
        return '';
    }

    // Note: allPublicationsData is set globally in loadPublicationsContent

    // Initial batch size for lazy loading
    const initialBatchSize = 20;
    const initialPubs = allPubs.slice(0, initialBatchSize);

    return `
        <section class="highlight-box" role="region" aria-labelledby="recent-heading">
            <h3 id="recent-heading">Recent Publications (${allPubs.length} papers)</h3>
            <div id="publications-container" class="recent-publications" role="feed" aria-label="Publications list" aria-busy="false" data-total="${allPubs.length}" data-loaded="${initialPubs.length}">
                ${initialPubs.map(pub => createPublicationHTML(pub)).join('')}
            </div>
            ${allPubs.length > initialBatchSize ? `
            <div id="publications-loading" class="publications-loading" style="display: none;">
                <div class="loading-spinner"></div>
                <p>Loading more publications...</p>
            </div>
            <div id="publications-load-more" class="publications-load-more">
                <button class="load-more-btn" 
                        onclick="loadMorePublications()" 
                        onkeydown="handleLoadMoreKeydown(event)"
                        tabindex="0"
                        aria-label="Load more publications">
                    Load More Publications
                </button>
                <p class="load-more-info">Showing ${initialPubs.length} of ${allPubs.length} publications</p>
            </div>
            ` : ''}
        </div>
    `;
}

/**
 * Determine research category for a publication
 */
function getPublicationCategory(pub) {
    // First check if we have probabilistic categorization data
    if (pub.categoryProbabilities && typeof pub.categoryProbabilities === 'object') {
        // Use the primary category from researchArea field
        return pub.researchArea || 'Discovery & Understanding';
    }
    
    // Fallback to old keyword-based system for compatibility
    const keywordsMapping = {
        // Statistical Learning & AI
        "machine learning": "Statistical Learning & AI",
        "artificial intelligence": "Statistical Learning & AI",
        "neural networks": "Statistical Learning & AI",
        "deep learning": "Statistical Learning & AI",
        "pattern recognition": "Statistical Learning & AI",
        // Interpretability & Insight
        "interpretability": "Interpretability & Insight",
        "explainable ai": "Interpretability & Insight",
        "model interpretation": "Interpretability & Insight",
        "feature importance": "Interpretability & Insight",
        // Inference & Computation
        "bayesian inference": "Inference & Computation",
        "nested sampling": "Inference & Computation",
        "mcmc": "Inference & Computation",
        "monte carlo": "Inference & Computation",
        "statistical inference": "Inference & Computation",
        "computational statistics": "Inference & Computation",
        "parameter estimation": "Inference & Computation",
        // Discovery & Understanding
        "galaxy formation": "Discovery & Understanding",
        "galaxy evolution": "Discovery & Understanding",
        "stellar populations": "Discovery & Understanding",
        "astronomical surveys": "Discovery & Understanding",
        "cosmology": "Discovery & Understanding",
        "dark matter": "Discovery & Understanding",
        "star formation": "Discovery & Understanding"
    };
    
    const defaultCategory = "Discovery & Understanding";
    
    // Check title and abstract for keywords
    const searchText = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();
    
    // Find matching category based on keywords
    for (const [keyword, category] of Object.entries(keywordsMapping)) {
        if (searchText.includes(keyword.toLowerCase())) {
            return category;
        }
    }
    
    return defaultCategory;
}

/**
 * Get all significant categories for a publication (for multi-category badges)
 */
function getPublicationCategories(pub, threshold = 0.2) {
    if (pub.categoryProbabilities && typeof pub.categoryProbabilities === 'object') {
        // Return categories with probabilities above threshold, sorted by probability
        const categories = Object.entries(pub.categoryProbabilities)
            .filter(([category, prob]) => prob >= threshold)
            .sort(([, a], [, b]) => b - a)
            .map(([category, prob]) => ({ category, probability: prob }));
        
        // Always include at least the primary category
        if (categories.length === 0 && pub.researchArea) {
            categories.push({ 
                category: pub.researchArea, 
                probability: pub.categoryProbabilities[pub.researchArea] || 1.0 
            });
        }
        
        return categories;
    }
    
    // Fallback: single category from old system
    const primaryCategory = getPublicationCategory(pub);
    return [{ category: primaryCategory, probability: 1.0 }];
}

/**
 * Get category badge color scheme
 */
function getCategoryColors(category) {
    // Check if dark theme is active
    const isDarkTheme = document.body.classList.contains('dark-theme');
    
    const colorSchemes = {
        'Statistical Learning & AI': {
            bg: isDarkTheme ? '#E74C3C' : '#C0392B',        // Lighter in dark mode, darker in light mode
            bgLight: '#F1948A',
            text: '#ffffff'
        },
        'Interpretability & Insight': {
            bg: isDarkTheme ? '#16A085' : '#138D75',        // Lighter in dark mode, darker in light mode
            bgLight: '#52C4A0',
            text: '#ffffff'
        },
        'Inference & Computation': {
            bg: isDarkTheme ? '#3498DB' : '#2E86AB',        // Lighter in dark mode, darker in light mode
            bgLight: '#85C1E9',
            text: '#ffffff'
        },
        'Discovery & Understanding': {
            bg: isDarkTheme ? '#27AE60' : '#1E8449',        // Lighter in dark mode, darker in light mode
            bgLight: '#82E0AA',
            text: '#ffffff'
        }
    };
    
    return colorSchemes[category] || colorSchemes['Discovery & Understanding'];
}

/**
 * Create category badge HTML for a single category
 */
function createSingleCategoryBadge(category, probability = null, showProbability = false) {
    const colors = getCategoryColors(category);
    const shortLabels = {
        'Statistical Learning & AI': 'ML & AI',
        'Interpretability & Insight': 'Interpretability',
        'Inference & Computation': 'Inference',
        'Discovery & Understanding': 'Discovery'
    };
    
    const shortLabel = shortLabels[category] || category;
    const probabilityText = (showProbability && probability !== null) ? ` (${Math.round(probability * 100)}%)` : '';
    const title = `${category}${probabilityText}`;
    
    return `
        <span class="category-badge" 
              style="background-color: ${colors.bg}; color: ${colors.text};"
              title="${title}">
            ${shortLabel}
        </span>
    `;
}

/**
 * Create category badges HTML for multiple categories
 */
function createCategoryBadges(pub, showProbabilities = false) {
    const categories = getPublicationCategories(pub);
    
    return categories.map(({ category, probability }) => 
        createSingleCategoryBadge(category, probability, showProbabilities)
    ).join('');
}

/**
 * Create category badge HTML (legacy single-category version for compatibility)
 */
function createCategoryBadge(category) {
    return createSingleCategoryBadge(category);
}

/**
 * Check if a publication is student-led
 */
function isStudentLed(pub) {
    // Check if publication has authorship categories from ADS library data
    if (pub.authorshipCategories && Array.isArray(pub.authorshipCategories)) {
        return pub.authorshipCategories.includes('student');
    }
    
    // Fallback: heuristic based on common student names and author position
    // This is a simplified check - in practice you'd want to load actual student data
    const authors = pub.authors || [];
    if (authors.length === 0) return false;
    
    const firstAuthor = authors[0] || '';
    
    // Common student indicators (this would be replaced with actual student list)
    const studentIndicators = [
        'Yuan', 'Sanderson', 'Ting', 'Green', 'Eadie', 'Speagle'
    ];
    
    return studentIndicators.some(indicator => 
        firstAuthor.includes(indicator) && !firstAuthor.includes('Speagle')
    );
}

/**
 * Create HTML for a single publication
 */
function createPublicationHTML(pub) {
    // Check if this is a student-led publication
    const isStudentPaper = isStudentLed(pub);
    
    // Shorten author list if too long
    const authors = pub.authors || [];
    let authorString = '';
    if (authors.length === 0) {
        authorString = 'Authors not available';
    } else if (authors.length <= 4) {
        authorString = authors.join(', ');
    } else {
        authorString = authors.slice(0, 3).join(', ') + `, et al. (${authors.length} authors)`;
    }

    // Find arXiv link
    let arxivLink = '';
    if (pub.arxivId) {
        arxivLink = `https://arxiv.org/abs/${pub.arxivId}`;
    } else if (pub.scholarUrl && pub.scholarUrl.includes('arxiv')) {
        arxivLink = pub.scholarUrl;
    } else if (pub.adsUrl) {
        // Use ADS link as fallback
        arxivLink = pub.adsUrl;
    }

    // Get publication categories and create badges
    const categoryBadges = createCategoryBadges(pub);
    
    // Create student-led indicator if applicable
    const studentBadge = isStudentPaper ? 
        `<span class="student-led-badge" title="Student-Led Research">🎓 Student-Led</span>` : '';

    // Apply student-led class if applicable
    const paperClass = isStudentPaper ? 'recent-paper student-led-paper' : 'recent-paper';

    return `
        <article class="${paperClass}" role="article" aria-labelledby="paper-title-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}">
            <div class="paper-header">
                <h4 id="paper-title-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}">
                    <a href="${arxivLink}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       aria-describedby="paper-details-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}"
                       aria-label="Read paper: ${pub.title}">
                        ${pub.title}
                    </a>
                </h4>
                <div class="paper-badges" role="group" aria-label="Publication categories and attributes">
                    ${categoryBadges}
                    ${studentBadge}
                </div>
            </div>
            <p class="authors" aria-label="Authors">${authorString}</p>
            <p class="paper-details" 
               id="paper-details-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}"
               aria-label="Publication details">
               ${pub.year}${pub.journal ? ` • ${pub.journal}` : ''}${pub.citations ? ` • ${pub.citations} citations` : ''}
            </p>
        </article>
    `;
}

// Global variables for infinite scrolling
let allPublicationsData = [];
let isLoadingMore = false;

/**
 * Re-enable the load more button and restore its accessibility attributes
 */
function reEnableLoadMoreButton() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.setAttribute('aria-busy', 'false');
        loadMoreBtn.setAttribute('aria-label', 'Load more publications');
    }
}

/**
 * Enhanced keyboard navigation handler for all interactive elements
 */
function initializeKeyboardNavigation() {
    // Add keyboard support for any elements that might need it
    document.addEventListener('keydown', function(event) {
        // Handle skip links with Enter key
        if (event.target.classList.contains('skip-link') && event.key === 'Enter') {
            event.preventDefault();
            const targetId = event.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.focus();
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        // Enhance focus visibility for custom elements
        if (event.key === 'Tab') {
            // Add visible focus indicators where needed
            setTimeout(() => {
                if (document.activeElement.classList.contains('mentee-card') ||
                    document.activeElement.classList.contains('timeline-item') ||
                    document.activeElement.classList.contains('art-highlight')) {
                    document.activeElement.style.outline = '3px solid var(--accent-blue)';
                    document.activeElement.style.outlineOffset = '2px';
                }
            }, 10);
        }
    });
    
    // Remove custom outline when focus leaves
    document.addEventListener('blur', function(event) {
        if (event.target.classList.contains('mentee-card') ||
            event.target.classList.contains('timeline-item') ||
            event.target.classList.contains('art-highlight')) {
            event.target.style.outline = '';
            event.target.style.outlineOffset = '';
        }
    }, true);
}

/**
 * Handle keyboard navigation for the load more button
 */
function handleLoadMoreKeydown(event) {
    // Handle Enter and Space key presses
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); // Prevent default space scrolling
        loadMorePublications();
    }
    // Handle Escape key to announce current status
    else if (event.key === 'Escape') {
        const loadMoreInfo = document.querySelector('.load-more-info');
        if (loadMoreInfo) {
            announceToScreenReader(loadMoreInfo.textContent);
        }
    }
}

/**
 * Announce content to screen readers via ARIA live region
 */
function announceToScreenReader(message) {
    let liveRegion = document.getElementById('sr-announcements');
    
    // Create live region if it doesn't exist
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-announcements';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
    }
    
    // Clear and set new message
    liveRegion.textContent = '';
    setTimeout(() => {
        liveRegion.textContent = message;
    }, 100); // Small delay to ensure screen readers pick up the change
}

/**
 * Load more publications for infinite scrolling
 */
function loadMorePublications() {
    console.log('loadMorePublications called');
    
    // Prevent multiple simultaneous loads
    if (isLoadingMore) {
        console.log('Already loading, skipping...');
        return;
    }
    isLoadingMore = true;
    
    // Disable load more button and update its state for accessibility
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.setAttribute('aria-busy', 'true');
        loadMoreBtn.setAttribute('aria-label', 'Loading more publications, please wait');
    }
    
    // Announce to screen readers that content is loading
    announceToScreenReader('Loading more publications...');
    
    const container = document.getElementById('publications-container');
    const loadingDiv = document.getElementById('publications-loading');
    const loadMoreDiv = document.getElementById('publications-load-more');
    
    if (!container || !loadingDiv || !loadMoreDiv) {
        console.error('Required elements not found:', {
            container: !!container,
            loadingDiv: !!loadingDiv,
            loadMoreDiv: !!loadMoreDiv
        });
        // Re-enable button on error
        reEnableLoadMoreButton();
        isLoadingMore = false;
        return;
    }
    
    const totalPubs = parseInt(container.dataset.total);
    const loadedPubs = parseInt(container.dataset.loaded);
    const batchSize = 20;
    
    console.log('Load more state:', {
        totalPubs,
        loadedPubs,
        batchSize,
        allPublicationsDataLength: allPublicationsData?.length || 0
    });
    
    // Show loading indicator
    loadingDiv.style.display = 'block';
    loadMoreDiv.style.display = 'none';
    
    // Safety check
    if (!allPublicationsData || allPublicationsData.length === 0) {
        console.error('allPublicationsData is not available');
        loadingDiv.style.display = 'none';
        loadMoreDiv.style.display = 'block';
        // Re-enable button
        reEnableLoadMoreButton();
        isLoadingMore = false;
        return;
    }
    
    // Check if we've already loaded everything
    if (loadedPubs >= allPublicationsData.length) {
        console.log('All publications already loaded');
        loadingDiv.style.display = 'none';
        loadMoreDiv.style.display = 'none';
        // Re-enable button (though it will be hidden)
        reEnableLoadMoreButton();
        isLoadingMore = false;
        return;
    }
    
    // Simulate loading delay for better UX
    setTimeout(() => {
        const nextBatch = allPublicationsData.slice(loadedPubs, loadedPubs + batchSize);
        console.log('Next batch:', {
            startIndex: loadedPubs,
            endIndex: loadedPubs + batchSize,
            batchLength: nextBatch.length,
            firstTitle: nextBatch[0]?.title || 'N/A'
        });
        
        // Add new publications to container
        nextBatch.forEach(pub => {
            const pubElement = document.createElement('div');
            pubElement.innerHTML = createPublicationHTML(pub);
            container.appendChild(pubElement.firstElementChild);
        });
        
        // Update loaded count
        const newLoadedCount = loadedPubs + nextBatch.length;
        container.dataset.loaded = newLoadedCount;
        
        // Hide loading indicator
        loadingDiv.style.display = 'none';
        
        // Show/hide load more button based on remaining publications
        if (newLoadedCount < totalPubs) {
            loadMoreDiv.style.display = 'block';
            const loadMoreInfo = loadMoreDiv.querySelector('.load-more-info');
            if (loadMoreInfo) {
                loadMoreInfo.textContent = `Showing ${newLoadedCount} of ${totalPubs} publications`;
            }
        }
        
        // Initialize intersection observer for new publications if needed
        initializeInfiniteScrolling();
        
        // Announce successful loading to screen readers
        const loadedCount = Math.min(PUBLICATIONS_BATCH_SIZE, remainingCount);
        announceToScreenReader(`Loaded ${loadedCount} more publications. ${totalPubs - newLoadedCount} publications remaining.`);
        
        // Re-enable load more button and restore its state
        reEnableLoadMoreButton();
        // Focus the button for keyboard users who just used it
        const loadMoreBtn = document.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.focus();
        }
        
        // Reset loading flag
        isLoadingMore = false;
        
    }, 500); // 500ms loading delay
}

// Global intersection observer
let intersectionObserver = null;

/**
 * Initialize intersection observer for infinite scrolling
 */
function initializeInfiniteScrolling() {
    const loadMoreDiv = document.getElementById('publications-load-more');
    if (!loadMoreDiv) return;
    
    // Clean up existing observer
    if (intersectionObserver) {
        intersectionObserver.disconnect();
    }
    
    // Create intersection observer
    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoadingMore) {
                const container = document.getElementById('publications-container');
                if (container) {
                    const totalPubs = parseInt(container.dataset.total);
                    const loadedPubs = parseInt(container.dataset.loaded);
                    
                    console.log('Intersection triggered:', { loadedPubs, totalPubs, isLoadingMore });
                    
                    // Auto-load more when user scrolls near the bottom
                    if (loadedPubs < totalPubs && !isLoadingMore) {
                        // Temporarily disconnect observer to prevent multiple triggers
                        intersectionObserver.disconnect();
                        loadMorePublications();
                    }
                }
            }
        });
    }, {
        rootMargin: '200px' // Start loading 200px before the element comes into view
    });
    
    intersectionObserver.observe(loadMoreDiv);
}

function createPublicationsContent(data) {
    return `
        <div class="highlight-box">
            <h3>${data.categories.title}</h3>
            <div class="content-grid">
                ${data.categories.areas.map(area => `
                    <div>
                        <h4>${area.icon} ${area.title}</h4>
                        <p>${area.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="page-intro">
            <div class="content-grid">
                <div>
                    <h3>Research Metrics</h3>
                    <div class="metrics-grid">
                        <div class="metric">
                            <strong>${data.metrics.totalPapers}</strong>
                            <span>Publications</span>
                        </div>
                        <div class="metric">
                            <strong>${data.metrics.hIndex}</strong>
                            <span>h-index</span>
                        </div>
                        <div class="metric">
                            <strong>${data.metrics.citations}</strong>
                            <span>Citations</span>
                        </div>
                    </div>
                    <p><em>${data.metrics.note}</em></p>
                </div>
                
                <div>
                    <h3>Publication Links</h3>
                    <div class="publication-links">
                        <a href="${data.links.ads}" class="pub-link pub-link-horizontal" aria-label="View publications on ADS">
                            <div class="link-icon">${getPublicationIcon('ads')}</div>
                            <span>Astrophysics Data System</span>
                        </a>
                        <a href="${data.links.scholar}" class="pub-link pub-link-horizontal" aria-label="View publications on Google Scholar">
                            <div class="link-icon">${getPublicationIcon('scholar')}</div>
                            <span>Google Scholar</span>
                        </a>
                        <a href="${data.links.orcid}" class="pub-link pub-link-horizontal" aria-label="View ORCID profile">
                            <div class="link-icon">${getPublicationIcon('orcid')}</div>
                            <span>ORCID Profile</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="highlight-box">
            <h3>${data.featured.title}</h3>
            ${data.featured.papers.map(paper => `
                <div class="featured-paper">
                    <h4>${paper.title}</h4>
                    <p><strong>Authors:</strong> ${paper.authors}</p>
                    <p><strong>Journal:</strong> ${paper.journal} (${paper.year})</p>
                    <p>${paper.description}</p>
                    <div class="paper-links">
                        <a href="https://doi.org/${paper.doi}">DOI</a>
                        <a href="https://arxiv.org/abs/${paper.arxiv}">arXiv</a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function createTalksContent(data) {
    // Statistics overview
    const statsHtml = data.statistics ? `
        <div class="talks-overview">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${data.statistics.totalTalks}</span>
                    <span class="stat-label">Total Presentations</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${data.statistics.totalYears}</span>
                    <span class="stat-label">Years Active</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${data.statistics.countries}</span>
                    <span class="stat-label">Countries</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${data.statistics.invitedTalks}</span>
                    <span class="stat-label">Invited Talks</span>
                </div>
            </div>
        </div>
    ` : '';

    // Category filter buttons
    const totalTalks = data.totalTalks || (data.categories ? data.categories.reduce((sum, cat) => sum + cat.talks.length, 0) : 0);
    const filterButtons = data.categories ? `
        <nav class="talks-filters" role="navigation" aria-label="Filter talks by category">
            <button class="filter-btn active" data-filter="all" aria-pressed="true" aria-label="Show all categories, ${totalTalks} talks total">
                All Categories (${totalTalks})
            </button>
            ${data.categories.map(category => `
                <button class="filter-btn talk-badge talk-badge-${category.color}" data-filter="${category.id}" 
                        aria-pressed="false" aria-label="Show ${category.name}, ${category.talks.length} talks">
                    ${category.name} (${category.talks.length})
                </button>
            `).join('')}
        </nav>
        <div aria-live="polite" aria-atomic="true" class="sr-only" id="filter-status"></div>
    ` : '';

    // Generate category content
    const categoriesHtml = data.categories ? data.categories.map(category => `
        <section class="talks-category" data-category="${category.id}" aria-labelledby="category-${category.id}-heading">
            <div class="category-header">
                <h3 id="category-${category.id}-heading" role="heading" aria-level="3">
                    <span class="talk-badge talk-badge-${category.color}">${category.name}</span>
                    <span class="category-count">${category.talks.length} talks</span>
                </h3>
                <p class="category-description">${category.description}</p>
            </div>
            
            <div class="talks-list" role="list">
                ${category.talks.map((talk, index) => `
                    <article class="talk-item" role="listitem" aria-labelledby="talk-${category.id}-${index}-title">
                        <div class="talk-header">
                            <h4 class="talk-title" id="talk-${category.id}-${index}-title" aria-label="${talk.title}, ${talk.type} at ${talk.event}, ${talk.date}">
                                ${talk.title}
                            </h4>
                            <div class="talk-meta">
                                <time class="talk-date" datetime="${talk.year}-${talk.date.split(' ')[1] === 'Jan' ? '01' : 
                                    talk.date.split(' ')[1] === 'Feb' ? '02' :
                                    talk.date.split(' ')[1] === 'Mar' ? '03' :
                                    talk.date.split(' ')[1] === 'Apr' ? '04' :
                                    talk.date.split(' ')[1] === 'May' ? '05' :
                                    talk.date.split(' ')[1] === 'Jun' ? '06' :
                                    talk.date.split(' ')[1] === 'Jul' ? '07' :
                                    talk.date.split(' ')[1] === 'Aug' ? '08' :
                                    talk.date.split(' ')[1] === 'Sep' ? '09' :
                                    talk.date.split(' ')[1] === 'Oct' ? '10' :
                                    talk.date.split(' ')[1] === 'Nov' ? '11' : '12'}">${talk.date}</time>
                                <span class="talk-type talk-badge talk-badge-${category.color}" role="text">${talk.type}</span>
                            </div>
                        </div>
                        
                        <div class="talk-details" aria-describedby="talk-${category.id}-${index}-title">
                            <div class="talk-venue">
                                <strong aria-label="Event: ${talk.event}">${talk.event}</strong>
                                <span class="talk-location" aria-label="Location: ${talk.location}">${talk.location}</span>
                            </div>
                            ${talk.url ? `
                                <div class="talk-links">
                                    <a href="${talk.url}" target="_blank" rel="noopener noreferrer" class="external-link" 
                                       aria-label="View recording for ${talk.title}">
                                        View Recording
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `).join('') : '';

    // After creating the HTML, we'll initialize the filtering
    const html = `
        <div class="page-intro">
            <p>${data.tagline || "Conference presentations and public speaking engagements"}</p>
            ${data.note ? `<p class="note">${data.note}</p>` : ''}
        </div>
        
        ${statsHtml}
        ${filterButtons}
        ${categoriesHtml}
    `;
    
    // Initialize filtering after DOM update
    setTimeout(() => {
        initializeTalksFiltering();
    }, 100);
    
    return html;
}

// Initialize talks filtering functionality
function initializeTalksFiltering() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterStatus = document.getElementById('filter-status');
    if (filterBtns.length === 0) return; // No filter buttons found
    
    // Function to update filter display and announce changes
    function updateFilter(selectedBtn) {
        const filter = selectedBtn.dataset.filter;
        const filterLabel = selectedBtn.textContent.trim();
        
        // Update active button and aria-pressed states
        filterBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        selectedBtn.classList.add('active');
        selectedBtn.setAttribute('aria-pressed', 'true');
        
        // Show/hide categories and count visible talks
        let visibleCount = 0;
        document.querySelectorAll('.talks-category').forEach(category => {
            if (filter === 'all' || category.dataset.category === filter) {
                category.style.display = 'block';
                // Count talks in visible categories
                visibleCount += category.querySelectorAll('.talk-item').length;
            } else {
                category.style.display = 'none';
            }
        });
        
        // Announce change to screen readers
        if (filterStatus) {
            filterStatus.textContent = filter === 'all' ? 
                `Showing all ${visibleCount} talks` : 
                `Showing ${visibleCount} talks in ${filterLabel.split(' (')[0]} category`;
        }
    }
    
    // Add click and keyboard event listeners
    filterBtns.forEach((btn, index) => {
        // Click handler
        btn.addEventListener('click', function() {
            updateFilter(this);
        });
        
        // Keyboard navigation
        btn.addEventListener('keydown', function(e) {
            let targetIndex = index;
            
            switch(e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = (index + 1) % filterBtns.length;
                    filterBtns[targetIndex].focus();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = (index - 1 + filterBtns.length) % filterBtns.length;
                    filterBtns[targetIndex].focus();
                    break;
                case 'Home':
                    e.preventDefault();
                    filterBtns[0].focus();
                    break;
                case 'End':
                    e.preventDefault();
                    filterBtns[filterBtns.length - 1].focus();
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    updateFilter(this);
                    break;
            }
        });
        
        // Ensure proper tab order
        btn.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    
    // Update tabindex when focus changes
    filterBtns.forEach(btn => {
        btn.addEventListener('focus', function() {
            filterBtns.forEach(b => b.setAttribute('tabindex', '-1'));
            this.setAttribute('tabindex', '0');
        });
    });
}

function createTeachingContent(data) {
    return `
        <div class="page-intro">
            <div class="highlight-box">
                <h3>${data.philosophy.title}</h3>
                <p>${data.philosophy.content}</p>
            </div>
        </div>
        
        <div class="highlight-box">
            <h3>${data.courses.title}</h3>
            <div class="content-grid">
                <div>
                    <h4>Undergraduate Courses</h4>
                    ${data.courses.undergraduate.map(course => `
                        <div class="course-item">
                            <h5>${course.code}: ${course.title}</h5>
                            <p>${course.description}</p>
                        </div>
                    `).join('')}
                </div>
                <div>
                    <h4>Graduate Courses</h4>
                    ${data.courses.graduate.map(course => `
                        <div class="course-item">
                            <h5>${course.code}: ${course.title}</h5>
                            <p>${course.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="content-grid">
            <div class="highlight-box">
                <h3>${data.resources.title}</h3>
                <p>${data.resources.content}</p>
            </div>
            
            <div class="highlight-box">
                <h3>${data.workshops.title}</h3>
                <p>${data.workshops.content}</p>
            </div>
        </div>
    `;
}

function populateFooter(footer) {
    const footerElement = document.querySelector('.footer .container');
    if (footerElement && footer) {
        footerElement.innerHTML = `
            <p>${footer.copyright}</p>
            <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">
                ${footer.credit}
            </p>
        `;
    }
}

// Function to update publication icons when theme changes
function updatePublicationIcons() {
    // Update publication card icons
    const publicationCards = document.querySelectorAll('.publication-card .card-icon');
    publicationCards.forEach((iconElement, index) => {
        // Get the icon type from the card's data or rebuild from known types
        const iconTypes = ['ads', 'scholar', 'arxiv', 'orcid'];
        if (iconTypes[index]) {
            iconElement.innerHTML = getPublicationIcon(iconTypes[index]);
        }
    });
    
    // Update publication links icons (in both publications and static pages)
    const publicationLinks = document.querySelectorAll('.pub-link .link-icon');
    publicationLinks.forEach(iconElement => {
        // Determine icon type from the parent link
        const parentLink = iconElement.closest('.pub-link');
        if (parentLink) {
            const href = parentLink.getAttribute('href');
            let iconType = '';
            
            if (href.includes('ui.adsabs.harvard.edu') || href.includes('ads')) {
                iconType = 'ads';
            } else if (href.includes('scholar.google') || href.includes('scholar')) {
                iconType = 'scholar';
            } else if (href.includes('orcid.org') || href.includes('orcid')) {
                iconType = 'orcid';
            } else if (href.includes('arxiv.org') || href.includes('arxiv')) {
                iconType = 'arxiv';
            }
            
            if (iconType) {
                iconElement.innerHTML = getPublicationIcon(iconType);
            }
        }
    });
    
    // Update any other publication icons that might be present
    const allIcons = document.querySelectorAll('svg[width="40"][height="40"]');
    allIcons.forEach(iconElement => {
        // Check if this is a publication icon by looking at its content
        const iconText = iconElement.textContent;
        const iconHTML = iconElement.outerHTML;
        
        if (iconText === 'a' || iconHTML.includes('L20 35 L20 45')) {
            // This is an ADS icon
            iconElement.outerHTML = getPublicationIcon('ads');
        } else if (iconHTML.includes('L20 35 L50 20 L80 35')) {
            // This is a Google Scholar icon
            iconElement.outerHTML = getPublicationIcon('scholar');
        } else if (iconText === 'arXiv') {
            // This is an arXiv icon
            iconElement.outerHTML = getPublicationIcon('arxiv');
        } else if (iconHTML.includes('#A6CE39')) {
            // This is an ORCID icon
            iconElement.outerHTML = getPublicationIcon('orcid');
        }
    });
}

// Initialize mentorship page interactive features
function initializeMentorshipInteractivity() {
    // No interactive features needed for now
}