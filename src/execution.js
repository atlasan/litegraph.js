import { LiteGraph } from "./litegraph.js";
// the legacy flags (LEGACY_EXECUTION_FLAGS) are defined with their accessors in litegraph.js

/**
 * Execution models and the execution engine (Wave 6, plan agents/plans/2026-11-22-events-execution.md).
 *
 * A model is a named set of rules, chosen per document in the root graph's `config.execution`:
 * - `ancestors` (default for new graphs): events are delivered immediately; before an action, a
 *   trigger or an ALWAYS node's turn in the step, the target's ON_REQUEST data ancestors are pulled:
 *   a deterministic pure node again only when its inputs, its properties or the graph changed; any
 *   other ON_REQUEST node (declared `pure: "volatile"`, or undeclared) once per call scope;
 * - `step`: deferred delivery (today's core default);
 * - `strict`: deferred delivery, each node executes at most once per frame;
 * - `event`: immediate delivery, no refresh;
 * - `legacy`: documents saved without the field; the process-wide flags decide, exactly as before.
 *
 * The core methods (`triggerSlot`, `actionDo`, `doExecute`, `getInputData(force)`, `runStep`,
 * the subgraph boundaries) keep today's code for `legacy` and delegate to this engine otherwise.
 *
 * Call scopes (flows step 4, plan agents/plans/2026-11-25-call-scopes.md): a root scope opens per
 * step (`frame_N`) and per outer entry (`call_N`); a child scope opens per Sequence output
 * (`<id>.sK`, nodes declaring `branches`), per loop iteration (`<id>.iK`, `iterate`) and per
 * `graph/function` call (`<id>.fK`). Every opening is a new object, so two openings never share a
 * memo; the string id (`call_3/7.s1/5.i2`) is the `action_call` outside `legacy`.
 */

/** reasons carried by `event-dropped {node, path, reason, setting?}` */
export const EVENT_DROP_REASONS = Object.freeze([
    "reentry", "refreshing", "no-handler", "mode", "stopped-queue", "max-passes", "max-depth", "cycle", "once-per-frame",
]);

const RULE_DEFAULTS = Object.freeze({
    delivery: "deferred",
    refresh: "none",
    frame_pull: false,
    once_per_frame: false,
    default_mode: 0, // LiteGraph.ALWAYS
    exec_slots: false, // create onTrigger / onExecuted when an event link is dropped on a node
});

export class ExecutionEngine {
    static models = new Map();
    static LEGACY = Object.freeze({ name: "legacy", legacy: true, title: "Legacy (global flags)", description: "Documents saved without a model: the global flags (use_deferred_actions, refreshAncestorsOn*, ...) decide, as before Wave 6." });

    /** a global data version, stamped on links by setOutputData */
    static _version = 0;
    /** the current call scope `{id, parent}` (a new object per opening), or null outside any run */
    static _scope = null;
    static _callCount = 0;
    static _childCount = 0;
    /** nesting of actions and executions in non-legacy models (MaxEventDepth) */
    static _depth = 0;
    /** nesting of pulls (triggers fired while pulling are dropped as "refreshing") */
    static _pulling = 0;

    /**
     * Registers an execution model.
     * @param {string} name
     * @param {{delivery?: "deferred"|"immediate", refresh?: "none"|"ancestors", frame_pull?: boolean, once_per_frame?: boolean, default_mode?: number, title?: string, description?: string}} rules
     */
    static registerModel(name, rules = {}) {
        if (typeof name !== "string" || !name) throw new TypeError("execution model: a name is required");
        if (name === "legacy") throw new Error("execution model: \"legacy\" is built in and cannot be replaced");
        const model = Object.freeze({ ...RULE_DEFAULTS, ...rules, name, legacy: false });
        if (!["deferred", "immediate"].includes(model.delivery)) throw new Error(`execution model ${name}: delivery must be "deferred" or "immediate"`);
        if (!["none", "ancestors"].includes(model.refresh)) throw new Error(`execution model ${name}: refresh must be "none" or "ancestors"`);
        this.models.set(name, model);
        return model;
    }

    static getModel(name) {
        if (name === "legacy") return this.LEGACY;
        return this.models.get(name) ?? null;
    }

    static listModels() {
        return ["legacy", ...this.models.keys()].map((name) => this.getModel(name));
    }

    /** The model a new graph gets: `LiteGraph.default_execution_model`, or `legacy` once a legacy flag was assigned. */
    static resolveDefaultModel() {
        const lg = LiteGraph;
        if (lg._default_execution_model_set) return lg._default_execution_model;
        if (lg._legacy_flags_assigned?.size) return "legacy";
        return lg._default_execution_model ?? "ancestors";
    }

    /** the name of the model a graph runs under (resolved from its root) */
    static modelNameFor(graph) {
        const root = graph?.rootGraph ?? graph;
        if (!root) return this.resolveDefaultModel();
        const name = root.config?.execution;
        if (typeof name === "string" && name) return this.getModel(name) ? name : "legacy";
        if (root._execution_from_document) return "legacy";
        return this.resolveDefaultModel();
    }

    /** the rules a graph runs under */
    static rulesFor(graph) {
        return this.getModel(this.modelNameFor(graph)) ?? this.LEGACY;
    }

    // ---- settings ------------------------------------------------------------------------------

    static setting(id, fallback) {
        try {
            const value = LiteGraph.settings?.get(id);
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    /**
     * Whether dropping an event link on a node creates its exec slots (`onTrigger`, `onExecuted`):
     * the setting LiteGraph.Node.ExecSlots when "on" or "off"; else an assigned
     * `LiteGraph.do_add_triggers_slots`; else the model's `exec_slots` rule (on under `ancestors`).
     */
    static execSlotsFor(graph) {
        const setting = this.setting("LiteGraph.Node.ExecSlots", "auto");
        if (setting === "on") return true;
        if (setting === "off") return false;
        if (LiteGraph._do_add_triggers_slots !== undefined) return LiteGraph._do_add_triggers_slots;
        return !!this.rulesFor(graph).exec_slots;
    }

    static get maxEventDepth() { return Number(this.setting("LiteGraph.Execution.MaxEventDepth", 256)) || 256; }
    static get maxEventPasses() { return Number(this.setting("LiteGraph.Execution.MaxEventPasses", 64)) || 64; }

    // ---- reporting -------------------------------------------------------------------------------

    /**
     * Reports a refused event or execution: `event-dropped {node, path, reason, setting?, message}` on
     * the root graph (only when someone listens), plus one `log_warn` per node and reason.
     */
    static drop(node, reason, extra = {}) {
        const graph = node?.graph;
        const root = graph?.rootGraph ?? graph;
        const message = extra.message ?? `${node?.type ?? "node"} ${node?.id ?? ""}: event dropped (${reason})${extra.setting ? `; setting ${extra.setting}` : ""}`;
        if (node && reason !== "mode") { // a muted (NEVER) target is intentional: event only, no warning
            node._dropped_reported ??= new Set();
            if (!node._dropped_reported.has(reason)) {
                node._dropped_reported.add(reason);
                LiteGraph.log_warn?.("execution", message);
            }
        }
        if (root?._events?.has("event-dropped")) {
            root._emit("event-dropped", { node: node ?? null, path: node?.getPath?.() ?? null, reason, ...extra, message });
        }
        return false;
    }

    // ---- data versions and memo -----------------------------------------------------------------

    /** stamps the links of an output with a new data version (called by setOutputData) */
    static stamp(links, graph) {
        if (!links?.length || !graph) return;
        const version = ++this._version;
        for (const id of links) {
            const link = graph.links[id];
            if (link) link._data_version = version;
        }
    }

    /** the newest data version on a node's data inputs */
    static inputStamp(node) {
        let stamp = 0;
        const graph = node.graph;
        for (const input of node.inputs ?? []) {
            if (input.link == null || input.type === LiteGraph.ACTION || input.type === LiteGraph.EVENT) continue;
            const version = graph.links[input.link]?._data_version ?? 0;
            if (version > stamp) stamp = version;
        }
        return stamp;
    }

    // ---- call scopes -----------------------------------------------------------------------------

    /** the current scope id (`call_3/7.s1`), or null outside any run */
    static get scopeId() { return this._scope?.id ?? null; }

    /** opens a root scope `<prefix>_N` when none is open; returns the scope to restore */
    static openRoot(prefix) {
        const outer = this._scope;
        if (!outer) this._scope = { id: `${prefix}_${prefix === "call" ? ++this._callCount : this._callCount++}`, parent: null };
        return outer;
    }

    /** a child scope of the current one for a node (`<node id>.<tag>`), or null under legacy */
    static scopeFor(node, tag) {
        if (!node?.graph || this.rulesFor(node.graph).legacy) return null;
        const parent = this._scope;
        const id = `${node.id}.${tag}`;
        return { id: parent ? `${parent.id}/${id}` : id, parent };
    }

    /** runs fn in a scope (null: in the current one) */
    static inScope(scope, fn) {
        if (!scope) return fn();
        const outer = this._scope;
        this._scope = scope;
        try {
            return fn();
        } finally {
            this._scope = outer;
        }
    }

    /** runs one loop iteration in its own child scope (`<node id>.i<k>`); under legacy just runs it */
    static iterate(node, k, fn) {
        return this.inScope(this.scopeFor(node, `i${k}`), fn);
    }

    // ---- memo ------------------------------------------------------------------------------------

    /** true for a node declared `pure: true` (not volatile): its value depends on its inputs and properties only */
    static isDeterministic(node) {
        const decl = this.declarationOf(node);
        return !!decl?.pure && !decl.volatile;
    }

    /**
     * Whether a node's last run is still valid: no newer input data, no property edit (setProperty)
     * and no graph change since; then either it ran in the current call scope, or it is
     * deterministic and its property values are the ones it ran with (a direct write to
     * `node.properties` is seen too).
     */
    static isFresh(node) {
        const memo = node._exec_memo;
        if (!memo || memo.props !== (node._props_version ?? 0) || memo.graph !== node.graph?._version) return false;
        if (this.inputStamp(node) > memo.stamp) return false;
        if (memo.scope !== null && memo.scope === this._scope) return true;
        return memo.values !== undefined && this.sameValues(memo.values, node.properties);
    }

    static remember(node) {
        const memo = { scope: this._scope, stamp: this.inputStamp(node), props: node._props_version ?? 0, graph: node.graph?._version, values: undefined };
        // a deterministic node stays valid across calls: keep its property values to compare
        if (this.isDeterministic(node)) memo.values = node.properties ? Object.values(node.properties) : null;
        node._exec_memo = memo;
    }

    /** true when an object's own values are, in order, the remembered ones */
    static sameValues(values, properties) {
        if (!properties) return values === null;
        if (values === null) return false;
        let index = 0;
        for (const key in properties) {
            if (values[index++] !== properties[key]) return false;
        }
        return index === values.length;
    }

    /** a property edit: the node's memo is no longer valid (setProperty calls it) */
    static touch(node) {
        node._props_version = (node._props_version ?? 0) + 1;
    }

    // ---- refresh input (FLW-03) --------------------------------------------------------------------

    /** true when an input slot is a refresh input (an ACTION slot marked `refresh: true`) */
    static isRefreshInput(input) {
        return !!input?.refresh && input.type === LiteGraph.ACTION;
    }

    /** whether the node menu offers a refresh input: an ON_REQUEST node without one, outside legacy */
    static offersRefresh(node) {
        return !!node?.graph && node.mode === LiteGraph.ON_REQUEST && !this.rulesFor(node.graph).legacy
            && !(node.inputs ?? []).some((input) => this.isRefreshInput(input));
    }

    /** adds a refresh input to a node (once); returns its slot */
    static addRefreshInput(node) {
        const existing = (node.inputs ?? []).findIndex((input) => this.isRefreshInput(input));
        if (existing >= 0) return existing;
        node.addInput("refresh", LiteGraph.ACTION, { refresh: true, nameLocked: true, removable: true, optional: true });
        return node.inputs.length - 1;
    }

    /** runs a node again now (its memo is dropped) and restamps its outputs; consumers follow on their next pull */
    static refresh(node) {
        if (!node?.graph || node.mode === LiteGraph.NEVER) return false;
        node._exec_memo = null;
        this.ensureFresh(node);
        return true;
    }

    // ---- pull ------------------------------------------------------------------------------------

    /**
     * The nodes a pull runs for a node's data inputs (direct origins): ON_REQUEST and BYPASS nodes,
     * and an ALWAYS node that never ran yet (its first value, e.g. a constant before its first turn).
     */
    static requestOrigins(node) {
        const graph = node.graph;
        const origins = [];
        for (const input of node.inputs ?? []) {
            if (input.link == null || input.type === LiteGraph.ACTION || input.type === LiteGraph.EVENT) continue;
            const link = graph.links[input.link];
            const origin = link && graph.getNodeById(link.origin_id);
            if (!origin || origins.includes(origin)) continue;
            // not a ticking node, and not one with a connected event output: run in a pull, its events
            // would be dropped as "refreshing" (audit finding 10); both give their value at their turn
            const firstValue = origin.mode === LiteGraph.ALWAYS && !origin._exec_memo && origin.onExecute && !this.declarationOf(origin)?.ticks
                && !this.emitsEvents(origin);
            // a bypassed node is a wire: pulling through it refreshes what it passes on
            if (origin.mode === LiteGraph.ON_REQUEST || origin.mode === LiteGraph.BYPASS || firstValue) origins.push(origin);
        }
        return origins;
    }

    /** true when a node has an event output with links (its events cannot fire inside a pull) */
    static emitsEvents(node) {
        return (node.outputs ?? []).some((o) => (o.type === LiteGraph.EVENT || o.type === LiteGraph.ACTION) && o.links?.length);
    }

    /**
     * Pulls the ON_REQUEST data ancestors of a node: each runs at most once per frame or call,
     * unless one of its inputs has a newer data version. ALWAYS ancestors are never re-run.
     */
    static pull(node, visiting = new Set()) {
        if (!node?.graph || !node.inputs) return;
        for (const origin of this.requestOrigins(node)) this.ensureFresh(origin, visiting);
    }

    /** runs an ON_REQUEST node if it is not fresh (its own ON_REQUEST inputs first) */
    static ensureFresh(node, visiting = new Set()) {
        if (visiting.has(node)) return this.drop(node, "cycle", { message: `${node.type} ${node.id}: ON_REQUEST cycle while pulling data; the cycle is not re-run` });
        visiting.add(node);
        try {
            this.pull(node, visiting);
        } finally {
            visiting.delete(node);
        }
        if (this.isFresh(node)) return;
        this._pulling++;
        try {
            node.doExecute(undefined, this._scope ? { action_call: this._scope.id } : {});
        } finally {
            this._pulling--;
        }
        this.remember(node);
    }

    // ---- delivery --------------------------------------------------------------------------------

    /** sends an event from an output to its links (non-legacy models) */
    static triggerSlot(node, slot, param, link_id, options, rules) {
        if (this._pulling > 0) return this.drop(node, "refreshing", { message: `${node.type} ${node.id}: an event fired while its data was pulled is dropped (event emitters cannot be ON_REQUEST)` });
        const decl = this.declarationOf(node);
        // a node that declares branches (Sequence) opens a child scope per output: each branch reads fresh values
        if (decl?.branches) {
            const branch = this.scopeFor(node, `s${slot}`);
            return this.inScope(branch, () => this.deliver(node, slot, param, link_id, { ...options, action_call: branch.id }, rules, decl));
        }
        return this.deliver(node, slot, param, link_id, options, rules, decl);
    }

    static deliver(node, slot, param, link_id, options, rules, decl) {
        const graph = node.graph;
        const output = node.outputs[slot];
        // a node that declares emit: "immediate" (loops, Sequence) delivers now, with a refresh, in every model
        const emitNow = decl?.emit === "immediate";
        graph._last_trigger_time = LiteGraph.getTime();
        for (const id of [...output.links]) {
            if (link_id != null && link_id != id) continue;
            const link = graph.links[id];
            if (!link) continue;
            link._last_time = LiteGraph.getTime();
            const target = graph.getNodeById(link.target_id);
            if (!target) continue;
            if (target.mode === LiteGraph.NEVER) { this.drop(target, "mode", { message: `${target.type} ${target.id}: the node is NEVER; the event is not delivered` }); continue; }
            const input = target.inputs?.[link.target_slot];
            // one call id: the scope id (finding 3); a node run outside any scope keeps a unique id
            const call = { ...options };
            call.action_call ??= this._scope?.id ?? `${node.id}_act_${LiteGraph.uuidv4()}`;
            if (this.isRefreshInput(input) && target.mode !== LiteGraph.BYPASS) { this.refresh(target); continue; }
            if (target.mode === LiteGraph.BYPASS) {
                // a bypassed node is a wire: the event passes through now, in every model
                if (rules.refresh === "ancestors" || emitNow) this.pull(target);
                target.actionDo(input?.name, param, call, link.target_slot);
                continue;
            }
            const asTrigger = input?.name === "onTrigger" || (target.mode === LiteGraph.ON_TRIGGER && !target.onAction);
            if (asTrigger) {
                if (!target.onExecute) { this.drop(target, "no-handler", { message: `${target.type} ${target.id}: triggered but has no onExecute` }); continue; }
                if (rules.refresh === "ancestors" || emitNow) this.pull(target);
                target.doExecute(param, call);
            } else if (target.onAction) {
                const immediateInput = this.declarationOf(target)?.immediate_inputs?.includes(input.name);
                if (rules.delivery === "deferred" && target.onExecute && !emitNow && !immediateInput) {
                    target._waiting_actions ??= [];
                    target._waiting_actions.push([input.name, param, call, link.target_slot]);
                    if (target.graph.status !== target.graph.constructor.STATUS_RUNNING && !target._stopped_queue_reported) {
                        target._stopped_queue_reported = true;
                        this.drop(target, "stopped-queue", { message: `${target.type} ${target.id}: an action waits in the queue until the graph runs (graph.stop({dropQueued: true}) clears it)` });
                    }
                    continue;
                }
                if (rules.refresh === "ancestors" || emitNow) this.pull(target);
                target.actionDo(input.name, param, call, link.target_slot);
            } else {
                this.drop(target, "no-handler", { message: `${target.type} ${target.id}: input "${input?.name}" receives an event but the node has no onAction` });
            }
        }
    }

    /** guards an action or execution in non-legacy models; false when it must not run */
    static enter(node, kind, options, rules) {
        const graph = node.graph;
        if (kind === "execute") {
            if (graph.nodes_executing[node.id]) return this.drop(node, "reentry", { message: `${node.type} ${node.id}: executed again while it was executing` });
            if (rules.once_per_frame) {
                if (node._strict_frame === graph._frame && node._strict_graph_frame === graph) return this.drop(node, "once-per-frame", { message: `${node.type} ${node.id}: already executed in this frame (the "strict" model runs each node once per frame)` });
                node._strict_frame = graph._frame;
                node._strict_graph_frame = graph;
            }
        }
        if (this._depth >= this.maxEventDepth) {
            return this.drop(node, "max-depth", { setting: "LiteGraph.Execution.MaxEventDepth", message: `${node.type} ${node.id}: event chain deeper than ${this.maxEventDepth} (setting LiteGraph.Execution.MaxEventDepth)` });
        }
        return true;
    }

    // ---- subgraph boundaries -------------------------------------------------------------------

    /**
     * Delivers queued inner actions of a subgraph-like node's inner graph now (deferred models),
     * up to `LiteGraph.Execution.MaxEventPasses` passes; reaching the cap is reported.
     */
    static flushInner(owner, inner) {
        const max = this.maxEventPasses;
        for (let pass = 0; pass < max; pass++) {
            const waiting = inner._nodes.filter((n) => n._waiting_actions?.length);
            if (!waiting.length) return true;
            for (const n of waiting) n.executePendingActions();
        }
        if (inner._nodes.some((n) => n._waiting_actions?.length)) {
            this.drop(owner, "max-passes", { setting: "LiteGraph.Execution.MaxEventPasses", message: `${owner.type} ${owner.id}: inner events still queued after ${max} passes (setting LiteGraph.Execution.MaxEventPasses)` });
            return false;
        }
        return true;
    }

    /** an event entering a subgraph: fresh interface data first (inputs pushed, graph/input nodes updated) */
    static enterBoundary(owner) {
        const inner = owner.subgraph;
        if (!inner) return;
        owner._pushInputs?.();
        for (const node of inner._nodes) {
            if (node.type === "graph/input" && node.properties?.type !== LiteGraph.EVENT && node.properties?.type !== "action" && node.mode !== LiteGraph.NEVER) {
                node.onExecute?.();
            }
        }
    }

    // ---- bypass ------------------------------------------------------------------------------------

    /**
     * What a BYPASS node does instead of its own code: every data output takes the value of the
     * input it maps to (bypassSource), or undefined; with `events`, an event that reached the node
     * is forwarded to its connected event outputs.
     * @param {object} node
     * @param {{events?: boolean, param?: any, options?: object}} [run]
     */
    static passThrough(node, { events = false, param, options } = {}) {
        const outputs = node.outputs ?? [];
        for (let index = 0; index < outputs.length; index++) {
            if (this.isEventType(outputs[index].type)) continue;
            const source = this.bypassSource(node, index);
            node.setOutputData(index, source < 0 ? undefined : node.getInputData(source));
        }
        if (!events) return;
        for (let index = 0; index < outputs.length; index++) {
            if (this.isEventType(outputs[index].type) && outputs[index].links?.length) node.triggerSlot(index, param, null, { ...options });
        }
    }

    /**
     * The input a bypassed node passes to a data output: the input at the same index when its type
     * fits, otherwise the first data input whose type fits; -1 when none does.
     */
    static bypassSource(node, outputIndex) {
        const output = node.outputs?.[outputIndex];
        const inputs = node.inputs ?? [];
        if (!output) return -1;
        const fits = (input) => !!input && !this.isEventType(input.type) && LiteGraph.isValidConnection(input.type, output.type);
        if (fits(inputs[outputIndex])) return outputIndex;
        return inputs.findIndex(fits);
    }

    static isEventType(type) {
        return type === LiteGraph.EVENT || type === LiteGraph.ACTION;
    }

    // ---- node declarations (static def.execution) -------------------------------------------------

    /**
     * Normalizes a node type's execution declaration:
     * `{models: {<model>: false | {default_mode, modes}}, modes, default_mode, emit: "immediate", ticks, pure (true | "volatile"), volatile, branches, loop, immediate_inputs}`.
     * @returns {Readonly<object>|null}
     */
    static normalizeDeclaration(raw) {
        if (!raw || typeof raw !== "object") return null;
        const modes = (value) => Array.isArray(value) ? Object.freeze(value.filter((m) => Number.isInteger(m))) : undefined;
        const models = {};
        for (const [name, entry] of Object.entries(raw.models ?? {})) {
            models[name] = entry === false ? false : Object.freeze({ default_mode: entry?.default_mode, modes: modes(entry?.modes) });
        }
        return Object.freeze({
            models: Object.freeze(models),
            modes: modes(raw.modes),
            default_mode: Number.isInteger(raw.default_mode) ? raw.default_mode : undefined,
            emit: raw.emit === "immediate" ? "immediate" : undefined,
            ticks: !!raw.ticks,
            // pure: "volatile" (or volatile: true) reads time, randomness or outside state: memoized per call scope
            pure: !!raw.pure || !!raw.volatile,
            volatile: raw.pure === "volatile" || !!raw.volatile,
            branches: !!raw.branches,
            loop: !!raw.loop,
            immediate_inputs: Object.freeze(Array.isArray(raw.immediate_inputs) ? [...raw.immediate_inputs] : []),
        });
    }

    /** the execution declaration of a node or type (from its definition), or null */
    static declarationOf(nodeOrType) {
        const type = typeof nodeOrType === "string" ? nodeOrType : nodeOrType?.type;
        if (!type) return null;
        return LiteGraph.getNodeDefinition?.(type)?.execution ?? null;
    }

    static get allowAnyMode() { return !!this.setting("LiteGraph.Execution.AllowAnyMode", false); }

    /** the modes a node (or type) may use under a model; NEVER and BYPASS are always allowed */
    static validModes(nodeOrType, modelName) {
        const all = [LiteGraph.ALWAYS, LiteGraph.ON_EVENT, LiteGraph.NEVER, LiteGraph.ON_TRIGGER, LiteGraph.BYPASS, LiteGraph.ON_REQUEST];
        const decl = this.declarationOf(nodeOrType);
        if (!decl) return all;
        const per = decl.models?.[modelName];
        const modes = per === false ? [] : [...(per?.modes ?? decl.modes ?? all)];
        for (const mode of [LiteGraph.NEVER, LiteGraph.BYPASS]) if (!modes.includes(mode)) modes.push(mode);
        return modes;
    }

    /** true for modes in which the node's own code does not run (NEVER, BYPASS) */
    static isInactiveMode(mode) {
        return mode === LiteGraph.NEVER || mode === LiteGraph.BYPASS;
    }

    /** true when the node may use the mode under its graph's model (or LiteGraph.Execution.AllowAnyMode is on) */
    static isModeValid(node, mode, graph = node?.graph) {
        if (this.allowAnyMode) return true;
        return this.validModes(node, this.modelNameFor(graph)).includes(mode);
    }

    /** the refusal message for an invalid mode; names the setting that lifts it */
    static modeRefusal(node, mode, graph = node?.graph) {
        const model = this.modelNameFor(graph);
        const name = (m) => LiteGraph.NODE_MODES[m] ?? String(m);
        const valid = this.validModes(node, model).map(name).join(", ");
        return `${node?.type ?? "node"}: mode "${name(mode)}" is not valid for this node under the "${model}" execution model (valid: ${valid}); set LiteGraph.Execution.AllowAnyMode to allow any mode`;
    }

    /** the mode a newly added node of a declared type gets under a model, or null to keep its own */
    static declaredDefaultMode(node, rules) {
        if (!rules || rules.legacy) return null;
        const decl = this.declarationOf(node);
        if (!decl) return null;
        const per = decl.models?.[rules.name];
        if (per && per.default_mode != null) return per.default_mode;
        if (decl.pure && rules.refresh === "ancestors") return LiteGraph.ON_REQUEST;
        if (decl.default_mode != null) return decl.default_mode;
        return null;
    }

    /**
     * The mode each node would get under a model (for "Apply the model's node modes"). A volatile node
     * in ALWAYS mode keeps it: a new value every frame is a deliberate choice (new nodes start ON_REQUEST).
     */
    static modelModes(graph, rules = this.rulesFor(graph)) {
        const out = [];
        const visit = (g) => {
            for (const node of g._nodes) {
                const mode = this.declaredDefaultMode(node, rules);
                const keep = node.mode === LiteGraph.ALWAYS && this.declarationOf(node)?.volatile;
                if (mode != null && mode !== node.mode && !this.isInactiveMode(node.mode) && !keep) out.push({ node, mode });
                if (node.subgraph && node.subgraph !== g) visit(node.subgraph);
            }
        };
        visit(graph);
        return out;
    }

    // ---- diagnostics ---------------------------------------------------------------------------------

    /** the volatile ON_REQUEST node a data link comes from, through ON_REQUEST and BYPASS nodes, or null (FLW-14) */
    static volatileSource(graph, linkId, seen = new Set()) {
        const link = graph.links[linkId];
        const origin = link && graph.getNodeById(link.origin_id);
        if (!origin || seen.has(origin)) return null;
        seen.add(origin);
        if (origin.mode !== LiteGraph.ON_REQUEST && origin.mode !== LiteGraph.BYPASS) return null;
        if (origin.mode === LiteGraph.ON_REQUEST && this.declarationOf(origin)?.volatile) return origin;
        for (const input of origin.inputs ?? []) {
            if (input.link == null || this.isEventType(input.type)) continue;
            const found = this.volatileSource(graph, input.link, seen);
            if (found) return found;
        }
        return null;
    }

    /**
     * Checks a graph (and its subgraphs) against the model and the node declarations.
     * @returns {{model: string, issues: Array<{node, path, code, message}>}}
     */
    static check(graph) {
        const root = graph.rootGraph ?? graph;
        const model = this.modelNameFor(root);
        const issues = [];
        const add = (node, code, message) => issues.push({ node, path: node.getPath?.() ?? null, code, message });
        const hasEventOutput = (node) => (node.outputs ?? []).some((o) => o.type === LiteGraph.EVENT || o.type === LiteGraph.ACTION);
        const visit = (g, parentMode) => {
            for (const node of g._nodes) {
                const decl = this.declarationOf(node);
                if (!this.isInactiveMode(node.mode)) {
                    if (decl?.models?.[model] === false) add(node, "invalid-model", `${node.type}: not valid under the "${model}" execution model`);
                    else if (!this.validModes(node, model).includes(node.mode)) add(node, "invalid-mode", this.modeRefusal(node, node.mode, root));
                    if (decl?.ticks && (node.mode !== LiteGraph.ALWAYS || (parentMode != null && parentMode !== LiteGraph.ALWAYS))) {
                        add(node, "ticks-not-stepped", `${node.type}: needs the step loop (ALWAYS mode${parentMode != null ? ", in an ALWAYS subgraph node" : ""}); it keeps its events until stepped`);
                    }
                    if (node.mode === LiteGraph.ON_REQUEST && hasEventOutput(node) && node.outputs.some((o) => (o.type === LiteGraph.EVENT || o.type === LiteGraph.ACTION) && o.links?.length)) {
                        add(node, "on-request-emitter", `${node.type}: an event emitter in ON_REQUEST mode never fires (events are dropped while data is pulled)`);
                    }
                    if (decl?.loop && !node.outputs?.find((o) => o.name === "do")?.links?.length) {
                        add(node, "loop-without-body", `${node.type}: the loop body ("do" output) is not connected`);
                    }
                    // a volatile node in ALWAYS mode is a deliberate "new value every frame"
                    if (decl?.pure && !decl.volatile && model === "ancestors" && node.mode === LiteGraph.ALWAYS) {
                        add(node, "pure-always", `${node.type}: a pure node in ALWAYS mode runs every frame; ON_REQUEST runs it only when needed`);
                    }
                    if (decl?.loop) {
                        for (const input of node.inputs ?? []) {
                            if (input.link == null || this.isEventType(input.type)) continue;
                            const source = this.volatileSource(g, input.link);
                            if (source) add(node, "volatile-loop-input", `${node.type}: input "${input.name}" comes from the volatile ${source.type} ${source.id} (ON_REQUEST); the loop reads it once, a body that reads it again gets a new value in each iteration`);
                        }
                    }
                }
                if (node.subgraph && node.subgraph !== g) visit(node.subgraph, this.isInactiveMode(node.mode) ? LiteGraph.NEVER : (parentMode != null && parentMode !== LiteGraph.ALWAYS ? parentMode : node.mode));
            }
        };
        visit(root, null);
        return { model, issues };
    }
}

ExecutionEngine.registerModel("ancestors", {
    title: "Ancestors (pull)",
    description: "Events are delivered immediately; pure ON_REQUEST nodes run only when an action, a trigger or an ALWAYS node needs their data: again on new data, or once per call scope when volatile.",
    delivery: "immediate", refresh: "ancestors", frame_pull: true, exec_slots: true,
});
ExecutionEngine.registerModel("step", {
    title: "Step (deferred actions)",
    description: "Actions to nodes that execute wait for the node's turn in the next step.",
    delivery: "deferred",
});
ExecutionEngine.registerModel("strict", {
    title: "Strict (once per frame)",
    description: "Deferred actions; each node executes at most once per frame.",
    delivery: "deferred", once_per_frame: true,
});
ExecutionEngine.registerModel("event", {
    title: "Event (push)",
    description: "Events are delivered immediately, without refreshing data.",
    delivery: "immediate",
});
