/**
 * Named, reusable operations shared by keybindings, menus, search and extensions.
 *
 * A command is `{id, run(ctx), label?, category?, when?(ctx), mutatesGraph?}`.
 * - `ctx` is a plain object, usually `{canvas, graph, event}` (see {@link CommandRegistry#contextFor}).
 * - `when(ctx)` decides if the command applies right now; a disabled command is not run.
 * - `mutatesGraph: true` runs the command inside `graph.transact(label, ...)`, so whatever it changes
 *   becomes one undo entry and one revision.
 */
export class CommandRegistry {

    constructor() {
        /** @type {Map<string, object>} */
        this._commands = new Map();
    }

    /**
     * Registers a command. Registering an id again replaces the previous command
     * (the previous one is restored if the replacement is disposed).
     * @param {object} command
     * @returns {() => void} disposer that unregisters this command
     */
    register(command) {
        if (!command || typeof command.id !== "string" || !command.id) {
            throw new TypeError("command.id must be a non-empty string");
        }
        if (typeof command.run !== "function") {
            throw new TypeError(`command ${command.id}: run must be a function`);
        }
        const entry = Object.freeze({ label: command.id, category: "", mutatesGraph: false, ...command });
        const stack = this._commands.get(command.id) ?? [];
        stack.push(entry);
        this._commands.set(command.id, stack);
        return () => {
            const current = this._commands.get(command.id);
            if (!current) return;
            const index = current.indexOf(entry);
            if (index !== -1) current.splice(index, 1);
            if (!current.length) this._commands.delete(command.id);
        };
    }

    /** @returns {object|null} the active command for an id */
    get(id) {
        const stack = this._commands.get(id);
        return stack ? stack[stack.length - 1] : null;
    }

    has(id) {
        return this._commands.has(id);
    }

    /** @returns {object[]} active commands, optionally filtered by category */
    list({ category } = {}) {
        const all = [...this._commands.keys()].map((id) => this.get(id));
        return category === undefined ? all : all.filter((command) => command.category === category);
    }

    /** Builds the usual context for a canvas: the graph shown on it and the selection. */
    contextFor(canvas, extra = {}) {
        const selected = canvas?.selected_nodes ? Object.values(canvas.selected_nodes) : [];
        const items = canvas?.selectedItems ?? selected;
        return { canvas: canvas ?? null, graph: canvas?.graph ?? null, selectedNodes: selected, selectedItems: items, ...extra };
    }

    /** @returns {boolean} true when the command exists and its `when` accepts the context */
    isEnabled(id, ctx = {}) {
        const command = this.get(id);
        if (!command) return false;
        if (typeof command.when !== "function") return true;
        try {
            return !!command.when(ctx);
        } catch (error) {
            console.error?.(`command ${id}: when() failed`, error);
            return false;
        }
    }

    /**
     * Runs a command.
     * @param {string} id
     * @param {object} [ctx]
     * @returns {{executed: boolean, result?: *}} executed is false when the command is unknown or disabled
     * @throws whatever the command throws (a graph-mutating command's transaction is still closed)
     */
    execute(id, ctx = {}) {
        const command = this.get(id);
        if (!command || !this.isEnabled(id, ctx)) return { executed: false };
        const graph = ctx.graph;
        // the history entry is named after the command id (stable, unlike a translated label)
        const result = command.mutatesGraph && typeof graph?.transact === "function"
            ? graph.transact(command.id, () => command.run(ctx))
            : command.run(ctx);
        return { executed: true, result };
    }
}
