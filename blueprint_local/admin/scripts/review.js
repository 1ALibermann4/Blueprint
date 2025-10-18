document.addEventListener('DOMContentLoaded', async () => {
    const projectTitleElement = document.getElementById('project-title');
    const projectContentElement = document.getElementById('project-content');

    // 1. Récupérer le nom du fichier depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const fileName = params.get('file');

    if (!fileName) {
        projectTitleElement.textContent = 'Erreur';
        projectContentElement.innerHTML = '<p class="has-text-danger">Aucun nom de fichier fourni dans l\'URL.</p>';
        return;
    }

    try {
        // 2. Appeler l'API pour obtenir le contenu du projet
        // On sait que c'est un brouillon (draft) car seuls les brouillons peuvent être relus.
        const response = await fetch(`/api/project?file=${encodeURIComponent(fileName)}&type=draft`);

        if (!response.ok) {
            throw new Error('Le projet n\'a pas pu être chargé.');
        }

        const projectData = await response.json();

        // 3. Afficher le titre et le contenu
        if (projectData.frontMatter && projectData.frontMatter.titre) {
            projectTitleElement.textContent = `Relecture : ${projectData.frontMatter.titre}`;
        } else {
            projectTitleElement.textContent = `Relecture : ${fileName}`;
        }

        projectContentElement.innerHTML = projectData.content;

    } catch (error) {
        projectTitleElement.textContent = 'Erreur de chargement';
        projectContentElement.innerHTML = `<p class="has-text-danger">${error.message}</p>`;
        console.error('Error fetching project content:', error);
    }
});
