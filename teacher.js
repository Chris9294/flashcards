// ================================
// CONNEXION SUPABASE
// ================================
const supabaseUrl = "https://sdrwjgylmbgrhfwnphwa.supabase.co";
const supabaseKey = "sb_publishable_XKoO7J9_lc1OLzpREKWV5A_fo3UFjmV";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ================================
// DONNÉES
// ================================
let data = { themes: [] };

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
// UTILS FICHIERS
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
// RAFRAÎCHIR LES THÈMES
// ================================
function refreshThemes() {
  const themeSelect = document.getElementById('themeSelect');
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
// CHARGEMENT DES DONNÉES
// ================================
async function loadData() {
  // Thèmes
  const { data: themesData, error: themesError } = await supabase.from('themes').select('*');
  if (checkError(themesError, "Erreur chargement séries")) return;
  data.themes = themesData.map(t => ({ id: t.id.toString(), name: t.name, cards: [] }));

  // Cartes
  const { data: cardsData, error: cardsError } = await supabase.from('cards').select('*');
  if (checkError(cardsError, "Erreur chargement cartes")) return;
  cardsData.forEach(card => {
    const theme = data.themes.find(t => t.id === card.theme_id.toString());
    if (theme) theme.cards.push({ id: card.id, word: card.word, image: card.image_url, audio: card.audio_url, visible: card.visible });
  });

  refreshThemes();
  refreshCards();
}

// ================================
// AJOUT DE SÉRIE
// ================================
async function addTheme() {
  const nameInput = document.getElementById('themeName');
  const name = nameInput.value.trim();
  if (!name) return;

  const { data: exists } = await supabase.from('themes').select('id').eq('name', name).single();
  if (exists) { alert("Cette série existe déjà !"); return; }

  const { data: newTheme, error } = await supabase.from('themes').insert([{ name }]).select().single();
  if (checkError(error, "Erreur création série")) return;

  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name, cards: [] });
  nameInput.value = '';
  refreshThemes();
  document.getElementById('themeSelect').value = newTheme.id.toString();
  refreshCards();
}

// ================================
// SUPPRESSION SÉRIE
// ================================
async function deleteTheme() {
  const themeSelect = document.getElementById('themeSelect');
  if (!themeSelect.value) return;
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;
  if (!confirm(`Supprimer la série "${theme.name}" ?`)) return;

  await supabase.from('cards').delete().eq('theme_id', theme.id);
  await supabase.from('themes').delete().eq('id', theme.id);

  data.themes = data.themes.filter(t => t.id !== theme.id);
  refreshThemes();
  refreshCards();
}

// ================================
// AJOUT DE CARTE
// ================================
async function addCard() {
  const themeSelect = document.getElementById('themeSelect');
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const wordInput = document.getElementById('wordInput');
  const imageInput = document.querySelector('#imageInputWrapper input');
  const audioInput = document.querySelector('#audioInputWrapper input');

  if (!wordInput.value.trim() || !imageInput.files[0]) return;
  const word = wordInput.value.trim();
  const imageUrl = await uploadFile(imageInput.files[0]);
  if (!imageUrl) return;
  const audioUrl = audioInput.files[0] ? await uploadFile(audioInput.files[0]) : null;

  const { data: newCard, error } = await supabase.from('cards')
    .insert([{ theme_id: parseInt(themeSelect.value), word, image_url: imageUrl, audio_url: audioUrl, visible: true }])
    .select().single();
  if (checkError(error, "Erreur création carte")) return;

  theme.cards.push({ id: newCard.id, word: newCard.word, image: newCard.image_url, audio: newCard.audio_url, visible: true });

  wordInput.value = '';
  imageInput.value = '';
  audioInput.value = '';
  updateFileLabel(imageInput);
  updateFileLabel(audioInput);
  refreshCards();
}

// ================================
// AJOUT AUDIO SUR CARTE
// ================================
async function addAudioToCard(index, file) {
  if (!file) return;
  const themeSelect = document.getElementById('themeSelect');
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;
  const card = theme.cards[index];
  if (!card) return;

  const audioUrl = await uploadFile(file);
  if (!audioUrl) return;

  await supabase.from('cards').update({ audio_url: audioUrl }).eq('id', card.id);
  card.audio = audioUrl;
  refreshCards();
}

// ================================
// RAFRAÎCHIR CARTES
// ================================
function refreshCards() {
  const themeSelect = document.getElementById('themeSelect');
  const cardsList = document.getElementById('cardsList');
  const cardsTitle = document.getElementById('cardsTitle');

  cardsList.innerHTML = '';
  if (!themeSelect.value) { cardsTitle.textContent = 'Cartes existantes'; return; }

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  cardsTitle.textContent = `${theme.cards.length} carte${theme.cards.length > 1 ? 's' : ''} existante${theme.cards.length > 1 ? 's' : ''}`;

  theme.cards.forEach((card, index) => {
    if (card.visible !== false) card.visible = true;

    const div = document.createElement('div');
    div.className = 'card';
    if (!card.visible) div.classList.add('card-hidden');

    // Titre carte
    const number = document.createElement('div');
    number.textContent = `Carte ${index + 1}`;
    number.style.fontWeight = 'bold';
    number.style.color = '#ff6f61';
    div.appendChild(number);

    // Mot
    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.value = card.word;
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Enregistrer';
    saveBtn.onclick = async () => {
      card.word = wordInput.value.trim();
      await supabase.from('cards').update({ word: card.word }).eq('id', card.id);
      refreshCards();
    };
    const editRow = document.createElement('div');
    editRow.style.display = 'flex';
    editRow.style.alignItems = 'center';
    editRow.style.gap = '6px';
    editRow.appendChild(wordInput);
    editRow.appendChild(saveBtn);
    div.appendChild(editRow);

    // Supprimer / visibilité
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = async () => {
      await supabase.from('cards').delete().eq('id', card.id);
      theme.cards.splice(index, 1);
      refreshCards();
    };
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = async () => {
      card.visible = !card.visible;
      await supabase.from('cards').update({ visible: card.visible }).eq('id', card.id);
      refreshCards();
    };
    div.appendChild(deleteBtn);
    div.appendChild(toggleBtn);

    // Image et audio
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
    audioInfo.appendChild(audioText);
    audioInfo.appendChild(playBtn);

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';
    audioInput.onchange = () => addAudioToCard(index, audioInput.files[0]);

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
async function importZip(file, themeId) {
  const theme = data.themes.find(t => t.id === themeId);
  if (!theme) return;

  const zip = await JSZip.loadAsync(file);
  const images = {};
  const audios = {};
  const tasks = [];

  zip.forEach((path, entry) => {
    if (entry.dir) return;
    if (path.startsWith('__MACOSX')) return;
    const filename = path.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    const name = filename.replace(/\.[^/.]+$/, '');
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) tasks.push(entry.async('base64').then(d => { images[name] = `data:image/${ext==='jpg'?'jpeg':ext};base64,${d}`; }));
    if (['mp3','wav','ogg','m4a'].includes(ext)) tasks.push(entry.async('base64').then(d => { audios[name] = `data:audio/${ext};base64,${d}`; }));
  });

  await Promise.all(tasks);

  let added = 0;
  for (const name of Object.keys(images)) {
    const imageUrl = await uploadFileBase64(images[name], name);
    if (!imageUrl) continue;
    const audioUrl = audios[name] ? await uploadFileBase64(audios[name], name) : null;
    const { data: newCard, error } = await supabase.from('cards')
      .insert([{ theme_id: parseInt(themeId), word: name, image_url: imageUrl, audio_url: audioUrl, visible: true }])
      .select().single();
    if (!error) { theme.cards.push({ id: newCard.id, word: name, image: imageUrl, audio: audioUrl, visible: true }); added++; }
  }

  refreshCards();
  alert(`${added} carte(s) importée(s)`);
}

// ================================
// IMPORT ZIP VIA INPUT
// ================================
async function importZipFromInput() {
  const zipInput = document.getElementById('zipInput');
  const themeSelect = document.getElementById('themeSelect');
  if (!zipInput.files.length || !themeSelect.value) { alert("Sélectionne une série et un fichier ZIP."); return; }
  await importZip(zipInput.files[0], themeSelect.value);
  zipInput.value = '';
}

// ================================
// INITIALISATION AU DOM READY
// ================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  document.getElementById('addThemeBtn')?.addEventListener('click', addTheme);
  document.getElementById('deleteThemeBtn')?.addEventListener('click', deleteTheme);
  document.getElementById('themeSelect')?.addEventListener('change', refreshCards);

  document.querySelectorAll('.file-wrapper input[type="file"]').forEach(input => {
    const label = input.nextElementSibling;
    input.addEventListener('change', () => {
      label.textContent = input.files.length > 0 ? input.files[0].name : 'Parcourir…';
    });
  });

  document.getElementById('backToFlashcardsBtn')?.addEventListener('click', () => window.location.href = './index.html');
});

// ================================
// EXPOSER LES FONCTIONS AU HTML
// ================================
window.addTheme = addTheme;
window.addCard = addCard;
window.importZipFromInput = importZipFromInput;
