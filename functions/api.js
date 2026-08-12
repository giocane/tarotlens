function jsonResponse(data) {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}

function produitFromRow(row) {
    const images = String(row.images || '').split('|').map(s => s.trim()).filter(Boolean);
    return {
        id: Number(row.id),
        cat: row.cat || '',
        name: row.name || '',
        name_en: row.name_en || null,
        tag: row.tag || '',
        tag_en: row.tag_en || null,
        cards: row.cards === null || row.cards === undefined ? null : Number(row.cards),
        format: row.format || null,
        format_en: row.format_en || null,
        weight: row.weight || null,
        weight_en: row.weight_en || null,
        delivery: row.delivery || null,
        delivery_en: row.delivery_en || null,
        price: Number(row.price) || 0,
        badge: row.badge || null,
        glyph: row.glyph || '✦',
        grad: row.grad || 'g-generic',
        img: images[0] || '',
        images,
        desc: row.desc || '',
        desc_en: row.desc_en || null,
        inStock: !!row.inStock,
        hero: !!row.hero,
    };
}

async function actionProduitsPublic(db) {
    const { results } = await db.prepare('SELECT * FROM produits ORDER BY cat, sort_order').all();
    const produits = results.map(produitFromRow);
    if (!produits.length) return { ok: false, error: 'Catalogue vide.' };
    return { ok: true, produits };
}

async function actionTextesPublic(db) {
    const { results } = await db.prepare('SELECT cle, fr, en FROM textes').all();
    const textes = {};
    results.forEach(row => {
        const fr = row.fr || '', en = row.en || '';
        if (fr || en) textes[row.cle] = { fr, en };
    });
    return { ok: true, textes };
}

async function actionStockPublic(db) {
    const { results } = await db.prepare('SELECT id, qty FROM stock').all();
    const stock = {};
    results.forEach(row => { stock[row.id] = typeof row.qty === 'number' ? row.qty : 0; });
    return { ok: true, stock };
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'produits') return jsonResponse(await actionProduitsPublic(env.DB));
    if (action === 'textes') return jsonResponse(await actionTextesPublic(env.DB));
    return jsonResponse(await actionStockPublic(env.DB));
}
