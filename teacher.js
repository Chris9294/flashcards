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

  const exists = data.themes.some(t => t.name.toLowerCase() === name.toLowerCase());
  if (exists) { alert("Cette série existe déjà"); return; }

  const { data: newTheme, error } = await supabaseClient
    .from('themes')
    .insert([{ name }])
    .select()
    .single();

  if (error) { console.error("Erreur création série :", error); alert("Erreur création série"); return; }

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
  if (error) { console.error("Erreur suppression série :", error); alert("Erreur suppression série"); return; }

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
  if (imgError) { console.error("Erreur upload image:", imgError); alert("Erreur upload image"); return; }

  let audioName = null;
  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audError } = await supabaseClient.storage.from('cards').upload(audioName, audioFile);
    if (audError) { console.error("Erreur upload audio:", audError); alert("Erreur upload audio"); return; }
  }

  // Déterminer la position max actuelle pour la série
  const { data: maxPosData } = await supabaseClient.from('cards')
    .select('position')
    .eq('theme_id', themeId)
    .order('position', { ascending: false })
    .limit(1);

  const position = maxPosData.length ? maxPosData[0].position + 1 : 1;

  // Insert card
  const { data: newCard, error: cardError } = await supabaseClient.from('cards')
    .insert([{ theme_id: themeId, word, image_url: imageName, audio_url: audioName, visible: true, position }])
    .select()
    .single();

  if (cardError) { console.error("Erreur création carte:", cardError); alert("Erreur création carte"); return; }

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
  const { data: cardsData, error } = await supabaseClient.from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('position');

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

  data.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';
    if (!card.visible) div.classList.add('card-hidden');

    const number = document.createElement('div');
    number.textContent = `Carte ${index + 1}`;
    number.style.fontWeight = 'bold';
    number.style.color = '#ff6f61';

    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.value = card.word;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾';
    saveBtn.onclick = async () => {
      await supabaseClient.from('cards').update({ word: wordInput.value.trim() }).eq('id', card.id);
      loadCards(card.theme_id);
    };

    const img = document.createElement('img');
    img.src = supabaseClient.storage.from('cards').getPublicUrl(card.image_url).data.publicUrl;

    const audioInfo = document.createElement('p');
    const audioText = document.createElement('span');
    audioText.textContent = card.audio_url ? 'Audio : oui ' : 'Audio : non (synthèse vocale GB)';
    const playBtn = document.createElement('button');
    playBtn.textContent = "🔊";
    playBtn.onclick = () => {
      if (card.audio_url) {
        new Audio(supabaseClient.storage.from('cards').getPublicUrl(card.audio_url).data.publicUrl).play();
      } else {
        const utter = new SpeechSynthesisUtterance(card.word);
        utter.lang = 'en-GB';
        utter.rate = 0.7;
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
      }
    };
    audioInfo.appendChild(audioText);
    audioInfo.appendChild(playBtn);

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';
    audioInput.onchange = async () => {
      if (!audioInput.files[0]) return;
      const newName = `${Date.now()}_${audioInput.files[0].name}`;
      const { error } = await supabaseClient.storage.from('cards').upload(newName, audioInput.files[0]);
      if (!error) {
        await supabaseClient.from('cards').update({ audio_url: newName }).eq('id', card.id);
        loadCards(card.theme_id);
      }
    };

    // Boutons déplacer
    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = async () => moveCard(card.id, card.position, 'up');

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === data.cards.length - 1;
    downBtn.onclick = async () => moveCard(card.id, card.position, 'down');

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = async () => {
      if (!confirm('Supprimer cette carte ?')) return;
      await supabaseClient.from('cards').delete().eq('id', card.id);
      loadCards(card.theme_id);
    };

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = async () => {
      await supabaseClient.from('cards').update({ visible: !card.visible }).eq('id', card.id);
      loadCards(card.theme_id);
    };

    div.appendChild(number);
    const editRow = document.createElement('div');
    editRow.style.display = 'flex';
    editRow.style.gap = '6px';
    editRow.appendChild(wordInput);
    editRow.appendChild(saveBtn);
    div.appendChild(editRow);

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(deleteBtn);
    div.appendChild(toggleBtn);

    const mediaRow = document.createElement('div');
    mediaRow.style.display = 'flex';
    mediaRow.style.gap = '10px';
    mediaRow.appendChild(img);
    mediaRow.appendChild(audioInfo);
    div.appendChild(mediaRow);

    const replaceAudioLabel = document.createElement('span');
    replaceAudioLabel.textContent = "Remplacer l'audio : ";
    replaceAudioLabel.style.fontSize = '0.8em';
    div.appendChild(replaceAudioLabel);
    div.appendChild(audioInput);

    cardsList.appendChild(div);
  });
}

// ================================
// DÉPLACER UNE CARTE
// ================================
async function moveCard(cardId, position, direction) {
  const themeId = document.getElementById('themeSelect').value;
  if (!themeId) return;

  let targetPos = direction === 'up' ? position - 1 : position + 1;

  const { data: targetCard } = await supabaseClient.from('cards')
    .select('id')
    .eq('theme_id', themeId)
    .eq('position', targetPos)
    .single();

  if (!targetCard) return;

  // Échanger les positions
  await supabaseClient.from('cards').update({ position: targetPos }).eq('id', cardId);
  await supabaseClient.from('cards').update({ position: position }).eq('id', targetCard.id);

  loadCards(themeId);
}


// ================================
// IMPORT ZIP
// ================================
async function importZip(file, themeId) {
  const zip = await JSZip.loadAsync(file);
  const images = {};
  const audios = {};

  // Extraire fichiers
  const tasks = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const filename = path.split('/').pop();
    if (filename.startsWith("._") || filename.startsWith("__MACOSX")) return; // Ignorer doublons macOS

    const ext = filename.split('.').pop().toLowerCase();
    const name = filename.replace(/\.[^/.]+$/, ""); // nom sans extension

    if (["jpg","jpeg","png","gif","webp"].includes(ext)) {
      tasks.push(entry.async("blob").then(blob => images[name] = blob));
    } else if (["mp3","wav","ogg","m4a"].includes(ext)) {
      tasks.push(entry.async("blob").then(blob => audios[name] = blob));
    }
  });

  await Promise.all(tasks);

  // Créer les cartes
  for (const name in images) {
    const imgFile = images[name];
    const imgExt = imgFile.type.split("/")[1];
    const imgName = `${Date.now()}_${name}.${imgExt}`;
    await supabaseClient.storage.from('cards').upload(imgName, imgFile);

    let audioName = null;
    if (audios[name]) {
      const audFile = audios[name];
      const audExt = audFile.type.split("/")[1];
      audioName = `${Date.now()}_${name}.${audExt}`;
      await supabaseClient.storage.from('cards').upload(audioName, audFile);
    }

    // Position max pour la série
    const { data: maxPosData } = await supabaseClient.from('cards')
      .select('position')
      .eq('theme_id', themeId)
      .order('position', { ascending: false })
      .limit(1);

    const position = maxPosData.length ? maxPosData[0].position + 1 : 1;

    await supabaseClient.from('cards').insert([{
      theme_id: themeId,
      word: name,
      image_url: imgName,
      audio_url: audioName,
      visible: true,
      position
    }]);
  }

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

  loadThemes();
});
