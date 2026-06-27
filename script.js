// ARCANA — interactions + animations au scroll

// --- Menu mobile ---
const burger = document.getElementById('navBurger');
const links = document.getElementById('navLinks');
burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
});
links.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
        links.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
    })
);

// --- Carrousel galerie ---
const track = document.getElementById('galleryTrack');
const step = 316; // largeur carte + gap
document.getElementById('galNext').addEventListener('click', () =>
    track.scrollBy({ left: step, behavior: 'smooth' })
);
document.getElementById('galPrev').addEventListener('click', () =>
    track.scrollBy({ left: -step, behavior: 'smooth' })
);

// --- Ombre du header au scroll ---
const nav = document.getElementById('nav');
const onNavScroll = () => {
    nav.style.boxShadow = window.scrollY > 8 ? '0 6px 22px rgba(26,22,20,.10)' : 'none';
};
window.addEventListener('scroll', onNavScroll, { passive: true });
onNavScroll();

/* ============================================================
   ANIMATIONS AU SCROLL
   ============================================================ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion) {

    /* --- 1. Barre de progression de lecture --- */
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    const updateBar = () => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        bar.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    };
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();

    /* --- 2. Révélation en cascade (IntersectionObserver) ---
       Baseline fiable sur tous les navigateurs. On cible des groupes
       d'éléments et on applique un délai progressif (stagger). */
    const groups = [
        { sel: '.hero .tile-hero', stagger: 120 },
        { sel: '.promo .promo-grid .tile-promo', stagger: 90 },
        { sel: '.custom .step', stagger: 110 },
        { sel: '.gallery .g-item', stagger: 70 },
        { sel: '.footer-col', stagger: 80 },
    ];

    groups.forEach(({ sel, stagger }) => {
        document.querySelectorAll(sel).forEach((el, i) => {
            el.classList.add('reveal');
            el.style.setProperty('--reveal-delay', `${i * stagger}ms`);
        });
    });
    // le bloc "Personnaliser" arrive depuis la gauche
    document.querySelector('.custom-inner')?.classList.add('reveal', 'from-left');

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target); // on n'anime qu'une fois
            }
        });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    /* --- 3. Parallaxe (cartes du héros + étoile), throttlé en rAF --- */
    const sunburst = document.querySelector('.tile-hero .sunburst');
    const cards = [...document.querySelectorAll('.art-cards .card')];
    let ticking = false;

    const parallax = () => {
        const y = window.scrollY;
        // étoile : utilisée seulement si le navigateur ne gère pas animation-timeline
        if (sunburst && !CSS.supports('animation-timeline: view()')) {
            sunburst.style.transform = `rotate(${y * 0.08}deg)`;
        }
        cards.forEach((card, i) => {
            const depth = (i + 1) * 0.04;            // profondeur différente par carte
            const baseRot = (i - 1) * 12;            // -12°, 0°, +12° au repos
            card.style.transform =
                `translateY(${-y * depth}px) rotate(${baseRot + y * 0.012}deg)`;
        });
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(parallax); ticking = true; }
    }, { passive: true });
    parallax();
}
