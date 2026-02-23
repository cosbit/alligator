# AGENTS
! UPDATE THIS FILE ON EACH CONTEXT. THIS FILE SHOULD GROW LARGER AND LARGER. SPECIFY THE PURPUSE OF EACH FILE AND WHAT IT CONTAINS. ! 

## Purpose
Canonical architecture notes and workflow for the Alligator AGS widget set.

## Layout and growth
- `src/app.ts` is the entry point that registers windows and global setup (current implementation).
- `src/config.ts` is a legacy entry-point note; if reintroduced, keep it as a thin registrar.
- `src/style.scss` holds global styling and tile sizing/tiling rules; keep it lean and split into `src/styles/` as the theme grows.
- `src/styles/bar.scss` should hold Bar container layout and transparency rules (no tile sizing).
- `src/widgets/` should contain standalone widget factories (sidebar, panels, modules) if introduced later.
- `src/widget/` is the current widget directory; keep tile factories and Bar layout components here.
- `src/widget/<tile>/index.tsx` files are minimal tile factories (placeholders) with tile root classes for later content.
- `src/services/` should contain long-lived data sources or integrations.
- `src/utils/` should contain shared helpers with no UI coupling.
- `src/assets/` should contain images, icons, and other static resources.
- `prompts/` holds planning prompts for molecular widget tasks; each file is a discrete build step.

## Development workflow
- Enter the dev shell: `nix develop`
- Run the config locally: `ags -c ./src/app.ts`

## Conventions
- Keep windows named and stable so `ags toggle <name>` works predictably.
- Prefer simple widget factories over large monoliths in `config.ts`.
- Keep UI layout empty/transparent by default; fill in modules incrementally.
- Use GJS + GTK4 consistently (avoid GTK3 imports in new work).
- Use GTK CSS for presentation only; avoid web flexbox properties and move layout semantics into GTK widget props (`spacing`, `halign`, `valign`, `hexpand`, `vexpand`) or container structure.
- Use AGS Accessor bindings for state; call Accessors as functions inside `createComputed` to track dependencies.
- Prefer `createBinding` to GObject properties when available; fall back to `createPoll` for CLI commands and keep intervals modest.
- Keep binding helpers small and readable; derive display strings with `createComputed` rather than ad-hoc `setTimeout`/poll loops.
- When adding Sass `@use` directives (especially in `src/style.scss`), always specify a unique namespace with `as <name>` (e.g., `@use "./styles/bar" as bar;`) to avoid module name collisions.
- After any agent change, add a concise note to `AGENTS.md` describing the work and any future-facing guidance that would help the next agent; prefer updating `## File notes` when relevant.

## Prompt planning guidance
- When writing planning instructions in `prompts/`, be specific, surgical, and methodological.
- Spell out exact functions, files, and behavior; avoid vague or high-level steps.
- If any detail is unclear, do not guess. Add a short clarification request at the end of the prompt file.

## Binding tips and references
- Accessors: `createState` for local writable state, `createComputed` for derived values, `createBinding` for GObject properties.
- Polling: `createPoll(initial, intervalMs, commandOrFn)` for external commands; prefer event-driven sources when possible.
- Accessor usage: `value()` reads current value; `value((v) => ...)` is shorthand for `createComputed`.

## Poll + Variable guidance (AGS tips)
- Use `Variable().poll` (or `createPoll`) only when no event-driven API exists; prefer GObject bindings or signals first.
- Keep polling intervals modest (minutes for clock-like data) to avoid expensive subprocess churn.
- For CLI integration, keep commands simple and format output at the source (e.g., `date` format strings) to minimize parsing.
- Use `createComputed` (or Accessor shorthand) to derive display strings instead of manual timers.
- Avoid polling when you can use `GLib.DateTime`, JS `Date`, or newer `Temporal` for local time.

## Reference implementation (clock tile binding + layout)
- `src/widget/clock/index.tsx` uses a small `createPoll` helper around `Variable().poll` and binds to `date +"%-I:%M %p"` on a 60_000ms interval.
- The label reads the Accessor via `time()` and trims output once, keeping the format `9:23 AM`.
- The root tile uses `tile tile--square tile--clock tile--light` plus `halign/valign` center and `hexpand/vexpand={false}` to avoid filling the row.
- The label uses `halign/valign` center and `hexpand/vexpand` to center content inside the tile.
- `src/widget/clock/style.scss` holds typography and subtle vertical margins for optical centering.
- `src/style.scss` enforces solid tile fills with `background-color` and sets sizing via `--tile-unit` and `.tile` min sizes.
- `src/widget/Bar.tsx` uses `widthRequest={220}` as the bar width reference when balancing tile sizing.

## AGS JSX Reference Docs (for implementation reference)
# JSX

Syntactic sugar for creating objects declaratively.

> [!WARNING] This is not React
>
> This works nothing like React and has nothing in common with React other than
> the XML syntax.

Consider the following example:

```ts
function Box() {
  let counter = 0

  const button = new Gtk.Button()
  const icon = new Gtk.Image({
    iconName: "system-search-symbolic",
  })
  const label = new Gtk.Label({
    label: `clicked ${counter} times`,
  })
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
  })

  function onClicked() {
    label.label = `clicked ${counter} times`
  }

  button.set_child(icon)
  box.append(button)
  box.append(label)
  button.connect("clicked", onClicked)
  return box
}
```

Can be written as

```tsx
function Box() {
  const [counter, setCounter] = createState(0)
  const label = createComputed(() => `clicked ${counter()} times`)

  function onClicked() {
    setCounter((c) => c + 1)
  }

  return (
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
      <Gtk.Button onClicked={onClicked}>
        <Gtk.Image iconName="system-search-symbolic" />
      </Gtk.Button>
      <Gtk.Label label={label} />
    </Gtk.Box>
  )
}
```

## JSX expressions and `jsx` function

A JSX expression transpiles to a `jsx` function call. A JSX expression's type
however is **always** the base `GObject.Object` type, while the `jsx` return
type is the instance type of the class or the return type of the function you
pass to it. If you need the actual type of an object, either use the `jsx`
function directly or type assert the JSX expression.

```tsx
import { jsx } from "gnim"

const menubutton = new Gtk.MenuButton()

menubutton.popover = <Gtk.Popover /> // cannot assign Object to Popover // [!code error]
menubutton.popover = jsx(Gtk.Popover, {}) // works as expected

function MyPopover(): Gtk.Popover
menubutton.popover = <MyPopover /> // cannot assign Object to Popover // [!code error]
menubutton.popover = jsx(MyPopover, {}) // works as expected
```

## JSX Element

A valid JSX component must either be a function that returns a `GObject.Object`
instance, or a class that inherits from `GObject.Object`.

> [!TIP]
>
> `JSX.Element` is simply an alias for `GObject.Object`.

When two types have a parent-child relationship, they can be composed naturally
using JSX syntax. For example, this applies to types like `Gtk.EventController`:

```tsx
<Gtk.Box>
  <Gtk.GestureClick onPressed={() => print("clicked")} />
</Gtk.Box>
```

## Class components

When defining custom components, choosing between using classes vs. functions is
mostly down to preference. There are cases when one or the other is more
convenient to use, but you will mostly be using class components from libraries
such as Gtk, and defining function components for custom components.

Using classes in JSX expressions lets you set some additional properties.

### Constructor function

By default, classes are instantiated with the `new` keyword and initial values
are passed in. In cases where you need to use a static constructor function
instead, you can specify it with `$constructor`.

> [!WARNING]
>
> Initial values this way cannot be passed to the constructor and are set
> **after** construction. This means construct-only properties like `css-name`
> cannot be set.

```tsx
<Gtk.DropDown
  $constructor={() => Gtk.DropDown.new_from_strings(["item1", "item2"])}
/>
```

### Type string

Under the hood, the `jsx` function uses the
[Gtk.Buildable](https://docs.gtk.org/gtk4/iface.Buildable.html) interface, which
lets you use a type string to specify the type the `child` is meant to be.

> [!NOTE] In Gnome extensions, it has no effect.

```tsx
<Gtk.CenterBox>
  <Gtk.Box $type="start" />
  <Gtk.Box $type="center" />
  <Gtk.Box $type="end" />
</Gtk.CenterBox>
```

### Signal handlers

Signal handlers can be defined with an `on` prefix, and `notify::` signal
handlers can be defined with an `onNotify` prefix.

```tsx
<Gtk.Revealer
  onNotifyChildRevealed={(self) => print(self, "child-revealed")}
  onDestroy={(self) => print(self, "destroyed")}
/>
```

### Setup function

It is possible to define an arbitrary function to do something with the instance
imperatively. It is run **after** properties are set, signals are connected, and
children are appended, but **before** the `jsx` function returns.

```tsx
<Gtk.Stack $={(self) => print(self, "is about to be returned")} />
```

The most common use case is to acquire a reference to the widget in the scope of
the function.

```tsx
function MyWidget() {
  let box: Gtk.Box

  function someHandler() {
    console.log(box)
  }

  return <Gtk.Box $={(self) => (box = self)} />
}
```

Another common use case is to initialize relations between widgets in the tree.

```tsx
function MyWidget() {
  let searchbar: Gtk.SearchBar

  function init(win: Gtk.Window) {
    searchbar.set_key_capture_widget(win)
  }

  return (
    <Gtk.Window $={init}>
      <Gtk.SearchBar $={(self) => (searchbar = self)}>
        <Gtk.SearchEntry />
      </Gtk.SearchBar>
    </Gtk.Window>
  )
}
```

### Bindings

Properties can be set as a static value. Alternatively, they can be passed an
[Accessor](#state-management), in which case whenever its value changes, it will
be reflected on the widget.

```tsx
const [revealed, setRevealed] = createState(false)

return (
  <Gtk.Button onClicked={() => setRevealed((v) => !v)}>
    <Gtk.Revealer revealChild={revealed}>
      <Gtk.Label label="content" />
    </Gtk.Revealer>
  </Gtk.Button>
)
```

### How children are passed to class components

Class components can only take `GObject.Object` instances as children. They are
set through
[`Gtk.Buildable.add_child`](https://docs.gtk.org/gtk4/iface.Buildable.html).

> [!NOTE]
>
> In Gnome extensions, they are set with `Clutter.Actor.add_child`.

```ts
@register({ Implements: [Gtk.Buildable] })
class MyContainer extends Gtk.Widget {
  vfunc_add_child(
    builder: Gtk.Builder,
    child: GObject.Object,
    type?: string | null,
  ): void {
    if (child instanceof Gtk.Widget) {
      // set children here
    } else {
      super.vfunc_add_child(builder, child, type)
    }
  }
}
```

### Class names and inline CSS

JSX supports setting `class` and `css` properties. `css` is mostly meant to be
used as a debugging tool, e.g. with `css="border: 1px solid red;"`. `class` is a
space-separated list of class names.

```tsx
<Gtk.Button class="flat" css="border: 1px solid red;" />
```

> [!NOTE]
>
> Besides `class`, you can also use `css-classes` in Gtk4 and `style-class` in
> Gnome.

### This component

In most cases, you will use JSX to instantiate objects. However, there are cases
when you have a reference to an instance that you would like to use in a JSX
expression, for example, in subclasses.

```tsx
@register()
class Row extends Gtk.ListBoxRow {
  constructor(props: Partial<Gtk.ListBoxRow.ConstructorProps>) {
    super(props)

    void (
      <This this={this as Row} onActivate={() => print("activated")}>
        <Gtk.Label label="content" />
      </This>
    )
  }
}
```

## Function components

### Setup function

Just like class components, function components can also have a setup function.

```tsx
import { FCProps } from "gnim"

type MyComponentProps = FCProps<
  Gtk.Button,
  {
    prop?: string
  }
>

function MyComponent({ prop }: MyComponentProps) {
  return <Gtk.Button label={prop} />
}

return <MyComponent $={(self) => print(self, "is a Button")} prop="hello" />
```

> [!NOTE]
>
> `FCProps` is required for TypeScript to be aware of the `$` prop.

### How children are passed to function components

They are passed in through the `children` property. They can be of any type.

```tsx
interface MyButtonProps {
  children: string
}

function MyButton({ children }: MyButtonProps) {
  return <Gtk.Button label={children} />
}

return <MyButton>Click Me</MyButton>
```

When multiple children are passed in, `children` is an `Array`.

```tsx
interface MyBoxProps {
  children: Array<GObject.Object | string>
}

function MyBox({ children }: MyBoxProps) {
  return (
    <Gtk.Box>
      {children.map((item) =>
        item instanceof Gtk.Widget ? (
          item
        ) : (
          <Gtk.Label label={item.toString()} />
        ),
      )}
    </Gtk.Box>
  )
}

return (
  <MyBox>
    Some Content
    <Gtk.Button />
  </MyBox>
)
```

### Everything has to be handled explicitly in function components

There is no builtin way to define signal handlers or bindings automatically.
With function components, they have to be explicitly declared and handled.

```tsx
interface MyWidgetProps {
  label: Accessor<string> | string
  onClicked: (self: Gtk.Button) => void
}

function MyWidget({ label, onClicked }: MyWidgetProps) {
  return <Gtk.Button onClicked={onClicked} label={label} />
}
```

> [!TIP]
>
> To make reusable function components more convenient to use, you should
> annotate props as either static or dynamic and handle both cases as if it was
> dynamic.
>
> ```ts
> type $<T> = T | Accessor<T>
> const $ = <T>(value: $<T>): Accessor<T> =>
>   value instanceof Accessor ? value : new Accessor(() => value)
> ```

```tsx
function Counter(props: {
  count?: $<number>
  label?: $<string>
  onClicked?: () => void
}) {
  const count = $(props.count)((v) => v ?? 0)
  const label = $(props.label)((v) => v ?? `Fallback label ${count()}`)

  return <Gtk.Button label={label} onClicked={props.onClicked} />
}
```

## Control flow

### Dynamic rendering

When you want to render based on a value, you can use the `<With>` component.

```tsx
let value: Accessor<{ member: string } | null>

return (
  <With value={value}>
    {(value) => value && <Gtk.Label label={value.member} />}
  </With>
)
```

> [!TIP]
>
> In a lot of cases, it is better to always render the component and set its
> `visible` property instead.

> [!WARNING]
>
> When the value changes and the widget is re-rendered, the previous one is
> removed from the parent component and the new one is **appended**. The order
> of widgets is not kept, so make sure to wrap `<With>` in a container to avoid
> this.

### List rendering

The `<For>` component lets you render based on an array dynamically. Each time
the array changes, it is compared with its previous state. Widgets for new items
are inserted, while widgets associated with removed items are removed.

```tsx
let list: Accessor<Iterable<any>>

return (
  <For each={list}>
    {(item, index: Accessor<number>) => (
      <Gtk.Label label={index((i) => `${i}. ${item}`)} />
    )}
  </For>
)
```

> [!WARNING]
>
> Similarly to `<With>`, when the list changes and a new item is added, it is
> simply **appended** to the parent. The order of widgets is not kept, so make
> sure to wrap `<For>` in a container to avoid this.

### Fragments

Both `<When>` and `<For>` are `Fragment`s. A `Fragment` is a collection of
children. Whenever the children array changes, it is reflected on the parent
widget the `Fragment` was assigned to. When implementing custom widgets, you
need to take into consideration the API being used for child insertion and
removing.

- Both Gtk3 and Gtk4 uses the `Gtk.Buildable` interface to append children.
- Gtk3 uses the `Gtk.Container` interface to remove children.
- Gtk4 checks for a method called `remove`.
- Clutter uses `Clutter.Actor.add_child` and `Clutter.Actor.remove_child`.

## State management

There is a single primitive called `Accessor`, which is a read-only reactive
value. It is the base of Gnim's reactive system. They are essentially functions
that let you read a value and track it in reactive scopes so that when they
change the reader is notified.

```ts
interface Accessor<T> {
  (): T
  peek(): T
  subscribe(callback: Callback): DisposeFn
}
```

There are two ways to read the current value:

- `(): T`: which returns the current value and tracks it as a dependency in
  reactive scopes
- `peek(): T` which returns the current value **without** tracking it as a
  dependency

To subscribe for value changes you can use the `subscribe` method.

```ts
const accessor: Accessor<any>

const unsubscribe = accessor.subscribe(() => {
  console.log("value of accessor changed to", accessor.get())
})

unsubscribe()
```

> [!WARNING]
>
> The subscribe method is not scope aware. Do not forget to clean them up when
> no longer needed. Alternatively, use an [`effect`](#createeffect) instead.

### `createState`

Creates a writable reactive value.

```ts
function createState<T>(init: T): [Accessor<T>, Setter<T>]
```

Example:

```ts
const [value, setValue] = createState(0)

// setting its value
setValue(2)
setValue((prev) => prev + 1)
```

> [!IMPORTANT]
>
> Effects and computations are only triggered when the value changes.

By default, equality between the previous and new value is checked with
[Object.is](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)
and so this would not trigger an update:

```ts
const [object, setObject] = createState({})

// this does NOT trigger an update by default
setObject((obj) => {
  obj.field = "mutated"
  return obj
})
```

You can pass in a custom `equals` function to customize this behavior:

```ts
const [value, setValue] = createState("initial value", {
  equals: (prev, next): boolean => {
    return prev != next
  },
})
```

### `createComputed`

Create a computed value which tracks dependencies and invalidates the value
whenever they change. The result is cached and is only computed on access.

```ts
function createComputed<T>(compute: () => T): Accessor<T>
```

Example:

```ts
let a: Accessor<number>
let b: Accessor<number>

const c: Accessor<number> = createComputed(() => a() + b())
```

> [!TIP]
>
> There is a shorthand for computed values.
>
> ```ts
> let a: Accessor<string>
> const b = createComputed(() => `transformed ${a()}`)
> const b = a((v) => `transformed ${v}`) // alias for the above line
> ```

### `createBinding`

Creates an `Accessor` on a `GObject.Object`'s `property`.

```ts
function createBinding<T extends GObject.Object, P extends keyof T>(
  object: T,
  property: Extract<P, string>,
): Accessor<T[P]>
```

Example:

```ts
const styleManager = Adw.StyleManager.get_default()
const style = createBinding(styleManager, "colorScheme")
```

It also supports nested bindings.

```ts
interface Outer extends GObject.Object {
  nested: Inner | null
}

interface Inner extends GObject.Object {
  field: string
}

const value: Accessor<string | null> = createBinding(outer, "nested", "field")
```

### `createEffect`

Schedule a function to run after the current Scope created with
[`createRoot`](#createroot) returns, tracking dependencies and re-running the
function whenever they change.

```ts
function createEffect(fn: () => void): void
```

Example:

```ts
const count: Accessor<number>

createEffect(() => {
  console.log(count()) // reruns whenever count changes
})

createEffect(() => {
  console.log(count.peek()) // only runs once
})
```

> [!CAUTION]
>
> Effects are a common pitfall for beginners to understand when to use and when
> not to use them. You can read about
> [when it is discouraged and their alternatives](./tutorial/gnim.md#when-not-to-use-an-effect).

### `createConnection`

```ts
function createConnection<
  T,
  O extends GObject.Object,
  S extends keyof O["$signals"],
>(
  init: T,
  handler: [
    object: O,
    signal: S,
    callback: (
      ...args: [...Parameters<O["$signals"][S]>, currentValue: T]
    ) => T,
  ],
): Accessor<T>
```

Creates an `Accessor` which sets up a list of `GObject.Object` signal
connections. It expects an initial value and a list of
`[object, signal, callback]` tuples where the callback is called with the
arguments passed by the signal and the current value as the last parameter.

Example:

```ts
const value: Accessor<string> = createConnection(
  "initial value",
  [obj1, "notify", (pspec, currentValue) => currentValue + pspec.name],
  [obj2, "sig-name", (sigArg1, sigArg2, currentValue) => "str"],
)
```

> [!IMPORTANT]
>
> The connection will only get attached when the first subscriber appears, and
> is dropped when the last one disappears.

### `createMemo`

Create a derived reactive value which tracks its dependencies and re-runs the
computation whenever a dependency changes. The resulting `Accessor` will only
notify subscribers when the computed value has changed.

```ts
function createMemo<T>(compute: () => T): Accessor<T>
```

It is useful to memoize values that are dependencies of expensive computations.

Example:

```ts
const value = createBinding(gobject, "field")

createEffect(() => {
  console.log("effect1", value())
})

const memoValue = createMemo(() => value())

createEffect(() => {
  console.log("effect2", memoValue())
})

value.notify("field") // triggers effect1 but not effect2
```

### `createSettings`

Wraps a `Gio.Settings` into a collection of setters and accessors.

```ts
function createSettings<const T extends Record<string, string>>(
  settings: Gio.Settings,
  keys: T,
): Settings<T>
```

Example:

```ts
const s = createSettings(settings, {
  "complex-key": "a{sa{ss}}",
  "simple-key": "s",
})

s.complexKey.subscribe(() => {
  print(s.complexKey.get())
})

s.setComplexKey((prev) => ({
  ...prev,
  neyKey: { nested: "" },
}))
```

### `createExternal`

Creates a signal from a `provider` function. The provider is called when the
first subscriber appears. The returned dispose function from the provider will
be called when the number of subscribers drops to zero.

```ts
function createExternal<T>(
  init: T,
  producer: (set: Setter<T>) => DisposeFunction,
): Accessor<T>
```

Example:

```ts
const counter = createExternal(0, (set) => {
  const interval = setInterval(() => set((v) => v + 1))
  return () => clearInterval(interval)
})
```

## Scopes and Life cycle

A [scope](./tutorial/gnim.md#scopes) is essentially a global object which holds
cleanup functions and context values.

```js
let scope = new Scope()

// Inside this function, synchronously executed code will have access
// to `scope` and will attach any allocated resources, such as signal
// subscriptions.
scopedFuntion()

// At a later point it can be disposed.
scope.dispose()
```

### `createRoot`

```ts
function createRoot<T>(fn: (dispose: () => void) => T)
```

Creates a root scope. Other than wrapping the main entry function in this, you
likely won't need this elsewhere. `<For>` and `<With>` components run their
children in their own scopes, for example.

Example:

```tsx
createRoot((dipose) => {
  return <Gtk.Window onCloseRequest={dispose}></Gtk.Window>
})
```

### `getScope`

Gets the current scope. You might need to reference the scope in cases where
async functions need to run in the scope.

Example:

```ts
const scope = getScope()
setTimeout(() => {
  // This callback gets run without an owner scope.
  // Restore owner via scope.run:
  scope.run(() => {
    const foo = FooContext.use()
    onCleanup(() => {
      print("some cleanup")
    })
  })
}, 1000)
```

### `onCleanup`

Attaches a cleanup function to the current scope.

Example:

```tsx
function MyComponent() {
  const dispose = signal.subscribe(() => {})

  onCleanup(() => {
    dispose()
  })

  return <></>
}
```

### `onMount`

Attaches a function to run when the farthest non-mounted scope returns.

Example:

```tsx
function MyComponent() {
  onMount(() => {
    console.log("root scope returned")
  })

  return <></>
}
```

### Contexts

Context provides a form of dependency injection. It lets you avoid the need to
pass data as props through intermediate components (a.k.a. prop drilling). The
default value is used when no Provider is found above in the hierarchy.

Example:

```tsx
const MyContext = createContext("fallback-value")

function ConsumerComponent() {
  const value = MyContext.use()

  return <Gtk.Label label={value} />
}

function ProviderComponent() {
  return (
    <Gtk.Box>
      <MyContext value="my-value">{() => <ConsumerComponent />}</MyContext>
    </Gtk.Box>
  )
}
```

## Intrinsic Elements

Intrinsic elements are globally available components, which in web frameworks
are usually HTMLElements such as `<div>` `<span>` `<p>`. There are no intrinsic
elements by default, but they can be set.

> [!TIP]
>
> It should always be preferred to use function/class components directly.

- Function components

  ```tsx
  import { FCProps } from "gnim"
  import { intrinsicElements } from "gnim/gtk4/jsx-runtime"

  type MyLabelProps = FCProps<
    Gtk.Label,
    {
      someProp: string
    }
  >

  function MyLabel({ someProp }: MyLabelProps) {
    return <Gtk.Label label={someProp} />
  }

  intrinsicElements["my-label"] = MyLabel

  declare global {
    namespace JSX {
      interface IntrinsicElements {
        "my-label": MyLabelProps
      }
    }
  }

  return <my-label someProp="hello" />
  ```

- Class components

  ```tsx
  import { CCProps } from "gnim"
  import { intrinsicElements } from "gnim/gtk4/jsx-runtime"
  import { property, register } from "gnim/gobject"

  interface MyWidgetProps extends Gtk.Widget.ConstructorProps {
    someProp: string
  }

  @register()
  class MyWidget extends Gtk.Widget {
    @property(String) someProp = ""

    constructor(props: Partial<MyWidgetProps>) {
      super(props)
    }
  }

  intrinsicElements["my-widget"] = MyWidget

  declare global {
    namespace JSX {
      interface IntrinsicElements {
        "my-widget": CCProps<MyWidget, MyWidgetProps>
      }
    }
  }

  return <my-widget someProp="hello" />
  ```

## Sidebar tile architecture (molecular components)
- The Bar window is a transparent container that only handles layout and spacing for tiles.
- Tiles are atomic subwidgets that render single information modules (clock, date, battery, power actions, storage, network).
- Tile shapes and proportions are standardized: square tiles are base units; vertical tiles are 2x height; horizontal tiles are 2x width.
- Global tiling, spacing, and sizing live in `src/style.scss`; per-tile typography and internal layout live with the tile files.
- Each tile should own its own directory under `src/widget/<tile>/` for markup and tile-specific styles.
- Layout plan:
  - Row 1: square tile, square tile.
  - Row 2: horizontal tile.
  - Row 3: vertical tile left, two square tiles right.
  - Row 4: horizontal tile.
  - Row 5: square tile.

## GTK Documentation
# Gtk

This page is merely an intro to Gtk and not a comprehensive guide. For more
in-depth concepts you can read the [Gtk docs](https://docs.gtk.org/gtk4/#extra).

## Running Gtk

To run Gtk you will have to initialize it, create widgets and run a GLib main
loop.

```ts
import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"

Gtk.init()

const loop = GLib.MainLoop.new(null, false)

// create widgets here

loop.runAsync()
```

## Your first widget

For a list of available widgets you can refer to the
[Gtk docs](https://docs.gtk.org/gtk4/visual_index.html). If you are planning to
write an app for the Gnome platform you might be interested in using
[Adwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/).

The top level widget that makes it possible to display something on the screen
is `Gtk.Window` and its various subclasses such as `Gtk.ApplicationWindow` and
`Adw.Window`.

```ts
const win = new Gtk.Window({
  defaultWidth: 300,
  defaultHeight: 200,
  title: "My App",
})

const titlebar = new Gtk.HeaderBar()

const label = new Gtk.Label({
  label: "Hello World",
})

win.set_titlebar(titlebar)
win.set_child(label)

win.connect("close-request", () => loop.quit())

win.present()
```

## Layout system

Gtk uses [LayoutManagers](https://docs.gtk.org/gtk4/class.LayoutManager.html) to
decide how a widget positions its children. You will only directly interact with
layout managers when implementing a custom widget. Gtk provides widgets that
implement some common layouts:

- [`Box`](https://docs.gtk.org/gtk4/class.Box.html) which positions its children
  in a horizontal/vertical row.

  ```ts
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
  })

  box.append(Gtk.Label.new("1"))
  box.append(Gtk.Label.new("2"))
  ```

- [`CenterBox`](https://docs.gtk.org/gtk4/class.CenterBox.html) which positions
  its children in three separate sections similar to `Box`

  ```ts
  const centerBox = new Gtk.CenterBox({
    orientation: Gtk.Orientation.HORIZONTAL,
  })

  centerBox.set_start_widget(Gtk.Label.new("start"))
  centerBox.set_center_widget(Gtk.Label.new("center"))
  centerBox.set_end_widget(Gtk.Label.new("end"))
  ```

- [`Overlay`](https://docs.gtk.org/gtk4/class.Overlay.html) which has a single
  child that dictates the size of the widget and positions each children on top.

  ```ts
  const overlay = new Gtk.Overlay()

  overlay.set_child(Gtk.Label.new("main child"))
  overlay.add_overlay(Gtk.Label.new("overlay"))
  ```

- [`Grid`](https://docs.gtk.org/gtk4/class.Grid.html) which positions its
  children in a table layout.

  ```ts
  const grid = new Gtk.Grid()

  grid.attach(Gtk.Label.new("0x0"), 0, 0, 1, 1)
  grid.attach(Gtk.Label.new("0x1"), 0, 1, 1, 1)
  ```

- [`Stack`](https://docs.gtk.org/gtk4/class.Stack.html) which displays only one
  of its children at once and lets you animate between them.

  ```ts
  const stack = new Gtk.Stack()

  stack.add_named(Gtk.Label.new("1"), "1")
  stack.add_named(Gtk.Label.new("2"), "2")

  stack.set_visible_child_name("2")
  ```

- [`ScrolledWindow`](https://docs.gtk.org/gtk4/class.ScrolledWindow.html)
  displays a single child in a viewport and adds scrollbars so that the whole
  widget can be displayed.

## Events

Gtk uses event controllers that you can assign to widgets that handle user
input. You can read more about event controllers on
[Gtk docs](https://docs.gtk.org/gtk4/input-handling.html#event-controllers-and-gestures).

Some common controllers:

- [EventControllerFocus](https://docs.gtk.org/gtk4/class.EventControllerFocus.html)
- [EventControllerKey](https://docs.gtk.org/gtk4/class.EventControllerKey.html)
- [EventControllerMotion](https://docs.gtk.org/gtk4/class.EventControllerMotion.html)
- [EventControllerScroll](https://docs.gtk.org/gtk4/class.EventControllerScroll.html)
- [GestureClick](https://docs.gtk.org/gtk4/class.GestureClick.html)
- [GestureDrag](https://docs.gtk.org/gtk4/class.GestureDrag.html)
- [GestureSwipe](https://docs.gtk.org/gtk4/class.GestureDrag.html)

```ts
let widget: Gtk.Widget

const gestureClick = new Gtk.GestureClick({
  propagationPhase: Gtk.PropagationPhase.BUBBLE,
})

gestureClick.connect("pressed", () => {
  console.log("clicked")
  return true
})

widget.add_controller(gestureClick)
```

Gtk provides widgets for various forms of user input so you might not need an
event controller.

- [`Button`](https://docs.gtk.org/gtk4/class.Button.html)
- [`Switch`](https://docs.gtk.org/gtk4/class.Switch.html)
- [`Scale`](https://docs.gtk.org/gtk4/class.Scale.html)
- [`Entry`](https://docs.gtk.org/gtk4/class.Entry.html)


## Production goal
- Toggle the sidebar: `ags toggle sidebar`

## File notes
- `AGENTS.md` captures workflow rules and running architecture notes for the repo.
- `src/widget/Bar.tsx` defines the Bar window container and tile layout rows.
- `src/widget/Bar.tsx` now uses GTK4 imports, sets `name="sidebar"`, and renders row containers under `.bar__inner`.
- `src/widget/Bar.tsx` now applies GTK layout props (`spacing`, `halign`) to replace flexbox-style alignment.
- `src/widget/Bar.tsx` now renders tile placeholders with `.tile` shape classes to match the layout rows.
- `src/style.scss` defines global tile sizing, spacing, and layout rules for the sidebar; it now imports the Bar-specific partial and avoids unsupported GTK4 CSS sizing properties.
- `src/style.scss` now defines global CSS variables for bar width, tile unit sizing, gutter spacing, and Gruvbox palette tokens, plus `.tile` sizing and shape variants with dark/light theme classes.
- `src/style.scss` now uses `background-color` for `.tile--dark` and `.tile--light` so tiles render solid fills.
- `src/styles/bar.scss` defines Bar container transparency, width, spacing, and row alignment rules (layout-only).
- `src/styles/bar.scss` now only contains GTK CSS-friendly presentation rules (no flexbox layout properties).
- `prompts/01-bar-container.md` defines the prompt for the transparent Bar container setup.
- `prompts/02-global-tiling-scss.md` defines the prompt for global tile sizing and layout SCSS.
- `prompts/02-global-tiling-scss.md` now emphasizes fixed-size, non-growing tiles, lists explicit tile classes, adds Gruvbox theme tokens plus dark/light tile variants, and keeps instructions GTK4-CSS-friendly with `src/style.scss` as the only file to edit.
- `prompts/03-layout-rows.md` defines the prompt for assembling the tile layout rows.
- `prompts/04-tile-scaffold.md` defines the prompt for scaffolding tile directories and exports.
- `prompts/05-clock-tile.md` defines the prompt for the clock tile content and styles.
- `prompts/05-clock-tile.md` now specifies a createPoll Accessor bound to the `date` command, minute-formatted time output, light theme styling, centered label margins, and logic-first/layout-last file ordering.
- `prompts/06-date-tile.md` defines the prompt for the date tile content and styles.
- `prompts/06-date-tile.md` now specifies a two-label layout with a larger day name and a smaller date formatted as `01 Jan 2026`.
- `prompts/07-battery-tile.md` defines the prompt for the battery tile content and styles.
- `prompts/08-power-actions-tile.md` defines the prompt for the power actions tile content and styles.
- `prompts/09-storage-tile.md` defines the prompt for the storage tile content and styles.
- `prompts/10-network-tile.md` defines the prompt for the network tile content and styles.
- `src/widget/clock/index.tsx` defines the clock tile placeholder component with the `tile--clock` root class.
- `src/widget/clock/index.tsx` now centers the clock tile and disables expansion so it stays square-sized.
- `src/widget/date/index.tsx` defines the date tile placeholder component with the `tile--date` root class.
- `src/widget/battery/index.tsx` defines the battery tile placeholder component with the `tile--battery` root class.
- `src/widget/power-actions/index.tsx` defines the power actions tile placeholder component with the `tile--power-actions` root class.
- `src/widget/storage/index.tsx` defines the storage tile placeholder component with the `tile--storage` root class.
- `src/widget/network/index.tsx` defines the network tile placeholder component with the `tile--network` root class.
- `src/widget/clock/index.tsx` now implements the clock tile using a `createPoll` helper bound to the `date` command and centers a time label inside a light-themed square tile.
- `src/widget/clock/style.scss` styles the clock tile typography and adds gentle label margins for optical balance.
- `src/widget/Bar.tsx` now renders the clock tile in the first square slot of the top row.
- `src/style.scss` now imports the clock tile stylesheet so the tile-level typography rules are loaded with the global CSS.
- `src/style.scss` now namespaces Sass `@use` imports to avoid module name collisions for tile stylesheets.
- `src/widget/date/style.scss` defines the date tile typography hierarchy and optical margins for `.date__day` and `.date__full`.
- `prompts/06-date-tile.md` now calls for GTK4 imports, a `createPoll` helper around `Variable().poll`, and label class names that match the date tile styles while avoiding Bar edits unless missing.
- `src/widget/date/index.tsx` now implements the date tile with `createPoll` Accessors for day/date labels, plus centered GTK layout props for a two-label stack.
- `prompts/07-battery-tile.md` now details the battery tile plan with Accessor-based polling/binding guidance, label classes, layout/styling requirements, and data-source clarifications.
- `src/widget/battery/index.tsx` now reads sysfs battery capacity/status with a function-based poll, derives cell classes via Accessors, and renders a four-cell indicator plus charging glyph.
- `src/widget/battery/style.scss` defines compact battery cell sizing, active/warning/inactive colors, and glyph typography for the battery tile.
- `src/style.scss` now imports the battery tile stylesheet with a unique Sass namespace.
- `src/widget/Bar.tsx` now renders the battery tile in the stacked square slot of the split row.
- `src/widget/date/index.tsx` now uses Astal `Variable` bindings to trim day/date labels without `createComputed` imports.
- `src/widget/battery/index.tsx` now derives battery cell classes and glyphs via Astal `Variable` bindings to avoid missing `createComputed` exports.
- `prompts/11-style-troubleshoot.md` defines a diagnostic prompt for when tile sizing/colors are missing at runtime, covering CSS injection, class assignment, and SCSS load checks.
- `prompts/12-battery-low-notify.md` defines the prompt for low-battery `makoctl` notifications with per-percent drop throttling plus charger plug/unplug alerts.
- `prompts/13-audio-tile.md` defines the prompt for a horizontal audio controls tile with now-playing label, volume slider, mute toggle, and transport buttons.
- `src/widget/Bar.tsx` now uses the `class` prop instead of `className` for GTK CSS classes so the sidebar container and layout rows pick up styles.
- `src/widget/clock/index.tsx` now uses the `class` prop instead of `className` so tile and label selectors apply.
- `src/widget/date/index.tsx` now uses the `class` prop instead of `className` so tile and label selectors apply.
- `src/widget/battery/index.tsx` now uses the `class` prop instead of `className`, including Accessor-driven class bindings for battery cells.
- `src/widget/power-actions/index.tsx` now uses the `class` prop instead of `className` for its tile root.
- `src/widget/storage/index.tsx` now uses the `class` prop instead of `className` for its tile root.
- `src/widget/network/index.tsx` now uses the `class` prop instead of `className` for its tile root.
- `src/styles/_tokens.scss` defines shared Sass tokens for tile sizing and the Gruvbox palette so GTK CSS avoids unsupported `var(...)` usage.
- `src/style.scss` now consumes Sass tokens for tile sizing and dark/light colors instead of CSS custom properties.
- `src/widget/battery/style.scss` now consumes Sass tokens for battery cell colors instead of CSS custom properties.
- `src/widget/Bar.tsx` now uses `cssClasses` arrays instead of `class` so GTK4 widgets receive CSS classes through the Astal runtime.
- `src/widget/clock/index.tsx` now uses `cssClasses` arrays so tile and label selectors apply in GTK4.
- `src/widget/date/index.tsx` now lowercases day/date output, splits the date into day/month/year labels for styling, and centers the labels with explicit x-alignment.
- `src/widget/date/index.tsx` now derives date day/month/year labels directly from the date poll accessor to avoid chaining on non-accessor values.
- `src/widget/date/style.scss` now styles the date row via `.date__part` and colors `.date__month` with the Gruvbox orange token.
- `src/widget/clock/index.tsx` plus `src/widget/clock/style.scss` can allow the clock label’s natural width to exceed `$tile-unit`, so square tiles may grow horizontally unless the label typography is tightened or the tile/label width is constrained.
- `src/widget/clock/style.scss` now reduces the clock time font size and letter spacing with tighter margins to keep the time label within the square tile width.
- `src/widget/date/index.tsx` and `src/widget/battery/index.tsx` now set tile-internal box spacing to 5px between child elements.
- `src/widget/Bar.tsx` now uses an 8px tile gutter to tighten spacing between tiles inside the bar layout.
- `src/style.scss` now applies a 9px border radius to `.tile` so all tiles share the same rounded edges, and tile-specific border radius rules were removed from `src/widget/clock/style.scss` and `src/widget/date/style.scss`.
- `src/styles/_tokens.scss` now defines shared spacing tokens, and `src/styles/bar.scss` plus tile styles in `src/widget/clock/style.scss`, `src/widget/date/style.scss`, and `src/widget/battery/style.scss` now use those tokens so margin/padding values stay consistent with the clock/date tile spacing scale.
- `src/styles/bar.scss` now uses the 10px spacing token for `.bar__inner` padding to tighten the outer padding around the tile grid.
- `src/styles/_tokens.scss` now sets `$tile-unit` to 106px, making all tiles 5px larger per side.
- `src/widget/date/index.tsx` now uses `cssClasses` arrays so tile and label selectors apply in GTK4.
- `src/widget/battery/index.tsx` now uses `cssClasses` arrays (including Accessor-mapped class lists) so battery cell classes apply in GTK4.
- `src/widget/power-actions/index.tsx` now uses `cssClasses` arrays for its tile root.
- `src/widget/storage/index.tsx` now uses `cssClasses` arrays for its tile root.
- `src/widget/network/index.tsx` now uses `cssClasses` arrays for its tile root.
- `src/widget/battery/index.tsx` now maps battery cell class strings to string arrays via `Binding.as(...)` so `cssClasses` bindings stay reactive without calling bindings as functions.
- `src/widget/volume/index.tsx` now implements a horizontal volume tile with live `wpctl` polling for output/input volume, mute toggles, and a sink selection popover plus defensive try/catch handling.
- `src/widget/volume/style.scss` defines the volume tile’s typography, button styling, and popover menu spacing.
- `src/widget/Bar.tsx` now renders the volume tile in the second-row horizontal slot.
- `src/style.scss` now imports the volume tile stylesheet with a unique Sass namespace.
- `src/widget/volume/index.tsx` now uses `.get()` for non-binding reads (initial adjustment value and sink menu rebuild) to avoid passing undefined into GTK object initializers.
- `src/widget/volume/index.tsx` now uses Astal's intrinsic `<slider>` widget (instead of `<scale>`/`<Gtk.Scale>`) so JSX resolves a supported ctor in `astal/gtk4` and avoids undefined-ctor runtime crashes.
- `src/widget/volume/index.tsx` now truncates the displayed default output label to 8 characters plus `...` (e.g., `Audio He...`) to keep the horizontal tile from growing too wide.
- `src/widget/volume/index.tsx` now constrains the device selector button width to 80% of the horizontal tile (using a 224px tile reference), preventing long output labels from widening the tile.
- `src/widget/volume/index.tsx` now sets the device selector button width to a fixed 80px so dropdown label width cannot expand the tile.
- `src/widget/volume/index.tsx` now uses a two-row layout where the header row contains the device selector plus output/mic mute buttons, while the second row keeps the slider and percent label together; widths are constrained to 70% for device selector and 80% for slider-row content using the 224px horizontal tile reference.
- `src/widget/volume/index.tsx` now aligns the volume tile content with `halign={Gtk.Align.CENTER}` and `valign={Gtk.Align.END}` on the tile wrapper/inner content container to reduce apparent empty top-level space.
- `src/widget/volume/index.tsx` now sets header/control rows to `halign={Gtk.Align.CENTER}` with `hexpand={false}`, and `src/widget/volume/style.scss` now removes horizontal tile padding (`padding: <vertical> 0`) so the parent tile no longer adds extra empty width around the expected content.
- `src/widget/volume/style.scss` now forces zero border/margin on `.volume__button` so theme-provided button borders do not add a few extra pixels that can widen the volume tile beyond the expected width.
- `src/widget/volume/style.scss` now adds `.volume__inner { margin-left: 20px; }` to intentionally nudge the volume tile content right during alignment tuning.
- `src/styles/_tokens.scss` now sets `$tile-gutter: 8px` so global horizontal/vertical tile dimensions match the 8px row spacing used in `src/widget/Bar.tsx`, keeping wide and square tile spans consistent.
- `src/widget/volume/index.tsx` now uses a 220px horizontal tile reference with a 70% device selector width so the volume tile's local width math matches the updated global tile span.
- `src/widget/volume/index.tsx` now computes the device selector width from the horizontal tile width minus header-row button widths and spacing (instead of a plain 70% ratio) and sets explicit 28px `widthRequest` on mute/mic buttons, preventing the header row from exceeding the tile by 2-3px.
- `src/widget/volume/style.scss` now reduces `.volume__inner` horizontal nudge from 20px to 8px, and `src/widget/volume/index.tsx` now trims an extra 16px from computed device selector width so the menu button occupies less horizontal space.
- `src/styles/_tokens.scss` now sets the global Gruvbox orange token to `#fe8019`; all orange-accented tiles/components inherit the brighter shared value.
- `src/widget/volume/style.scss` now overrides GTK4 `menubutton`, `button`, `popover`, and `slider` internals so the volume controls use dark tile backgrounds, orange borders/highlights, light foreground text, and a non-default slider handle/track palette.
- `src/widget/volume/style.scss` now explicitly disables GTK theme `background-image` layers on the menubutton's internal button node and on mute/mic buttons (including hover/active/disabled) so dark backgrounds are not washed out by default white gradient fills.
- `src/widget/volume/style.scss` now applies the same `background-image: none` override pattern to popover sink-selector buttons (`.volume__menu-item`, including hover/active/checked/disabled and active-item class) to prevent white default button gradients in the menu.
- `src/widget/volume/style.scss` now styles the volume slider with a taller trough (`12px`), orange border on highlighted/fill track segments, and a hidden GTK slider handle (`slider` node set transparent/zero-size/opacity 0) so only the themed bar is visible.
- `src/widget/volume/index.tsx` now uses a three-row layout: row 1 contains only the output device menu button, row 2 contains the volume slider + percent label, and row 3 contains control buttons.
- `src/widget/volume/index.tsx` now adds media transport buttons (previous, pause, play) in the new third row, wired to `playerctl` commands via `runMediaCommand(...)`.
- `src/widget/volume/index.tsx` now places mute and mic-mute buttons in the third row beside transport controls, and action-row buttons are configured with `hexpand` under a homogeneous container so widths are distributed evenly across the row.
- `src/widget/volume/index.tsx` now sets volume tile row containers to `halign={Gtk.Align.FILL}` with `hexpand` (and a homogeneous actions row), removing fixed row widths so all three rows use the full horizontal space inside the tile.
- `src/widget/volume/style.scss` now removes the inner-row left nudge (`margin-left: 0`) so full-width row fill is not offset.
- `src/widget/volume/style.scss` now applies horizontal tile padding (`tokens.$space-xs`, 5px) on `.tile--volume` so volume rows have consistent left/right inset from tile edges.
- `src/widget/volume/index.tsx` now targets 90% row usage of the horizontal tile (`ROW_CONTENT_WIDTH` from the 220px tile reference), applying centered `widthRequest` constraints to the inner container plus header/slider/actions rows instead of full-fill expansion.
- `src/widget/volume/style.scss` now compensates for the 5px left/right tile padding by reducing `.tile--volume` `min-width` by `tokens.$space-xs * 2`, keeping the overall outer width aligned with other horizontal tiles while preserving edge inset.
- `src/widget/volume/index.tsx` now tightens inner layout footprint to 85% row width, slightly reduces row spacing, and shortens default device-label truncation to 7 characters to prevent inner content from driving the tile wider.
- `src/widget/volume/style.scss` now reduces menubutton inner horizontal padding and volume button min size (`26px`) so control nodes have a smaller minimum width contribution.
- `src/styles/bar.scss` now removes outer container offsets (`.Bar`, `.bar__inner`, `.bar__row`, `.bar__column` margin/padding set to `0`) so window->bar->row spacing layers do not cumulatively widen sidebar rows.
- `src/widget/volume/style.scss` now removes borders from action-row buttons via `.volume__actions-row .volume__button`, and slightly shrinks their visual size (`24px` button box, `11px` font-size, `12px` icon min-size) without changing upper-row control styling.
- `src/widget/volume/index.tsx` now sets `CONTROL_ROW_SPACING` to `4` so action-row buttons have a small gap between each other while keeping the existing homogeneous button distribution.
- `src/widget/volume/index.tsx` now fixes slider width jitter by constraining the percent label to 4 characters (`widthChars/maxWidthChars`) and right-aligning it, so changing `1%`/`10%`/`100%` no longer reflows slider width.
- `src/widget/volume/index.tsx` now formats the percent label as a fixed-width 4-character string using leading non-breaking spaces (e.g., `  1%`, ` 10%`, `100%`) and `src/widget/volume/style.scss` enables tabular numerals for `.volume__percent` so the slider row no longer appears to shift at `100%`.
- `src/widget/battery/index.tsx` now renders 5 battery cells (20/40/60/80/100 thresholds), and `src/widget/battery/style.scss` tightens cell sizing while the tile keeps centered layout spacing.
- `src/widget/battery/index.tsx` now stacks battery content into two rows (cells on top, icon + percent on bottom) with symbolic charge/discharge icons, and `src/widget/battery/style.scss` now uses taller cells, 2px inter-cell spacing, and concave inset styling for inactive cells that match the tile background.
- `src/widget/battery/index.tsx` now sets the cell row/content container to fill horizontal space with homogeneous expanding cells, and `src/widget/battery/style.scss` now applies `6px` tile padding plus larger cell minimum dimensions for fuller-width battery bars.
- `src/widget/battery/style.scss` now slightly enlarges battery cells again (13x28 with 4px radius), and `src/widget/battery/index.tsx` now aligns the second-row status group to the right edge of the tile content.
- `src/widget/battery/style.scss` now adds a subtle green-tinted drop shadow to non-empty battery cells (`.battery__cell--active` and `.battery__cell--warning`) so filled segments glow slightly brighter against the tile.
- `src/widget/battery/style.scss` now uses inset (inner) green-tinted shadows for non-empty battery cells instead of outer drop shadows, keeping the brighter glow effect while making the fill look recessed.
- `src/widget/battery/style.scss` now keeps non-empty battery cells as inset highlights only (light/green inner glow) and removes darker inset shading so the fill reads as bright tint rather than shadow.
- `src/widget/power-actions/index.tsx` now implements the square dark power-actions tile with a three-row `2/1/2` icon-button layout (left-right, centered, left-right) and wires buttons in order: lock (`hyprlock`), logout, shutdown, restart, sleep.
- `src/widget/power-actions/style.scss` defines the power-actions tile’s internal spacing, row sizing, and icon-button presentation states (hover/active plus per-action accent colors).
- `src/widget/Bar.tsx` now imports and renders `PowerActionsTile` in the stacked slot directly below `BatteryTile` in the split third row.
- `src/widget/power-actions/style.scss` now keeps power-action buttons backgroundless by using transparent `background-color` (normal/hover/active) while still forcing `background-image: none` to suppress theme gradients.
- `src/widget/power-actions/style.scss` now forces power-action button backgrounds (base/hover/active/checked/focus) to the same dark value as the parent tile (`tokens.$gb-bg`) so GTK theme button fills do not show through.
- `src/widget/power-actions/style.scss` now mirrors the volume tile button-state styling (`$gb-bg` / `$gb-bg-soft` / `$gb-selection`) and also targets potential inner `> button` nodes to suppress GTK default fills where class-only selectors were insufficient.
- `src/widget/clock/index.tsx` now renders three clock-tile rows: a top row with a `Gtk.CenterBox` holding three icons, a middle row wrapping the clock label, and a bottom row with left/right floating icons.
- `src/widget/clock/style.scss` now styles the new clock row/icon structure and removes the clock label’s large top/bottom margins so the time no longer sits vertically centered by spacing.
- `src/widget/clock/index.tsx` now omits unsupported `$type` props on `Gtk.Image` children inside `Gtk.CenterBox`; Astal GTK4 assigns the first three `CenterBox` children to start/center/end slots by order.
- `src/widget/clock/index.tsx` now uses Astal’s intrinsic `centerbox` (not raw `Gtk.CenterBox`) for the top icon row, because the Astal wrapper handles JSX `children` and maps the first three children to start/center/end slots.
- `src/widget/clock/index.tsx` now also uses a vertical intrinsic `centerbox` for the clock tile’s outer three-row container so the top icon row, time row, and bottom icon row align into start/center/end slots consistently.
- `src/widget/clock/style.scss` now adds symmetric top/bottom margins to `.clock__row--time` to create visible spacing between the centered time row and the top/bottom icon rows, since `centerbox` has no `spacing` property.
- `src/widget/clock/index.tsx` now centers the middle clock row and the time label via `valign={Gtk.Align.CENTER}` inside the vertical `centerbox`, and `src/widget/clock/style.scss` removes the middle-row margin workaround so the time sits in the tile’s vertical middle instead of being offset by extra row margins.
- `src/widget/clock/index.tsx` now sets the outer vertical `centerbox` (`.clock__content`) to `valign={Gtk.Align.FILL}` so it stretches to the tile’s full height; without this, the center slot can appear offset because the container stays at natural height and aligns to the top.
- `src/widget/clock/style.scss` now drops leftover zero-value margin declarations (`.clock__content`, `.clock__row`, and `.clock__time`) after the clock centering was fixed structurally via the vertical `centerbox`.
- `src/widget/clock/style.scss` now adds edge insets to the clock tile’s icon rows (`.clock__row--top` and `.clock__row--bottom`) via row padding, so decorated icons do not sit flush against the tile borders even when `.tile--clock` padding is set to `0`.
- `src/style.scss` now applies a global `.tile--dark image` rule (`color: tokens.$gb-fg` plus `-gtk-icon-shadow: none`) so symbolic/currentColor icons in dark tiles inherit the same light foreground tone as text by default.
- `src/style.scss` now imports `src/widget/power-actions/style.scss` with a unique Sass namespace (`powerActions`); without that `@use`, the power-actions button overrides (including `background-image: none`) were not included in the app CSS, which made GTK theme gradients appear while volume buttons still looked correct.
- `src/widget/power-actions/style.scss` now uses transparent button borders and removes per-action `border-color` overrides, so the power-action buttons keep colored foreground icons without visible outline strokes.
- `src/icons/60.svg`, `src/icons/20.svg`, `src/icons/262.svg`, `src/icons/310.svg`, and `src/icons/66.svg` are the lock/logout/shutdown/restart/sleep power-action glyph sources; their root `<svg>` tags now set `fill="currentColor"` with `color="#ebdbb2"` fallback so they no longer render default black and can match dark-tile foreground styling.
- `src/widget/volume/index.tsx` uses local numeric SVGs `src/icons/33.svg` (mic) and `src/icons/45.svg` (previous track) alongside symbolic GTK icons; both local SVGs now use root `fill="currentColor"` with `color="#ebdbb2"` fallback, and `src/icons/33.svg` also maps `.cls-1` from `#fff` to `currentColor` so the whole glyph matches dark-tile text color.
- `src/widget/volume/index.tsx` now adds `tooltipText` labels to the action-row icon buttons (output mute, mic mute, previous, pause, play) to make the icon-only controls self-describing on hover.
- `src/widget/volume/index.tsx` `createIconWidget(fileName, fallbackIcon = fileName)` now defaults the theme fallback to the requested icon name and applies the CSS class once on the selected `Gtk.Image`, fixing the prior undefined `fallbackIcon` reference.
- `src/widget/display/index.tsx` defines the new row-4 wide light tile for display/brightness status: top decoration row (including a blue-light toggle button wired to `hyprctl hyprsunset` commands), centered active-window `initialTitle` label (truncated after 12 chars), brightness slider using `brightnessctl -d amdgpu_bl2`, and a bottom row with workspace count plus best-effort client app icons from `hyprctl clients`.
- `src/widget/display/style.scss` contains the display tile’s light-theme spacing, icon-button styling, title typography, brightness slider track/highlight overrides (with hidden GTK slider handle), and workspace/client-icon row styling.
- `src/widget/Bar.tsx` row 4 (display & brightness) now imports and renders `DisplayTile` instead of a dark placeholder box.
- `src/style.scss` now imports `src/widget/display/style.scss` and applies a `.tile--light image` default color rule so symbolic icons in light tiles inherit the light-tile foreground consistently.
- `src/widget/display/index.tsx` top-row `centerbox` now fixes both start/end icon groups to the same width (`TOP_ROW_SLOT_WIDTH`) so the decorative/action icons sit at visually consistent distances from the centered title.
- `src/widget/display/index.tsx` brightness slider now bootstraps from a synchronous `brightnessctl` read on widget creation (fallback `50%` if unavailable) and suppresses startup `onValueChanged` writes until the initial slider value is applied, preventing accidental brightness drops to `0%` during app startup.
- `src/widget/display/style.scss` row edge insets now use `margin` (top/left/right/bottom on row variants) instead of layout `padding`, keeping spacing behavior consistent with a margin-first layout style while retaining `padding: 0` only for widget reset cases (e.g., icon buttons).
- `src/widget/power-actions/style.scss` and `src/widget/battery/style.scss` now use inner content-container margins (`.power-actions__content`, `.battery__content`) to create inset spacing between tile edges and the tile’s internal controls/content, without adding outer tile margins that would affect grid alignment.
- `src/widget/display/index.tsx` brightness reads now prefer raw `brightnessctl get -d <device>` + `max -d <device>` parsing (computing percent from current/max) before falling back to legacy text parsing, fixing slider state sync on systems where `-m` output/order differs; `src/widget/display/index.tsx` also removes the narrow fixed content width so row widths fill the tile more consistently, with the title label capped via `widthChars/maxWidthChars` to prevent width jitter from different window titles.
- `src/widget/display/style.scss` now applies a single inner margin on `.display__content` (instead of per-row edge margins) so all display-tile rows share the same near-full-width inner track consistently.
- `src/widget/display/index.tsx` now includes temporary `DEBUG_BRIGHTNESS` console logging (`[display:brightness] ...`) around brightness reads/parsing, slider setup, poll updates, `onValueChanged`, and `brightnessctl set` commands to diagnose slider snap-back issues; remove or disable after debugging.
- `src/widget/display/index.tsx` brightness slider was stuck because the Astal `slider` widget did not run the gnim-style `$` setup callback (so `suppressBrightnessWrites` stayed `true` forever); the slider now uses `setup={...}` to hydrate initial value and release the suppression guard.
- `src/widget/display/index.tsx` blue-light button now dispatches the local `toggle-bluelight` command (single-command toggle) instead of direct `hyprctl hyprsunset` enable/disable commands; the tile still flips its local visual active state on click.
- `src/widget/display/style.scss` now mirrors the clock tile’s edge-spacing method: `.tile--display { padding: 0; }` and row-level padding insets (`.display__row--top`, `.display__row--brightness`, `.display__row--bottom` with left/right padding plus top/bottom row padding), replacing the interim `.display__content` margin approach.
- `src/widget/display/index.tsx` now reduces the top-row fixed side slot width to `50` (from `54`) to pull the display tile width back in after row-padding insets, disables temporary brightness debug logs by setting `DEBUG_BRIGHTNESS = false`, and makes the vertical content box `homogeneous` so the three rows distribute height evenly.
- `src/widget/display/style.scss` now gives `.tile--display` an explicit near-horizontal width (`tile span - 4px`) plus static tile height (`tokens.$tile-unit`) and sets `.display__row` `min-height: 24px` for more stable vertical row sizing.
- `src/widget/display/index.tsx` blue-light toggle now runs `bash -lc 'toggle-bluelight'` (instead of a bare command string) so AGS can pick up login-shell PATHs/scripts more reliably; `src/widget/display/index.tsx` also upgrades client polling from plain class strings to `{ address, appClass }` entries and renders clickable app-icon buttons that dispatch `hyprctl dispatch focuswindow address:<addr>` for each listed client.
- `src/widget/display/style.scss` adds `.display__client-button` styles so clickable client icons keep the same compact footprint and hover/active feedback without changing the row layout.
- `src/widget/network/index.tsx` now implements a square dark network tile with a first-row `WiFi` and `VPN` toggle button pair, a second-row decorative Wi-Fi icon plus Wi-Fi status label, and a third-row VPN status row; it polls every 2 seconds and reads Wi-Fi state/signal via `nmcli` (terse `IN-USE,SIGNAL,BARS` first, fallback parser for pretty `nmcli device wifi` output) plus IPv4 CIDRs via `ip -o -4 addr`.
- `src/widget/network/index.tsx` now toggles WireGuard using `wg-quick-wg0.service` with `sudo systemctl start/stop` and `notify-send`, matching the user-provided toggle flow; this assumes AGS can run the commands non-interactively (e.g., sudoers/Polkit setup for the service).
- `src/widget/network/style.scss` defines the network tile’s compact two-button control row, status-row icon colors, and small tabular status typography for IP/signal labels.
- `src/style.scss` now imports the network tile stylesheet with a unique Sass namespace.
- `src/widget/Bar.tsx` row 5 now imports and renders `NetworkTile` in the first square slot, leaving the second square placeholder for a future devices tile.
- `src/widget/network/index.tsx` now renders Wi-Fi/VPN IP addresses as separate trailing labels, and `src/widget/network/style.scss` styles `.network__status-ip` at `7px` (roughly 2/3 of the 10px status text) so the IP reads as secondary metadata.
- `src/widget/network/index.tsx` now removes the Wi-Fi and VPN row icon widgets so the bottom two network-tile rows are text-only (primary status + smaller trailing IP label).
