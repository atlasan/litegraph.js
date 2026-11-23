import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphNode } from '../src/lgraphnode.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
});
afterEach(() => jest.restoreAllMocks());

function deferredLibrary() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    const load = jest.spyOn(LiteGraph.LibraryManager, 'loadLibrary').mockReturnValue(promise);
    return { resolve, reject, load };
}

function register(type, Class) {
    LiteGraph.registerNodeType(type, Class);
    return LiteGraph.createNode(type);
}

test('standalone nodes initialize synchronously once with independent defaults', async () => {
    class Empty { onPostConstruct() { this.calls = (this.calls || 0) + 1; } }
    const first = register('lifecycle/empty', Empty);
    const second = LiteGraph.createNode('lifecycle/empty');
    expect(first.initialization_state).toBe('ready');
    expect(first.id).toBe(-1);
    expect(first.inputs).toEqual([]);
    first.pos[0] = 123;
    first.size[0] = 321;
    expect(second.pos[0]).not.toBe(123);
    expect(second.size[0]).not.toBe(321);
    const promise = first.ready;
    expect(first.post_constructor()).toBe(promise);
    await promise;
    expect(first.calls).toBe(1);
});

test('subclass initialization runs after its fields and preserves constructor callbacks', async () => {
    const callback = jest.fn();
    class Child extends LGraphNode {
        label = 'subclass field';
        constructor() {
            super('Child');
            this.registerCallbackHandler('onPostConstruct', callback);
        }
        onPostConstruct() { this.observed = this.label; }
    }
    const node = register('lifecycle/child', Child);
    await node.ready;
    expect(node.observed).toBe('subclass field');
    expect(callback).toHaveBeenCalledTimes(1);
    const direct = new Child();
    await direct.ready;
    expect(direct.observed).toBe('subclass field');
    expect(callback).toHaveBeenCalledTimes(2);
});

test('node loading blocks execution and actions until both dependency lists resolve', async () => {
    const library = deferredLibrary();
    class Dependent {
        constructor() { this.libraries = ['test-lib']; this.requiredLibraries = ['test-lib']; }
        onExecute() { this.executions = (this.executions || 0) + 1; }
        onAction() { this.actions = (this.actions || 0) + 1; }
    }
    const node = register('lifecycle/dependent', Dependent);
    const graph = new LGraph();
    graph.add(node);
    graph.runStep();
    node.actionDo('input');
    expect(node.executions).toBeUndefined();
    expect(node.actions).toBeUndefined();
    expect(node.loading_lib).toBe(true);
    library.resolve([]);
    await graph.whenReady();
    expect(library.load).toHaveBeenCalledTimes(1);
    expect(node.loading_lib).toBe(false);
    graph.runStep();
    node.actionDo('input');
    expect(node.executions).toBe(1);
    expect(node.actions).toBe(1);
    graph.clear();
});

test('dependency failures are observable and prevent start', async () => {
    const library = deferredLibrary();
    class Dependent { constructor() { this.libraries = ['missing']; } }
    const node = register('lifecycle/failure', Dependent);
    const graph = new LGraph();
    graph.add(node);
    const start = graph.start();
    jest.spyOn(LiteGraph, 'log_error').mockImplementation(() => {});
    library.reject(new Error('missing dependency'));
    await expect(node.ready).rejects.toThrow('missing dependency');
    await expect(start).rejects.toThrow('missing dependency');
    expect(graph.status).toBe(LGraph.STATUS_STOPPED);
    expect(node.loading_lib).toBe(false);
    expect(node.initialization_state).toBe('error');
    graph.clear();
});

test.each(['stop', 'clear'])('%s cancels a start waiting on libraries', async (command) => {
    const library = deferredLibrary();
    class Dependent {
        constructor() { this.libraries = ['slow']; }
        onStart() { throw new Error('must not start'); }
    }
    const graph = new LGraph();
    graph.add(register('lifecycle/cancel', Dependent));
    const start = graph.start();
    graph[command]();
    library.resolve([]);
    expect(await start).toBe(false);
    expect(graph.status).toBe(LGraph.STATUS_STOPPED);
    graph.clear();
});

test('start waits for dependencies before onStart and stops cleanly', async () => {
    const library = deferredLibrary();
    const started = jest.fn();
    class Dependent {
        constructor() { this.libraries = ['slow']; }
        onStart() { started(); }
    }
    const graph = new LGraph();
    graph.add(register('lifecycle/start', Dependent));
    const start = graph.start(100);
    expect(started).not.toHaveBeenCalled();
    library.resolve([]);
    try {
        expect(await start).toBe(true);
        expect(started).toHaveBeenCalledTimes(1);
        expect(graph.status).toBe(LGraph.STATUS_RUNNING);
    } finally { graph.clear(); }
});

test('unsupported runtime creates an inspectable disabled node with rejected readiness', async () => {
    class BrowserNode { constructor() { this.executionEnvironment = 'browser'; } }
    const node = register('lifecycle/browser', BrowserNode);
    expect(node).not.toBeNull();
    expect(node.mode).toBe(LiteGraph.NEVER);
    expect(node.wrong_environment).toBe(true);
    await expect(node.ready).rejects.toThrow('cannot run in node');
});

test('reinitializing LiteGraph preserves registered dependencies', () => {
    const manager = LiteGraph.LibraryManager;
    manager.registerLibrary({ key: 'preserved', server: { npm: 'node:path' } });
    LiteGraph.initialize();
    expect(LiteGraph.LibraryManager).toBe(manager);
    expect(manager.libraries_known.preserved).toBeDefined();
});

test('failed start hooks leave the graph stopped and reject async startup', async () => {
    class BrokenStart { onStart() { throw new Error('start hook failed'); } }
    const graph = new LGraph();
    graph.add(register('lifecycle/broken-start', BrokenStart));
    jest.spyOn(LiteGraph, 'log_error').mockImplementation(() => {});
    await expect(graph.startAsync(100)).rejects.toThrow('start hook failed');
    expect(graph.status).toBe(LGraph.STATUS_STOPPED);
    expect(graph.execution_timer_id).toBeFalsy();
    graph.clear();
});

test('stop releases the timer even if a stop callback throws', () => {
    const graph = new LGraph();
    graph.start(100);
    graph.onStopEvent = () => { throw new Error('stop hook failed'); };
    expect(() => graph.stop()).toThrow('stop hook failed');
    expect(graph.execution_timer_id).toBeNull();
    expect(graph.status).toBe(LGraph.STATUS_STOPPED);
    graph.clear();
});

test('clear detaches nodes after invoking removal with the original graph', () => {
    const graph = new LGraph();
    const node = new LGraphNode();
    const removed = jest.fn();
    node.onRemoved = removed;
    graph.add(node);
    graph.clear();
    expect(removed).toHaveBeenCalledWith(graph);
    expect(node.graph).toBeNull();
});

test('a "node" runtime declaration also runs on Bun; "bun" means Bun only', () => {
    const matches = LGraphNode.runtimeMatches;
    expect(matches(undefined, 'node')).toBe(true);
    expect(matches('all', 'browser')).toBe(true);
    expect(matches('node', 'node')).toBe(true);
    expect(matches('node', 'bun')).toBe(true);
    expect(matches('node', 'browser')).toBe(false);
    expect(matches('bun', 'bun')).toBe(true);
    expect(matches('bun', 'node')).toBe(false);
    expect(matches('browser', 'bun')).toBe(false);
});
