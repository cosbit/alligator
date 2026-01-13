# Prompt: Build the battery tile

Goal
- Implement the battery tile content and styles in its own folder.

Steps
- Add the battery widget markup and logic under `src/widget/battery/`.
- Add tile-specific styling in the same folder.
- Import the battery tile into `src/widget/Bar.tsx` and replace the matching placeholder.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the battery tile folder.

Files to touch
- `src/widget/battery/`
- `src/widget/Bar.tsx`

Out of scope
- Editing other tiles.
- Changing global tile sizing.
