// ARCANA — Boutique : catalogue, filtres, tri, aperçu rapide, panier

/* ---------- Données produits : voir data.js (window.PRODUCTS) ---------- */
const PRODUCTS = window.PRODUCTS;

const grid = document.getElementById('grid');
const countEl = document.getElementById('count');
let activeCat = 'all';
let sortBy = 'featured';
let shown = 9;          // pagination « charger plus »

/* ---------- Étoiles ---------- */
const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

/* ---------- Rendu d'une carte ---------- */
function cardHTML(p, i) {
    const badge = p.badge === 'new'  ? '<span class="badge new">Nouveau</span>'
                : p.badge === 'best' ? '<span class="badge best">Best-seller</span>' : '';
    const old = p.old ? `<span class="old">${p.old} €</span>` : '';
    return `
    <article class="card-prod reveal" style="--reveal-delay:${(i % 3) * 80}ms" data-id="${p.id}">
        <div class="card-media ${p.grad}">
            ${badge}
            <button class="wish" aria-label="Ajouter aux favoris">♡</button>
            <span class="glyph">${p.glyph}</span>
            <div class="card-actions">
                <button class="btn btn-light sm act-view" data-id="${p.id}">Aperçu</button>
                <button class="btn btn-primary sm act-add" data-id="${p.id}">Ajouter</button>
            </div>
        </div>
        <div class="card-info">
            <span class="card-tag">${p.tag}</span>
            <h3 class="card-name"><a href="produit.html?id=${p.id}">${p.name}</a></h3>
            <div class="card-rating">${stars(p.rating)} <span>(${p.reviews})</span></div>
            <div class="card-foot">
                <span class="card-price">${p.price} €${old}</span>
            </div>
        </div>
    </article>`;
}

/* ---------- Lecture des filtres latéraux ---------- */
function checkedValues(group) {
    return new Set(
        [...document.querySelectorAll(`input[data-filter="${group}"]:checked`)].map(i => i.value)
    );
}
function maxPrice() {
    return +(document.getElementById('priceRange')?.value || 999);
}

/* ---------- Filtre + tri + rendu ---------- */
function getList() {
    const amb = checkedValues('ambiance');
    const fmt = checkedValues('format');
    const max = maxPrice();

    let list = PRODUCTS.filter(p => {
        if (activeCat !== 'all' && p.cat !== activeCat) return false;
        if (p.price > max) return false;
        // un produit sans ambiance/format n'est jamais masqué par ces filtres
        if (p.ambiance && !amb.has(p.ambiance)) return false;
        if (p.format   && !fmt.has(p.format))   return false;
        return true;
    });

    switch (sortBy) {
        case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
        case 'price-desc': list.sort((a, b) => b.price - a.price); break;
        case 'rating':     list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews); break;
        case 'new':        list.sort((a, b) => (b.badge === 'new') - (a.badge === 'new')); break;
        default:           list.sort((a, b) => (b.badge === 'best') - (a.badge === 'best'));
    }
    return list;
}

function render() {
    const list = getList();
    countEl.textContent = list.length;
    if (list.length === 0) {
        grid.innerHTML = `<p class="empty">Aucune création ne correspond à ces filtres.<br>Essayez d'élargir votre recherche ou <button class="link-reset filter-reset-inline">réinitialisez les filtres</button>.</p>`;
        grid.querySelector('.filter-reset-inline').onclick = () => document.querySelector('.filter-reset').click();
        document.getElementById('loadMore').style.display = 'none';
        return;
    }
    const visible = list.slice(0, shown);
    grid.innerHTML = visible.map(cardHTML).join('');
    document.getElementById('loadMore').style.display = shown >= list.length ? 'none' : '';
    observeReveals();
}

/* ---------- Révélation au scroll ---------- */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let io;
function observeReveals() {
    if (reduceMotion) { grid.querySelectorAll('.reveal').forEach(e => e.classList.add('is-visible')); return; }
    io = io || new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    grid.querySelectorAll('.reveal:not(.is-visible)').forEach(e => io.observe(e));
}

/* ---------- Interactions catalogue ---------- */
document.getElementById('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected', 'false'); });
    chip.classList.add('active'); chip.setAttribute('aria-selected', 'true');
    activeCat = chip.dataset.cat; shown = 9; render();
});

document.getElementById('sort').addEventListener('change', (e) => { sortBy = e.target.value; render(); });
document.getElementById('loadMore').addEventListener('click', () => { shown += 6; render(); });

document.getElementById('priceRange').addEventListener('input', (e) => {
    document.getElementById('priceVal').textContent = `${e.target.value} €`;
    shown = 9; render();
});

// cases à cocher Ambiance / Format
document.querySelectorAll('input[data-filter]').forEach(cb =>
    cb.addEventListener('change', () => { shown = 9; render(); })
);

// bouton Réinitialiser : tout recocher + budget au max + catégorie « Tout »
document.querySelector('.filter-reset').addEventListener('click', () => {
    document.querySelectorAll('input[data-filter]').forEach(cb => cb.checked = true);
    const range = document.getElementById('priceRange');
    range.value = range.max;
    document.getElementById('priceVal').textContent = `${range.max} €`;
    document.querySelectorAll('.chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected', 'false'); });
    const all = document.querySelector('.chip[data-cat="all"]');
    all.classList.add('active'); all.setAttribute('aria-selected', 'true');
    activeCat = 'all'; sortBy = 'featured'; document.getElementById('sort').value = 'featured';
    shown = 9; render();
});

document.getElementById('filtersToggle').addEventListener('click', (e) => {
    const open = document.getElementById('filtersPanel').classList.toggle('open');
    e.target.setAttribute('aria-expanded', open);
});

/* clics délégués sur la grille : favoris / aperçu / ajout */
grid.addEventListener('click', (e) => {
    const wish = e.target.closest('.wish');
    if (wish) { wish.classList.toggle('on'); wish.textContent = wish.classList.contains('on') ? '♥' : '♡'; return; }
    const view = e.target.closest('.act-view');
    if (view) { openQuickView(+view.dataset.id); return; }
    const add = e.target.closest('.act-add');
    if (add) { addToCart(+add.dataset.id); }
});

/* ---------- Panier (module partagé + toast) ---------- */
const badge = document.getElementById('cartBadge');
const toast = document.getElementById('toast');
let toastTimer;
function addToCart(id) {
    const p = PRODUCTS.find(x => x.id === id);
    window.ArcanaCart.add({ id: p.id, name: p.name, price: p.price, glyph: p.glyph, grad: p.grad, meta: p.tag });
    badge.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    toast.textContent = `✦ « ${p.name} » ajouté au panier`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- Aperçu rapide ---------- */
const qv = document.getElementById('quickView');
function openQuickView(id) {
    const p = PRODUCTS.find(x => x.id === id);
    document.getElementById('qvMedia').className = 'qv-media ' + p.grad;
    document.getElementById('qvMedia').textContent = p.glyph;
    document.getElementById('qvTag').textContent = p.tag;
    document.getElementById('qvTitle').textContent = p.name;
    document.getElementById('qvRating').innerHTML = `${stars(p.rating)} <span>(${p.reviews} avis)</span>`;
    document.getElementById('qvPrice').textContent = `${p.price} €`;
    document.getElementById('qvAdd').onclick = () => { addToCart(id); closeQuickView(); };
    qv.classList.add('open'); qv.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
function closeQuickView() {
    qv.classList.remove('open'); qv.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
qv.querySelectorAll('[data-qv-close]').forEach(el => el.addEventListener('click', closeQuickView));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeQuickView(); });

/* ---------- Menu mobile (partagé avec la home) ---------- */
const burger = document.getElementById('navBurger');
const links = document.getElementById('navLinks');
burger.addEventListener('click', () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });

/* ---------- Header au scroll ---------- */
const nav = document.getElementById('nav');
addEventListener('scroll', () => { nav.style.boxShadow = scrollY > 8 ? '0 6px 22px rgba(26,22,20,.10)' : 'none'; }, { passive: true });

/* ---------- Catégorie pré-sélectionnée via l'URL (?cat=tarot) ---------- */
const initCat = new URLSearchParams(location.search).get('cat');
const initChip = initCat && document.querySelector(`.chip[data-cat="${initCat}"]`);
if (initChip) {
    document.querySelectorAll('.chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected', 'false'); });
    initChip.classList.add('active'); initChip.setAttribute('aria-selected', 'true');
    activeCat = initCat;
}

/* ---------- Go ---------- */
render();
