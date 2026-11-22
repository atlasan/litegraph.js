import { LiteGraph } from "./litegraph.js";
// the legacy flags (LEGACY_EXECUTION_FLAGS) are defined with their accessors in litegraph.js

/**
 * Execution models and the execution engine (Wave 6, plan agents/plans/2026-11-22-events-execution.md).
 *
 * A model is a named set of rules, chosen per document in the root graph's `config.execution`:
 * - `ancestors` (default for new graphs): events are delivered immediately; before an action, a
 *   trigger or an ALWAYS node's turn in the step, the target's ON_REQUEST data ancestors are pulled,
 *   each at most once per frame or call unless one of its inputs has newer data;
 * - `step`: deferred delivery (today's core default);
 * - `strict`: deferred delivery, each node executes at most once per frame;
 * - `event`: immediate delivery, no refresh;
 * - `legacy`: documents saved without the field; the process-wide flags decide, exactly as before.
 *
 * The core methods (`triggerSlot`, `actionDo`, `doExecute`, `getInputData(force)`, `runStep`,
 * the subgraph boundaries) keep today's code for `legacy` and delegate to this engine otherwise.
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
});

export class ExecutionEngine {
    static models = new Map();
    static LEGACY = Object.freeze({ name: "legacy", legacy: true, title: "Legacy (global flags)" });

    /** a global data version, stamped on links by setOutputData */
    static _version = 0;
    /** the current external call (an event chain started outside a step) */
    static _call = null;
    static _callCount = 0;
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

    /** the frame and call a run belongs to */
    static context(graph) {
        return { frame: graph?._stepping ? graph._frame : null, call: this._call };
    }

    static isFresh(node, ctx = this.context(node.graph)) {
        const memo = node._exec_memo;
        if (!memo) return false;
        const current = (ctx.frame != null && memo.frame === ctx.frame) || (ctx.call != null && memo.call === ctx.call);
        return current && this.inputStamp(node) <= memo.stamp;
    }

    static remember(node, ctx = this.context(node.graph)) {
        node._exec_memo = { frame: ctx.frame, call: ctx.call, stamp: this.inputStamp(node) };
    }

    // ---- pull ------------------------------------------------------------------------------------

    /** the ON_REQUEST nodes feeding a node's data inputs (direct origins) */
    static requestOrigins(node) {
        const graph = node.graph;
        const origins = [];
        for (const input of node.inputs ?? []) {
            if (input.link == null || input.type === LiteGraph.ACTION || input.type === LiteGraph.EVENT) continue;
            const link = graph.links[input.link];
            const origin = link && graph.getNodeById(link.origin_id);
            if (origin && origin.mode === LiteGraph.ON_REQUEST && !origins.includes(origin)) origins.push(origin);
        }
        return origins;
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
        const ctx = this.context(node.graph);
        if (this.isFresh(node, ctx)) return;
        this._pulling++;
        try {
            node.doExecute(undefined, { action_call: ctx.call ?? `frame_${ctx.frame}` });
        } finally {
            this._pulling--;
        }
        this.remember(node, ctx);
    }

    // ---- delivery --------------------------------------------------------------------------------

    /** sends an event from an output to its links (non-legacy models) */
    static triggerSlot(node, slot, param, link_id, options, rules) {
        const graph = node.graph;
        const output = node.outputs[slot];
        if (this._pulling > 0) return this.drop(node, "refreshing", { message: `${node.type} ${node.id}: an event fired while its data was pulled is dropped (event emitters cannot be ON_REQUEST)` });
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
            const call = { ...options };
            const asTrigger = input?.name === "onTrigger" || (target.mode === LiteGraph.ON_TRIGGER && !target.onAction);
            if (asTrigger) {
                call.action_call ??= `${node.id}_trigg_${LiteGraph.uuidv4()}`;
                if (!target.onExecute) { this.drop(target, "no-handler", { message: `${target.type} ${target.id}: triggered but has no onExecute` }); continue; }
                if (rules.refresh === "ancestors") this.pull(target);
                target.doExecute(param, call);
            } else if (target.onAction) {
                call.action_call ??= `${node.id}_act_${LiteGraph.uuidv4()}`;
                if (rules.delivery === "deferred" && target.onExecute) {
                    target._waiting_actions ??= [];
                    target._waiting_actions.push([input.name, param, call, link.target_slot]);
                    if (target.graph.status !== target.graph.constructor.STATUS_RUNNING && !target._stopped_queue_reported) {
                        target._stopped_queue_reported = true;
                        this.drop(target, "stopped-queue", { message: `${target.type} ${target.id}: an action waits in the queue until the graph runs (graph.stop({dropQueued: true}) clears it)` });
                    }
                    continue;
                }
                if (rules.refresh === "ancestors") this.pull(target);
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

    // ---- model changes ----------------------------------------------------------------------------

    /** the mode a new node of an undeclared type gets under a model */
    static defaultModeFor(rules) {
        return rules?.legacy ? null : rules?.default_mode ?? LiteGraph.ALWAYS;
    }
}

ExecutionEngine.registerModel("ancestors", {
    title: "Ancestors (pull)",
    description: "Events are delivered immediately; pure ON_REQUEST nodes run only when an action, a trigger or an ALWAYS node needs their data, once per frame or call.",
    delivery: "immediate", refresh: "ancestors", frame_pull: true,
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
