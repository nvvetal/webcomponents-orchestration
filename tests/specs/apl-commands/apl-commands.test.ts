import { browser, expect } from '@wdio/globals';

describe('APL Commands', () => {
    before(async () => {
        await browser.url('/tests/fixtures/apl-commands.html');
        await browser.waitUntil(
            async () => browser.execute(() => !!(window as any)._testReady),
            { timeout: 5000 },
        );
    });

    it('APLCommand should generate a uid', async () => {
        const uid = await browser.execute(() => new APLCommand().uid);
        expect(uid).toBeTruthy();
        expect(uid.length).toBe(12);
    });

    it('APLCommand should store base properties', async () => {
        const keys = await browser.execute(() => {
            return Object.keys(new APLCommand({ type: 'Test' }).getAll());
        });
        expect(keys).toContain('type');
        expect(keys).toContain('description');
        expect(keys).toContain('delay');
        expect(keys).toContain('when');
    });

    it('APLSendEventCommand should return separate arguments and components', async () => {
        const result = await browser.execute(() => {
            const cmd = new APLSendEventCommand({
                arguments: ['a', 'b'],
                components: ['comp1'],
            });
            return {
                args: cmd.arguments,
                comps: cmd.components,
                argsLen: cmd.arguments.length,
                compsLen: cmd.components.length,
            };
        });
        expect(result.argsLen).toBe(2);
        expect(result.compsLen).toBe(1);
        expect(result.args).toEqual(['a', 'b']);
        expect(result.comps).toEqual(['comp1']);
    });

    it('getOther() should return only non-standard properties', async () => {
        const result = await browser.execute(() => {
            const cmd = new APLCommand({ type: 'Test', customProp: 'hello', extra: 42 });
            const other = cmd.getOther();
            return {
                keys: Object.keys(other),
                hasCustomProp: 'customProp' in other,
                hasExtra: 'extra' in other,
                hasType: 'type' in other,
                hasDelay: 'delay' in other,
                customDefault: other.customProp?.default,
                extraDefault: other.extra?.default,
            };
        });
        expect(result.hasCustomProp).toBe(true);
        expect(result.hasExtra).toBe(true);
        expect(result.hasType).toBe(false);
        expect(result.hasDelay).toBe(false);
        expect(result.customDefault).toBe('hello');
        expect(result.extraDefault).toBe(42);
    });

    it('getOther() should include falsy values like 0 and empty string', async () => {
        const result = await browser.execute(() => {
            const cmd = new APLCommand({ type: 'Test', zeroProp: 0, emptyProp: '' });
            const other = cmd.getOther();
            return {
                hasZero: 'zeroProp' in other,
                hasEmpty: 'emptyProp' in other,
                zeroDefault: other.zeroProp?.default,
                emptyDefault: other.emptyProp?.default,
            };
        });
        expect(result.hasZero).toBe(true);
        expect(result.hasEmpty).toBe(true);
        expect(result.zeroDefault).toBe(0);
        expect(result.emptyDefault).toBe('');
    });

    it('getOther() should not return standard properties', async () => {
        const result = await browser.execute(() => {
            const cmd = new APLCommand({ type: 'Test' });
            const other = cmd.getOther();
            return {
                hasType: 'type' in other,
                hasDescription: 'description' in other,
                hasDelay: 'delay' in other,
            };
        });
        expect(result.hasType).toBe(false);
        expect(result.hasDescription).toBe(false);
        expect(result.hasDelay).toBe(false);
    });

    it('APLSetValueCommand should store componentId, property, value', async () => {
        const result = await browser.execute(() => {
            const cmd = new APLSetValueCommand({
                componentId: 'comp1',
                property: 'text',
                value: 'hello',
            });
            return {
                componentId: cmd.componentId,
                property: cmd.property,
                value: cmd.value,
                type: cmd.type,
            };
        });
        expect(result.componentId).toBe('comp1');
        expect(result.property).toBe('text');
        expect(result.value).toBe('hello');
        expect(result.type).toBe('SetValue');
    });
});
