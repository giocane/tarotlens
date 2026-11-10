const SEUIL_STOCK_FAIBLE = 2;

export default {
    async scheduled(event, env) {
        await envoyerDigestQuotidien(env);
    },
};

function estArchive(brut) {
    try { return !!(JSON.parse(brut || 'null') || {}).archived; } catch { return false; }
}

async function envoyerDigestQuotidien(env) {
    const db = env.DB;
    const { results: stockBrut } = await db.prepare('SELECT * FROM stock').all();
    const { results: produits } = await db.prepare('SELECT id, options FROM produits').all();
    const archives = new Set(produits.filter(p => estArchive(p.options)).map(p => p.id));
    const stock = stockBrut.filter(s => !archives.has(s.id));
    const epuises = stock.filter(s => s.qty <= 0);
    const faibles = stock.filter(s => s.qty > 0 && s.qty <= SEUIL_STOCK_FAIBLE);
    const { results: interets } = await db.prepare('SELECT * FROM interets_stock ORDER BY id DESC').all();

    if (!epuises.length && !faibles.length && !interets.length) return;

    const titre = `TAROTLENS — DIGEST QUOTIDIEN DU ${new Date().toLocaleDateString('fr-FR')}`;
    const lignes = [titre, '='.repeat(titre.length), ''];

    if (epuises.length) {
        const t = `RUPTURE DE STOCK (${epuises.length})`;
        lignes.push(t, '-'.repeat(t.length));
        epuises.forEach(s => lignes.push(`  • ${s.nom} (id ${s.id})`));
        lignes.push('');
    }

    if (faibles.length) {
        const t = `STOCK FAIBLE ≤ ${SEUIL_STOCK_FAIBLE} (${faibles.length})`;
        lignes.push(t, '-'.repeat(t.length));
        faibles.forEach(s => lignes.push(`  • ${s.nom} (id ${s.id}) — quantité restante : ${s.qty}`));
        lignes.push('');
    }

    if (interets.length) {
        const t = `DEMANDES "PRÉVENEZ-MOI DU RETOUR EN STOCK" EN ATTENTE (${interets.length})`;
        lignes.push(t, '-'.repeat(t.length));
        const parProduit = {};
        interets.forEach(it => {
            const cle = it.product || '(produit non précisé)';
            (parProduit[cle] = parProduit[cle] || []).push(it.email);
        });
        Object.keys(parProduit).forEach(prod => {
            lignes.push(`  • ${prod}`, `      ${parProduit[prod].join(', ')}`, '');
        });
        lignes.push('Pour retirer une demande traitée, supprime-la dans l\'admin.');
    }

    if (!env.RESEND_API_KEY) return;
    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: 'TarotLens <no-reply@tarotlens.boutique>',
            to: [env.ORDER_NOTIFY_EMAIL],
            subject: `TarotLens — digest quotidien (${epuises.length + faibles.length} produit(s), ${interets.length} demande(s))`,
            text: lignes.join('\n'),
        }),
    });
}
