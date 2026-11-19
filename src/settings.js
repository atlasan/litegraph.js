/**
 * Declared, persistent settings.
 *
 * `define({id, default, type?, name?, tooltip?, category?, options?, migrate?, onChange?, bind?})`
 * - `id` is dotted ("LiteGraph.Canvas.SnapToGrid"); its first segments give a default category.
 * - `migrate(storedValue)` upgrades a value saved by an older version; the result is saved back.
 * - `onChange(value, previous)` runs on every change (and once at define time with the loaded value).
 * - `bind: {target, key}` mirrors the value onto an existing property (e.g. a `LiteGraph.*` flag):
 *   the property's current value is the default unless `default` is given, and set() writes it.
 *
 * Values are kept even for settings not defined yet, so a stored value can be loaded before the
 * extension that defines it. Persistence goes through a storage adapter `{load(): object, save(values)}`.
 */
export class SettingsRegistry {

    constructor(storage = null) {
        /** @type {Map<string, object>} */
        this._defs = new Map();
        /** @type {Record<string, *>} */
        this._values = {};
        this._storage = null;
        if (storage) this.setStorage(storage);
    }

    /** An adapter over `localStorage` (no-op when storage is unavailable). */
    static localStorageAdapter(key = "litegraph.settings") {
        return {
            load() {
                try { return JSON.parse(globalThis.localStorage?.getItem(key) ?? "null") ?? {}; } catch { return {}; }
            },
            save(values) {
                try { globalThis.localStorage?.setItem(key, JSON.stringify(values)); } catch { /* unavailable: keep in memory */ }
            },
        };
    }

    /** Uses a storage adapter and loads its values (defined settings are re-applied). */
    setStorage(storage) {
        this._storage = storage;
        const loaded = storage?.load?.() ?? {};
        this._values = (loaded && typeof loaded === "object") ? { ...loaded } : {};
        for (const def of this._defs.values()) this._applyLoaded(def);
    }

    _save() {
        this._storage?.save?.({ ...this._values });
    }

    _applyLoaded(def) {
        // the first application reports no previous value
        const previous = def._initialized === true ? this.get(def.id) : undefined;
        if (Object.hasOwn(this._values, def.id) && typeof def.migrate === "function") {
            const migrated = def.migrate(this._values[def.id]);
            if (migrated !== this._values[def.id]) {
                this._values[def.id] = migrated;
                this._save();
            }
        }
        const value = this.get(def.id);
        if (def.bind) def.bind.target[def.bind.key] = value;
        if (value !== previous || def._initialized !== true) {
            def._initialized = true;
            this._notify(def, value, previous);
        }
    }

    _notify(def, value, previous) {
        if (typeof def.onChange !== "function") return;
        try { def.onChange(value, previous); } catch (error) { console.error?.(`setting ${def.id}: onChange failed`, error); }
    }

    /**
     * @param {object} def
     * @returns {() => void} disposer removing the definition (a stored value is kept)
     */
    define(def) {
        if (!def || typeof def.id !== "string" || !def.id) throw new TypeError("setting id must be a non-empty string");
        if (this._defs.has(def.id)) throw new Error(`setting ${def.id} is already defined`);
        if (def.bind && (typeof def.bind.target !== "object" && typeof def.bind.target !== "function" || !def.bind.key)) {
            throw new TypeError(`setting ${def.id}: bind needs {target, key}`);
        }
        const defaultValue = def.default !== undefined ? def.default : def.bind ? def.bind.target[def.bind.key] : undefined;
        const entry = {
            type: typeof defaultValue === "boolean" ? "boolean" : typeof defaultValue === "number" ? "number" : "text",
            name: def.id,
            category: def.id.split(".").slice(0, -1),
            ...def,
            default: defaultValue,
        };
        this._defs.set(def.id, entry);
        this._applyLoaded(entry);
        return () => {
            if (this._defs.get(def.id) === entry) this._defs.delete(def.id);
        };
    }

    has(id) {
        return this._defs.has(id);
    }

    /** @returns {object|null} definition */
    getDefinition(id) {
        return this._defs.get(id) ?? null;
    }

    /** @returns {object[]} definitions, optionally only those whose id starts with a prefix */
    list(prefix = "") {
        return [...this._defs.values()].filter((def) => def.id.startsWith(prefix));
    }

    /** Current value: stored value if any, else the default. */
    get(id) {
        if (Object.hasOwn(this._values, id)) return this._values[id];
        const def = this._defs.get(id);
        if (!def) return undefined;
        return typeof def.default === "function" ? def.default() : def.default;
    }

    /**
     * Sets and persists a value. Combo settings refuse values outside their options.
     * @returns {boolean} true when the value changed
     */
    set(id, value) {
        const def = this._defs.get(id);
        if (def?.type === "combo" && Array.isArray(def.options)) {
            const allowed = def.options.map((option) => (option && typeof option === "object" ? option.value : option));
            if (!allowed.includes(value)) throw new RangeError(`setting ${id}: ${JSON.stringify(value)} is not an option`);
        }
        const previous = this.get(id);
        this._values[id] = value;
        this._save();
        if (def?.bind) def.bind.target[def.bind.key] = value;
        if (def && previous !== value) this._notify(def, value, previous);
        return previous !== value;
    }

    /** Forgets the stored value, going back to the default. */
    reset(id) {
        if (!Object.hasOwn(this._values, id)) return false;
        const previous = this.get(id);
        delete this._values[id];
        this._save();
        const def = this._defs.get(id);
        const value = this.get(id);
        if (def?.bind) def.bind.target[def.bind.key] = value;
        if (def && value !== previous) this._notify(def, value, previous);
        return true;
    }
}
