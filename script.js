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
  if (!currentThemeCards.length) return;
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
  if (!themeId) return;

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

  memoryMode ? startMemory() : loadThumbnails();
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

    const totalCards = memoryCards.length;

// nombre de cartes par ligne
let cardsPerRow = Math.ceil(Math.sqrt(totalCards));

// si nombre pair de paires → privilégier 4 ou 5 par ligne
if(totalCards % 4 === 0) cardsPerRow = 4;
if(totalCards % 10 === 0) cardsPerRow = 5;

const cardSize = Math.floor((flashcard.clientWidth * 0.8) / cardsPerRow);
    
    div.style.width = cardSize + "px";
    div.style.height = cardSize + "px";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.textAlign = "center";
    div.style.padding = "8px"; // moins de marge pour agrandir le texte
    div.style.background = "#444";
    div.style.color = "white";
    div.style.fontSize = `clamp(14px, ${cardSize/6}px, 28px)`; // texte un peu plus grand
    div.style.fontWeight = "600";
    div.style.cursor = "pointer";
    div.style.borderRadius = "10px";
    div.style.lineHeight = "1.2";
    div.style.overflowWrap = "break-word";
    div.style.wordBreak = "break-word";

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

  // faire disparaître les cartes au lieu de les laisser visibles
  setTimeout(()=>{
    firstCard.div.remove();
    secondCard.div.remove();

    firstCard=null;
    secondCard=null;

    // si toutes les paires trouvées, bravo
    if(matchedPairs===totalPairs){
      showBravo();
    }
  },400); // léger délai pour voir le check

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

  // RESTAURE LES FLÈCHES
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

  // Centrer le texte
  wordDiv.style.display = "flex";
  wordDiv.style.alignItems = "center";
  wordDiv.style.justifyContent = "center";
  wordDiv.style.textAlign = "center";
  wordDiv.style.padding = "8px"; // moins de marge
  wordDiv.style.fontSize = "clamp(18px, 6vw, 70px)"; // texte plus lisible
  wordDiv.style.lineHeight = "1.2";
  wordDiv.style.wordBreak = "break-word";
  wordDiv.style.overflowWrap = "break-word";

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
  if(memoryMode){
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
