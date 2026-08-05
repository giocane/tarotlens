window.ArcanaProducts = (function () {
    const CACHE_KEY = 'tarotlens_products_cache';
    const TTL_MS = 30 * 1000;

    function readCache() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (!parsed || Date.now() - parsed.ts > TTL_MS) return null;
            return parsed.produits;
        } catch { return null; }
    }

    function writeCache(produits) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), produits })); } catch {   }
    }

    async function fetchAndCache() {
        try {
            const res = await fetch(window.TAROTLENS_ENDPOINT + '?action=produits');
            const json = await res.json();
            if (json.ok && Array.isArray(json.produits) && json.produits.length) {
                window.PRODUCTS = json.produits;
                writeCache(json.produits);
                return json.produits;
            }
        } catch {   }
        return null;
    }

    const cached = readCache();
    const pending = cached ? Promise.resolve(cached).then(c => { window.PRODUCTS = c; return c; }) : fetchAndCache();

    function load() { return pending; }

    return { load };
})();
