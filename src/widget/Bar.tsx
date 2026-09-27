import { Astal, Gdk, Gtk } from "astal/gtk4"
import ClockTile from "./clock"
import DateTile from "./date"
import BatteryTile from "./battery"
import VolumeTile from "./volume"
import PowerActionsTile from "./power-actions"
import DisplayTile from "./display"
import NetworkTile from "./network"
import BluetoothTile from "./bluetooth"
import FocusTile from "./focus"

export default function Bar(gdkmonitor: Gdk.Monitor, app: Astal.Application) {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor
    const tileGutter = 6
    const grid = new Gtk.Grid({
        cssClasses: ["bar__inner"],
        columnHomogeneous: true,
        rowHomogeneous: true,
        columnSpacing: tileGutter,
        rowSpacing: tileGutter,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        hexpand: false,
        vexpand: false,
    })

    function attach(tile: Gtk.Widget, column: number, row: number, width = 1, height = 1) {
        // The shared grid owns allocation; individual content must not shrink a tile.
        tile.halign = Gtk.Align.FILL
        tile.valign = Gtk.Align.FILL
        tile.hexpand = false
        tile.vexpand = false
        grid.attach(tile, column, row, width, height)
    }

    attach(ClockTile(), 0, 0)
    attach(DateTile(), 1, 0)
    attach(VolumeTile(), 0, 1, 2)
    attach(FocusTile(), 0, 2, 1, 2)
    attach(BatteryTile(), 1, 2)
    attach(PowerActionsTile(), 1, 3)
    attach(DisplayTile(), 0, 4, 2)
    attach(NetworkTile(), 0, 5)
    attach(BluetoothTile(), 1, 5)

    return <window
        name="sidebar"
        cssClasses={["Bar"]}
        gdkmonitor={gdkmonitor}
        visible={true}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        widthRequest={220}
        anchor={TOP | RIGHT | BOTTOM}
        application={app}
        setup={self => app.add_window(self)}
        >
        {grid}
    </window>
}
