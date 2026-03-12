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
// MENU OUTILS FLASHCARDS
// ================================
function createToolsDropdown() {

  const container = document.getElementById('toolsDropdownContainer');
  if (!container) return;

  container.style.position = "relative";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "10px";

  // -------- Menu Outils --------
  const button = document.createElement("button");
  button.textContent = "🛠 Outils Flashcards";
  button.style.padding = "5px 10px";
  button.style.borderRadius = "6px";
  button.style.border = "none";
  button.style.backgroundColor = "#ffcc80";
  button.style.cursor = "pointer";

  const menu = document.createElement("div");
  menu.style.position = "absolute";
  menu.style.right = "0";
  menu.style.top = "35px";
  menu.style.background = "#fff";
  menu.style.border = "1px solid #ffcc80";
  menu.style.borderRadius = "8px";
  menu.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
  menu.style.display = "none";
  menu.style.minWidth = "220px";

  const tools = [
    { name: "🎨 Générer image IA (Adobe Firefly)", url: "https://firefly.adobe.com/" },
    { name: "✂️ Supprimer fond (Remove.bg)", url: "https://www.remove.bg/fr" },
    { name: "🔊 Générer audio (LazyPy TTS)", url: "https://lazypy.ro/tts/?voice=en-gb&service=Google%20Translate&text=It%27s%20rainy&lang=English&g=A" }
  ];

  tools.forEach(tool => {
    const item = document.createElement("div");
    item.textContent = tool.name;
    item.style.padding = "8px 10px";
    item.style.cursor = "pointer";
    item.onmouseover = () => item.style.background = "#fff3e0";
    item.onmouseout = () => item.style.background = "#fff";
    item.onclick = () => {
      window.open(tool.url, "_blank");
      menu.style.display = "none";
    };
    menu.appendChild(item);
  });

  button.onclick = () => {
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  };

  document.addEventListener("click", e => {
    if (!container.contains(e.target)) {
      menu.style.display = "none";
    }
  });

  container.appendChild(button);
  container.appendChild(menu);

  // -------- Générateur de prompt Firefly --------
  const fireflyContainer = document.createElement('div');
  fireflyContainer.style.display = 'inline-flex';
  fireflyContainer.style.alignItems = 'center';
  fireflyContainer.style.gap = '5px';

  const fireflyInput = document.createElement('input');
  fireflyInput.type = 'text';
  fireflyInput.placeholder = 'Sujet du clipart...';
  fireflyInput.style.padding = '4px 6px';
  fireflyInput.style.borderRadius = '6px';
  fireflyInput.style.border = '1px solid #ccc';

  const fireflyBtn = document.createElement('button');
  fireflyBtn.textContent = '🎨 Firefly';
  fireflyBtn.style.padding = '5px 8px';
  fireflyBtn.style.borderRadius = '6px';
  fireflyBtn.style.border = 'none';
  fireflyBtn.style.backgroundColor = '#ffcc80';
  fireflyBtn.style.cursor = 'pointer';

  fireflyBtn.onclick = () => {
    const prompt = fireflyInput.value.trim();
    if (!prompt) {
      alert('Saisis un sujet pour générer le clipart !');
      return;
    }
    const url = `https://firefly.adobe.com/?prompt=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank');
  };

  fireflyContainer.appendChild(fireflyInput);
  fireflyContainer.appendChild(fireflyBtn);
  container.appendChild(fireflyContainer);
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
// REMPLACER L'IMAGE D'UNE CARTE
// ================================
async function replaceImageOfCard(index, file) {
  const card = data.cards[index];
  if (!card || !file) return;

  const imageName = `${Date.now()}_${file.name}`;

  const { error } = await supabaseClient.storage
    .from('cards')
    .upload(imageName, file, { upsert: true });

  if (error) { 
    console.error("Erreur upload image :", error); 
    alert("Erreur upload image"); 
    return; 
  }

  const { error: dbError } = await supabaseClient
    .from('cards')
    .update({ image_url: imageName })
    .eq('id', card.id);

  if (dbError) { 
    console.error("Erreur mise à jour image :", dbError); 
    alert("Erreur mise à jour image"); 
    return; 
  }

  card.image_url = imageName;
  renderCards();
}

// ================================
// REMPLACER L'AUDIO D'UNE CARTE
// ================================
async function addAudioToCard(index, file) {
  const card = data.cards[index];
  if (!card) return;

  const audioName = `${Date.now()}_${file.name}`;
  const { error } = await supabaseClient.storage.from('cards').upload(audioName, file, { upsert: true });
  if (error) { console.error("Erreur upload audio :", error); alert("Erreur upload audio"); return; }

  const { error: dbError } = await supabaseClient.from('cards').update({ audio_url: audioName }).eq('id', card.id);
  if (dbError) { console.error("Erreur mise à jour audio :", dbError); alert("Erreur mise à jour audio"); return; }

  card.audio_url = audioName;
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
    div.appendChild(number);

    const editRow = document.createElement('div');
    editRow.style.display = 'flex';
    editRow.style.gap = '6px';

    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.value = card.word;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾';
    saveBtn.onclick = async () => {
      await supabaseClient.from('cards').update({ word: wordInput.value.trim() }).eq('id', card.id);
      loadCards(card.theme_id);
    };

    editRow.appendChild(wordInput);
    editRow.appendChild(saveBtn);
    div.appendChild(editRow);

    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveCard(card.id, 'up');

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === data.cards.length - 1;
    downBtn.onclick = () => moveCard(card.id, 'down');

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = async () => {
      if (!confirm('Supprimer cette carte ?')) return;
      await supabaseClient.from('cards').delete().eq('id', card.id);
      await loadCards(card.theme_id);
      loadThemes();
    };

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = async () => {
      await supabaseClient.from('cards').update({ visible: !card.visible }).eq('id', card.id);
      loadCards(card.theme_id);
    };

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(deleteBtn);
    div.appendChild(toggleBtn);

    const img = document.createElement('img');
img.src = supabaseClient.storage.from('cards').getPublicUrl(card.image_url).data.publicUrl;
img.style.cursor = "pointer";
img.title = "✏️ Remplacer l'image";

const imgInput = document.createElement('input');
imgInput.type = "file";
imgInput.accept = "image/*";
imgInput.style.display = "none";
imgInput.onchange = () => replaceImageOfCard(index, imgInput.files[0]);

img.onclick = () => imgInput.click();

    const audioInfo = document.createElement('p');
    const audioText = document.createElement('span');
    audioText.textContent = card.audio_url ? 'Audio : oui ' : 'Audio : non (synthèse vocale GB)';

    const playBtn = document.createElement('button');
    playBtn.textContent = '🔊';
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
    audioInput.onchange = () => addAudioToCard(index, audioInput.files[0]);

    const replaceAudioLabel = document.createElement('span');
    replaceAudioLabel.textContent = 'Remplacer l’audio : ';
    replaceAudioLabel.style.fontSize = '0.8em';

    const mediaRow = document.createElement('div');
    mediaRow.style.display = 'flex';
    mediaRow.style.gap = '10px';
    mediaRow.appendChild(img);
    mediaRow.appendChild(audioInfo);

    div.appendChild(mediaRow);
    div.appendChild(imgInput);
    div.appendChild(replaceAudioLabel);
    div.appendChild(audioInput);

    cardsList.appendChild(div);
  });
}

// ================================
// DÉPLACER UNE CARTE (optimisé pour positions consécutives)
// ================================
async function moveCard(cardId, direction) {
  const themeId = document.getElementById('themeSelect').value;
  if (!themeId) return;

  // Récupérer toutes les cartes de la série triées par position
  const { data: cardsData } = await supabaseClient
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('position', { ascending: true });

  if (!cardsData || cardsData.length === 0) return;

  const index = cardsData.findIndex(c => c.id === cardId);
  if (index === -1) return;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= cardsData.length) return;

  // Échanger les cartes dans le tableau
  [cardsData[index], cardsData[swapIndex]] = [cardsData[swapIndex], cardsData[index]];

  // Réassigner des positions consécutives
  for (let i = 0; i < cardsData.length; i++) {
    cardsData[i].position = i + 1; // positions 1,2,3,...
  }

  // Mettre à jour toutes les cartes dans la DB en une seule boucle
  for (const card of cardsData) {
    await supabaseClient.from('cards')
      .update({ position: card.position })
      .eq('id', card.id);
  }

  // Recharger l'affichage
  loadCards(themeId);
}

// ================================
// IMPORT ZIP
// ================================
async function importZipFromInput() {
  const input = document.getElementById("zipInput");
  const themeId = document.getElementById("themeSelect").value;

  if (!themeId) { 
    alert("Veuillez sélectionner une série"); 
    return; 
  }
  if (!input.files.length) { 
    alert("Veuillez sélectionner un fichier ZIP"); 
    return; 
  }

  await importZip(input.files[0], themeId);
  input.value = "";
}

async function importZip(file, themeId) {
  const zip = await JSZip.loadAsync(file);
  const images = {};
  const audios = {};
  const tasks = [];

  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const filename = path.split('/').pop();
    if (filename.startsWith("._") || filename.startsWith("__MACOSX")) return;
    const ext = filename.split('.').pop().toLowerCase();
    const name = filename.replace(/\.[^/.]+$/, "");

    if (["jpg","jpeg","png","gif","webp"].includes(ext)) 
      tasks.push(entry.async("blob").then(blob => images[name] = blob));
    else if (["mp3","wav","ogg","m4a"].includes(ext)) 
      tasks.push(entry.async("blob").then(blob => audios[name] = blob));
  });

  await Promise.all(tasks);

  const { data: maxPosData } = await supabaseClient
    .from('cards')
    .select('position')
    .eq('theme_id', themeId)
    .order('position', { ascending: false })
    .limit(1);

  let nextPos = maxPosData.length ? maxPosData[0].position + 1 : 1;
  let addedCount = 0; // compteur pour le message

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

    await supabaseClient.from('cards').insert([{
      theme_id: themeId,
      word: name,
      image_url: imgName,
      audio_url: audioName,
      visible: true,
      position: nextPos
    }]);

    nextPos++;
    addedCount++;
  }

  await loadCards(themeId);
  loadThemes();

  // --- petit message d'information ---
  const themeName = data.themes.find(t => t.id === themeId)?.name || "la série";
  if (addedCount > 0) 
    alert(`${addedCount} image${addedCount > 1 ? 's' : ''} ajoutée${addedCount > 1 ? 's' : ''} dans ${themeName}`);
}
// ================================
// INITIALISATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addThemeBtn').addEventListener('click', addTheme);
  document.getElementById('deleteThemeBtn').addEventListener('click', deleteTheme);
  document.getElementById('themeSelect').addEventListener('change', e => loadCards(e.target.value));
  document.getElementById("backToFlashcardsBtn").addEventListener("click", () => { window.location.href = "index.html"; });

  window.addCard = addCard;
  loadThemes();

  document.querySelectorAll('.file-wrapper input[type="file"]').forEach(input => {
    const label = input.nextElementSibling;
    input.addEventListener('change', () => { label.textContent = input.files.length > 0 ? input.files[0].name : 'Parcourir…'; });
  });
   // ← Ici tu ajoutes la ligne pour créer le menu
  createToolsDropdown();
});
function createToolsDropdown() {

  const container = document.getElementById('toolsDropdownContainer');
  if (!container) return;

  container.innerHTML = '';
  container.style.position = "relative";

  const button = document.createElement('button');
  button.textContent = "🛠 Outils Flashcards";

  const menu = document.createElement('div');
  menu.style.position = "absolute";
  menu.style.right = "0";
  menu.style.top = "36px";
  menu.style.background = "#fff";
  menu.style.border = "1px solid #ffcc80";
  menu.style.borderRadius = "8px";
  menu.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
  menu.style.display = "none";
  menu.style.minWidth = "230px";
  menu.style.zIndex = "1000";

  const tools = [
    {
      name: "🎨 Générer image IA (Adobe Firefly)",
      url: "https://firefly.adobe.com/"
    },
    {
      name: "✂️ Supprimer fond (Remove.bg)",
      url: "https://www.remove.bg/fr"
    },
    {
      name: "🔊 Générer audio (LazyPy TTS)",
      url: "https://lazypy.ro/tts/?voice=en-gb&service=Google%20Translate&text=It%27s%20rainy&lang=English&g=A"
    }
  ];

  tools.forEach(tool => {

    const item = document.createElement("div");
    item.textContent = tool.name;
    item.style.padding = "8px 10px";
    item.style.cursor = "pointer";

    item.onmouseover = () => item.style.background = "#fff3e0";
    item.onmouseout = () => item.style.background = "#fff";

    item.onclick = () => {
      window.open(tool.url, "_blank");
      menu.style.display = "none";
    };

    menu.appendChild(item);

  });

  button.onclick = () => {
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  };

  document.addEventListener("click", e => {
    if (!container.contains(e.target)) menu.style.display = "none";
  });

  container.appendChild(button);
  container.appendChild(menu);
}
