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
// AJOUTER UNE SÉRIE
// ================================
async function addTheme() {
  const nameInput = document.getElementById('themeName');
  const name = nameInput.value.trim();
  if (!name) return alert("Merci de saisir un nom de série");

  if (data.themes.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    return alert("Cette série existe déjà");
  }

  const { data: newTheme, error } = await supabaseClient
    .from('themes')
    .insert([{ name }])
    .select()
    .single();

  if (error) { console.error(error); return alert("Erreur création série"); }

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

  const { error } = await supabaseClient.from('themes').delete().eq('id', theme.id);
  if (error) { console.error(error); return alert("Erreur suppression série"); }

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

  if (!themeSelect.value) return alert("Sélectionnez une série");
  if (!wordInput.value.trim()) return alert("Saisissez le texte de la carte");
  if (!imageInput.files[0]) return alert("Sélectionnez une image");

  const themeId = themeSelect.value;
  const word = wordInput.value.trim();
  const imageFile = imageInput.files[0];
  const audioFile = audioInput.files[0] || null;

  const imageName = `${Date.now()}_${imageFile.name}`;
  const { error: imgError } = await supabaseClient.storage.from('cards').upload(imageName, imageFile);
  if (imgError) { console.error(imgError); return alert("Erreur upload image"); }

  let audioName = null;
  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audError } = await supabaseClient.storage.from('cards').upload(audioName, audioFile);
    if (audError) { console.error(audError); return alert("Erreur upload audio"); }
  }

  const { data: newCard, error: cardError } = await supabaseClient
    .from('cards')
    .insert([{ theme_id: themeId, word, image_url: imageName, audio_url: audioName, visible: true }])
    .select()
    .single();

  if (cardError) { console.error(cardError); return alert("Erreur création carte"); }

  console.log("Carte créée :", newCard.word);

  wordInput.value = '';
  imageInput.value = '';
  audioInput.value = '';
  document.querySelector('#imageInputWrapper .file-label').textContent = '🔎 Parcourir…';
  document.querySelector('#audioInputWrapper .file-label').textContent = '🔎 Parcourir…';

  await loadCards(themeId);
}

// ================================
// CHARGER CARTES
// ================================
async function loadCards(themeId) {
  const { data: cardsData, error } = await supabaseClient
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('id');

  if (error) { console.error(error); return; }

  data.cards = cardsData;
  renderCards();
}

// ================================
// AFFICHER LES CARTES
// ================================
function renderCards() {
  const cardsList = document.getElementById('cardsList');
  cardsList.innerHTML = '';

  data.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card-item';
    if (!card.visible) div.style.opacity = 0.5;

    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.value = card.word;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾';
    saveBtn.title = "Enregistrer modification";
    saveBtn.onclick = async () => {
      await supabaseClient.from('cards').update({ word: wordInput.value.trim() }).eq('id', card.id);
      loadCards(card.theme_id);
    };

    const img = document.createElement('img');
    img.src = supabaseClient.storage.from('cards').getPublicUrl(card.image_url).data.publicUrl;
    img.width = 100;

    const audioBtn = document.createElement('button');
    audioBtn.textContent = '🔊';
    audioBtn.onclick = () => {
      if (card.audio_url) {
        new Audio(supabaseClient.storage.from('cards').getPublicUrl(card.audio_url).data.publicUrl).play();
      } else {
        const utter = new SpeechSynthesisUtterance(card.word);
        utter.lang = 'en-GB'; utter.rate = 0.7;
        speechSynthesis.cancel(); speechSynthesis.speak(utter);
      }
    };

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = async () => {
      await supabaseClient.from('cards').update({ visible: !card.visible }).eq('id', card.id);
      loadCards(card.theme_id);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = async () => {
      if (!confirm("Supprimer cette carte ?")) return;
      await supabaseClient.from('cards').delete().eq('id', card.id);
      loadCards(card.theme_id);
    };

    div.appendChild(wordInput);
    div.appendChild(saveBtn);
    div.appendChild(img);
    div.appendChild(audioBtn);
    div.appendChild(toggleBtn);
    div.appendChild(deleteBtn);

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

  window.addCard = addCard;

  loadThemes();
});
