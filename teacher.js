// ================================
// CONNEXION SUPABASE
// ================================
const supabaseUrl = "TON_URL_SUPABASE";  // exemple: https://abcd1234.supabase.co
const supabaseKey = "TA_CLE_ANON";       // récupérée dans Settings → API → anon public
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ================================
// RETOUR INTERFACE FLASHCARDS
// ================================
const backBtn = document.getElementById("backToFlashcardsBtn");
if (backBtn) {
  backBtn.onclick = () => {
    window.location.href = "./index.html";
  };
}

// ================================
// DONNÉES
// ================================
let data = { themes: [] };

// ================================
// ÉLÉMENTS DOM
// ================================
const themeSelect = document.getElementById('themeSelect');
const deleteThemeBtn = document.getElementById('deleteThemeBtn');
const cardsList = document.getElementById('cardsList');
const zipInput = document.getElementById("zipInput");

// ================================
// CHARGEMENT DES CARTES DEPUIS SUPABASE
// ================================
async function loadData() {
  const { data: cardsData, error } = await supabase.from('cards').select('*');

  if (error) {
    console.error("Erreur Supabase:", error);
    return;
  }

  const themesMap = {};
  cardsData.forEach(card => {
    const themeId = card.theme_id.toString();
    if (!themesMap[themeId]) {
      themesMap[themeId] = {
        id: themeId,
        name: `Série ${themeId}`,
        cards: []
      };
    }
    themesMap[themeId].cards.push({
      id: card.id, // utile pour update/delete dans Supabase
      word: card.word,
      image: card.image_url,
      audio: card.audio_url,
      visible: card.visible
    });
  });

  data.themes = Object.values(themesMap);
  refreshThemes();
  refreshCards();
}

// ================================
// SAUVEGARDE & UTILS
// ================================
function updateFileLabel(input) {
  const label = input.nextElementSibling;
  label.textContent = input.files.length > 0 ? input.files[0].name : '🔎 Parcourir…';
}

// ================================
// UPLOAD FICHIERS DANS SUPABASE
// ================================
async function uploadFile(file) {
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase
    .storage
    .from('cards')
    .upload(fileName, file, { upsert: true });

  if (error) {
    console.error("Erreur upload:", error);
    return null;
  }

  const publicUrl = supabase
    .storage
    .from('cards')
    .getPublicUrl(fileName).data.publicUrl;

  return publicUrl;
}

// ================================
// GESTION DES SÉRIES
// ================================
function addTheme() {
  const name = document.getElementById('themeName').value.trim();
  if (!name) return;

  // On génère un theme_id unique
  const themeId = Date.now();

  const newTheme = {
    id: themeId.toString(),
    name,
    cards: []
  };

  data.themes.push(newTheme);

  document.getElementById('themeName').value = '';
  refreshThemes();
  themeSelect.value = newTheme.id;
  refreshCards();
}

function refreshThemes() {
  const currentValue = themeSelect.value;
  themeSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Choix de la série —';
  placeholder.disabled = true;
  themeSelect.appendChild(placeholder);

  data.themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });

  if (currentValue && data.themes.some(t => t.id === currentValue)) {
    themeSelect.value = currentValue;
  } else {
    placeholder.selected = true;
  }
}

// ================================
// SUPPRESSION SÉRIE
// ================================
deleteThemeBtn.onclick = () => {
  if (!themeSelect.value) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  if (confirm(`Supprimer la série "${theme.name}" ?`)) {
    // Supprimer toutes les cartes associées dans Supabase
    theme.cards.forEach(card => {
      if (card.id) {
        supabase.from('cards').delete().eq('id', card.id);
      }
    });

    data.themes = data.themes.filter(t => t.id !== theme.id);
    refreshThemes();
    refreshCards();
  }
};

themeSelect.onchange = refreshCards;

// ================================
// AJOUT CARTE MANUELLE
// ================================
async function addCard() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const word = document.getElementById('wordInput').value.trim();
  const imageInput = document.querySelector('#imageInputWrapper input');
  const audioInput = document.querySelector('#audioInputWrapper input');
  if (!word || !imageInput.files[0]) return;

  const imageUrl = await uploadFile(imageInput.files[0]);
  const audioUrl = audioInput.files[0] ? await uploadFile(audioInput.files[0]) : null;

  // Inserer dans Supabase
  const { data: newCard, error } = await supabase.from('cards').insert([
    {
      theme_id: parseInt(themeSelect.value),
      word,
      image_url: imageUrl,
      audio_url: audioUrl,
      visible: true
    }
  ]).select().single();

  if (error) {
    console.error("Erreur ajout carte:", error);
    return;
  }

  theme.cards.push({
    id: newCard.id,
    word: newCard.word,
    image: newCard.image_url,
    audio: newCard.audio_url,
    visible: newCard.visible
  });

  // Reset inputs
  document.getElementById('wordInput').value = '';
  imageInput.value = '';
  audioInput.value = '';
  updateFileLabel(imageInput);
  updateFileLabel(audioInput);

  refreshCards();
}

// ================================
// AJOUT AUDIO SUR CARTE EXISTANTE
// ================================
async function addAudioToCard(index, file) {
  if (!file) return;
  const theme = data.themes.find(t => t.id === themeSelect.value);
  const card = theme.cards[index];

  const audioUrl = await uploadFile(file);

  // Mise à jour Supabase
  await supabase.from('cards').update({ audio_url: audioUrl }).eq('id', card.id);

  card.audio = audioUrl;
  refreshCards();
}

// ================================
// AFFICHAGE CARTES
// ================================
function refreshCards() {
  cardsList.innerHTML = '';
  const cardsTitle = document.getElementById('cardsTitle');

  if (!themeSelect.value) {
    cardsTitle.textContent = 'Cartes existantes';
    return;
  }

  const theme = data.themes.find(t => t.id === themeSelect.value);
  const count = theme.cards.length;
  cardsTitle.textContent = `${count} carte${count > 1 ? 's' : ''} existante${count > 1 ? 's' : ''}`;

  theme.cards.forEach((card, index) => {
    if (card.visible === undefined) card.visible = true;

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
    saveBtn.textContent = '💾 Enregistrer';
    saveBtn.onclick = async () => {
      card.word = wordInput.value.trim();
      await supabase.from('cards').update({ word: card.word }).eq('id', card.id);
      refreshCards();
    };

    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';

    const audioInfo = document.createElement('p');
    const audioText = document.createElement('span');
    audioText.textContent = card.audio ? 'Audio : oui ' : 'Audio : non (synthèse vocale GB par défaut) ';

    const playBtn = document.createElement('button');
    playBtn.textContent = "🔊";
    playBtn.onclick = () => {
      if (card.audio) {
        const audio = new Audio(card.audio);
        audio.play();
      } else {
        const utterance = new SpeechSynthesisUtterance(card.word);
        utterance.lang = "en-GB";
        utterance.rate = 0.7;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }
    };

    audioInfo.appendChild(audioText);
    audioInfo.appendChild(playBtn);

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';
    audioInput.onchange = () => addAudioToCard(index, audioInput.files[0]);

    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = async () => {
      if (index === 0) return;
      [theme.cards[index - 1], theme.cards[index]] = [theme.cards[index], theme.cards[index - 1]];
      await supabase.from('cards').update({ theme_id: theme.cards[index].id }).eq('id', theme.cards[index].id);
      refreshCards();
    };

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === theme.cards.length - 1;
    downBtn.onclick = async () => {
      if (index === theme.cards.length - 1) return;
      [theme.cards[index + 1], theme.cards[index]] = [theme.cards[index], theme.cards[index + 1]];
      await supabase.from('cards').update({ theme_id: theme.cards[index].id }).eq('id', theme.cards[index].id);
      refreshCards();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = async () => {
      await supabase.from('cards').delete().eq('id', card.id);
      theme.cards.splice(index, 1);
      refreshCards();
    };

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = async () => {
      card.visible = !card.visible;
      await supabase.from('cards').update({ visible: card.visible }).eq('id', card.id);
      refreshCards();
    };

    // Ajout des éléments
    div.appendChild(number);
    const editRow = document.createElement('div');
    editRow.style.display = "flex";
    editRow.style.alignItems = "center";
    editRow.style.gap = "6px";
    editRow.appendChild(wordInput);
    editRow.appendChild(saveBtn);
    div.appendChild(editRow);

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(deleteBtn);
    div.appendChild(toggleBtn);

    const mediaRow = document.createElement('div');
    mediaRow.style.display = "flex";
    mediaRow.style.alignItems = "center";
    mediaRow.style.gap = "10px";
    mediaRow.appendChild(img);
    mediaRow.appendChild(audioInfo);
    div.appendChild(mediaRow);

    const replaceAudioLabel = document.createElement('span');
    replaceAudioLabel.textContent = "Remplacer l'audio : ";
    replaceAudioLabel.style.fontSize = "0.8em";
    div.appendChild(replaceAudioLabel);
    div.appendChild(audioInput);

    cardsList.appendChild(div);
  });
}

// ================================
// IMPORT ZIP
// ================================
async function importZipFromInput() {
  if (!zipInput.files.length || !themeSelect.value) {
    alert("Sélectionne une série et un fichier ZIP.");
    return;
  }
  importZip(zipInput.files[0], themeSelect.value);
  zipInput.value = '';
}

async function importZip(file, themeId) {
  const theme = data.themes.find(t => t.id === themeId);
  const zip = await JSZip.loadAsync(file);

  const images = {};
  const audios = {};
  const tasks = [];

  zip.forEach((path, entry) => {
    if (entry.dir) return;
    if (path.startsWith("__MACOSX")) return;

    const filename = path.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    const name = filename.replace(/\.[^/.]+$/, "");

    if (["jpg","jpeg","png","gif","webp"].includes(ext)) {
      tasks.push(entry.async("base64").then(data64 => {
        const mime = ext === "jpg" ? "jpeg" : ext;
        images[name] = `data:image/${mime};base64,${data64}`;
      }));
    }
    if (["mp3","wav","ogg","m4a"].includes(ext)) {
      tasks.push(entry.async("base64").then(data64 => {
        audios[name] = `data:audio/${ext};base64,${data64}`;
      }));
    }
  });

  await Promise.all(tasks);

  let added = 0;
  for (const name of Object.keys(images)) {
    const imageUrl = await uploadFileBase64(images[name], name); // helper à créer si besoin
    const audioUrl = audios[name] ? await uploadFileBase64(audios[name], name) : null;

    const { data: newCard, error } = await supabase.from('cards').insert([
      { theme_id: parseInt(themeId), word: name, image_url: imageUrl, audio_url: audioUrl, visible: true }
    ]).select().single();

    if (!error) {
      theme.cards.push({ id: newCard.id, word: name, image: imageUrl, audio: audioUrl, visible: true });
      added++;
    }
  }

  refreshCards();
  alert(`${added} carte(s) importée(s)`);
}

// ================================
// INITIALISATION
// ================================
loadData();
refreshThemes();
refreshCards();
