# APL Component Properties

Reference for implementing APL component properties per the Amazon APL spec. Use this when adding or modifying properties on any APL component.

## Spec URLs

| Component | URL |
|---|---|
| Base Component | https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-component.html |
| Actionable | https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-actionable-component.html |
| Touchable | https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-touchable-component.html |
| Multi-child | https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-multichild-component.html |

## Component Hierarchy

```
APLComponent (base)
├── APLFrameComponent
├── APLTextComponent
├── APLImageComponent
├── APLDocumentComponent
├── APLMultiChildComponent
│   └── APLContainerComponent
└── APLActionableComponent
    └── APLTouchableComponent
        ├── APLTouchWrapperComponent
        ├── APLEditTextComponent
        └── APLScrollViewComponent
```

All files live in `repositories/webcomponents-apl/ui/components/`.

## Property System

Properties are declared in `APLProperties` objects and processed by `APLProperties.js` (`encode` writes values + applies CSS, `decode` reads values back).

### Property Definition Format

```javascript
propertyName: {
    type: 'text',           // text | dimension | color | list | commands | array
    default: 'value',       // optional default value
    items: ['a', 'b'],      // only for type: 'list' — enum options
    options: {
        css: true,           // true = same CSS key, 'cssKey' = different key, ['a','b'] = multiple keys
        wrapper: true,       // apply CSS to .wrapper instead of :host
        apl: 'aplKey',       // map to different key in APL document JSON
        property: 'name',    // use getter method getAPL{Name}() for decode
        visual: 'picker',    // custom inspector control
    }
}
```

### Types

| Type | Use for | CSS conversion |
|---|---|---|
| `text` | Strings, numbers, booleans | None — value passed as-is |
| `dimension` | Sizes with units (dp, px, %, vh, vw) | Converted via `screen.getSizePixels()` |
| `color` | Color values (#hex, rgb, named) | None |
| `list` | Enums with fixed options | Mapped through `items` array |
| `commands` | Event handler command arrays | N/A (events only) |
| `array` | Array structures | None |

### Adding Properties — Pattern

Subclasses merge properties via `Object.assign`:

```javascript
getAPLProperties() {
    let properties = super.getAPLProperties();
    properties = Object.assign(properties, {
        myProp: { type: 'text', options: { css: true } },
    });
    // optionally mix in shared property sets:
    properties = Object.assign(APLProperties.getContainerProperties(), properties);
    properties = Object.assign(APLProperties.getAlignmentAndPositioningProperties(), properties);
    return properties;
}
```

Events follow the same pattern with `getAPLEvents()` and `super.getAPLEvents()`.

### Shared Property Sets (APLProperties.js static methods)

| Method | Properties |
|---|---|
| `getContainerProperties()` | `position` (relative/absolute/sticky), `alignSelf`, `grow` (→flexGrow), `shrink` (→flexShrink), `spacing`, `numbering` |
| `getAlignmentAndPositioningProperties()` | `left`, `top`, `right`, `bottom`, `start`, `end` |

Used by: APLContainerComponent, APLFrameComponent, APLImageComponent, APLTextComponent, APLTouchWrapperComponent.

## What's Implemented Per Layer

### APLComponent (base) — 29 properties, 5 events

**Sizing**: `name`, `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`
**Padding**: `padding`, `paddingLeft/Top/Right/Bottom`, `paddingStart`, `paddingEnd`
**Visual**: `opacity`, `display` (normal/invisible/none), `layoutDirection` (LTR/RTL/inherit), `pointerEvents`
**Shadow**: `shadowColor`, `shadowHorizontalOffset`, `shadowVerticalOffset`, `shadowRadius`
**Other**: `transform`, `disabled`, `checked`, `inheritParentState`, `when`, `description`, `accessibilityLabel`, `role`
**Events**: `onMount`, `onCursorEnter`, `onCursorExit`, `onCursorMove`, `onLayout`

### APLActionableComponent — 4 events (no new properties)

**Events**: `onFocus`, `onBlur`, `handleKeyDown`, `handleKeyUp`

### APLTouchableComponent — 7 events (no new properties)

**Events**: `gesture`, `gestures`, `onCancel`, `onDown`, `onMove`, `onPress`, `onUp`

### APLMultiChildComponent — 1 property, 1 event

**Properties**: `data`
**Events**: `onChildrenChanged`
Note: `items`, `firstItem`, `lastItem` are structural child definitions handled by APLLoader — not declared as properties to avoid array→string corruption in the inspector.

### APLFrameComponent — 10 properties (no events)

**Existing**: `background` (color, css), `backgroundColor` (color, css), `borderColor` (color, css), `borderRadius` (dimension, css), `borderWidth` (dimension, custom onCSSSet)
**Added**: `borderBottomLeftRadius`, `borderBottomRightRadius`, `borderTopLeftRadius`, `borderTopRightRadius` (dimension, css:true), `borderStrokeWidth` (dimension, data-only)
Also inherits shared container/positioning properties via `getContainerProperties()` + `getAlignmentAndPositioningProperties()`.

### APLImageComponent — 8 properties, 2 events

**Existing**: `align` (text, css), `borderRadius` (dimension, css), `source` (text), `sources` (text), `scale` (list)
**Added**: `filters` (text), `overlayColor` (color), `overlayGradient` (text)
**Events**: `onLoad`, `onFail`
Also inherits shared container/positioning properties.

### APLEditTextComponent — 22 properties, 2 events

Extends APLActionableComponent (inherits `onFocus`, `onBlur`, `handleKeyDown`, `handleKeyUp`).
**Existing**: `text` (text), `color` (color, css)
**Typography**: `fontFamily` (text, css, default: sans-serif), `fontSize` (dimension, css, default: 40dp), `fontStyle` (list normal/italic, css), `fontWeight` (text, css)
**Border**: `borderColor` (color, css), `borderWidth` (dimension, onCSSSet), `borderStrokeWidth` (dimension, data-only)
**Input behavior (onCSSSet)**: `hint` → placeholder, `secureInput` → input type, `maxLength`, `size`, `submitKeyType` → enterKeyHint, `keyboardType` → inputMode
**Data-only**: `highlightColor`, `hintColor`, `hintStyle`, `hintWeight`, `selectOnFocus`, `lang`, `validCharacters`
**Events**: `onTextChange`, `onSubmit`

### APLTouchWrapperComponent — no own properties (no own events)

Extends APLTouchableComponent (inherits all touchable + actionable + base events).
Custom `onCSSSet()` applies width/height as min/max bounds. `shouldCaptureClick()` returns true.
Also inherits shared container/positioning properties via `getContainerProperties()` + `getAlignmentAndPositioningProperties()`.

## Custom onCSSSet() Logic

Properties that can't use simple `css:` mapping are handled in `onCSSSet()`:

| Feature | Properties | CSS output |
|---|---|---|
| Display | `display` | `visibility: hidden` or `display: none` |
| Shadow | `shadowColor` + offsets + radius | Combined into `box-shadow` |
| Transform | `transform` (array) | Converted to CSS `transform` string |
| Position | `left/top/right/bottom` | Applied via `getSizePixels()` when `position: absolute` |

## Deferred Properties (need runtime infrastructure)

`bind`, `entities`/`entity`, `handleTick`, `handleVisibilityChange`, `actions`, `speech`, `onSpeechMark`, `preserve`, `style`, `trackChanges` — these require engines (data binding, timers, observers, audio) that don't exist yet.

## Testing

Tests live in `tests/specs/apl-component/apl-component.test.ts` with fixture `tests/fixtures/apl-component.html`.

Test helpers from `APLComponentFixture`:
- `testHasProperties(['prop1', 'prop2'])` — verify properties exist
- `testHasEvents(['event1'])` — verify events exist
- `testPropertyType('prop', 'dimension')` — verify type
- `testPropertyDefault('prop', 'value')` — verify default
- `hasCSSMapping('prop')` — check CSS option
- `applyCSSSet(data)` — test onCSSSet() with mock factory
- `getStyle('cssKey')` — read computed style after onCSSSet()
