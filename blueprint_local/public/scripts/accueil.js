document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProjects();
});

/**
 * Charge et affiche les projets mis en avant.
 */
async function loadFeaturedProjects() {
    const mainProjectContainer = document.querySelector('.main-project-card');
    const sideProjectsContainer = document.querySelector('.side-projects-list');

    try {
        const response = await fetch('/api/projects/published?include_featured=true');
        if (!response.ok) throw new Error('Failed to fetch featured projects.');

        const projects = await response.json();
        const featuredProjects = projects
            .filter(p => p.isFeatured && p.featuredPosition)
            .sort((a, b) => a.featuredPosition - b.featuredPosition);

        // Vider les conteneurs existants
        mainProjectContainer.innerHTML = '';
        sideProjectsContainer.innerHTML = '';

        if (featuredProjects.length === 0) {
            mainProjectContainer.innerHTML = '<p>Aucun projet mis en avant pour le moment.</p>';
            return;
        }

        // Afficher le projet n°1
        const mainProject = featuredProjects[0];
        if (mainProject) {
            mainProjectContainer.innerHTML = `
                <div class="main-project-images">
                    <!-- Les images du projet principal pourraient être chargées dynamiquement ici -->
                    <img src="/images/project-placeholder.png" alt="Image principale du projet">
                </div>
                <div class="main-project-content">
                    <h2>${mainProject.titre}</h2>
                    <div class="project-meta">
                        <span>${mainProject.tags.join(', ') || 'Projet étudiant'}</span>
                        <a href="/public/projects/published/${mainProject.fileName}" class="learn-more">En savoir plus <span class="arrow">→</span></a>
                    </div>
                </div>
            `;
        }

        // Afficher les projets n°2, 3, 4
        for (let i = 1; i < featuredProjects.length && i < 4; i++) {
            const sideProject = featuredProjects[i];
            const projectItem = document.createElement('div');
            projectItem.className = 'side-project-item';
            projectItem.innerHTML = `
                <img src="/images/project-placeholder.png" alt="Image du projet">
                <div class="side-project-text">
                    <h3>${sideProject.titre}</h3>
                    <p>${sideProject.tags.join(', ') || ''}</p>
                    <a href="/public/projects/published/${sideProject.fileName}" class="learn-more">En savoir plus <span class="arrow">→</span></a>
                </div>
            `;
            sideProjectsContainer.appendChild(projectItem);
        }

        // Ajouter le bouton "Voir Plus"
        const viewMoreBtn = document.createElement('a');
        viewMoreBtn.href = 'project_list.html';
        viewMoreBtn.className = 'view-more-btn';
        viewMoreBtn.textContent = 'Voir Plus';
        sideProjectsContainer.appendChild(viewMoreBtn);

    } catch (error) {
        mainProjectContainer.innerHTML = '<p class="has-text-danger">Erreur lors du chargement des projets.</p>';
        console.error(error);
    }
}
