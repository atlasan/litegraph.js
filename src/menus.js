/**
 * Context-menu contributions: extensions add items to the canvas and node menus without
 * patching `getCanvasMenuOptions` / `getNodeMenuOptions`.
 *
 * ```js
 * LiteGraph.menus.register("node", (ctx) => [
 *     null,                                        // separator
 *     { command: "litegraph.rename" },             // runs a command (label from the command)
 *     { content: "Log", callback: () => console.log(ctx.node) }, // plain ContextMenu item
 * ]);
 * ```
 *
 * Locations: "canvas" (ctx: {canvas, graph, selectedNodes}), "node" (ctx adds `node`) and
 * "node-pin", the quick menu of a node's title box (same ctx; shown only when something is contributed).
 * Contributions are appended after the built-in items, in registration order. A failing provider
 * is skipped (and logged) so one extension cannot break the menu.
 */
export class MenuRegistry {

    static LOCATIONS = ["canvas", "node", "node-pin"];

    /** @param {import("./commands.js").CommandRegistry} commands */
    constructor(commands) {
        this.commands = commands;
        /** @type {Map<string, Array<(ctx: object) => Array<object|null>>>} */
        this._providers = new Map();
    }

    /**
     * @param {"canvas"|"node"|"node-pin"} location
     * @param {(ctx: object) => Array<object|null>|null|undefined} provider
     * @returns {() => void} disposer
     */
    register(location, provider) {
        if (!MenuRegistry.LOCATIONS.includes(location)) throw new Error(`unknown menu location ${location}`);
        if (typeof provider !== "function") throw new TypeError("menu provider must be a function");
        const list = this._providers.get(location) ?? [];
        list.push(provider);
        this._providers.set(location, list);
        return () => {
            const index = list.indexOf(provider);
            if (index !== -1) list.splice(index, 1);
        };
    }

    /** true when a provider is registered for the location */
    has(location) {
        return !!this._providers.get(location)?.length;
    }

    /** Converts `{command: id}` shorthands into ContextMenu items bound to the context. */
    _toItem(item, ctx) {
        if (!item || typeof item !== "object" || typeof item.command !== "string") return item;
        const command = this.commands?.get(item.command);
        if (!command) return null;
        const label = item.content ?? (typeof command.label === "function" ? command.label(ctx) : command.label);
        return {
            ...item,
            content: label,
            disabled: item.disabled ?? !this.commands.isEnabled(item.command, ctx),
            callback: () => { this.commands.execute(item.command, ctx); },
        };
    }

    /**
     * Collects the contributed items for a location.
     * @returns {Array<object|null>} ContextMenu items (null = separator)
     */
    collect(location, ctx = {}) {
        const items = [];
        for (const provider of [...(this._providers.get(location) ?? [])]) {
            let contributed;
            try {
                contributed = provider(ctx);
            } catch (error) {
                console.error?.(`menu provider for ${location} failed`, error);
                continue;
            }
            if (!Array.isArray(contributed)) continue;
            for (const item of contributed) {
                const converted = this._toItem(item, ctx);
                if (converted !== null || item === null) items.push(converted);
            }
        }
        return items;
    }

    /** Appends contributions to a built-in option list (returns the same array). */
    contribute(location, ctx, options) {
        const items = this.collect(location, ctx);
        if (items.length && Array.isArray(options)) options.push(...items);
        return options;
    }
}
