function updatePreview() {
  const preview = document.getElementById('preview');
  const titre = document.getElementById('titre').value;
  const contexte = tinymce.get('context').getContent();
  const objectifs = tinymce.get('objectifs').getContent();
  const resultats = tinymce.get('resultats').getContent();
  const ressenti = tinymce.get('ressenti').getContent();

  preview.innerHTML = `
    <h1 class="title">${titre || 'Titre du projet'}</h1>
    <section>
      <h2 class="subtitle">Contexte</h2>
      ${contexte || '<p>Contenu du contexte...</p>'}
    </section>
    <section>
      <h2 class="subtitle">Objectifs</h2>
      ${objectifs || '<p>Contenu des objectifs...</p>'}
    </section>
    <section>
      <h2 class="subtitle">Résultats</h2>
      ${resultats || '<p>Contenu des résultats...</p>'}
    </section>
    <section>
      <h2 class="subtitle">Ressenti de l’équipe</h2>
      ${ressenti || '<p>Contenu du ressenti...</p>'}
    </section>
  `;
}

// Initial preview update
document.addEventListener('DOMContentLoaded', () => {
    // Ensure TinyMCE is initialized before the first preview update
    tinymce.init({
        selector: 'textarea',
        setup: function(editor) {
            editor.on('init', function() {
                updatePreview();
            });
            editor.on('change keyup paste input', () => {
                updatePreview();
            });
        }
    });

    document.getElementById('titre').addEventListener('keyup', updatePreview);
});