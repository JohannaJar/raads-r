// main.js (version compatible GitHub Pages)
// -------------------------------------------------
// Charge et affiche le questionnaire RAADS-R (80 items)
// avec cotation et page de résultats.

// Variables globales
let dataGlobal; // contiendra { questions, normative, subscales }
const app = document.getElementById('app');
let current = 0;        // index de la question en cours
const answers = [];     // stocke les scores de chaque réponse

// 1. Fonction d'initialisation : charger questions.json
async function loadData() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    dataGlobal = await response.json();
    renderQuestion();
  } catch (err) {
    app.innerHTML = `<p class="note">Impossible de charger les questions : ${err.message}</p>`;
  }
}

// 2. Afficher la question courante
function renderQuestion() {
  app.innerHTML = ''; // on vide la zone

  const { questions, normative } = dataGlobal;
  // Si on a épuisé toutes les questions, on affiche les résultats
  if (current >= questions.length) {
    showResults();
    return;
  }

  // Création d'une carte "question"
  const qDiv = document.createElement('div');
  qDiv.className = 'card';

  // Titre et texte de la question
  qDiv.innerHTML = `
    <h2>Question ${current + 1} / ${questions.length}</h2>
    <p>${questions[current]}</p>
  `;

  // Les 4 choix de réponse
  const choices = [
    'Vrai maintenant et avant 16 ans',
    'Vrai seulement maintenant',
    'Vrai seulement avant 16 ans',
    'Jamais vrai'
  ];

  // Pour chaque choix, on crée un bouton
  choices.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'choice';
    btn.onclick = () => selectAnswer(i);
    qDiv.appendChild(btn);
  });

  // Ajout de la carte question dans la page
  app.appendChild(qDiv);
}

// 3. Lorsque l'utilisateur clique sur un choix
function selectAnswer(index) {
  const { normative } = dataGlobal;
  // Vérifier si cet item est "normatif" (notation inversée)
  const isNorm = normative.includes(current);
  // Mapping des points selon type
  //   - si symptomatique : réponses [0,1,2,3] → [3,2,1,0]
  //   - si normatif      : [0,1,2,3] → [0,1,2,3]
  const scoreMap = isNorm ? [0, 1, 2, 3] : [3, 2, 1, 0];
  const pts = scoreMap[index];
  answers.push(pts);

  // Passer à la question suivante
  current++;
  renderQuestion();
}

// 4. Calculer et afficher les résultats finaux
function showResults() {
  const { subscales } = dataGlobal;

  // Initialiser les totaux
  const totals = {
    total: answers.reduce((acc, val) => acc + val, 0),
    'Social relatedness': 0,
    'Circumscribed interests': 0,
    'Language': 0,
    'Sensory-motor': 0
  };

  // Répartition par sous-échelle
  answers.forEach((score, idx) => {
    Object.entries(subscales).forEach(([name, indices]) => {
      if (indices.includes(idx)) {
        totals[name] += score;
      }
    });
  });

  // Création de la carte "résultats"
  const resDiv = document.createElement('div');
  resDiv.className = 'card';

  // Contenu HTML des résultats
  resDiv.innerHTML = `
    <h2>Résultats</h2>
    <ul>
      <li><strong>Social relatedness :</strong> ${totals['Social relatedness']}</li>
      <li><strong>Circumscribed interests :</strong> ${totals['Circumscribed interests']}</li>
      <li><strong>Language :</strong> ${totals['Language']}</li>
      <li><strong>Sensory-motor :</strong> ${totals['Sensory-motor']}</li>
    </ul>
    <h3>Score total : ${totals.total} / 240</h3>
    <p>${totals.total >= 65 
      ? '<span style="color:green;">≥ 65 → traits autistiques probables</span>' 
      : '<span style="color:orange;">Score inférieur au seuil clinique (65)</span>'}
    </p>
    <p class="note">Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.</p>
    <button id="restart" class="choice">Recommencer le test</button>
  `;

  app.appendChild(resDiv);

  // Bouton "Recommencer" : recharge la page
  document.getElementById('restart').onclick = () => {
    location.reload();
  };
}

// 5. Lancer le chargement des données au démarrage
loadData();
