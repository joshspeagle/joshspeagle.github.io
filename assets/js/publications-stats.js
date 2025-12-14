/**
 * Publications Statistics Dashboard
 * 
 * Provides visualization and analysis of publication data including:
 * - Paper categorization (all/lead/significant/student/postdoc)
 * - Citation metrics over time
 * - Research area distribution
 * - Student and postdoc impact tracking
 */

class PublicationsStats {
    constructor(publicationsData, mentorshipData) {
        this.publications = publicationsData.publications || [];
        this.metrics = publicationsData.metrics || {};
        this.mentorshipData = mentorshipData;
        
        // Chart instances for cleanup
        this.charts = {};
        
        // Color schemes that adapt to light/dark themes
        this.updateColorScheme();
        
        this.init();
    }
    
    init() {
        this.categorizePublications();
        this.setupChartDefaults();
        this.setupThemeListener();
    }
    
    /**
     * Update color scheme based on current theme
     */
    updateColorScheme() {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Research category colors chosen to minimize overlap with authorship colors:
        // - Authorship uses: Blue (primary), Purple (postdoc), Orange (student), Green (contributor)
        // - Research categories use: Crimson red, Teal, Indigo, Golden yellow
        if (isDarkMode) {
            // Dark mode colors - more vibrant and contrasting
            this.colors = {
                primary: '#5BA3F5',     // Brighter blue for primary author
                postdoc: '#9333EA',     // Purple for postdoc-led (matches badge)
                student: '#FF6B35',     // Orange for student-led (matches badge)
                secondary: '#32D74B',   // Green for contributor
                accent: '#8E8E93',      // Gray for other (de-emphasized)
                line: '#5BA3F5',        // Blue for line charts
                // Research category gradients (dark mode)
                research: {
                    'Statistical Learning & AI': ['#EF5350', '#FFCDD2'],        // Crimson red gradient
                    'Interpretability & Insight': ['#26A69A', '#B2DFDB'],       // Teal gradient
                    'Inference & Computation': ['#5C6BC0', '#C5CAE9'],          // Indigo gradient
                    'Discovery & Understanding': ['#FFCA28', '#FFF9C4']         // Golden yellow gradient
                }
            };
        } else {
            // Light mode colors - softer and professional
            this.colors = {
                primary: '#007AFF',     // iOS blue for primary author
                postdoc: '#7C3AED',     // Purple for postdoc-led (darker in dark mode)
                student: '#DC582A',     // Orange for student-led (matches badge gradient)
                secondary: '#34C759',   // Green for contributor
                accent: '#8E8E93',      // Gray for other (de-emphasized)
                line: '#007AFF',        // Blue for line charts
                // Research category gradients (light mode)
                research: {
                    'Statistical Learning & AI': ['#C62828', '#FFCDD2'],        // Crimson red gradient
                    'Interpretability & Insight': ['#00897B', '#B2DFDB'],       // Teal gradient
                    'Inference & Computation': ['#3949AB', '#C5CAE9'],          // Indigo gradient
                    'Discovery & Understanding': ['#F9A825', '#FFF9C4']         // Golden yellow gradient
                }
            };
        }
    }
    
    /**
     * Set up theme change listener
     */
    setupThemeListener() {
        // Listen for theme changes
        window.addEventListener('themeChanged', (event) => {
            this.updateTheme();
        });
    }
    
    /**
     * Categorize publications into types based on ADS libraries and authorship
     * Categories are mutually exclusive in the following priority order:
     * 1. Primary author (first or second author with Speagle)
     * 2. Postdoc-led (papers in postdoc library)
     * 3. Student-led (first author is a known student)
     * 4. Non-student significant contribution (remaining papers in significant library)
     * 5. Other (remaining papers not in significant categories)
     */
    categorizePublications() {
        this.categories = {
            all: [...this.publications],
            primary: [],
            postdoc: [],
            student: [],
            nonStudentSignificant: [],
            other: [],
            byArea: {},
            byYear: {}
        };
        
        // Get student names from mentorship data
        const studentNames = this.getStudentNames();
        
        this.publications.forEach(paper => {
            const year = paper.year || 'Unknown';
            const area = paper.researchArea || 'Uncategorized';
            
            // Initialize year counters
            if (!this.categories.byYear[year]) {
                this.categories.byYear[year] = { primary: 0, postdoc: 0, student: 0, nonStudentSignificant: 0, other: 0, total: 0 };
            }
            
            // Initialize area counters for probabilistic system
            const allAreas = ['Statistical Learning & AI', 'Interpretability & Insight', 'Inference & Computation', 'Discovery & Understanding'];
            allAreas.forEach(areaName => {
                if (!this.categories.byArea[areaName]) {
                    this.categories.byArea[areaName] = { allTime: 0, lastFiveYears: 0 };
                }
            });
            
            // Use ADS library-based categorization if available
            // Now using singular 'authorshipCategory' field instead of plural
            const authorshipCategory = paper.authorshipCategory || '';

            // Determine exclusive categorization based on your requirements:
            // 1. "primary" → papers in primary category
            // 2. "postdoc" → papers in postdoc category
            // 3. "student" → papers in student category
            // 4. "significant" → papers in significant category EXCLUDING student/postdoc
            // 5. "other" → all papers EXCLUDING any other marker
            let primaryCategory = 'other';

            if (authorshipCategory) {
                // Use ADS library data with exclusive logic
                if (authorshipCategory === 'primary') {
                    primaryCategory = 'primary';
                } else if (authorshipCategory === 'postdoc') {
                    primaryCategory = 'postdoc';
                } else if (authorshipCategory === 'student') {
                    primaryCategory = 'student';
                } else if (authorshipCategory === 'significant') {
                    // Significant category excluding student/postdoc papers
                    primaryCategory = 'nonStudentSignificant';
                } else {
                    // Has category but not one we track specifically
                    primaryCategory = 'other';
                }
            } else {
                // No authorshipCategories field - use heuristic fallback
                const authors = paper.authors || [];
                const speaglePosition = authors.findIndex(author => 
                    author.includes('Speagle') || author.includes('沈佳士')
                );
                
                const isPrimary = speaglePosition >= 0 && speaglePosition <= 1;
                const isStudentLed = this.isStudentPaper(paper, studentNames);
                
                if (isPrimary) {
                    primaryCategory = 'primary';
                } else if (isStudentLed) {
                    primaryCategory = 'student';
                } else {
                    primaryCategory = 'other';
                }
            }
            
            // Add paper to primary category
            this.categories[primaryCategory].push(paper);
            this.categories.byYear[year][primaryCategory]++;
            
            // Count by area using probabilities if available, otherwise use primary category
            if (paper.categoryProbabilities && typeof paper.categoryProbabilities === 'object') {
                // Use probabilistic counts - each paper contributes fractionally to each category
                Object.entries(paper.categoryProbabilities).forEach(([categoryName, probability]) => {
                    if (this.categories.byArea[categoryName]) {
                        this.categories.byArea[categoryName].allTime += probability;
                        
                        // Count last 5 years (current year - 4 to current year)
                        const currentYear = new Date().getFullYear();
                        if (year >= currentYear - 4) {
                            this.categories.byArea[categoryName].lastFiveYears += probability;
                        }
                    }
                });
            } else {
                // Fallback: count as 1.0 for primary category only
                if (this.categories.byArea[area]) {
                    this.categories.byArea[area].allTime++;
                    
                    const currentYear = new Date().getFullYear();
                    if (year >= currentYear - 4) {
                        this.categories.byArea[area].lastFiveYears++;
                    }
                }
            }
            
            // Count total papers for year
            this.categories.byYear[year].total++;
        });
    }
    
    /**
     * Get student names from mentorship data
     */
    getStudentNames() {
        if (!this.mentorshipData) return [];
        
        const students = [];
        const menteeData = this.mentorshipData.menteesByStage || {};
        
        // Current students
        Object.values(menteeData).forEach(stage => {
            if (Array.isArray(stage)) {
                stage.forEach(mentee => {
                    if (mentee.name) students.push(mentee.name);
                });
            }
        });
        
        // Former students
        if (menteeData.completed) {
            Object.values(menteeData.completed).forEach(stage => {
                if (Array.isArray(stage)) {
                    stage.forEach(mentee => {
                        if (mentee.name) students.push(mentee.name);
                    });
                }
            });
        }
        
        return students;
    }
    
    /**
     * Check if a paper is student-led based on first author
     */
    isStudentPaper(paper, studentNames) {
        if (!paper.authors || paper.authors.length === 0) return false;
        
        const firstAuthor = paper.authors[0];
        
        // Check if first author is in our student list
        return studentNames.some(studentName => {
            const nameParts = studentName.split(' ');
            const lastName = nameParts[nameParts.length - 1];
            return firstAuthor.includes(lastName);
        });
    }
    
    /**
     * Setup Chart.js defaults for theme consistency
     */
    setupChartDefaults() {
        // Detect current theme
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        const textColor = isDarkMode ? '#E0E0E0' : '#333333';
        const gridColor = isDarkMode ? '#404040' : '#E0E0E0';
        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;
        
        // Set Chart.js defaults only if Chart.js is fully loaded
        if (window.Chart && Chart.defaults) {
            try {
                Chart.defaults.color = textColor;
                Chart.defaults.borderColor = gridColor;
                
                // Check if plugins exist before setting
                if (Chart.defaults.plugins && Chart.defaults.plugins.legend && Chart.defaults.plugins.legend.labels) {
                    Chart.defaults.plugins.legend.labels.color = textColor;
                }
                
                // Check if scales exist before setting
                if (Chart.defaults.scales) {
                    if (Chart.defaults.scales.linear) {
                        if (Chart.defaults.scales.linear.grid) {
                            Chart.defaults.scales.linear.grid.color = gridColor;
                        }
                        if (Chart.defaults.scales.linear.ticks) {
                            Chart.defaults.scales.linear.ticks.color = textColor;
                        }
                    }
                    if (Chart.defaults.scales.category) {
                        if (Chart.defaults.scales.category.grid) {
                            Chart.defaults.scales.category.grid.color = gridColor;
                        }
                        if (Chart.defaults.scales.category.ticks) {
                            Chart.defaults.scales.category.ticks.color = textColor;
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not set Chart.js defaults:', error);
            }
        }
    }
    
    /**
     * Create the complete statistics dashboard
     */
    renderDashboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        
        container.innerHTML = `
            <div class="stats-dashboard highlight-box">
                <div class="dashboard-header">
                    <h3>Publication Statistics</h3>
                    <div class="stats-summary">
                        <a href="https://ui.adsabs.harvard.edu/user/libraries/YiaebBefTHKZdblrny2Vsw" class="stat-item stat-button" target="_blank" rel="noopener">
                            <span class="stat-number">${this.categories.all.length}</span>
                            <span class="stat-label">Total Papers</span>
                            <span class="stat-icon">📚</span>
                        </a>
                        <a href="https://ui.adsabs.harvard.edu/user/libraries/Jy98AvjOQXqykOSJ-bn96Q" class="stat-item stat-button" target="_blank" rel="noopener">
                            <span class="stat-number">${this.categories.primary.length}</span>
                            <span class="stat-label">Primary Author</span>
                            <span class="stat-icon">⭐</span>
                        </a>
                        <a href="https://ui.adsabs.harvard.edu/user/libraries/6-JKiyOATdqEzuDGuUMWwg" class="stat-item stat-button" target="_blank" rel="noopener">
                            <span class="stat-number">${this.categories.postdoc.length}</span>
                            <span class="stat-label">Postdoc-Led</span>
                            <span class="stat-icon">🔬</span>
                        </a>
                        <a href="https://ui.adsabs.harvard.edu/user/libraries/yyWDBaVwS0GIrIkz2GKltg" class="stat-item stat-button" target="_blank" rel="noopener">
                            <span class="stat-number">${this.categories.student.length}</span>
                            <span class="stat-label">Student-Led</span>
                            <span class="stat-icon">🎓</span>
                        </a>
                        <a href="https://ui.adsabs.harvard.edu/user/libraries/X5RfsxxzRXC-BWjU11xa4A" class="stat-item stat-button" target="_blank" rel="noopener">
                            <span class="stat-number">${this.categories.nonStudentSignificant.length}</span>
                            <span class="stat-label">Contributor</span>
                            <span class="stat-icon">🤝</span>
                        </a>
                    </div>
                </div>
                
                <div class="charts-container">
                    <div class="chart-section">
                        <div class="chart-wrapper">
                            <h4>Total Citations Received by Year</h4>
                            <canvas id="citations-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-section">
                        <div class="chart-wrapper">
                            <h4>Research Focus Over Time</h4>
                            <canvas id="research-evolution-chart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-section">
                        <div class="chart-wrapper">
                            <h4>Citations by Publication Year</h4>
                            <canvas id="citations-by-pub-year-chart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-section">
                        <div class="chart-wrapper">
                            <h4>Publications by Year and Authorship</h4>
                            <canvas id="papers-by-year-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-section">
                        <div class="chart-wrapper">
                            <h4>Citations by Rank</h4>
                            <canvas id="citation-rank-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-section">
                        <div class="chart-wrapper">
                            <h4>Research Impact (RIQ) by Role</h4>
                            <canvas id="ads-metrics-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="chart-notes">
                    <p><strong>Citations by Rank:</strong> <span id="gini-description">Shows cumulative citation distribution across papers.</span></p>
                    <p><strong>Research Impact (RIQ):</strong> RIQ measures citation impact normalized by career length. Shaded band shows typical range for astronomers (<a href="https://doi.org/10.1371/journal.pone.0046428" target="_blank" rel="noopener">Pepe & Kurtz 2012</a>).</p>
                </div>
            </div>
        `;
        
        // Create charts after DOM is ready
        requestAnimationFrame(() => {
            this.createCharts();
        });
    }

    /**
     * Create all charts
     */
    createCharts() {
        this.createCitationsChart();
        this.createResearchEvolutionChart();
        this.createCitationsByPubYearChart();
        this.createPapersByYearChart();
        this.createCitationRankChart();
        this.createADSMetricsChart();
    }
    
    /**
     * Citations over time chart - shows total citations received by year from Google Scholar
     */
    createCitationsChart() {
        const ctx = document.getElementById('citations-chart');
        if (!ctx || !window.Chart) return;
        
        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;
        
        const citationsData = this.metrics.citationsPerYear || {};
        
        // Create contiguous years from first to last year with data
        const dataYears = Object.keys(citationsData).map(y => parseInt(y)).sort((a, b) => a - b);
        if (dataYears.length === 0) return;
        
        const startYear = Math.min(...dataYears);
        const endYear = Math.max(...dataYears);
        const allYears = [];
        const allCitations = [];
        
        for (let year = startYear; year <= endYear; year++) {
            allYears.push(year.toString());
            allCitations.push(citationsData[year.toString()] || 0);
        }
        
        // Apply square root transformation to data (same as bar chart approach)
        const sqrtCitations = allCitations.map(val => Math.sqrt(val));
        
        this.charts.citations = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allYears,
                datasets: [{
                    label: 'Total Citations Received',
                    data: sqrtCitations,
                    borderColor: this.colors.line,
                    backgroundColor: this.colors.line + '20',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: this.colors.line,
                    pointBorderColor: this.colors.line,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false  // Remove legend since there's only one line
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `Citations in ${context[0].label}`;
                            },
                            label: function(context) {
                                // Show actual citation count (squared back)
                                const actualValue = Math.round(context.parsed.y * context.parsed.y);
                                return `Total citations received: ${actualValue}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Citations Received (√ scale)',
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 14)
                            }
                        },
                        ticks: {
                            font: {
                                size: isVerySmall ? 8 : (isMobile ? 10 : 13)
                            },
                            callback: function(value) {
                                // Display the actual value (squared back)
                                return Math.round(value * value);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            font: {
                                size: isVerySmall ? 10 : (isMobile ? 12 : 14)
                            }
                        },
                        ticks: {
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 13)
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            maxTicksLimit: isMobile ? 6 : 10
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Citations by publication year chart - shows citation counts aggregated by year of publication, broken down by authorship category
     */
    createCitationsByPubYearChart() {
        const ctx = document.getElementById('citations-by-pub-year-chart');
        if (!ctx || !window.Chart) return;
        
        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;
        
        // Aggregate citations by publication year and category
        const citationsByYear = {};
        
        this.publications.forEach(paper => {
            const year = paper.year;
            const citations = paper.citations || 0;
            
            if (!year || citations === 0) return; // Skip papers without year or citations
            
            if (!citationsByYear[year]) {
                citationsByYear[year] = {
                    primary: 0,
                    postdoc: 0,
                    student: 0,
                    nonStudentSignificant: 0,
                    other: 0
                };
            }
            
            // Determine category using same logic as categorizePublications
            // Now using singular 'authorshipCategory' field
            const authorshipCategory = paper.authorshipCategory || '';
            let category = 'other';

            if (authorshipCategory) {
                if (authorshipCategory === 'primary') {
                    category = 'primary';
                } else if (authorshipCategory === 'postdoc') {
                    category = 'postdoc';
                } else if (authorshipCategory === 'student') {
                    category = 'student';
                } else if (authorshipCategory === 'significant') {
                    category = 'nonStudentSignificant';
                }
            } else {
                // Fallback to heuristic
                const authors = paper.authors || [];
                const speaglePosition = authors.findIndex(author => 
                    author.includes('Speagle') || author.includes('沈佳士')
                );
                
                const isPrimary = speaglePosition >= 0 && speaglePosition <= 1;
                const studentNames = this.getStudentNames();
                const isStudentLed = this.isStudentPaper(paper, studentNames);
                
                if (isPrimary) {
                    category = 'primary';
                } else if (isStudentLed) {
                    category = 'student';
                }
            }
            
            citationsByYear[year][category] += citations;
        });
        
        // Create contiguous years from first to last year with publications
        const dataYears = Object.keys(citationsByYear).map(y => parseInt(y)).sort((a, b) => a - b);
        if (dataYears.length === 0) return;
        
        const startYear = Math.min(...dataYears);
        const endYear = Math.max(...dataYears);
        const allYears = [];
        
        for (let year = startYear; year <= endYear; year++) {
            allYears.push(year.toString());
        }
        
        const primaryData = allYears.map(year => {
            const val = citationsByYear[year]?.primary || 0;
            return Math.sqrt(val);
        });
        const postdocData = allYears.map(year => {
            const val = citationsByYear[year]?.postdoc || 0;
            return Math.sqrt(val);
        });
        const studentData = allYears.map(year => {
            const val = citationsByYear[year]?.student || 0;
            return Math.sqrt(val);
        });
        const significantData = allYears.map(year => {
            const val = citationsByYear[year]?.nonStudentSignificant || 0;
            return Math.sqrt(val);
        });
        const otherData = allYears.map(year => {
            const val = citationsByYear[year]?.other || 0;
            return Math.sqrt(val);
        });
        
        this.charts.citationsByPubYear = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allYears,
                datasets: [
                    {
                        label: 'Primary Author',
                        data: primaryData,
                        backgroundColor: this.colors.primary,
                        borderColor: this.colors.primary,
                        borderWidth: 1
                    },
                    {
                        label: 'Postdoc-Led',
                        data: postdocData,
                        backgroundColor: this.colors.postdoc,
                        borderColor: this.colors.postdoc,
                        borderWidth: 1
                    },
                    {
                        label: 'Student-Led',
                        data: studentData,
                        backgroundColor: this.colors.student,
                        borderColor: this.colors.student,
                        borderWidth: 1
                    },
                    {
                        label: 'Contributor',
                        data: significantData,
                        backgroundColor: this.colors.secondary,
                        borderColor: this.colors.secondary,
                        borderWidth: 1
                    },
                    {
                        label: 'Other',
                        data: otherData,
                        backgroundColor: this.colors.accent,
                        borderColor: this.colors.accent,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Publication Year',
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 14)
                            }
                        },
                        ticks: {
                            font: {
                                size: isVerySmall ? 8 : (isMobile ? 10 : 13)
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Citations (√ scale)',
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 14)
                            }
                        },
                        ticks: {
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 13)
                            },
                            maxTicksLimit: isMobile ? 5 : 8,
                            callback: function(value) {
                                // Display the actual value (squared back)
                                return Math.round(value * value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: isVerySmall ? 10 : (isMobile ? 11 : 13)
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                // Show actual citation count (squared back)
                                const actualValue = Math.round(context.parsed.y * context.parsed.y);
                                return `${context.dataset.label}: ${actualValue} citations`;
                            },
                            afterBody: function(context) {
                                const year = context[0].label;
                                const yearData = citationsByYear[year];
                                if (!yearData) return '';
                                const total = (yearData?.primary || 0) + (yearData?.postdoc || 0) + (yearData?.student || 0) +
                                             (yearData?.nonStudentSignificant || 0) + (yearData?.other || 0);
                                return `Total citations for ${year} publications: ${total}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Publications by year stacked bar chart with exclusive categories
     */
    createPapersByYearChart() {
        const ctx = document.getElementById('papers-by-year-chart');
        if (!ctx || !window.Chart) return;
        
        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;
        
        // Create contiguous years from first to last year with publications
        const dataYears = Object.keys(this.categories.byYear)
            .filter(year => year !== 'Unknown')
            .map(y => parseInt(y))
            .sort((a, b) => a - b);
        
        if (dataYears.length === 0) return;
        
        const startYear = Math.min(...dataYears);
        const endYear = Math.max(...dataYears);
        const allYears = [];
        
        for (let year = startYear; year <= endYear; year++) {
            allYears.push(year.toString());
        }
        
        // Apply square root scaling to match citations chart format
        const primaryData = allYears.map(year => {
            const val = this.categories.byYear[year]?.primary || 0;
            return Math.sqrt(val);
        });
        const postdocData = allYears.map(year => {
            const val = this.categories.byYear[year]?.postdoc || 0;
            return Math.sqrt(val);
        });
        const studentData = allYears.map(year => {
            const val = this.categories.byYear[year]?.student || 0;
            return Math.sqrt(val);
        });
        const significantData = allYears.map(year => {
            const val = this.categories.byYear[year]?.nonStudentSignificant || 0;
            return Math.sqrt(val);
        });
        const otherData = allYears.map(year => {
            const val = this.categories.byYear[year]?.other || 0;
            return Math.sqrt(val);
        });
        
        this.charts.papersByYear = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allYears,
                datasets: [
                    {
                        label: 'Primary Author',
                        data: primaryData,
                        backgroundColor: this.colors.primary,
                        borderColor: this.colors.primary,
                        borderWidth: 1
                    },
                    {
                        label: 'Postdoc-Led',
                        data: postdocData,
                        backgroundColor: this.colors.postdoc,
                        borderColor: this.colors.postdoc,
                        borderWidth: 1
                    },
                    {
                        label: 'Student-Led',
                        data: studentData,
                        backgroundColor: this.colors.student,
                        borderColor: this.colors.student,
                        borderWidth: 1
                    },
                    {
                        label: 'Contributor',
                        data: significantData,
                        backgroundColor: this.colors.secondary,
                        borderColor: this.colors.secondary,
                        borderWidth: 1
                    },
                    {
                        label: 'Other',
                        data: otherData,
                        backgroundColor: this.colors.accent,
                        borderColor: this.colors.accent,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Year',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            font: {
                                size: 13
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Publications (√ scale)',
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 14)
                            }
                        },
                        ticks: {
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 13)
                            },
                            maxTicksLimit: isMobile ? 5 : 8,
                            callback: function(value) {
                                // Display the actual value (squared back)
                                return Math.round(value * value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: isVerySmall ? 10 : (isMobile ? 11 : 13)
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                // Show actual publication count (squared back)
                                const actualValue = Math.round(context.parsed.y * context.parsed.y);
                                return `${context.dataset.label}: ${actualValue} publications`;
                            },
                            afterBody: function(context) {
                                const year = context[0].label;
                                const yearData = this.categories.byYear[year];
                                if (!yearData) return '';
                                const total = (yearData?.primary || 0) + (yearData?.postdoc || 0) + (yearData?.student || 0) +
                                             (yearData?.nonStudentSignificant || 0) + (yearData?.other || 0);
                                return `Total publications in ${year}: ${total}`;
                            }.bind(this)
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Research focus evolution chart - 100% stacked area showing category proportions over time
     */
    createResearchEvolutionChart() {
        const ctx = document.getElementById('research-evolution-chart');
        if (!ctx || !window.Chart) return;

        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;

        // Research categories
        const mainCategories = [
            'Statistical Learning & AI',
            'Interpretability & Insight',
            'Inference & Computation',
            'Discovery & Understanding'
        ];

        const shortLabels = [
            'ML & AI',
            'Interpretability',
            'Inference',
            'Discovery'
        ];

        // Aggregate probabilistic paper counts by year and category
        const dataByYear = {};

        this.publications.forEach(paper => {
            const year = paper.year;
            if (!year || year === 'Unknown') return;

            if (!dataByYear[year]) {
                dataByYear[year] = {
                    'Statistical Learning & AI': 0,
                    'Interpretability & Insight': 0,
                    'Inference & Computation': 0,
                    'Discovery & Understanding': 0,
                    total: 0
                };
            }

            // Use probabilistic counts if available
            if (paper.categoryProbabilities && typeof paper.categoryProbabilities === 'object') {
                mainCategories.forEach(category => {
                    const prob = paper.categoryProbabilities[category] || 0;
                    dataByYear[year][category] += prob;
                    dataByYear[year].total += prob;
                });
            } else {
                // Fallback: count as 1.0 for primary category
                const area = paper.researchArea || 'Discovery & Understanding';
                if (mainCategories.includes(area)) {
                    dataByYear[year][area] += 1;
                    dataByYear[year].total += 1;
                }
            }
        });

        // Use actual publication year range from papers for CALCULATION
        const pubYears = Object.keys(dataByYear).map(y => parseInt(y)).sort((a, b) => a - b);
        if (pubYears.length === 0) return;

        const calcStartYear = Math.min(...pubYears);
        const calcEndYear = Math.max(...pubYears);
        const allCalcYears = [];

        for (let year = calcStartYear; year <= calcEndYear; year++) {
            allCalcYears.push(year.toString());
        }

        // Get display range from citations chart (same x-axis range)
        const citationsData = this.metrics.citationsPerYear || {};
        const citationYears = Object.keys(citationsData).map(y => parseInt(y)).sort((a, b) => a - b);
        const displayStartYear = citationYears.length > 0 ? Math.min(...citationYears) : calcStartYear;
        const displayEndYear = calcEndYear; // Always show up to current year

        // Filter to only include years with more than 5 papers
        const minPapersThreshold = 5;
        const filteredYears = allCalcYears.filter(year => {
            const yearData = dataByYear[year];
            return yearData && yearData.total > minPapersThreshold;
        });

        // Calculate raw percentages for each category (no smoothing)
        const percentageData = {};
        mainCategories.forEach(category => {
            percentageData[category] = filteredYears.map(year => {
                const yearData = dataByYear[year];
                if (!yearData || yearData.total === 0) return 0;
                return (yearData[category] / yearData.total) * 100;
            });
        });

        // Use filtered years for display
        const displayYears = filteredYears;

        // Get colors for categories
        const categoryColors = mainCategories.map(category => this.colors.research[category][0]);
        const categoryColorsLight = mainCategories.map(category => this.colors.research[category][0] + '80'); // 50% opacity for fill

        // Create datasets for stacked area (order matters - first is at bottom)
        const datasets = mainCategories.map((category, index) => ({
            label: shortLabels[index],
            data: percentageData[category],
            backgroundColor: categoryColorsLight[index],
            borderColor: categoryColors[index],
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
        }));

        this.charts.researchEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: displayYears,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            font: {
                                size: isVerySmall ? 10 : (isMobile ? 12 : 14)
                            }
                        },
                        ticks: {
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 13)
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            maxTicksLimit: isMobile ? 6 : 10
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Research Focus (%)',
                            font: {
                                size: isVerySmall ? 9 : (isMobile ? 11 : 14)
                            }
                        },
                        ticks: {
                            font: {
                                size: isVerySmall ? 8 : (isMobile ? 10 : 13)
                            },
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: isVerySmall ? 10 : (isMobile ? 11 : 12)
                            },
                            usePointStyle: true,
                            pointStyle: 'rect'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: ${value.toFixed(1)}%`;
                            },
                            afterBody: function(context) {
                                const year = context[0].label;
                                const yearData = dataByYear[year];
                                if (!yearData) return '';
                                return `Papers in ${year}: ${yearData.total.toFixed(1)}`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    /**
     * Citation rank chart - shows cumulative % of citations vs paper rank
     * X-axis: Paper rank (sqrt scale to spread out top papers)
     * Y-axis: Cumulative % of total citations (0-100%)
     * Colored segments for Top 1%, 1-5%, 5-20%, Bottom 80%
     */
    createCitationRankChart() {
        const ctx = document.getElementById('citation-rank-chart');
        if (!ctx || !window.Chart) return;

        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;

        // Sort papers by citations descending
        const sorted = [...this.publications].sort((a, b) =>
            (b.citations || 0) - (a.citations || 0)
        );
        const n = sorted.length;
        const total = sorted.reduce((sum, p) => sum + (p.citations || 0), 0);

        if (total === 0 || n === 0) return;

        // Calculate cumulative citation percentages
        let cumSum = 0;
        const cumulative = sorted.map(p => {
            cumSum += (p.citations || 0);
            return (cumSum / total) * 100;
        });

        // Calculate Gini coefficient (measures citation inequality, 0=equal, 1=concentrated)
        // Formula: G = (2 * Σ(i * x_i)) / (n * Σx_i) - (n+1)/n for ascending sorted data
        // Since we have descending, we reverse the index
        let giniSum = 0;
        sorted.forEach((p, i) => {
            giniSum += (n - i) * (p.citations || 0);
        });
        const gini = (2 * giniSum) / (n * total) - (n + 1) / n;
        const giniDisplay = Math.abs(gini).toFixed(2);

        // Update Gini description in the notes section
        const giniEl = document.getElementById('gini-description');
        if (giniEl) {
            giniEl.textContent = `Gini coefficient: ${giniDisplay} (1 = all citations to one paper).`;
        }

        // Define percentile boundaries
        const p1 = Math.max(1, Math.ceil(n * 0.01));
        const p5 = Math.ceil(n * 0.05);
        const p20 = Math.ceil(n * 0.20);

        // Get cumulative % at each boundary for legend
        const pct1 = cumulative[p1 - 1]?.toFixed(0) || 0;
        const pct5 = cumulative[p5 - 1]?.toFixed(0) || 0;
        const pct20 = cumulative[p20 - 1]?.toFixed(0) || 0;

        // Colors for segments (red = top ranked, blue = lower ranked)
        const segmentColors = {
            top1: { bg: 'rgba(211, 47, 47, 0.7)', line: 'rgba(183, 28, 28, 1)' },
            top5: { bg: 'rgba(245, 124, 0, 0.5)', line: 'rgba(230, 81, 0, 1)' },
            top20: { bg: 'rgba(56, 142, 60, 0.4)', line: 'rgba(46, 125, 50, 1)' },
            rest: { bg: 'rgba(30, 136, 229, 0.25)', line: 'rgba(21, 101, 192, 1)' },
        };

        // Create segment data with sqrt-transformed x values
        const createSegmentData = (startIdx, endIdx) => {
            const data = [];
            for (let i = startIdx; i < endIdx && i < n; i++) {
                data.push({ x: Math.sqrt(i + 1), y: cumulative[i] });
            }
            return data;
        };

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e0e0e0' : '#333333';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        this.charts.citationRank = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: `Top 1% (${pct1}% of citations)`,
                        data: createSegmentData(0, p1),
                        backgroundColor: segmentColors.top1.bg,
                        borderColor: segmentColors.top1.line,
                        borderWidth: 2,
                        fill: true,
                        showLine: true,
                        pointRadius: 0,
                        tension: 0.1,
                    },
                    {
                        label: `Top 1-5% (${pct5 - pct1}% of citations)`,
                        data: createSegmentData(p1, p5),
                        backgroundColor: segmentColors.top5.bg,
                        borderColor: segmentColors.top5.line,
                        borderWidth: 2,
                        fill: true,
                        showLine: true,
                        pointRadius: 0,
                        tension: 0.1,
                    },
                    {
                        label: `Top 5-20% (${pct20 - pct5}% of citations)`,
                        data: createSegmentData(p5, p20),
                        backgroundColor: segmentColors.top20.bg,
                        borderColor: segmentColors.top20.line,
                        borderWidth: 2,
                        fill: true,
                        showLine: true,
                        pointRadius: 0,
                        tension: 0.1,
                    },
                    {
                        label: `Bottom 80% (${100 - pct20}% of citations)`,
                        data: createSegmentData(p20, n),
                        backgroundColor: segmentColors.rest.bg,
                        borderColor: segmentColors.rest.line,
                        borderWidth: 2,
                        fill: true,
                        showLine: true,
                        pointRadius: 0,
                        tension: 0.1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            boxWidth: isVerySmall ? 10 : 12,
                            font: { size: isVerySmall ? 10 : (isMobile ? 11 : 12) },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const sqrtX = items[0].parsed.x;
                                const rank = Math.round(sqrtX * sqrtX);
                                return `Top ${rank} paper${rank > 1 ? 's' : ''}`;
                            },
                            label: (context) => {
                                const sqrtX = context.parsed.x;
                                const rank = Math.round(sqrtX * sqrtX);
                                const idx = rank - 1;
                                if (idx >= 0 && idx < sorted.length) {
                                    const paper = sorted[idx];
                                    const title = paper.title?.substring(0, 40) || 'Unknown';
                                    return [
                                        `${context.parsed.y.toFixed(1)}% of total citations`,
                                        `#${rank}: ${title}${paper.title?.length > 40 ? '...' : ''}`,
                                    ];
                                }
                                return `${context.parsed.y.toFixed(1)}% of citations`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Paper Rank (√ scale)',
                            color: textColor,
                            font: { size: isVerySmall ? 9 : (isMobile ? 11 : 14) },
                        },
                        ticks: {
                            color: textColor,
                            font: { size: isVerySmall ? 8 : (isMobile ? 10 : 13) },
                            callback: function(value) {
                                const rank = Math.round(value * value);
                                return rank;
                            },
                        },
                        grid: { color: gridColor },
                        min: 1,
                        max: Math.sqrt(n) * 1.02,
                        afterBuildTicks: (scale) => {
                            const maxRank = n;
                            // Fewer ticks on mobile
                            const allRanks = [1, 2, 5, 10, 20, 50, 100, 150];
                            const mobileRanks = [1, 5, 20, 50, 150];
                            const niceRanks = (isMobile ? mobileRanks : allRanks).filter(r => r <= maxRank);
                            scale.ticks = niceRanks.map(r => ({ value: Math.sqrt(r) }));
                        },
                    },
                    y: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Cumulative % of Citations',
                            color: textColor,
                            font: { size: isVerySmall ? 9 : (isMobile ? 11 : 14) },
                        },
                        ticks: {
                            color: textColor,
                            font: { size: isVerySmall ? 8 : (isMobile ? 10 : 13) },
                            maxTicksLimit: isMobile ? 5 : 6,
                            callback: (value) => `${value}%`,
                        },
                        grid: { color: gridColor },
                        min: 0,
                        max: 100,
                    },
                },
            },
        });
    }

    /**
     * RIQ (Research Impact Quotient) by authorship category over time
     * RIQ = sqrt(tori) / years_active * 1000
     * Shows impact normalized by career length
     */
    createADSMetricsChart() {
        const ctx = document.getElementById('ads-metrics-chart');
        if (!ctx || !window.Chart) return;

        const riqByCategory = this.metrics.riqByCategory || {};

        // Check if we have any RIQ data
        const hasData = Object.keys(riqByCategory).some(cat =>
            riqByCategory[cat]?.riq_series && Object.keys(riqByCategory[cat].riq_series).length > 0
        );

        if (!hasData) {
            // Show placeholder message if no data yet
            const wrapper = ctx.parentElement;
            if (wrapper) {
                const placeholder = document.createElement('div');
                placeholder.className = 'chart-placeholder';
                placeholder.innerHTML = '<p>RIQ time series data not yet available.<br>Run the publication pipeline to fetch this data.</p>';
                wrapper.appendChild(placeholder);
                ctx.style.display = 'none';
            }
            return;
        }

        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;

        // Collect all years across all categories
        const allYears = new Set();
        Object.values(riqByCategory).forEach(cat => {
            if (cat.riq_series) {
                Object.keys(cat.riq_series).forEach(y => allYears.add(y));
            }
        });
        const years = Array.from(allYears).sort();

        // Category colors, labels, and styling
        const categoryConfig = {
            all: { color: '#455a64', label: 'All Papers', dashed: true, order: 0 },
            primary: { color: '#1565c0', label: 'Primary Author', order: 1 },
            significant: { color: '#2e7d32', label: 'Significant Contrib.', order: 2 },
            student: { color: '#f57c00', label: 'Student-led', order: 3 },
            postdoc: { color: '#7b1fa2', label: 'Postdoc-led', order: 4 },
        };

        const datasets = Object.entries(riqByCategory)
            .filter(([_, data]) => data.riq_series && Object.keys(data.riq_series).length > 0)
            .map(([category, data]) => {
                const config = categoryConfig[category] || {};
                const currentRiq = data.current ? ` (${Math.round(data.current)})` : '';
                return {
                    label: (config.label || category) + currentRiq,
                    data: years.map(y => data.riq_series[y] ?? null),
                    borderColor: config.color || '#666',
                    backgroundColor: (config.color || '#666') + '20',
                    borderDash: config.dashed ? [5, 5] : [],
                    borderWidth: config.dashed ? 2 : 2,
                    tension: 0.3,
                    pointRadius: isMobile ? 2 : 3,
                    spanGaps: true,
                    order: config.order ?? 5,
                };
            })
            .sort((a, b) => a.order - b.order);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e0e0e0' : '#333333';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // IQR band values from Pepe & Kurtz 2012 (converted to ADS scale ×1000)
        const iqrLow = 60;   // Q1 for typical astronomers
        const iqrHigh = 150; // Q3 for typical astronomers
        const bandColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

        // Custom plugin to draw IQR reference band and mean line
        const iqrBandPlugin = {
            id: 'iqrBand',
            beforeDraw: (chart) => {
                const { ctx, chartArea, scales } = chart;
                if (!chartArea) return;

                const yScale = scales.y;
                const yTop = yScale.getPixelForValue(iqrHigh);
                const yBottom = yScale.getPixelForValue(iqrLow);
                const yMean = yScale.getPixelForValue(100); // Global mean

                ctx.save();

                // Draw IQR band
                ctx.fillStyle = bandColor;
                ctx.fillRect(chartArea.left, yTop, chartArea.width, yBottom - yTop);

                // Draw mean line
                ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(chartArea.left, yMean);
                ctx.lineTo(chartArea.right, yMean);
                ctx.stroke();

                // Add "Mean" label
                ctx.fillStyle = textColor;
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('Mean', chartArea.left + 4, yMean - 4);

                ctx.restore();
            },
        };

        this.charts.adsMetrics = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets
            },
            plugins: [iqrBandPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            boxWidth: isVerySmall ? 10 : 12,
                            font: { size: isVerySmall ? 10 : (isMobile ? 11 : 12) },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                return value ? `${context.dataset.label}: ${value.toFixed(0)}` : null;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            color: textColor,
                            font: { size: isVerySmall ? 10 : (isMobile ? 12 : 14) },
                        },
                        ticks: {
                            color: textColor,
                            font: { size: isVerySmall ? 9 : (isMobile ? 11 : 13) },
                            maxRotation: 45,
                            minRotation: 45,
                            maxTicksLimit: isMobile ? 6 : 10,
                        },
                        grid: { color: gridColor },
                    },
                    y: {
                        type: 'linear',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'RIQ',
                            color: textColor,
                            font: { size: isVerySmall ? 9 : (isMobile ? 11 : 14) },
                        },
                        ticks: {
                            color: textColor,
                            font: { size: isVerySmall ? 8 : (isMobile ? 10 : 13) },
                            maxTicksLimit: isMobile ? 5 : 8,
                        },
                        grid: { color: gridColor },
                    },
                },
            },
        });
    }

    /**
     * Clean up chart instances
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
    
    /**
     * Update charts when theme changes
     */
    updateTheme() {
        this.updateColorScheme();
        this.setupChartDefaults();
        // Recreate charts with new theme
        this.destroy();
        setTimeout(() => this.createCharts(), 100);
    }
}

// Export for use in other modules
window.PublicationsStats = PublicationsStats;