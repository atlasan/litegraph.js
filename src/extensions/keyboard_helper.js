import { LiteGraph } from "../litegraph.js";

/**
 * Keyboard navigation and editing for the selection, as commands with default key bindings:
 *
 * | keys                  | command                                   |
 * |-----------------------|-------------------------------------------|
 * | arrows                | move the selected nodes one grid step     |
 * | shift+arrowright      | search a node to connect after the first selected one |
 * | ctrl+arrowright       | connection menu from its first output     |
 * | ctrl(+shift)+arrowup/down | select (add) the previous/next sibling sharing its first input |
 * | tab / shift+tab       | select the next/previous connected node   |
 * | f                     | center on the selection (or recenter)     |
 *
 * Moves are undoable: holding an arrow key is one undo step per key press.
 */

const hasSelection = (ctx) => !!ctx.canvas?.graph && ctx.selectedNodes?.length > 0;
const hasAnySelection = (ctx) => !!ctx.canvas?.graph && (ctx.selectedItems ?? ctx.selectedNodes)?.length > 0;
const first = (ctx) => ctx.selectedNodes[0];

/** moves the whole selection (nodes, groups, reroutes) one grid step; nodes snap to the grid first */
function moveSelection(ctx, dx, dy) {
    const grid = LiteGraph.CANVAS_GRID_SIZE;
    for (const node of ctx.selectedNodes) node.alignToGrid();
    if (typeof ctx.canvas.moveSelected === "function") {
        ctx.canvas.moveSelected(dx * grid, dy * grid);
        return;
    }
    for (const node of ctx.selectedNodes) {
        node.pos[0] += dx * grid;
        node.pos[1] += dy * grid;
        node.processCallbackHandlers("onMoved", { def_cb: node.onMoved });
    }
    ctx.graph.onGraphChanged({ action: "keyboardMove" });
    ctx.canvas.setDirty(true, true);
}

/** place the key event next to a node, for the search box / connection menu (they read its coordinates) */
function eventBeside(ctx, node) {
    const editorPos = ctx.canvas.convertOffsetToEditorArea(node.pos);
    // a native KeyboardEvent has no coordinates of its own: set them on the event itself
    return Object.assign(ctx.event ?? {}, {
        clientX: editorPos[0] + node.size[0] + 33,
        clientY: editorPos[1],
        canvasX: node.pos[0] + node.size[0] + 33,
        canvasY: node.pos[1],
    });
}

/** sibling sharing the first input's source node, in output order; step -1 = previous */
function siblingOf(node, step) {
    const parent = node.inputs?.length ? node.getInputNode(0) : null;
    if (!parent) return null;
    const siblings = [];
    for (let slot = 0; slot < (parent.outputs?.length ?? 0); slot++) {
        for (const other of parent.getOutputNodes(slot) ?? []) siblings.push(other);
    }
    const index = siblings.findIndex((other) => other.id === node.id);
    return index === -1 ? null : siblings[index + step] ?? null;
}

function selectSibling(ctx, step) {
    const sibling = siblingOf(first(ctx), step);
    if (!sibling) return;
    if (ctx.event?.shiftKey) ctx.canvas.selectNode(sibling, true);
    else ctx.canvas.selectNodes([sibling]);
}

const move = (id, label, dx, dy, combo) => ({
    command: { id, label, category: "selection", when: hasAnySelection, mutatesGraph: true, run: (ctx) => moveSelection(ctx, dx, dy) },
    binding: { combo, commandId: id, allowRepeat: true },
});

const moves = [
    move("litegraph.selection.moveLeft", "Move selection left", -1, 0, "arrowleft"),
    move("litegraph.selection.moveRight", "Move selection right", 1, 0, "arrowright"),
    move("litegraph.selection.moveUp", "Move selection up", 0, -1, "arrowup"),
    move("litegraph.selection.moveDown", "Move selection down", 0, 1, "arrowdown"),
];

export const keyboardHelperExtension = {
    name: "litegraph.keyboard_helper",
    commands: [
        ...moves.map((entry) => entry.command),
        {
            id: "litegraph.selection.searchAfter",
            label: "Add a node after the selection (search)",
            category: "selection",
            when: (ctx) => hasSelection(ctx) && !!first(ctx).outputs?.[0],
            run(ctx) {
                const node = first(ctx);
                ctx.canvas.showSearchBox(eventBeside(ctx, node), { node_from: node, slot_from: node.outputs[0], type_filter_in: node.outputs[0].type });
            },
        },
        {
            id: "litegraph.selection.connectionMenuAfter",
            label: "Connection menu from the selection",
            category: "selection",
            when: (ctx) => hasSelection(ctx) && !!first(ctx).outputs?.[0],
            run(ctx) {
                const node = first(ctx);
                ctx.canvas.showConnectionMenu({ nodeFrom: node, slotFrom: node.outputs[0], e: eventBeside(ctx, node), isCustomEvent: true });
            },
        },
        { id: "litegraph.selection.previousSibling", label: "Select previous sibling", category: "selection", when: hasSelection, run: (ctx) => selectSibling(ctx, -1) },
        { id: "litegraph.selection.nextSibling", label: "Select next sibling", category: "selection", when: hasSelection, run: (ctx) => selectSibling(ctx, 1) },
        {
            id: "litegraph.selection.nextConnected",
            label: "Select the next connected node",
            category: "selection",
            when: hasSelection,
            run(ctx) {
                const next = first(ctx).outputs?.[0]?.links?.length ? first(ctx).getOutputNodes(0)?.[0] : null;
                if (next) ctx.canvas.selectNodes([next]);
            },
        },
        {
            id: "litegraph.selection.previousConnected",
            label: "Select the previous connected node",
            category: "selection",
            when: hasSelection,
            run(ctx) {
                const previous = first(ctx).inputs?.[0]?.link != null ? first(ctx).getInputNode(0) : null;
                if (previous) ctx.canvas.selectNodes([previous]);
            },
        },
        {
            id: "litegraph.selection.group",
            label: "Group selected",
            category: "selection",
            when: (ctx) => hasAnySelection(ctx) && typeof ctx.canvas.groupSelected === "function",
            run: (ctx) => ctx.canvas.groupSelected(),
        },
        {
            id: "litegraph.view.focus",
            label: "Center on selection",
            category: "view",
            when: (ctx) => !!ctx.canvas?.graph,
            run(ctx) {
                if (ctx.selectedNodes?.length) ctx.canvas.centerOnNode(first(ctx));
                else ctx.canvas.recenter();
            },
        },
    ],
    keybindings: [
        ...moves.map((entry) => entry.binding),
        { combo: "shift+arrowright", commandId: "litegraph.selection.searchAfter" },
        { combo: "ctrl+arrowright", commandId: "litegraph.selection.connectionMenuAfter" },
        { combo: "ctrl+arrowup", commandId: "litegraph.selection.previousSibling" },
        { combo: "ctrl+shift+arrowup", commandId: "litegraph.selection.previousSibling" },
        { combo: "ctrl+arrowdown", commandId: "litegraph.selection.nextSibling" },
        { combo: "ctrl+shift+arrowdown", commandId: "litegraph.selection.nextSibling" },
        { combo: "tab", commandId: "litegraph.selection.nextConnected", allowRepeat: true },
        { combo: "shift+tab", commandId: "litegraph.selection.previousConnected", allowRepeat: true },
        { combo: "f", commandId: "litegraph.view.focus" },
        { combo: "ctrl+g", commandId: "litegraph.selection.group" },
    ],
};

/** Registers the extension once (kept for code that called it per canvas). */
export function registerExtension_keyhelper(graphcanvas) {
    if (!LiteGraph.extensions?.has(keyboardHelperExtension.name)) LiteGraph.registerExtension(keyboardHelperExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_keyhelper();
