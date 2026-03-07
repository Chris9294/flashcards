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
// FONCTIONS UTILES
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
  const themeSelect = document.getElementById('themeSelect');

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
// INITIALISATION AU DOM READY
// ================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Boutons
  const addThemeBtn = document.getElementById('addThemeBtn');
  if (addThemeBtn) addThemeBtn.addEventListener('click', addTheme);

  const deleteThemeBtn = document.getElementById('deleteThemeBtn');
  if (deleteThemeBtn) deleteThemeBtn.addEventListener('click', deleteTheme);

  const themeSelect = document.getElementById('themeSelect');
  themeSelect.addEventListener('change', refreshCards);

  // Labels fichiers
  document.querySelectorAll('.file-wrapper input[type="file"]').forEach(input => {
    const label = input.nextElementSibling;
    input.addEventListener('change', () => {
      label.textContent = input.files.length > 0 ? input.files[0].name : 'Parcourir…';
    });
  });
});
