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

// 4. Fonction d’affichage des résultats
function showResults(totals) {
  const resultsSection = document.getElementById('results');
  resultsSection.innerHTML = ''; // vider le contenu existant

  const card = document.createElement('div');
  card.className = 'card';

  // Titre
  const heading = document.createElement('h2');
  heading.textContent = 'Vos résultats';
  card.appendChild(heading);

  // Liste des sous-scores
  const ul = document.createElement('ul');
  Object.entries(totals).forEach(([name, score]) => {
    if (name !== 'total') {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${name} :</strong> ${score}`;
      ul.appendChild(li);
    }
  });
  card.appendChild(ul);

  // Score total + interprétation
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

  // Note de mise en garde
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = 'Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.';
  card.appendChild(note);

  // Bouton "Recommencer le test"
  const btn = document.createElement('button');
  btn.id = 'restart';
  btn.textContent = 'Recommencer le test';
  btn.onclick = () => {
    location.reload();
  };
  card.appendChild(btn);

  resultsSection.appendChild(card);

  // Scroll vers les résultats
  card.scrollIntoView({ behavior: 'smooth' });
}
