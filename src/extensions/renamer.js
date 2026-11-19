import { LiteGraph } from "../litegraph.js";

/**
 * F2 renames the selected nodes, or the group under the pointer when nothing is selected.
 * Registered as the "litegraph.renamer" extension: command `litegraph.rename`, key F2.
 * Each rename is one undo step.
 */
export const renamerExtension = {
    name: "litegraph.renamer",
    commands: [{
        id: "litegraph.rename",
        label: "Rename",
        category: "edit",
        when: (ctx) => !!ctx.canvas?.graph,
        run(ctx) {
            const graphcanvas = ctx.canvas;
            const graph = graphcanvas.graph;
            const selected = Object.values(graphcanvas.selected_nodes ?? {});

            // the prompt is placed from the event: use the pointer position inside the editor area
            const mouseCoord = graphcanvas.getMouseCoordinates();
            const gloCoord = graphcanvas.convertOffsetToEditorArea(mouseCoord);
            // a native KeyboardEvent has no coordinates of its own: set them on the event itself
            const promptEvent = Object.assign(ctx.event ?? {}, { clientX: gloCoord[0], clientY: gloCoord[1] });

            if (selected.length) {
                const current = selected.length == 1 ? selected[0].title : "titleForMany";
                graphcanvas.prompt("Title", current, (title) => {
                    graph.transact("rename", () => {
                        for (const node of selected) node.title = title;
                        graph.onGraphChanged({ action: "rename" });
                    });
                }, promptEvent);
                return true;
            }
            const group = graph.getGroupOnPos(mouseCoord[0], mouseCoord[1]);
            if (group) {
                graphcanvas.prompt("Title", group.title, (title) => {
                    graph.transact("renameGroup", () => {
                        group.title = title;
                        graph.onGraphChanged({ action: "renameGroup" });
                    });
                }, promptEvent);
                return true;
            }
            return false;
        },
    }],
    keybindings: [{ combo: "f2", commandId: "litegraph.rename" }],
};

/**
 * Registers the renamer extension once. Kept for code that called it per canvas: every canvas
 * is covered by the extension registry, so the canvas argument is only attached if unknown.
 * @param {object} [graphcanvas]
 */
export function registerExtension_renamer(graphcanvas) {
    if (!LiteGraph.extensions?.has(renamerExtension.name)) LiteGraph.registerExtension(renamerExtension);
    if (graphcanvas) LiteGraph.extensions.attachCanvas(graphcanvas);
}

registerExtension_renamer();
