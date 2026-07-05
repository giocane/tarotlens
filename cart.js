// TAROTLENS — panier partagé (localStorage)
window.TAROTLENS_ENDPOINT = 'https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec';

(function () {
    const KEY = 'tarotlens_cart';

    const get   = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
    const save  = (c) => { localStorage.setItem(KEY, JSON.stringify(c)); updateBadges(); };
    const count = () => get().reduce((n, i) => n + i.qty, 0);
    const total = () => get().reduce((s, i) => s + (i.price || 0) * i.qty, 0);

    function add(item) {
        const c = get();
        const key = item.key || ('p' + item.id);
        const found = c.find(x => x.key === key);
        if (found) found.qty += item.qty || 1;
        else c.push({ key, id: item.id ?? null, name: item.name, price: item.price || 0, glyph: item.glyph || '✦', grad: item.grad || 'g-toomuch', img: item.img || null, meta: item.meta || '', qty: item.qty || 1 });
        save(c);
        return count();
    }
    function setQty(key, qty) {
        const c = get(); const it = c.find(x => x.key === key);
        if (!it) return; it.qty = Math.max(1, qty); save(c);
    }
    function remove(key) { save(get().filter(x => x.key !== key)); }
    function clear()     { save([]); }

    function updateBadges() {
        const n = count();
        document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = n; });
    }

    function wireNav() {
        document.querySelectorAll('.nav-icon').forEach(btn => {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => { location.href = 'panier.html'; });
        });
        updateBadges();
    }

    window.ArcanaCart = { get, save, add, setQty, remove, clear, count, total, updateBadges };
    document.addEventListener('DOMContentLoaded', wireNav);
})();
