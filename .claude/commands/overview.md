# Project Overview: BestApps WebComponents Orchestration

Provide a comprehensive overview of this project based on the following analysis.

## What This Project Is

This is a **multi-repo orchestration layer** for the BestApps WebComponents ecosystem. It links together the base framework and the APL components into a single working environment for integration testing and full-application demos.

## Architecture

### Linked Repositories

Both live under `repositories/` (`.gitignored`) and must be cloned separately:

- **repositories/webcomponents/** - the base framework repo (`@bestapps/webcomponents`) containing `BestAppsComponent`, ObjectInspector, ObjectPalette, and shared utilities
- **repositories/webcomponents-apl/** - the APL components repo (`@bestapps/webcomponents-apl`) containing all Alexa Presentation Language components, inspector extensions, and APL-specific tooling. Depends on `@bestapps/webcomponents`.

### Setup

1. Clone this orchestration repo
2. Run `npm run setup` — clones all sub-repos listed in `repositories.json` and runs `npm install` in each
3. Re-run `npm run setup` any time to pull latest and refresh dependencies

Both sub-repos are independent git repositories with their own histories, branches, and remotes.

## APL Component Architecture

All APL components extend `APLComponent` (the base class), which implements the full [APL Component spec](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-component.html).

### Property System (`APLProperties.js`)

Properties are declared in `APLProperties` objects with:
- **`type`**: `text`, `dimension`, `color`, `list`, `commands`, `array`
- **`options.css`**: `true` (same name), `string` (different CSS key), or `string[]` (multiple CSS keys)
- **`options.wrapper`**: applies CSS to `.wrapper` element instead of host
- **`options.apl`**: maps to a different key in APL document JSON
- **`default`**: default value

`APLProperties.encode()` writes values into APLData + applies CSS. `APLProperties.decode()` reads values back.

### Base Component Properties (APLComponent)

- **Sizing**: `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`
- **Padding**: `padding`, `paddingLeft/Top/Right/Bottom`, `paddingStart`, `paddingEnd`
- **Visual**: `opacity`, `display` (normal/invisible/none), `layoutDirection` (LTR/RTL/inherit), `pointerEvents`
- **Shadow**: `shadowColor`, `shadowHorizontalOffset`, `shadowVerticalOffset`, `shadowRadius` → combined into CSS `box-shadow` in `onCSSSet()`
- **Transform**: `transform` → APL transform array converted to CSS transform in `onCSSSet()`
- **State**: `disabled`, `checked`, `inheritParentState`, `when`
- **Accessibility**: `accessibilityLabel`, `role`
- **Metadata**: `name` (maps to APL `id`), `description`

### Base Events (APLComponent)

`onMount`, `onCursorEnter`, `onCursorExit`, `onCursorMove`, `onLayout`

### Component Hierarchy

- `APLComponent` → `APLFrameComponent`, `APLTextComponent`, `APLImageComponent`, `APLDocumentComponent`
- `APLComponent` → `APLMultiChildComponent` → `APLContainerComponent`, `APLSequenceComponent`
- `APLComponent` → `APLActionableComponent` (adds `onFocus`, `onBlur`, key events) → `APLTouchableComponent` (adds touch/gesture events) → `APLTouchWrapperComponent`, `APLEditTextComponent`, `APLScrollViewComponent`

### Shared Property Sets (`APLProperties.js` static methods)

- `getContainerProperties()` → `position` (relative/absolute)
- `getAlignmentAndPositioningProperties()` → `left`, `top`, `right`, `bottom`

Subclasses merge via `Object.assign(super.getAPLProperties(), { ...ownProps })`.

## Integration E2E Tests

This repo contains E2E tests that exercise cross-repo functionality -- scenarios that require both the base framework and the APL layer working together:

- **apl-commands** - APL command system integration
- **apl-component** - base APL component properties, events, and onCSSSet behavior (display/shadow/transform)
- **apl-data-tab** - inspector data tab with APL components
- **apl-decoupled** - decoupled APL component interactions
- **apl-drag-drop** - drag-and-drop from palette to canvas with inspector updates
- **apl-image** - APL image component integration
- **apl-scale-picker** - device scale/resolution picker integration

## Full Demo

`index.html` provides a complete working demo combining all components from both repos -- the visual APL editor with palette, canvas, inspector, device picker, and DOM tree.

## Key Design Patterns

- **Repo separation** - base framework, APL layer, and integration tests each live in their own repo
- **No build step** - plain ES6 classes loaded via `<script>` tags in index.html
- **Integration-only tests** - this repo tests cross-cutting concerns; unit/component tests live in their respective repos

## File Structure

```
index.html                        -- Full demo combining all components
repositories.json                 -- Git URLs for sub-repos (used by npm run setup)
repositories/
  webcomponents/                   -- Base framework repo (.gitignored)
  webcomponents-apl/               -- APL components repo (.gitignored)
scripts/
  setup.js                        -- Clone/pull repos + npm install
  push.js                         -- Cross-platform dispatch for npm publish
  check-versions.sh               -- NPM version/status checker
tests/                            -- Integration E2E tests (WebdriverIO)
```
