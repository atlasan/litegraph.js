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
            if (deltaX) this.value += deltaX * 0.1 * (options.step || 1);
            this.value = BaseWidget.clampToOptions(this.value, options);
        } else if (event.type == "pointerdown") {
            const delta = env.x < 40 ? -1 : env.x > env.widget_width - 40 ? 1 : 0;
            this.value = BaseWidget.clampToOptions(this.value + delta * (options.step || 1), options);
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
    };
}

/**
 * The behaviour to use for a widget: its own class methods when it is a BaseWidget, otherwise the
 * registered class for its type (applied to the plain object), otherwise null (legacy draw/mouse).
 * @returns {BaseWidget|null} an object whose draw/onPointer should be called with the widget as `this`
 */
export function widgetImplementation(widget, types = LiteGraph.widget_types) {
    if (!widget) return null;
    if (widget instanceof BaseWidget) return widget;
    const cls = types?.[widget.type];
    return cls ? cls.prototype : null;
}

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
