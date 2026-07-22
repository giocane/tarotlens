// TAROTLENS — reçoit les commandes (panier.js), les inscriptions "prévenez-moi du
// retour en stock" (index.html) et les messages du formulaire de contact
// (contact.html), les ajoute au Google Sheet (sauf contact, transmis par e-mail
// seul), envoie un e-mail de commande, sert la disponibilité du stock et le
// catalogue produits, et expose
// l'API admin (admin.html : commandes, stock, produits, upload photos).
// À coller dans Extensions > Apps Script du Sheet cible, puis déployer en Web App
// (Exécuter en tant que : Moi — Accès : Tous). Voir le README à côté de ce fichier.
//
// Onglets attendus dans le Sheet :
//   - "Commandes"       : archive des commandes (remplie automatiquement). Colonnes :
//                         date, nom, email, tel, adresse, articles, sous-total,
//                         langue, statut (voir STATUTS_COMMANDE), numéro de suivi
//                         (rempli seulement au statut Expédié). Chaque changement de
//                         statut (sauf Annulée) envoie un e-mail auto au client dans
//                         sa langue — voir MAILS_STATUT_COMMANDE.
//   - "Intérêts stock"  : inscriptions "prévenez-moi" (remplie automatiquement).
//   - "Stock"           : colonnes [id, nom, quantité disponible], éditable à la
//                         main ou depuis admin.html. Une ligne par produit.
//   - "Produits"        : catalogue complet, éditable depuis admin.html (ou à la
//                         main). Ligne d'en-tête exacte : voir PRODUITS_ENTETES
//                         ci-dessous. Colonne "images" = URLs séparées par "|",
//                         la première sert de visuel de couverture.

var ORDER_NOTIFY_EMAIL = 'TarotLens129@gmail.com';

// URL affichée en pied des e-mails HTML (voir mailEnveloppeHtml) — à mettre à
// jour si un nom de domaine est acheté un jour.
var MAIL_SITE_URL = 'https://tarotlens.pages.dev';

// Sel fixe combiné à la clé admin avant hachage (défense en profondeur contre les
// rainbow tables ; la clé elle-même n'est jamais stockée en clair, voir definirCleAdmin).
var SALT = 'tarotlens-once-famous-4ever-fabulous';

// Anti brute-force sur adminLogin : au-delà de ce nombre d'échecs, tout nouvel
// essai (même avec la bonne clé) est bloqué jusqu'à expiration de la fenêtre
// glissante ci-dessous — voir tropDeTentativesLogin/enregistrerTentativeLogin.
var LOGIN_MAX_TENTATIVES = 8;
var LOGIN_FENETRE_SECONDES = 900; // 15 min

var STATUTS_COMMANDE = ['Commande reçue', 'Paiement validé', 'En préparation', 'Expédié', 'Annulée'];

// Anciens libellés de statut (avant l'overhaul du workflow) encore présents sur
// des commandes historiques du Sheet — mappés à la volée dans
// listerCommandesBrutes() pour un affichage correct immédiat, et corrigeables
// définitivement dans le Sheet via le menu "Corriger les anciens statuts".
var STATUTS_LEGACY_MAP = { 'Nouvelle': 'Commande reçue', 'Expédiée': 'Expédié' };

// Statuts qui déclenchent un e-mail automatique au client (voir
// envoyerMailStatutCommande) — Annulée est un statut interne, pas notifié.
var STATUTS_NOTIFIES = ['Commande reçue', 'Paiement validé', 'En préparation', 'Expédié'];

// Contenu des e-mails de suivi de commande, par statut et par langue —
// juste le sujet et le message central, l'habillage (bandeau logo, pied de
// page) et la formule de politesse sont ajoutés par mailCorpsHtml/
// mailEnveloppeHtml pour rester cohérents entre les 4 statuts.
var MAILS_STATUT_COMMANDE = {
    'Commande reçue': {
        fr: { subject: 'TarotLens — commande reçue', message: 'Nous avons bien reçu votre commande, merci ! Elle est en cours de traitement, nous vous tiendrons informé(e) de son avancement.' },
        en: { subject: 'TarotLens — order received', message: 'We\'ve received your order, thank you! It\'s now being processed and we\'ll keep you posted on its progress.' },
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

// Formule d'appel/de politesse, par langue — partagée par les 4 e-mails.
var MAIL_I18N = {
    fr: { greeting: 'Bonjour', signoff: 'À bientôt,', team: 'L\'équipe TarotLens' },
    en: { greeting: 'Hi', signoff: 'See you soon,', team: 'The TarotLens team' },
};

// Quantité à partir de laquelle un produit est signalé "stock faible" dans le
// digest quotidien (voir envoyerDigestQuotidien).
var SEUIL_STOCK_FAIBLE = 2;

var PRODUITS_ENTETES = ['id', 'cat', 'name', 'name_en', 'tag', 'tag_en', 'cards',
    'format', 'format_en', 'weight', 'weight_en', 'delivery', 'delivery_en',
    'price', 'badge', 'glyph', 'grad', 'desc', 'desc_en', 'images', 'inStock'];

var DOSSIER_PHOTOS = 'TarotLens - Photos produits';
var TAILLE_MAX_PHOTO = 8 * 1024 * 1024; // 8 Mo décodés

// Comparaison tolérante aux accents mal encodés (NFC/NFD) et aux espaces
// parasites, pour ne jamais retomber silencieusement sur getActiveSheet().
function findSheet(ss, name) {
    var target = name.normalize('NFC').trim();
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getName().normalize('NFC').trim() === target) return sheets[i];
    }
    return null;
}

/* ==================== Menu ==================== */

// Liste de secours pour verifierOngletStock, utilisée uniquement si l'onglet
// "Produits" n'existe pas encore (avant le tout premier import).
var PRODUITS_ATTENDUS_SECOURS = [
    { id: 1, nom: 'Has Been Tarot' },
    { id: 2, nom: 'Too Much Lenormand' },
    { id: 3, nom: 'Too Much Tarot' },
    { id: 4, nom: 'Bundle' },
];

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('TarotLens')
        .addItem('Vérifier l\'onglet Stock', 'verifierOngletStock')
        .addSeparator()
        .addItem('Importer les produits depuis data.js (1x)', 'importerProduitsDepuisDataJs')
        .addSeparator()
        .addItem('Définir la clé admin', 'definirCleAdmin')
        .addSeparator()
        .addItem('Installer les automatisations (digest quotidien)', 'installerAutomatisations')
        .addSeparator()
        .addItem('Corriger les anciens statuts (migration unique)', 'migrerAnciensStatutsCommandes')
        .addToUi();
}

function produitsAttendusPourDiagnostic(ss) {
    var sh = findSheet(ss, 'Produits');
    if (sh) {
        try {
            return listerProduits(ss).map(function (p) { return { id: p.id, nom: p.name }; });
        } catch (e) { /* tombe sur la liste de secours ci-dessous */ }
    }
    return PRODUITS_ATTENDUS_SECOURS;
}

// Diagnostic manuel : relit l'onglet "Stock" comme le fait doGet, et affiche
// ce qui sera réellement renvoyé au frontend (lignes lues, ids manquants,
// quantités non numériques), pour éviter de redécouvrir un stock vide après coup.
function verifierOngletStock() {
    var ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stockSheet = findSheet(ss, 'Stock');

    if (!stockSheet) {
        ui.alert('Onglet "Stock" introuvable. Onglets existants : '
            + ss.getSheets().map(function (s) { return '[' + s.getName() + ']'; }).join(', '));
        return;
    }

    var rows = stockSheet.getDataRange().getValues();
    var trouves = {};
    var qtyInvalides = [];

    for (var i = 1; i < rows.length; i++) {
        var id = rows[i][0];
        var nom = rows[i][1];
        var qty = rows[i][2];
        if (id === '' || id === null) continue;
        trouves[id] = qty;
        if (typeof qty !== 'number') qtyInvalides.push('ligne ' + (i + 1) + ' (id ' + id + ' "' + nom + '") : "' + qty + '"');
    }

    var lignes = ['Onglet "Stock" trouvé (' + (rows.length - 1) + ' ligne(s) sous l\'en-tête).', ''];

    produitsAttendusPourDiagnostic(ss).forEach(function (p) {
        if (Object.prototype.hasOwnProperty.call(trouves, p.id)) {
            lignes.push('✓ id ' + p.id + ' (' + p.nom + ') : ' + trouves[p.id]);
        } else {
            lignes.push('✗ id ' + p.id + ' (' + p.nom + ') : AUCUNE LIGNE — restera sur le flag inStock statique de data.js');
        }
    });

    if (qtyInvalides.length) {
        lignes.push('', 'Quantités non numériques (traitées comme 0 par doGet) :');
        lignes.push.apply(lignes, qtyInvalides);
    }

    ui.alert(lignes.join('\n'));
}

/* ==================== Auth admin ==================== */

function hacherCleAdmin(cle) {
    var octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(cle || '') + '|' + SALT);
    return octets.map(function (o) { return ('0' + (o & 0xff).toString(16)).slice(-2); }).join('');
}

function getAdminKeyHash() {
    return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY_HASH') || '';
}

// Utilities.getUuid() s'appuie sur un générateur aléatoire cryptographiquement
// sûr (RFC 4122 v4) ; deux UUID concaténés sans tirets donnent 256 bits
// d'entropie, largement suffisant pour une clé admin.
function genererCleAdminAleatoire() {
    return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function definirCleAdmin() {
    var ui = SpreadsheetApp.getUi();
    var actuelle = getAdminKeyHash();
    var r = ui.alert(
        actuelle ? 'Changer la clé admin' : 'Définir la clé admin',
        (actuelle
            ? 'Une clé existe déjà. Continuer va la remplacer immédiatement par une nouvelle clé générée aléatoirement.'
            : 'Une nouvelle clé va être générée automatiquement (aléatoire, difficile à deviner).'),
        ui.ButtonSet.OK_CANCEL);
    if (r !== ui.Button.OK) return;
    var cle = genererCleAdminAleatoire();
    PropertiesService.getScriptProperties().setProperty('ADMIN_KEY_HASH', hacherCleAdmin(cle));
    ui.alert(
        'Nouvelle clé admin générée (copie-la maintenant, elle ne sera plus jamais réaffichée) :\n\n' + cle
        + '\n\nSaisis-la dans admin.html pour t\'y connecter.');
}

/* ==================== Helpers Sheet <-> objets ==================== */

function zip(headers, valeurs) {
    var obj = {};
    headers.forEach(function (h, idx) { if (h) obj[h] = valeurs[idx]; });
    return obj;
}

function sheetToObjects(sheet) {
    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return [];
    var headers = rows[0].map(function (h) { return String(h).trim(); });
    var out = [];
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var vide = row.every(function (v) { return v === '' || v === null; });
        if (vide) continue;
        out.push(zip(headers, row));
    }
    return out;
}

function texteOuNull(v) {
    var s = String(v === null || v === undefined ? '' : v).trim();
    return s === '' ? null : s;
}

/* ==================== Produits ==================== */

function getSheetProduits(ss) {
    var sh = findSheet(ss, 'Produits');
    if (!sh) {
        throw new Error('Onglet "Produits" introuvable. Crée-le avec la ligne d\'en-tête : '
            + PRODUITS_ENTETES.join(' | '));
    }
    return sh;
}

function produitDepuisLigne(o) {
    var images = String(o.images || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    return {
        id: Number(o.id),
        cat: String(o.cat || '').trim(),
        name: String(o.name || '').trim(),
        name_en: texteOuNull(o.name_en),
        tag: String(o.tag || '').trim(),
        tag_en: texteOuNull(o.tag_en),
        cards: (o.cards === '' || o.cards === null || o.cards === undefined) ? null : Number(o.cards),
        format: texteOuNull(o.format),
        format_en: texteOuNull(o.format_en),
        weight: texteOuNull(o.weight),
        weight_en: texteOuNull(o.weight_en),
        delivery: texteOuNull(o.delivery),
        delivery_en: texteOuNull(o.delivery_en),
        price: Number(o.price) || 0,
        badge: texteOuNull(o.badge),
        glyph: String(o.glyph || '✦').trim(),
        grad: String(o.grad || 'g-generic').trim(),
        img: images[0] || '',
        images: images,
        desc: String(o.desc || ''),
        desc_en: texteOuNull(o.desc_en),
        inStock: !(o.inStock === false || String(o.inStock).toUpperCase() === 'FAUX' || String(o.inStock).toUpperCase() === 'FALSE'),
    };
}

// L'ordre d'affichage sur le site suit l'ordre des lignes dans le Sheet (pas un
// tri par id) : ça laisse le client réordonner ses produits en glissant des
// lignes, comme dans un tableur classique.
function listerProduits(ss) {
    var sh = getSheetProduits(ss);
    return sheetToObjects(sh).map(produitDepuisLigne);
}

function viderCacheProduits() {
    CacheService.getScriptCache().remove('produits_v1');
}

function sauvegarderProduit(ss, p) {
    var sh = getSheetProduits(ss);
    var rows = sh.getDataRange().getValues();
    var headers = (rows[0] || PRODUITS_ENTETES).map(function (h) { return String(h).trim(); });
    var idCol = headers.indexOf('id');
    if (idCol < 0) throw new Error('Colonne "id" introuvable dans l\'onglet Produits.');

    var id = p.id ? Number(p.id) : 0;
    var ligneIdx = -1;
    if (id) {
        for (var i = 1; i < rows.length; i++) {
            if (Number(rows[i][idCol]) === id) { ligneIdx = i; break; }
        }
    }
    if (!id) {
        var maxId = 0;
        for (var j = 1; j < rows.length; j++) {
            var v = Number(rows[j][idCol]);
            if (v > maxId) maxId = v;
        }
        id = maxId + 1;
    }

    var valeurs = headers.map(function (h) {
        if (h === 'id') return id;
        if (h === 'images') return (p.images || []).join('|');
        if (h === 'inStock') return p.inStock !== false;
        var v = p[h];
        return (v === undefined || v === null) ? '' : v;
    });

    if (ligneIdx >= 0) {
        sh.getRange(ligneIdx + 1, 1, 1, headers.length).setValues([valeurs]);
    } else {
        sh.appendRow(valeurs);
    }

    viderCacheProduits();
    return produitDepuisLigne(zip(headers, valeurs));
}

function supprimerProduit(ss, id) {
    var sh = getSheetProduits(ss);
    var rows = sh.getDataRange().getValues();
    var headers = rows[0].map(function (h) { return String(h).trim(); });
    var idCol = headers.indexOf('id');
    for (var i = 1; i < rows.length; i++) {
        if (Number(rows[i][idCol]) === Number(id)) {
            sh.deleteRow(i + 1);
            viderCacheProduits();
            return;
        }
    }
    throw new Error('Produit id ' + id + ' introuvable.');
}

// Déplace le produit au-delà de son voisin de MÊME catégorie le plus proche
// (haut/bas) — les lignes d'autres catégories intercalées entre les deux sont
// simplement décalées d'un cran, pas traitées comme des obstacles. Sans ça,
// un accessoire glissé entre deux decks empêchait de réordonner les decks
// entre eux d'un seul clic. C'est toujours l'ordre des lignes du Sheet qui
// pilote l'ordre d'affichage sur le site (voir listerProduits()).
function deplacerProduit(ss, id, sens) {
    var sh = getSheetProduits(ss);
    var rows = sh.getDataRange().getValues();
    var headers = rows[0].map(function (h) { return String(h).trim(); });
    var idCol = headers.indexOf('id');
    var catCol = headers.indexOf('cat');
    if (idCol < 0) throw new Error('Colonne "id" introuvable dans l\'onglet Produits.');
    if (catCol < 0) throw new Error('Colonne "cat" introuvable dans l\'onglet Produits.');

    var data = rows.slice(1);
    var idx = -1;
    for (var i = 0; i < data.length; i++) {
        if (Number(data[i][idCol]) === Number(id)) { idx = i; break; }
    }
    if (idx < 0) throw new Error('Produit id ' + id + ' introuvable.');
    var cat = data[idx][catCol];

    var voisin = -1;
    if (sens === 'up') {
        for (var a = idx - 1; a >= 0; a--) { if (data[a][catCol] === cat) { voisin = a; break; } }
    } else {
        for (var b = idx + 1; b < data.length; b++) { if (data[b][catCol] === cat) { voisin = b; break; } }
    }
    if (voisin < 0) return; // déjà en haut/bas de sa catégorie

    var deplace = data.splice(idx, 1)[0];
    data.splice(voisin, 0, deplace);

    sh.getRange(2, 1, data.length, headers.length).setValues(data);
    viderCacheProduits();
}

function actionProduitsPublic() {
    var cache = CacheService.getScriptCache();
    var enCache = cache.get('produits_v1');
    if (enCache) return JSON.parse(enCache);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = findSheet(ss, 'Produits');
    if (!sh) return { ok: false, error: 'Onglet "Produits" introuvable.' };

    var produits = listerProduits(ss);
    if (!produits.length) return { ok: false, error: 'Onglet "Produits" vide.' };

    var resultat = { ok: true, produits: produits };
    cache.put('produits_v1', JSON.stringify(resultat), 60);
    return resultat;
}

/* ==================== Import initial depuis data.js ==================== */

function importerProduitsDepuisDataJs() {
    var ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = findSheet(ss, 'Produits');
    if (!sh) {
        ui.alert('Onglet "Produits" introuvable. Crée-le d\'abord avec la ligne d\'en-tête :\n\n' + PRODUITS_ENTETES.join(' | '));
        return;
    }

    var rows = sh.getDataRange().getValues();
    if (rows.length > 1) {
        var r = ui.alert('Remplacer le contenu de "Produits" ?',
            'L\'onglet contient déjà ' + (rows.length - 1) + ' ligne(s). Les remplacer par les '
            + PRODUITS_IMPORT.length + ' produits d\'origine (data.js) ? Toute modification déjà faite dans le Sheet sera perdue.',
            ui.ButtonSet.OK_CANCEL);
        if (r !== ui.Button.OK) return;
        sh.deleteRows(2, rows.length - 1);
    }

    sh.getRange(1, 1, 1, PRODUITS_ENTETES.length).setValues([PRODUITS_ENTETES]);

    var lignes = PRODUITS_IMPORT.map(function (p) {
        return PRODUITS_ENTETES.map(function (h) {
            if (h === 'images') return p.images.join('|');
            var v = p[h];
            return (v === undefined || v === null) ? '' : v;
        });
    });
    sh.getRange(2, 1, lignes.length, PRODUITS_ENTETES.length).setValues(lignes);
    viderCacheProduits();

    ui.alert(lignes.length + ' produit(s) importé(s) dans l\'onglet "Produits".');
}

// Ordre volontaire (pas par id croissant) : reproduit l'ordre d'affichage
// actuel du site (Too Much Tarot, Has Been Tarot, Too Much Lenormand, Bundle),
// piloté par l'ordre des lignes du Sheet — voir listerProduits().
var PRODUITS_IMPORT = [
    {
        id: 3, cat: 'deck', name: 'Too Much Tarot', name_en: '', tag: 'Tarot', tag_en: '',
        cards: 82, format: 'Standard 70×120mm', format_en: '', weight: '350g papier, finition Soft Touch',
        weight_en: '350g paper, Soft Touch finish', delivery: "Livré sans boîte, dans un bandana trop beau ;)",
        delivery_en: "No box, delivered in a gorgeous bandana ;)", price: 58, badge: null, glyph: '✶', grad: 'g-toomuch',
        desc: "Des couleurs, des paillettes, du glitter, de la nostalgie… et toujours absolument aucun sens de la mesure.\n\nLe Too Much Tarot revisite les 78 arcanes du tarot dans un univers pop, coloré et délicieusement kitsch.\n\nBecause Too Much is never enough. 🍬",
        desc_en: "Colors, sequins, glitter, nostalgia… and still absolutely no sense of moderation.\n\nThe Too Much Tarot reimagines the 78 tarot arcana in a pop, colorful and deliciously kitsch universe.\n\nBecause Too Much is never enough. 🍬",
        images: ['images/toomuch-card.jpg', 'videos/toomuch-hero.mp4', 'videos/toomuch-detail.mp4'],
        inStock: true,
    },
    {
        id: 1, cat: 'deck', name: 'Has Been Tarot', name_en: '', tag: 'Tarot', tag_en: '',
        cards: 87, format: 'Poker 63×89mm', format_en: '', weight: '310g finition Soft Touch',
        weight_en: '310g Soft Touch finish', delivery: 'Pas de boîte / Pochon ou carré en tissu',
        delivery_en: 'No box / fabric pouch or square', price: 59, badge: 'new', glyph: '✺', grad: 'g-hasbeen',
        desc: "Comme son nom l'indique, c'est un tarot inspiré de tous ces objets oubliés... BUT, Once famous, 4ever Fabulous\n\n87 cartes remplies de nostalgie, de couleurs et de kitch. De quoi rendre jaloux la Gen Z\n\nGuidebook PDF avec mots-clés, explications des associations et du sens de la carte + une chanson culte pour accompagner chaque carte\n\nSi tu envoyais des Wizz sur MSN pendant que tu terminais ton article sur ton Skyblog « Mii$$TarOt.du75 »\nSi tu as oublié de le nourrir ton Tamagotchi pendant trois jours\nSi tu as voulu un Furby mais qu'au fond il te faisait un peu flipper\nSi tu téléchargeais Britney pendant 4 heures sur LimeWire pour découvrir que c'était la mauvaise version\nSi tu penses que tu aurais dû écouter ta mère quand elle t'a dit que cette paire de Buffalo était moche\nAlors ce deck est pour toi",
        desc_en: "As the name suggests, this is a tarot inspired by all those things everyone's forgotten... BUT, Once famous, 4ever Fabulous\n\n87 cards packed with nostalgia, color and kitsch. Enough to make Gen Z jealous\n\nPDF guidebook with keywords, explanations of the associations and meaning of each card + a cult song to go with every card\n\nIf you used to send Wizz on MSN Messenger while finishing your post on your blog \"Mii$$TarOt.du75\"\nIf you forgot to feed your Tamagotchi for three days straight\nIf you wanted a Furby but deep down it kind of freaked you out\nIf you downloaded Britney for 4 hours on LimeWire only to find out it was the wrong version\nIf you think you should've listened to your mum when she said those Buffalo boots were ugly\nThen this deck is for you",
        images: ['images/hasbeen-card.jpg', 'images/hasbeen-2.jpg', 'images/hasbeen-3.jpg', 'images/hasbeen-4.jpg', 'images/hasbeen-5.jpg', 'images/hasbeen-6.jpg', 'images/hasbeen-7.jpg', 'images/hasbeen-detail.jpg', 'videos/hasbeen-hero.mp4'],
        inStock: true,
    },
    {
        id: 2, cat: 'deck', name: 'Too Much Lenormand', name_en: '', tag: 'Lenormand', tag_en: '',
        cards: 46, format: 'Poker', format_en: '', weight: '310g finition Soft Touch',
        weight_en: '310g Soft Touch finish', delivery: 'Livré sans boîte, avec un pochon en tissu',
        delivery_en: 'No box, delivered with a fabric pouch', price: 37, badge: 'new', glyph: '❉', grad: 'g-lenormand',
        desc: "Des couleurs, des paillettes, du glitter, du kitsch et absolument aucun sens de la mesure.\nLe Too Much Lenormand est le petit frère du Too Much Tarot : plus petit, mais tout aussi Kitch\n\nBecause Too Much is never enough",
        desc_en: "Colors, sequins, glitter, kitsch and absolutely no sense of moderation.\nThe Too Much Lenormand is the little sibling of the Too Much Tarot: smaller, but just as Kitsch\n\nBecause Too Much is never enough",
        images: ['images/lenormand-card.jpg', 'images/lenormand-2.jpg', 'images/lenormand-3.jpg', 'images/lenormand-4.jpg', 'images/lenormand-5.jpg', 'videos/lenormand-hero.mp4', 'videos/lenormand-detail.mp4'],
        inStock: true,
    },
    {
        id: 4, cat: 'bundle', name: 'Bundle', name_en: '', tag: 'Bundle', tag_en: '',
        cards: null, format: null, format_en: '', weight: null, weight_en: '',
        delivery: 'Too Much Lenormand + Has Been Tarot', delivery_en: '', price: 88, badge: null, glyph: '✦', grad: 'g-bundle',
        desc: "Deux univers TarotLens, une seule commande. Le Bundle réunit le Has Been Tarot, nostalgique et kitsch à souhait — Once famous, 4ever Fabulous — et le Too Much Lenormand, tout en paillettes, glitter et couleurs, parce que Too Much is never enough.\n\n133 cartes cumulées pour tirer aussi bien un tarot chargé de souvenirs qu'un Lenormand pétillant et sans aucune retenue.",
        desc_en: "Two TarotLens worlds, one single order. The Bundle brings together the Has Been Tarot — nostalgic and kitsch to the max, Once famous, 4ever Fabulous — and the Too Much Lenormand, all sequins, glitter and color, because Too Much is never enough.\n\n133 cards combined, for pulling both a tarot loaded with memories and a Lenormand that's sparkly and holds absolutely nothing back.",
        images: ['images/bundle-card.jpg', 'images/bundle-2.jpg'],
        inStock: true,
    },
    {
        id: 5, cat: 'accessory', name: 'Bougie Martini', name_en: 'Martini Candle', tag: 'Accessoire', tag_en: 'Accessory',
        cards: null, format: '5" L × 7,5" H | 9 fl oz', format_en: '5" L × 7.5" H | 9 fl oz', weight: null, weight_en: '',
        delivery: 'Récipient : verre à martini — Type de cire : gel', delivery_en: 'Container: martini glass — Wax type: gel',
        price: 29, badge: null, glyph: '✿', grad: 'g-acc1',
        desc: "Audacieuse et vivifiante, cette bougie d'inspiration cocktail classique dégage une sophistication discrète avec une touche d'intrigue.\n\nCoulée à la main avec une cire gel de qualité supérieure, 100% naturelle et sans parabène, et une mèche en coton, présentée dans notre verrerie réutilisable et conçue pour être rechargée à l'aide de nos kits de recharge, alliant indulgence et durabilité.\n\nParfum : Sans parfum",
        desc_en: "Bold and invigorating, this classic cocktail-inspired candle gives off understated sophistication with a touch of intrigue.\n\nHand-poured with premium gel wax, 100% natural and paraben-free, with a cotton wick, presented in our reusable glassware designed to be refilled with our refill kits — combining indulgence with sustainability.\n\nScent: Unscented",
        images: ['images/Bougies/bougie-martini.jpg'],
        inStock: true,
    },
    {
        id: 6, cat: 'accessory', name: 'Bougie Matcha Latte', name_en: 'Matcha Latte Candle', tag: 'Accessoire', tag_en: 'Accessory',
        cards: null, format: '10 oz', format_en: '', weight: null, weight_en: '',
        delivery: 'Récipient : bocal en verre transparent — Type de cire : base coco et glaçons en cire-gel',
        delivery_en: 'Container: clear glass jar — Wax type: coconut base with gel-wax ice cubes',
        price: 29, badge: null, glyph: '✿', grad: 'g-acc2',
        desc: "Le matcha vert frais se mêle à une crème légèrement sucrée, révélant de subtiles notes herbacées et une finale douce et veloutée, inspirée du classique café rafraîchissant. De réalistes glaçons en cire-gel flottent à la surface, apportant une touche ludique.\n\nVersée à la main avec de la cire en gel et une base de cire de noix de coco premium, 100% naturelles et sans parabènes, et une mèche en coton, présentée dans un bocal en verre réutilisable et conçue pour être renouvelée avec nos kits de recharge, alliant indulgence et durabilité.\n\nParfum : Latte à la vanille — un expresso riche se mêle à une vanille soyeuse et à un lait velouté, créant un arôme doux et réconfortant.",
        desc_en: "Fresh green matcha blends with a lightly sweetened cream, revealing subtle herbal notes and a soft, velvety finish inspired by the classic iced café drink. Realistic gel-wax ice cubes float on the surface for a playful touch.\n\nHand-poured with gel wax and a premium coconut wax base, 100% natural and paraben-free, with a cotton wick, presented in a reusable glass jar designed to be topped up with our refill kits — combining indulgence with sustainability.\n\nScent: Vanilla Latte — a rich espresso meets silky vanilla and velvety milk, creating a warm, comforting aroma.",
        images: ['images/Bougies/bougie-matcha.jpg'],
        inStock: true,
    },
    {
        id: 7, cat: 'accessory', name: 'Bougie Ube Latte', name_en: 'Ube Latte Candle', tag: 'Accessoire', tag_en: 'Accessory',
        cards: null, format: '5" L × 7,5" H | 9 fl oz', format_en: '5" L × 7.5" H | 9 fl oz', weight: null, weight_en: '',
        delivery: 'Récipient : verre à martini — Type de cire : gel', delivery_en: 'Container: martini glass — Wax type: gel',
        price: 29, badge: null, glyph: '✿', grad: 'g-acc3',
        desc: "Audacieuse et vivifiante, cette bougie d'inspiration cocktail classique dégage une sophistication discrète avec une touche d'intrigue.\n\nCoulée à la main avec une cire gel de qualité supérieure, 100% naturelle et sans parabène, et une mèche en coton, présentée dans notre verrerie réutilisable et conçue pour être rechargée à l'aide de nos kits de recharge, alliant indulgence et durabilité.\n\nParfum : Sans parfum",
        desc_en: "Bold and invigorating, this classic cocktail-inspired candle gives off understated sophistication with a touch of intrigue.\n\nHand-poured with premium gel wax, 100% natural and paraben-free, with a cotton wick, presented in our reusable glassware designed to be refilled with our refill kits — combining indulgence with sustainability.\n\nScent: Unscented",
        images: ['images/Bougies/bougie-ube.jpg'],
        inStock: true,
    },
    {
        id: 8, cat: 'accessory', name: 'Bougie Tomate', name_en: 'Tomato Candle', tag: 'Accessoire', tag_en: 'Accessory',
        cards: null, format: '3,5" L × 3,5" × 3" H', format_en: '3.5" L × 3.5" × 3" H', weight: '250g', weight_en: '',
        delivery: "Type de cire : cire d'abeille", delivery_en: 'Wax type: beeswax',
        price: 13, badge: null, glyph: '✿', grad: 'g-acc4',
        desc: "Inattendue de la meilleure des manières, cette bougie mise sur la beauté discrète d'une tomate parfaitement imparfaite.\n\nTerreuse, fraîche et légèrement nostalgique, elle apporte une subtile touche de jardin à l'intérieur.\n\nVersée à la main avec de la cire d'abeille premium, 100% naturelle, et une mèche en coton, cette bougie décorative offre une combustion propre et homogène tout en conciliant impact sculptural et savoir-faire raffiné.\n\nParfum : Sans parfum",
        desc_en: "Unexpected in the best possible way, this candle celebrates the quiet beauty of a perfectly imperfect tomato.\n\nEarthy, fresh and gently nostalgic, it brings a subtle touch of the garden indoors.\n\nHand-poured with premium, 100% natural beeswax and a cotton wick, this decorative candle offers a clean, even burn while combining sculptural impact with refined craftsmanship.\n\nScent: Unscented",
        images: ['images/Bougies/bougie-tomate.jpg'],
        inStock: true,
    },
    {
        id: 9, cat: 'accessory', name: 'Bougie Orange', name_en: 'Orange Candle', tag: 'Accessoire', tag_en: 'Accessory',
        cards: null, format: '3" L × 2,8" × 2" H', format_en: '3" L × 2.8" × 2" H', weight: '300g', weight_en: '',
        delivery: "Type de cire : cire d'abeille", delivery_en: 'Wax type: beeswax',
        price: 13, badge: null, glyph: '✿', grad: 'g-acc5',
        desc: "Cette bougie orange évoque une bouffée de soleil matinal. Ludique, fraîche, elle rend instantanément n'importe quel coin plus joyeux.\n\nCoulée à la main en cire d'abeille 100% naturelle et de qualité supérieure avec une mèche en coton, cette bougie décorative offre une combustion propre et régulière tout en conciliant impact sculptural et savoir-faire raffiné.\n\nParfum : à choisir parmi les options disponibles",
        desc_en: "This orange candle evokes a burst of morning sunshine. Playful and fresh, it instantly brightens up any corner.\n\nHand-poured in premium, 100% natural beeswax with a cotton wick, this decorative candle offers a clean, steady burn while combining sculptural impact with refined craftsmanship.\n\nScent: choose from the available options",
        images: ['images/Bougies/bougie-orange.jpg'],
        inStock: true,
    },
    {
        id: 10, cat: 'accessory', name: 'Bougie Citron', name_en: 'Lemon Candle', tag: 'Accessoire', tag_en: 'Accessory',
        cards: null, format: '3" L × 2,5" × 2" H', format_en: '3" L × 2.5" × 2" H', weight: '300g', weight_en: '',
        delivery: "Type de cire : cire d'abeille", delivery_en: 'Wax type: beeswax',
        price: 13, badge: null, glyph: '✿', grad: 'g-acc6',
        desc: "Net et éclatant, ce bougeoir-citron apporte une touche d'énergie là où vous le posez. C'est un petit coup de fouet zesté pour votre intérieur. Également disponible en vert, tout aussi vivifiant, saveur lime.\n\nVersé à la main avec de la cire d'abeille naturelle de qualité supérieure et une mèche en coton, ce bougeoir décoratif offre une combustion propre et régulière tout en alliant impact sculptural et savoir-faire raffiné.\n\nParfum : choisissez parmi les options disponibles",
        desc_en: "Crisp and bright, this lemon candle holder brings a burst of energy wherever you place it. It's a little zesty pick-me-up for your home. Also available in green, just as invigorating, lime scent.\n\nHand-poured with premium natural beeswax and a cotton wick, this decorative candle holder offers a clean, steady burn while combining sculptural impact with refined craftsmanship.\n\nScent: choose from the available options",
        images: ['images/Bougies/bougie-citron.jpg'],
        inStock: false,
    },
    {
        id: 11, cat: 'accessory', name: 'Bougie Fraise', name_en: 'Strawberry Candle', tag: 'Accessoire', tag_en: 'Accessory',
        cards: null, format: '5" L × 7,5" H | 9 fl oz', format_en: '5" L × 7.5" H | 9 fl oz', weight: null, weight_en: '',
        delivery: 'Type de cire : gel — vendu par 4', delivery_en: 'Wax type: gel — sold as a set of 4',
        price: 12, badge: null, glyph: '✿', grad: 'g-acc7',
        desc: "Audacieuse et vivifiante, cette bougie d'inspiration cocktail classique dégage une sophistication discrète avec une touche d'intrigue.\n\nCoulée à la main avec une cire gel de qualité supérieure, 100% naturelle et sans parabène, et une mèche en coton, présentée dans notre verrerie réutilisable et conçue pour être rechargée à l'aide de nos kits de recharge, alliant indulgence et durabilité.\n\nParfum : Sans parfum",
        desc_en: "Bold and invigorating, this classic cocktail-inspired candle gives off understated sophistication with a touch of intrigue.\n\nHand-poured with premium gel wax, 100% natural and paraben-free, with a cotton wick, presented in our reusable glassware designed to be refilled with our refill kits — combining indulgence with sustainability.\n\nScent: Unscented",
        images: ['images/Bougies/bougie-fraise.jpg'],
        inStock: true,
    },
];

/* ==================== Commandes (admin) ==================== */

function listerCommandesBrutes(sheet) {
    var rows = sheet.getDataRange().getValues();
    var out = [];
    var debut = 0;
    if (rows.length && !(rows[0][0] instanceof Date)) debut = 1; // ligne d'en-tête probable
    for (var i = debut; i < rows.length; i++) {
        var r = rows[i];
        if (!r[1] && !r[2]) continue; // ni nom ni email -> ligne vide
        var statutBrut = r[8] || 'Commande reçue';
        out.push({
            row: i + 1,
            date: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ''),
            name: r[1] || '', email: r[2] || '', phone: r[3] || '', address: r[4] || '',
            items: r[5] || '', subtotal: r[6] || '', lang: r[7] || '',
            statut: STATUTS_LEGACY_MAP[statutBrut] || statutBrut,
            suivi: r[9] || '',
        });
    }
    out.reverse();
    return out;
}

function supprimerCommande(ss, row) {
    var sh = findSheet(ss, 'Commandes');
    if (!sh) throw new Error('Onglet "Commandes" introuvable.');
    if (!row || row < 1) throw new Error('Ligne invalide.');
    sh.deleteRow(row);
}

// Réécrit dans le Sheet les anciens libellés de statut (voir
// STATUTS_LEGACY_MAP) par leur équivalent actuel — à lancer une fois depuis le
// menu TarotLens. listerCommandesBrutes() les affiche déjà correctement même
// sans ça ; ce menu corrige la valeur stockée pour de bon (exports, tri, etc.).
function migrerAnciensStatutsCommandes() {
    var ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = findSheet(ss, 'Commandes');
    if (!sh) { ui.alert('Onglet "Commandes" introuvable.'); return; }
    var rows = sh.getDataRange().getValues();
    var corrections = 0;
    for (var i = 1; i < rows.length; i++) {
        var nouveau = STATUTS_LEGACY_MAP[rows[i][8]];
        if (nouveau) { sh.getRange(i + 1, 9).setValue(nouveau); corrections++; }
    }
    ui.alert(corrections
        ? corrections + ' commande(s) migrée(s) vers les nouveaux statuts.'
        : 'Aucune commande à migrer — tous les statuts sont déjà à jour.');
}

// Échappe le texte injecté dans les e-mails HTML (nom du client, numéro de
// suivi) — ce sont des valeurs saisies par l'utilisateur au checkout.
function echapperHtmlMail(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Corps HTML commun aux 4 e-mails de statut : civilité, message du statut,
// encart numéro de suivi (si fourni) et formule de politesse.
function mailCorpsHtml(i18n, texte, name, suivi) {
    var html = '<p style="margin:0 0 16px;font-size:16px;">' + echapperHtmlMail(i18n.greeting) + ' ' + echapperHtmlMail(name) + ',</p>'
        + '<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">' + echapperHtmlMail(texte.message) + '</p>';
    if (suivi) {
        html += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#F5EDCC;border-radius:12px;padding:14px 18px;">'
            + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8B2DB5;font-weight:700;margin:0 0 4px;">' + echapperHtmlMail(texte.suiviLabel) + '</div>'
            + '<div style="font-size:18px;font-weight:700;color:#1A1614;">' + echapperHtmlMail(suivi) + '</div>'
            + '</td></tr></table>';
    }
    html += '<p style="margin:0;font-size:15px;line-height:1.6;">' + echapperHtmlMail(i18n.signoff) + '<br>' + echapperHtmlMail(i18n.team) + '</p>';
    return html;
}

// Habillage commun (bandeau logo TarotLens, carte blanche, pied de page) —
// couleurs reprises de styles.css (--orange, --cream, --purple, --ink).
function mailEnveloppeHtml(corpsHtml) {
    return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5EDCC;">'
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDCC;padding:32px 16px;font-family:\'Poppins\',Arial,sans-serif;">'
        + '<tr><td align="center">'
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:18px;overflow:hidden;">'
        + '<tr><td style="background:#E84E0A;padding:28px 24px;text-align:center;">'
        + '<span style="font-family:Impact,\'Arial Black\',sans-serif;font-size:30px;letter-spacing:4px;color:#FFFFFF;text-transform:uppercase;">TarotLens</span>'
        + '</td></tr>'
        + '<tr><td style="padding:32px 28px;color:#1A1614;">' + corpsHtml + '</td></tr>'
        + '<tr><td style="background:#F5EDCC;padding:18px 28px;text-align:center;">'
        + '<a href="' + MAIL_SITE_URL + '" style="font-size:12px;color:#8B2DB5;text-decoration:none;">' + MAIL_SITE_URL.replace('https://', '') + '</a>'
        + '</td></tr>'
        + '</table></td></tr></table></body></html>';
}

// Envoie au client l'e-mail de suivi correspondant au nouveau statut, dans la
// langue de sa commande (repli sur le français si langue inconnue). Envoi en
// multipart (htmlBody + body texte brut) : les clients qui n'affichent pas le
// HTML retombent sur le texte brut.
function envoyerMailStatutCommande(commande, statut, suivi) {
    if (STATUTS_NOTIFIES.indexOf(statut) < 0) return; // ex. Annulée : pas de mail auto
    if (!commande.email) return;
    var tpl = MAILS_STATUT_COMMANDE[statut];
    var lang = (String(commande.lang || '').toLowerCase() === 'en') ? 'en' : 'fr';
    var texte = tpl[lang];
    var i18n = MAIL_I18N[lang];
    var name = commande.name || '';

    var bodyPlain = i18n.greeting + ' ' + name + ',\n\n' + texte.message
        + (suivi ? '\n\n' + texte.suiviLabel + ' : ' + suivi : '')
        + '\n\n' + i18n.signoff + '\n' + i18n.team;

    MailApp.sendEmail({
        to: commande.email,
        subject: texte.subject,
        body: bodyPlain,
        htmlBody: mailEnveloppeHtml(mailCorpsHtml(i18n, texte, name, suivi)),
        replyTo: ORDER_NOTIFY_EMAIL,
    });
}

function definirStatutCommande(ss, row, statut, suivi) {
    if (STATUTS_COMMANDE.indexOf(statut) < 0) throw new Error('Statut invalide : ' + statut);
    if (statut === 'Expédié' && !String(suivi || '').trim()) throw new Error('Numéro de suivi requis pour le statut Expédié.');
    var sh = findSheet(ss, 'Commandes');
    if (!sh) throw new Error('Onglet "Commandes" introuvable.');
    if (!row || row < 1) throw new Error('Ligne invalide.');

    sh.getRange(row, 9).setValue(statut);
    if (statut === 'Expédié') sh.getRange(row, 10).setValue(String(suivi || '').trim());

    var r = sh.getRange(row, 1, 1, 8).getValues()[0];
    envoyerMailStatutCommande({ name: r[1], email: r[2], lang: r[7] }, statut, suivi);
}

/* ==================== Stock (admin) ==================== */

function listerStock(ss) {
    var sh = findSheet(ss, 'Stock');
    if (!sh) return [];
    var rows = sh.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < rows.length; i++) {
        var id = rows[i][0];
        if (id === '' || id === null) continue;
        out.push({ id: Number(id), nom: rows[i][1] || '', qty: typeof rows[i][2] === 'number' ? rows[i][2] : 0 });
    }
    return out;
}

function definirStock(ss, id, nom, qty) {
    var sh = findSheet(ss, 'Stock');
    if (!sh) throw new Error('Onglet "Stock" introuvable.');
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
            sh.getRange(i + 1, 3).setValue(Number(qty) || 0);
            return;
        }
    }
    sh.appendRow([Number(id), nom || '', Number(qty) || 0]);
}

/* ==================== Digest quotidien (automatisation) ==================== */

function listerInteretsStock(ss) {
    var sh = findSheet(ss, 'Intérêts stock');
    if (!sh) return [];
    var rows = sh.getDataRange().getValues();
    var out = [];
    var debut = 0;
    if (rows.length && !(rows[0][0] instanceof Date)) debut = 1; // ligne d'en-tête probable
    for (var i = debut; i < rows.length; i++) {
        var r = rows[i];
        if (!r[1] && !r[2]) continue; // ni email ni produit -> ligne vide
        out.push({
            row: i + 1,
            date: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ''),
            email: r[1] || '', product: r[2] || '', lang: r[3] || '',
        });
    }
    out.reverse();
    return out;
}

// Supprime une demande "prévenez-moi" une fois traitée — utilisé par le
// bouton dédié dans l'onglet Stock de admin.html (voir aussi la note dans
// envoyerDigestQuotidien : c'était déjà la façon prévue de les retirer,
// juste sans bouton avant).
function supprimerInteret(ss, row) {
    var sh = findSheet(ss, 'Intérêts stock');
    if (!sh) throw new Error('Onglet "Intérêts stock" introuvable.');
    if (!row || row < 1) throw new Error('Ligne invalide.');
    sh.deleteRow(row);
}

// Digest cumulatif (pas de delta) : à chaque envoi, l'e-mail reliste tout ce
// qui est encore d'actualité — rupture/stock faible lus depuis l'onglet
// "Stock", demandes "prévenez-moi" lues en entier depuis "Intérêts stock" (pas
// de colonne "traité" pour filtrer, donc la liste reste complète tant que la
// ligne n'est pas supprimée à la main). Aucun e-mail n'est envoyé si les trois
// listes sont vides.
function envoyerDigestQuotidien() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stock = listerStock(ss);
    var epuises = stock.filter(function (s) { return s.qty === 0; });
    var faibles = stock.filter(function (s) { return s.qty > 0 && s.qty <= SEUIL_STOCK_FAIBLE; });
    var interets = listerInteretsStock(ss);

    if (!epuises.length && !faibles.length && !interets.length) return;

    var lignes = ['Digest TarotLens — '
        + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'), ''];

    if (epuises.length) {
        lignes.push('RUPTURE DE STOCK :');
        epuises.forEach(function (s) { lignes.push('- ' + s.nom + ' (id ' + s.id + ')'); });
        lignes.push('');
    }

    if (faibles.length) {
        lignes.push('STOCK FAIBLE (≤ ' + SEUIL_STOCK_FAIBLE + ') :');
        faibles.forEach(function (s) { lignes.push('- ' + s.nom + ' (id ' + s.id + ') : ' + s.qty); });
        lignes.push('');
    }

    if (interets.length) {
        lignes.push('DEMANDES "PRÉVENEZ-MOI DU RETOUR EN STOCK" EN ATTENTE (' + interets.length + ') :');
        var parProduit = {};
        interets.forEach(function (it) {
            var cle = it.product || '(produit non précisé)';
            (parProduit[cle] = parProduit[cle] || []).push(it.email);
        });
        Object.keys(parProduit).forEach(function (prod) {
            lignes.push('- ' + prod + ' : ' + parProduit[prod].join(', '));
        });
        lignes.push('', 'Pour retirer une demande traitée, supprime sa ligne dans l\'onglet "Intérêts stock".');
    }

    MailApp.sendEmail({
        to: ORDER_NOTIFY_EMAIL,
        subject: 'TarotLens — digest quotidien (' + (epuises.length + faibles.length) + ' produit(s), ' + interets.length + ' demande(s))',
        body: lignes.join('\n'),
    });
}

// Installe le déclencheur temporel (1x/jour, ~8h). Garde-fou anti-doublon :
// si un déclencheur pour envoyerDigestQuotidien existe déjà, ne recrée rien.
function installerAutomatisations() {
    var ui = SpreadsheetApp.getUi();
    var dejaInstalle = ScriptApp.getProjectTriggers().some(function (t) {
        return t.getHandlerFunction() === 'envoyerDigestQuotidien';
    });
    if (dejaInstalle) {
        ui.alert('Le digest quotidien est déjà installé (une exécution automatique par jour).');
        return;
    }
    ScriptApp.newTrigger('envoyerDigestQuotidien')
        .timeBased()
        .everyDays(1)
        .atHour(8)
        .create();
    ui.alert('Digest quotidien installé : un e-mail sera envoyé chaque matin vers 8h à '
        + ORDER_NOTIFY_EMAIL + ' s\'il y a du stock épuisé/faible ou des demandes "prévenez-moi" en attente.'
        + '\n\nRien n\'est envoyé les jours où tout va bien.');
}

/* ==================== Upload photos (Drive) ==================== */

function obtenirDossierPhotos() {
    var dossiers = DriveApp.getFoldersByName(DOSSIER_PHOTOS);
    if (dossiers.hasNext()) return dossiers.next();
    return DriveApp.createFolder(DOSSIER_PHOTOS);
}

function televerserPhoto(filename, mimeType, base64) {
    if (!/^image\//.test(String(mimeType || ''))) {
        throw new Error('Seules les images sont acceptées ici (vidéos : coller une URL/chemin dans le champ dédié).');
    }
    var octets = Utilities.base64Decode(base64);
    if (octets.length > TAILLE_MAX_PHOTO) throw new Error('Image trop lourde (8 Mo max).');
    var blob = Utilities.newBlob(octets, mimeType, filename || 'photo.jpg');
    var fichier = obtenirDossierPhotos().createFile(blob);
    fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://lh3.googleusercontent.com/d/' + fichier.getId();
}

/* ==================== Dispatch API (action) ==================== */

// Fenêtre glissante d'échecs sur adminLogin uniquement (pas sur les autres
// actions admin*, pour qu'une clé devenue invalide en cours de session — ex.
// rotation de clé dans un autre onglet — ne verrouille pas une reconnexion
// légitime). Compteur en CacheService : expire tout seul, pas de verrou permanent.
function tropDeTentativesLogin() {
    var n = Number(CacheService.getScriptCache().get('admin_login_echecs') || 0);
    return n >= LOGIN_MAX_TENTATIVES;
}
function enregistrerTentativeLogin(reussite) {
    var cache = CacheService.getScriptCache();
    if (reussite) { cache.remove('admin_login_echecs'); return; }
    var n = Number(cache.get('admin_login_echecs') || 0) + 1;
    cache.put('admin_login_echecs', String(n), LOGIN_FENETRE_SECONDES);
}

function handleAction(p) {
    try {
        var action = String(p.action || '');
        if (action === 'produits') return actionProduitsPublic();

        if (action.indexOf('admin') === 0) {
            var isAdmin = !!(p.ak && hacherCleAdmin(p.ak) === getAdminKeyHash());
            if (action === 'adminLogin') {
                if (!isAdmin && tropDeTentativesLogin()) {
                    return { ok: false, error: 'Trop de tentatives échouées. Réessaie dans quelques minutes.' };
                }
                enregistrerTentativeLogin(isAdmin);
            }
            if (!isAdmin) return { ok: false, error: 'auth' };
            return handleAdmin(action, p);
        }

        return { ok: false, error: 'Action inconnue : ' + action };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

function handleAdmin(action, p) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    switch (action) {
        case 'adminLogin':
            return { ok: true };
        case 'adminListProduits':
            return { ok: true, produits: listerProduits(ss) };
        case 'adminSaveProduit':
            return { ok: true, produit: sauvegarderProduit(ss, p.produit || {}) };
        case 'adminDeleteProduit':
            supprimerProduit(ss, p.id);
            return { ok: true };
        case 'adminMoveProduit':
            deplacerProduit(ss, p.id, String(p.sens || ''));
            return { ok: true };
        case 'adminUploadPhoto':
            return { ok: true, url: televerserPhoto(p.filename, p.mimeType, p.data) };
        case 'adminListCommandes':
            var shCommandes = findSheet(ss, 'Commandes');
            if (!shCommandes) throw new Error('Onglet "Commandes" introuvable.');
            return { ok: true, commandes: listerCommandesBrutes(shCommandes) };
        case 'adminSetStatutCommande':
            definirStatutCommande(ss, Number(p.row), String(p.statut || ''), String(p.suivi || ''));
            return { ok: true };
        case 'adminDeleteCommande':
            supprimerCommande(ss, Number(p.row));
            return { ok: true };
        case 'adminListStock':
            return { ok: true, stock: listerStock(ss) };
        case 'adminSetStock':
            definirStock(ss, p.id, p.nom, p.qty);
            return { ok: true };
        case 'adminListInterets':
            return { ok: true, interets: listerInteretsStock(ss) };
        case 'adminDeleteInteret':
            supprimerInteret(ss, Number(p.row));
            return { ok: true };
        default:
            return { ok: false, error: 'Action admin inconnue : ' + action };
    }
}

/* ==================== doGet / doPost ==================== */

function doGet(e) {
    var p = (e && e.parameter) ? e.parameter : {};

    // Nouveau : seule l'action publique "produits" est accessible en GET.
    // Les actions admin exigent un POST (la clé ne doit jamais transiter par l'URL).
    if (p.action) {
        var resultat = (p.action === 'produits')
            ? actionProduitsPublic()
            : { ok: false, error: 'Cette action nécessite une requête POST.' };
        return ContentService
            .createTextOutput(JSON.stringify(resultat))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Chemin existant, inchangé : disponibilité du stock (ArcanaStock côté frontend).
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var stockSheet = findSheet(ss, 'Stock');
        var stock = {};
        if (stockSheet) {
            var rows = stockSheet.getDataRange().getValues();
            // Ligne 0 = en-têtes (id, nom, quantité disponible) — on l'ignore.
            for (var i = 1; i < rows.length; i++) {
                var id = rows[i][0];
                var qty = rows[i][2];
                if (id === '' || id === null) continue;
                stock[id] = typeof qty === 'number' ? qty : 0;
            }
        }
        return ContentService
            .createTextOutput(JSON.stringify({ ok: true, stock: stock }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService
            .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function sendOrderEmail(data) {
    var lines = (data.items || []).map(function (it) {
        return '- ' + it.name + ' x' + it.qty + (it.price ? ' (' + (it.price * it.qty).toFixed(2) + ' €)' : '');
    }).join('\n');

    var body = 'Nouvelle commande TarotLens\n\n'
        + 'Nom : ' + (data.name || '') + '\n'
        + 'E-mail : ' + (data.email || '') + '\n'
        + 'Téléphone : ' + (data.phone || '') + '\n'
        + 'Adresse : ' + (data.address || '') + '\n\n'
        + 'Articles :\n' + lines + '\n\n'
        + 'Sous-total : ' + (data.subtotal || '') + ' €\n'
        + 'Langue : ' + (data.lang || '') + '\n';

    MailApp.sendEmail({
        to: ORDER_NOTIFY_EMAIL,
        subject: 'Nouvelle commande — ' + (data.name || 'client'),
        body: body,
        replyTo: data.email || undefined,
    });
}

function sendContactEmail(data) {
    var body = 'Nouveau message depuis le formulaire de contact TarotLens\n\n'
        + 'Nom : ' + (data.name || '') + '\n'
        + 'E-mail : ' + (data.email || '') + '\n'
        + 'Sujet : ' + (data.subject || '') + '\n\n'
        + 'Message :\n' + (data.message || '') + '\n';

    MailApp.sendEmail({
        to: ORDER_NOTIFY_EMAIL,
        subject: 'TarotLens — contact : ' + (data.subject || 'Message'),
        body: body,
        replyTo: data.email || undefined,
    });
}

function doPost(e) {
    var data;
    try {
        data = JSON.parse(e.postData.contents);
    } catch (err) {
        return ContentService
            .createTextOutput(JSON.stringify({ ok: false, error: 'Requête illisible.' }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Nouveau : toutes les actions "produits"/"admin*" (admin.html) passent par ici.
    if (data.action) {
        return ContentService
            .createTextOutput(JSON.stringify(handleAction(data)))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Chemin existant, inchangé : commandes (panier.js) et inscriptions "prévenez-moi" (index.html).
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();

        if (data.type === 'stock_interest') {
            var stockSheet = findSheet(ss, 'Intérêts stock');
            if (!stockSheet) {
                throw new Error('Onglet "Intérêts stock" introuvable. Onglets existants : '
                    + ss.getSheets().map(function (s) { return '[' + s.getName() + ']'; }).join(', '));
            }
            stockSheet.appendRow([
                new Date(),
                data.email || '',
                data.product || '',
                data.lang || '',
            ]);
        } else if (data.type === 'contact') {
            sendContactEmail(data);
        } else {
            var orderSheet = findSheet(ss, 'Commandes') || ss.getActiveSheet();
            var itemsSummary = (data.items || [])
                .map(function (it) { return it.name + ' x' + it.qty; })
                .join(', ');

            orderSheet.appendRow([
                new Date(),
                data.name || '',
                data.email || '',
                data.phone || '',
                data.address || '',
                itemsSummary,
                data.subtotal || '',
                data.lang || '',
                'Commande reçue',
                '',
            ]);

            sendOrderEmail(data);
        }

        return ContentService
            .createTextOutput(JSON.stringify({ ok: true }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService
            .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
