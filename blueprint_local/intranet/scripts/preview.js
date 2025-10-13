function updatePreview() {
  const titre = document.getElementById('titre').value || "Titre du projet";
  const get = id => tinymce.get(id)?.getContent() || "";

  const html = `
    <article class="box">
      <h2 class="title is-3">${titre}</h2>
      <section>
        <h3 class="subtitle is-5">Contexte du projet</h3>
        ${get('context')}
      </section>
      <section>
        <h3 class="subtitle is-5">Objectifs</h3>
        ${get('objectifs')}
      </section>
      <section>
        <h3 class="subtitle is-5">Résultats</h3>
        ${get('resultats')}
      </section>
      <section>
        <h3 class="subtitle is-5">Ressenti de l’équipe</h3>
        ${get('ressenti')}
      </section>
    </article>
  `;

  document.getElementById('preview').innerHTML = html;
}

