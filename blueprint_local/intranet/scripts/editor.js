// Initialisation TinyMCE (version locale)
tinymce.init({
  selector: 'textarea',
  plugins: 'lists link image table code',
  toolbar: 'undo redo | bold italic underline | bullist numlist | alignleft aligncenter alignright | link image | code',
  height: 180,
  menubar: false,
  branding: false,
  setup: (editor) => {
    editor.on('change keyup paste input', () => updatePreview());
  }
});

/// Sauvegarde un brouillon dans localStorage
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
    alert("⚠️ Merci de saisir un titre pour le projet.");
    return;
  }

  localStorage.setItem(`draft_${data.titre}`, JSON.stringify(data));
  alert(`✅ Brouillon "${data.titre}" enregistré !`);
  updateDraftList();
}

// Ouvre la fenêtre de gestion des brouillons
function showDrafts() {
  updateDraftList();
  document.getElementById('draftModal').classList.add('is-active');
}

// Ferme la fenêtre
function closeModal() {
  document.getElementById('draftModal').classList.remove('is-active');
}

// Met à jour la liste des brouillons dans la modale
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

// Charge un brouillon dans l’éditeur
function loadDraft(key) {
  const data = JSON.parse(localStorage.getItem(key));
  document.getElementById('titre').value = data.titre;
  tinymce.get('context').setContent(data.contexte || "");
  tinymce.get('objectifs').setContent(data.objectifs || "");
  tinymce.get('resultats').setContent(data.resultats || "");
  tinymce.get('ressenti').setContent(data.ressenti || "");
  updatePreview();
  closeModal();
  alert(`📖 Brouillon "${data.titre}" chargé.`);
}

// Supprime un brouillon
function deleteDraft(key) {
  if (confirm("Supprimer ce brouillon ?")) {
    localStorage.removeItem(key);
    updateDraftList();
  }
}

async function submitForReview() {
  const titre = document.getElementById('titre').value.trim();
  if (!titre) {
    alert("⚠️ Merci de saisir un titre avant de soumettre le projet.");
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
  const response = await fetch('../scripts/submitDraft.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    const res = await response.text();
    alert(`✅ Projet "${titre}" soumis pour relecture !\n${res}`);
  } else {
    alert("❌ Erreur : impossible de soumettre le projet. Vérifie les permissions.");
  }
}
