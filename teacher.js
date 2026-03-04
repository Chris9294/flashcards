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
  const selectedTheme = themeSelect.value; // mémorise la série courante
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
    name: name,
    cards: []
  };

  data.themes.push(newTheme);
  document.getElementById('themeName').value = '';
  saveData();

  // sélectionner automatiquement la nouvelle série
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
// AJOUT DE CARTE
// ================================
function addCard() {
  const themeId = themeSelect.value;
  const theme = data.themes.find(t => t.id === themeId);
  if (!theme) return;

  const word = document.getElementById('wordInput').value.trim();
  const imageInput = document.getElementById('imageInputWrapper').querySelector('input[type="file"]');
  const audioInput = document.getElementById('audioInputWrapper').querySelector('input[type="file"]');

  const imageFile = imageInput.files[0];
  const audioFile = audioInput.files[0];

  if (!word || !imageFile) return;

  const card = {
    word,
    image: null,
    audio: null,
    visible: true   // ✅ nouvelle propriété visible par défaut
  };

  const imgReader = new FileReader();
  imgReader.onload = function(e) {
    card.image = e.target.result;

    if (audioFile) {
      handleAudioUpload(audioFile, card, theme);
    } else {
      theme.cards.push(card);
      saveData();
    }
  };
  imgReader.readAsDataURL(imageFile);

  // ================================
  // RESET INPUTS ET LABELS
  // ================================
  document.getElementById('wordInput').value = '';
  imageInput.value = '';
  audioInput.value = '';

  const imageLabel = document.getElementById('imageInputWrapper').querySelector('.file-label');
  const audioLabel = document.getElementById('audioInputWrapper').querySelector('.file-label');
  imageLabel.textContent = 'Parcourir…';
  audioLabel.textContent = 'Parcourir…';
}

// ================================
// AUDIO À LA CRÉATION
// ================================
function handleAudioUpload(file, card, theme) {
  const reader = new FileReader();
  reader.onload = function(e) {
    card.audio = e.target.result;
    theme.cards.push(card);
    saveData();
  };
  reader.readAsDataURL(file);
}

// ================================
// AUDIO SUR CARTE EXISTANTE
// ================================
function addAudioToCard(cardIndex, file) {
  if (!file) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    theme.cards[cardIndex].audio = e.target.result;
    saveData();
  };
  reader.readAsDataURL(file);
}

// ================================
// AFFICHAGE DES CARTES
// ================================
function refreshCards() {
  cardsList.innerHTML = '';

  const cardsTitle = document.getElementById('cardsTitle');
  if (!themeSelect.value) {
    cardsTitle.textContent = 'Cartes existantes';
    return;
  }

  const theme = data.themes.find(t => t.id === themeSelect.value);
  if (!theme) return;

  // Sécurité : les anciennes cartes sans "visible"
  theme.cards.forEach(card => {
    if (card.visible === undefined) card.visible = true;
  });

  const count = theme.cards.length;
  cardsTitle.textContent = `${count} carte${count > 1 ? 's' : ''} existante${count > 1 ? 's' : ''}`;

  theme.cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card';

    if (!card.visible) {
      div.classList.add('card-hidden');  // ✅ griser si masquée
    }

    // Numéro carte
    const number = document.createElement('div');
    number.textContent = `Carte ${index + 1}`;
    number.style.fontWeight = 'bold';
    number.style.color = '#ff6f61';
    number.style.marginBottom = '4px';
    div.appendChild(number);

    // Texte modifiable
    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.value = card.word;
    wordInput.style.fontSize = '16px';
    wordInput.style.width = '200px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Enregistrer';
    saveBtn.onclick = () => {
      card.word = wordInput.value.trim();
      saveData();
    };

    // Image
    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';
    img.style.display = 'block';
    img.style.marginTop = '5px';

    // Info audio
    const audioInfo = document.createElement('p');
    audioInfo.textContent = card.audio ? 'Audio : oui' : 'Audio : non';

    // Input audio
    const audioWrapper = document.createElement('div');
    audioWrapper.className = 'file-wrapper';
    const audioFileInput = document.createElement('input');
    audioFileInput.type = 'file';
    audioFileInput.accept = 'audio/*';
    audioFileInput.onchange = () => addAudioToCard(index, audioFileInput.files[0]);
    const audioLabel = document.createElement('span');
    audioLabel.className = 'file-label';
    audioLabel.textContent = 'Parcourir…';
    audioWrapper.appendChild(audioFileInput);
    audioWrapper.appendChild(audioLabel);

    // Boutons déplacer/supprimer
    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => {
      [theme.cards[index - 1], theme.cards[index]] = [theme.cards[index], theme.cards[index - 1]];
      saveData();
    };

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === theme.cards.length - 1;
    downBtn.onclick = () => {
      [theme.cards[index + 1], theme.cards[index]] = [theme.cards[index], theme.cards[index + 1]];
      saveData();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Supprimer';
    deleteBtn.onclick = () => {
      theme.cards.splice(index, 1);
      saveData();
    };

    // ✅ Bouton Afficher / Masquer
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';
    toggleBtn.onclick = () => {
      card.visible = !card.visible;
      saveData();
    };

    // Construction de la carte
    div.appendChild(wordInput);
    div.appendChild(saveBtn);
    div.appendChild(document.createElement('br'));

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(deleteBtn);
    div.appendChild(toggleBtn);

    div.appendChild(img);
    div.appendChild(audioInfo);
    div.appendChild(audioWrapper);

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

  // Lecture du ZIP via JSZip
  const JSZip = window.JSZip; // Assure-toi d'avoir <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script> dans ton HTML
  const zip = await JSZip.loadAsync(file);
  const files = Object.values(zip.files);

  // Filtre les images et audios
  const images = files.filter(f => !f.dir && /\.(png|jpg|jpeg|gif)$/i.test(f.name));
  const audios = files.filter(f => !f.dir && /\.(mp3|wav|ogg)$/i.test(f.name));

  for (let imgFile of images) {
    const imgData = await imgFile.async("base64");
    const base64Img = "data:image/" + imgFile.name.split('.').pop() + ";base64," + imgData;

    // Cherche l'audio correspondant au même nom
    const baseName = imgFile.name.replace(/\.[^/.]+$/, "");
    const audioMatch = audios.find(a => a.name.startsWith(baseName));
    let base64Audio = null;

    if (audioMatch) {
      const audioData = await audioMatch.async("base64");
      const ext = audioMatch.name.split('.').pop();
      base64Audio = `data:audio/${ext};base64,${audioData}`;
    }

    const card = {
      word: baseName,
      image: base64Img,
      audio: base64Audio,
      visible: true
    };

    // === SUPABASE LOGIC ===
    if (window.supabase) {
      try {
        // Upload image
        const imgExt = imgFile.name.split('.').pop();
        const imgPath = `${themeId}/${imgFile.name}`;
        await supabase.storage.from('flashcards').upload(imgPath, base64toBlob(base64Img), { upsert: true });

        // Upload audio
        let audioPath = null;
        if (base64Audio) {
          const audioExt = audioMatch.name.split('.').pop();
          audioPath = `${themeId}/${audioMatch.name}`;
          await supabase.storage.from('flashcards').upload(audioPath, base64toBlob(base64Audio), { upsert: true });
        }

        // Stocke les URLs Supabase dans la carte
        card.image = supabase.storage.from('flashcards').getPublicUrl(imgPath).data.publicUrl;
        if (audioPath) card.audio = supabase.storage.from('flashcards').getPublicUrl(audioPath).data.publicUrl;
        
      } catch (err) {
        console.error("Erreur Supabase upload :", err);
      }
    }

    // Ajoute la carte au thème
    theme.cards.push(card);
  }

  saveData();
  alert(`Import terminé : ${images.length} carte(s) ajoutée(s) !`);
}

// ================================
// UTILITAIRE : base64 -> Blob
// ================================
function base64toBlob(base64Data) {
  const parts = base64Data.split(',');
  const contentType = parts[0].match(/:(.*?);/)[1];
  const byteCharacters = atob(parts[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}
