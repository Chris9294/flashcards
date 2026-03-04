// ================================
// DONNÉES
// ================================
const data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

// ================================
// VARIABLES
// ================================
let currentCard = null;
let showingWord = false;
let currentIndex = 0;
let currentThemeCards = [];

const themeSelect = document.getElementById('themeSelect');
const thumbnails = document.getElementById('thumbnails');
const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');

const leftArrow = document.getElementById('leftArrow');
const rightArrow = document.getElementById('rightArrow');

const fullscreenBtn = document.getElementById("fullscreenBtn");
const teacherBtn = document.getElementById("teacherBtn");

const teacherCode = document.getElementById("teacherCode");

teacherBtn.onclick = () => {
  teacherCode.style.display = "inline-block";
  teacherCode.value = "";
  teacherCode.focus();
};

teacherCode.addEventListener("input", () => {
  if (teacherCode.value === "1515") {
    window.location.href = "./teacher.html";
  }
});

// ================================
// INITIALISATION
// ================================
function init() {
  themeSelect.innerHTML = '';

  if (data.themes.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'Aucune série';
    themeSelect.appendChild(opt);
    return;
  }

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Flashcards —';
  themeSelect.appendChild(placeholder);

  data.themes.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });

  themeSelect.value = '';
  thumbnails.innerHTML = '';

  // écran principal → bouton enseignant visible
  teacherBtn.style.display = "block";
}

init();
themeSelect.onchange = loadTheme;

// ================================
// BOUTON INTERFACE ENSEIGNANT
// (la gestion du code est maintenant dans le HTML)
// ================================
/* AUCUNE LOGIQUE ICI */

// ================================
// BOUTON PLEIN ÉCRAN (SIMPLE & FIABLE)
// ================================
fullscreenBtn.onclick = () => {
  const isFullscreen =
    document.fullscreenElement || document.webkitFullscreenElement;

  if (!isFullscreen) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(); // Safari
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen(); // Safari
    }
  }
};

// ================================
// CHARGEMENT D’UNE SÉRIE
// ================================
function loadTheme() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  thumbnails.innerHTML = '';
  closeCard();

  if (!theme) return;

  currentThemeCards = theme.cards;

  theme.cards.forEach((card, index) => {
    const img = document.createElement('img');
    img.src = card.image;
    img.onclick = () => openCardAtIndex(index);
    thumbnails.appendChild(img);
  });
}

// ================================
// AFFICHAGE CARTE
// ================================
function openCardAtIndex(index) {
  currentIndex = index;
  currentCard = currentThemeCards[currentIndex];
  showingWord = false;
  showImage();
  updateArrows();
}

// Image
function showImage() {
  cardContent.innerHTML = `<img src="${currentCard.image}" class="big-image">`;
  flashcard.classList.add('visible');

  // cacher bouton enseignant uniquement
  teacherBtn.style.display = "none";

  const img = document.querySelector('.big-image');
  img.onclick = closeCard;

  void img.offsetWidth;
  img.classList.add('active');

  updateArrows();
}

// Mot
function showWord() {
  cardContent.innerHTML = `<div class="word">${currentCard.word}</div>`;
  const wordDiv = cardContent.querySelector('.word');

  teacherBtn.style.display = "none";

  wordDiv.style.opacity = 0;
  wordDiv.style.transition = "opacity 0.5s ease";
  void wordDiv.offsetWidth;
  wordDiv.style.opacity = 1;

  wordDiv.onclick = closeCard;
  updateArrows();
}

function closeCard() {
  flashcard.classList.remove('visible');
  currentCard = null;

  // retour écran principal → bouton enseignant visible
  teacherBtn.style.display = "block";
}

// ================================
// FLÈCHES NAVIGATION
// ================================
function updateArrows() {
  leftArrow.style.display = currentIndex > 0 ? 'block' : 'none';
  rightArrow.style.display = currentIndex < currentThemeCards.length - 1 ? 'block' : 'none';
}

leftArrow.onclick = () => {
  if (currentIndex > 0) openCardAtIndex(currentIndex - 1);
};

rightArrow.onclick = () => {
  if (currentIndex < currentThemeCards.length - 1) openCardAtIndex(currentIndex + 1);
};

// ================================
// BOUTONS
// ================================
document.getElementById('flipBtn').onclick = () => {
  if (!currentCard) return;
  showingWord = !showingWord;
  showingWord ? showWord() : showImage();
};

document.getElementById('speakBtn').onclick = () => {
  if (!currentCard) return;

  if (currentCard.audio) {
    new Audio(currentCard.audio).play();
  } else {
    const u = new SpeechSynthesisUtterance(currentCard.word);
    u.lang = 'en-GB';
    u.rate = 0.7;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
};
