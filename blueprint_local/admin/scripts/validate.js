document.addEventListener('DOMContentLoaded', () => {
    loadPendingProjects();
    loadPublishedProjects();
    loadLoginHistory();
});

/**
 * Charge et affiche les projets en attente de relecture.
 */
async function loadPendingProjects() {
    const container = document.getElementById('pending-projects-list');
    container.innerHTML = '<p>Chargement...</p>';

    try {
        const response = await fetch('/api/projects/drafts');
        if (!response.ok) throw new Error('Failed to fetch pending projects.');

        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = '<p>Aucun projet en attente.</p>';
            return;
        }

        container.innerHTML = ''; // Vider le conteneur
        projects.forEach(file => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `
                <span>${file}</span>
                <div class="buttons">
                    <button class="button is-info is-small" onclick="reviewProject('${file}')">Relire</button>
                    <button class="button is-success is-small" onclick="validateProject('${file}')">Valider</button>
                    <button class="button is-danger is-small" onclick="rejectProject('${file}')">Rejeter</button>
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
 * Charge et affiche l'historique des connexions.
 */
async function loadLoginHistory() {
    const container = document.getElementById('login-history');
    container.innerHTML = '<p>Chargement...</p>';

    try {
        const response = await fetch('/api/logs/logins');
        if (!response.ok) throw new Error('Failed to fetch login history.');

        const loginEvents = await response.json();

        if (loginEvents.length === 0) {
            container.innerHTML = '<p>Aucune activité de connexion enregistrée.</p>';
            return;
        }

        let html = '<ul>';
        loginEvents.forEach(event => {
            const timestamp = new Date(event.timestamp).toLocaleString('fr-FR');
            html += `<li><strong>${event.details.user}</strong> s'est connecté(e) le ${timestamp}</li>`;
        });
        html += '</ul>';

        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<p class="has-text-danger">Erreur lors du chargement de l\'historique.</p>';
        console.error(error);
    }
}

/**
 * Charge et affiche les projets déjà publiés.
 */
async function loadPublishedProjects() {
    const container = document.getElementById('published-projects-list');
    container.innerHTML = '<p>Chargement...</p>';

    try {
        const response = await fetch('/api/projects/published');
        if (!response.ok) throw new Error('Failed to fetch published projects.');

        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = '<p>Aucun projet publié.</p>';
            return;
        }

        container.innerHTML = ''; // Vider le conteneur
        projects.forEach(file => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `<span>${file}</span>`;
            container.appendChild(projectItem);
        });
    } catch (error) {
        container.innerHTML = '<p class="has-text-danger">Erreur lors du chargement des projets.</p>';
        console.error(error);
    }
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
            body: JSON.stringify({ fileName: fileName.replace('.md', '') }) // L'API attend le nom sans extension
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
    if (!confirm(`Êtes-vous sûr de vouloir rejeter et supprimer définitivement le projet "${fileName}" ?`)) {
        return;
    }

    try {
        // Note: L'API attend le nom de fichier complet, y compris l'extension .md
        const response = await fetch(`/api/drafts/${fileName}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete project draft.');
        }

        alert('Projet rejeté et supprimé avec succès.');
        // Rafraîchir la liste des projets en attente
        loadPendingProjects();

    } catch (error) {
        alert(`Erreur lors du rejet : ${error.message}`);
        console.error(error);
    }
}
