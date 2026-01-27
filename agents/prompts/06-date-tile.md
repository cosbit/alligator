# Prompt: Build the date tile

Goal
- Implement the date tile content and styles in its own folder using the AGS/Astal Accessor pattern.
- Show two labels: a larger day-of-week label and a smaller date label.

Steps
- Add the date widget markup and logic in `src/widget/date/index.tsx`.
- Keep tile-specific styling in `src/widget/date/style.scss`.
- Ensure `src/style.scss` imports the date tile stylesheet (add if missing).
- Do not touch `src/widget/Bar.tsx` unless the DateTile import is missing.

Methodology (AGS/Astal)
- Use GTK4 imports from `astal/gtk4` and avoid GTK3.
- Use Accessors (`createComputed`, `Variable().poll` via a small `createPoll` helper) for all reactive state.
- Accessor usage must follow the AGS pattern: call Accessors as functions inside `createComputed` to register dependencies.
- Prefer `createPoll` for CLI output; keep the interval modest (60_000ms).
- Keep layout semantics in GTK props (`halign`, `valign`, `hexpand`, `vexpand`, `spacing`) instead of CSS.

Functions to implement
- `createPoll<T>(...)`: small helper around `Variable(initial).poll(...)` with optional transform, matching the clock tile pattern.
- `createDayPoll()`: returns an Accessor string from `createPoll("", 60_000, "date +\"%A\"")`. This is the day name source.
- `createDatePoll()`: returns an Accessor string from `createPoll("", 60_000, "date +\"%d %b %Y\"")`. This is the date source.
- `createDayLabel(dayAccessor)`: returns `createComputed(() => dayAccessor().trim())` and is used by the top label.
- `createDateLabel(dateAccessor)`: returns `createComputed(() => dateAccessor().trim())` and is used by the bottom label.
- `DateTile()`: the exported widget factory that composes the Accessors, builds the GTK layout, and renders two centered labels.

Layout requirements
- Root: `Box` with classes `tile tile--square tile--date tile--dark` and `halign/valign` centered, `hexpand/vexpand={false}`.
- Layout: vertical `Box` with small `spacing` to separate the labels.
- Day label: `Label` bound to the day Accessor with class `date__day`; centered with `halign/valign` and non-expanding.
- Date label: `Label` bound to the date Accessor with class `date__full`; centered with `halign/valign` and non-expanding.
- Keep markup minimal: two labels inside the tile.

Styling requirements
- Use `src/widget/date/style.scss` to target `.tile--date`, `.date__day`, and `.date__full` with typography and subtle optical centering (small vertical margin).
- Style the day label larger and the date label smaller to emphasize hierarchy.
- Do not define sizing or tile dimensions here; those stay in `src/style.scss`.
- Import the date tile stylesheet into `src/style.scss` (if not already present).

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the date tile folder.

Files to touch
- `src/widget/date/index.tsx`
- `src/widget/date/style.scss`
- `src/style.scss` (only if the import is missing)

Out of scope
- Editing other tiles.
- Changing global tile sizing.
- Modifying the Bar layout unless DateTile is missing.
