const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

let currentFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Charger les tags disponibles au démarrage
    await loadAvailableTags();
    
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('file');

    if (fileName) {
        loadDraft(fileName);
    } else {
        loadNewProject();
    }
});

/**
 * Charge les tags disponibles depuis l'API et crée les checkboxes.
 */
async function loadAvailableTags() {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) return;

    try {
        const response = await fetch('/api/tags');
        if (!response.ok) throw new Error('Failed to fetch tags');
        
        const tags = await response.json();
        
        tagsContainer.innerHTML = '';
        
        if (tags.length === 0) {
            tagsContainer.innerHTML = '<p class="help">Aucun tag disponible.</p>';
            return;
        }

        // Créer une grille de checkboxes avec style tag-pill
        const tagsGrid = document.createElement('div');
        tagsGrid.style.display = 'flex';
        tagsGrid.style.flexWrap = 'wrap';
        tagsGrid.style.gap = '8px';
        tagsGrid.style.marginTop = '8px';

        tags.forEach(tag => {
            const label = document.createElement('label');
            label.className = 'checkbox';
            label.style.margin = '0';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = tag;
            checkbox.name = 'project-tag';
            checkbox.id = `tag-${tag.replace(/\s+/g, '-').toLowerCase()}`;
            
            const span = document.createElement('span');
            span.className = 'tag is-light';
            span.style.marginLeft = '5px';
            span.style.cursor = 'pointer';
            span.textContent = tag;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            tagsGrid.appendChild(label);
        });

        tagsContainer.appendChild(tagsGrid);
    } catch (error) {
        console.error('Error loading tags:', error);
        tagsContainer.innerHTML = '<p class="help has-text-danger">Erreur lors du chargement des tags.</p>';
    }
}

/**
 * Récupère les tags sélectionnés depuis les checkboxes.
 */
function getSelectedTags() {
    const checkboxes = document.querySelectorAll('input[name="project-tag"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Sélectionne les tags dans les checkboxes.
 */
function setSelectedTags(tags) {
    // Décocher toutes les checkboxes
    document.querySelectorAll('input[name="project-tag"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Cocher les tags fournis
    if (tags && Array.isArray(tags)) {
        tags.forEach(tag => {
            const checkbox = document.getElementById(`tag-${tag.replace(/\s+/g, '-').toLowerCase()}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
}

/**
 * Charge le template pour un nouveau projet.
 * Récupère le template complet depuis l'API, le prépare pour l'édition, et initialise TinyMCE.
 * @returns {Promise<void>}
 * @throws {Error} Si le chargement du template échoue ou si le conteneur est introuvable
 */
async function loadNewProject() {
    try {
        // Charger le template complet avec header/footer
        const response = await fetch('/api/templates/project_full');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Le chargement du modèle a échoué: ${response.status} - ${errorText}`);
        }
        const templateHtml = await response.text();

        if (!templateHtml || templateHtml.trim().length === 0) {
            throw new Error('Le template est vide');
        }

        const container = document.getElementById('visual-editor-container');
        if (!container) {
            throw new Error('Le conteneur de l\'éditeur n\'a pas été trouvé');
        }

        console.log('Template HTML reçu, longueur:', templateHtml.length);
        let preparedHtml = prepareTemplateForEditing(templateHtml);
        console.log('Template préparé, longueur:', preparedHtml ? preparedHtml.length : 0);
        
        if (!preparedHtml || preparedHtml.trim().length === 0) {
            console.error('Le template préparé est vide!');
            console.error('Template original (premiers 500 chars):', templateHtml.substring(0, 500));
            throw new Error('Le template préparé est vide');
        }

        console.log('Injection du HTML dans le conteneur...');
        container.innerHTML = preparedHtml;
        console.log('HTML injecté. Contenu du conteneur:', container.innerHTML.substring(0, 200));
        
        // Attendre que le DOM soit mis à jour avant de rendre éditable
        setTimeout(() => {
            makeContentEditable(container);
            // Attendre encore un peu pour que les classes soient appliquées
            setTimeout(() => {
                initializeEditor();
                notyf.success('Nouveau projet initialisé. Vous pouvez commencer à éditer.');
            }, 100);
        }, 50);

        currentFile = null;
    } catch (error) {
        console.error('Erreur lors du chargement du nouveau projet:', error);
        notyf.error('Erreur lors du chargement du nouveau projet: ' + error.message);
        const container = document.getElementById('visual-editor-container');
        if (container) {
            container.innerHTML = `<div class="notification is-danger">
                <p><strong>Erreur de chargement:</strong> ${error.message}</p>
                <p>Vérifiez la console pour plus de détails.</p>
            </div>`;
        }
    }
}

/**
 * Charge un brouillon existant dans l'éditeur.
 * Récupère le contenu du brouillon et le template complet, puis injecte le contenu dans le template.
 * @param {string} fileName - Le nom du fichier du brouillon (ex: "mon_projet.md")
 * @returns {Promise<void>}
 * @throws {Error} Si le chargement du brouillon ou du template échoue
 */
async function loadDraft(fileName) {
    try {
        // Charger le contenu du brouillon et le template complet
        const [projectResponse, templateResponse] = await Promise.all([
            fetch(`/api/project?file=${fileName}&type=draft`),
            fetch('/api/templates/project_full')
        ]);
        
        if (!projectResponse.ok) throw new Error('Le chargement du brouillon a échoué');
        if (!templateResponse.ok) throw new Error('Le chargement du template a échoué');
        
        const project = await projectResponse.json();
        const templateHtml = await templateResponse.text();

        // Parser le template et injecter le contenu du brouillon dans le main
        const parser = new DOMParser();
        const templateDoc = parser.parseFromString(templateHtml, 'text/html');
        const main = templateDoc.querySelector('main');
        
        if (main) {
            // Injecter le contenu du brouillon dans le main
            const draftParser = new DOMParser();
            const draftDoc = draftParser.parseFromString(project.content, 'text/html');
            const draftMain = draftDoc.querySelector('main');
            
            if (draftMain) {
                main.innerHTML = draftMain.innerHTML;
            } else {
                // Si le contenu du brouillon n'a pas de main, l'injecter directement
                main.innerHTML = project.content;
            }
        }

        const container = document.getElementById('visual-editor-container');
        container.innerHTML = templateDoc.body.innerHTML;

        // Ensure the media gallery exists, even in older drafts
        if (!container.querySelector('.multimedia-section')) {
            const multimediaSection = document.createElement('section');
            multimediaSection.id = 'multimedia';
            multimediaSection.className = 'section multimedia-section';
            multimediaSection.innerHTML = `
                <div class="container">
                    <h2 class="title has-text-centered">Galerie Photos & Vidéos</h2>
                    <div class="carousel-wrapper">
                        <div class="scroll-area">
                            <div class="carousel-grid multimedia-grid"></div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="button is-primary add-media-button">Ajouter un média</button>
                    </div>
                </div>
            `;
            container.appendChild(multimediaSection);
        }

        makeContentEditable(container);

        // Synchroniser le titre dans le bandeau depuis le front matter
        if (project.frontMatter.titre) {
            const bandeauTexte = container.querySelector('.bandeau-texte');
            if (bandeauTexte) {
                bandeauTexte.textContent = project.frontMatter.titre;
            }
        }

        // Remplir les tags sélectionnés
        const tags = project.frontMatter.tags || [];
        setSelectedTags(tags);

        currentFile = fileName;
        
        // Attendre que le DOM soit mis à jour avant d'initialiser l'éditeur
        setTimeout(() => {
            initializeEditor();
            notyf.success(`Brouillon "${fileName}" chargé.`);
        }, 100);
    } catch (error) {
        notyf.error('Erreur lors du chargement du brouillon: ' + error.message);
    }
}

/**
 * Prépare le HTML du template en ajoutant des classes pour l'édition et du contenu placeholder.
 * Initialise les sections (Accueil, Synthèse, Multimédia) avec du contenu par défaut éditable.
 * @param {string} html - Le contenu HTML complet du template (avec header/footer)
 * @returns {string} - Le HTML modifié avec les classes d'édition et le contenu placeholder
 * @throws {Error} Si le parsing du HTML échoue
 */
function prepareTemplateForEditing(html) {
    console.log('prepareTemplateForEditing: Début, longueur HTML:', html.length);
    
    // Extraire le contenu du body directement depuis le HTML si le parsing échoue
    let bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : null;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    console.log('prepareTemplateForEditing: Document parsé, body existe?', !!doc.body);
    console.log('prepareTemplateForEditing: body.innerHTML longueur:', doc.body ? doc.body.innerHTML.length : 0);

    // Adapter le titre dans le bandeau
    const bandeauTexte = doc.querySelector('.bandeau-texte');
    if (bandeauTexte) {
        bandeauTexte.textContent = 'Titre de votre projet';
    } else {
        console.warn('prepareTemplateForEditing: .bandeau-texte non trouvé!');
    }

    // Adapter le texte d'introduction
    const introText = doc.querySelector('.intro-text-block p');
    if (introText) {
        introText.textContent = 'Cliquez ici pour écrire un résumé de votre projet...';
    }

    // Adapter la vidéo/image principale
    const videoContainer = doc.querySelector('.video-container');
    if (videoContainer) {
        const video = videoContainer.querySelector('video');
        if (video) {
            const source = video.querySelector('source');
            if (source) {
                source.src = '/images/image-projet-principal.png';
            }
        }
    }

    // Initialiser la section Accueil avec personnes si nécessaire
    const teamSummary = doc.querySelector('.team-summary');
    if (teamSummary) {
        // S'assurer que les colonnes Étudiants et Encadrants existent
        let teamColumns = teamSummary.querySelectorAll('.team-column');
        if (teamColumns.length === 0) {
            teamSummary.innerHTML = `
                <div class="team-column">
                    <h3 style="margin-bottom: 15px; font-weight: 600;">Étudiants</h3>
                    <div class="team-member is-flex is-align-items-center mb-3">
                        <img src="/images/photo-test-etudiant.png" alt="Étudiant" class="editable-image" style="width:60px; height:60px; border-radius:50%; margin-right:10px; cursor: pointer;">
                        <div>
                            <span class="has-text-weight-semibold editable-text">Nom Prénom</span><br>
                            <small class="editable-text">Étudiant</small>
                        </div>
                        <span class="delete-person-button" style="margin-left: 10px; cursor: pointer; color: red; font-weight: bold;">&times;</span>
                    </div>
                    <button class="button is-small is-primary add-person-button" data-role="etudiant" style="margin-top: 10px;">+ Ajouter un étudiant</button>
                </div>
                <div class="team-column">
                    <h3 style="margin-bottom: 15px; font-weight: 600;">Encadrants</h3>
                    <div class="team-member is-flex is-align-items-center mb-3">
                        <img src="/images/photo-etienne-giboud.png" alt="Encadrant" class="editable-image" style="width:60px; height:60px; border-radius:50%; margin-right:10px; cursor: pointer;">
                        <div>
                            <span class="has-text-weight-semibold editable-text">Nom Prénom</span><br>
                            <small class="editable-text">Encadrant</small>
                        </div>
                        <span class="delete-person-button" style="margin-left: 10px; cursor: pointer; color: red; font-weight: bold;">&times;</span>
                    </div>
                    <button class="button is-small is-primary add-person-button" data-role="encadrant" style="margin-top: 10px;">+ Ajouter un encadrant</button>
                </div>
            `;
        }
    }

    // Adapter le tableau Objectifs/Résultats/Ressenti
    const syntheseTable = doc.querySelector('#Synthese table tbody');
    if (syntheseTable) {
        const cells = syntheseTable.querySelectorAll('td');
        cells.forEach(cell => {
            if (cell.textContent.trim() === '') {
                cell.textContent = 'Cliquez ici pour éditer...';
            }
        });
    }

    // Initialiser la section multimédia (sans zone de texte)
    const multimediaSection = doc.querySelector('.multimedia-section');
    if (multimediaSection) {
        const multimediaGrid = multimediaSection.querySelector('.multimedia-grid');
        if (!multimediaGrid) {
            const container = multimediaSection.querySelector('.container');
            if (container) {
                container.innerHTML = `
                    <h2 class="title has-text-centered">Galerie Photos & Vidéos</h2>
                    <div class="carousel-wrapper">
                        <div class="scroll-area">
                            <div class="carousel-grid multimedia-grid"></div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="button is-primary add-media-button">Ajouter un média</button>
                    </div>
                `;
            }
        }
    }

    // Retourner le body complet avec header/footer pour l'édition
    // L'utilisateur doit voir le rendu complet
    // On retourne le contenu du body (sans la balise body elle-même)
    let finalContent = doc.body ? doc.body.innerHTML : null;
    
    // Si le parsing a échoué, utiliser l'extraction regex comme fallback
    if (!finalContent || finalContent.trim().length === 0) {
        console.warn('prepareTemplateForEditing: body.innerHTML vide, utilisation du fallback regex');
        if (bodyContent) {
            // Parser le bodyContent extrait pour appliquer les modifications
            const bodyDoc = parser.parseFromString(bodyContent, 'text/html');
            const bandeauTexte = bodyDoc.querySelector('.bandeau-texte');
            if (bandeauTexte) {
                bandeauTexte.textContent = 'Titre de votre projet';
            }
            finalContent = bodyDoc.body ? bodyDoc.body.innerHTML : bodyContent;
        } else {
            console.error('prepareTemplateForEditing: Impossible d\'extraire le contenu du body!');
            throw new Error('Impossible de parser le template HTML');
        }
    }
    
    console.log('prepareTemplateForEditing: Contenu final, longueur:', finalContent.length);
    return finalContent;
}

/**
 * Ajoute les classes et les contrôles nécessaires pour rendre le contenu éditable.
 * Ajoute les classes 'editable-text', 'editable-image', 'editable-media' aux éléments appropriés,
 * et ajoute les boutons pour ajouter/supprimer des personnes et des médias.
 * @param {HTMLElement} container - Le conteneur dont le contenu doit être rendu éditable
 * @returns {void}
 */
function makeContentEditable(container) {
    // --- Ajout des classes pour l'édition de texte ---
    // Titre dans le bandeau (si présent)
    const bandeauTexte = container.querySelector('.bandeau-texte');
    if (bandeauTexte) {
        bandeauTexte.classList.add('editable-text', 'project-title');
    }

    // Texte d'introduction
    const introText = container.querySelector('.intro-text-block p');
    if (introText) {
        introText.classList.add('editable-text');
    }

    // Tableau Objectifs/Résultats/Ressenti - rendre toutes les cellules éditables avec contenteditable natif
    // (TinyMCE inline ne fonctionne pas bien avec les cellules de tableau)
    const syntheseTable = container.querySelector('#Synthese table');
    if (syntheseTable) {
        syntheseTable.querySelectorAll('tbody td').forEach(cell => {
            // Utiliser contenteditable natif pour les cellules de tableau
            cell.setAttribute('contenteditable', 'true');
            cell.classList.add('editable-cell'); // Classe pour le style, pas pour TinyMCE
            cell.style.minHeight = '20px';
            cell.style.outline = '1px dashed #ccc';
            cell.style.outlineOffset = '2px';
            cell.style.padding = '8px';
        });
    }

    // Personnes dans les sections Étudiants/Encadrants
    container.querySelectorAll('.person-card .name').forEach(el => el.classList.add('editable-text'));
    container.querySelectorAll('.person-card .role').forEach(el => el.classList.add('editable-text'));

    // Personnes dans la section Accueil (team-member)
    container.querySelectorAll('.team-member .editable-text').forEach(el => {
        if (!el.classList.contains('editable-text')) {
            el.classList.add('editable-text');
        }
    });

    // --- Zone d'accueil (vidéo/image principale) ---
    const videoContainer = container.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.classList.add('editable-media');
        videoContainer.title = "Cliquez pour changer la vidéo ou l'image";
    }

    // --- Images éditables : toutes les images de personnes ---
    container.querySelectorAll('.person-card img, .team-member img').forEach(el => {
        el.classList.add('editable-image');
        el.style.cursor = 'pointer';
        el.title = "Cliquez pour changer l'image";
    });

    // --- Ajout des contrôles pour les participants dans les sections Étudiants/Encadrants ---
    container.querySelectorAll('.people-section, .people-section-E').forEach(section => {
        // Ajouter le bouton "Ajouter" seulement s'il n'existe pas déjà
        if (!section.querySelector('.add-person-button')) {
            const addButton = document.createElement('button');
            addButton.className = 'button is-primary add-person-button';
            const isEncadrant = section.classList.contains('people-section-E');
            addButton.setAttribute('data-role', isEncadrant ? 'encadrant' : 'etudiant');
            addButton.textContent = isEncadrant ? '+ Ajouter un encadrant' : '+ Ajouter un étudiant';
            const buttonContainer = document.createElement('div');
            buttonContainer.style.textAlign = 'center';
            buttonContainer.style.marginTop = '20px';
            buttonContainer.appendChild(addButton);
            section.appendChild(buttonContainer);
        }

        section.querySelectorAll('.person-card').forEach(card => {
            card.style.position = 'relative';
            // Ajouter le bouton "Supprimer" seulement s'il n'existe pas déjà
            if (!card.querySelector('.delete-person-button')) {
                const deleteButton = document.createElement('span');
                deleteButton.className = 'delete-person-button';
                deleteButton.innerHTML = '&times;';
                deleteButton.style.position = 'absolute';
                deleteButton.style.top = '5px';
                deleteButton.style.right = '5px';
                deleteButton.style.cursor = 'pointer';
                deleteButton.style.color = 'red';
                deleteButton.style.fontWeight = 'bold';
                deleteButton.style.background = 'white';
                deleteButton.style.borderRadius = '50%';
                deleteButton.style.width = '25px';
                deleteButton.style.height = '25px';
                deleteButton.style.display = 'flex';
                deleteButton.style.alignItems = 'center';
                deleteButton.style.justifyContent = 'center';
                card.appendChild(deleteButton);
            }
        });
    });

    // --- Ajout des contrôles pour les personnes dans la section Accueil ---
    container.querySelectorAll('.team-column').forEach(column => {
        const teamMembers = column.querySelectorAll('.team-member');
        teamMembers.forEach(member => {
            member.style.position = 'relative';
            if (!member.querySelector('.delete-person-button')) {
                const deleteButton = document.createElement('span');
                deleteButton.className = 'delete-person-button';
                deleteButton.innerHTML = '&times;';
                deleteButton.style.marginLeft = '10px';
                deleteButton.style.cursor = 'pointer';
                deleteButton.style.color = 'red';
                deleteButton.style.fontWeight = 'bold';
                member.appendChild(deleteButton);
            }
        });
    });
}

/**
 * Initialise les fonctionnalités de l'éditeur TinyMCE.
 * Initialise TinyMCE en mode inline sur tous les éléments .editable-text (sauf les cellules de tableau),
 * et configure les gestionnaires d'événements pour les interactions (ajout/suppression de personnes, médias, etc.).
 * @returns {void}
 */
function initializeEditor() {
    // Vérifier que les éléments éditables existent avant d'initialiser TinyMCE
    const editableElements = document.querySelectorAll('.editable-text');
    if (editableElements.length === 0) {
        console.warn('initializeEditor: Aucun élément .editable-text trouvé, attente...');
        setTimeout(() => {
            const retryElements = document.querySelectorAll('.editable-text');
            if (retryElements.length > 0) {
                initializeEditor();
            } else {
                console.error('initializeEditor: Aucun élément éditable trouvé après attente');
            }
        }, 200);
        return;
    }
    
    console.log(`initializeEditor: Initialisation de TinyMCE sur ${editableElements.length} éléments`);
    
    // Initialiser TinyMCE uniquement sur les éléments qui existent et sont valides
    // Exclure les cellules de tableau (<td>, <th>) car TinyMCE inline ne fonctionne pas bien avec elles
    editableElements.forEach((element, index) => {
        // Vérifier que l'élément est dans le DOM et valide
        if (!element.isConnected || !element.parentElement) {
            console.warn(`initializeEditor: Élément ${index} n'est pas dans le DOM, ignoré`);
            return;
        }
        
        // Exclure les cellules de tableau - elles utilisent contenteditable natif (déjà configuré dans makeContentEditable)
        if (element.tagName === 'TD' || element.tagName === 'TH' || element.classList.contains('editable-cell')) {
            console.log(`initializeEditor: Cellule de tableau ${index} ignorée (utilise contenteditable natif)`);
            return;
        }
        
        // Utiliser un sélecteur unique pour éviter les conflits
        const uniqueId = `editable-${Date.now()}-${index}`;
        element.id = uniqueId;
        
        try {
            tinymce.init({
                selector: `#${uniqueId}`,
                inline: true,
                plugins: 'link image media table code fullscreen autoresize quickbars',
                toolbar: false,
                menubar: false,
                quickbars_selection_toolbar: 'bold italic underline | bullist numlist | blockquote | quicklink | table',
                quickbars_insert_toolbar: 'image media table',
                automatic_uploads: true,
                images_upload_url: '/api/upload',
                file_picker_types: 'image',
                document_base_url: '/',
                // Permettre les tableaux et liens dans les zones de texte
                table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
                link_context_toolbar: true,
                setup: function(editor) {
                    editor.on('blur', async () => {
                        console.log('Content changed, ready for auto-save.');
                    });
                }
            });
        } catch (error) {
            console.error(`Erreur lors de l'initialisation de TinyMCE sur l'élément ${index}:`, error);
        }
    });

    console.log("Éditeur en mode 'inline' initialisé.");

    // --- Gestionnaire pour les actions non-TinyMCE ---
    document.getElementById('visual-editor-container').addEventListener('click', function(event) {
        const target = event.target;

        // Gérer le clic sur une image éditable (pour la remplacer)
        if (target.classList.contains('editable-image') && !target.closest('.editable-text')) {
            handleMediaUpload(target.parentElement); // Envoyer le conteneur, pas l'image elle-même
        }
        // Gérer le clic sur le conteneur de média principal
        else if (target.closest('.editable-media')) {
            handleMediaUpload(target.closest('.editable-media'));
        }
        // Gérer le bouton pour ajouter une personne
        else if (target.classList.contains('add-person-button')) {
            const role = target.getAttribute('data-role');
            // Si c'est un fichier, gérer différemment
            if (role === 'fichier') {
                handleFileUpload(target);
            } else {
                // Peut être dans .people-section, .people-section-E, ou .team-column
                const section = target.closest('.people-section, .people-section-E, .team-column');
                if (section) {
                    addPerson(section);
                }
            }
        }
        // Gérer le bouton pour supprimer une personne
        else if (target.classList.contains('delete-person-button')) {
            // Peut être dans .person-card ou .team-member
            const personCard = target.closest('.person-card');
            const teamMember = target.closest('.team-member');
            if (personCard) {
                removePerson(personCard);
            } else if (teamMember) {
                removePerson(teamMember);
            }
        }
        // Gérer l'ajout de média dans la galerie
        else if (target.classList.contains('add-media-button')) {
            // Chercher le conteneur de la galerie (peut être .multimedia-gallery-container ou parent)
            const galleryContainer = target.closest('.multimedia-section') || target.closest('.multimedia-gallery-container');
            if (galleryContainer) {
                handleAddMedia(galleryContainer);
            }
        }
        // Gérer la suppression de média de la galerie
        else if (target.classList.contains('delete-media-button')) {
            removeMedia(target.closest('.media-thumbnail'));
        }
        // Gérer l'ouverture du modal vidéo
        else if (target.closest('.video-thumbnail')) {
            openVideoModal(target.closest('.video-thumbnail').dataset.videoUrl);
        }
    });

    // Gestionnaires pour fermer le modal vidéo
    const modal = document.getElementById('video-modal');
    const modalCloseButton = modal.querySelector('.modal-close');
    const modalBackground = modal.querySelector('.modal-background');

    const closeModal = () => {
        modal.classList.remove('is-active');
        document.getElementById('modal-video-player').pause();
    };

    modalCloseButton.addEventListener('click', closeModal);
    modalBackground.addEventListener('click', closeModal);
}

/**
 * Gère le processus de téléversement d'un nouveau média (image ou vidéo).
 * Crée un input file, déclenche la sélection de fichier, et met à jour le conteneur avec le média téléversé.
 * @param {HTMLElement} mediaContainer - Le conteneur du média à mettre à jour (peut être une image, vidéo, ou conteneur parent)
 * @returns {void}
 */
function handleMediaUpload(mediaContainer) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*'; // Accepte images et vidéos
    fileInput.style.display = 'none';

    fileInput.onchange = async () => {
        if (fileInput.files.length === 0) return;

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Le téléversement a échoué.');

            const result = await response.json();
            const mediaUrl = result.location + '?t=' + new Date().getTime();

            // Vider le conteneur et y insérer le nouveau média
            // Si c'est une vidéo dans video-container, remplacer le contenu
            if (mediaContainer.classList.contains('video-container')) {
                mediaContainer.innerHTML = '';
                let newMediaElement;
                
                if (file.type.startsWith('image/')) {
                    newMediaElement = document.createElement('img');
                    newMediaElement.src = mediaUrl;
                    newMediaElement.alt = "Image principale du projet";
                    newMediaElement.style.width = '100%';
                    newMediaElement.style.height = '100%';
                    newMediaElement.style.objectFit = 'cover';
                } else if (file.type.startsWith('video/')) {
                    newMediaElement = document.createElement('video');
                    newMediaElement.src = mediaUrl;
                    newMediaElement.controls = true;
                    newMediaElement.style.position = 'absolute';
                    newMediaElement.style.top = '0';
                    newMediaElement.style.left = '0';
                    newMediaElement.style.width = '100%';
                    newMediaElement.style.height = '100%';
                    newMediaElement.style.objectFit = 'cover';
                }
                
                if (newMediaElement) {
                    mediaContainer.appendChild(newMediaElement);
                }
            } else {
                // Pour les images de personnes, remplacer directement l'image
                const existingImg = mediaContainer.querySelector('img');
                if (existingImg && file.type.startsWith('image/')) {
                    existingImg.src = mediaUrl;
                    existingImg.classList.add('editable-image');
                    existingImg.style.cursor = 'pointer';
                } else {
                    // Sinon, remplacer tout le contenu
                    mediaContainer.innerHTML = '';
                    let newMediaElement;
                    
                    if (file.type.startsWith('image/')) {
                        newMediaElement = document.createElement('img');
                        newMediaElement.src = mediaUrl;
                        newMediaElement.alt = "Média du projet";
                        newMediaElement.classList.add('editable-image');
                        newMediaElement.style.cursor = 'pointer';
                    } else if (file.type.startsWith('video/')) {
                        newMediaElement = document.createElement('video');
                        newMediaElement.src = mediaUrl;
                        newMediaElement.controls = true;
                    }
                    
                    if (newMediaElement) {
                        mediaContainer.appendChild(newMediaElement);
                    }
                }
            }

            notyf.success('Média mis à jour avec succès.');

        } catch (error) {
            notyf.error('Erreur: ' + error.message);
        } finally {
            document.body.removeChild(fileInput);
        }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
}

/**
 * Ajoute une nouvelle carte de personne à une section.
 * @param {HTMLElement} sectionElement - La section où ajouter la personne (peut être .people-section, .people-section-E, ou .team-column).
 */
async function addPerson(sectionElement) {
    // Vérifier si c'est une section Accueil (team-column) ou une section Étudiants/Encadrants
    const isTeamColumn = sectionElement.classList.contains('team-column');
    const isAccueilSection = sectionElement.closest('#Accueil');
    
    if (isTeamColumn || isAccueilSection) {
        // Section Accueil : ajouter dans la colonne appropriée
        const button = sectionElement.querySelector('.add-person-button');
        const role = button ? button.getAttribute('data-role') : 'etudiant';
        const teamColumn = isTeamColumn ? sectionElement : sectionElement.closest('.team-column');
        
        // Si c'est un encadrant, proposer l'autocomplétion
        if (role === 'encadrant') {
            await addEncadrantWithAutocomplete(teamColumn, button);
            return;
        }
        
        const newTeamMember = document.createElement('div');
        newTeamMember.className = 'team-member is-flex is-align-items-center mb-3';
        newTeamMember.style.position = 'relative';
        newTeamMember.innerHTML = `
            <img src="/images/photo-test-etudiant.png" alt="${role}" class="editable-image" style="width:60px; height:60px; border-radius:50%; margin-right:10px; cursor: pointer;">
            <div>
                <span class="has-text-weight-semibold editable-text">Nom Prénom</span><br>
                <small class="editable-text">${role === 'encadrant' ? 'Encadrant' : 'Étudiant'}</small>
            </div>
            <span class="delete-person-button" style="margin-left: 10px; cursor: pointer; color: red; font-weight: bold;">&times;</span>
        `;
        
        // Insérer avant le bouton "Ajouter"
        if (button && button.parentElement) {
            button.parentElement.insertBefore(newTeamMember, button);
        } else {
            teamColumn.appendChild(newTeamMember);
        }
        
        // Rendre les champs éditables - utiliser le sélecteur global pour éviter les conflits
        setTimeout(() => {
            const newEditableTexts = newTeamMember.querySelectorAll('.editable-text');
            newEditableTexts.forEach((el, index) => {
                // Utiliser un sélecteur unique pour chaque élément
                const uniqueId = `editable-${Date.now()}-${index}`;
                el.id = uniqueId;
                tinymce.init({ 
                    selector: `#${uniqueId}`, 
                    inline: true, 
                    plugins: 'link', 
                    toolbar: false,
                    menubar: false,
                    quickbars_selection_toolbar: 'bold italic underline | link'
                });
            });
        }, 200);
        
        notyf.success(`Nouveau ${role} ajouté dans la section Accueil.`);
    } else {
        // Section Étudiants/Encadrants : ajouter une carte
        const grid = sectionElement.querySelector('.people-grid');
        if (!grid) return;

        const isEncadrant = sectionElement.classList.contains('people-section-E');
        
        // Si c'est un encadrant, proposer l'autocomplétion
        if (isEncadrant) {
            await addEncadrantCardWithAutocomplete(sectionElement);
            return;
        }
        
        const newPersonCard = document.createElement('div');
        newPersonCard.className = 'person-card';
        newPersonCard.style.position = 'relative';
        
        newPersonCard.innerHTML = `
            <img src="/images/photo-test-etudiant.png" alt="Étudiant" class="editable-image" style="cursor: pointer;">
            <div class="name editable-text">Nom Prénom</div>
            <span class="delete-person-button" style="position: absolute; top: 5px; right: 5px; cursor: pointer; color: red; font-weight: bold; background: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center;">&times;</span>
        `;

        grid.appendChild(newPersonCard);

        // Rendre les nouveaux champs éditables par TinyMCE - utiliser des sélecteurs uniques
        setTimeout(() => {
            const newEditableTexts = newPersonCard.querySelectorAll('.editable-text');
            newEditableTexts.forEach((el, index) => {
                // Utiliser un sélecteur unique pour chaque élément
                const uniqueId = `editable-${Date.now()}-${index}`;
                el.id = uniqueId;
                tinymce.init({ 
                    selector: `#${uniqueId}`, 
                    inline: true, 
                    plugins: 'link', 
                    toolbar: false,
                    menubar: false,
                    quickbars_selection_toolbar: 'bold italic underline | link'
                });
            });
        }, 200);

        notyf.success('Nouvelle personne ajoutée.');
    }
}

/**
 * Ajoute un encadrant avec autocomplétion dans la section Accueil.
 */
async function addEncadrantWithAutocomplete(teamColumn, button) {
    try {
        // Charger la liste des encadrants disponibles
        const response = await fetch('/api/encadrants');
        const encadrants = await response.ok ? await response.json() : [];
        
        // Créer un modal de sélection
        const modal = document.createElement('div');
        modal.className = 'modal is-active';
        modal.innerHTML = `
            <div class="modal-background"></div>
            <div class="modal-card">
                <header class="modal-card-head">
                    <p class="modal-card-title">Sélectionner un encadrant</p>
                    <button class="delete" aria-label="close"></button>
                </header>
                <section class="modal-card-body">
                    <div class="field">
                        <label class="label">Rechercher un encadrant</label>
                        <div class="control">
                            <input class="input" type="text" id="encadrant-search" placeholder="Nom ou email...">
                        </div>
                    </div>
                    <div id="encadrant-list" style="max-height: 300px; overflow-y: auto;">
                        ${encadrants.map(e => `
                            <div class="box encadrant-option" style="cursor: pointer; margin-bottom: 10px;" data-name="${e.name}" data-email="${e.email}" data-image="${e.imageUrl || '/images/photo-etienne-giboud.png'}">
                                <div class="is-flex is-align-items-center">
                                    <img src="${e.imageUrl || '/images/photo-etienne-giboud.png'}" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px;">
                                    <div>
                                        <strong>${e.name}</strong><br>
                                        <small>${e.email}</small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        <div class="box encadrant-option" style="cursor: pointer; margin-bottom: 10px; border: 2px dashed #ccc;" data-name="" data-email="" data-image="">
                            <div class="has-text-centered">
                                <strong>Nouvel encadrant</strong><br>
                                <small>Saisir manuellement</small>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Recherche
        const searchInput = modal.querySelector('#encadrant-search');
        const encadrantList = modal.querySelector('#encadrant-list');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            encadrantList.querySelectorAll('.encadrant-option').forEach(option => {
                const name = option.dataset.name.toLowerCase();
                const email = option.dataset.email.toLowerCase();
                if (name.includes(query) || email.includes(query) || query === '') {
                    option.style.display = 'block';
                } else {
                    option.style.display = 'none';
                }
            });
        });
        
        // Sélection
        modal.querySelectorAll('.encadrant-option').forEach(option => {
            option.addEventListener('click', () => {
                const name = option.dataset.name;
                const email = option.dataset.email;
                const imageUrl = option.dataset.image || '/images/photo-etienne-giboud.png';
                
                // Créer l'élément encadrant
                const newTeamMember = document.createElement('div');
                newTeamMember.className = 'team-member is-flex is-align-items-center mb-3';
                newTeamMember.style.position = 'relative';
                newTeamMember.innerHTML = `
                    <img src="${imageUrl}" alt="Encadrant" class="editable-image" style="width:60px; height:60px; border-radius:50%; margin-right:10px; cursor: pointer;">
                    <div>
                        <span class="has-text-weight-semibold editable-text">${name || 'Nom Prénom'}</span><br>
                        <small class="editable-text">${email || 'Encadrant'}</small>
                    </div>
                    <span class="delete-person-button" style="margin-left: 10px; cursor: pointer; color: red; font-weight: bold;">&times;</span>
                `;
                
                if (button && button.parentElement) {
                    button.parentElement.insertBefore(newTeamMember, button);
                } else {
                    teamColumn.appendChild(newTeamMember);
                }
                
                // Rendre les champs éditables
                setTimeout(() => {
                    const newEditableTexts = newTeamMember.querySelectorAll('.editable-text');
                    newEditableTexts.forEach((el, index) => {
                        const uniqueId = `editable-${Date.now()}-${index}`;
                        el.id = uniqueId;
                        tinymce.init({ 
                            selector: `#${uniqueId}`, 
                            inline: true, 
                            plugins: 'link', 
                            toolbar: false,
                            menubar: false,
                            quickbars_selection_toolbar: 'bold italic underline | link'
                        });
                    });
                }, 200);
                
                modal.remove();
                notyf.success('Encadrant ajouté.');
            });
        });
        
        // Fermer le modal
        modal.querySelector('.modal-background, .delete').addEventListener('click', () => {
            modal.remove();
        });
        
    } catch (error) {
        console.error('Error loading encadrants:', error);
        notyf.error('Erreur lors du chargement des encadrants.');
    }
}

/**
 * Ajoute un encadrant avec autocomplétion dans la section Encadrants.
 */
async function addEncadrantCardWithAutocomplete(sectionElement) {
    const grid = sectionElement.querySelector('.people-grid');
    if (!grid) return;
    
    try {
        const response = await fetch('/api/encadrants');
        const encadrants = await response.ok ? await response.json() : [];
        
        // Créer un modal de sélection (même logique que addEncadrantWithAutocomplete)
        const modal = document.createElement('div');
        modal.className = 'modal is-active';
        modal.innerHTML = `
            <div class="modal-background"></div>
            <div class="modal-card">
                <header class="modal-card-head">
                    <p class="modal-card-title">Sélectionner un encadrant</p>
                    <button class="delete" aria-label="close"></button>
                </header>
                <section class="modal-card-body">
                    <div class="field">
                        <label class="label">Rechercher un encadrant</label>
                        <div class="control">
                            <input class="input" type="text" id="encadrant-search" placeholder="Nom ou email...">
                        </div>
                    </div>
                    <div id="encadrant-list" style="max-height: 300px; overflow-y: auto;">
                        ${encadrants.map(e => `
                            <div class="box encadrant-option" style="cursor: pointer; margin-bottom: 10px;" data-name="${e.name}" data-email="${e.email}" data-image="${e.imageUrl || '/images/photo-etienne-giboud.png'}">
                                <div class="is-flex is-align-items-center">
                                    <img src="${e.imageUrl || '/images/photo-etienne-giboud.png'}" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px;">
                                    <div>
                                        <strong>${e.name}</strong><br>
                                        <small>${e.email}</small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        <div class="box encadrant-option" style="cursor: pointer; margin-bottom: 10px; border: 2px dashed #ccc;" data-name="" data-email="" data-image="">
                            <div class="has-text-centered">
                                <strong>Nouvel encadrant</strong><br>
                                <small>Saisir manuellement</small>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Recherche
        const searchInput = modal.querySelector('#encadrant-search');
        const encadrantList = modal.querySelector('#encadrant-list');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            encadrantList.querySelectorAll('.encadrant-option').forEach(option => {
                const name = option.dataset.name.toLowerCase();
                const email = option.dataset.email.toLowerCase();
                if (name.includes(query) || email.includes(query) || query === '') {
                    option.style.display = 'block';
                } else {
                    option.style.display = 'none';
                }
            });
        });
        
        // Sélection
        modal.querySelectorAll('.encadrant-option').forEach(option => {
            option.addEventListener('click', () => {
                const name = option.dataset.name;
                const email = option.dataset.email;
                const imageUrl = option.dataset.image || '/images/photo-etienne-giboud.png';
                
                const newPersonCard = document.createElement('div');
                newPersonCard.className = 'person-card';
                newPersonCard.style.position = 'relative';
                newPersonCard.innerHTML = `
                    <img src="${imageUrl}" alt="Encadrant" class="editable-image" style="cursor: pointer;">
                    <div class="name editable-text">${name || 'Nom Prénom'}</div>
                    <div class="role editable-text">${email || 'email@epf.fr'}</div>
                    <span class="delete-person-button" style="position: absolute; top: 5px; right: 5px; cursor: pointer; color: red; font-weight: bold; background: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center;">&times;</span>
                `;
                
                grid.appendChild(newPersonCard);
                
                // Rendre les champs éditables
                setTimeout(() => {
                    const newEditableTexts = newPersonCard.querySelectorAll('.editable-text');
                    newEditableTexts.forEach((el, index) => {
                        const uniqueId = `editable-${Date.now()}-${index}`;
                        el.id = uniqueId;
                        tinymce.init({ 
                            selector: `#${uniqueId}`, 
                            inline: true, 
                            plugins: 'link', 
                            toolbar: false,
                            menubar: false,
                            quickbars_selection_toolbar: 'bold italic underline | link'
                        });
                    });
                }, 200);
                
                modal.remove();
                notyf.success('Encadrant ajouté.');
            });
        });
        
        // Fermer le modal
        modal.querySelector('.modal-background, .delete').addEventListener('click', () => {
            modal.remove();
        });
        
    } catch (error) {
        console.error('Error loading encadrants:', error);
        notyf.error('Erreur lors du chargement des encadrants.');
    }
}

/**
 * Supprime une carte de personne.
 * @param {HTMLElement} cardElement - L'élément .person-card ou .team-member à supprimer.
 */
function removePerson(cardElement) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette personne ?')) {
        cardElement.remove();
        notyf.success('Personne supprimée.');
    }
}

/**
 * Gère l'ajout d'un nouveau média à la galerie multimédia.
 * @param {HTMLElement} galleryContainer - Le conteneur de la galerie.
 */
function handleAddMedia(galleryContainer) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*,application/pdf';
    fileInput.multiple = true; // Permettre la sélection multiple
    fileInput.style.display = 'none';

    fileInput.onchange = async () => {
        if (fileInput.files.length === 0) return;
        
        const files = Array.from(fileInput.files);
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        
        // Vérifier la taille de chaque fichier
        const oversizedFiles = files.filter(f => f.size > MAX_SIZE);
        if (oversizedFiles.length > 0) {
            notyf.error(`Certains fichiers dépassent 50MB : ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }
        
        // Chercher la grille multimedia-grid ou carousel-grid
        const grid = galleryContainer.querySelector('.multimedia-grid') || 
                    galleryContainer.querySelector('.carousel-grid');
        if (!grid) {
            notyf.error('Galerie multimédia introuvable.');
            return;
        }
        
        // Téléverser tous les fichiers
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error('Le téléversement a échoué.');

                const result = await response.json();
                const mediaUrl = result.location;
                
                const thumbnail = createMediaThumbnail(file.type, mediaUrl);
                grid.appendChild(thumbnail);

                notyf.success(`Fichier "${file.name}" ajouté avec succès.`);
            } catch (error) {
                notyf.error(`Erreur lors du téléversement de "${file.name}": ${error.message}`);
            }
        }
        
        if (files.length > 1) {
            notyf.success(`${files.length} fichiers ajoutés avec succès.`);
        }
        
        document.body.removeChild(fileInput);
    };

    document.body.appendChild(fileInput);
    fileInput.click();
}

/**
 * Crée une vignette pour un média dans la galerie.
 * @param {string} mediaType - Le type MIME du média.
 * @param {string} mediaUrl - L'URL du média.
 * @returns {HTMLElement} - L'élément de la vignette.
 */
function createMediaThumbnail(mediaType, mediaUrl) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'media-thumbnail';
    thumbnail.style.position = 'relative';
    thumbnail.style.display = 'inline-block';

    let mediaElement;
    if (mediaType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = mediaUrl;
        img.alt = 'Média';
        img.className = 'carousel-item';
        img.style.cssText = 'width: 200px; height: 200px; object-fit: cover; border-radius: 12px; cursor: pointer;';
        mediaElement = img;
    } else if (mediaType.startsWith('video/')) {
        const video = document.createElement('video');
        video.className = 'carousel-item';
        video.controls = true;
        video.style.cssText = 'width: 200px; height: 200px; border-radius: 12px; cursor: pointer;';
        const source = document.createElement('source');
        source.src = mediaUrl;
        source.type = mediaType;
        video.appendChild(source);
        mediaElement = video;
    } else if (mediaType === 'application/pdf') {
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.target = '_blank';
        link.className = 'pdf-item';
        link.innerHTML = `
            <div class="pdf-preview">
                <span class="pdf-icon">📄</span>
                <p>Document PDF</p>
            </div>
        `;
        mediaElement = link;
    } else {
        const div = document.createElement('div');
        div.className = 'pdf-item';
        div.innerHTML = `
            <div class="pdf-preview">
                <span class="pdf-icon">📁</span>
                <p>Document</p>
            </div>
        `;
        mediaElement = div;
    }

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-media-button';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; cursor: pointer; color: red; font-weight: bold; background: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; z-index: 10;';

    thumbnail.appendChild(mediaElement);
    thumbnail.appendChild(deleteBtn);

    return thumbnail;
}

/**
 * Supprime une vignette de média de la galerie.
 * @param {HTMLElement} thumbnailElement - L'élément de la vignette à supprimer.
 */
function removeMedia(thumbnailElement) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) {
        thumbnailElement.remove();
        notyf.success('Média supprimé.');
    }
}

/**
 * Ouvre le modal vidéo et y charge la vidéo spécifiée.
 * @param {string} videoUrl - L'URL de la vidéo à lire.
 */
function openVideoModal(videoUrl) {
    const modal = document.getElementById('video-modal');
    const videoPlayer = document.getElementById('modal-video-player');

    videoPlayer.src = videoUrl;
    modal.classList.add('is-active');
    videoPlayer.play();
}

/**
 * Gère l'ajout d'un fichier dans la colonne fichiers.
 * @param {HTMLElement} button - Le bouton "Ajouter un dossier"
 */
function handleFileUpload(button) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar'; // Types de fichiers acceptés
    fileInput.style.display = 'none';

    fileInput.onchange = async () => {
        if (fileInput.files.length === 0) return;

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Le téléversement a échoué.');

            const result = await response.json();
            const fileUrl = result.location;

            // Trouver la colonne fichiers
            const teamColumn = button.closest('.team-column');
            if (!teamColumn) return;

            // Créer un nouvel élément PDF
            const pdfItem = document.createElement('a');
            pdfItem.href = fileUrl;
            pdfItem.target = '_blank';
            pdfItem.className = 'pdf-item';
            
            const pdfPreview = document.createElement('div');
            pdfPreview.className = 'pdf-preview-1';
            
            const pdfIcon = document.createElement('span');
            pdfIcon.className = 'pdf-icon-1';
            pdfIcon.textContent = '📁';
            
            const pdfText = document.createElement('p');
            pdfText.textContent = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
            
            pdfPreview.appendChild(pdfIcon);
            pdfPreview.appendChild(pdfText);
            pdfItem.appendChild(pdfPreview);
            
            // Ajouter un bouton de suppression
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-person-button';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '5px';
            deleteBtn.style.right = '5px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.color = 'red';
            deleteBtn.style.fontWeight = 'bold';
            deleteBtn.style.background = 'white';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '25px';
            deleteBtn.style.height = '25px';
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Supprimer ce fichier ?')) {
                    pdfItem.remove();
                }
            });
            
            pdfItem.style.position = 'relative';
            pdfItem.appendChild(deleteBtn);
            
            // Insérer avant le bouton "Ajouter"
            teamColumn.insertBefore(pdfItem, button);

            notyf.success('Fichier ajouté avec succès.');

        } catch (error) {
            notyf.error('Erreur: ' + error.message);
        } finally {
            document.body.removeChild(fileInput);
        }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
}

/**
 * Enregistre le projet actuel comme brouillon.
 * Extrait le contenu éditable, nettoie le HTML (retire les classes d'édition et boutons),
 * extrait le titre depuis le bandeau, et envoie les données à l'API.
 * @param {boolean} redirectOnSuccess - Si true, redirige vers la page des brouillons après la sauvegarde (défaut: true)
 * @returns {Promise<string|null>} - Le nom du fichier sauvegardé en cas de succès, sinon null
 */
async function saveDraft(redirectOnSuccess = true) {
    // Détruire les instances de l'éditeur pour nettoyer le HTML
    tinymce.remove('.editable-text');

    const editorContainer = document.getElementById('visual-editor-container');
    const contentClone = editorContainer.cloneNode(true);

    // Nettoyage du HTML pour la sauvegarde
    // Retirer les classes d'édition
    contentClone.querySelectorAll('.editable-text, .editable-image, .editable-media').forEach(el => {
        el.classList.remove('editable-text', 'editable-image', 'editable-media');
    });
    
    // Retirer les boutons d'action
    contentClone.querySelectorAll('.add-person-button, .delete-person-button, .add-media-button, .delete-media-button').forEach(el => {
        el.remove();
    });
    
    // Nettoyer les styles position: relative ajoutés pour les boutons
    contentClone.querySelectorAll('[style*="position: relative"]').forEach(el => {
        const style = el.getAttribute('style');
        if (style && style.includes('position: relative')) {
            const newStyle = style.replace(/position:\s*relative[;]?/g, '').trim();
            if (newStyle) {
                el.setAttribute('style', newStyle);
            } else {
                el.removeAttribute('style');
            }
        }
    });

    // Extraire uniquement le contenu des sections (pas header/footer si présents)
    // Le contenu devrait déjà être dans main ou directement dans le container
    let content = contentClone.innerHTML;
    
    // Si le contenu contient des balises header/footer, les retirer
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const header = tempDiv.querySelector('header, #bandeau, .bandeau');
    const footer = tempDiv.querySelector('footer');
    if (header) header.remove();
    if (footer) footer.remove();
    content = tempDiv.innerHTML;

    // Extraire le titre depuis le bandeau (zone éditable WYSIWYG)
    const titleElement = editorContainer.querySelector('.bandeau-texte.editable-text, .bandeau-texte');
    const titre = titleElement ? titleElement.innerText.trim() : 'Sans Titre';

    if (!titre || titre === 'Titre de votre projet' || titre === 'Titre du Projet' || titre === 'Sans Titre') {
        notyf.error("Veuillez donner un titre à votre projet en éditant le bandeau.");
        return null;
    }

    // Récupérer les tags sélectionnés depuis les checkboxes
    const tags = getSelectedTags();
    
    // Valider que seuls les tags valides sont sélectionnés
    const validTags = await fetch('/api/tags').then(r => r.ok ? r.json() : []);
    const filteredTags = tags.filter(tag => validTags.includes(tag));
    
    if (filteredTags.length !== tags.length) {
        notyf.warning('Certains tags invalides ont été ignorés.');
    }

    const data = {
        currentFile: currentFile,
        titre: titre,
        tags: filteredTags, // Utiliser uniquement les tags valides
        content: content
    };

    try {
        const response = await fetch('/api/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error("L'enregistrement a échoué");

        const result = await response.json();
        currentFile = result.file;
        notyf.success(`Brouillon "${titre}" enregistré !`);

        if (redirectOnSuccess) {
            setTimeout(() => {
                window.location.href = 'brouillons.html';
            }, 1500);
        }

        return result.file; // Retourne le nom du fichier

    } catch (error) {
        notyf.error('Erreur lors de la sauvegarde: ' + error.message);
        return null;
    }
}

/**
 * Sauvegarde le brouillon actuel puis le soumet pour relecture.
 * Appelle d'abord saveDraft() pour s'assurer que tout le contenu est à jour,
 * puis envoie une requête pour changer le statut à 'pending_review'.
 * @returns {Promise<void>}
 * @throws {Error} Si la sauvegarde ou la soumission échoue
 */
async function submitForReview() {
    // First, save the draft to ensure all content is up-to-date.
    // The saveDraft function already handles content extraction and validation.
    // We need to modify it slightly to prevent redirection.

    // Step 1: Save the content without redirecting.
    const savedFile = await saveDraft(false); // Pass false to prevent redirection

    if (!savedFile) {
        notyf.error("La soumission a échoué car la sauvegarde a échoué.");
        return;
    }

    // Step 2: Call the submit API.
    try {
        const response = await fetch('/api/submit_for_review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: savedFile })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "La soumission a échoué.");
        }

        notyf.success("Projet soumis pour relecture avec succès ! Redirection...");

        // Redirect after successful submission
        setTimeout(() => {
            window.location.href = 'brouillons.html';
        }, 1500);

    } catch (error) {
        notyf.error('Erreur lors de la soumission: ' + error.message);
    }
}
