// TAROTLENS — catalogue produits live, lu depuis l'onglet "Produits" du Sheet
// (édité par le client via admin.html). data.js reste le filet de sécurité :
// premier rendu synchrone garanti même si l'API est indisponible ; ce module
// remplace window.PRODUCTS uniquement si l'API répond avec un catalogue non vide.
window.ArcanaProducts = (function () {
    const CACHE_KEY = 'tarotlens_products_cache';
    // Alignée sur le TTL du cache de stock (cart.js) : un visiteur qui reste sur
    // le site ne doit pas garder une disponibilité obsolète plus longtemps que ça.
    const TTL_MS = 30 * 1000;

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
    async function fetchAndCache() {
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

    // Démarre la requête (ou la lecture du cache) dès que ce script s'exécute, plutôt que
    // d'attendre que le script de la page appelle load() en tout dernier — le round-trip
    // vers Apps Script (jamais instantané) se déroule ainsi en parallèle du reste du
    // chargement de la page au lieu de s'ajouter après coup. load() renvoie toujours cette
    // même promesse mémoïsée : un seul appel réseau, peu importe le nombre d'appels à load().
    const cached = readCache();
    const pending = cached ? Promise.resolve(cached).then(c => { window.PRODUCTS = c; return c; }) : fetchAndCache();

    function load() { return pending; }

    return { load };
})();
