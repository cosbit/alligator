# Prompt: Build the date tile

Goal
- Implement the date tile content and styles in its own folder.

Steps
- Add the date widget markup and logic under `src/widget/date/`.
- Add tile-specific styling in the same folder.
- Import the date tile into `src/widget/Bar.tsx` and replace the matching placeholder.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the date tile folder.

Files to touch
- `src/widget/date/`
- `src/widget/Bar.tsx`

Out of scope
- Editing other tiles.
- Changing global tile sizing.
