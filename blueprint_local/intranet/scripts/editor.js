const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

/**
 * Saves the current state of the editor as a draft in localStorage.
 * It constructs a data object with the project title and content from the
 * TinyMCE editors. If the title is missing, it alerts the user.
 * Otherwise, it saves the draft and updates the draft list.
 */
function saveDraft() {
  const data = {
    titre: document.getElementById('titre').value,
    contexte: tinymce.get('context').getContent(),
    objectifs: tinymce.get('objectifs').getContent(),
    resultats: tinymce.get('resultats').getContent(),
    ressenti: tinymce.get('ressenti').getContent(),
    date: new Date().toLocaleString()
  };

  if (!data.titre) {
    notyf.error("Merci de saisir un titre pour le projet.");
    return;
  }

  localStorage.setItem(`draft_${data.titre}`, JSON.stringify(data));
  notyf.success(`Brouillon "${data.titre}" enregistré !`);
  updateDraftList();
}

/**
 * Opens the draft management modal window.
 * It first updates the list of drafts and then makes the modal visible.
 */
function showDrafts() {
  updateDraftList();
  document.getElementById('draftModal').classList.add('is-active');
}

/**
 * Closes the draft management modal window.
 */
function closeModal() {
  document.getElementById('draftModal').classList.remove('is-active');
}

/**
 * Updates the list of drafts displayed in the modal.
 * It retrieves all draft keys from localStorage, clears the current list,
 * and then repopulates it with the latest draft information.
 */
function updateDraftList() {
  const container = document.getElementById('draftList');
  const drafts = Object.keys(localStorage).filter(k => k.startsWith("draft_"));
  container.innerHTML = "";

  if (drafts.length === 0) {
    container.innerHTML = "<p>Aucun brouillon enregistré.</p>";
    return;
  }

  drafts.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    const div = document.createElement('div');
    div.className = "box mb-2";

    div.innerHTML = `
      <strong>${data.titre}</strong><br>
      <small>Enregistré le ${data.date}</small>
      <div class="buttons mt-2">
        <button class="button is-small is-link" onclick="loadDraft('${key}')">Ouvrir</button>
        <button class="button is-small is-danger" onclick="deleteDraft('${key}')">Supprimer</button>
      </div>
    `;
    container.appendChild(div);
  });
}

/**
 * Loads a selected draft into the editor.
 * @param {string} key The localStorage key for the draft to load.
 */
function loadDraft(key) {
  const data = JSON.parse(localStorage.getItem(key));
  document.getElementById('titre').value = data.titre;
  tinymce.get('context').setContent(data.contexte || "");
  tinymce.get('objectifs').setContent(data.objectifs || "");
  tinymce.get('resultats').setContent(data.resultats || "");
  tinymce.get('ressenti').setContent(data.ressenti || "");
  updatePreview();
  closeModal();
  notyf.success(`Brouillon "${data.titre}" chargé.`);
}

/**
 * Deletes a draft from localStorage.
 * @param {string} key The localStorage key for the draft to delete.
 */
function deleteDraft(key) {
  if (confirm("Supprimer ce brouillon ?")) {
    localStorage.removeItem(key);
    updateDraftList();
  }
}

/**
 * Submits the current project for review.
 * It gathers the data from the form, sends it to the `submitDraft.sh`
 * script on the server, and handles the response.
 * @returns {Promise<void>} A promise that resolves when the submission is complete.
 */
async function submitForReview() {
  const titre = document.getElementById('titre').value.trim();
  if (!titre) {
    notyf.error("Merci de saisir un titre avant de soumettre le projet.");
    return;
  }

  const data = {
    titre,
    contexte: tinymce.get('context').getContent(),
    objectifs: tinymce.get('objectifs').getContent(),
    resultats: tinymce.get('resultats').getContent(),
    ressenti: tinymce.get('ressenti').getContent(),
    date: new Date().toISOString()
  };

  // Envoi du brouillon au serveur pour copie dans /drafts/
  const response = await fetch('/api/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    const res = await response.json();
    notyf.success(`Projet "${titre}" soumis pour relecture !`);
    // Optionally, clear the form or redirect
  } else {
    notyf.error("Erreur : impossible de soumettre le projet.");
  }
}
