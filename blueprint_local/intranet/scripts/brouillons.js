const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

document.addEventListener('DOMContentLoaded', () => {
  loadDrafts();
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

      let actionButtons = '';
      if (draft.status === 'draft' || draft.status === 'rejected') {
        actionButtons = `<a href="editor.html?file=${draft.fileName}" class="button is-small is-link">Modifier</a>`;
      } else if (draft.status === 'pending_review') {
        actionButtons = `<button class="button is-small is-link" disabled>En relecture</button>`;
      }

      tr.innerHTML = `
        <td>${draft.titre}</td>
        <td><span class="tag ${statusInfo.color}">${statusInfo.text}</span></td>
        <td>${new Date(draft.dateModification).toLocaleString('fr-FR')}</td>
        <td>
          <div class="buttons">
            ${actionButtons}
            <button class="button is-small is-danger" onclick="deleteDraft('${draft.fileName}', this)">Supprimer</button>
          </div>
        </td>
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
