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
  const { data: themesData, error } = await supabaseClient
    .from('themes')
    .select('*')
    .order('name');

  if (error) { console.error("Erreur chargement séries :", error); alert("Erreur chargement séries"); return; }

  const { data: cardsData } = await supabaseClient
    .from('cards')
    .select('theme_id');

  const counts = {};
  cardsData.forEach(c => counts[c.theme_id] = (counts[c.theme_id] || 0) + 1);

  data.themes = themesData.map(t => ({
    id: t.id.toString(),
    name: t.name,
    count: counts[t.id] || 0
  }));

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
    option.textContent = `${theme.name} (${theme.count})`;
    themeSelect.appendChild(option);
  });
}

// ================================
// AJOUTER UNE SÉRIE
// ================================
async function addTheme() {
  const nameInput = document.getElementById('themeName');
  const name = nameInput.value.trim();
  if (!name) { alert("Merci de saisir un nom de série"); return; }

  const exists = data.themes.some(t => t.name.toLowerCase() === name.toLowerCase());
  if (exists) { alert("Cette série existe déjà"); return; }

  const { data: newTheme, error } = await supabaseClient
    .from('themes')
    .insert([{ name }])
    .select()
    .single();

  if (error) { console.error("Erreur création série :", error); alert("Erreur création série"); return; }

  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name, count: 0 });
  nameInput.value = '';
  loadThemes();
}

// ================================
// SUPPRIMER UNE SÉRIE
// ================================
async function deleteTheme() {
  const themeSelect = document.getElementById('themeSelect');
  if (!themeSelect.value) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;
  if (!confirm(`Supprimer la série "${theme.name}" ?`)) return;

  const { error } = await supabaseClient.from('themes').delete().eq('id', theme.id);
  if (error) { console.error("Erreur suppression série :", error); alert("Erreur suppression série"); return; }

  data.themes = data.themes.filter(t => t.id !== theme.id);
  loadThemes();
  document.getElementById('cardsList').innerHTML = '';
}

// ================================
// AJOUTER UNE CARTE
// ================================
async function addCard() {
  const wordInput = document.getElementById('wordInput');
  const themeSelect = document.getElementById('themeSelect');
  const imageInput = document.querySelector('#imageInputWrapper input[type="file"]');
  const audioInput = document.querySelector('#audioInputWrapper input[type="file"]');

  if (!themeSelect.value) { alert("Sélectionnez une série"); return; }
  if (!wordInput.value.trim()) { alert("Saisissez le texte de la carte"); return; }
  if (!imageInput.files[0]) { alert("Sélectionnez une image"); return; }

  const themeId = themeSelect.value;
  const word = wordInput.value.trim();
  const imageFile = imageInput.files[0];
  const audioFile = audioInput.files[0] || null;

  const imageName = `${Date.now()}_${imageFile.name}`;
  const { error: imgError } = await supabaseClient.storage.from('cards').upload(imageName, imageFile);
  if (imgError) { console.error("Erreur upload image:", imgError); alert("Erreur upload image"); return; }

  let audioName = null;
  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audError } = await supabaseClient.storage.from('cards').upload(audioName, audioFile);
    if (audError) { console.error("Erreur upload audio:", audError); alert("Erreur upload audio"); return; }
  }

  const { data: maxPosData } = await supabaseClient
    .from('cards')
    .select('position')
    .eq('theme_id', themeId)
    .order('position', { ascending: false })
    .limit(1);

  const position = maxPosData.length ? maxPosData[0].position + 1 : 1;

  const { error: cardError } = await supabaseClient
    .from('cards')
    .insert([{ theme_id: themeId, word, image_url: imageName, audio_url: audioName, visible: true, position }]);
  if (cardError) { console.error("Erreur création carte:", cardError); alert("Erreur création carte"); return; }

  wordInput.value = '';
  imageInput.value = '';
  audioInput.value = '';
  document.querySelector('#imageInputWrapper .file-label').textContent = '🔎 Parcourir…';
  document.querySelector('#audioInputWrapper .file-label').textContent = '🔎 Parcourir…';

  await loadCards(themeId);
  loadThemes();
}

// ================================
// CHARGER CARTES
// ================================
async function loadCards(themeId) {
  const { data: cardsData, error } = await supabaseClient
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('position');

  if (error) { console.error("Erreur chargement cartes :", error); return; }

  data.cards = cardsData;

  const title = document.getElementById('cardsTitle');
  title.innerHTML = `${data.cards.length} carte${data.cards.length > 1 ? 's' : ''} existante${data.cards.length > 1 ? 's' : ''} `;

  const toggleAllBtn = document.createElement('button');
  toggleAllBtn.textContent = data.cards.every(c => c.visible) ? '🚫 Masquer toutes' : '👁️ Afficher toutes';
  toggleAllBtn.style.marginLeft = '10px';
  toggleAllBtn.onclick = async () => {
    const newVisible = !data.cards.every(c => c.visible);
    for (const card of data.cards) {
      await supabaseClient.from('cards').update({ visible: newVisible }).eq('id', card.id);
    }
    loadCards(document.getElementById('themeSelect').value);
  };
  title.appendChild(toggleAllBtn);

  renderCards();
}

// ================================
// REMPLACER IMAGE / AUDIO / RENDER CARDS
// ================================
// ... tout ton code existant pour replaceImageOfCard, addAudioToCard, renderCards, moveCard
// (inchangé, tu peux le garder tel quel)
window.addCard = addCard;

// ================================
// IMPORT ZIP
// ================================
async function importZipFromInput() {
  const input = document.getElementById("zipInput");
  const themeId = document.getElementById("themeSelect").value;

  if (!themeId) { alert("Veuillez sélectionner une série"); return; }
  if (!input.files.length) { alert("Veuillez sélectionner un fichier ZIP"); return; }

  await importZip(input.files[0], themeId);
  input.value = "";
}

// ================================
// MENU OUTILS FLASHCARDS
// ================================
function createToolsDropdown() {
  const container = document.getElementById('toolsDropdownContainer');
  if (!container) return;

  container.innerHTML = '';

  const select = document.createElement('select');
  select.className = 'tools-btn'; // <-- style orange avec hover
  const placeholder = document.createElement('option');
  placeholder.textContent = "Outils Flashcards";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  const tools = [
    { name: "Générer image IA", url: "https://firefly.adobe.com/" },
    { name: "Supprimer fond (Remove.bg)", url: "https://www.remove.bg/fr" },
    { name: "Générer audio (Lazypy.ro)", url: "https://lazypy.ro/tts/?voice=en-gb&service=Google%20Translate&text=It%27s%20rainy&lang=English&g=A" }
  ];

  tools.forEach(tool => {
    const option = document.createElement('option');
    option.value = tool.url;
    option.textContent = tool.name;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    if (select.value) window.open(select.value, "_blank");
    select.selectedIndex = 0;
  });

  container.appendChild(select);
}

// ================================
// INITIALISATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addThemeBtn').addEventListener('click', addTheme);
  document.getElementById('deleteThemeBtn').addEventListener('click', deleteTheme);
  document.getElementById('themeSelect').addEventListener('change', e => loadCards(e.target.value));
  document.getElementById("backToFlashcardsBtn").addEventListener("click", () => { window.location.href = "index.html"; });

  loadThemes();

  document.querySelectorAll('.file-wrapper input[type="file"]').forEach(input => {
    const label = input.nextElementSibling;
    input.addEventListener('change', () => { label.textContent = input.files.length > 0 ? input.files[0].name : 'Parcourir…'; });
  });

  createToolsDropdown(); // <-- menu outils flashcards
});
