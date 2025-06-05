// main.js (version avancée avec navigation)
// -------------------------------------------------
// 1. Variables globales
let dataGlobal;        // contiendra { questions, normative, subscales }
const app = document.getElementById('app');
const navList = document.getElementById('question-nav');
const toggleNavBtn = document.getElementById('toggle-nav');
let current = 0;       // index de la question en cours (0 à 79)
const answers = new Array(80).fill(null); // conserve la réponse (0,1,2 ou 3) ou null si non renseignée

// 2. Charger le JSON au démarrage
async function loadData() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    dataGlobal = await response.json();
    initNav();        // initialiser la liste de navigation
    renderQuestion(); // afficher la question 1
  } catch (err) {
    app.innerHTML = `<p class="note">Impossible de charger les questions : ${err.message}</p>`;
  }
}

// 3. Initialiser la navigation (colonne de gauche)
function initNav() {
  const { questions } = dataGlobal;
  navList.innerHTML = ''; // vider la liste au cas où

  questions.forEach((_, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = `Q${idx + 1}`;
    btn.id = `nav-btn-${idx}`;
    btn.classList.add('unanswered'); // par défaut, non répondu
    btn.onclick = () => {
      current = idx;
      renderQuestion();
    };
    li.appendChild(btn);
    navList.appendChild(li);
  });

  // Bouton de bascule (afficher/cacher la navigation)
  toggleNavBtn.onclick = () => {
    document.getElementById('question-nav-container').classList.toggle('collapsed');
    // changer le texte du bouton
    const expanded = !document.getElementById('question-nav-container').classList.contains('collapsed');
    toggleNavBtn.textContent = expanded 
      ? 'Masquer mes réponses ◀' 
      : 'Voir toutes mes réponses ▶';
  };
}

// 4. Afficher la question courante
function renderQuestion() {
  app.innerHTML = ''; // on vide la zone

  const { questions, normative } = dataGlobal;
  // Mettre à jour la classe CSS "current" sur la navigation
  updateNavClasses();

  // Si on a épuisé toutes les questions → afficher les résultats
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

    // Si l'utilisateur a déjà répondu à cette question, on peut pré-sélectionner le style
    const prevAnswer = answers[current];
    if (prevAnswer !== null && prevAnswer === mapAnswerToIndex(i, normative.includes(current))) {
      btn.style.border = '2px solid #4285f4'; // indiquer la sélection actuelle
    }

    btn.onclick = () => {
      selectAnswer(i);
    };
    qDiv.appendChild(btn);
  });

  // Ajout de la carte question dans la page
  app.appendChild(qDiv);
}

// 5. Mapper l’index du bouton sur des points (0 à 3)
function mapAnswerToIndex(buttonIndex, isNormatif) {
  // isNormatif = true → [0,1,2,3]
  // sinon → [3,2,1,0]
  return isNormatif 
    ? [0, 1, 2, 3][buttonIndex]
    : [3, 2, 1, 0][buttonIndex];
}

// 6. Lorsque l'utilisateur clique sur un choix
function selectAnswer(buttonIndex) {
  const isNorm = dataGlobal.normative.includes(current);
  const score = mapAnswerToIndex(buttonIndex, isNorm);
  answers[current] = score; // on mémorise la réponse

  // Mise à jour immédiate de la navigation (question répondue)
  const navBtn = document.getElementById(`nav-btn-${current}`);
  navBtn.classList.remove('unanswered');
  navBtn.classList.add('answered');

  // Garder la même question à l'écran pour que l'utilisateur puisse modifier si besoin,
  // ou passer automatiquement à la question suivante. Ici, on passe à la suivante :
  if (current < dataGlobal.questions.length - 1) {
    current++;
  }
  renderQuestion();
}

// 7. Mettre à jour les classes sur les boutons de nav (pour 'current', 'answered', 'unanswered')
function updateNavClasses() {
  dataGlobal.questions.forEach((_, idx) => {
    const navBtn = document.getElementById(`nav-btn-${idx}`);
    navBtn.classList.remove('current');
    // `answered` / `unanswered` sont gérés lors du selectAnswer
    if (idx === current) {
      navBtn.classList.add('current');
    }
  });
}

// 8. Calculer et afficher les résultats finaux
function showResults() {
  const { subscales } = dataGlobal;

  // Calcul des totaux
  const totals = {
    total: answers.reduce((acc, val) => acc + (val !== null ? val : 0), 0),
    'Social relatedness': 0,
    'Circumscribed interests': 0,
    'Language': 0,
    'Sensory-motor': 0
  };

  // Répartition par sous-échelle
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
    <p>${
      totals.total >= 65 
        ? '<span style="color:green;">≥ 65 → traits autistiques probables</span>' 
        : '<span style="color:orange;">Score inférieur au seuil clinique (65)</span>'
    }</p>
    <p class="note">Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.</p>
    <button id="restart" class="choice">Recommencer le test</button>
  `;

  app.innerHTML = ''; // vider la zone actuelle
  document.getElementById('main-content').appendChild(resDiv);

  // Bouton "Recommencer" : recharge la page
  document.getElementById('restart').onclick = () => {
    location.reload();
  };

  // Cacher la navigation pour laisser place aux résultats
  document.getElementById('question-nav-container').classList.add('collapsed');
  toggleNavBtn.textContent = 'Voir toutes mes réponses ▶';
}

// 9. Lancer le chargement des données au démarrage
loadData();
