# Prompt: Build the date tile

Goal
- Implement the date tile content and styles in its own folder using the AGS/Astal Accessor pattern.
- Show two labels: a larger day-of-week label and a smaller date label.

Steps
- Add the date widget markup and logic under `src/widget/date/`.
- Add tile-specific styling in the same folder.
- Import the date tile into `src/widget/Bar.tsx` and replace the matching placeholder.

Methodology (AGS/Astal)
- Use Accessors (`createState`, `createComputed`, `createPoll`) for all reactive state.
- Accessor usage must follow the AGS pattern: call Accessors as functions inside `createComputed` to register dependencies.
- Prefer `createPoll` for CLI output; keep the interval modest (60_000ms).
- Keep layout semantics in GTK props (`halign`, `valign`, `hexpand`, `vexpand`, `spacing`) instead of CSS.

Functions to implement
- `createDayPoll()`: returns an Accessor string from `createPoll("", 60_000, "date +\"%A\"")`. This is the day name source.
- `createDatePoll()`: returns an Accessor string from `createPoll("", 60_000, "date +\"%d %b %Y\"")`. This is the date source.
- `createDayLabel(dayAccessor)`: returns `createComputed(() => dayAccessor().trim())` and is used by the top label.
- `createDateLabel(dateAccessor)`: returns `createComputed(() => dateAccessor().trim())` and is used by the bottom label.
- `DateTile()`: the exported widget factory that composes the Accessors, builds the GTK layout, and renders two centered labels.

Layout requirements
- Root: `Box` with classes `tile tile--square tile--date tile--dark` and `halign/valign` centered, `hexpand/vexpand={false}`.
- Layout: vertical `Box` with small `spacing` to separate the labels.
- Day label: `Label` bound to the day Accessor; centered with `halign/valign` and non-expanding.
- Date label: `Label` bound to the date Accessor; centered with `halign/valign` and non-expanding.
- Keep markup minimal: two labels inside the tile.

Styling requirements
- Add `src/widget/date/style.scss` with typography and subtle optical centering (small vertical margin).
- Style the day label larger and the date label smaller to emphasize hierarchy.
- Do not define sizing or tile dimensions here; those stay in `src/style.scss`.
- Import the date tile stylesheet into `src/style.scss`.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the date tile folder.

Files to touch
- `src/widget/date/`
- `src/widget/Bar.tsx`

Out of scope
- Editing other tiles.
- Changing global tile sizing.
