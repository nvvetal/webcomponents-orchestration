import { browser, expect } from '@wdio/globals';

describe('APL Page Render — full document layout', () => {
    before(async () => {
        await browser.url('/tests/fixtures/apl-page-render.html');
        await browser.waitUntil(
            async () => browser.execute(() => !!(window as any)._testReady),
            { timeout: 10000, timeoutMsg: 'Page render fixture not ready' },
        );
    });

    // --- Component tree ---

    it('should create the root Container', async () => {
        const tag = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const wrapper = doc.shadowRoot.querySelector('.wrapper');
            return wrapper.children[0]?.tagName.toLowerCase();
        });
        expect(tag).toBe('apl-container-component');
    });

    it('root Container should have direction=row', async () => {
        const dir = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            return getComputedStyle(wrapper).flexDirection;
        });
        expect(dir).toBe('row');
    });

    it('root Container should have 2 Frame children', async () => {
        const count = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            return wrapper.children.length;
        });
        expect(count).toBe(2);
    });

    // --- Left side (image) ---

    it('left Frame should be 50% width of the container', async () => {
        const ratio = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            const leftFrame = wrapper.children[0];
            return leftFrame.getBoundingClientRect().width / wrapper.getBoundingClientRect().width;
        });
        expect(ratio).toBeCloseTo(0.5, 1);
    });

    it('left Frame should contain an Image component', async () => {
        const tag = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            const leftFrame = wrapper.children[0];
            const frameWrapper = leftFrame.shadowRoot.querySelector('.wrapper');
            return frameWrapper.children[0]?.tagName.toLowerCase();
        });
        expect(tag).toBe('apl-image-component');
    });

    // --- Right side (content) ---

    it('right Frame should be 50% width of the container', async () => {
        const ratio = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            const rightFrame = wrapper.children[1];
            return rightFrame.getBoundingClientRect().width / wrapper.getBoundingClientRect().width;
        });
        expect(ratio).toBeCloseTo(0.5, 1);
    });

    it('right Frame should fill 100% height of the container', async () => {
        const ratio = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            const rightFrame = wrapper.children[1];
            return rightFrame.getBoundingClientRect().height / wrapper.getBoundingClientRect().height;
        });
        expect(ratio).toBeCloseTo(1.0, 1);
    });

    it('right side should have a column Container with header and buttons areas', async () => {
        const result = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            const rightFrame = wrapper.children[1];
            const rfWrapper = rightFrame.shadowRoot.querySelector('.wrapper');
            const innerContainer = rfWrapper.children[0];
            const icWrapper = innerContainer.shadowRoot.querySelector('.wrapper');
            return {
                tag: innerContainer.tagName.toLowerCase(),
                direction: getComputedStyle(icWrapper).flexDirection,
                childCount: icWrapper.children.length,
            };
        });
        expect(result.tag).toBe('apl-container-component');
        expect(result.direction).toBe('column');
        expect(result.childCount).toBe(2);
    });

    // --- Title text ---

    it('should render the title text "Welcome to Hotel"', async () => {
        const text = await browser.execute(() => {
            const factory = (window as any)._aplFactory;
            for (const item of factory.getItems()) {
                const data = item.getAPLData();
                if (data.text === 'Welcome to Hotel') return data.text;
            }
            return null;
        });
        expect(text).toBe('Welcome to Hotel');
    });

    // --- Button area ---

    it('buttons container should have wrap=wrap and direction=row', async () => {
        const result = await browser.execute(() => {
            const factory = (window as any)._aplFactory;
            for (const item of factory.getItems()) {
                const data = item.getAPLData();
                if (data.wrap === 'wrap' && data.direction === 'row') {
                    const wrapper = item.shadowRoot.querySelector('.wrapper');
                    return {
                        flexWrap: getComputedStyle(wrapper).flexWrap,
                        flexDirection: getComputedStyle(wrapper).flexDirection,
                    };
                }
            }
            return null;
        });
        expect(result).not.toBeNull();
        expect(result!.flexWrap).toBe('wrap');
        expect(result!.flexDirection).toBe('row');
    });

    it('should have 2 TouchWrapper buttons', async () => {
        const count = await browser.execute(() => {
            const factory = (window as any)._aplFactory;
            return factory.getItems().filter(
                (item: any) => item.tagName.toLowerCase() === 'apl-touch-wrapper-component'
            ).length;
        });
        expect(count).toBe(2);
    });

    it('button texts should be "Check In" and "Check Out"', async () => {
        const texts = await browser.execute(() => {
            const factory = (window as any)._aplFactory;
            return factory.getItems()
                .filter((item: any) => item.tagName.toLowerCase() === 'apl-text-component')
                .map((item: any) => item.getAPLData().text)
                .filter((t: string) => t === 'Check In' || t === 'Check Out');
        });
        expect(texts).toContain('Check In');
        expect(texts).toContain('Check Out');
    });

    // --- Dimensions and layout integrity ---

    it('both Frames should have non-zero dimensions', async () => {
        const dims = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            const results: any[] = [];
            for (const child of wrapper.children) {
                const rect = child.getBoundingClientRect();
                results.push({ w: rect.width, h: rect.height });
            }
            return results;
        });
        expect(dims.length).toBe(2);
        for (const d of dims) {
            expect(d.w).toBeGreaterThan(0);
            expect(d.h).toBeGreaterThan(0);
        }
    });

    it('header area should take ~40% and buttons area ~60% of right side height', async () => {
        const ratios = await browser.execute(() => {
            const doc = (window as any)._docEl;
            const container = doc.shadowRoot.querySelector('apl-container-component');
            const wrapper = container.shadowRoot.querySelector('.wrapper');
            const rightFrame = wrapper.children[1];
            const rfWrapper = rightFrame.shadowRoot.querySelector('.wrapper');
            const innerContainer = rfWrapper.children[0];
            const icWrapper = innerContainer.shadowRoot.querySelector('.wrapper');
            const parentH = icWrapper.getBoundingClientRect().height;
            const headerH = icWrapper.children[0].getBoundingClientRect().height;
            const buttonsH = icWrapper.children[1].getBoundingClientRect().height;
            return {
                headerRatio: headerH / parentH,
                buttonsRatio: buttonsH / parentH,
            };
        });
        expect(ratios.headerRatio).toBeCloseTo(0.4, 1);
        expect(ratios.buttonsRatio).toBeCloseTo(0.6, 1);
    });

    // --- Total component count ---

    it('should have created all expected components in the factory', async () => {
        const count = await browser.execute(() => {
            return (window as any)._aplFactory.getItems().length;
        });
        expect(count).toBe(18);
    });

    // --- APLDom tree integrity ---

    it('APLDom should have a root item with children', async () => {
        const result = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const items = dom.getItems();
            if (!items || items.length === 0) return { hasRoot: false, childCount: 0 };
            return {
                hasRoot: true,
                childCount: items[0].items?.length || 0,
            };
        });
        expect(result.hasRoot).toBe(true);
        expect(result.childCount).toBe(2);
    });

    // --- No errors ---

    it('should have no unhandled errors', async () => {
        const errors = await browser.execute(() => (window as any)._unhandledErrors);
        expect(errors).toHaveLength(0);
    });

    it('should have no console errors', async () => {
        const errors = await browser.execute(() => (window as any)._consoleErrors);
        const relevant = errors.filter(
            (e: string) => !e.includes('favicon') && !e.includes('[deprecation]'),
        );
        expect(relevant).toHaveLength(0);
    });
});
