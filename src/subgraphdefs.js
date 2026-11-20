import { LiteGraph } from "./litegraph.js";

/**
 * Subgraph definitions: the document side of the subgraph system (pure JSON, no DOM, no runtime).
 *
 * Runtime: each subgraph or function node runs its own inner LGraph ("inline": node.subgraph),
 * with graph/input and graph/output nodes as its boundary. Document: ComfyUI's shape, a root
 * `definitions.subgraphs[]` holding each definition once; an instance node's `type` is the
 * definition id; links to and from the interface use the virtual nodes -10 (inputs) and -20
 * (outputs). The format follows ComfyUI's documented workflow schema (read as a specification) and
 * the MIT Comfy-Org/litegraph.js standalone at ea0e1a8; independent implementation.
 *
 * - definitionOf(node): the definition of an inline instance (nested instances become references)
 * - materialize(definition, definitions): the inline inner graph of a definition
 * - toInline(doc) / toDefinitions(doc): whole documents, both directions
 */

/** virtual IO node ids of the document form (ComfyUI) */
const IO_INPUT_NODE = -10;
const IO_OUTPUT_NODE = -20;
/** runtime ids of materialized graph/input (base - i) and graph/output (base - j) nodes: never stored */
const IO_INPUT_BASE = -1000;
const IO_OUTPUT_BASE = -2000;

const INPUT = "graph/input";
const OUTPUT = "graph/output";
/** instance node types whose `type` becomes the definition id in the document form */
const REPLACED_TYPES = ["graph/subgraph"];
/** definition fields computed from the inner graph, never copied onto it */
const COMPUTED = ["inputs", "outputs", "inputNode", "outputNode", "nodes", "links", "definitions", "widgets_meta"];

const newId = () => LiteGraph.uuidv4();
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const isEventType = (type) => type === -1 || type === "event" || type === "action" || type === LiteGraph.EVENT || type === LiteGraph.ACTION;

/** true for node data that carries or references a definition */
function isInstanceData(node) {
    return !!node && typeof node === "object" && (isObject(node.subgraph) || typeof node.properties?.subgraph_id === "string");
}

function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

/** link data in object form */
function linkObject(link) {
    if (Array.isArray(link)) {
        const [id, origin_id, origin_slot, target_id, target_slot, type] = link;
        return { id, origin_id, origin_slot, target_id, target_slot, type };
    }
    return { ...link };
}

/** link data in the array form of our inline graphs */
function linkArray(link) {
    return [link.id, link.origin_id, link.origin_slot, link.target_id, link.target_slot, link.type];
}

/** a stable string for comparing definitions: sorted keys, volatile fields left out */
function canonical(definition) {
    const skip = new Set(["revision", "state", "version", "litegraph_version"]);
    const walk = (value, top) => {
        if (Array.isArray(value)) return value.map((v) => walk(v, false));
        if (!isObject(value)) return value;
        const out = {};
        for (const key of Object.keys(value).sort()) {
            if (top && skip.has(key)) continue;
            out[key] = walk(value[key], false);
        }
        return out;
    };
    return JSON.stringify(walk(definition, true));
}

/** the interface type as written: a string; event ports also get litegraph_type */
function interfaceSlot(io, fallbackName) {
    const props = io.properties ?? {};
    const raw = props.type;
    const slot = { id: typeof props.slot_id === "string" && props.slot_id ? props.slot_id : newId(), name: String(props.name || fallbackName) };
    if (isEventType(raw)) {
        slot.type = "event";
        slot.litegraph_type = LiteGraph.EVENT;
    } else {
        slot.type = raw === undefined || raw === null || raw === "" || raw === 0 ? "*" : String(raw);
    }
    slot.linkIds = [];
    return slot;
}

/** the runtime type of an interface slot */
function runtimeType(slot) {
    if (typeof slot.litegraph_type === "number") return slot.litegraph_type;
    if (isEventType(slot.type)) return LiteGraph.EVENT;
    return slot.type; // "*" is a wildcard here too
}

function boundsOf(nodes, fallback) {
    if (!nodes.length) return fallback;
    const x0 = Math.min(...nodes.map((n) => n.pos?.[0] ?? 0));
    const y0 = Math.min(...nodes.map((n) => n.pos?.[1] ?? 0));
    const x1 = Math.max(...nodes.map((n) => (n.pos?.[0] ?? 0) + (n.size?.[0] ?? 0)));
    const y1 = Math.max(...nodes.map((n) => (n.pos?.[1] ?? 0) + (n.size?.[1] ?? 0)));
    return [x0, y0, x1 - x0, y1 - y0];
}

/** a kept box when the first boundary node still sits at its corner (where materialize put it) */
function keptBounds(box, ios) {
    if (!Array.isArray(box) || box.length !== 4) return null;
    if (!ios.length) return box;
    const first = ios[0].pos ?? [];
    return first[0] === box[0] && first[1] === box[1] ? box : null;
}

/** order of the boundary nodes: as the instance's slots list them, then by position */
function orderIO(ios, slots) {
    const names = (slots ?? []).map((slot) => slot?.name);
    const rank = (io) => {
        const index = names.indexOf(io.properties?.name);
        return index < 0 ? Infinity : index;
    };
    return ios.map((io, index) => ({ io, index }))
        .sort((a, b) => rank(a.io) - rank(b.io) || (a.io.pos?.[1] ?? 0) - (b.io.pos?.[1] ?? 0) || a.index - b.index)
        .map(({ io }) => io);
}

/**
 * The definition of an inline instance. Nested inline instances become references; their
 * definitions are added to `out` (first one wins for an id).
 * @param {object} node - serialized instance node with `subgraph` (inline inner graph)
 * @param {Map<string, object>} [out]
 * @returns {object} definition (ComfyUI shape)
 */
function definitionOf(node, out = new Map()) {
    const inner = node.subgraph ?? {};
    const id = typeof node.properties?.subgraph_id === "string" && node.properties.subgraph_id ? node.properties.subgraph_id : newId();
    const inputsIO = [], outputsIO = [], nodes = [];
    for (const child of inner.nodes ?? []) {
        if (child?.type === INPUT) inputsIO.push(child);
        else if (child?.type === OUTPUT) outputsIO.push(child);
        else if (child) nodes.push(isObject(child.subgraph) ? referenceOf(child, out) : clone(child));
    }
    const orderedIn = orderIO(inputsIO, node.inputs);
    const orderedOut = orderIO(outputsIO, node.outputs);
    const inputs = orderedIn.map((io, i) => interfaceSlot(io, `in${i}`));
    const outputs = orderedOut.map((io, j) => interfaceSlot(io, `out${j}`));
    const inIndex = new Map(orderedIn.map((io, i) => [io.id, i]));
    const outIndex = new Map(orderedOut.map((io, j) => [io.id, j]));

    const links = [];
    for (const raw of inner.links ?? []) {
        if (!raw) continue;
        const link = linkObject(raw);
        if (inIndex.has(link.origin_id)) {
            const i = inIndex.get(link.origin_id);
            link.origin_id = IO_INPUT_NODE;
            link.origin_slot = i;
            inputs[i].linkIds.push(link.id);
        }
        if (outIndex.has(link.target_id)) {
            const j = outIndex.get(link.target_id);
            link.target_id = IO_OUTPUT_NODE;
            link.target_slot = j;
            outputs[j].linkIds.push(link.id);
        }
        links.push(link);
    }

    // boundary node layout, kept for a lossless round trip through this runtime
    const io = {};
    const keepIO = (ioNode, slot) => {
        const { id: _id, type: _type, inputs: _in, outputs: _out, order: _order, ...rest } = clone(ioNode);
        io[slot.id] = rest;
    };
    orderedIn.forEach((ioNode, i) => keepIO(ioNode, inputs[i]));
    orderedOut.forEach((ioNode, j) => keepIO(ioNode, outputs[j]));

    // fields of the inner graph this module does not compute (meta, foreign fields) are kept
    const meta = {};
    for (const [key, value] of Object.entries(inner)) {
        if (!COMPUTED.includes(key) && !["id", "last_node_id", "last_link_id", "litegraph_version"].includes(key)) meta[key] = clone(value);
    }
    const extra = { ...(meta.extra ?? {}) };
    extra.litegraph = { ...(extra.litegraph ?? {}), io };
    // the boxes a loaded definition had: written back while the boundary nodes have not moved
    const kept = extra.litegraph.io_bounds;
    delete extra.litegraph.io_bounds;
    if (!Object.keys(io).length) delete extra.litegraph.io;
    if (!Object.keys(extra.litegraph).length) delete extra.litegraph;

    const definition = {
        id,
        ...meta,
        version: 1,
        name: typeof meta.name === "string" && meta.name ? meta.name : (node.title || "Subgraph"),
        state: { ...(inner.state ?? {}) },
        inputNode: { id: IO_INPUT_NODE, bounding: keptBounds(kept?.input, orderedIn) ?? boundsOf(orderedIn, [-200, 0, 120, 60]) },
        outputNode: { id: IO_OUTPUT_NODE, bounding: keptBounds(kept?.output, orderedOut) ?? boundsOf(orderedOut, [600, 0, 120, 60]) },
        inputs,
        outputs,
        widgets: Array.isArray(meta.widgets) ? meta.widgets : [],
        nodes,
        links,
        groups: meta.groups ?? [],
        extra,
    };
    delete definition.definitions;
    if (!out.has(id)) out.set(id, definition);
    return definition;
}

/** a reference to an inline instance: its definition goes to `out` */
function referenceOf(node, out) {
    const definition = definitionOf(node, out);
    const ref = clone({ ...node, subgraph: undefined });
    delete ref.subgraph;
    ref.properties = { ...(ref.properties ?? {}), subgraph_id: definition.id };
    if (REPLACED_TYPES.includes(ref.type)) ref.type = definition.id;
    return ref;
}

/**
 * The inline inner graph of a definition: graph/input and graph/output nodes in place of the
 * -10/-20 links; nested instances materialized too.
 * @param {object} definition
 * @param {Map<string, object>} definitions - all definitions of the document
 * @param {{errors?: Array, stack?: string[]}} [context]
 * @returns {object} inner graph data for LGraph.configure
 */
function materialize(definition, definitions, context = {}) {
    const errors = context.errors ?? [];
    const stack = [...(context.stack ?? []), definition.id];
    const io = definition.extra?.litegraph?.io ?? {};
    const inputs = Array.isArray(definition.inputs) ? definition.inputs : [];
    const outputs = Array.isArray(definition.outputs) ? definition.outputs : [];
    const inBox = definition.inputNode?.bounding ?? [-200, 0, 120, 60];
    const outBox = definition.outputNode?.bounding ?? [600, 0, 120, 60];

    const links = (definition.links ?? []).filter(Boolean).map((raw) => {
        const link = linkObject(raw);
        if (link.origin_id === IO_INPUT_NODE) {
            link.origin_id = IO_INPUT_BASE - link.origin_slot;
            link.origin_slot = 0;
        }
        if (link.target_id === IO_OUTPUT_NODE) {
            link.target_id = IO_OUTPUT_BASE - link.target_slot;
            link.target_slot = 0;
        }
        return link;
    });
    const linksFrom = (id) => links.filter((link) => link.origin_id === id).map((link) => link.id);
    const linkTo = (id) => links.find((link) => link.target_id === id)?.id ?? null;

    const ioNode = (type, id, slot, index, box) => {
        const kept = clone(io[slot.id]) ?? {};
        const rt = runtimeType(slot);
        const node = {
            pos: [box[0], box[1] + index * 100],
            size: type === INPUT ? [180, 90] : [180, 60],
            flags: {},
            mode: 0,
            ...kept,
            id,
            type,
        };
        node.properties = { ...(kept.properties ?? {}), name: slot.name, type: rt, slot_id: slot.id };
        if (type === INPUT) {
            node.properties.value ??= 0;
            node.inputs = [];
            node.outputs = [{ name: "", type: rt, links: linksFrom(id) }];
        } else {
            node.inputs = [{ name: "", type: rt, link: linkTo(id) }];
            node.outputs = [];
        }
        return node;
    };

    const nodes = [
        ...inputs.map((slot, i) => ioNode(INPUT, IO_INPUT_BASE - i, slot, i, inBox)),
        ...outputs.map((slot, j) => ioNode(OUTPUT, IO_OUTPUT_BASE - j, slot, j, outBox)),
        ...(definition.nodes ?? []).filter(Boolean).map((node) => inlineNode(node, definitions, { errors, stack })),
    ];

    const graph = {};
    for (const [key, value] of Object.entries(definition)) {
        if (!COMPUTED.includes(key) && key !== "version") graph[key] = clone(value);
    }
    // the layout of the boundary nodes lives on the nodes again; the boxes are kept for the way back
    graph.extra = { ...(graph.extra ?? {}) };
    graph.extra.litegraph = { ...(graph.extra.litegraph ?? {}), io_bounds: { input: inBox, output: outBox } };
    delete graph.extra.litegraph.io;
    graph.nodes = nodes;
    graph.links = links.map(linkArray);
    // links of the definition keep their reroute parents as 0.4 link extensions
    const parents = links.filter((link) => link.parentId !== undefined && link.parentId !== null);
    if (parents.length) {
        graph.extra = { ...(graph.extra ?? {}) };
        const known = new Set((graph.extra.linkExtensions ?? []).map((e) => e.id));
        graph.extra.linkExtensions = [...(graph.extra.linkExtensions ?? []), ...parents.filter((l) => !known.has(l.id)).map((l) => ({ id: l.id, parentId: l.parentId }))];
    }
    graph.version = 0.4;
    return graph;
}

/** an instance node in inline form (other nodes unchanged) */
function inlineNode(node, definitions, context) {
    const id = REPLACED_TYPES.includes(node.type) || !definitions.has(node.type) ? node.properties?.subgraph_id : node.type;
    if (isObject(node.subgraph) || typeof id !== "string" || !definitions.has(id)) return clone(node);
    const maxDepth = LiteGraph.subgraph_max_depth ?? 32;
    if (context.stack.includes(id) || context.stack.length >= maxDepth) {
        context.errors.push({ kind: context.stack.includes(id) ? "cycle" : "depth", id, path: [...context.stack] });
        return clone(node); // left as an unknown type: kept as an error node with its data
    }
    const data = clone(node);
    if (data.type === id) data.type = REPLACED_TYPES[0];
    data.properties = { ...(data.properties ?? {}), subgraph_id: id };
    data.subgraph = materialize(definitions.get(id), definitions, context);
    return data;
}

/**
 * A definition in the strict form this module writes: links as an array, every interface slot
 * with an id, IO nodes with a bounding box. Loose documents (older writers, test fixtures) load.
 */
function normalizeDefinition(definition) {
    const out = clone(definition);
    if (isObject(out.links)) out.links = Object.values(out.links);
    if (!Array.isArray(out.links)) out.links = [];
    if (!Array.isArray(out.nodes)) out.nodes = [];
    for (const key of ["inputs", "outputs"]) {
        out[key] = (Array.isArray(out[key]) ? out[key] : []).map((slot, i) => ({
            ...slot,
            id: typeof slot?.id === "string" && slot.id ? slot.id : newId(),
            name: String(slot?.name ?? `${key === "inputs" ? "in" : "out"}${i}`),
            type: slot?.type ?? "*",
        }));
    }
    for (const [key, id, fallback] of [["inputNode", IO_INPUT_NODE, [-200, 0, 120, 60]], ["outputNode", IO_OUTPUT_NODE, [600, 0, 120, 60]]]) {
        const ioNode = isObject(out[key]) ? out[key] : {};
        const bounding = Array.isArray(ioNode.bounding) && ioNode.bounding.length === 4 ? ioNode.bounding
            : Array.isArray(ioNode.pos) ? [ioNode.pos[0], ioNode.pos[1], ioNode.size?.[0] ?? 140, ioNode.size?.[1] ?? 26]
                : fallback;
        out[key] = { ...ioNode, id, bounding };
    }
    // linkIds the writer left out are taken from the -10 / -20 links
    const links = out.links.filter(Boolean).map(linkObject);
    out.inputs.forEach((slot, i) => {
        if (!Array.isArray(slot.linkIds) || !slot.linkIds.length) slot.linkIds = links.filter((l) => l.origin_id === IO_INPUT_NODE && l.origin_slot === i).map((l) => l.id);
    });
    out.outputs.forEach((slot, j) => {
        if (!Array.isArray(slot.linkIds) || !slot.linkIds.length) slot.linkIds = links.filter((l) => l.target_id === IO_OUTPUT_NODE && l.target_slot === j).map((l) => l.id);
    });
    out.version ??= 1;
    if (typeof out.name !== "string" || !out.name) out.name = "Subgraph";
    if (!Array.isArray(out.widgets)) out.widgets = [];
    return out;
}

/** every definition of a document: the root list plus nested `definitions` blocks; first id wins */
function collectDefinitions(doc, out = new Map(), warnings = []) {
    for (const definition of doc?.definitions?.subgraphs ?? []) {
        if (!isObject(definition) || typeof definition.id !== "string") continue;
        if (out.has(definition.id)) {
            if (canonical(out.get(definition.id)) !== canonical(definition)) warnings.push({ kind: "duplicate", id: definition.id });
            continue;
        }
        out.set(definition.id, normalizeDefinition(definition));
        collectDefinitions(definition, out, warnings);
    }
    return out;
}

/**
 * A document in inline form: instances that reference a definition get their inner graph.
 * Instances that are already inline keep it (it is their runtime state).
 * @param {object} doc
 * @returns {{doc: object, definitions: Map<string, object>, errors: Array, warnings: Array}}
 */
function toInline(doc) {
    const warnings = [];
    const definitions = collectDefinitions(doc, new Map(), warnings);
    const errors = [];
    if (!definitions.size) return { doc, definitions, errors, warnings };
    const out = { ...doc };
    out.nodes = (doc.nodes ?? []).map((node) => (node ? inlineNode(node, definitions, { errors, stack: [] }) : node));
    const rest = { ...(doc.definitions ?? {}) };
    delete rest.subgraphs;
    if (Object.keys(rest).length) out.definitions = rest; else delete out.definitions;
    return { doc: out, definitions, errors, warnings };
}

/**
 * A document in definitions form: inline instances become references to `definitions.subgraphs`.
 * @param {object} doc - inline document (as LGraph.serialize writes it)
 * @param {{definitions?: Map<string, object>}} [options] - known definitions (the registry); they win
 *   over an instance's inline content, and unused ones are kept
 * @returns {object}
 */
function toDefinitions(doc, { definitions = new Map() } = {}) {
    const out = new Map();
    const derived = new Map();
    const reference = (node) => {
        const id = node.properties?.subgraph_id;
        if (typeof id === "string" && definitions.has(id)) {
            // the registry is the source; its nested definitions too
            useDefinition(id);
            const ref = clone({ ...node, subgraph: undefined });
            delete ref.subgraph;
            if (REPLACED_TYPES.includes(ref.type)) ref.type = id;
            return ref;
        }
        const ref = referenceOf(node, derived);
        for (const [key, value] of derived) if (!out.has(key)) out.set(key, value);
        return ref;
    };
    const useDefinition = (id, seen = new Set()) => {
        if (seen.has(id) || !definitions.has(id)) return;
        seen.add(id);
        const definition = definitions.get(id);
        if (!out.has(id)) out.set(id, definition);
        for (const node of definition.nodes ?? []) {
            const nested = node?.properties?.subgraph_id ?? node?.type;
            if (typeof nested === "string") useDefinition(nested, seen);
        }
    };
    const nodes = (doc.nodes ?? []).map((node) => (node && isObject(node.subgraph) ? reference(node) : node));
    for (const id of definitions.keys()) useDefinition(id); // unused definitions are kept
    const result = { ...doc, nodes };
    result.definitions = { ...(doc.definitions ?? {}), subgraphs: [...out.values()].map(clone) };
    if (!result.definitions.subgraphs.length) {
        delete result.definitions.subgraphs;
        if (!Object.keys(result.definitions).length) delete result.definitions;
    }
    return result;
}

/** ids of the definitions a definition (or graph data) uses directly */
function directDefinitionIds(data) {
    const ids = new Set();
    for (const node of data?.nodes ?? []) {
        const id = node?.properties?.subgraph_id ?? (typeof node?.type === "string" && !node.type.includes("/") ? node.type : null);
        if (typeof id === "string") ids.add(id);
    }
    return ids;
}

/** ids of definitions that are part of a cycle */
function findCycles(definitions) {
    const cyclic = new Set();
    const visit = (id, stack) => {
        if (stack.includes(id)) {
            stack.slice(stack.indexOf(id)).forEach((x) => cyclic.add(x));
            return;
        }
        const definition = definitions.get(id);
        if (!definition) return;
        for (const next of directDefinitionIds(definition)) visit(next, [...stack, id]);
    };
    for (const id of definitions.keys()) visit(id, []);
    return cyclic;
}

export const SubgraphDefs = {
    IO_INPUT_NODE, IO_OUTPUT_NODE, IO_INPUT_BASE, IO_OUTPUT_BASE,
    isInstanceData, linkObject, canonical, definitionOf, materialize, collectDefinitions,
    toInline, toDefinitions, directDefinitionIds, findCycles,
};
