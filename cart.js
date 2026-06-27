// ARCANA — panier partagé entre toutes les pages (localStorage)
(function () {
    const KEY = 'arcana_cart';

    const get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
    const save = (c) => { localStorage.setItem(KEY, JSON.stringify(c)); updateBadges(); };
    const count = () => get().reduce((n, i) => n + i.qty, 0);
    const total = () => get().reduce((s, i) => s + i.price * i.qty, 0);

    function add(item) {
        const c = get();
        const key = item.key || ('p' + item.id);
        const found = c.find(x => x.key === key);
        if (found) found.qty += item.qty || 1;
        else c.push({ key, id: item.id ?? null, name: item.name, price: item.price, glyph: item.glyph || '✦', grad: item.grad || 'g-sun', meta: item.meta || '', qty: item.qty || 1 });
        save(c);
        return count();
    }
    function setQty(key, qty) {
        const c = get(); const it = c.find(x => x.key === key);
        if (!it) return; it.qty = Math.max(1, qty); save(c);
    }
    function remove(key) { save(get().filter(x => x.key !== key)); }
    function clear() { save([]); }

    function updateBadges() {
        const n = count();
        document.querySelectorAll('.nav-badge, #cartBadge').forEach(b => { b.textContent = n; });
    }

    // navigation : l'icône panier du header mène à la page panier
    function wireNav() {
        document.querySelectorAll('.nav-icon[aria-label="Panier"]').forEach(btn => {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => { location.href = 'panier.html'; });
        });
        updateBadges();
    }

    window.ArcanaCart = { get, save, add, setQty, remove, clear, count, total, updateBadges };
    document.addEventListener('DOMContentLoaded', wireNav);
})();
