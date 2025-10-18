document.addEventListener('DOMContentLoaded', () => {
    const projectGrid = document.getElementById('project-grid');

    if (!projectGrid) {
        console.error('Project grid container not found!');
        return;
    }

    fetch('/api/projects/published')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch published projects.');
            }
            return response.json();
        })
        .then(projects => {
            if (projects.length === 0) {
                projectGrid.innerHTML = '<p>Aucun projet publié pour le moment.</p>';
                return;
            }

            projects.forEach(projectFile => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card';

                // Le titre est dérivé du nom de fichier
                const title = projectFile.replace('.html', '').replace(/_/g, ' ');

                // Créer un lien vers la page du projet
                const projectLink = document.createElement('a');
                projectLink.href = `/public/projects/published/${projectFile}`; // Lien direct vers le fichier HTML

                projectCard.innerHTML = `
                    <img src="/public/images/project-placeholder.png" alt="Image du projet">
                    <div class="project-card-content">
                        <h2>${title}</h2>
                        <p>Cliquez pour voir les détails du projet.</p>
                    </div>
                `;

                projectLink.appendChild(projectCard);
                projectGrid.appendChild(projectLink);
            });
        })
        .catch(error => {
            console.error('Error fetching project list:', error);
            projectGrid.innerHTML = '<p>Erreur lors du chargement des projets.</p>';
        });
});
