import { LiteGraph } from "./litegraph.js";

/**
 * The execution-state protocol (Wave 4b, decision W4-4): one message shape for the in-page loop
 * and the headless runner, keyed by node path (`node.getPath()`, "3:7:2" inside subgraphs).
 *
 * ```js
 * { v: 1, kind: "status" | "progress" | "error" | "reset", path: "3:7" | null,
 *   status: "queued" | "running" | "done" | "error" | "skipped", value?, max?, message?, time }
 * ```
 *
 * - `status`: a node's state changed (sent once per change, not every step).
 * - `progress`: `value` of `max` (a node reporting its own progress, e.g. a long job).
 * - `error`: the node failed; `message` says why.
 * - `reset`: clear the state of the node at `path`, or of every node when `path` is null.
 *
 * Messages carry paths, statuses and messages, never data values. The root graph emits each one
 * as the event `execution-state`; `graph.applyExecutionState(message)` applies one received from
 * elsewhere (the runner), so the editor draws the same overlays either way.
 */
export class ExecutionState {

    static VERSION = 1;
    static KINDS = Object.freeze(["status", "progress", "error", "reset"]);
    static STATUSES = Object.freeze(["queued", "running", "done", "error", "skipped"]);

    /**
     * Builds a message.
     * @param {string} kind
     * @param {string|null} path
     * @param {{status?: string, value?: number, max?: number, message?: string, time?: number}} [fields]
     * @returns {object}
     */
    static create(kind, path, fields = {}) {
        if (!ExecutionState.KINDS.includes(kind)) throw new TypeError(`execution state: unknown kind ${kind}`);
        const message = { v: ExecutionState.VERSION, kind, path: path === undefined || path === null ? null : String(path) };
        const status = fields.status ?? (kind === "error" ? "error" : kind === "progress" ? "running" : undefined);
        if (status !== undefined) {
            if (!ExecutionState.STATUSES.includes(status)) throw new TypeError(`execution state: unknown status ${status}`);
            message.status = status;
        }
        if (Number.isFinite(fields.value)) message.value = fields.value;
        if (Number.isFinite(fields.max)) message.max = fields.max;
        if (fields.message !== undefined && fields.message !== null) message.message = String(fields.message).slice(0, 2000);
        message.time = Number.isFinite(fields.time) ? fields.time : Date.now();
        return message;
    }

    /** true when `message` has the protocol's shape (a version this runtime reads) */
    static isMessage(message) {
        return !!message && typeof message === "object" && message.v === ExecutionState.VERSION
            && ExecutionState.KINDS.includes(message.kind)
            && (message.path === null || typeof message.path === "string");
    }

    /**
     * Applies a message to a graph: sets or clears `node.execution_state` on the node at its path
     * (resolved from the root graph), or on every node for a `reset` without a path.
     * @returns {object|null} the node changed, the root graph for a full reset, or null
     */
    static apply(graph, message) {
        if (!ExecutionState.isMessage(message)) return null;
        const root = graph?.rootGraph ?? graph;
        if (!root) return null;
        if (message.kind === "reset" && message.path === null) {
            ExecutionState.clear(root);
            root.setDirtyCanvas?.(true, false);
            return root;
        }
        const node = message.path === null ? null : root.resolvePath?.(message.path);
        if (!node) return null;
        ExecutionState.applyToNode(node, message);
        return node;
    }

    /** Applies a message to a known node (its path is not resolved). */
    static applyToNode(node, message) {
        if (message.kind === "reset") {
            delete node.execution_state;
        } else {
            const previous = node.execution_state ?? {};
            const state = { status: message.status ?? previous.status ?? "running", time: message.time };
            if (message.kind === "progress") {
                state.value = message.value;
                state.max = message.max;
            } else if (message.status === "running" && previous.max !== undefined) {
                state.value = previous.value;
                state.max = previous.max;
            }
            if (message.message !== undefined) state.message = message.message;
            node.execution_state = state;
        }
        node.graph?.setDirtyCanvas?.(true, false);
        return node;
    }

    /** removes `execution_state` from every node of a graph and its subgraphs */
    static clear(graph, depth = 0) {
        if (!graph || depth > (LiteGraph.subgraph_max_depth ?? 32)) return;
        for (const node of graph._nodes ?? []) {
            delete node.execution_state;
            if (node.subgraph) ExecutionState.clear(node.subgraph, depth + 1);
        }
    }
}
