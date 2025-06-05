// main.js (version avec navigation et “defer” dans index.html)
// ------------------------------------------------------------

// Variables globales
let dataGlobal;              // contiendra { questions, normative, subscales }
const app = document.getElementById('app');
const navList = document.getElementById('question-nav');
const toggleNavBtn = document.getElementById('toggle-nav');
let current = 0;             // index de la question en cours (0 à 79)
const answers = new Array(80).fill(null); // conserve la réponse ou null

// 1. Chargement du JSON au démarrage
async function loadData() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    dataGlobal = await response.json();
    initNav();         // créer les 80 boutons Q1…Q80
    renderQuestion();  // afficher la première question
  } catch (err) {
    // Si element #app est null, la page n’a pas encore chargé le DOM (mais on a "defer", donc ça ne devrait plus arriver).
    if (app) {
      app.innerHTML = `<p class="note">Impossible de charger les questions : ${err.message}</p>`;
    } else {
      console.error("Le <div id='app'> est introuvable. Vérifiez index.html.");
    }
  }
}

// 2. Création dynamique de la colonne de navigation
function initNav() {
  const { questions } = dataGlobal;
  navList.innerHTML = ''; // vider la liste si elle existait

  questions.forEach((_, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = `Q${idx + 1}`;
    btn.id = `nav-btn-${idx}`;
    btn.classList.add('unanswered'); // couleur rouge par défaut
    btn.onclick = () => {
      current = idx;
      renderQuestion();
    };
    li.appendChild(btn);
    navList.appendChild(li);
  });

  // Bouton pour déplier/ replier la colonne
  toggleNavBtn.onclick = () => {
    const navContainer = document.getElementById('question-nav-container');
    navContainer.classList.toggle('collapsed');
    const visible = !navContainer.classList.contains('collapsed');
    toggleNavBtn.textContent = visible
      ? 'Masquer mes réponses ◀'
      : 'Voir toutes mes réponses ▶';
  };
}

// 3. Afficher la question “current”
function renderQuestion() {
  app.innerHTML = ''; // on vide la zone de contenu

  const { questions, normative } = dataGlobal;
  updateNavClasses(); // met à jour les classes CSS dans la colonne

  // Quand on a répondu à la dernière question, on affiche les résultats
  if (current >= questions.length) {
    showResults();
    return;
  }

  // Création de la carte (DIV) pour la question courante
  const qDiv = document.createElement('div');
  qDiv.className = 'card';

  qDiv.innerHTML = `
    <h2>Question ${current + 1} / ${questions.length}</h2>
    <p>${questions[current]}</p>
  `;

  // Les quatre boutons de réponse
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

    // Si l’utilisateur a déjà répondu à cette question, on entoure son choix
    const prev = answers[current];
    const isNorm = normative.includes(current);
    const mapped = isNorm ? [0, 1, 2, 3][i] : [3, 2, 1, 0][i];
    if (prev !== null && prev === mapped) {
      btn.style.border = '2px solid #4285f4';
    }

    btn.onclick = () => selectAnswer(i);
    qDiv.appendChild(btn);
  });

  app.appendChild(qDiv);
}

// 4. Mapper l’index de bouton à un score (0–3)
function mapAnswerToScore(buttonIdx, isNormatif) {
  return isNormatif
    ? [0, 1, 2, 3][buttonIdx]
    : [3, 2, 1, 0][buttonIdx];
}

// 5. Quand l’utilisateur clique sur un choix
function selectAnswer(buttonIdx) {
  const isNorm = dataGlobal.normative.includes(current);
  const score = mapAnswerToScore(buttonIdx, isNorm);
  answers[current] = score;

  // Mettre à jour le bouton Qn dans la nav
  const navBtn = document.getElementById(`nav-btn-${current}`);
  navBtn.classList.remove('unanswered');
  navBtn.classList.add('answered');

  // Avancer à la question suivante si elle existe
  if (current < dataGlobal.questions.length - 1) {
    current++;
  }
  renderQuestion();
}

// 6. Mettre à jour les classes sur les boutons Qn pour "current"
function updateNavClasses() {
  dataGlobal.questions.forEach((_, idx) => {
    const navBtn = document.getElementById(`nav-btn-${idx}`);
    navBtn.classList.remove('current');
    if (answers[idx] !== null) {
      navBtn.classList.remove('unanswered');
      navBtn.classList.add('answered');
    }
    if (idx === current) {
      navBtn.classList.add('current');
    }
  });
}

// 7. Calculer et afficher les résultats finaux
function showResults() {
  const { subscales } = dataGlobal;

  // Calcul des sous-scores + total
  const totals = {
    total: answers.reduce((sum, v) => sum + (v !== null ? v : 0), 0),
    'Social relatedness': 0,
    'Circumscribed interests': 0,
    'Language': 0,
    'Sensory-motor': 0
  };
  answers.forEach((score, idx) => {
    if (score !== null) {
      Object.entries(subscales).forEach(([name, indices]) => {
        if (indices.includes(idx)) {
          totals[name] += score;
        }
      });
    }
  });

  // Création de la carte "résultats"
  const resDiv = document.createElement('div');
  resDiv.className = 'card';
  resDiv.innerHTML = `
    <h2>Résultats</h2>
    <ul>
      <li><strong>Social relatedness :</strong> ${totals['Social relatedness']}</li>
      <li><strong>Circumscribed interests :</strong> ${totals['Circumscribed interests']}</li>
      <li><strong>Language :</strong> ${totals['Language']}</li>
      <li><strong>Sensory-motor :</strong> ${totals['Sensory-motor']}</li>
    </ul>
    <h3>Score total : ${totals.total} / 240</h3>
    <p>${
      totals.total >= 65
        ? '<span style="color:green;">≥ 65 → traits autistiques probables</span>'
        : '<span style="color:orange;">Score inférieur au seuil clinique (65)</span>'
    }</p>
    <p class="note">Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.</p>
    <button id="restart" class="choice">Recommencer le test</button>
  `;

  // On remplace complètement la zone <div id="app"> par la carte des résultats
  app.innerHTML = '';
  document.getElementById('main-content').appendChild(resDiv);

  // Cacher la navigation
  document.getElementById('question-nav-container').classList.add('collapsed');
  toggleNavBtn.textContent = 'Voir toutes mes réponses ▶';

  document.getElementById('restart').onclick = () => {
    location.reload();
  };
}

// 8. On démarre tout en appelant la première fois loadData()
loadData();
