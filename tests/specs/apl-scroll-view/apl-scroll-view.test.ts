import { browser } from '@wdio/globals';
import { APLScrollViewFixture } from '../../helpers/components';

const fixture = new APLScrollViewFixture('/tests/fixtures/apl-scroll-view.html', '#scrollview1');

describe('APLScrollViewComponent — base + actionable', () => {
    before(() => fixture.open());

    fixture.testScrollView();
});

describe('APLScrollViewComponent — onScroll event', () => {
    before(() => fixture.open());

    it('should have onScroll in event keys', async () => {
        const keys = await fixture.eventKeys();
        expect(keys).toContain('onScroll');
    });

    it('onScroll should be type "commands"', async () => {
        const events = await browser.execute((sel: string) => {
            const el = document.querySelector(sel) as any;
            const ev = el?.getAPLEvents?.()?.onScroll;
            if (!ev) return null;
            return { type: ev.type };
        }, '#scrollview1');
        expect(events).toBeTruthy();
        expect(events!.type).toBe('commands');
    });
});

describe('APLScrollViewComponent — inherited actionable events', () => {
    before(() => fixture.open());

    it('should have onFocus event', async () => {
        const keys = await fixture.eventKeys();
        expect(keys).toContain('onFocus');
    });

    it('should have onBlur event', async () => {
        const keys = await fixture.eventKeys();
        expect(keys).toContain('onBlur');
    });

    it('should have handleKeyDown event', async () => {
        const keys = await fixture.eventKeys();
        expect(keys).toContain('handleKeyDown');
    });

    it('should have handleKeyUp event', async () => {
        const keys = await fixture.eventKeys();
        expect(keys).toContain('handleKeyUp');
    });
});

describe('APLScrollViewComponent — CSS', () => {
    before(() => fixture.open());

    it('.wrapper should have overflow auto', async () => {
        const overflow = await fixture.getWrapperOverflow();
        expect(overflow).toBe('auto');
    });
});

describe('APLScrollViewComponent — inherited base properties', () => {
    before(() => fixture.open());

    fixture.testHasProperties([
        'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
        'padding', 'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom',
    ]);

    fixture.testHasProperties(['opacity', 'display', 'layoutDirection']);

    fixture.testHasProperties(['shadowColor', 'shadowHorizontalOffset', 'shadowVerticalOffset', 'shadowRadius']);

    fixture.testHasProperties(['disabled', 'when', 'description', 'accessibilityLabel', 'role']);
});
