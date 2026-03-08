// ===================================
// CONNECTION SUPABASE
// ===================================
const supabaseUrl = "https://sdrwjgylmbgrhfwnphwa.supabase.co";
const supabaseKey = "sb_publishable_XKoO7J9_lc1OLzpREKWV5A_fo3UFjmV";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ===================================
// DONNEES LOCALES
// ===================================
let data = { themes: [] };

// ===================================
// CHARGER LES SERIES
// ===================================
async function loadThemes() {
  const { data: themesData, error } = await supabase.from('themes').select('*').order('name');
  if (error) { alert("Erreur chargement séries"); return; }
  data.themes = themesData.map(t => ({ id: t.id.toString(), name: t.name, cards: [] }));
  refreshThemes();
}

// ===================================
// RAFRAICHIR MENU SERIES
// ===================================
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

// ===================================
// AJOUTER UNE SERIE
// ===================================
async function addTheme() {
  const nameInput = document.getElementById('themeName');
  const name = nameInput.value.trim();
  if (!name) { alert("Merci de saisir un nom de série"); return; }

  const exists = data.themes.some(t => t.name.toLowerCase() === name.toLowerCase());
  if (exists) { alert("Cette série existe déjà"); return; }

  const { data: newTheme, error } = await supabase.from('themes').insert([{ name }]).select().single();
  if (error) { alert("Erreur création série"); return; }

  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name, cards: [] });
  nameInput.value = '';
  refreshThemes();
  alert("Série ajoutée :)");
}

// ===================================
// AJOUTER UNE CARTE
// ===================================
async function addCard() {
  const themeId = document.getElementById('themeSelect').value;
  const theme = data.themes.find(t => t.id === themeId);
  if (!theme) { alert("Sélectionne une série"); return; }

  const wordInput = document.getElementById('wordInput');
  const imageInput = document.querySelector('#imageInputWrapper input');
  if (!wordInput.value.trim() || !imageInput.files[0]) { alert("Texte + image obligatoires"); return; }

  // Upload image
  const file = imageInput.files[0];
  const fileName = `${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('cards').upload(fileName, file, { upsert: true });
  if (uploadError) { alert("Erreur upload image"); return; }
  const imageUrl = supabase.storage.from('cards').getPublicUrl(fileName).data.publicUrl;

  const { data: newCard, error } = await supabase.from('cards')
    .insert([{ theme_id: parseInt(themeId), word: wordInput.value.trim(), image_url: imageUrl, visible: true }])
    .select().single();
  if (error) { alert("Erreur création carte"); return; }

  theme.cards.push({ id: newCard.id, word: newCard.word, image: imageUrl, visible: true });
  wordInput.value = '';
  imageInput.value = '';
  alert("Carte ajoutée !");
}

// ===================================
// SUPPRIMER UNE SERIE
// ===================================
async function deleteTheme() {
  const themeSelect = document.getElementById('themeSelect');
  if (!themeSelect.value) return;
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;
  if (!confirm(`Supprimer la série "${theme.name}" ?`)) return;

  await supabase.from('themes').delete().eq('id', theme.id);
  data.themes = data.themes.filter(t => t.id !== theme.id);
  refreshThemes();
}

// ===================================
// INIT
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  loadThemes();

  document.getElementById('addThemeBtn').onclick = addTheme;
  document.getElementById('deleteThemeBtn').onclick = deleteTheme;

  // Expose addCard pour que onclick dans HTML fonctionne
  window.addCard = addCard;
});
