// ARCANA — Galerie filtrable + configurateur avec aperçu en direct

/* ---------- Styles disponibles ---------- */
const STYLES = [
    { key: 'pop',       label: 'Pop Art' },
    { key: 'retro',     label: 'Rétro 70s' },
    { key: 'classique', label: 'Classique' },
    { key: 'deco',      label: 'Art Déco' },
    { key: 'minimal',   label: 'Minimaliste' },
    { key: 'mystique',  label: 'Mystique' },
];

// apparence de l'aperçu pour chaque style
const PRESETS = {
    pop:       { bg: '#ffd23f', frame: '#1a1614', ink: '#1a1614', accent: '#ff5a5f', glyphFill: '#ffd23f', font: "'Bagel Fat One',cursive",        disc: true,  frame2: false },
    retro:     { bg: '#f2ebda', frame: '#e8612c', ink: '#2b2150', accent: '#e8612c', glyphFill: '#f2ebda', font: "'Bagel Fat One',cursive",        disc: true,  frame2: true  },
    classique: { bg: '#f3ead2', frame: '#8a6a22', ink: '#5b4516', accent: '#c89b3c', glyphFill: '#f3ead2', font: "Georgia,'Times New Roman',serif", disc: true,  frame2: true  },
    deco:      { bg: '#14224a', frame: '#d9b25b', ink: '#d9b25b', accent: '#d9b25b', glyphFill: '#14224a', font: "Georgia,serif",                   disc: true,  frame2: true  },
    minimal:   { bg: '#faf6ef', frame: '#1a1614', ink: '#1a1614', accent: '#e8612c', glyphFill: '#1a1614', font: "Poppins,sans-serif",             disc: false, frame2: false },
    mystique:  { bg: '#1b1440', frame: '#d9b25b', ink: '#f4d98b', accent: '#6a49bd', glyphFill: '#f4d98b', font: "Georgia,serif",                   disc: true,  frame2: true  },
};

// correspondance carte d'exemple -> réglages adoptés au clic « Choisir ce style »
const CARD_META = [
    { style: 'pop',       glyph: '☀', num: 'XIX'   },
    { style: 'retro',     glyph: '☾', num: 'XVIII' },
    { style: 'classique', glyph: '★', num: 'XVII'  },
    { style: 'deco',      glyph: '✦', num: 'XXI'   },
    { style: 'minimal',   glyph: '✶', num: 'I'     },
    { style: 'mystique',  glyph: '☾', num: 'II'    },
];

/* ---------- État courant ---------- */
const state = { style: 'pop', glyph: '☀', num: 'XIX', name: '' };

/* ---------- Raccourcis DOM ---------- */
const $ = id => document.getElementById(id);
const cards = [...document.querySelectorAll('.tarot-card')];

/* ---------- 1. Étiquette de style + bouton sur chaque carte ---------- */
cards.forEach((card, i) => {
    const meta = CARD_META[i]; if (!meta) return;
    card.dataset.style = meta.style;
    const cap = card.querySelector('.tarot-cap');
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost sm choose-style';
    btn.type = 'button';
    btn.textContent = 'Choisir ce style';
    btn.addEventListener('click', () => chooseFromCard(meta));
    cap.appendChild(btn);
});

/* ---------- 2. Filtre par style (galerie) ---------- */
const chipsWrap = $('styleChips');
function makeChip(key, label) {
    const b = document.createElement('button');
    b.className = 'schip' + (key === 'all' ? ' active' : '');
    b.textContent = label;
    b.dataset.filter = key;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => filterBy(key, b));
    return b;
}
chipsWrap.appendChild(makeChip('all', 'Tous les styles'));
STYLES.forEach(s => chipsWrap.appendChild(makeChip(s.key, s.label)));

function filterBy(key, chip) {
    chipsWrap.querySelectorAll('.schip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    cards.forEach(card => {
        const show = key === 'all' || card.dataset.style === key;
        card.style.display = show ? '' : 'none';
    });
}

/* ---------- 3. Boutons de style dans le configurateur ---------- */
const stylesWrap = $('cfgStyles');
STYLES.forEach(s => {
    const b = document.createElement('button');
    b.className = 'schip cfg-style' + (s.key === state.style ? ' active' : '');
    b.type = 'button';
    b.textContent = s.label;
    b.dataset.style = s.key;
    b.addEventListener('click', () => { setStyle(s.key); });
    stylesWrap.appendChild(b);
});

/* ---------- 4. Rendu de l'aperçu en direct ---------- */
function render() {
    const p = PRESETS[state.style];
    const label = STYLES.find(s => s.key === state.style).label.toUpperCase();

    $('pvBg').setAttribute('fill', p.bg);

    const disc = $('pvDisc');
    disc.setAttribute('fill', p.disc ? p.accent : 'none');
    disc.style.display = p.disc ? '' : 'none';

    const glyph = $('pvGlyph');
    glyph.textContent = state.glyph;
    glyph.setAttribute('fill', p.disc ? p.glyphFill : p.ink);

    $('pvFrame').setAttribute('stroke', p.frame);
    const f2 = $('pvFrame2');
    f2.setAttribute('stroke', p.frame);
    f2.style.display = p.frame2 ? '' : 'none';

    const num = $('pvNum');
    num.textContent = state.num; num.setAttribute('fill', p.ink); num.setAttribute('font-family', p.font);

    const sl = $('pvStyleLabel');
    sl.textContent = label; sl.setAttribute('fill', p.ink); sl.setAttribute('font-family', p.font);

    $('pvBand').setAttribute('fill', p.ink);
    const nm = $('pvName');
    nm.textContent = state.name ? state.name.toUpperCase() : 'VOTRE NOM';
    nm.setAttribute('fill', p.bg); nm.setAttribute('font-family', p.font);

    $('pvMeta').textContent = `${STYLES.find(s => s.key === state.style).label} · ${state.num} · symbole ${state.glyph}`;

    // surbrillance des boutons de style
    stylesWrap.querySelectorAll('.cfg-style').forEach(b =>
        b.classList.toggle('active', b.dataset.style === state.style));
}

/* ---------- 5. Actions ---------- */
function setStyle(key) { state.style = key; render(); }

function chooseFromCard(meta) {
    state.style = meta.style; state.glyph = meta.glyph; state.num = meta.num;
    $('cfgSymbol').value = meta.glyph;
    $('cfgArcane').value = meta.num;
    render();
    const sec = $('configurateur');
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const sv = $('pvSvg');
    sv.animate([{ transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
}

$('cfgArcane').addEventListener('change', e => { state.num = e.target.value; render(); });
$('cfgSymbol').addEventListener('change', e => { state.glyph = e.target.value; render(); });
$('cfgName').addEventListener('input', e => { state.name = e.target.value; render(); });

$('configForm').addEventListener('submit', e => { e.preventDefault(); $('cfgSent').hidden = false; });

/* ---------- Ajout du jeu personnalisé au panier ---------- */
const toast = $('toast');
let tt;
$('cfgAdd').addEventListener('click', () => {
    const fmt = document.querySelector('input[name="fmt"]:checked').value;
    const price = fmt === '78' ? 89 : 59;
    const styleLabel = STYLES.find(s => s.key === state.style).label;
    const who = state.name ? ` « ${state.name} »` : '';
    window.ArcanaCart.add({
        key: 'custom-' + Date.now(),          // chaque jeu sur-mesure est unique
        id: 6,
        name: 'Jeu sur-mesure' + who,
        price,
        glyph: state.glyph,
        grad: 'g-sun',
        meta: `${styleLabel} · ${fmt === '78' ? '78 lames' : '22 majeurs'} · ${state.num}`,
    });
    document.querySelector('.nav-badge')?.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 300 });
    if (toast) {
        toast.textContent = `✦ Jeu sur-mesure ajouté au panier — ${price} €`;
        toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2400);
    }
});

/* ---------- Go ---------- */
render();
