---
titre: Projet test 0
tags:
  - Data
  - Informatique
  - Web
  - epf
  - test
status: rejected
dateCreation: '2025-12-03T21:16:19.425Z'
dateModification: '2025-12-03T22:06:04.888Z'
rejectedAt: '2025-12-03T22:06:04.888Z'
---


<!-- MENU MOBILE -->
<input type="checkbox" id="menu-toggle">
<label for="menu-toggle" class="menu-btn">☰ Menu</label>

<nav class="mobile-sidebar">
    <ul>
        <li><a href="#Accueil">Accueil</a></li>
        <li><a href="#Synthese">Objectifs - Résultats - Ressenti</a></li>
        <li><a href="#Multimedia">Multimédias</a></li>
        <li><a href="#Encadrants">Encadrants</a></li>
        <li><a href="#Étudiants">Étudiants</a></li>
    </ul>
</nav>


<!-- Bandeau -->


<!-- Filtres -->
<nav class="category-filters">
    <a href="#Accueil" class="active">Accueil</a>
    <a href="#Synthese">Objectifs - Résultats - Ressenti</a>
    <a href="#Étudiants">Étudiants</a>
    <a href="#Encadrants">Encadrants</a>
    <a href="#Multimédias">Multimédias</a>
</nav>

<main class="section">

<!-- Accueil -->
<section id="Accueil">
    <div class="intro-grid container columns is-vcentered is-variable is-8">
    <!-- Vidéo d'introduction -->
    <div class="column video-column">
      <div class="video-container" title="Cliquez pour changer la vidéo ou l'image"><video src="/public/uploads/1764796517703-Enregistrement 2025-10-21 182357.mp4?t=1764796526825" controls="" style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; object-fit: cover;"></video></div>
    </div>


        <!-- Texte -->
        <div class="column intro-text-block">
            <p class="" id="editable-1764799552969-1">Cliquez ici pour écrire un résumé de votre projet...</p>

            <div class="team-summary mt-4" style="display: flex; gap: 40px; flex-wrap: wrap;">

    <!-- Colonne Étudiants -->
    <div class="team-column">
        <h3 style="margin-bottom: 15px; font-weight: 600;">Étudiants</h3>
        <div class="team-member is-flex is-align-items-center mb-3">
            <img src="/images/photo-test-etudiant.png" alt="Étudiant" class="" style="width:60px; height:60px; border-radius:50%; margin-right:10px; cursor: pointer;" title="Cliquez pour changer l'image">
            <div>
                <span class="has-text-weight-semibold" id="editable-1764796488520-2">Nom Prénom</span><br>
                <small class="" id="editable-1764796488523-3">Étudiant</small>
            </div>
            
        </div>
        
    </div>

    <!-- Colonne Encadrants -->
    <div class="team-column">
        <h3 style="margin-bottom: 15px; font-weight: 600;">Encadrants</h3>
        <div class="team-member is-flex is-align-items-center mb-3">
            <img src="/images/photo-etienne-giboud.png" alt="Encadrant" class="" style="width:60px; height:60px; border-radius:50%; margin-right:10px; cursor: pointer;" title="Cliquez pour changer l'image">
            <div>
                <span class="has-text-weight-semibold" id="editable-1764796488524-4">Nom Prénom</span><br>
                <small class="" id="editable-1764796488525-5">Encadrant</small>
            </div>
            
        </div>
        
    </div>

    <!-- Colonne Fichiers -->
    <div class="team-column">
        <h3 style="margin-bottom: 15px; font-weight: 600;">Fichiers</h3>
        <a href="#" target="_blank" class="pdf-item">
            <div class="pdf-preview-1">
                <span class="pdf-icon-1">📁</span>
                <p>Télécharger la documentation</p>
            </div>
        </a>
        <a href="/public/uploads/1764796530646-Module 2 _ Vision par Ordinateur et Applications Industrielles 4.0.pdf" target="_blank" class="pdf-item"><div class="pdf-preview-1"><span class="pdf-icon-1">📁</span><p>Module 2 _ Vision pa...</p></div></a>
    </div>

</div>

        </div>

    </div>
</section>


<!-- tableau  -->
<section id="Synthese" class="container">

    <h2 class="title is-3 has-text-centered">Objectif – Résultat – Ressenti</h2>
    <div style="overflow-x: auto;">
    <table class="table is-striped is-fullwidth synthese-table">
        <thead>
            <tr>
                <th style="text-align:center;">Profil</th>
                <th style="text-align:center;">Objectif</th>
                <th style="text-align:center;">Résultat</th>
                <th style="text-align:center;">Ressenti</th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <th style="text-align:center;">Encadrant</th>
                <td class="editable-cell" contenteditable="true" style="min-height: 20px; outline: rgb(204, 204, 204) dashed 1px; outline-offset: 2px; padding: 8px;">Cliquez ici...</td>
                <td class="editable-cell" contenteditable="true" style="min-height: 20px; outline: rgb(204, 204, 204) dashed 1px; outline-offset: 2px; padding: 8px;">Cliquez ici...</td>
                <td class="editable-cell" contenteditable="true" style="min-height: 20px; outline: rgb(204, 204, 204) dashed 1px; outline-offset: 2px; padding: 8px;">Cliquez ici...</td>
            </tr>

            <tr>
                <th style="text-align:center;">Étudiant</th>
                <td class="editable-cell" contenteditable="true" style="min-height: 20px; outline: rgb(204, 204, 204) dashed 1px; outline-offset: 2px; padding: 8px;">Cliquez ici...</td>
                <td class="editable-cell" contenteditable="true" style="min-height: 20px; outline: rgb(204, 204, 204) dashed 1px; outline-offset: 2px; padding: 8px;">Cliquez ici...</td>
                <td class="editable-cell" contenteditable="true" style="min-height: 20px; outline: rgb(204, 204, 204) dashed 1px; outline-offset: 2px; padding: 8px;">Cliquez ici...</td>
            </tr>
        </tbody>

    </table>
</div>
</section>


<!-- Étudiants -->
<section id="Étudiants" class="people-section">
    <h2 class="people-title">Étudiants</h2>
    <div class="people-grid">
        <div class="person-card">
            <img src="/images/photo-test-etudiant.png" alt="Étudiant" class="" style="cursor: pointer;" title="Cliquez pour changer l'image">
            <div class="name" id="editable-1764799552972-2"><p>Nom Prénom</p></div>
            
        </div>
    </div>
    <div style="text-align: center; margin-top: 20px;">
        
    </div>
<div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div></section>

<!-- Encadrants -->
<section id="Encadrants" class="people-section-E">
    <h2 style="text-align:center;">Encadrants</h2>
    <div class="people-grid">
        <div class="person-card">
            <img src="/images/photo-etienne-giboud.png" alt="Encadrant" class="" style="cursor: pointer;" title="Cliquez pour changer l'image">
            <div class="name" id="editable-1764799552979-3"><p>Nom Prénom</p></div>
            <div class="role" id="editable-1764799552980-4"><p>email@epf.fr</p></div>
            
        </div>
    </div>
    <div style="text-align: center; margin-top: 20px;">
        
    </div>
<div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div><div style="text-align: center; margin-top: 20px;"></div></section>

<!-- Multimédias -->
<section id="multimedia" class="section multimedia-section">
  <div class="container">
    <h2 class="title has-text-centered">Galerie Photos &amp; Vidéos</h2>

    <div class="carousel-wrapper">
        <div class="scroll-area">
            <div class="carousel-grid multimedia-grid">
                <!-- Les médias seront ajoutés dynamiquement ici -->
            <div class="media-thumbnail" style="display: inline-block;"><img src="/public/uploads/1764796559243-OIP (6).jpg" alt="Média" class="carousel-item" style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; cursor: pointer;"></div><div class="media-thumbnail" style="display: inline-block;"><img src="/public/uploads/1764796559298-OIP (8).jpg" alt="Média" class="carousel-item" style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; cursor: pointer;"></div><div class="media-thumbnail" style="display: inline-block;"><img src="/public/uploads/1764796559344-OIP (9).jpg" alt="Média" class="carousel-item" style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; cursor: pointer;"></div><div class="media-thumbnail" style="display: inline-block;"><img src="/public/uploads/1764796559394-OIP.jpg" alt="Média" class="carousel-item" style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; cursor: pointer;"></div><div class="media-thumbnail" style="display: inline-block;"><img src="/public/uploads/1764796559441-tÃ©lÃ©charger.jpg" alt="Média" class="carousel-item" style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; cursor: pointer;"></div></div>
        </div>
    </div>
    <div style="text-align: center; margin-top: 20px;">
        
    </div>
  </div>
</section>

<!-- Lightbox personnalisé -->
<div id="lightbox" class="lightbox">
    <span class="close">×</span>
    <!-- Image -->
    <img class="lightbox-content" id="lightbox-img" style="display:none;">
    <!-- Vidéo -->
    <video class="lightbox-video" id="lightbox-video" controls="" style="display:none; max-width:85%; max-height:80%; border-radius:12px;"></video>
    <!-- Navigation -->
    <div class="lightbox-prev">❮</div>
    <div class="lightbox-next">❯</div>
</div>

</main>

<!-- ======================= -->
<!--         FOOTER          -->
<!-- ======================= -->


  <!-- Scripts -->
  <script src="/scripts/lightbox.js"></script>
  <script src="/scripts/mobile-menu.js"></script>



