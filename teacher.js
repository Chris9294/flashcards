// ================================
// CONNEXION SUPABASE
// ================================
const supabaseUrl = "https://sdrwjgylmbgrhfwnphwa.supabase.co";
const supabaseKey = "sb_publishable_XKoO7J9_lc1OLzpREKWV5A_fo3UFjmV";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ================================
// UTILITAIRE GESTION ERREURS
// ================================
function checkError(error, message = "Erreur Supabase") {
  if (error) {
    console.error(message, error);
    alert(message);
    return true;
  }
  return false;
}

// ================================
// RETOUR INTERFACE FLASHCARDS
// ================================
const backBtn = document.getElementById("backToFlashcardsBtn");
if (backBtn) backBtn.onclick = () => window.location.href = "./index.html";

// ================================
// DONNÉES
// ================================
let data = { themes: [] };

// ================================
// ÉLÉMENTS DOM
// ================================
const themeSelect = document.getElementById('themeSelect');
const deleteThemeBtn = document.getElementById('deleteThemeBtn');
const cardsList = document.getElementById('cardsList');
const zipInput = document.getElementById("zipInput");

// ================================
// CHARGEMENT DES THÈMES ET CARTES
// ================================
async function loadData() {
  const { data: themesData, error: themesError } = await supabase.from('themes').select('*');
  if (checkError(themesError, "Erreur chargement séries")) return;
  data.themes = themesData.map(t => ({ id: t.id.toString(), name: t.name, cards: [] }));

  const { data: cardsData, error: cardsError } = await supabase.from('cards').select('*');
  if (checkError(cardsError, "Erreur chargement cartes")) return;

  cardsData.forEach(card => {
    const themeId = card.theme_id.toString();
    const theme = data.themes.find(t => t.id === themeId);
    if (theme) {
      theme.cards.push({ id: card.id, word: card.word, image: card.image_url, audio: card.audio_url, visible: card.visible });
    }
  });

  refreshThemes();
  refreshCards();
}

// ================================
// UTILS
// ================================
function updateFileLabel(input) {
  const label = input.nextElementSibling;
  label.textContent = input.files.length > 0 ? input.files[0].name : '🔎 Parcourir…';
}

async function uploadFile(file) {
  const fileName = `${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from('cards').upload(fileName, file, { upsert: true });
  if (checkError(error, "Erreur upload fichier")) return null;
  return supabase.storage.from('cards').getPublicUrl(fileName).data.publicUrl;
}

async function uploadFileBase64(data64, filename) {
  const matches = data64.match(/^data:(.+);base64,(.*)$/);
  if (!matches) return null;
  const blob = b64toBlob(matches[2], matches[1]);
  const uniqueName = `${Date.now()}_${filename}`;
  const { error } = await supabase.storage.from('cards').upload(uniqueName, blob, { upsert: true });
  if (checkError(error, "Erreur upload fichier ZIP")) return null;
  return supabase.storage.from('cards').getPublicUrl(uniqueName).data.publicUrl;
}

function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = Array.from(slice).map(c => c.charCodeAt(0));
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
}

// ================================
// AJOUT SÉRIE
// ================================
async function addTheme() {
  const nameInput = document.getElementById('themeName');
  const name = nameInput.value.trim();
  if (!name) return;

  // Vérifie si la série existe déjà
  const exists = await supabase.from('themes').select('id').eq('name', name).single();
  if (exists.data) { alert("Cette série existe déjà !"); return; }

  // Crée la nouvelle série
  const { data: newTheme, error } = await supabase.from('themes').insert([{ name }]).select().single();
  if (error) { console.error("Erreur création série:", error); alert("Erreur création série"); return; }

  // Ajoute localement la nouvelle série
  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name, cards: [] });

  // Vide le champ de saisie
  nameInput.value = '';

  // Rafraîchit le menu déroulant et sélectionne la nouvelle série
  refreshThemes();
  setTimeout(() => {
    themeSelect.value = newTheme.id.toString();
    refreshCards();
  }, 0);
}

// ================================
// RAFRAÎCHIR SÉRIES
// ================================
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

  themeSelect.value = data.themes.some(t => t.id === currentValue) ? currentValue : '';
}

// ================================
// SUPPRESSION SÉRIE
// ================================
deleteThemeBtn.onclick = async () => {
  if (!themeSelect.value) return;
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;
  if (!confirm(`Supprimer la série "${theme.name}" ?`)) return;

  const { error: delCardsError } = await supabase.from('cards').delete().eq('theme_id', theme.id);
  checkError(delCardsError, "Erreur suppression cartes");

  const { error: delThemeError } = await supabase.from('themes').delete().eq('id', theme.id);
  checkError(delThemeError, "Erreur suppression série");

  data.themes = data.themes.filter(t => t.id !== theme.id);
  refreshThemes();
  refreshCards();
};

themeSelect.onchange = refreshCards;

// ================================
// AJOUT CARTE
// ================================
async function addCard() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;
  const word = document.getElementById('wordInput').value.trim();
  const imageInput = document.querySelector('#imageInputWrapper input');
  const audioInput = document.querySelector('#audioInputWrapper input');
  if (!word || !imageInput.files[0]) return;

  const imageUrl = await uploadFile(imageInput.files[0]);
  if (!imageUrl) { alert("Erreur lors de l'upload de l'image."); return; }

  const audioUrl = audioInput.files[0] ? await uploadFile(audioInput.files[0]) : null;

  const { data: newCard, error } = await supabase.from('cards')
    .insert([{ theme_id: parseInt(themeSelect.value), word, image_url: imageUrl, audio_url: audioUrl, visible: true }])
    .select().single();
  if (checkError(error, "Erreur création carte")) return;

  theme.cards.push({ id: newCard.id, word: newCard.word, image: newCard.image_url, audio: newCard.audio_url, visible: true });

  document.getElementById('wordInput').value = '';
  imageInput.value = '';
  audioInput.value = '';
  updateFileLabel(imageInput);
  updateFileLabel(audioInput);

  refreshCards();
}

// ================================
// AJOUT AUDIO
// ================================
async function addAudioToCard(index, file) {
  if (!file) return;
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;
  const card = theme.cards[index];
  if (!card) return;

  const audioUrl = await uploadFile(file);
  if (!audioUrl) return;

  const { error } = await supabase.from('cards').update({ audio_url: audioUrl }).eq('id', card.id);
  if (checkError(error, "Erreur ajout audio")) return;

  card.audio = audioUrl;
  refreshCards();
}

// ================================
// AFFICHAGE CARTES
// ================================
function refreshCards() {
  cardsList.innerHTML = '';
  const cardsTitle = document.getElementById('cardsTitle');
  if (!themeSelect.value) { cardsTitle.textContent = 'Cartes existantes'; return; }

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  cardsTitle.textContent = `${theme.cards.length} carte${theme.cards.length > 1 ? 's' : ''} existante${theme.cards.length > 1 ? 's' : ''}`;

  theme.cards.forEach((card, index) => {
    if (card.visible !== false) card.visible = true;

    const div = document.createElement('div');
    div.className = 'card';
    if (!card.visible) div.classList.add('card-hidden');

    const number = document.createElement('div');
    number.textContent = `Carte ${index + 1}`;
    number.style.fontWeight = 'bold';
    number.style.color = '#ff6f61';

    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.value = card.word;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Enregistrer';
    saveBtn.onclick = async () => {
      card.word = wordInput.value.trim();
      const { error } = await supabase.from('cards').update({ word: card.word }).eq('id', card.id);
      if (checkError(error, "Erreur sauvegarde mot")) return;
      refreshCards();
    };

    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';

    const audioInfo = document.createElement('p');
    const audioText = document.createElement('span');
    audioText.textContent = card.audio ? 'Audio : oui ' : 'Audio : non (synthèse vocale GB par défaut) ';
    const playBtn = document.createElement('button');
    playBtn.textContent = '🔊';
    playBtn.onclick = () => {
      if (card.audio) new Audio(card.audio).play();
      else { const utter = new SpeechSynthesisUtterance(card.word); utter.lang = 'en-GB'; utter.rate = 0.7; speechSynthesis.cancel(); speechSynthesis.speak(utter); }
    };
    audioInfo.appendChild(audioText); audioInfo.appendChild(playBtn);

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';
    audioInput.onchange = () => addAudioToCard(index, audioInput.files[0]);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = async () => {
      const { error } = await supabase.from('cards').delete().eq('id', card.id);
      if (checkError(error, "Erreur suppression carte")) return;
      theme.cards.splice(index, 1);
      refreshCards();
    };

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = async () => {
      card.visible = !card.visible;
      const { error } = await supabase.from('cards').update({ visible: card.visible }).eq('id', card.id);
      if (checkError(error, "Erreur visibilité carte")) return;
      refreshCards();
    };

    div.appendChild(number);
    const editRow = document.createElement('div');
    editRow.style.display = 'flex';
    editRow.style.alignItems = 'center';
    editRow.style.gap = '6px';
    editRow.appendChild(wordInput);
    editRow.appendChild(saveBtn);
    div.appendChild(editRow);

    div.appendChild(deleteBtn);
    div.appendChild(toggleBtn);

    const mediaRow = document.createElement('div');
    mediaRow.style.display = 'flex';
    mediaRow.style.alignItems = 'center';
    mediaRow.style.gap = '10px';
    mediaRow.appendChild(img);
    mediaRow.appendChild(audioInfo);
    div.appendChild(mediaRow);

    const replaceAudioLabel = document.createElement('span');
    replaceAudioLabel.textContent = "Remplacer l'audio : ";
    replaceAudioLabel.style.fontSize = '0.8em';
    div.appendChild(replaceAudioLabel);
    div.appendChild(audioInput);

    cardsList.appendChild(div);
  });
}

// ================================
// IMPORT ZIP
// ================================
async function importZipFromInput() {
  if (!zipInput.files.length || !themeSelect.value) { alert("Sélectionne une série et un fichier ZIP."); return; }
  importZip(zipInput.files[0], themeSelect.value);
  zipInput.value = '';
}

// ================================
// INITIALISATION
// ================================
loadData();

// ================================
// EXPOSER LES FONCTIONS AU HTML
// ================================
window.addTheme = addTheme;
window.addCard = addCard;
window.importZipFromInput = importZipFromInput;
