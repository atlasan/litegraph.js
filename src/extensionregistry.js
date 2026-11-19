/**
 * Extensions with identity and clean removal.
 *
 * ```js
 * const dispose = LiteGraph.registerExtension({
 *     name: "my.extension",
 *     commands: [{ id: "my.hello", run: (ctx) => ..., mutatesGraph: true }],
 *     keybindings: [{ combo: "ctrl+h", commandId: "my.hello" }],
 *     settings: [{ id: "My.Flag", default: true }],
 *     setup(ctx) {
 *         ctx.on("onNodeTypeRegistered", (info, type) => ...);           // LiteGraph-level hook
 *         ctx.onCanvas((canvas, c) => c.on("onKeyDown", (info, e) => ...)); // every canvas, now and later
 *         return () => { ... };                                            // optional extra cleanup
 *     },
 * });
 * dispose(); // removes every command, binding, setting and hook registered above
 * ```
 *
 * Everything an extension registers goes through its context, so disposing it undoes all of it,
 * in reverse order. Hooks are CallbackHandler registrations (`opts.priority`, `prevent_default`,
 * `stop_replication` keep working). Names listed in `disabled` are skipped at registration time.
 */
export class ExtensionRegistry {

    /**
     * @param {object} host - normally the LiteGraph instance: provides registerCallbackHandler,
     *   unregisterCallbackHandler, commands, keybindings, settings
     */
    constructor(host) {
        this.host = host;
        /** @type {Map<string, {def: object, dispose: () => void}>} */
        this._extensions = new Map();
        /** names that must not be registered */
        this.disabled = new Set();
        /** @type {Set<object>} live canvases */
        this._canvases = new Set();
        /** @type {Set<(canvas: object) => void>} */
        this._canvasListeners = new Set();
    }

    /** Called by LGraphCanvas on construction; also usable for canvases made before the registry. */
    attachCanvas(canvas) {
        if (!canvas || this._canvases.has(canvas)) return;
        this._canvases.add(canvas);
        canvas.events?.on?.("disposed", () => this._canvases.delete(canvas));
        for (const listener of [...this._canvasListeners]) listener(canvas);
    }

    /** @returns {object[]} live canvases known to the registry */
    get canvases() {
        return [...this._canvases];
    }

    has(name) {
        return this._extensions.has(name);
    }

    /** @returns {string[]} registered extension names, in registration order */
    list() {
        return [...this._extensions.keys()];
    }

    get(name) {
        return this._extensions.get(name)?.def ?? null;
    }

    /**
     * Registers an extension.
     * @param {object} def - {name, version?, requires?: string[], commands?, keybindings?, settings?, menus?: {canvas?, node?}, setup?(ctx)}
     * @returns {() => void} disposer (a no-op when the extension is disabled)
     * @throws when the name is missing or taken, a required extension is missing, or setup throws
     *   (whatever was registered before the failure is undone first)
     */
    register(def) {
        if (!def || typeof def.name !== "string" || !def.name) throw new TypeError("extension name must be a non-empty string");
        if (this._extensions.has(def.name)) throw new Error(`extension ${def.name} is already registered`);
        if (this.disabled.has(def.name)) {
            console.info?.(`extension ${def.name} is disabled, not registered`);
            return () => {};
        }
        for (const required of def.requires ?? []) {
            if (!this._extensions.has(required)) throw new Error(`extension ${def.name} requires ${required}`);
        }

        const disposers = [];
        const track = (dispose) => {
            if (typeof dispose === "function") disposers.push(dispose);
            return dispose;
        };
        const disposeAll = () => {
            while (disposers.length) {
                const dispose = disposers.pop();
                try { dispose(); } catch (error) { console.error?.(`extension ${def.name}: cleanup failed`, error); }
            }
        };
        const host = this.host;
        const hookOn = (target, name, fn, opts) => {
            const id = target.registerCallbackHandler(name, fn, opts);
            if (id === false || id === undefined) throw new Error(`extension ${def.name}: could not register ${name}`);
            return track(() => target.unregisterCallbackHandler(name, id));
        };
        const ctx = {
            name: def.name,
            host,
            commands: { register: (command) => track(host.commands.register(command)) },
            keybindings: { add: (binding) => track(host.keybindings.add(binding)) },
            settings: {
                define: (setting) => track(host.settings.define(setting)),
                get: (id) => host.settings.get(id),
                set: (id, value) => host.settings.set(id, value),
            },
            /** LiteGraph-level hook (e.g. "on_lgraphcanvas_construct", "onNodeTypeRegistered"). */
            on: (name, fn, opts) => hookOn(host, name, fn, opts),
            /** Adds context-menu items ("canvas" or "node"; see MenuRegistry). */
            menus: { register: (location, provider) => track(host.menus.register(location, provider)) },
            /** Typed event listener (graph.events / canvas.events), removed on dispose. */
            onEvent: (target, type, listener, options) => {
                const events = target?.events;
                if (!events?.on) throw new Error(`extension ${def.name}: target has no typed events`);
                return track(events.on(type, listener, options));
            },
            /** Hook on any object with a CallbackHandler (graph, node, canvas). */
            onTarget: (target, name, fn, opts) => hookOn(target, name, fn, opts),
            /** Runs fn for every live canvas and every canvas created later, with a per-canvas `on`. */
            onCanvas: (fn) => {
                const apply = (canvas) => {
                    const canvasCtx = { on: (name, handler, opts) => hookOn(canvas, name, handler, opts) };
                    track(fn(canvas, canvasCtx));
                };
                this._canvasListeners.add(apply);
                track(() => this._canvasListeners.delete(apply));
                for (const canvas of this._canvases) apply(canvas);
            },
            /** Adds a cleanup function run on dispose. */
            addDisposer: (dispose) => track(dispose),
        };

        try {
            for (const setting of def.settings ?? []) ctx.settings.define(setting);
            for (const command of def.commands ?? []) ctx.commands.register(command);
            for (const binding of def.keybindings ?? []) ctx.keybindings.add(binding);
            for (const [location, provider] of Object.entries(def.menus ?? {})) ctx.menus.register(location, provider);
            if (typeof def.setup === "function") track(def.setup(ctx));
        } catch (error) {
            disposeAll();
            throw error;
        }

        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            disposeAll();
            if (this._extensions.get(def.name)?.dispose === dispose) this._extensions.delete(def.name);
        };
        this._extensions.set(def.name, { def, dispose });
        return dispose;
    }

    /** Disposes an extension by name. @returns {boolean} true if it was registered */
    unregister(name) {
        const entry = this._extensions.get(name);
        if (!entry) return false;
        entry.dispose();
        return true;
    }
}
