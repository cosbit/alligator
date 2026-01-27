# Prompt: Layout the tile rows

Goal
- Assemble the Bar layout rows and tile placeholders to match the target layout.

Layout map
- Row 1: square tile, square tile
- Row 2: horizontal tile
- Row 3: vertical tile left, two square tiles right
- Row 4: horizontal tile
- Row 5: square tile

Steps
- Update `src/widget/Bar.tsx` to render rows and tile placeholders with the global tile classes.
- Use class names that match `src/style.scss` for shape and row layout.
- Keep placeholders simple; no tile content yet.

Files to touch
- `src/widget/Bar.tsx`

Out of scope
- Adding per-tile styles or content.
- Adding data services.
