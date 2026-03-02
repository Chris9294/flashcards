let data = JSON.parse(localStorage.getItem('flashcards')) || { themes: [] };

function save() {
  localStorage.setItem('flashcards', JSON.stringify(data));
  render();
}

function addTheme() {
  const name = document.getElementById('newThemeName').value.trim();
  if (!name) return;

  data.themes.push({
    id: Date.now().toString(),
    name,
    cards: []
  });

  document.getElementById('newThemeName').value = '';
  save();
}

function addCard() {
  const themeId = document.getElementById('themeSelect').value;
  const word = document.getElementById('wordInput').value.trim();
  const file = document.getElementById('imageInput').files[0];

  if (!themeId || !word || !file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const theme = data.themes.find(t => t.id === themeId);
    theme.cards.push({
      word,
      image: e.target.result
    });
    document.getElementById('wordInput').value = '';
    document.getElementById('imageInput').value = '';
    save();
  };
  reader.readAsDataURL(file);
}

function deleteCard(themeId, index) {
  const theme = data.themes.find(t => t.id === themeId);
  theme.cards.splice(index, 1);
  save();
}

function render() {
  const select = document.getElementById('themeSelect');
  select.innerHTML = '';

  data.themes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });

  const list = document.getElementById('cardList');
  list.innerHTML = '';

  data.themes.forEach(t => {
    t.cards.forEach((c, i) => {
      const div = document.createElement('div');
      div.innerHTML = `
        <strong>${t.name}</strong> – ${c.word}
        <button onclick="deleteCard('${t.id}', ${i})">❌</button><br>
        <img src="${c.image}" height="60"><br><br>
      `;
      list.appendChild(div);
    });
  });
}

render();