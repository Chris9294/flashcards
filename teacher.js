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

  if (error) {
    console.error("Erreur chargement séries :", error);
    alert("Erreur chargement séries");
    return;
  }

  const { data: cardsData } = await supabaseClient
    .from('cards')
    .select('theme_id');

  const counts = {};
  cardsData.forEach(c => {
    counts[c.theme_id] = (counts[c.theme_id] || 0) + 1;
  });

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

  const { error } = await supabaseClient
    .from('themes')
    .delete()
    .eq('id', theme.id);

  if (error) {
    console.error("Erreur suppression série :", error);
    alert("Erreur suppression série");
    return;
  }

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

  if (imgError) {
    console.error("Erreur upload image:", imgError);
    alert("Erreur upload image");
    return;
  }

  let audioName = null;

  if (audioFile) {
    audioName = `${Date.now()}_${audioFile.name}`;
    const { error: audError } = await supabaseClient.storage.from('cards').upload(audioName, audioFile);

    if (audError) {
      console.error("Erreur upload audio:", audError);
      alert("Erreur upload audio");
      return;
    }
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
    .insert([{
      theme_id: themeId,
      word,
      image_url: imageName,
      audio_url: audioName,
      visible: true,
      position
    }]);

  if (cardError) {
    console.error("Erreur création carte:", cardError);
    alert("Erreur création carte");
    return;
  }

  wordInput.value = '';
  imageInput.value = '';
  audioInput.value = '';

  document.querySelector('#imageInputWrapper .file-label').textContent = '🔎 Parcourir…';
  document.querySelector('#audioInputWrapper .file-label').textContent = '🔎 Parcourir…';

  await loadCards(themeId);
  loadThemes();
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

  if (error) {
    console.error("Erreur chargement cartes :", error);
    return;
  }

  data.cards = cardsData;

  const title = document.getElementById('cardsTitle');

  title.textContent =
    `${data.cards.length} carte${data.cards.length > 1 ? 's' : ''} existante${data.cards.length > 1 ? 's' : ''}`;

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
      await supabaseClient
        .from('cards')
        .update({ word: wordInput.value.trim() })
        .eq('id', card.id);

      loadCards(card.theme_id);
    };

    const img = document.createElement('img');

    img.src =
      supabaseClient
        .storage
        .from('cards')
        .getPublicUrl(card.image_url)
        .data.publicUrl;

    const audioInfo = document.createElement('p');

    const audioText = document.createElement('span');

    audioText.textContent =
      card.audio_url
        ? 'Audio : oui '
        : 'Audio : non (synthèse vocale GB)';

    const playBtn = document.createElement('button');
    playBtn.textContent = "🔊";

    playBtn.onclick = () => {

      if (card.audio_url) {

        new Audio(
          supabaseClient
            .storage
            .from('cards')
            .getPublicUrl(card.audio_url)
            .data.publicUrl
        ).play();

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

    const upBtn = document.createElement('button');
    upBtn.textContent = '🔼';
    upBtn.disabled = index === 0;

    upBtn.onclick = () => moveCard(card.id, card.position, 'up');

    const downBtn = document.createElement('button');
    downBtn.textContent = '🔽';
    downBtn.disabled = index === data.cards.length - 1;

    downBtn.onclick = () => moveCard(card.id, card.position, 'down');

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';

    deleteBtn.onclick = async () => {

      if (!confirm('Supprimer cette carte ?')) return;

      await supabaseClient
        .from('cards')
        .delete()
        .eq('id', card.id);

      await loadCards(card.theme_id);
      loadThemes();
    };

    const toggleBtn = document.createElement('button');

    toggleBtn.textContent =
      card.visible
        ? '👁️ Visible'
        : '🚫 Masquée';

    toggleBtn.onclick = async () => {

      await supabaseClient
        .from('cards')
        .update({ visible: !card.visible })
        .eq('id', card.id);

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

    const replaceAudioLabel=document.createElement('span'); replaceAudioLabel.textContent="Remplacer l'audio : "; replaceAudioLabel.style.fontSize="0.8em"; div.appendChild(replaceAudioLabel);
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

  const targetPos = direction === 'up'
    ? position - 1
    : position + 1;

  const { data: targetCard } = await supabaseClient
    .from('cards')
    .select('id')
    .eq('theme_id', themeId)
    .eq('position', targetPos)
    .single();

  if (!targetCard) return;

  await supabaseClient
    .from('cards')
    .update({ position: targetPos })
    .eq('id', cardId);

  await supabaseClient
    .from('cards')
    .update({ position })
    .eq('id', targetCard.id);

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

    if (["jpg","jpeg","png","gif","webp"].includes(ext)) {

      tasks.push(
        entry.async("blob").then(blob => images[name] = blob)
      );

    } else if (["mp3","wav","ogg","m4a"].includes(ext)) {

      tasks.push(
        entry.async("blob").then(blob => audios[name] = blob)
      );
    }

  });

  await Promise.all(tasks);

  const { data: maxPosData } = await supabaseClient
    .from('cards')
    .select('position')
    .eq('theme_id', themeId)
    .order('position', { ascending: false })
    .limit(1);

  let nextPos = maxPosData.length
    ? maxPosData[0].position + 1
    : 1;

  for (const name in images) {

    const imgFile = images[name];
    const imgExt = imgFile.type.split("/")[1];

    const imgName = `${Date.now()}_${name}.${imgExt}`;

    await supabaseClient
      .storage
      .from('cards')
      .upload(imgName, imgFile);

    let audioName = null;

    if (audios[name]) {

      const audFile = audios[name];
      const audExt = audFile.type.split("/")[1];

      audioName = `${Date.now()}_${name}.${audExt}`;

      await supabaseClient
        .storage
        .from('cards')
        .upload(audioName, audFile);
    }

    await supabaseClient
      .from('cards')
      .insert([{
        theme_id: themeId,
        word: name,
        image_url: imgName,
        audio_url: audioName,
        visible: true,
        position: nextPos
      }]);

    nextPos++;

  }

  await loadCards(themeId);
  loadThemes();
}

// ================================
// INITIALISATION
// ================================
document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('addThemeBtn').addEventListener('click', addTheme);

  document.getElementById('deleteThemeBtn').addEventListener('click', deleteTheme);

  document.getElementById('themeSelect').addEventListener('change',
    e => loadCards(e.target.value)
  );

  document.getElementById("backToFlashcardsBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});
  
  window.addCard = addCard;

  loadThemes();

  document.querySelectorAll('.file-wrapper input[type="file"]').forEach(input => {

    const label = input.nextElementSibling;

    input.addEventListener('change', () => {

      label.textContent =
        input.files.length > 0
          ? input.files[0].name
          : 'Parcourir…';

    });

  });

});
