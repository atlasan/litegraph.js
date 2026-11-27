import { LiteGraph } from "./litegraph.js";

/**
 * Validated loader for untrusted graphs: a pure pass over a serialized graph, run before any node
 * is constructed (idea X-04). `LiteGraph.validateGraphData(data, options)` is the entry point.
 *
 * - Bounds: node, link, group and definition counts, subgraph nesting, value nesting, string,
 *   properties and document sizes, finite and bounded coordinates. Limits are the settings
 *   `LiteGraph.Loader.*` (defaults in `GraphLoader.DEFAULT_LIMITS`); `options.limits` overrides.
 * - Runtime-only fields are dropped with a warning: keys starting with `_`, `__proto__`,
 *   `constructor` and `prototype` (at any depth), members of the graph and node class prototypes,
 *   `on[A-Z]…` callbacks and known runtime fields. Other unknown keys are kept for round trips.
 * - Malformed links (bad entries, duplicate ids) are errors; links naming unknown nodes or slots
 *   past the stored slots, and slot references to missing links, are warnings (configure() keeps
 *   them inert). `repair: true` removes all of them and the slot references to them, resets
 *   malformed slot data and clamps bad coordinates. Bounds and refused types are never repaired.
 * - `allowType(type, {path, node})` is asked about every node type (not about instances of a
 *   subgraph definition; the definition's own nodes are asked about). `false` or a string refuses.
 *
 * The input is never changed: the result's `data` is a cleaned deep copy, or `null` when not ok.
 */

const DEFAULT_LIMITS = Object.freeze({
    maxNodes: 10000,
    maxLinks: 50000,
    maxGroups: 2000,
    maxDefinitions: 1000,
    maxDepth: 32,
    maxValueDepth: 64,
    maxStringLength: 1048576,
    maxPropertiesSize: 4194304,
    maxDocumentSize: 67108864,
    maxCoordinate: 10000000,
});

/** limit -> [setting id, setting name] */
const LIMIT_SETTINGS = Object.freeze({
    maxNodes: ["LiteGraph.Loader.MaxNodes", "Most nodes in an opened or pushed document"],
    maxLinks: ["LiteGraph.Loader.MaxLinks", "Most links in an opened or pushed document"],
    maxGroups: ["LiteGraph.Loader.MaxGroups", "Most groups in an opened or pushed document"],
    maxDefinitions: ["LiteGraph.Loader.MaxDefinitions", "Most subgraph definitions in an opened or pushed document"],
    maxDepth: ["LiteGraph.Loader.MaxDepth", "Deepest nesting of subgraphs and definitions in an opened document"],
    maxValueDepth: ["LiteGraph.Loader.MaxValueDepth", "Deepest nesting of objects and arrays in a stored value"],
    maxStringLength: ["LiteGraph.Loader.MaxStringLength", "Longest string in an opened document (characters)"],
    maxPropertiesSize: ["LiteGraph.Loader.MaxPropertiesSize", "Largest properties of one node in an opened document (approximate JSON characters)"],
    maxDocumentSize: ["LiteGraph.Loader.MaxDocumentSize", "Largest opened document (approximate JSON characters)"],
    maxCoordinate: ["LiteGraph.Loader.MaxCoordinate", "Largest absolute coordinate in an opened document"],
});

const PROTO_KEYS = new Set(["__proto__", "constructor", "prototype"]);
/** graph keys the loader reads as document structure (never dropped) */
const GRAPH_KEYS = new Set(["id", "revision", "state", "last_node_id", "last_link_id", "links", "config", "extra", "version",
    "litegraph_version", "litegraph_modes", "nodes", "groups", "reroutes", "floatingLinks", "definitions"]);
/** extra keys of a subgraph definition (ComfyUI form): its interface and IO nodes */
const DEFINITION_KEYS = new Set(["name", "description", "category", "inputs", "outputs", "inputNode", "outputNode", "widgets", "widgets_meta"]);
/** runtime fields of a graph instance that a document must not set */
const GRAPH_RUNTIME = new Set(["list_of_graphcanvas", "status", "subgraphs", "rootGraph", "floating_links", "iteration", "vars",
    "globaltime", "runningtime", "fixedtime", "fixedtime_lapse", "elapsed_time", "last_update_time", "starttime", "catch_errors",
    "history", "nodes_executing", "nodes_actioning", "node_ancestorsCalculated", "nodes_executedAction", "inputs", "outputs",
    "ancestorsCall", "initialization_error", "events", "savedVersion", "execution_timer_id", "errors_in_execution",
    "execution_time", "supported_types", "filter", "config_defaults"]);
/** node keys the loader reads as document structure (never dropped) */
const NODE_KEYS = new Set(["id", "type", "pos", "size", "flags", "order", "mode", "inputs", "outputs", "title", "properties",
    "widgets_values", "color", "bgcolor", "boxcolor", "shape", "subgraph"]);
/** runtime fields of a node instance that a document must not set */
const NODE_RUNTIME = new Set(["graph", "widgets", "widget", "widgets_up", "connections", "ready", "initialization_state",
    "initialization_error", "wrong_environment", "loading_lib", "libraries", "requiredLibraries", "executionEnvironment",
    "properties_info", "last_serialization", "has_errors", "execution_state", "exec_version", "action_call",
    "execute_triggered", "action_triggered", "is_selected", "mouseOver", "console", "subgraph_node"]);
/** virtual IO node ids of subgraph definitions (ComfyUI form) */
const VIRTUAL_NODES = new Set(["-10", "-20"]);
const MAX_ISSUES = 500;

const ABORT = Symbol("graph loader abort");
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const keyPath = (path, key) => (IDENTIFIER.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`);
const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value);
const isId = (value) => (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.length > 0);
const isSlotIndex = (value) => Number.isInteger(value) && value >= 0;

/** reads a setting, without failing when there is no registry or no such setting */
function settingValue(id) {
    try {
        const settings = LiteGraph.settings;
        return settings?.has?.(id) ? settings.get(id) : undefined;
    } catch {
        return undefined;
    }
}

class Validation {
    constructor(options) {
        this.repair = !!options.repair;
        this.limits = { ...GraphLoader.limits(), ...(options.limits ?? {}) };
        this.allowType = typeof options.allowType === "function" ? options.allowType : null;
        this.issues = [];
        this.errors = 0;
        this.suppressed = 0;
        this.repaired = false;
        this.size = 0;
        this.counts = { nodes: 0, links: 0, groups: 0, definitions: 0, depth: 0 };
        this.definitionIds = new Set();
        this.stack = new Set(); // values being copied, for cycle detection
    }

    issue(severity, code, path, message, extra = {}) {
        if (severity === "error") this.errors++;
        if (this.issues.length >= MAX_ISSUES) {
            this.suppressed++;
            return;
        }
        this.issues.push({ severity, code, path, message, ...extra });
    }

    error(code, path, message, extra) {
        this.issue("error", code, path, message, extra);
    }

    warn(code, path, message, extra) {
        this.issue("warning", code, path, message, extra);
    }

    /** a problem repair mode fixes: a warning when repairing (returns true), else an error */
    fixable(code, path, message, extra) {
        if (this.repair) {
            this.repaired = true;
            this.warn(code, path, `${message} (repaired)`, extra);
            return true;
        }
        this.error(code, path, message, extra);
        return false;
    }

    /** a problem that is only reported in strict mode and removed in repair mode (returns true) */
    removable(code, path, message, extra) {
        if (this.repair) this.repaired = true;
        this.warn(code, path, this.repair ? `${message} (removed)` : message, extra);
        return this.repair;
    }

    drop(path, why, extra) {
        this.warn("dropped-field", path, `dropped ${why}`, extra);
    }

    grow(amount) {
        this.size += amount;
        if (this.size > this.limits.maxDocumentSize) {
            this.error("document-too-large", "$", `the document is larger than ${this.limits.maxDocumentSize} characters (LiteGraph.Loader.MaxDocumentSize)`, { limit: this.limits.maxDocumentSize });
            throw ABORT;
        }
    }

    checkString(value, path, extra) {
        if (value.length > this.limits.maxStringLength) {
            this.error("string-too-long", path, `a string of ${value.length} characters, more than ${this.limits.maxStringLength} (LiteGraph.Loader.MaxStringLength)`, { limit: this.limits.maxStringLength, value: value.length, ...extra });
            return false;
        }
        return true;
    }

    // ---- pre-pass: counts and nesting, before copying anything ----

    count(graph, path, depth, seen) {
        if (!isPlainObject(graph) || seen.has(graph)) return;
        seen.add(graph);
        const { limits, counts } = this;
        if (depth > counts.depth) counts.depth = depth;
        if (depth > limits.maxDepth) {
            this.error("too-deep", path, `subgraphs nested ${depth} deep, more than ${limits.maxDepth} (LiteGraph.Loader.MaxDepth)`, { limit: limits.maxDepth, value: depth });
            return;
        }
        if (Array.isArray(graph.nodes)) counts.nodes += graph.nodes.length;
        if (Array.isArray(graph.links)) counts.links += graph.links.length;
        if (Array.isArray(graph.groups)) counts.groups += graph.groups.length;
        const definitions = graph.definitions?.subgraphs;
        if (Array.isArray(definitions)) {
            counts.definitions += definitions.length;
            definitions.forEach((definition, i) => {
                if (isPlainObject(definition) && typeof definition.id === "string") this.definitionIds.add(definition.id);
                this.count(definition, `${path}.definitions.subgraphs[${i}]`, depth + 1, seen);
            });
        }
        if (Array.isArray(graph.nodes)) {
            graph.nodes.forEach((node, i) => {
                if (isPlainObject(node) && isPlainObject(node.subgraph)) this.count(node.subgraph, `${path}.nodes[${i}].subgraph`, depth + 1, seen);
            });
        }
    }

    checkCounts() {
        const { limits, counts } = this;
        const check = (key, limitKey, what) => {
            if (counts[key] > limits[limitKey]) {
                this.error(`too-many-${key}`, "$", `${counts[key]} ${what}, more than ${limits[limitKey]} (${LIMIT_SETTINGS[limitKey][0]})`, { limit: limits[limitKey], value: counts[key] });
            }
        };
        check("nodes", "maxNodes", "nodes");
        check("links", "maxLinks", "links");
        check("groups", "maxGroups", "groups");
        check("definitions", "maxDefinitions", "subgraph definitions");
    }

    // ---- values ----

    /**
     * A cleaned deep copy of a JSON value. Returns `undefined` for a value to leave out.
     * @param {*} value
     * @param {string} path
     * @param {number} depth nesting inside the current value
     * @param {object} [extra] fields added to issues (e.g. the node id)
     */
    value(value, path, depth = 0, extra = {}) {
        switch (typeof value) {
            case "string":
                this.grow(value.length + 2);
                return this.checkString(value, path, extra) ? value : undefined;
            case "number":
                this.grow(Number.isFinite(value) ? String(value).length + 1 : 5);
                return value;
            case "boolean":
                this.grow(5);
                return value;
            case "undefined":
                return undefined;
            case "object":
                break;
            default: // function, symbol, bigint
                if (this.fixable("non-json-value", path, `a ${typeof value} is not a JSON value`, extra)) return undefined;
                return undefined;
        }
        if (value === null) {
            this.grow(5);
            return null;
        }
        if (depth >= this.limits.maxValueDepth) {
            this.error("value-too-deep", path, `a value nested more than ${this.limits.maxValueDepth} deep (LiteGraph.Loader.MaxValueDepth)`, { limit: this.limits.maxValueDepth, ...extra });
            return undefined;
        }
        if (this.stack.has(value)) {
            this.error("cycle", path, "a value contains itself", extra);
            return undefined;
        }
        if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
            return Array.from(value, (item, i) => this.value(item, `${path}[${i}]`, depth + 1, extra));
        }
        if (typeof value.toJSON === "function" && !Array.isArray(value)) {
            return this.value(value.toJSON(), path, depth, extra);
        }
        this.stack.add(value);
        try {
            if (Array.isArray(value)) {
                this.grow(2);
                const out = [];
                for (let i = 0; i < value.length; i++) {
                    const item = this.value(value[i], `${path}[${i}]`, depth + 1, extra);
                    out.push(item === undefined ? null : item);
                }
                return out;
            }
            this.grow(2);
            const out = {};
            for (const key of Object.keys(value)) {
                const at = keyPath(path, key);
                if (PROTO_KEYS.has(key)) {
                    this.drop(at, `the prototype key ${key}`, extra);
                    continue;
                }
                this.grow(key.length + 3);
                if (!this.checkString(key, at, extra)) continue;
                const item = this.value(value[key], at, depth + 1, extra);
                if (item !== undefined) out[key] = item;
            }
            return out;
        } finally {
            this.stack.delete(value);
        }
    }

    /** a cleaned copy of a coordinate tuple of `length` numbers; undefined to leave it out */
    coordinates(value, length, path, extra = {}) {
        const max = this.limits.maxCoordinate;
        let items = null;
        if (Array.isArray(value) || (ArrayBuffer.isView(value) && !(value instanceof DataView))) items = Array.from(value);
        else if (isPlainObject(value) && Object.keys(value).every((key) => /^\d+$/.test(key))) items = Object.keys(value).sort((a, b) => a - b).map((key) => value[key]);
        if (!items || items.length < length) {
            this.fixable("bad-coordinate", path, `expected ${length} numbers`, extra);
            return undefined;
        }
        const out = [];
        for (let i = 0; i < length; i++) {
            let item = items[i];
            if (typeof item !== "number" || !Number.isFinite(item) || Math.abs(item) > max) {
                const shown = typeof item === "number" ? String(item) : typeof item;
                if (!this.fixable("bad-coordinate", `${path}[${i}]`, `${shown} is not a finite number within ±${max} (LiteGraph.Loader.MaxCoordinate)`, { limit: max, ...extra })) {
                    out.push(0);
                    continue;
                }
                item = typeof item === "number" && !Number.isNaN(item) ? Math.sign(item) * Math.min(Math.abs(item), max) : 0;
            }
            this.grow(String(item).length + 1);
            out.push(item);
        }
        return out;
    }

    // ---- graphs ----

    /**
     * @param {object} graph serialized graph (root, inline subgraph or definition)
     * @param {string} path
     * @param {"root"|"inline"|"definition"} kind
     */
    graph(graph, path, kind) {
        if (!isPlainObject(graph)) {
            this.error("bad-document", path, kind === "root" ? "a graph document must be an object" : "a subgraph must be an object");
            return undefined;
        }
        const out = {};
        for (const key of Object.keys(graph)) {
            const at = keyPath(path, key);
            if (GRAPH_KEYS.has(key) || (kind === "definition" && DEFINITION_KEYS.has(key))) continue;
            if (PROTO_KEYS.has(key)) this.drop(at, `the prototype key ${key}`);
            else if (key.startsWith("_")) this.drop(at, `the runtime field ${key}`);
            else if (GRAPH_RUNTIME.has(key) || key in (LiteGraph.LGraph?.prototype ?? Object.prototype)) this.drop(at, `the graph member ${key}`);
            else {
                this.grow(key.length + 3);
                if (!this.checkString(key, at)) continue;
                const item = this.value(graph[key], at);
                if (item !== undefined) out[key] = item; // another editor's field: kept for round trips
            }
        }
        for (const key of ["id", "revision", "state", "last_node_id", "last_link_id", "config", "extra", "version", "litegraph_version", "litegraph_modes", "floatingLinks"]) {
            if (graph[key] === undefined) continue;
            const item = this.value(graph[key], keyPath(path, key));
            if (item !== undefined) out[key] = item;
        }
        if (kind === "definition") {
            for (const key of DEFINITION_KEYS) {
                if (graph[key] === undefined) continue;
                if ((key === "inputNode" || key === "outputNode") && isPlainObject(graph[key])) {
                    out[key] = this.ioNode(graph[key], keyPath(path, key));
                    continue;
                }
                const item = this.value(graph[key], keyPath(path, key));
                if (item !== undefined) out[key] = item;
            }
        }

        // nodes
        const nodes = new Map(); // String(id) -> {inputs, outputs} (stored slot counts, or null)
        if (graph.nodes !== undefined && graph.nodes !== null) {
            if (!Array.isArray(graph.nodes)) {
                this.error("bad-nodes", `${path}.nodes`, "nodes must be an array");
            } else {
                out.nodes = [];
                graph.nodes.forEach((node, i) => {
                    const clean = this.node(node, `${path}.nodes[${i}]`, nodes);
                    if (clean !== undefined) out.nodes.push(clean);
                });
            }
        }

        // links
        const removed = new Set(); // link ids removed by repair
        const valid = new Set(); // link ids in the table
        if (graph.links !== undefined && graph.links !== null) {
            if (!Array.isArray(graph.links)) {
                this.error("bad-links", `${path}.links`, "links must be an array");
            } else {
                out.links = [];
                graph.links.forEach((link, i) => {
                    const clean = this.link(link, `${path}.links[${i}]`, nodes, kind, valid, removed);
                    if (clean !== undefined) out.links.push(clean);
                });
            }
        }
        if (out.nodes) this.slotReferences(out.nodes, `${path}.nodes`, valid, removed, !!out.links || graph.links === null || graph.links === undefined);

        // groups and reroutes
        if (graph.groups !== undefined && graph.groups !== null) {
            if (!Array.isArray(graph.groups)) {
                this.error("bad-groups", `${path}.groups`, "groups must be an array");
            } else {
                out.groups = [];
                graph.groups.forEach((group, i) => {
                    const at = `${path}.groups[${i}]`;
                    if (!isPlainObject(group)) {
                        if (!this.fixable("bad-group", at, "a group must be an object")) out.groups.push(null);
                        return;
                    }
                    const clean = this.value({ ...group, bounding: undefined }, at);
                    if (group.bounding !== undefined) {
                        const bounding = this.coordinates(group.bounding, 4, `${at}.bounding`);
                        if (bounding) clean.bounding = bounding;
                    }
                    out.groups.push(clean);
                });
            }
        }
        if (graph.reroutes !== undefined) {
            if (!Array.isArray(graph.reroutes)) {
                const item = this.value(graph.reroutes, `${path}.reroutes`);
                if (item !== undefined) out.reroutes = item;
            } else {
                out.reroutes = graph.reroutes.map((reroute, i) => {
                    const at = `${path}.reroutes[${i}]`;
                    if (!isPlainObject(reroute)) return this.value(reroute, at) ?? null;
                    const clean = this.value({ ...reroute, pos: undefined }, at);
                    if (reroute.pos !== undefined) {
                        const pos = this.coordinates(reroute.pos, 2, `${at}.pos`);
                        if (pos) clean.pos = pos;
                    }
                    return clean;
                });
            }
        }

        // subgraph definitions (nested blocks included)
        if (graph.definitions !== undefined) {
            const at = `${path}.definitions`;
            if (!isPlainObject(graph.definitions)) {
                this.error("bad-definitions", at, "definitions must be an object");
            } else {
                const { subgraphs, ...rest } = graph.definitions;
                const clean = this.value(rest, at) ?? {};
                if (subgraphs !== undefined) {
                    if (!Array.isArray(subgraphs)) this.error("bad-definitions", `${at}.subgraphs`, "definitions.subgraphs must be an array");
                    else clean.subgraphs = subgraphs.map((definition, i) => this.graph(definition, `${at}.subgraphs[${i}]`, "definition") ?? null);
                }
                out.definitions = clean;
            }
        }
        return out;
    }

    ioNode(io, path) {
        const clean = this.value({ ...io, bounding: undefined }, path) ?? {};
        if (io.bounding !== undefined) {
            const bounding = this.coordinates(io.bounding, 4, `${path}.bounding`);
            if (bounding) clean.bounding = bounding;
        }
        return clean;
    }

    node(node, path, nodes) {
        if (!isPlainObject(node)) {
            this.error("bad-node", path, "a node must be an object");
            return undefined;
        }
        if (!isId(node.id)) {
            this.error("bad-node", `${path}.id`, "a node needs an id (a number or a non-empty string)");
            return undefined;
        }
        const extra = { node: node.id };
        const key = String(node.id);
        if (nodes.has(key)) {
            this.error("duplicate-node-id", `${path}.id`, `node id ${node.id} is used more than once`, extra);
            return undefined;
        }
        if (typeof node.type !== "string" || !node.type) {
            this.error("bad-node-type", `${path}.type`, "a node needs a type (a non-empty string)", extra);
            return undefined;
        }
        const out = {};
        out.id = this.value(node.id, `${path}.id`, 0, extra);
        out.type = this.value(node.type, `${path}.type`, 0, extra);
        if (out.type === undefined) return undefined;

        // the type policy (instances of a definition: their definition's nodes are asked about)
        if (this.allowType && !this.definitionIds.has(node.type)) {
            let verdict;
            try {
                verdict = this.allowType(node.type, { path, node: node.id });
            } catch (error) {
                verdict = error?.message ?? String(error);
            }
            if (verdict !== true && verdict !== undefined && verdict !== null) {
                const reason = typeof verdict === "string" ? `: ${verdict}` : " is not allowed";
                this.error("type-refused", `${path}.type`, `node type ${node.type}${reason}`, extra);
            }
        }

        const classProto = LiteGraph.registered_node_types?.[node.type]?.prototype;
        const baseProto = LiteGraph.LGraphNode?.prototype;
        const slots = { inputs: null, outputs: null };
        for (const name of Object.keys(node)) {
            if (name === "id" || name === "type") continue;
            const at = keyPath(path, name);
            const value = node[name];
            if (!NODE_KEYS.has(name)) {
                if (PROTO_KEYS.has(name)) { this.drop(at, `the prototype key ${name}`, extra); continue; }
                if (name.startsWith("_")) { this.drop(at, `the runtime field ${name}`, extra); continue; }
                if (/^on[A-Z]/.test(name)) { this.drop(at, `the callback ${name}`, extra); continue; }
                if (NODE_RUNTIME.has(name) || (classProto && name in classProto) || (baseProto && name in baseProto)) {
                    this.drop(at, `the node member ${name}`, extra);
                    continue;
                }
                this.grow(name.length + 3);
                if (!this.checkString(name, at, extra)) continue;
            }
            let clean;
            switch (name) {
                case "pos":
                case "size":
                    clean = this.coordinates(value, 2, at, extra);
                    break;
                case "inputs":
                case "outputs":
                    clean = this.slots(value, at, name, extra);
                    if (Array.isArray(clean)) slots[name] = clean.length;
                    break;
                case "properties":
                case "widgets_values": {
                    const before = this.size;
                    clean = this.value(value, at, 0, extra);
                    const size = this.size - before;
                    if (size > this.limits.maxPropertiesSize) {
                        this.error("properties-too-large", at, `${size} characters, more than ${this.limits.maxPropertiesSize} (LiteGraph.Loader.MaxPropertiesSize)`, { limit: this.limits.maxPropertiesSize, value: size, ...extra });
                    }
                    break;
                }
                case "subgraph":
                    clean = isPlainObject(value) ? this.graph(value, at, "inline") : this.value(value, at, 0, extra);
                    break;
                default:
                    clean = this.value(value, at, 0, extra);
            }
            if (clean !== undefined) out[name] = clean;
        }
        nodes.set(key, slots);
        return out;
    }

    /** a node's inputs or outputs: an array of slot objects with link / links references */
    slots(value, path, kind, extra) {
        if (value === null || value === undefined) return value;
        if (!Array.isArray(value)) {
            this.fixable("bad-slots", path, `${kind} must be an array`, extra);
            return undefined;
        }
        return value.map((slot, i) => {
            const at = `${path}[${i}]`;
            if (!isPlainObject(slot)) {
                this.fixable("bad-slots", at, "a slot must be an object", extra);
                return { name: "" };
            }
            const clean = this.value(slot, at, 0, extra) ?? {};
            if (kind === "inputs" && clean.link !== undefined && clean.link !== null && !isId(clean.link)) {
                if (this.fixable("bad-slots", `${at}.link`, "an input's link must be a link id or null", extra)) clean.link = null;
            }
            if (kind === "outputs" && clean.links !== undefined && clean.links !== null && (!Array.isArray(clean.links) || !clean.links.every(isId))) {
                if (this.fixable("bad-slots", `${at}.links`, "an output's links must be an array of link ids or null", extra)) clean.links = null;
            }
            return clean;
        });
    }

    link(link, path, nodes, kind, valid, removed) {
        let entry = null;
        if (Array.isArray(link) && link.length >= 5) {
            entry = { id: link[0], origin_id: link[1], origin_slot: link[2], target_id: link[3], target_slot: link[4] };
        } else if (isPlainObject(link)) {
            entry = link;
        }
        const problem = !entry ? "a link must be [id, origin, slot, target, slot, type] or an object"
            : !isId(entry.id) ? "a link needs an id"
            : !isId(entry.origin_id) || !isId(entry.target_id) ? "a link needs origin and target node ids"
            : !isSlotIndex(entry.origin_slot) || !isSlotIndex(entry.target_slot) ? "link slots must be whole numbers from 0"
            : null;
        if (problem) {
            if (entry && isId(entry.id)) removed.add(String(entry.id));
            this.fixable("bad-link", path, problem);
            return undefined;
        }
        const id = String(entry.id);
        const extra = { link: entry.id };
        if (valid.has(id)) {
            this.fixable("duplicate-link-id", path, `link id ${entry.id} is used more than once`, extra);
            return undefined;
        }
        const virtual = (nodeId) => kind === "definition" && VIRTUAL_NODES.has(String(nodeId));
        const origin = nodes.get(String(entry.origin_id));
        const target = nodes.get(String(entry.target_id));
        const missing = !origin && !virtual(entry.origin_id) ? entry.origin_id : !target && !virtual(entry.target_id) ? entry.target_id : null;
        // a link to nothing is reported, not refused: configure() keeps it inert and validateLinks()
        // clears it; repair removes it
        if (missing !== null && this.removable("dangling-link", path, `link ${entry.id} names node ${missing}, which is not in this graph`, extra)) {
            removed.add(id);
            return undefined;
        }
        const badSlot = (origin && origin.outputs !== null && entry.origin_slot >= origin.outputs) ? `output ${entry.origin_slot} of node ${entry.origin_id}`
            : (target && target.inputs !== null && entry.target_slot >= target.inputs) ? `input ${entry.target_slot} of node ${entry.target_id}` : null;
        if (missing === null && badSlot && this.removable("bad-slot-reference", path, `link ${entry.id} uses ${badSlot}, which the node does not have`, extra)) {
            removed.add(id);
            return undefined;
        }
        const clean = this.value(link, path, 0, extra);
        if (clean === undefined) return undefined;
        valid.add(id);
        return clean;
    }

    /** input `link` and output `links` entries naming links that are not in the table */
    slotReferences(nodes, path, valid, removed, checked) {
        if (!checked) return; // the link table itself was refused
        nodes.forEach((node, n) => {
            const extra = { node: node.id };
            node.inputs?.forEach?.((input, i) => {
                if (!input || input.link === null || input.link === undefined) return;
                const id = String(input.link);
                if (valid.has(id)) return;
                if (removed.has(id) && this.repair) { input.link = null; return; }
                if (removed.has(id)) return; // reported with the link
                this.warn("missing-link", `${path}[${n}].inputs[${i}].link`, `link ${input.link} is not in the link table${this.repair ? " (cleared)" : ""}`, extra);
                if (this.repair) { input.link = null; this.repaired = true; }
            });
            node.outputs?.forEach?.((output, o) => {
                if (!output || !Array.isArray(output.links)) return;
                const kept = output.links.filter((linkId) => {
                    const id = String(linkId);
                    if (valid.has(id)) return true;
                    if (!removed.has(id)) {
                        this.warn("missing-link", `${path}[${n}].outputs[${o}].links`, `link ${linkId} is not in the link table${this.repair ? " (removed)" : ""}`, extra);
                        if (this.repair) this.repaired = true;
                    }
                    return !this.repair;
                });
                if (this.repair && kept.length !== output.links.length) output.links = kept.length ? kept : null;
            });
        });
    }
}

export const GraphLoader = {
    DEFAULT_LIMITS,
    LIMIT_SETTINGS,

    /** the limits in effect: the settings `LiteGraph.Loader.*`, else the defaults */
    limits() {
        const limits = {};
        for (const [key, fallback] of Object.entries(DEFAULT_LIMITS)) {
            const value = settingValue(LIMIT_SETTINGS[key][0]);
            limits[key] = typeof value === "number" && value >= 0 ? value : fallback;
        }
        return limits;
    },

    /** declares the loader settings on a settings registry (LiteGraph.setupPlatform calls it) */
    defineSettings(settings) {
        for (const [key, [id, name]] of Object.entries(LIMIT_SETTINGS)) {
            if (!settings.has(id)) settings.define({ id, name, type: "number", default: DEFAULT_LIMITS[key] });
        }
        if (!settings.has("LiteGraph.Loader.OnOpen")) {
            settings.define({ id: "LiteGraph.Loader.OnOpen", name: "Check opened and dropped graph files", type: "combo", options: ["repair", "strict", "off"], default: "repair",
                tooltip: "repair: refuse oversized files, drop runtime-only fields and remove malformed links. strict: refuse any problem. off: load as before (trusted files only)." });
        }
    },

    /**
     * Validates a serialized graph before anything is constructed.
     * @param {*} data
     * @param {{repair?: boolean, limits?: object, allowType?: (type: string, context: {path: string, node: (number|string)}) => (boolean|string)}} [options]
     * @returns {{ok: boolean, data: (object|null), report: {ok: boolean, repaired: boolean, issues: object[], counts: object}}}
     */
    validate(data, options = {}) {
        const run = new Validation(options);
        let clean;
        try {
            if (!isPlainObject(data)) {
                run.error("bad-document", "$", "a graph document must be an object");
            } else {
                run.count(data, "$", 0, new Set());
                run.checkCounts();
                if (!run.errors) clean = run.graph(data, "$", "root");
            }
        } catch (error) {
            if (error !== ABORT) throw error;
        }
        if (run.suppressed) {
            run.issues.push({ severity: run.errors ? "error" : "warning", code: "too-many-issues", path: "$", message: `${run.suppressed} more issue(s) not listed` });
        }
        const ok = run.errors === 0 && clean !== undefined;
        return {
            ok,
            data: ok ? clean : null,
            report: { ok, repaired: ok && run.repaired, issues: run.issues, counts: { ...run.counts } },
        };
    },

    /**
     * A short text for a report: errors first, at most `max` issues.
     * @returns {string} empty for a clean report
     */
    formatReport(report, max = 5) {
        const issues = [...(report?.issues ?? [])].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
        const shown = issues.slice(0, max).map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`);
        if (issues.length > max) shown.push(`and ${issues.length - max} more`);
        return shown.join("; ");
    },

    /** a failed report for a document that could not be read (e.g. invalid JSON) */
    failure(code, message) {
        return { ok: false, repaired: false, issues: [{ severity: "error", code, path: "$", message }], counts: { nodes: 0, links: 0, groups: 0, definitions: 0, depth: 0 } };
    },
};
