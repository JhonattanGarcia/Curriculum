const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const routes = JSON.parse(fs.readFileSync(path.join(__dirname, '../routes.json')));
const source = fs.readFileSync(path.join(__dirname, '../Scripts/script.js'), 'utf8');
class Element {
    constructor() { this.dataset = {}; this.children = []; this.attributes = {}; this.innerHTML = ''; this.classList = {add() {}, remove() {}}; this.listeners = {}; }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
    addEventListener(key, listener) { this.listeners[key] = listener; }
    scrollIntoView() {}
    focus() {}
}
function setup(fetchContent, experienceModule) {
    const content = new Element();
    content.dataset.section = 'summary';
    content.innerHTML = 'summary';
    const controls = new Element();
    const status = new Element();
    const nav = routes.map(route => { const el = new Element(); el.dataset.route = route.id; return el; });
    const document = {
        documentElement: {lang: 'en', classList: {add() {}}}, listeners: {},
        getElementById: id => ({contenido: content, 'navigation-status': status, 'route-data': {textContent: JSON.stringify(routes)}})[id],
        querySelector: selector => selector === 'base' ? {href: 'http://localhost/portfolio/'} : selector === '.page-controls' ? controls : selector === 'meta[name="description"]' ? {} : null,
        querySelectorAll: () => nav,
        createElement: () => new Element(),
        addEventListener(key, listener) { this.listeners[key] = listener; }
    };
    const location = {href: 'http://localhost/portfolio/', pathname: '/portfolio/'};
    const pushes = [];
    const context = {
        document, location, URL, AbortController, performance, innerWidth: 400,
        navigator: {connection: {saveData: true}},
        history: {replaceState() {}, pushState(state, _, url) {pushes.push(state.section); location.pathname = url.pathname;}},
        window: {ExperienceModule: experienceModule, listeners: {}, getSelection: () => ({toString: () => ''}), addEventListener(key, listener) {this.listeners[key] = listener;}},
        PortfolioTransition: {cancel() {}, async run() {}}, showHeader() {}, setLanguage() {},
        fetch: fetchContent || (async url => ({ok: true, headers: {get: () => '1'}, text: async () => url.pathname})),
        console: {error() {}}, getComputedStyle: () => ({overflowX: 'visible'})
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return {context, content, controls, status, pushes, nav};
}
test('five sections use the required order; both side controls wrap across the first and last sections', async () => {
    assert.deepEqual(routes.map(route => route.id), ['summary','education','experience','about','contact']);
    const {context, controls, pushes, nav} = setup();
    assert.equal(controls.children.length, 2);
    assert.equal(controls.children[0].dataset.route, 'contact');
    assert.equal(controls.children[1].dataset.route, 'education');
    await context.navigate(-1);
    assert.equal(pushes.length, 0);
    await context.navigate(4);
    assert.equal(controls.children.length, 2);
    assert.equal(controls.children[0].dataset.route, 'about');
    assert.equal(controls.children[1].dataset.route, 'summary');
    assert.equal(controls.children[1].rel, 'next');
    assert.equal(nav[4].attributes['aria-current'], 'page');
    await context.navigate(5);
    assert.deepEqual(pushes, ['contact']);
});
test('popstate navigation never appends history and cached sections are reused', async () => {
    let requests = 0;
    const {context, pushes} = setup(async () => { requests++; return {ok: true, headers: {get: () => '1'}, text: async () => 'education'}; });
    await context.navigate(1);
    await context.navigate(0, {historyMode: 'none'});
    await context.navigate(1, {historyMode: 'none'});
    assert.equal(requests, 1);
    assert.deepEqual(pushes, ['education']);
});
test('rapid selection aborts stale work; only the latest destination is committed', async () => {
    let started;
    const begun = new Promise(resolve => started = resolve);
    const {context, pushes, content} = setup((url, {signal}) => {
        if (url.pathname.endsWith('/formacion')) return new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')));
            started();
        });
        return Promise.resolve({ok: true, headers: {get: () => '1'}, text: async () => 'experience'});
    });
    const first = context.navigate(1);
    await begun;
    await context.navigate(2);
    await first;
    assert.deepEqual(pushes, ['experience']);
    assert.equal(content.innerHTML, 'experience');
    assert.equal(content.attributes['aria-busy'], 'false');
});
test('failed navigation retains the last content and offers a real fallback link', async () => {
    const {context, content, status, pushes} = setup(async () => ({ok: false, status: 503}));
    await context.navigate(1);
    assert.equal(content.innerHTML, 'summary');
    assert.equal(pushes.length, 0);
    assert.equal(status.children[2].href.href, 'http://localhost/portfolio/formacion');
    assert.equal(content.attributes['aria-busy'], 'false');
});
test('touch gestures preserve edges and vertical scrolling; horizontal swipe advances', async () => {
    const {content, pushes} = setup();
    const target = {closest: () => null, scrollWidth: 0, clientWidth: 0, parentElement: content};
    const start = (x,y) => content.listeners.touchstart({target, touches:[{clientX:x,clientY:y}]});
    const end = (x,y) => content.listeners.touchend({changedTouches:[{clientX:x,clientY:y}]});
    start(10,100); end(200,100);
    start(200,100); content.listeners.touchmove({touches:[{clientX:190,clientY:140}]}); end(80,140);
    await new Promise(setImmediate);
    assert.equal(pushes.length, 0);
    start(250,100); end(120,105);
    await new Promise(setImmediate);
    assert.deepEqual(pushes, ['education']);
});

test('swipe left from Contact returns to Summary; swipe right from Summary returns to Contact', async () => {
    const {context, content, pushes} = setup();
    await context.navigate(4);
    const target = {closest: () => null, scrollWidth: 0, clientWidth: 0, parentElement: content};
    content.listeners.touchstart({target, touches:[{clientX:250,clientY:100}]});
    content.listeners.touchend({changedTouches:[{clientX:120,clientY:105}]});
    await new Promise(setImmediate);
    assert.deepEqual(pushes, ['contact', 'summary']);
    content.listeners.touchstart({target, touches:[{clientX:100,clientY:100}]});
    content.listeners.touchend({changedTouches:[{clientX:230,clientY:105}]});
    await new Promise(setImmediate);
    assert.deepEqual(pushes, ['contact', 'summary', 'contact']);
});

test('section components mount after rendering and dispose before the next section', async () => {
    const mounted = []; const disposed = [];
    const module = {initialize(root) {const section = root.dataset.section; mounted.push(section); return () => disposed.push(section);}};
    const {context} = setup(undefined, module);
    await context.navigate(2); await context.navigate(4); await context.navigate(2);
    assert.deepEqual(mounted, ['summary','experience','contact','experience']);
    assert.deepEqual(disposed, ['summary','experience','contact']);
});
