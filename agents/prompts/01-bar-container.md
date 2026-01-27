# Prompt: Transparent Bar container (GJS + GTK4)

Goal
- Set up the Bar window as a transparent container that only owns layout wrappers.

Context
- The Bar is the main sidebar container and should not include tile-specific content yet.
- Keep window naming stable so `ags toggle sidebar` works.
- Stay consistent with GJS + GTK4 (no GTK3 imports).

GTK4 component requirements
- Use GTK4-compatible imports (for example from `astal/gtk4`) and avoid `astal/gtk3`.
- Use TSX tags that map to GTK4 widgets: `<window>`, `<box>`, and optional `<centerbox>` for alignment.
- Do not add tile content or tile-specific widgets in this step.

TSX structure (Bar container)
- `src/widget/Bar.tsx` should export `Bar(gdkmonitor: Gdk.Monitor)` that returns a `window` root.
- Root `window` classes: `Bar` (window root), and a layout wrapper `bar__inner` inside.
- Inside `bar__inner`, add row containers as empty `box` elements with classes:
  - `bar__row bar__row--pair` (row 1, two square tiles)
  - `bar__row bar__row--single` (row 2, horizontal tile)
  - `bar__row bar__row--split` (row 3, vertical-left + right stack)
  - `bar__row bar__row--single` (row 4, horizontal tile)
  - `bar__row bar__row--single` (row 5, square tile)
- Keep the row boxes empty placeholders for now (tile placeholders arrive in a later prompt).

SCSS structure (Bar container)
- Create a bar-specific partial: `src/styles/bar.scss`.
- In `src/style.scss`, import `src/styles/bar.scss` near the top.
- `bar.scss` should only define container layout and transparency (no tile sizing):
  - `.Bar` should be transparent with no background or border.
  - `.bar__inner` should set the sidebar width, vertical flow, and spacing between rows.
  - `.bar__row` should handle row-level alignment rules (pair, single, split).

Steps
- Update `src/widget/Bar.tsx` to render the GTK4 window and row wrappers using the structure above.
- Add `src/styles/bar.scss` and import it from `src/style.scss`.
- Keep the Bar container transparent and layout-only.

Files to touch
- `src/widget/Bar.tsx`
- `src/style.scss`
- `src/styles/bar.scss`

Out of scope
- Building any tile content or tile-specific styles.
- Modifying data services or utilities.
