# Prompt: Build the clock tile

Goal
- Implement the clock tile content and styles in its own folder with a light theme and centered time label.

Methodology (state + time source)
- Use an AGS Accessor (variable type) created by `createPoll` to bind a time command.
- Poll the `date` command once per minute and format time as `9:23 AM` (12-hour, no leading zero).
- Keep the time-binding logic at the top of `src/widget/clock/index.tsx`, and keep the TSX layout at the bottom of the file.
- Keep helper functions short, single-purpose, and readable.

Steps
- Add the clock widget markup and logic under `src/widget/clock/`.
- Use `createPoll` with a `date` command like `date +"%-I:%M %p"` (or `date +"%l:%M %p"` with `trim()` to drop leading space).
- Add tile-specific styling in the same folder (for example `style.scss`) and apply a light-themed class on the root tile.
- Center the label horizontally and vertically using GTK layout props; add gentle top/bottom margins for optical balance.
- Import the clock tile into `src/widget/Bar.tsx` and replace the matching placeholder.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the clock tile folder.
- Keep functions simple and short; prioritize clarity over cleverness.

Files to touch
- `src/widget/clock/`
- `src/widget/Bar.tsx`

Out of scope
- Editing other tiles.
- Changing global tile sizing.
