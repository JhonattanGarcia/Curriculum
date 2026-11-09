// A bounded dust layer follows text rectangles; no DOM snapshots or image library.
window.PortfolioTransition = (() => {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let activeAnimations = [];
    let canvas;
    let frame;
    function cancel() {
        activeAnimations.forEach(animation => animation.cancel());
        activeAnimations = [];
        cancelAnimationFrame(frame);
        canvas?.remove();
        canvas = null;
    }
    function duration(name) {
        return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
    }
    function particles(container, milliseconds) {
        const points = [];
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode()) && points.length < 90) {
            if (!node.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
                if (rect.bottom < 0 || rect.top > innerHeight) continue;
                for (let i = 0; i < 5 && points.length < 90; i++) points.push({
                    x: rect.x + Math.random() * rect.width,
                    y: rect.y + Math.random() * rect.height,
                    vx: 15 + Math.random() * 45, vy: -10 - Math.random() * 30,
                    size: 0.6 + Math.random() * 1.4
                });
            }
        }
        canvas = document.createElement('canvas');
        canvas.className = 'dust-layer';
        canvas.setAttribute('aria-hidden', 'true');
        // Limit resolution and particle count on high-density mobile screens.
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        const context = canvas.getContext('2d');
        if (!context) { canvas.remove(); return; }
        document.body.append(canvas);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const start = performance.now();
        function draw(now) {
            const progress = Math.min(1, (now - start) / milliseconds);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = color;
            context.globalAlpha = (1 - progress) * 0.65;
            points.forEach(point => context.fillRect(point.x + progress * point.vx, point.y + progress * point.vy, point.size, point.size));
            if (progress < 1) frame = requestAnimationFrame(draw);
            else { canvas?.remove(); canvas = null; }
        }
        frame = requestAnimationFrame(draw);
    }
    async function run(container, entering, signal) {
        if (reduceMotion.matches || !container.animate || signal.aborted) return;
        const time = duration(entering ? '--duration-reveal' : '--duration-dissolve');
        if (!time) return;
        if (!entering) particles(container, time);
        const elements = container.querySelectorAll('h1,h2,h3,p,.contact-link');
        activeAnimations = [...elements].slice(0, 35).map(element => element.animate(entering
            ? [{opacity: 0, transform: 'translateY(5px)', filter: 'blur(3px)'}, {opacity: 1, transform: 'translateY(0)', filter: 'blur(0)'}]
            : [{opacity: 1, filter: 'blur(0)'}, {opacity: 0, filter: 'blur(4px)', transform: 'translateY(-4px)'}],
        {duration: time, easing: 'ease-out', fill: 'forwards'}));
        signal.addEventListener('abort', cancel, {once: true});
        await Promise.all(activeAnimations.map(animation => animation.finished.catch(() => {})));
        signal.removeEventListener('abort', cancel);
    }
    reduceMotion.addEventListener('change', cancel);
    return {run, cancel};
})();
