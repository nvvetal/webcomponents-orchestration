# Project Overview: BestApps WebComponents Orchestration

Provide a comprehensive overview of this project based on the following analysis.

## What This Project Is

This is a **multi-repo orchestration layer** for the BestApps WebComponents ecosystem. It links together the base framework and the APL components into a single working environment for integration testing and full-application demos.

## Architecture

### Linked Repositories

Both are `.gitignored` and must be cloned separately into this directory:

- **webcomponents/** - the base framework repo containing `BestAppsComponent`, ObjectInspector, ObjectPalette, and shared utilities
- **webcomponents-apl/** - the APL components repo containing all Alexa Presentation Language components, inspector extensions, and APL-specific tooling

### Setup

1. Clone this orchestration repo
2. Clone the base framework repo into `webcomponents/`
3. Clone the APL repo into `webcomponents-apl/`

Both sub-repos are independent git repositories with their own histories, branches, and remotes.

## Integration E2E Tests

This repo contains E2E tests that exercise cross-repo functionality -- scenarios that require both the base framework and the APL layer working together:

- **apl-commands** - APL command system integration
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
webcomponents/                    -- Base framework repo (.gitignored)
webcomponents-apl/                -- APL components repo (.gitignored)
tests/                            -- Integration E2E tests (WebdriverIO)
```
