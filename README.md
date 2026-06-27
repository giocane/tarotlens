# Arcana — Tarots personnalisés

Site vitrine + mini-boutique pour la vente de jeux de tarot personnalisés.
HTML / CSS / JavaScript purs, sans dépendance ni build. Charte graphique
rétro / groovy années 70 (rose, crème, orange) + mode sombre.

---

## 🚀 Lancer le site

Aucune installation. Ouvrez simplement **`index.html`** dans un navigateur.

> 💡 Le panier utilise `localStorage` : il fonctionne en ouvrant les fichiers
> directement (`file://`). Pour un rendu 100 % fidèle (polices, etc.), vous
> pouvez aussi servir le dossier avec un petit serveur local :
> ```bash
> cd arcana-tarots && python3 -m http.server 8000
> # puis ouvrir http://localhost:8000
> ```

---

## 📄 Pages (9)

| Fichier | Rôle |
|---------|------|
| `index.html` | Accueil — héros, collections, configurateur (aperçu), galerie, lectures |
| `boutique.html` | Catalogue : filtres (catégorie, ambiance, format, budget), tri, aperçu rapide |
| `produit.html?id=N` | Fiche produit : visuel, quantité, onglets, produits associés |
| `panier.html` | Panier : quantités, total, livraison, commande (démo) |
| `personnaliser.html` | Sur-mesure : étapes, galerie de styles, **configurateur live**, tarifs, délais |
| `apropos.html` | Histoire, atelier, journal |
| `contact.html` | Formulaire + coordonnées |
| `aide.html` | Livraison, retours, FAQ, suivi de commande |
| `legal.html` | Mentions légales, confidentialité, CGV |

---

## 🎨 Styles (CSS)

| Fichier | Contenu |
|---------|---------|
| `styles.css` | Base commune : variables de couleur, header, héros, boutons, footer, animations au scroll, **variables du mode sombre** |
| `shop.css` | Boutique + fiche produit (grille, cartes, filtres, modale) |
| `page.css` | Pages de contenu, configurateur, fiche produit, panier |

### Changer les couleurs
Tout part des variables CSS en haut de `styles.css` (`:root { … }`) :
```css
--cream / --pink / --orange / --night / --ink …
```
Le mode sombre redéfinit ces mêmes variables dans `html[data-theme="dark"] { … }`.

### Polices
Chargées via Google Fonts : **Bagel Fat One** (titres groovy) + **Poppins** (texte).

---

## ⚙️ Scripts (JS)

| Fichier | Rôle |
|---------|------|
| `data.js` | **Source unique des produits** (`window.PRODUCTS`) |
| `cart.js` | Panier partagé (localStorage) : badge, navigation, add/remove/total |
| `theme.js` | Mode clair/sombre : bouton injecté, mémorisé, préférence système, sans flash |
| `shop.js` | Boutique : rendu, filtres, tri, aperçu rapide |
| `produit.js` | Fiche produit (lit `?id=`) |
| `panier.js` | Page panier |
| `configurateur.js` | Galerie filtrable + configurateur avec aperçu en direct |
| `script.js` | Accueil : animations au scroll, parallaxe, barre de progression |
| `page.js` | Menu mobile + header au scroll (pages de contenu) |

Ordre de chargement sur chaque page : `theme.js` (head) → `data.js` → `cart.js` → script de la page.

---

## ✏️ Modifier le contenu

- **Textes** : directement dans les fichiers `.html` (tout est en placeholder, à remplacer).
- **Produits** : éditer le tableau dans `data.js` (nom, prix, catégorie, ambiance,
  format, note, visuel…). Toutes les pages se mettent à jour automatiquement.
- **Images** : les visuels sont actuellement des dégradés CSS + symboles. Pour de
  vraies photos, remplacer les blocs `.card-media` / `.pdp-media` par des `<img>`.
- **Styles de tarot (exemples)** : cartes SVG dans `personnaliser.html` (section
  `#exemples`) ; les presets de l'aperçu live sont dans `configurateur.js`.

---

## ✨ Fonctionnalités

- Charte rétro/groovy + **mode sombre** global mémorisé
- **Animations au scroll** (révélations en cascade, parallaxe, barre de progression,
  animations natives `animation-timeline` sur navigateurs récents)
- Boutique **filtrable** (catégorie, ambiance, format, budget) + **tri** + aperçu rapide
- **Fiche produit** avec onglets et produits associés
- **Panier persistant** entre les pages (localStorage)
- **Configurateur** sur-mesure avec aperçu de carte en temps réel → ajout au panier
- 100 % **responsive** + respect de `prefers-reduced-motion`

---

## ⚠️ Limites (démo)

- Aucun back-end : commandes, paiement, formulaires et suivi sont simulés.
- Les textes légaux (mentions, CGV, confidentialité) sont des exemples à faire
  valider juridiquement.
- Les visuels produits sont illustratifs.

---

© 2026 Arcana — gabarit de démonstration.
