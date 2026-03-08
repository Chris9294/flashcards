// ================================
// CONNEXION SUPABASE
// ================================
const supabaseUrl = "https://sdrwjgylmbgrhfwnphwa.supabase.co";
const supabaseKey = "sb_publishable_XKoO7J9_lc1OLzpREKWV5A_fo3UFjmV";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ================================
// DONNÉES LOCALES
// ================================
let data = { themes: [], cards: [] };

// ================================
// CHARGER LES SÉRIES
// ================================
async function loadThemes() {
  const { data: themesData, error } = await supabaseClient.from('themes').select('*').order('name');
  if (error) { console.error(error); alert("Erreur chargement séries"); return; }

  data.themes = themesData.map(t => ({ id: t.id.toString(), name: t.name }));
  refreshThemes();
}

// ================================
// RAFRAÎCHIR MENU SÉRIES
// ================================
function refreshThemes() {
  const themeSelect = document.getElementById('themeSelect');
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

// ================================
// AJOUTER / SUPPRIMER SÉRIE
// ================================
async function addTheme() {
  const name = document.getElementById('themeName').value.trim();
  if (!name) return alert("Merci de saisir un nom de série");
  if (data.themes.some(t => t.name.toLowerCase() === name.toLowerCase())) return alert("Cette série existe déjà");

  const { data: newTheme, error } = await supabaseClient.from('themes').insert([{ name }]).select().single();
  if (error) { console.error(error); alert("Erreur création série"); return; }

  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name });
  document.getElementById('themeName').value = '';
  refreshThemes();
}

async function deleteTheme() {
  const sel = document.getElementById('themeSelect');
  if (!sel.value) return;
  const theme = data.themes.find(t => t.id === sel.value);
  if (!theme || !confirm(`Supprimer la série "${theme.name}" ?`)) return;

  const { error } = await supabaseClient.from('themes').delete().eq('id', theme.id);
  if (error) { console.error(error); alert("Erreur suppression série"); return; }

  data.themes = data.themes.filter(t => t.id !== theme.id);
  refreshThemes();
}

// ================================
// AJOUTER CARTE
// ================================
async function addCard() {
  const wordInput = document.getElementById('wordInput');
  const themeSelect = document.getElementById('themeSelect');
  const imgInput = document.querySelector('#imageInputWrapper input[type="file"]');
  const audioInput = document.querySelector('#audioInputWrapper input[type="file"]');

  if (!themeSelect.value) return alert("Sélectionnez une série");
  if (!wordInput.value.trim()) return alert("Saisissez le texte de la carte");
  if (!imgInput.files[0]) return alert("Sélectionnez une image");

  const word = wordInput.value.trim();
  const themeId = themeSelect.value;
  const imageFile = imgInput.files[0];
  const audioFile = audioInput.files[0] || null;

  // Upload image
  const imgName = `${Date.now()}_${imageFile.name}`;
  const { error: imgErr } = await supabaseClient.storage.from('cards').upload(imgName, imageFile);
  if (imgErr) { console.error(imgErr); return alert("Erreur upload image"); }

  // Upload audio
  let audioName = null;
  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audErr } = await supabaseClient.storage.from('cards').upload(audioName, audioFile);
    if (audErr) { console.error(audErr); audioName = null; }
  }

  // Insert card
  const { data: newCard, error: cardErr } = await supabaseClient.from('cards').insert([{
    theme_id: themeId,
    word,
    image_url: imgName,
    audio_url: audioName,
    visible: true
  }]).select().single();
  if (cardErr) { console.error(cardErr); return; }

  wordInput.value = ''; imgInput.value = ''; audioInput.value = '';
  document.querySelector('#imageInputWrapper .file-label').textContent = '🔎 Parcourir…';
  document.querySelector('#audioInputWrapper .file-label').textContent = '🔎 Parcourir…';

  loadCards(themeId);
}

// ================================
// CHARGER / RENDRE LES CARTES
// ================================
async function loadCards(themeId) {
  const { data: cardsData, error } = await supabaseClient.from('cards')
    .select('*').eq('theme_id', themeId).order('position');
  if (error) { console.error(error); return; }

  data.cards = cardsData;
  renderCards();
}

function renderCards() {
  const list = document.getElementById('cardsList');
  list.innerHTML = '';

  data.cards.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'card-item';

    const imgUrl = supabaseClient.storage.from('cards').getPublicUrl(c.image_url).data.publicUrl;

    div.innerHTML = `
      <strong>${c.word}</strong><br>
      <img src="${imgUrl}" width="100"><br>
      ${c.audio_url ? `<audio controls src="${supabaseClient.storage.from('cards').getPublicUrl(c.audio_url).data.publicUrl}"></audio>` : ''}
      <br>
      <button onclick="toggleVisibility('${c.id}')">${c.visible ? 'Masquer' : 'Afficher'}</button>
      <button onclick="editCardText('${c.id}')">✏️ Modifier</button>
      <button onclick="deleteCard('${c.id}')">🗑️ Supprimer</button>
    `;

    // Déplacement
    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = i === 0;
    upBtn.onclick = () => swapCards(i, i - 1);

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = i === data.cards.length - 1;
    downBtn.onclick = () => swapCards(i, i + 1);

    div.appendChild(upBtn);
    div.appendChild(downBtn);

    list.appendChild(div);
  });
}

// ================================
// ACTIONS CARTES
// ================================
async function toggleVisibility(cardId) {
  const card = data.cards.find(c => c.id === cardId);
  if (!card) return;
  await supabaseClient.from('cards').update({ visible: !card.visible }).eq('id', card.id);
  loadCards(card.theme_id);
}

async function editCardText(cardId) {
  const newText = prompt("Modifier le texte :", data.cards.find(c => c.id === cardId).word);
  if (!newText) return;
  const card = data.cards.find(c => c.id === cardId);
  await supabaseClient.from('cards').update({ word: newText }).eq('id', card.id);
  loadCards(card.theme_id);
}

async function deleteCard(cardId) {
  const card = data.cards.find(c => c.id === cardId);
  if (!card || !confirm("Supprimer cette carte ?")) return;
  await supabaseClient.from('cards').delete().eq('id', card.id);
  loadCards(card.theme_id);
}

// ================================
// DÉPLACEMENT CARTES
// ================================
async function swapCards(i, j) {
  const c1 = data.cards[i];
  const c2 = data.cards[j];

  // Échanger positions
  const pos1 = c1.position;
  const pos2 = c2.position;

  await supabaseClient.from('cards').update({ position: pos2 }).eq('id', c1.id);
  await supabaseClient.from('cards').update({ position: pos1 }).eq('id', c2.id);

  loadCards(c1.theme_id);
}

// ================================
// IMPORT ZIP
// ================================
async function importZipFromInput() {
  const input = document.getElementById('zipInput');
  const themeId = document.getElementById('themeSelect').value;
  if (!themeId) return alert("Sélectionnez une série");
  if (!input.files.length) return alert("Sélectionnez un ZIP");

  const zip = await JSZip.loadAsync(input.files[0]);
  const images = {};
  const audios = {};

  const tasks = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const filename = path.split('/').pop();
    if (filename.startsWith("__MACOSX") || filename.startsWith("._")) return;

    const ext = filename.split('.').pop().toLowerCase();
    const name = filename.replace(/\.[^/.]+$/, "");

    if (["jpg","jpeg","png","gif","webp"].includes(ext)) {
      tasks.push(entry.async("blob").then(blob => images[name] = blob));
    }
    if (["mp3","wav","ogg","m4a"].includes(ext)) {
      tasks.push(entry.async("blob").then(blob => audios[name] = blob));
    }
  });

  await Promise.all(tasks);

  for (const name in images) {
    const imgFile = images[name];
    const imgName = `${Date.now()}_${name}.${imgFile.type.split("/")[1]}`;
    await supabaseClient.storage.from('cards').upload(imgName, imgFile);

    let audioName = null;
    if (audios[name]) {
      const audFile = audios[name];
      audioName = `${Date.now()}_${name}.${audFile.type.split("/")[1]}`;
      await supabaseClient.storage.from('cards').upload(audioName, audFile);
    }

    await supabaseClient.from('cards').insert([{
      theme_id: themeId,
      word: name,
      image_url: imgName,
      audio_url: audioName,
      visible: true
    }]);
  }

  input.value = '';
  loadCards(themeId);
}

// ================================
// INITIALISATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addThemeBtn').addEventListener('click', addTheme);
  document.getElementById('deleteThemeBtn').addEventListener('click', deleteTheme);
  document.getElementById('themeSelect').addEventListener('change', e => loadCards(e.target.value));
  window.addCard = addCard;
  window.importZipFromInput = importZipFromInput;

  loadThemes();
});
