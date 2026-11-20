import { LiteGraph } from "../litegraph.js";

/**
 * Missing nodes and replacements in the UI: commands, a node menu entry and a report panel.
 * - `litegraph.nodes.showMissing`: the missing-nodes panel for the open document.
 * - `litegraph.nodes.replaceMissing`: replaces every missing node that has a usable replacement
 *   (a registered mapping, or its own type registered since loading), one undo step per graph.
 * - `litegraph.nodes.replace`: replaces the node the menu was opened on (or the one selected node).
 * The Editor opens the panel when a loaded document has missing nodes.
 */

const escapeHtml = (value) => String(value ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&#39;" })[c]);

/** the node a command applies to: the menu's node, else the one selected node */
const targetNode = (ctx) => ctx.node ?? (ctx.selectedNodes?.length === 1 ? ctx.selectedNodes[0] : null);

/** the mapping replacing `node` would use when its target type is registered, else null */
function usableReplacement(node) {
    const mapping = node?.graph?._replacementFor?.(node);
    return mapping && LiteGraph.registered_node_types[mapping.new_type] ? mapping : null;
}

const rootOf = (ctx) => ctx.graph?.rootGraph ?? ctx.graph ?? null;
const replaceableCount = (report) => report.filter((entry) => entry.available || entry.replacement?.available).reduce((n, entry) => n + entry.count, 0);

/**
 * Shows the missing-nodes report of `graph` (default: the canvas root graph) in a canvas panel,
 * with a button that replaces the nodes that can be replaced.
 * @returns {HTMLElement|null} the panel, or null when there is no DOM or nothing is missing
 */
export function showMissingNodesPanel(canvas, graph = canvas?.graph?.rootGraph ?? canvas?.graph, report = graph?.getMissingNodes?.() ?? []) {
    if (!canvas?.canvas?.parentNode || typeof document === "undefined" || !report.length) return null;
    canvas.closePanels?.();
    const panel = canvas.createPanel("Missing nodes", { closable: true, window: canvas.getCanvasWindow?.() });
    panel.id = "missing-nodes-panel";
    panel.classList.add("settings");
    const describe = (entry) => {
        const pack = entry.pack
            ? `${escapeHtml(entry.pack.id)}${entry.pack.version ? "@" + escapeHtml(entry.pack.version) : ""} <i>(${escapeHtml(entry.pack.source === "stamp" ? "saved with the node" : entry.pack.source === "index" ? (entry.pack.installed ? "installed, not active" : "known pack, not installed") : "ComfyUI pack")})</i>`
            : "<i>unknown pack</i>";
        const fix = entry.available
            ? "registered now: can be rebuilt"
            : entry.replacement
                ? `replace with <b>${escapeHtml(entry.replacement.type)}</b>${entry.replacement.available ? "" : " (not registered)"}${entry.replacement.reason ? ` · ${escapeHtml(entry.replacement.reason)}` : ""}`
                : "no replacement";
        const where = entry.nodes.map((n) => escapeHtml(n.path)).join(", ");
        return `<div class='property missing-node'><span class='property_name'>${escapeHtml(entry.type)} ×${entry.count}</span>`
            + `<span class='property_value'>${pack}<br>${fix}<br><small>nodes ${where}</small></span></div>`;
    };
    const refresh = (current) => {
        panel.content.innerHTML = "";
        if (!current.length) {
            panel.addHTML("<span class='node_desc'>No missing nodes.</span>");
            return;
        }
        panel.addHTML(`<span class='node_desc'>${current.length} missing type${current.length > 1 ? "s" : ""}. The nodes are kept as they were saved, so nothing is lost when you save.</span><span class='separator'></span>`);
        for (const entry of current) panel.addHTML(describe(entry));
    };
    refresh(report);
    const count = replaceableCount(report);
    if (count) {
        const button = panel.addButton(`Replace ${count} node${count > 1 ? "s" : ""}`, () => {
            const result = graph.replaceNodes();
            canvas.setDirty?.(true, true);
            refresh(graph.getMissingNodes());
            const dropped = result.replaced.flatMap((r) => r.dropped.map((d) => `${escapeHtml(r.path)} ${d.kind} ${escapeHtml(d.name ?? d.slot)}`));
            panel.addHTML(`<span class='separator'></span><span class='node_desc'>Replaced ${result.replaced.length} node${result.replaced.length === 1 ? "" : "s"} (undo restores them).`
                + (dropped.length ? ` Links the replacement has no slot for were removed: ${dropped.join(", ")}.` : "") + "</span>");
            button.remove?.();
        });
    }
    canvas.canvas.parentNode.appendChild(panel);
    return panel;
}

export const nodePacksExtension = {
    name: "litegraph.node_packs",
    settings: [
        { id: "LiteGraph.Nodes.ShowMissingOnLoad", name: "Show the missing-nodes panel when a document with missing node types loads (Editor)", default: true },
    ],
    commands: [
        {
            id: "litegraph.nodes.showMissing",
            label: "Show missing nodes",
            category: "nodes",
            when: (ctx) => !!ctx.canvas && (rootOf(ctx)?.getMissingNodes().length ?? 0) > 0,
            run(ctx) { return !!showMissingNodesPanel(ctx.canvas, rootOf(ctx)); },
        },
        {
            id: "litegraph.nodes.replaceMissing",
            label: "Replace missing nodes",
            category: "nodes",
            when: (ctx) => replaceableCount(rootOf(ctx)?.getMissingNodes() ?? []) > 0,
            run(ctx) {
                const result = rootOf(ctx).replaceNodes();
                ctx.canvas?.setDirty?.(true, true);
                return result;
            },
        },
        {
            id: "litegraph.nodes.replace",
            label: (ctx) => {
                const mapping = usableReplacement(targetNode(ctx));
                return mapping ? (mapping.new_type === mapping.old_type ? `Rebuild as ${mapping.new_type}` : `Replace with ${mapping.new_type}`) : "Replace node";
            },
            category: "nodes",
            when: (ctx) => !!usableReplacement(targetNode(ctx)),
            run(ctx) {
                const node = targetNode(ctx);
                const result = node.graph.replaceNode(node);
                ctx.canvas?.setDirty?.(true, true);
                return result;
            },
        },
    ],
    setup(ctx) {
        ctx.menus.register("node", (menuCtx) => usableReplacement(menuCtx.node) ? [null, { command: "litegraph.nodes.replace" }] : []);
    },
};

/** Registers the extension once (the full bundles and the editor load it). */
export function registerExtension_nodePacks(graphcanvas) {
    if (!LiteGraph.extensions?.has(nodePacksExtension.name)) LiteGraph.registerExtension(nodePacksExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_nodePacks();
