// ================================
// CONNEXION SUPABASE
// ================================
const supabaseUrl = "https://sdrwjgylmbgrhfwnphwa.supabase.co";
const supabaseKey = "sb_publishable_XKoO7J9_lc1OLzpREKWV5A_fo3UFjmV";
const supabase = supabaseJs.createClient(supabaseUrl, supabaseKey); // Supabase v2

// ================================
// DONNÉES LOCALES
// ================================
let data = { themes: [], cards: [] };

// ================================
// CHARGER LES SÉRIES DEPUIS SUPABASE
// ================================
async function loadThemes() {
  const { data: themesData, error } = await supabase
    .from('themes')
    .select('*')
    .order('name');

  if (error) {
    console.error("Erreur chargement séries :", error);
    alert("Erreur chargement séries");
    return;
  }

  data.themes = themesData.map(t => ({
    id: t.id.toString(),
    name: t.name,
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
    option.textContent = theme.name;
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

  const { data: newTheme, error } = await supabase
    .from('themes')
    .insert([{ name }])
    .select()
    .single();

  if (error) { 
    console.error("Erreur création série :", error); 
    alert("Erreur création série"); 
    return; 
  }

  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name });
  nameInput.value = '';
  refreshThemes();
  console.log("Série créée :", newTheme.name);
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

  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', theme.id);

  if (error) {
    console.error("Erreur suppression série :", error);
    alert("Erreur suppression série");
    return;
  }

  data.themes = data.themes.filter(t => t.id !== theme.id);
  refreshThemes();
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
  const text = wordInput.value.trim();
  const imageFile = imageInput.files[0];
  const audioFile = audioInput.files[0] || null;

  // Upload image
  const imageName = `${Date.now()}_${imageFile.name}`;
  const { error: imgError } = await supabase.storage
    .from('cards')
    .upload(imageName, imageFile);

  if (imgError) { console.error("Erreur upload image:", imgError); alert("Erreur upload image"); return; }

  let audioName = null;
  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audError } = await supabase.storage
      .from('cards')
      .upload(audioName, audioFile);
    if (audError) { console.error("Erreur upload audio:", audError); alert("Erreur upload audio"); return; }
  }

  // Insert card in DB
  const { data: newCard, error: cardError } = await supabase
    .from('cards')
    .insert([{
      theme_id: themeId,
      text,
      image: imageName,
      audio: audioName
    }])
    .select()
    .single();

  if (cardError) { console.error("Erreur création carte:", cardError); alert("Erreur création carte"); return; }

  console.log("Carte créée :", newCard.text);

  // Reset form
  wordInput.value = '';
  imageInput.value = '';
  audioInput.value = '';
  document.querySelector('#imageInputWrapper .file-label').textContent = '🔎 Parcourir…';
  document.querySelector('#audioInputWrapper .file-label').textContent = '🔎 Parcourir…';

  loadCards(themeId);
}

// ================================
// CHARGER CARTES
// ================================
async function loadCards(themeId) {
  const { data: cardsData, error } = await supabase
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('id');

  if (error) { console.error("Erreur chargement cartes :", error); return; }

  data.cards = cardsData;
  renderCards();
}

// ================================
// AFFICHER LES CARTES
// ================================
function renderCards() {
  const cardsList = document.getElementById('cardsList');
  cardsList.innerHTML = '';

  data.cards.forEach(c => {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <strong>${c.text}</strong><br>
      <img src="${supabase.storage.from('cards').getPublicUrl(c.image).data.publicUrl}" width="100"><br>
      ${c.audio ? `<audio controls src="${supabase.storage.from('cards').getPublicUrl(c.audio).data.publicUrl}"></audio>` : ''}
    `;
    cardsList.appendChild(div);
  });
}

// ================================
// INITIALISATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("teacher.js chargé");

  document.getElementById('addThemeBtn').addEventListener('click', addTheme);
  document.getElementById('deleteThemeBtn').addEventListener('click', deleteTheme);
  document.getElementById('themeSelect').addEventListener('change', e => loadCards(e.target.value));

  // Expose addCard globalement pour onclick
  window.addCard = addCard;

  loadThemes();
});
