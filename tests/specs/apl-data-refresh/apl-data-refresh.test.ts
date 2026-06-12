import { browser, expect } from '@wdio/globals';

const REBUILD_TIMEOUT = 8000;

async function refreshCount(): Promise<number> {
    return browser.execute(() => (window as any)._refreshCount);
}

async function waitForRebuilds(target: number) {
    await browser.waitUntil(
        async () => (await refreshCount()) >= target,
        { timeout: REBUILD_TIMEOUT, timeoutMsg: `expected ${target} rebuild(s)` },
    );
    // refresh counter increments after applyDocument finishes; small settle pause
    await browser.pause(200);
}

describe('APL data edit refresh', () => {
    before(async () => {
        await browser.url('/index.html');
        await browser.waitUntil(
            async () => browser.execute(() => {
                const d = document.getElementById('data');
                return !!(d && d.children.length > 0 && (window as any).apl?.aplDataComponent);
            }),
            { timeout: 15000, timeoutMsg: 'App not ready after 15s' },
        );
        await browser.pause(500);

        await browser.execute(() => {
            const apl = (window as any).apl;
            (window as any)._refreshCount = 0;
            const orig = apl.aplLoader.refresh.bind(apl.aplLoader);
            apl.aplLoader.refresh = async function () {
                const r = await orig();
                (window as any)._refreshCount++;
                return r;
            };
            (window as any)._baselineDoc = JSON.parse(JSON.stringify(apl.aplDom.aplDocument.document));
            (window as any)._baseline = {
                factory: apl.aplFactory.items.length,
                canvas: apl.aplLoader.container.element.wrapper.querySelectorAll('[apl-type]').length,
                options: apl.inspector.objectsSelectorComponent.selectContainer.children.length,
                guidIndex: apl.aplDom._guidIndex.size,
                domRoots: apl.aplDom.getItems().length,
            };
        });
    });

    it('should rebuild once without duplicating components or registries', async () => {
        const target = (await refreshCount()) + 1;
        await browser.execute(() => {
            const apl = (window as any).apl;
            const json = JSON.parse(JSON.stringify((window as any)._baselineDoc));
            apl.aplDataComponent.sendChanged('document', { type: APLDataComponent.EVENT_DOCUMENT_CHANGED, json });
        });
        await waitForRebuilds(target);

        const after = await browser.execute(() => {
            const apl = (window as any).apl;
            return {
                factory: apl.aplFactory.items.length,
                canvas: apl.aplLoader.container.element.wrapper.querySelectorAll('[apl-type]').length,
                options: apl.inspector.objectsSelectorComponent.selectContainer.children.length,
                guidIndex: apl.aplDom._guidIndex.size,
                domRoots: apl.aplDom.getItems().length,
                baseline: (window as any)._baseline,
            };
        });
        expect(after.factory).toBe(after.baseline.factory);
        expect(after.canvas).toBe(after.baseline.canvas);
        expect(after.options).toBe(after.baseline.options);
        expect(after.guidIndex).toBe(after.baseline.guidIndex);
        expect(after.domRoots).toBe(after.baseline.domRoots);
    });

    it('should add a new component with all its data', async () => {
        const target = (await refreshCount()) + 1;
        await browser.execute(() => {
            const apl = (window as any).apl;
            const json = JSON.parse(JSON.stringify((window as any)._baselineDoc));
            json.mainTemplate.items[0].items.push({ type: 'Text', text: 'AddedByDataEdit', color: '#00ff00' });
            apl.aplDataComponent.sendChanged('document', { type: APLDataComponent.EVENT_DOCUMENT_CHANGED, json });
        });
        await waitForRebuilds(target);

        const result = await browser.execute(() => {
            const apl = (window as any).apl;
            const comp = apl.aplFactory.items.find((c: any) => c.getAPLData()?.text === 'AddedByDataEdit');
            const mapped = comp ? apl.aplDom.getComponentData(comp) : null;
            return {
                exists: !!comp,
                rendered: comp ? comp.isConnected && comp.element.wrapper.textContent.includes('AddedByDataEdit') : false,
                color: comp ? comp.getAPLData().color : null,
                mappingCorrect: mapped ? mapped.aplData.item.text === 'AddedByDataEdit' : false,
                factory: apl.aplFactory.items.length,
                options: apl.inspector.objectsSelectorComponent.selectContainer.children.length,
                baseline: (window as any)._baseline,
            };
        });
        expect(result.exists).toBe(true);
        expect(result.rendered).toBe(true);
        expect(result.color).toBe('#00ff00');
        expect(result.mappingCorrect).toBe(true);
        expect(result.factory).toBe(result.baseline.factory + 1);
        expect(result.options).toBe(result.baseline.options + 1);
    });

    it('should apply falsy property values instead of defaults', async () => {
        const target = (await refreshCount()) + 1;
        await browser.execute(() => {
            const apl = (window as any).apl;
            const json = JSON.parse(JSON.stringify((window as any)._baselineDoc));
            json.mainTemplate.items[0].items.push({ type: 'Text', text: 'FalsyTest', width: 0 });
            apl.aplDataComponent.sendChanged('document', { type: APLDataComponent.EVENT_DOCUMENT_CHANGED, json });
        });
        await waitForRebuilds(target);

        const width = await browser.execute(() => {
            const apl = (window as any).apl;
            const comp = apl.aplFactory.items.find((c: any) => c.getAPLData()?.text === 'FalsyTest');
            return comp ? comp.getAPLData().width : 'COMPONENT_NOT_FOUND';
        });
        // the old || fallback chain rewrote width: 0 to the property default '100%'
        expect(width).toBe(0);
    });

    it('should remove components deleted from the document', async () => {
        const target = (await refreshCount()) + 1;
        await browser.execute(() => {
            const apl = (window as any).apl;
            const json = JSON.parse(JSON.stringify((window as any)._baselineDoc));
            apl.aplDataComponent.sendChanged('document', { type: APLDataComponent.EVENT_DOCUMENT_CHANGED, json });
        });
        await waitForRebuilds(target);

        const result = await browser.execute(() => {
            const apl = (window as any).apl;
            const optionTexts = [...apl.inspector.objectsSelectorComponent.selectContainer.children]
                .map((o: any) => o.textContent);
            return {
                factory: apl.aplFactory.items.length,
                options: apl.inspector.objectsSelectorComponent.selectContainer.children.length,
                staleComponent: !!apl.aplFactory.items.find((c: any) => c.getAPLData()?.text === 'AddedByDataEdit'),
                staleOption: optionTexts.some((t: string) => t.includes('AddedByDataEdit') || t.includes('FalsyTest')),
                baseline: (window as any)._baseline,
            };
        });
        expect(result.factory).toBe(result.baseline.factory);
        expect(result.options).toBe(result.baseline.options);
        expect(result.staleComponent).toBe(false);
        expect(result.staleOption).toBe(false);
    });

    it('should preserve the selected component across a rebuild', async () => {
        const before = await browser.execute(() => {
            const apl = (window as any).apl;
            const targetComp = apl.aplFactory.items[3];
            apl.aplFactory.onSelect(targetComp);
            apl.inspector.objectsSelectorComponent.selectComponent(targetComp);
            return {
                path: apl.getComponentPath(targetComp),
                name: targetComp.getAPLName(),
            };
        });

        const target = (await refreshCount()) + 1;
        await browser.execute(() => {
            const apl = (window as any).apl;
            const json = JSON.parse(JSON.stringify((window as any)._baselineDoc));
            apl.aplDataComponent.sendChanged('document', { type: APLDataComponent.EVENT_DOCUMENT_CHANGED, json });
        });
        await waitForRebuilds(target);

        const after = await browser.execute(() => {
            const apl = (window as any).apl;
            const selected = apl.propertyAdaptor.getComponent();
            return {
                path: selected ? apl.getComponentPath(selected) : null,
                name: selected ? selected.getAPLName() : null,
            };
        });
        expect(after.path).toEqual(before.path);
        expect(after.name).toBe(before.name);
    });

    it('should collapse rapid edits into a single rebuild', async () => {
        const start = await refreshCount();
        await browser.execute(async () => {
            const apl = (window as any).apl;
            for (let i = 0; i < 4; i++) {
                const json = JSON.parse(JSON.stringify((window as any)._baselineDoc));
                apl.aplDataComponent.sendChanged('document', { type: APLDataComponent.EVENT_DOCUMENT_CHANGED, json });
                await new Promise(r => setTimeout(r, 100));
            }
        });
        await waitForRebuilds(start + 1);
        await browser.pause(1200);
        expect(await refreshCount()).toBe(start + 1);
    });

    it('should keep dom-to-json mapping consistent for every component', async () => {
        const mismatches = await browser.execute(() => {
            const apl = (window as any).apl;
            const bad: string[] = [];
            for (const comp of apl.aplFactory.items) {
                const mapped = apl.aplDom.getComponentData(comp);
                const jsonType = mapped?.aplData?.item?.type;
                const componentType = comp.getAPLType()?.replace(/^APL/, '');
                if (jsonType !== componentType) {
                    bad.push(`${comp.getAPLName()}: json=${jsonType} component=${componentType}`);
                }
            }
            return bad;
        });
        expect(mismatches).toEqual([]);
    });
});
