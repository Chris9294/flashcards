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
let firstCard=null;
let secondCard=null;
let matchedPairs=0;
let totalPairs=0;
let memoryCards=[];

function startMemory(cards){

cardContent.innerHTML="";

firstCard=null;
secondCard=null;
matchedPairs=0;

memoryCards=[];

cards.forEach((card,i)=>{

let pairId=i;

if(card.image){
memoryCards.push({type:"image",value:card.image,pairId});
}

if(card.word){
memoryCards.push({type:"word",value:card.word,pairId});
}

if(card.audio){
memoryCards.push({type:"audio",value:card.audio,pairId});
}

});

memoryCards=memoryCards.slice(0,cards.length*2);

totalPairs=cards.length;

memoryCards.sort(()=>Math.random()-0.5);

cardContent.style.display="flex";
cardContent.style.flexDirection="column";
cardContent.style.alignItems="center";
cardContent.style.gap="12px";
cardContent.style.position="relative";

const cardsPerRow=4;
const cardSize=140;

for(let i=0;i<memoryCards.length;i+=cardsPerRow){

const row=document.createElement("div");

row.style.display="flex";
row.style.justifyContent="center";
row.style.gap="12px";
row.style.width="100%";

const slice=memoryCards.slice(i,i+cardsPerRow);

slice.forEach(card=>{

const div=document.createElement("div");

div.className="memoryCard";
div.dataset.flipped="false";

div.style.width=cardSize+"px";
div.style.height=cardSize+"px";
div.style.display="flex";
div.style.alignItems="center";
div.style.justifyContent="center";
div.style.textAlign="center";
div.style.padding="8px";
div.style.background="#444";
div.style.color="white";
div.style.fontSize=`clamp(14px, ${cardSize/6}px, 28px)`;
div.style.fontWeight="600";
div.style.cursor="pointer";
div.style.borderRadius="10px";
div.style.lineHeight="1.2";
div.style.overflowWrap="break-word";
div.style.wordBreak="break-word";

div.onclick=()=>{

if(div.dataset.flipped==="true"||secondCard) return;

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

},500);

}else{

setTimeout(()=>{

hideCard(firstCard.div);
hideCard(secondCard.div);

firstCard=null;
secondCard=null;

},900);

}

}

};

row.appendChild(div);

});

cardContent.appendChild(row);

}

createQuitButton();

}

function revealCard(div,card){

div.innerHTML="";

if(card.type==="image"){

let img=document.createElement("img");
img.src=card.value;
img.style.maxWidth="100%";
img.style.maxHeight="100%";
div.appendChild(img);

}

if(card.type==="word"){

div.innerText=card.value;

}

if(card.type==="audio"){

div.innerHTML="🔊";

let audio=new Audio(card.value);
audio.play();

}

}

function hideCard(div){

div.innerHTML="";
div.dataset.flipped="false";

}

function createQuitButton(){

let btn=document.createElement("button");

btn.innerText="Quitter";
btn.style.position="absolute";
btn.style.top="10px";
btn.style.right="10px";
btn.style.zIndex="20";

btn.onclick=()=>{

showFlashcards();

};

cardContent.appendChild(btn);

}

function showCheck(){

let check=document.createElement("div");

check.innerText="✔️";

check.style.position="absolute";
check.style.fontSize="120px";
check.style.zIndex="50";
check.style.pointerEvents="none";

check.style.left="50%";
check.style.top="50%";
check.style.transform="translate(-50%,-50%)";

cardContent.appendChild(check);

setTimeout(()=>{

check.remove();

},800);

}

function showBravo(){

let bravo=document.createElement("div");

bravo.innerHTML="🎉 Bravo ! 🎉";

bravo.style.position="absolute";
bravo.style.left="50%";
bravo.style.top="50%";
bravo.style.transform="translate(-50%,-50%)";

bravo.style.fontSize="60px";
bravo.style.background="white";
bravo.style.padding="40px";
bravo.style.borderRadius="20px";
bravo.style.zIndex="100";

cardContent.appendChild(bravo);

setTimeout(()=>{

showFlashcards();

},2000);

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
