document.addEventListener('DOMContentLoaded', async () => {
    const projectTitleElement = document.getElementById('project-title');
    const reviewContainer = document.getElementById('project-content');

    if (!reviewContainer) {
        console.error('Conteneur de relecture non trouvé');
        return;
    }

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
        
        if (main) {
            // Le contenu du brouillon est déjà du HTML qui devrait être injecté dans le main
            let contentToInject = projectData.content;
            
            // Si le contenu contient un <main>, extraire seulement son contenu interne
            const mainMatch = contentToInject.match(/<main[^>]*>([\s\S]*)<\/main>/i);
            if (mainMatch) {
                contentToInject = mainMatch[1];
            }
            
            // Nettoyer uniquement les balises de fermeture problématiques
            contentToInject = contentToInject
                .replace(/<\/body>/gi, '')
                .replace(/<\/html>/gi, '')
                .replace(/<\/main>/gi, '')
                .replace(/<footer[\s\S]*?<\/footer>/gi, '') // Retirer les footers qui pourraient être dans le contenu
                .trim();
            
            main.innerHTML = contentToInject;
        }
        
        // S'assurer que tous les liens CSS et scripts sont en chemins absolus
        const head = templateDoc.querySelector('head');
        if (head) {
            head.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('/')) {
                    link.setAttribute('href', '/' + href);
                } else if (href && (href.startsWith('./') || href.startsWith('../'))) {
                    link.setAttribute('href', href.replace(/^\.\.?\//, '/'));
                }
            });
        }
        
        // S'assurer que les scripts dans le body ont aussi des chemins absolus
        const body = templateDoc.querySelector('body');
        if (body) {
            body.querySelectorAll('script[src]').forEach(script => {
                const src = script.getAttribute('src');
                if (src && !src.startsWith('http') && !src.startsWith('/')) {
                    script.setAttribute('src', '/' + src);
                } else if (src && (src.startsWith('./') || src.startsWith('../'))) {
                    script.setAttribute('src', src.replace(/^\.\.?\//, '/'));
                }
            });
        }
        
        // Obtenir le HTML final
        let finalHtml = '<!DOCTYPE html>\n' + templateDoc.documentElement.outerHTML;

        // Créer un Iframe pour isoler l'aperçu et ses styles
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '90vh';
        iframe.style.border = '1px solid #ccc';
        iframe.style.borderRadius = '6px';
        iframe.style.backgroundColor = 'white';
        
        // Vider le conteneur et ajouter l'iframe
        reviewContainer.innerHTML = '';
        reviewContainer.appendChild(iframe);

        // Attendre que l'iframe soit prêt avant d'écrire le contenu
        iframe.onload = () => {
            try {
                const iframeDoc = iframe.contentWindow.document;
                const iframeBody = iframeDoc.body;
                if (iframeBody) {
                    // Ajuster la hauteur de l'iframe au contenu
                    const height = Math.max(iframeBody.scrollHeight, iframeBody.offsetHeight);
                    iframe.style.height = Math.min(height + 50, window.innerHeight * 0.9) + 'px';
                }
            } catch (e) {
                console.warn('Impossible d\'ajuster la hauteur de l\'iframe:', e);
            }
        };

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
