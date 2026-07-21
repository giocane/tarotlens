// TAROTLENS — panier partagé (localStorage)
window.TAROTLENS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwJYKhBL0pKlUAAsc6fnodg0DmUOjcxSaNwGPH1wTBzv8N6l4EgMHU2QplZhC9MtOO8/exec';

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

// Disponibilité du stock : lue depuis l'onglet "Stock" du Sheet (édité à la main
// par le client), avec un cache court pour éviter d'appeler l'API à chaque page.
window.ArcanaStock = (function () {
    const CACHE_KEY = 'tarotlens_stock_cache';
    const TTL_MS = 5 * 60 * 1000;
    let data = null;

    function readCache() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (!parsed || Date.now() - parsed.ts > TTL_MS) return null;
            return parsed.stock;
        } catch { return null; }
    }

    function writeCache(stock) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), stock })); } catch { /* stockage indisponible, tant pis */ }
    }

    async function load() {
        const cached = readCache();
        if (cached) { data = cached; return data; }
        try {
            const res = await fetch(window.TAROTLENS_ENDPOINT);
            const json = await res.json();
            if (json.ok) { data = json.stock; writeCache(data); }
        } catch { /* stock indisponible : le frontend retombe sur le flag inStock statique */ }
        return data;
    }

    // null = produit non suivi dans l'onglet "Stock" -> le frontend retombe sur data.js
    function qty(id) {
        if (!data) return null;
        const v = data[id];
        return typeof v === 'number' ? v : null;
    }

    return { load, qty };
})();
