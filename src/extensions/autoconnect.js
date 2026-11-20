/**
 * EXAMPLE EXTENSION TO AUTOCONNECT SELECTED NODES TO ANOTHER (SINGLE) NODE
 * press "a", then click on the target node: every selected node is auto-connected to it
 * (one undo step). Command `litegraph.autoconnect`, key "a".
 */

import { LiteGraph } from "../litegraph.js";

// canvas -> pending call_once handler id, so a second "a" or disposing the extension disarms it
const pending = new Map();

function disarm(graphcanvas) {
    const id = pending.get(graphcanvas);
    if (id === undefined) return;
    pending.delete(graphcanvas);
    graphcanvas.unregisterCallbackHandler("onMouseDown", id);
}

export const autoconnectExtension = {
    name: "litegraph.autoconnect",
    commands: [{
        id: "litegraph.autoconnect",
        label: "Auto-connect selection to the next clicked node",
        category: "edit",
        when: (ctx) => !!ctx.canvas?.graph && ctx.selectedNodes?.length > 0,
        run(ctx) {
            const graphcanvas = ctx.canvas;
            const sources = [...ctx.selectedNodes];
            disarm(graphcanvas);
            const id = graphcanvas.registerCallbackHandler("onMouseDown", (info, e) => {
                pending.delete(graphcanvas);
                const graph = graphcanvas.graph;
                const target = graph?.getNodeOnPos(e.canvasX, e.canvasY, graphcanvas.visible_nodes, 5);
                if (!target) return;
                graph.transact("autoconnect", () => {
                    for (const source of sources) graph.autoConnectNodes(source, target);
                });
            }, { call_once: true });
            pending.set(graphcanvas, id);
        },
    }],
    keybindings: [{ combo: "a", commandId: "litegraph.autoconnect" }],
    setup(ctx) {
        ctx.addDisposer(() => { for (const canvas of [...pending.keys()]) disarm(canvas); });
    },
};

/** Registers the extension once (kept for code that called it per canvas). */
export function registerExtension_autoconnect(graphcanvas) {
    if (!LiteGraph.extensions?.has(autoconnectExtension.name)) LiteGraph.registerExtension(autoconnectExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_autoconnect();
