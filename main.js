/* main.js – Génère le quiz, calcule les scores, affiche les résultats, gère le PDF */

let questions = [];
let answers = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Charger le fichier JSON contenant les questions + info normative/subscales
    const response = await fetch('questions.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    questions = data.questions;                      // Tableau de 80 textes
    answers   = new Array(questions.length).fill(null); // Initialisation

    initializeQuiz(data);
  } catch (err) {
    // En cas d’erreur de chargement, afficher un message
    document.getElementById('questions-container').innerHTML = `
      <p class="note" style="color:red">
        Impossible de charger les questions : ${err.message}
      </p>`;
  }
});

// ─── 1. Générer le quiz ───
function initializeQuiz({ questions: qTexts }) {
  const container = document.getElementById('questions-container');
  const optionLabels = [
    'Vrai maintenant et avant 16 ans',
    'Vrai seulement maintenant',
    'Vrai seulement avant 16 ans',
    'Jamais vrai'
  ];

  qTexts.forEach((text, idx) => {
    // Carte de chaque question
    const card = document.createElement('div');
    card.className = 'question-card';

    // Titre “Question X / 80”
    const title = document.createElement('h3');
    title.textContent = `Question ${idx + 1} / ${qTexts.length}`;
    card.appendChild(title);

    // Texte de l’affirmation
    const para = document.createElement('p');
    para.textContent = text;
    card.appendChild(para);

    // Les 4 choix (radio buttons)
    optionLabels.forEach((lbl, cIdx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'choice-wrapper';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `question-${idx}`;
      radio.id   = `q${idx}-c${cIdx}`;
      radio.dataset.qidx = idx;
      radio.dataset.cidx = cIdx;

      const label = document.createElement('label');
      label.htmlFor = radio.id;
      label.textContent = lbl;

      wrapper.appendChild(radio);
      wrapper.appendChild(label);
      card.appendChild(wrapper);
    });

    container.appendChild(card);
  });

  // Soumettre le formulaire
  document.getElementById('raadsr-form').addEventListener('submit', (evt) => {
    evt.preventDefault();
    calculateResults();
  });
}

// ─── 2. Calculer les scores ───
function calculateResults() {
  // 2.1. Récupérer les réponses et vérifier que tout est coché
  for (let i = 0; i < questions.length; i++) {
    const selected = document.querySelector(`input[name="question-${i}"]:checked`);
    if (!selected) {
      alert(`⚠️ Veuillez répondre à la question ${i + 1} avant de soumettre.`);
      return;
    }
    const cIdx   = +selected.dataset.cidx;
    // Items normatifs (indice inversé) vs non-normatifs
    // Pour cela, on doit demander `subscales` et `normative` qui étaient dans questions.json
    // Mais comme elles sont dans `data`, on va les récupérer à nouveau :
    const normative = window._raadsrData.normative;
    const isNorm    = normative.includes(i);
    const score     = isNorm ? [0,1,2,3][cIdx] : [3,2,1,0][cIdx];
    answers[i] = score;
  }

  // 2.2. Calculer total + sous-scores
  const totals = {
    total: answers.reduce((a, b) => a + b, 0),
    'Social relatedness':      0,
    'Circumscribed interests': 0,
    'Language':                0,
    'Sensory-motor':           0
  };

  const subscales = window._raadsrData.subscales;
  answers.forEach((score, idx) => {
    Object.entries(subscales).forEach(([subName, indices]) => {
      if (indices.includes(idx)) {
        totals[subName] += score;
      }
    });
  });

  // 2.3. Afficher les résultats
  showResults(totals);
}

// ─── 3. Afficher les résultats, le résumé, le PDF et les tableaux ───
function showResults(totals) {
  // 3.1. Carte “Vos résultats”
  const cardContainer = document.getElementById('results-card-container');
  cardContainer.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card';

  const labelsFR = {
    'Social relatedness':      'Relations sociales',
    'Circumscribed interests': 'Centres d’intérêt restreints / intérêts spécifiques',
    'Language':                'Langage',
    'Sensory-motor':           'Sensoriel-moteur'
  };

  // Liste des sous-scores
  const ul = document.createElement('ul');
  Object.entries(totals).forEach(([key, val]) => {
    if (key === 'total') return;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${labelsFR[key]} :</strong> ${val}`;
    ul.appendChild(li);
  });
  card.appendChild(document.createElement('h2')).textContent = 'Vos résultats';
  card.appendChild(ul);

  // Score total
  const h3 = document.createElement('h3');
  h3.textContent = `Score total : ${totals.total} / 240`;
  card.appendChild(h3);

  // Interprétation
  const interp = document.createElement('p');
  if (totals.total >= 65) {
    interp.innerHTML = `<span style="color:#007bff; font-weight:bold;">
      >= 65 → traits autistiques probables
    </span>`;
  } else {
    interp.innerHTML = `<span style="color:#ff8800; font-weight:bold;">
      Score inférieur au seuil clinique (65)
    </span>`;
  }
  card.appendChild(interp);

  // Note
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = 'Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.';
  card.appendChild(note);

  // Bouton “Recommencer”
  const restart = document.createElement('button');
  restart.id = 'restart';
  restart.textContent = 'Recommencer le test';
  restart.onclick = () => location.reload();
  card.appendChild(restart);

  cardContainer.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth' });

  // 3.2. Section “Vos réponses” réductible + PDF
  const summary = document.getElementById('answers-summary-container');
  summary.innerHTML = '';

  // (A) Bouton PDF
  const pdfBtn = document.createElement('button');
  pdfBtn.id = 'download-pdf-btn';
  pdfBtn.textContent = '📄 Télécharger mes résultats en PDF';
  pdfBtn.className = 'pdf-btn';
  summary.appendChild(pdfBtn);

  // (B) Texte toggle (Afficher / Masquer)
  const toggleText = document.createElement('p');
  toggleText.className = 'toggle-text';
  toggleText.innerHTML = '>> Afficher / Masquer le détail des réponses <<';
  summary.appendChild(toggleText);

  // (C) Conteneur des réponses (masqué par défaut)
  const answersBox = document.createElement('div');
  answersBox.id = 'answers-list';
  answersBox.style.display = 'none';
  summary.appendChild(answersBox);

  // (D) Titre “Vos réponses”
  const heading = document.createElement('h3');
  heading.textContent = 'Vos réponses';
  answersBox.appendChild(heading);

  // (E) Liste ordonnée des 80 réponses
  const optLabels = [
    'Vrai maintenant et avant 16 ans',
    'Vrai seulement maintenant',
    'Vrai seulement avant 16 ans',
    'Jamais vrai'
  ];
  const ol = document.createElement('ol');
  questions.forEach((q, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>Q${i+1} :</strong> ${q}<br><em>Réponse :</em> ${optLabels[answers[i]]}`;
    ol.appendChild(li);
  });
  answersBox.appendChild(ol);

  // (F) Événement toggle
  toggleText.onclick = () => {
    answersBox.style.display = answersBox.style.display === 'none' ? 'block' : 'none';
  };

  // (G) Fonction PDF
  pdfBtn.onclick = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titre
    doc.setFontSize(16);
    doc.text("Résultats du test RAADS-R", 10, 20);

    // Sous-scores
    let y = 35;
    doc.setFontSize(12);
    Object.entries(totals).forEach(([key, val]) => {
      if (key === 'total') return;
      const labelFr = labelsFR[key];
      doc.text(`${labelFr} : ${val}`, 10, y);
      y += 10;
    });

    // Score total
    doc.text(`Score total : ${totals.total} / 240`, 10, y);
    y += 10;

    // Interprétation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    if (totals.total >= 65) {
      doc.setTextColor(0, 102, 204); // bleu
      doc.text(">= 65 → Traits autistiques probables", 10, y);
    } else {
      doc.setTextColor(255, 102, 0); // orange
      doc.text("Score inférieur au seuil clinique (65)", 10, y);
    }
    doc.setTextColor(0, 0, 0); // remise en noir
    y += 20;

    // “Vos réponses :”
    doc.setFont("helvetica", "bold");
    doc.text("Vos réponses :", 10, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // On parcourt chaque question/réponse
    questions.forEach((q, i) => {
      const r = answers[i];
      const answerLabel = optLabels[r];
      const line = `Q${i+1}. ${q} – Réponse : ${answerLabel}`;
      const split = doc.splitTextToSize(line, 180);
      split.forEach(txt => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(txt, 10, y);
        y += 7;
      });
    });

    // Télécharger le PDF
    doc.save("resultats-raads-r.pdf");
  };

  // 3.3. Les sections “Que signifient mes scores ?” et “Scores moyens RAADS-R” sont dans index.html
}

// Pour stocker subscales/normative et y accéder depuis calculateResults()
fetch('questions.json')
  .then(r => r.json())
  .then(data => {
    window._raadsrData = {
      normative: data.normative,
      subscales: data.subscales
    };
  });
