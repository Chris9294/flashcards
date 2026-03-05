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
const zipInput = document.getElementById("zipInput");

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

    data.themes = data.themes.filter(t => t.id !== theme.id);

    saveData();
  }

};

themeSelect.onchange = refreshCards;

// ================================
// AJOUT CARTE MANUELLE
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

  const reader = new FileReader();

  reader.onload = e => {

    card.image = e.target.result;

    if (audioInput.files[0]) {

      handleAudioUpload(audioInput.files[0], card, theme);

    } else {

      theme.cards.push(card);
      saveData();

    }

  };

  reader.readAsDataURL(imageInput.files[0]);

  document.getElementById('wordInput').value = '';
  imageInput.value = '';
  audioInput.value = '';

}

// ================================
// AUDIO À LA CRÉATION
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
// AJOUT AUDIO SUR CARTE
// ================================
function addAudioToCard(index, file) {

  if (!file) return;

  const theme = data.themes.find(t => t.id === themeSelect.value);

  const reader = new FileReader();

  reader.onload = e => {

    theme.cards[index].audio = e.target.result;

    saveData();

  };

  reader.readAsDataURL(file);

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

  cardsTitle.textContent = `${count} carte${count > 1 ? 's' : ''}`;

  theme.cards.forEach((card, index) => {

    if (card.visible === undefined) card.visible = true;

    const div = document.createElement('div');
    div.className = 'card';

    if (!card.visible) div.classList.add('card-hidden');

    const number = document.createElement('div');
    number.textContent = `Carte ${index + 1}`;
    number.style.fontWeight = 'bold';
    number.style.color = '#ff6f61';

// -------------------
// Champ texte + bouton “Enregistrer” (Option 1)
// -------------------
const wordInput = document.createElement('input');
wordInput.type = 'text';
wordInput.value = card.word;

// ⚡ override la largeur forcée par le CSS
wordInput.style.width = 'auto';
wordInput.style.display = 'inline-block';
wordInput.style.verticalAlign = 'middle'; // pour aligner avec le bouton

const saveBtn = document.createElement('button');
saveBtn.textContent = '💾 Enregistrer';
saveBtn.onclick = () => {
  card.word = wordInput.value.trim();
  saveData();
};
    
    const img = document.createElement('img');
    img.src = card.image;
    img.style.height = '60px';

   const audioInfo = document.createElement('p');

const audioText = document.createElement('span');
audioText.textContent = card.audio
  ? 'Audio : oui '
  : 'Audio : non (synthèse vocale) ';

const playBtn = document.createElement('button');
playBtn.textContent = "🔊";
playBtn.style.marginLeft = "5px";

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

    upBtn.onclick = () => {
      [theme.cards[index - 1], theme.cards[index]] =
      [theme.cards[index], theme.cards[index - 1]];
      saveData();
    };

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === theme.cards.length - 1;

    downBtn.onclick = () => {
      [theme.cards[index + 1], theme.cards[index]] =
      [theme.cards[index], theme.cards[index + 1]];
      saveData();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';

    deleteBtn.onclick = () => {
      theme.cards.splice(index, 1);
      saveData();
    };

    const toggleBtn = document.createElement('button');

    toggleBtn.textContent = card.visible ? '👁️ Visible' : '🚫 Masquée';

    toggleBtn.onclick = () => {
      card.visible = !card.visible;
      saveData();
    };

    div.appendChild(number);
    div.appendChild(wordInput);
    div.appendChild(saveBtn);
    div.appendChild(document.createElement('br'));

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
   // Texte plus petit
const replaceAudioLabel = document.createElement('span');
replaceAudioLabel.textContent = "Remplacer l'audio : ";
replaceAudioLabel.style.fontSize = "0.8em"; // tu peux ajuster 0.8em à la taille voulue
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

      tasks.push(
        entry.async("base64").then(data64 => {

          const mime = ext === "jpg" ? "jpeg" : ext;

          images[name] = `data:image/${mime};base64,${data64}`;

        })
      );

    }

    if (["mp3","wav","ogg","m4a"].includes(ext)) {

      tasks.push(
        entry.async("base64").then(data64 => {

          audios[name] = `data:audio/${ext};base64,${data64}`;

        })
      );

    }

  });

  await Promise.all(tasks);

  let added = 0;

  Object.keys(images).forEach(name => {

    const card = {

      word: name,
      image: images[name],
      audio: audios[name] || null,
      visible: true

    };

    theme.cards.push(card);

    added++;

  });

  saveData();

  alert(`${added} carte(s) importée(s)`);

}

// ================================
// INITIALISATION
// ================================
refreshThemes();
refreshCards();
