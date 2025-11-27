/**
 * Fetches a directory listing and extracts all `.json` file names.
 * This function is a utility to get a list of project files from the server.
 * @param {string} path The path to the directory to fetch.
 * @returns {Promise<string[]>} A promise that resolves to an array of JSON file names.
 */
async function listJSONFiles() {
  const res = await fetch('/api/projects/published');
  return res.json();
}

/**
 * Renders the list of published projects on the main page.
 * It fetches project data for each published project and creates a summary
 * card, which is then appended to the projects container.
 * @returns {Promise<void>} A promise that resolves when the rendering is complete.
 */
async function renderIndex() {
  const container = document.getElementById('projectsContainer');
  if (!container) return; // si on est sur project.html

  const files = await listJSONFiles();
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

/**
 * Renders the full details of a single project on the project page.
 * It retrieves the project file name from the URL parameters, fetches the
 * corresponding JSON data, and populates the project content section.
 * @returns {Promise<void>} A promise that resolves when the project is rendered.
 */
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

