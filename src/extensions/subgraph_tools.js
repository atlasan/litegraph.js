import { LiteGraph } from "../litegraph.js";
import { SubgraphDefs } from "../subgraphdefs.js";

/**
 * Subgraph commands: open and close, convert and unpack, make unique, remove unused definitions,
 * promote and unpromote a widget. The canvas keeps its own buttons and menus; these make the same
 * actions available to key bindings, command palettes and scripts.
 */

const single = (ctx) => (ctx.selectedNodes?.length === 1 ? ctx.selectedNodes[0] : null);
const isInstance = (node) => !!node?.subgraph && typeof node.properties?.subgraph_id === "string";

/** definitions of the root registry that no instance uses, directly or through another definition */
export function unusedDefinitionIds(rootGraph) {
    const used = new Set();
    const use = (id) => {
        if (used.has(id) || !rootGraph.subgraphs.has(id)) return;
        used.add(id);
        for (const next of SubgraphDefs.directDefinitionIds(rootGraph.subgraphs.get(id))) use(next);
    };
    const visit = (graph, depth) => {
        if (depth > (LiteGraph.subgraph_max_depth ?? 32)) return;
        for (const node of graph._nodes) {
            if (typeof node?.properties?.subgraph_id === "string") use(node.properties.subgraph_id);
            if (node?.subgraph) visit(node.subgraph, depth + 1);
        }
    };
    visit(rootGraph, 0);
    return [...rootGraph.subgraphs.keys()].filter((id) => !used.has(id));
}

/** removes the definitions nothing uses (one undo step); returns their ids */
export function removeUnusedDefinitions(graph) {
    const root = graph.rootGraph;
    const unused = unusedDefinitionIds(root);
    if (!unused.length) return [];
    root.transact("removeUnusedDefinitions", () => {
        for (const id of unused) root.subgraphs.delete(id);
        root.onGraphChanged({ action: "removeUnusedDefinitions" });
    });
    return unused;
}

export const subgraphToolsExtension = {
    name: "litegraph.subgraph_tools",
    commands: [
        {
            id: "litegraph.subgraph.open",
            label: "Open subgraph",
            category: "subgraph",
            when: (ctx) => !!single(ctx)?.subgraph && !!ctx.canvas,
            run(ctx) { ctx.canvas.openSubgraph(single(ctx).subgraph); return true; },
        },
        {
            id: "litegraph.subgraph.close",
            label: "Leave subgraph",
            category: "subgraph",
            when: (ctx) => (ctx.canvas?._graph_stack?.length ?? 0) > 0,
            run(ctx) { ctx.canvas.closeSubgraph(); return true; },
        },
        {
            id: "litegraph.subgraph.closeAll",
            label: "Back to the root graph",
            category: "subgraph",
            when: (ctx) => (ctx.canvas?._graph_stack?.length ?? 0) > 0,
            run(ctx) { ctx.canvas.closeSubgraphTo(0); return true; },
        },
        {
            id: "litegraph.subgraph.convert",
            label: "Convert selection to subgraph",
            category: "subgraph",
            when: (ctx) => !!ctx.graph && (ctx.selectedNodes?.length ?? 0) > 0,
            run(ctx) {
                const node = ctx.graph.convertToSubgraph(ctx.selectedNodes);
                if (node) ctx.canvas?.selectNodes?.([node]);
                return !!node;
            },
        },
        {
            id: "litegraph.subgraph.unpack",
            label: "Unpack subgraph",
            category: "subgraph",
            when: (ctx) => !!ctx.graph && single(ctx)?.type === "graph/subgraph",
            run(ctx) {
                const nodes = ctx.graph.unpackSubgraph(single(ctx));
                if (nodes?.length) ctx.canvas?.selectNodes?.(nodes);
                return !!nodes?.length;
            },
        },
        {
            id: "litegraph.subgraph.makeUnique",
            label: "Make subgraph unique",
            category: "subgraph",
            when: (ctx) => {
                const node = single(ctx);
                return isInstance(node) && node.graph.rootGraph.findSubgraphInstances(node.properties.subgraph_id).length > 1;
            },
            run(ctx) { return !!single(ctx).makeUnique(); },
        },
        {
            id: "litegraph.subgraph.updateFromSource",
            label: "Update component from its registered revision",
            category: "subgraph",
            when: (ctx) => !!single(ctx)?.hasSourceUpdate?.(),
            run(ctx) { return single(ctx).updateFromSource(); },
        },
        {
            id: "litegraph.subgraph.removeUnusedDefinitions",
            label: "Remove unused subgraph definitions",
            category: "subgraph",
            when: (ctx) => !!ctx.graph && unusedDefinitionIds(ctx.graph.rootGraph).length > 0,
            run(ctx) { return removeUnusedDefinitions(ctx.graph).length > 0; },
        },
    ],
};

/** Registers the extension once (the full bundles and the editor load it). */
export function registerExtension_subgraphTools(graphcanvas) {
    if (!LiteGraph.extensions?.has(subgraphToolsExtension.name)) LiteGraph.registerExtension(subgraphToolsExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_subgraphTools();
