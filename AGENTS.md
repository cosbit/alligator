# AGENTS
! UPDATE THIS FILE ON EACH CONTEXT. THIS FILE SHOULD GROW LARGER AND LARGER. SPECIFY THE PURPUSE OF EACH FILE AND WHAT IT CONTAINS. ! 

## Purpose
Canonical architecture notes and workflow for the Alligator AGS widget set.

## Layout and growth
- `src/app.ts` is the entry point that registers windows and global setup (current implementation).
- `src/config.ts` is a legacy entry-point note; if reintroduced, keep it as a thin registrar.
- `src/style.scss` holds global styling and tile sizing/tiling rules; keep it lean and split into `src/styles/` as the theme grows.
- `src/styles/bar.scss` should hold Bar container layout and transparency rules (no tile sizing).
- `src/widgets/` should contain standalone widget factories (sidebar, panels, modules) if introduced later.
- `src/widget/` is the current widget directory; keep tile factories and Bar layout components here.
- `src/widget/<tile>/index.tsx` files are minimal tile factories (placeholders) with tile root classes for later content.
- `src/services/` should contain long-lived data sources or integrations.
- `src/utils/` should contain shared helpers with no UI coupling.
- `src/assets/` should contain images, icons, and other static resources.
- `prompts/` holds planning prompts for molecular widget tasks; each file is a discrete build step.

## Development workflow
- Enter the dev shell: `nix develop`
- Run the config locally: `ags -c ./src/app.ts`

## Conventions
- Keep windows named and stable so `ags toggle <name>` works predictably.
- Prefer simple widget factories over large monoliths in `config.ts`.
- Keep UI layout empty/transparent by default; fill in modules incrementally.
- Use GJS + GTK4 consistently (avoid GTK3 imports in new work).
- Use GTK CSS for presentation only; avoid web flexbox properties and move layout semantics into GTK widget props (`spacing`, `halign`, `valign`, `hexpand`, `vexpand`) or container structure.
- Use AGS Accessor bindings for state; call Accessors as functions inside `createComputed` to track dependencies.
- Prefer `createBinding` to GObject properties when available; fall back to `createPoll` for CLI commands and keep intervals modest.
- Keep binding helpers small and readable; derive display strings with `createComputed` rather than ad-hoc `setTimeout`/poll loops.

## Binding tips and references
- Accessors: `createState` for local writable state, `createComputed` for derived values, `createBinding` for GObject properties.
- Polling: `createPoll(initial, intervalMs, commandOrFn)` for external commands; prefer event-driven sources when possible.
- Accessor usage: `value()` reads current value; `value((v) => ...)` is shorthand for `createComputed`.

## Sidebar tile architecture (molecular components)
- The Bar window is a transparent container that only handles layout and spacing for tiles.
- Tiles are atomic subwidgets that render single information modules (clock, date, battery, power actions, storage, network).
- Tile shapes and proportions are standardized: square tiles are base units; vertical tiles are 2x height; horizontal tiles are 2x width.
- Global tiling, spacing, and sizing live in `src/style.scss`; per-tile typography and internal layout live with the tile files.
- Each tile should own its own directory under `src/widget/<tile>/` for markup and tile-specific styles.
- Layout plan:
  - Row 1: square tile, square tile.
  - Row 2: horizontal tile.
  - Row 3: vertical tile left, two square tiles right.
  - Row 4: horizontal tile.
  - Row 5: square tile.


## Production goal
- Toggle the sidebar: `ags toggle sidebar`

## File notes
- `AGENTS.md` captures workflow rules and running architecture notes for the repo.
- `src/widget/Bar.tsx` defines the Bar window container and tile layout rows.
- `src/widget/Bar.tsx` now uses GTK4 imports, sets `name="sidebar"`, and renders row containers under `.bar__inner`.
- `src/widget/Bar.tsx` now applies GTK layout props (`spacing`, `halign`) to replace flexbox-style alignment.
- `src/widget/Bar.tsx` now renders tile placeholders with `.tile` shape classes to match the layout rows.
- `src/style.scss` defines global tile sizing, spacing, and layout rules for the sidebar; it now imports the Bar-specific partial and avoids unsupported GTK4 CSS sizing properties.
- `src/style.scss` now defines global CSS variables for bar width, tile unit sizing, gutter spacing, and Gruvbox palette tokens, plus `.tile` sizing and shape variants with dark/light theme classes.
- `src/style.scss` now uses `background-color` for `.tile--dark` and `.tile--light` so tiles render solid fills.
- `src/styles/bar.scss` defines Bar container transparency, width, spacing, and row alignment rules (layout-only).
- `src/styles/bar.scss` now only contains GTK CSS-friendly presentation rules (no flexbox layout properties).
- `prompts/01-bar-container.md` defines the prompt for the transparent Bar container setup.
- `prompts/02-global-tiling-scss.md` defines the prompt for global tile sizing and layout SCSS.
- `prompts/02-global-tiling-scss.md` now emphasizes fixed-size, non-growing tiles, lists explicit tile classes, adds Gruvbox theme tokens plus dark/light tile variants, and keeps instructions GTK4-CSS-friendly with `src/style.scss` as the only file to edit.
- `prompts/03-layout-rows.md` defines the prompt for assembling the tile layout rows.
- `prompts/04-tile-scaffold.md` defines the prompt for scaffolding tile directories and exports.
- `prompts/05-clock-tile.md` defines the prompt for the clock tile content and styles.
- `prompts/05-clock-tile.md` now specifies a createPoll Accessor bound to the `date` command, minute-formatted time output, light theme styling, centered label margins, and logic-first/layout-last file ordering.
- `prompts/06-date-tile.md` defines the prompt for the date tile content and styles.
- `prompts/07-battery-tile.md` defines the prompt for the battery tile content and styles.
- `prompts/08-power-actions-tile.md` defines the prompt for the power actions tile content and styles.
- `prompts/09-storage-tile.md` defines the prompt for the storage tile content and styles.
- `prompts/10-network-tile.md` defines the prompt for the network tile content and styles.
- `src/widget/clock/index.tsx` defines the clock tile placeholder component with the `tile--clock` root class.
- `src/widget/clock/index.tsx` now centers the clock tile and disables expansion so it stays square-sized.
- `src/widget/date/index.tsx` defines the date tile placeholder component with the `tile--date` root class.
- `src/widget/battery/index.tsx` defines the battery tile placeholder component with the `tile--battery` root class.
- `src/widget/power-actions/index.tsx` defines the power actions tile placeholder component with the `tile--power-actions` root class.
- `src/widget/storage/index.tsx` defines the storage tile placeholder component with the `tile--storage` root class.
- `src/widget/network/index.tsx` defines the network tile placeholder component with the `tile--network` root class.
- `src/widget/clock/index.tsx` now implements the clock tile using a `createPoll` helper bound to the `date` command and centers a time label inside a light-themed square tile.
- `src/widget/clock/style.scss` styles the clock tile typography and adds gentle label margins for optical balance.
- `src/widget/Bar.tsx` now renders the clock tile in the first square slot of the top row.
- `src/style.scss` now imports the clock tile stylesheet so the tile-level typography rules are loaded with the global CSS.
