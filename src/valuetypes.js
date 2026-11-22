import { evaluateMathExpression } from "./widgets.js";

/**
 * Value types: one place that says how a value of a given type is edited, on the canvas and in
 * panels ("widget for type").
 *
 *   LiteGraph.registerValueType("percent", {
 *       base: "number", aliases: ["PERCENT"], label: "Percentage",
 *       description: "A number from 0 to 100.", examples: ["50", "12.5"],
 *       widget: "slider", editor: "slider", options: { min: 0, max: 100, step: 1, unit: "%" },
 *   });
 *
 * Fields of a definition (all optional):
 * - `base`: a type whose fields are inherited (options are merged, the base's first)
 * - `aliases`: other names (names and aliases are matched without regard to case)
 * - `label`, `description`, `examples`: shown by the panels as the row's help
 * - `widget`: canvas widget type (`LiteGraph.widget_types`); `editor`: panel editor (`LiteGraph.panel_editors`)
 * - `options`: default widget and editor options (a property's own info wins over them)
 * - `default`: value, or a function returning one
 * - `coerce(value, options)`: normalizes a typed or picked value
 * - `validate(value, options)`: null, or a message saying why the value is refused
 * - `format(value, options)`: text shown for the value
 * - `parse(text, options)`: value from typed text
 *
 * Resolution order of the consumers: a registered editor or widget type with the asked name wins,
 * then the value type's `editor` / `widget`. See the panels and widgets plan
 * (agents/plans/2026-11-22-panels-options-node-details.md).
 */
export class ValueTypeRegistry {

    constructor() {
        /** @type {Map<string, object>} lower-case name -> definition as registered */
        this._defs = new Map();
        /** @type {Map<string, string>} lower-case alias -> lower-case name */
        this._aliases = new Map();
        /** @type {Map<string, object>} resolved definitions (cleared on every change) */
        this._resolved = new Map();
        for (const [name, def] of Object.entries(ValueTypeRegistry.builtins())) this.register(name, def);
    }

    /**
     * Registers a value type.
     * @param {string} name
     * @param {object} def
     * @param {{replace?: boolean}} [options] - replace: allow replacing a registered type (built-ins included)
     * @returns {() => void} disposer; it restores the replaced definition, if any
     */
    register(name, def = {}, { replace = false } = {}) {
        if (typeof name !== "string" || !name) throw new TypeError("value type name must be a non-empty string");
        if (!def || typeof def !== "object") throw new TypeError(`value type ${name}: definition must be an object`);
        const key = name.toLowerCase();
        const previous = this._defs.get(key);
        if (previous && !replace) throw new Error(`value type ${name} is already registered (pass {replace: true} to replace it)`);
        const entry = { ...def, name: previous?.name ?? name, aliases: [...(def.aliases ?? [])] };
        if (previous) this._unlinkAliases(previous);
        this._defs.set(key, entry);
        for (const alias of entry.aliases) {
            const aliasKey = String(alias).toLowerCase();
            if (!this._defs.has(aliasKey)) this._aliases.set(aliasKey, key);
        }
        this._resolved.clear();
        return () => {
            if (this._defs.get(key) !== entry) return;
            this._unlinkAliases(entry);
            if (previous) {
                this._defs.set(key, previous);
                for (const alias of previous.aliases) this._aliases.set(String(alias).toLowerCase(), key);
            } else {
                this._defs.delete(key);
            }
            this._resolved.clear();
        };
    }

    _unlinkAliases(entry) {
        const key = entry.name.toLowerCase();
        for (const alias of entry.aliases) {
            const aliasKey = String(alias).toLowerCase();
            if (this._aliases.get(aliasKey) === key) this._aliases.delete(aliasKey);
        }
    }

    /** @returns {string|null} the registered (lower-case) key of a name or alias */
    _key(name) {
        if (name == null) return null;
        const key = String(name).toLowerCase();
        if (this._defs.has(key)) return key;
        return this._aliases.get(key) ?? null;
    }

    /** true when a name or alias is registered */
    has(name) {
        return this._key(name) !== null;
    }

    /**
     * The resolved definition: the base chain merged (the type's own fields win, options merged).
     * @param {string} name - name or alias
     * @returns {object|null}
     */
    get(name) {
        const key = this._key(name);
        if (!key) return null;
        if (this._resolved.has(key)) return this._resolved.get(key);
        const chain = [];
        const seen = new Set();
        for (let at = key; at && !seen.has(at); at = this._key(this._defs.get(at)?.base)) {
            seen.add(at);
            chain.unshift(this._defs.get(at));
        }
        const resolved = {};
        for (const def of chain) {
            const { options, ...rest } = def;
            Object.assign(resolved, rest);
            resolved.options = { ...(resolved.options ?? {}), ...(options ?? {}) };
        }
        resolved.name = this._defs.get(key).name;
        resolved.aliases = [...this._defs.get(key).aliases];
        resolved.bases = chain.slice(0, -1).map((def) => def.name).reverse();
        Object.freeze(resolved.options);
        Object.freeze(resolved);
        this._resolved.set(key, resolved);
        return resolved;
    }

    /** @returns {object[]} the resolved definitions, in registration order */
    list() {
        return [...this._defs.keys()].map((key) => this.get(key));
    }

    /** The default value of a type (null when unknown). */
    defaultValue(name, options) {
        const def = this.get(name);
        if (!def) return null;
        return typeof def.default === "function" ? def.default(options ?? def.options) : structuredCloneValue(def.default);
    }

    /** Normalizes a value through the type's coerce (unchanged for unknown types). */
    coerce(name, value, options) {
        const def = this.get(name);
        if (!def?.coerce) return value;
        return def.coerce(value, { ...def.options, ...(options ?? {}) });
    }

    /** @returns {string|null} why the value is refused, or null */
    validate(name, value, options) {
        const def = this.get(name);
        if (!def?.validate) return null;
        return def.validate(value, { ...def.options, ...(options ?? {}) }) ?? null;
    }

    /** Text for a value (String(value) or JSON for unknown types). */
    format(name, value, options) {
        const def = this.get(name);
        if (def?.format) return def.format(value, { ...def.options, ...(options ?? {}) });
        return ValueTypeRegistry.formatAny(value);
    }

    /** Value from typed text (the text itself for unknown types). */
    parse(name, text, options) {
        const def = this.get(name);
        if (def?.parse) return def.parse(text, { ...def.options, ...(options ?? {}) });
        return text;
    }

    /**
     * The panel editor for a property: candidates are info.editor, info.widget, info.type, then the
     * JS type of the value. A candidate naming a registered editor is used as is; otherwise its value
     * type's editor. Options: the value type's, then the info's own.
     * @param {object} [info] - property info (getPropertyInfo), setting definition or widget options
     * @param {*} [value]
     * @param {Record<string, object>} [editors] - registered editors
     * @returns {{editor: string, type: string|null, options: object, valueType: object|null}}
     */
    resolveEditor(info, value, editors = {}) {
        info = info ?? {};
        const candidates = [info.editor, info.widget, info.type, info.valueType, jsTypeOf(value)].filter((c) => typeof c === "string" && c);
        for (const candidate of candidates) {
            const valueType = this.get(candidate);
            if (editors[candidate] || editors[candidate.toLowerCase()]) {
                const editor = editors[candidate] ? candidate : candidate.toLowerCase();
                return { editor, type: valueType?.name ?? candidate, valueType, options: { ...(valueType?.options ?? {}), ...stripMeta(info) } };
            }
            if (valueType?.editor && editors[valueType.editor]) {
                return { editor: valueType.editor, type: valueType.name, valueType, options: { ...valueType.options, ...stripMeta(info) } };
            }
        }
        const valueType = this.get(info.type) ?? null;
        return { editor: "readonly", type: valueType?.name ?? info.type ?? info.widget ?? info.editor ?? jsTypeOf(value), valueType, options: { ...(valueType?.options ?? {}), ...stripMeta(info) } };
    }

    /**
     * The canvas widget class for a type: a registered widget type wins, then the value type's widget.
     * @param {string} type
     * @param {Record<string, Function>} widgetTypes - LiteGraph.widget_types
     * @returns {{cls: Function, options: object, valueType: object|null}|null}
     */
    resolveWidgetClass(type, widgetTypes = {}) {
        if (typeof type !== "string" || !type) return null;
        const own = widgetTypes[type] ?? widgetTypes[type.toLowerCase()];
        const valueType = this.get(type);
        if (own) return { cls: own, options: {}, valueType };
        const cls = valueType?.widget ? widgetTypes[valueType.widget] : null;
        return cls ? { cls, options: { ...valueType.options }, valueType } : null;
    }

    /** Text for any value: numbers trimmed, objects as JSON. */
    static formatAny(value) {
        if (value === undefined) return "";
        if (value === null) return "null";
        if (typeof value === "number") return String(parseFloat(value.toFixed(5)));
        if (typeof value === "object") {
            try { return JSON.stringify(value); } catch { return String(value); }
        }
        return String(value);
    }

    /** Clamps to options.min / options.max. */
    static clampNumber(value, options = {}) {
        if (options.min != null && value < options.min) value = options.min;
        if (options.max != null && value > options.max) value = options.max;
        return value;
    }

    /** The built-in value types (see the table in the panels and widgets plan). */
    static builtins() {
        const toNumber = (value, options) => {
            if (typeof value === "string") {
                const computed = evaluateMathExpression(value);
                value = Number.isFinite(computed) ? computed : Number(value);
            } else if (typeof value === "boolean") {
                value = value ? 1 : 0;
            } else {
                value = Number(value);
            }
            if (!Number.isFinite(value)) return value;
            if (options.round) value = Math.round(value / options.round) * options.round;
            return ValueTypeRegistry.clampNumber(value, options);
        };
        const numberValidate = (value) => (typeof value === "number" && Number.isFinite(value) ? null : "Not a number");
        const formatNumber = (value, options) => {
            if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
            const precision = options.precision ?? 3;
            const text = String(parseFloat(value.toFixed(precision)));
            return options.unit ? `${text} ${options.unit}` : text;
        };
        const parseJSON = (text) => {
            if (typeof text !== "string") return text;
            return JSON.parse(text);
        };
        const vector = (size) => ({
            label: `Vector ${size}`,
            description: `${size} numbers. Type them separated by commas or spaces.`,
            examples: [Array.from({ length: size }, (_, i) => i).join(", ")],
            widget: "vector",
            editor: "vector",
            aliases: [`VEC${size}`, `vector${size}`],
            options: { size, precision: 3 },
            default: () => new Array(size).fill(0),
            coerce: (value, options) => {
                let list = value;
                if (typeof list === "string") list = list.split(/[\s,;]+/).filter(Boolean);
                if (list && typeof list === "object" && !Array.isArray(list) && typeof list.length === "number") list = Array.from(list);
                if (!Array.isArray(list)) list = [list];
                const out = [];
                for (let i = 0; i < options.size; ++i) {
                    const n = toNumber(list[i] ?? 0, options);
                    out.push(Number.isFinite(n) ? n : 0);
                }
                return out;
            },
            validate: (value, options) => (Array.isArray(value) && value.length === options.size && value.every((n) => typeof n === "number" && Number.isFinite(n)) ? null : `Needs ${options.size} numbers`),
            format: (value, options) => (Array.isArray(value) ? value.map((n) => formatNumber(n, { precision: options.precision })).join(", ") : String(value)),
            parse: (text, options) => vector(options.size).coerce(text, options),
        });
        return {
            boolean: {
                label: "On / off",
                aliases: ["bool", "toggle", "BOOLEAN", "checkbox"],
                widget: "toggle",
                editor: "boolean",
                default: false,
                coerce: (value) => (typeof value === "string" ? !["", "false", "0", "off", "no"].includes(value.trim().toLowerCase()) : !!value),
                format: (value, options) => (value ? options.on ?? "on" : options.off ?? "off"),
                parse: (text) => !["", "false", "0", "off", "no"].includes(String(text).trim().toLowerCase()),
            },
            number: {
                label: "Number",
                description: "A number. Arithmetic is allowed when typing (2*8+1, pi/2).",
                examples: ["1.5", "2*8+1"],
                aliases: ["float", "double", "FLOAT", "real"],
                widget: "number",
                editor: "number",
                options: { precision: 3 },
                default: 0,
                coerce: toNumber,
                validate: numberValidate,
                format: formatNumber,
                parse: (text, options) => toNumber(text, options),
            },
            int: {
                base: "number",
                label: "Whole number",
                description: "A whole number. Typed values are rounded.",
                examples: ["3", "-10"],
                aliases: ["integer", "INT"],
                options: { step: 1, precision: 0, round: 1 },
            },
            slider: {
                base: "number",
                label: "Number in a range",
                widget: "slider",
                editor: "slider",
                options: { min: 0, max: 1 },
            },
            string: {
                label: "Text",
                aliases: ["str", "STRING"],
                widget: "text",
                editor: "string",
                default: "",
                coerce: (value) => (value == null ? "" : typeof value === "object" ? ValueTypeRegistry.formatAny(value) : String(value)),
                format: (value) => (value == null ? "" : String(value)),
                parse: (text) => String(text),
            },
            text: {
                base: "string",
                label: "Multi-line text",
                aliases: ["multiline", "textarea"],
                editor: "text",
                options: { multiline: true },
            },
            enum: {
                label: "Choice",
                description: "One of a list of values.",
                aliases: ["combo", "COMBO", "select", "choice"],
                widget: "combo",
                editor: "combo",
                default: null,
                validate: (value, options) => {
                    const values = typeof options.values === "function" ? null : options.values;
                    if (!values) return null;
                    const allowed = Array.isArray(values) ? values : Object.values(values);
                    return allowed.some((v) => v == value) || (!Array.isArray(values) && Object.hasOwn(values, value)) ? null : "Not one of the choices";
                },
            },
            color: {
                label: "Colour",
                description: "A CSS colour: #rrggbb, #rrggbbaa, rgb(...) or a name.",
                examples: ["#ff8800", "#33669980", "rebeccapurple"],
                aliases: ["colour", "COLOR"],
                widget: "color",
                editor: "color",
                default: "#ffffff",
                coerce: (value) => {
                    if (value == null) return "";
                    if (Array.isArray(value)) {
                        // [r, g, b(, a)] in 0..1, as some nodes store it
                        const hex = (n) => Math.round(Math.max(0, Math.min(1, Number(n) || 0)) * 255).toString(16).padStart(2, "0");
                        return "#" + value.slice(0, 4).map(hex).join("");
                    }
                    const text = String(value).trim();
                    const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
                    if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
                    if (/^#?[0-9a-f]{6}([0-9a-f]{2})?$/i.test(text)) return (text.startsWith("#") ? text : "#" + text).toLowerCase();
                    return text;
                },
                validate: (value) => (typeof value === "string" ? null : "Not a colour"),
            },
            vec2: vector(2),
            vec3: vector(3),
            vec4: vector(4),
            array: {
                label: "List",
                description: "A JSON list.",
                examples: ["[1, 2, 3]", "[\"a\", \"b\"]"],
                aliases: ["list"],
                widget: "text",
                editor: "json",
                default: () => [],
                coerce: (value) => (typeof value === "string" ? parseJSON(value) : value),
                validate: (value) => (Array.isArray(value) ? null : "Needs a JSON list"),
                format: (value) => ValueTypeRegistry.formatAny(value),
                parse: parseJSON,
            },
            object: {
                label: "Object",
                description: "A JSON value.",
                examples: ["{\"key\": 1}"],
                aliases: ["dict", "json", "map"],
                widget: "text",
                editor: "json",
                default: () => ({}),
                coerce: (value) => (typeof value === "string" ? parseJSON(value) : value),
                format: (value) => ValueTypeRegistry.formatAny(value),
                parse: parseJSON,
            },
            code: {
                base: "string",
                label: "Code",
                description: "Source code. Ctrl+Enter assigns it.",
                widget: "text",
                editor: "code",
                options: { multiline: true },
            },
            resource: {
                base: "string",
                label: "File or URL",
                description: "A path or URL. A host can add a picker with options.pick.",
                aliases: ["file", "url", "texture", "image", "asset"],
                editor: "resource",
                options: { placeholder: "path or URL" },
            },
            event: {
                label: "Event",
                aliases: ["action", "-1"],
                editor: "readonly",
                default: null,
            },
        };
    }
}

/** The JS type name of a value, as the panels use it to pick an editor. */
function jsTypeOf(value) {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) return "array";
    return typeof value;
}

/** Info fields that are about the property, not editor options. */
function stripMeta(info) {
    const { editor, widget, type, valueType, name, ...rest } = info ?? {}; // eslint-disable-line no-unused-vars
    return rest;
}

/** A copy of plain defaults (arrays and objects are not shared between widgets). */
function structuredCloneValue(value) {
    if (value === null || typeof value !== "object") return value;
    try { return structuredClone(value); } catch { return value; }
}
