// TAROTLENS — page panier
const root = document.getElementById('cartRoot');

function render() {
    const items = window.ArcanaCart.get();

    if (!items.length) {
        root.innerHTML = `
        <div class="cart-empty">
            <p class="cart-empty-title">Votre panier est vide</p>
            <p style="opacity:.7;margin-bottom:20px">Découvrez nos decks et accessoires.</p>
            <a class="btn btn-orange" href="index.html#decks">VOIR LES DECKS</a>
        </div>`;
        return;
    }

    const subtotal = window.ArcanaCart.total();

    root.innerHTML = `
    <div class="cart">
        <div class="cart-lines">
            ${items.map(it => `
                <div class="cart-line" data-key="${it.key}">
                    <div class="cart-thumb">${it.glyph}</div>
                    <div>
                        <div class="cart-name">${it.name}</div>
                        ${it.meta ? `<div class="cart-meta">${it.meta}</div>` : ''}
                        <button class="cart-remove" data-remove="${it.key}">Retirer</button>
                    </div>
                    <div class="cart-right">
                        <div class="cart-line-price">${it.price > 0 ? (it.price * it.qty).toFixed(2).replace('.', ',') + ' €' : 'Pré-commande'}</div>
                        <div class="qty">
                            <button type="button" data-dec="${it.key}" aria-label="Moins">−</button>
                            <input type="number" value="${it.qty}" min="1" max="20" data-qty="${it.key}" />
                            <button type="button" data-inc="${it.key}" aria-label="Plus">+</button>
                        </div>
                    </div>
                </div>`).join('')}
        </div>

        <aside class="cart-summary">
            <h3>Récapitulatif</h3>
            ${subtotal > 0
                ? `<div class="sum-row"><span>Sous-total</span><span>${subtotal.toFixed(2).replace('.', ',') + ' €'}</span></div>`
                : `<div class="sum-row"><span>Pré-commande</span><span>Prix à confirmer</span></div>`}
            <div class="sum-row total"><span>Total articles</span><span>${items.reduce((n,i) => n + i.qty, 0)}</span></div>
            <button class="btn btn-orange" id="checkout">VALIDER LA COMMANDE</button>
            <button class="btn btn-ghost sm" id="clear" style="width:100%;margin-top:10px;text-align:center">Vider le panier</button>
        </aside>
    </div>`;

    root.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { const k = b.dataset.inc; const it = items.find(x => x.key === k); window.ArcanaCart.setQty(k, it.qty + 1); render(); });
    root.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const k = b.dataset.dec; const it = items.find(x => x.key === k); window.ArcanaCart.setQty(k, it.qty - 1); render(); });
    root.querySelectorAll('[data-qty]').forEach(inp => inp.onchange = () => { window.ArcanaCart.setQty(inp.dataset.qty, +inp.value || 1); render(); });
    root.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { window.ArcanaCart.remove(b.dataset.remove); render(); });
    document.getElementById('clear').onclick = () => { window.ArcanaCart.clear(); render(); };
    document.getElementById('checkout').onclick = () => {
        root.innerHTML = `<div class="cart-empty"><p class="cart-empty-title">Merci !</p><p style="opacity:.7;margin-bottom:20px">Pré-commande enregistrée. Nous vous recontactons prochainement.</p><a class="btn btn-orange" href="index.html">RETOUR À L'ACCUEIL</a></div>`;
        window.ArcanaCart.clear();
    };
}

render();
