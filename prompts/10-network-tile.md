# Prompt: Build the network tile

Goal
- Implement the network tile content and styles in its own folder.

Steps
- Add the network widget markup and logic under `src/widget/network/`.
- Add tile-specific styling in the same folder.
- Import the network tile into `src/widget/Bar.tsx` and replace the matching placeholder.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the network tile folder.

Files to touch
- `src/widget/network/`
- `src/widget/Bar.tsx`

Out of scope
- Editing other tiles.
- Changing global tile sizing.
