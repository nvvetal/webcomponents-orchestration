import { APLComponentFixture, APLContainerFixture, APLFrameFixture, APLEditTextFixture, APLTouchWrapperFixture } from '../../helpers/components';

const fixture = new APLComponentFixture('/tests/fixtures/apl-component.html', '#comp1');
const containerFixture = new APLContainerFixture('/tests/fixtures/apl-component.html', '#container1');
const frameFixture = new APLFrameFixture('/tests/fixtures/apl-component.html', '#frame1');
const editTextFixture = new APLEditTextFixture('/tests/fixtures/apl-component.html', '#edittext1');
const touchWrapperFixture = new APLTouchWrapperFixture('/tests/fixtures/apl-component.html', '#touchwrapper1');

describe('APLComponent — base properties', () => {
    before(() => fixture.open());

    fixture.testBase();

    // --- Sizing & padding ---

    fixture.testHasProperties([
        'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
        'padding', 'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom',
        'paddingStart', 'paddingEnd',
    ]);
    fixture.testPropertyType('width', 'dimension');
    fixture.testPropertyType('height', 'dimension');
    fixture.testPropertyType('paddingStart', 'dimension');
    fixture.testPropertyType('paddingEnd', 'dimension');
    fixture.testPropertyDefault('width', '100%');
    fixture.testPropertyDefault('height', '100%');

    it('paddingStart should map to CSS paddingInlineStart', async () => {
        const def = await fixture.propertyDef('paddingStart');
        expect(def!.options.css).toBe('paddingInlineStart');
    });

    it('paddingEnd should map to CSS paddingInlineEnd', async () => {
        const def = await fixture.propertyDef('paddingEnd');
        expect(def!.options.css).toBe('paddingInlineEnd');
    });

    // --- Visual properties ---

    fixture.testHasProperties(['opacity', 'display', 'layoutDirection', 'pointerEvents']);

    fixture.testPropertyType('opacity', 'text');
    it('opacity should have CSS mapping', async () => {
        expect(await fixture.hasCSSMapping('opacity')).toBe(true);
    });

    fixture.testPropertyType('display', 'list');
    fixture.testPropertyDefault('display', 'normal');
    it('display should have items: normal, invisible, none', async () => {
        const def = await fixture.propertyDef('display');
        expect(def!.items).toEqual(['normal', 'invisible', 'none']);
    });

    fixture.testPropertyType('layoutDirection', 'list');
    fixture.testPropertyDefault('layoutDirection', 'inherit');
    it('layoutDirection should have items: LTR, RTL, inherit', async () => {
        const def = await fixture.propertyDef('layoutDirection');
        expect(def!.items).toEqual(['LTR', 'RTL', 'inherit']);
    });
    it('layoutDirection should map to CSS direction', async () => {
        const def = await fixture.propertyDef('layoutDirection');
        expect(def!.options.css).toBe('direction');
    });

    fixture.testPropertyType('pointerEvents', 'list');
    it('pointerEvents should have items: auto, none', async () => {
        const def = await fixture.propertyDef('pointerEvents');
        expect(def!.items).toEqual(['auto', 'none']);
    });

    // --- Shadow properties ---

    fixture.testHasProperties(['shadowColor', 'shadowHorizontalOffset', 'shadowVerticalOffset', 'shadowRadius']);
    fixture.testPropertyType('shadowColor', 'color');
    fixture.testPropertyType('shadowHorizontalOffset', 'dimension');
    fixture.testPropertyType('shadowVerticalOffset', 'dimension');
    fixture.testPropertyType('shadowRadius', 'dimension');

    // --- Transform ---

    fixture.testHasProperties(['transform']);
    fixture.testPropertyType('transform', 'text');

    // --- State & metadata ---

    fixture.testHasProperties(['disabled', 'checked', 'inheritParentState', 'when', 'description']);
    fixture.testPropertyType('disabled', 'text');
    fixture.testPropertyType('checked', 'text');
    fixture.testPropertyType('when', 'text');

    // --- Accessibility ---

    fixture.testHasProperties(['accessibilityLabel', 'role']);
    fixture.testPropertyType('accessibilityLabel', 'text');
    fixture.testPropertyType('role', 'text');

    // --- Base events ---

    fixture.testHasEvents(['onMount', 'onCursorEnter', 'onCursorExit', 'onCursorMove', 'onLayout']);
});

describe('APLComponent — onCSSSet display logic', () => {
    before(() => fixture.open());

    it('display=invisible should set visibility hidden', async () => {
        await fixture.applyCSSSet({ display: 'invisible' });
        expect(await fixture.getStyle('visibility')).toBe('hidden');
    });

    it('display=none should set display none', async () => {
        await fixture.applyCSSSet({ display: 'none' });
        expect(await fixture.getStyle('display')).toBe('none');
    });

    it('display=normal should clear visibility and display', async () => {
        await fixture.applyCSSSet({ display: 'normal' });
        expect(await fixture.getStyle('visibility')).toBe('');
        expect(await fixture.getStyle('display')).toBe('');
    });
});

describe('APLComponent — onCSSSet shadow logic', () => {
    before(() => fixture.open());

    it('should apply box-shadow when shadowColor is set', async () => {
        await fixture.applyCSSSet({
            shadowColor: '#000000',
            shadowHorizontalOffset: '5px',
            shadowVerticalOffset: '10px',
            shadowRadius: '3px',
        });
        const shadow = await fixture.getStyle('boxShadow');
        expect(shadow).toBeTruthy();
    });

    it('should clear box-shadow when shadowColor is absent', async () => {
        await fixture.applyCSSSet({});
        expect(await fixture.getStyle('boxShadow')).toBe('');
    });
});

describe('APLComponent — onCSSSet transform logic', () => {
    before(() => fixture.open());

    it('should apply CSS transform from APL transform array', async () => {
        await fixture.applyCSSSet({
            transform: [{ rotate: 45 }, { scaleX: 2 }],
        });
        const t = await fixture.getStyle('transform');
        expect(t).toContain('rotate(45deg)');
        expect(t).toContain('scaleX(2)');
    });

    it('should clear transform when empty', async () => {
        await fixture.applyCSSSet({});
        expect(await fixture.getStyle('transform')).toBe('');
    });
});

describe('APLMultiChildComponent — properties via APLContainerComponent', () => {
    before(() => containerFixture.open());

    containerFixture.testHasProperties(['data']);
    containerFixture.testPropertyType('data', 'text');
    containerFixture.testHasEvents(['onChildrenChanged']);
});

describe('APLContainerComponent — container own properties', () => {
    before(() => containerFixture.open());

    containerFixture.testHasProperties(['alignItems', 'direction', 'wrap', 'justifyContent', 'numbered']);
    containerFixture.testPropertyType('numbered', 'text');
});

describe('APLContainerComponent — container child properties (shared helpers)', () => {
    before(() => containerFixture.open());

    containerFixture.testHasProperties([
        'position', 'alignSelf', 'grow', 'shrink', 'spacing', 'numbering',
        'left', 'top', 'right', 'bottom', 'start', 'end',
    ]);

    it('position should include sticky', async () => {
        const def = await containerFixture.propertyDef('position');
        expect(def!.items).toContain('sticky');
    });

    containerFixture.testPropertyType('alignSelf', 'list');
    containerFixture.testPropertyDefault('alignSelf', 'auto');
    it('alignSelf should have CSS mapping', async () => {
        expect(await containerFixture.hasCSSMapping('alignSelf')).toBe(true);
    });

    containerFixture.testPropertyType('grow', 'text');
    containerFixture.testPropertyDefault('grow', '0');
    it('grow should map to CSS flexGrow', async () => {
        const def = await containerFixture.propertyDef('grow');
        expect(def!.options.css).toBe('flexGrow');
    });

    containerFixture.testPropertyType('shrink', 'text');
    containerFixture.testPropertyDefault('shrink', '0');
    it('shrink should map to CSS flexShrink', async () => {
        const def = await containerFixture.propertyDef('shrink');
        expect(def!.options.css).toBe('flexShrink');
    });

    containerFixture.testPropertyType('spacing', 'dimension');

    containerFixture.testPropertyType('numbering', 'list');
    containerFixture.testPropertyDefault('numbering', 'normal');
    it('numbering should have items: normal, skip, reset', async () => {
        const def = await containerFixture.propertyDef('numbering');
        expect(def!.items).toEqual(['normal', 'skip', 'reset']);
    });

    containerFixture.testPropertyType('start', 'dimension');
    containerFixture.testPropertyType('end', 'dimension');
});

describe('APLContainerComponent — shadow inherited from base', () => {
    before(() => containerFixture.open());

    it('should inherit shadowColor from APLComponent base', async () => {
        const keys = await containerFixture.propertyKeys();
        expect(keys).toContain('shadowColor');
        expect(keys).toContain('shadowHorizontalOffset');
        expect(keys).toContain('shadowVerticalOffset');
        expect(keys).toContain('shadowRadius');
    });

    it('shadowColor type should be color', async () => {
        const def = await containerFixture.propertyDef('shadowColor');
        expect(def!.type).toBe('color');
    });
});

describe('APLFrameComponent — own properties', () => {
    before(() => frameFixture.open());

    frameFixture.testFrame();

    frameFixture.testHasProperties([
        'borderBottomLeftRadius', 'borderBottomRightRadius',
        'borderTopLeftRadius', 'borderTopRightRadius',
        'borderStrokeWidth',
    ]);

    frameFixture.testPropertyType('borderBottomLeftRadius', 'dimension');
    frameFixture.testPropertyType('borderBottomRightRadius', 'dimension');
    frameFixture.testPropertyType('borderTopLeftRadius', 'dimension');
    frameFixture.testPropertyType('borderTopRightRadius', 'dimension');
    frameFixture.testPropertyType('borderStrokeWidth', 'dimension');

    it('borderBottomLeftRadius should have CSS mapping', async () => {
        expect(await frameFixture.hasCSSMapping('borderBottomLeftRadius')).toBe(true);
    });

    it('borderBottomRightRadius should have CSS mapping', async () => {
        expect(await frameFixture.hasCSSMapping('borderBottomRightRadius')).toBe(true);
    });

    it('borderTopLeftRadius should have CSS mapping', async () => {
        expect(await frameFixture.hasCSSMapping('borderTopLeftRadius')).toBe(true);
    });

    it('borderTopRightRadius should have CSS mapping', async () => {
        expect(await frameFixture.hasCSSMapping('borderTopRightRadius')).toBe(true);
    });

    it('borderStrokeWidth should NOT have CSS mapping', async () => {
        expect(await frameFixture.hasCSSMapping('borderStrokeWidth')).toBe(false);
    });
});

describe('APLEditTextComponent — properties and events', () => {
    before(() => editTextFixture.open());

    editTextFixture.testEditText();

    // --- All new properties ---

    editTextFixture.testHasProperties([
        'fontFamily', 'fontSize', 'fontStyle', 'fontWeight',
        'borderColor', 'borderWidth', 'borderStrokeWidth',
        'hint', 'maxLength', 'secureInput', 'size',
        'submitKeyType', 'keyboardType', 'selectOnFocus', 'lang',
        'highlightColor', 'hintColor', 'hintStyle', 'hintWeight',
        'validCharacters',
    ]);

    // --- Events ---

    editTextFixture.testHasEvents(['onTextChange', 'onSubmit']);

    it('should inherit actionable events', async () => {
        const keys = await editTextFixture.eventKeys();
        expect(keys).toContain('onFocus');
        expect(keys).toContain('onBlur');
        expect(keys).toContain('handleKeyDown');
        expect(keys).toContain('handleKeyUp');
    });

    // --- Type assertions ---

    editTextFixture.testPropertyType('fontFamily', 'text');
    editTextFixture.testPropertyType('fontSize', 'dimension');
    editTextFixture.testPropertyType('fontStyle', 'list');
    editTextFixture.testPropertyType('fontWeight', 'text');
    editTextFixture.testPropertyType('borderColor', 'color');
    editTextFixture.testPropertyType('borderWidth', 'dimension');
    editTextFixture.testPropertyType('borderStrokeWidth', 'dimension');
    editTextFixture.testPropertyType('hint', 'text');
    editTextFixture.testPropertyType('maxLength', 'text');
    editTextFixture.testPropertyType('secureInput', 'text');
    editTextFixture.testPropertyType('size', 'text');
    editTextFixture.testPropertyType('submitKeyType', 'list');
    editTextFixture.testPropertyType('keyboardType', 'list');
    editTextFixture.testPropertyType('highlightColor', 'color');
    editTextFixture.testPropertyType('hintColor', 'color');
    editTextFixture.testPropertyType('hintStyle', 'list');
    editTextFixture.testPropertyType('hintWeight', 'text');
    editTextFixture.testPropertyType('validCharacters', 'text');

    // --- Default values ---

    editTextFixture.testPropertyDefault('fontFamily', 'sans-serif');
    editTextFixture.testPropertyDefault('fontSize', '40dp');
    editTextFixture.testPropertyDefault('fontStyle', 'normal');
    editTextFixture.testPropertyDefault('fontWeight', 'normal');
    editTextFixture.testPropertyDefault('size', '8');
    editTextFixture.testPropertyDefault('submitKeyType', 'done');
    editTextFixture.testPropertyDefault('keyboardType', 'normal');
    editTextFixture.testPropertyDefault('hintStyle', 'normal');
    editTextFixture.testPropertyDefault('hintWeight', 'normal');

    // --- CSS mappings ---

    it('fontFamily should have CSS mapping', async () => {
        expect(await editTextFixture.hasCSSMapping('fontFamily')).toBe(true);
    });

    it('fontSize should have CSS mapping', async () => {
        expect(await editTextFixture.hasCSSMapping('fontSize')).toBe(true);
    });

    it('fontStyle should have CSS mapping', async () => {
        expect(await editTextFixture.hasCSSMapping('fontStyle')).toBe(true);
    });

    it('fontWeight should have CSS mapping', async () => {
        expect(await editTextFixture.hasCSSMapping('fontWeight')).toBe(true);
    });

    it('borderColor should have CSS mapping', async () => {
        expect(await editTextFixture.hasCSSMapping('borderColor')).toBe(true);
    });

    it('borderWidth should NOT have CSS mapping (uses onCSSSet)', async () => {
        expect(await editTextFixture.hasCSSMapping('borderWidth')).toBe(false);
    });

    // --- Enum items ---

    it('fontStyle should have items: normal, italic', async () => {
        const def = await editTextFixture.propertyDef('fontStyle');
        expect(def!.items).toEqual(['normal', 'italic']);
    });

    it('submitKeyType should have items: done, go, next, search, send', async () => {
        const def = await editTextFixture.propertyDef('submitKeyType');
        expect(def!.items).toEqual(['done', 'go', 'next', 'search', 'send']);
    });

    it('keyboardType should have items: decimalPad, emailAddress, normal, numberPad, phonePad, url', async () => {
        const def = await editTextFixture.propertyDef('keyboardType');
        expect(def!.items).toEqual(['decimalPad', 'emailAddress', 'normal', 'numberPad', 'phonePad', 'url']);
    });

    it('hintStyle should have items: normal, italic', async () => {
        const def = await editTextFixture.propertyDef('hintStyle');
        expect(def!.items).toEqual(['normal', 'italic']);
    });
});

describe('APLTouchWrapperComponent — properties and events', () => {
    before(() => touchWrapperFixture.open());

    touchWrapperFixture.testTouchWrapper();

    it('should inherit touchable events', async () => {
        const keys = await touchWrapperFixture.eventKeys();
        expect(keys).toContain('gesture');
        expect(keys).toContain('gestures');
        expect(keys).toContain('onCancel');
        expect(keys).toContain('onDown');
        expect(keys).toContain('onMove');
        expect(keys).toContain('onPress');
        expect(keys).toContain('onUp');
    });

    it('should inherit actionable events', async () => {
        const keys = await touchWrapperFixture.eventKeys();
        expect(keys).toContain('onFocus');
        expect(keys).toContain('onBlur');
        expect(keys).toContain('handleKeyDown');
        expect(keys).toContain('handleKeyUp');
    });

    it('shouldCaptureClick should return true', async () => {
        expect(await touchWrapperFixture.shouldCaptureClick()).toBe(true);
    });

    it('should have container positioning properties', async () => {
        const keys = await touchWrapperFixture.propertyKeys();
        expect(keys).toContain('position');
        expect(keys).toContain('alignSelf');
        expect(keys).toContain('grow');
        expect(keys).toContain('shrink');
    });

    it('should have alignment properties', async () => {
        const keys = await touchWrapperFixture.propertyKeys();
        expect(keys).toContain('left');
        expect(keys).toContain('top');
        expect(keys).toContain('right');
        expect(keys).toContain('bottom');
        expect(keys).toContain('start');
        expect(keys).toContain('end');
    });
});
