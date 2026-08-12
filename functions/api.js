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

async function hacherCleAdmin(cle, salt) {
    const data = new TextEncoder().encode(`${cle}|${salt}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const LOGIN_MAX_TENTATIVES = 8;
const LOGIN_FENETRE_MS = 900 * 1000;

async function tropDeTentativesLogin(db) {
    const row = await db.prepare('SELECT count, expires_at FROM rate_limit WHERE key = ?').bind('admin_login').first();
    if (!row || row.expires_at < Date.now()) return false;
    return row.count >= LOGIN_MAX_TENTATIVES;
}

async function enregistrerTentativeLogin(db, reussite) {
    if (reussite) {
        await db.prepare('DELETE FROM rate_limit WHERE key = ?').bind('admin_login').run();
        return;
    }
    const row = await db.prepare('SELECT count, expires_at FROM rate_limit WHERE key = ?').bind('admin_login').first();
    const count = (row && row.expires_at >= Date.now() ? row.count : 0) + 1;
    await db.prepare('INSERT INTO rate_limit (key, count, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET count = ?, expires_at = ?')
        .bind('admin_login', count, Date.now() + LOGIN_FENETRE_MS, count, Date.now() + LOGIN_FENETRE_MS).run();
}

function produitVersLigne(p) {
    return {
        cat: p.cat || '', name: p.name || '', name_en: p.name_en || null,
        tag: p.tag || '', tag_en: p.tag_en || null,
        cards: p.cards ?? null, format: p.format || null, format_en: p.format_en || null,
        weight: p.weight || null, weight_en: p.weight_en || null,
        delivery: p.delivery || null, delivery_en: p.delivery_en || null,
        price: Number(p.price) || 0, badge: p.badge || null,
        glyph: p.glyph || '✦', grad: p.grad || 'g-generic',
        desc: p.desc || '', desc_en: p.desc_en || null,
        images: (p.images || []).join('|'),
        inStock: p.inStock !== false ? 1 : 0,
        hero: p.hero === true ? 1 : 0,
    };
}

async function adminSaveProduit(db, p) {
    const l = produitVersLigne(p);
    if (p.id) {
        await db.prepare(`UPDATE produits SET cat=?, name=?, name_en=?, tag=?, tag_en=?, cards=?, format=?, format_en=?,
            weight=?, weight_en=?, delivery=?, delivery_en=?, price=?, badge=?, glyph=?, grad=?, desc=?, desc_en=?,
            images=?, inStock=?, hero=? WHERE id=?`)
            .bind(l.cat, l.name, l.name_en, l.tag, l.tag_en, l.cards, l.format, l.format_en, l.weight, l.weight_en,
                l.delivery, l.delivery_en, l.price, l.badge, l.glyph, l.grad, l.desc, l.desc_en, l.images, l.inStock, l.hero, p.id)
            .run();
        const row = await db.prepare('SELECT * FROM produits WHERE id = ?').bind(p.id).first();
        return produitFromRow(row);
    }
    const maxRow = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM produits WHERE cat = ?').bind(l.cat).first();
    const { meta } = await db.prepare(`INSERT INTO produits (cat, name, name_en, tag, tag_en, cards, format, format_en,
            weight, weight_en, delivery, delivery_en, price, badge, glyph, grad, desc, desc_en, images, inStock, hero, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(l.cat, l.name, l.name_en, l.tag, l.tag_en, l.cards, l.format, l.format_en, l.weight, l.weight_en,
            l.delivery, l.delivery_en, l.price, l.badge, l.glyph, l.grad, l.desc, l.desc_en, l.images, l.inStock, l.hero, (maxRow.m || 0) + 1)
        .run();
    const row = await db.prepare('SELECT * FROM produits WHERE id = ?').bind(meta.last_row_id).first();
    return produitFromRow(row);
}

async function adminDeplacerProduit(db, id, sens) {
    const p = await db.prepare('SELECT id, cat, sort_order FROM produits WHERE id = ?').bind(id).first();
    if (!p) throw new Error(`Produit id ${id} introuvable.`);
    const voisin = sens === 'up'
        ? await db.prepare('SELECT id, sort_order FROM produits WHERE cat = ? AND sort_order < ? ORDER BY sort_order DESC LIMIT 1').bind(p.cat, p.sort_order).first()
        : await db.prepare('SELECT id, sort_order FROM produits WHERE cat = ? AND sort_order > ? ORDER BY sort_order ASC LIMIT 1').bind(p.cat, p.sort_order).first();
    if (!voisin) return;
    await db.batch([
        db.prepare('UPDATE produits SET sort_order = ? WHERE id = ?').bind(voisin.sort_order, p.id),
        db.prepare('UPDATE produits SET sort_order = ? WHERE id = ?').bind(p.sort_order, voisin.id),
    ]);
}

async function adminUploadPhoto(bucket, filename, mimeType, base64) {
    if (!/^image\//.test(String(mimeType || ''))) {
        throw new Error('Seules les images sont acceptées ici (vidéos : coller une URL/chemin dans le champ dédié).');
    }
    const octets = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    if (octets.length > 8 * 1024 * 1024) throw new Error('Image trop lourde (8 Mo max).');
    const key = `${crypto.randomUUID()}-${(filename || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await bucket.put(key, octets, { httpMetadata: { contentType: mimeType } });
    return `/photos/${key}`;
}

function commandeFromRow(row) {
    return {
        row: row.id, date: row.date, name: row.name || '', email: row.email || '',
        phone: row.phone || '', address: row.address || '', items: row.items_summary || '',
        subtotal: row.subtotal || '', lang: row.lang || '', statut: row.statut,
        suivi: row.suivi || '',
    };
}

async function adminListCommandes(db) {
    const { results } = await db.prepare('SELECT * FROM commandes ORDER BY id DESC').all();
    return results.map(commandeFromRow);
}

const STATUTS_COMMANDE = ['Commande reçue', 'Paiement validé', 'En préparation', 'Expédié', 'Annulée'];
const PROGRESSION_STATUTS_STOCK = ['Commande reçue', 'Paiement validé', 'En préparation', 'Expédié'];

async function adminSetStatutCommande(env, id, statut, suivi) {
    const db = env.DB;
    if (STATUTS_COMMANDE.indexOf(statut) < 0) throw new Error(`Statut invalide : ${statut}`);
    if (statut === 'Expédié' && !String(suivi || '').trim()) throw new Error('Numéro de suivi requis pour le statut Expédié.');
    const commande = await db.prepare('SELECT * FROM commandes WHERE id = ?').bind(id).first();
    if (!commande) throw new Error(`Commande id ${id} introuvable.`);

    const suiviFinal = statut === 'Expédié' ? String(suivi || '').trim() : commande.suivi;
    await db.prepare('UPDATE commandes SET statut = ?, suivi = ? WHERE id = ?').bind(statut, suiviFinal, id).run();

    if (statut !== 'Annulée') {
        await envoyerMailStatutCommande(env, { name: commande.name, email: commande.email, lang: commande.lang }, statut, suiviFinal);
    }

    const indexAtteint = PROGRESSION_STATUTS_STOCK.indexOf(statut);
    const indexSeuil = PROGRESSION_STATUTS_STOCK.indexOf('Paiement validé');
    if (indexAtteint >= indexSeuil && !commande.stock_decremented) {
        await decrementerStockCommande(db, commande.items_json);
        await db.prepare('UPDATE commandes SET stock_decremented = 1 WHERE id = ?').bind(id).run();
    }
    return { ...commande, statut, suivi: suiviFinal };
}

async function decrementerStockCommande(db, itemsJson) {
    let items;
    try { items = JSON.parse(itemsJson || '[]'); } catch { return; }
    if (!Array.isArray(items) || !items.length) return;
    for (const it of items) {
        if (!it || it.id == null || !it.qty) continue;
        await db.prepare('UPDATE stock SET qty = qty - ? WHERE id = ?').bind(Number(it.qty), Number(it.id)).run();
    }
}

async function handleAdmin(action, p, env) {
    const db = env.DB;
    switch (action) {
        case 'adminLogin':
            return { ok: true };
        case 'adminListProduits': {
            const { results } = await db.prepare('SELECT * FROM produits ORDER BY cat, sort_order').all();
            return { ok: true, produits: results.map(produitFromRow) };
        }
        case 'adminSaveProduit':
            return { ok: true, produit: await adminSaveProduit(db, p.produit || {}) };
        case 'adminDeleteProduit':
            await db.prepare('DELETE FROM produits WHERE id = ?').bind(Number(p.id)).run();
            return { ok: true };
        case 'adminMoveProduit':
            await adminDeplacerProduit(db, Number(p.id), String(p.sens || ''));
            return { ok: true };
        case 'adminUploadPhoto':
            return { ok: true, url: await adminUploadPhoto(env.PHOTOS, p.filename, p.mimeType, p.data) };
        case 'adminListCommandes':
            return { ok: true, commandes: await adminListCommandes(db) };
        case 'adminSetStatutCommande':
            await adminSetStatutCommande(env, Number(p.row), String(p.statut || ''), String(p.suivi || ''));
            return { ok: true };
        case 'adminDeleteCommande':
            await db.prepare('DELETE FROM commandes WHERE id = ?').bind(Number(p.row)).run();
            return { ok: true };
        case 'adminListStock': {
            const { results } = await db.prepare('SELECT * FROM stock').all();
            return { ok: true, stock: results.map(r => ({ id: Number(r.id), nom: r.nom || '', qty: r.qty })) };
        }
        case 'adminSetStock':
            await db.prepare('INSERT INTO stock (id, nom, qty) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET nom = ?, qty = ?')
                .bind(Number(p.id), p.nom || '', Number(p.qty) || 0, p.nom || '', Number(p.qty) || 0).run();
            return { ok: true };
        case 'adminListInterets': {
            const { results } = await db.prepare('SELECT * FROM interets_stock ORDER BY id DESC').all();
            return { ok: true, interets: results.map(r => ({ row: r.id, date: r.date, email: r.email || '', product: r.product || '', lang: r.lang || '' })) };
        }
        case 'adminDeleteInteret':
            await db.prepare('DELETE FROM interets_stock WHERE id = ?').bind(Number(p.row)).run();
            return { ok: true };
        case 'adminListTextes': {
            const { results } = await db.prepare('SELECT * FROM textes').all();
            const textes = {};
            results.forEach(r => { textes[r.cle] = { fr: r.fr || '', en: r.en || '' }; });
            return { ok: true, textes };
        }
        case 'adminSaveTextes': {
            const map = p.textes || {};
            for (const cle of Object.keys(map)) {
                const v = map[cle] || {};
                await db.prepare('INSERT INTO textes (cle, fr, en) VALUES (?, ?, ?) ON CONFLICT(cle) DO UPDATE SET fr = ?, en = ?')
                    .bind(cle, v.fr || '', v.en || '', v.fr || '', v.en || '').run();
            }
            return { ok: true };
        }
        default:
            return { ok: false, error: `Action admin inconnue : ${action}` };
    }
}

async function handleAction(data, env) {
    try {
        const action = String(data.action || '');
        if (action === 'produits') return await actionProduitsPublic(env.DB);
        if (action === 'textes') return await actionTextesPublic(env.DB);

        if (action.indexOf('admin') === 0) {
            const cleHash = data.ak ? await hacherCleAdmin(data.ak, env.ADMIN_SALT) : null;
            const isAdmin = !!(data.ak && cleHash === env.ADMIN_KEY_HASH);
            if (action === 'adminLogin') {
                if (!isAdmin && await tropDeTentativesLogin(env.DB)) {
                    return { ok: false, error: 'Trop de tentatives échouées. Réessaie dans quelques minutes.' };
                }
                await enregistrerTentativeLogin(env.DB, isAdmin);
            }
            if (!isAdmin) return { ok: false, error: 'auth' };
            return await handleAdmin(action, data, env);
        }

        return { ok: false, error: `Action inconnue : ${action}` };
    } catch (err) {
        return { ok: false, error: String(err.message || err) };
    }
}

const MAIL_SITE_URL = 'https://tarotlens.boutique';

async function envoyerEmail(env, { to, subject, html, text, replyTo }) {
    if (!env.RESEND_API_KEY) return;
    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: 'TarotLens <no-reply@tarotlens.boutique>',
            to: [to], subject, html, text,
            reply_to: replyTo || undefined,
        }),
    });
}

function echapperHtmlMail(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function mailCorpsHtml(i18n, texte, name, suivi) {
    let html = `<p style="margin:0 0 16px;font-size:16px;">${echapperHtmlMail(i18n.greeting)} ${echapperHtmlMail(name)},</p>`
        + `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${echapperHtmlMail(texte.message)}</p>`;
    if (suivi) {
        html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#F5EDCC;border-radius:12px;padding:14px 18px;">`
            + `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8B2DB5;font-weight:700;margin:0 0 4px;">${echapperHtmlMail(texte.suiviLabel)}</div>`
            + `<div style="font-size:18px;font-weight:700;color:#1A1614;">${echapperHtmlMail(suivi)}</div>`
            + `</td></tr></table>`;
    }
    html += `<p style="margin:0;font-size:15px;line-height:1.6;">${echapperHtmlMail(i18n.signoff)}<br>${echapperHtmlMail(i18n.team)}</p>`;
    return html;
}

function mailEnveloppeHtml(corpsHtml) {
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5EDCC;">`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDCC;padding:32px 16px;font-family:'Poppins',Arial,sans-serif;">`
        + `<tr><td align="center">`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:18px;overflow:hidden;">`
        + `<tr><td style="background:#E84E0A;padding:28px 24px;text-align:center;">`
        + `<span style="font-family:Impact,'Arial Black',sans-serif;font-size:30px;letter-spacing:4px;color:#FFFFFF;text-transform:uppercase;">TarotLens</span>`
        + `</td></tr>`
        + `<tr><td style="padding:32px 28px;color:#1A1614;">${corpsHtml}</td></tr>`
        + `<tr><td style="background:#F5EDCC;padding:18px 28px;text-align:center;">`
        + `<a href="${MAIL_SITE_URL}" style="font-size:12px;color:#8B2DB5;text-decoration:none;">${MAIL_SITE_URL.replace('https://', '')}</a>`
        + `</td></tr>`
        + `</table></td></tr></table></body></html>`;
}

const STATUTS_NOTIFIES = ['Commande reçue', 'Paiement validé', 'En préparation', 'Expédié'];

const MAILS_STATUT_COMMANDE = {
    'Commande reçue': {
        fr: { subject: 'TarotLens — commande reçue', message: 'Nous avons bien reçu votre commande, merci ! Elle est en cours de traitement, nous vous tiendrons informé(e) de son avancement.' },
        en: { subject: 'TarotLens — order received', message: "We've received your order, thank you! It's now being processed and we'll keep you posted on its progress." },
    },
    'Paiement validé': {
        fr: { subject: 'TarotLens — paiement validé', message: 'Votre paiement a bien été validé. Votre commande va maintenant être préparée.' },
        en: { subject: 'TarotLens — payment confirmed', message: 'Your payment has been confirmed. Your order will now be prepared.' },
    },
    'En préparation': {
        fr: { subject: 'TarotLens — commande en préparation', message: 'Votre commande est en cours de préparation, elle sera bientôt expédiée.' },
        en: { subject: 'TarotLens — order being prepared', message: 'Your order is now being prepared and will be shipped soon.' },
    },
    'Expédié': {
        fr: { subject: 'TarotLens — commande expédiée', message: 'Votre commande a été expédiée !', suiviLabel: 'Numéro de suivi' },
        en: { subject: 'TarotLens — order shipped', message: 'Your order has been shipped!', suiviLabel: 'Tracking number' },
    },
};

const MAIL_I18N = {
    fr: { greeting: 'Bonjour', signoff: 'À bientôt,', team: "L'équipe TarotLens" },
    en: { greeting: 'Hi', signoff: 'See you soon,', team: 'The TarotLens team' },
};

async function envoyerMailStatutCommande(env, commande, statut, suivi) {
    if (STATUTS_NOTIFIES.indexOf(statut) < 0) return;
    if (!commande.email) return;
    const tpl = MAILS_STATUT_COMMANDE[statut];
    const lang = String(commande.lang || '').toLowerCase() === 'en' ? 'en' : 'fr';
    const texte = tpl[lang];
    const i18n = MAIL_I18N[lang];
    const name = commande.name || '';

    const bodyPlain = `${i18n.greeting} ${name},\n\n${texte.message}`
        + (suivi ? `\n\n${texte.suiviLabel} : ${suivi}` : '')
        + `\n\n${i18n.signoff}\n${i18n.team}`;

    await envoyerEmail(env, {
        to: commande.email,
        subject: texte.subject,
        text: bodyPlain,
        html: mailEnveloppeHtml(mailCorpsHtml(i18n, texte, name, suivi)),
        replyTo: env.ORDER_NOTIFY_EMAIL,
    });
}

async function sendOrderEmail(env, data) {
    const lines = (data.items || []).map(it => `- ${it.name} x${it.qty}${it.price ? ` (${(it.price * it.qty).toFixed(2)} €)` : ''}`).join('\n');
    const body = `Nouvelle commande TarotLens\n\n`
        + `Nom : ${data.name || ''}\n`
        + `E-mail : ${data.email || ''}\n`
        + `Téléphone : ${data.phone || ''}\n`
        + `Adresse : ${data.address || ''}\n\n`
        + `Articles :\n${lines}\n\n`
        + `Sous-total : ${data.subtotal || ''} €\n`
        + `Langue : ${data.lang || ''}\n`;

    await envoyerEmail(env, {
        to: env.ORDER_NOTIFY_EMAIL,
        subject: `Nouvelle commande — ${data.name || 'client'}`,
        text: body,
        replyTo: data.email || undefined,
    });
}

async function sendContactEmail(env, data) {
    const body = `Nouveau message depuis le formulaire de contact TarotLens\n\n`
        + `Nom : ${data.name || ''}\n`
        + `E-mail : ${data.email || ''}\n`
        + `Sujet : ${data.subject || ''}\n\n`
        + `Message :\n${data.message || ''}\n`;

    await envoyerEmail(env, {
        to: env.ORDER_NOTIFY_EMAIL,
        subject: `TarotLens — contact : ${data.subject || 'Message'}`,
        text: body,
        replyTo: data.email || undefined,
    });
}

async function articlesIndisponibles(db, items) {
    const { results: stockRows } = await db.prepare('SELECT id, qty FROM stock').all();
    const stockParId = {};
    stockRows.forEach(r => { stockParId[r.id] = r.qty; });
    const { results: produitRows } = await db.prepare('SELECT id, inStock FROM produits').all();
    const produitParId = {};
    produitRows.forEach(r => { produitParId[r.id] = r; });

    const indisponibles = [];
    for (const it of (items || [])) {
        const id = Number(it.id);
        if (!id) continue;
        const qtyStock = stockParId[id];
        const out = typeof qtyStock === 'number' ? qtyStock <= 0 : !(produitParId[id] && produitParId[id].inStock);
        if (out) indisponibles.push(it.name || `#${id}`);
    }
    return indisponibles;
}

async function handleOrderFlow(data, env) {
    if (data.type === 'stock_interest') {
        await env.DB.prepare('INSERT INTO interets_stock (date, email, product, lang) VALUES (?, ?, ?, ?)')
            .bind(new Date().toISOString(), data.email || '', data.product || '', data.lang || '').run();
        return { ok: true };
    }

    if (data.type === 'contact') {
        await sendContactEmail(env, data);
        return { ok: true };
    }

    const indisponibles = await articlesIndisponibles(env.DB, data.items || []);
    if (indisponibles.length) return { ok: false, error: 'stock', items: indisponibles };

    const itemsSummary = (data.items || []).map(it => `${it.name} x${it.qty}`).join(', ');
    const itemsJson = JSON.stringify((data.items || []).map(it => ({ id: it.id, qty: it.qty })));
    await env.DB.prepare(`INSERT INTO commandes (date, name, email, phone, address, items_summary, subtotal, lang, statut, suivi, items_json, stock_decremented)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Commande reçue', '', ?, 0)`)
        .bind(new Date().toISOString(), data.name || '', data.email || '', data.phone || '', data.address || '',
            itemsSummary, data.subtotal || '', data.lang || '', itemsJson).run();

    await sendOrderEmail(env, data);
    return { ok: true };
}

export async function onRequestPost({ request, env }) {
    let data;
    try {
        data = JSON.parse(await request.text());
    } catch {
        return jsonResponse({ ok: false, error: 'Requête illisible.' });
    }

    if (data.action) return jsonResponse(await handleAction(data, env));

    try {
        return jsonResponse(await handleOrderFlow(data, env));
    } catch (err) {
        return jsonResponse({ ok: false, error: String(err.message || err) });
    }
}
