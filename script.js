// ================================
// AFFICHAGE MINIATURES AVEC REBOND FINAL LISSE
// ================================
function loadThumbnails() {
  thumbnails.innerHTML = '';

  currentThemeCards.forEach((card, index) => {
    const img = document.createElement('img');
    img.src = card.image;
    img.style.opacity = "0";
    img.style.transform = 'translateY(30px) scale(0.85)'; // départ plus bas et plus petit
    img.style.display = 'inline-block';
    img.style.cursor = 'pointer';
    img.onclick = () => openCardAtIndex(index);
    thumbnails.appendChild(img);

    // Animation rebond avec effet final “bounce”
    img.onload = () => {
      setTimeout(() => {
        img.style.transition = 'transform 0.6s cubic-bezier(.68,-0.6,.32,1.6), opacity 0.5s ease';
        img.style.opacity = '1';
        img.style.transform = 'translateY(-5px) scale(1.05)'; // léger dépassement
        // Après rebond final, revenir à taille normale
        setTimeout(() => {
          img.style.transition = 'transform 0.3s ease';
          img.style.transform = 'translateY(0) scale(1)';
        }, 600);
      }, 80 * index); // effet cascade
    };
  });
}
