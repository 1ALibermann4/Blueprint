// Lightbox pour les médias
document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const carouselItems = document.querySelectorAll('.carousel-item');
    let currentIndex = 0;

    // Ouvrir lightbox
    carouselItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            currentIndex = index;
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
        });
    });

    // Fermer
    const closeBtn = lightbox.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            lightbox.style.display = 'none';
            if (lightboxVideo) lightboxVideo.pause();
        });
    }

    // Navigation
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + carouselItems.length) % carouselItems.length;
            if (carouselItems[currentIndex]) {
                carouselItems[currentIndex].click();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % carouselItems.length;
            if (carouselItems[currentIndex]) {
                carouselItems[currentIndex].click();
            }
        });
    }
});

