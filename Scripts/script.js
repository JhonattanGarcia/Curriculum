document.documentElement.classList.add('js');
const contentContainer = document.getElementById('contenido');
const controls = document.querySelector('.page-controls');
const appBase = new URL(document.querySelector('base')?.href || './', location.href);
const routes = JSON.parse(document.getElementById('route-data').textContent);
const cache = new Map();
let currentIndex = -1;
let requestedIndex = -1;
let controller;
let navigationId = 0;
const routeURL = route => new URL(route.path || './', appBase);
function routeIndex() {
    const path = decodeURI(location.pathname).replace(/\/$/, '');
    return routes.findIndex(route => decodeURI(routeURL(route).pathname).replace(/\/$/, '') === path);
}
async function getContent(index, signal) {
    if (cache.has(index)) return cache.get(index);
    const url = routeURL(routes[index]);
    url.searchParams.set('fragment', '1');
    const response = await fetch(url, {signal, headers: {'Accept': 'text/html'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = (await response.text()).replace(/^\uFEFF/, '');
    if (response.headers.get('X-Portfolio-Fragment') !== '1') throw new Error('Apache/PHP fragment routing is not configured.');
    cache.set(index, html);
    return html;
}
function refreshMetadata() {
    if (currentIndex < 0) return;
    const route = routes[currentIndex];
    const language = document.documentElement.lang;
    document.title = `${route.label[language] || route.label.en} | Jhonattan Garcia`;
    document.querySelector('meta[name="description"]').content = route.description;
    const canonical = document.querySelector('link[rel="canonical"]');
    const canonicalBase = canonical ? new URL('.', canonical.href) : appBase;
    const url = new URL(route.path || './', canonicalBase).href;
    if (canonical) canonical.href = url;
    for (const [property, value] of Object.entries({'og:title': document.title, 'og:description': route.description, 'og:url': url})) {
        const meta = document.querySelector(`meta[property="${property}"]`);
        if (meta) meta.content = value;
    }
    const schema = document.getElementById('profile-schema');
    if (schema) {
        const data = JSON.parse(schema.textContent);
        data.name = document.title;
        data.url = url;
        schema.textContent = JSON.stringify(data);
    }
}
function updateNavigation() {
    document.querySelectorAll('.section-nav [data-route]').forEach(link => {
        if (link.dataset.route === routes[currentIndex].id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    controls.replaceChildren();
    for (const step of [-1, 1]) {
        const route = routes[(currentIndex + step + routes.length) % routes.length];
        if (!route) continue;
        const key = step < 0 ? 'previous' : 'next';
        const link = document.createElement('a');
        link.href = routeURL(route);
        link.dataset.route = route.id;
        link.rel = step < 0 ? 'prev' : 'next';
        const direction = document.createElement('span');
        direction.dataset.i18n = key;
        const label = document.createElement('span');
        label.dataset.i18n = `nav_${route.id}`;
        const accessibleLabel = document.createElement('span');
        accessibleLabel.className = 'sr-only';
        accessibleLabel.append(direction, ' · ', label);
        const arrow = document.createElement('span');
        arrow.className = 'nav-chevron';
        arrow.setAttribute('aria-hidden', 'true');
        link.append(arrow, accessibleLabel);
        controls.append(link);
    }
    setLanguage(document.documentElement.lang);
}
function prefetchAdjacent() {
    const connection = navigator.connection;
    if (connection?.saveData || /2g/.test(connection?.effectiveType || '')) return;
    for (const index of [(currentIndex - 1 + routes.length) % routes.length, (currentIndex + 1) % routes.length]) {
        if (routes[index] && !cache.has(index)) getContent(index).catch(() => {});
    }
}
async function navigate(index, {historyMode = 'push', animate = true, focus = true} = {}) {
    if (!routes[index]) return;
    if ((index === currentIndex && !controller) || (index === requestedIndex && controller)) return;
    requestedIndex = index;
    const id = ++navigationId;
    controller?.abort();
    PortfolioTransition.cancel();
    const request = new AbortController();
    controller = request;
    contentContainer.setAttribute('aria-busy', 'true');
    try {
        const html = await getContent(index, request.signal);
        if (id !== navigationId) return;
        if (animate && currentIndex >= 0) await PortfolioTransition.run(contentContainer, false, request.signal);
        if (id !== navigationId) return;
        PortfolioTransition.cancel();
        contentContainer.innerHTML = html;
        contentContainer.dataset.section = routes[index].id;
        currentIndex = index;
        if (historyMode === 'push' && location.pathname !== routeURL(routes[index]).pathname) history.pushState({section: routes[index].id}, '', routeURL(routes[index]));
        updateNavigation();
        if (focus) {
            showHeader();
            contentContainer.scrollIntoView({block: 'start', behavior: 'instant'});
            contentContainer.focus({preventScroll: true});
        }
        const status = document.getElementById('navigation-status');
        status.className = 'sr-only';
        status.textContent = routes[index].label[document.documentElement.lang] || routes[index].label.en;
        if (animate) await PortfolioTransition.run(contentContainer, true, request.signal);
        prefetchAdjacent();
    } catch (error) {
        if (request.signal.aborted || id !== navigationId) return;
        // Retain the last working section and offer a standard server-rendered link.
        const status = document.getElementById('navigation-status');
        status.classList.remove('sr-only');
        status.classList.add('content-status');
        const message = document.createElement('span');
        message.dataset.i18n = 'loadError';
        const retry = document.createElement('a');
        retry.href = routeURL(routes[index]);
        retry.dataset.i18n = 'retry';
        status.replaceChildren(message, ' ', retry);
        setLanguage(document.documentElement.lang);
        if (historyMode === 'none') location.replace(routeURL(routes[index]));
        console.error('Section loading failed:', error);
    } finally {
        if (id === navigationId) {
            PortfolioTransition.cancel();
            contentContainer.setAttribute('aria-busy', 'false');
            controller = null;
            requestedIndex = currentIndex;
        }
    }
}
if (Array.isArray(routes)) {
    document.addEventListener('click', event => {
        const link = event.target.closest('a[data-route]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
        const index = routes.findIndex(route => route.id === link.dataset.route);
        if (index < 0) return;
        event.preventDefault();
        navigate(index);
    });
    window.addEventListener('popstate', () => {
        const index = routeIndex();
        if (index >= 0) navigate(index, {historyMode: 'none'});
        else location.reload();
    });
    document.addEventListener('languagechange', refreshMetadata);
    const initialIndex = routes.findIndex(route => route.id === contentContainer.dataset.section);
    if (initialIndex >= 0) {
        currentIndex = requestedIndex = initialIndex;
        cache.set(initialIndex, contentContainer.innerHTML);
        updateNavigation();
        history.replaceState({section: routes[initialIndex].id}, '', location.href);
        prefetchAdjacent();
    }
    // Passive gestures never cancel native scrolling or browser edge navigation.
    let touch;
    contentContainer.addEventListener('touchstart', event => {
        touch = null;
        if (event.touches.length !== 1 || event.target.closest('a,button,input,textarea,select,[contenteditable],canvas,[data-no-swipe]') || window.getSelection()?.toString()) return;
        const point = event.touches[0];
        if (point.clientX < 30 || point.clientX > innerWidth - 30) return;
        // Preserve native gestures in horizontally scrollable components.
        for (let node = event.target; node && node !== contentContainer; node = node.parentElement) {
            if (node.scrollWidth > node.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return;
        }
        touch = {x: point.clientX, y: point.clientY, time: performance.now()};
    }, {passive: true});
    contentContainer.addEventListener('touchmove', event => {
        if (!touch) return;
        if (event.touches.length !== 1 || Math.abs(event.touches[0].clientY - touch.y) > 24) touch = null;
    }, {passive: true});
    contentContainer.addEventListener('touchcancel', () => touch = null, {passive: true});
    contentContainer.addEventListener('touchend', event => {
        if (!touch) return;
        const start = touch;
        touch = null;
        const point = event.changedTouches[0];
        const dx = point.clientX - start.x;
        const dy = point.clientY - start.y;
        if (performance.now() - start.time > 700 || Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 2) return;
        const origin = requestedIndex >= 0 ? requestedIndex : currentIndex;
        navigate((origin + (dx < 0 ? 1 : -1) + routes.length) % routes.length);
    }, {passive: true});
}
