# Styles and UI library

Detail behind the "Styles" section of [`AGENTS.md`](../AGENTS.md), plus the two libraries the canon does not describe: `libs/ui` and `libs/editor`.

Themes: `html` (light), `html.dark-theme` (dark).

## Color tokens

Every colour comes from a `--themed-*` variable in `libs/ui/src/lib/styles/_theme-colors.scss`:

```scss
background: var(--themed-primary-bg);
color: var(--themed-text-secondary);
```

Stylelint enforces this in `yarn lint:styles`: hex values, named colours and `rgb()`/`hsl()`-family functions fail anywhere, properties ending in `color` plus `fill`/`stroke` take nothing but a `--themed-*` variable, and reading a `var(--mat-*)` fails in any property. Material tokens are only ever written to — `libs/ui` assigns them `--themed-*` values, which is how the theme reaches Material. A colour with no token yet gets one added to `_theme-colors.scss` in the same change.

The palette sources and the image overlays are the exceptions, listed as overrides in `.stylelintrc.json`. An overlay sits on top of a picture and needs a fixed dark translucent background so white text stays readable over any image, whatever the theme — those hard-coded colours are intentional and carry an `// Intentional:` comment. Do not "fix" them.

## Size tokens

All size tokens live in `libs/ui/src/lib/styles/_tokens.scss`:

- **Breakpoints**: `$breakpoint-tablet: 768px`, `$breakpoint-desktop: 1024px` — the values are repeated deliberately, because `@drevo-web/ui` → `breakpoints` has to agree with them
- **Layout**: `$header-height`, `$sidebar-width`, `$sidebar-collapsed-width` — read the current values from `_tokens.scss`; they are not restated here, so they cannot go stale here

Never define local CSS custom properties for sizes in component styles — add a new token to `_tokens.scss`.

Modals get their flex layout from `.ui-modal-panel` in `libs/ui/src/lib/styles/_modal.scss`. `ModalConfig` takes `width`, `maxWidth`, `height`, `border: false` for a borderless modal and `disableClose`; `maxHeight` is not among them — `ModalService` sets it from `position` alone, `90vh` for a centered dialog and `66.67vh` for a bottom sheet. `position: 'bottom'` also changes the width defaults (`100vw` instead of `500px` / `90vw`) and adds the `ui-modal-bottom-sheet` class, so size a bottom sheet against those, not against the centered ones.

## UI library (`libs/ui`)

Everything is exported from `@drevo-web/ui`, and `libs/ui/src/index.ts` is the live list — read it before building a component by hand. The library covers more than the obvious set: a tooltip, a line clamp, a side panel and a navigation progress bar are already there.

What the export names alone do not tell you:

| Component | Notes |
|-----------|-------|
| `ui-badge` | Input: `value: number \| string` |
| `ui-banner` | Content projection wrapper (flex column, border, background) |
| `ui-status-icon` | Input: `ApprovalStatus` (`-1`/`0`/`1`) |
| `ui-tabs-group` | Ships the `TabGroup` and `TabGroupItem` interfaces |
| `ui-dropdown-menu` | Ships `uiDropdownMenuTrigger` and `ui-dropdown-menu-item` |
| `ui-virtual-scroller` | Ships the `uiVirtualScrollerItem` directive |
| Modal | No selector — opened through `ModalService` |
| `formatDate` pipe | Date and time: "15 января 2025, 14:30" |

Angular Material stays inside `libs/ui`; the rest of the workspace consumes it through these components and the `--themed-*` tokens.

## Editor library (`libs/editor`)

CodeMirror 6 editor for wiki markup with syntax highlighting:

```html
<lib-editor
    [content]="wikiText"
    [linksStatus]="linksValidity"
    (contentChanged)="onEdit($event)"
    (updateLinksEvent)="validateLinks($event)" />
```

- `WikiHighlighterService` does the highlighting with link validation
- SSR-safe: checks `EditorFactoryService.isServer()` before creating the `EditorView`
- Emits `updateLinksEvent` with the article's links for async validation
