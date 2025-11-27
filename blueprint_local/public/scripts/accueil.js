document.addEventListener('DOMContentLoaded', async () => {
    await loadTags();
    loadFeaturedProject();
    loadRecentProjects();
});

/**
 * Extrait l'image de présentation d'un projet depuis son HTML.
 * Priorité : 1) Première image de la section Accueil (hors photos de personnes), 2) Première image de la galerie multimedia.
 * Exclut les placeholders et les photos d'étudiants/encadrants.
 * @param {Document} doc - Le document HTML parsé du projet
 * @returns {string|null} - L'URL de l'image de présentation ou null si aucune image n'est trouvée
 */
function extractPresentationImage(doc) {
    // Priorité 1 : Première image de la section Accueil (pas les photos d'étudiants/encadrants)
    const accueilImages = doc.querySelectorAll('#Accueil img');
    for (const img of accueilImages) {
        const src = img.getAttribute('src');
        // Exclure les photos de personnes et les placeholders
        if (src && 
            !src.includes('placeholder') && 
            !src.includes('photo-test') && 
            !src.includes('photo-etienne') &&
            !img.closest('.team-member') &&
            !img.closest('.person-card')) {
            return src;
        }
    }
    
    // Priorité 2 : Première image de la galerie multimedia
    const multimediaImages = doc.querySelectorAll('#multimedia .media-thumbnail img, .multimedia-grid img');
    for (const img of multimediaImages) {
        const src = img.getAttribute('src');
        if (src && !src.includes('placeholder')) {
            return src;
        }
    }
    
    return null;
}

/**
 * Extrait toutes les images multimédias d'un projet pour créer un carousel.
 * Récupère toutes les images de la galerie multimedia (section #multimedia).
 * @param {Document} doc - Le document HTML parsé du projet
 * @returns {string[]} - Tableau des URLs des images multimédias
 */
function extractMultimediaImages(doc) {
    const images = [];
    const multimediaImages = doc.querySelectorAll('#multimedia .media-thumbnail img, .multimedia-grid img');
    multimediaImages.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.includes('placeholder')) {
            images.push(src);
        }
    });
    return images;
}

/**
 * Crée un carousel d'images pour un élément.
 * @param {HTMLElement} container - Le conteneur où créer le carousel
 * @param {string[]} images - Tableau des URLs des images
 */
function createImageCarousel(container, images) {
    if (images.length === 0) return;
    
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    let currentIndex = 0;
    
    // Créer le conteneur des images
    const carouselInner = document.createElement('div');
    carouselInner.className = 'carousel-inner';
    carouselInner.style.display = 'flex';
    carouselInner.style.transition = 'transform 0.5s ease';
    carouselInner.style.width = `${images.length * 100}%`;
    carouselInner.style.height = '100%';
    
    images.forEach((imgSrc, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.style.width = `${100 / images.length}%`;
        imgWrapper.style.flexShrink = '0';
        imgWrapper.style.height = '100%';
        
        const img = document.createElement('img');
        img.src = imgSrc;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.alt = `Image ${index + 1} du projet`;
        
        imgWrapper.appendChild(img);
        carouselInner.appendChild(imgWrapper);
    });
    
    container.appendChild(carouselInner);
    
    // Fonction pour changer d'image
    const updateCarousel = () => {
        const translateX = -currentIndex * (100 / images.length);
        carouselInner.style.transform = `translateX(${translateX}%)`;
    };
    
    // Changer d'image toutes les 3 secondes
    if (images.length > 1) {
        setInterval(() => {
            currentIndex = (currentIndex + 1) % images.length;
            updateCarousel();
        }, 3000);
    }
    
    updateCarousel();
}

/**
 * Charge et affiche le projet mis en avant (position 1).
 */
async function loadFeaturedProject() {
    const featuredTitle = document.getElementById('featured-project-title');
    const featuredDesc = document.getElementById('featured-project-desc');
    const featuredVideo = document.getElementById('featured-video');
    const featuredImage = document.getElementById('featured-image');
    const featuredPlaceholder = document.getElementById('featured-placeholder');
    const featuredLink = document.getElementById('featured-project-link');
    const featuredMedia = featuredImage?.parentElement;

    try {
        const response = await fetch('/api/projects/published?include_featured=true');
        if (!response.ok) throw new Error('Failed to fetch featured projects.');

        const projects = await response.json();
        // Chercher spécifiquement le projet en position 1
        const mainProject = projects.find(p => p.isFeatured && p.featuredPosition === 1);

        if (mainProject) {
            if (featuredTitle) featuredTitle.textContent = mainProject.titre;
            if (featuredLink) {
                featuredLink.href = `/public/projects/published/${mainProject.fileName}`;
                featuredLink.style.display = 'inline-block';
            }
            
            // Charger le contenu HTML du projet pour extraire la vidéo/image et la description
            try {
                const projectHtmlResponse = await fetch(`/public/projects/published/${mainProject.fileName}`);
                if (projectHtmlResponse.ok) {
                    const projectHtml = await projectHtmlResponse.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(projectHtml, 'text/html');
                    
                    // Chercher la vidéo dans la section Accueil
                    const videoSource = doc.querySelector('#Accueil video source');
                    const videoElement = doc.querySelector('#Accueil video');
                    
                    // Extraire la description depuis le texte d'introduction
                    const introText = doc.querySelector('.intro-text-block p, #Accueil p');
                    const description = introText ? introText.textContent.trim().substring(0, 150) + '...' : 
                                       mainProject.tags.join(', ') || 'Projet étudiant';
                    
                    if (featuredDesc) featuredDesc.textContent = description;
                    
                    // Afficher vidéo ou image
                    if (videoSource && videoElement) {
                        const videoSrc = videoSource.getAttribute('src');
                        if (videoSrc && !videoSrc.includes('placeholder')) {
                            featuredVideo.innerHTML = `<source src="${videoSrc}" type="video/mp4">`;
                            featuredVideo.style.display = 'block';
                            if (featuredImage) featuredImage.style.display = 'none';
                            if (featuredPlaceholder) featuredPlaceholder.style.display = 'none';
                            featuredVideo.load();
                        } else {
                            // Pas de vidéo valide, chercher une image
                            loadProjectImageForFeatured(mainProject.fileName, doc);
                        }
                    } else {
                        // Pas de vidéo, chercher une image
                        loadProjectImageForFeatured(mainProject.fileName, doc);
                    }
                }
            } catch (error) {
                console.warn('Could not load project HTML:', error);
                if (featuredDesc) featuredDesc.textContent = mainProject.tags.join(', ') || 'Projet étudiant';
                if (featuredPlaceholder) featuredPlaceholder.style.display = 'flex';
            }
        } else {
            if (featuredTitle) featuredTitle.textContent = 'Projet en vedette';
            if (featuredDesc) featuredDesc.textContent = 'Aucun projet mis en avant pour le moment.';
            if (featuredPlaceholder) featuredPlaceholder.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading featured project:', error);
        if (featuredTitle) featuredTitle.textContent = 'Projet en vedette';
        if (featuredDesc) featuredDesc.textContent = 'Erreur lors du chargement.';
        if (featuredPlaceholder) featuredPlaceholder.style.display = 'flex';
    }
}

/**
 * Charge l'image de présentation d'un projet pour le projet featured ou crée un carousel.
 * @param {string} fileName - Le nom du fichier du projet
 * @param {Document} doc - Le document HTML parsé
 */
function loadProjectImageForFeatured(fileName, doc) {
    const featuredImage = document.getElementById('featured-image');
    const featuredPlaceholder = document.getElementById('featured-placeholder');
    const featuredVideo = document.getElementById('featured-video');
    
    // Extraire l'image de présentation
    const presentationImage = extractPresentationImage(doc);
    
    if (presentationImage) {
        // Afficher l'image de présentation
        if (featuredImage) {
            featuredImage.src = presentationImage;
            featuredImage.style.display = 'block';
            if (featuredVideo) featuredVideo.style.display = 'none';
            if (featuredPlaceholder) featuredPlaceholder.style.display = 'none';
        }
    } else {
        // Pas d'image de présentation, essayer de créer un carousel avec les images multimédias
        const multimediaImages = extractMultimediaImages(doc);
        
        if (multimediaImages.length > 0) {
            // Créer un carousel avec les images multimédias
            if (featuredPlaceholder) {
                createImageCarousel(featuredPlaceholder, multimediaImages);
                featuredPlaceholder.style.display = 'block';
                if (featuredImage) featuredImage.style.display = 'none';
                if (featuredVideo) featuredVideo.style.display = 'none';
            }
        } else {
            // Aucune image disponible
            if (featuredPlaceholder) {
                featuredPlaceholder.innerHTML = '<p>Aucune image disponible</p>';
                featuredPlaceholder.style.display = 'flex';
            }
            if (featuredImage) featuredImage.style.display = 'none';
            if (featuredVideo) featuredVideo.style.display = 'none';
        }
    }
}

/**
 * Charge les tags disponibles depuis l'API et les affiche dans la barre de tags.
 */
/**
 * Charge les tags disponibles depuis l'API et les affiche dans la barre de filtres.
 * Crée dynamiquement les boutons de tags avec les classes appropriées pour le filtrage.
 * @returns {Promise<void>}
 */
async function loadTags() {
    const tagsBar = document.getElementById('tagsBar');
    if (!tagsBar) return;

    try {
        const response = await fetch('/api/tags');
        if (!response.ok) {
            throw new Error('Failed to fetch tags');
        }

        const tags = await response.json();

        // Garder le bouton "Tous les projets" et ajouter les tags dynamiquement
        const allButton = tagsBar.querySelector('button[data-tag="__all__"]');
        tagsBar.innerHTML = '';
        
        if (allButton) {
            tagsBar.appendChild(allButton);
        } else {
            // Créer le bouton "Tous les projets" s'il n'existe pas
            const allBtn = document.createElement('button');
            allBtn.className = 'tag-pill active';
            allBtn.setAttribute('data-tag', '__all__');
            allBtn.setAttribute('aria-pressed', 'true');
            allBtn.textContent = 'Tous les projets';
            tagsBar.appendChild(allBtn);
        }

        // Ajouter les tags dynamiquement
        tags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag-pill';
            tagButton.setAttribute('data-tag', tag);
            tagButton.setAttribute('aria-pressed', 'false');
            tagButton.textContent = tag;
            tagButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = `/public/project_list.html?tag=${encodeURIComponent(tag)}`;
            });
            tagsBar.appendChild(tagButton);
        });
    } catch (error) {
        console.error('Error loading tags:', error);
        // En cas d'erreur, garder les tags par défaut du HTML
    }
}

/**
 * Charge et affiche les projets en positions 2, 3, 4 pour la section à droite.
 */
/**
 * Charge les projets mis en avant en positions 2, 3 et 4 (projets secondaires).
 * Récupère les projets avec featuredPosition 2, 3 ou 4, les trie par position,
 * et les affiche dans la colonne de droite de la page d'accueil.
 * @returns {Promise<void>}
 */
async function loadRecentProjects() {
    const recentProjectsList = document.getElementById('recent-projects-list');
    if (!recentProjectsList) {
        console.warn('recent-projects-list container not found');
        return;
    }

    try {
        const response = await fetch('/api/projects/published?include_featured=true');
        if (!response.ok) throw new Error('Failed to fetch recent projects.');

        const projects = await response.json();
        
        // Filtrer les projets en positions 2, 3, 4 et les trier par position
        const sideProjects = projects
            .filter(p => p.isFeatured && p.featuredPosition && p.featuredPosition >= 2 && p.featuredPosition <= 4)
            .sort((a, b) => a.featuredPosition - b.featuredPosition);

        if (sideProjects.length === 0) {
            recentProjectsList.innerHTML = '<p>Aucun projet mis en avant pour le moment.</p>';
            return;
        }

        recentProjectsList.innerHTML = '';

        sideProjects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'side-project-item';
            
            // Créer le conteneur d'image
            const imageContainer = document.createElement('div');
            imageContainer.className = 'side-project-image-container';
            imageContainer.style.width = '100px';
            imageContainer.style.height = '80px';
            imageContainer.style.flexShrink = '0';
            imageContainer.style.borderRadius = '8px';
            imageContainer.style.overflow = 'hidden';
            imageContainer.style.position = 'relative';
            
            // Placeholder initial
            const placeholderImg = document.createElement('img');
            placeholderImg.src = '/images/project-placeholder.png';
            placeholderImg.alt = project.titre;
            placeholderImg.style.width = '100%';
            placeholderImg.style.height = '100%';
            placeholderImg.style.objectFit = 'cover';
            imageContainer.appendChild(placeholderImg);
            
            projectItem.innerHTML = `
                <div class="side-project-content">
                    <h4>${project.titre}</h4>
                    <p>${project.tags.join(', ') || 'Aucune description'}</p>
                    <a href="/public/projects/published/${project.fileName}">En savoir plus →</a>
                </div>
            `;
            
            // Insérer le conteneur d'image au début
            projectItem.insertBefore(imageContainer, projectItem.firstChild);
            
            // Charger l'image et la description du projet de manière asynchrone
            fetch(`/public/projects/published/${project.fileName}`)
                .then(response => response.ok ? response.text() : null)
                .then(html => {
                    if (html) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        // Extraire l'image de présentation
                        const presentationImage = extractPresentationImage(doc);
                        
                        if (presentationImage) {
                            // Afficher l'image de présentation
                            imageContainer.innerHTML = '';
                            const img = document.createElement('img');
                            img.src = presentationImage;
                            img.style.width = '100%';
                            img.style.height = '100%';
                            img.style.objectFit = 'cover';
                            img.alt = project.titre;
                            imageContainer.appendChild(img);
                        } else {
                            // Pas d'image de présentation, créer un carousel avec les images multimédias
                            const multimediaImages = extractMultimediaImages(doc);
                            
                            if (multimediaImages.length > 0) {
                                imageContainer.innerHTML = '';
                                createImageCarousel(imageContainer, multimediaImages);
                            }
                            // Sinon, garder le placeholder
                        }
                        
                        // Extraire la description depuis le texte d'introduction
                        const introText = doc.querySelector('.intro-text-block p, #Accueil p');
                        const description = introText ? introText.textContent.trim().substring(0, 100) + '...' : 
                                           project.tags.join(', ') || 'Aucune description';
                        
                        const desc = projectItem.querySelector('.side-project-content p');
                        if (desc) desc.textContent = description;
                    }
                })
                .catch(() => {
                    // En cas d'erreur, garder le placeholder
                });
            
            recentProjectsList.appendChild(projectItem);
        });
    } catch (error) {
        console.error('Error loading recent projects:', error);
        recentProjectsList.innerHTML = '<p class="has-text-danger">Erreur lors du chargement des projets.</p>';
    }
}
