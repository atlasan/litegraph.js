import { LiteGraph } from "../litegraph.js";

/**
 * Quick connect: what a link released on empty space offers, and connecting a selection in a chain.
 *
 * - Settings `LiteGraph.LinkRelease.Action` and `LiteGraph.LinkRelease.ShiftAction` (with Shift
 *   held) choose "context-menu", "search-box" or "none". The defaults are the canvas defaults
 *   (menu, Shift: search box). They apply where releasing a link on empty space shows something
 *   at all (`LiteGraph.release_link_on_empty_shows_menu`).
 * - Command `litegraph.link.chainSelection` connects the selected nodes left to right: each node
 *   to the next through the first output that has a compatible free input. One undo step.
 */

const ACTIONS = ["context-menu", "search-box", "none"];

/**
 * Connects nodes in order: each node's first output with a compatible free input on the next node.
 * @returns {number} links created
 */
export function chainNodes(graph, nodes) {
    let created = 0;
    graph.transact("chainSelection", () => {
        for (let i = 0; i + 1 < nodes.length; i++) {
            const [from, to] = [nodes[i], nodes[i + 1]];
            for (let slot = 0; slot < (from.outputs?.length ?? 0); slot++) {
                const target = to.findSlotByType?.(true, from.outputs[slot].type ?? 0, false, true, true) ?? -1;
                if (target >= 0 && from.connect(slot, to, target)) {
                    created++;
                    break;
                }
            }
        }
    });
    return created;
}

export const quickConnectExtension = {
    name: "litegraph.quickconnect",
    settings: [
        { id: "LiteGraph.LinkRelease.Action", name: "Link released on empty space", type: "combo", options: ACTIONS, default: "context-menu" },
        { id: "LiteGraph.LinkRelease.ShiftAction", name: "Link released on empty space with Shift", type: "combo", options: ACTIONS, default: "search-box" },
    ],
    commands: [{
        id: "litegraph.link.chainSelection",
        label: "Connect selected nodes left to right",
        category: "edit",
        mutatesGraph: true,
        when: (ctx) => !!ctx.canvas?.graph && ctx.selectedNodes?.length > 1,
        run(ctx) {
            const nodes = [...ctx.selectedNodes].sort((a, b) => a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1]);
            return chainNodes(ctx.canvas.graph, nodes) > 0;
        },
    }],
    setup(ctx) {
        ctx.onCanvas((canvas) => {
            ctx.onEvent(canvas, "link-dropped-on-empty", (event) => {
                if (!LiteGraph.release_link_on_empty_shows_menu) return;
                const e = event.detail.event;
                const id = e?.shiftKey ? "LiteGraph.LinkRelease.ShiftAction" : "LiteGraph.LinkRelease.Action";
                const action = ctx.settings.get(id);
                if (!ACTIONS.includes(action)) return; // unknown value: the canvas default applies
                event.preventDefault();
                canvas.showLinkReleaseAction(action, event.detail, e);
            });
        });
    },
};

/** Registers the extension once (the full bundles and the editor load it). */
export function registerExtension_quickConnect(graphcanvas) {
    if (!LiteGraph.extensions?.has(quickConnectExtension.name)) LiteGraph.registerExtension(quickConnectExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_quickConnect();
