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

let memoryMode = false;
let missingMode = false;
let missingCard = null;
let missingCardIndex = -1;
let missingPhase = "memorize";
let missingResizeHandler = null;

let firstCard = null;
let secondCard = null;

let matchedPairs = 0;
let totalPairs = 0;

const themeSelect = document.getElementById('themeSelect');
const thumbnails = document.getElementById('thumbnails');
const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');

const leftArrow = document.getElementById('leftArrow');
const rightArrow = document.getElementById('rightArrow');

const fullscreenBtn = document.getElementById("fullscreenBtn");
const teacherBtn = document.getElementById("teacherBtn");
const teacherCode = document.getElementById("teacherCode");
const teacherContainer = document.getElementById("teacherContainer");

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

// Masquer le champ enseignant dès que l'utilisateur reprend l'interface élève
document.addEventListener("click", (event) => {
  if (teacherCode.style.display !== "none" && !teacherContainer.contains(event.target)) {
    teacherCode.style.display = "none";
    teacherCode.value = "";
  }
});

// ================================
// BOUTON MÉLANGER
// ================================
const shuffleBtn = document.createElement('button');
shuffleBtn.textContent = "🔀";
shuffleBtn.title = "Mélanger les cartes";
shuffleBtn.style.marginLeft = "4px";
shuffleBtn.style.fontSize = "16px";
shuffleBtn.style.padding = "2px 6px";
shuffleBtn.style.border = "none";
shuffleBtn.style.background = "transparent";
shuffleBtn.style.cursor = "pointer";

shuffleBtn.onclick = () => {
  // ne rien faire si aucune série sélectionnée ou tableau vide
  if (!themeSelect.value || !currentThemeCards.length) return;

  currentThemeCards = currentThemeCards
    .map(v => ({v, r: Math.random()}))
    .sort((a,b)=>a.r-b.r)
    .map(o=>o.v);
  
  loadThumbnails();
};

themeSelect.parentNode.insertBefore(shuffleBtn, themeSelect.nextSibling);

// ================================
// BOUTON MEMORY
// ================================
const memoryBtn = document.createElement('button');
memoryBtn.textContent = "🎮";
memoryBtn.title = "Memory";
memoryBtn.style.marginLeft = "4px";
memoryBtn.style.fontSize = "16px";
memoryBtn.style.padding = "2px 6px";
memoryBtn.style.border = "none";
memoryBtn.style.background = "transparent";
memoryBtn.style.cursor = "pointer";

memoryBtn.onclick = () => {
  // ne rien faire si aucune série sélectionnée ou tableau vide
  if (!themeSelect.value || !currentThemeCards.length) return;

  memoryMode = !memoryMode;
  memoryBtn.style.opacity = memoryMode ? 0.5 : 1;
  
  if(memoryMode){
    startMemory();
  }else{
    flashcard.classList.remove('visible');
    updateArrows();
    loadThumbnails();
  }
};

themeSelect.parentNode.insertBefore(memoryBtn, shuffleBtn.nextSibling);

// ================================
// BOUTON WHAT'S MISSING ?
// ================================
const missingBtn = document.createElement('button');
missingBtn.textContent = "👀";
missingBtn.title = "What's missing?";
missingBtn.style.marginLeft = "4px";
missingBtn.style.fontSize = "16px";
missingBtn.style.padding = "2px 6px";
missingBtn.style.border = "none";
missingBtn.style.background = "transparent";
missingBtn.style.cursor = "pointer";

missingBtn.onclick = () => {
  // ne rien faire si aucune série sélectionnée ou tableau vide
  if (!themeSelect.value || !currentThemeCards.length) return;

  if (memoryMode) {
    exitMemory();
  }

  startMissingGame();
};

themeSelect.parentNode.insertBefore(missingBtn, memoryBtn.nextSibling);

// ================================
// CHARGER LES SERIES
// ================================
async function loadThemes(){
  const { data: themes } = await supabaseClient
    .from('themes')
    .select('*')
    .order('name');

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
async function loadTheme(){
  const themeId = themeSelect.value;
  thumbnails.innerHTML = '';
  closeCard();

  // si aucune série sélectionnée → vider le tableau
  if (!themeId) {
    currentThemeCards = [];
    return;
  }

  const { data: cards } = await supabaseClient
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .eq('visible', true)
    .order('position');

  currentThemeCards = cards.map(card => {
    const imageUrl = supabaseClient
      .storage
      .from('cards')
      .getPublicUrl(card.image_url).data.publicUrl;
    const audioUrl = card.audio_url
      ? supabaseClient.storage.from('cards').getPublicUrl(card.audio_url).data.publicUrl
      : null;
    return { word: card.word, image: imageUrl, audio: audioUrl };
  });

  if (memoryMode) {
    startMemory();
  } else if (missingMode) {
    startMissingGame();
  } else {
    loadThumbnails();
  }
}

// ================================
// MINIATURES
// ================================
function loadThumbnails(){
  thumbnails.innerHTML='';
  currentThemeCards.forEach((card,index)=>{
    const img=document.createElement('img');
    img.src=card.image;
    img.style.opacity="0";
    img.style.transform='translateY(30px) scale(0.85)';
    img.style.display='inline-block';
    img.style.cursor='pointer';
    img.onclick=()=>openCardAtIndex(index);
    thumbnails.appendChild(img);

    img.onload=()=>{
      setTimeout(()=>{
        img.style.transition='transform 0.6s cubic-bezier(.68,-0.6,.32,1.6), opacity 0.5s ease';
        img.style.opacity='1';
        img.style.transform='translateY(-5px) scale(1.05)';
        setTimeout(()=>{
          img.style.transition='transform 0.3s ease';
          img.style.transform='translateY(0) scale(1)';
        },600);
      },80*index);
    };
  });
}

// ================================
// MEMORY
// ================================
function startMemory(){
  flashcard.classList.add('visible');

  // MASQUER LES FLÈCHES
  leftArrow.style.display = 'none';
  rightArrow.style.display = 'none';

  cardContent.innerHTML="";
  cardContent.style.display="flex";
  cardContent.style.flexWrap="wrap";
  cardContent.style.justifyContent="center";
  cardContent.style.alignItems="center";
  cardContent.style.gap="12px";

  firstCard=null;
  secondCard=null;
  matchedPairs=0;

  let memoryCards=[];
  currentThemeCards.forEach((card,i)=>{
    memoryCards.push({ type:"image", pairId:i, image:card.image, word:card.word, audio:card.audio });
    memoryCards.push({ type:"word", pairId:i, image:card.image, word:card.word, audio:card.audio });
  });

  totalPairs=currentThemeCards.length;
  memoryCards.sort(()=>Math.random()-0.5);

  const quitBtn=document.createElement("button");
  quitBtn.textContent="✖";
  quitBtn.style.position="absolute";
  quitBtn.style.bottom="20px";
  quitBtn.style.right="20px";
  quitBtn.style.zIndex="1000";
  quitBtn.style.fontSize="28px";
  quitBtn.style.background="transparent";
  quitBtn.style.border="none";
  quitBtn.style.cursor="pointer";
  quitBtn.onclick=exitMemory;
  cardContent.appendChild(quitBtn);

  memoryCards.forEach(card=>{
    const div=document.createElement("div");
    div.className="memoryCard";
    div.dataset.flipped="false";

    const cardSize = 140;
    div.style.width = cardSize + "px";
    div.style.height = cardSize + "px";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.textAlign = "center";
    div.style.padding = "8px";
    div.style.background = "#444";
    div.style.color = "white";
    div.style.fontSize = `clamp(18px, ${cardSize/5}px, 32px)`;
    div.style.fontWeight = "600";
    div.style.cursor = "pointer";
    div.style.borderRadius = "10px";
    div.style.lineHeight = "1.2";
    div.style.whiteSpace = "normal";
    div.style.wordBreak = "normal";
    div.style.overflowWrap = "anywhere";
    div.style.hyphens = "auto";
    div.lang = "en";

    div.onclick=()=>{
      if(div.dataset.flipped==="true" || secondCard) return;
      div.dataset.flipped="true";
      revealCard(div,card);

      if(!firstCard){
        firstCard={div,card};
      }else{
        secondCard={div,card};
        if(firstCard.card.pairId===secondCard.card.pairId){
          showCheck();
          matchedPairs++;

          setTimeout(()=>{
            firstCard.div.remove();
            secondCard.div.remove();
            firstCard=null;
            secondCard=null;

            if(matchedPairs===totalPairs){
              showBravo();
            }
          },400);
        } else {
          setTimeout(()=>{
            hideCard(firstCard.div);
            hideCard(secondCard.div);
            firstCard=null;
            secondCard=null;
          },1000);
        }
      }
    };
    cardContent.appendChild(div);
  });
}

// ================================
// REVEAL / HIDE CARD
// ================================
function revealCard(div,card){
  div.innerHTML="";
  if(card.type==="image"){
    const img = document.createElement("img");
    img.src = card.image;
    img.style.maxWidth="90%";
    img.style.maxHeight="90%";
    img.style.objectFit="contain";
    div.appendChild(img);
  }else{
    div.textContent = card.word;
    if(card.audio){
      new Audio(card.audio).play();
    }
  }
}

function hideCard(div){
  div.dataset.flipped="false";
  div.innerHTML="";
  div.style.background="#444";
}

// ================================
// MEMORY UI
// ================================
function exitMemory(){
  memoryMode = false;
  memoryBtn.style.opacity = 1;

  flashcard.classList.remove('visible');
  cardContent.innerHTML = "";

  updateArrows();
  loadThumbnails();
}

// ================================
// CHECK & BRAVO
// ================================
function showCheck(){
  const check = document.createElement("div");
  check.textContent = "✔";
  check.style.position = "fixed";
  check.style.top = "50%";
  check.style.left = "50%";
  check.style.transform = "translate(-50%,-50%)";
  check.style.fontSize = "240px";
  check.style.color = "#4CAF50";
  check.style.pointerEvents = "none";
  check.style.zIndex = "2000";
  flashcard.appendChild(check);
  setTimeout(()=> check.remove(), 800);
}

function showBravo(){
  const bravo = document.createElement("div");
  bravo.style.position = "fixed";
  bravo.style.top = "0";
  bravo.style.left = "0";
  bravo.style.width = "100%";
  bravo.style.height = "100%";
  bravo.style.background = "rgba(0,0,0,0.85)";
  bravo.style.display = "flex";
  bravo.style.alignItems = "center";
  bravo.style.justifyContent = "center";
  bravo.style.fontSize = "160px";
  bravo.style.color = "white";
  bravo.style.textAlign = "center";
  bravo.textContent = "🎉 BRAVO !";
  bravo.style.zIndex = "2000";
  flashcard.appendChild(bravo);
  setTimeout(()=>{
    bravo.remove();
    exitMemory();
  },4000);
}

// ================================
// WHAT'S MISSING ?
// ================================
function startMissingGame(){
  missingMode = true;
  missingBtn.style.opacity = 0.5;
  flashcard.classList.add('visible');

  leftArrow.style.display = 'none';
  rightArrow.style.display = 'none';

  const card = document.getElementById('card');
  const cardButtons = document.getElementById('cardButtons');
  card.style.display = 'none';
  cardButtons.style.display = 'none';
  teacherBtn.style.display = 'none';

  let game = document.getElementById('missingGame');
  if (game) game.remove();

  game = document.createElement('div');
  game.id = 'missingGame';
  game.className = 'missing-game';
  game.innerHTML = `
    <div class="missing-game-header">
      <button class="missing-game-back" title="Back">← Back</button>
      <div class="missing-game-title">Memorize the cards!</div>
    </div>
    <div class="missing-game-body">
      <div class="missing-game-grid-wrap">
        <div class="missing-game-grid"></div>
        <div class="missing-game-actions">
          <button class="missing-game-primary">Random card</button>
        </div>
      </div>
      <aside class="missing-game-reveal" aria-live="polite">
        <div class="missing-game-reveal-placeholder">?</div>
      </aside>
    </div>
  `;

  flashcard.appendChild(game);

  game.querySelector('.missing-game-back').onclick = exitMissingGame;
  game.querySelector('.missing-game-primary').onclick = () => hideMissingCard();

  missingPhase = 'memorize';
  missingCard = null;
  missingCardIndex = -1;

  renderMissingGrid();

  if (missingResizeHandler) {
    window.removeEventListener('resize', missingResizeHandler);
  }
  missingResizeHandler = () => updateMissingGameLayout();
  window.addEventListener('resize', missingResizeHandler);
}

function renderMissingGrid(){
  const grid = document.querySelector('#missingGame .missing-game-grid');
  if (!grid) return;

  grid.innerHTML = '';

  currentThemeCards.forEach((card, index) => {
    const slot = document.createElement('div');
    slot.className = 'missing-game-slot';
    slot.dataset.index = index;

    const cardEl = document.createElement('div');
    cardEl.className = 'missing-game-card';

    const img = document.createElement('img');
    img.src = card.image;
    img.alt = card.word;

    cardEl.appendChild(img);
    cardEl.onclick = () => selectMissingCard(index);
    slot.appendChild(cardEl);
    grid.appendChild(slot);
  });

  requestAnimationFrame(updateMissingGameLayout);
}


function selectMissingCard(index){
  if (missingPhase === 'memorize') {
    hideMissingCard(index);
  }
}

function updateMissingGameLayout(){
  const game = document.getElementById('missingGame');
  const grid = game?.querySelector('.missing-game-grid');
  const gridWrap = game?.querySelector('.missing-game-grid-wrap');
  if (!game || !grid || !gridWrap || !currentThemeCards.length) return;

  const width = gridWrap.clientWidth;
  const actions = game.querySelector('.missing-game-actions');
  const actionsHeight = actions ? actions.offsetHeight + 16 : 0;
  const height = Math.max(140, gridWrap.clientHeight - actionsHeight);
  const count = currentThemeCards.length;
  const gap = count <= 9 ? 16 : count <= 16 ? 12 : 8;

  let best = null;
  const maxColumns = Math.min(count, 8);

  for (let columns = 1; columns <= maxColumns; columns++) {
    const rows = Math.ceil(count / columns);
    const cellWidth = (width - gap * (columns - 1)) / columns;
    const cellHeight = (height - gap * (rows - 1)) / rows;
    const size = Math.min(cellWidth, cellHeight);

    if (!best || size > best.size) {
      best = { columns, rows, size };
    }
  }

  if (!best) return;

  const cardSize = Math.max(56, Math.min(best.size, 220));
  grid.style.setProperty('--missing-columns', best.columns);
  grid.style.setProperty('--missing-card-size', `${cardSize}px`);
  grid.style.setProperty('--missing-gap', `${gap}px`);
}

function hideMissingCard(selectedIndex = null){
  if (missingPhase !== 'memorize' || !currentThemeCards.length) return;

  const title = document.querySelector('#missingGame .missing-game-title');
  const primaryBtn = document.querySelector('#missingGame .missing-game-primary');

  let nextIndex = selectedIndex;
  if (nextIndex === null) {
    nextIndex = Math.floor(Math.random() * currentThemeCards.length);
    if (currentThemeCards.length > 1 && nextIndex === missingCardIndex) {
      nextIndex = (nextIndex + 1) % currentThemeCards.length;
    }
  }

  missingCardIndex = nextIndex;
  missingCard = currentThemeCards[missingCardIndex];
  missingPhase = 'hiding';

  const slot = document.querySelector(`#missingGame .missing-game-slot[data-index="${missingCardIndex}"]`);
  const cardEl = slot?.querySelector('.missing-game-card');

  if (!slot || !cardEl) return;

  primaryBtn.disabled = true;
  cardEl.classList.add('missing-game-card-disappear');
  createMissingParticles(slot);

  setTimeout(() => {
    cardEl.style.visibility = 'hidden';
    cardEl.classList.remove('missing-game-card-disappear');
    slot.classList.add('missing-game-empty-slot');

    title.textContent = "What's missing?";
    primaryBtn.textContent = 'Reveal answer';
    primaryBtn.disabled = false;
    primaryBtn.onclick = revealMissingCard;
    missingPhase = 'missing';
  }, 650);
}

function createMissingParticles(slot){
  const symbols = ['✨', '⭐', '✦', '💨', '✧', '⭐'];

  symbols.forEach((symbol, index) => {
    const particle = document.createElement('span');
    particle.className = 'missing-game-particle';
    particle.textContent = symbol;
    particle.style.setProperty('--particle-x', `${(Math.random() - 0.5) * 120}px`);
    particle.style.setProperty('--particle-y', `${(Math.random() - 0.5) * 100}px`);
    particle.style.animationDelay = `${index * 35}ms`;
    slot.appendChild(particle);
    setTimeout(() => particle.remove(), 900);
  });
}

function revealMissingCard(){
  if (missingPhase !== 'missing' || !missingCard) return;

  const reveal = document.querySelector('#missingGame .missing-game-reveal');
  const primaryBtn = document.querySelector('#missingGame .missing-game-primary');
  const title = document.querySelector('#missingGame .missing-game-title');
  if (!reveal || !primaryBtn || !title) return;

  reveal.innerHTML = '';
  reveal.classList.add('missing-game-reveal-active');

  const image = document.createElement('img');
  image.className = 'missing-game-reveal-image';
  image.src = missingCard.image;
  image.alt = missingCard.word;

  const word = document.createElement('div');
  word.className = 'missing-game-reveal-word';
  word.textContent = missingCard.word;
  word.style.display = 'none';

  const controls = document.createElement('div');
  controls.className = 'missing-game-reveal-controls';

  const textBtn = document.createElement('button');
  textBtn.textContent = '🔄';
  textBtn.title = 'Show / hide text';
  textBtn.onclick = () => {
    const showWord = word.style.display === 'none';
    word.style.display = showWord ? 'flex' : 'none';
    image.style.display = showWord ? 'none' : 'block';
  };

  const audioBtn = document.createElement('button');
  audioBtn.textContent = '🔊';
  audioBtn.title = 'Listen';
  audioBtn.onclick = () => playMissingCardAudio(missingCard);

  controls.appendChild(textBtn);
  controls.appendChild(audioBtn);
  reveal.appendChild(image);
  reveal.appendChild(word);
  reveal.appendChild(controls);

  title.textContent = 'The missing card was…';
  primaryBtn.textContent = 'Next';
  primaryBtn.onclick = nextMissingRound;
  missingPhase = 'revealed';
}

function playMissingCardAudio(card){
  if (card.audio) {
    new Audio(card.audio).play();
  } else {
    const u = new SpeechSynthesisUtterance(card.word);
    u.lang = 'en-GB';
    u.rate = 0.7;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
}

function nextMissingRound(){
  if (missingPhase !== 'revealed') return;

  const title = document.querySelector('#missingGame .missing-game-title');
  const primaryBtn = document.querySelector('#missingGame .missing-game-primary');
  const reveal = document.querySelector('#missingGame .missing-game-reveal');
  const slot = document.querySelector(`#missingGame .missing-game-slot[data-index="${missingCardIndex}"]`);
  const cardEl = slot?.querySelector('.missing-game-card');

  if (slot && cardEl) {
    cardEl.style.visibility = 'visible';
    slot.classList.remove('missing-game-empty-slot');
    cardEl.classList.add('missing-game-card-return');
    setTimeout(() => cardEl.classList.remove('missing-game-card-return'), 450);
  }

  if (reveal) {
    reveal.classList.remove('missing-game-reveal-active');
    reveal.innerHTML = '<div class="missing-game-reveal-placeholder">?</div>';
  }

  title.textContent = 'Memorize the cards!';
  primaryBtn.textContent = 'Random card';
  primaryBtn.onclick = () => hideMissingCard();

  missingCard = null;
  missingCardIndex = -1;
  missingPhase = 'memorize';
}

function exitMissingGame(){
  missingMode = false;
  missingBtn.style.opacity = 1;
  missingCard = null;
  missingPhase = 'memorize';

  if (missingResizeHandler) {
    window.removeEventListener('resize', missingResizeHandler);
    missingResizeHandler = null;
  }

  document.getElementById('missingGame')?.remove();
  flashcard.classList.remove('visible');

  const card = document.getElementById('card');
  const cardButtons = document.getElementById('cardButtons');
  card.style.display = 'flex';
  cardButtons.style.display = 'flex';
  teacherBtn.style.display = 'block';

  updateArrows();
  loadThumbnails();
}

// ================================
// FLASHCARD
// ================================
function openCardAtIndex(index){
  currentIndex=index;
  currentCard=currentThemeCards[currentIndex];
  showingWord=false;
  showImage();
  updateArrows();
}

function showImage(){
  if(!currentCard) return;
  cardContent.innerHTML=`<img src="${currentCard.image}" class="big-image">`;
  flashcard.classList.add('visible');
  teacherBtn.style.display="none";

  const img=document.querySelector('.big-image');
  img.onclick=closeCard;

  void img.offsetWidth;
  img.classList.add('active');

  updateArrows();
}

function showWord(){
  if(!currentCard) return;
  cardContent.innerHTML=`<div class="word">${currentCard.word}</div>`;
  const wordDiv = cardContent.querySelector('.word');
  teacherBtn.style.display="none";

  wordDiv.style.display = "flex";
  wordDiv.style.alignItems = "center";
  wordDiv.style.justifyContent = "center";
  wordDiv.style.textAlign = "center";
  wordDiv.style.padding = "8px";
  wordDiv.style.fontSize = "clamp(18px, 6vw, 70px)";
  wordDiv.style.lineHeight = "1.2";
  wordDiv.style.wordBreak = "break-word";
  wordDiv.style.overflowWrap = "break-word";
  wordDiv.style.whiteSpace = "normal";
  wordDiv.style.hyphens = "auto";

  wordDiv.style.opacity = 0;
  wordDiv.style.transition = "opacity 0.5s ease";

  void wordDiv.offsetWidth;
  wordDiv.style.opacity = 1;
  wordDiv.onclick = closeCard;

  updateArrows();
}

function closeCard(){
  flashcard.classList.remove('visible');
  currentCard=null;
  teacherBtn.style.display="block";
}

// ================================
// NAVIGATION
// ================================
function updateArrows(){
  if(memoryMode || missingMode){
    leftArrow.style.display='none';
    rightArrow.style.display='none';
  }else{
    leftArrow.style.display=currentIndex>0?'block':'none';
    rightArrow.style.display=currentIndex<currentThemeCards.length-1?'block':'none';
  }
}

leftArrow.onclick=()=>{if(currentIndex>0)openCardAtIndex(currentIndex-1)};
rightArrow.onclick=()=>{if(currentIndex<currentThemeCards.length-1)openCardAtIndex(currentIndex+1)};

// ================================
// FLIP / SPEAK
// ================================
document.getElementById('flipBtn').onclick=()=>{
  if(!currentCard) return;
  showingWord=!showingWord;
  showingWord ? showWord() : showImage();
};

document.getElementById('speakBtn').onclick=()=>{
  if(!currentCard) return;
  if(currentCard.audio){
    new Audio(currentCard.audio).play();
  }else{
    const u=new SpeechSynthesisUtterance(currentCard.word);
    u.lang='en-GB';
    u.rate=0.7;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
};

// ================================
// FULLSCREEN
// ================================
fullscreenBtn.onclick=()=>{
  const isFullscreen=document.fullscreenElement||document.webkitFullscreenElement;
  if(!isFullscreen){
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  }else{
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
};

// ================================
loadThemes();
themeSelect.onchange=loadTheme;
