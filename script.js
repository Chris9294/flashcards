// ===== DONNÉES DE TEST INTÉGRÉES =====
const data = {
  themes: [
    {
      id: "theme1",
      name: "Animaux",
      cards: [
        { word: "cat", image: "https://placekitten.com/400/300", audio: null },
        { word: "dog", image: "https://placedog.net/400/300", audio: null },
        { word: "lion", image: "https://placekitten.com/401/300", audio: null },
        { word: "elephant", image: "https://placekitten.com/402/300", audio: null }
      ]
    }
  ]
};

// ===== VARIABLES =====
let currentCard = null;
let showingWord = false;

const themeSelect = document.getElementById('themeSelect');
const thumbnails = document.getElementById('thumbnails');
const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');

// ===== INITIALISATION =====
function init() {
  themeSelect.innerHTML = '';
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
  cardContent.innerHTML = `<img src="${currentCard.image}" class="big-image">`;
  flashcard.classList.add('visible');

  const bigImg = document.querySelector('.big-image');
  if (bigImg) {
    bigImg.onclick = hideCard;
  }
}

function showWord() {
  cardContent.innerHTML = `<div class="word">${currentCard.word}</div>`;
}

function hideCard() {
  flashcard.classList.remove('visible');
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
