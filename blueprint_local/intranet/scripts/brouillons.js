const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

document.addEventListener('DOMContentLoaded', () => {
  loadDrafts();
});

/**
 * Charge et affiche la liste des brouillons.
 */
async function loadDrafts() {
  try {
    const response = await fetch('/api/projects/drafts');
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
      tr.innerHTML = `
        <td>${draft.titre}</td>
        <td>${new Date(draft.dateModification).toLocaleString('fr-FR')}</td>
        <td>
          <div class="buttons">
            <a href="editor.html?file=${draft.fileName}" class="button is-small is-link">Modifier</a>
            <button class="button is-small is-success" onclick="submitForReview('${draft.fileName}')">Soumettre</button>
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
 * Soumet un brouillon pour relecture (publication).
 * @param {string} fileName - Le nom du fichier à publier.
 */
async function submitForReview(fileName) {
  if (!confirm(`Êtes-vous sûr de vouloir soumettre le projet "${fileName}" pour relecture ? Cette action le publiera.`)) {
    return;
  }

  try {
    const response = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: fileName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'La publication du projet a échoué');
    }

    notyf.success(`Projet "${fileName}" soumis avec succès !`);
    loadDrafts(); // Recharger la liste
  } catch (error) {
    notyf.error('Erreur lors de la soumission : ' + error.message);
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
    // Désactiver le bouton pour éviter les clics multiples
    button.classList.add('is-loading');

    const response = await fetch(`/api/drafts/${fileName}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'La suppression a échoué');
    }

    notyf.success(`Brouillon "${fileName}" supprimé.`);

    // Supprimer la ligne du tableau
    const row = button.closest('tr');
    row.parentNode.removeChild(row);

  } catch (error) {
    notyf.error('Erreur : ' + error.message);
    // Réactiver le bouton en cas d'erreur
    button.classList.remove('is-loading');
  }
}
