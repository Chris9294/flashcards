let data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

const themeSelect = document.getElementById('themeSelect');
const cardsList = document.getElementById('cardsList');

// ===== SAUVEGARDE =====
function saveData() {
  localStorage.setItem('flashcards', JSON.stringify(data));
  refreshThemes();
  refreshCards();
}

// ===== THEMES =====
function addTheme() {
  const name = document.getElementById('themeName').value;
  if (!name) return;

  data.themes.push({
    id: Date.now().toString(),
    name,
    cards: []
  });

  saveData();
}

function refreshThemes() {
  themeSelect.innerHTML = '';
  data.themes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    themeSelect.appendChild(opt);
  });
}

// ===== CARTES =====
function addCard() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const word = document.getElementById('wordInput').value;
  const imageFile = document.getElementById('imageInput').files[0];
  const audioFile = document.getElementById('audioInput').files[0];

  if (!word || !imageFile) return;

  const card = { word, image: null, audio: null };

  const imgReader = new FileReader();
  imgReader.onload = e => {
    card.image = e.target.result;

    if (audioFile) {
      handleAudioUpload(audioFile, card);
    } else {
      theme.cards.push(card);
      saveData();
    }
  };
  imgReader.readAsDataURL(imageFile);
}

// ✅ ===== LA FONCTION QUE TU CHERCHAIS =====
function handleAudioUpload(file, card) {
  const reader = new FileReader();
  reader.onload = function (e) {
    card.audio = e.target.result; // audio Base64
    const theme = data.themes.find(t => t.id === themeSelect.value);
    theme.cards.push(card);
    saveData();
  };
  reader.readAsDataURL(file);
}

// ===== AFFICHAGE =====
function refreshCards() {
  cardsList.innerHTML = '';
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  theme.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';

    div.innerHTML = `
      <strong>${card.word}</strong><br>
      <img src="${card.image}"><br>
      <p>Audio : ${card.audio ? 'oui' : 'non'}</p>
      <input type="file" accept="audio/*" onchange="addAudioToCard(${index}, this.files[0])">
    `;

    cardsList.appendChild(div);
  });
}

refreshThemes();
refreshCards();

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
