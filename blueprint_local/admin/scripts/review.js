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

        // Parser le template et le contenu du brouillon
        const parser = new DOMParser();
        const templateDoc = parser.parseFromString(templateHtml, 'text/html');
        const draftDoc = parser.parseFromString(projectData.content, 'text/html');
        
        // Mettre à jour le titre dans le template
        const titleTag = templateDoc.querySelector('title');
        if (titleTag) {
            titleTag.textContent = `${projectTitle} - Aperçu`;
        }
        
        // Mettre à jour le titre dans le bandeau
        const bandeauTexte = templateDoc.querySelector('.bandeau-texte');
        if (bandeauTexte) {
            bandeauTexte.textContent = projectTitle;
        }
        
        // Injecter le contenu du brouillon dans le main du template
        const main = templateDoc.querySelector('main');
        const draftMain = draftDoc.querySelector('main');
        
        if (main) {
            if (draftMain) {
                // Si le contenu du brouillon a un main, utiliser son contenu
                main.innerHTML = draftMain.innerHTML;
            } else {
                // Sinon, utiliser le contenu directement
                main.innerHTML = projectData.content;
            }
        }
        
        // Obtenir le HTML final
        let finalHtml = '<!DOCTYPE html>\n' + templateDoc.documentElement.outerHTML;

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
