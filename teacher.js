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
  const selectedTheme = themeSelect.value; // mémorise la série courante

  localStorage.setItem('flashcards', JSON.stringify(data));

  refreshThemes();

  // restaurer la série sélectionnée
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
    name: name,
    cards: []
  };

  data.themes.push(newTheme);
  document.getElementById('themeName').value = '';
  saveData();

  // sélectionner automatiquement la nouvelle série
  themeSelect.value = newTheme.id;
  refreshCards();
}

function refreshThemes() {
  themeSelect.innerHTML = '';

  // option neutre par défaut
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Choix de la série —';
  themeSelect.appendChild(placeholder);

  data.themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });

  // aucune série sélectionnée par défaut
  themeSelect.value = '';
}

// mise à jour quand on change de série
themeSelect.onchange = refreshCards;

// ================================
// AJOUT DE CARTE
// ================================
function addCard() {
  const themeId = themeSelect.value;
  const theme = data.themes.find(t => t.id === themeId);
  if (!theme) return;

  const word = document.getElementById('wordInput').value.trim();
  const imageFile = document.getElementById('imageInput').files[0];
  const audioFile = document.getElementById('audioInput').files[0];

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

  document.getElementById('wordInput').value = '';
  document.getElementById('imageInput').value = '';
  document.getElementById('audioInput').value = '';
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

  if (!themeSelect.value) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  theme.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';

    /* ====== ÉDITION DU MOT ====== */
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

    /* ====== IMAGE ====== */
    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';
    img.style.display = 'block';
    img.style.marginTop = '5px';

    /* ====== AUDIO ====== */
    const audioInfo = document.createElement('p');
    audioInfo.textContent = card.audio ? 'Audio : oui' : 'Audio : non';

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';
    audioInput.onchange = () => {
      addAudioToCard(index, audioInput.files[0]);
    };

    /* ====== RÉORDONNEMENT ====== */
    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => {
      [theme.cards[index - 1], theme.cards[index]] =
      [theme.cards[index], theme.cards[index - 1]];
      saveData();
    };

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === theme.cards.length - 1;
    downBtn.onclick = () => {
      [theme.cards[index + 1], theme.cards[index]] =
      [theme.cards[index], theme.cards[index + 1]];
      saveData();
    };

    /* ====== SUPPRESSION ====== */
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Supprimer';
    deleteBtn.onclick = () => {
      theme.cards.splice(index, 1);
      saveData();
    };

    /* ====== ASSEMBLAGE ====== */
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
