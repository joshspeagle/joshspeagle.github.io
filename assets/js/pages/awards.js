/**
 * Awards page content
 */

export function createAwardsContent(data) {
    if (!data || !data.awards) {
        return '<p>No awards data available.</p>';
    }

    return `
        <div class="awards-container" role="main" aria-label="Awards and honors">
            <div class="research-grid" role="list" aria-label="List of ${data.awards.length} awards and honors">
                ${data.awards.map((award, index) => `
                    <div class="research-card award-item"
                         role="listitem"
                         aria-labelledby="award-title-${index}"
                         aria-describedby="award-desc-${index} award-meta-${index}"
                         tabindex="0">
                        <div class="award-header">
                            <h4 id="award-title-${index}">${award.title}</h4>
                            <div class="award-meta" id="award-meta-${index}" aria-label="Award details">
                                <span class="award-year" aria-label="Year received">${award.year}</span>
                                <span class="award-separator" aria-hidden="true">•</span>
                                <span class="award-organization" aria-label="Awarding organization">${award.organization}</span>
                            </div>
                        </div>
                        <p class="award-description" id="award-desc-${index}">${award.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
