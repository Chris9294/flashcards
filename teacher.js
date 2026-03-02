// ================================
// DONNÉES
// ================================
let data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

// ================================
// ÉLÉMENTS DOM
// ================================
const themeSelect = document.getElementById('themeSelect');
const cardsList = document.getElementById('cardsList');

// ================================
// SAUVEGARDE
// ================================
function saveData() {
  localStorage.setItem('flashcards', JSON.stringify(data));
  refreshThemes();
  refreshCards();
}

// ================================
// GESTION DES SÉRIES
// ================================
function addTheme() {
  const name = document.getElementById('themeName').value.trim();
  if (!name) return;

  data.themes.push({
    id: Date.now().toString(),
    name: name,
    cards: []
  });

  document.getElementById('themeName').value = '';
  saveData();
}

function refreshThemes() {
  themeSelect.innerHTML = '';

  data.themes.forEach((theme, index) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);

    if (index === 0) themeSelect.value = theme.id;
  });
}

// ================================
// AJOUT DE CARTE
// ================================
function addCard() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const word = document.getElementById('wordInput').value.trim();
  const imageFile = document.getElementById('imageInput').files[0];
  const audioFile = document.getElementById('audioInput').files[0];

  if (!word || !imageFile) return;

  const card = {
    word: word,
    image: null,
    audio: null
  };

  const imgReader = new FileReader();
  imgReader.onload = function (e) {
    card.image = e.target.result;

    if (audioFile) {
      handleAudioUpload(audioFile, card, theme);
    } else {
      theme.cards.push(card);
      saveData();
    }
  };
  imgReader.readAsDataURL(imageFile);

  document.getElementById('wordInput').value = '';
  document.getElementById('imageInput').value = '';
  document.getElementById('audioInput').value = '';
}

// ================================
// AUDIO À LA CRÉATION
// ================================
function handleAudioUpload(file, card, theme) {
  const reader = new FileReader();
  reader.onload = function (e) {
    card.audio = e.target.result;
    theme.cards.push(card);
    saveData();
  };
  reader.readAsDataURL(file);
}

// ================================
// AUDIO SUR CARTE EXISTANTE
// ================================
function addAudioToCard(cardIndex, file) {
  if (!file) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    theme.cards[cardIndex].audio = e.target.result;
    saveData();
  };
  reader.readAsDataURL(file);
}

// ================================
// AFFICHAGE DES CARTES
// ================================
function refreshCards() {
  cardsList.innerHTML = '';

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  theme.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';

    const title = document.createElement('strong');
    title.textContent = card.word;

    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';

    const audioInfo = document.createElement('p');
    audioInfo.textContent = card.audio ? 'Audio : oui' : 'Audio : non';

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';

    audioInput.addEventListener('change', function () {
      addAudioToCard(index, audioInput.files[0]);
    });

    div.appendChild(title);
    div.appendChild(document.createElement('br'));
    div.appendChild(img);
    div.appendChild(audioInfo);
    div.appendChild(audioInput);

    cardsList.appendChild(div);
  });
}

// ================================
// INITIALISATION
// ================================
refreshThemes();
refreshCards();
