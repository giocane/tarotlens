# TarotLens

Site vitrine + boutique de pré-commande pour les jeux de tarot/lenormand
"Too Much" et "Has Been", et accessoires. HTML / CSS / JS purs, sans
dépendance ni build (à part la XLSX export dans l'admin). Backend Cloudflare
Pages Functions (`functions/api.js`) + base D1.

En ligne sur Cloudflare Pages. `google-apps-script/Code.gs` est l'ancien
backend Google Sheets, abandonné depuis la migration vers Cloudflare (v3.0) —
conservé à titre historique, plus du tout branché ni maintenu.

---

## 🚀 Lancer le site en local

Aucune installation. Ouvrez **`index.html`** dans un navigateur, ou servez le
dossier avec un petit serveur local pour un rendu 100 % fidèle (polices, etc.) :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Le panier (`localStorage`) et le catalogue produits (fetch vers le backend)
fonctionnent dans les deux cas.

---

## 📄 Pages

| Fichier | Rôle |
|---------|------|
| `index.html` | Accueil — héros vidéo, grille decks + accessoires, modale produit, modale "prévenez-moi du retour en stock" |
| `panier.html` | Panier + formulaire de commande (pré-commande) |
| `contact.html` | Formulaire de contact (envoyé par e-mail via le backend) |
| `legal.html` | Mentions légales, confidentialité, CGV |
| `admin.html` | Back-office (commandes, stock, produits) — protégé par clé admin, `noindex` |

---

## ⚙️ Scripts (JS)

| Fichier | Rôle |
|---------|------|
| `data.js` | Catalogue produits de secours (`window.PRODUCTS`) — utilisé pour le tout premier rendu, avant que le catalogue live ne réponde |
| `products.js` | Charge le catalogue live depuis l'API Cloudflare (table D1 `produits`), remplace `window.PRODUCTS` si la réponse est exploitable |
| `cart.js` | Panier partagé (localStorage) : badge, navigation, add/remove/total ; expose aussi `ArcanaStock` (disponibilité live) |
| `i18n.js` | FR / EN — dictionnaire, `data-i18n`, sélecteur de langue |
| `panier.js` | Page panier : rendu des lignes, formulaire de commande, envoi au backend |

Ordre de chargement sur chaque page : `i18n.js` → `data.js` → `cart.js` →
`products.js` → script de la page.

**Cache-busting** : chaque `<script>`/`<link>` versionné (`?v=N`) doit être
bumpé sur **toutes** les pages qui le référencent dès que le fichier change,
sans quoi certains visiteurs restent sur l'ancienne version en cache.

---

## 🗄️ Backend (`functions/api.js` + Cloudflare D1)

Cloudflare Pages Functions, servi sous `/api` à côté du site statique. Base de
données D1 (`env.DB`), photos sur R2. Auth admin par clé hachée (jamais en
clair), rate-limiting des tentatives de connexion.

Fonctionnalités : réception des commandes et des "prévenez-moi", relais du
formulaire de contact, API admin (produits, stock, commandes, textes), upload
photos, digest quotidien (stock faible/rupture + demandes en attente),
e-mails de suivi de commande multilingues.

### Tables D1

| Table | Colonnes clés | Notes |
|---|---|---|
| `commandes` | date, name, email, phone, address, items_summary, subtotal, lang, statut, suivi, items_json, stock_decremented | Remplie automatiquement. Le statut suit `STATUTS_COMMANDE` (voir `functions/api.js`) ; chaque changement de statut envoie un e-mail auto au client dans sa langue. |
| `interets_stock` | date, email, product, lang | Inscriptions "prévenez-moi du retour en stock". |
| `stock` | id, qty | Éditable depuis `admin.html`. Une ligne par produit suivi. |
| `produits` | `id, cat, name, name_en, tag, tag_en, accroche, accroche_en, cards, cardsDetail, cardsDetail_en, format, format_en, weight, weight_en, delivery, delivery_en, price, badge, glyph, grad, desc, desc_en, points, points_en, images, inStock, hero, sort_order, comingSoon` | Catalogue complet, éditable depuis `admin.html`. `accroche` = courte phrase sous le titre. `cardsDetail` = détail de composition affiché après le nombre de cartes dans l'encart mis en avant. `points` = liste à puces (un point par ligne) sous la description. `images` = URLs séparées par `\|`, la première sert de couverture. |
| `textes` | cle, fr, en | Dictionnaire i18n FR/EN + titres des bannières, éditable depuis l'onglet Textes de `admin.html`. |
| `rate_limit` | key, count, expires_at | Anti-bruteforce sur la connexion admin, usage interne. |

---

## 📦 Déploiement

Le site est actuellement servi par Cloudflare Pages (déploiement direct du
dépôt). `build-deploy.sh` reste disponible pour un déploiement alternatif en
FTP classique (ex. O2Switch) : il prépare un dossier `dist/` propre (sans
`.git`, sans `google-apps-script/`, sans les rushes photo/vidéo bruts) prêt à
envoyer tel quel. `.htaccess` (forçage HTTPS, cache navigateur) n'est utile
que dans ce second cas — Cloudflare Pages l'ignore.

---

## ⚠️ Limites

- Pas de paiement en ligne : les commandes sont des pré-commandes, le
  règlement se fait hors-site.
- Les mentions légales / CGV contiennent encore des placeholders à valider
  juridiquement avant tout contrôle sérieux.

---

© 2026 TarotLens.
