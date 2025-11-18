document.addEventListener('DOMContentLoaded', async () => {
    const projectTitleElement = document.getElementById('project-title');
    const reviewContainer = document.querySelector('.container.section');

    const params = new URLSearchParams(window.location.search);
    const fileName = params.get('file');

    if (!fileName) {
        projectTitleElement.textContent = 'Erreur';
        reviewContainer.innerHTML = '<p class="has-text-danger">Aucun nom de fichier fourni.</p>';
        return;
    }

    try {
        // Lancer les deux requêtes en parallèle pour plus d'efficacité
        const [projectResponse, templateResponse] = await Promise.all([
            fetch(`/api/project?file=${encodeURIComponent(fileName)}&type=draft`),
            fetch('/api/templates/project_full')
        ]);

        if (!projectResponse.ok) throw new Error('Le projet n\'a pas pu être chargé.');
        if (!templateResponse.ok) throw new Error('Le modèle de page n\'a pas pu être chargé.');

        const projectData = await projectResponse.json();
        const templateHtml = await templateResponse.text();

        // Mettre à jour le titre de la page de relecture
        const projectTitle = projectData.frontMatter.titre || fileName;
        projectTitleElement.textContent = `Relecture : ${projectTitle}`;

        // Préparer le HTML final en injectant le contenu et le titre dans le modèle
        let finalHtml = templateHtml.replace(
            /<title>.*<\/title>/i,
            `<title>${projectTitle} - Aperçu</title>`
        );
        finalHtml = finalHtml.replace(
            /<body[^>]*>[\s\S]*<\/body>/i,
            `<body>${projectData.content}</body>`
        );

        // Créer un Iframe pour isoler l'aperçu et ses styles
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '80vh';
        iframe.style.border = '1px solid #ccc';
        reviewContainer.innerHTML = ''; // Vider le conteneur
        reviewContainer.appendChild(iframe);

        // Écrire le HTML complet dans l'Iframe
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(finalHtml);
        iframe.contentWindow.document.close();

    } catch (error) {
        projectTitleElement.textContent = 'Erreur de chargement';
        reviewContainer.innerHTML = `<p class="has-text-danger">${error.message}</p>`;
        console.error('Error fetching project content for review:', error);
    }
});
