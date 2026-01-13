import { App } from "astal/gtk4"
import style from "./style.scss"
import Bar from "./widget/Bar"

App.start({
    css: style,
    main() {
        const monitors = App.get_monitors()
        Bar(monitors[0], App)
    },
})
