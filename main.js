
import data from './questions.json' assert {{ type: 'json' }};

const app = document.getElementById('app');
const {{ questions, normative, subscales }} = data;
let current = 0;
const answers = [];

function renderQuestion() {{
    app.innerHTML = '';
    if (current >= questions.length) {{
        showResults();
        return;
    }}
    const q = document.createElement('div');
    q.className = 'card';
    q.innerHTML = `<h2>Question ${{
        current+1
    }}/80</h2><p>${{questions[current]}}</p>`;
    const choices = [
        'Vrai maintenant et avant 16 ans',
        'Vrai seulement maintenant',
        'Vrai seulement avant 16 ans',
        'Jamais vrai'
    ];
    choices.forEach((label,i)=>{{
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.onclick=()=>select(i);
        btn.className = 'choice';
        q.appendChild(btn);
    }});
    app.appendChild(q);
}}

function select(index){{
    const isNorm = normative.includes(current);
    const mapping = isNorm ? [0,1,2,3] : [3,2,1,0];
    answers.push(mapping[index]);
    current++;
    renderQuestion();
}}

function showResults(){{
    const totals = {{
        total: answers.reduce((a,b)=>a+b,0),
        'Social relatedness':0,
        'Circumscribed interests':0,
        'Language':0,
        'Sensory-motor':0
    }};
    answers.forEach((score,idx)=>{{
        Object.entries(subscales).forEach(([name,list])=>{{
            if(list.includes(idx)) totals[name]+=score;
        }})
    }});
    const container = document.createElement('div');
    container.innerHTML = `
      <h2>Résultats</h2>
      <ul>
        <li>Social : ${{totals['Social relatedness']}}</li>
        <li>Intérêts circonscrits : ${{totals['Circumscribed interests']}}</li>
        <li>Langage : ${{totals['Language']}}</li>
        <li>Sensori‑moteur : ${{totals['Sensory-motor']}}</li>
      </ul>
      <h3>Score total : ${{totals.total}} / 240</h3>
      <p>${{ totals.total>=65 ? '≥ 65 → traits autistiques probables' : 'Score inférieur au seuil clinique (65)' }}</p>
      <p class="note">Ce test est un outil de dépistage et ne remplace pas un diagnostic clinique.</p>
      <button id="restart">Recommencer</button>
    `;
    app.innerHTML = '';
    app.appendChild(container);
    document.getElementById('restart').onclick=()=>{{location.reload();}};
}}

renderQuestion();
