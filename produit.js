// ARCANA — Fiche produit (lit ?id= et affiche le détail)
const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
const PRODUCTS = window.PRODUCTS;
const id = +new URLSearchParams(location.search).get('id') || 1;
const p = PRODUCTS.find(x => x.id === id) || PRODUCTS[0];

document.title = `${p.name} — Arcana`;
document.getElementById('crumbName').textContent = p.name;

const old = p.old ? `<span class="pdp-old">${p.old} €</span>` : '';
const save = p.old ? `<span class="pdp-save">-${Math.round((1 - p.price / p.old) * 100)}%</span>` : '';

document.getElementById('pdp').innerHTML = `
<div class="pdp">
    <div class="pdp-media ${p.grad}">
        <span class="pdp-glyph">${p.glyph}</span>
    </div>
    <div class="pdp-info">
        <span class="card-tag">${p.tag}</span>
        <h1 class="pdp-title display">${p.name}</h1>
        <div class="card-rating" style="font-size:15px">${stars(p.rating)} <span>(${p.reviews} avis)</span></div>
        <div class="pdp-price">${p.price} €${old}${save}</div>
        <p class="pdp-blurb">${p.blurb}</p>

        <div class="pdp-opts">
            <label for="qty">Quantité</label>
            <div class="qty">
                <button type="button" id="qtyMinus" aria-label="Moins">−</button>
                <input id="qty" type="number" value="1" min="1" max="20" inputmode="numeric" />
                <button type="button" id="qtyPlus" aria-label="Plus">+</button>
            </div>
        </div>

        <div class="pdp-ctas">
            <button class="btn btn-primary" id="pdpAdd">Ajouter au panier</button>
            ${p.cat === 'custom'
                ? '<a class="btn btn-ghost" href="personnaliser.html#configurateur">Composer mon jeu</a>'
                : '<a class="btn btn-ghost" href="personnaliser.html">Le personnaliser</a>'}
        </div>

        <ul class="pdp-perks">
            <li>✦ Fait main, papier coton 350 g</li>
            <li>✦ Livraison offerte dès 49 €</li>
            <li>✦ Aperçu sous 72 h pour les jeux sur-mesure</li>
        </ul>

        <div class="pdp-tabs" id="pdpTabs">
            <div class="tab-heads">
                <button class="tab-head active" data-tab="desc">Description</button>
                <button class="tab-head" data-tab="ship">Livraison</button>
                <button class="tab-head" data-tab="rev">Avis (${p.reviews})</button>
            </div>
            <div class="tab-body" data-tab="desc">
                <p>${p.blurb} Chaque exemplaire est imprimé sur papier coton et façonné dans notre atelier. ${p.format === '78' ? '78 lames (22 majeures + 56 mineures).' : p.format === '44' ? '44 cartes oracle avec livret.' : ''}</p>
            </div>
            <div class="tab-body" data-tab="ship" hidden>
                <p>Expédition sous 2 à 4 jours ouvrés en France (offerte dès 49 €). Voir la page <a href="aide.html#livraison" style="color:var(--orange)">Aide</a> pour l'Europe et l'international.</p>
            </div>
            <div class="tab-body" data-tab="rev" hidden>
                <p>${stars(p.rating)} — ${p.rating}/5 sur ${p.reviews} avis vérifiés.</p>
                <p style="opacity:.85">« Magnifique jeu, les couleurs sont encore plus belles en vrai. » — Camille L.</p>
                <p style="opacity:.85">« Emballage soigné et livraison rapide. Je recommande ! » — Sacha M.</p>
            </div>
        </div>
    </div>
</div>`;

/* quantité */
const qty = document.getElementById('qty');
document.getElementById('qtyMinus').onclick = () => qty.value = Math.max(1, +qty.value - 1);
document.getElementById('qtyPlus').onclick = () => qty.value = Math.min(20, +qty.value + 1);

/* onglets */
document.getElementById('pdpTabs').addEventListener('click', (e) => {
    const h = e.target.closest('.tab-head'); if (!h) return;
    document.querySelectorAll('.tab-head').forEach(x => x.classList.toggle('active', x === h));
    document.querySelectorAll('.tab-body').forEach(b => b.hidden = b.dataset.tab !== h.dataset.tab);
});

/* ajout panier + toast */
const toast = document.getElementById('toast');
let tt;
document.getElementById('pdpAdd').addEventListener('click', () => {
    window.ArcanaCart.add({ id: p.id, name: p.name, price: p.price, glyph: p.glyph, grad: p.grad, meta: p.tag, qty: +qty.value });
    document.querySelector('.nav-badge')?.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 300 });
    toast.textContent = `✦ « ${p.name} » ajouté au panier (×${qty.value})`;
    toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2200);
});

/* produits associés (même catégorie) */
const related = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 3);
const relList = related.length ? related : PRODUCTS.filter(x => x.id !== p.id).slice(0, 3);
document.getElementById('related').innerHTML = relList.map(r => `
    <article class="card-prod">
        <a href="produit.html?id=${r.id}" class="card-media ${r.grad}" style="text-decoration:none">
            <span class="glyph">${r.glyph}</span>
        </a>
        <div class="card-info">
            <span class="card-tag">${r.tag}</span>
            <h3 class="card-name"><a href="produit.html?id=${r.id}">${r.name}</a></h3>
            <div class="card-foot"><span class="card-price">${r.price} €</span></div>
        </div>
    </article>`).join('');
