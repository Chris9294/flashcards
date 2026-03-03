// ================================
// RETOUR INTERFACE FLASHCARDS
// ================================
const backBtn = document.getElementById("backToFlashcardsBtn");
if (backBtn) {
  backBtn.onclick = () => {
    window.location.href = "./index.html";
  };
}

// ================================
// DONNÉES
// ================================
let data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

// ================================
// ÉLÉMENTS DOM
// ================================
const themeSelect = document.getElementById('themeSelect');
const deleteThemeBtn = document.getElementById('deleteThemeBtn');
const cardsList = document.getElementById('cardsList');

// ================================
// SAUVEGARDE
// ================================
function saveData() {
  const selectedTheme = themeSelect.value;
  localStorage.setItem('flashcards', JSON.stringify(data));
  refreshThemes();
  themeSelect.value = selectedTheme;
  refreshCards();
}

// ================================
// GESTION DES SÉRIES
// ================================
function addTheme() {
  const name = document.getElementById('themeName').value.trim();
  if (!name) return;

  const newTheme = {
    id: Date.now().toString(),
    name,
    cards: []
  };

  data.themes.push(newTheme);
  document.getElementById('themeName').value = '';
  saveData();

  themeSelect.value = newTheme.id;
  refreshCards();
}

function refreshThemes() {
  themeSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Choix de la série —';
  placeholder.disabled = true;
  placeholder.selected = true;
  themeSelect.appendChild(placeholder);

  data.themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });
}

deleteThemeBtn.onclick = () => {
  if (!themeSelect.value) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  if (confirm(`Voulez-vous vraiment supprimer la série "${theme.name}" et toutes ses cartes ?`)) {
    data.themes = data.themes.filter(t => t.id !== theme.id);
    saveData();
  }
};

themeSelect.onchange = refreshCards;

// ================================
// AJOUT DE CARTE (Créer une carte)
// ================================
function addCard() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const wordInput = document.getElementById('wordInput');
  const imageInput = document.getElementById('imageInput');
  const audioInput = document.getElementById('audioInput');

  const word = wordInput.value.trim();
  const imageFile = imageInput.files[0];
  const audioFile = audioInput.files[0];

  if (!word || !imageFile) return;

  const card = { word, image: null, audio: null };

  const imgReader = new FileReader();
  imgReader.onload = function(e) {
    card.image = e.target.result;

    if (audioFile) {
      handleAudioUpload(audioFile, card, theme);
    } else {
      theme.cards.push(card);
      saveData();
    }
  };
  imgReader.readAsDataURL(imageFile);

  // réinitialiser les champs
  wordInput.value = '';
  resetFileInput(imageInput);
  resetFileInput(audioInput);
}

// ================================
// GESTION DES INPUT FILE POUR TEXTE NOIR
// ================================
function resetFileInput(input) {
  input.value = '';
  // Si un label personnalisé existe, rien à faire, sinon on peut ajouter le texte noir
  if (input.nextSibling && input.nextSibling.tagName !== 'LABEL') {
    const span = document.createElement('span');
    span.style.color = 'black';
    span.style.marginLeft = '4px';
    span.textContent = 'Aucun fichier sélectionné.';
    input.parentNode.insertBefore(span, input.nextSibling);
  }
}

// ================================
// AUDIO À LA CRÉATION
// ================================
function handleAudioUpload(file, card, theme) {
  const reader = new FileReader();
  reader.onload = function(e) {
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
  reader.onload = function(e) {
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

  const cardsTitle = document.getElementById('cardsTitle');
  if (!themeSelect.value) {
    cardsTitle.textContent = 'Cartes existantes';
    return;
  }

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const count = theme.cards.length;
  cardsTitle.textContent = `${count} carte${count > 1 ? 's' : ''} existante${count > 1 ? 's' : ''}`;

  theme.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';

    // numéro de la carte
    const number = document.createElement('div');
    number.textContent = `Carte ${index + 1}`;
    number.style.fontWeight = 'bold';
    number.style.color = '#ff6f61';
    number.style.marginBottom = '4px';
    div.appendChild(number);

    // mot éditable
    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.value = card.word;
    wordInput.style.fontSize = '16px';
    wordInput.style.width = '200px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Enregistrer';
    saveBtn.onclick = () => {
      card.word = wordInput.value.trim();
      saveData();
    };

    // image
    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';
    img.style.display = 'block';
    img.style.marginTop = '5px';

    // audio
    const audioInfo = document.createElement('p');
    audioInfo.textContent = card.audio ? 'Audio : oui' : 'Audio : non';

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';
    audioInput.onchange = () => {
      addAudioToCard(index, audioInput.files[0]);
    };

    // réordonner
    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => {
      [theme.cards[index - 1], theme.cards[index]] = [theme.cards[index], theme.cards[index - 1]];
      saveData();
    };

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === theme.cards.length - 1;
    downBtn.onclick = () => {
      [theme.cards[index + 1], theme.cards[index]] = [theme.cards[index], theme.cards[index + 1]];
      saveData();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Supprimer';
    deleteBtn.onclick = () => {
      theme.cards.splice(index, 1);
      saveData();
    };

    // assemblage
    div.appendChild(wordInput);
    div.appendChild(saveBtn);
    div.appendChild(document.createElement('br'));
    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(deleteBtn);
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
