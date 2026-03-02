/********************************
 * RÉCUPÉRATION DES DONNÉES
 ********************************/
const data = JSON.parse(localStorage.getItem("flashcardData")) || {};

let currentSeries = [];
let currentIndex = 0;
let showingWord = false;

/********************************
 * ÉLÉMENTS DOM
 ********************************/
const thumbnails = document.getElementById("thumbnails");
const flashcard = document.getElementById("flashcard");
const cardContent = document.getElementById("cardContent");

const leftArrow = document.getElementById("leftArrow");
const rightArrow = document.getElementById("rightArrow");

const flipButton = document.getElementById("flipButton");
const audioButton = document.getElementById("audioButton");

const seriesSelect = document.getElementById("seriesSelect");

/********************************
 * INITIALISATION
 ********************************/
initSeriesMenu();

function initSeriesMenu() {
  seriesSelect.innerHTML = "";

  const seriesNames = Object.keys(data);
  if (seriesNames.length === 0) {
    seriesSelect.innerHTML = `<option>Aucune série</option>`;
    return;
  }

  seriesNames.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    seriesSelect.appendChild(option);
  });

  loadSeries(seriesNames[0]);
}

/********************************
 * CHARGEMENT SÉRIE
 ********************************/
function loadSeries(seriesName) {
  currentSeries = data[seriesName] || [];
  currentIndex = 0;
  thumbnails.innerHTML = "";
  flashcard.classList.remove("visible");

  currentSeries.forEach((card, index) => {
    const img = document.createElement("img");
    img.src = card.image;
    img.onclick = () => openCard(index);
    thumbnails.appendChild(img);
  });
}

/********************************
 * OUVRIR / FERMER CARTE
 ********************************/
function openCard(index) {
  currentIndex = index;
  showingWord = false;
  flashcard.classList.add("visible");
  showImage();
}

function closeCard() {
  flashcard.classList.remove("visible");
}

/********************************
 * IMAGE / MOT
 ********************************/
function showImage() {
  const card = currentSeries[currentIndex];

  cardContent.innerHTML = `
    <img src="${card.image}" class="big-image">
    <div id="leftArrow">&#8592;</div>
    <div id="rightArrow">&#8594;</div>
  `;

  cardContent.querySelector(".big-image").onclick = closeCard;

  bindArrows();
  showingWord = false;
  updateArrows();
}

function showWord() {
  const card = currentSeries[currentIndex];

  cardContent.innerHTML = `
    <div class="word">${card.word}</div>
    <div id="leftArrow">&#8592;</div>
    <div id="rightArrow">&#8594;</div>
  `;

  cardContent.querySelector(".word").onclick = closeCard;

  bindArrows();
  showingWord = true;
  updateArrows();
}

/********************************
 * FLÈCHES
 ********************************/
function bindArrows() {
  document.getElementById("leftArrow").onclick = prevCard;
  document.getElementById("rightArrow").onclick = nextCard;
}

function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    showingWord ? showWord() : showImage();
  }
}

function nextCard() {
  if (currentIndex < currentSeries.length - 1) {
    currentIndex++;
    showingWord ? showWord() : showImage();
  }
}

function updateArrows() {
  const left = document.getElementById("leftArrow");
  const right = document.getElementById("rightArrow");

  if (!left || !right) return;

  left.style.display = currentIndex === 0 ? "none" : "block";
  right.style.display = currentIndex === currentSeries.length - 1 ? "none" : "block";
}

/********************************
 * BOUTONS
 ********************************/
flipButton.onclick = () => {
  showingWord ? showImage() : showWord();
};

audioButton.onclick = playAudio;

/********************************
 * AUDIO
 ********************************/
function playAudio() {
  const card = currentSeries[currentIndex];

  if (card.audio) {
    const audio = new Audio(card.audio);
    audio.play();
  } else {
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  }
}

/********************************
 * MENU DÉROULANT
 ********************************/
seriesSelect.onchange = (e) => {
  loadSeries(e.target.value);
};
