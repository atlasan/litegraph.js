import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';

// State audit D-5 (graph.triggerInput) and D-6 (graph.executionModel assignment).

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
});
afterEach(() => jest.restoreAllMocks());

class Recorder {
    constructor() { this.addInput('in', 'number'); this.runs = []; }
    onExecute(param) { this.runs.push(param); }
}
LiteGraph.registerNodeType('d5/recorder', Recorder);

class Thrower {
    onExecute() { throw new Error('boom'); }
}
LiteGraph.registerNodeType('d5/thrower', Thrower);

function titled(graph, type, title, mode = LiteGraph.ON_TRIGGER) {
    const node = LiteGraph.createNode(type);
    node.title = title;
    node.mode = mode;
    graph.add(node);
    return node;
}

describe('graph.triggerInput (D-5)', () => {
    test('runs the nodes with that title through the engine, as a trigger does', () => {
        const graph = new LGraph();
        const a = titled(graph, 'd5/recorder', 'go');
        const b = titled(graph, 'd5/recorder', 'go');
        const other = titled(graph, 'd5/recorder', 'stay');
        expect(() => graph.triggerInput('go', 7)).not.toThrow(); // no onTrigger method: it threw a TypeError
        expect(a.runs).toEqual([7]);
        expect(b.runs).toEqual([7]);
        expect(other.runs).toEqual([]);
        expect(a.execution_state?.status).toBe('done');
    });

    test('a NEVER node is not run and the drop is reported', () => {
        const graph = new LGraph();
        const never = titled(graph, 'd5/recorder', 'go', LiteGraph.NEVER);
        const dropped = [];
        graph.events.on('event-dropped', (e) => dropped.push(e.detail.reason));
        graph.triggerInput('go', 1);
        expect(never.runs).toEqual([]);
        expect(dropped).toEqual(['mode']);
    });

    test('an error is reported as node-error, like any event entry', () => {
        LiteGraph.throw_errors = false;
        try {
            const graph = new LGraph();
            const node = titled(graph, 'd5/thrower', 'go');
            const errors = [];
            graph.events.on('node-error', (e) => errors.push(e.detail.node));
            jest.spyOn(LiteGraph, 'log_warn').mockImplementation(() => {});
            graph.triggerInput('go');
            expect(errors).toEqual([node]);
        } finally {
            LiteGraph.throw_errors = true;
        }
    });

    test('a node with its own onTrigger method still gets the value', () => {
        const graph = new LGraph();
        const node = titled(graph, 'd5/recorder', 'go');
        node.onTrigger = jest.fn();
        graph.triggerInput('go', 3);
        expect(node.onTrigger).toHaveBeenCalledWith(3);
        expect(node.runs).toEqual([]);
    });
});

describe('graph.executionModel assignment (D-6)', () => {
    test('assigning the model sets it, as setExecutionModel does', () => {
        const graph = new LGraph();
        graph.executionModel = 'step';
        expect(graph.executionModel).toBe('step');
        expect(graph.config.execution).toBe('step');
    });

    test('an unknown model throws instead of being ignored', () => {
        const graph = new LGraph();
        expect(() => { graph.executionModel = 'nope'; }).toThrow(/nope/);
        expect(graph.executionModel).toBe('ancestors');
    });
});
