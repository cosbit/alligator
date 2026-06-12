import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
import GLib from "gi://GLib"
import "./style.scss"

const BLUETOOTH_POLL_INTERVAL_MS = 3_000
const SCAN_COMMAND =
    "bash -lc 'bluetoothctl scan on >/dev/null 2>&1 & sleep 8; bluetoothctl scan off >/dev/null 2>&1 || true; notify-send \"Bluetooth\" \"Scan complete\" -i bluetooth-active-symbolic'"

const splitClasses = (value: string) =>
    value.trim().split(/\s+/).filter(Boolean)

type BluetoothDevice = {
    address: string
    name: string
    connected: boolean
    trusted: boolean
    paired: boolean
    inRange: boolean
}

type BluetoothState = {
    available: boolean
    powered: boolean
    blocked: boolean
    devices: BluetoothDevice[]
}

type DeviceSummary = {
    address: string
    name: string
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

function parsePowered(output: string) {
    const match = output.match(/^\s*Powered:\s*(yes|no)\s*$/im)
    return match?.[1] === "yes"
}

function parseBlocked(output: string) {
    return /^\s*PowerState:\s*.*blocked\s*$/im.test(output)
}

function parseDeviceList(output: string) {
    const devices: DeviceSummary[] = []

    for (const line of output.split("\n")) {
        const match = line.trim().match(/^Device\s+([0-9A-F:]{17})\s+(.+)$/i)
        if (!match) {
            continue
        }

        devices.push({
            address: match[1].toUpperCase(),
            name: match[2].trim(),
        })
    }

    return devices
}

function parseDeviceInfo(address: string, name: string, output: string): BluetoothDevice {
    return {
        address,
        name,
        connected: /^\s*Connected:\s*yes\s*$/im.test(output),
        trusted: /^\s*Trusted:\s*yes\s*$/im.test(output),
        paired: /^\s*Paired:\s*yes\s*$/im.test(output),
        inRange: /^\s*RSSI:\s*[-0-9]+\s*$/im.test(output),
    }
}

function truncateDeviceName(value: string, maxChars = 14) {
    const label = value.trim()
    if (label.length <= maxChars) {
        return label
    }

    return `${label.slice(0, maxChars)}...`
}

function readBluetoothState(): BluetoothState {
    const controller = safeSpawn("bluetoothctl show")
    if (!controller) {
        return {
            available: false,
            powered: false,
            blocked: false,
            devices: [],
        }
    }

    const powered = parsePowered(controller)
    const blocked = parseBlocked(controller)
    if (!powered) {
        return {
            available: true,
            powered: false,
            blocked,
            devices: [],
        }
    }

    const paired = safeSpawn("bluetoothctl devices Paired")
    if (!paired) {
        return {
            available: true,
            powered,
            blocked,
            devices: [],
        }
    }

    const devices = parseDeviceList(paired)
        .map(({ address, name }) => {
            const info = safeSpawn(`bluetoothctl info ${address}`)
            if (!info) {
                return null
            }

            return parseDeviceInfo(address, name, info)
        })
        .filter((device): device is BluetoothDevice => {
            if (!device) {
                return false
            }

            return device.trusted && (device.connected || device.inRange)
        })

    return {
        available: true,
        powered,
        blocked,
        devices,
    }
}

function createBluetoothPoll() {
    return createPoll(readBluetoothState(), BLUETOOTH_POLL_INTERVAL_MS, readBluetoothState)
}

function togglePower(state: BluetoothState) {
    if (!state.available) {
        return
    }

    const action = state.powered ? "off" : "on"
    const icon = state.powered
        ? "bluetooth-disabled-symbolic"
        : "bluetooth-active-symbolic"
    const label = state.powered ? "Disabled" : "Enabled"
    const unblock = state.powered ? "" : "rfkill unblock bluetooth >/dev/null 2>&1 || true; "

    runCommand(
        `bash -lc '${unblock}if bluetoothctl power ${action}; then notify-send "Bluetooth" "${label}" -i ${icon}; else notify-send "Bluetooth" "Power ${action} failed" -u critical -i bluetooth-disabled-symbolic; fi'`,
    )
}

function scanBluetooth(state: BluetoothState) {
    if (!state.available || !state.powered) {
        return
    }

    runCommand(SCAN_COMMAND)
}

function toggleDevice(device: BluetoothDevice) {
    const action = device.connected ? "disconnect" : "connect"
    runCommand(`bluetoothctl ${action} ${device.address}`)
}

function createPowerClasses(stateAccessor: ReturnType<typeof createBluetoothPoll>) {
    return stateAccessor((state) => {
        if (state.powered) {
            return "bluetooth__button bluetooth__button--power bluetooth__button--active"
        }

        return "bluetooth__button bluetooth__button--power"
    }).as(splitClasses)
}

function createScanClasses(stateAccessor: ReturnType<typeof createBluetoothPoll>) {
    return stateAccessor((state) => {
        if (state.available && state.powered) {
            return "bluetooth__button bluetooth__button--scan bluetooth__button--active"
        }

        return "bluetooth__button bluetooth__button--scan"
    }).as(splitClasses)
}

function createStatusLabel(stateAccessor: ReturnType<typeof createBluetoothPoll>) {
    return stateAccessor((state) => {
        if (!state.available) {
            return "No adapter"
        }

        if (!state.powered) {
            if (state.blocked) {
                return "Blocked"
            }

            return "BT Off"
        }

        if (!state.devices.length) {
            return "Scan"
        }

        return `${state.devices.length} near`
    })
}

function createStatusClasses(stateAccessor: ReturnType<typeof createBluetoothPoll>) {
    return stateAccessor((state) => {
        if (!state.available || !state.powered) {
            return "bluetooth__status bluetooth__status--offline"
        }

        if (!state.devices.length) {
            return "bluetooth__status bluetooth__status--idle"
        }

        return "bluetooth__status bluetooth__status--online"
    }).as(splitClasses)
}

function rebuildDeviceList(
    box: Gtk.Box,
    devices: BluetoothDevice[],
    onToggle: (device: BluetoothDevice) => void,
) {
    let child = box.get_first_child()
    while (child) {
        const next = child.get_next_sibling()
        box.remove(child)
        child = next
    }

    const visibleDevices = devices.slice(0, 2)
    for (const device of visibleDevices) {
        const button = new Gtk.Button({
            label: truncateDeviceName(device.name),
            tooltipText: `${device.connected ? "Disconnect" : "Connect"} ${device.name}`,
        })
        button.add_css_class("bluetooth__device")
        if (device.connected) {
            button.add_css_class("bluetooth__device--connected")
        }
        button.set_halign(Gtk.Align.FILL)
        button.set_hexpand(true)
        button.connect("clicked", () => onToggle(device))
        box.append(button)
    }
}

export default function BluetoothTile() {
    const bluetooth = createBluetoothPoll()
    const powerClasses = createPowerClasses(bluetooth)
    const scanClasses = createScanClasses(bluetooth)
    const statusLabel = createStatusLabel(bluetooth)
    const statusClasses = createStatusClasses(bluetooth)

    return (
        <box
            cssClasses={["tile", "tile--square", "tile--bluetooth", "tile--dark"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                cssClasses={["bluetooth__content"]}
                vertical
                spacing={4}
                halign={Gtk.Align.FILL}
                valign={Gtk.Align.FILL}
                hexpand
                vexpand
            >
                <box
                    cssClasses={["bluetooth__controls"]}
                    spacing={4}
                    homogeneous
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <button
                        cssClasses={powerClasses}
                        label="BT"
                        tooltipText="Toggle Bluetooth"
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        onClicked={() => togglePower(bluetooth.get())}
                    />
                    <button
                        cssClasses={scanClasses}
                        label="Scan"
                        tooltipText="Scan for paired trusted devices"
                        sensitive={bluetooth((state) => state.available && state.powered)}
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        onClicked={() => scanBluetooth(bluetooth.get())}
                    />
                </box>
                <centerbox
                    cssClasses={["bluetooth__status-row"]}
                    orientation={Gtk.Orientation.HORIZONTAL}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <image
                        cssClasses={["bluetooth__decorative-icon", "bluetooth__decorative-icon--splash"]}
                        iconName="splash"
                        pixelSize={14}
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.CENTER}
                    />
                    <label
                        cssClasses={statusClasses}
                        label={statusLabel}
                        xalign={0.5}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        vexpand={false}
                    />
                    <image
                        cssClasses={["bluetooth__decorative-icon", "bluetooth__decorative-icon--stars"]}
                        iconName="four_stars"
                        pixelSize={24}
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                    />
                </centerbox>
                <box
                    cssClasses={["bluetooth__devices"]}
                    vertical
                    spacing={3}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.FILL}
                    hexpand
                    vexpand
                    setup={(self) => {
                        rebuildDeviceList(self, bluetooth.get().devices, toggleDevice)
                        bluetooth.subscribe((state) => {
                            rebuildDeviceList(self, state.devices, toggleDevice)
                        })
                    }}
                />
            </box>
        </box>
    )
}
