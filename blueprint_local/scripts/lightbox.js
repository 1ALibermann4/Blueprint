// Lightbox pour les médias
document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    let currentIndex = 0;
    let carouselItems = [];

    // Fonction pour obtenir tous les éléments carousel (images et vidéos uniquement)
    function getCarouselItems() {
        const allItems = document.querySelectorAll('.carousel-item');
        return Array.from(allItems).filter(item => {
            // Exclure les PDFs et autres éléments non-média
            return !item.closest('.pdf-item') && 
                   !item.closest('a.pdf-item') &&
                   (item.tagName.toLowerCase() === 'img' || item.tagName.toLowerCase() === 'video');
        });
    }

    // Fonction pour ouvrir le lightbox avec un élément spécifique
    function openLightbox(item) {
        carouselItems = getCarouselItems();
        currentIndex = carouselItems.indexOf(item);
        if (currentIndex === -1) currentIndex = 0;
        
        lightbox.style.display = 'flex';

        // Masquer tout
        if (lightboxImg) lightboxImg.style.display = 'none';
        if (lightboxVideo) {
            lightboxVideo.style.display = 'none';
            lightboxVideo.pause();
            lightboxVideo.currentTime = 0;
        }

        if (item.tagName.toLowerCase() === 'img') {
            if (lightboxImg) {
                lightboxImg.src = item.src;
                lightboxImg.style.display = 'block';
            }
        } else if (item.tagName.toLowerCase() === 'video') {
            if (lightboxVideo) {
                const source = item.querySelector('source');
                if (source) {
                    lightboxVideo.src = source.src;
                } else {
                    lightboxVideo.src = item.src;
                }
                lightboxVideo.style.display = 'block';
                lightboxVideo.play();
            }
        }
    }

    // Utiliser la délégation d'événements pour gérer les éléments ajoutés dynamiquement
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.carousel-item');
        if (!item) return;
        
        // Ignorer les PDFs
        if (item.closest('.pdf-item') || item.closest('a.pdf-item')) {
            return;
        }
        
        // Vérifier que c'est une image ou vidéo
        if (item.tagName.toLowerCase() === 'img' || item.tagName.toLowerCase() === 'video') {
            e.preventDefault();
            openLightbox(item);
        }
    });

    // Fermer
    const closeBtn = lightbox.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            lightbox.style.display = 'none';
            if (lightboxVideo) lightboxVideo.pause();
        });
    }

    // Navigation (en sautant les PDFs)
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');
    
    function navigateLightbox(direction) {
        carouselItems = getCarouselItems();
        if (carouselItems.length === 0) return;
        
        currentIndex = (currentIndex + direction + carouselItems.length) % carouselItems.length;
        openLightbox(carouselItems[currentIndex]);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            navigateLightbox(-1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            navigateLightbox(1);
        });
    }
    
    // Fermer avec la touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.style.display === 'flex') {
            lightbox.style.display = 'none';
            if (lightboxVideo) lightboxVideo.pause();
        }
    });
});

