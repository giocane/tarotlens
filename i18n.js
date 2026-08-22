(function () {
    const LANG_KEY = 'tarotlens_lang';

    const DICT = {
        fr: {
            nav_decks: "LES DECKS",
            nav_accessories: "ACCESSOIRES",
            nav_cartAria: "Panier",
            nav_homeAria: "TarotLens, accueil",
            title_decks: "LES DECKS",
            title_accessories: "LES ACCESSOIRES",
            hero_cta: "ACHETEZ VOTRE TAROT",
            badge_new: "Nouveau",
            btn_addToCart: "AJOUTER AU PANIER",
            btn_learnMore: "EN SAVOIR +",
            modal_closeAria: "Fermer",
            modal_descTodo: "Description à venir.",
            modal_prevAria: "Photo précédente",
            modal_nextAria: "Photo suivante",
            modal_photoAria: "Photo {n}",
            unit_cards: "cartes",
            toast_added: '« {name} » ajouté au panier',
            footer_contactLine: "Me contacter si vous avez des questions",
            footer_legalLink: "Mentions légales",
            footer_reviewsTitle: "Ils adorent déjà ✦",
            contact_nameLabel: "Prénom & Nom",
            contact_subjectLabel: "Sujet",
            contact_opt1: "Question sur une commande",
            contact_opt2: "Pré-commande",
            contact_opt3: "Partenariat / presse",
            contact_opt4: "Autre",
            contact_send: "ENVOYER",
            contact_sentMsg: "✦ Message envoyé, merci !",
            contact_sendError: "Une erreur est survenue, merci de réessayer ou de nous écrire directement à TarotLens129@gmail.com.",
            contact_responseTitle: "Réponse",
            contact_responseText: "Je réponds sous 48 h.",
            legal_title: "MENTIONS LÉGALES",
            legal_publisherTitle: "Éditeur du site",
            legal_publisherIntro: "Le site tarotlens.boutique est édité par :",
            legal_publisherName: "Nom / raison sociale : à compléter",
            legal_publisherStatus: "Statut : entrepreneur individuel (auto-entrepreneur)",
            legal_publisherSiret: "SIRET : à compléter",
            legal_publisherAddress: "Adresse : à compléter",
            legal_publisherDirector: "Directeur de la publication : à compléter",
            legal_contactPrefix: "Contact : ",
            legal_hostTitle: "Hébergement",
            legal_hostText: "Le site est hébergé par Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, États-Unis.",
            legal_ipTitle: "Propriété intellectuelle",
            legal_ipText: "L'ensemble des contenus du site (textes, visuels, illustrations de cartes, logo) est la propriété de TarotLens, sauf mention contraire, et ne peut être reproduit sans autorisation.",
            legal_privacyTitle: "Confidentialité",
            legal_privacyIntro: "Nous collectons uniquement les données nécessaires au traitement de vos commandes.",
            legal_li1: "Données collectées : identité, e-mail, historique de commande.",
            legal_li2: "Finalités : traitement des commandes et support.",
            legal_li3_prefix: "Vos droits : accès, rectification, effacement — écrivez à ",
            legal_cgvTitle: "Conditions générales de vente",
            legal_cgvIntro: "Toute commande passée sur tarotlens.boutique implique l'acceptation pleine et entière des présentes conditions générales de vente.",
            legal_cgvProductsTitle: "Produits & prix",
            legal_cgvProductsText: "Les produits TarotLens (jeux de tarot, lenormand et accessoires) sont vendus en pré-commande, dans la limite des stocks disponibles. Les prix sont indiqués en euros TTC.",
            legal_cgvPaymentTitle: "Paiement",
            legal_cgvPaymentText: "Le règlement s'effectue par virement bancaire. Les coordonnées bancaires (RIB) sont communiquées par e-mail après validation de la commande. La commande est confirmée à réception du paiement.",
            legal_cgvShippingTitle: "Livraison",
            legal_cgvShippingText: "Les commandes sont préparées et expédiées sous 24 à 72h après réception du paiement, principalement via Mondial Relay pour la France. Une expédition à l'international est possible.",
            legal_cgvWithdrawalTitle: "Droit de rétractation",
            legal_cgvWithdrawalText: "Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours à compter de la réception de votre commande pour exercer votre droit de rétractation, sans avoir à justifier de motif. Pour l'exercer, contactez-nous à ",
            legal_cgvWithdrawalText2: ". Les frais de retour sont à votre charge, sauf erreur de notre part.",
            legal_cgvDisputeTitle: "Réclamations et litiges",
            legal_cgvDisputeText: "Pour toute question ou réclamation, contactez-nous à ",
            legal_cgvDisputeText2: ". À défaut de résolution amiable, les litiges relèvent des tribunaux français compétents.",
            cart_title: "MON PANIER",
            cart_emptyTitle: "Votre panier est vide",
            cart_emptyText: "Découvrez nos decks et accessoires.",
            cart_emptyCta: "VOIR LES DECKS",
            cart_remove: "Retirer",
            cart_preorder: "Pré-commande",
            cart_summaryTitle: "Récapitulatif",
            cart_subtotal: "Sous-total",
            cart_priceTBC: "Prix à confirmer",
            cart_totalItems: "Total articles",
            cart_checkout: "VALIDER LA COMMANDE",
            cart_clear: "Vider le panier",
            cart_thanksTitle: "Merci !",
            cart_thanksText: "Pré-commande enregistrée. Nous vous recontactons prochainement.",
            cart_backHome: "RETOUR À L'ACCUEIL",
            cart_orderTitle: "Vos coordonnées",
            cart_orderName: "Prénom & Nom",
            cart_orderEmail: "E-mail",
            cart_orderPhone: "Téléphone",
            cart_orderAddress: "Adresse de livraison",
            cart_orderCp: "Code postal",
            cart_orderPays: "Pays",
            cart_orderSubmit: "ENVOYER LA COMMANDE",
            cart_orderSending: "ENVOI EN COURS…",
            cart_orderError: "Une erreur est survenue, merci de réessayer ou de nous contacter directement.",
            cart_orderErrorStock: "Désolé, ces articles viennent de passer en rupture de stock : {items}. Retire-les de ton panier pour continuer.",
            cart_trustPaymentTitle: "Paiement par virement",
            cart_trustPaymentText: "Vous recevez notre RIB par e-mail après validation de la commande",
            cart_trustShipTitle: "Expédié sous 24 à 72h",
            cart_trustShipText: "Dès réception du paiement — Mondial Relay en France, envoi possible à l'international",
            cart_trustContactTitle: "Une question ?",
            cart_trustContactText: "Écrivez-nous, on répond vite",
            cart_orderNote: "Après l'envoi de ce formulaire, vous recevrez nos coordonnées bancaires (RIB) par e-mail pour régler votre commande par virement.",
            stock_outOfStock: "RUPTURE DE STOCK",
            stock_notifyPlaceholder: "Votre e-mail",
            stock_notifySubmit: "PRÉVENEZ-MOI",
            stock_notifySending: "ENVOI…",
            stock_notifyThanks: "Merci, on vous prévient dès le retour en stock !",
            stock_notifyError: "Une erreur est survenue, réessayez plus tard.",
            stock_lowBadge: "Plus que {n} en stock !",
            stock_available: "{n} disponible(s)",
            lang_switchLabel: "God save the Queen (of wands)",
            lang_switchAria: "Switch to English",
        },
        en: {
            nav_decks: "THE DECKS",
            nav_accessories: "ACCESSORIES",
            nav_cartAria: "Cart",
            nav_homeAria: "TarotLens, home",
            title_decks: "THE DECKS",
            title_accessories: "THE ACCESSORIES",
            hero_cta: "BUY YOUR DECK",
            badge_new: "New",
            btn_addToCart: "ADD TO CART",
            btn_learnMore: "LEARN MORE",
            modal_closeAria: "Close",
            modal_descTodo: "Description coming soon.",
            modal_prevAria: "Previous photo",
            modal_nextAria: "Next photo",
            modal_photoAria: "Photo {n}",
            unit_cards: "cards",
            toast_added: '"{name}" added to cart',
            footer_contactLine: "Get in touch if you have any questions",
            footer_legalLink: "Legal notice",
            footer_reviewsTitle: "Already loved ✦",
            contact_nameLabel: "First & last name",
            contact_subjectLabel: "Subject",
            contact_opt1: "Order question",
            contact_opt2: "Pre-order",
            contact_opt3: "Partnership / press",
            contact_opt4: "Other",
            contact_send: "SEND",
            contact_sentMsg: "✦ Message sent, thank you!",
            contact_sendError: "Something went wrong, please try again or email us directly at TarotLens129@gmail.com.",
            contact_responseTitle: "Response",
            contact_responseText: "I reply within 48h.",
            legal_title: "LEGAL NOTICE",
            legal_publisherTitle: "Site publisher",
            legal_publisherIntro: "The site tarotlens.boutique is published by:",
            legal_publisherName: "Name / business name: to be completed",
            legal_publisherStatus: "Status: sole trader (auto-entrepreneur)",
            legal_publisherSiret: "Business ID (SIRET): to be completed",
            legal_publisherAddress: "Address: to be completed",
            legal_publisherDirector: "Publication director: to be completed",
            legal_contactPrefix: "Contact: ",
            legal_hostTitle: "Hosting",
            legal_hostText: "This site is hosted by Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, USA.",
            legal_ipTitle: "Intellectual property",
            legal_ipText: "All content on this site (text, visuals, card illustrations, logo) is the property of TarotLens, unless otherwise stated, and may not be reproduced without permission.",
            legal_privacyTitle: "Privacy",
            legal_privacyIntro: "We only collect the data necessary to process your orders.",
            legal_li1: "Data collected: identity, email, order history.",
            legal_li2: "Purpose: order processing and support.",
            legal_li3_prefix: "Your rights: access, correction, deletion — write to ",
            legal_cgvTitle: "Terms of sale",
            legal_cgvIntro: "Placing an order on tarotlens.boutique implies full acceptance of these terms of sale.",
            legal_cgvProductsTitle: "Products & pricing",
            legal_cgvProductsText: "TarotLens products (tarot, lenormand decks and accessories) are sold as pre-orders, while stocks last. Prices are shown in euros, VAT included.",
            legal_cgvPaymentTitle: "Payment",
            legal_cgvPaymentText: "Payment is made by bank transfer. Our bank details are sent by e-mail once the order is confirmed. The order is confirmed once payment is received.",
            legal_cgvShippingTitle: "Shipping",
            legal_cgvShippingText: "Orders are prepared and shipped within 24 to 72h after payment is received, mostly via Mondial Relay within France. International shipping is available.",
            legal_cgvWithdrawalTitle: "Right of withdrawal",
            legal_cgvWithdrawalText: "In accordance with French consumer law (article L221-18 of the Code de la consommation), you have 14 days from receipt of your order to exercise your right of withdrawal, without needing to justify a reason. To exercise it, contact us at ",
            legal_cgvWithdrawalText2: ". Return shipping costs are your responsibility, unless the error is ours.",
            legal_cgvDisputeTitle: "Complaints and disputes",
            legal_cgvDisputeText: "For any question or complaint, contact us at ",
            legal_cgvDisputeText2: ". Failing an amicable resolution, disputes fall under the jurisdiction of French courts.",
            cart_title: "MY CART",
            cart_emptyTitle: "Your cart is empty",
            cart_emptyText: "Discover our decks and accessories.",
            cart_emptyCta: "SEE THE DECKS",
            cart_remove: "Remove",
            cart_preorder: "Pre-order",
            cart_summaryTitle: "Summary",
            cart_subtotal: "Subtotal",
            cart_priceTBC: "Price to be confirmed",
            cart_totalItems: "Total items",
            cart_checkout: "CONFIRM ORDER",
            cart_clear: "Clear cart",
            cart_thanksTitle: "Thank you!",
            cart_thanksText: "Pre-order recorded. We'll be in touch with you soon.",
            cart_backHome: "BACK TO HOME",
            cart_orderTitle: "Your details",
            cart_orderName: "First & last name",
            cart_orderEmail: "E-mail",
            cart_orderPhone: "Phone",
            cart_orderAddress: "Delivery address",
            cart_orderCp: "Postal code",
            cart_orderPays: "Country",
            cart_orderSubmit: "SEND ORDER",
            cart_orderSending: "SENDING…",
            cart_orderError: "Something went wrong, please try again or contact us directly.",
            cart_orderErrorStock: "Sorry, these items just went out of stock: {items}. Remove them from your cart to continue.",
            cart_trustPaymentTitle: "Bank transfer payment",
            cart_trustPaymentText: "You'll receive our bank details by e-mail once your order is confirmed",
            cart_trustShipTitle: "Shipped within 24-72h",
            cart_trustShipText: "Once payment is received — Mondial Relay in France, international shipping available",
            cart_trustContactTitle: "Got a question?",
            cart_trustContactText: "Reach out, we reply fast",
            cart_orderNote: "After you submit this form, you'll receive our bank details by e-mail to pay by bank transfer.",
            stock_outOfStock: "OUT OF STOCK",
            stock_notifyPlaceholder: "Your email",
            stock_notifySubmit: "NOTIFY ME",
            stock_notifySending: "SENDING…",
            stock_notifyThanks: "Thanks, we'll let you know as soon as it's back in stock!",
            stock_notifyError: "Something went wrong, please try again later.",
            stock_lowBadge: "Only {n} left!",
            stock_available: "{n} available",
            lang_switchLabel: "Pardon my french!",
            lang_switchAria: "Revenir au français",
        },
    };

    function getLang() {
        return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'fr';
    }

    function setLang(lang) {
        localStorage.setItem(LANG_KEY, lang);
        location.reload();
    }

    function t(key) {
        const lang = getLang();
        return (DICT[lang] && DICT[lang][key]) || DICT.fr[key] || key;
    }

    function pick(obj, field) {
        const lang = getLang();
        if (lang === 'en' && obj[field + '_en']) return obj[field + '_en'];
        return obj[field];
    }

    function setTexteMultiligne(el, texte) {
        el.textContent = '';
        String(texte).split('\n').forEach((ligne, i) => {
            if (i > 0) el.appendChild(document.createElement('br'));
            el.appendChild(document.createTextNode(ligne));
        });
    }

    function applyStaticI18n() {
        document.documentElement.lang = getLang();

        document.querySelectorAll('[data-i18n]').forEach(el => {
            setTexteMultiligne(el, t(el.getAttribute('data-i18n')));
        });

        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (attr && key) el.setAttribute(attr, t(key));
            });
        });
    }

    function renderLangToggle() {
        document.querySelectorAll('.lang-toggle').forEach(btn => {
            const lang = getLang();
            const flag = lang === 'en' ? '🇫🇷' : '🇬🇧';
            btn.innerHTML = `<span class="lang-flag" aria-hidden="true">${flag}</span><span class="lang-text">${t('lang_switchLabel')}</span>`;
            btn.setAttribute('aria-label', t('lang_switchAria'));
            btn.onclick = () => setLang(lang === 'en' ? 'fr' : 'en');
        });
    }

    window.TarotLensI18n = { getLang, setLang, t, pick };

    applyStaticI18n();
    renderLangToggle();

    const ENDPOINT = '/api';
    const TEXTES_CACHE_KEY = 'tarotlens_textes_cache';
    const TEXTES_CACHE_TTL_MS = 5 * 60 * 1000;

    function lireCacheTextes() {
        try {
            const parsed = JSON.parse(localStorage.getItem(TEXTES_CACHE_KEY));
            if (!parsed || Date.now() - parsed.ts > TEXTES_CACHE_TTL_MS) return null;
            return parsed.textes;
        } catch { return null; }
    }
    function ecrireCacheTextes(textes) {
        try { localStorage.setItem(TEXTES_CACHE_KEY, JSON.stringify({ ts: Date.now(), textes })); } catch {   }
    }

    function fusionnerTextes(textes) {
        if (!textes) return;
        Object.keys(textes).forEach(cle => {
            const v = textes[cle] || {};
            if (v.fr) DICT.fr[cle] = v.fr;
            if (v.en) DICT.en[cle] = v.en;
        });
        applyStaticI18n();
        renderLangToggle();
    }

    async function chargerTextesLive() {
        const cached = lireCacheTextes();
        if (cached) fusionnerTextes(cached);
        try {
            const res = await fetch(ENDPOINT + '?action=textes');
            const json = await res.json();
            if (json.ok && json.textes) {
                fusionnerTextes(json.textes);
                ecrireCacheTextes(json.textes);
            }
        } catch {   }
    }
    chargerTextesLive();
})();
