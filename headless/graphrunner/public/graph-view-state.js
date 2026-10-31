// Serialization may retain mutable property references. Keep a detached draft per tab.
export function selectGraphView(viewer, store, currentId, nextId) {
    if (currentId === nextId) return currentId;
    if (currentId && store[currentId] && viewer.graph) {
        store[currentId].serializedGraph = JSON.parse(JSON.stringify(viewer.graph.serialize()));
        store[currentId].readOnly = viewer.editor.read_only;
    }
    viewer.loadGraph(store[nextId].serializedGraph);
    viewer.editor.read_only = store[nextId].readOnly ?? true;
    return nextId;
}
