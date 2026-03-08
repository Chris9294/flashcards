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
  if (!name) { alert("Merci de saisir un nom de série"); return; }

  if (data.themes.some(t => t.name.toLowerCase() === name.toLowerCase())) { alert("Cette série existe déjà"); return; }

  const { data: newTheme, error } = await supabaseClient
    .from('themes')
    .insert([{ name }])
    .select()
    .single();

  if (error) { console.error(error); alert("Erreur création série"); return; }

  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name });
  nameInput.value = '';
  refreshThemes();
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
  if (error) { console.error(error); alert("Erreur suppression série"); return; }

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
  const word = wordInput.value.trim();
  const imageFile = imageInput.files[0];
  const audioFile = audioInput.files[0] || null;

  // Upload image
  const imageName = `${Date.now()}_${imageFile.name}`;
  const { error: imgError } = await supabaseClient.storage.from('cards').upload(imageName, imageFile);
  if (imgError) { console.error(imgError); alert("Erreur upload image"); return; }

  // Upload audio si présent
  let audioName = null;
  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audError } = await supabaseClient.storage.from('cards').upload(audioName, audioFile);
    if (audError) { console.error(audError); alert("Erreur upload audio"); return; }
  }

  // Récupérer max position actuelle
  const { data: maxPosData, error: maxPosError } = await supabaseClient
    .from('cards')
    .select('position')
    .eq('theme_id', themeId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const newPosition = maxPosData ? maxPosData.position + 1 : 1;

  const { data: newCard, error: cardError } = await supabaseClient
    .from('cards')
    .insert([{ theme_id: themeId, word, image_url: imageName, audio_url: audioName, visible: true, position: newPosition }])
    .select()
    .single();

  if (cardError) { console.error(cardError); alert("Erreur création carte"); return; }

  // Reset form
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
    .order('position', { ascending: true });

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
    div.innerHTML = `
      <strong>${card.word}</strong><br>
      <img src="${supabaseClient.storage.from('cards').getPublicUrl(card.image_url).data.publicUrl}" width="100"><br>
      ${card.audio_url ? `<audio controls src="${supabaseClient.storage.from('cards').getPublicUrl(card.audio_url).data.publicUrl}"></audio>` : ''}
    `;

    // Boutons déplacer
    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => swapPositions(card, data.cards[index - 1]);

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === data.cards.length - 1;
    downBtn.onclick = () => swapPositions(card, data.cards[index + 1]);

    div.appendChild(upBtn);
    div.appendChild(downBtn);

    cardsList.appendChild(div);
  });
}

// ================================
// ÉCHANGER LES POSITIONS DE 2 CARTES
// ================================
async function swapPositions(cardA, cardB) {
  const posA = cardA.position;
  const posB = cardB.position;

  // Mettre à jour dans Supabase
  const { error: errA } = await supabaseClient.from('cards').update({ position: posB }).eq('id', cardA.id);
  const { error: errB } = await supabaseClient.from('cards').update({ position: posA }).eq('id', cardB.id);

  if (errA || errB) { console.error(errA || errB); return; }

  // Mettre à jour localement
  [cardA.position, cardB.position] = [cardB.position, cardA.position];

  // Recharger l'affichage
  renderCards();
}

// ================================
// INITIALISATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addThemeBtn').addEventListener('click', addTheme);
  document.getElementById('deleteThemeBtn').addEventListener('click', deleteTheme);
  document.getElementById('themeSelect').addEventListener('change', e => loadCards(e.target.value));

  window.addCard = addCard;
  loadThemes();
});
