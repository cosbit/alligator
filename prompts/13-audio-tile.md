# Prompt: Build the audio controls tile

Goal
- Implement a horizontal-wide audio tile with now-playing info, volume control, mute toggle, and transport controls.

Steps
- Add the audio widget markup and logic under `src/widget/audio/index.tsx`.
- Add tile-specific styling in `src/widget/audio/style.scss`.
- Import the audio tile stylesheet into `src/style.scss` (if missing).
- Import the audio tile into `src/widget/Bar.tsx` and replace one horizontal placeholder with it.

Methodology (AGS/Astal)
- Use GTK4 imports from `astal/gtk4` and avoid GTK3.
- Use Accessors (`Variable().poll` via a small `createPoll` helper, plus Accessor mapping) for reactive state.
- Keep layout semantics in GTK props (`spacing`, `halign`, `valign`, `hexpand`, `vexpand`) instead of CSS.
- Prefer event-driven command execution for actions; keep polling modest (2_000-5_000ms).

Audio/data sources
- Read default sink volume + mute state via CLI (e.g., `wpctl get-volume @DEFAULT_AUDIO_SINK@`) and parse into:
  - `volume`: 0-100 integer for the slider value.
  - `muted`: boolean for mute button label/icon state.
- Set volume via CLI from the slider (e.g., `wpctl set-volume @DEFAULT_AUDIO_SINK@ <0-1>`).
- Toggle mute via CLI (e.g., `wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle`).
- Read the top playing application/sink label via a CLI command (e.g., `playerctl metadata --format '{{playerName}}'` or a sink description string).
- Read playback status (playing/paused) to toggle the center play/pause button label/icon.
- Trigger transport actions via CLI (`previous`, `play-pause`, `next`).

Functions to implement
- `createPoll<T>(...)`: small helper around `Variable(initial).poll(...)`, matching the clock/date pattern.
- `parseVolume(output: string)`: extract a 0-100 volume percent and mute flag from the CLI output.
- `createVolumePoll()`: returns an Accessor `{ volume: number; muted: boolean }`.
- `createNowPlayingPoll()`: returns an Accessor `string` for the app/sink label.
- `createPlaybackPoll()`: returns an Accessor `{ playing: boolean }` for play/pause button state.
- `AudioTile()`: compose Accessors, build the GTK layout, and wire events to CLI commands.

Layout requirements
- Root: `Box` with classes `tile tile--horizontal tile--audio tile--dark`, centered `halign/valign`, `hexpand/vexpand={false}`.
- Top area: an audio "sign" (icon or glyph) with a label underneath showing the current app/sink string.
- Middle controls: a horizontal row with a vertical `Gtk.Scale` that `hexpand`s to fill most width and a mute toggle button on the right.
- Bottom controls: a `Gtk.CenterBox` (or a centered `Box`) with three action buttons: previous, play/pause (toggle), next.

Styling requirements
- Use `src/widget/audio/style.scss` to target `.tile--audio` and the audio sub-elements.
- Keep typography, spacing, and button sizing here (no tile sizing).
- Keep layout sizing (tile sizes) in `src/style.scss` only.

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the audio tile folder.
- Avoid CSS flexbox properties; use GTK layout props.

Files to touch
- `src/widget/audio/index.tsx`
- `src/widget/audio/style.scss`
- `src/style.scss` (only if the import is missing)
- `src/widget/Bar.tsx` (place the AudioTile)

Out of scope
- Editing other tiles beyond swapping a placeholder.
- Changing global tile sizing or Bar layout beyond inserting the tile.

Clarifications needed
- Which CLI tools should be used for audio and media control (`wpctl`, `pactl`, `pamixer`, `playerctl`)?
- Which horizontal slot should the audio tile replace (first or second horizontal placeholder)?
- Should the "now playing" label prefer the active player name, the track title, or the sink description?
