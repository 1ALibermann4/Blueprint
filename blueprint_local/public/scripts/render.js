// Fonction utilitaire : extrait les fichiers JSON listés par le serveur
async function listJSONFiles(path) {
  const res = await fetch(path);
  const text = await res.text();
  return [...text.matchAll(/href="([^"]+\.json)"/g)].map(m => m[1]);
}

// --- Page principale : affichage de la liste des projets ---
async function renderIndex() {
  const container = document.getElementById('projectsContainer');
  if (!container) return; // si on est sur project.html

  const files = await listJSONFiles('./projects/published/');
  if (files.length === 0) {
    container.innerHTML = "<p>Aucun projet publié pour le moment.</p>";
    return;
  }

  for (const file of files) {
    const data = await fetch(`./projects/published/${file}`).then(r => r.json());
    const card = document.createElement('div');
    card.className = "column is-one-third";
    card.innerHTML = `
      <div class="box">
        <h3 class="title is-5">${data.titre}</h3>
        <div>${data.contexte.substring(0, 200)}...</div>
        <a href="./project.html?file=${encodeURIComponent(file)}" class="button is-link is-light mt-3">Voir plus</a>
      </div>
    `;
    container.appendChild(card);
  }
}

// --- Page de détail : affichage d’un projet complet ---
async function renderProject() {
  const container = document.getElementById('projectContent');
  if (!container) return; // si on est sur index.html

  const params = new URLSearchParams(window.location.search);
  const file = params.get('file');
  if (!file) {
    container.innerHTML = "<p>Projet introuvable.</p>";
    return;
  }

  const data = await fetch(`./projects/published/${file}`).then(r => r.json());

  container.innerHTML = `
    <article class="box">
      <h1 class="title">${data.titre}</h1>
      <section><h2 class="subtitle">Contexte</h2>${data.contexte}</section>
      <section><h2 class="subtitle">Objectifs</h2>${data.objectifs}</section>
      <section><h2 class="subtitle">Résultats</h2>${data.resultats}</section>
      <section><h2 class="subtitle">Ressenti de l’équipe</h2>${data.ressenti}</section>
    </article>
  `;
}

window.onload = () => {
  renderIndex();
  renderProject();
};

