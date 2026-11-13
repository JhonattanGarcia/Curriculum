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
    let legacyRequests = 0;
    const useLocalDocument = process.env.QA_USE_LOCAL_DOCUMENT === '1';
    const localHTML = useLocalDocument ? (await (await fetch('http://localhost/SitioWeb%202025/experiencia')).text()).replace(/<base href="[^"]*">/, '<base href="/">') : '';
    const legacyScript = '// Legacy router cached before deployment\ndocument.querySelector(".next-button").addEventListener("click", () => {});';
    ws.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.id) {
            const job = pending.get(message.id); pending.delete(message.id);
            if (message.error) job.reject(message.error); else job.resolve(message.result);
        } else if (message.method === 'Fetch.requestPaused') {
            const {requestId, request, resourceType} = message.params;
            const url = new URL(request.url);
            let body;
            if (useLocalDocument && resourceType === 'Document' && url.pathname.endsWith('/experiencia')) body = localHTML;
            else if (useLocalDocument && url.pathname.endsWith('/Scripts/experiencia_laboral.js')) body = fs.readFileSync(path.join(__dirname,'../Scripts/experiencia_laboral.js'),'utf8');
            else if (url.pathname.endsWith('/Scripts/script.js') && !url.searchParams.has('v')) { body = legacyScript; legacyRequests++; }
            if (body !== undefined) send('Fetch.fulfillRequest', {requestId, responseCode:200, responseHeaders:[{name:'Content-Type',value:resourceType === 'Document' ? 'text/html; charset=utf-8' : 'application/javascript; charset=utf-8'}], body:Buffer.from(body).toString('base64')}).catch(error => errors.push(String(error)));
            else send('Fetch.continueRequest', {requestId}).catch(error => errors.push(String(error)));
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
    const patterns = [{urlPattern:'*Scripts/script.js*'}];
    if (useLocalDocument) patterns.push({urlPattern:'*experiencia*',resourceType:'Document'},{urlPattern:'*Scripts/experiencia_laboral.js*'});
    await send('Fetch.enable',{patterns});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:new URL('experiencia',siteURL).href});
    await wait("window.Chart && Object.keys(Chart.instances).length === 4 && document.querySelectorAll('.charts-ready').length === 2");
    assert.equal(legacyRequests,0);
    assert.equal(await evaluate("[...document.scripts].filter(script=>script.src.includes('/Scripts/')).every(script=>new URL(script.src).searchParams.has('v'))"),true);
    await evaluate("document.getElementById('language').value='en';document.getElementById('language').dispatchEvent(new Event('change'));document.querySelector('[data-chart-block=cyber] [data-filter=risk]').click()");
    assert.equal(await evaluate("document.querySelector('[data-chart-block=cyber] [data-total]').textContent"),'2 years 10 months');
    assert.deepEqual(errors,[]);
    // Confirm the simulated stale cache is active, but never used during boot.
    const stale = await evaluate("fetch(new URL('Scripts/script.js',document.baseURI)).then(response=>response.text())");
    assert.ok(stale.includes('Legacy router'));
    assert.equal(legacyRequests,1);
    const screenshot = await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(output+'/versioned-assets.png',Buffer.from(screenshot.data,'base64'));
    console.log('PASS: stale unversioned router is bypassed; all scripts including Chart.js are versioned; four charts initialize and filters work.');
    if(useLocalDocument) console.log('Production-asset check used the patched local HTML/module inside this browser only; no hosting files were changed.');
    console.log('Screenshot: '+output+'/versioned-assets.png');
    await send('Browser.close');ws.close();
})().catch(error=>{console.error(error);browserSocket?.close();process.exitCode=1;});
