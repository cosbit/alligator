import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
import GLib from "gi://GLib"
import "./style.scss"

const WIFI_POLL_INTERVAL_MS = 2_000
const VPN_POLL_INTERVAL_MS = 2_000
const VPN_INTERFACE = "wg0"
const VPN_SERVICE = `wg-quick-${VPN_INTERFACE}.service`

const WIFI_TOGGLE_COMMAND =
    "bash -lc 'if [ \"$(nmcli radio wifi 2>/dev/null)\" = \"enabled\" ]; then nmcli radio wifi off && notify-send \"WiFi\" \"Wi-Fi Disabled\" -i network-wireless-disabled-symbolic; else nmcli radio wifi on && notify-send \"WiFi\" \"Wi-Fi Enabled\" -i network-wireless-signal-excellent-symbolic; fi'"
const VPN_TOGGLE_COMMAND =
    `bash -lc 'if systemctl is-active --quiet ${VPN_SERVICE}; then sudo systemctl stop ${VPN_SERVICE} && notify-send "VPN" "VPN (${VPN_INTERFACE}) Disabled" -i network-vpn-disconnected-symbolic; else sudo systemctl start ${VPN_SERVICE} && notify-send "VPN" "VPN (${VPN_INTERFACE}) Enabled" -i network-vpn-symbolic; fi'`

const splitClasses = (value: string) =>
    value.trim().split(/\s+/).filter(Boolean)

type WifiState = {
    enabled: boolean
    device: string | null
    connected: boolean
    signal: number | null
    bars: string | null
    ipCidr: string | null
}

type VpnState = {
    active: boolean
    profile: string
    ipCidr: string | null
}

type WifiDeviceInfo = {
    device: string
    state: string
}

type WifiSignalInfo = {
    signal: number
    bars: string | null
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

function parseIPv4Cidr(output: string) {
    const match = output.match(/\binet\s+(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})\b/)
    return match?.[1] ?? null
}

function readDeviceIPv4Cidr(device: string | null) {
    if (!device) {
        return null
    }

    const output = safeSpawn(`ip -o -4 addr show dev ${device} scope global`)
    if (!output) {
        return null
    }

    return parseIPv4Cidr(output)
}

function parseWifiDeviceInfo(output: string) {
    const devices: WifiDeviceInfo[] = []

    for (const line of output.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) {
            continue
        }

        const [device, type, state] = trimmed.split(":")
        if (!device || type !== "wifi") {
            continue
        }

        devices.push({
            device,
            state: state?.trim() ?? "",
        })
    }

    if (!devices.length) {
        return null
    }

    return devices.find((entry) => entry.state.startsWith("connected")) ?? devices[0]
}

function readWifiDeviceInfo() {
    const output = safeSpawn("nmcli -t -f DEVICE,TYPE,STATE device status")
    if (!output) {
        return null
    }

    return parseWifiDeviceInfo(output)
}

function parseActiveWifiSignalTerse(output: string): WifiSignalInfo | null {
    for (const line of output.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) {
            continue
        }

        const [marker, signalRaw, barsRaw] = trimmed.split(":")
        const activeMarker = marker?.trim() ?? ""

        if (activeMarker !== "*" && activeMarker.toLowerCase() !== "yes") {
            continue
        }

        const signal = Number.parseInt(signalRaw ?? "", 10)
        if (Number.isNaN(signal)) {
            continue
        }

        return {
            signal: clamp(signal, 0, 100),
            bars: barsRaw?.trim() || null,
        }
    }

    return null
}

function parseActiveWifiSignalPretty(output: string): WifiSignalInfo | null {
    for (const line of output.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("*")) {
            continue
        }

        const tokens = trimmed.split(/\s+/).filter(Boolean)
        const barsIndex = tokens.findIndex((token) =>
            /^[▂▄▆█_]+$/.test(token) || /^\*+$/.test(token),
        )

        if (barsIndex <= 0) {
            continue
        }

        const signal = Number.parseInt(tokens[barsIndex - 1], 10)
        if (Number.isNaN(signal)) {
            continue
        }

        return {
            signal: clamp(signal, 0, 100),
            bars: tokens[barsIndex] ?? null,
        }
    }

    return null
}

function readActiveWifiSignal() {
    const terseOutput = safeSpawn(
        "nmcli -t -f IN-USE,SIGNAL,BARS device wifi list --rescan no",
    )

    const terseInfo = terseOutput ? parseActiveWifiSignalTerse(terseOutput) : null
    if (terseInfo) {
        return terseInfo
    }

    const prettyOutput = safeSpawn("nmcli device wifi")
    if (!prettyOutput) {
        return null
    }

    return parseActiveWifiSignalPretty(prettyOutput)
}

function readWifiRadioEnabled() {
    const output = safeSpawn("nmcli radio wifi")
    if (!output) {
        return false
    }

    return output.trim().toLowerCase().startsWith("enabled")
}

function readWifiState(): WifiState {
    const deviceInfo = readWifiDeviceInfo()
    const enabled = readWifiRadioEnabled()

    if (!enabled) {
        return {
            enabled: false,
            device: deviceInfo?.device ?? null,
            connected: false,
            signal: null,
            bars: null,
            ipCidr: null,
        }
    }

    const signalInfo = readActiveWifiSignal()
    const ipCidr = readDeviceIPv4Cidr(deviceInfo?.device ?? null)
    const stateLabel = deviceInfo?.state ?? ""
    const connected = stateLabel.startsWith("connected") || ipCidr !== null

    return {
        enabled,
        device: deviceInfo?.device ?? null,
        connected,
        signal: signalInfo?.signal ?? null,
        bars: signalInfo?.bars ?? null,
        ipCidr,
    }
}

function readVpnState(): VpnState {
    const status = safeSpawn(`systemctl is-active ${VPN_SERVICE}`)
    const active = status?.trim() === "active"

    return {
        active,
        profile: VPN_INTERFACE,
        ipCidr: active ? readDeviceIPv4Cidr(VPN_INTERFACE) : null,
    }
}

function createWifiPoll() {
    return createPoll(readWifiState(), WIFI_POLL_INTERVAL_MS, readWifiState)
}

function createVpnPoll() {
    return createPoll(readVpnState(), VPN_POLL_INTERVAL_MS, readVpnState)
}

function formatWifiPrimaryLabel(state: WifiState) {
    if (!state.enabled) {
        return "Wifi Off"
    }

    if (state.signal === null && state.ipCidr === null) {
        return "WiFi On"
    }

    if (state.signal === null) {
        return "--%"
    }

    return `${state.signal}%`
}

function formatWifiIpLabel(state: WifiState) {
    if (!state.enabled) {
        return ""
    }

    return state.ipCidr ?? ""
}

function formatVpnPrimaryLabel(state: VpnState) {
    if (!state.active) {
        return "VPN offline"
    }

    return state.profile
}

function formatVpnIpLabel(state: VpnState) {
    if (!state.active) {
        return ""
    }

    return state.ipCidr ?? ""
}

function toggleWifi() {
    runCommand(WIFI_TOGGLE_COMMAND)
}

function toggleVpn() {
    runCommand(VPN_TOGGLE_COMMAND)
}

export default function NetworkTile() {
    const wifi = createWifiPoll()
    const vpn = createVpnPoll()

    const wifiToggleClasses = wifi((state) => {
        if (state.enabled) {
            return "network__toggle network__toggle--wifi network__toggle--active"
        }

        return "network__toggle network__toggle--wifi"
    }).as(splitClasses)
    const vpnToggleClasses = vpn((state) => {
        if (state.active) {
            return "network__toggle network__toggle--vpn network__toggle--active"
        }

        return "network__toggle network__toggle--vpn"
    }).as(splitClasses)

    const wifiRowLabel = wifi((state) => formatWifiPrimaryLabel(state))
    const wifiRowLabelClasses = wifi((state) => {
        if (!state.enabled) {
            return "network__status-label network__status-label--offline"
        }

        if (!state.connected) {
            return "network__status-label network__status-label--idle"
        }

        return "network__status-label network__status-label--online"
    }).as(splitClasses)
    const wifiIpLabel = wifi((state) => formatWifiIpLabel(state))
    const wifiIpVisible = wifi((state) => Boolean(formatWifiIpLabel(state)))

    const vpnRowLabel = vpn((state) => formatVpnPrimaryLabel(state))
    const vpnRowLabelClasses = vpn((state) =>
        (
            state.active
                ? "network__status-label network__status-label--vpn-on"
                : "network__status-label network__status-label--offline"
        ),
    ).as(splitClasses)
    const vpnIpLabel = vpn((state) => formatVpnIpLabel(state))
    const vpnIpVisible = vpn((state) => Boolean(formatVpnIpLabel(state)))

    return (
        <box
            cssClasses={["tile", "tile--square", "tile--network", "tile--dark"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                cssClasses={["network__content"]}
                vertical
                spacing={4}
                homogeneous
                halign={Gtk.Align.FILL}
                valign={Gtk.Align.FILL}
                hexpand
                vexpand
            >
                <box
                    cssClasses={["network__row", "network__row--controls"]}
                    spacing={4}
                    homogeneous
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <button
                        cssClasses={wifiToggleClasses}
                        label="WiFi"
                        tooltipText="Toggle Wi-Fi"
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        onClicked={toggleWifi}
                    />
                    <button
                        cssClasses={vpnToggleClasses}
                        label="VPN"
                        tooltipText={`Toggle VPN (${VPN_INTERFACE})`}
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        onClicked={toggleVpn}
                    />
                </box>
                <box
                    cssClasses={["network__row", "network__row--wifi"]}
                    spacing={4}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <label
                        cssClasses={wifiRowLabelClasses}
                        label={wifiRowLabel}
                        xalign={0}
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        vexpand={false}
                    />
                    <label
                        cssClasses={["network__status-ip"]}
                        label={wifiIpLabel}
                        visible={wifiIpVisible}
                        xalign={1}
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                        hexpand={false}
                        vexpand={false}
                    />
                </box>
                <box
                    cssClasses={["network__row", "network__row--vpn"]}
                    spacing={4}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <label
                        cssClasses={vpnRowLabelClasses}
                        label={vpnRowLabel}
                        xalign={0}
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        vexpand={false}
                    />
                    <label
                        cssClasses={["network__status-ip"]}
                        label={vpnIpLabel}
                        visible={vpnIpVisible}
                        xalign={1}
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                        hexpand={false}
                        vexpand={false}
                    />
                </box>
            </box>
        </box>
    )
}
