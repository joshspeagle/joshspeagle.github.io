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
        
        if (isDarkMode) {
            // Dark mode colors - more vibrant and contrasting
            this.colors = {
                primary: '#5BA3F5',     // Brighter blue for primary author
                postdoc: '#9333EA',     // Purple for postdoc-led (matches badge)
                student: '#FF6B35',     // Orange for student-led (matches badge)
                secondary: '#32D74B',   // Green for contributor
                accent: '#8E8E93',      // Gray for other (de-emphasized)
                line: '#5BA3F5',        // Blue for line charts
                // Research category gradients (dark mode) - moderately darker outer colors
                research: {
                    'Statistical Learning & AI': ['#E85555', '#FF8E85'],        // Moderately darker red, lighter red
                    'Interpretability & Insight': ['#2A9D8F', '#6BD7CF'],       // Moderately darker teal, lighter teal  
                    'Inference & Computation': ['#3B82F6', '#6BC7DC'],          // Moderately darker blue, lighter blue
                    'Discovery & Understanding': ['#22C55E', '#A8D5BE']         // Moderately darker green, lighter green
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
                    'Statistical Learning & AI': ['#E74C3C', '#F1948A'],        // Red gradient
                    'Interpretability & Insight': ['#16A085', '#52C4A0'],       // Teal gradient
                    'Inference & Computation': ['#3498DB', '#85C1E9'],          // Blue gradient  
                    'Discovery & Understanding': ['#27AE60', '#82E0AA']         // Green gradient
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
        
        console.log('Publication categories:', this.categories);
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
        console.log('renderDashboard called with containerId:', containerId);
        const container = document.getElementById(containerId);
        console.log('Container found:', !!container);
        if (!container) {
            console.error(`Container ${containerId} not found`);
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
                            <h4>Publications by Research Category</h4>
                            <div class="ring-legend">
                                <div class="ring-legend-item">
                                    <span class="ring-marker inner-marker"></span>
                                    <span class="ring-label">Inner: All Time</span>
                                </div>
                                <div class="ring-legend-item">
                                    <span class="ring-marker outer-marker"></span>
                                    <span class="ring-label">Outer: Last 5 Years</span>
                                </div>
                            </div>
                            <canvas id="research-areas-chart"></canvas>
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
                </div>
            </div>
        `;
        
        // Create charts after DOM is ready
        console.log('Dashboard HTML rendered, preparing to create charts...');
        console.log('Chart.js available:', !!window.Chart);
        requestAnimationFrame(() => {
            this.createCharts();
        });
    }
    
    /**
     * Create all charts
     */
    createCharts() {
        console.log('createCharts called');
        this.createCitationsChart();
        this.createCitationsByPubYearChart();
        this.createPapersByYearChart();
        this.createResearchAreasChart();
        console.log('All chart creation methods called');
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
     * Research areas comparison chart - all-time vs last 5 years
     */
    createResearchAreasChart() {
        const ctx = document.getElementById('research-areas-chart');
        if (!ctx || !window.Chart) return;
        
        const isMobile = window.innerWidth <= 768;
        const isVerySmall = window.innerWidth <= 375;
        
        // Use the 4 main research categories from config
        const mainCategories = [
            'Statistical Learning & AI',
            'Interpretability & Insight', 
            'Inference & Computation',
            'Discovery & Understanding'
        ];
        
        // Ensure all categories exist with default values, round to 1 decimal place
        const allTimeData = mainCategories.map(area => {
            return Math.round((this.categories.byArea[area]?.allTime || 0) * 10) / 10;
        });
        const recentData = mainCategories.map(area => {
            return Math.round((this.categories.byArea[area]?.lastFiveYears || 0) * 10) / 10;
        });
        
        // Create shortened labels
        const shortLabels = [
            'ML & AI',
            'Interpretability', 
            'Inference',
            'Discovery'
        ];
        
        // Generate colors for inner and outer rings that mirror light/dark modes
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const innerColors = mainCategories.map(category => {
            if (isDarkMode) {
                // Dark mode: lighter inner, darker outer (same as light mode structure)
                return this.colors.research[category][1]; // Lighter colors for inner
            } else {
                return this.colors.research[category][1]; // Lighter colors for inner
            }
        });
        const outerColors = mainCategories.map(category => {
            if (isDarkMode) {
                // Dark mode: darker outer ring
                return this.colors.research[category][0]; // Darker colors for outer
            } else {
                return this.colors.research[category][0]; // Darker colors for outer
            }
        });
        
        this.charts.researchAreas = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: shortLabels,
                datasets: [
                    {
                        label: 'All-Time',
                        data: allTimeData,
                        backgroundColor: innerColors,
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        weight: 1.5, // Moderate increase in weight for better visibility
                        cutout: '20%', // Inner ring - original cutout
                        radius: '45%' // Original inner ring size
                    },
                    {
                        label: 'Last 5 Years',
                        data: recentData,
                        backgroundColor: outerColors,
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        weight: 1.5,
                        cutout: '55%', // Outer ring - gap between rings
                        radius: '100%' // Full outer ring size
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels: function(chart) {
                                // Custom legend generator to use outer ring colors
                                const data = chart.data;
                                const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                                const textColor = isDarkMode ? '#E0E0E0' : '#333333';
                                
                                if (data.datasets.length >= 2) {
                                    const outerDataset = data.datasets[1]; // Outer ring (Last 5 Years)
                                    return data.labels.map((label, index) => {
                                        return {
                                            text: label,
                                            fillStyle: outerDataset.backgroundColor[index],
                                            strokeStyle: outerDataset.borderColor,
                                            lineWidth: outerDataset.borderWidth,
                                            pointStyle: 'circle',
                                            datasetIndex: 1,
                                            index: index,
                                            fontColor: textColor,
                                            textAlign: 'left'
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const categoryIndex = context.dataIndex;
                                const categoryName = mainCategories[categoryIndex];
                                const value = context.parsed;
                                const dataset = context.datasetIndex === 0 ? 'All Time' : 'Last 5 Years';
                                return `${dataset} ${shortLabels[categoryIndex]}: ${value} papers`;
                            },
                        }
                    }
                },
                interaction: {
                    intersect: true,
                    mode: 'point'
                },
                elements: {
                    arc: {
                        hoverOffset: 6,
                        borderWidth: 2,
                        hoverBorderWidth: 3
                    }
                }
            }
        });
        
        // Chart.js legend is now handled automatically at 'top' position
    }
    
    /**
     * Create custom category legend
     */
    createCategoryLegend(labels, colors) {
        const legendContainer = document.getElementById('research-areas-category-legend');
        if (!legendContainer) return;
        
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkMode ? '#E0E0E0' : '#333333';
        
        const legendItems = labels.map((label, index) => {
            return `
                <div class="category-legend-item">
                    <span class="category-marker" style="background-color: ${colors[index]}"></span>
                    <span class="category-label" style="color: ${textColor}">${label}</span>
                </div>
            `;
        }).join('');
        
        legendContainer.innerHTML = legendItems;
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

// Debug logging
console.log('PublicationsStats module loaded successfully');