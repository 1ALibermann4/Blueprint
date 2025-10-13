const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

/**
 * Loads and displays the list of draft projects awaiting review.
 * It fetches the list of `.json` files from the drafts directory,
 * and for each file, it creates a box with the file name and an "Open" button.
 * @returns {Promise<void>} A promise that resolves when the drafts are loaded.
 */
async function loadDrafts() {
  const container = document.getElementById('projectList');
  const response = await fetch('/api/projects/drafts');
  const files = await response.json();

  if (files.length === 0) {
    container.innerHTML = "<p>Aucun projet en attente de relecture.</p>";
    return;
  }

  container.innerHTML = "";
  for (const file of files) {
    const div = document.createElement('div');
    div.className = 'box';
    div.innerHTML = `
      <strong>${file}</strong><br>
      <button class="button is-small is-link mt-2" onclick="openProject('${file}')">Ouvrir</button>
    `;
    container.appendChild(div);
  }
}

/**
 * Opens a specific project for review.
 * It fetches the project data, hides the project list, and displays the
 * project view with the project's title and content.
 * @param {string} file The name of the project file to open.
 * @returns {Promise<void>} A promise that resolves when the project is opened.
 */
async function openProject(file) {
  // Note: This path is now pointing to the static file served by Express
  const res = await fetch(`/intranet/projects/drafts/${file}`);
  const data = await res.json();

  document.getElementById('projectList').style.display = 'none';
  const view = document.getElementById('projectView');
  view.style.display = 'block';
  document.getElementById('projTitle').textContent = data.titre;

  document.getElementById('projContent').innerHTML = `
    <h3 class="subtitle">Contexte</h3>${data.contexte}
    <h3 class="subtitle">Objectifs</h3>${data.objectifs}
    <h3 class="subtitle">Résultats</h3>${data.resultats}
    <h3 class="subtitle">Ressenti de l’équipe</h3>${data.ressenti}
  `;

  // bouton publier
  document.getElementById('publishBtn').onclick = () => publishProject(file);
}

/**
 * Closes the project view and returns to the project list.
 */
function closeView() {
  document.getElementById('projectView').style.display = 'none';
  document.getElementById('projectList').style.display = 'block';
}

/**
 * Publishes a project by calling the `publish.sh` script.
 * It asks for confirmation, then sends a POST request to the script.
 * On success, it displays a confirmation message, closes the project view,
 * and reloads the list of drafts. On failure, it shows an error message.
 * @param {string} file The name of the project file to publish.
 * @returns {Promise<void>} A promise that resolves when the publish operation is complete.
 */
async function publishProject(file) {
  const confirmation = await new Promise(resolve => {
    notyf.confirm({
      message: `Publier le projet "${file}" ?`,
      buttons: [
        {
          tagName: 'button',
          className: 'notyf__button notyf__button--confirm',
          text: 'Publier',
          onClick: ({ close }) => {
            resolve(true);
            close();
          }
        },
        {
          tagName: 'button',
          className: 'notyf__button notyf__button--cancel',
          text: 'Annuler',
          onClick: ({ close }) => {
            resolve(false);
            close();
          }
        }
      ]
    });
  });

  if (!confirmation) {
    return;
  }

  const response = await fetch('/api/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: file }),
  });

  if (response.ok) {
    const result = await response.json();
    notyf.success(result.message);
    closeView();
    loadDrafts();
  } else {
    notyf.error("Erreur lors de la publication.");
  }
}

/**
 * When the window loads, call `loadDrafts` to populate the list of projects
 * awaiting review. This serves as the main entry point for the validation page.
 */
window.onload = loadDrafts;
