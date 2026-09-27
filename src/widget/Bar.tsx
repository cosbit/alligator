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
import { BAR_NAMESPACE } from "../services/bar-animation"

export default function Bar(gdkmonitor: Gdk.Monitor, app: Astal.Application) {
    const { TOP } = Astal.WindowAnchor
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
        tile.halign = Gtk.Align.FILL
        tile.valign = Gtk.Align.FILL
        tile.hexpand = false
        tile.vexpand = false
        grid.attach(tile, column, row, width, height)
    }

    attach(ClockTile(), 0, 0)
    attach(DateTile(), 0, 1)
    attach(FocusTile(), 1, 0, 1, 2)
    attach(VolumeTile(), 2, 0, 2)
    attach(DisplayTile(), 2, 1, 2)
    attach(BatteryTile(), 4, 0)
    attach(PowerActionsTile(), 4, 1)
    attach(NetworkTile(), 5, 0)
    attach(BluetoothTile(), 5, 1)

    return <window
        name="sidebar"
        namespace={BAR_NAMESPACE}
        cssClasses={["Bar"]}
        gdkmonitor={gdkmonitor}
        visible={true}
        exclusivity={Astal.Exclusivity.NORMAL}
        anchor={TOP}
        application={app}
        setup={self => app.add_window(self)}
        >
        {grid}
    </window>
}
