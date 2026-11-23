import { LiteGraph } from "../litegraph.js";

/**
 * The graph's own mode on the canvas: a chip at the top left with the document's execution model
 * (`ancestors`, `step`, ...) and whether the graph runs. Clicking it opens a menu to switch the model
 * (one undo step, graph.setExecutionModel) or to start and stop the graph.
 * Shown when the setting LiteGraph.Canvas.GraphStatus is on (off by default; the Editor turns it on).
 */

export const GRAPH_STATUS_SETTING = "LiteGraph.Canvas.GraphStatus";

const GRAPH_STATUS_PAD = 8;
const GRAPH_STATUS_HEIGHT = 22;

const graphStatusRoot = (canvas) => canvas?.graph?.rootGraph ?? canvas?.graph ?? null;
const graphStatusRunning = (graph) => graph?.status === (graph?.constructor?.STATUS_RUNNING ?? 2);

/** the chip's text: the model title (or name) */
export function graphStatusLabel(graph) {
    const engine = LiteGraph.ExecutionEngine;
    const name = engine?.modelNameFor(graph) ?? "legacy";
    const model = engine?.getModel(name);
    return model?.title ?? name;
}

function graphStatusEnabled() {
    try {
        return !!LiteGraph.settings?.get(GRAPH_STATUS_SETTING);
    } catch {
        return false;
    }
}

/** draws the chip in screen space and remembers where it is (canvas._graph_status_rect) */
export function drawGraphStatus(canvas, ctx) {
    canvas._graph_status_rect = null;
    const graph = graphStatusRoot(canvas);
    if (!graph || !graphStatusEnabled()) return;
    const running = graphStatusRunning(graph);
    const text = graphStatusLabel(graph);
    ctx.save();
    ctx.font = "12px Arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const width = (ctx.measureText?.(text)?.width ?? text.length * 6) + GRAPH_STATUS_PAD * 2 + 14;
    // below the subgraph breadcrumb when there is one
    const x = 10;
    const y = canvas._graph_stack?.length ? 56 : 10;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#222";
    ctx.strokeStyle = running ? "#5c5" : "#555";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, width, GRAPH_STATUS_HEIGHT, 6);
    else ctx.rect(x, y, width, GRAPH_STATUS_HEIGHT);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = running ? "#5c5" : "#888";
    ctx.beginPath();
    ctx.arc(x + GRAPH_STATUS_PAD + 4, y + GRAPH_STATUS_HEIGHT * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ddd";
    ctx.fillText(text, x + GRAPH_STATUS_PAD + 14, y + GRAPH_STATUS_HEIGHT * 0.5 + 1);
    ctx.restore();
    canvas._graph_status_rect = [x, y, width, GRAPH_STATUS_HEIGHT];
}

/** the menu the chip opens: the models (current one checked), then Start or Stop */
export function graphStatusMenu(canvas) {
    const graph = graphStatusRoot(canvas);
    const engine = LiteGraph.ExecutionEngine;
    if (!graph || !engine) return [];
    const current = engine.modelNameFor(graph);
    const items = engine.listModels().map((model) => ({
        content: `${model.name === current ? "✓ " : ""}${model.title ?? model.name}`,
        callback: () => {
            if (model.name !== current) graph.setExecutionModel(model.name);
            canvas.setDirty(true, true);
        },
    }));
    items.push(null, graphStatusRunning(graph)
        ? { content: "Stop", callback: () => { graph.stop(); canvas.setDirty(true, true); } }
        : { content: "Start", callback: () => { graph.start(); canvas.setDirty(true, true); } });
    return items;
}

/** true when a canvas-relative CSS position is on the chip */
export function isOverGraphStatus(canvas, x, y) {
    const rect = canvas?._graph_status_rect;
    return !!rect && x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3];
}

export const graphStatusExtension = {
    name: "litegraph.graph_status",
    setup(ctx) {
        // the Editor may have defined it first, with its own default
        if (!ctx.host.settings?.has?.(GRAPH_STATUS_SETTING)) {
            ctx.settings.define({ id: GRAPH_STATUS_SETTING, name: "Show the graph's execution model and run state on the canvas", default: false });
        }
        ctx.onCanvas((canvas, canvasCtx) => {
            canvasCtx.on("onDrawOverlay", (_info, c2d) => drawGraphStatus(canvas, c2d));
            canvasCtx.on("onMouse", (_info, e) => {
                if (e?.button !== undefined && e.button !== 0) return undefined;
                const [x, y] = canvas.last_mouse_position ?? [];
                if (!isOverGraphStatus(canvas, x, y)) return undefined;
                LiteGraph.ContextMenu(graphStatusMenu(canvas), { event: e, title: "Execution model" });
                return false; // handled: the canvas does not start a gesture
            });
        });
    },
};

/** Registers the extension once (the full bundles and the editor load it). */
export function registerExtension_graphStatus(graphcanvas) {
    if (!LiteGraph.extensions?.has(graphStatusExtension.name)) LiteGraph.registerExtension(graphStatusExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_graphStatus();
