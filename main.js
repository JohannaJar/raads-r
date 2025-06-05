// main.js (version compatible GitHub Pages)
let dataGlobal; // contiendra questions, normative, subscales

const app = document.getElementById('app');
let current = 0;
const answers = [];

// 1. Charger le JSON au démarrage
async function loadData() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    dataGlobal = await response.json();
    renderQuestion();
  } catch (err) {
    app.innerHTML = `<p>Impossible de charger les questions : ${err.message}</p>`;
  }
}

// 2. Afficher la question courante
function renderQuestion() {
  app.innerHTML = '';

  const { questions, normative } = dataGlobal;
  if (current >= questions.length) {
    showResults();
    return;
  }

  const q = document.createElement('div');
  q.className = 'card';
  q.innerHTML = `
    <h2>Question ${current + 1}/${questions.length}</h2>
    <p>${questions[current]}</p>
  `;

  // Les 4 choix de réponse
  const choices = [
    'Vrai maintenant et avant 16 ans',
    'Vrai seulement maintenant',
    'Vrai seulement avant 16 ans',
    'Jamais vrai'
  ];

  choices.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'choice';
    btn.onclick = () => selectAnswer(i);
    q.appendChild(btn);
  });

  app.appendChild(q);
}

// 3. Enregistrer la réponse et passer à la suivante
function selectAnswer(index) {
  const { normative } = dataGlobal;
  const isNorm = normative.includes(current);
  const mapping = isNorm ? [0, 1, 2, 3] : [3, 2, 1, 0];
  answers.push(mapping[index]);
  current++;
  renderQuestion();
}

// 4. Calculer et afficher les résultats
function showResults() {
  const { subscales } = dataGlobal;
  // Initialiser scores
  const totals = {
    total: 0,
    'Social relatedness': 0,
    'Circumscribed interests': 0,
    'Language': 0,
    'Sensory-motor': 0
  };

  // Somme totale
  totals.total = answers.reduce((a, b) => a + b, 0);

  // Sous-scores
  answers.forEach((score, idx) => {
    Object.entries(subscales).forEach(([name, list]) => {
      if (list.includes(idx)) {
        totals[name] += score;
      }
    });
  });

  // Construction de l'affichage des résultats
  const container = document.createElement('div');
  container.innerHTML = `
    <h2>Résultats</h2>
    <ul>
      <li>Social : ${totals['Social relatedness']}</li>
      <li>Intérêts circonscrits : ${totals['Circumscribed interests']}</li>
      <li>Langage : ${totals['Language']}</li>
      <li>Sensori-moteur : ${totals['Sensory-motor']}</li>
    </ul>
    <h3>Score total : ${totals.total} / ${answers.length * 3}</h3>
    <p>${totals.total >= 65 ? '≥ 65 → traits autistiques probables' 
                           : 'Score inférieur au seuil clinique (65)'}</p>
    <p class="note">Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.</p>
    <button id="restart">Recommencer</button>
  `;
  app.innerHTML = '';
  app.appendChild(container);
  document.getElementById('restart').onclick = () => location.reload();
}

// 5. Démarrer tout de suite la lecture du JSON
loadData();
