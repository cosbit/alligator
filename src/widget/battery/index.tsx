import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
import GLib from "gi://GLib"
import "./style.scss"

const splitClasses = (value: string) =>
    value.trim().split(/\s+/).filter(Boolean)

type BatteryPaths = {
    capacityPath: string
    statusPath: string
}

type BatteryInfo = {
    percent: number
    charging: boolean
}

const BATTERY_CELL_COUNT = 5

function createPoll<T>(
    initial: T,
    intervalMs: number,
    command: string | string[] | (() => T),
    transform: (output: string, prev: T) => T = output => output as T,
) {
    if (typeof command === "function") {
        return Variable(initial).poll(intervalMs, command)
    }

    return Variable(initial).poll(intervalMs, command, transform)
}

function fileExists(path: string) {
    return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function resolveBatteryPaths(): BatteryPaths | null {
    const basePath = "/sys/class/power_supply"
    const preferred = ["BAT1", "BAT0"]

    for (const name of preferred) {
        const capacityPath = `${basePath}/${name}/capacity`
        if (fileExists(capacityPath)) {
            return {
                capacityPath,
                statusPath: `${basePath}/${name}/status`,
            }
        }
    }

    if (!GLib.file_test(basePath, GLib.FileTest.IS_DIR)) {
        return null
    }

    let found: BatteryPaths | null = null
    let dir: GLib.Dir | null = null

    try {
        dir = GLib.dir_open(basePath, 0)
        let entry: string | null = null

        while ((entry = dir.read_name()) !== null) {
            if (!entry.startsWith("BAT")) {
                continue
            }

            const capacityPath = `${basePath}/${entry}/capacity`
            if (fileExists(capacityPath)) {
                found = {
                    capacityPath,
                    statusPath: `${basePath}/${entry}/status`,
                }
                break
            }
        }
    } catch (error) {
        return null
    } finally {
        dir?.close()
    }

    return found
}

function readText(path: string | null) {
    if (!path || !fileExists(path)) {
        return null
    }

    try {
        const [ok, contents] = GLib.file_get_contents(path)
        if (!ok || !contents) {
            return null
        }

        return new TextDecoder().decode(contents).trim()
    } catch (error) {
        return null
    }
}

function readCapacity(path: string | null) {
    const raw = readText(path)
    if (!raw) {
        return null
    }

    const value = Number.parseInt(raw, 10)
    if (Number.isNaN(value)) {
        return null
    }

    return Math.min(100, Math.max(0, value))
}

function readStatus(path: string | null) {
    const raw = readText(path)
    if (!raw) {
        return false
    }

    return raw.toLowerCase() === "charging"
}

function createBatteryPoll() {
    const paths = resolveBatteryPaths()

    return createPoll({ percent: 0, charging: false }, 60_000, () => {
        const percent = readCapacity(paths?.capacityPath ?? null)

        if (percent === null) {
            return { percent: 0, charging: false }
        }

        return {
            percent,
            charging: readStatus(paths?.statusPath ?? null),
        }
    })
}

function createCellClass(index: number, infoAccessor: ReturnType<typeof createBatteryPoll>) {
    const thresholds = [10, 30, 50, 70, 90]

    return infoAccessor((info) => {
        const isActive = info.percent >= thresholds[index]

        if (!isActive) {
            return "battery__cell battery__cell--inactive"
        }

        const isWarning = info.percent < 40 && !info.charging

        return `battery__cell ${isWarning ? "battery__cell--warning" : "battery__cell--active"
            }`
    }).as(splitClasses)
}

function createPercentLabel(infoAccessor: ReturnType<typeof createBatteryPoll>) {
    return infoAccessor((info) => `${info.percent}%`)
}

export default function BatteryTile() {
    const info = createBatteryPoll()

    let lastPercent = -1
    info.subscribe(data => {
        const previous = lastPercent
        lastPercent = data.percent

        if (data.charging || data.percent > 10) {
            return
        }

        if (data.percent <= 10 && (previous === -1 || data.percent < previous)) {
            const msg = `Battery level is at ${data.percent}%`
            GLib.spawn_command_line_async(
                `notify-send "Battery Low" "${msg}" -u critical -i battery-empty-symbolic`,
            )
        }
    })
    const cellClasses = [
        createCellClass(0, info),
        createCellClass(1, info),
        createCellClass(2, info),
        createCellClass(3, info),
        createCellClass(4, info),
    ]
    const statusIconVisible = info((state) => state.charging)
    const percentLabel = createPercentLabel(info)

    return (
        <box
            cssClasses={["tile", "tile--square", "tile--battery", "tile--light"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                cssClasses={["battery__content"]}
                vertical
                spacing={3}
                halign={Gtk.Align.FILL}
                valign={Gtk.Align.START}
                hexpand
                vexpand={false}
            >
                <box
                    cssClasses={["battery__cells"]}
                    spacing={2}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.START}
                    hexpand
                    vexpand={false}
                    homogeneous
                >
                    <box cssClasses={cellClasses[0]} hexpand />
                    <box cssClasses={cellClasses[1]} hexpand />
                    <box cssClasses={cellClasses[2]} hexpand />
                    <box cssClasses={cellClasses[3]} hexpand />
                    <box cssClasses={cellClasses[4]} hexpand />
                </box>
                <box
                    cssClasses={["battery__status"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    hexpand={false}
                    vexpand={false}
                    visible={statusIconVisible}
                >
                    <image
                        cssClasses={["battery__status-icon", "battery__status-icon--charging"]}
                        iconName="go-up-symbolic"
                        pixelSize={13}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        hexpand={false}
                        vexpand={false}
                    />
                </box>
                <box
                    cssClasses={["battery__decorative-row", "battery__decorative-row--bottom"]}
                    spacing={3}
                    homogeneous
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <image
                        cssClasses={["battery__decorative-icon", "battery__decorative-icon--atom"]}
                        iconName="atom"
                        pixelSize={24}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    />
                    <image
                        cssClasses={["battery__decorative-icon", "battery__decorative-icon--bullseye"]}
                        iconName="circle_bullseye"
                        pixelSize={24}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    />
                </box>
                <label
                    cssClasses={["battery__percent"]}
                    label={percentLabel}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    hexpand={false}
                    vexpand={false}
                />
            </box>
        </box>
    )
}
