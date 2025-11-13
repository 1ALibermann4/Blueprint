const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

let currentFile = null; // Pour garder une trace du fichier actuellement chargé

// --- Initialisation après le chargement du DOM ---
document.addEventListener('DOMContentLoaded', () => {
  tinymce.init({
    selector: '#tinymce-editor', // Sélecteur mis à jour
    plugins: 'link image media table code fullscreen autoresize',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist | link image media | code | fullscreen',
    height: '100%',
    automatic_uploads: true,
    images_upload_url: '/api/upload',
    file_picker_types: 'image',
    document_base_url: '/',
    setup: function(editor) {
      editor.on('init', () => {
        // Ajouter un petit délai pour s'assurer que l'éditeur est entièrement prêt
        setTimeout(() => {
          loadTemplate();
        }, 100);
      });
    }
  });
});

/**
 * Récupère le modèle de projet et le charge dans l'éditeur.
 */
async function loadTemplate() {
  try {
    const response = await fetch('/api/templates/project');
    if (!response.ok) throw new Error('Le chargement du modèle a échoué');
    const templateHtml = await response.text();
    tinymce.get('tinymce-editor').setContent(templateHtml);
    notyf.success('Modèle de projet chargé.');
  } catch (error) {
    notyf.error('Erreur : ' + error.message);
  }
}

/**
 * Affiche la modale avec la liste des brouillons.
 */
async function showDrafts() {
  try {
    const response = await fetch('/api/projects/drafts');
    if (!response.ok) throw new Error('La récupération des brouillons a échoué');

    const drafts = await response.json();
    const container = document.getElementById('draftList');
    container.innerHTML = '';

    if (drafts.length === 0) {
      container.innerHTML = '<p>Aucun brouillon trouvé.</p>';
    } else {
      drafts.forEach(file => {
        const div = document.createElement('div');
        div.className = 'box mb-2 is-flex is-justify-content-space-between is-align-items-center';
        div.innerHTML = `
          <span>${file}</span>
          <button class="button is-small is-link" onclick="loadDraft('${file}')">Ouvrir</button>
        `;
        container.appendChild(div);
      });
    }
    document.getElementById('draftModal').classList.add('is-active');
  } catch (error) {
    notyf.error('Erreur : ' + error.message);
  }
}

/**
 * Charge un projet brouillon dans l'éditeur.
 * @param {string} fileName - Le nom du fichier à charger.
 */
async function loadDraft(fileName) {
  try {
    // Ce point d'API devra être adapté pour renvoyer du HTML brut
    const response = await fetch(`/api/project?file=${fileName}&type=draft`);
    if (!response.ok) throw new Error('Le chargement du brouillon a échoué');

    // La logique côté serveur sera adaptée pour renvoyer une structure simple
    const project = await response.json();

    // Nous avons toujours besoin de remplir le champ titre
    document.getElementById('titre').value = project.frontMatter.titre || '';
    // Remplir les tags, en les joignant par une virgule si c'est un tableau
    document.getElementById('tags').value = (project.frontMatter.tags || []).join(', ');
    // Charger le contenu HTML complet
    tinymce.get('tinymce-editor').setContent(project.content || '');

    currentFile = fileName;
    closeModal();
    notyf.success(`Brouillon "${fileName}" chargé.`);
  } catch (error) {
    notyf.error('Erreur : ' + error.message);
  }
}

/**
 * Ferme la modale des brouillons.
 */
function closeModal() {
  document.getElementById('draftModal').classList.remove('is-active');
}

/**
 * Enregistre le projet actuel comme brouillon.
 */
async function saveDraft() {
  const titre = document.getElementById('titre').value.trim();
  if (!titre) {
    notyf.error("Le titre est obligatoire pour nommer le fichier.");
    return;
  }
  // Récupérer les tags et les transformer en tableau
  const tags = document.getElementById('tags').value.trim().split(',').map(tag => tag.trim()).filter(Boolean);

  // La nouvelle structure de données est beaucoup plus simple
  const data = {
    currentFile: currentFile,
    titre: titre,
    tags: tags,
    content: tinymce.get('tinymce-editor').getContent()
  };

  try {
    // Ce point d'API sera adapté pour gérer du HTML
    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error("L'enregistrement du brouillon a échoué");

    const result = await response.json();
    currentFile = result.file;
    notyf.success(`Brouillon "${titre}" enregistré !`);
  } catch (error) {
    notyf.error('Erreur : ' + error.message);
  }
}

/**
 * Soumet le brouillon actuel pour relecture (publication).
 */
async function submitForReview() {
  if (!currentFile) {
    notyf.error("Veuillez d'abord enregistrer un brouillon avant de le soumettre.");
    return;
  }

  if (!confirm(`Êtes-vous sûr de vouloir soumettre le projet "${currentFile}" pour relecture ? Cette action le publiera.`)) {
    return;
  }

  try {
    const response = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentFile })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'La publication du projet a échoué');
    }

    notyf.success(`Projet "${currentFile}" publié avec succès !`);
    resetEditor();
  } catch (error) {
    notyf.error('Erreur lors de la publication : ' + error.message);
  }
}

/**
 * Réinitialise l'éditeur pour un nouveau projet.
 */
function resetEditor() {
  document.getElementById('titre').value = '';
  currentFile = null;
  // Recharger le modèle de base
  loadTemplate();
}
