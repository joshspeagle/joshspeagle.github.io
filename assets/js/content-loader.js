// Enhanced Content Loader - Dynamically loads content from JSON with dropdown and page support
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Add loading indicator
        document.body.classList.add('loading');

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
            <div class="intro-grid">
                <div>
                    <h2 class="section-title">${about.title}</h2>
                    <p>${about.content}</p>
                    
                    <div class="highlight-box">
                        <h3>${about.highlightBox.title}</h3>
                        <p>${about.highlightBox.content}</p>
                    </div>
                    
                    <div class="contact-info">
                        <h3>${about.contactInfo.title}</h3>
                        <p><strong>Email:</strong> <a href="mailto:${about.contactInfo.email}">${about.contactInfo.email}</a></p>
                        <p><strong>Office:</strong> ${about.contactInfo.office}</p>
                    </div>
                </div>
                <div>
                    <img src="${about.profileImage.src}" alt="${about.profileImage.alt}" class="profile-image">
                    <p style="text-align: center; font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.8;">
                        ${about.profileImage.credit} <a href="${about.profileImage.creditLink}">${about.profileImage.creditName}</a>
                    </p>
                </div>
            </div>
        `;
    }

    // Team Section
    const teamSection = document.getElementById('team');
    if (teamSection && sections.team) {
        const team = sections.team;
        teamSection.innerHTML = `
            <div class="art-showcase">
                <div class="art-logo">
                    <img src="${team.logo.src}" alt="${team.logo.alt}" class="art-logo-img">
                </div>
                <div class="art-content">
                    <h2 class="section-title">${team.title}</h2>
                    <p class="art-tagline">${team.tagline}</p>
                    
                    <p>${team.content}</p>
                    
                    <div class="art-highlights">
                        ${team.highlights.map(highlight => `
                            <div class="art-highlight">
                                <h4>${highlight.icon} ${highlight.title}</h4>
                                <p>${highlight.content}</p>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="art-cta">
                        ${team.cta.map(button => `
                            <a href="${button.url}" class="art-button${button.type === 'secondary' ? '-secondary' : ''}">${button.text}</a>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Research Section
    const researchSection = document.getElementById('research');
    if (researchSection && sections.research) {
        const research = sections.research;
        researchSection.innerHTML = `
            <h2 class="section-title">${research.title}</h2>
            
            <p>${research.intro}</p>
            <ul class="research-areas">
                ${research.areas.map(area => `
                    <li><strong>${area.icon} ${area.title}:</strong> ${area.description}</li>
                `).join('')}
            </ul>
            
            <p></p>
            <p>${research.additionalContent}</p>
            
            <div class="highlight-box">
                <h3>${research.publications.title}</h3>
                <p>${research.publications.intro}</p>
                <div class="publication-cards">
                    ${research.publications.links.map(pub => createPublicationCard(pub)).join('')}
                </div>
            </div>
        `;
    }

    // Collaboration Section
    const collaborationSection = document.getElementById('collaboration');
    if (collaborationSection && sections.collaboration) {
        const collab = sections.collaboration;
        collaborationSection.innerHTML = `
            <h2 class="section-title">${collab.title}</h2>
            
            <p>${collab.intro}</p>
            
            <div class="highlight-box">
                <h3><strong>${collab.values.title}</strong></h3>
                <div class="two-column">
                    ${collab.values.items.map(value => `
                        <div>
                            <h4>${value.title}</h4>
                            <p>${value.content}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="highlight-box">
                <h3>${collab.opportunities.title}</h3>
                ${collab.opportunities.categories.map(category => createOpportunityCategory(category)).join('')}
            </div>
        `;
    }

    // Biography Section
    const bioSection = document.getElementById('bio');
    if (bioSection && sections.biography) {
        const bio = sections.biography;
        bioSection.innerHTML = `
            <h2 class="section-title">${bio.title}</h2>
            
            <div class="timeline-container">
                <div class="timeline-line"></div>
                ${bio.timeline.map(item => createTimelineItem(item)).join('')}
            </div>
            
            <p>${bio.personalNote}</p>
            
            <div class="dog-photos">
                ${bio.dogPhotos.map(photo => `
                    <div class="dog-photo">
                        <img src="${photo.src}" alt="${photo.alt}">
                        <p>${photo.caption} ${photo.creditLink ? `<a href="${photo.creditLink}">${photo.creditName}</a>` : ''}</p>
                    </div>
                `).join('')}
            </div>
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
    return `
        <div class="timeline-item ${item.position}">
            <div class="timeline-dot${item.current ? ' current' : ''}"></div>
            <div class="timeline-content${item.current ? ' current' : ''}">
                <h3>${item.title}</h3>
                <span class="timeline-date">${item.date}</span>
                <p>${item.content}</p>
                <div class="timeline-location">📍 ${item.location}</div>
            </div>
        </div>
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
        <h1 class="section-title">Mentorship & Supervision</h1>
        <p class="tagline">${data.tagline}</p>
        <div class="intro-text">
            <p>${data.introduction.content}</p>
        </div>
    `;
}

// Create mentorship overview content
function createMentorshipOverview(data, stats) {
    return `
        <h2 class="section-title">Overview</h2>
        <div class="supervision-overview-container">
            <div class="supervision-stats">
                <h3>Supervision Overview</h3>
                <div class="stats-column">
                    <div class="stat">
                        <strong>${stats.total}</strong>
                        <span>Total</span>
                    </div>
                    <div class="stat">
                        <strong>${stats.current}</strong>
                        <span>Current</span>
                    </div>
                    <div class="stat">
                        <strong>${stats.completed}</strong>
                        <span>Former</span>
                    </div>
                </div>
            </div>
            
            <div class="career-stage-breakdowns">
                <h3>Career Stage Breakdown</h3>
                <div class="dual-chart-container">
                    <div class="chart-section">
                        <h4>Current</h4>
                        <div class="chart-container">
                            ${createInteractiveBarChart(countCurrentMentees(data.menteesByStage))}
                        </div>
                    </div>
                    <div class="chart-section">
                        <h4>Former</h4>
                        <div class="chart-container">
                            ${createInteractiveBarChart(countFormerMentees(data.menteesByStage.completed))}
                        </div>
                    </div>
                </div>
                <div class="shared-legend">
                    <div class="legend-item">
                        <span class="legend-color postdoc"></span>
                        <span>Postdoctoral</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color doctoral"></span>
                        <span>Doctoral/Masters</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color bachelors"></span>
                        <span>Bachelors/Other</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Create current mentees content
function createCurrentMentees(data) {
    return `
        <h2 class="section-title">Current Mentees</h2>
        ${createMenteeSection('Postdoctoral Researchers', data.menteesByStage.postdoctoral, 'postdoc')}
        ${createMenteeSection('Doctoral & Masters Students', data.menteesByStage.doctoral, 'doctoral')}
        ${createMenteeSection('Bachelors Students & Other Researchers', data.menteesByStage.bachelors, 'bachelors')}
    `;
}

// Create former mentees content
function createFormerMentees(data) {
    return `
        <h2 class="section-title">Former Mentees</h2>
        ${createMenteeSection('Postdoctoral Researchers', data.menteesByStage.completed.postdoctoral, 'postdoc', true)}
        ${createMenteeSection('Doctoral & Masters Students', data.menteesByStage.completed.doctoral, 'doctoral', true)}
        ${createMenteeSection('Bachelors Students & Other Researchers', data.menteesByStage.completed.bachelors, 'bachelors', true)}
    `;
}

function createMenteeSection(title, mentees, type, isCompleted = false) {
    if (!mentees || mentees.length === 0) return '';

    // Filter out placeholder entries
    const realMentees = mentees.filter(mentee => mentee.privacy !== 'placeholder');
    if (realMentees.length === 0 && mentees.length > 0) {
        return `
            <div class="mentee-section">
                <h4>${title}</h4>
                <p class="privacy-note"><em>Mentee information will be displayed with appropriate permissions.</em></p>
            </div>
        `;
    }

    if (realMentees.length === 0) return '';

    return `
        <div class="mentee-section">
            <h4>${title}</h4>
            <div class="mentee-cards">
                ${realMentees.map(mentee => createMenteeCard(mentee, type, isCompleted)).join('')}
            </div>
        </div>
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
    const supervisionBadge = `<span class="supervision-badge ${supervisionLevel} ${type}-context">${primarySupervisionType}</span>`;

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
        ? `<div class="position-info">${awards.map(award => `<span class="position-badge">${award}</span>`).join('')}</div>`
        : '';

    // Remove redundant "Status:" label for current mentees, keep "Outcome:" for former
    const statusText = isCompleted
        ? (mentee.outcome && mentee.outcome.trim() !== '' ? `<p class="outcome"><strong>Outcome:</strong> ${mentee.outcome}</p>` : '') +
        (mentee.currentStatus && mentee.currentStatus.trim() !== '' ? `<p class="current-status">${mentee.currentStatus}</p>` : '')
        : (mentee.currentStatus && mentee.currentStatus.trim() !== '' ? `<p class="current-status">${mentee.currentStatus}</p>` : '');

    return `
        <div class="mentee-card ${type}">
            <div class="mentee-header">
                <h5 class="mentee-name">${mentee.name}</h5>
                <span class="timeline">${mentee.timelinePeriod}</span>
            </div>
            
            <div class="badge-row">
                ${supervisionBadge}
                ${awardsText}
            </div>
            
            <div class="mentee-content">
                ${projectsContent}
                ${statusText}
                <p class="career-context"><em>My role: ${mentee.myCareerStage}</em></p>
            </div>
        </div>
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

        // Try to fetch dynamic publication data
        const response = await fetch('assets/data/publications_data.json');

        if (response.ok) {
            const dynamicData = await response.json();

            // Create enhanced content with dynamic data
            publicationsSection.innerHTML = createDynamicPublicationsContent(dynamicData, staticData);

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
        <div class="highlight-box">
            <h3>${staticData.categories.title}</h3>
            <div class="content-grid">
                ${staticData.categories.areas.map(area => `
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
                            <strong>${metrics.totalPapers || staticData.metrics.totalPapers}</strong>
                            <span>Publications</span>
                        </div>
                        <div class="metric">
                            <strong>${metrics.totalCitations || staticData.metrics.citations}</strong>
                            <span>Citations</span>
                        </div>
                        <div class="metric">
                            <strong>${metrics.hIndex || staticData.metrics.hIndex}</strong>
                            <span>h-index</span>
                        </div>
                        <div class="metric">
                            <strong>${metrics.i10Index || 'N/A'}</strong>
                            <span>i10-index</span>
                        </div>
                    </div>
                    <p><em>Last updated: ${lastUpdated}</em></p>
                    ${metrics.sources ? `<p><small>Data sources: ${formatDataSources(metrics.sources)}</small></p>` : ''}
                </div>
                
                <div>
                    <h3>Publication Links</h3>
                    <div class="publication-links">
                        <a href="${staticData.links.ads}" class="pub-link pub-link-horizontal" aria-label="View publications on ADS">
                            <div class="link-icon">${getPublicationIcon('ads')}</div>
                            <span>Astrophysics Data System</span>
                        </a>
                        <a href="${staticData.links.scholar}" class="pub-link pub-link-horizontal" aria-label="View publications on Google Scholar">
                            <div class="link-icon">${getPublicationIcon('scholar')}</div>
                            <span>Google Scholar</span>
                        </a>
                        <a href="${staticData.links.orcid}" class="pub-link pub-link-horizontal" aria-label="View ORCID profile">
                            <div class="link-icon">${getPublicationIcon('orcid')}</div>
                            <span>ORCID Profile</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
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
        <div class="highlight-box">
            <h3>Featured Publications</h3>
            <div class="featured-publications">
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

        return `
                        <div class="featured-paper">
                            <h4><a href="${arxivLink}" target="_blank" rel="noopener noreferrer">${paper.title}</a></h4>
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

    // Get the 20 most recent publications, excluding featured ones
    const recentPubs = publications
        .filter(pub => pub.year && pub.year >= 2020 && !pub.featured) // Exclude featured papers
        .sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year; // Sort by year descending
            return a.title.localeCompare(b.title); // Then by title for consistency
        })
        .slice(0, 20);

    if (recentPubs.length === 0) {
        return '';
    }

    return `
        <div class="highlight-box">
            <h3>Recent Publications</h3>
            <div class="recent-publications">
                ${recentPubs.map(pub => {
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

        return `
                        <div class="recent-paper">
                            <h4><a href="${arxivLink}" target="_blank" rel="noopener noreferrer">${pub.title}</a></h4>
                            <p class="authors">${authorString}</p>
                            <p class="paper-details">${pub.year}${pub.journal ? ` • ${pub.journal}` : ''}${pub.citations ? ` • ${pub.citations} citations` : ''}</p>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
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
    return `
        <div class="page-intro">
            <p>Here you'll find information about conference presentations, seminars, and public talks.</p>
        </div>
        
        ${data.upcoming.events.length > 0 ? `
            <div class="highlight-box">
                <h3>${data.upcoming.title}</h3>
                ${data.upcoming.events.map(event => `
                    <div class="talk-item">
                        <h4>${event.title}</h4>
                        <p><strong>${event.event}</strong> - ${event.location} (${event.date})</p>
                        <p><em>${event.type}</em></p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="highlight-box">
            <h3>${data.recent.title}</h3>
            ${data.recent.talks.map(talk => `
                <div class="talk-item">
                    <h4>${talk.title}</h4>
                    <p><strong>${talk.event}</strong> - ${talk.location} (${talk.date})</p>
                    <p><em>${talk.type}</em></p>
                </div>
            `).join('')}
        </div>
        
        <div class="highlight-box">
            <h3>${data.categories.title}</h3>
            <div class="content-grid">
                <div>
                    <h4>Invited Talks</h4>
                    <p>${data.categories.invited}</p>
                </div>
                <div>
                    <h4>Contributed Talks</h4>
                    <p>${data.categories.contributed}</p>
                </div>
                <div>
                    <h4>Seminars</h4>
                    <p>${data.categories.seminars}</p>
                </div>
                <div>
                    <h4>Public Outreach</h4>
                    <p>${data.categories.public}</p>
                </div>
            </div>
        </div>
        
        <div class="contact-info">
            <p><em>${data.note}</em></p>
        </div>
    `;
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
    const publicationCards = document.querySelectorAll('.publication-card .card-icon');
    publicationCards.forEach((iconElement, index) => {
        // Get the icon type from the card's data or rebuild from known types
        const iconTypes = ['ads', 'scholar', 'arxiv', 'orcid'];
        if (iconTypes[index]) {
            iconElement.innerHTML = getPublicationIcon(iconTypes[index]);
        }
    });
}

// Initialize mentorship page interactive features
function initializeMentorshipInteractivity() {
    // No interactive features needed for now
}