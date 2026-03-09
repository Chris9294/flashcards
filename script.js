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
