/**
 * Talks page content - Chronological presentation list with category filtering
 */

export function createTalksContent(data) {
    // Calculate total talks dynamically
    const calculatedTotalTalks = data.categories ? data.categories.reduce((sum, cat) => sum + cat.talks.length, 0) : 0;

    // Statistics overview
    const statsHtml = data.statistics ? `
        <div class="talks-overview">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${calculatedTotalTalks}</span>
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

    // Category filter buttons - all categories enabled by default (aria-pressed="true")
    const filterButtons = data.categories ? `
        <nav class="talks-filters" role="navigation" aria-label="Filter talks by category">
            <button class="filter-btn active" data-filter="all" aria-pressed="true" aria-label="Reset to show all categories, ${calculatedTotalTalks} talks total">
                All (${calculatedTotalTalks})
            </button>
            ${data.categories.map(category => `
                <button class="filter-btn talk-badge talk-badge-${category.color}" data-filter="${category.id}"
                        aria-pressed="true" aria-label="Toggle ${category.name}, ${category.talks.length} talks">
                    ${category.name} (${category.talks.length})
                </button>
            `).join('')}
        </nav>
        <div aria-live="polite" aria-atomic="true" class="sr-only" id="filter-status"></div>
    ` : '';

    // Flatten all talks into a single array with category metadata, then sort chronologically
    const allTalks = [];
    if (data.categories) {
        data.categories.forEach(category => {
            category.talks.forEach(talk => {
                allTalks.push({
                    ...talk,
                    categoryId: category.id,
                    categoryName: category.name,
                    categoryColor: category.color
                });
            });
        });
    }

    // Sort by year descending (newest first), then by month within year
    const monthOrder = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                         'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 };
    allTalks.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        // Extract month from date string (e.g., "Sep 2025" -> "Sep")
        const monthA = a.date.split(' ')[0];
        const monthB = b.date.split(' ')[0];
        return (monthOrder[monthB] || 0) - (monthOrder[monthA] || 0);
    });

    // Generate flat chronological list of all talks
    const talksListHtml = allTalks.length > 0 ? `
        <div class="talks-list" role="list">
            ${allTalks.map((talk, index) => {
                const isInvited = talk.categoryId === 'invited';
                return `
                    <article class="talk-item${isInvited ? ' invited-talk' : ''}" role="listitem"
                             data-category="${talk.categoryId}"
                             aria-labelledby="talk-${index}-title">
                        <div class="talk-header">
                            <h4 class="talk-title" id="talk-${index}-title" aria-label="${talk.title}, ${talk.type} at ${talk.event}, ${talk.date}">
                                ${talk.title}
                            </h4>
                            <div class="talk-meta">
                                <time class="talk-date" datetime="${talk.year}-${talk.date.split(' ')[0] === 'Jan' ? '01' :
                                    talk.date.split(' ')[0] === 'Feb' ? '02' :
                                    talk.date.split(' ')[0] === 'Mar' ? '03' :
                                    talk.date.split(' ')[0] === 'Apr' ? '04' :
                                    talk.date.split(' ')[0] === 'May' ? '05' :
                                    talk.date.split(' ')[0] === 'Jun' ? '06' :
                                    talk.date.split(' ')[0] === 'Jul' ? '07' :
                                    talk.date.split(' ')[0] === 'Aug' ? '08' :
                                    talk.date.split(' ')[0] === 'Sep' ? '09' :
                                    talk.date.split(' ')[0] === 'Oct' ? '10' :
                                    talk.date.split(' ')[0] === 'Nov' ? '11' : '12'}">${talk.date}</time>
                                <span class="talk-type talk-badge talk-badge-${talk.categoryColor}" role="text">${talk.type}</span>
                            </div>
                        </div>

                        <div class="talk-details" aria-describedby="talk-${index}-title">
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
                `;
            }).join('')}
        </div>
    ` : '';

    // After creating the HTML, we'll initialize the filtering
    const html = `
        ${data.tagline ? `<div class="page-intro">
            <p>${data.tagline}</p>
            ${data.note ? `<p class="note">${data.note}</p>` : ''}
        </div>` : ''}

        ${statsHtml}
        ${filterButtons}
        ${talksListHtml}
    `;

    // Initialize filtering after DOM update
    setTimeout(() => {
        initializeTalksFiltering();
    }, 100);

    return html;
}

// Initialize talks filtering functionality with toggle behavior
export function initializeTalksFiltering() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterStatus = document.getElementById('filter-status');
    if (filterBtns.length === 0) return; // No filter buttons found

    // Get all category IDs (excluding "all" button)
    const categoryBtns = Array.from(filterBtns).filter(btn => btn.dataset.filter !== 'all');
    const allCategoryIds = categoryBtns.map(btn => btn.dataset.filter);

    // Track enabled categories - all enabled by default
    const enabledCategories = new Set(allCategoryIds);

    // Function to update visibility based on enabled categories
    function updateVisibility() {
        let visibleCount = 0;
        document.querySelectorAll('.talk-item').forEach(item => {
            const catId = item.dataset.category;
            if (enabledCategories.has(catId)) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // Update button states
        categoryBtns.forEach(btn => {
            const catId = btn.dataset.filter;
            const isEnabled = enabledCategories.has(catId);
            btn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
        });

        // Update "All" button state - active only when all categories are enabled
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) {
            const allEnabled = enabledCategories.size === allCategoryIds.length;
            allBtn.classList.toggle('active', allEnabled);
            allBtn.setAttribute('aria-pressed', allEnabled ? 'true' : 'false');
        }

        // Announce change to screen readers
        if (filterStatus) {
            const enabledNames = categoryBtns
                .filter(btn => enabledCategories.has(btn.dataset.filter))
                .map(btn => btn.textContent.trim().split(' (')[0]);

            if (enabledCategories.size === allCategoryIds.length) {
                filterStatus.textContent = `Showing all ${visibleCount} talks`;
            } else if (enabledCategories.size === 0) {
                filterStatus.textContent = 'No categories selected, showing 0 talks';
            } else {
                filterStatus.textContent = `Showing ${visibleCount} talks in ${enabledNames.join(', ')}`;
            }
        }
    }

    // Function to toggle a category
    function toggleCategory(categoryId) {
        if (enabledCategories.has(categoryId)) {
            enabledCategories.delete(categoryId);
        } else {
            enabledCategories.add(categoryId);
        }
        updateVisibility();
    }

    // Function to reset all categories to enabled
    function resetAllCategories() {
        allCategoryIds.forEach(id => enabledCategories.add(id));
        updateVisibility();
    }

    // Add click and keyboard event listeners
    filterBtns.forEach((btn, index) => {
        // Click handler
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            if (filter === 'all') {
                resetAllCategories();
            } else {
                toggleCategory(filter);
            }
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
                    const filter = this.dataset.filter;
                    if (filter === 'all') {
                        resetAllCategories();
                    } else {
                        toggleCategory(filter);
                    }
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
