import { Gdk, Gtk } from "astal/gtk4"
import { Variable } from "astal"
import GLib from "gi://GLib"
import "./style.scss"

const HORIZONTAL_TILE_WIDTH = 220
const TOP_ROW_SLOT_WIDTH = 50
const BRIGHTNESS_DEVICE = "amdgpu_bl2"
const BRIGHTNESS_FALLBACK_PERCENT = 50
const DEBUG_BRIGHTNESS = false
const BLUE_LIGHT_TOGGLE_COMMAND = "bash -lc 'toggle-bluelight'"

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

type ClientEntry = {
    address: string | null
    appClass: string
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function debugBrightness(message: string, details?: unknown) {
    if (!DEBUG_BRIGHTNESS) {
        return
    }

    if (details === undefined) {
        print(`[display:brightness] ${message}`)
        return
    }

    try {
        print(`[display:brightness] ${message} ${JSON.stringify(details)}`)
    } catch (error) {
        print(`[display:brightness] ${message}`)
    }
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

function parseBrightnessRawValue(output: string) {
    const match = output.trim().match(/^(\d+)$/m)
    if (!match) {
        return null
    }

    const value = Number.parseInt(match[1], 10)
    if (Number.isNaN(value)) {
        return null
    }

    return Math.max(0, value)
}

function readBrightnessPercentFromRaw() {
    const currentCommand = `brightnessctl get -d ${BRIGHTNESS_DEVICE}`
    const maxCommand = `brightnessctl max -d ${BRIGHTNESS_DEVICE}`
    const currentRaw = safeSpawn(currentCommand)
    const maxRaw = safeSpawn(maxCommand)

    debugBrightness("raw-read commands", {
        currentCommand,
        currentRaw,
        maxCommand,
        maxRaw,
    })

    if (!currentRaw || !maxRaw) {
        debugBrightness("raw-read unavailable")
        return null
    }

    const current = parseBrightnessRawValue(currentRaw)
    const max = parseBrightnessRawValue(maxRaw)

    debugBrightness("raw-read parsed", { current, max })

    if (current === null || max === null || max <= 0) {
        debugBrightness("raw-read parse failed", { current, max })
        return null
    }

    const percent = clamp(Math.round((current / max) * 100), 0, 100)
    debugBrightness("raw-read percent", { percent })
    return percent
}

function readBrightnessState(): BrightnessState | null {
    const rawPercent = readBrightnessPercentFromRaw()
    if (rawPercent !== null) {
        const state = { percent: rawPercent, available: true }
        debugBrightness("state from raw", state)
        return state
    }

    const machineCommand = `brightnessctl -d ${BRIGHTNESS_DEVICE} -m`
    const plainCommand = `brightnessctl -d ${BRIGHTNESS_DEVICE}`
    const machineOutput = safeSpawn(machineCommand)
    const plainOutput = machineOutput ? null : safeSpawn(plainCommand)
    const output = machineOutput ?? plainOutput

    debugBrightness("fallback-read outputs", {
        machineCommand,
        machineOutput,
        plainCommand,
        plainOutput,
    })

    if (!output) {
        debugBrightness("state read failed")
        return null
    }

    const percent = parseBrightnessPercent(output)
    if (percent === null) {
        debugBrightness("fallback parse failed", { output })
        return null
    }

    const state = { percent, available: true }
    debugBrightness("state from fallback parse", state)
    return state
}

function setBrightness(percent: number) {
    const clamped = clamp(Math.round(percent), 0, 100)
    const command = `brightnessctl set -d ${BRIGHTNESS_DEVICE} ${clamped}%`
    debugBrightness("set command", { command, percent, clamped })
    runCommand(command)
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

function normalizeHyprAddress(value: string | null) {
    if (!value) {
        return null
    }

    const trimmed = value.trim().toLowerCase()
    if (!trimmed) {
        return null
    }

    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`
}

function parseClientsFromJson(output: string) {
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
                const appClass = initialClass || className
                const rawAddress = typeof client?.address === "string"
                    ? client.address
                    : null

                if (!appClass) {
                    return null
                }

                return {
                    address: normalizeHyprAddress(rawAddress),
                    appClass,
                }
            })
            .filter((client): client is ClientEntry => client !== null)
    } catch (error) {
        return null
    }
}

function parseClientsFromText(output: string) {
    const clients: ClientEntry[] = []
    const blocks = output.split(/\n\s*\n/)

    for (const block of blocks) {
        if (!block.trim()) {
            continue
        }

        const addressMatch = block.match(/^\s*Window\s+([0-9a-fA-Fx]+)\s*->/m)
            ?? block.match(/^\s*address:\s*([0-9a-fA-Fx]+)\s*$/m)
        const initialMatch = block.match(/^\s*initialClass:\s*(.+)$/m)
        const classMatch = block.match(/^\s*class:\s*(.+)$/m)
        const appClass = (initialMatch?.[1] ?? classMatch?.[1] ?? "").trim()

        if (appClass) {
            clients.push({
                address: normalizeHyprAddress(addressMatch?.[1] ?? null),
                appClass,
            })
        }
    }

    return clients
}

function readClients() {
    const jsonOutput = safeSpawn("hyprctl clients -j")
    if (jsonOutput) {
        const parsed = parseClientsFromJson(jsonOutput)
        if (parsed) {
            return parsed
        }
    }

    const textOutput = safeSpawn("hyprctl clients")
    if (!textOutput) {
        return null
    }

    return parseClientsFromText(textOutput)
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
        pixelSize: 16,
        tooltipText: appClass,
    })

    icon.add_css_class("display__client-icon")

    return icon
}

function focusClient(client: ClientEntry) {
    if (!client.address) {
        return
    }

    runCommand(`hyprctl dispatch focuswindow address:${client.address}`)
}

function createClientIconButton(client: ClientEntry, iconTheme: Gtk.IconTheme | null) {
    const button = new Gtk.Button({
        tooltipText: client.appClass,
    })
    button.add_css_class("display__client-button")
    button.connect("clicked", () => focusClient(client))
    button.set_child(createClientIcon(client.appClass, iconTheme))
    return button
}

function clearBoxChildren(box: Gtk.Box) {
    let child = box.get_first_child()
    while (child) {
        const next = child.get_next_sibling()
        box.remove(child)
        child = next
    }
}

function rebuildClientIcons(box: Gtk.Box, clients: ClientEntry[]) {
    clearBoxChildren(box)

    if (!clients.length) {
        const icon = new Gtk.Image({
            iconName: "application-x-executable-symbolic",
            pixelSize: 20,
        })
        icon.add_css_class("display__client-icon")
        icon.add_css_class("display__client-icon--placeholder")
        box.append(icon)
        return
    }

    const iconTheme = getIconTheme()

    for (const client of clients) {
        box.append(createClientIconButton(client, iconTheme))
    }
}

function toggleBlueLight() {
    runCommand(BLUE_LIGHT_TOGGLE_COMMAND)
}

export default function DisplayTile() {
    const activeTitle = createPoll("No window", 1_000, readActiveWindowTitle)
    const initialBrightnessState = readBrightnessState() ?? {
        percent: BRIGHTNESS_FALLBACK_PERCENT,
        available: false,
    }
    debugBrightness("initial brightness state", initialBrightnessState)
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
    const clients = createPoll<ClientEntry[]>(readClients() ?? [], 2_000, readClients)
    const blueLightEnabled = Variable(false)
    let suppressBrightnessWrites = true

    brightness.subscribe((state) => {
        debugBrightness("brightness poll update", state)
    })

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

    const refreshClientIcons = (entries = clients.get()) =>
        rebuildClientIcons(clientIconsBox, entries)

    refreshClientIcons(clients.get())
    clients.subscribe(refreshClientIcons)

    return (
        <box
            cssClasses={["tile", /*"tile--horizontal",*/ "tile--display", "tile--light"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                cssClasses={[/*"display__content"*/]}
                vertical
                homogeneous
                spacing={4}
                halign={Gtk.Align.FILL}
                valign={Gtk.Align.FILL}
                hexpand
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
                                toggleBlueLight()
                            }}
                        >
                            <image
                                cssClasses={["display__top-icon"]}
                                iconName="76"
                                pixelSize={16}
                            />
                        </button>
                        <button
                            cssClasses={["display__icon-button", "display__icon-button--decorative"]}
                            tooltipText="sexy mode"
                            sensitive={false}
                        >
                            <image
                                cssClasses={["display__top-icon"]}
                                iconName="142"
                                pixelSize={16}
                            />
                        </button>
                    </box>

                    <label
                        cssClasses={["display__title"]}
                        label={titleLabel}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        widthChars={14}
                        maxWidthChars={14}
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
                            iconName="183"
                            pixelSize={16}
                        />
                        <image
                            cssClasses={["display__top-icon", "display__top-icon--decorative"]}
                            iconName="81"
                            pixelSize={16}
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
                        setup={(self) => {
                            const initialValue = clamp(brightness.get().percent, 0, 100)
                            debugBrightness("slider setup", {
                                initialValue,
                                state: brightness.get(),
                            })
                            self.set_value(initialValue)
                            suppressBrightnessWrites = false
                            debugBrightness("slider setup complete", {
                                suppressBrightnessWrites,
                            })
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
                            const sliderValue = clamp(Math.round(self.get_value()), 0, 100)
                            debugBrightness("slider value changed", {
                                sliderValue,
                                suppressBrightnessWrites,
                                state: brightness.get(),
                            })

                            if (suppressBrightnessWrites) {
                                debugBrightness("slider ignored: suppressed")
                                return
                            }

                            const current = brightness.get()
                            if (!current.available) {
                                debugBrightness("slider ignored: brightness unavailable", current)
                                return
                            }

                            const nextPercent = sliderValue
                            if (nextPercent === current.percent) {
                                debugBrightness("slider ignored: no change", {
                                    nextPercent,
                                    currentPercent: current.percent,
                                })
                                return
                            }

                            brightness.set({
                                ...current,
                                percent: nextPercent,
                            })
                            debugBrightness("slider applying new state", brightness.get())
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
