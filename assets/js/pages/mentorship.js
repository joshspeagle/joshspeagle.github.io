/**
 * Mentorship page content - Supervision overview, mentee cards, lazy loading
 */

import { announceToScreenReader } from './shared.js';

// Module-level variable for lazy loading mentee data
let allMenteesData = null;

export function populateMentorshipSections(data) {
    // Store mentee data globally for lazy loading
    allMenteesData = data;

    // Calculate dynamic statistics from mentee data
    const stats = calculateMentorshipStats(data.menteesByStage);

    // Render sections progressively to avoid blocking the main thread
    // Use requestAnimationFrame to allow browser to paint between sections

    // Step 1: Render overview immediately (it's small)
    const overviewSection = document.getElementById('mentorship-overview');
    if (overviewSection) {
        overviewSection.innerHTML = createMentorshipOverview(data, stats);
    }

    // Step 2: Render current mentees after a frame
    requestAnimationFrame(() => {
        const currentSection = document.getElementById('mentorship-current');
        if (currentSection) {
            currentSection.innerHTML = createCurrentMentees(data);
        }

        // Step 3: Render former mentees after another frame (this is the largest section)
        requestAnimationFrame(() => {
            const formerSection = document.getElementById('mentorship-former');
            if (formerSection && data.menteesByStage.completed && (
                (data.menteesByStage.completed.postdoctoral && data.menteesByStage.completed.postdoctoral.length > 0) ||
                (data.menteesByStage.completed.doctoral && data.menteesByStage.completed.doctoral.length > 0) ||
                (data.menteesByStage.completed.bachelors && data.menteesByStage.completed.bachelors.length > 0)
            )) {
                formerSection.innerHTML = createFormerMentees(data);
            }
        });
    });
}

// Create mentorship introduction content (empty - just using page header now)
function createMentorshipIntro(data) {
    return '';
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
                            <span class="legend-color mastersProjects" aria-hidden="true"></span>
                            <span>Master's Projects</span>
                        </div>
                        <div class="legend-item" role="listitem">
                            <span class="legend-color bachelors" aria-hidden="true"></span>
                            <span>Bachelors/Other</span>
                        </div>
                    </div>
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
            ${createMenteeSection("Master's Projects", data.menteesByStage.mastersProjects, 'mastersProjects')}
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
            ${createMenteeSection("Master's Projects", data.menteesByStage.completed.mastersProjects, 'mastersProjects', true)}
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

    // Implement lazy loading for sections with many mentees (threshold: 20+ mentees)
    const lazyLoadThreshold = 20;
    const shouldLazyLoad = realMentees.length > lazyLoadThreshold;

    if (shouldLazyLoad) {
        const initialBatch = realMentees.slice(0, lazyLoadThreshold);
        const remainingCount = realMentees.length - lazyLoadThreshold;

        return `
            <section class="mentee-section" role="region" aria-labelledby="${sectionId}-heading">
                <h4 id="${sectionId}-heading">${title} (${realMentees.length})</h4>
                <div class="mentee-cards" role="list" aria-label="Mentees in ${title} category"
                     data-section-id="${sectionId}" data-type="${type}" data-completed="${isCompleted}">
                    ${initialBatch.map(mentee => createMenteeCard(mentee, type, isCompleted)).join('')}
                </div>
                <div class="mentee-load-more" id="load-more-${sectionId}">
                    <button class="load-more-btn" data-action="load-more-mentees"
                            data-section="${sectionId}" data-type="${type}" data-completed="${isCompleted}"
                            aria-label="Load more mentees in ${title} section">
                        Load More (${remainingCount} remaining)
                    </button>
                </div>
            </section>
        `;
    } else {
        return `
            <section class="mentee-section" role="region" aria-labelledby="${sectionId}-heading">
                <h4 id="${sectionId}-heading">${title} (${realMentees.length})</h4>
                <div class="mentee-cards" role="list" aria-label="Mentees in ${title} category">
                    ${realMentees.map(mentee => createMenteeCard(mentee, type, isCompleted)).join('')}
                </div>
            </section>
        `;
    }
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
        const projectLabel = (type === 'bachelors' || type === 'mastersProjects') ? 'Project' : 'Research Interests';
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
        const projectLabel = (type === 'bachelors' || type === 'mastersProjects') ? 'Project' : 'Research Interests';
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

    const totalCurrent = currentCounts.postdoctoral + currentCounts.doctoral + currentCounts.mastersProjects + currentCounts.bachelors;
    const totalCompleted = formerCounts.postdoctoral + formerCounts.doctoral + formerCounts.mastersProjects + formerCounts.bachelors;
    const totalOverall = totalCurrent + totalCompleted;

    return {
        total: totalOverall,
        current: totalCurrent,
        completed: totalCompleted,
        breakdown: {
            postdoctoral: currentCounts.postdoctoral + formerCounts.postdoctoral,
            doctoral: currentCounts.doctoral + formerCounts.doctoral,
            mastersProjects: currentCounts.mastersProjects + formerCounts.mastersProjects,
            bachelors: currentCounts.bachelors + formerCounts.bachelors
        }
    };
}

// Simple counting function for current mentees
function countCurrentMentees(menteesByStage) {
    if (!menteesByStage) {
        return { postdoctoral: 0, doctoral: 0, mastersProjects: 0, bachelors: 0 };
    }

    const postdoctoral = (menteesByStage.postdoctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const doctoral = (menteesByStage.doctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const mastersProjects = (menteesByStage.mastersProjects || []).filter(m => m.privacy !== 'placeholder').length;
    const bachelors = (menteesByStage.bachelors || []).filter(m => m.privacy !== 'placeholder').length;

    return { postdoctoral, doctoral, mastersProjects, bachelors };
}

// Simple counting function for former mentees
function countFormerMentees(completedMentees) {
    if (!completedMentees) {
        return { postdoctoral: 0, doctoral: 0, mastersProjects: 0, bachelors: 0 };
    }

    const postdoctoral = (completedMentees.postdoctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const doctoral = (completedMentees.doctoral || []).filter(m => m.privacy !== 'placeholder').length;
    const mastersProjects = (completedMentees.mastersProjects || []).filter(m => m.privacy !== 'placeholder').length;
    const bachelors = (completedMentees.bachelors || []).filter(m => m.privacy !== 'placeholder').length;

    return { postdoctoral, doctoral, mastersProjects, bachelors };
}

// Simple bar chart function
function createInteractiveBarChart(counts) {
    // Handle empty data
    const total = counts.postdoctoral + counts.doctoral + counts.mastersProjects + counts.bachelors;
    if (total === 0) {
        return '<p class="no-data">No mentee data available</p>';
    }

    // Calculate heights - use 150px max height for good visibility
    const maxCount = Math.max(counts.postdoctoral, counts.doctoral, counts.mastersProjects, counts.bachelors);
    const maxHeight = 150;

    // Calculate individual bar heights with square root scaling for better visual comparison
    const maxSqrt = Math.sqrt(maxCount);
    const postdocHeight = maxCount > 0 ? Math.max((Math.sqrt(counts.postdoctoral) / maxSqrt) * maxHeight, 15) : 0;
    const doctoralHeight = maxCount > 0 ? Math.max((Math.sqrt(counts.doctoral) / maxSqrt) * maxHeight, 15) : 0;
    const mastersProjectsHeight = maxCount > 0 ? Math.max((Math.sqrt(counts.mastersProjects) / maxSqrt) * maxHeight, 15) : 0;
    const bachelorsHeight = maxCount > 0 ? Math.max((Math.sqrt(counts.bachelors) / maxSqrt) * maxHeight, 15) : 0;

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
                    <div class="bar-segment mastersProjects" style="height: ${mastersProjectsHeight}px;"></div>
                    <div class="count">${counts.mastersProjects}</div>
                </div>
                <div class="bar-column">
                    <div class="bar-segment bachelors" style="height: ${bachelorsHeight}px;"></div>
                    <div class="count">${counts.bachelors}</div>
                </div>
            </div>
        </div>
    `;
}

// Initialize mentorship page interactive features
export function initializeMentorshipInteractivity() {
    // Use manual loading only - no automatic scroll-based loading
}

/**
 * Load more mentees for a specific section
 */
export function loadMoreMentees(sectionId, type, isCompleted) {
    if (!allMenteesData) {
        return;
    }

    const container = document.querySelector(`[data-section-id="${sectionId}"]`);
    const loadMoreDiv = document.getElementById(`load-more-${sectionId}`);

    if (!container || !loadMoreDiv) {
        return;
    }

    // Show loading state
    const loadMoreBtn = loadMoreDiv.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading mentees...';
        loadMoreBtn.setAttribute('aria-busy', 'true');
    }

    setTimeout(() => {
        // Get the current mentees count
        const currentMentees = container.children.length;

        // Find the right mentee data source
        let menteeSource;
        if (isCompleted) {
            if (sectionId.includes('postdoctoral')) {
                menteeSource = allMenteesData.menteesByStage.completed.postdoctoral;
            } else if (sectionId.includes('doctoral')) {
                menteeSource = allMenteesData.menteesByStage.completed.doctoral;
            } else if (sectionId.includes('mastersProjects')) {
                menteeSource = allMenteesData.menteesByStage.completed.mastersProjects;
            } else {
                menteeSource = allMenteesData.menteesByStage.completed.bachelors;
            }
        } else {
            if (sectionId.includes('postdoctoral')) {
                menteeSource = allMenteesData.menteesByStage.postdoctoral;
            } else if (sectionId.includes('doctoral')) {
                menteeSource = allMenteesData.menteesByStage.doctoral;
            } else if (sectionId.includes('mastersProjects')) {
                menteeSource = allMenteesData.menteesByStage.mastersProjects;
            } else {
                menteeSource = allMenteesData.menteesByStage.bachelors;
            }
        }

        if (!menteeSource) {
            return;
        }

        const realMentees = menteeSource.filter(mentee => mentee.privacy !== 'placeholder');
        const batchSize = 20;
        const nextBatch = realMentees.slice(currentMentees, currentMentees + batchSize);

        // Add the next batch of mentee cards
        nextBatch.forEach(mentee => {
            const menteeHTML = createMenteeCard(mentee, type, isCompleted);
            container.insertAdjacentHTML('beforeend', menteeHTML);
        });

        const newLoadedCount = currentMentees + nextBatch.length;
        const remainingCount = realMentees.length - newLoadedCount;

        // Update or remove load more button
        if (remainingCount > 0) {
            // Update button text with remaining count
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = `Load More (${remainingCount} remaining)`;
            loadMoreBtn.setAttribute('aria-busy', 'false');
        } else {
            // Remove the load more button since everything is now loaded
            loadMoreDiv.remove();
        }

        // Announce to screen readers
        announceToScreenReader(`Loaded ${nextBatch.length} more mentees. ${remainingCount > 0 ? remainingCount + ' mentees remaining.' : 'All mentees in this section are now visible.'}`);

    }, 300); // 300ms loading delay
}

// Make function globally available for event delegation
window.loadMoreMentees = loadMoreMentees;
