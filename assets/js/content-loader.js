// Content Loader - Dynamically loads content from JSON
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Load the content JSON
        const response = await fetch('assets/data/content.json');
        const data = await response.json();

        // Populate header
        populateHeader(data.header);

        // Populate quick links
        populateQuickLinks(data.quickLinks);

        // Populate navigation
        populateNavigation(data.navigation);

        // Populate sections
        populateSections(data.sections);

        // Populate footer
        populateFooter(data.footer);

        // Re-initialize all functionality after content is loaded
        // Small delay to ensure DOM is fully updated
        setTimeout(() => {
            if (typeof initializeMainFunctionality === 'function') {
                initializeMainFunctionality();
            }
            if (typeof initializeAnimations === 'function') {
                initializeAnimations();
            }
            if (typeof initializeNavigation === 'function') {
                initializeNavigation();
            }
        }, 100);

    } catch (error) {
        console.error('Error loading content:', error);
        // Fallback: show error message
        document.body.innerHTML = '<div style="text-align: center; padding: 50px;">Error loading content. Please refresh the page.</div>';
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
            if (link.icon === 'github') {
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
    }
}

function populateNavigation(navigation) {
    const navContainer = document.querySelector('.nav-container');
    if (navContainer && navigation) {
        // Keep the existing navigation links but update them
        const navLinks = navigation.map(item =>
            `<a href="${item.href}" class="nav-link">${item.text}</a>`
        ).join('');

        // Preserve the toggle button
        navContainer.innerHTML = navLinks + `
            <button class="nav-toggle" id="navToggle" type="button" aria-label="Toggle navigation">
                <span id="navToggleIcon">+</span>
            </button>
        `;
    }
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
                <span class="card-meta">${pub.meta}</span>
            </div>
            <div class="card-arrow">→</div>
        </a>
    `;
}

function getPublicationIcon(iconType) {
    const icons = {
        'ads': `<svg width="40" height="40" viewBox="0 0 100 100" fill="#64b5f6">
            <circle cx="40" cy="40" r="25" stroke="#64b5f6" stroke-width="4" fill="none"/>
            <line x1="57" y1="57" x2="75" y2="75" stroke="#64b5f6" stroke-width="6" stroke-linecap="round"/>
            <text x="40" y="48" font-family="Arial, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="#64b5f6">a</text>
        </svg>`,
        'scholar': `<svg width="40" height="40" viewBox="0 0 100 100" fill="#4285f4">
            <path d="M50 20 L20 35 L20 45 C20 45 20 70 50 70 C80 70 80 45 80 45 L80 35 Z" stroke="#4285f4" stroke-width="3" fill="none"/>
            <path d="M20 35 L50 20 L80 35" stroke="#4285f4" stroke-width="3" fill="none"/>
            <path d="M65 30 L65 15 L70 15 L70 33" stroke="#4285f4" stroke-width="3" fill="none"/>
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