import { browser, expect } from '@wdio/globals';

describe('APL Image scale in live app', () => {
    before(async () => {
        await browser.url('/index.html');
        await browser.waitUntil(
            async () => browser.execute(() => {
                const dataDiv = document.getElementById('data');
                return dataDiv && dataDiv.children.length > 0;
            }),
            { timeout: 15000, timeoutMsg: 'App not ready after 15s' },
        );
        await browser.pause(500);
    });

    it('should find Image components via factory', async () => {
        const count = await browser.execute(() => {
            function deepQueryAll(root: any, selector: string): any[] {
                const results = [...root.querySelectorAll(selector)];
                root.querySelectorAll('*').forEach((el: any) => {
                    if (el.shadowRoot) {
                        results.push(...deepQueryAll(el.shadowRoot, selector));
                    }
                });
                return results;
            }
            return deepQueryAll(document, 'apl-image-component').length;
        });
        console.log('Image component count:', count);
        expect(count).toBeGreaterThan(0);
    });

    it('should render images using SVG with preserveAspectRatio="none"', async () => {
        const results = await browser.execute(() => {
            function deepQueryAll(root: any, selector: string): any[] {
                const results = [...root.querySelectorAll(selector)];
                root.querySelectorAll('*').forEach((el: any) => {
                    if (el.shadowRoot) {
                        results.push(...deepQueryAll(el.shadowRoot, selector));
                    }
                });
                return results;
            }
            const images = deepQueryAll(document, 'apl-image-component');
            return images.map((comp: any) => {
                const data = comp.getAPLData();
                const svg = comp.element?.wrapper?.querySelector('svg');
                const image = comp.element?.wrapper?.querySelector('image');
                return {
                    name: comp.getAPLName(),
                    scale: data.scale,
                    hasSvg: !!svg,
                    hasImage: !!image,
                    par: image ? image.getAttribute('preserveAspectRatio') : 'NO_IMAGE',
                    svgW: svg ? parseInt(svg.getAttribute('width')) : 0,
                    svgH: svg ? parseInt(svg.getAttribute('height')) : 0,
                    wrapperW: comp.element?.wrapper?.offsetWidth || 0,
                    wrapperH: comp.element?.wrapper?.offsetHeight || 0,
                };
            });
        });
        console.log('SVG rendering results:', JSON.stringify(results, null, 2));
        for (const r of results) {
            expect(r.hasSvg).toBe(true);
            expect(r.hasImage).toBe(true);
            expect(r.par).toBe('none');
        }
    });

    it('should have fill image with SVG matching container size', async () => {
        const result = await browser.execute(() => {
            function deepQueryAll(root: any, selector: string): any[] {
                const results = [...root.querySelectorAll(selector)];
                root.querySelectorAll('*').forEach((el: any) => {
                    if (el.shadowRoot) {
                        results.push(...deepQueryAll(el.shadowRoot, selector));
                    }
                });
                return results;
            }
            const images = deepQueryAll(document, 'apl-image-component');
            const mainImg = images.find((c: any) => c.getAPLData()?.scale === 'fill') as any;
            if (!mainImg) return null;
            const svg = mainImg.element?.wrapper?.querySelector('svg');
            return {
                scale: mainImg.getAPLData().scale,
                svgW: parseInt(svg?.getAttribute('width')),
                svgH: parseInt(svg?.getAttribute('height')),
                wrapperW: mainImg.element?.wrapper?.offsetWidth,
                wrapperH: mainImg.element?.wrapper?.offsetHeight,
            };
        });
        console.log('Fill image:', JSON.stringify(result));
        expect(result).toBeTruthy();
        expect(result!.svgW).toBe(result!.wrapperW);
        expect(result!.svgH).toBe(result!.wrapperH);
    });

    it('should change SVG dimensions when scale changes', async () => {
        const result = await browser.execute(() => {
            function deepQueryAll(root: any, selector: string): any[] {
                const results = [...root.querySelectorAll(selector)];
                root.querySelectorAll('*').forEach((el: any) => {
                    if (el.shadowRoot) {
                        results.push(...deepQueryAll(el.shadowRoot, selector));
                    }
                });
                return results;
            }
            const images = deepQueryAll(document, 'apl-image-component');
            const mainImg = images.find((c: any) => c.getAPLData()?.scale === 'fill') as any;
            if (!mainImg) return null;
            const svg = mainImg.element?.wrapper?.querySelector('svg');
            const ww = mainImg.element?.wrapper?.offsetWidth;
            const wh = mainImg.element?.wrapper?.offsetHeight;

            const fillW = parseInt(svg?.getAttribute('width'));
            const fillH = parseInt(svg?.getAttribute('height'));

            APLProperties.encode(mainImg, 'scale', 'none');
            const noneW = parseInt(svg?.getAttribute('width'));
            const noneH = parseInt(svg?.getAttribute('height'));

            // Restore
            APLProperties.encode(mainImg, 'scale', 'fill');

            return { fillW, fillH, noneW, noneH, ww, wh, nw: mainImg._naturalWidth, nh: mainImg._naturalHeight };
        });
        console.log('Scale dimension change:', JSON.stringify(result));
        expect(result).toBeTruthy();
        // fill: SVG = container
        expect(result!.fillW).toBe(result!.ww);
        // none: SVG = natural image size
        expect(result!.noneW).toBe(result!.nw);
        expect(result!.noneH).toBe(result!.nh);
    });
});
