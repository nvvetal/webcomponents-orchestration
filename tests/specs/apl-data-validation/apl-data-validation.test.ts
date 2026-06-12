import { browser, expect } from '@wdio/globals';

const ANNOTATION_TIMEOUT = 8000;

async function redAnnotations(): Promise<Array<{ row: number; text: string }>> {
    return browser.execute(() => {
        const ace = (window as any).apl.aplDataComponent.jsoneditor.aceEditor;
        return ace.getSession().getAnnotations()
            .filter((a: any) => a.type === 'error')
            .map((a: any) => ({ row: a.row, text: a.text }));
    });
}

async function setEditorDoc(mutate: string) {
    await browser.execute((mutateSrc: string) => {
        const ace = (window as any).apl.aplDataComponent.jsoneditor.aceEditor;
        const doc = JSON.parse(ace.getValue());
        // eslint-disable-next-line no-new-func
        new Function('doc', mutateSrc)(doc);
        ace.setValue(JSON.stringify(doc, null, 2), -1);
    }, mutate);
}

describe('APL data editor validation', () => {
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
        });
    });

    it('should have a validator wired and a clean baseline document', async () => {
        const result = await browser.execute(() => {
            const apl = (window as any).apl;
            const comp = apl.aplDataComponent;
            return {
                hasValidator: !!comp.validator,
                baselineErrors: comp.validator.validate(
                    JSON.parse(comp.jsoneditor.aceEditor.getValue())).length,
            };
        });
        expect(result.hasValidator).toBe(true);
        expect(result.baselineErrors).toBe(0);
    });

    it('should not rebuild and mark the line red on an invalid enum value', async () => {
        const before = await browser.execute(() => ({
            rebuilds: (window as any)._refreshCount,
            components: (window as any).apl.aplFactory.items.length,
        }));

        await setEditorDoc(`
            const find = (items) => {
                for (const it of items || []) {
                    if (it.type === 'Image') return it;
                    const f = find(it.items || (Array.isArray(it.item) ? it.item : it.item ? [it.item] : []));
                    if (f) return f;
                }
                return null;
            };
            find(doc.mainTemplate.items).scale = 'totally-wrong';
        `);

        await browser.waitUntil(
            async () => (await redAnnotations()).length > 0,
            { timeout: ANNOTATION_TIMEOUT, timeoutMsg: 'No red annotation appeared' },
        );
        await browser.pause(1200); // longer than the rebuild debounce

        const annotations = await redAnnotations();
        const markedLine = await browser.execute((row: number) => {
            const ace = (window as any).apl.aplDataComponent.jsoneditor.aceEditor;
            return ace.getSession().getLine(row);
        }, annotations[0].row);
        const after = await browser.execute(() => ({
            rebuilds: (window as any)._refreshCount,
            components: (window as any).apl.aplFactory.items.length,
        }));

        expect(after.rebuilds).toBe(before.rebuilds);
        expect(after.components).toBe(before.components);
        expect(annotations[0].text).toContain("'scale' must be one of");
        expect(markedLine).toContain('totally-wrong');
    });

    it('should resume rebuilding and clear marks once the document is fixed', async () => {
        const before = await browser.execute(() => (window as any)._refreshCount);

        await setEditorDoc(`
            const find = (items) => {
                for (const it of items || []) {
                    if (it.type === 'Image') return it;
                    const f = find(it.items || (Array.isArray(it.item) ? it.item : it.item ? [it.item] : []));
                    if (f) return f;
                }
                return null;
            };
            find(doc.mainTemplate.items).scale = 'best-fit';
        `);

        await browser.waitUntil(
            async () => browser.execute((b: number) => (window as any)._refreshCount > b, before),
            { timeout: ANNOTATION_TIMEOUT, timeoutMsg: 'No rebuild after fixing the document' },
        );
        await browser.pause(400);

        expect(await redAnnotations()).toEqual([]);
    });

    it('should block a half-added component (unknown type) without touching the canvas', async () => {
        const before = await browser.execute(() => ({
            rebuilds: (window as any)._refreshCount,
            components: (window as any).apl.aplFactory.items.length,
        }));

        await setEditorDoc(`
            doc.mainTemplate.items[0].items.push({ type: 'Bananna', text: 'oops' });
        `);

        await browser.waitUntil(
            async () => (await redAnnotations()).length > 0,
            { timeout: ANNOTATION_TIMEOUT, timeoutMsg: 'No red annotation for unknown type' },
        );
        await browser.pause(1200);

        const annotations = await redAnnotations();
        const after = await browser.execute(() => ({
            rebuilds: (window as any)._refreshCount,
            components: (window as any).apl.aplFactory.items.length,
        }));

        expect(after.rebuilds).toBe(before.rebuilds);
        expect(after.components).toBe(before.components);
        expect(annotations[0].text).toContain("unknown component type 'Bananna'");

        // restore a valid document for any later specs
        await setEditorDoc(`
            doc.mainTemplate.items[0].items.pop();
        `);
        await browser.waitUntil(
            async () => browser.execute((b: number) => (window as any)._refreshCount > b, before.rebuilds),
            { timeout: ANNOTATION_TIMEOUT, timeoutMsg: 'No rebuild after restore' },
        );
    });
});
