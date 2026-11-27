import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphNode } from '../src/lgraphnode.js';

beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const add = (graph) => { const node = new LGraphNode(); graph.add(node); return node; };

test('stopAsync waits for every registered/default hook, including overridden return values', async () => {
    const graph = new LGraph();
    const node = add(graph);
    const first = deferred(); const second = deferred(); const third = deferred();
    node.registerCallbackHandler('onStop', () => first.promise);
    node.registerCallbackHandler('onStop', () => second.promise);
    node.onStop = () => third.promise;
    graph.start(100);
    let completed = false;
    const stopped = graph.stopAsync().then(() => { completed = true; });
    first.resolve(); third.resolve();
    await Promise.resolve(); await Promise.resolve();
    expect(completed).toBe(false);
    expect(graph.execution_timer_id).toBeNull();
    second.resolve();
    await stopped;
    expect(completed).toBe(true);
    await graph.clearAsync();
});

test('clearAsync waits for cleanup after structural removal and reports all failures', async () => {
    const graph = new LGraph();
    const first = add(graph); const second = add(graph);
    const cleanup = deferred();
    first.onRemoved = () => { throw new Error('synchronous failure'); };
    second.onRemoved = () => cleanup.promise;
    const cleared = graph.clearAsync();
    const expectation = expect(cleared).rejects.toBeInstanceOf(AggregateError);
    expect(graph._nodes).toEqual([]);
    expect(second.graph).toBeNull();
    cleanup.reject(new Error('asynchronous failure'));
    await expectation;
    expect(graph.cleanup_error.message).toBe('asynchronous failure');
});

test('start waits for pending shutdown and removeAsync awaits removal', async () => {
    const graph = new LGraph(); const node = add(graph);
    const stop = deferred(); const remove = deferred();
    node.onStop = () => stop.promise; node.onRemoved = () => remove.promise;
    node.onStart = jest.fn();
    graph.start(100); graph.stop();
    const started = graph.startAsync(100);
    await Promise.resolve();
    expect(node.onStart).toHaveBeenCalledTimes(1);
    stop.resolve();
    await started;
    expect(node.onStart).toHaveBeenCalledTimes(2);
    const removed = graph.removeAsync(node);
    remove.resolve(); await removed;
    await graph.clearAsync();
});

test('parent cleanup awaits disabled nested graph resources', async () => {
    const graph = new LGraph();
    const sub = LiteGraph.createNode('graph/subgraph'); graph.add(sub);
    const child = add(sub.subgraph); const cleanup = deferred();
    child.onStop = () => cleanup.promise;
    graph.start(100); sub.enabled = false;
    let done = false;
    const cleared = graph.clearAsync().then(() => { done = true; });
    await Promise.resolve(); expect(done).toBe(false);
    cleanup.resolve(); await cleared;
    expect(done).toBe(true);
});

test('a prior idle observation cannot hide cleanup initiated in the same turn', async () => {
    const graph = new LGraph(); const node = add(graph);
    const cleanup = deferred(); node.onRemoved = () => cleanup.promise;
    const idle = graph.whenIdle();
    let done = false;
    const removed = graph.removeAsync(node).then(() => { done = true; });
    await idle; await Promise.resolve();
    expect(done).toBe(false);
    cleanup.resolve(); await removed;
});

test('cleanup queued while another cleanup is pending is included', async () => {
    const graph = new LGraph(); const first = add(graph); const second = add(graph);
    const a = deferred(); const b = deferred();
    first.onRemoved = () => a.promise; second.onRemoved = () => b.promise;
    const removedA = graph.removeAsync(first);
    const removedB = graph.removeAsync(second);
    let done = false; removedB.then(() => { done = true; });
    a.resolve(); await Promise.resolve(); expect(done).toBe(false);
    b.resolve(); await Promise.all([removedA, removedB]);
});

test('manual starts wait for cleanup and run only the steps supplied by the host', async () => {
    const graph = new LGraph();
    const node = add(graph);
    const cleanup = deferred();
    node.onExecute = jest.fn();
    node.onStart = jest.fn();
    node.onStop = jest.fn(() => cleanup.promise);
    graph.updateExecutionOrder();

    graph.start(0, { manual: true });
    expect(graph.status).toBe(LGraph.STATUS_RUNNING);
    expect(graph.execution_timer_id ?? null).toBeNull();
    expect(node.onExecute).not.toHaveBeenCalled();
    graph.runStep();
    expect(node.onExecute).toHaveBeenCalledTimes(1);
    graph.stop();
    expect(node.onStop).toHaveBeenCalledTimes(1);

    const restarted = graph.start(0, { manual: true });
    expect(graph.status).toBe(LGraph.STATUS_STOPPED);
    cleanup.resolve();
    expect(await restarted).toBe(true);
    expect(node.onStart).toHaveBeenCalledTimes(2);
    expect(graph.execution_timer_id ?? null).toBeNull();
    expect(node.onExecute).toHaveBeenCalledTimes(1);
    await graph.stopAsync();
});
