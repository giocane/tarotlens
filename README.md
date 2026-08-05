# TarotLens

Site vitrine + boutique de pré-commande pour les jeux de tarot/lenormand
"Too Much" et "Has Been", et accessoires. HTML / CSS / JS purs, sans
dépendance ni build (à part la XLSX export dans l'admin). Backend Google Apps
Script (`google-apps-script/Code.gs`) branché sur un Google Sheet.

En ligne sur Cloudflare Pages.

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
| `products.js` | Charge le catalogue live depuis le Sheet "Produits" (remplace `window.PRODUCTS` si la réponse est exploitable) |
| `cart.js` | Panier partagé (localStorage) : badge, navigation, add/remove/total ; expose aussi `ArcanaStock` (disponibilité live) |
| `i18n.js` | FR / EN — dictionnaire, `data-i18n`, sélecteur de langue |
| `panier.js` | Page panier : rendu des lignes, formulaire de commande, envoi au backend |

Ordre de chargement sur chaque page : `i18n.js` → `data.js` → `cart.js` →
`products.js` → script de la page.

**Cache-busting** : chaque `<script>`/`<link>` versionné (`?v=N`) doit être
bumpé sur **toutes** les pages qui le référencent dès que le fichier change,
sans quoi certains visiteurs restent sur l'ancienne version en cache.

---

## 🗄️ Backend (`google-apps-script/Code.gs`)

À coller dans Extensions > Apps Script du Google Sheet, déployé en Web App
(exécuté en tant que "Moi", accès "Tous").

Fonctionnalités : réception des commandes et des "prévenez-moi", relais du
formulaire de contact, API admin (auth par clé hachée, jamais en clair),
upload photos vers Drive, digest quotidien par e-mail (stock faible/rupture +
demandes en attente), e-mails de suivi de commande multilingues.

### Onglets attendus dans le Sheet

| Onglet | Colonnes | Notes |
|---|---|---|
| `Commandes` | date, nom, email, tel, adresse, articles, sous-total, langue, statut, numéro de suivi, articles (JSON `[{id,qty}]`, usage interne), stock déjà décrémenté (booléen, usage interne) | Remplie automatiquement. Le statut suit `STATUTS_COMMANDE` ; le numéro de suivi n'est rempli qu'au statut "Expédié" ; le flag "stock décrémenté" garantit un décompte une seule fois même si le statut repasse plusieurs fois par "Paiement validé". Chaque changement de statut (sauf "Annulée") envoie un e-mail auto au client dans sa langue. |
| `Intérêts stock` | — | Inscriptions "prévenez-moi du retour en stock", remplie automatiquement. |
| `Stock` | id, nom, quantité disponible | Éditable à la main ou depuis `admin.html`. Une ligne par produit. |
| `Produits` | `id, cat, name, name_en, tag, tag_en, cards, format, format_en, weight, weight_en, delivery, delivery_en, price, badge, glyph, grad, desc, desc_en, images, inStock, hero` | Ligne d'en-tête exacte définie par la constante `PRODUITS_ENTETES` dans `Code.gs` (source de vérité — si les deux divergent, c'est le Sheet qui pilote). Colonne `images` = URLs séparées par `\|`, la première sert de visuel de couverture. Catalogue complet, éditable depuis `admin.html` (ou à la main). |
| `Textes` | cle, fr, en | Dictionnaire i18n FR/EN + titres des bannières, éditable depuis l'onglet Textes de `admin.html`. Créé automatiquement au premier enregistrement si absent. |

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
