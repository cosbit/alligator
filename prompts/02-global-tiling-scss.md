# Prompt: Global tiling + sizing SCSS

Goal
- Define global tile sizing, spacing, shape, and theme color classes in `src/style.scss` using GTK4-friendly CSS.

Context
- Tile sizing/tiling is global; tile internals live in each tile folder.
- Square is the base unit; vertical is 2x height; horizontal is 2x width.
- Tiles are fixed-size objects; they should be restrictive and never grow.
- The project theme is Gruvbox; expose global color tokens and tile color variants.

Constraints
- Use GTK CSS-compatible properties only (no web flexbox or grid).
- Prevent growth by pinning each tile to explicit sizes with matching `min-`/`max-` dimensions.
- Keep global values as CSS variables so tile sizing is centralized.
- Keep theme values as CSS variables so tiles can opt into dark/light variants consistently.

Classes to create (in `src/style.scss`)
- `.tile` (base tile, fixed size, no growth)
- `.tile--square`
- `.tile--horizontal`
- `.tile--vertical`
- `.tile--dark` (dark background + light foreground)
- `.tile--light` (light background + dark foreground)

Steps
- Add CSS variables for bar width, tile unit size, and gutter spacing.
- Define `.tile` sizing rules that lock `min-`/`max-` width and height to the computed size.
- Define shape variants (`.tile--square`, `.tile--horizontal`, `.tile--vertical`) using `calc()` with the unit and gutter spacing.
- Add Gruvbox color variables (background, foreground, selection, active/inactive accents, and palette colors).
- Define `.tile--dark` and `.tile--light` classes that apply `background` and `color` using the Gruvbox variables.

Directories and files to touch
- `src/`
- `src/style.scss`

Out of scope
- Tile-specific typography or content.
- Any widget markup changes.
