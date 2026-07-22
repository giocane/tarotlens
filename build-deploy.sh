#!/bin/bash
# Prépare dist/ : une copie propre du site, prête à envoyer en FTP sur
# O2Switch (sous-domaine ou sous-dossier à côté de WordPress). Exclut tout ce
# qui ne doit jamais être public : .git, google-apps-script/ (source du
# backend), README.md, Textes/ (brouillons), rushes photo/vidéo bruts.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir dist

cp index.html panier.html contact.html legal.html admin.html dist/
cp cart.js data.js i18n.js panier.js products.js dist/
cp styles.css dist/
cp .htaccess robots.txt dist/
cp favicon.svg favicon.ico favicon-32.png favicon-16.png apple-touch-icon.png dist/

mkdir -p dist/images dist/videos
cp -R images/. dist/images/
rm -rf "dist/images/Has Been Tarot" "dist/images/Too Much Lenormand" \
    "dist/images/Too Much Tarot" "dist/images/Bundle" "dist/images/gallery"
find dist/images -name '.DS_Store' -delete

cp -R videos/. dist/videos/
find dist/videos -name '.DS_Store' -delete

echo "dist/ prêt — envoie tout son contenu (pas le dossier dist lui-même) à la racine du sous-domaine/sous-dossier sur O2Switch."
