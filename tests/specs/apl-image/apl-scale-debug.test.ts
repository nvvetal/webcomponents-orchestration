import { browser, expect } from '@wdio/globals';

describe('APL Scale change debug', () => {
    before(async () => {
        await browser.url('/index.html');
        await browser.waitUntil(
            async () => browser.execute(() => {
                const dataDiv = document.getElementById('data');
                return dataDiv && dataDiv.children.length > 0;
            }),
            { timeout: 15000, timeoutMsg: 'App not ready after 15s' },
        );
        await browser.pause(1000);
    });

    it('screenshot before any change', async () => {
        await browser.saveScreenshot('./screenshots/before-scale-change.png');
    });

    it('should change scale on logo image and verify SVG dimensions update', async () => {
        const testValues = ['best-fit', 'fill', 'none', 'best-fit-down', 'best-fill'];

        for (const scaleValue of testValues) {
            const result = await browser.execute((sv: string) => {
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
                const logoComp = images.find((c: any) => c.getAPLData()?.source?.includes('logo')) as any;
                if (!logoComp) return { error: 'Logo component not found' };

                APLProperties.encode(logoComp, 'scale', sv);

                const data = logoComp.getAPLData();
                const svg = logoComp.element?.wrapper?.querySelector('svg');
                const image = logoComp.element?.wrapper?.querySelector('image');

                return {
                    setTo: sv,
                    dataScale: data.scale,
                    par: image ? image.getAttribute('preserveAspectRatio') : 'NO_IMAGE',
                    svgW: parseInt(svg?.getAttribute('width')),
                    svgH: parseInt(svg?.getAttribute('height')),
                    wrapperW: logoComp.element?.wrapper?.offsetWidth,
                    wrapperH: logoComp.element?.wrapper?.offsetHeight,
                    hasSvg: !!svg,
                };
            }, scaleValue);

            console.log(`Scale=${scaleValue}:`, JSON.stringify(result));
            expect(result.dataScale).toBe(scaleValue);
            expect(result.par).toBe('none');
            expect(result.hasSvg).toBe(true);
        }
    });

    it('screenshot after scale changes', async () => {
        await browser.saveScreenshot('./screenshots/after-scale-change.png');
    });

    it('should preserve SVG rendering through renderContent cycle', async () => {
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
            const logoComp = images.find((c: any) => c.getAPLData()?.source?.includes('logo')) as any;
            if (!logoComp) return { error: 'not found' };

            // Step 1: set scale to fill via encode
            APLProperties.encode(logoComp, 'scale', 'fill');
            const svg1 = logoComp.element?.wrapper?.querySelector('svg');
            const w1 = parseInt(svg1?.getAttribute('width'));
            const wrapperW = logoComp.element?.wrapper?.offsetWidth;

            // Step 2: call renderContent (simulates what happens on re-render)
            logoComp.renderContent();
            const svg2 = logoComp.element?.wrapper?.querySelector('svg');
            const par2 = svg2?.querySelector('image')?.getAttribute('preserveAspectRatio');

            // Step 3: call onCSSSet again
            logoComp.onCSSSet();
            const svg3 = logoComp.element?.wrapper?.querySelector('svg');
            const w3 = parseInt(svg3?.getAttribute('width'));

            return {
                afterEncode: w1,
                wrapperW,
                afterRenderPAR: par2,
                afterOnCSSSet: w3,
                sameElement: svg1 === svg2,
            };
        });

        console.log('Re-render cycle:', JSON.stringify(result));
        // After encode: SVG width should match container for "fill"
        expect(result.afterEncode).toBe(result.wrapperW);
        // After renderContent: new SVG with preserveAspectRatio="none"
        expect(result.afterRenderPAR).toBe('none');
        // renderContent creates a different SVG element
        expect(result.sameElement).toBe(false);
    });
});
