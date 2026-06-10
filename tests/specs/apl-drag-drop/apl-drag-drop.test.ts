import { browser, expect } from '@wdio/globals';

describe('APL Drag-Drop in Inspector Tree', () => {
    before(async () => {
        await browser.url('/tests/fixtures/apl-drag-drop.html');
        await browser.waitUntil(
            async () => browser.execute(() => !!(window as any)._testReady),
            { timeout: 10000, timeoutMsg: 'Drag-drop fixture not ready' },
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

    it('should have correct tree hierarchy (Container > Frame, Text)', async () => {
        const tree = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const root = dom.getItems()[0];
            return {
                rootType: root.component.getAPLType(),
                rootLevel: root.level,
                childCount: root.items.length,
                child0Type: root.items[0]?.component.getAPLType(),
                child0Level: root.items[0]?.level,
                child1Type: root.items[1]?.component.getAPLType(),
                child1Level: root.items[1]?.level,
            };
        });
        expect(tree.rootType).toBe('APLContainer');
        expect(tree.rootLevel).toBe(0);
        expect(tree.childCount).toBe(2);
        expect(tree.child0Type).toBe('APLFrame');
        expect(tree.child0Level).toBe(1);
        expect(tree.child1Type).toBe('APLText');
        expect(tree.child1Level).toBe(1);
    });

    // --- APLDom.findByGuid ---

    it('should find all components by guid in APLDom', async () => {
        const found = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const w = window as any;
            return {
                container: !!dom.findByGuid(w._container1.guid),
                frame: !!dom.findByGuid(w._frame1.guid),
                text: !!dom.findByGuid(w._text1.guid),
            };
        });
        expect(found.container).toBe(true);
        expect(found.frame).toBe(true);
        expect(found.text).toBe(true);
    });

    // --- APLDom.getComponentData for root item ---

    it('should return valid componentData for root container (no parent)', async () => {
        const data = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const w = window as any;
            const item = dom.findByGuid(w._container1.guid);
            const cd = dom.getComponentDataByItem(item);
            return {
                hasItem: !!cd,
                hasAplData: !!cd?.aplData,
                hasAplDataItem: !!cd?.aplData?.item,
                itemType: cd?.aplData?.item?.type,
                parentIsNull: item.parent === undefined || item.parent === null,
            };
        });
        expect(data.hasItem).toBe(true);
        expect(data.hasAplData).toBe(true);
        expect(data.hasAplDataItem).toBe(true);
        expect(data.parentIsNull).toBe(true);
    });

    it('should return valid componentData for child items', async () => {
        const data = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const w = window as any;
            const frameItem = dom.findByGuid(w._frame1.guid);
            const cd = dom.getComponentDataByItem(frameItem);
            return {
                hasAplDataItem: !!cd?.aplData?.item,
                hasParent: !!frameItem.parent,
                itemType: cd?.aplData?.item?.type,
            };
        });
        expect(data.hasAplDataItem).toBe(true);
        expect(data.hasParent).toBe(true);
        expect(data.itemType).toBe('Frame');
    });

    // --- APLDom.move() null safety ---

    it('should not crash when move() receives undefined args', async () => {
        const result = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const r = dom.move(undefined, undefined);
            return { hasMoveTo: r.moveTo === undefined, hasRemove: r.remove === undefined };
        });
        expect(result.hasMoveTo).toBe(true);
        expect(result.hasRemove).toBe(true);
    });

    it('should not crash when move() receives one undefined arg', async () => {
        const result = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const item = dom.getItems()[0];
            const r = dom.move(item, undefined);
            return { hasMoveTo: r.moveTo === undefined };
        });
        expect(result.hasMoveTo).toBe(true);
    });

    // --- APLDom.move() between valid items ---

    it('should produce valid move data for child-to-root move', async () => {
        const result = await browser.execute(() => {
            const dom = (window as any)._aplDom;
            const w = window as any;
            const textItem = dom.findByGuid(w._text1.guid);
            const containerItem = dom.findByGuid(w._container1.guid);
            const mv = dom.move(textItem, containerItem);
            return {
                hasRemove: !!mv.remove,
                hasMoveTo: !!mv.moveTo,
                removeHasAplData: !!mv.remove?.aplData?.item,
                moveToHasAplData: !!mv.moveTo?.aplData?.item,
            };
        });
        expect(result.hasRemove).toBe(true);
        expect(result.hasMoveTo).toBe(true);
        expect(result.removeHasAplData).toBe(true);
        expect(result.moveToHasAplData).toBe(true);
    });

    // --- Select container open/close during drag ---

    it('should have _isDragging flag initially false', async () => {
        const dragging = await browser.execute(() => {
            return !!(window as any)._inspector.objectsSelectorComponent._isDragging;
        });
        expect(dragging).toBe(false);
    });

    it('should keep select open when _isDragging is true', async () => {
        const stayedOpen = await browser.execute(() => {
            const objSel = (window as any)._inspector.objectsSelectorComponent;
            objSel.open();
            objSel._isDragging = true;
            objSel.onClose();
            const isOpen = objSel.selectContainer.classList.contains('select-container--active');
            objSel._isDragging = false;
            return isOpen;
        });
        expect(stayedOpen).toBe(true);
    });

    it('should close select when _isDragging is false', async () => {
        const closed = await browser.execute(() => {
            const objSel = (window as any)._inspector.objectsSelectorComponent;
            objSel.open();
            objSel._isDragging = false;
            objSel.onClose();
            return !objSel.selectContainer.classList.contains('select-container--active');
        });
        expect(closed).toBe(true);
    });

    // --- Option indentation ---

    it('should indent child options deeper than parent', async () => {
        const margins = await browser.execute(() => {
            const objSel = (window as any)._inspector.objectsSelectorComponent;
            const options = objSel.selectContainer.querySelectorAll('.select-option');
            return Array.from(options).map((o: any) => parseInt(o.style.marginLeft) || 0);
        });
        expect(margins[1]).toBeGreaterThan(margins[0]);
        expect(margins[2]).toBeGreaterThan(margins[0]);
    });

    // --- Option draggable attribute ---

    it('should make child options draggable but not root', async () => {
        const draggable = await browser.execute(() => {
            const objSel = (window as any)._inspector.objectsSelectorComponent;
            const options = objSel.selectContainer.querySelectorAll('.select-option');
            return Array.from(options).map((o: any) => o.getAttribute('draggable'));
        });
        expect(draggable[0]).toBeFalsy(); // root container not draggable
        expect(draggable[1]).toBe('true');
        expect(draggable[2]).toBe('true');
    });

    // --- Console errors ---

    it('should have no unhandled errors during setup', async () => {
        const errors = await browser.execute(() => (window as any)._unhandledErrors);
        expect(errors).toHaveLength(0);
    });

    it('should have no console errors during setup', async () => {
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
