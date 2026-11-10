const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname,'../Resources/experience.json'),'utf8'));
const context = {window: {}, document: {getElementById: () => ({textContent: JSON.stringify(config)})}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../Scripts/experiencia_laboral.js'), 'utf8'), context);
const {selectData, calculateMonths, formatDuration, currentMonth} = context.window.ExperienceModule;
const november2026 = new Date('2026-11-09T12:00:00Z');
const november2027 = new Date('2027-11-09T12:00:00Z');
test('active experience grows automatically in subsequent years', () => {
    const appgate = config.companies.find(company => company.id === 'appgate');
    assert.equal(calculateMonths(appgate, november2026),83);
    assert.equal(calculateMonths(appgate, november2027),95);
    assert.equal(formatDuration(83),'6 years 11 months');
    assert.equal(formatDuration(95,'es'),'7 años 11 meses');
    assert.equal(selectData('cyber','all',november2027).totalMonths - selectData('cyber','all',november2026).totalMonths,12);
});
test('finished employment stays fixed and future employment never becomes negative', () => {
    const tp = config.companies.find(company => company.id === 'teleperformance');
    const bps = config.companies.find(company => company.id === 'americas');
    assert.equal(calculateMonths(tp,november2026),34);
    assert.equal(calculateMonths(tp,november2027),34);
    assert.equal(calculateMonths(bps,november2027),3);
    assert.equal(calculateMonths(tp,new Date('2015-01-01T12:00:00Z')),0);
});
test('filters preserve the different tool membership and total exact calendar months', () => {
    assert.equal(selectData('cyber','fraud',november2026).totalMonths,117);
    assert.equal(selectData('tools','fraud',november2026).totalMonths,34);
    assert.equal(selectData('cyber','ioc',november2026).totalMonths,117);
    assert.equal(selectData('tools','ioc',november2026).totalMonths,0);
    for (const group of ['cyber','tools']) {
        assert.equal(selectData(group,'all',november2026).totalMonths,117);
        assert.equal(selectData(group,'siem',november2026).totalMonths,83);
        assert.equal(selectData(group,'risk',november2026).totalMonths,34);
        assert.equal(formatDuration(selectData(group,'all',november2026).totalMonths),'9 years 9 months');
    }
});
test('calendar rollovers follow Bogota timezone and real start-month anniversaries', () => {
    assert.equal(currentMonth(new Date('2027-01-01T02:00:00Z')),'2026-12');
    assert.equal(currentMonth(new Date('2027-01-01T06:00:00Z')),'2027-01');
    const appgate=config.companies.find(company => company.id === 'appgate');
    assert.equal(calculateMonths(appgate,new Date('2026-12-01T02:00:00Z')),83);
    assert.equal(calculateMonths(appgate,new Date('2026-12-01T06:00:00Z')),84);
});
test('empty results and singular durations format correctly in both languages', () => {
    assert.equal(selectData('tools','nonexistent',november2026).totalMonths,0);
    assert.equal(selectData('nonexistent').rows.length,0);
    assert.equal(formatDuration(0),'0 months');
    assert.equal(formatDuration(1,'es'),'1 mes');
    assert.equal(formatDuration(12),'1 year');
    assert.equal(formatDuration(13,'es'),'1 año 1 mes');
});
