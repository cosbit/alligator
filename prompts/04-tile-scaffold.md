# Prompt: Scaffold tile directories

Goal
- Create a directory and minimal component per tile.

Tiles
- Clock, date, battery, power actions, storage, network.

Steps
- Create `src/widget/<tile>/` folders for each tile.
- Add a minimal factory/component file per tile (placeholder widget with a root class).
- Ensure each tile exports a function that can be imported by `src/widget/Bar.tsx` later.

Files to touch
- `src/widget/clock/`
- `src/widget/date/`
- `src/widget/battery/`
- `src/widget/power-actions/`
- `src/widget/storage/`
- `src/widget/network/`

Out of scope
- Tile content, typography, or data bindings.
- Global styling changes.
