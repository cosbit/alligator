# Prompt: Build the power actions tile

Goal
- Implement the power actions tile content and styles in its own folder.

Steps
- Add the power actions widget markup and logic under `src/widget/power-actions/`.
- Add tile-specific styling in the same folder.
- Import the power actions tile into `src/widget/Bar.tsx` and replace the matching placeholder.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the power actions tile folder.

Files to touch
- `src/widget/power-actions/`
- `src/widget/Bar.tsx`

Out of scope
- Editing other tiles.
- Changing global tile sizing.
