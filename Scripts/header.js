const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const headerTools = document.querySelector('.header-tools');
const mobileNavigation = matchMedia('(max-width: 48rem)');
function setMenu(open) {
    header.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
}
function showHeader() {
    header.classList.remove('is-hidden');
    header.inert = false;
}
const updateNavigationHeight = () => {
    document.documentElement.style.setProperty('--navigation-height', `${header.offsetHeight}px`);
};
updateNavigationHeight();
new ResizeObserver(updateNavigationHeight).observe(header);
menuToggle.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
headerTools.addEventListener('click', event => {
    if (event.target.closest('a')) {
        if (mobileNavigation.matches) menuToggle.focus({ preventScroll: true });
        setMenu(false);
    }
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
        setMenu(false);
        menuToggle.focus();
    }
    if (event.key === 'Tab') showHeader();
});
document.addEventListener('click', event => {
    if (!header.contains(event.target)) setMenu(false);
});
header.addEventListener('focusin', showHeader);
mobileNavigation.addEventListener('change', () => {
    setMenu(false);
    showHeader();
    updateNavigationHeight();
});
let previousScroll = Math.max(0, window.scrollY);
window.addEventListener('scroll', () => {
    const currentScroll = Math.max(0, window.scrollY);
    if (!mobileNavigation.matches) {
        previousScroll = currentScroll;
        return;
    }
    if (currentScroll <= header.offsetHeight) {
        showHeader();
    } else if (Math.abs(currentScroll - previousScroll) < 6) {
        return;
    } else if (currentScroll > previousScroll) {
        setMenu(false);
        header.classList.add('is-hidden');
        header.inert = true;
    } else {
        showHeader();
    }
    previousScroll = currentScroll;
}, { passive: true });
