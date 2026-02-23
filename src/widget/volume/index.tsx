import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
import GLib from "gi://GLib"
import "./style.scss"

const ICON_DIR = `${SRC}/icons`
const OUTPUT_TARGET = "@DEFAULT_AUDIO_SINK@"
const INPUT_TARGET = "@DEFAULT_AUDIO_SOURCE@"
const HORIZONTAL_TILE_WIDTH = 220
const ROW_CONTENT_WIDTH = Math.floor(HORIZONTAL_TILE_WIDTH * 0.8)
const ROW_SPACING = 0
const CONTROL_ROW_SPACING = 4
const PERCENT_LABEL_WIDTH_CHARS = 4

const splitClasses = (value: string) =>
    value.trim().split(/\s+/).filter(Boolean)

type VolumeState = {
    volume: number
    muted: boolean
    available: boolean
}

type SinkInfo = {
    id: number
    name: string
    isDefault: boolean
}

function truncateDeviceName(value: string, maxChars = 20) {
    const label = value.trim()
    if (label.length <= maxChars) {
        return label
    }
    return `${label.slice(0, maxChars)}...`
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function fileExists(path: string) {
    return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function safeSpawn(command: string) {
    try {
        const [ok, stdout, , status] = GLib.spawn_command_line_sync(command)
        if (!ok || status !== 0 || !stdout) {
            return null
        }
        return new TextDecoder().decode(stdout).trim()
    } catch (error) {
        return null
    }
}

function runCommand(command: string) {
    try {
        GLib.spawn_command_line_async(command)
    } catch (error) {
        return
    }
}

function parseVolume(output: string): VolumeState | null {
    const match = output.match(/Volume:\s*([0-9.]+)/i)
    if (!match) {
        return null
    }

    const raw = Number.parseFloat(match[1])
    if (Number.isNaN(raw)) {
        return null
    }

    return {
        volume: clamp(Math.round(raw * 100), 0, 100),
        muted: /\bMUTED\b/i.test(output),
        available: true,
    }
}

function readVolumeState(target: string): VolumeState | null {
    try {
        const output = safeSpawn(`wpctl get-volume ${target}`)
        if (!output) {
            return null
        }
        return parseVolume(output)
    } catch (error) {
        return null
    }
}

function parseSinks(output: string): SinkInfo[] {
    const lines = output.split("\n")
    const sinks: SinkInfo[] = []
    let inSinks = false

    for (const line of lines) {
        if (line.includes("Sinks:")) {
            inSinks = true
            continue
        }

        if (!inSinks) {
            continue
        }

        if (
            line.includes("Sources:") ||
            line.includes("Sink endpoints:") ||
            line.includes("Source endpoints:") ||
            line.includes("Filters:") ||
            line.includes("Streams:")
        ) {
            break
        }

        const cleaned = line.replace(/^[\s│├└─]+/, "").trim()
        if (!cleaned) {
            continue
        }

        const match = cleaned.match(/^(\*?)\s*(\d+)\.\s*(.+)$/)
        if (!match) {
            continue
        }

        const id = Number.parseInt(match[2], 10)
        if (Number.isNaN(id)) {
            continue
        }

        sinks.push({
            id,
            name: match[3].trim(),
            isDefault: match[1] === "*",
        })
    }

    return sinks
}

function readSinks(): SinkInfo[] | null {
    try {
        const output = safeSpawn("wpctl status")
        if (!output) {
            return null
        }
        return parseSinks(output)
    } catch (error) {
        return null
    }
}

function createPoll<T>(initial: T, intervalMs: number, getter: () => T | null) {
    let current = initial
    const variable = Variable(initial)

    variable.poll(intervalMs, () => {
        const next = getter()
        if (next === null) {
            return current
        }
        current = next
        return next
    })

    return variable
}

function createVolumePoll(target: string) {
    const initial = readVolumeState(target)
    const fallback: VolumeState = initial ?? {
        volume: 0,
        muted: false,
        available: false,
    }

    return createPoll(fallback, 500, () => readVolumeState(target))
}

function createSinksPoll() {
    const initial = readSinks() ?? []
    return createPoll(initial, 5_000, readSinks)
}

function createIconWidget(fileName: string, fallbackIcon = fileName) {
    const path = `${ICON_DIR}/${fileName}`
    const icon = fileExists(path)
        ? Gtk.Image.new_from_file(path)
        : new Gtk.Image({ iconName: fallbackIcon })

    icon.add_css_class("volume__icon")

    return icon
}

function clearBoxChildren(box: Gtk.Box) {
    let child = box.get_first_child()
    while (child) {
        const next = child.get_next_sibling()
        box.remove(child)
        child = next
    }
}

function rebuildSinkMenu(
    box: Gtk.Box,
    sinks: SinkInfo[],
    onSelect: (sink: SinkInfo) => void,
) {
    clearBoxChildren(box)

    if (!sinks.length) {
        const label = new Gtk.Label({ label: "No outputs" })
        label.add_css_class("volume__menu-empty")
        label.set_halign(Gtk.Align.START)
        box.append(label)
        return
    }

    for (const sink of sinks) {
        const button = new Gtk.Button({ label: sink.name })
        button.add_css_class("volume__menu-item")
        if (sink.isDefault) {
            button.add_css_class("volume__menu-item--active")
        }
        button.set_halign(Gtk.Align.FILL)
        button.connect("clicked", () => onSelect(sink))
        box.append(button)
    }
}

function setVolume(target: string, percent: number) {
    const clamped = clamp(Math.round(percent), 0, 100)
    const value = (clamped / 100).toFixed(2)
    runCommand(`wpctl set-volume ${target} ${value}`)
}

function toggleMute(target: string) {
    runCommand(`wpctl set-mute ${target} toggle`)
}

function setDefaultSink(id: number) {
    runCommand(`wpctl set-default ${id}`)
}

function runMediaCommand(action: "previous" | "pause" | "play") {
    runCommand(`playerctl ${action}`)
}

export default function VolumeTile() {
    const outputState = createVolumePoll(OUTPUT_TARGET)
    const micState = createVolumePoll(INPUT_TARGET)
    const sinks = createSinksPoll()

    const outputPercent = outputState((state) => {
        if (!state.available) {
            return "\u00a0\u00a0--"
        }
        const padded = state.volume.toString().padStart(3, "\u00a0")
        return `${padded}%`
    })
    const outputValue = outputState((state) => state.volume)
    const outputAvailable = outputState((state) => state.available)
    const micAvailable = micState((state) => state.available)

    const outputMuteClasses = outputState((state) =>
        state.muted ? "volume__button volume__button--muted" : "volume__button",
    ).as(splitClasses)
    const micMuteClasses = micState((state) =>
        state.muted ? "volume__button volume__button--muted" : "volume__button",
    ).as(splitClasses)

    const outputName = sinks((list) => {
        if (!list.length) {
            return "No output"
        }
        const selected = list.find((sink) => sink.isDefault) ?? list[0]
        return truncateDeviceName(selected?.name ?? "No output")
    })

    const sinkListBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 4,
    })
    sinkListBox.add_css_class("volume__menu")

    const sinkPopover = new Gtk.Popover({
        position: Gtk.PositionType.BOTTOM,
        hasArrow: false,
    })
    sinkPopover.set_child(sinkListBox)
    sinkPopover.add_css_class("volume__menu-popover")

    const updateSinkMenu = (list = sinks.get()) => {
        rebuildSinkMenu(sinkListBox, list, (sink) => {
            setDefaultSink(sink.id)
            sinkPopover.popdown()
        })
    }

    updateSinkMenu(sinks.get())
    sinks.subscribe(updateSinkMenu)

    const caretIcon = createIconWidget("pan-down-symbolic")
    const volumeIcon = createIconWidget("audio-volume-high-symbolic")
    const micIcon = createIconWidget("mute")
    const previousIcon = createIconWidget("previous")
    const pauseIcon = createIconWidget("media-playback-pause-symbolic")
    const playIcon = createIconWidget("media-playback-start-symbolic")

    return (
        <box
            cssClasses={["tile", "tile--horizontal", "tile--volume", "tile--dark"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.END}
            hexpand={false}
            vexpand={false}
            homogeneous
        >
            <box
                vertical
                cssClasses={["volume__inner"]}
                spacing={ROW_SPACING}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.END}
                widthRequest={ROW_CONTENT_WIDTH}
                hexpand={false}
                homogeneous
                vexpand={false}
            >
                <box
                    cssClasses={["volume__header-row"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.END}
                    widthRequest={ROW_CONTENT_WIDTH}
                    hexpand={false}
                >
                    <menubutton
                        cssClasses={["volume__device-button"]}
                        popover={sinkPopover}
                        halign={Gtk.Align.FILL}
                        hexpand
                        sensitive={outputAvailable}
                    >
                        <box
                            cssClasses={["volume__device"]}
                            spacing={6}
                            halign={Gtk.Align.FILL}
                            hexpand
                        >
                            <label
                                cssClasses={["volume__device-label"]}
                                label={outputName}
                                xalign={0}
                                hexpand
                            />
                            {caretIcon}
                        </box>
                    </menubutton>
                </box>
                <box
                    cssClasses={["volume__controls"]}
                    spacing={ROW_SPACING}
                    halign={Gtk.Align.CENTER}
                    widthRequest={ROW_CONTENT_WIDTH}
                    hexpand={false}
                >
                    <box
                        cssClasses={["volume__slider-row"]}
                        spacing={ROW_SPACING}
                        halign={Gtk.Align.FILL}
                        hexpand
                    >
                        <slider
                            cssClasses={["volume__slider"]}
                            orientation={Gtk.Orientation.HORIZONTAL}
                            min={0}
                            max={100}
                            step={1}
                            page={5}
                            drawValue={false}
                            value={outputValue}
                            hexpand
                            sensitive={outputAvailable}
                            onValueChanged={(self) => {
                                if (!outputState.get().available) {
                                    return
                                }
                                setVolume(OUTPUT_TARGET, self.get_value())
                            }}
                        />
                        <label
                            cssClasses={["volume__percent"]}
                            label={outputPercent}
                            xalign={1}
                            halign={Gtk.Align.END}
                            hexpand={false}
                            widthChars={PERCENT_LABEL_WIDTH_CHARS}
                            maxWidthChars={PERCENT_LABEL_WIDTH_CHARS}
                        />
                    </box>
                </box>
                <box
                    cssClasses={["volume__actions-row"]}
                    spacing={CONTROL_ROW_SPACING}
                    halign={Gtk.Align.CENTER}
                    widthRequest={ROW_CONTENT_WIDTH}
                    hexpand={false}
                    homogeneous
                >
                    <button
                        cssClasses={outputMuteClasses}
                        tooltipText="Toggle output mute"
                        hexpand
                        sensitive={outputAvailable}
                        onClicked={() => toggleMute(OUTPUT_TARGET)}
                    >
                        {volumeIcon}
                    </button>
                    <button
                        cssClasses={micMuteClasses}
                        tooltipText="Toggle microphone mute"
                        hexpand
                        sensitive={micAvailable}
                        onClicked={() => toggleMute(INPUT_TARGET)}
                    >
                        {micIcon}
                    </button>
                    <button
                        cssClasses={["volume__button"]}
                        tooltipText="Previous track"
                        hexpand
                        onClicked={() => runMediaCommand("previous")}
                    >
                        {previousIcon}
                    </button>
                    <button
                        cssClasses={["volume__button"]}
                        tooltipText="Pause"
                        hexpand
                        onClicked={() => runMediaCommand("pause")}
                    >
                        {pauseIcon}
                    </button>
                    <button
                        cssClasses={["volume__button"]}
                        tooltipText="Play"
                        hexpand
                        onClicked={() => runMediaCommand("play")}
                    >
                        {playIcon}
                    </button>
                </box>
            </box>
        </box>
    )
}
