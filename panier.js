// TAROTLENS — page panier
const root = document.getElementById('cartRoot');
const { t, pick } = window.TarotLensI18n;

// Échappe le HTML injecté depuis le catalogue produits/panier (nom, images...)
// avant de l'insérer via innerHTML — ces valeurs viennent du Sheet "Produits",
// éditable par plus de monde que les seuls détenteurs de la clé admin.
function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render() {
    const items = window.ArcanaCart.get();

    if (!items.length) {
        root.innerHTML = `
        <div class="cart-empty">
            <p class="cart-empty-title">${t('cart_emptyTitle')}</p>
            <p style="opacity:.7;margin-bottom:20px">${t('cart_emptyText')}</p>
            <a class="btn btn-orange" href="index.html#decks">${t('cart_emptyCta')}</a>
        </div>`;
        return;
    }

    const subtotal = window.ArcanaCart.total();

    root.innerHTML = `
    <div class="cart">
        <div class="cart-lines">
            ${items.map(it => {
                const product = (window.PRODUCTS || []).find(p => p.id === it.id);
                const name = product ? pick(product, 'name') : it.name;
                const meta = product ? pick(product, 'tag') : it.meta;
                return `
                <div class="cart-line" data-key="${escapeHTML(it.key)}">
                    <div class="cart-thumb">${it.img ? `<img src="${escapeHTML(it.img)}" alt="${escapeHTML(name)}">` : escapeHTML(it.glyph)}</div>
                    <div>
                        <div class="cart-name">${escapeHTML(name)}</div>
                        ${meta ? `<div class="cart-meta">${escapeHTML(meta)}</div>` : ''}
                        <button class="cart-remove" data-remove="${escapeHTML(it.key)}">${t('cart_remove')}</button>
                    </div>
                    <div class="cart-right">
                        <div class="cart-line-price">${it.price > 0 ? (it.price * it.qty).toFixed(2).replace('.', ',') + ' €' : t('cart_preorder')}</div>
                        <div class="qty">
                            <button type="button" data-dec="${escapeHTML(it.key)}" aria-label="−">−</button>
                            <input type="number" value="${it.qty}" min="1" max="20" data-qty="${escapeHTML(it.key)}" />
                            <button type="button" data-inc="${escapeHTML(it.key)}" aria-label="+">+</button>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <aside class="cart-summary">
            <h3>${t('cart_summaryTitle')}</h3>
            ${subtotal > 0
                ? `<div class="sum-row"><span>${t('cart_subtotal')}</span><span>${subtotal.toFixed(2).replace('.', ',') + ' €'}</span></div>`
                : `<div class="sum-row"><span>${t('cart_preorder')}</span><span>${t('cart_priceTBC')}</span></div>`}
            <div class="sum-row total"><span>${t('cart_totalItems')}</span><span>${items.reduce((n,i) => n + i.qty, 0)}</span></div>
            <button class="btn btn-orange" id="checkout">${t('cart_checkout')}</button>
            <button class="btn btn-ghost sm" id="clear" style="width:100%;margin-top:10px;text-align:center">${t('cart_clear')}</button>
        </aside>
    </div>`;

    root.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { const k = b.dataset.inc; const it = items.find(x => x.key === k); window.ArcanaCart.setQty(k, it.qty + 1); render(); });
    root.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const k = b.dataset.dec; const it = items.find(x => x.key === k); window.ArcanaCart.setQty(k, it.qty - 1); render(); });
    root.querySelectorAll('[data-qty]').forEach(inp => inp.onchange = () => { window.ArcanaCart.setQty(inp.dataset.qty, +inp.value || 1); render(); });
    root.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { window.ArcanaCart.remove(b.dataset.remove); render(); });
    document.getElementById('clear').onclick = () => { window.ArcanaCart.clear(); render(); };
    document.getElementById('checkout').onclick = () => renderOrderForm(items, subtotal);
}

function renderOrderForm(items, subtotal) {
    root.innerHTML = `
    <div class="cart-order">
        <h2 class="cart-empty-title" style="text-align:left">${t('cart_orderTitle')}</h2>
        <form class="contact-form" id="orderForm">
            <div class="form-group">
                <label for="ordName">${t('cart_orderName')}</label>
                <input id="ordName" class="field" required />
            </div>
            <div class="form-group">
                <label for="ordEmail">${t('cart_orderEmail')}</label>
                <input id="ordEmail" type="email" class="field" required />
            </div>
            <div class="form-group">
                <label for="ordPhone">${t('cart_orderPhone')}</label>
                <input id="ordPhone" class="field" required />
            </div>
            <div class="form-group">
                <label for="ordAddress">${t('cart_orderAddress')}</label>
                <textarea id="ordAddress" class="field" required></textarea>
            </div>
            <div class="form-group">
                <label for="ordCp">${t('cart_orderCp')}</label>
                <input id="ordCp" class="field" required />
            </div>
            <div class="form-group">
                <label for="ordPays">${t('cart_orderPays')}</label>
                <input id="ordPays" class="field" required />
            </div>
            <button class="btn btn-orange" type="submit">${t('cart_orderSubmit')}</button>
            <p id="orderError" hidden class="sent-msg" style="color:#c33">${t('cart_orderError')}</p>
        </form>
    </div>`;

    document.getElementById('orderForm').addEventListener('submit', (e) => submitOrder(e, items, subtotal));
}

async function submitOrder(e, items, subtotal) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const errEl = document.getElementById('orderError');
    errEl.hidden = true;
    btn.disabled = true;
    btn.textContent = t('cart_orderSending');

    const address = document.getElementById('ordAddress').value;
    const cp = document.getElementById('ordCp').value;
    const pays = document.getElementById('ordPays').value;

    const payload = {
        type: 'order',
        name: document.getElementById('ordName').value,
        email: document.getElementById('ordEmail').value,
        phone: document.getElementById('ordPhone').value,
        address: `${address}\n${cp} ${pays}`,
        items: items.map(it => {
            const product = (window.PRODUCTS || []).find(p => p.id === it.id);
            return { name: product ? pick(product, 'name') : it.name, qty: it.qty, price: it.price };
        }),
        subtotal,
        lang: document.documentElement.lang || 'fr',
    };

    try {
        const res = await fetch(window.TAROTLENS_ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'unknown');
        root.innerHTML = `<div class="cart-empty"><p class="cart-empty-title">${t('cart_thanksTitle')}</p><p style="opacity:.7;margin-bottom:20px">${t('cart_thanksText')}</p><a class="btn btn-orange" href="index.html">${t('cart_backHome')}</a></div>`;
        window.ArcanaCart.clear();
    } catch (err) {
        btn.disabled = false;
        btn.textContent = t('cart_orderSubmit');
        errEl.hidden = false;
    }
}

render();
// Rafraîchit noms/tags avec le catalogue live une fois chargé (window.PRODUCTS
// est déjà réassigné par ArcanaProducts.load() ; on ne fait que redéclencher render()).
window.ArcanaProducts.load().then(produits => { if (produits) render(); });
