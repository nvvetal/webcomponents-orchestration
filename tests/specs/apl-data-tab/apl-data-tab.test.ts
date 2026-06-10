import { browser, expect } from '@wdio/globals';

describe('APLObjectInspectorDataTabComponent', () => {
    before(async () => {
        await browser.url('/tests/fixtures/apl-data-tab.html');
        await browser.waitUntil(
            async () => browser.execute(() => !!(window as any)._testReady),
            { timeout: 8000, timeoutMsg: 'Data tab fixture not ready' },
        );
    });

    // --- Component lifecycle ---

    it('should render and reach loaded state', async () => {
        const el = await $('#datatab1');
        await expect(el).toExist();
        expect(await el.getAttribute('loaded')).toBe('loaded');
    });

    it('should have shadow DOM with wrapper', async () => {
        const el = await $('#datatab1');
        const wrapper = await el.shadow$('.wrapper');
        await expect(wrapper).toExist();
    });

    // --- JSONEditor CSS loading ---

    it('should clone jsoneditor <link> into shadow DOM', async () => {
        const hasLink = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            const links = el.element.shadow.querySelectorAll('link[href*="jsoneditor"]');
            return links.length > 0;
        });
        expect(hasLink).toBe(true);
    });

    // --- JSONEditor rendering ---

    it('should create a jsoneditor container div', async () => {
        const hasDiv = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            return !!el.element.shadow.querySelector('.jsoneditor');
        });
        expect(hasDiv).toBe(true);
    });

    it('should render the blue menu bar', async () => {
        const menu = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            const menuEl = el.element.shadow.querySelector('.jsoneditor-menu');
            if (!menuEl) return null;
            const style = getComputedStyle(menuEl);
            return {
                exists: true,
                height: menuEl.offsetHeight,
                bgColor: style.backgroundColor,
            };
        });
        expect(menu).toBeTruthy();
        expect(menu!.exists).toBe(true);
        expect(menu!.height).toBeGreaterThanOrEqual(30);
        expect(menu!.bgColor).toBe('rgb(56, 131, 250)');
    });

    it('should render menu buttons with proper dimensions', async () => {
        const buttons = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            const btns = el.element.shadow.querySelectorAll('.jsoneditor-menu > button');
            return Array.from(btns).map((btn: any) => ({
                title: btn.getAttribute('title'),
                width: btn.offsetWidth,
                height: btn.offsetHeight,
            }));
        });
        expect(buttons.length).toBeGreaterThanOrEqual(4);
        for (const btn of buttons) {
            expect(btn.width).toBeGreaterThanOrEqual(20);
            expect(btn.height).toBeGreaterThanOrEqual(20);
        }
    });

    it('should render menu buttons with SVG background-image', async () => {
        const hasBgImage = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            const btn = el.element.shadow.querySelector('.jsoneditor-menu > button');
            if (!btn) return false;
            const style = getComputedStyle(btn);
            return style.backgroundImage.includes('jsoneditor-icons');
        });
        expect(hasBgImage).toBe(true);
    });

    it('should render the search input in menu bar', async () => {
        const hasSearch = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            const search = el.element.shadow.querySelector('.jsoneditor-search input');
            return !!search;
        });
        expect(hasSearch).toBe(true);
    });

    // --- Tree content ---

    it('should render jsoneditor tree with data', async () => {
        const hasTree = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            return !!el.element.shadow.querySelector('.jsoneditor-tree');
        });
        expect(hasTree).toBe(true);
    });

    it('should have data accessible via component.data', async () => {
        const data = await browser.execute(() => {
            return (document.getElementById('datatab1') as any).data;
        });
        expect(data.type).toBe('Container');
        expect(data.width).toBe('100%');
        expect(data.direction).toBe('row');
        expect(data.items).toHaveLength(2);
    });

    it('should render tree rows for data properties', async () => {
        const rowCount = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            const container = el.element.jsoneditor;
            return container.querySelectorAll('tr.jsoneditor-expandable, tr:not(.jsoneditor-expandable)').length;
        });
        expect(rowCount).toBeGreaterThanOrEqual(1);
    });

    // --- JSONEditor instance ---

    it('should expose a jsoneditor instance', async () => {
        const hasEditor = await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            return !!el.jsoneditor && typeof el.jsoneditor.get === 'function';
        });
        expect(hasEditor).toBe(true);
    });

    it('should allow reading data via jsoneditor.get()', async () => {
        const data = await browser.execute(() => {
            return (document.getElementById('datatab1') as any).jsoneditor.get();
        });
        expect(data).toBeTruthy();
        expect(typeof data).toBe('object');
    });

    // --- Data updates ---

    it('should update tree when data changes externally', async () => {
        await browser.execute(() => {
            const el = document.getElementById('datatab1') as any;
            el.update({ direction: 'column', newProp: 42 });
        });
        // Small delay for JSONEditor to re-render
        await browser.pause(100);
        const data = await browser.execute(() => {
            return (document.getElementById('datatab1') as any).jsoneditor.get();
        });
        expect(data.direction).toBe('column');
        expect(data.newProp).toBe(42);
        expect(data.type).toBe('Container');
    });

    // --- Console errors ---

    it('should have no console errors during initialization', async () => {
        const errors = await browser.execute(() => (window as any)._consoleErrors);
        const relevantErrors = errors.filter(
            (e: string) => !e.includes('[deprecation]') && !e.includes('favicon'),
        );
        expect(relevantErrors).toHaveLength(0);
    });

    it('should have no critical console warnings', async () => {
        const warnings = await browser.execute(() => (window as any)._consoleWarnings);
        const critical = warnings.filter(
            (w: string) => w.includes('TypeError') || w.includes('ReferenceError') || w.includes('Failed to'),
        );
        expect(critical).toHaveLength(0);
    });

    // --- Browser log check ---

    it('should have no severe browser-level errors', async () => {
        const logs = await browser.getLogs('browser');
        const severe = logs.filter((log: any) => log.level === 'SEVERE');
        const relevant = severe.filter(
            (log: any) => !log.message.includes('favicon') && !log.message.includes('net::ERR_FILE_NOT_FOUND'),
        );
        expect(relevant).toHaveLength(0);
    });
});
