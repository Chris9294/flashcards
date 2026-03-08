// ================================
// DONNÉES LOCALES POUR TEST
// ================================
let data = { themes: [] };

// ================================
// ÉLÉMENTS DOM
// ================================
const themeSelect = document.getElementById('themeSelect');
const addThemeBtn = document.getElementById('addThemeBtn');

// ================================
// TEST BOUTON AJOUTER SÉRIE
// ================================
function addTheme() {
  const nameInput = document.getElementById('themeName');
  const name = nameInput.value.trim();

  if (!name) {
    alert("Merci de saisir un nom de série !");
    return;
  }

  // Vérifie si la série existe déjà
  if (data.themes.some(t => t.name === name)) {
    alert("Cette série existe déjà !");
    return;
  }

  // Ajoute la série localement
  const newTheme = { id: Date.now().toString(), name, cards: [] };
  data.themes.push(newTheme);

  // Efface le champ
  nameInput.value = '';

  // Rafraîchit le menu
  refreshThemes();

  console.log("Nouvelle série ajoutée :", newTheme);
  alert(`Série "${newTheme.name}" ajoutée !`);
}

// ================================
// RAFRAÎCHIR MENU SÉRIES
// ================================
function refreshThemes() {
  const currentValue = themeSelect.value;
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

  themeSelect.value = data.themes.some(t => t.id === currentValue) ? currentValue : '';
}

// ================================
// LIAISON DU BOUTON
// ================================
if (addThemeBtn) {
  addThemeBtn.addEventListener('click', addTheme);
}

// ================================
// TEST INITIAL
// ================================
refreshThemes();
