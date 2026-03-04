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
  const selectedTheme = themeSelect.value; // mémorise la série courante
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
    name: name,
    cards: []
  };

  data.themes.push(newTheme);
  document.getElementById('themeName').value = '';
  saveData();

  themeSelect.value = newTheme.id;
  refreshCards();
}

function refreshThemes() {
  const currentValue = themeSelect.value;
  themeSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Choix de la série —';
  placeholder.disabled = true;
  themeSelect.appendChild(placeholder);

  data.themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });

  if (currentValue && data.themes.some(t => t.id === currentValue)) {
    themeSelect.value = currentValue;
  } else {
    placeholder.selected = true;
  }
}

// ================================
// SUPPRESSION D'UNE SÉRIE
// ================================
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
// AJOUT DE CARTE MANUEL
// ================================
function addCard() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const word = document.getElementById('wordInput').value.trim();
  const imageInput = document.querySelector('#imageInputWrapper input');
  const audioInput = document.querySelector('#audioInputWrapper input');

  if (!word || !imageInput.files[0]) return;

  const card = {
    word,
    image: null,
    audio: null,
    visible: true
  };

  const imgReader = new FileReader();
  imgReader.onload = e => {
    card.image = e.target.result;

    if (audioInput.files[0]) {
      handleAudioUpload(audioInput.files[0], card, theme);
    } else {
      theme.cards.push(card);
      saveData();
    }
  };

  imgReader.readAsDataURL(imageInput.files[0]);

  document.getElementById('wordInput').value = '';
  imageInput.value = '';
  audioInput.value = '';
  document.querySelector('#imageInputWrapper .file-label').textContent = 'Parcourir…';
  document.querySelector('#audioInputWrapper .file-label').textContent = 'Parcourir…';
}

// ================================
// AUDIO À LA CRÉATION
// ================================
function handleAudioUpload(file, card, theme) {
  const reader = new FileReader();
  reader.onload = e => {
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
  reader.onload = e => {
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
    if (card.visible === undefined) card.visible = true;

    const div = document.createElement('div');
    div.className = 'card';
    if (!card.visible) div.classList.add('card-hidden');

    const number = document.createElement('div');
    number.textContent = `Carte ${index + 1}`;
    number.style.fontWeight = 'bold';
    number.style.color = '#ff6f61';
    number.style.marginBottom = '4px';
    div.appendChild(number);

    // Texte modifiable
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

    // Image
    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';
    img.style.display = 'block';
    img.style.marginTop = '5px';

    // Audio
    const audioInfo = document.createElement('p');
    audioInfo.textContent = card.audio ? 'Audio : oui' : 'Audio : non';
    const audioWrapper = document.createElement('div');
    audioWrapper.className = 'file-wrapper';
    const audioFileInput = document.createElement('input');
    audioFileInput.type = 'file';
    audioFileInput.accept = 'audio/*';
    audioFileInput.onchange = () => addAudioToCard(index, audioFileInput.files[0]);
    const audioLabel = document.createElement('span');
    audioLabel.className = 'file-label';
    audioLabel.textContent = 'Parcourir…';
    audioWrapper.appendChild(audioFileInput);
    audioWrapper.appendChild(audioLabel);

    // Déplacer / supprimer
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

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = () => {
      card.visible = !card.visible;
      saveData();
    };

    div.appendChild(wordInput);
    div.appendChild(saveBtn);
    div.appendChild(document.createElement('br'));

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(deleteBtn);
    div.appendChild(toggleBtn);

    div.appendChild(img);
    div.appendChild(audioInfo);
    div.appendChild(audioWrapper);

    cardsList.appendChild(div);
  });
}

// ================================
// IMPORT ZIP (images + audios)
// ================================
async function importZip(file, themeId) {
  if (!file || !themeId) return;

  const theme = data.themes.find(t => t.id === themeId);
  if (!theme) return;

  const zip = await JSZip.loadAsync(file);
  const files = Object.values(zip.files);

  const images = files.filter(f => !f.dir && /\.(png|jpg|jpeg|gif)$/i.test(f.name));
  const audios = files.filter(f => !f.dir && /\.(mp3|wav|ogg)$/i.test(f.name));

  for (const imgFile of images) {
    const baseName = imgFile.name.replace(/\.[^/.]+$/, "");
    const imgData = await imgFile.async("base64");
    const ext = imgFile.name.split('.').pop().toLowerCase();
    const mime = ext === "jpg" ? "jpeg" : ext;
    const base64Img = `data:image/${mime};base64,${imgData}`;

    const audioMatch = audios.find(a => a.name.replace(/\.[^/.]+$/, "") === baseName);
    let base64Audio = null;
    if (audioMatch) {
      const audioData = await audioMatch.async("base64");
      const audioExt = audioMatch.name.split('.').pop();
      base64Audio = `data:audio/${audioExt};base64,${audioData}`;
    }

    const card = {
      word: baseName,
      image: base64Img,
      audio: base64Audio,
      visible: true
    };

    theme.cards.push(card);
  }

  saveData();
  alert(`Import terminé : ${images.length} carte(s) ajoutée(s) !`);
}

// ================================
// BASE64 → BLOB
// ================================
function base64toBlob(base64) {
  const [meta, data] = base64.split(',');
  const type = meta.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}

// ================================
// INITIALISATION
// ================================
refreshThemes();
refreshCards();

// ================================
// ZIP INPUT
// ================================
const zipInput = document.getElementById("zipInput");
if (zipInput) {
  zipInput.addEventListener("change", () => {
    if (!zipInput.files.length || !themeSelect.value) {
      alert("Sélectionne d'abord une série.");
      zipInput.value = "";
      return;
    }
    importZip(zipInput.files[0], themeSelect.value);
    zipInput.value = "";
  });
}
