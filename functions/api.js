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
        comingSoon: !!row.comingSoon,
    };
}

function categoriesDuGroupe(cat) {
    return cat === 'accessory' ? ['accessory'] : ['deck', 'bundle'];
}

async function actionProduitsPublic(db) {
    const { results } = await db.prepare("SELECT * FROM produits ORDER BY (cat = 'accessory'), sort_order").all();
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
        comingSoon: p.comingSoon === true ? 1 : 0,
    };
}

async function adminSaveProduit(db, p) {
    const l = produitVersLigne(p);
    if (p.id) {
        await db.prepare(`UPDATE produits SET cat=?, name=?, name_en=?, tag=?, tag_en=?, cards=?, format=?, format_en=?,
            weight=?, weight_en=?, delivery=?, delivery_en=?, price=?, badge=?, glyph=?, grad=?, desc=?, desc_en=?,
            images=?, inStock=?, hero=?, comingSoon=? WHERE id=?`)
            .bind(l.cat, l.name, l.name_en, l.tag, l.tag_en, l.cards, l.format, l.format_en, l.weight, l.weight_en,
                l.delivery, l.delivery_en, l.price, l.badge, l.glyph, l.grad, l.desc, l.desc_en, l.images, l.inStock, l.hero, l.comingSoon, p.id)
            .run();
        const row = await db.prepare('SELECT * FROM produits WHERE id = ?').bind(p.id).first();
        return produitFromRow(row);
    }
    const groupe = categoriesDuGroupe(l.cat);
    const maxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM produits WHERE cat IN (${groupe.map(() => '?').join(',')})`).bind(...groupe).first();
    const { meta } = await db.prepare(`INSERT INTO produits (cat, name, name_en, tag, tag_en, cards, format, format_en,
            weight, weight_en, delivery, delivery_en, price, badge, glyph, grad, desc, desc_en, images, inStock, hero, comingSoon, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(l.cat, l.name, l.name_en, l.tag, l.tag_en, l.cards, l.format, l.format_en, l.weight, l.weight_en,
            l.delivery, l.delivery_en, l.price, l.badge, l.glyph, l.grad, l.desc, l.desc_en, l.images, l.inStock, l.hero, l.comingSoon, (maxRow.m || 0) + 1)
        .run();
    const row = await db.prepare('SELECT * FROM produits WHERE id = ?').bind(meta.last_row_id).first();
    return produitFromRow(row);
}

async function adminDeplacerProduit(db, id, sens) {
    const p = await db.prepare('SELECT id, cat, sort_order FROM produits WHERE id = ?').bind(id).first();
    if (!p) throw new Error(`Produit id ${id} introuvable.`);
    const groupe = categoriesDuGroupe(p.cat);
    const placeholders = groupe.map(() => '?').join(',');
    const voisin = sens === 'up'
        ? await db.prepare(`SELECT id, sort_order FROM produits WHERE cat IN (${placeholders}) AND sort_order < ? ORDER BY sort_order DESC LIMIT 1`).bind(...groupe, p.sort_order).first()
        : await db.prepare(`SELECT id, sort_order FROM produits WHERE cat IN (${placeholders}) AND sort_order > ? ORDER BY sort_order ASC LIMIT 1`).bind(...groupe, p.sort_order).first();
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
    const binaire = atob(base64);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
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
        suivi: row.suivi || '', items_json: row.items_json || '[]',
        paye: !!row.stock_decremented,
        facture_numero: row.facture_numero || '',
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

    let pieceJointe = null;
    let factureNumero = commande.facture_numero;
    let factureDate = commande.facture_date;
    if (statut === 'Expédié' && !factureNumero) {
        const facture = await genererFactureCommande(db, commande);
        if (facture) {
            factureNumero = facture.numero;
            factureDate = new Date().toISOString();
            pieceJointe = { filename: `facture-${facture.numero}.pdf`, content: facture.pdf };
        }
    }

    await db.prepare('UPDATE commandes SET statut = ?, suivi = ?, facture_numero = ?, facture_date = ? WHERE id = ?')
        .bind(statut, suiviFinal, factureNumero, factureDate, id).run();

    if (statut !== 'Annulée') {
        await envoyerMailStatutCommande(env, { name: commande.name, email: commande.email, lang: commande.lang }, statut, suiviFinal, pieceJointe);
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
            const { results } = await db.prepare("SELECT * FROM produits ORDER BY (cat = 'accessory'), sort_order").all();
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

function uint8ToBase64(bytes) {
    let binaire = '';
    for (let i = 0; i < bytes.length; i++) binaire += String.fromCharCode(bytes[i]);
    return btoa(binaire);
}

async function envoyerEmail(env, { to, subject, html, text, replyTo, attachments }) {
    if (!env.RESEND_API_KEY) { console.error('envoyerEmail: RESEND_API_KEY manquante'); return; }
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: 'TarotLens <no-reply@tarotlens.boutique>',
            to: [to], subject, html, text,
            reply_to: replyTo || undefined,
            attachments: attachments && attachments.length
                ? attachments.map(a => ({ filename: a.filename, content: uint8ToBase64(a.content) }))
                : undefined,
        }),
    });
    if (!res.ok) console.error('envoyerEmail: échec Resend', res.status, await res.text());
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

async function envoyerMailStatutCommande(env, commande, statut, suivi, pieceJointe) {
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
        attachments: pieceJointe ? [pieceJointe] : undefined,
    });
}

const VENDEUR_FACTURE = {
    marque: 'TarotLens',
    nom: 'Chloé GIORGETTI EI',
    adresse: '18 rue des Francs, 57000 Metz',
    siret: '107 177 660 00011',
};
const MENTION_TVA = 'TVA non applicable, art. 293 B du CGI';
const MENTION_PAIEMENT = 'Réglée par virement bancaire';

const WINANSI_OVERRIDES = { '€': 0x80, '’': 0x92, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97 };

function latin1Bytes(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const code = ch.charCodeAt(0);
        out[i] = WINANSI_OVERRIDES[ch] ?? (code <= 255 ? code : 63);
    }
    return out;
}

function pdfEscape(str) {
    return String(str ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function concatBytes(chunks) {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
}

const PDF_ASCII = new TextEncoder();

function genererFacturePDF({ numero, date, client, lignes, totalTTC }) {
    const ops = [];
    const text = (str, x, y, { font = 'F1', size = 10 } = {}) => {
        ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(str)}) Tj ET`);
    };
    const rect = (x, y, w, h, gray) => ops.push(`${gray} g ${x} ${y} ${w} ${h} re f`);
    const hline = (x1, y, x2) => ops.push(`${x1} ${y} m ${x2} ${y} l S`);

    const left = 50, right = 400, pageW = 545;

    let yL = 780;
    text(VENDEUR_FACTURE.marque, left, yL, { font: 'F2', size: 18 }); yL -= 22;
    text(VENDEUR_FACTURE.nom, left, yL); yL -= 14;
    text(VENDEUR_FACTURE.adresse, left, yL); yL -= 14;
    text(`SIRET : ${VENDEUR_FACTURE.siret}`, left, yL); yL -= 14;

    let yR = 780;
    text('FACTURE', right, yR, { font: 'F2', size: 16 }); yR -= 20;
    text(`N° ${numero}`, right, yR); yR -= 14;
    text(`Date : ${date}`, right, yR); yR -= 14;

    let y = Math.min(yL, yR) - 20;

    text('Client', left, y, { font: 'F2', size: 11 }); y -= 16;
    client.split('\n').forEach(l => { text(l, left, y); y -= 14; });
    y -= 16;

    rect(left, y - 4, pageW - left, 18, '0.85');
    ops.push('0 g');
    text('Désignation', left + 6, y, { font: 'F2' });
    text('Qté', 350, y, { font: 'F2' });
    text('PU', 410, y, { font: 'F2' });
    text('Total', 480, y, { font: 'F2' });
    y -= 22;

    lignes.forEach(l => {
        text(l.nom, left + 6, y);
        text(String(l.qte), 350, y);
        text(`${l.pu.toFixed(2)} €`, 410, y);
        text(`${(l.pu * l.qte).toFixed(2)} €`, 480, y);
        y -= 18;
    });

    y -= 4;
    hline(left, y + 12, pageW);
    y -= 12;
    text(`Total TTC : ${totalTTC.toFixed(2)} €`, 380, y, { font: 'F2', size: 12 });
    y -= 30;

    text(MENTION_TVA, left, y, { size: 9 }); y -= 14;
    text(MENTION_PAIEMENT, left, y, { size: 9 });

    const contentBytes = latin1Bytes(ops.join('\n'));

    const objects = [
        PDF_ASCII.encode('<< /Type /Catalog /Pages 2 0 R >>'),
        PDF_ASCII.encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
        PDF_ASCII.encode('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>'),
        concatBytes([PDF_ASCII.encode(`<< /Length ${contentBytes.length} >>\nstream\n`), contentBytes, PDF_ASCII.encode('\nendstream')]),
        PDF_ASCII.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
        PDF_ASCII.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
    ];

    const chunks = [PDF_ASCII.encode('%PDF-1.4\n')];
    const offsets = [0];
    let pos = chunks[0].length;
    objects.forEach((body, i) => {
        offsets.push(pos);
        const head = PDF_ASCII.encode(`${i + 1} 0 obj\n`);
        const tail = PDF_ASCII.encode('\nendobj\n');
        chunks.push(head, body, tail);
        pos += head.length + body.length + tail.length;
    });

    const xrefStart = pos;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    chunks.push(PDF_ASCII.encode(xref), PDF_ASCII.encode(trailer));

    return concatBytes(chunks);
}

async function prochainNumeroFacture(db) {
    const annee = new Date().getFullYear();
    const prefix = `${annee}-`;
    const row = await db.prepare("SELECT facture_numero FROM commandes WHERE facture_numero LIKE ? ORDER BY facture_numero DESC LIMIT 1")
        .bind(prefix + '%').first();
    let n = 1;
    if (row && row.facture_numero) {
        const suffixe = parseInt(row.facture_numero.split('-')[1], 10);
        if (!isNaN(suffixe)) n = suffixe + 1;
    }
    return prefix + String(n).padStart(4, '0');
}

async function genererFactureCommande(db, commande) {
    let items;
    try { items = JSON.parse(commande.items_json || '[]'); } catch { items = []; }
    if (!Array.isArray(items) || !items.length) return null;

    const idsManquants = items.filter(it => it.price == null).map(it => it.id);
    const prixParId = {};
    if (idsManquants.length) {
        const { results } = await db.prepare(`SELECT id, price FROM produits WHERE id IN (${idsManquants.map(() => '?').join(',')})`)
            .bind(...idsManquants).all();
        results.forEach(r => { prixParId[r.id] = r.price; });
    }

    const lignes = items.map(it => ({
        nom: it.name || `#${it.id}`,
        qte: Number(it.qty) || 0,
        pu: it.price != null ? Number(it.price) : Number(prixParId[it.id]) || 0,
    }));
    const totalTTC = lignes.reduce((n, l) => n + l.pu * l.qte, 0);

    const numero = commande.facture_numero || await prochainNumeroFacture(db);
    const date = new Date(commande.date || Date.now()).toLocaleDateString('fr-FR');
    const client = [commande.name, commande.address, commande.email].filter(Boolean).join('\n');

    const pdf = genererFacturePDF({ numero, date, client, lignes, totalTTC });
    return { numero, pdf };
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
    const { results: produitRows } = await db.prepare('SELECT id, inStock, comingSoon FROM produits').all();
    const produitParId = {};
    produitRows.forEach(r => { produitParId[r.id] = r; });

    const indisponibles = [];
    for (const it of (items || [])) {
        const id = Number(it.id);
        if (!id) continue;
        const qtyStock = stockParId[id];
        const out = (produitParId[id] && produitParId[id].comingSoon)
            || (typeof qtyStock === 'number' ? qtyStock <= 0 : !(produitParId[id] && produitParId[id].inStock));
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
    const itemsJson = JSON.stringify((data.items || []).map(it => ({ id: it.id, name: it.name, qty: it.qty, price: it.price })));
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
