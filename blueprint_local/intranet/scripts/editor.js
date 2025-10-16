const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

let currentFile = null; // To keep track of the currently loaded file

// Initialize TinyMCE for the main content area
tinymce.init({
  selector: '#contenu-principal',
  plugins: 'link image media table code',
  toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist | link image media | code'
});

/**
 * Shows the modal with a list of draft projects fetched from the server.
 */
async function showDrafts() {
  try {
    const response = await fetch('/api/projects/drafts');
    if (!response.ok) {
      throw new Error('Failed to fetch drafts');
    }
    const drafts = await response.json();
    const container = document.getElementById('draftList');
    container.innerHTML = '';

    if (drafts.length === 0) {
      container.innerHTML = '<p>Aucun brouillon trouvé sur le serveur.</p>';
    } else {
      drafts.forEach(file => {
        const div = document.createElement('div');
        div.className = 'box mb-2';
        div.innerHTML = `
          <strong>${file}</strong>
          <div class="buttons mt-2">
            <button class="button is-small is-link" onclick="loadDraft('${file}')">Ouvrir</button>
          </div>
        `;
        container.appendChild(div);
      });
    }
    document.getElementById('draftModal').classList.add('is-active');
  } catch (error) {
    notyf.error('Erreur lors du chargement des brouillons: ' + error.message);
  }
}

/**
 * Loads a specific draft project from the server into the editor.
 * @param {string} fileName The name of the markdown file to load.
 */
async function loadDraft(fileName) {
  try {
    const response = await fetch(`/api/project?file=${fileName}&type=draft`);
    if (!response.ok) {
      throw new Error('Failed to load draft');
    }
    const project = await response.json();

    // Populate the form fields with the loaded data
    document.getElementById('titre').value = project.frontMatter.titre || '';
    document.getElementById('contexte').value = project.frontMatter.contexte || '';
    document.getElementById('objectifs').value = project.frontMatter.objectifs || '';
    document.getElementById('resultats').value = project.frontMatter.resultats || '';
    document.getElementById('ressenti').value = project.frontMatter.ressenti || '';
    document.getElementById('etudiants').value = (project.frontMatter.etudiants || []).join('\n');
    document.getElementById('encadrants').value = (project.frontMatter.encadrants || []).join('\n');

    tinymce.get('contenu-principal').setContent(project.content || '');

    currentFile = fileName; // Keep track of the loaded file
    closeModal();
    notyf.success(`Brouillon "${fileName}" chargé.`);
  } catch (error) {
    notyf.error('Erreur lors du chargement du brouillon: ' + error.message);
  }
}

/**
 * Closes the drafts modal.
 */
function closeModal() {
  document.getElementById('draftModal').classList.remove('is-active');
}

/**
 * Saves the current project data as a draft to the server.
 * It collects all data from the form fields, structures it into front matter
 * and main content, and sends it to the server.
 */
async function saveDraft() {
  const titre = document.getElementById('titre').value.trim();
  if (!titre) {
    notyf.error("Le titre du projet est obligatoire.");
    return;
  }

  const data = {
    frontMatter: {
      titre: titre,
      contexte: document.getElementById('contexte').value,
      objectifs: document.getElementById('objectifs').value,
      resultats: document.getElementById('resultats').value,
      ressenti: document.getElementById('ressenti').value,
      etudiants: document.getElementById('etudiants').value.split('\n').filter(Boolean),
      encadrants: document.getElementById('encadrants').value.split('\n').filter(Boolean),
      date: new Date().toISOString()
    },
    content: tinymce.get('contenu-principal').getContent()
  };

  try {
    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to save draft');
    }

    const result = await response.json();
    currentFile = result.file; // Update the current file name
    notyf.success(`Brouillon "${titre}" enregistré avec succès !`);
  } catch (error) {
    notyf.error('Erreur lors de la sauvegarde : ' + error.message);
  }
}

// Placeholder for submitForReview, as it might have different logic (e.g., moving files)
function submitForReview() {
  notyf.open({
    type: 'info',
    message: 'Cette fonctionnalité (soumettre pour relecture) sera implémentée dans une prochaine étape.'
  });
}
