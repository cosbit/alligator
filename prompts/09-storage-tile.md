# Prompt: Build the storage tile

Goal
- Implement the storage tile content and styles in its own folder.

Steps
- Add the storage widget markup and logic under `src/widget/storage/`.
- Add tile-specific styling in the same folder.
- Import the storage tile into `src/widget/Bar.tsx` and replace the matching placeholder.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the storage tile folder.

Files to touch
- `src/widget/storage/`
- `src/widget/Bar.tsx`

Out of scope
- Editing other tiles.
- Changing global tile sizing.
