alert("SCRIPT VISUEL CHARGÉ");
// ===================================
// LECTURE DES DONNÉES ENSEIGNANT
// ===================================
const data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

// ===================================
// VARIABLES
// ===================================
let currentCard = null;
let showingWord = false;

const themeSelect = document.getElementById('themeSelect');
const thumbnails = document.getElementById('thumbnails');
const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');

// ===================================
// INITIALISATION
// ===================================
function init() {
  themeSelect.innerHTML = '';

  if (data.themes.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'Aucune série';
    themeSelect.appendChild(opt);
    return;
  }

  data.themes.forEach((theme, index) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
    if (index === 0) themeSelect.value = theme.id;
  });

  loadTheme();
}

init();
themeSelect.onchange = loadTheme;

// ===================================
// CHARGEMENT D’UNE SÉRIE
// ===================================
function loadTheme() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  thumbnails.innerHTML = '';
  hideCard();

  if (!theme) return;

  theme.cards.forEach(card => {
    const img = document.createElement('img');
    img.src = card.image;
    img.onclick = () => openCard(card);
    thumbnails.appendChild(img);
  });
}

// ===================================
// AFFICHAGE CARTE
// ===================================
function openCard(card) {
  currentCard = card;
  showingWord = false;
  showImage();
}

function showImage() {
  cardContent.innerHTML = `<img src="${currentCard.image}" class="big-image">`;
  flashcard.classList.add('visible');

  const img = document.querySelector('.big-image');
  img.onclick = closeCard;
}

function showWord() {
  cardContent.innerHTML = `<div class="word">${currentCard.word}</div>`;
}

function closeCard() {
  flashcard.classList.remove('visible');
  currentCard = null;
}

// ===================================
// BOUTONS
// ===================================
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
