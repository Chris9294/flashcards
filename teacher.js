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
    cards: []
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

  if (!name) {
    alert("Merci de saisir un nom de série");
    return;
  }

  // vérifier si existe déjà
  const exists = data.themes.some(t => t.name.toLowerCase() === name.toLowerCase());

  if (exists) {
    alert("Cette série existe déjà");
    return;
  }

  // insertion Supabase
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

  // ajout local
  data.themes.push({
    id: newTheme.id.toString(),
    name: newTheme.name,
    cards: []
  });

  // reset champ
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

  await supabase
    .from('themes')
    .delete()
    .eq('id', theme.id);

  data.themes = data.themes.filter(t => t.id !== theme.id);

  refreshThemes();

}

// ================================
// INITIALISATION
// ================================
document.addEventListener('DOMContentLoaded', () => {

  console.log("teacher.js chargé");

  const addThemeBtn = document.getElementById('addThemeBtn');
  const deleteThemeBtn = document.getElementById('deleteThemeBtn');

  if (addThemeBtn) {
    addThemeBtn.addEventListener('click', addTheme);
  }

  if (deleteThemeBtn) {
    deleteThemeBtn.addEventListener('click', deleteTheme);
  }

  loadThemes();

});
