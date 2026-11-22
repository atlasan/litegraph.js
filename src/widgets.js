import { LiteGraph } from "./litegraph.js";
import { LGraphCanvas } from "./lgraphcanvas.js";

/**
 * Canvas widgets as classes, one per type, replacing the two `switch (w.type)` blocks that used
 * to live in LGraphCanvas.drawNodeWidgets / processNodeWidgets. The structure follows the MIT
 * Comfy-Org/litegraph.js standalone (BaseWidget + one class per type + a legacy fallback); the
 * drawing and pointer behaviour is this fork's own, moved here unchanged.
 *
 * Compatibility:
 * - `node.addWidget(type, ...)` returns an instance of the registered class (same own fields as before).
 * - Plain-object widgets (pushed directly, or created by older code) still work: the canvas calls
 *   the class methods for their `type` with the object as `this` (see {@link widgetImplementation}).
 * - Unknown types keep the legacy custom hooks `w.draw(ctx, node, width, y, H)` and
 *   `w.mouse(event, [x, y], node)`.
 *
 * Custom types: `LiteGraph.registerWidgetType("mytype", class extends BaseWidget { draw(...) {...}
 * onPointer(...) {...} })`.
 */
export class BaseWidget {

    /** @param {object} [init] - widget fields (type, name, value, callback, options, ...) */
    constructor(init = {}) {
        Object.assign(this, init);
        this.options ??= {};
    }

    /**
     * Draws the widget.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} node
     * @param {number} widget_width
     * @param {number} y
     * @param {number} H - row height
     * @param {object} env - {canvas, show_text, show_label, active, margin, colors: {outline, background, text, secondary}}
     */
    // eslint-disable-next-line no-unused-vars
    draw(ctx, node, widget_width, y, H, env) {}

    /**
     * Handles a pointer event inside the widget.
     * @param {PointerEvent} event
     * @param {object} env - {canvas, node, x, y, pos, widget_width, old_value, changed(widget, value, old_value), ref_window}
     */
    // eslint-disable-next-line no-unused-vars
    onPointer(event, env) {}

    /** Background shape shared by most widgets: a pill when text is shown, a plain box otherwise. */
    static drawPill(ctx, widget_width, y, H, env) {
        const margin = env.margin;
        ctx.textAlign = "left";
        ctx.strokeStyle = env.colors.outline;
        ctx.fillStyle = env.colors.background;
        ctx.beginPath();
        if (env.show_text) ctx.roundRect(margin, y, widget_width - margin * 2, H, [H * 0.5]);
        else ctx.rect(margin, y, widget_width - margin * 2, H);
        ctx.fill();
    }

    /** Clamps a number to the widget's min/max options. */
    static clampToOptions(value, options) {
        if (options.min != null && value < options.min) value = options.min;
        if (options.max != null && value > options.max) value = options.max;
        return value;
    }
}

export class ButtonWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        if (this.clicked) {
            ctx.fillStyle = "#AAA";
            this.clicked = false;
            env.canvas.dirty_canvas = true;
        }
        ctx.fillRect(margin, y, widget_width - margin * 2, H);
        if (env.show_text && !this.disabled) ctx.strokeRect(margin, y, widget_width - margin * 2, H);
        if (env.show_text) {
            ctx.textAlign = "center";
            ctx.fillStyle = env.colors.text;
            if (env.show_label) ctx.fillText(this.label || this.name, widget_width * 0.5, y + H * 0.7);
        }
    }

    onPointer(event, env) {
        if (event.type !== "pointerdown") return;
        if (this.callback) {
            setTimeout(() => this.callback(this, env.canvas, env.node, env.pos, event), 20);
        }
        this.clicked = true;
        env.canvas.dirty_canvas = true;
    }
}

export class ToggleWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        BaseWidget.drawPill(ctx, widget_width, y, H, env);
        if (env.show_text && !this.disabled) ctx.stroke();
        ctx.fillStyle = this.value ? "#89A" : "#333";
        ctx.beginPath();
        ctx.arc(widget_width - margin * 2, y + H * 0.5, H * 0.36, 0, Math.PI * 2);
        ctx.fill();
        if (env.show_text) {
            ctx.fillStyle = env.colors.secondary;
            const label = this.label || this.name;
            if (label != null && env.show_label) ctx.fillText(label, margin * 2, y + H * 0.7);
            ctx.fillStyle = this.value ? env.colors.text : env.colors.secondary;
            ctx.textAlign = "right";
            ctx.fillText(this.value ? this.options.on || "on" : this.options.off || "off", widget_width - 40, y + H * 0.7);
        }
    }

    onPointer(event, env) {
        if (event.type !== "pointerdown") return;
        const old_value = env.old_value;
        this.value = !this.value;
        setTimeout(() => env.changed(this, this.value, old_value), 20);
    }
}

export class SliderWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        const options = this.options;
        ctx.fillStyle = env.colors.background;
        ctx.fillRect(margin, y, widget_width - margin * 2, H);
        const range = options.max - options.min;
        const nvalue = LiteGraph.clamp((this.value - options.min) / range, 0, 1);
        ctx.fillStyle = Object.hasOwn(options, "slider_color") ? options.slider_color : (env.active ? "#89A" : "#678");
        ctx.fillRect(margin, y, nvalue * (widget_width - margin * 2), H);
        if (env.show_text && !this.disabled) ctx.strokeRect(margin, y, widget_width - margin * 2, H);
        if (this.marker) {
            const marker_nvalue = LiteGraph.clamp((this.marker - options.min) / range, 0, 1);
            ctx.fillStyle = Object.hasOwn(options, "marker_color") ? options.marker_color : "#AA9";
            ctx.fillRect(margin + marker_nvalue * (widget_width - margin * 2), y, 2, H);
        }
        if (env.show_text) {
            ctx.textAlign = "center";
            ctx.fillStyle = env.colors.text;
            if (env.show_label) {
                ctx.fillText(
                    this.label || this.name + "  " + LiteGraph.formatNumber(this.value, options.precision != null ? options.precision : 3),
                    widget_width * 0.5,
                    y + H * 0.7,
                );
            }
        }
    }

    onPointer(event, env) {
        const options = this.options;
        if (options.read_only) return;
        const nvalue = LiteGraph.clamp((env.x - 15) / (env.widget_width - 30), 0, 1);
        this.value = options.min + (options.max - options.min) * nvalue;
        if (options.step > 0) {
            // snap to min + k * step, staying inside the range
            this.value = options.min + Math.round((this.value - options.min) / options.step) * options.step;
            this.value = LiteGraph.clamp(this.value, options.min, options.max);
        }
        const old_value = env.old_value;
        if (old_value != this.value) setTimeout(() => env.changed(this, this.value, old_value), 20);
        env.canvas.dirty_canvas = true;
    }
}

/** Shared drawing of number and combo widgets: arrows, label and right-aligned value. */
function drawArrowsAndLabel(widget, ctx, widget_width, y, H, env, valueText) {
    const margin = env.margin;
    BaseWidget.drawPill(ctx, widget_width, y, H, env);
    if (!env.show_text) return;
    if (!widget.disabled) ctx.stroke();
    ctx.fillStyle = env.colors.text;
    if (!widget.disabled) {
        ctx.beginPath();
        ctx.moveTo(margin + 16, y + 5);
        ctx.lineTo(margin + 6, y + H * 0.5);
        ctx.lineTo(margin + 16, y + H - 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(widget_width - margin - 16, y + 5);
        ctx.lineTo(widget_width - margin - 6, y + H * 0.5);
        ctx.lineTo(widget_width - margin - 16, y + H - 5);
        ctx.fill();
    }
    ctx.fillStyle = env.colors.secondary;
    if (env.show_label) ctx.fillText(widget.label || widget.name, margin * 2 + 5, y + H * 0.7);
    ctx.fillStyle = env.colors.text;
    ctx.textAlign = "right";
    ctx.fillText(valueText, widget_width - margin * 2 - 20, y + H * 0.7);
}

export class NumberWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        drawArrowsAndLabel(this, ctx, widget_width, y, H, env,
            LiteGraph.formatNumber(this.value, this.options.precision !== undefined ? this.options.precision : 3));
    }

    onPointer(event, env) {
        const options = this.options;
        const old_value = env.old_value;
        if (event.type == "pointermove") {
            const deltaX = event.deltaX || event.deltax || 0;
            // drag on an unrounded copy, so rounded types (int) still move with small steps
            const raw = (typeof this._drag_raw === "number" ? this._drag_raw : this.value) + deltaX * 0.1 * (options.step || 1);
            this._drag_raw = BaseWidget.clampToOptions(raw, options);
            this.value = options.round ? BaseWidget.clampToOptions(Math.round(this._drag_raw / options.round) * options.round, options) : this._drag_raw;
        } else if (event.type == "pointerdown") {
            const delta = env.x < 40 ? -1 : env.x > env.widget_width - 40 ? 1 : 0;
            this.value = BaseWidget.clampToOptions(this.value + delta * (options.step || 1), options);
            this._drag_raw = this.value;
        } else if (event.type == "pointerup") {
            const delta = env.x < 40 ? -1 : env.x > env.widget_width - 40 ? 1 : 0;
            if (event.click_time < 200 && delta == 0) {
                env.canvas.prompt("Value", this.value, (typed) => {
                    // arithmetic is allowed ("2*8+1"); anything else is read as a number
                    const computed = evaluateMathExpression(typed);
                    const value = Number.isFinite(computed) ? computed : Number(typed);
                    // typed values respect the widget range like drag and arrows do (Comfy c5db2d8)
                    this.value = LGraphCanvas.clampWidgetNumber(value, options);
                    env.changed(this, this.value, old_value);
                }, event);
            }
        }
        if (old_value != this.value) setTimeout(() => env.changed(this, this.value, old_value), 20);
        env.canvas.dirty_canvas = true;
    }
}

export class ComboWidget extends BaseWidget {
    /** the option list as given (array, object map, or the result of a values function) */
    resolveValues(node) {
        let values = this.options.values;
        if (values && values.constructor === Function) values = this.options.values(this, node);
        return values;
    }

    draw(ctx, node, widget_width, y, H, env) {
        let shown = this.value;
        if (this.options.values) {
            let values = this.options.values;
            if (values.constructor === Function) values = values();
            if (values && values.constructor !== Array) shown = values[this.value];
        }
        drawArrowsAndLabel(this, ctx, widget_width, y, H, env, shown);
    }

    onPointer(event, env) {
        const old_value = env.old_value;
        if (event.type == "pointerdown") {
            const values = this.resolveValues(env.node);
            const values_list = values.constructor === Array ? values : Object.keys(values);
            const delta = env.x < 40 ? -1 : env.x > env.widget_width - 40 ? 1 : 0;
            if (delta) { // clicked on an arrow
                env.canvas.last_mouseclick = 0; // avoids a double click event
                let index = values.constructor === Object
                    ? values_list.indexOf(String(this.value)) + delta
                    : values_list.indexOf(this.value) + delta;
                index = LiteGraph.clamp(index, 0, values_list.length - 1);
                if (values.constructor === Array) this.value = values[index];
                else if (values != values_list) this.value = Object.keys(values)[index];
                else this.value = index;
            } else { // clicked on the value: pick from a menu
                const entries = values != values_list
                    ? Object.keys(values).map((key) => ({ value: key, content: values[key] }))
                    : values;
                const widget = this;
                LiteGraph.ContextMenu(entries, {
                    scale: Math.max(1, env.canvas.ds.scale),
                    event,
                    className: "dark",
                    callback(v) {
                        const picked = (typeof v == "object" && typeof v.value !== "undefined") ? v.value : v;
                        widget.value = picked;
                        env.changed(widget, picked, old_value);
                        env.canvas.dirty_canvas = true;
                        return false;
                    },
                }, env.ref_window);
            }
        }
        if (old_value != this.value) setTimeout(() => env.changed(this, this.value, old_value), 20);
        env.canvas.dirty_canvas = true;
    }
}

export class TextWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        BaseWidget.drawPill(ctx, widget_width, y, H, env);
        if (!env.show_text) return;
        if (!this.disabled) ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.rect(margin, y, widget_width - margin * 2, H);
        ctx.clip();
        ctx.fillStyle = env.colors.secondary;
        const label = this.label || this.name;
        let label_width = 0;
        if (label != null && env.show_label) {
            ctx.fillText(label, margin * 2, y + H * 0.7);
            label_width = ctx.measureText(String(label)).width + margin * 2;
        }
        ctx.fillStyle = env.colors.text;
        ctx.textAlign = "right";
        // show as much of the value as fits beside the label
        const value_width = widget_width - margin * 4 - label_width;
        ctx.fillText(LGraphCanvas.fitText(ctx, String(this.value), value_width), widget_width - margin * 2, y + H * 0.7);
        ctx.restore();
    }

    onPointer(event, env) {
        if (event.type != "pointerdown") return;
        const old_value = this.value;
        env.canvas.prompt("Value", this.value, (typed) => env.changed(this, typed, old_value), event, this.options ? this.options.multiline : false);
    }
}

/** Draws the label on the left of a pill; returns the x where the value area starts. */
function drawWidgetLabel(widget, ctx, y, H, env) {
    const margin = env.margin;
    const label = widget.label || widget.name;
    if (label == null || !env.show_label || !env.show_text) return margin * 2;
    ctx.fillStyle = env.colors.secondary;
    ctx.textAlign = "left";
    ctx.fillText(String(label), margin * 2, y + H * 0.7);
    return margin * 3 + ctx.measureText(String(label)).width;
}

/**
 * A colour value ("#rrggbb", "#rrggbbaa" or any CSS colour): a swatch with its text. Clicking the
 * swatch opens the browser's colour picker (the alpha suffix is kept); clicking the label lets you
 * type any CSS colour.
 */
export class ColorWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        BaseWidget.drawPill(ctx, widget_width, y, H, env);
        if (env.show_text && !this.disabled) ctx.stroke();
        const swatch_w = Math.min(48, widget_width * 0.3);
        const sx = widget_width - margin * 2 - swatch_w;
        ctx.save();
        ctx.fillStyle = "#555";
        ctx.fillRect(sx, y + 3, swatch_w, H - 6);
        ctx.fillStyle = this.value ? String(this.value) : "transparent";
        ctx.fillRect(sx, y + 3, swatch_w, H - 6);
        ctx.restore();
        if (!env.show_text) return;
        const start = drawWidgetLabel(this, ctx, y, H, env);
        ctx.fillStyle = env.colors.text;
        ctx.textAlign = "right";
        const room = sx - margin - start;
        ctx.fillText(LGraphCanvas.fitText(ctx, String(this.value ?? ""), room), sx - margin, y + H * 0.7);
    }

    onPointer(event, env) {
        if (event.type !== "pointerdown" || this.options.read_only) return;
        const old_value = env.old_value;
        const swatch_w = Math.min(48, env.widget_width * 0.3);
        const onSwatch = env.x > env.widget_width - swatch_w - 40;
        const doc = env.ref_window?.document ?? (typeof document !== "undefined" ? document : null);
        const hex = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.exec(String(this.value ?? ""));
        if (onSwatch && doc) {
            const input = doc.createElement("input");
            input.type = "color";
            input.value = hex ? String(this.value).slice(0, 7) : "#ffffff";
            Object.assign(input.style, { position: "fixed", left: (event.clientX ?? 0) + "px", top: (event.clientY ?? 0) + "px", opacity: "0", width: "1px", height: "1px", pointerEvents: "none" });
            const alpha = hex?.[1] ?? "";
            const apply = () => env.changed(this, input.value + alpha, old_value);
            input.addEventListener("input", apply);
            input.addEventListener("change", () => { apply(); input.remove(); });
            input.addEventListener("blur", () => input.remove());
            doc.body.appendChild(input);
            ColorWidget.lastPicker = input;
            if (typeof input.showPicker === "function") {
                try { input.showPicker(); } catch { input.click(); }
            } else {
                input.click();
            }
            return;
        }
        env.canvas.prompt("Colour", this.value ?? "", (typed) => env.changed(this, typed, old_value), event);
    }
}

/**
 * A vector of numbers (vec2, vec3, vec4; `options.size`): one draggable field per component.
 * Drag a field to change that component, click it to type it, click the label to type them all.
 */
export class VectorWidget extends BaseWidget {
    static size(widget) {
        return widget.options.size ?? (Array.isArray(widget.value) ? widget.value.length : 3);
    }

    static layout(widget, ctx, widget_width, env) {
        const margin = env.margin;
        const size = VectorWidget.size(widget);
        const label = widget.label || widget.name;
        const label_w = env.show_label && label != null ? Math.min(widget_width * 0.35, 12 + (ctx?.measureText?.(String(label)).width ?? String(label).length * 7)) : 0;
        const start = margin * 2 + label_w;
        const cell = (widget_width - margin * 2 - start) / size;
        return { size, start, cell };
    }

    draw(ctx, node, widget_width, y, H, env) {
        BaseWidget.drawPill(ctx, widget_width, y, H, env);
        if (env.show_text && !this.disabled) ctx.stroke();
        if (!env.show_text) return;
        drawWidgetLabel(this, ctx, y, H, env);
        const { size, start, cell } = VectorWidget.layout(this, ctx, widget_width, env);
        const values = Array.isArray(this.value) ? this.value : [];
        const precision = this.options.precision ?? 3;
        for (let i = 0; i < size; ++i) {
            const x = start + i * cell;
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(x + 1, y + 3, cell - 2, H - 6);
            ctx.fillStyle = env.colors.text;
            ctx.textAlign = "center";
            ctx.fillText(LGraphCanvas.fitText(ctx, LiteGraph.formatNumber(Number(values[i] ?? 0), precision), cell - 4), x + cell * 0.5, y + H * 0.7);
        }
    }

    onPointer(event, env) {
        if (this.options.read_only) return;
        const old_value = env.old_value;
        const { size, start, cell } = VectorWidget.layout(this, null, env.widget_width, { margin: env.margin ?? 15, show_label: true });
        const current = Array.from({ length: size }, (_, i) => Number((Array.isArray(this.value) ? this.value[i] : 0) ?? 0));
        if (event.type == "pointerdown") {
            this._drag_index = env.x < start ? -1 : Math.max(0, Math.min(size - 1, Math.floor((env.x - start) / cell)));
            this._drag_raw = current[this._drag_index];
            this._drag_moved = false;
        } else if (event.type == "pointermove" && this._drag_index >= 0) {
            const deltaX = event.deltaX || event.deltax || 0;
            if (!deltaX) return;
            this._drag_moved = true;
            this._drag_raw = BaseWidget.clampToOptions(this._drag_raw + deltaX * 0.1 * (this.options.step || 0.1), this.options);
            const next = current.slice();
            next[this._drag_index] = this.options.round ? Math.round(this._drag_raw / this.options.round) * this.options.round : this._drag_raw;
            this.value = next;
            setTimeout(() => env.changed(this, next, old_value), 20);
            env.canvas.dirty_canvas = true;
        } else if (event.type == "pointerup" && !this._drag_moved) {
            const index = this._drag_index;
            if (index === -1 || index === undefined) {
                env.canvas.prompt("Value", current.join(", "), (typed) => env.changed(this, typed, old_value), event);
            } else {
                env.canvas.prompt(`Component ${index + 1}`, current[index], (typed) => {
                    const next = current.slice();
                    const computed = evaluateMathExpression(typed);
                    next[index] = Number.isFinite(computed) ? computed : Number(typed);
                    env.changed(this, next, old_value);
                }, event);
            }
        }
    }
}

/** The built-in widget types (several type names share a class). */
export function defaultWidgetTypes() {
    return {
        button: ButtonWidget,
        toggle: ToggleWidget,
        boolean: ToggleWidget,
        slider: SliderWidget,
        number: NumberWidget,
        combo: ComboWidget,
        enum: ComboWidget,
        text: TextWidget,
        string: TextWidget,
        color: ColorWidget,
        vector: VectorWidget,
    };
}

/** Widget types that existed before value types: a plain object of these types never kept its own draw. */
const LEGACY_WIDGET_TYPES = new Set(["button", "toggle", "boolean", "slider", "number", "combo", "enum", "text", "string"]);

/**
 * The behaviour to use for a widget, as an object whose draw/onPointer are called with the widget
 * as `this`, or null for the legacy custom hooks (`w.draw` / `w.mouse`):
 * - a BaseWidget instance uses its own class, except a built-in class whose `type` was changed after
 *   creation (`w.type = "toggle"`), which uses the class of its new type;
 * - a plain object uses the registered class for its type; a type that resolves only through value
 *   types (LiteGraph.valueTypes), or a type added with them (color, vector), keeps the object's own
 *   draw/mouse when it has them, as unknown types always did.
 * @returns {BaseWidget|null}
 */
export function widgetImplementation(widget, types = LiteGraph.widget_types) {
    if (!widget) return null;
    const resolve = (type) => {
        if (typeof type !== "string" || !type) return null;
        return types?.[type] ?? LiteGraph.valueTypes?.resolveWidgetClass(type, types ?? {})?.cls ?? null;
    };
    if (widget instanceof BaseWidget) {
        if (BUILTIN_WIDGET_CLASSES.has(widget.constructor)) {
            const cls = resolve(widget.type);
            if (cls && !(widget instanceof cls)) return cls.prototype;
        }
        return widget;
    }
    const ownHooks = typeof widget.draw === "function" || typeof widget.mouse === "function";
    if (ownHooks && !LEGACY_WIDGET_TYPES.has(widget.type)) return null;
    const cls = resolve(widget.type);
    return cls ? cls.prototype : null;
}

/** The classes defaultWidgetTypes() registers (a changed `type` on their instances is followed). */
const BUILTIN_WIDGET_CLASSES = new Set([ButtonWidget, ToggleWidget, SliderWidget, NumberWidget, ComboWidget, TextWidget, ColorWidget, VectorWidget]);

/**
 * Evaluates arithmetic typed into a number field: numbers, + - * / % **, parentheses, unary signs,
 * and the constants pi and e. Anything else returns NaN (nothing is executed).
 * @param {string} text
 * @returns {number}
 */
export function evaluateMathExpression(text) {
    const source = String(text ?? "").trim();
    if (!source) return NaN;
    const tokens = source.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|\*\*|[-+*/%()]|pi|e|\s+|./gi)
        ?.filter((token) => !/^\s+$/.test(token)) ?? [];
    let index = 0;
    const peek = () => tokens[index];
    const take = () => tokens[index++];
    const fail = () => { throw new SyntaxError("not an arithmetic expression"); };
    const primary = () => {
        const token = take();
        if (token === undefined) fail();
        if (token === "(") {
            const value = sum();
            if (take() !== ")") fail();
            return value;
        }
        if (/^pi$/i.test(token)) return Math.PI;
        if (/^e$/i.test(token)) return Math.E;
        if (/^(\d|\.\d)/.test(token)) return Number(token);
        return fail();
    };
    const unary = () => {
        if (peek() === "-") { take(); return -unary(); }
        if (peek() === "+") { take(); return unary(); }
        return power();
    };
    const power = () => {
        const base = primary();
        if (peek() === "**") { take(); return base ** unary(); }
        return base;
    };
    const product = () => {
        let value = unary();
        while (["*", "/", "%"].includes(peek())) {
            const op = take();
            const right = unary();
            value = op === "*" ? value * right : op === "/" ? value / right : value % right;
        }
        return value;
    };
    const sum = () => {
        let value = product();
        while (peek() === "+" || peek() === "-") {
            const op = take();
            const right = product();
            value = op === "+" ? value + right : value - right;
        }
        return value;
    };
    try {
        const value = sum();
        return index === tokens.length ? value : NaN;
    } catch {
        return NaN;
    }
}
