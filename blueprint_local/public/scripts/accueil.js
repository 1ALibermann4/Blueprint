document.addEventListener('DOMContentLoaded', async () => {
    await loadTags();
    loadFeaturedProject();
    loadRecentProjects();
    initTagsScroller();
    initTagClickHandlers();
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
                    
                    // Extraire la description depuis le texte d'introduction (2 premières lignes)
                    const introText = doc.querySelector('.intro-text-block p, #Accueil p');
                    let description = '';
                    if (introText) {
                        const text = introText.textContent.trim();
                        const lines = text.split('\n').filter(l => l.trim()).slice(0, 2);
                        description = lines.join(' ').trim().substring(0, 150);
                        if (description.length < text.length) description += '...';
                    }
                    if (!description) {
                        description = mainProject.description || mainProject.tags.join(', ') || 'Projet étudiant';
                    }
                    
                    if (featuredDesc) featuredDesc.textContent = description;
                    
                    // Afficher vidéo ou image
                    if (videoSource && videoElement) {
                        const videoSrc = videoSource.getAttribute('src');
                        if (videoSrc && !videoSrc.includes('placeholder')) {
                            featuredVideo.innerHTML = `<source src="${videoSrc}" type="video/mp4">`;
                            featuredVideo.style.display = 'block';
                            featuredVideo.style.width = '100%';
                            featuredVideo.style.height = 'auto';
                            featuredVideo.style.maxWidth = '700px';
                            
                            // Ajuster la hauteur après le chargement de la vidéo
                            featuredVideo.onloadedmetadata = () => {
                                adjustFeaturedHeight();
                            };
                            
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
            featuredImage.style.width = '100%';
            featuredImage.style.height = 'auto';
            featuredImage.style.maxWidth = '700px';
            
            // Ajuster la hauteur après le chargement de l'image
            featuredImage.onload = () => {
                adjustFeaturedHeight();
            };
            
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
 * Mapping thématique -> classe CSS pour la coloration
 */
const TAG_CLASS_MAP = {
    'informatique': 'color-informatique',
    'ia': 'color-ia',
    'robotique': 'color-robotique',
    'web': 'color-web',
    'éco': 'color-eco',
    'eco': 'color-eco',
    'design': 'color-design',
    'data': 'color-data',
    'machine learning': 'color-ml',
    'ml': 'color-ml',
    'environnement': 'color-environnement',
    'electronique': 'color-electronique',
    'électronique': 'color-electronique',
    'énergie': 'color-energie',
    'energie': 'color-energie'
};

/**
 * Helper : retourne la classe color-* pour un tag
 */
function getColorClassForTag(tagValue) {
    if (!tagValue) return 'color-default';
    const key = String(tagValue || '').trim().toLowerCase();
    return TAG_CLASS_MAP[key] || 'color-default';
}

/**
 * Modifie l'apparence d'une pill (tag) quand elle est sélectionnée
 */
function setPillColorState(pill, shouldApply) {
    const tagVal = pill.getAttribute('data-tag') || '';
    const colorClass = getColorClassForTag(tagVal);

    // Retirer anciennes classes color-*
    Array.from(pill.classList).forEach(c => {
        if (c.startsWith('color-')) pill.classList.remove(c);
    });

    if (shouldApply) {
        pill.classList.add(colorClass);
    }
}

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
            allBtn.className = 'tag-pill tag is-light active';
            allBtn.setAttribute('data-tag', '__all__');
            allBtn.setAttribute('aria-pressed', 'true');
            allBtn.textContent = 'Tous les projets';
            tagsBar.appendChild(allBtn);
        }

        // Ajouter les tags dynamiquement
        tags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag-pill tag is-light';
            tagButton.setAttribute('data-tag', tag);
            tagButton.setAttribute('aria-pressed', 'false');
            tagButton.textContent = tag;
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
 * Si "Tous les projets" est sélectionné : utilise les projets featured (positions 2-4).
 * Sinon : utilise les 4 plus récents projets du tag sélectionné.
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
        
        // Vérifier si "Tous les projets" est sélectionné
        const allBtn = document.querySelector('.tag-pill[data-tag="__all__"]');
        const isAllSelected = allBtn && allBtn.classList.contains('active');
        
        let sideProjects = [];
        
        if (isAllSelected) {
            // Utiliser le système à la une (positions 2, 3, 4)
            sideProjects = projects
                .filter(p => p.isFeatured && p.featuredPosition && p.featuredPosition >= 2 && p.featuredPosition <= 4)
                .sort((a, b) => a.featuredPosition - b.featuredPosition);
        } else {
            // Utiliser les 4 plus récents projets du tag sélectionné
            const selectedTag = Array.from(selectedTags)[0]; // Prendre le premier tag sélectionné
            if (selectedTag) {
                sideProjects = projects
                    .filter(p => p.tags && p.tags.some(t => t.toLowerCase() === selectedTag))
                    .sort((a, b) => new Date(b.dateModification) - new Date(a.dateModification))
                    .slice(0, 4); // Limiter à 4 projets
            } else {
                // Aucun tag sélectionné, utiliser les 4 plus récents tous projets confondus
                sideProjects = projects
                    .sort((a, b) => new Date(b.dateModification) - new Date(a.dateModification))
                    .slice(0, 4);
            }
        }

        if (sideProjects.length === 0) {
            recentProjectsList.innerHTML = '<p>Aucun projet mis en avant pour le moment.</p>';
            return;
        }

        recentProjectsList.innerHTML = '';

        sideProjects.forEach(project => {
            // Créer la structure box avec media (comme dans PortailVf.html)
            const projectBox = document.createElement('div');
            projectBox.className = 'box project-card';
            projectBox.setAttribute('data-tags', project.tags.join(','));
            
            const article = document.createElement('article');
            article.className = 'media';
            
            // Media left (image)
            const figure = document.createElement('figure');
            figure.className = 'media-left';
            
            // Placeholder initial
            const placeholderImg = document.createElement('img');
            placeholderImg.src = '/images/project-placeholder.png';
            placeholderImg.alt = project.titre;
            placeholderImg.style.width = '70px';
            placeholderImg.style.height = 'auto';
            figure.appendChild(placeholderImg);
            
            // Media content
            const mediaContent = document.createElement('div');
            mediaContent.className = 'media-content';
            
            const title = document.createElement('h4');
            title.className = 'project-title';
            title.textContent = project.titre;
            
            const desc = document.createElement('p');
            desc.className = 'project-desc';
            desc.textContent = project.tags.join(', ') || 'Aucune description';
            
            const tagSpan = document.createElement('span');
            tagSpan.className = 'project-tag tag';
            tagSpan.textContent = project.tags[0] || 'Général';
            // Appliquer la couleur du tag
            const colorClass = getColorClassForTag(project.tags[0]);
            tagSpan.classList.add(colorClass);
            
            const link = document.createElement('p');
            const linkA = document.createElement('a');
            linkA.href = `/public/projects/published/${project.fileName}`;
            linkA.textContent = 'En savoir plus →';
            link.appendChild(linkA);
            
            mediaContent.appendChild(title);
            mediaContent.appendChild(desc);
            mediaContent.appendChild(tagSpan);
            mediaContent.appendChild(link);
            
            article.appendChild(figure);
            article.appendChild(mediaContent);
            projectBox.appendChild(article);
            
            // Charger l'image de manière asynchrone
            const imgElement = figure.querySelector('img');
            
            // Charger l'image et la description du projet de manière asynchrone
            fetch(`/public/projects/published/${project.fileName}`)
                .then(response => response.ok ? response.text() : null)
                .then(html => {
                    if (html) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        // Extraire l'image de présentation
                        const presentationImage = extractPresentationImage(doc);
                        
                        if (presentationImage && imgElement) {
                            imgElement.src = presentationImage;
                            imgElement.style.width = '70px';
                            imgElement.style.height = 'auto';
                        }
                        
                        // Extraire la description depuis le texte d'introduction (2 premières lignes)
                        const introText = doc.querySelector('.intro-text-block p, #Accueil p');
                        let description = '';
                        if (introText) {
                            const text = introText.textContent.trim();
                            const lines = text.split('\n').filter(l => l.trim()).slice(0, 2);
                            description = lines.join(' ').trim().substring(0, 100);
                            if (description.length < text.length) description += '...';
                        }
                        if (!description) {
                            description = project.description || project.tags.join(', ') || 'Aucune description';
                        }
                        
                        if (desc) desc.textContent = description;
                        
                        // Compter le nombre de médias et l'afficher
                        const mediaCount = doc.querySelectorAll('#multimedia .media-thumbnail, #multimedia .carousel-item, .multimedia-grid img, .multimedia-grid video').length;
                        const mediaIndicator = projectBox.querySelector('.media-indicator');
                        if (mediaIndicator) {
                            mediaIndicator.textContent = `${mediaCount} média${mediaCount > 1 ? 's' : ''}`;
                        } else {
                            // Créer l'indicateur de médias si absent
                            const indicator = document.createElement('span');
                            indicator.className = 'media-indicator';
                            indicator.textContent = `${mediaCount} média${mediaCount > 1 ? 's' : ''}`;
                            indicator.style.position = 'absolute';
                            indicator.style.bottom = '10px';
                            indicator.style.right = '10px';
                            indicator.style.background = 'rgba(0,0,0,0.7)';
                            indicator.style.color = 'white';
                            indicator.style.padding = '4px 8px';
                            indicator.style.borderRadius = '4px';
                            indicator.style.fontSize = '12px';
                            projectBox.style.position = 'relative';
                            projectBox.appendChild(indicator);
                        }
                    }
                })
                .catch(() => {
                    // En cas d'erreur, garder le placeholder
                });
            
            recentProjectsList.appendChild(projectBox);
            
            // Attendre que le box soit rendu pour mesurer sa hauteur
            setTimeout(() => {
                const boxHeight = projectBox.offsetHeight;
                totalProjectsHeight += boxHeight;
                
                // Si c'est le dernier projet, ajuster la hauteur du conteneur vidéo
                if (sideProjects.indexOf(project) === sideProjects.length - 1) {
                    const videoContainer = document.querySelector('.video-containeur');
                    if (videoContainer && totalProjectsHeight > 0) {
                        // Ajuster la hauteur du conteneur vidéo pour correspondre à la hauteur totale des projets
                        videoContainer.style.height = totalProjectsHeight + 'px';
                        videoContainer.style.overflow = 'hidden';
                        
                        // Ajuster aussi la vidéo/image à l'intérieur
                        const video = document.getElementById('featured-video');
                        const image = document.getElementById('featured-image');
                        if (video && video.style.display !== 'none') {
                            video.style.height = totalProjectsHeight + 'px';
                            video.style.objectFit = 'cover';
                        }
                        if (image && image.style.display !== 'none') {
                            image.style.height = totalProjectsHeight + 'px';
                            image.style.objectFit = 'cover';
                        }
                    }
                }
            }, 100);
        });
    } catch (error) {
        console.error('Error loading recent projects:', error);
        recentProjectsList.innerHTML = '<p class="has-text-danger">Erreur lors du chargement des projets.</p>';
    }
}

/**
 * Ajuste la hauteur du conteneur vidéo pour correspondre à la hauteur totale des projets phares
 */
function adjustFeaturedHeight() {
    const recentProjectsList = document.getElementById('recent-projects-list');
    if (!recentProjectsList) return;
    
    const projectBoxes = recentProjectsList.querySelectorAll('.box');
    if (projectBoxes.length === 0) return;
    
    let totalHeight = 0;
    projectBoxes.forEach(box => {
        totalHeight += box.offsetHeight;
    });
    
    if (totalHeight > 0) {
        const videoContainer = document.querySelector('.video-containeur');
        if (videoContainer) {
            videoContainer.style.height = totalHeight + 'px';
            videoContainer.style.overflow = 'hidden';
            videoContainer.style.display = 'flex';
            videoContainer.style.alignItems = 'center';
            videoContainer.style.justifyContent = 'center';
            
            // Ajuster aussi la vidéo/image à l'intérieur
            const video = document.getElementById('featured-video');
            const image = document.getElementById('featured-image');
            if (video && video.style.display !== 'none') {
                video.style.height = totalHeight + 'px';
                video.style.objectFit = 'cover';
            }
            if (image && image.style.display !== 'none') {
                image.style.height = totalHeight + 'px';
                image.style.objectFit = 'cover';
            }
        }
    }
}

/**
 * Initialise le scroller horizontal pour la barre de tags avec flèches
 */
function initTagsScroller() {
    const scrollArea = document.getElementById('tagsBar');
    const leftBtn = document.getElementById('tagsScrollLeft');
    const rightBtn = document.getElementById('tagsScrollRight');

    if (!scrollArea || !leftBtn || !rightBtn) return;

    function getScrollStep() {
        return Math.round(scrollArea.clientWidth * 0.6);
    }

    function updateArrowsState() {
        const maxScrollLeft = scrollArea.scrollWidth - scrollArea.clientWidth;
        leftBtn.disabled = scrollArea.scrollLeft <= 5;
        rightBtn.disabled = scrollArea.scrollLeft >= (maxScrollLeft - 5);
    }

    rightBtn.addEventListener('click', () => {
        scrollArea.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    leftBtn.addEventListener('click', () => {
        scrollArea.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    scrollArea.addEventListener('scroll', () => {
        window.requestAnimationFrame(updateArrowsState);
    });

    // Navigation clavier
    scrollArea.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollArea.scrollBy({ left: 150, behavior: 'smooth' });
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollArea.scrollBy({ left: -150, behavior: 'smooth' });
        }
    });

    // Recentrer la pill au clic
    scrollArea.addEventListener('click', (e) => {
        const pill = e.target.closest('.tag-pill');
        if (!pill) return;
        const pillLeft = pill.offsetLeft;
        const pillWidth = pill.offsetWidth;
        const areaCenter = (scrollArea.clientWidth / 2) - (pillWidth / 2);
        scrollArea.scrollTo({ left: pillLeft - areaCenter, behavior: 'smooth' });
    });

    leftBtn.style.zIndex = rightBtn.style.zIndex = 3;
    updateArrowsState();
    window.addEventListener('resize', updateArrowsState);
    window.addEventListener('load', updateArrowsState);
}

/**
 * Initialise les gestionnaires de clics sur les tags pour le filtrage
 */
let selectedTags = new Set();

function initTagClickHandlers() {
    const tagsBar = document.getElementById('tagsBar');
    if (!tagsBar) return;

    tagsBar.addEventListener('click', event => {
        const btn = event.target.closest('.tag-pill');
        if (!btn) return;

        const tagValue = btn.getAttribute('data-tag');
        if (!tagValue) return;

        // Cas spécial : "Tous les projets"
        if (tagValue === '__all__') {
            selectedTags.clear();
            document.querySelectorAll('.tag-pill').forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-pressed', 'false');
                Array.from(p.classList).forEach(c => {
                    if (c.startsWith('color-')) p.classList.remove(c);
                });
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            refreshProjectsView();
            return;
        }

        const normalized = String(tagValue || '').trim().toLowerCase();
        if (selectedTags.has(normalized)) {
            // Désélectionner
            selectedTags.delete(normalized);
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
            setPillColorState(btn, false);
        } else {
            // Sélectionner
            selectedTags.add(normalized);
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            setPillColorState(btn, true);
        }

        // Gérer l'état du bouton "Tous les projets"
        const allBtn = tagsBar.querySelector('.tag-pill[data-tag="__all__"]');
        if (selectedTags.size > 0) {
            if (allBtn) {
                allBtn.classList.remove('active');
                allBtn.setAttribute('aria-pressed', 'false');
            }
        } else {
            if (allBtn) {
                allBtn.classList.add('active');
                allBtn.setAttribute('aria-pressed', 'true');
            }
        }

        refreshProjectsView();
        
        // Recharger les projets phares si un tag est sélectionné/désélectionné
        loadRecentProjects();
    });
}

/**
 * Rafraîchit l'affichage des projets selon les filtres
 */
function refreshProjectsView() {
    const projectCards = Array.from(document.querySelectorAll('.project-card'));
    const normalize = s => String(s || '').trim().toLowerCase();
    
    let visibleCount = 0;
    
    projectCards.forEach(card => {
        const cardTagsRaw = card.getAttribute('data-tags') || '';
        const cardTags = new Set(
            cardTagsRaw.split(',')
                .map(t => t.trim())
                .filter(Boolean)
                .map(t => t.toLowerCase())
        );
        
        let matches = false;
        if (selectedTags.size === 0) {
            matches = true;
        } else {
            for (const t of selectedTags) {
                if (cardTags.has(t.toLowerCase())) {
                    matches = true;
                    break;
                }
            }
        }
        
        if (matches) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    const noResultEl = document.getElementById('noResultsMessage');
    if (noResultEl) {
        noResultEl.textContent = visibleCount === 0 && projectCards.length > 0 
            ? "Aucun projet ne correspond aux filtres." 
            : "";
    }
}
