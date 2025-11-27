// Gestion du menu mobile
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const menuBtn = document.querySelector('.menu-btn');
    
    if (menuToggle && menuBtn) {
        menuBtn.addEventListener('click', () => {
            menuToggle.checked = !menuToggle.checked;
        });
    }
    
    // Fermer le menu quand on clique sur un lien
    const menuLinks = document.querySelectorAll('.mobile-sidebar a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (menuToggle) {
                menuToggle.checked = false;
            }
        });
    });
});

