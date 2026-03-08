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

function refreshThemes() {
  const themeSelect = document.getElementById('themeSelect');
  themeSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Choix de la série —';
  placeholder.disabled = true; placeholder.selected = true;
  themeSelect.appendChild(placeholder);
  data.themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });
}

// ================================
// AJOUT / SUPPRESSION DE SÉRIE
// ================================
async function addTheme() {
  const name = document.getElementById('themeName').value.trim();
  if (!name) { alert("Merci de saisir un nom de série"); return; }
  if (data.themes.some(t => t.name.toLowerCase() === name.toLowerCase())) { alert("Cette série existe déjà"); return; }

  const { data: newTheme, error } = await supabaseClient.from('themes').insert([{ name }]).select().single();
  if (error) { console.error(error); alert("Erreur création série"); return; }
  data.themes.push({ id: newTheme.id.toString(), name: newTheme.name });
  document.getElementById('themeName').value = '';
  refreshThemes();
}

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

  const imageName = `${Date.now()}_${imageFile.name}`;
  const { error: imgError } = await supabaseClient.storage.from('cards').upload(imageName, imageFile);
  if (imgError) { console.error(imgError); alert("Erreur upload image"); return; }

  let audioName = null;
  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audError } = await supabaseClient.storage.from('cards').upload(audioName, audioFile);
    if (audError) { console.error(audError); alert("Erreur upload audio"); return; }
  }

  const { data: newCard, error: cardError } = await supabaseClient.from('cards').insert([{
    theme_id: themeId,
    word,
    image_url: imageName,
    audio_url: audioName,
    visible: true
  }]).select().single();

  if (cardError) { console.error(cardError); alert("Erreur création carte"); return; }

  wordInput.value = '';
  imageInput.value = '';
  audioInput.value = '';
  document.querySelector('#imageInputWrapper .file-label').textContent = '🔎 Parcourir…';
  document.querySelector('#audioInputWrapper .file-label').textContent = '🔎 Parcourir…';

  await loadCards(themeId);
}

// ================================
// CHARGER / AFFICHER LES CARTES
// ================================
async function loadCards(themeId) {
  const { data: cardsData, error } = await supabaseClient.from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('position', { ascending: true });

  if (error) { console.error(error); return; }
  data.cards = cardsData;
  renderCards();
}

function renderCards() {
  const cardsList = document.getElementById('cardsList');
  cardsList.innerHTML = '';

  data.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';
    const imgUrl = supabaseClient.storage.from('cards').getPublicUrl(card.image_url).data.publicUrl;

    div.innerHTML = `
      <div><strong>${card.word}</strong></div>
      <div><img src="${imgUrl}" width="100"></div>
      <div>
        ${card.audio_url ? `<audio controls src="${supabaseClient.storage.from('cards').getPublicUrl(card.audio_url).data.publicUrl}"></audio>` : ''}
      </div>
    `;

    // Boutons déplacement
    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => swapCards(index, index - 1);

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === data.cards.length - 1;
    downBtn.onclick = () => swapCards(index, index + 1);

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    cardsList.appendChild(div);
  });
}

// ================================
// DÉPLACER 2 CARTES
// ================================
async function swapCards(i, j) {
  const temp = data.cards[i].position;
  data.cards[i].position = data.cards[j].position;
  data.cards[j].position = temp;

  await supabaseClient.from('cards').update({ position: data.cards[i].position }).eq('id', data.cards[i].id);
  await supabaseClient.from('cards').update({ position: data.cards[j].position }).eq('id', data.cards[j].id);

  loadCards(data.cards[i].theme_id);
}

// ================================
// IMPORT ZIP
// ================================
async function importZip(file, themeId) {
  const zip = await JSZip.loadAsync(file);
  const tasks = [];
  const images = {};
  const audios = {};

  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const filename = path.split('/').pop();
    if (filename.startsWith("__MACOSX") || filename.startsWith("._")) return;

    const ext = filename.split('.').pop().toLowerCase();
    const name = filename.replace(/\.[^/.]+$/, "");

    if (["jpg","jpeg","png","gif","webp"].includes(ext)) tasks.push(entry.async("blob").then(blob => images[name] = blob));
    if (["mp3","wav","ogg","m4a"].includes(ext)) tasks.push(entry.async("blob").then(blob => audios[name] = blob));
  });

  await Promise.all(tasks);

  for (const name in images) {
    const imgFile = images[name];
    const imgExt = imgFile.type.split("/")[1] || "png";
    const imgName = `${Date.now()}_${name}.${imgExt}`;
    const { error: imgError } = await supabaseClient.storage.from('cards').upload(imgName, imgFile);
    if (imgError) { console.error(imgError); continue; }

    let audioName = null;
    if (audios[name]) {
      const audFile = audios[name];
      const audExt = audFile.type.split("/")[1] || "mp3";
      audioName = `${Date.now()}_${name}.${audExt}`;
      const { error: audError } = await supabaseClient.storage.from('cards').upload(audioName, audFile);
      if (audError) { console.error(audError); audioName = null; }
    }

    await supabaseClient.from('cards').insert([{
      theme_id: themeId,
      word: name,
      image_url: imgName,
      audio_url: audioName,
      visible: true
    }]);
  }

  alert(`Import terminé (${Object.keys(images).length} cartes)`);
  await loadCards(themeId);
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
