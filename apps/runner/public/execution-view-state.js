// Execution states streamed by a runner worker (`execution_state {graphId, message}`, protocol v1),
// kept per graph so the page can draw them on the current view and again after a tab switch.

/** Records one message for a graph; a reset forgets the graph's states. */
export function recordExecutionState(store, graphId, message) {
    const entry = store[graphId];
    if (!entry || !message || typeof message !== 'object') return false;
    if (message.kind === 'reset') {
        entry.executionStates = {};
        return true;
    }
    if (message.path == null) return false;
    entry.executionStates ??= {};
    // progress is drawn next to the status, so it is kept apart
    entry.executionStates[`${message.path}|${message.kind === 'progress' ? 'progress' : 'state'}`] = message;
    return true;
}

/** Applies a graph's recorded states to a loaded view graph; returns how many reached a node. */
export function applyExecutionStates(graph, entry) {
    if (typeof graph?.applyExecutionState !== 'function' || !entry?.executionStates) return 0;
    let applied = 0;
    for (const message of Object.values(entry.executionStates)) if (graph.applyExecutionState(message)) applied++;
    return applied;
}
