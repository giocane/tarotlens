// TAROTLENS — catalogue produits live, lu depuis l'onglet "Produits" du Sheet
// (édité par le client via admin.html). data.js reste le filet de sécurité :
// premier rendu synchrone garanti même si l'API est indisponible ; ce module
// remplace window.PRODUCTS uniquement si l'API répond avec un catalogue non vide.
window.ArcanaProducts = (function () {
    const CACHE_KEY = 'tarotlens_products_cache';
    const TTL_MS = 5 * 60 * 1000;

    function readCache() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (!parsed || Date.now() - parsed.ts > TTL_MS) return null;
            return parsed.produits;
        } catch { return null; }
    }

    function writeCache(produits) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), produits })); } catch { /* stockage indisponible, tant pis */ }
    }

    // Retourne le nouveau catalogue (et met à jour window.PRODUCTS) si l'API a
    // répondu avec des données exploitables, sinon null (window.PRODUCTS garde
    // alors la valeur de data.js déjà chargée).
    async function load() {
        const cached = readCache();
        if (cached) { window.PRODUCTS = cached; return cached; }
        try {
            const res = await fetch(window.TAROTLENS_ENDPOINT + '?action=produits');
            const json = await res.json();
            if (json.ok && Array.isArray(json.produits) && json.produits.length) {
                window.PRODUCTS = json.produits;
                writeCache(json.produits);
                return json.produits;
            }
        } catch { /* catalogue indisponible : on garde le PRODUCTS de secours (data.js) */ }
        return null;
    }

    return { load };
})();
