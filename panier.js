// ARCANA — page panier (lit le panier partagé, modifie quantités, total)
const root = document.getElementById('cartRoot');
const SHIP_FREE = 49, SHIP_COST = 4.9;

function euros(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

function render() {
    const items = window.ArcanaCart.get();

    if (!items.length) {
        root.innerHTML = `
        <div class="cart-empty">
            <p class="display">Votre panier est vide</p>
            <p style="opacity:.8;margin-bottom:20px">Découvrez nos jeux ou composez le vôtre.</p>
            <a class="btn btn-primary" href="boutique.html">Aller à la boutique</a>
        </div>`;
        return;
    }

    const subtotal = window.ArcanaCart.total();
    const shipping = subtotal >= SHIP_FREE ? 0 : SHIP_COST;
    const total = subtotal + shipping;

    root.innerHTML = `
    <div class="cart">
        <div class="cart-lines">
            ${items.map(it => `
                <div class="cart-line" data-key="${it.key}">
                    <div class="cart-thumb ${it.grad}">${it.glyph}</div>
                    <div>
                        <div class="cart-name">${it.name}</div>
                        ${it.meta ? `<div class="cart-meta">${it.meta}</div>` : ''}
                        <button class="cart-remove" data-remove="${it.key}">Retirer</button>
                    </div>
                    <div class="cart-right">
                        <div class="cart-line-price">${euros(it.price * it.qty)}</div>
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
            <div class="sum-row"><span>Sous-total</span><span>${euros(subtotal)}</span></div>
            <div class="sum-row"><span>Livraison</span><span>${shipping === 0 ? 'Offerte' : euros(shipping)}</span></div>
            ${shipping > 0 ? `<div class="sum-row" style="font-size:13px;opacity:.7"><span>Plus que ${euros(SHIP_FREE - subtotal)} pour la livraison offerte</span></div>` : ''}
            <div class="sum-row total"><span>Total</span><span>${euros(total)}</span></div>
            <button class="btn btn-primary" id="checkout">Passer la commande</button>
            <button class="btn btn-ghost sm" id="clear" style="width:100%;margin-top:10px">Vider le panier</button>
        </aside>
    </div>`;

    // quantités
    root.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { const k = b.dataset.inc; const it = items.find(x => x.key === k); window.ArcanaCart.setQty(k, it.qty + 1); render(); });
    root.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const k = b.dataset.dec; const it = items.find(x => x.key === k); window.ArcanaCart.setQty(k, it.qty - 1); render(); });
    root.querySelectorAll('[data-qty]').forEach(inp => inp.onchange = () => { window.ArcanaCart.setQty(inp.dataset.qty, +inp.value || 1); render(); });
    root.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { window.ArcanaCart.remove(b.dataset.remove); render(); });
    document.getElementById('clear').onclick = () => { window.ArcanaCart.clear(); render(); };
    document.getElementById('checkout').onclick = () => {
        root.innerHTML = `<div class="cart-empty"><p class="display">Merci pour votre commande ✦</p><p style="opacity:.8;margin-bottom:20px">Ceci est une démo : aucun paiement n'a été effectué.</p><a class="btn btn-primary" href="boutique.html">Continuer mes achats</a></div>`;
        window.ArcanaCart.clear();
    };
}

render();
