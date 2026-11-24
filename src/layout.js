import { LiteGraph } from "./litegraph.js";

/**
 * Auto-layout (Wave 4d, decision W4-3): one adapter, several engines.
 *
 * `graph.autoLayout({engine, scope, direction, spacing})` builds a plain model of the nodes and
 * links in scope, asks the engine for positions, and applies them as one undo step.
 *
 * Engines (`LiteGraph.layout`):
 * - "dagre": `@dagrejs/dagre`, loaded on first use through the LibraryManager (key "dagre");
 *   no hard dependency in the bundles.
 * - "layered": a small built-in layered layout (longest path ranks), with no dependency.
 * - "elk" or others: `LiteGraph.layout.register(name, engine)`; `LayoutRegistry.elkEngine(elk)`
 *   adapts an elkjs instance.
 *
 * An engine is `{library?: string, layout(model, options, lib) → {positions: {id: [x, y]}} | Promise}`
 * where positions are the top-left corners of the node boxes (title included).
 */
export class LayoutRegistry {

    constructor() {
        /** @type {Map<string, object>} */
        this._engines = new Map([
            ["dagre", LayoutRegistry.dagreEngine],
            ["layered", LayoutRegistry.layeredEngine],
        ]);
    }

    /** @returns {() => void} disposer */
    register(name, engine) {
        if (typeof name !== "string" || !name) throw new TypeError("layout engine name must be a non-empty string");
        if (typeof engine?.layout !== "function") throw new TypeError(`layout engine ${name}: needs layout(model, options, lib)`);
        const previous = this._engines.get(name);
        this._engines.set(name, engine);
        return () => {
            if (this._engines.get(name) !== engine) return;
            if (previous) this._engines.set(name, previous);
            else this._engines.delete(name);
        };
    }

    get(name) {
        return this._engines.get(name) ?? null;
    }

    list() {
        return [...this._engines.keys()];
    }

    /**
     * The model of a graph for an engine: node boxes (title included) and the links between the
     * nodes in scope.
     * @param {object} graph
     * @param {object[]} nodes - the nodes to lay out
     * @returns {{nodes: Array<{id: *, width: number, height: number, x: number, y: number}>,
     *   edges: Array<{id: *, source: *, target: *, sourceSlot: number, targetSlot: number}>}}
     */
    static buildModel(graph, nodes) {
        const title = LiteGraph.NODE_TITLE_HEIGHT;
        const ids = new Set(nodes.map((node) => node.id));
        const model = {
            nodes: nodes.map((node) => ({
                id: node.id,
                width: node.flags?.collapsed ? (node._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH || 80) : node.size[0],
                height: node.flags?.collapsed ? title : node.size[1] + title,
                x: node.pos[0],
                y: node.pos[1] - title,
            })),
            edges: [],
        };
        for (const link of Object.values(graph.links ?? {})) {
            if (!link || !ids.has(link.origin_id) || !ids.has(link.target_id) || link.origin_id === link.target_id) continue;
            model.edges.push({ id: link.id, source: link.origin_id, target: link.target_id, sourceSlot: link.origin_slot, targetSlot: link.target_slot });
        }
        return model;
    }

    /** Wraps an elkjs instance (`new ELK()`) as a layout engine. */
    static elkEngine(elk) {
        return {
            async layout(model, options) {
                const direction = { LR: "RIGHT", RL: "LEFT", TB: "DOWN", BT: "UP" }[options.direction] ?? "RIGHT";
                const result = await elk.layout({
                    id: "root",
                    layoutOptions: {
                        "elk.algorithm": "layered",
                        "elk.direction": direction,
                        "elk.spacing.nodeNode": String(options.spacing.node),
                        "elk.layered.spacing.nodeNodeBetweenLayers": String(options.spacing.rank),
                    },
                    children: model.nodes.map((n) => ({ id: String(n.id), width: n.width, height: n.height })),
                    edges: model.edges.map((e) => ({ id: `e${e.id}`, sources: [String(e.source)], targets: [String(e.target)] })),
                });
                const byId = new Map(model.nodes.map((n) => [String(n.id), n.id]));
                const positions = {};
                for (const child of result.children ?? []) positions[byId.get(child.id)] = [child.x, child.y];
                return { positions };
            },
        };
    }
}

/** dagre (graphlib) engine; `lib` is the dagre module or global */
LayoutRegistry.dagreEngine = {
    library: "dagre",
    layout(model, options, lib) {
        const dagre = lib?.layout ? lib : lib?.default;
        if (!dagre?.layout || !dagre.graphlib?.Graph) throw new Error("layout dagre: the dagre library has no layout() / graphlib");
        const g = new dagre.graphlib.Graph({ multigraph: true });
        g.setGraph({ rankdir: options.direction, nodesep: options.spacing.node, ranksep: options.spacing.rank, marginx: 0, marginy: 0 });
        g.setDefaultEdgeLabel(() => ({}));
        for (const node of model.nodes) g.setNode(String(node.id), { width: node.width, height: node.height });
        for (const edge of model.edges) g.setEdge(String(edge.source), String(edge.target), {}, String(edge.id));
        dagre.layout(g);
        const positions = {};
        for (const node of model.nodes) {
            const placed = g.node(String(node.id));
            if (placed) positions[node.id] = [placed.x - node.width / 2, placed.y - node.height / 2];
        }
        return { positions };
    },
};

/**
 * A small layered layout without dependencies: ranks by longest path from the sources, nodes in
 * a rank ordered by their current position, ranks side by side (LR) or stacked (TB).
 */
LayoutRegistry.layeredEngine = {
    layout(model, options) {
        const incoming = new Map(model.nodes.map((n) => [n.id, []]));
        for (const edge of model.edges) incoming.get(edge.target)?.push(edge.source);
        const rank = new Map();
        const visiting = new Set();
        const rankOf = (id) => {
            if (rank.has(id)) return rank.get(id);
            if (visiting.has(id)) return 0; // a cycle: break it here
            visiting.add(id);
            let r = 0;
            for (const source of incoming.get(id) ?? []) r = Math.max(r, rankOf(source) + 1);
            visiting.delete(id);
            rank.set(id, r);
            return r;
        };
        const ranks = [];
        for (const node of model.nodes) (ranks[rankOf(node.id)] ??= []).push(node);
        const horizontal = options.direction === "LR" || options.direction === "RL";
        const positions = {};
        let along = 0;
        for (const nodes of ranks) {
            if (!nodes) continue;
            nodes.sort((a, b) => horizontal ? (a.y - b.y || a.x - b.x) : (a.x - b.x || a.y - b.y));
            let across = 0;
            let thickness = 0;
            for (const node of nodes) {
                positions[node.id] = horizontal ? [along, across] : [across, along];
                across += (horizontal ? node.height : node.width) + options.spacing.node;
                thickness = Math.max(thickness, horizontal ? node.width : node.height);
            }
            along += thickness + options.spacing.rank;
        }
        if (options.direction === "RL" || options.direction === "BT") {
            const axis = options.direction === "RL" ? 0 : 1;
            for (const node of model.nodes) {
                positions[node.id][axis] = -positions[node.id][axis] - (axis === 0 ? node.width : node.height);
            }
        }
        return { positions };
    },
};
