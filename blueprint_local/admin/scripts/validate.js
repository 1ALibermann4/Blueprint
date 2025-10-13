async function loadDrafts() {
  const container = document.getElementById('projectList');
  const response = await fetch('../projects/drafts/');
  const text = await response.text();

  // Extrait les fichiers .json listés par le serveur
  const matches = [...text.matchAll(/href="([^"]+\.json)"/g)];
  if (matches.length === 0) {
    container.innerHTML = "<p>Aucun projet en attente de relecture.</p>";
    return;
  }

  container.innerHTML = "";
  for (const match of matches) {
    const file = match[1];
    const div = document.createElement('div');
    div.className = 'box';
    div.innerHTML = `
      <strong>${file}</strong><br>
      <button class="button is-small is-link mt-2" onclick="openProject('${file}')">Ouvrir</button>
    `;
    container.appendChild(div);
  }
}

async function openProject(file) {
  const res = await fetch(`../projects/drafts/${file}`);
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

function closeView() {
  document.getElementById('projectView').style.display = 'none';
  document.getElementById('projectList').style.display = 'block';
}

async function publishProject(file) {
  if (!confirm(`Publier le projet "${file}" ?`)) return;

  const response = await fetch('../scripts/publish.sh?file=' + file, { method: 'POST' });
  if (response.ok) {
    const text = await response.text();
    alert("✅ " + text);
    closeView();
    loadDrafts();
  } else {
    alert("❌ Erreur lors de la publication.");
  }
}

// Charger la liste dès l'ouverture
window.onload = loadDrafts;
