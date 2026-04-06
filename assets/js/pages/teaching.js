/**
 * Teaching page content - Course history with department/level filtering
 */

/**
 * Sort academic terms chronologically (most recent year first, then Winter -> Summer -> Fall within year)
 * @param {string[]} terms - Array of term strings like "Winter 2024", "Fall 2022"
 * @returns {string[]} - Sorted array of terms
 */
function sortTermsChronologically(terms) {
    const termOrder = { 'winter': 1, 'summer': 2, 'fall': 3, 'full': 0 };

    return [...terms].sort((a, b) => {
        // Extract year (last 4-digit number in string)
        const yearA = parseInt(a.match(/\d{4}/)?.[0] || '0');
        const yearB = parseInt(b.match(/\d{4}/)?.[0] || '0');

        // Sort by year descending (most recent first)
        if (yearB !== yearA) return yearB - yearA;

        // Within same year, sort by term: Winter (1) -> Summer (2) -> Fall (3)
        const termA = a.toLowerCase().split(' ')[0];
        const termB = b.toLowerCase().split(' ')[0];
        return (termOrder[termA] || 4) - (termOrder[termB] || 4);
    });
}

export function createTeachingContent(data) {
    // No statistics needed - removed as requested

    // Department and level filter buttons
    const allDepartments = data.courseHistory.flatMap(course =>
        course.departments ? course.departments : [course.department]
    );
    const uniqueDepartments = [...new Set(allDepartments)];
    const uniqueLevels = [...new Set(data.courseHistory.map(course => course.level))];

    const filterButtons = data.courseHistory ? `
        <nav class="teaching-filters" role="navigation" aria-label="Filter courses by department and level">
            <div class="filter-section">
                <h4 class="filter-section-title">All Courses</h4>
                <button class="filter-btn active" data-filter="all" data-filter-type="general" aria-pressed="true" aria-label="Reset to show all courses, ${data.teachingStats.totalOfferings} total">
                    All Courses (${data.teachingStats.totalOfferings})
                </button>
            </div>

            <div class="filter-section">
                <h4 class="filter-section-title">By Department</h4>
                <div class="filter-buttons-row">
                    ${uniqueDepartments.map(department => {
                        const deptCourses = data.courseHistory.filter(course =>
                            (course.departments && course.departments.includes(department)) ||
                            course.department === department
                        );
                        const count = deptCourses.reduce((sum, course) => sum + course.terms.length, 0);
                        return `
                            <button class="filter-btn active dept-badge dept-badge-${department.toLowerCase().replace(' ', '-')}"
                                    data-filter="${department.toLowerCase().replace(' ', '-')}"
                                    data-filter-type="department"
                                    aria-pressed="true" aria-label="Toggle ${department} courses, ${count} offerings">
                                ${department} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="filter-section">
                <h4 class="filter-section-title">By Level</h4>
                <div class="filter-buttons-row">
                    ${uniqueLevels.map(level => {
                        const levelCourses = data.courseHistory.filter(course => course.level === level);
                        const count = levelCourses.reduce((sum, course) => sum + course.terms.length, 0);
                        return `
                            <button class="filter-btn active level-badge level-badge-${level.toLowerCase()}"
                                    data-filter="${level.toLowerCase()}"
                                    data-filter-type="level"
                                    aria-pressed="true" aria-label="Toggle ${level} courses, ${count} offerings">
                                ${level} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        </nav>
        <div aria-live="polite" aria-atomic="true" class="sr-only" id="teaching-filter-status"></div>
    ` : '';

    // Generate course history
    const courseHistoryHtml = data.courseHistory ? `
        <div class="course-history">
            ${data.courseHistory.map((course, index) => `
                <article class="course-card"
                         data-departments="${course.departments ? course.departments.map(d => d.toLowerCase().replace(' ', '-')).join(' ') : course.department.toLowerCase().replace(' ', '-')}"
                         data-level="${course.level.toLowerCase()}"
                         aria-labelledby="course-${index}-title" role="article">
                    <div class="course-header">
                        <div class="course-title-section">
                            <h4 class="course-title" id="course-${index}-title">
                                <span class="course-code">${course.code}</span>
                                ${course.title}
                            </h4>
                            <div class="course-badges">
                                <span class="level-badge level-badge-${course.level.toLowerCase()}">${course.level}</span>
                                ${course.departments ?
                                    course.departments.map(dept =>
                                        `<span class="dept-badge dept-badge-${dept.toLowerCase().replace(' ', '-')}">${dept}</span>`
                                    ).join('') :
                                    `<span class="dept-badge dept-badge-${course.department.toLowerCase().replace(' ', '-')}">${course.department}</span>`
                                }
                            </div>
                        </div>
                    </div>

                    <div class="course-details">
                        <p class="course-description">${course.description}</p>
                        <div class="course-terms">
                            <strong>Terms Taught:</strong>
                            <div class="terms-list">
                                ${sortTermsChronologically(course.terms).map(term => `
                                    <span class="term-badge">${term}</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </article>
            `).join('')}
        </div>
    ` : '';

    // Short courses & workshops with year filtering
    let shortCoursesHtml = '';
    if (data.shortCourses && data.shortCourses.length > 0) {
        // Extract unique years, sorted descending
        const allYears = [...new Set(
            data.shortCourses.flatMap(sc => sc.terms.map(t => t.match(/\d{4}/)?.[0]).filter(Boolean))
        )].sort((a, b) => b - a);
        const totalOfferings = data.shortCourses.reduce((sum, sc) => sum + sc.terms.length, 0);

        const yearFilterHtml = `
            <nav class="workshop-filters" role="navigation" aria-label="Filter workshops by year">
                <div class="filter-section">
                    <h4 class="filter-section-title">By Year</h4>
                    <div class="filter-buttons-row">
                        <button class="filter-btn active" data-filter="all" data-filter-type="workshop-year"
                                aria-pressed="true" aria-label="Show all workshops, ${totalOfferings} total">
                            All (${totalOfferings})
                        </button>
                        ${allYears.map(year => {
                            const count = data.shortCourses.reduce((sum, sc) =>
                                sum + sc.terms.filter(t => t.includes(year)).length, 0);
                            return `
                                <button class="filter-btn active" data-filter="${year}" data-filter-type="workshop-year"
                                        aria-pressed="true" aria-label="Toggle ${year} workshops, ${count} offerings">
                                    ${year} (${count})
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            </nav>
            <div aria-live="polite" aria-atomic="true" class="sr-only" id="workshop-filter-status"></div>
        `;

        shortCoursesHtml = `
            <div class="highlight-box">
                <h3>Short Courses & Workshops</h3>
                ${yearFilterHtml}
                <div class="course-history">
                    ${data.shortCourses.map((sc, index) => {
                        const scYears = [...new Set(sc.terms.map(t => t.match(/\d{4}/)?.[0]).filter(Boolean))].join(' ');
                        return `
                            <article class="course-card" data-years="${scYears}" aria-labelledby="short-course-${index}-title" role="article">
                                <div class="course-header">
                                    <div class="course-title-section">
                                        <h4 class="course-title" id="short-course-${index}-title">
                                            ${sc.title}
                                        </h4>
                                        <div class="course-badges">
                                            <span class="dept-badge dept-badge-workshop">Workshop</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="course-details">
                                    <p class="course-description">${sc.program}${sc.location ? ' — ' + sc.location : ''}</p>
                                    <div class="course-terms">
                                        <strong>Dates:</strong>
                                        <div class="terms-list">
                                            ${sortTermsChronologically(sc.terms).map(term => `
                                                <span class="term-badge">${term}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    const html = `
        <div class="page-intro">
            <div class="highlight-box">
                <h3>${data.philosophy.title}</h3>
                <p>${data.philosophy.content}</p>
            </div>
        </div>

        <div class="highlight-box">
            <h3>Teaching History</h3>
            ${filterButtons}
            ${courseHistoryHtml}
        </div>

        ${shortCoursesHtml}
    `;

    return html;
}

// Initialize teaching filtering functionality
export function initializeTeachingFiltering() {
    const filterBtns = document.querySelectorAll('.teaching-filters .filter-btn');
    const filterStatus = document.getElementById('teaching-filter-status');
    if (filterBtns.length === 0) return;

    // Get department and level filter buttons separately
    const deptBtns = Array.from(filterBtns).filter(btn => btn.dataset.filterType === 'department');
    const levelBtns = Array.from(filterBtns).filter(btn => btn.dataset.filterType === 'level');
    const allDeptIds = deptBtns.map(btn => btn.dataset.filter);
    const allLevelIds = levelBtns.map(btn => btn.dataset.filter);

    // Track enabled filters - all enabled by default
    const enabledDepartments = new Set(allDeptIds);
    const enabledLevels = new Set(allLevelIds);

    // Function to update visibility based on enabled filters
    function updateVisibility() {
        let visibleCount = 0;
        document.querySelectorAll('.course-card').forEach(card => {
            const courseDepartments = card.dataset.departments.split(' ');
            const courseLevel = card.dataset.level;

            // Course is visible if it matches ANY enabled department AND ANY enabled level
            const matchesDept = courseDepartments.some(dept => enabledDepartments.has(dept));
            const matchesLevel = enabledLevels.has(courseLevel);

            if (matchesDept && matchesLevel) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Update department button states
        deptBtns.forEach(btn => {
            const isEnabled = enabledDepartments.has(btn.dataset.filter);
            btn.classList.toggle('active', isEnabled);
            btn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
        });

        // Update level button states
        levelBtns.forEach(btn => {
            const isEnabled = enabledLevels.has(btn.dataset.filter);
            btn.classList.toggle('active', isEnabled);
            btn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
        });

        // Update "All" button state
        const allBtn = document.querySelector('.teaching-filters .filter-btn[data-filter="all"]');
        if (allBtn) {
            const allEnabled = enabledDepartments.size === allDeptIds.length && enabledLevels.size === allLevelIds.length;
            allBtn.classList.toggle('active', allEnabled);
            allBtn.setAttribute('aria-pressed', allEnabled ? 'true' : 'false');
        }

        // Announce change to screen readers
        if (filterStatus) {
            const enabledDeptNames = deptBtns
                .filter(btn => enabledDepartments.has(btn.dataset.filter))
                .map(btn => btn.textContent.trim().split(' (')[0]);
            const enabledLevelNames = levelBtns
                .filter(btn => enabledLevels.has(btn.dataset.filter))
                .map(btn => btn.textContent.trim().split(' (')[0]);

            if (enabledDepartments.size === allDeptIds.length && enabledLevels.size === allLevelIds.length) {
                filterStatus.textContent = `Showing all ${visibleCount} courses`;
            } else {
                const deptText = enabledDeptNames.length > 0 ? enabledDeptNames.join(', ') : 'no departments';
                const levelText = enabledLevelNames.length > 0 ? enabledLevelNames.join(', ') : 'no levels';
                filterStatus.textContent = `Showing ${visibleCount} courses (${deptText}; ${levelText})`;
            }
        }
    }

    // Function to toggle a filter
    function toggleFilter(filterId, filterType) {
        if (filterType === 'department') {
            if (enabledDepartments.has(filterId)) {
                enabledDepartments.delete(filterId);
            } else {
                enabledDepartments.add(filterId);
            }
        } else if (filterType === 'level') {
            if (enabledLevels.has(filterId)) {
                enabledLevels.delete(filterId);
            } else {
                enabledLevels.add(filterId);
            }
        }
        updateVisibility();
    }

    // Function to reset all filters to enabled
    function resetAllFilters() {
        allDeptIds.forEach(id => enabledDepartments.add(id));
        allLevelIds.forEach(id => enabledLevels.add(id));
        updateVisibility();
    }

    // Add click and keyboard event listeners
    filterBtns.forEach((btn, index) => {
        // Click handler
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            const filterType = this.dataset.filterType;
            if (filter === 'all') {
                resetAllFilters();
            } else {
                toggleFilter(filter, filterType);
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
                    const filterType = this.dataset.filterType;
                    if (filter === 'all') {
                        resetAllFilters();
                    } else {
                        toggleFilter(filter, filterType);
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

    // Workshop year filtering
    const workshopBtns = document.querySelectorAll('.workshop-filters .filter-btn');
    const workshopStatus = document.getElementById('workshop-filter-status');
    if (workshopBtns.length === 0) return;

    const yearBtns = Array.from(workshopBtns).filter(btn => btn.dataset.filterType === 'workshop-year' && btn.dataset.filter !== 'all');
    const allYearIds = yearBtns.map(btn => btn.dataset.filter);
    const enabledYears = new Set(allYearIds);

    function updateWorkshopVisibility() {
        let visibleCount = 0;
        document.querySelectorAll('.workshop-filters ~ .course-history .course-card').forEach(card => {
            const cardYears = (card.dataset.years || '').split(' ');
            const matches = cardYears.some(y => enabledYears.has(y));
            card.style.display = matches ? 'block' : 'none';
            if (matches) visibleCount++;
        });

        yearBtns.forEach(btn => {
            const isEnabled = enabledYears.has(btn.dataset.filter);
            btn.classList.toggle('active', isEnabled);
            btn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
        });

        const allBtn = document.querySelector('.workshop-filters .filter-btn[data-filter="all"]');
        if (allBtn) {
            const allEnabled = enabledYears.size === allYearIds.length;
            allBtn.classList.toggle('active', allEnabled);
            allBtn.setAttribute('aria-pressed', allEnabled ? 'true' : 'false');
        }

        if (workshopStatus) {
            if (enabledYears.size === allYearIds.length) {
                workshopStatus.textContent = `Showing all ${visibleCount} workshops`;
            } else {
                const years = [...enabledYears].sort((a, b) => b - a).join(', ');
                workshopStatus.textContent = `Showing ${visibleCount} workshops (${years})`;
            }
        }
    }

    workshopBtns.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            if (filter === 'all') {
                allYearIds.forEach(id => enabledYears.add(id));
            } else {
                if (enabledYears.has(filter)) {
                    enabledYears.delete(filter);
                } else {
                    enabledYears.add(filter);
                }
            }
            updateWorkshopVisibility();
        });

        btn.addEventListener('keydown', function(e) {
            let targetIndex = index;
            switch(e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = (index + 1) % workshopBtns.length;
                    workshopBtns[targetIndex].focus();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = (index - 1 + workshopBtns.length) % workshopBtns.length;
                    workshopBtns[targetIndex].focus();
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.click();
                    break;
            }
        });

        btn.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    workshopBtns.forEach(btn => {
        btn.addEventListener('focus', function() {
            workshopBtns.forEach(b => b.setAttribute('tabindex', '-1'));
            this.setAttribute('tabindex', '0');
        });
    });
}
