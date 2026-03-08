/**
 * Home page content - About, Team, Research, Collaboration, Biography sections
 */

import { getPublicationIcon } from './shared.js';

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

function createOpportunityCard(card) {
    let html = `
        <div class="research-card" role="listitem">
            <h4>${card.title}</h4>
            <p>${card.content}</p>
    `;

    if (card.fellowships) {
        html += `<br><p><strong>${card.fellowships.intro}</strong> `;
        html += card.fellowships.links.map(link =>
            `<a href="${link.url}">${link.name}</a>${link.note ? ` (${link.note})` : ''}`
        ).join(', ');
        html += '</p>';
    }

    if (card.programs) {
        html += `<br><p><strong>${card.programs.intro}</strong> `;
        html += card.programs.links.map(link =>
            `<a href="${link.url}">${link.name}</a>`
        ).join(', ');
        html += '</p>';
    }

    if (card.opportunities) {
        html += `<br><p><strong>Programs:</strong> `;
        html += card.opportunities.map(opp => {
            if (opp.url) {
                return `<a href="${opp.url}">${opp.name}</a>${opp.abbr ? ` (${opp.abbr})` : ''}`;
            } else {
                return `${opp.name}${opp.note ? ` (${opp.note})` : ''}`;
            }
        }).join(', ');
        html += '</p>';
    }

    html += '</div>';
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

export function populateSections(sections) {
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
                    <picture>
                        <source srcset="${about.profileImage.src.replace(/\.(jpg|jpeg|png)$/i, '.webp')}" type="image/webp">
                        <img src="${about.profileImage.src}" alt="${about.profileImage.alt}" class="profile-image" width="384" height="513">
                    </picture>
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
                    <img src="${team.logo.src}" alt="${team.logo.alt}" class="art-logo-img" loading="lazy">
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

                <p>${research.intro}</p>

                <div class="content-grid" role="list" aria-label="Research focus areas">
                    ${research.areas.map((area, index) => `
                        <div class="research-card" role="listitem" aria-labelledby="area-${index}-title">
                            <h4 id="area-${index}-title">${area.icon} ${area.title}</h4>
                            <p>${area.description}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="research-context">
                    <p>${research.additionalContent}</p>
                </div>

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
                    <div class="research-grid" role="list" aria-label="Collaboration opportunities">
                        ${collab.opportunities.cards.map(card => createOpportunityCard(card)).join('')}
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
                            <picture>
                                <source srcset="${photo.src.replace(/\.(jpg|jpeg|png|JPG)$/i, '.webp')}" type="image/webp">
                                <img src="${photo.src}" alt="${photo.alt}" loading="lazy" width="800" height="533">
                            </picture>
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
