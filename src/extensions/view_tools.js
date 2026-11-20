import { LiteGraph } from "../litegraph.js";

/**
 * View commands: the minimap and the built-in link styles, also in the canvas menu.
 * - `litegraph.layout.auto`: arranges the selection (two or more nodes) or every node with
 *   graph.autoLayout, as one undo step.
 * - `litegraph.canvas.toggleMinimap` (Alt+M): shows or hides the minimap and remembers it in the
 *   setting `LiteGraph.Canvas.Minimap`, so new canvases follow it.
 * - `litegraph.links.spotlight`, `litegraph.links.dimByType`, `litegraph.links.labels`,
 *   `litegraph.links.hidden`: each adds or removes its link style in the setting
 *   `LiteGraph.Canvas.LinkStyles`.
 */

const VIEW_STYLE_COMMANDS = [
    ["spotlight", "litegraph.links.spotlight", "Link spotlight on the selection"],
    ["dim-by-type", "litegraph.links.dimByType", "Dim links of other types while connecting"],
    ["labelled", "litegraph.links.labels", "Link labels"],
    ["hidden", "litegraph.links.hidden", "Hide links of hidden types"],
];

/** true when a link style is active (setting LiteGraph.Canvas.LinkStyles) */
export function isLinkStyleActive(name) {
    const active = LiteGraph.settings?.get("LiteGraph.Canvas.LinkStyles");
    return Array.isArray(active) && active.includes(name);
}

/** adds or removes a link style in the setting; returns whether it is now active */
export function toggleLinkStyle(name, on = !isLinkStyleActive(name)) {
    const active = (LiteGraph.settings.get("LiteGraph.Canvas.LinkStyles") ?? []).filter((entry) => entry !== name);
    if (on) active.push(name);
    LiteGraph.settings.set("LiteGraph.Canvas.LinkStyles", active);
    return on;
}

const viewRedraw = (ctx) => ctx.canvas?.setDirty?.(true, true);

export const viewToolsExtension = {
    name: "litegraph.view_tools",
    commands: [
        {
            id: "litegraph.canvas.toggleMinimap",
            label: (ctx) => (ctx.canvas?.minimap ? "Hide minimap" : "Show minimap"),
            category: "view",
            when: (ctx) => !!ctx.canvas?.canvas,
            run(ctx) {
                const shown = ctx.canvas.toggleMinimap();
                LiteGraph.settings.set("LiteGraph.Canvas.Minimap", shown);
                return shown;
            },
        },
        {
            id: "litegraph.layout.auto",
            label: (ctx) => ((ctx.selectedNodes?.length ?? 0) > 1 ? "Arrange selected nodes" : "Arrange all nodes"),
            category: "view",
            when: (ctx) => !!ctx.graph && ctx.graph._nodes.length > 1 && !ctx.canvas?.read_only,
            /** one undo step; the engine is ctx.engine or the setting LiteGraph.Layout.Engine */
            async run(ctx) {
                const nodes = (ctx.selectedNodes?.length ?? 0) > 1 ? ctx.selectedNodes : undefined;
                try {
                    const result = await ctx.graph.autoLayout({ nodes, engine: ctx.engine });
                    viewRedraw(ctx);
                    return result;
                } catch (error) {
                    LiteGraph.log_error?.("layout", error?.message ?? error);
                    console.error?.(error);
                    return { error: error?.message ?? String(error) };
                }
            },
        },
        ...VIEW_STYLE_COMMANDS.map(([style, id, label]) => ({
            id,
            label: () => `${isLinkStyleActive(style) ? "✓ " : ""}${label}`,
            category: "view",
            run(ctx) {
                const on = toggleLinkStyle(style);
                viewRedraw(ctx);
                return on;
            },
        })),
    ],
    keybindings: [{ combo: "alt+m", commandId: "litegraph.canvas.toggleMinimap" }],
    setup(ctx) {
        ctx.menus.register("canvas", () => [
            null,
            { command: "litegraph.layout.auto" },
            { command: "litegraph.canvas.toggleMinimap" },
            ...VIEW_STYLE_COMMANDS.map(([, id]) => ({ command: id })),
        ]);
        // canvases follow the remembered minimap choice
        ctx.onCanvas((canvas) => {
            if (LiteGraph.settings.get("LiteGraph.Canvas.Minimap")) canvas.showMinimap?.();
        });
    },
};

/** Registers the extension once (the full bundles and the editor load it). */
export function registerExtension_viewTools(graphcanvas) {
    if (!LiteGraph.extensions?.has(viewToolsExtension.name)) LiteGraph.registerExtension(viewToolsExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_viewTools();
