import { LiteGraph } from "./litegraph.js";
import { LGraphCanvas } from "./lgraphcanvas.js";

/**
 * Side panels: the shell (sections, tabs, toolbar with search / sort / modified-only filter,
 * resizing, docking side), the property editors that fit each value type, and the two built-in
 * panels: graph options (Graph / Canvas / Settings tabs) and node details.
 *
 * `LGraphCanvas.createPanel` returns a panel built here and keeps its former API
 * (addWidget, addHTML, addButton, addSeparator, clear, close, toggleAltContent,
 * toggleFooterVisibility, content / alt_content / footer / title_element).
 *
 * Editors: `LiteGraph.registerPanelEditor(name, {create(ctx) -> {element, set(value), focus?, destroy?}})`.
 * Which editor a value gets is decided by LiteGraph.valueTypes.resolveEditor (see src/valuetypes.js).
 * See the panels and widgets plan (agents/plans/2026-11-22-panels-options-node-details.md).
 */

// ---- small DOM helpers (prefixed: the build concatenates modules into one scope) ----

function panelEl(doc, tag, className, text) {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
}

/** "render_connections_border" -> "Render connections border"; "showInfo" -> "Show info" */
function panelHumanize(name) {
    const text = String(name ?? "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_.-]+/g, " ")
        .trim()
        .toLowerCase();
    return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function panelSetting(id, fallback) {
    const settings = LiteGraph.settings;
    if (!settings?.has?.(id)) return fallback;
    const value = settings.get(id);
    return value === undefined ? fallback : value;
}

function panelSaveSetting(id, value) {
    try { if (LiteGraph.settings?.has?.(id)) LiteGraph.settings.set(id, value); } catch { /* refused value: keep it in the panel only */ }
}

function panelCombos(values, target) {
    if (typeof values === "function") values = values(target, target?.node ?? target);
    if (!values) return { list: [], map: false };
    if (Array.isArray(values)) return { list: values.map((v) => ({ value: v, label: v })), map: false };
    return { list: Object.entries(values).map(([k, v]) => ({ key: k, value: v })), map: true };
}

function panelIsEditing(el) {
    const active = el?.ownerDocument?.activeElement;
    return !!active && el.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
}

// ---- editors ----

/** Commits the input's text on Enter (Ctrl+Enter for multi-line) and on blur; Escape reverts. */
function panelBindText(input, ctx, getCurrent, multiline = false) {
    let reverting = false;
    input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            reverting = true;
            input.value = getCurrent();
            input.blur();
            reverting = false;
        } else if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            input.blur();
        }
        e.stopPropagation(); // keep canvas shortcuts (Delete, Ctrl+Z ...) out of text fields
    });
    input.addEventListener("blur", () => {
        if (!reverting && input.value !== getCurrent()) ctx.commit(input.value);
    });
}

/** Drag on a label element to change a number (Shift: fine steps); one preview stream, one commit. */
function panelScrub(handle, ctx, getValue, apply) {
    if (!handle || ctx.readonly) return;
    handle.classList.add("lg-scrub");
    handle.title ||= "Drag to change, Shift for fine steps";
    handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || e.pointerType === "touch") return;
        const start = Number(getValue()) || 0;
        const x0 = e.clientX;
        let moved = false;
        let last = start;
        const step = ctx.options.step || (ctx.options.precision === 0 ? 1 : 0.1);
        const move = (ev) => {
            const dx = ev.clientX - x0;
            if (!moved && Math.abs(dx) < 3) return;
            moved = true;
            last = start + Math.round(dx / 2) * step * (ev.shiftKey ? 0.1 : 1);
            apply(last, false);
        };
        const up = () => {
            handle.ownerDocument.removeEventListener("pointermove", move);
            handle.ownerDocument.removeEventListener("pointerup", up);
            if (moved) apply(last, true);
        };
        handle.ownerDocument.addEventListener("pointermove", move);
        handle.ownerDocument.addEventListener("pointerup", up);
        e.preventDefault();
    });
}

function panelNumberText(value, options) {
    if (typeof value !== "number" || !Number.isFinite(value)) return value == null ? "" : String(value);
    return String(parseFloat(value.toFixed(options.precision ?? 3)));
}

/** The built-in panel editors (names used by value types and `info.widget` / `info.editor`). */
export function defaultPanelEditors() {
    return {
        readonly: {
            create(ctx) {
                const element = panelEl(ctx.doc, "span", "lg-readonly");
                const set = (value) => { element.textContent = LiteGraph.valueTypes?.format(ctx.type, value, ctx.options) ?? String(value); };
                set(ctx.value);
                if (!ctx.valueType && ctx.type && !["object", "array"].includes(ctx.type)) element.title = `No editor is registered for type "${ctx.type}"`;
                return { element, set };
            },
        },
        boolean: {
            create(ctx) {
                const element = panelEl(ctx.doc, "label", "lg-switch");
                const input = panelEl(ctx.doc, "input");
                input.type = "checkbox";
                input.disabled = !!ctx.readonly;
                const text = panelEl(ctx.doc, "span", "lg-switch-text");
                element.append(input, panelEl(ctx.doc, "span", "lg-switch-track"), text);
                const set = (value) => {
                    input.checked = !!value;
                    text.textContent = value ? ctx.options.on ?? "on" : ctx.options.off ?? "off";
                    ctx.row?.classList.toggle("bool-on", !!value);
                };
                set(ctx.value);
                input.addEventListener("change", () => ctx.commit(input.checked));
                element.addEventListener("click", (e) => e.stopPropagation());
                return {
                    element, set, focus: () => input.focus(),
                    // the whole row toggles, as the former panel did
                    onRowClick: () => { if (!ctx.readonly) { input.checked = !input.checked; ctx.commit(input.checked); } },
                };
            },
        },
        number: {
            create(ctx) {
                const element = panelEl(ctx.doc, "span", "lg-number");
                const input = panelEl(ctx.doc, "input", "lg-input");
                input.type = "text";
                input.inputMode = "decimal";
                input.readOnly = !!ctx.readonly;
                input.spellcheck = false;
                element.append(input);
                if (ctx.options.unit) element.append(panelEl(ctx.doc, "span", "lg-unit", ctx.options.unit));
                let current = ctx.value;
                const set = (value) => { current = value; input.value = panelNumberText(value, ctx.options); };
                set(ctx.value);
                panelBindText(input, ctx, () => panelNumberText(current, ctx.options));
                input.addEventListener("keydown", (e) => {
                    if (ctx.readonly || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                    e.preventDefault();
                    const step = (ctx.options.step || (ctx.options.precision === 0 ? 1 : 0.1)) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
                    ctx.commit((Number(current) || 0) + (e.key === "ArrowUp" ? step : -step));
                });
                panelScrub(ctx.label, ctx, () => current, (value, final) => {
                    input.value = panelNumberText(value, ctx.options);
                    if (final) ctx.commit(value); else ctx.preview(value);
                });
                return { element, set, focus: () => input.focus() };
            },
        },
        slider: {
            create(ctx) {
                const options = ctx.options;
                const element = panelEl(ctx.doc, "span", "lg-slider");
                const range = panelEl(ctx.doc, "input", "lg-range");
                range.type = "range";
                range.min = options.min ?? 0;
                range.max = options.max ?? 1;
                range.step = options.step || ((range.max - range.min) / 100) || "any";
                range.disabled = !!ctx.readonly;
                const number = panelEl(ctx.doc, "input", "lg-input lg-input-short");
                number.type = "text";
                number.inputMode = "decimal";
                number.readOnly = !!ctx.readonly;
                element.append(range, number);
                let current = ctx.value;
                const set = (value) => { current = value; range.value = value; number.value = panelNumberText(value, options); };
                set(ctx.value);
                range.addEventListener("input", () => { number.value = panelNumberText(Number(range.value), options); ctx.preview(Number(range.value)); });
                range.addEventListener("change", () => ctx.commit(Number(range.value)));
                panelBindText(number, ctx, () => panelNumberText(current, options));
                return { element, set, focus: () => number.focus() };
            },
        },
        string: {
            create(ctx) {
                const input = panelEl(ctx.doc, "input", "lg-input");
                input.type = "text";
                input.readOnly = !!ctx.readonly;
                if (ctx.options.placeholder) input.placeholder = ctx.options.placeholder;
                let current = ctx.value;
                const set = (value) => { current = value; input.value = value == null ? "" : String(value); };
                set(ctx.value);
                panelBindText(input, ctx, () => (current == null ? "" : String(current)));
                return { element: input, set, focus: () => input.focus() };
            },
        },
        text: {
            create(ctx) {
                const input = panelEl(ctx.doc, "textarea", "lg-input lg-textarea");
                input.rows = 1;
                input.readOnly = !!ctx.readonly;
                if (ctx.options.placeholder) input.placeholder = ctx.options.placeholder;
                const grow = () => { input.style.height = "auto"; if (input.scrollHeight) input.style.height = Math.min(input.scrollHeight + 2, 240) + "px"; };
                let current = ctx.value;
                const set = (value) => { current = value; input.value = value == null ? "" : String(value); grow(); };
                set(ctx.value);
                input.addEventListener("input", grow);
                input.title ||= "Ctrl+Enter to apply";
                panelBindText(input, ctx, () => (current == null ? "" : String(current)), true);
                return { element: input, set, focus: () => input.focus() };
            },
        },
        combo: {
            create(ctx) {
                const element = panelEl(ctx.doc, "span", "lg-combo");
                const select = panelEl(ctx.doc, "select", "lg-input");
                select.disabled = !!ctx.readonly;
                let entries = [];
                // property maps are {label: value} and store the value; canvas widget maps are
                // {value: label} and store the key (options.map_stores: "key")
                const storesKey = ctx.options.map_stores === "key";
                const fill = () => {
                    const { list, map } = panelCombos(ctx.options.values, ctx.target);
                    entries = list.map((entry) => (map
                        ? (storesKey ? { value: entry.key, label: entry.value } : { value: entry.value, label: entry.key })
                        : entry));
                    select.replaceChildren(...entries.map((entry, index) => {
                        const option = panelEl(ctx.doc, "option", null, entry.label);
                        option.value = String(index);
                        return option;
                    }));
                };
                fill();
                let filter = null;
                if (entries.length > 12 && !ctx.readonly) {
                    filter = panelEl(ctx.doc, "input", "lg-input lg-combo-filter");
                    filter.type = "search";
                    filter.placeholder = "Filter choices";
                    filter.addEventListener("input", () => {
                        const q = filter.value.toLowerCase();
                        for (const option of select.options) option.hidden = !!q && !option.textContent.toLowerCase().includes(q);
                    });
                    filter.addEventListener("keydown", (e) => e.stopPropagation());
                    element.append(filter);
                }
                element.append(select);
                const set = (value) => {
                    let index = entries.findIndex((entry) => entry.value === value);
                    if (index < 0) index = entries.findIndex((entry) => entry.value == value); // eslint-disable-line eqeqeq
                    if (index < 0 && value != null && value !== "") {
                        // a value outside the list stays visible and selected
                        entries.push({ value, label: String(value), extra: true });
                        const option = panelEl(ctx.doc, "option", null, `${value} (not a choice)`);
                        option.value = String(entries.length - 1);
                        select.append(option);
                        index = entries.length - 1;
                    }
                    select.value = String(index);
                };
                set(ctx.value);
                select.addEventListener("change", () => ctx.commit(entries[Number(select.value)]?.value));
                select.addEventListener("keydown", (e) => e.stopPropagation());
                return { element, set, focus: () => select.focus() };
            },
        },
        color: {
            create(ctx) {
                const element = panelEl(ctx.doc, "span", "lg-color");
                const picker = panelEl(ctx.doc, "input", "lg-color-picker");
                picker.type = "color";
                picker.disabled = !!ctx.readonly;
                const text = panelEl(ctx.doc, "input", "lg-input");
                text.type = "text";
                text.readOnly = !!ctx.readonly;
                text.spellcheck = false;
                element.append(picker, text);
                let current = ctx.value;
                const hex = (value) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.exec(String(value ?? ""));
                const set = (value) => {
                    current = value;
                    text.value = value == null ? "" : String(value);
                    const m = hex(value);
                    picker.value = m ? String(value).slice(0, 7) : "#000000";
                    element.classList.toggle("lg-color-empty", !value);
                };
                set(ctx.value);
                const alpha = () => hex(current)?.[1] ?? "";
                picker.addEventListener("input", () => ctx.preview(picker.value + alpha()));
                picker.addEventListener("change", () => ctx.commit(picker.value + alpha()));
                panelBindText(text, ctx, () => (current == null ? "" : String(current)));
                const presets = ctx.options.presets ?? null;
                if (presets && !ctx.readonly) {
                    const row = panelEl(ctx.doc, "span", "lg-swatches");
                    for (const preset of presets) {
                        const swatch = panelEl(ctx.doc, "button", "lg-swatch");
                        swatch.type = "button";
                        swatch.style.background = preset;
                        swatch.title = preset;
                        swatch.addEventListener("click", () => ctx.commit(preset));
                        row.append(swatch);
                    }
                    element.append(row);
                }
                if (ctx.options.clearable && !ctx.readonly) {
                    const clear = panelEl(ctx.doc, "button", "lg-icon-btn", "✕");
                    clear.type = "button";
                    clear.title = "Clear";
                    clear.addEventListener("click", () => ctx.commit(""));
                    element.append(clear);
                }
                return { element, set, focus: () => text.focus() };
            },
        },
        vector: {
            create(ctx) {
                const size = ctx.options.size ?? (Array.isArray(ctx.value) ? ctx.value.length : 3);
                const element = panelEl(ctx.doc, "span", "lg-vector");
                const axes = ["X", "Y", "Z", "W"];
                let current = Array.isArray(ctx.value) ? ctx.value.slice() : new Array(size).fill(0);
                const inputs = [];
                for (let i = 0; i < size; ++i) {
                    const cell = panelEl(ctx.doc, "span", "lg-vector-cell");
                    const axis = panelEl(ctx.doc, "span", "lg-axis", axes[i] ?? i + 1);
                    const input = panelEl(ctx.doc, "input", "lg-input");
                    input.type = "text";
                    input.inputMode = "decimal";
                    input.readOnly = !!ctx.readonly;
                    const componentCtx = {
                        ...ctx,
                        commit: (value) => { const next = current.slice(); next[i] = value; ctx.commit(next); },
                        preview: (value) => { const next = current.slice(); next[i] = value; ctx.preview(next); },
                    };
                    panelBindText(input, componentCtx, () => panelNumberText(current[i], ctx.options));
                    panelScrub(axis, componentCtx, () => current[i], (value, final) => {
                        input.value = panelNumberText(value, ctx.options);
                        if (final) componentCtx.commit(value); else componentCtx.preview(value);
                    });
                    cell.append(axis, input);
                    element.append(cell);
                    inputs.push(input);
                }
                const set = (value) => {
                    current = Array.isArray(value) ? value.slice() : new Array(size).fill(0);
                    inputs.forEach((input, i) => { input.value = panelNumberText(Number(current[i] ?? 0), ctx.options); });
                };
                set(ctx.value);
                return { element, set, focus: () => inputs[0]?.focus() };
            },
        },
        json: {
            create(ctx) {
                const input = panelEl(ctx.doc, "textarea", "lg-input lg-textarea lg-mono");
                input.readOnly = !!ctx.readonly;
                input.spellcheck = false;
                input.title = "JSON. Ctrl+Enter to apply";
                let current = ctx.value;
                const text = (value) => { try { return JSON.stringify(value, null, 1); } catch { return String(value); } };
                const set = (value) => {
                    current = value;
                    input.value = text(value);
                    input.rows = Math.min(8, Math.max(1, input.value.split("\n").length));
                };
                set(ctx.value);
                panelBindText(input, ctx, () => text(current), true);
                return { element: input, set, focus: () => input.focus() };
            },
        },
        code: {
            create(ctx) {
                // the node panel's code pad when there is one, else an inline monospace editor
                if (typeof ctx.panel?.inner_showCodePad === "function" && !ctx.options.inline) {
                    const button = panelEl(ctx.doc, "button", "lg-btn lg-code-btn", "Edit code…");
                    button.type = "button";
                    button.disabled = !!ctx.readonly;
                    const preview = panelEl(ctx.doc, "code", "lg-code-preview");
                    const element = panelEl(ctx.doc, "span", "lg-code");
                    element.append(button, preview);
                    const set = (value) => { preview.textContent = String(value ?? "").split("\n")[0].slice(0, 60); };
                    set(ctx.value);
                    button.addEventListener("click", () => ctx.panel.inner_showCodePad(ctx.name));
                    return { element, set, focus: () => button.focus() };
                }
                const editor = defaultPanelEditors().text.create({ ...ctx, options: { ...ctx.options } });
                editor.element.classList.add("lg-mono");
                return editor;
            },
        },
        resource: {
            create(ctx) {
                const element = panelEl(ctx.doc, "span", "lg-resource");
                const inner = defaultPanelEditors().string.create(ctx);
                element.append(inner.element);
                if (typeof ctx.options.pick === "function" && !ctx.readonly) {
                    const button = panelEl(ctx.doc, "button", "lg-icon-btn", "…");
                    button.type = "button";
                    button.title = "Choose";
                    button.addEventListener("click", async () => {
                        const picked = await ctx.options.pick(ctx);
                        if (picked !== undefined && picked !== null) ctx.commit(picked);
                    });
                    element.append(button);
                }
                return { element, set: inner.set, focus: inner.focus };
            },
        },
    };
}

// ---- the panel shell ----

/**
 * Builds panels: a `div.litegraph.dialog.lg-panel` element with the former createPanel methods,
 * plus sections, tabs, a toolbar and typed rows. See the module comment.
 */
export class PanelBuilder {

    /**
     * @param {string} title
     * @param {object} [options] - {closable, window, width, height, onOpen, onClose, id, canvas}
     * @returns {HTMLElement} the panel element, with its methods
     */
    static create(title, options = {}) {
        const ref_window = options.window || (typeof window !== "undefined" ? window : null);
        const doc = ref_window?.document ?? globalThis.document;
        const root = panelEl(doc, "div", "litegraph dialog lg-panel");
        root.header = panelEl(doc, "div", "dialog-header");
        root.title_element = panelEl(doc, "span", "dialog-title", title ?? "");
        root.actions = panelEl(doc, "span", "lg-panel-actions");
        root.header.append(root.title_element, root.actions);
        root.toolbar = panelEl(doc, "div", "lg-panel-toolbar");
        root.toolbar.hidden = true;
        root.tabbar = panelEl(doc, "div", "lg-panel-tabs");
        root.tabbar.hidden = true;
        root.tabbar.setAttribute("role", "tablist");
        root.content = panelEl(doc, "div", "dialog-content");
        root.alt_content = panelEl(doc, "div", "dialog-alt-content");
        root.alt_content.style.display = "none";
        root.footer = panelEl(doc, "div", "dialog-footer");
        root.empty_element = panelEl(doc, "div", "lg-empty");
        root.empty_element.hidden = true;
        root.append(root.header, root.toolbar, root.tabbar, root.content, root.alt_content, root.footer);
        root.content.append(root.empty_element);
        root.panel_id = options.id ?? "panel";
        root.canvas = options.canvas ?? null;
        root.tabIndex = -1;
        root._doc = doc;
        root._ref_window = ref_window;
        root._target = root.content;
        root._rows = [];
        root._row_counter = 0;
        root._disposers = [];
        root.filter_state = { query: "", modified: false, sort: options.sort ?? "declared" };

        if (options.width) root.style.width = options.width + (options.width.constructor === Number ? "px" : "");
        if (options.height) root.style.height = options.height + (options.height.constructor === Number ? "px" : "");
        if (options.closable) {
            const close = panelEl(doc, "span", "close", "✕");
            close.title = "Close (Esc)";
            close.setAttribute("role", "button");
            close.addEventListener("click", () => root.close());
            root.header.appendChild(close);
        }
        root.onOpen = options.onOpen;
        root.onClose = options.onClose;

        root.close = function() {
            for (const dispose of root._disposers.splice(0)) {
                try { dispose(); } catch (error) { LiteGraph.log_warn("panels", "close", error); }
            }
            if (root.onClose && typeof root.onClose == "function") root.onClose();
            root.parentNode?.removeChild(root);
        };
        /** runs fn when the panel closes (event subscriptions, timers) */
        root.addDisposer = (fn) => { if (typeof fn === "function") root._disposers.push(fn); };

        root.toggleAltContent = function(force) {
            const show = force !== undefined ? !!force : root.alt_content.style.display != "block";
            root.alt_content.style.display = show ? "block" : "none";
            root.content.style.display = show ? "none" : "";
        };
        root.toggleFooterVisibility = function(force) {
            const show = force !== undefined ? !!force : root.footer.style.display == "none";
            root.footer.style.display = show ? "" : "none";
        };
        root.clear = function() {
            root.content.replaceChildren(root.empty_element);
            root._rows = [];
            root._target = root.content;
            root._tabs = null;
            root._target_pane = null;
            root._section = null;
            root.tabbar.replaceChildren();
            root.tabbar.hidden = true;
        };

        /** Adds HTML (trusted markup only; use addNote for text) to the current section or the footer. */
        root.addHTML = function(code, classname, on_footer) {
            const elem = panelEl(doc, "div", classname);
            elem.innerHTML = code;
            (on_footer ? root.footer : root._target).appendChild(elem);
            return elem;
        };
        /** Adds a text note (set as text, never as markup). */
        root.addNote = function(text, classname = "lg-note") {
            const elem = panelEl(doc, "div", classname, text);
            root._target.appendChild(elem);
            return elem;
        };
        root.addButton = function(name, callback, options) {
            const elem = panelEl(doc, "button", "btn", name);
            elem.type = "button";
            elem.options = options;
            elem.addEventListener("click", callback);
            root.footer.appendChild(elem);
            return elem;
        };
        root.addSeparator = function() {
            const elem = panelEl(doc, "div", "separator");
            root._target.appendChild(elem);
            return elem;
        };

        /**
         * Adds a collapsible section; later rows go into it until endSection() or the next section.
         * The open/closed state is remembered (setting LiteGraph.Panel.Collapsed) per panel id.
         * @param {string} title
         * @param {{id?: string, collapsed?: boolean, description?: string, className?: string}} [opts]
         * @returns {HTMLDetailsElement} the section; `.body` holds its rows
         */
        root.addSection = function(title, opts = {}) {
            const parent = root._section_parent ?? root._target_pane ?? root.content;
            const id = opts.id ?? String(title).toLowerCase().replace(/\W+/g, "-");
            const section = panelEl(doc, "details", "lg-section" + (opts.className ? " " + opts.className : ""));
            section.dataset.section = id;
            const stored = panelSetting("LiteGraph.Panel.Collapsed", {})?.[root.panel_id]?.[id];
            section.open = stored !== undefined ? !stored : !opts.collapsed;
            const summary = panelEl(doc, "summary", "lg-section-title");
            summary.append(panelEl(doc, "span", "lg-section-name", title));
            section.count_element = panelEl(doc, "span", "lg-section-count");
            summary.append(section.count_element);
            section.append(summary);
            if (opts.description) section.append(panelEl(doc, "div", "lg-section-desc", opts.description));
            section.body = panelEl(doc, "div", "lg-section-body");
            section.append(section.body);
            section.addEventListener("toggle", () => {
                if (root.classList.contains("lg-filtering")) return; // sections a search opened are not remembered
                const all = { ...(panelSetting("LiteGraph.Panel.Collapsed", {}) ?? {}) };
                all[root.panel_id] = { ...(all[root.panel_id] ?? {}), [id]: !section.open };
                panelSaveSetting("LiteGraph.Panel.Collapsed", all);
            });
            parent.insertBefore(section, parent === root.content ? root.empty_element : null);
            root._target = section.body;
            root._section = section;
            return section;
        };
        root.endSection = function() {
            root._target = root._target_pane ?? root.content;
            root._section = null;
        };

        /**
         * Adds tabs; useTab(id) sends later sections and rows to that tab. While a search or the
         * modified-only filter is active, every tab is shown with its title, so results from all tabs appear.
         * @param {{id: string, title: string}[]} tabs
         * @param {string} [active]
         */
        root.addTabs = function(tabs, active) {
            root._tabs = new Map();
            root.tabbar.hidden = false;
            for (const tab of tabs) {
                const button = panelEl(doc, "button", "lg-tab", tab.title);
                button.type = "button";
                button.setAttribute("role", "tab");
                button.dataset.tab = tab.id;
                button.addEventListener("click", () => root.showTab(tab.id));
                root.tabbar.append(button);
                const pane = panelEl(doc, "div", "lg-tab-pane");
                pane.dataset.tab = tab.id;
                pane.append(panelEl(doc, "div", "lg-tab-heading", tab.title));
                root.content.insertBefore(pane, root.empty_element);
                root._tabs.set(tab.id, { button, pane, title: tab.title });
            }
            root.showTab(active ?? tabs[0]?.id);
        };
        root.showTab = function(id) {
            if (!root._tabs?.has(id)) return;
            root.active_tab = id;
            for (const [tabId, tab] of root._tabs) {
                tab.button.classList.toggle("active", tabId === id);
                tab.button.setAttribute("aria-selected", String(tabId === id));
                tab.pane.classList.toggle("active", tabId === id);
            }
            root.onTabChanged?.(id);
        };
        root.useTab = function(id) {
            const tab = root._tabs?.get(id);
            root._target_pane = tab?.pane ?? null;
            root._target = tab?.pane ?? root.content;
            root._section = null;
        };

        /**
         * Adds a typed row: the editor comes from LiteGraph.valueTypes.resolveEditor(info, value).
         * @param {object} spec
         * @param {string} spec.name - key (dataset.property)
         * @param {*} spec.value
         * @param {object} [spec.info] - type, widget, editor, label, tooltip, description, examples,
         *   min, max, step, precision, unit, values, readonly, placeholder, default_value, ...
         * @param {string} [spec.label]
         * @param {(value: *) => (void|false)} [spec.commit] - final value (return false to refuse)
         * @param {(value: *) => void} [spec.preview] - live value while dragging (default: commit)
         * @param {*} [spec.defaultValue] - shows reset and the modified marker when given
         * @param {string[]} [spec.keywords] - more text the search matches
         * @param {object} [spec.target] - passed to combo value functions and editors
         * @returns {HTMLElement} the row (`.value`, `.options`, `.setValue(v)`, `.editor`)
         */
        root.addRow = function(spec) {
            const info = spec.info ?? {};
            const resolved = LiteGraph.valueTypes
                ? LiteGraph.valueTypes.resolveEditor(info, spec.value, LiteGraph.panel_editors ?? {})
                : { editor: "readonly", type: info.type ?? null, options: { ...info }, valueType: null };
            const type = resolved.valueType?.name ?? resolved.type;
            const options = resolved.options;
            const readonly = !!(info.readonly || options.read_only || spec.readonly);
            // a read-only value reads as text, not as a disabled field (switches and colours keep their look)
            if (readonly && !["boolean", "color", "nodecolor", "readonly"].includes(resolved.editor) && !info.editor) resolved.editor = "readonly";
            const editorDef = LiteGraph.panel_editors?.[resolved.editor] ?? defaultPanelEditors()[resolved.editor] ?? defaultPanelEditors().readonly;

            const row = panelEl(doc, "div", "property lg-row");
            row.dataset.property = spec.name;
            row.dataset.type = info.type ?? type ?? "";
            row.dataset.editor = resolved.editor;
            row.dataset.order = String(root._row_counter++);
            if (readonly) row.classList.add("lg-readonly-row");
            const label = spec.label ?? info.label ?? spec.name;
            const nameEl = panelEl(doc, "span", "property_name");
            const labelText = panelEl(doc, "span", "lg-label", label);
            nameEl.append(labelText);
            const tooltip = info.tooltip ?? spec.tooltip ?? null;
            const description = info.description ?? spec.description ?? null;
            const examples = info.examples ?? spec.examples ?? null;
            const titleParts = [tooltip, spec.name !== label ? spec.name : null].filter(Boolean);
            if (titleParts.length) nameEl.title = titleParts.join("\n");
            const valueEl = panelEl(doc, "span", "property_value");
            const tail = panelEl(doc, "span", "lg-row-tail");
            row.append(nameEl, valueEl, tail);
            let help = null;
            if (description || examples?.length || (tooltip && tooltip.length > 60)) {
                const toggle = panelEl(doc, "button", "lg-help-btn", "?");
                toggle.type = "button";
                toggle.title = "Show the description";
                toggle.setAttribute("aria-expanded", "false");
                nameEl.append(toggle);
                help = panelEl(doc, "div", "lg-row-help");
                help.hidden = true;
                if (description || tooltip) help.append(panelEl(doc, "div", "lg-row-desc", description ?? tooltip));
                if (examples?.length) {
                    const ex = panelEl(doc, "div", "lg-row-examples");
                    ex.append(panelEl(doc, "span", "lg-row-examples-title", "Examples: "));
                    examples.forEach((example, i) => {
                        if (i) ex.append(doc.createTextNode(" · "));
                        ex.append(panelEl(doc, "code", null, example));
                    });
                    help.append(ex);
                }
                toggle.addEventListener("click", (e) => {
                    e.stopPropagation();
                    help.hidden = !help.hidden;
                    toggle.setAttribute("aria-expanded", String(!help.hidden));
                });
                row.append(help);
            }
            const errorEl = panelEl(doc, "div", "lg-row-error");
            errorEl.hidden = true;
            row.append(errorEl);

            let current = spec.value;
            const hasDefault = Object.hasOwn(spec, "defaultValue") || Object.hasOwn(info, "default_value");
            const defaultValue = Object.hasOwn(spec, "defaultValue") ? spec.defaultValue : info.default_value;
            let reset = null;
            if (hasDefault && !readonly) {
                reset = panelEl(doc, "button", "lg-reset", "↺");
                reset.type = "button";
                reset.title = "Reset to default: " + panelValueText(type, defaultValue, options);
                reset.addEventListener("click", (e) => { e.stopPropagation(); apply(defaultValue, true); });
                tail.append(reset);
            }
            const updateModified = () => {
                const modified = hasDefault && !LGraphCanvas.sameValue(current, defaultValue);
                row.classList.toggle("lg-modified", modified);
                if (reset) reset.hidden = !modified;
            };
            const showError = (message) => {
                errorEl.textContent = message ?? "";
                errorEl.hidden = !message;
                row.classList.toggle("lg-invalid", !!message);
            };
            let handle = null;
            const apply = (raw, final) => {
                let value = raw;
                if (type && LiteGraph.valueTypes?.has(type)) {
                    try {
                        value = LiteGraph.valueTypes.coerce(type, raw, options);
                    } catch (error) {
                        showError(error.message);
                        if (final) handle?.set(current);
                        return false;
                    }
                    const message = LiteGraph.valueTypes.validate(type, value, options);
                    if (message) {
                        showError(message);
                        if (final) handle?.set(current);
                        return false;
                    }
                }
                showError(null);
                if (!final) {
                    (spec.preview ?? spec.commit)?.(value);
                    return true;
                }
                const result = spec.commit?.(value);
                if (result === false) {
                    handle?.set(current);
                    return false;
                }
                current = value;
                row.value = value;
                handle?.set(value);
                updateModified();
                return true;
            };
            const ctx = {
                doc, name: spec.name, value: spec.value, options, info, type, valueType: resolved.valueType, readonly,
                row, label: labelText, panel: root, target: spec.target ?? null,
                commit: (value) => apply(value, true),
                preview: (value) => apply(value, false),
                describe: (text) => { if (help) help.firstChild.textContent = text; },
            };
            handle = editorDef.create(ctx) ?? defaultPanelEditors().readonly.create(ctx);
            valueEl.append(handle.element);
            if (handle.onRowClick) {
                row.classList.add("boolean");
                row.addEventListener("click", (e) => { if (e.target === row || nameEl.contains(e.target)) handle.onRowClick(); });
            }
            row.editor = handle;
            row.options = info;
            row.value = spec.value;
            row.dataset.search = [label, spec.name, tooltip, description, ...(spec.keywords ?? [])].filter(Boolean).join(" \n").toLowerCase();
            /** pushes an outside change into the row (ignored while the row is being edited) */
            row.setValue = (value) => {
                if (panelIsEditing(row)) return;
                current = value;
                row.value = value;
                handle.set(value);
                updateModified();
            };
            updateModified();
            root._target.appendChild(row);
            root._rows.push(row);
            if (root.filter_state.query || root.filter_state.modified) root.applyFilter();
            return row;
        };

        /** Former API: a row for a value; calls options.callback then callback with (name, value, options). */
        root.addWidget = function(type, name, value, options, callback) {
            options = options || {};
            type = String(type ?? "string").toLowerCase();
            if (type === "undefined") type = "string";
            const info = { ...options, widget: type };
            if (type === "enum" || type === "combo") info.widget = "combo";
            const row = root.addRow({
                name,
                label: options.label || name,
                value,
                info,
                commit: (v) => {
                    LiteGraph.log_debug("panels", "addWidget", "change", name, v);
                    if (options.callback) options.callback(name, v, options);
                    if (callback) callback(name, v, options);
                },
            });
            row.dataset.type = options.type || type;
            row.options = options;
            return row;
        };

        /**
         * Adds the toolbar: search, sort, modified-only filter, expand / collapse all.
         * @param {{placeholder?: string, sorts?: {id: string, label: string}[], sort?: string, modified?: boolean}} [opts]
         */
        root.addToolbar = function(opts = {}) {
            root.toolbar.hidden = false;
            root.toolbar.replaceChildren();
            const search = panelEl(doc, "input", "lg-input lg-search");
            search.type = "search";
            search.placeholder = opts.placeholder ?? "Search";
            search.setAttribute("aria-label", search.placeholder);
            search.addEventListener("input", () => { root.filter_state.query = search.value; root.applyFilter(); });
            search.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && search.value) { search.value = ""; root.filter_state.query = ""; root.applyFilter(); e.stopPropagation(); }
                e.stopPropagation();
            });
            root.search_input = search;
            root.toolbar.append(search);
            const tools = panelEl(doc, "span", "lg-toolbar-tools");
            if (opts.sorts?.length) {
                const sort = panelEl(doc, "select", "lg-input lg-sort");
                sort.title = "Sort";
                for (const option of opts.sorts) {
                    const el = panelEl(doc, "option", null, option.label);
                    el.value = option.id;
                    sort.append(el);
                }
                sort.value = root.filter_state.sort = opts.sort ?? opts.sorts[0].id;
                sort.addEventListener("change", () => { root.filter_state.sort = sort.value; root.applySort(); opts.onSort?.(sort.value); });
                tools.append(sort);
                root.sort_select = sort;
            }
            if (opts.modified !== false) {
                const label = panelEl(doc, "label", "lg-toggle-chip");
                const box = panelEl(doc, "input");
                box.type = "checkbox";
                label.append(box, doc.createTextNode(" Modified"));
                label.title = "Show only values that differ from their default";
                box.addEventListener("change", () => { root.filter_state.modified = box.checked; root.applyFilter(); });
                tools.append(label);
                root.modified_input = box;
            }
            const expand = panelEl(doc, "button", "lg-icon-btn", "⊞");
            expand.type = "button";
            expand.title = "Expand all";
            expand.addEventListener("click", () => root.setAllSections(true));
            const collapse = panelEl(doc, "button", "lg-icon-btn", "⊟");
            collapse.type = "button";
            collapse.title = "Collapse all";
            collapse.addEventListener("click", () => root.setAllSections(false));
            tools.append(expand, collapse);
            root.toolbar.append(tools);
            return search;
        };
        root.setAllSections = function(open) {
            for (const section of root.content.querySelectorAll("details.lg-section")) {
                if (section.open !== open) {
                    section.open = open;
                    section.dispatchEvent(new (root._ref_window?.Event ?? Event)("toggle"));
                }
            }
        };

        /** Shows the rows matching the search and the modified-only filter; updates counts and the empty state. */
        root.applyFilter = function() {
            const query = root.filter_state.query.trim().toLowerCase();
            const modifiedOnly = root.filter_state.modified;
            const filtering = !!query || modifiedOnly;
            root.classList.toggle("lg-filtering", filtering);
            let visible = 0;
            for (const row of root._rows) {
                const match = (!query || query.split(/\s+/).every((term) => row.dataset.search.includes(term)))
                    && (!modifiedOnly || row.classList.contains("lg-modified"));
                row.hidden = !match;
                if (match) visible++;
                PanelBuilder.highlight(row.querySelector(".lg-label"), query);
            }
            for (const section of root.content.querySelectorAll("details.lg-section")) {
                const rows = [...section.body.querySelectorAll(":scope > .lg-row, :scope > .lg-subsection > .lg-row")];
                const shown = rows.filter((row) => !row.hidden).length;
                section.count_element.textContent = rows.length ? (filtering ? `${shown}/${rows.length}` : String(rows.length)) : "";
                section.hidden = filtering && shown === 0;
                // a search opens the sections it found something in, and closes them again afterwards
                if (filtering && shown && !section.open) { section.dataset.autoOpened = "1"; section.open = true; }
                if (!filtering && section.dataset.autoOpened) { delete section.dataset.autoOpened; section.open = false; }
            }
            for (const tab of root._tabs?.values() ?? []) {
                const shown = [...tab.pane.querySelectorAll(".lg-row")].some((row) => !row.hidden);
                tab.pane.classList.toggle("lg-has-results", shown);
                tab.button.classList.toggle("lg-tab-dim", filtering && !shown);
            }
            root.empty_element.hidden = !filtering || visible > 0;
            root.empty_element.textContent = query ? `Nothing matches “${root.filter_state.query.trim()}”` : "No value differs from its default";
            return visible;
        };

        /** Orders the rows of each section: declared, az, or modified first. */
        root.applySort = function() {
            const mode = root.filter_state.sort;
            const containers = new Set(root._rows.map((row) => row.parentNode).filter(Boolean));
            for (const container of containers) {
                const rows = [...container.children].filter((child) => child.classList?.contains("lg-row"));
                if (rows.length < 2) continue;
                const anchor = rows[0].previousSibling;
                const order = (row) => Number(row.dataset.order);
                const label = (row) => row.querySelector(".lg-label")?.textContent.toLowerCase() ?? "";
                rows.sort((a, b) => {
                    if (mode === "az") return label(a).localeCompare(label(b));
                    if (mode === "modified") {
                        const d = Number(b.classList.contains("lg-modified")) - Number(a.classList.contains("lg-modified"));
                        if (d) return d;
                    }
                    return order(a) - order(b);
                });
                let at = anchor ? anchor.nextSibling : container.firstChild;
                for (const row of rows) {
                    container.insertBefore(row, at);
                    at = row.nextSibling;
                }
            }
        };

        // Escape closes (fields handle their own Escape first)
        root.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && options.closable) {
                e.stopPropagation();
                root.close();
            }
        });
        // pointer and wheel events stay in the panel (the canvas below must not pan or zoom)
        for (const type of ["pointerdown", "wheel", "dblclick", "contextmenu"]) {
            root.addEventListener(type, (e) => { if (type !== "pointerdown" || e.target !== root) e.stopPropagation(); }, { passive: true });
        }

        if (root.onOpen && typeof root.onOpen == "function") root.onOpen();
        return root;
    }

    /** Wraps the matched terms of an element's text in <mark> (text only, nothing parsed). */
    static highlight(el, query) {
        if (!el) return;
        const text = el.textContent;
        if (!query) {
            if (el.querySelector("mark")) el.textContent = text;
            return;
        }
        const terms = query.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        const re = new RegExp(`(${terms.join("|")})`, "ig");
        const parts = text.split(re);
        el.replaceChildren(...parts.map((part, i) => (i % 2 ? Object.assign(el.ownerDocument.createElement("mark"), { textContent: part }) : el.ownerDocument.createTextNode(part))));
    }
}

/** Shorthand used for reset tooltips. */
function panelValueText(type, value, options) {
    return LiteGraph.valueTypes ? LiteGraph.valueTypes.format(type, value, options) : String(value);
}

/**
 * Places panels on their host element: the docking side and width (settings LiteGraph.Panel.Side
 * and LiteGraph.Panel.Width), the resize handle and the side switch. Floating, movable and stacked
 * panels (idea X-13) are meant to be added here without changing the panels.
 */
export class PanelHost {
    static place(panel, parent, options = {}) {
        const doc = panel.ownerDocument;
        const side = options.side ?? panelSetting("LiteGraph.Panel.Side", "left");
        PanelHost.setSide(panel, side);
        const width = options.width ?? panelSetting("LiteGraph.Panel.Width", null);
        if (width && !panel.style.width) panel.style.width = width + "px";
        if (!panel.querySelector(":scope > .lg-panel-resize")) {
            const handle = panelEl(doc, "div", "lg-panel-resize");
            handle.title = "Drag to resize";
            handle.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                const x0 = e.clientX;
                const w0 = panel.getBoundingClientRect().width || panel.offsetWidth || 400;
                const max = Math.max(320, (panel.parentNode?.clientWidth || 1600) - 40);
                const move = (ev) => {
                    const dx = (ev.clientX - x0) * (panel.classList.contains("lg-dock-right") ? -1 : 1);
                    panel.style.width = Math.round(Math.min(max, Math.max(280, w0 + dx))) + "px";
                };
                const up = () => {
                    doc.removeEventListener("pointermove", move);
                    doc.removeEventListener("pointerup", up);
                    panelSaveSetting("LiteGraph.Panel.Width", parseInt(panel.style.width, 10) || null);
                };
                doc.addEventListener("pointermove", move);
                doc.addEventListener("pointerup", up);
            });
            panel.append(handle);
            const dock = panelEl(doc, "button", "lg-icon-btn lg-dock-btn", "⇆");
            dock.type = "button";
            dock.title = "Move to the other side";
            dock.addEventListener("click", () => {
                const next = panel.classList.contains("lg-dock-right") ? "left" : "right";
                PanelHost.setSide(panel, next);
                panelSaveSetting("LiteGraph.Panel.Side", next);
            });
            panel.actions?.prepend(dock);
        }
        parent?.appendChild(panel);
        return panel;
    }

    static setSide(panel, side) {
        panel.classList.toggle("lg-dock-right", side === "right");
        panel.classList.toggle("lg-dock-left", side !== "right");
    }
}

// ---- graph options panel ----

/** The canvas switches and values the Canvas tab shows (keys of LGraphCanvas.optionInfo plus host additions). */
function panelCanvasOptionKeys() {
    const listed = [...(LiteGraph.availableCanvasOptions || [])];
    const order = Object.keys(LGraphCanvas.optionInfo ?? {});
    const extra = Object.entries(LGraphCanvas.optionInfo ?? {}).filter(([, info]) => info.always).map(([key]) => key);
    // in the order of LGraphCanvas.optionInfo; options without metadata keep their listed order, last
    const rank = (key) => (order.includes(key) ? order.indexOf(key) : order.length + listed.indexOf(key));
    return [...new Set([...listed, ...extra])].sort((a, b) => rank(a) - rank(b));
}

function panelCanvasDefaults() {
    return panelSetting("LiteGraph.Canvas.Defaults", {}) ?? {};
}

/**
 * Builds the graph options panel of a canvas: Graph, Canvas and Settings tabs.
 * @param {LGraphCanvas} graphcanvas
 * @returns {HTMLElement} the panel
 */
PanelBuilder.showGraphOptions = function(graphcanvas) {
    graphcanvas.closePanels();
    const ref_window = graphcanvas.getCanvasWindow();
    const panel = graphcanvas.createPanel("Options", {
        closable: true,
        window: ref_window,
        id: "options",
        onOpen() { graphcanvas.OPTIONPANEL_IS_OPEN = true; },
        onClose() { graphcanvas.OPTIONPANEL_IS_OPEN = false; graphcanvas.options_panel = null; },
    });
    graphcanvas.options_panel = panel;
    panel.id = "option-panel";
    panel.classList.add("settings");
    const root = graphcanvas.graph?.rootGraph ?? graphcanvas.graph;
    let active = "graph";

    const refresh = () => {
        const query = panel.filter_state.query;
        const modified = panel.filter_state.modified;
        const scroll = panel.content.scrollTop;
        panel.clear();
        panel.footer.replaceChildren();
        panel.addTabs([
            { id: "graph", title: "Graph" },
            { id: "canvas", title: "Canvas" },
            { id: "settings", title: "Settings" },
            ...panelContributedTabs("options"),
        ], active);
        panel.onTabChanged = (id) => { active = id; };

        // Graph: the document
        panel.useTab("graph");
        let pendingModes = 0;
        if (root?.setExecutionModel && LiteGraph.listExecutionModels) {
            panel.addSection("Execution", { id: "graph-execution" });
            const models = LiteGraph.listExecutionModels();
            const model = LiteGraph.getExecutionModel(root.executionModel);
            const values = models.map((m) => m.name);
            panel.addRow({
                name: "Execution model",
                value: root.executionModel,
                info: {
                    type: "enum",
                    values,
                    tooltip: "How the graph runs: which nodes run on each step and in which order. Stored in the document (config.execution).",
                    description: models.map((m) => `${m.name}: ${m.description ?? m.title ?? ""}`).join("\n"),
                    examples: ["ancestors: a node runs only after the nodes it reads from", "legacy: every node runs in order on each step"],
                },
                keywords: ["model", "execution", "run", "order", ...values],
                commit: (value) => {
                    try {
                        if (root.setExecutionModel(value)) graphcanvas.setDirty(true, true);
                    } catch (error) {
                        graphcanvas.showExecutionNotice(error.message);
                        return false;
                    }
                    setTimeout(refresh, 0);
                },
            });
            panel.addNote(model?.description ?? model?.title ?? "", "execution-model-info");
            pendingModes = LiteGraph.ExecutionEngine?.modelModes?.(root)?.length ?? 0;
            if (pendingModes) panel.addNote(`${pendingModes} node(s) use a mode other than the one this model declares for their type. "Apply the model's node modes" below changes them (one undo step).`, "lg-note lg-warn");
        }
        panel.addSection("Document", { id: "graph-document" });
        const count = (graph, fn) => graph?._nodes?.reduce((n, node) => n + fn(node) + (node.subgraph ? count(node.subgraph, fn) : 0), 0) ?? 0;
        const facts = [
            ["Nodes", root?._nodes?.length ?? 0, "Nodes in this graph (subgraph contents not included)"],
            ["Nodes, all levels", count(root, () => 1), "Nodes in this graph and every subgraph"],
            ["Links", Object.keys(root?.links ?? {}).length, "Links in this graph"],
            ["Groups", root?._groups?.length ?? 0, "Groups in this graph"],
            ["Subgraphs", count(root, (node) => (node.subgraph ? 1 : 0)), "Subgraph instances, all levels"],
            ["Revision", root?.revision ?? 0, "Saved changes since the document was loaded"],
        ];
        for (const [name, value, tooltip] of facts) panel.addRow({ name, value, info: { type: "int", readonly: true, tooltip } });
        if (graphcanvas.graph !== root) {
            panel.addRow({ name: "Open subgraph", value: String(graphcanvas.graph?._subgraph_node?.title ?? ""), info: { type: "string", readonly: true, tooltip: "The canvas shows this subgraph; the values above are the root document's" } });
        }
        panelRenderContributions(panel, "options", { tab: "graph", canvas: graphcanvas, graph: root });

        // Canvas: this view
        panel.useTab("canvas");
        const info = LGraphCanvas.optionInfo ?? {};
        const categories = ["Rendering", "Links", "Interaction", "Advanced", "Other"];
        const byCategory = new Map(categories.map((c) => [c, []]));
        for (const key of panelCanvasOptionKeys()) {
            const meta = info[key] ?? {};
            const category = byCategory.has(meta.category) ? meta.category : "Other";
            byCategory.get(category).push(key);
        }
        for (const [category, keys] of byCategory) {
            if (!keys.length) continue;
            panel.addSection(category, { id: "canvas-" + category.toLowerCase() });
            for (const key of keys) {
                const meta = info[key] ?? {};
                let value = graphcanvas[key];
                const { label: _label, category: _category, store: _store, default: _default, always: _always, ...metaInfo } = meta; // eslint-disable-line no-unused-vars
                const rowInfo = { type: meta.type ?? (typeof value === "number" ? "number" : "boolean"), ...metaInfo };
                let defaultValue = meta.default;
                if (meta.values && meta.store === "index") {
                    // stored as an index into a list of names (links_render_mode)
                    const names = typeof meta.values === "function" ? meta.values() : meta.values;
                    rowInfo.type = "enum";
                    rowInfo.values = names;
                    value = names[value];
                    defaultValue = names[defaultValue];
                }
                panel.addRow({
                    name: key,
                    label: meta.label ?? panelHumanize(key),
                    value,
                    info: rowInfo,
                    ...(defaultValue !== undefined ? { defaultValue } : {}),
                    keywords: [category, key],
                    commit: (v) => {
                        if (meta.values && meta.store === "index") {
                            const names = typeof meta.values === "function" ? meta.values() : meta.values;
                            v = names.indexOf(v);
                        }
                        LiteGraph.log_verbose("panels", "canvas option", key, v);
                        graphcanvas[key] = v;
                        graphcanvas.setDirty(true, true);
                    },
                });
            }
        }
        panelRenderContributions(panel, "options", { tab: "canvas", canvas: graphcanvas, graph: root });

        // Settings: LiteGraph.settings
        panel.useTab("settings");
        const settings = LiteGraph.settings;
        if (settings) {
            const groups = new Map();
            for (const def of settings.list()) {
                if (def.hidden) continue;
                const category = def.category?.length ? def.category.filter((part) => part !== "LiteGraph").join(" / ") || "General" : "General";
                if (!groups.has(category)) groups.set(category, []);
                groups.get(category).push(def);
            }
            const names = [...groups.keys()].sort((a, b) => a.localeCompare(b));
            for (const category of names) {
                panel.addSection(category, { id: "settings-" + category.toLowerCase().replace(/\W+/g, "-") });
                const defs = groups.get(category).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                for (const def of defs) {
                    const rowInfo = {
                        type: def.type === "text" ? "string" : def.type === "json" ? "object" : def.type,
                        tooltip: def.tooltip,
                        description: def.description,
                        examples: def.examples,
                        min: def.min, max: def.max, step: def.step, unit: def.unit,
                    };
                    if (def.type === "combo" && Array.isArray(def.options)) {
                        rowInfo.type = "enum";
                        const objects = def.options.some((o) => o && typeof o === "object");
                        rowInfo.values = objects ? Object.fromEntries(def.options.map((o) => (o && typeof o === "object" ? [o.text ?? o.label ?? String(o.value), o.value] : [String(o), o]))) : def.options;
                    }
                    if (rowInfo.type === "number" && Number.isInteger(def.default) && def.step === undefined) rowInfo.type = "int";
                    for (const k of Object.keys(rowInfo)) if (rowInfo[k] === undefined) delete rowInfo[k];
                    const defaultValue = typeof def.default === "function" ? def.default() : def.default;
                    panel.addRow({
                        name: def.id,
                        label: def.name && def.name !== def.id ? def.name : panelHumanize(def.id.split(".").pop()),
                        value: settings.get(def.id),
                        info: rowInfo,
                        defaultValue,
                        keywords: [category, def.id, def.experimental ? "experimental" : ""],
                        commit: (v) => {
                            try {
                                settings.set(def.id, v);
                            } catch (error) {
                                graphcanvas.showExecutionNotice(error.message);
                                return false;
                            }
                            graphcanvas.setDirty(true, true);
                        },
                    }).classList.toggle("lg-experimental", !!def.experimental);
                }
            }
        }
        panelRenderContributions(panel, "options", { tab: "settings", canvas: graphcanvas, graph: root });
        for (const tab of panelContributedTabs("options")) {
            panel.useTab(tab.id);
            panelRenderContributions(panel, "options", { tab: tab.id, canvas: graphcanvas, graph: root });
        }
        panel.useTab(null);

        // footer: optional and never automatic
        if (pendingModes) {
            panel.addButton(`Apply the model's node modes (${pendingModes})`, () => {
                root.applyExecutionModelModes();
                graphcanvas.setDirty(true, true);
                refresh();
            }).title = "Sets the mode each node type declares under this execution model (one undo step)";
        }
        panel.addButton("Save canvas as defaults", () => {
            const values = {};
            for (const key of panelCanvasOptionKeys()) values[key] = graphcanvas[key];
            panelSaveSetting("LiteGraph.Canvas.Defaults", values);
            graphcanvas.showExecutionNotice?.("Canvas options saved as defaults for new canvases", 2500);
        }).title = "New canvases start with these Canvas options (setting LiteGraph.Canvas.Defaults)";

        panel.filter_state.query = query;
        panel.filter_state.modified = modified;
        panel.applyFilter();
        panel.applySort();
        panel.content.scrollTop = scroll;
    };

    panel.addToolbar({
        placeholder: "Search options and settings",
        sorts: [{ id: "declared", label: "By category" }, { id: "az", label: "A–Z" }, { id: "modified", label: "Modified first" }],
    });
    refresh();
    panel.refresh = refresh;
    PanelHost.place(panel, graphcanvas.canvas.parentNode);
    return panel;
};

// ---- node details panel ----

function panelNodeColorName(node) {
    if (node.color === undefined && node.bgcolor === undefined) return "";
    return Object.keys(LGraphCanvas.node_colors).find((name) => LGraphCanvas.node_colors[name].color == node.color) ?? "custom";
}

function panelShapeName(node) {
    const names = { [LiteGraph.BOX_SHAPE]: "box", [LiteGraph.ROUND_SHAPE]: "round", [LiteGraph.CIRCLE_SHAPE]: "circle", [LiteGraph.CARD_SHAPE]: "card" };
    return names[node._shape ?? node.shape] ?? "default";
}

function panelSlotColor(canvas, type) {
    return canvas?.default_connection_color_byType?.[type] ?? LGraphCanvas.link_type_colors?.[type] ?? "#999";
}

/** A signature of what the node panel's layout depends on (rebuilt when it changes). */
function panelNodeSignature(node) {
    return JSON.stringify([
        Object.keys(node.properties ?? {}),
        (node.widgets ?? []).map((w) => [w?.name, w?.type]),
        (node.inputs ?? []).map((s) => [s.name, s.type, s.link != null]),
        (node.outputs ?? []).map((s) => [s.name, s.type, s.links?.length ?? 0]),
        node.mode,
    ]);
}

/**
 * Builds the node details panel.
 * @param {LGraphCanvas} graphcanvas
 * @param {LGraphNode} node
 * @returns {HTMLElement} the panel
 */
PanelBuilder.showNode = function(graphcanvas, node) {
    graphcanvas.SELECTED_NODE = node;
    graphcanvas.closePanels();
    const ref_window = graphcanvas.getCanvasWindow();
    const panel = graphcanvas.createPanel(node.title || "", {
        closable: true,
        window: ref_window,
        id: "node",
        onOpen() { graphcanvas.NODEPANEL_IS_OPEN = true; },
        onClose() { graphcanvas.NODEPANEL_IS_OPEN = false; graphcanvas.node_panel = null; },
    });
    graphcanvas.node_panel = panel;
    panel.id = "node-panel";
    panel.node = node;
    panel.classList.add("settings", "lg-node-panel");
    const doc = panel._doc;
    const graph = node.graph;
    let signature = "";

    // one undo step per edit; beforeChange/afterChange still fire for hosts that listen to them
    const edit = (label, fn) => {
        const g = node.graph;
        if (!g) { fn(); return; }
        const run = () => {
            g.beforeChange(node);
            try { fn(); } finally {
                g.onGraphChanged({ action: label, doSave: true });
                g.afterChange();
            }
        };
        if (g.transact) g.transact(label, run); else run();
        graphcanvas.dirty_canvas = true;
        graphcanvas.setDirty?.(true, true);
    };
    // a drag (scrub, slider, colour picker) is one undo step: the first preview opens it, the commit closes it
    let session = null;
    const previewEdit = (label, fn) => {
        const g = node.graph;
        if (!g?.beginTransaction) { fn(); return; }
        if (!session) {
            g.beginTransaction(label);
            g.beforeChange(node);
            session = { graph: g };
        }
        fn();
        g.onGraphChanged({ action: label, doSave: true });
        graphcanvas.setDirty?.(true, true);
    };
    const commitEdit = (label, fn) => {
        if (!session) { edit(label, fn); return; }
        const g = session.graph;
        session = null;
        try { fn(); } finally {
            g.onGraphChanged({ action: label, doSave: true });
            g.afterChange();
            g.commitTransaction();
        }
        graphcanvas.setDirty?.(true, true);
    };
    panel.addDisposer(() => { if (session) { session.graph.afterChange(); session.graph.commitTransaction(); session = null; } });

    // the former update function, still passed to onAddPropertyToPanel(name, panel, value, info, fUpdate)
    const fUpdate = (name, value) => {
        edit(`Edit ${name}`, () => {
            switch (name) {
                case "Title":
                    node.title = value;
                    break;
                case "Mode": {
                    const kV = typeof value === "number" ? value : Object.values(LiteGraph.NODE_MODES).indexOf(value);
                    if (kV >= 0 && LiteGraph.NODE_MODES[kV]) {
                        if (node.changeMode(kV) === false && node.mode_refusal) graphcanvas.showExecutionNotice(node.mode_refusal);
                    } else {
                        LiteGraph.log_warn("lgraphcanvas", "showShowNodePanel", "unexpected mode", value, kV);
                    }
                    break;
                }
                case "Color":
                    if (!value) {
                        delete node.color;
                        delete node.bgcolor;
                    } else if (LGraphCanvas.node_colors[value]) {
                        node.color = LGraphCanvas.node_colors[value].color;
                        node.bgcolor = LGraphCanvas.node_colors[value].bgcolor;
                    } else {
                        LiteGraph.log_warn("lgraphcanvas", "showShowNodePanel", "unexpected color", value);
                    }
                    break;
                default:
                    node.setProperty(name, value);
                    break;
            }
        });
    };
    panel.fUpdate = fUpdate;

    const def = LiteGraph.getNodeDefinition?.(node.type) ?? null;

    const renderHeader = () => {
        const header = panelEl(doc, "div", "lg-node-header");
        const typeLine = panelEl(doc, "div", "lg-node-typeline");
        typeLine.append(panelEl(doc, "code", "node_type", node.type ?? ""));
        typeLine.append(panelEl(doc, "span", "lg-chip lg-chip-id", "#" + node.id));
        header.append(typeLine);
        const chips = panelEl(doc, "div", "lg-chips");
        const chip = (text, cls, title) => { const c = panelEl(doc, "span", "lg-chip " + (cls ?? ""), text); if (title) c.title = title; chips.append(c); };
        if (def?.category) chip(def.category, "lg-chip-cat", "Category");
        if (def?.pack) chip(def.pack.version ? `${def.pack.title ?? def.pack.id} ${def.pack.version}` : def.pack.title ?? def.pack.id, "lg-chip-pack", "Pack");
        if (def?.source) chip(def.source, "lg-chip-src", "Source");
        if (def?.deprecated) chip("deprecated", "lg-chip-warn", "This node type is deprecated");
        if (def?.experimental) chip("experimental", "lg-chip-exp", "This node type is experimental");
        if (node.graph?._subgraph_node) chip("path " + String(node.getPath?.() ?? ""), "lg-chip-path", "Path inside the document");
        if (chips.childNodes.length) header.append(chips);
        const missing = LiteGraph.getMissingCapabilities?.(node.type) ?? [];
        if (missing.length) header.append(panelEl(doc, "div", "lg-note lg-warn", `This runtime lacks: ${missing.join(", ")}. The node may not run here.`));
        const desc = def?.description || node.constructor?.desc || "";
        if (desc) header.append(panelEl(doc, "div", "node_desc", desc));
        const usage = node.constructor?.def?.usage ?? def?.usage;
        if (usage) header.append(panelEl(doc, "div", "lg-node-usage", usage));
        panel.content.insertBefore(header, panel.empty_element);
    };

    const rowFor = (name) => panel._rows.find((row) => row.dataset.property === name && row.closest(".lg-section")?.dataset.section === "properties")
        ?? panel._rows.find((row) => row.dataset.property === name);

    function inner_refresh() {
        const scroll = panel.content.scrollTop;
        const query = panel.filter_state.query;
        const modified = panel.filter_state.modified;
        panel.clear();
        panel.title_element.textContent = node.title || "";
        renderHeader();
        signature = panelNodeSignature(node);

        // General
        panel.addSection("General", { id: "general" });
        panel.addRow({ name: "Title", value: node.title, info: { type: "string", tooltip: "The title shown in the node's title bar" }, commit: (v) => { fUpdate("Title", v); panel.title_element.textContent = v; } });
        const validModes = LiteGraph.getValidNodeModes?.(node) ?? LiteGraph.NODE_MODES.map((_, i) => i);
        const invalid = LiteGraph.NODE_MODES.filter((_, i) => !validModes.includes(i));
        panel.addRow({
            name: "Mode",
            value: LiteGraph.NODE_MODES[node.mode],
            info: {
                type: "enum",
                values: LiteGraph.NODE_MODES.filter((_, i) => validModes.includes(i)),
                tooltip: "When the node runs" + (invalid.length ? `. Not offered for this type under the document's execution model: ${invalid.join(", ")}` : ""),
                description: "Always: on every step it is due. On event: when an action reaches it. Never: it does not run. On trigger / on request: when triggered or when a node pulls its output.",
            },
            commit: (v) => fUpdate("Mode", v),
        });
        panel.addRow({
            name: "Color",
            value: panelNodeColorName(node),
            info: { editor: "nodecolor", tooltip: "Title and body colours from the canvas palette" },
            target: node,
            commit: (v) => fUpdate("Color", v),
        });
        panel.addRow({
            name: "Shape",
            value: panelShapeName(node),
            info: { type: "enum", values: LiteGraph.VALID_SHAPES ?? ["default", "box", "round", "card"], tooltip: "The node's outline" },
            commit: (v) => edit("Edit shape", () => { node.shape = v; }),
        });
        panel.addRow({ name: "Collapsed", value: !!node.flags?.collapsed, info: { type: "boolean", tooltip: "Show only the title bar" }, commit: (v) => edit("Collapse", () => { if (!!node.flags.collapsed !== v) node.collapse(true); }) });
        panel.addRow({ name: "Pinned", value: !!node.flags?.pinned, info: { type: "boolean", tooltip: "Pinned nodes cannot be moved or resized" }, commit: (v) => edit("Pin", () => node.pin(v)) });

        // Properties
        const props = Object.keys(node.properties ?? {});
        if (props.length) {
            panel.addSection("Properties", { id: "properties" });
            const entries = props.map((pName, index) => ({ pName, index, info: node.getPropertyInfo(pName) ?? {} }))
                .filter((entry) => !entry.info.hidden);
            const sortMode = panelSetting("LiteGraph.Panel.PropertySort", "declared");
            entries.sort((a, b) => ((a.info.order ?? 0) - (b.info.order ?? 0)) || (sortMode === "az" ? a.pName.localeCompare(b.pName) : a.index - b.index));
            const sections = new Map();
            for (const entry of entries) {
                const key = entry.info.section ?? "";
                if (!sections.has(key)) sections.set(key, []);
                sections.get(key).push(entry);
            }
            const body = panel._target;
            for (const [sectionName, list] of sections) {
                if (sectionName) {
                    const sub = panelEl(doc, "div", "lg-subsection");
                    sub.append(panelEl(doc, "div", "lg-subsection-title", sectionName));
                    body.append(sub);
                    panel._target = sub;
                } else {
                    panel._target = body;
                }
                for (const { pName, info } of list) {
                    const value = node.properties[pName];
                    // in case the node wants control over its panel row
                    // (registered handlers too; any truthy legacy result means handled, a {return_value} counts by its value)
                    const r = node.processCallbackHandlers
                        ? node.processCallbackHandlers("onAddPropertyToPanel", { def_cb: node.onAddPropertyToPanel }, pName, panel, value, info, fUpdate)
                        : node.onAddPropertyToPanel?.(pName, panel, value, info, fUpdate);
                    if (r && (typeof r !== "object" || !("return_value" in r) || r.return_value)) continue;
                    panel.addRow({
                        name: pName,
                        value,
                        info: { ...info, type: info.type ?? (typeof value === "number" ? "number" : undefined) },
                        target: node,
                        commit: (v) => commitEdit(`Edit ${pName}`, () => node.setProperty(pName, v)),
                        preview: (v) => previewEdit(`Edit ${pName}`, () => node.setProperty(pName, v)),
                    });
                }
            }
            panel._target = body;
        }

        // Widgets that no property backs
        const bound = new Set(props);
        const widgets = (node.widgets ?? []).filter((w) => w && !(w.options?.property && bound.has(w.options.property)) && !bound.has(w.name));
        if (widgets.length) {
            panel.addSection("Widgets", { id: "widgets" });
            for (const w of widgets) {
                if (w.type === "button") {
                    const button = panelEl(doc, "button", "lg-btn lg-widget-btn", w.label || w.name || "button");
                    button.type = "button";
                    button.addEventListener("click", () => { w.callback?.(w, graphcanvas, node, null, null); graphcanvas.setDirty(true, true); });
                    const holder = panelEl(doc, "div", "property lg-row lg-button-row");
                    holder.dataset.property = w.name ?? "";
                    holder.dataset.order = String(panel._row_counter++);
                    holder.dataset.search = String(w.label || w.name || "").toLowerCase();
                    holder.append(button);
                    panel._target.append(holder);
                    panel._rows.push(holder);
                    holder.setValue = () => {};
                    continue;
                }
                const linked = node.isWidgetLinked?.(w);
                const opts = { ...(w.options ?? {}) };
                delete opts.property;
                panel.addRow({
                    name: w.name ?? "",
                    label: w.label || w.name,
                    value: w.value,
                    info: { ...opts, widget: w.type === "text" && !opts.multiline ? "string" : w.type, type: w.type, map_stores: "key", readonly: !!(w.disabled || linked), tooltip: w.tooltip ?? opts.tooltip ?? (linked ? "Driven by its linked input" : undefined) },
                    target: w,
                    keywords: ["widget"],
                    commit: (v) => commitEdit(`Edit ${w.name}`, () => graphcanvas.applyWidgetValue(node, w, v)),
                    preview: (v) => previewEdit(`Edit ${w.name}`, () => graphcanvas.applyWidgetValue(node, w, v)),
                }).dataset.widget = "1";
            }
        }

        // Inputs and outputs
        const slotRows = (title, id, slots, isInput) => {
            if (!slots?.length) return;
            panel.addSection(title, { id, collapsed: false });
            const slotDefs = (isInput ? def?.inputs : def?.outputs) ?? [];
            slots.forEach((slot, index) => {
                const row = panelEl(doc, "div", "property lg-row lg-slot");
                row.dataset.property = slot.name ?? String(index);
                row.dataset.order = String(panel._row_counter++);
                const dot = panelEl(doc, "span", "lg-slot-dot");
                dot.style.background = panelSlotColor(graphcanvas, slot.type);
                const name = panelEl(doc, "span", "property_name");
                name.append(dot, panelEl(doc, "span", "lg-label", slot.label || slot.localized_name || slot.name || `#${index}`));
                const slotDef = slotDefs.find((d) => d.name === slot.name) ?? slotDefs[index];
                const tip = slotDef?.tooltip ?? slotDef?.description ?? slot.tooltip;
                if (tip) name.title = tip;
                const value = panelEl(doc, "span", "property_value");
                value.append(panelEl(doc, "code", "lg-slot-type", slot.type === LiteGraph.EVENT ? "event" : String(slot.type ?? "*")));
                const links = isInput ? (slot.link != null ? [slot.link] : []) : (slot.links ?? []);
                for (const linkId of links) {
                    const link = node.graph?.links?.[linkId];
                    if (!link) continue;
                    const other = node.graph.getNodeById(isInput ? link.origin_id : link.target_id);
                    if (!other) continue;
                    const otherSlot = isInput ? other.outputs?.[link.origin_slot] : other.inputs?.[link.target_slot];
                    const go = panelEl(doc, "button", "lg-link-btn", `${isInput ? "←" : "→"} ${other.title}${otherSlot?.name ? "." + otherSlot.name : ""}`);
                    go.type = "button";
                    go.title = "Select and centre this node";
                    go.addEventListener("click", () => {
                        graphcanvas.selectNode(other);
                        graphcanvas.centerOnNode?.(other);
                        graphcanvas.setDirty(true, true);
                    });
                    value.append(go);
                }
                if (!links.length) value.append(panelEl(doc, "span", "lg-muted", slot.optional ? "optional, not connected" : "not connected"));
                row.append(name, value);
                row.dataset.search = [slot.name, slot.label, slot.type].filter(Boolean).join(" ").toLowerCase();
                row.setValue = () => {};
                panel._target.append(row);
                panel._rows.push(row);
            });
        };
        slotRows("Inputs", "inputs", node.inputs, true);
        slotRows("Outputs", "outputs", node.outputs, false);

        // Execution
        panel.addSection("Execution", { id: "execution", collapsed: true });
        const decl = def?.execution;
        if (decl) {
            for (const [key, value] of Object.entries(decl)) {
                if (value === undefined || value === null || (Array.isArray(value) && !value.length)) continue;
                const shown = Array.isArray(value) ? value.map((v) => (typeof v === "number" ? LiteGraph.NODE_MODES[v] ?? v : v)).join(", ") : typeof value === "number" && key.includes("mode") ? LiteGraph.NODE_MODES[value] ?? value : value;
                panel.addRow({ name: "decl." + key, label: panelHumanize(key), value: shown, info: { type: typeof shown === "boolean" ? "boolean" : "string", readonly: true, tooltip: "Declared by the node type (static def.execution)" } });
            }
        }
        const state = node.execution_state;
        panel.addRow({ name: "state.status", label: "Status", value: state?.status ?? "idle", info: { type: "string", readonly: true, tooltip: "The last execution state reported for this node" } });
        if (state?.max) panel.addRow({ name: "state.progress", label: "Progress", value: `${state.value ?? 0} / ${state.max}`, info: { type: "string", readonly: true } });
        if (state?.message) panel.addNote(state.message, "lg-note " + (state.status === "error" ? "lg-error" : ""));
        try {
            const issues = (node.graph?.checkExecution?.().issues ?? []).filter((issue) => issue.node === node);
            for (const issue of issues) panel.addNote(`${issue.code}: ${issue.message}`, "lg-note lg-warn");
            if (!issues.length) panel.addNote("No execution problem found for this node.", "lg-note lg-muted");
        } catch (error) {
            LiteGraph.log_warn("panels", "checkExecution", error);
        }

        // contributed sections (LiteGraph.registerPanelSection)
        panelRenderContributions(panel, "node", { node, canvas: graphcanvas, graph: node.graph });

        // Advanced
        panel.addSection("Advanced", { id: "advanced", collapsed: true });
        panel.addRow({ name: "id", label: "Id", value: String(node.id), info: { type: "string", readonly: true } });
        if (node.graph?._subgraph_node) panel.addRow({ name: "path", label: "Path", value: String(node.getPath?.() ?? ""), info: { type: "string", readonly: true } });
        panel.addRow({
            name: "pos", label: "Position", value: [...node.pos], info: { type: "vec2", precision: 0 },
            commit: (v) => commitEdit("Move node", () => { node.pos[0] = v[0]; node.pos[1] = v[1]; }),
            preview: (v) => previewEdit("Move node", () => { node.pos[0] = v[0]; node.pos[1] = v[1]; }),
        });
        panel.addRow({
            name: "size", label: "Size", value: [...node.size], info: { type: "vec2", precision: 0, min: 0 },
            commit: (v) => commitEdit("Resize node", () => node.setSize(v)),
            preview: (v) => previewEdit("Resize node", () => node.setSize(v)),
        });
        const swatches = Object.values(LGraphCanvas.node_colors).map((c) => c.bgcolor);
        panel.addRow({ name: "bgcolor", label: "Body colour", value: node.bgcolor ?? "", info: { type: "color", presets: swatches, clearable: true }, commit: (v) => edit("Edit colour", () => { if (v) node.bgcolor = v; else delete node.bgcolor; }) });
        panel.addRow({ name: "color", label: "Title colour", value: node.color ?? "", info: { type: "color", presets: Object.values(LGraphCanvas.node_colors).map((c) => c.color), clearable: true }, commit: (v) => edit("Edit colour", () => { if (v) node.color = v; else delete node.color; }) });
        panel.addRow({ name: "flags", label: "Flags", value: { ...node.flags }, info: { type: "object", readonly: true } });
        const json = panelEl(doc, "pre", "lg-json");
        try { json.textContent = JSON.stringify(node.serialize(), null, 1); } catch (error) { json.textContent = String(error); }
        const copy = panelEl(doc, "button", "lg-btn", "Copy JSON");
        copy.type = "button";
        copy.addEventListener("click", () => {
            const text = json.textContent;
            const clip = ref_window?.navigator?.clipboard;
            if (clip?.writeText) clip.writeText(text).catch(() => {});
        });
        const jsonBox = panelEl(doc, "div", "lg-json-box");
        jsonBox.append(copy, json);
        panel._target.append(jsonBox);
        panel.endSection();

        // the node's own additions, after the sections (former hook)
        if (node.processCallbackHandlers) node.processCallbackHandlers("onShowCustomPanelInfo", { def_cb: node.onShowCustomPanelInfo }, panel);
        else node.onShowCustomPanelInfo?.(panel);

        panel.footer.replaceChildren();
        panel.addButton("Center", () => { graphcanvas.centerOnNode?.(node); graphcanvas.setDirty(true, true); }).title = "Centre the canvas on this node";
        if (!node.block_delete) {
            panel.addButton("Delete", function() {
                if (node.block_delete) return;
                node.graph.remove(node);
                panel.close();
            }).classList.add("delete");
        }

        panel.filter_state.query = query;
        panel.filter_state.modified = modified;
        panel.applyFilter();
        panel.applySort();
        panel.content.scrollTop = scroll;
    }
    panel.inner_refresh = inner_refresh;
    panel.refresh = inner_refresh;

    panel.inner_showCodePad = function(propname) {
        panel.classList.remove("settings");
        panel.classList.add("centered");
        panel.alt_content.replaceChildren();
        const textarea = panelEl(doc, "textarea", "code");
        panel.alt_content.append(textarea);
        const fDoneWith = () => {
            panel.toggleAltContent(false);
            panel.toggleFooterVisibility(true);
            textarea.remove();
            panel.classList.add("settings");
            panel.classList.remove("centered");
            inner_refresh();
        };
        textarea.value = node.properties[propname] ?? "";
        textarea.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key == "Enter" && e.ctrlKey) {
                fUpdate(propname, textarea.value);
                fDoneWith();
            }
        });
        panel.toggleAltContent(true);
        panel.toggleFooterVisibility(false);
        textarea.style.height = "calc(100% - 40px)";
        const assign = panel.addButton("Assign", () => { fUpdate(propname, textarea.value); fDoneWith(); });
        panel.alt_content.appendChild(assign);
        const button = panel.addButton("Close", fDoneWith);
        button.style.float = "right";
        panel.alt_content.appendChild(button);
        textarea.focus();
    };

    // follow selection (pin) and live refresh
    const follow = panelEl(doc, "button", "lg-icon-btn lg-follow-btn", "⌖");
    follow.type = "button";
    const syncFollow = () => {
        const on = !!panelSetting("LiteGraph.Panel.FollowSelection", false);
        follow.classList.toggle("active", on);
        follow.title = on ? "Following the selection (click to keep this node)" : "Showing this node (click to follow the selection)";
        follow.setAttribute("aria-pressed", String(on));
    };
    follow.addEventListener("click", () => { panelSaveSetting("LiteGraph.Panel.FollowSelection", !panelSetting("LiteGraph.Panel.FollowSelection", false)); syncFollow(); });
    syncFollow();
    panel.actions.prepend(follow);

    panel.addToolbar({
        placeholder: "Search this node",
        sorts: [{ id: "declared", label: "Declared order" }, { id: "az", label: "A–Z" }, { id: "modified", label: "Modified first" }],
        sort: panelSetting("LiteGraph.Panel.PropertySort", "declared") === "az" ? "az" : "declared",
        onSort: (mode) => panelSaveSetting("LiteGraph.Panel.PropertySort", mode),
    });
    inner_refresh();

    if (graph?.events?.on) {
        const events = graph.events;
        let timer = null;
        const soon = () => {
            if (timer) return;
            timer = setTimeout(() => {
                timer = null;
                if (!panel.parentNode && !panel.isConnected) return;
                if (panelNodeSignature(node) !== signature) { if (!panelIsEditing(panel)) inner_refresh(); return; }
                rowFor("Title")?.setValue(node.title);
                panel.title_element.textContent = node.title || "";
                rowFor("Mode")?.setValue(LiteGraph.NODE_MODES[node.mode]);
                rowFor("Color")?.setValue(panelNodeColorName(node));
                rowFor("Collapsed")?.setValue(!!node.flags?.collapsed);
                rowFor("Pinned")?.setValue(!!node.flags?.pinned);
                rowFor("pos")?.setValue([...node.pos]);
                rowFor("size")?.setValue([...node.size]);
                for (const w of node.widgets ?? []) panel._rows.find((r) => r.dataset.widget && r.dataset.property === w?.name)?.setValue(w.value);
                for (const name of Object.keys(node.properties ?? {})) rowFor(name)?.setValue(node.properties[name]);
            }, 30);
        };
        panel.addDisposer(events.on("node-property-changed", (e) => { if (e.detail?.node === node) rowFor(e.detail.name)?.setValue(e.detail.value); }));
        panel.addDisposer(events.on("widget-changed", (e) => { if (e.detail?.node === node) panel._rows.find((r) => r.dataset.widget && r.dataset.property === e.detail.widget?.name)?.setValue(e.detail.value); }));
        panel.addDisposer(events.on("node-removed", (e) => { if (e.detail?.node === node) panel.close(); }));
        panel.addDisposer(events.on("graph-changed", soon));
        panel.addDisposer(events.on("changed", soon));
        panel.addDisposer(() => clearTimeout(timer));
        const root = graph.rootGraph ?? graph;
        if (root !== graph && root.events?.on) panel.addDisposer(root.events.on("execution-state", () => { if (!panelIsEditing(panel)) soon(); }));
        else panel.addDisposer(events.on("execution-state", () => soon()));
    }

    PanelHost.place(panel, graphcanvas.canvas.parentNode);
    return panel;
};

/** The node colour editor: swatches of LGraphCanvas.node_colors, plus none. */
function panelNodeColorEditor() {
    return {
        create(ctx) {
            const element = panelEl(ctx.doc, "span", "lg-swatches lg-node-colors");
            const buttons = new Map();
            const add = (name, color) => {
                const b = panelEl(ctx.doc, "button", "lg-swatch");
                b.type = "button";
                b.title = name ? panelHumanize(name) : "No colour";
                b.disabled = !!ctx.readonly;
                if (color) {
                    b.style.background = color.bgcolor;
                    b.style.borderTopColor = color.color;
                } else {
                    b.classList.add("lg-swatch-none");
                }
                b.addEventListener("click", () => ctx.commit(name));
                buttons.set(name, b);
                element.append(b);
            };
            add("", null);
            for (const [name, color] of Object.entries(LGraphCanvas.node_colors)) add(name, color);
            const set = (value) => { for (const [name, b] of buttons) b.classList.toggle("active", name === value); };
            set(ctx.value);
            return { element, set, focus: () => buttons.values().next().value?.focus() };
        },
    };
}

// ---- contributions ----

function panelContributedTabs(panelName) {
    const tabs = new Map();
    for (const section of LiteGraph.panel_sections?.values() ?? []) {
        if (section.panel === panelName && section.tab && !["graph", "canvas", "settings"].includes(section.tab)) {
            tabs.set(section.tab, { id: section.tab, title: section.tabTitle ?? panelHumanize(section.tab) });
        }
    }
    return [...tabs.values()];
}

/**
 * Renders the sections registered with LiteGraph.registerPanelSection for a panel ("node" or
 * "options"; options sections go to their tab, "settings" by default).
 */
function panelRenderContributions(panel, panelName, context) {
    const sections = [...(LiteGraph.panel_sections?.values() ?? [])]
        .filter((s) => s.panel === panelName && (panelName !== "options" || (s.tab ?? "settings") === context.tab))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const section of sections) {
        try {
            if (typeof section.when === "function" && !section.when(context.node ?? context.graph, context)) continue;
            const el = panel.addSection(section.title ?? panelHumanize(section.id), { id: "x-" + section.id, collapsed: section.collapsed });
            el.classList.add("lg-contributed");
            section.render(el, { ...context, panel, section: el });
        } catch (error) {
            LiteGraph.log_warn("panels", "section", section.id, error);
        }
    }
    panel.endSection();
}

/** The editors defaultPanelEditors() does not include because they belong to the node panel. */
PanelBuilder.extraEditors = function() {
    return { nodecolor: panelNodeColorEditor() };
};
