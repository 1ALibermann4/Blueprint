// This function is now designed to be called from editor.js
// It correctly reads data from the form fields and the TinyMCE editor.

function updatePreview() {
  const preview = document.getElementById('preview');

  // --- Get data from all form fields ---
  const titre = document.getElementById('titre').value;

  // Metadata fields (standard textareas)
  const contexte = document.getElementById('contexte').value.replace(/\n/g, '<br>');
  const objectifs = document.getElementById('objectifs').value.replace(/\n/g, '<br>');
  const resultats = document.getElementById('resultats').value.replace(/\n/g, '<br>');
  const ressenti = document.getElementById('ressenti').value.replace(/\n/g, '<br>');

  // Lists from textareas
  const etudiants = document.getElementById('etudiants').value.split('\n').filter(Boolean);
  const encadrants = document.getElementById('encadrants').value.split('\n').filter(Boolean);

  // Main content from TinyMCE
  let contenuPrincipal = '';
  if (tinymce.get('contenu-principal') && !tinymce.get('contenu-principal').isNotDirty) {
    contenuPrincipal = tinymce.get('contenu-principal').getContent();
  }

  // --- Generate HTML for lists ---
  const etudiantsHtml = etudiants.length > 0 ? '<ul>' + etudiants.map(e => `<li>${e}</li>`).join('') + '</ul>' : '<p>Aucun étudiant listé.</p>';
  const encadrantsHtml = encadrants.length > 0 ? '<ul>' + encadrants.map(e => `<li>${e}</li>`).join('') + '</ul>' : '<p>Aucun encadrant listé.</p>';


  // --- Assemble the final HTML for the preview pane ---
  preview.innerHTML = `
    <h1 class="title">${titre || 'Titre du projet'}</h1>
    <hr>

    <div class="content">
      <h2 class="subtitle">Contexte</h2>
      <div>${contexte || '<p><em>Non défini</em></p>'}</div>

      <h2 class="subtitle">Objectifs</h2>
      <div>${objectifs || '<p><em>Non définis</em></p>'}</div>

      <h2 class="subtitle">Résultats</h2>
      <div>${resultats || '<p><em>Non définis</em></p>'}</div>

      <h2 class="subtitle">Ressenti de l’équipe</h2>
      <div>${ressenti || '<p><em>Non défini</em></p>'}</div>

      <h2 class="subtitle">Équipe</h2>
      <h3>Étudiants</h3>
      ${etudiantsHtml}
      <h3>Encadrants</h3>
      ${encadrantsHtml}

      <hr>
      <h2 class="subtitle">Contenu Principal</h2>
      <div>${contenuPrincipal || '<p><em>Le contenu principal apparaîtra ici.</em></p>'}</div>
    </div>
  `;
}