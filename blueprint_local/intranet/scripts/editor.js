const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
  dismissible: true
});

let currentFile = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('file');

    if (fileName) {
        loadDraft(fileName);
    } else {
        loadNewProject();
    }
});

/**
 * Charge le template pour un nouveau projet.
 */
async function loadNewProject() {
    try {
        const response = await fetch('/api/templates/project');
        if (!response.ok) throw new Error('Le chargement du modèle a échoué');
        const templateHtml = await response.text();

        const container = document.getElementById('visual-editor-container');
        let preparedHtml = prepareTemplateForEditing(templateHtml);
        container.innerHTML = preparedHtml;
        makeContentEditable(container);

        currentFile = null;
        initializeEditor();
        notyf.success('Nouveau projet initialisé. Vous pouvez commencer à éditer.');
    } catch (error) {
        notyf.error('Erreur lors du chargement du nouveau projet: ' + error.message);
    }
}

/**
 * Charge un brouillon existant.
 * @param {string} fileName - Le nom du fichier du brouillon.
 */
async function loadDraft(fileName) {
    try {
        const response = await fetch(`/api/project?file=${fileName}&type=draft`);
        if (!response.ok) throw new Error('Le chargement du brouillon a échoué');
        const project = await response.json();

        const container = document.getElementById('visual-editor-container');
        container.innerHTML = project.content;

        // Ensure the media gallery exists, even in older drafts
        if (!container.querySelector('.multimedia-section')) {
            const multimediaSection = document.createElement('section');
            multimediaSection.className = 'highlight-section multimedia-section';
            multimediaSection.innerHTML = `
                <h2 class="etudiants-title">Multimédias</h2>
                <div class="multimedia-gallery-container">
                    <div class="multimedia-grid"></div>
                    <button class="button is-primary add-media-button">Ajouter un média</button>
                </div>
            `;
            container.appendChild(multimediaSection);
        }

        makeContentEditable(container);

        // Remplir le champ des tags
        const tags = project.frontMatter.tags || [];
        document.getElementById('project-tags').value = tags.join(', ');

        currentFile = fileName;
        initializeEditor();
        notyf.success(`Brouillon "${fileName}" chargé.`);
    } catch (error) {
        notyf.error('Erreur lors du chargement du brouillon: ' + error.message);
    }
}

/**
 * Prépare le HTML du template en ajoutant des classes pour l'édition.
 * @param {string} html - Le contenu HTML du template.
 * @returns {string} - Le HTML modifié avec les classes d'édition.
 */
function prepareTemplateForEditing(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Ajoute des textes et images génériques comme demandé
    doc.querySelector('.hero-section h1').textContent = 'Titre de votre projet';
    doc.querySelector('.intro-text-block p:first-of-type').textContent = 'Cliquez ici pour écrire un résumé de votre projet...';
    doc.querySelector('.intro-image-container img').src = 'https://via.placeholder.com/350x200?text=Cliquez+pour+changer';
    doc.querySelector('.objectif-block').innerHTML = '<p>Cliquez ici pour détailler les objectifs...</p>';
    doc.querySelector('.resultats-list').innerHTML = '<p>Cliquez ici pour décrire les résultats obtenus...</p>';
    doc.querySelector('.ressenti-text').innerHTML = '<p>Cliquez ici pour partager le ressenti de l\'équipe...</p>';

    // --- Initialiser la section multimédia ---
    const multimediaSection = doc.querySelector('.multimedia-section');
    if (multimediaSection) {
        // On reconstruit le contenu en s'assurant de préserver .multimedia-content
        multimediaSection.innerHTML = `
            <h2 class="etudiants-title">Multimédias</h2>
            <div class="multimedia-gallery-container">
                <div class="multimedia-grid">
                    <!-- Les vignettes des médias seront ajoutées ici dynamiquement -->
                </div>
                <button class="button is-primary add-media-button">Ajouter un média</button>
            </div>
            <div class="multimedia-content">
                <p>Cliquez ici pour décrire les multimédias...</p>
            </div>
        `;
    }

    return doc.body.innerHTML;
}

/**
 * Ajoute les classes et les contrôles nécessaires pour rendre le contenu éditable.
 * @param {HTMLElement} container - Le conteneur dont le contenu doit être rendu éditable.
 */
function makeContentEditable(container) {
    // --- Ajout des classes pour l'édition de texte ---
    container.querySelector('.hero-section h1').classList.add('editable-text', 'project-title');
    container.querySelector('.intro-text-block').classList.add('editable-text');
    container.querySelector('.objectif-block').classList.add('editable-text');
    container.querySelector('.resultats-list').classList.add('editable-text');
    container.querySelector('.ressenti-text').classList.add('editable-text');
    container.querySelector('.multimedia-content').classList.add('editable-text');
    container.querySelectorAll('.person-card .name').forEach(el => el.classList.add('editable-text'));
    container.querySelectorAll('.person-card .role, .person-card .email').forEach(el => el.classList.add('editable-text'));

    // --- Zone d'accueil (image ou vidéo) ---
    const mainMediaContainer = container.querySelector('.intro-image-container');
    if (mainMediaContainer) {
        mainMediaContainer.classList.add('editable-media');
        mainMediaContainer.title = "Cliquez pour changer l'image ou la vidéo";
    }

    // --- Autres images éditables ---
    container.querySelectorAll('.person-card img, .team-member-sm img').forEach(el => {
        el.classList.add('editable-image');
        el.title = "Cliquez pour changer l'image";
    });

    // --- Ajout des contrôles pour les participants ---
    container.querySelectorAll('.people-section').forEach(section => {
        // Ajouter le bouton "Ajouter" seulement s'il n'existe pas déjà
        if (!section.querySelector('.add-person-button')) {
            const addButton = document.createElement('button');
            addButton.className = 'button is-primary is-small add-person-button';
            addButton.textContent = 'Ajouter une personne';
            section.appendChild(addButton);
        }

        section.querySelectorAll('.person-card').forEach(card => {
            // Ajouter le bouton "Supprimer" seulement s'il n'existe pas déjà
            if (!card.querySelector('.delete-person-button')) {
                const deleteButton = document.createElement('span');
                deleteButton.className = 'delete-person-button';
                deleteButton.innerHTML = '&times;';
                card.style.position = 'relative';
                card.appendChild(deleteButton);
            }
        });
    });
}

/**
 * Initialise les fonctionnalités de l'éditeur.
 */
function initializeEditor() {
    tinymce.init({
        selector: '.editable-text',
        inline: true,
        plugins: 'link image media table code fullscreen autoresize quickbars',
        toolbar: false, // La barre d'outils principale est désactivée
        menubar: false, // Le menu est désactivé
        quickbars_selection_toolbar: 'bold italic underline | bullist numlist | blockquote | quicklink',
        quickbars_insert_toolbar: 'image media table',
        automatic_uploads: true,
        images_upload_url: '/api/upload',
        file_picker_types: 'image',
        document_base_url: '/',
        setup: function(editor) {
            editor.on('blur', async () => {
                // Optionnel : déclencher une sauvegarde automatique quand l'utilisateur quitte une zone d'édition
                console.log('Content changed, ready for auto-save.');
                // await autoSave();
            });
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
            addPerson(target.closest('.people-section'));
        }
        // Gérer le bouton pour supprimer une personne
        else if (target.classList.contains('delete-person-button')) {
            removePerson(target.closest('.person-card'));
        }
        // Gérer l'ajout de média dans la galerie
        else if (target.classList.contains('add-media-button')) {
            handleAddMedia(target.closest('.multimedia-gallery-container'));
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
 * @param {HTMLElement} mediaContainer - Le conteneur du média à mettre à jour.
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
            mediaContainer.innerHTML = '';
            let newMediaElement;

            if (file.type.startsWith('image/')) {
                newMediaElement = document.createElement('img');
                newMediaElement.src = mediaUrl;
                newMediaElement.alt = "Média du projet";
            } else if (file.type.startsWith('video/')) {
                newMediaElement = document.createElement('video');
                newMediaElement.src = mediaUrl;
                newMediaElement.controls = true;
                newMediaElement.autoplay = true;
                newMediaElement.muted = true; // Important pour l'autoplay dans de nombreux navigateurs
                newMediaElement.loop = true;
            }

            if (newMediaElement) {
                mediaContainer.appendChild(newMediaElement);
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
 * @param {HTMLElement} sectionElement - La section .people-section où ajouter la personne.
 */
function addPerson(sectionElement) {
    const grid = sectionElement.querySelector('.people-grid');
    if (!grid) return;

    const newPersonCard = document.createElement('div');
    newPersonCard.className = 'person-card';
    newPersonCard.style.position = 'relative';
    newPersonCard.innerHTML = `
        <img src="https://via.placeholder.com/130" alt="Nouvelle personne" class="editable-image" title="Cliquez pour changer l'image">
        <span class="name editable-text">Nom Prénom</span>
        <span class="email editable-text">email@epf.fr</span>
        <span class="delete-person-button">&times;</span>
    `;

    grid.appendChild(newPersonCard);

    // Rendre les nouveaux champs éditables par TinyMCE
    // Il est plus efficace de cibler uniquement les nouveaux éléments que de tout réinitialiser
    tinymce.init({ selector: `#${newPersonCard.id} .editable-text`, inline: true, plugins: 'link', toolbar: 'bold italic underline | link' });

    notyf.success('Nouvelle personne ajoutée.');
}

/**
 * Supprime une carte de personne.
 * @param {HTMLElement} cardElement - L'élément .person-card à supprimer.
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
            const mediaUrl = result.location;

            const grid = galleryContainer.querySelector('.multimedia-grid');
            const thumbnail = createMediaThumbnail(file.type, mediaUrl);
            grid.appendChild(thumbnail);

            notyf.success('Média ajouté à la galerie.');

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
 * Crée une vignette pour un média dans la galerie.
 * @param {string} mediaType - Le type MIME du média.
 * @param {string} mediaUrl - L'URL du média.
 * @returns {HTMLElement} - L'élément de la vignette.
 */
function createMediaThumbnail(mediaType, mediaUrl) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'media-thumbnail';
    thumbnail.style.position = 'relative';

    let mediaElement;
    if (mediaType.startsWith('image/')) {
        mediaElement = `<img src="${mediaUrl}" alt="Média">`;
    } else if (mediaType.startsWith('video/')) {
        // Pour les vidéos, on affiche un caractère "play" et on attache un événement pour ouvrir le modal
        mediaElement = `<div class="video-thumbnail" data-video-url="${mediaUrl}" style="cursor: pointer; font-size: 50px; text-align: center; line-height: 100px;">▶</div>`;
    } else if (mediaType === 'application/pdf') {
        mediaElement = `<a href="${mediaUrl}" target="_blank"><img src="/images/pdf-icon.png" alt="PDF Icon" class="pdf-icon"></a>`;
    } else {
        mediaElement = `<p>Type de média non supporté</p>`;
    }

    thumbnail.innerHTML = `
        ${mediaElement}
        <span class="delete-media-button">&times;</span>
    `;

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
 * Enregistre le projet actuel comme brouillon.
 * @param {boolean} redirectOnSuccess - Si true, redirige vers la page des brouillons après la sauvegarde.
 * @returns {string|null} - Le nom du fichier sauvegardé en cas de succès, sinon null.
 */
async function saveDraft(redirectOnSuccess = true) {
    // Détruire les instances de l'éditeur pour nettoyer le HTML
    tinymce.remove('.editable-text');

    const editorContainer = document.getElementById('visual-editor-container');
    const contentClone = editorContainer.cloneNode(true);

    // Nettoyage du HTML pour la sauvegarde
    contentClone.querySelectorAll('.editable-text, .editable-image, .add-person-button, .delete-person-button').forEach(el => {
        el.classList.remove('editable-text', 'editable-image');
        if (el.matches('.add-person-button, .delete-person-button')) el.remove();
    });
    contentClone.querySelectorAll('[style*="position: relative"]').forEach(el => el.style.position = '');

    const content = contentClone.innerHTML;
    const titleElement = editorContainer.querySelector('.project-title');
    const titre = titleElement ? titleElement.innerText.trim() : 'Sans Titre';

    if (!titre || titre === 'Titre de votre projet') {
        notyf.error("Veuillez donner un titre à votre projet.");
        return null;
    }

    const tagsInput = document.getElementById('project-tags').value;
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean);

    const data = {
        currentFile: currentFile,
        titre: titre,
        tags: tags,
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
 * Saves the current draft and then submits it for review.
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
