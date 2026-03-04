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
let data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

// ================================
// ÉLÉMENTS DOM
// ================================
const themeSelect = document.getElementById('themeSelect');
const deleteThemeBtn = document.getElementById('deleteThemeBtn');
const cardsList = document.getElementById('cardsList');

// ================================
// SAUVEGARDE
// ================================
function saveData() {
  const selectedTheme = themeSelect.value;
  localStorage.setItem('flashcards', JSON.stringify(data));
  refreshThemes();
  themeSelect.value = selectedTheme;
  refreshCards();
}

// ================================
// GESTION DES SÉRIES
// ================================
function addTheme() {
  const name = document.getElementById('themeName').value.trim();
  if (!name) return;

  const newTheme = {
    id: Date.now().toString(),
    name,
    cards: []
  };

  data.themes.push(newTheme);
  document.getElementById('themeName').value = '';
  saveData();

  themeSelect.value = newTheme.id;
  refreshCards();
}

function refreshThemes() {
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
// SUPPRESSION D'UNE SÉRIE
// ================================
deleteThemeBtn.onclick = () => {
  if (!themeSelect.value) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  if (confirm(`Voulez-vous vraiment supprimer la série "${theme.name}" et toutes ses cartes ?`)) {
    data.themes = data.themes.filter(t => t.id !== theme.id);
    saveData();
  }
};

themeSelect.onchange = refreshCards;

// ================================
// AJOUT DE CARTE MANUEL
// ================================
function addCard() {
  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const word = document.getElementById('wordInput').value.trim();
  const imageInput = document.querySelector('#imageInputWrapper input');
  const audioInput = document.querySelector('#audioInputWrapper input');

  if (!word || !imageInput.files[0]) return;

  const card = {
    word,
    image: null,
    audio: null,
    visible: true
  };

  const imgReader = new FileReader();
  imgReader.onload = e => {
    card.image = e.target.result;

    if (audioInput.files[0]) {
      handleAudioUpload(audioInput.files[0], card, theme);
    } else {
      theme.cards.push(card);
      saveData();
    }
  };

  imgReader.readAsDataURL(imageInput.files[0]);

  document.getElementById('wordInput').value = '';
  imageInput.value = '';
  audioInput.value = '';
}

// ================================
// AUDIO
// ================================
function handleAudioUpload(file, card, theme) {
  const reader = new FileReader();
  reader.onload = e => {
    card.audio = e.target.result;
    theme.cards.push(card);
    saveData();
  };
  reader.readAsDataURL(file);
}

// ================================
// AFFICHAGE CARTES
// ================================
function refreshCards() {
  cardsList.innerHTML = '';

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  theme.cards.forEach(card => {
    if (card.visible === undefined) card.visible = true;
  });

  theme.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';
    if (!card.visible) div.classList.add('card-hidden');

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = () => {
      card.visible = !card.visible;
      saveData();
    };

    div.appendChild(toggleBtn);
    cardsList.appendChild(div);
  });
}

// ================================
// INITIALISATION
// ================================
refreshThemes();
refreshCards();

// ================================
// IMPORT ZIP (images + audios)
// ================================
async function importZip(file, themeId) {
  if (!file || !themeId) return;

  const theme = data.themes.find(t => t.id === themeId);
  if (!theme) return;

  const zip = await JSZip.loadAsync(file);
  const files = Object.values(zip.files);

  let images = files.filter(f => !f.dir && /\.(png|jpg|jpeg|gif)$/i.test(f.name));
  const audios = files.filter(f => !f.dir && /\.(mp3|wav|ogg)$/i.test(f.name));

  // ✅ ordre stable
  images.sort((a, b) => a.name.localeCompare(b.name));

  for (const imgFile of images) {
    const baseName = imgFile.name.replace(/\.[^/.]+$/, "");

    const imgData = await imgFile.async("base64");
    const ext = imgFile.name.split('.').pop().toLowerCase();
    const mime = ext === "jpg" ? "jpeg" : ext;
    const base64Img = `data:image/${mime};base64,${imgData}`;

    const audioMatch = audios.find(a =>
      a.name.replace(/\.[^/.]+$/, "") === baseName
    );

    let base64Audio = null;
    if (audioMatch) {
      const audioData = await audioMatch.async("base64");
      const audioExt = audioMatch.name.split('.').pop();
      base64Audio = `data:audio/${audioExt};base64,${audioData}`;
    }

    const card = {
      word: baseName,
      image: base64Img,
      audio: base64Audio,
      visible: true
    };

    // === SUPABASE (optionnel) ===
    if (window.supabase) {
      const imgPath = `${themeId}/${imgFile.name}`;
      await supabase.storage.from('flashcards')
        .upload(imgPath, base64toBlob(base64Img), { upsert: true });

      card.image = supabase.storage
        .from('flashcards')
        .getPublicUrl(imgPath).data.publicUrl;

      if (audioMatch) {
        const audioPath = `${themeId}/${audioMatch.name}`;
        await supabase.storage.from('flashcards')
          .upload(audioPath, base64toBlob(base64Audio), { upsert: true });

        card.audio = supabase.storage
          .from('flashcards')
          .getPublicUrl(audioPath).data.publicUrl;
      }
    }

    theme.cards.push(card);
  }

  saveData();
  alert(`Import terminé : ${images.length} carte(s) ajoutée(s)`);
}

// ================================
// BASE64 → BLOB
// ================================
function base64toBlob(base64) {
  const [meta, data] = base64.split(',');
  const type = meta.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}
