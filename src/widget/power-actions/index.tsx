import { Gtk } from "astal/gtk4"
import GLib from "gi://GLib"
import "./style.scss"

const LOCK_COMMAND = "hyprlock"
const LOGOUT_COMMAND =
    'sh -lc \'if command -v hyprctl >/dev/null 2>&1; then hyprctl dispatch exit; elif command -v loginctl >/dev/null 2>&1; then loginctl terminate-user "$(id -un)"; fi\''
const SHUTDOWN_COMMAND = "systemctl poweroff"
const RESTART_COMMAND = "systemctl reboot"
const SLEEP_COMMAND = "systemctl suspend"

function runCommand(command: string) {
    try {
        GLib.spawn_command_line_async(command)
    } catch (error) {
        return
    }
}

function lockSession() {
    runCommand(LOCK_COMMAND)
}

function logoutSession() {
    runCommand(LOGOUT_COMMAND)
}

function shutdownSystem() {
    runCommand(SHUTDOWN_COMMAND)
}

function restartSystem() {
    runCommand(RESTART_COMMAND)
}

function sleepSystem() {
    runCommand(SLEEP_COMMAND)
}

export default function PowerActionsTile() {
    return (
        <box
            cssClasses={["tile", "tile--square", "tile--power-actions", "tile--dark"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                cssClasses={["power-actions__content"]}
                vertical
                spacing={5}
                halign={Gtk.Align.FILL}
                valign={Gtk.Align.FILL}
                hexpand
                vexpand
            >
                <box
                    cssClasses={["power-actions__row", "power-actions__row--pair"]}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand
                >
                    <button
                        cssClasses={["power-actions__button", "power-actions__button--lock"]}
                        tooltipText="Lock"
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.CENTER}
                        onClicked={lockSession}
                    >
                        <image
                            cssClasses={["power-actions__icon"]}
                            iconName="60"
                            pixelSize={20}
                        />
                    </button>
                    <box hexpand />
                    <button
                        cssClasses={["power-actions__button", "power-actions__button--logout"]}
                        tooltipText="Logout"
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                        onClicked={logoutSession}
                    >
                        <image
                            cssClasses={["power-actions__icon"]}
                            iconName="20"
                            pixelSize={20}
                        />
                    </button>
                </box>
                <box
                    cssClasses={["power-actions__row", "power-actions__row--single"]}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand
                >
                    <box hexpand />
                    <button
                        cssClasses={["power-actions__button", "power-actions__button--shutdown"]}
                        tooltipText="Shutdown"
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        onClicked={shutdownSystem}
                    >
                        <image
                            cssClasses={["power-actions__icon"]}
                            iconName="262"
                            pixelSize={20}
                        />
                    </button>
                    <box hexpand />
                </box>
                <box
                    cssClasses={["power-actions__row", "power-actions__row--pair"]}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand
                >
                    <button
                        cssClasses={["power-actions__button", "power-actions__button--restart"]}
                        tooltipText="Restart"
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.CENTER}
                        onClicked={restartSystem}
                    >
                        <image
                            cssClasses={["power-actions__icon"]}
                            iconName="310"
                            pixelSize={20}
                        />
                    </button>
                    <box hexpand />
                    <button
                        cssClasses={["power-actions__button", "power-actions__button--sleep"]}
                        tooltipText="Sleep"
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                        onClicked={sleepSystem}
                    >
                        <image
                            cssClasses={["power-actions__icon"]}
                            iconName="66"
                            pixelSize={20}
                        />
                    </button>
                </box>
            </box>
        </box>
    )
}
