import { APLImageFixture } from '../../helpers/Component';

const fixture = new APLImageFixture('/tests/fixtures/apl-image.html', '#image1');

describe('APLImageComponent', () => {
    before(() => fixture.open());

    fixture.testImage();

    it('should have all scale options', async () => {
        const def = await fixture.propertyDef('scale');
        expect(def!.items).toEqual(['fill', 'best-fill', 'best-fit', 'best-fit-down', 'none']);
    });

    it('should have visual scale-picker option', async () => {
        const def = await fixture.propertyDef('scale');
        expect(def!.options.visual).toBe('scale-picker');
    });

    it('borderRadius should have CSS mapping', async () => {
        expect(await fixture.hasCSSMapping('borderRadius')).toBe(true);
    });
});
