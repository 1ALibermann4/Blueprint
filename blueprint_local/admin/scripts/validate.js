document.addEventListener('DOMContentLoaded', () => {
    loadPendingProjects();
    loadFeaturedProjects();
});

/**
 * Charge et affiche les projets en attente de relecture.
 * @param {string} sortBy - Le critère de tri ('date' ou 'title').
 * @param {string} tag - Le tag par lequel filtrer.
 */
async function loadPendingProjects(sortBy = 'date', tag = '') {
    const container = document.getElementById('pending-projects-list');
    container.innerHTML = '<p>Chargement...</p>';

    try {
        let apiUrl = `/api/projects/drafts?sortBy=${sortBy}`;
        if (tag) {
            apiUrl += `&tag=${encodeURIComponent(tag)}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch pending projects.');

        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = '<p>Aucun projet en attente correspondant aux critères.</p>';
            return;
        }

        container.innerHTML = ''; // Vider le conteneur
        projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `
                <span>
                    <strong>${project.titre}</strong><br>
                    <small>Tags: ${project.tags.join(', ') || 'aucun'}</small>
                </span>
                <div class="buttons">
                    <button class="button is-info is-small" onclick="reviewProject('${project.fileName}')">Relire</button>
                    <button class="button is-success is-small" onclick="validateProject('${project.fileName}')">Valider</button>
                    <button class="button is-danger is-small" onclick="rejectProject('${project.fileName}')">Rejeter</button>
                </div>
            `;
            container.appendChild(projectItem);
        });
    } catch (error) {
        container.innerHTML = '<p class="has-text-danger">Erreur lors du chargement des projets.</p>';
        console.error(error);
    }
}

/**
 * Charge les projets publiés pour la gestion de la mise en avant.
 */
async function loadFeaturedProjects() {
    const container = document.getElementById('featured-projects-list');
    container.innerHTML = '<p>Chargement...</p>';

    try {
        const response = await fetch('/api/projects/published?include_featured=true');
        if (!response.ok) throw new Error('Failed to fetch published projects.');

        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = '<p>Aucun projet publié.</p>';
            return;
        }

        let html = '';
        projects.forEach(project => {
            html += `
                <div class="field">
                    <label class="checkbox">
                        <input type="checkbox" name="featuredProject" value="${project.fileName}" ${project.isFeatured ? 'checked' : ''}>
                        ${project.titre} (Position: <input type="number" class="input is-small" style="width: 60px;" name="featuredPosition" data-file="${project.fileName}" value="${project.featuredPosition || ''}" min="1" max="4">)
                    </label>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<p class="has-text-danger">Erreur lors du chargement des projets.</p>';
        console.error(error);
    }
}

/**
 * Enregistre les projets sélectionnés pour la mise en avant.
 */
async function saveFeaturedProjects() {
    const featuredProjects = [];
    document.querySelectorAll('input[name="featuredProject"]:checked').forEach(checkbox => {
        const fileName = checkbox.value;
        const positionInput = document.querySelector(`input[name="featuredPosition"][data-file="${fileName}"]`);
        const position = positionInput ? parseInt(positionInput.value, 10) : 0;

        if (position >= 1 && position <= 4) {
            featuredProjects.push({ fileName, position });
        }
    });

    // Simple validation côté client
    const positions = featuredProjects.map(p => p.position);
    if (new Set(positions).size !== positions.length) {
        alert("Erreur : Chaque projet mis en avant doit avoir une position unique (1, 2, 3, ou 4).");
        return;
    }
    if (featuredProjects.length > 4) {
        alert("Erreur : Vous ne pouvez pas mettre plus de 4 projets en avant.");
        return;
    }

    try {
        const response = await fetch('/api/projects/featured', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ featured: featuredProjects })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'La sauvegarde a échoué.');
        }

        alert('La sélection des projets à la une a été enregistrée !');
        loadFeaturedProjects();

    } catch (error) {
        alert(`Erreur lors de la sauvegarde : ${error.message}`);
        console.error(error);
    }
}

/**
 * Applique le filtre par tag en rechargeant la liste.
 */
function applyTagFilter() {
    const tag = document.getElementById('tag-filter-input').value.trim();
    // Le premier argument est le tri, gardons 'date' par défaut lors du filtrage
    loadPendingProjects('date', tag);
}

// --- Fonctions pour les actions ---

function reviewProject(fileName) {
    // Ouvre la page de relecture dans un nouvel onglet en passant le nom du fichier en paramètre
    window.open(`/admin/review.html?file=${encodeURIComponent(fileName)}`, '_blank');
}

async function validateProject(fileName) {
    try {
        const response = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: fileName }) // L'API attend la clé 'file' avec le nom de fichier complet
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to publish project.');
        }

        alert('Projet validé et publié avec succès !');
        // Rafraîchir les deux listes pour voir le changement
        loadPendingProjects();
        loadPublishedProjects();

    } catch (error) {
        alert(`Erreur lors de la validation : ${error.message}`);
        console.error(error);
    }
}

async function rejectProject(fileName) {
    if (!confirm(`Êtes-vous sûr de vouloir rejeter le projet "${fileName}" ? L'étudiant pourra le voir et le modifier.`)) {
        return;
    }

    try {
        const response = await fetch('/api/reject_draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: fileName })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to reject project draft.');
        }

        alert('Projet rejeté avec succès.');
        // Rafraîchir la liste des projets en attente
        loadPendingProjects();

    } catch (error) {
        alert(`Erreur lors du rejet : ${error.message}`);
        console.error(error);
    }
}
