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
    container.querySelectorAll('.person-card .name').forEach(el => el.classList.add('editable-text'));
    container.querySelectorAll('.person-card .role').forEach(el => el.classList.add('editable-text'));

    // --- Ajout des classes pour l'édition d'images ---
    const mainImage = container.querySelector('.intro-image-container img');
    if (mainImage) mainImage.classList.add('editable-image');
    container.querySelectorAll('.person-card img').forEach(el => el.classList.add('editable-image'));

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

    // --- Gestionnaire pour le changement d'image ---
    document.getElementById('visual-editor-container').addEventListener('click', function(event) {
        if (event.target.classList.contains('editable-image')) {
            handleImageUpload(event.target);
        }
        if (event.target.classList.contains('add-person-button')) {
            addPerson(event.target.closest('.people-section'));
        }
        if (event.target.classList.contains('delete-person-button')) {
            removePerson(event.target.closest('.person-card'));
        }
    });
}

/**
 * Gère le processus de téléversement d'une nouvelle image.
 * @param {HTMLImageElement} imageElement - L'élément <img> à mettre à jour.
 */
function handleImageUpload(imageElement) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async () => {
        if (fileInput.files.length === 0) {
            return; // Pas de fichier sélectionné
        }
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Le téléversement a échoué.');
            }

            const result = await response.json();
            imageElement.src = result.location;
            notyf.success('Image mise à jour avec succès.');

        } catch (error) {
            notyf.error('Erreur: ' + error.message);
        } finally {
            // Nettoyer en supprimant l'input de fichier
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
        <img src="https://via.placeholder.com/130" alt="Nouvelle personne" class="editable-image">
        <span class="name editable-text">Nom Prénom</span>
        <span class="role editable-text">Rôle ou e-mail</span>
        <span class="delete-person-button">&times;</span>
    `;

    grid.appendChild(newPersonCard);

    // Réinitialiser TinyMCE pour inclure les nouveaux champs éditables
    tinymce.remove('.editable-text');
    initializeEditor(); // Ceci va réappliquer TinyMCE à tous les .editable-text, y compris les nouveaux

    notyf.success('Nouvelle personne ajoutée. Vous pouvez maintenant éditer les informations.');
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
 * Enregistre le projet actuel comme brouillon.
 */
async function saveDraft() {
    // Détruire les instances de l'éditeur pour nettoyer le HTML
    tinymce.remove('.editable-text');

    const editorContainer = document.getElementById('visual-editor-container');
    // Cloner pour éviter de modifier le DOM en direct avant d'avoir fini
    const contentClone = editorContainer.cloneNode(true);

    // Nettoyage complet du HTML pour la sauvegarde
    contentClone.querySelectorAll('.editable-text').forEach(el => el.classList.remove('editable-text'));
    contentClone.querySelectorAll('.editable-image').forEach(el => el.classList.remove('editable-image'));
    contentClone.querySelectorAll('.add-person-button').forEach(el => el.remove());
    contentClone.querySelectorAll('.delete-person-button').forEach(el => el.remove());
    contentClone.querySelectorAll('[style*="position: relative"]').forEach(el => el.style.position = '');


    const content = contentClone.innerHTML;

    const titleElement = editorContainer.querySelector('.project-title');
    const titre = titleElement ? titleElement.innerText.trim() : 'Sans Titre';

    if (!titre || titre === 'Titre de votre projet') {
        notyf.error("Veuillez donner un titre à votre projet.");
        return;
    }

    // Récupérer et parser les tags
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
        notyf.success(`Brouillon "${titre}" enregistré ! Redirection...`);

        setTimeout(() => {
            window.location.href = 'brouillons.html';
        }, 1500);

    } catch (error) {
        notyf.error('Erreur lors de la sauvegarde: ' + error.message);
    }
}
