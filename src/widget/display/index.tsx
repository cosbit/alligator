import { Gdk, Gtk } from "astal/gtk4"
import { Variable } from "astal"
import GLib from "gi://GLib"
import "./style.scss"

const HORIZONTAL_TILE_WIDTH = 220
const ROW_CONTENT_WIDTH = Math.floor(HORIZONTAL_TILE_WIDTH * 0.8)
const TOP_ROW_SLOT_WIDTH = 54
const BRIGHTNESS_DEVICE = "amdgpu_bl2"
const BRIGHTNESS_FALLBACK_PERCENT = 50
const BLUE_LIGHT_ENABLE_COMMAND = "hyprctl hyprsunset temperature 4300"
const BLUE_LIGHT_DISABLE_COMMAND = "hyprctl hyprsunset identity"

const splitClasses = (value: string) =>
    value.trim().split(/\s+/).filter(Boolean)

type BrightnessState = {
    percent: number
    available: boolean
}

type WorkspaceState = {
    current: number
    total: number
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
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

function truncateTitle(value: string, maxChars = 12) {
    const title = value.trim()

    if (!title) {
        return "No window"
    }

    if (title.length <= maxChars) {
        return title
    }

    return `${title.slice(0, maxChars)}...`
}

function parseActiveWindowTitle(output: string) {
    const match = output.match(/^\s*initialTitle:\s*(.+)$/m)
    if (!match) {
        return null
    }

    return match[1].trim()
}

function readActiveWindowTitle() {
    const output = safeSpawn("hyprctl activewindow")
    if (!output) {
        return null
    }

    const title = parseActiveWindowTitle(output)
    if (!title) {
        return "No window"
    }

    return title
}

function parseBrightnessPercent(output: string) {
    const csvFields = output.split(",")
    const rawPercent = csvFields[csvFields.length - 1]?.trim() ?? ""
    const match = rawPercent.match(/^(\d+)%$/) ?? output.match(/(\d+)%/)

    if (!match) {
        return null
    }

    const value = Number.parseInt(match[1], 10)
    if (Number.isNaN(value)) {
        return null
    }

    return clamp(value, 0, 100)
}

function readBrightnessState(): BrightnessState | null {
    const output = safeSpawn(`brightnessctl -d ${BRIGHTNESS_DEVICE} -m`)
    if (!output) {
        return null
    }

    const percent = parseBrightnessPercent(output)
    if (percent === null) {
        return null
    }

    return { percent, available: true }
}

function setBrightness(percent: number) {
    const clamped = clamp(Math.round(percent), 0, 100)
    runCommand(`brightnessctl set -d ${BRIGHTNESS_DEVICE} ${clamped}%`)
}

function parseWorkspaceState(activeRaw: string, workspacesRaw: string): WorkspaceState | null {
    try {
        const active = JSON.parse(activeRaw)
        const workspaces = JSON.parse(workspacesRaw)

        const currentId = Number(active?.id)
        if (Number.isNaN(currentId)) {
            return null
        }

        const total = Array.isArray(workspaces)
            ? workspaces.filter((workspace) => Number(workspace?.id) > 0).length
            : 0

        return {
            current: Math.max(0, currentId),
            total: Math.max(total, currentId > 0 ? currentId : 0),
        }
    } catch (error) {
        return null
    }
}

function readWorkspaceState() {
    const activeRaw = safeSpawn("hyprctl activeworkspace -j")
    const workspacesRaw = safeSpawn("hyprctl workspaces -j")

    if (!activeRaw || !workspacesRaw) {
        return null
    }

    return parseWorkspaceState(activeRaw, workspacesRaw)
}

function parseClientClassesFromJson(output: string) {
    try {
        const clients = JSON.parse(output)
        if (!Array.isArray(clients)) {
            return null
        }

        return clients
            .map((client) => {
                const initialClass = typeof client?.initialClass === "string"
                    ? client.initialClass.trim()
                    : ""
                const className = typeof client?.class === "string"
                    ? client.class.trim()
                    : ""

                return initialClass || className
            })
            .filter(Boolean)
    } catch (error) {
        return null
    }
}

function parseClientClassesFromText(output: string) {
    const classes: string[] = []
    const blocks = output.split(/\n\s*\n/)

    for (const block of blocks) {
        if (!block.trim()) {
            continue
        }

        const initialMatch = block.match(/^\s*initialClass:\s*(.+)$/m)
        const classMatch = block.match(/^\s*class:\s*(.+)$/m)
        const label = (initialMatch?.[1] ?? classMatch?.[1] ?? "").trim()

        if (label) {
            classes.push(label)
        }
    }

    return classes
}

function readClientClasses() {
    const jsonOutput = safeSpawn("hyprctl clients -j")
    if (jsonOutput) {
        const parsed = parseClientClassesFromJson(jsonOutput)
        if (parsed) {
            return parsed
        }
    }

    const textOutput = safeSpawn("hyprctl clients")
    if (!textOutput) {
        return null
    }

    return parseClientClassesFromText(textOutput)
}

function unique<T>(items: T[]) {
    return [...new Set(items)]
}

function iconCandidatesForAppClass(appClass: string) {
    const trimmed = appClass.trim()
    const lower = trimmed.toLowerCase()
    const firstToken = lower.split(/[ .:_-]+/).find(Boolean) ?? lower
    const noSpaces = lower.replace(/\s+/g, "")
    const hyphenated = lower.replace(/[_\s]+/g, "-")

    const aliasMap: Record<string, string[]> = {
        "org.mozilla.firefox": ["firefox"],
        "firefoxdeveloperedition": ["firefox-developer-edition", "firefox"],
        "google-chrome": ["google-chrome", "chrome"],
        "chromium-browser": ["chromium-browser", "chromium"],
        "code": ["code", "visual-studio-code", "vscode"],
        "code - oss": ["code-oss", "vscodium", "code"],
        "discordcanary": ["discord-canary", "discord"],
        "wezterm-gui": ["wezterm"],
    }

    return unique([
        ...(aliasMap[lower] ?? []),
        trimmed,
        lower,
        hyphenated,
        noSpaces,
        firstToken,
        `${firstToken}-desktop`,
        `${firstToken}-symbolic`,
        "application-x-executable-symbolic",
    ].filter(Boolean))
}

function getIconTheme() {
    try {
        const display = Gdk.Display.get_default()
        if (!display) {
            return null
        }

        const iconThemeApi = Gtk.IconTheme as unknown as {
            get_for_display?: (gdkDisplay: Gdk.Display) => Gtk.IconTheme
            getForDisplay?: (gdkDisplay: Gdk.Display) => Gtk.IconTheme
        }

        return iconThemeApi.get_for_display?.(display)
            ?? iconThemeApi.getForDisplay?.(display)
            ?? null
    } catch (error) {
        return null
    }
}

function resolveAppIconName(appClass: string, iconTheme: Gtk.IconTheme | null) {
    const candidates = iconCandidatesForAppClass(appClass)

    if (!iconTheme) {
        return candidates[0] ?? "application-x-executable-symbolic"
    }

    const iconThemeProbe = iconTheme as unknown as {
        has_icon?: (iconName: string) => boolean
        hasIcon?: (iconName: string) => boolean
    }

    for (const candidate of candidates) {
        try {
            if (
                iconThemeProbe.has_icon?.(candidate)
                || iconThemeProbe.hasIcon?.(candidate)
            ) {
                return candidate
            }
        } catch (error) {
            break
        }
    }

    return "application-x-executable-symbolic"
}

function createClientIcon(appClass: string, iconTheme: Gtk.IconTheme | null) {
    const icon = new Gtk.Image({
        iconName: resolveAppIconName(appClass, iconTheme),
        pixelSize: 13,
        tooltipText: appClass,
    })

    icon.add_css_class("display__client-icon")

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

function rebuildClientIcons(box: Gtk.Box, clientClasses: string[]) {
    clearBoxChildren(box)

    if (!clientClasses.length) {
        const icon = new Gtk.Image({
            iconName: "application-x-executable-symbolic",
            pixelSize: 13,
        })
        icon.add_css_class("display__client-icon")
        icon.add_css_class("display__client-icon--placeholder")
        box.append(icon)
        return
    }

    const iconTheme = getIconTheme()

    for (const appClass of clientClasses) {
        box.append(createClientIcon(appClass, iconTheme))
    }
}

function toggleBlueLight(enabled: boolean) {
    runCommand(enabled ? BLUE_LIGHT_ENABLE_COMMAND : BLUE_LIGHT_DISABLE_COMMAND)
}

export default function DisplayTile() {
    const activeTitle = createPoll("No window", 1_000, readActiveWindowTitle)
    const initialBrightnessState = readBrightnessState() ?? {
        percent: BRIGHTNESS_FALLBACK_PERCENT,
        available: false,
    }
    const brightness = createPoll<BrightnessState>(
        initialBrightnessState,
        1_000,
        readBrightnessState,
    )
    const workspace = createPoll<WorkspaceState>(
        readWorkspaceState() ?? { current: 0, total: 0 },
        1_000,
        readWorkspaceState,
    )
    const clients = createPoll<string[]>(readClientClasses() ?? [], 2_000, readClientClasses)
    const blueLightEnabled = Variable(false)
    let suppressBrightnessWrites = true

    const titleLabel = activeTitle((value) => truncateTitle(value))
    const brightnessValue = brightness((state) => state.percent)
    const brightnessAvailable = brightness((state) => state.available)
    const workspaceLabel = workspace((state) => {
        if (state.current <= 0 && state.total <= 0) {
            return "- / -"
        }

        const total = Math.max(state.total, state.current)
        const current = state.current > 0 ? `${state.current}` : "-"
        return `${current} / ${total}`
    })
    const blueLightButtonClasses = blueLightEnabled((enabled) =>
        enabled
            ? "display__icon-button display__icon-button--blue-light display__icon-button--active"
            : "display__icon-button display__icon-button--blue-light",
    ).as(splitClasses)
    const blueLightTooltip = blueLightEnabled((enabled) =>
        enabled ? "Disable blue-light filter" : "Enable blue-light filter",
    )

    const clientIconsBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 2,
    })
    clientIconsBox.add_css_class("display__clients")

    const refreshClientIcons = (clientClasses = clients.get()) =>
        rebuildClientIcons(clientIconsBox, clientClasses)

    refreshClientIcons(clients.get())
    clients.subscribe(refreshClientIcons)

    return (
        <box
            cssClasses={["tile", "tile--horizontal", "tile--display", "tile--light"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                cssClasses={["display__content"]}
                vertical
                spacing={4}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.FILL}
                widthRequest={ROW_CONTENT_WIDTH}
                hexpand={false}
                vexpand
            >
                <centerbox
                    cssClasses={["display__row", "display__row--top"]}
                    orientation={Gtk.Orientation.HORIZONTAL}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <box
                        cssClasses={["display__top-icons", "display__top-icons--left"]}
                        spacing={2}
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.CENTER}
                        widthRequest={TOP_ROW_SLOT_WIDTH}
                        hexpand={false}
                    >
                        <button
                            cssClasses={blueLightButtonClasses}
                            tooltipText={blueLightTooltip}
                            onClicked={() => {
                                const next = !blueLightEnabled.get()
                                blueLightEnabled.set(next)
                                toggleBlueLight(next)
                            }}
                        >
                            <image
                                cssClasses={["display__top-icon"]}
                                iconName="weather-clear-night-symbolic"
                                pixelSize={20}
                            />
                        </button>
                        <button
                            cssClasses={["display__icon-button", "display__icon-button--decorative"]}
                            tooltipText="Decorative icon"
                            sensitive={false}
                        >
                            <image
                                cssClasses={["display__top-icon"]}
                                iconName="preferences-desktop-display-symbolic"
                                pixelSize={20}
                            />
                        </button>
                    </box>

                    <label
                        cssClasses={["display__title"]}
                        label={titleLabel}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        xalign={0.5}
                    />

                    <box
                        cssClasses={["display__top-icons", "display__top-icons--right"]}
                        spacing={2}
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                        widthRequest={TOP_ROW_SLOT_WIDTH}
                        hexpand={false}
                    >
                        <image
                            cssClasses={["display__top-icon", "display__top-icon--decorative"]}
                            iconName="video-display-symbolic"
                            pixelSize={20}
                        />
                        <image
                            cssClasses={["display__top-icon", "display__top-icon--decorative"]}
                            iconName="display-brightness-symbolic"
                            pixelSize={20}
                        />
                    </box>
                </centerbox>

                <box
                    cssClasses={["display__row", "display__row--brightness"]}
                    spacing={4}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <image
                        cssClasses={["display__brightness-icon"]}
                        iconName="display-brightness-symbolic"
                        pixelSize={14}
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.CENTER}
                    />
                    <slider
                        cssClasses={["display__brightness-slider"]}
                        $={(self) => {
                            self.set_value(clamp(brightness.get().percent, 0, 100))
                            suppressBrightnessWrites = false
                        }}
                        orientation={Gtk.Orientation.HORIZONTAL}
                        min={0}
                        max={100}
                        step={1}
                        page={5}
                        drawValue={false}
                        value={brightnessValue}
                        hexpand
                        sensitive={brightnessAvailable}
                        onValueChanged={(self) => {
                            if (suppressBrightnessWrites) {
                                return
                            }

                            const current = brightness.get()
                            if (!current.available) {
                                return
                            }

                            const nextPercent = clamp(Math.round(self.get_value()), 0, 100)
                            if (nextPercent === current.percent) {
                                return
                            }

                            brightness.set({
                                ...current,
                                percent: nextPercent,
                            })
                            setBrightness(nextPercent)
                        }}
                    />
                </box>

                <box
                    cssClasses={["display__row", "display__row--bottom"]}
                    spacing={4}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <label
                        cssClasses={["display__workspace"]}
                        label={workspaceLabel}
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.CENTER}
                        xalign={0}
                    />
                    <box hexpand />
                    {clientIconsBox}
                </box>
            </box>
        </box>
    )
}
