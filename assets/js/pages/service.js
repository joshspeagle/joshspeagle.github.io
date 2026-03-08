/**
 * Service page content
 */

export function createServiceContent(data) {
    if (!data || !data.categories) {
        return '<p>No service data available.</p>';
    }

    const visibleCategories = data.categories.filter(category => !category.hidden);

    return `
        <div class="service-container" role="main" aria-label="Professional service and leadership">
            ${visibleCategories.map((category, categoryIndex) => `
                <section class="service-category"
                         role="region"
                         aria-labelledby="category-${category.title.replace(/\s+/g, '-').toLowerCase()}"
                         aria-describedby="category-desc-${categoryIndex}">
                    <h3 id="category-${category.title.replace(/\s+/g, '-').toLowerCase()}" class="service-category-title">${category.title}</h3>
                    <div class="service-organizations"
                         role="list"
                         id="category-desc-${categoryIndex}"
                         aria-label="Organizations and positions in ${category.title}">
                        ${category.organizations ? category.organizations.filter(org => !org.hidden).map((org, orgIndex) => `
                            <div class="service-organization-group"
                                 role="listitem"
                                 aria-labelledby="org-${categoryIndex}-${orgIndex}"
                                 tabindex="0">
                                <h4 class="organization-name" id="org-${categoryIndex}-${orgIndex}">${org.name}</h4>
                                <div class="organization-positions"
                                     role="list"
                                     aria-label="Positions at ${org.name}">
                                    ${org.positions.map((position, posIndex) => `
                                        <div class="position-item"
                                             role="listitem"
                                             aria-labelledby="pos-${categoryIndex}-${orgIndex}-${posIndex}"
                                             aria-describedby="periods-${categoryIndex}-${orgIndex}-${posIndex}">
                                            <div class="position-header">
                                                <span class="position-role" id="pos-${categoryIndex}-${orgIndex}-${posIndex}">${position.role}</span>
                                                <div class="position-periods"
                                                     id="periods-${categoryIndex}-${orgIndex}-${posIndex}"
                                                     aria-label="Service periods"
                                                     role="list">
                                                    ${position.periods.map((period, periodIndex) => `
                                                        <span class="period-tag"
                                                              role="listitem"
                                                              aria-label="Service period ${period}">${period}</span>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('') :
                        category.items ? category.items.map((item, itemIndex) => `
                            <div class="service-item"
                                 role="listitem"
                                 aria-labelledby="item-${categoryIndex}-${itemIndex}"
                                 tabindex="0">
                                <div class="service-item-header">
                                    <h4 class="service-role" id="item-${categoryIndex}-${itemIndex}">${item.role}</h4>
                                    <div class="service-period" aria-label="Service period">${item.period}</div>
                                </div>
                                ${item.organization ? `<div class="service-organization" aria-label="Organization">${item.organization}</div>` : ''}
                            </div>
                        `).join('') : ''}
                    </div>
                </section>
            `).join('')}
        </div>
    `;
}
