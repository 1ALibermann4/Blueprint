const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

document.addEventListener('DOMContentLoaded', () => {
  loadDrafts();
  loadPublishedProjects();
});

/**
 * Charge et affiche la liste de tous les brouillons de l'étudiant.
 */
async function loadDrafts() {
  try {
    const response = await fetch('/api/projects/my_drafts');
    if (!response.ok) throw new Error('La récupération des brouillons a échoué');

    const drafts = await response.json();
    const container = document.getElementById('draftList');
    container.innerHTML = '';

    if (drafts.length === 0) {
      container.innerHTML = '<p>Aucun brouillon trouvé. Créez votre premier projet !</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'table is-fullwidth is-hoverable';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Titre du Projet</th>
          <th>Statut</th>
          <th>Dernière modification</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;
    const tbody = table.querySelector('tbody');

    for (const draft of drafts) {
      const tr = document.createElement('tr');
      const statusInfo = getStatusInfo(draft.status);

      let actionsHtml = '';
      if (draft.status === 'draft') {
        actionsHtml = `
          <div class="buttons">
            <a href="editor.html?file=${draft.fileName}" class="button is-small is-link">Modifier</a>
            <button class="button is-small is-danger" onclick="deleteDraft('${draft.fileName}', this)">Supprimer</button>
          </div>`;
      } else if (draft.status === 'rejected') {
        actionsHtml = `
          <div class="buttons">
            <a href="editor.html?file=${draft.fileName}" class="button is-small is-link">Modifier</a>
            <button class="button is-small is-info" onclick="showRejectionReason('${draft.fileName}')">Voir le motif</button>
            <button class="button is-small is-danger" onclick="deleteDraft('${draft.fileName}', this)">Supprimer</button>
          </div>`;
      } else if (draft.status === 'pending_review') {
        actionsHtml = `<span class="has-text-grey">En relecture</span>`;
      }

      tr.innerHTML = `
        <td>${draft.titre}</td>
        <td><span class="tag ${statusInfo.color}">${statusInfo.text}</span></td>
        <td>${new Date(draft.dateModification).toLocaleString('fr-FR')}</td>
        <td>${actionsHtml}</td>
      `;
      tbody.appendChild(tr);
    }
    container.appendChild(table);

  } catch (error) {
    notyf.error('Erreur : ' + error.message);
    const container = document.getElementById('draftList');
    container.innerHTML = '<p class="has-text-danger">Impossible de charger les brouillons.</p>';
  }
}

/**
 * Retourne le texte et la couleur associés à un statut.
 * @param {string} status - Le statut du brouillon.
 * @returns {{text: string, color: string}}
 */
function getStatusInfo(status) {
    switch (status) {
        case 'pending_review':
            return { text: 'En attente de relecture', color: 'is-warning' };
        case 'rejected':
            return { text: 'Rejeté', color: 'is-danger' };
        case 'draft':
        default:
            return { text: 'Brouillon', color: 'is-info' };
    }
}

/**
 * Supprime un brouillon.
 * @param {string} fileName - Le nom du fichier à supprimer.
 * @param {HTMLElement} button - Le bouton sur lequel on a cliqué.
 */
async function deleteDraft(fileName, button) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer le brouillon "${fileName}" ? Cette action est irréversible.`)) {
    return;
  }

  try {
    button.classList.add('is-loading');

    const response = await fetch(`/api/drafts/${fileName}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'La suppression a échoué');
    }

    notyf.success(`Brouillon "${fileName}" supprimé.`);

    const row = button.closest('tr');
    row.parentNode.removeChild(row);

  } catch (error) {
    notyf.error('Erreur : ' + error.message);
    button.classList.remove('is-loading');
  }
}

/**
 * Affiche le motif de rejet d'un projet.
 * @param {string} fileName - Le nom du fichier du projet rejeté.
 */
async function showRejectionReason(fileName) {
  try {
    const response = await fetch(`/api/project?file=${encodeURIComponent(fileName)}&type=draft`);
    if (!response.ok) throw new Error('Impossible de charger les détails du projet');

    const project = await response.json();
    
    // Récupérer le motif de rejet depuis le frontMatter
    const frontMatter = project.frontMatter || {};
    const rejectionReason = frontMatter.rejectionReason;
    const rejectedAt = frontMatter.rejectedAt;
    
    console.log('Full project response:', project);
    console.log('Front matter keys:', Object.keys(frontMatter));
    console.log('Rejection reason value:', rejectionReason);
    console.log('Rejection reason type:', typeof rejectionReason);
    
    const projectTitle = frontMatter.titre || fileName;
    const dateStr = rejectedAt ? new Date(rejectedAt).toLocaleString('fr-FR') : 'Non spécifiée';
    
    // Vérifier si le motif existe - accepter null, undefined, ou chaîne vide
    let reasonText = 'Aucun motif spécifié par l\'administrateur.';
    if (rejectionReason != null && rejectionReason !== undefined) {
      const trimmed = String(rejectionReason).trim();
      if (trimmed.length > 0) {
        reasonText = trimmed;
      }
    }
    
    // Échapper le HTML pour éviter les problèmes d'affichage
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    };
    
    // Créer le modal
    const modal = document.createElement('div');
    modal.className = 'modal is-active';
    modal.id = 'rejection-reason-modal';
    
    modal.innerHTML = `
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Motif de rejet</p>
          <button class="delete" aria-label="close" id="modal-close-btn"></button>
        </header>
        <section class="modal-card-body">
          <p><strong>Projet :</strong> <span style="color: #3273dc;">${escapeHtml(projectTitle)}</span></p>
          <p><strong>Date de rejet :</strong> <span style="color: #3273dc;">${dateStr}</span></p>
          <div class="field mt-4">
            <label class="label">Motif de rejet :</label>
            <div class="box" style="min-height: 100px; padding: 1rem; background-color: #f5f5f5;">
              <p style="white-space: pre-wrap; word-wrap: break-word; margin: 0; color: ${reasonText === 'Aucun motif spécifié par l\'administrateur.' ? '#999' : '#333'};">
                ${escapeHtml(reasonText)}
              </p>
            </div>
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="button" id="close-rejection-modal">Fermer</button>
        </footer>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fonction pour fermer le modal
    const closeModal = (e) => {
      e?.stopPropagation();
      modal.classList.remove('is-active');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    };
    
    // Ajouter les event listeners avec capture pour éviter les problèmes
    const closeBtn = modal.querySelector('#close-rejection-modal');
    const deleteBtn = modal.querySelector('#modal-close-btn');
    const background = modal.querySelector('.modal-background');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal, true);
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', closeModal, true);
    }
    if (background) {
      background.addEventListener('click', (e) => {
        if (e.target === background) {
          closeModal(e);
        }
      }, true);
    }
    
    // Empêcher la propagation du clic sur le modal-card
    const modalCard = modal.querySelector('.modal-card');
    if (modalCard) {
      modalCard.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
  } catch (error) {
    notyf.error('Erreur : ' + error.message);
    console.error(error);
  }
}

/**
 * Charge et affiche la liste des projets publiés.
 */
async function loadPublishedProjects() {
  try {
    const response = await fetch('/api/projects/published');
    if (!response.ok) throw new Error('La récupération des projets publiés a échoué');

    const projects = await response.json();
    const container = document.getElementById('publishedList');
    container.innerHTML = '';

    if (projects.length === 0) {
      container.innerHTML = '<p>Aucun projet publié pour le moment.</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'table is-fullwidth is-hoverable';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Titre du Projet</th>
          <th>Date de publication</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;
    const tbody = table.querySelector('tbody');

    for (const project of projects) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${project.titre}</td>
        <td>${new Date(project.dateModification).toLocaleString('fr-FR')}</td>
        <td>
          <a href="/public/projects/published/${project.fileName}" class="button is-small is-primary" target="_blank">Voir</a>
        </td>
      `;
      tbody.appendChild(tr);
    }
    container.appendChild(table);

  } catch (error) {
    notyf.error('Erreur : ' + error.message);
    const container = document.getElementById('publishedList');
    container.innerHTML = '<p class="has-text-danger">Impossible de charger les projets publiés.</p>';
  }
}
