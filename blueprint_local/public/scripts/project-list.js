document.addEventListener('DOMContentLoaded', async () => {
    // Charger les tags dynamiquement
    await loadTags();
    // Charger les projets par défaut (triés par date)
    loadProjects('date');
    initializeFilters();
    initTagsScroller();
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
/**
 * Crée un carousel d'images automatique dans un conteneur.
 * Les images défilent automatiquement toutes les 3 secondes avec une transition fluide.
 * @param {HTMLElement} container - Le conteneur où créer le carousel
 * @param {string[]} images - Tableau des URLs des images à afficher dans le carousel
 * @returns {void}
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
 * Charge l'image de présentation d'un projet pour une carte de projet.
 * @param {string} fileName - Le nom du fichier du projet
 * @param {HTMLElement} container - Le conteneur où afficher l'image
 */
async function loadProjectImageForCard(fileName, container) {
    try {
        const projectHtmlResponse = await fetch(`/public/projects/published/${fileName}`);
        if (!projectHtmlResponse.ok) return;
        
        const projectHtml = await projectHtmlResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(projectHtml, 'text/html');
        
        // Extraire l'image de présentation
        const presentationImage = extractPresentationImage(doc);
        
        if (presentationImage) {
            // Afficher l'image de présentation
            const img = document.createElement('img');
            img.src = presentationImage;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.alt = 'Image du projet';
            container.innerHTML = '';
            container.appendChild(img);
        } else {
            // Pas d'image de présentation, essayer de créer un carousel avec les images multimédias
            const multimediaImages = extractMultimediaImages(doc);
            
            if (multimediaImages.length > 0) {
                // Créer un carousel avec les images multimédias
                createImageCarousel(container, multimediaImages);
            }
            // Sinon, garder le placeholder déjà présent
        }
    } catch (error) {
        console.warn('Could not load project image for card:', error);
        // Garder le placeholder
    }
}

/**
 * Charge le nombre de médias pour une carte de projet.
 * @param {string} fileName - Le nom du fichier du projet
 * @param {HTMLElement} projectCard - L'élément de la carte du projet
 */
async function loadMediaCountForCard(fileName, projectCard) {
    const mediaIndicator = projectCard.querySelector('.media-indicator');
    if (!mediaIndicator) return;
    
    try {
        const response = await fetch(`/public/projects/published/${fileName}`);
        if (!response.ok) {
            mediaIndicator.textContent = '0 média';
            return;
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Compter les médias (images et vidéos dans la section multimedia)
        const mediaCount = doc.querySelectorAll('#multimedia .media-thumbnail, #multimedia .carousel-item, .multimedia-grid img, .multimedia-grid video').length;
        mediaIndicator.textContent = `${mediaCount} média${mediaCount > 1 ? 's' : ''}`;
    } catch (error) {
        console.warn('Could not load media count for card:', error);
        mediaIndicator.textContent = '0 média';
    }
}

/**
 * Charge la description (2 premières lignes) pour une carte de projet.
 * @param {string} fileName - Le nom du fichier du projet
 * @param {HTMLElement} projectCard - L'élément de la carte du projet
 * @param {object} project - Les données du projet depuis l'API
 */
async function loadDescriptionForCard(fileName, projectCard, project) {
    const descEl = projectCard.querySelector('.project-desc');
    if (!descEl) return;
    
    // Si la description est déjà fournie par l'API, l'utiliser
    if (project.description && project.description.trim()) {
        descEl.textContent = project.description;
        return;
    }
    
    try {
        const response = await fetch(`/public/projects/published/${fileName}`);
        if (!response.ok) return;
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extraire la description depuis le texte d'introduction (2 premières lignes)
        const introText = doc.querySelector('.intro-text-block p, #Accueil p');
        if (introText) {
            const text = introText.textContent.trim();
            const lines = text.split('\n').filter(l => l.trim()).slice(0, 2);
            let description = lines.join(' ').trim();
            if (description.length > 150) {
                description = description.substring(0, 150) + '...';
            }
            descEl.textContent = description || project.tags.join(', ') || 'Aucune description disponible';
        }
    } catch (error) {
        console.warn('Could not load description for card:', error);
    }
}

/**
 * Charge et affiche les projets publiés.
 * @param {string} sortBy - Le critère de tri ('date' ou 'title').
 * @param {string} tag - Le tag par lequel filtrer.
 */
async function loadProjects(sortBy = 'date', tag = '') {
    const projectGrid = document.getElementById('projectsContainer');
    if (!projectGrid) {
        console.error('Project grid container not found!');
        return;
    }

    projectGrid.innerHTML = '<p>Chargement des projets...</p>';

    try {
        let apiUrl = `/api/projects/published?sortBy=${sortBy}`;
        if (tag) {
            apiUrl += `&tag=${encodeURIComponent(tag)}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch published projects.');
        }

        const projects = await response.json();

        projectGrid.innerHTML = ''; // Vider la grille avant d'ajouter les nouveaux éléments

        if (projects.length === 0) {
            projectGrid.innerHTML = '<p>Aucun projet publié correspondant aux critères.</p>';
            return;
        }

        projects.forEach(project => {
            const projectCard = document.createElement('article');
            projectCard.className = 'project-card';
            projectCard.setAttribute('data-tags', project.tags.join(', '));

            // Formatage de la date
            const date = new Date(project.dateModification);
            const formattedDate = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

            // Créer le conteneur média
            const mediaContainer = document.createElement('div');
            mediaContainer.className = 'project-media';
            mediaContainer.style.position = 'relative';
            mediaContainer.style.overflow = 'hidden';
            mediaContainer.style.width = '100%';
            mediaContainer.style.height = '200px';
            mediaContainer.style.borderRadius = '8px';
            
            // Placeholder initial
            const placeholderImg = document.createElement('img');
            placeholderImg.src = '/images/project-placeholder.png';
            placeholderImg.alt = `Image du projet : ${project.titre}`;
            placeholderImg.style.width = '100%';
            placeholderImg.style.height = '100%';
            placeholderImg.style.objectFit = 'cover';
            mediaContainer.appendChild(placeholderImg);

            projectCard.innerHTML = `
                <div class="project-body">
                    <div class="project-meta">
                        <span class="tag">${project.tags[0] || 'Général'}</span>
                        <time datetime="${project.dateModification}">${formattedDate}</time>
                    </div>
                    <h2 class="project-title">${project.titre}</h2>
                    <p class="project-desc" data-description="${(project.description || '').replace(/"/g, '&quot;')}">
                        ${project.description || project.tags.join(', ') || 'Aucune description disponible'}
                    </p>
                    <div class="project-footer">
                        <a class="btn" href="/public/projects/published/${project.fileName}">Voir le projet</a>
                        <div class="media-indicator" data-project="${project.fileName}">Chargement...</div>
                    </div>
                </div>
            `;

            // Insérer le conteneur média au début
            projectCard.insertBefore(mediaContainer, projectCard.firstChild);

            // Charger l'image de présentation ou créer un carousel
            loadProjectImageForCard(project.fileName, mediaContainer);
            
            // Charger le nombre de médias et la description de manière asynchrone
            loadMediaCountForCard(project.fileName, projectCard);
            loadDescriptionForCard(project.fileName, projectCard, project);

            projectGrid.appendChild(projectCard);
        });

        // Appliquer les couleurs des tags après le chargement
        applyTagColors();
        // refreshProjectsView() sera appelée automatiquement par les filtres si nécessaire
    } catch (error) {
        console.error('Error fetching project list:', error);
        projectGrid.innerHTML = '<p>Erreur lors du chargement des projets.</p>';
    }
}

/**
 * Initialise les filtres et la recherche
 */
function initializeFilters() {
    const searchInput = document.getElementById('searchInput');
    const tagsBar = document.getElementById('tagsBar');
    
    if (!searchInput || !tagsBar) return;

    let selectedTags = new Set();

    // Helper : nettoyer texte pour comparaisons (insensible à la casse)
    const normalize = s => String(s || '').trim().toLowerCase();

    // Fonction qui vérifie si une carte correspond aux filtres
    function cardMatchesFilters(card, searchTerm, selectedTagsSet) {
        const titleEl = card.querySelector('.project-title');
        const descEl = card.querySelector('.project-desc');

        const title = normalize(titleEl ? titleEl.textContent : '');
        const desc = normalize(descEl ? descEl.textContent : '');
        // Récupérer aussi la description depuis l'attribut data-description (les deux premières lignes)
        const dataDescription = normalize(card.querySelector('.project-desc')?.getAttribute('data-description') || '');

        const searchMatch = !searchTerm || 
            title.includes(searchTerm) || 
            desc.includes(searchTerm) || 
            dataDescription.includes(searchTerm);

        const dataTagsRaw = card.getAttribute('data-tags') || '';
        const cardTags = new Set(
            dataTagsRaw.split(',')
                .map(t => t.trim())
                .filter(Boolean)
                .map(t => t.toLowerCase())
        );

        if (selectedTagsSet.size === 0) {
            return searchMatch;
        }

        let hasTagMatch = false;
        for (const t of selectedTagsSet) {
            if (cardTags.has(t.toLowerCase())) { hasTagMatch = true; break; }
        }

        return searchMatch && hasTagMatch;
    }

    // Rafraîchit l'affichage des cartes selon filtres
    function refreshProjectsView() {
        const searchTerm = normalize(searchInput.value || '');
        const projectCards = Array.from(document.querySelectorAll('.project-card'));

        let visibleCount = 0;
        projectCards.forEach(card => {
            if (cardMatchesFilters(card, searchTerm, selectedTags)) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        const noResultId = 'noResultsMessage';
        let noResultEl = document.getElementById(noResultId);
        if (visibleCount === 0 && projectCards.length > 0) {
            if (!noResultEl) {
                noResultEl = document.createElement('div');
                noResultEl.id = noResultId;
                noResultEl.style.marginTop = '18px';
                noResultEl.style.color = 'var(--muted)';
                noResultEl.style.fontWeight = 600;
                document.querySelector('.projects-grid').after(noResultEl);
            }
            noResultEl.textContent = "Aucun projet ne correspond aux filtres.";
        } else if (noResultEl) {
            noResultEl.remove();
        }
    }

    // Gestion des clics sur les tags
    tagsBar.addEventListener('click', event => {
        const btn = event.target.closest('.tag-pill');
        if (!btn) return;

        const tagValue = btn.getAttribute('data-tag');
        if (!tagValue) return;

        // bouton "Tous les projets" : reset
        if (tagValue === '__all__') {
            selectedTags.clear();
            document.querySelectorAll('.tag-pill').forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-pressed', 'false');
                // Retirer toute classe color-*
                Array.from(p.classList).forEach(c => {
                    if (c.startsWith('color-')) p.classList.remove(c);
                });
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            refreshProjectsView();
            return;
        }

        // toggle d'un tag (sélection / désélection)
        const normalized = normalize(tagValue);
        if (selectedTags.has(normalized)) {
            selectedTags.delete(normalized);
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
            setPillColorState(btn, false);
        } else {
            selectedTags.add(normalized);
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            setPillColorState(btn, true);
        }

        // gérer l'état du bouton "Tous les projets"
        const allBtn = tagsBar.querySelector('.tag-pill[data-tag="__all__"]');
        if (selectedTags.size > 0) {
            if (allBtn) { 
                allBtn.classList.remove('active'); 
                allBtn.setAttribute('aria-pressed','false'); 
            }
        } else {
            if (allBtn) { 
                allBtn.classList.add('active'); 
                allBtn.setAttribute('aria-pressed','true'); 
            }
        }

        refreshProjectsView();
    });

    // Recherche instantanée
    searchInput.addEventListener('input', () => {
        refreshProjectsView();
    });
}

/**
 * Applique la couleur des tags selon la thématique
 */
function applyTagColors() {
    const TAG_CLASS_MAP = {
        'informatique': 'color-informatique',
        'ia': 'color-ia',
        'robotique': 'color-robotique',
        'robotique & électronique': 'color-robotique',
        'robotique et électronique': 'color-robotique',
        'web': 'color-web',
        'éco': 'color-eco',
        'eco': 'color-eco',
        'design': 'color-design',
        'data': 'color-data',
        'ml': 'color-ml',
        'machine learning': 'color-ml',
        'environnement': 'color-environnement',
        'electronique': 'color-electronique',
        'électronique': 'color-electronique',
        'energie': 'color-energie',
        'énergie': 'color-energie'
    };

    document.querySelectorAll('.project-card').forEach(card => {
        let tagSpan = card.querySelector('.tag');
        let tagText = '';

        if (tagSpan && tagSpan.textContent.trim()) {
            tagText = tagSpan.textContent.trim();
        } else {
            const raw = (card.getAttribute('data-tags') || '').split(',')[0] || '';
            tagText = raw.trim();
        }

        const key = tagText.toLowerCase();
        const mapped = TAG_CLASS_MAP[key] || 'color-default';

        if (tagSpan) {
            // retirer anciennes classes color-*
            tagSpan.classList.forEach(c => {
                if (c.startsWith('color-')) tagSpan.classList.remove(c);
            });
            tagSpan.classList.add(mapped);
        }
    });
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
 * Applique le filtre par tag en rechargeant la liste.
 */
function applyTagFilter() {
    const tag = document.getElementById('tag-filter-input')?.value.trim() || '';
    loadProjects('date', tag);
}
