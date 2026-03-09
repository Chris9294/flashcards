// ================================
// CONNEXION SUPABASE
// ================================
const supabaseUrl = "https://sdrwjgylmbgrhfwnphwa.supabase.co";
const supabaseKey = "sb_publishable_XKoO7J9_lc1OLzpREKWV5A_fo3UFjmV";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ================================
// VARIABLES
// ================================
let currentCard = null;
let showingWord = false;
let currentIndex = 0;
let currentThemeCards = [];

const themeSelect = document.getElementById('themeSelect');
const thumbnails = document.getElementById('thumbnails');
const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');

const leftArrow = document.getElementById('leftArrow');
const rightArrow = document.getElementById('rightArrow');

const fullscreenBtn = document.getElementById("fullscreenBtn");
const teacherBtn = document.getElementById("teacherBtn");
const teacherCode = document.getElementById("teacherCode");

// ================================
// BOUTON INTERFACE ENSEIGNANT
// ================================
teacherBtn.onclick = () => {
  teacherCode.style.display = "inline-block";
  teacherCode.value = "";
  teacherCode.focus();
};

teacherCode.addEventListener("input", () => {
  if (teacherCode.value === "1515") {
    window.location.href = "./teacher.html";
  } else if (teacherCode.value.length === 4) {
    alert("Code incorrect");
    teacherCode.value = "";
    teacherCode.focus();
  }
});

// ================================
// BOUTON MÉLANGER (à côté du menu séries)
// ================================
const shuffleBtn = document.createElement('button');
shuffleBtn.textContent = "🔀";
shuffleBtn.title = "Mélanger les cartes";
shuffleBtn.style.marginLeft = "8px";
shuffleBtn.style.fontSize = "18px";
shuffleBtn.style.padding = "4px 8px";
shuffleBtn.style.borderRadius = "6px";
shuffleBtn.style.border = "none";
shuffleBtn.style.cursor = "pointer";
shuffleBtn.style.background = "#ffcc80";
shuffleBtn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
shuffleBtn.onclick = () => {
  currentThemeCards = currentThemeCards
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
  loadThumbnails();
};

// Insérer le bouton juste après le select
themeSelect.parentNode.insertBefore(shuffleBtn, themeSelect.nextSibling);

// ================================
// CHARGER LES SERIES
// ================================
async function loadThemes() {

  const { data: themes, error } = await supabaseClient
    .from('themes')
    .select('*')
    .order('name');

  if (error) {
    console.error("Erreur chargement séries", error);
    return;
  }

  themeSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Flashcards —';
  themeSelect.appendChild(placeholder);

  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    themeSelect.appendChild(option);
  });
}

// ================================
// CHARGEMENT D’UNE SÉRIE
// ================================
async function loadTheme() {

  const themeId = themeSelect.value;
  thumbnails.innerHTML = '';
  closeCard();

  if (!themeId) return;

  const { data: cards, error } = await supabaseClient
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .eq('visible', true)
    .order('position');

  if (error) {
    console.error("Erreur chargement cartes", error);
    return;
  }

  currentThemeCards = cards.map(card => {

    const imageUrl =
      supabaseClient
        .storage
        .from('cards')
        .getPublicUrl(card.image_url)
        .data.publicUrl;

    let audioUrl = null;
    if (card.audio_url) {
      audioUrl =
        supabaseClient
          .storage
          .from('cards')
          .getPublicUrl(card.audio_url)
          .data.publicUrl;
    }

    return {
      word: card.word,
      image: imageUrl,
      audio: audioUrl
    };
  });

  loadThumbnails();
}

// ================================
// AFFICHAGE MINIATURES
// ================================
function loadThumbnails() {
  thumbnails.innerHTML = '';
  currentThemeCards.forEach((card, index) => {
    const img = document.createElement('img');
    img.src = card.image;
    img.style.opacity = 0;
    img.style.transition = "opacity 0.3s ease";
    img.onload = () => img.style.opacity = 1;
    img.onclick = () => openCardAtIndex(index);
    thumbnails.appendChild(img);
  });
}

// ================================
// AFFICHAGE CARTE
// ================================
function openCardAtIndex(index) {
  currentIndex = index;
  currentCard = currentThemeCards[currentIndex];
  showingWord = false;
  showImage();
  updateArrows();
}

function showImage() {
  if (!currentCard) return;
  cardContent.innerHTML = `<img src="${currentCard.image}" class="big-image">`;
  flashcard.classList.add('visible');
  teacherBtn.style.display = "none";

  const img = document.querySelector('.big-image');
  img.onclick = closeCard;

  void img.offsetWidth;
  img.classList.add('active');
  updateArrows();
}

function showWord() {
  if (!currentCard) return;
  cardContent.innerHTML = `<div class="word">${currentCard.word}</div>`;
  const wordDiv = cardContent.querySelector('.word');
  teacherBtn.style.display = "none";

  wordDiv.style.opacity = 0;
  wordDiv.style.transition = "opacity 0.5s ease";
  void wordDiv.offsetWidth;
  wordDiv.style.opacity = 1;
  wordDiv.onclick = closeCard;

  updateArrows();
}

function closeCard() {
  flashcard.classList.remove('visible');
  currentCard = null;
  teacherBtn.style.display = "block";
}

// ================================
// FLÈCHES NAVIGATION
// ================================
function updateArrows() {
  leftArrow.style.display = currentIndex > 0 ? 'block' : 'none';
  rightArrow.style.display = currentIndex < currentThemeCards.length - 1 ? 'block' : 'none';
}

leftArrow.onclick = () => { if (currentIndex > 0) openCardAtIndex(currentIndex - 1); };
rightArrow.onclick = () => { if (currentIndex < currentThemeCards.length - 1) openCardAtIndex(currentIndex + 1); };

// ================================
// BOUTONS
// ================================
document.getElementById('flipBtn').onclick = () => {
  if (!currentCard) return;
  showingWord = !showingWord;
  showingWord ? showWord() : showImage();
};

document.getElementById('speakBtn').onclick = () => {
  if (!currentCard) return;
  if (currentCard.audio) {
    new Audio(currentCard.audio).play();
  } else {
    const u = new SpeechSynthesisUtterance(currentCard.word);
    u.lang = 'en-GB';
    u.rate = 0.7;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
};

// ================================
// BOUTON PLEIN ÉCRAN
// ================================
fullscreenBtn.onclick = () => {
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
  if (!isFullscreen) {
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
};

// ================================
// INITIALISATION
// ================================
loadThemes();
