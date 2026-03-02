// ===== DONNÉES =====
const data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

// ===== VARIABLES =====
let currentCard = null;
let showingWord = false;

const themeSelect = document.getElementById('themeSelect');
const thumbnails = document.getElementById('thumbnails');
const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');

// ===== INITIALISATION =====
if (data.themes.length === 0) {
  themeSelect.innerHTML = '<option>Aucune série</option>';
} else {
  data.themes.forEach((theme, index) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);

    if (index === 0) themeSelect.value = theme.id;
  });

  loadTheme();
}

themeSelect.onchange = loadTheme;

// ===== CHARGER UNE SÉRIE =====
function loadTheme() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  thumbnails.innerHTML = '';
  hideCard();

  if (!theme) return;

  theme.cards.forEach(card => {
    const img = document.createElement('img');
    img.src = card.image;
    img.onclick = () => toggleCard(card);
    thumbnails.appendChild(img);
  });
}

// ===== AFFICHAGE CARTE =====
function toggleCard(card) {
  if (currentCard === card) {
    hideCard();
    return;
  }
  currentCard = card;
  showingWord = false;
  showImage();
}

function showImage() {
  cardContent.style.backgroundImage = `url(${currentCard.image})`;
  cardContent.innerHTML = `<img src="${currentCard.image}" class="big-image">`;
  flashcard.classList.remove('hidden');

  document.querySelector('.big-image').onclick = hideCard;
}

function showWord() {
  cardContent.innerHTML = `<div class="word">${currentCard.word}</div>`;
}

function hideCard() {
  flashcard.classList.add('hidden');
  currentCard = null;
}

// ===== BOUTONS =====
document.getElementById('flipBtn').onclick = () => {
  if (!currentCard) return;
  showingWord = !showingWord;
  showingWord ? showWord() : showImage();
};

document.getElementById('speakBtn').onclick = () => {
  if (!currentCard) return;

  // audio prioritaire si disponible
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
document.getElementById('flipBtn').onclick = () => {
  if (!currentCard) return;
  showingWord = !showingWord;
  showingWord ? showWord() : showImage();
};

document.getElementById('speakBtn').onclick = () => {
  if (!currentCard) return;

  const u = new SpeechSynthesisUtterance(currentCard.word);
  u.lang = 'en-GB';      // souvent meilleure que en-US
  u.rate = 0.7;          // plus lent
  u.pitch = 1;
  u.volume = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
