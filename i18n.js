// TAROTLENS — i18n (FR / EN)
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
            btn_addToCart: "AJOUTER AU PANIER",
            btn_learnMore: "EN SAVOIR +",
            modal_closeAria: "Fermer",
            modal_descTodo: "Description à venir.",
            modal_prevAria: "Photo précédente",
            modal_nextAria: "Photo suivante",
            modal_photoAria: "Photo {n}",
            unit_cards: "cartes",
            p5_name: "BOUGIE MARTINI",
            p6_name: "BOUGIE MATCHA LATTE",
            p7_name: "BOUGIE UBE LATTE",
            p8_name: "BOUGIE TOMATE",
            p9_name: "BOUGIE ORANGE",
            p10_name: "BOUGIE CITRON",
            p11_name: "BOUGIE FRAISE",
            toast_added: '« {name} » ajouté au panier',
            footer_contactLine: "Me contacter si vous avez des questions",
            footer_legalLink: "Mentions légales",
            contact_nameLabel: "Prénom & Nom",
            contact_subjectLabel: "Sujet",
            contact_opt1: "Question sur une commande",
            contact_opt2: "Pré-commande",
            contact_opt3: "Partenariat / presse",
            contact_opt4: "Autre",
            contact_send: "ENVOYER",
            contact_sentMsg: "✦ Message envoyé, merci !",
            contact_responseTitle: "Réponse",
            contact_responseText: "Je réponds sous 48 h.",
            legal_title: "MENTIONS LÉGALES",
            legal_publisherTitle: "Éditeur du site",
            legal_publisherText: "à compléter avec vos informations réelles.",
            legal_contactPrefix: "Contact : ",
            legal_privacyTitle: "Confidentialité",
            legal_privacyIntro: "Nous collectons uniquement les données nécessaires au traitement de vos commandes.",
            legal_li1: "Données collectées : identité, e-mail, historique de commande.",
            legal_li2: "Finalités : traitement des commandes et support.",
            legal_li3_prefix: "Vos droits : accès, rectification, effacement — écrivez à ",
            legal_cgvTitle: "Conditions de vente",
            legal_cgvText1: "Les produits TarotLens sont en pré-commande. Toute commande implique l'acceptation des présentes CGV.",
            legal_cgvText2: "Les prix sont indiqués en euros TTC.",
            legal_cgvText3: "À compléter selon vos conditions réelles.",
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
            cart_orderSubmit: "ENVOYER LA COMMANDE",
            cart_orderSending: "ENVOI EN COURS…",
            cart_orderError: "Une erreur est survenue, merci de réessayer ou de nous contacter directement.",
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
            btn_addToCart: "ADD TO CART",
            btn_learnMore: "LEARN MORE",
            modal_closeAria: "Close",
            modal_descTodo: "Description coming soon.",
            modal_prevAria: "Previous photo",
            modal_nextAria: "Next photo",
            modal_photoAria: "Photo {n}",
            unit_cards: "cards",
            p5_name: "MARTINI CANDLE",
            p6_name: "MATCHA LATTE CANDLE",
            p7_name: "UBE LATTE CANDLE",
            p8_name: "TOMATO CANDLE",
            p9_name: "ORANGE CANDLE",
            p10_name: "LEMON CANDLE",
            p11_name: "STRAWBERRY CANDLE",
            toast_added: '"{name}" added to cart',
            footer_contactLine: "Get in touch if you have any questions",
            footer_legalLink: "Legal notice",
            contact_nameLabel: "First & last name",
            contact_subjectLabel: "Subject",
            contact_opt1: "Order question",
            contact_opt2: "Pre-order",
            contact_opt3: "Partnership / press",
            contact_opt4: "Other",
            contact_send: "SEND",
            contact_sentMsg: "✦ Message sent, thank you!",
            contact_responseTitle: "Response",
            contact_responseText: "I reply within 48h.",
            legal_title: "LEGAL NOTICE",
            legal_publisherTitle: "Site publisher",
            legal_publisherText: "to be completed with your real information.",
            legal_contactPrefix: "Contact: ",
            legal_privacyTitle: "Privacy",
            legal_privacyIntro: "We only collect the data necessary to process your orders.",
            legal_li1: "Data collected: identity, email, order history.",
            legal_li2: "Purpose: order processing and support.",
            legal_li3_prefix: "Your rights: access, correction, deletion — write to ",
            legal_cgvTitle: "Terms of sale",
            legal_cgvText1: "TarotLens products are available for pre-order. Any order implies acceptance of these terms of sale.",
            legal_cgvText2: "Prices are shown in euros, VAT included.",
            legal_cgvText3: "To be completed according to your actual terms.",
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
            cart_orderSubmit: "SEND ORDER",
            cart_orderSending: "SENDING…",
            cart_orderError: "Something went wrong, please try again or contact us directly.",
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

    function applyStaticI18n() {
        document.documentElement.lang = getLang();

        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
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
})();
