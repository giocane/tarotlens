// ARCANA — pages de contenu : menu mobile + header au scroll
const burger = document.getElementById('navBurger');
const links = document.getElementById('navLinks');
if (burger) {
    burger.addEventListener('click', () => {
        const o = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', o);
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false');
    }));
}
const nav = document.getElementById('nav');
addEventListener('scroll', () => {
    nav.style.boxShadow = scrollY > 8 ? '0 6px 22px rgba(26,22,20,.10)' : 'none';
}, { passive: true });
