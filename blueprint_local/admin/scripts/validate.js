const notyf = new Notyf({
    duration: 4000,
    position: { x: 'right', y: 'top' },
    dismissible: true
});

document.addEventListener('DOMContentLoaded', () => {
    loadPendingProjects();
    loadPublishedProjects();
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
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 5px 0; font-size: 1.1em; font-weight: 600;">${project.titre || 'Sans titre'}</h3>
                    <small style="color: #666;">Tags: ${project.tags && project.tags.length > 0 ? project.tags.join(', ') : 'aucun'}</small>
                    ${project.fileName ? `<br><small style="color: #999;">Fichier: ${project.fileName}</small>` : ''}
                </div>
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
 * Charge les projets publiés pour la section "Projets publiés".
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

        container.innerHTML = '';
        projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 5px 0; font-size: 1.1em; font-weight: 600;">${project.titre || 'Sans titre'}</h3>
                    <small style="color: #666;">Tags: ${project.tags && project.tags.length > 0 ? project.tags.join(', ') : 'aucun'}</small>
                    ${project.fileName ? `<br><small style="color: #999;">Fichier: ${project.fileName}</small>` : ''}
                </div>
                <div class="buttons">
                    <a href="/public/projects/published/${project.fileName}" target="_blank" class="button is-info is-small">Voir</a>
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
 * Charge les projets publiés pour la gestion de la mise en avant (listes déroulantes).
 */
async function loadFeaturedProjects() {
    try {
        const response = await fetch('/api/projects/published?include_featured=true');
        if (!response.ok) throw new Error('Failed to fetch published projects.');

        const projects = await response.json();

        // Remplir les 4 listes déroulantes
        for (let position = 1; position <= 4; position++) {
            const select = document.getElementById(`featured-position-${position}`);
            if (!select) continue;

            // Vider et ajouter l'option par défaut
            select.innerHTML = '<option value="">-- Aucun projet --</option>';

            // Ajouter tous les projets
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.fileName;
                option.textContent = project.titre || project.fileName;
                
                // Sélectionner si ce projet est à cette position
                if (project.isFeatured && project.featuredPosition === position) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Erreur lors du chargement des projets à la une:', error);
    }
}

/**
 * Enregistre les projets sélectionnés pour la mise en avant.
 */
async function saveFeaturedProjects() {
    const featuredProjects = [];
    
    // Récupérer les projets sélectionnés depuis les 4 listes déroulantes
    for (let position = 1; position <= 4; position++) {
        const select = document.getElementById(`featured-position-${position}`);
        if (!select) continue;
        
        const fileName = select.value;
        if (fileName) {
            featuredProjects.push({ fileName, position });
        }
    }

    // Validation : chaque position doit être unique
    const positions = featuredProjects.map(p => p.position);
    if (new Set(positions).size !== positions.length) {
        alert("Erreur : Chaque projet mis en avant doit avoir une position unique (1, 2, 3, ou 4).");
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

        notyf.success('La sélection des projets à la une a été enregistrée !');
        loadPublishedProjects(); // Rafraîchir aussi la liste des projets publiés
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
    // Demander confirmation avec un modal
    const confirmed = await new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal is-active';
        modal.innerHTML = `
            <div class="modal-background"></div>
            <div class="modal-card">
                <header class="modal-card-head">
                    <p class="modal-card-title">Confirmer la publication</p>
                    <button class="delete" aria-label="close"></button>
                </header>
                <section class="modal-card-body">
                    <p>Confirmez vouloir publier le projet "<strong>${fileName}</strong>" ?</p>
                </section>
                <footer class="modal-card-foot">
                    <button class="button is-success" id="confirm-validate">Confirmer</button>
                    <button class="button" id="cancel-validate">Annuler</button>
                </footer>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#confirm-validate').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        modal.querySelector('#cancel-validate, .modal-background, .delete').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
    });

    if (!confirmed) {
        return;
    }

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

        notyf.success('Projet validé et publié avec succès !');
        // Rafraîchir les listes pour voir le changement
        loadPendingProjects();
        loadPublishedProjects();
        loadFeaturedProjects();
    } catch (error) {
        notyf.error(`Erreur lors de la validation : ${error.message}`);
        console.error(error);
    }
}

async function rejectProject(fileName) {
    // Créer un modal pour demander le motif de rejet
    const modal = document.createElement('div');
    modal.className = 'modal is-active';
    modal.innerHTML = `
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Rejeter le projet</p>
                <button class="delete" aria-label="close"></button>
            </header>
            <section class="modal-card-body">
                <p>Êtes-vous sûr de vouloir rejeter le projet "<strong>${fileName}</strong>" ?</p>
                <p class="help">L'étudiant pourra le voir et le modifier.</p>
                <div class="field mt-4">
                    <label class="label">Motif de rejet (optionnel mais recommandé)</label>
                    <div class="control">
                        <textarea class="textarea" id="rejection-reason" placeholder="Expliquez pourquoi le projet est rejeté..."></textarea>
                    </div>
                </div>
            </section>
            <footer class="modal-card-foot">
                <button class="button is-success" id="confirm-reject">Confirmer le rejet</button>
                <button class="button" id="cancel-reject">Annuler</button>
            </footer>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    return new Promise((resolve) => {
        modal.querySelector('#confirm-reject').addEventListener('click', async () => {
            const rejectionReason = modal.querySelector('#rejection-reason').value.trim();
            
            try {
                const response = await fetch('/api/reject_draft', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file: fileName, rejectionReason: rejectionReason || '' })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to reject project draft.');
                }

                notyf.success('Projet rejeté avec succès.');
                modal.remove();
                // Rafraîchir la liste des projets en attente
                loadPendingProjects();
                resolve(true);

            } catch (error) {
                notyf.error(`Erreur lors du rejet : ${error.message}`);
                console.error(error);
                resolve(false);
            }
        });
        
        modal.querySelector('#cancel-reject, .modal-background, .delete').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
    });
}
