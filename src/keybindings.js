/**
 * Key combinations mapped to command ids, in three layers:
 * - defaults: added by core and extensions (`add`), later additions win, removable by disposer;
 * - user bindings (`setUserBinding`), which override defaults;
 * - user unbindings (`unsetDefault`), which hide one default without replacing it.
 *
 * Combos are written like "ctrl+shift+k", "f2", "arrowright", "shift+tab"; "mod" means ctrl
 * (meta on macOS). Keys come from `KeyboardEvent.key`, compared case-insensitively.
 * Key events coming from text inputs, text areas, selects and editable content are ignored.
 */
export class KeybindingRegistry {

    static MODIFIERS = ["ctrl", "alt", "shift", "meta"];

    /**
     * @param {import("./commands.js").CommandRegistry} commands
     */
    constructor(commands) {
        this.commands = commands;
        /** @type {Array<{combo: string, commandId: string, allowRepeat: boolean}>} */
        this._defaults = [];
        /** @type {Map<string, string|null>} combo -> command id (null = explicitly unbound) */
        this._user = new Map();
        /** @type {Set<string>} "combo|commandId" defaults hidden by the user */
        this._unset = new Set();
    }

    static isMac() {
        return typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform ?? "");
    }

    /**
     * Normalizes a combo string: lower case, modifiers in a fixed order, "mod" resolved.
     * @param {string} combo
     * @returns {string}
     */
    static normalize(combo) {
        if (typeof combo !== "string" || !combo.trim()) throw new TypeError("combo must be a non-empty string");
        const parts = combo.toLowerCase().split("+").map((part) => part.trim());
        // "ctrl++" means ctrl and the plus key
        if (combo.endsWith("++")) parts.splice(parts.length - 2, 2, "+");
        const modifiers = new Set();
        let key = null;
        for (const part of parts) {
            if (!part) continue;
            const name = part === "mod" ? (KeybindingRegistry.isMac() ? "meta" : "ctrl")
                : part === "control" ? "ctrl"
                : part === "cmd" || part === "command" ? "meta"
                : part === "option" ? "alt"
                : part;
            if (KeybindingRegistry.MODIFIERS.includes(name)) modifiers.add(name);
            else if (key === null) key = name === "space" ? " " : name === "esc" ? "escape" : name;
            else throw new Error(`combo "${combo}" has more than one key`);
        }
        if (key === null) throw new Error(`combo "${combo}" has no key`);
        return [...KeybindingRegistry.MODIFIERS.filter((m) => modifiers.has(m)), key].join("+");
    }

    /** @param {KeyboardEvent} event @returns {string|null} normalized combo, null for a bare modifier */
    static fromEvent(event) {
        const key = String(event.key ?? "").toLowerCase();
        if (!key || ["control", "alt", "shift", "meta"].includes(key)) return null;
        const mods = [];
        if (event.ctrlKey) mods.push("ctrl");
        if (event.altKey) mods.push("alt");
        if (event.shiftKey) mods.push("shift");
        if (event.metaKey) mods.push("meta");
        return [...mods, key].join("+");
    }

    /** True for key events typed into a text field, select or editable element. */
    static isTextEntry(event) {
        const target = event?.target;
        if (!target || typeof target !== "object") return false;
        const tag = String(target.localName ?? target.tagName ?? "").toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable === true;
    }

    /**
     * Adds a default binding.
     * @param {{combo: string, commandId: string, allowRepeat?: boolean}} binding
     * @returns {() => void} disposer
     */
    add({ combo, commandId, allowRepeat = false }) {
        if (typeof commandId !== "string" || !commandId) throw new TypeError("commandId must be a non-empty string");
        const entry = { combo: KeybindingRegistry.normalize(combo), commandId, allowRepeat: !!allowRepeat };
        this._defaults.push(entry);
        return () => {
            const index = this._defaults.indexOf(entry);
            if (index !== -1) this._defaults.splice(index, 1);
        };
    }

    /** Binds a combo for the user, overriding defaults; `commandId: null` disables the combo. */
    setUserBinding(combo, commandId) {
        this._user.set(KeybindingRegistry.normalize(combo), commandId ?? null);
    }

    clearUserBinding(combo) {
        this._user.delete(KeybindingRegistry.normalize(combo));
    }

    /** Hides one default binding (without binding the combo to something else). */
    unsetDefault(combo, commandId) {
        this._unset.add(`${KeybindingRegistry.normalize(combo)}|${commandId}`);
    }

    /** User layer as plain data, for persistence. */
    exportUserLayer() {
        return { bindings: Object.fromEntries(this._user), unset: [...this._unset] };
    }

    importUserLayer(data) {
        this._user = new Map(Object.entries(data?.bindings ?? {}));
        this._unset = new Set(Array.isArray(data?.unset) ? data.unset : []);
    }

    /**
     * Candidate bindings for a combo, most specific first: the user binding, then defaults
     * from the latest added to the earliest.
     * @returns {Array<{combo: string, commandId: string, allowRepeat: boolean}>}
     */
    resolve(combo) {
        const normalized = KeybindingRegistry.normalize(combo);
        if (this._user.has(normalized)) {
            const commandId = this._user.get(normalized);
            return commandId ? [{ combo: normalized, commandId, allowRepeat: true }] : [];
        }
        return this._defaults
            .filter((entry) => entry.combo === normalized && !this._unset.has(`${normalized}|${entry.commandId}`))
            .reverse();
    }

    /** @returns {string[]} combos currently bound to a command (for menus and help) */
    combosFor(commandId) {
        const combos = new Set();
        for (const entry of this._defaults) {
            if (entry.commandId === commandId && !this._user.has(entry.combo) && !this._unset.has(`${entry.combo}|${commandId}`)) combos.add(entry.combo);
        }
        for (const [combo, id] of this._user) if (id === commandId) combos.add(combo);
        return [...combos];
    }

    /**
     * Runs the command bound to a keydown event, if any applies.
     * The first candidate whose command is enabled for the context runs; others are skipped.
     * @param {KeyboardEvent} event
     * @param {object} ctx command context (see CommandRegistry.contextFor)
     * @returns {boolean} true when a command ran (the caller should stop default handling)
     */
    handleKeyDown(event, ctx = {}) {
        if (!this.commands || KeybindingRegistry.isTextEntry(event)) return false;
        const combo = KeybindingRegistry.fromEvent(event);
        if (!combo) return false;
        for (const binding of this.resolve(combo)) {
            if (event.repeat && !binding.allowRepeat) continue;
            const commandCtx = { ...ctx, event };
            if (!this.commands.isEnabled(binding.commandId, commandCtx)) continue;
            this.commands.execute(binding.commandId, commandCtx);
            return true;
        }
        return false;
    }
}
