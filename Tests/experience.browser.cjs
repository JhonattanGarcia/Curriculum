const fs = require('fs');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'curriculum-experience-'));
const cdpURL = process.env.QA_CDP_URL || 'http://127.0.0.1:9239';
const siteURL = process.env.QA_SITE_URL || 'http://localhost/SitioWeb%202025/';
let browserSocket;
(async () => {
    let targets;
    for (let attempt = 0; attempt < 30; attempt++) {
        try { targets = await (await fetch(cdpURL + '/json')).json(); break; }
        catch (error) { if (attempt === 29) throw error; await new Promise(resolve => setTimeout(resolve, 200)); }
    }
    const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    browserSocket = ws;
    await new Promise((resolve,reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let serial = 0;
    const pending = new Map();
    const errors = [];
    ws.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.id) {
            const job = pending.get(message.id); pending.delete(message.id);
            if (message.error) job.reject(message.error); else job.resolve(message.result);
        } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + message.params.exceptionDetails.exception?.description);
    };
    const send = (method, params={}) => new Promise((resolve,reject) => {
        const id = ++serial; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params}));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    };
    const wait = async expression => {
        const deadline = Date.now()+15000;
        while (Date.now()<deadline) {
            if (await evaluate(expression)) return;
            await new Promise(resolve => setTimeout(resolve,150));
        }
        throw new Error('Timed out: '+expression+'; exceptions: '+errors.join('; '));
    };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate',{url:'about:blank'});
    await wait("location.href === 'about:blank'");
    errors.length = 0;
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:new URL('experiencia', siteURL).href});
    await wait("window.Chart && Object.keys(Chart.instances).length === 4 && document.querySelectorAll('.charts-ready').length === 2");
    await evaluate("document.getElementById('language').value='en'; document.getElementById('language').dispatchEvent(new Event('change'))");
    assert.equal(await evaluate("document.querySelectorAll('.achievements-table tbody tr').length"),18);
    const originalTotals = await evaluate("[...document.querySelectorAll('[data-total]')].map(el=>el.textContent)");
    const serverTotals = await evaluate("fetch(location.href).then(r=>r.text()).then(html=>[...html.matchAll(/<strong data-total>(.*?)<\\/strong>/g)].map(match=>match[1]))");
    assert.deepEqual(originalTotals,serverTotals);
    assert.equal(await evaluate("document.querySelector('[data-chart-block=cyber] [data-total-label]').textContent"),'Experience across listed roles');
    await evaluate("document.querySelector('[data-chart-block=cyber] [data-filter=risk]').click()");
    assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-total]')].map(el=>el.textContent)"),['2 years 10 months', originalTotals[1]]);
    await evaluate("document.querySelector('[data-chart-block=tools] [data-filter=fraud]').click()");
    assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-total]')].map(el=>el.textContent)"),['2 years 10 months','2 years 10 months']);
    await evaluate("document.getElementById('language').value='es'; document.getElementById('language').dispatchEvent(new Event('change'))");
    assert.equal(await evaluate("document.querySelector('[data-chart-block=cyber] h2').textContent"),'Experiencia profesional');
    assert.equal(await evaluate("Object.values(Chart.instances)[0].data.datasets[0].label"),'Años de experiencia');
    await evaluate("document.querySelector('.section-nav [data-route=contact]').click()");
    await wait("document.getElementById('contenido').dataset.section === 'contact' && document.getElementById('contenido').getAttribute('aria-busy') === 'false'");
    assert.equal(await evaluate('Object.keys(Chart.instances).length'),0);
    await evaluate("document.querySelector('.section-nav [data-route=experience]').click()");
    await wait("document.getElementById('contenido').dataset.section === 'experience' && document.getElementById('contenido').getAttribute('aria-busy') === 'false' && Object.keys(Chart.instances).length === 4");
    assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-total]')].map(el=>el.textContent)"), await evaluate("['cyber','tools'].map(group=>ExperienceModule.formatDuration(ExperienceModule.selectData(group).totalMonths,'es'))"));
    await evaluate("document.getElementById('language').value='en'; document.getElementById('language').dispatchEvent(new Event('change'))");
    await evaluate('document.fonts.ready');
    await new Promise(resolve=>setTimeout(resolve,400));
    assert.equal(await evaluate("document.querySelectorAll('.role-highlight-links a').length"), 2);
    const desktop = await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(output+'/experience-desktop.png',Buffer.from(desktop.data,'base64'));
    await evaluate("document.querySelector('.role-highlights').scrollIntoView({block:'start'}); showHeader()");
    const publication = await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(output+'/experience-publication.png',Buffer.from(publication.data,'base64'));
    for (const width of [390,320]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
        await evaluate('window.scrollTo(0,0)');
        await new Promise(resolve=>setTimeout(resolve,500));
        const metrics = await evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,charts:[...document.querySelectorAll('.experience-canvas')].map(el=>({width:el.clientWidth,height:el.clientHeight}))})");
        assert.ok(metrics.scroll<=width,JSON.stringify(metrics));
        assert.ok(metrics.charts.every(c=>c.width>0 && c.width<width && c.height>0));
        if(width===390){const mobile=await send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(output+'/experience-mobile.png',Buffer.from(mobile.data,'base64'));}
    }
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await evaluate("document.querySelector('[data-chart-block=cyber] [data-filter=siem]').click()");
    assert.equal(await evaluate('Object.values(Chart.instances)[0].options.animation'),false);
    assert.deepEqual(errors,[]);
    await send('Network.enable');
    await send('Network.setBlockedURLs', {urls:['*chart.umd.min.js*']});
    await send('Page.reload',{ignoreCache:true});
    await wait("document.querySelector('[data-chart-status]')?.dataset.i18n === 'exp_chart_error'");
    assert.equal(await evaluate("document.querySelectorAll('.achievements-table tbody tr').length"), 18);
    assert.equal(await evaluate("document.querySelectorAll('[data-chart-rows] tr').length"), 4);
    assert.equal(await evaluate("document.querySelectorAll('.charts-ready').length"), 0);
    console.log('PASS: four live charts; independent filters; 18 achievements; Spanish labels; cleanup/re-entry; 390px/320px without overflow; reduced motion; no browser exceptions; data/achievements survive a blocked Chart.js load.');
    console.log('Screenshots: '+output);
    await send('Browser.close');
    ws.close();
})().catch(error=>{console.error(error);browserSocket?.close();process.exitCode=1;});
