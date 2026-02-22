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
    const threshold = Math.ceil(((index + 1) * 100) / BATTERY_CELL_COUNT)

    return infoAccessor((info) => {
        const isActive = info.percent >= threshold

        if (!isActive) {
            return "battery__cell battery__cell--inactive"
        }

        const isWarning = info.percent < 40 && !info.charging

        return `battery__cell ${
            isWarning ? "battery__cell--warning" : "battery__cell--active"
        }`
    }).as(splitClasses)
}

function createStatusIconName(infoAccessor: ReturnType<typeof createBatteryPoll>) {
    return infoAccessor((info) =>
        info.charging ? "go-up-symbolic" : "go-down-symbolic",
    )
}

function createStatusIconClass(infoAccessor: ReturnType<typeof createBatteryPoll>) {
    return infoAccessor((info) => {
        if (info.charging) {
            return "battery__status-icon battery__status-icon--charging"
        }

        return "battery__status-icon battery__status-icon--discharging"
    }).as(splitClasses)
}

function createPercentLabel(infoAccessor: ReturnType<typeof createBatteryPoll>) {
    return infoAccessor((info) => `${info.percent}%`)
}

export default function BatteryTile() {
    const info = createBatteryPoll()
    const cellClasses = [
        createCellClass(0, info),
        createCellClass(1, info),
        createCellClass(2, info),
        createCellClass(3, info),
        createCellClass(4, info),
    ]
    const statusIconName = createStatusIconName(info)
    const statusIconClasses = createStatusIconClass(info)
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
                spacing={4}
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
                    spacing={4}
                    halign={Gtk.Align.END}
                    valign={Gtk.Align.CENTER}
                    hexpand={false}
                    vexpand={false}
                >
                    <image
                        cssClasses={statusIconClasses}
                        iconName={statusIconName}
                        pixelSize={13}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        hexpand={false}
                        vexpand={false}
                    />
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
        </box>
    )
}
