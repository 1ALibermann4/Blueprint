const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

let currentFile = null; // To keep track of the currently loaded file

// --- Initialization on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  tinymce.init({
    selector: '#contenu-principal',
    plugins: 'link image media table code autoresize',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist | link image media | code',
    setup: function(editor) {
      // This setup function is the core of the event handling
      editor.on('init', () => {
        updatePreview(); // Initial preview
        setupPreviewEventListeners(); // Attach listeners to all fields
      });

      // Update preview on any change in the editor
      editor.on('keyup change input', () => {
        updatePreview();
      });
    }
  });
});

/**
 * Attaches event listeners to all form fields to trigger live preview updates.
 */
function setupPreviewEventListeners() {
  const fieldsToWatch = [
    'titre', 'contexte', 'objectifs', 'resultats',
    'ressenti', 'etudiants', 'encadrants'
  ];

  fieldsToWatch.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('keyup', updatePreview);
      element.addEventListener('change', updatePreview);
      element.addEventListener('input', updatePreview); // More reliable for programmatic changes
    }
  });
}


/**
 * Shows the modal with a list of draft projects.
 */
async function showDrafts() {
  try {
    const response = await fetch('/api/projects/drafts');
    if (!response.ok) throw new Error('Failed to fetch drafts');

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
    notyf.error('Erreur: ' + error.message);
  }
}

/**
 * Loads a draft project into the editor.
 * @param {string} fileName - The name of the file to load.
 */
async function loadDraft(fileName) {
  try {
    const response = await fetch(`/api/project?file=${fileName}&type=draft`);
    if (!response.ok) throw new Error('Failed to load draft');

    const project = await response.json();

    // Populate form fields
    document.getElementById('titre').value = project.frontMatter.titre || '';
    document.getElementById('contexte').value = project.frontMatter.contexte || '';
    document.getElementById('objectifs').value = project.frontMatter.objectifs || '';
    document.getElementById('resultats').value = project.frontMatter.resultats || '';
    document.getElementById('ressenti').value = project.frontMatter.ressenti || '';
    document.getElementById('etudiants').value = (project.frontMatter.etudiants || []).join('\n');
    document.getElementById('encadrants').value = (project.frontMatter.encadrants || []).join('\n');

    tinymce.get('contenu-principal').setContent(project.content || '');

    currentFile = fileName;
    closeModal();
    notyf.success(`Brouillon "${fileName}" chargé.`);
    updatePreview(); // Refresh preview after loading
  } catch (error) {
    notyf.error('Erreur: ' + error.message);
  }
}

/**
 * Closes the drafts modal.
 */
function closeModal() {
  document.getElementById('draftModal').classList.remove('is-active');
}

/**
 * Saves the current project as a draft.
 */
async function saveDraft() {
  const titre = document.getElementById('titre').value.trim();
  if (!titre) {
    notyf.error("Le titre est obligatoire.");
    return;
  }

  const data = {
    currentFile: currentFile,
    frontMatter: {
      titre: titre,
      contexte: document.getElementById('contexte').value,
      objectifs: document.getElementById('objectifs').value,
      resultats: document.getElementById('resultats').value,
      ressenti: document.getElementById('ressenti').value,
      etudiants: document.getElementById('etudiants').value.split('\n').filter(Boolean),
      encadrants: document.getElementById('encadrants').value.split('\n').filter(Boolean),
      date_de_creation: new Date().toISOString()
    },
    content: tinymce.get('contenu-principal').getContent()
  };

  try {
    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to save draft');

    const result = await response.json();
    currentFile = result.file;
    notyf.success(`Brouillon "${titre}" enregistré !`);
  } catch (error) {
    notyf.error('Erreur: ' + error.message);
  }
}

/**
 * Submits the current draft for review, which means publishing it.
 * This function will call the publish API endpoint.
 */
async function submitForReview() {
  if (!currentFile) {
    notyf.error("Veuillez d'abord enregistrer un brouillon avant de le soumettre.");
    return;
  }

  // Simple confirmation dialog
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
      throw new Error(errorData.error || 'Failed to publish project');
    }

    notyf.success(`Projet "${currentFile}" publié avec succès !`);

    // Reset the editor for a new project
    resetEditor();

  } catch (error) {
    notyf.error('Erreur lors de la publication : ' + error.message);
  }
}

/**
 * Resets all form fields to their initial state.
 */
function resetEditor() {
  document.getElementById('titre').value = '';
  document.getElementById('contexte').value = '';
  document.getElementById('objectifs').value = '';
  document.getElementById('resultats').value = '';
  document.getElementById('ressenti').value = '';
  document.getElementById('etudiants').value = '';
  document.getElementById('encadrants').value = '';
  tinymce.get('contenu-principal').setContent('');
  currentFile = null;
  updatePreview();
}