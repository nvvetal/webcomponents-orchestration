import { browser, expect } from '@wdio/globals';

describe('APL Decoupled — no window.apl / window.aplFactory / window.aplDom globals', () => {
    before(async () => {
        await browser.url('/tests/fixtures/apl-decoupled.html');
        await browser.waitUntil(
            async () => browser.execute(() => !!(window as any)._testReady),
            { timeout: 10000, timeoutMsg: 'Decoupled fixture not ready' },
        );
    });

    // --- Fixture sanity ---

    it('should have 3 components registered in APLDom', async () => {
        const count = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const root = dom.getItems();
            return root.length + dom.getChildrenFlatList(root[0]).length;
        });
        expect(count).toBe(3);
    });

    it('should have 3 components registered in inspector', async () => {
        const count = await browser.execute(() => {
            return (window as any)._inspector.getComponents().length;
        });
        expect(count).toBe(3);
    });

    it('should render select-container with 3 options', async () => {
        const optionCount = await browser.execute(() => {
            const insp = (window as any)._inspector;
            const objSel = insp.objectsSelectorComponent;
            return objSel.selectContainer.querySelectorAll('.select-option').length;
        });
        expect(optionCount).toBe(3);
    });

    // --- Globals must NOT exist ---

    it('should NOT have window.apl set', async () => {
        const hasGlobal = await browser.execute(() => !!(window as any).apl);
        expect(hasGlobal).toBe(false);
    });

    it('should NOT have window.aplFactory set', async () => {
        const hasGlobal = await browser.execute(() => !!(window as any).aplFactory);
        expect(hasGlobal).toBe(false);
    });

    it('should NOT have window.aplDom set', async () => {
        const hasGlobal = await browser.execute(() => !!(window as any).aplDom);
        expect(hasGlobal).toBe(false);
    });

    // --- APLFactory uses injected DOM (not window.aplDom) ---

    it('should access isOnSameLevel through factory getDom()', async () => {
        const result = await browser.execute(() => {
            const w = window as any;
            const dom = w._aplDom;
            const factory = w._aplFactory;
            const frameItem = dom.findByGuid(w._frame1.guid);
            const textItem = dom.findByGuid(w._text1.guid);
            return factory.getDom().isOnSameLevel(frameItem, textItem);
        });
        expect(result).toBe(true);
    });

    // --- APLComponent dispatches CustomEvent on re-parent ---

    it('should dispatch apl-parent-changed CustomEvent on re-parent', async () => {
        const result = await browser.execute(() => {
            const w = window as any;
            const before = w._parentChangedEvents.length;
            // frame1 currently parented to container1 — re-parent to docEl
            w._frame1.setAPLParent(w._docEl);
            const after = w._parentChangedEvents.length;
            const last = w._parentChangedEvents[after - 1];
            return {
                eventFired: after > before,
                hasDetail: !!last,
                hasParentGuid: last?.parent === w._docEl.guid,
                hasOldParentGuid: !!last?.oldParent,
            };
        });
        expect(result.eventFired).toBe(true);
        expect(result.hasDetail).toBe(true);
        expect(result.hasParentGuid).toBe(true);
        expect(result.hasOldParentGuid).toBe(true);
    });

    // --- Inspector uses injected context (not window.*) ---

    it('should have context injected into objects component', async () => {
        const result = await browser.execute(() => {
            const objSel = (window as any)._inspector.objectsSelectorComponent;
            return {
                hasAplDom: !!objSel._aplDom,
                hasAplFactory: !!objSel._aplFactory,
                hasViewComponent: typeof objSel._viewComponent === 'function',
            };
        });
        expect(result.hasAplDom).toBe(true);
        expect(result.hasAplFactory).toBe(true);
        expect(result.hasViewComponent).toBe(true);
    });

    it('should select a component through injected factory without error', async () => {
        const result = await browser.execute(() => {
            const w = window as any;
            try {
                w._aplFactory.onSelect(w._container1);
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });
        expect(result.success).toBe(true);
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

    it('should have no severe browser-level errors', async () => {
        const logs = await browser.getLogs('browser');
        const severe = logs.filter(
            (log: any) => log.level === 'SEVERE' && !log.message.includes('favicon'),
        );
        expect(severe).toHaveLength(0);
    });
});
