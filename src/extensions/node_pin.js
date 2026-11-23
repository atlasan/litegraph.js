import { LiteGraph } from "../litegraph.js";

/**
 * The node pin (the title box) as a mode and state indicator, with a quick menu.
 *
 * - Pin style "modes" (setting LiteGraph.Node.PinStyle): one shape and colour per mode, a run-state
 *   ring on top, and a glow that fades after each run (`node.last_run_time`). A node's `boxcolor`
 *   still fills the pin, so nodes that signal through it keep doing so.
 * - Quick menu on the pin (menu location "node-pin"): Mode ▸, Bypass, Mute, Rename, Collapse,
 *   Run now, Info, then "More…" (the full node menu, added by the canvas).
 * - Commands (each one undo step, for the node and the rest of the selection):
 *   `litegraph.node.setMode` (ctx.mode), `litegraph.node.toggleBypass` (Ctrl+B),
 *   `litegraph.node.toggleMute` (Ctrl+M), `litegraph.node.run`, `litegraph.node.info`.
 */

/** how each mode looks: shape, colour, and an optional mark */
export const NODE_PIN_MODE_LOOKS = {
    [LiteGraph.ALWAYS]: { shape: "circle", color: "#7a7", fill: true },
    [LiteGraph.ON_EVENT]: { shape: "diamond", color: "#d93", fill: true },
    [LiteGraph.ON_TRIGGER]: { shape: "triangle", color: "#5af", fill: true },
    [LiteGraph.ON_REQUEST]: { shape: "circle", color: "#5cc", fill: false },
    [LiteGraph.NEVER]: { shape: "circle", color: "#666", fill: false, mark: "slash" },
    [LiteGraph.BYPASS]: { shape: "circle", color: "#b6e", fill: false, mark: "bar" },
};

/** how each execution state rings the pin */
const NODE_PIN_STATE_RINGS = {
    running: { color: "#fc3", width: 2.5 },
    error: { color: "#e44", width: 2.5 },
    queued: { color: "#999", width: 1.5 },
};

/** how long the glow after a run lasts (ms) */
export const NODE_PIN_RUN_GLOW_MS = 600;

/** The "modes" pin style (LiteGraph.registerNodePinStyle). */
export function modesPinStyle(node, canvas) {
    const look = NODE_PIN_MODE_LOOKS[node.mode] ?? NODE_PIN_MODE_LOOKS[LiteGraph.ALWAYS];
    const spec = {
        shape: look.shape,
        fill: node.boxcolor || (look.fill ? look.color : null),
        stroke: look.color,
        lineWidth: 1.5,
        mark: look.mark ?? null,
        markColor: look.color,
    };
    const status = canvas?.executionOverlaysEnabled?.() !== false ? node.execution_state?.status : null;
    const ring = NODE_PIN_STATE_RINGS[status];
    if (ring) {
        spec.stroke = ring.color;
        spec.lineWidth = ring.width;
        if (status === "error") spec.fill = ring.color;
    }
    const since = LiteGraph.getTime() - (node.last_run_time ?? -Infinity);
    if (since >= 0 && since < NODE_PIN_RUN_GLOW_MS) {
        spec.glow = { color: "#fff", radius: 4, alpha: 0.55 * (1 - since / NODE_PIN_RUN_GLOW_MS) };
        spec.redraw = true; // keep drawing until the glow is gone
    }
    return spec;
}

/** the nodes a command acts on: the node and, when it is selected, the rest of the selection */
function nodePinTargets(ctx) {
    const selected = ctx.selectedNodes ?? Object.values(ctx.canvas?.selected_nodes ?? {});
    if (ctx.node) return selected.includes(ctx.node) ? selected : [ctx.node];
    return selected;
}

/** sets the mode of nodes as one undo step; refusals are reported by the canvas */
export function setNodesMode(ctx, nodes, mode) {
    const graph = ctx.graph ?? nodes[0]?.graph;
    if (!graph || !nodes.length) return false;
    const refusals = [];
    const apply = () => {
        for (const node of nodes) {
            if (node.mode === mode) continue;
            if (node.changeMode(mode) === false && node.mode_refusal) refusals.push(node.mode_refusal);
        }
        graph.onGraphChanged?.({ action: "nodeMode" });
    };
    if (graph.transact) graph.transact("nodeMode", apply);
    else apply();
    if (refusals.length) ctx.canvas?.showExecutionNotice?.(refusals[0] + (refusals.length > 1 ? ` (+${refusals.length - 1} more)` : ""));
    ctx.canvas?.setDirty?.(true, true);
    return true;
}

/** toggles nodes between a mode and ALWAYS (all go to the mode unless all already have it) */
function toggleNodesMode(ctx, mode) {
    const nodes = nodePinTargets(ctx);
    const allOn = nodes.length > 0 && nodes.every((node) => node.mode === mode);
    return setNodesMode(ctx, nodes, allOn ? LiteGraph.ALWAYS : mode);
}

const nodePinHasNodes = (ctx) => !!ctx.graph && nodePinTargets(ctx).length > 0 && !ctx.canvas?.read_only;
const nodePinChecked = (on, label) => `${on ? "✓ " : ""}${label}`;

export const nodePinExtension = {
    name: "litegraph.node_pin",
    commands: [
        {
            id: "litegraph.node.setMode",
            label: "Set mode",
            category: "node",
            when: nodePinHasNodes,
            run: (ctx) => Number.isInteger(ctx.mode) && setNodesMode(ctx, nodePinTargets(ctx), ctx.mode),
        },
        {
            id: "litegraph.node.toggleBypass",
            label: (ctx) => nodePinChecked(ctx.node?.mode === LiteGraph.BYPASS, "Bypass"),
            category: "node",
            when: nodePinHasNodes,
            run: (ctx) => toggleNodesMode(ctx, LiteGraph.BYPASS),
        },
        {
            id: "litegraph.node.toggleMute",
            label: (ctx) => nodePinChecked(ctx.node?.mode === LiteGraph.NEVER, "Mute (Never)"),
            category: "node",
            when: nodePinHasNodes,
            run: (ctx) => toggleNodesMode(ctx, LiteGraph.NEVER),
        },
        {
            id: "litegraph.node.collapse",
            label: (ctx) => (ctx.node?.flags?.collapsed ? "Expand" : "Collapse"),
            category: "node",
            when: nodePinHasNodes,
            run(ctx) {
                for (const node of nodePinTargets(ctx)) node.collapse();
                ctx.canvas?.setDirty?.(true, true);
                return true;
            },
        },
        {
            id: "litegraph.node.run",
            label: "Run now",
            category: "node",
            when: (ctx) => nodePinHasNodes(ctx) && nodePinTargets(ctx).some((node) => node.onExecute),
            /** runs each node's onExecute as one event entry (its ON_REQUEST inputs pulled first under ancestors) */
            run(ctx) {
                const engine = LiteGraph.ExecutionEngine;
                for (const node of nodePinTargets(ctx)) {
                    if (!node.onExecute || !node.graph) continue;
                    node._dispatchEvent(() => {
                        if (engine?.rulesFor(node.graph).refresh === "ancestors") engine.pull(node);
                        node.doExecute(undefined, { action_call: `${node.id}_run_${LiteGraph.uuidv4()}` });
                    });
                }
                ctx.canvas?.setDirty?.(true, true);
                return true;
            },
        },
        {
            id: "litegraph.node.info",
            label: "Info…",
            category: "node",
            when: (ctx) => !!ctx.node && typeof ctx.canvas?.openNodePanel === "function",
            run: (ctx) => { ctx.canvas.openNodePanel(ctx.node); return true; },
        },
    ],
    keybindings: [
        { combo: "ctrl+b", commandId: "litegraph.node.toggleBypass" },
        { combo: "ctrl+m", commandId: "litegraph.node.toggleMute" },
    ],
    setup(ctx) {
        ctx.addDisposer(LiteGraph.registerNodePinStyle("modes", modesPinStyle));
        ctx.menus.register("node-pin", (menuCtx) => {
            const node = menuCtx.node;
            if (!node) return [];
            const valid = LiteGraph.getValidNodeModes?.(node) ?? LiteGraph.NODE_MODES.map((_, mode) => mode);
            return [
                {
                    content: `Mode: ${LiteGraph.NODE_MODES[node.mode] ?? node.mode}`,
                    has_submenu: true,
                    callback: (_value, _options, e, menu) => {
                        const items = valid.map((mode) => ({ content: nodePinChecked(node.mode === mode, LiteGraph.NODE_MODES[mode]), mode }));
                        LiteGraph.ContextMenu(items, {
                            event: e,
                            parentMenu: menu,
                            callback: (item) => item && setNodesMode(menuCtx, nodePinTargets(menuCtx), item.mode),
                        });
                        return false;
                    },
                },
                { command: "litegraph.node.toggleBypass" },
                { command: "litegraph.node.toggleMute" },
                null,
                { command: "litegraph.rename" },
                { command: "litegraph.node.collapse" },
                { command: "litegraph.node.run" },
                { command: "litegraph.node.info" },
            ];
        });
    },
};

/** Registers the extension once (the full bundles and the editor load it). */
export function registerExtension_nodePin(graphcanvas) {
    if (!LiteGraph.extensions?.has(nodePinExtension.name)) LiteGraph.registerExtension(nodePinExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_nodePin();
