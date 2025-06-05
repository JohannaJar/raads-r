/* main.js – génère le quiz, calcule les scores, affiche
   les résultats et permet l’export PDF.                 */

// Variables globales accessibles par showResults()
let questions = [];
let answers   = [];   // contiendra 80 nombres (0-3)

// Chargement du JSON puis initialisation
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const resp = await fetch('questions.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    questions = data.questions;               // 80 textes
    answers   = new Array(questions.length).fill(null);

    initializeQuiz(data);                     // crée le formulaire
  } catch (e) {
    document.getElementById('questions-container').innerHTML =
      `<p class="note" style="color:red;">Erreur&nbsp;: ${e.message}</p>`;
  }
});

// ----- Génération dynamique du questionnaire -----
function initializeQuiz({ questions: qTexts }) {
  const container = document.getElementById('questions-container');
  const options = [
    'Vrai maintenant et avant 16 ans',
    'Vrai seulement maintenant',
    'Vrai seulement avant 16 ans',
    'Jamais vrai'
  ];

  qTexts.forEach((txt, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';

    card.innerHTML = `
      <h3>Question ${idx + 1} / ${qTexts.length}</h3>
      <p>${txt}</p>
    `;

    options.forEach((label, cidx) => {
      const wrap  = document.createElement('div');
      wrap.className = 'choice-wrapper';

      const radio = document.createElement('input');
      radio.type  = 'radio';
      radio.name  = `question-${idx}`;
      radio.id    = `q${idx}-c${cidx}`;
      radio.dataset.qidx = idx;
      radio.dataset.cidx = cidx;

      const lab = document.createElement('label');
      lab.htmlFor = radio.id;
      lab.textContent = label;

      wrap.appendChild(radio);
      wrap.appendChild(lab);
      card.appendChild(wrap);
    });

    container.appendChild(card);
  });

  // Soumission du formulaire
  document.getElementById('raadsr-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    fetch('questions.json')
      .then(r => r.json())
      .then(data => calculateResults(data));
  });
}

// ----- Calcul des scores -----
function calculateResults({ questions: qArr, normative, subscales }) {
  // Récupération des choix utilisateurs
  for (let i = 0; i < qArr.length; i++) {
    const sel = document.querySelector(`input[name="question-${i}"]:checked`);
    if (!sel) { alert(`Répondez à la question ${i + 1} !`); return; }

    const cidx   = +sel.dataset.cidx;
    const isNorm = normative.includes(i);
    const score  = isNorm ? [0,1,2,3][cidx] : [3,2,1,0][cidx];
    answers[i]   = score;
  }

  // Agrégation
  const totals = {
    total: answers.reduce((s,v)=>s+v,0),
    'Social relatedness':       0,
    'Circumscribed interests':  0,
    'Language':                 0,
    'Sensory-motor':            0
  };

  answers.forEach((score, idx) => {
    Object.entries(subscales).forEach(([sub, idxArr]) => {
      if (idxArr.includes(idx)) totals[sub] += score;
    });
  });

  showResults(totals);
}

// ----- Affichage des résultats + export PDF -----
function showResults(totals) {
  /* 1. Carte de résultats */
  const cardWrap = document.getElementById('results-card-container');
  cardWrap.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card';

  const labels = {
    'Social relatedness':      'Relations sociales',
    'Circumscribed interests': 'Intérêts circonscrits',
    'Language':                'Langage',
    'Sensory-motor':           'Sensoriel-moteur'
  };

  card.innerHTML = `
    <h2>Vos résultats</h2>
    <ul>
      ${Object.entries(totals).filter(([k])=>k!=='total').map(
        ([k,v])=>`<li><strong>${labels[k]} :</strong> ${v}</li>`
      ).join('')}
    </ul>
    <h3>Score total : ${totals.total} / 240</h3>
    <p>${totals.total >= 65
         ? '<span style="color:#007bff;font-weight:bold;">≥ 65 → traits autistiques probables</span>'
         : '<span style="color:#ff8800;font-weight:bold;">Score inférieur au seuil clinique (65)</span>'}
    </p>
    <p class="note">Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.</p>
  `;

  const restart = document.createElement('button');
  restart.id = 'restart';
  restart.textContent = 'Recommencer le test';
  restart.onclick = () => location.reload();
  card.appendChild(restart);

  cardWrap.appendChild(card);
  card.scrollIntoView({behavior:'smooth'});

  /* 2. Résumé des réponses */
  const summary = document.getElementById('answers-summary-container');
  summary.innerHTML = '<h3>Vos réponses</h3>';

  const optLabels = [
    'Vrai maintenant et avant 16 ans',
    'Vrai seulement maintenant',
    'Vrai seulement avant 16 ans',
    'Jamais vrai'
  ];

  const ol = document.createElement('ol');
  questions.forEach((q, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>Q${i+1} :</strong> ${q}<br>
                    <em>Réponse :</em> ${optLabels[answers[i]]}`;
    ol.appendChild(li);
  });
  summary.appendChild(ol);

  /* 3. Bouton PDF */
  const pdfBtn = document.getElementById('download-pdf-btn');
  if (pdfBtn) pdfBtn.onclick = () => window.print();
}
