// main.js – Affichage séquentiel de toutes les questions + calcul des résultats

// 1. Chargement du fichier questions.json dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    const data = await response.json();
    initializeQuiz(data);
  } catch (err) {
    document.getElementById('questions-container').innerHTML = `
      <p class="note" style="color: red;">
        Impossible de charger les questions : ${err.message}
      </p>
    `;
  }
});

// 2. Fonction d’initialisation du quiz
function initializeQuiz(data) {
  const { questions, normative, subscales } = data;
  const container = document.getElementById('questions-container');

  // Pour chaque question, on crée une carte (div.question-card)
  questions.forEach((text, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';

    // Titre “Question n / 80”
    const title = document.createElement('h3');
    title.textContent = `Question ${idx + 1} / ${questions.length}`;
    card.appendChild(title);

    // Texte de l’affirmation
    const para = document.createElement('p');
    para.textContent = text;
    card.appendChild(para);

    // Les 4 choix (“radio buttons”)
    const optionsTexte = [
      'Vrai maintenant et avant 16 ans',
      'Vrai seulement maintenant',
      'Vrai seulement avant 16 ans',
      'Jamais vrai'
    ];

    optionsTexte.forEach((labelText, choiceIdx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'choice-wrapper';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `question-${idx}`;
      radio.id = `q${idx}-c${choiceIdx}`;
      // On ne met pas encore de value, on stocke choiceIdx via "data-"
      radio.dataset.qidx = idx;
      radio.dataset.cidx = choiceIdx;

      const label = document.createElement('label');
      label.htmlFor = `q${idx}-c${choiceIdx}`;
      label.textContent = labelText;

      wrapper.appendChild(radio);
      wrapper.appendChild(label);
      card.appendChild(wrapper);
    });

    container.appendChild(card);
  });

  // On ajoute l’événement au formulaire pour le submit
  document.getElementById('raadsr-form').addEventListener('submit', (evt) => {
    evt.preventDefault();
    calculateResults(questions, normative, subscales);
  });
}

// 3. Fonction de calcul des résultats quand on soumet le formulaire
function calculateResults(questions, normative, subscales) {
  const answers = new Array(questions.length).fill(null);

  // Parcourir chaque question et récupérer le bouton radio coché
  for (let i = 0; i < questions.length; i++) {
    const selected = document.querySelector(`input[name="question-${i}"]:checked`);
    if (selected) {
      const choiceIdx = parseInt(selected.dataset.cidx, 10);
      const isNorm = normative.includes(i);
      // Mapping des points selon normatif ou symptomatique
      const score = isNorm
        ? [0, 1, 2, 3][choiceIdx]
        : [3, 2, 1, 0][choiceIdx];
      answers[i] = score;
    } else {
      // Si une question n'est pas cochée, on arrête et on signale l'erreur
      alert(`⚠️ Veuillez répondre à la question ${i + 1} avant de soumettre.`);
      return;
    }
  }

  // À ce stade, on a un tableau "answers" complet (80 scores 0–3)
  // On calcule maintenant le score total et par sous-échelle
  const totals = {
    total: answers.reduce((sum, v) => sum + v, 0),
    'Social relatedness': 0,
    'Circumscribed interests': 0,
    'Language': 0,
    'Sensory-motor': 0
  };

  answers.forEach((score, idx) => {
    Object.entries(subscales).forEach(([name, indices]) => {
      if (indices.includes(idx)) {
        totals[name] += score;
      }
    });
  });

  // On appelle showResults pour afficher la carte de résultats
  showResults(totals);
}
/**
 * showResults : injecte la carte de résultats, la liste des réponses,
 *              et met en place le bouton “Télécharger en PDF”.
 */
function showResults(totals) {
  // 1. Vider le conteneur de la carte de résultats
  const cardContainer = document.getElementById('results-card-container');
  cardContainer.innerHTML = '';

  // 2. Créer la carte (div.card) pour afficher les scores
  const card = document.createElement('div');
  card.className = 'card';

  // 2.a. Titre
  const heading = document.createElement('h2');
  heading.textContent = 'Vos résultats';
  card.appendChild(heading);

  // 2.b. Mapping anglais → français pour les sous-catégories
  const labelsFr = {
    "Social relatedness": "Relations sociales",
    "Circumscribed interests": "Intérêts circonscrits",
    "Language": "Langage",
    "Sensory-motor": "Sensoriel-moteur"
  };

  // 2.c. Liste des sous-scores (liens vers labelsFr)
  const ul = document.createElement('ul');
  Object.entries(totals).forEach(([keyEn, score]) => {
    if (keyEn === 'total') return;
    const labelFr = labelsFr[keyEn] || keyEn;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${labelFr} :</strong> ${score}`;
    ul.appendChild(li);
  });
  card.appendChild(ul);

  // 2.d. Score total + interprétation
  const h3 = document.createElement('h3');
  h3.innerHTML = `Score total : ${totals.total} / 240`;
  card.appendChild(h3);

  const interpretation = document.createElement('p');
  interpretation.innerHTML = totals.total >= 65
    ? `<span style="color: #007bff; font-weight: bold;">
         ≥ 65 → traits autistiques probables
       </span>`
    : `<span style="color: #ff8800; font-weight: bold;">
         Score inférieur au seuil clinique (65)
       </span>`;
  card.appendChild(interpretation);

  // 2.e. Note de mise en garde
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = 'Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.';
  card.appendChild(note);

  // 2.f. Bouton “Recommencer le test”
  const btnRestart = document.createElement('button');
  btnRestart.id = 'restart';
  btnRestart.textContent = 'Recommencer le test';
  btnRestart.onclick = () => {
    location.reload();
  };
  card.appendChild(btnRestart);

  // 3. Injecter la carte de résultats dans son conteneur dédié
  cardContainer.appendChild(card);

  // 4. Faire défiler doucement jusqu’à la carte
  card.scrollIntoView({ behavior: 'smooth' });

  // === 5. Construire le résumé des réponses : “Question n : texte → réponse” ===
  //    On suppose que "questions" et "answers" sont des variables globales
  //    créées par votre code d’initialisation (initializeQuiz) :
  //
  //    - questions : tableau de 80 chaînes de caractères (le texte de chaque question)
  //    - answers   : tableau de 80 valeurs { 0,1,2,3 } correspondant à l’index choisi
  //
  //    On doit également savoir quelle étiquette (texte) correspond à chaque index {0,1,2,3}.
  //
  const summaryContainer = document.getElementById('answers-summary-container');
  summaryContainer.innerHTML = ''; // on vide l’ancien résumé (s’il existe)

  const titleSummary = document.createElement('h3');
  titleSummary.textContent = 'Vos réponses';
  summaryContainer.appendChild(titleSummary);

  const listSummary = document.createElement('ol');
  listSummary.style.margin = '1rem 0';
  // Tableau des labels exacts dans l’ordre des boutons
  const optionLabels = [
    'Vrai maintenant et avant 16 ans',
    'Vrai seulement maintenant',
    'Vrai seulement avant 16 ans',
    'Jamais vrai'
  ];

  // On parcourt toutes les questions
  questions.forEach((questionText, idx) => {
    // answers[idx] vaut 0,1,2 ou 3 (puisque l’utilisateur a répondu à toutes)
    const chosenIndex = answers[idx];
    const chosenLabel = optionLabels[chosenIndex];

    const li = document.createElement('li');
    li.style.marginBottom = '0.5rem';
    li.innerHTML = `<strong>Q${idx + 1} :</strong> ${questionText}  
                    <br><em>Réponse :</em> ${chosenLabel}`;
    listSummary.appendChild(li);
  });

  summaryContainer.appendChild(listSummary);

  // === 6. Configurer le bouton “Télécharger en PDF” ===
  const pdfBtn = document.getElementById('download-pdf-btn');
  if (pdfBtn) {
    pdfBtn.onclick = () => {
      window.print(); // ouvre la boîte d’impression
    };
  }
}

