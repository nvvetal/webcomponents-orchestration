import { browser, expect } from '@wdio/globals';

describe('APLObjectInspectorPropertyScaleComponent', () => {
    before(async () => {
        await browser.url('/tests/fixtures/apl-scale-picker.html');
        await browser.waitUntil(
            async () => browser.execute(() => !!(window as any)._testReady),
            { timeout: 8000, timeoutMsg: 'Scale picker fixture not ready' },
        );
    });

    // --- Tab dispatch ---

    it('should render the properties tab', async () => {
        const el = await $('#proptab1');
        await expect(el).toExist();
        expect(await el.getAttribute('loaded')).toBe('loaded');
    });

    it('should dispatch scale property to scale-picker component', async () => {
        const tagName = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            return scaleProp?.tagName?.toLowerCase();
        });
        expect(tagName).toBe('apl-object-inspector-property-scale-component');
    });

    it('should dispatch position property to regular list component', async () => {
        const tagName = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const posProp = tab.properties.find((p: any) => p.name === 'position');
            return posProp?.tagName?.toLowerCase();
        });
        expect(tagName).toBe('ba-object-inspector-property-list-component');
    });

    // --- Scale picker rendering (always visible) ---

    it('should render 5 scale buttons', async () => {
        const count = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return 0;
            return picker.querySelectorAll('.scale-btn').length;
        });
        expect(count).toBe(5);
    });

    it('should render SVG icons inside each button', async () => {
        const svgCount = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return 0;
            return picker.querySelectorAll('.scale-btn svg').length;
        });
        expect(svgCount).toBe(5);
    });

    it('should render a label for each button', async () => {
        const labels = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return [];
            return Array.from(picker.querySelectorAll('.scale-label')).map((el: any) => el.textContent);
        });
        expect(labels).toEqual(['fill', 'best-fill', 'best-fit', 'best-fit-down', 'none']);
    });

    it('should render a tooltip for each button', async () => {
        const tooltipCount = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return 0;
            return picker.querySelectorAll('.scale-tooltip').length;
        });
        expect(tooltipCount).toBe(5);
    });

    it('should have correct tooltip text', async () => {
        const tooltips = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return [];
            return Array.from(picker.querySelectorAll('.scale-tooltip')).map((el: any) => el.textContent);
        });
        expect(tooltips).toEqual([
            'Stretch to fill — aspect ratio lost',
            'Fill box, preserve ratio — may crop edges',
            'Fit within box — letterbox/pillarbox (default)',
            'Shrink only — never upscales',
            'Native size — no resizing',
        ]);
    });

    it('should have correct data-scale-value attributes', async () => {
        const values = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return [];
            return Array.from(picker.querySelectorAll('.scale-btn')).map(
                (btn: any) => btn.dataset.scaleValue
            );
        });
        expect(values).toEqual(['fill', 'best-fill', 'best-fit', 'best-fit-down', 'none']);
    });

    // --- Active state ---

    it('should mark best-fit as active by default', async () => {
        const activeValue = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return null;
            const active = picker.querySelector('.scale-btn--active');
            return active?.dataset?.scaleValue ?? null;
        });
        expect(activeValue).toBe('best-fit');
    });

    it('should have exactly one active button', async () => {
        const count = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return 0;
            return picker.querySelectorAll('.scale-btn--active').length;
        });
        expect(count).toBe(1);
    });

    // --- Click interaction ---

    it('should change active state when clicking a different button', async () => {
        const result = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            if (!picker) return null;
            const fillBtn = picker.querySelector('[data-scale-value="fill"]') as any;
            fillBtn.click();
            return {
                fillActive: fillBtn.classList.contains('scale-btn--active'),
                bestFitActive: picker.querySelector('[data-scale-value="best-fit"]')
                    .classList.contains('scale-btn--active'),
            };
        });
        expect(result).toBeTruthy();
        expect(result!.fillActive).toBe(true);
        expect(result!.bestFitActive).toBe(false);
    });

    it('should update the property value on click', async () => {
        const value = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            return scaleProp.value;
        });
        expect(value).toBe('fill');
    });

    it('should fire a changed event on click', async () => {
        const eventCount = await browser.execute(() => (window as any)._changedEvents.length);
        expect(eventCount).toBeGreaterThan(0);
    });

    it('should cycle through all values correctly', async () => {
        const results = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            const values = ['none', 'best-fill', 'best-fit-down', 'best-fit'];
            const recorded: string[] = [];

            for (const v of values) {
                const btn = picker.querySelector(`[data-scale-value="${v}"]`) as any;
                btn.click();
                recorded.push(scaleProp.value);
            }
            return recorded;
        });
        expect(results).toEqual(['none', 'best-fill', 'best-fit-down', 'best-fit']);
    });

    it('should not fire changed event when clicking already-active button', async () => {
        const eventCountBefore = await browser.execute(() => (window as any)._changedEvents.length);
        await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            const btn = picker.querySelector('[data-scale-value="best-fit"]') as any;
            btn.click();
        });
        const eventCountAfter = await browser.execute(() => (window as any)._changedEvents.length);
        expect(eventCountAfter).toBe(eventCountBefore);
    });

    // --- Style / visual ---

    it('should use auto height on wrapper for expanded layout', async () => {
        const height = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const wrapper = scaleProp.element.shadow.querySelector('.wrapper');
            return getComputedStyle(wrapper).height;
        });
        const px = parseFloat(height);
        expect(px).toBeGreaterThan(24);
    });

    it('should render buttons with dark background', async () => {
        const bg = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            const btn = picker.querySelector('[data-scale-value="none"]');
            return getComputedStyle(btn).backgroundColor;
        });
        expect(bg).toBe('rgb(28, 28, 46)');
    });

    it('should apply active glow styling to selected button', async () => {
        const boxShadow = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            const active = picker.querySelector('.scale-btn--active');
            return getComputedStyle(active).boxShadow;
        });
        expect(boxShadow).not.toBe('none');
        expect(boxShadow).toContain('100, 149, 237');
    });

    // --- Tooltip ---

    it('should have tooltips hidden by default', async () => {
        const opacity = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            const tooltip = picker.querySelector('.scale-tooltip');
            return getComputedStyle(tooltip).opacity;
        });
        expect(opacity).toBe('0');
    });

    // --- External value update ---

    it('should sync active button when value is refreshed externally', async () => {
        const activeValue = await browser.execute(() => {
            const tab = document.getElementById('proptab1') as any;
            const scaleProp = tab.properties.find((p: any) => p.name === 'scale');
            scaleProp.refreshValue('none');
            const picker = scaleProp.element.shadow.querySelector('.scale-picker');
            const active = picker.querySelector('.scale-btn--active');
            return active?.dataset?.scaleValue ?? null;
        });
        expect(activeValue).toBe('none');
    });

    // --- Console errors ---

    it('should have no console errors', async () => {
        const errors = await browser.execute(() => (window as any)._consoleErrors);
        const relevant = errors.filter(
            (e: string) => !e.includes('[deprecation]') && !e.includes('favicon'),
        );
        expect(relevant).toHaveLength(0);
    });

    it('should have no critical console warnings', async () => {
        const warnings = await browser.execute(() => (window as any)._consoleWarnings);
        const critical = warnings.filter(
            (w: string) => w.includes('TypeError') || w.includes('ReferenceError') || w.includes('Failed to'),
        );
        expect(critical).toHaveLength(0);
    });
});
