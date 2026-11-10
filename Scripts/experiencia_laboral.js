// Dates are shared with PHP; active employment grows automatically in calendar months.
window.ExperienceModule = (() => {
    const config = JSON.parse(document.getElementById('experience-data').textContent);
    function currentMonth(date = new Date()) {
        const parts = new Intl.DateTimeFormat('en-US', {timeZone: config.timeZone, year: 'numeric', month: '2-digit'}).formatToParts(date);
        return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
    }
    function calculateMonths(company, date = new Date()) {
        const now = currentMonth(date);
        const end = company.end && company.end < now ? company.end : now;
        const [startYear, startMonth] = company.start.split('-').map(Number);
        const [endYear, endMonth] = end.split('-').map(Number);
        return Math.max(0, (endYear - startYear) * 12 + endMonth - startMonth);
    }
    function formatDuration(months, language = 'en') {
        const years = Math.floor(months / 12);
        const remaining = months % 12;
        const spanish = language === 'es';
        const parts = [];
        if (years) parts.push(`${years} ${spanish ? (years === 1 ? 'año' : 'años') : (years === 1 ? 'year' : 'years')}`);
        if (remaining || !years) parts.push(`${remaining} ${spanish ? (remaining === 1 ? 'mes' : 'meses') : (remaining === 1 ? 'month' : 'months')}`);
        return parts.join(' ');
    }
    function formatRange(company, language = 'en') {
        const formatter = new Intl.DateTimeFormat(language, {month: 'short', year: 'numeric', timeZone: 'UTC'});
        const month = value => { const [year, month] = value.split('-').map(Number); return formatter.format(new Date(Date.UTC(year, month - 1, 1))); };
        return `${month(company.start)} – ${company.end ? month(company.end) : (language === 'es' ? 'Actualidad' : 'Present')}`;
    }
    function selectData(group, filter = 'all', date = new Date()) {
        const rows = config.companies.filter(company => company.tools[group] && (filter === 'all' || company.tools[group].includes(filter))).map(company => {
            const months = calculateMonths(company, date);
            return {...company, months, years: months / 12};
        });
        const totalMonths = rows.reduce((sum, row) => sum + row.months, 0);
        return {rows, totalMonths, total: totalMonths / 12};
    }
    let library;
    function loadLibrary() {
        if (window.Chart) return Promise.resolve(window.Chart);
        if (!library) library = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL('Scripts/vendor/chart.umd.min.js', document.baseURI).href;
            script.async = true;
            script.onload = () => {
                if (window.Chart) resolve(window.Chart);
                else { library = null; script.remove(); reject(new Error('Chart.js did not initialize')); }
            };
            script.onerror = () => { library = null; script.remove(); reject(new Error('Chart.js could not be loaded')); };
            document.head.append(script);
        });
        return library;
    }
    function initialize(root) {
        const blocks = [...root.querySelectorAll('[data-chart-block]')];
        if (!blocks.length) return () => {};
        const events = new AbortController();
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
        const charts = [];
        const filters = new Map(blocks.map(block => [block.dataset.chartBlock, 'all']));
        const status = root.querySelector('[data-chart-status]');
        let disposed = false;
        let ChartClass;
        function translate(key) {
            return translations[key]?.[document.documentElement.lang] || translations[key]?.en || key;
        }
        function palette() {
            const style = getComputedStyle(document.documentElement);
            const value = key => style.getPropertyValue(key).trim();
            return {
                bar: value('--chart-bar'), companies: [value('--chart-teleperformance'), value('--chart-appgate')],
                text: value('--text-primary'), muted: value('--text-secondary'), border: value('--border-light'),
                paper: value('--surface-light'), tooltip: value('--ink'), inverse: value('--text-on-dark'),
                font: value('--font-body'),
                duration: parseFloat(value('--duration-chart')) || 0
            };
        }
        function refreshBlock(block, index) {
            const key = block.dataset.chartBlock;
            const filter = filters.get(key);
            const {rows, totalMonths} = selectData(key, filter);
            const language = document.documentElement.lang;
            const total = formatDuration(totalMonths, language);
            const colors = palette();
            const labels = rows.map(row => row.company);
            const values = rows.map(row => row.years);
            block.querySelector('[data-total]').textContent = String(total);
            const table = block.querySelector('[data-chart-rows]');
            table.replaceChildren(...rows.map(row => {
                const tr = document.createElement('tr');
                const company = document.createElement('th');
                company.scope = 'row'; company.textContent = row.company;
                const years = document.createElement('td'); years.textContent = formatDuration(row.months, language);
                tr.append(company, years); return tr;
            }));
            block.querySelectorAll('[data-filter]').forEach(button => {
                const active = button.dataset.filter === filter;
                button.setAttribute('aria-pressed', String(active));
                button.classList.toggle('active', active);
                button.disabled = !ChartClass;
            });
            const summary = rows.map(row => `${row.company}: ${formatDuration(row.months, language)}`).join('; ');
            block.querySelectorAll('[data-chart-label]').forEach(label => {
                label.textContent = `${translate('exp_years')}. ${summary}. ${translate('exp_total')}: ${total}.`;
            });
            if (!ChartClass) return;
            block.classList.add('charts-ready');
            for (const [offset, type] of ['bar', 'pie'].entries()) {
                const companyColors = rows.map(row => colors.companies[row.company === 'Appgate' ? 1 : 0]);
                const dataset = {label: translate('exp_years'), data: values, backgroundColor: type === 'bar' ? colors.bar : companyColors, borderColor: type === 'bar' ? colors.bar : colors.paper, borderWidth: type === 'bar' ? 1 : 2};
                const options = {
                    responsive: true, maintainAspectRatio: false, resizeDelay: 80,
                    animation: reducedMotion.matches ? false : {duration: colors.duration},
                    color: colors.text, font: {family: colors.font},
                    plugins: {
                        legend: {display: type === 'pie', position: 'bottom', labels: {color: colors.text, font: {family: colors.font}, boxWidth: 12, padding: 16}},
                        tooltip: {backgroundColor: colors.tooltip, titleColor: colors.inverse, bodyColor: colors.inverse, callbacks: {label: context => `${context.label}: ${formatDuration(rows[context.dataIndex]?.months || 0, language)}`}}
                    }
                };
                if (type === 'bar') {
                    options.indexAxis = 'y';
                    options.scales = {
                        x: {beginAtZero: true, max: Math.max(10, Math.ceil(Math.max(0, ...selectData(key).rows.map(row => row.years)))), ticks: {stepSize: 1, color: colors.muted, font: {family: colors.font}}, grid: {color: colors.border}},
                        y: {ticks: {color: colors.text, font: {family: colors.font}}, grid: {display: false}}
                    };
                }
                const position = index * 2 + offset;
                if (charts[position]) {
                    charts[position].data = {labels, datasets: [dataset]};
                    charts[position].options = options;
                    charts[position].update(reducedMotion.matches ? 'none' : undefined);
                } else {
                    charts[position] = new ChartClass(block.querySelector(`[data-chart="${type}"]`), {type, data: {labels, datasets: [dataset]}, options});
                }
            }
        }
        function refresh() {
            if (disposed) return;
            root.querySelectorAll('[data-employment-range]').forEach(element => {
                const company = config.companies.find(company => company.id === element.dataset.employmentRange);
                if (company) element.textContent = formatRange(company, document.documentElement.lang);
            });
            root.querySelectorAll('[data-tenure]').forEach(element => {
                const company = config.companies.find(company => company.id === element.dataset.tenure);
                if (company) element.textContent = formatDuration(calculateMonths(company), document.documentElement.lang);
            });
            blocks.forEach(refreshBlock);
        }
        blocks.forEach(block => block.addEventListener('click', event => {
            const button = event.target.closest('[data-filter]');
            if (!button || button.disabled || !block.contains(button)) return;
            filters.set(block.dataset.chartBlock, button.dataset.filter);
            refreshBlock(block, blocks.indexOf(block));
        }, {signal: events.signal}));
        document.addEventListener('languagechange', refresh, {signal: events.signal});
        reducedMotion.addEventListener('change', refresh, {signal: events.signal});
        let lastMonth = currentMonth();
        const refreshCalendar = () => {
            const month = currentMonth();
            if (month !== lastMonth) { lastMonth = month; refresh(); }
        };
        const calendarTimer = setInterval(refreshCalendar, 60000);
        document.addEventListener('visibilitychange', refreshCalendar, {signal: events.signal});
        refresh();
        loadLibrary().then(loaded => {
            if (disposed || !root.isConnected) return;
            ChartClass = loaded;
            refresh();
            if (status) status.hidden = true;
            document.fonts?.ready.then(() => {
                if (!disposed) charts.forEach(chart => {chart.resize(); chart.update('none');});
            });
        }).catch(error => {
            if (disposed) return;
            if (status) { status.dataset.i18n = 'exp_chart_error'; status.textContent = translate('exp_chart_error'); status.hidden = false; }
            charts.forEach(chart => chart.destroy());
            charts.length = 0;
            ChartClass = null;
            blocks.forEach(block => block.classList.remove('charts-ready'));
            refresh();
            console.error('Experience charts:', error);
        });
        return () => {
            disposed = true;
            events.abort();
            clearInterval(calendarTimer);
            charts.forEach(chart => chart.destroy());
            charts.length = 0;
        };
    }
    return {initialize, selectData, calculateMonths, formatDuration, formatRange, currentMonth};
})();
