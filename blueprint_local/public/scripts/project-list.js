document.addEventListener('DOMContentLoaded', () => {
    // Charger les projets par défaut (triés par date)
    loadProjects('date');
});

/**
 * Charge et affiche les projets publiés.
 * @param {string} sortBy - Le critère de tri ('date' ou 'title').
 * @param {string} tag - Le tag par lequel filtrer.
 */
async function loadProjects(sortBy = 'date', tag = '') {
    const projectGrid = document.getElementById('project-grid');
    if (!projectGrid) {
        console.error('Project grid container not found!');
        return;
    }

    projectGrid.innerHTML = '<p>Chargement des projets...</p>';

    try {
        let apiUrl = `/api/projects/published?sortBy=${sortBy}`;
        if (tag) {
            apiUrl += `&tag=${encodeURIComponent(tag)}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch published projects.');
        }

        const projects = await response.json();

        projectGrid.innerHTML = ''; // Vider la grille avant d'ajouter les nouveaux éléments

        if (projects.length === 0) {
            projectGrid.innerHTML = '<p>Aucun projet publié correspondant aux critères.</p>';
            return;
        }

        projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';

            const projectLink = document.createElement('a');
            projectLink.href = `/public/projects/published/${project.fileName}`;

            projectCard.innerHTML = `
                <img src="/public/images/project-placeholder.png" alt="Image du projet">
                <div class="project-card-content">
                    <h2>${project.titre}</h2>
                    <p>Tags: ${project.tags.join(', ') || 'aucun'}</p>
                </div>
            `;

            projectLink.appendChild(projectCard);
            projectGrid.appendChild(projectLink);
        });
    } catch (error) {
        console.error('Error fetching project list:', error);
        projectGrid.innerHTML = '<p>Erreur lors du chargement des projets.</p>';
    }
}

/**
 * Applique le filtre par tag en rechargeant la liste.
 */
function applyTagFilter() {
    const tag = document.getElementById('tag-filter-input').value.trim();
    loadProjects('date', tag); // Garder le tri par date par défaut lors du filtrage
}
