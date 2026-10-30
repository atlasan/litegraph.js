import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphNode } from '../src/lgraphnode.js';

const flags = ['use_deferred_actions', 'ensureNodeSingleExecution', 'ensureNodeSingleAction', 'ensureUniqueExecutionAndActionCall', 'refreshAncestorsOnActions', 'refreshAncestorsOnTriggers', 'preventAncestorRecalculation', 'throw_errors'];
let defaults;
let graphs;
beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });
beforeEach(() => {
    defaults = Object.fromEntries(flags.map((key) => [key, LiteGraph[key]]));
    graphs = [];
    for (const key of flags) LiteGraph[key] = false;
    jest.spyOn(LiteGraph, 'log_warn').mockImplementation(() => {});
});
afterEach(() => {
    for (const graph of graphs) { try { graph.clear(); } catch {} }
    Object.assign(LiteGraph, defaults);
    jest.restoreAllMocks();
});
function graph() { const value = new LGraph(); graphs.push(value); return value; }
function node(g, execute) {
    const value = new LGraphNode();
    if (execute) value.onExecute = execute;
    g.add(value);
    return value;
}

test('single-execution guard includes iteration zero and each requested step advances', () => {
    LiteGraph.ensureNodeSingleExecution = true;
    const g = graph();
    const execute = jest.fn();
    const n = node(g, execute);
    n.doExecute(); n.doExecute();
    expect(execute).toHaveBeenCalledTimes(1);
    g.runStep(3, true);
    expect(g.iteration).toBe(3);
    expect(execute).toHaveBeenCalledTimes(3);
    g.runStep(1, true);
    expect(execute).toHaveBeenCalledTimes(4);
});

test.each([true, false])('execution errors release guards and allow recovery (propagate=%s)', (propagate) => {
    const g = graph();
    const n = node(g, () => { throw new Error('execute failed'); });
    if (propagate) expect(() => g.runStep(1, true)).toThrow('execute failed');
    else g.runStep();
    expect(g.nodes_executing[n.id]).toBeFalsy();
    expect(g.errors_in_execution).toBe(true);
    n.onExecute = jest.fn();
    g.runStep(1, true);
    expect(n.onExecute).toHaveBeenCalledTimes(1);
    expect(g.errors_in_execution).toBe(false);
});

test('actions use their call identity to prevent reentry and release it after failure', () => {
    LiteGraph.ensureNodeSingleAction = true;
    const g = graph();
    const n = node(g);
    let calls = 0;
    n.onAction = (action, value, options) => {
        calls++;
        if (calls < 3) n.actionDo(action, value, options);
        throw new Error('action failed');
    };
    expect(() => n.actionDo('go', 0, { action_call: 'same' })).toThrow('action failed');
    expect(calls).toBe(1);
    expect(g.nodes_actioning[n.id]).toBeFalsy();
    n.onAction = jest.fn();
    n.actionDo('go', 0, { action_call: 'same' });
    expect(n.onAction).toHaveBeenCalledTimes(1);
});

test('deferred actions go through callbacks and retain actions queued during delivery', () => {
    LiteGraph.use_deferred_actions = true;
    const g = graph();
    const source = node(g);
    source.addOutput('event', LiteGraph.EVENT);
    const target = node(g, () => {});
    target.addInput('action', LiteGraph.ACTION);
    source.connect(0, target, 0);
    const calls = [];
    target.onAction = (_action, value) => {
        calls.push(value);
        if (value === 1) source.triggerSlot(0, 2);
    };
    const callback = jest.fn();
    target.registerCallbackHandler('onAction', callback);
    source.triggerSlot(0, 1);
    expect(calls).toEqual([]);
    g.runStep(1, true);
    expect(calls).toEqual([1]);
    expect(callback).toHaveBeenCalledTimes(1);
    g.runStep(1, true);
    expect(calls).toEqual([1, 2]);
    expect(callback).toHaveBeenCalledTimes(2);
});

test('disabled nodes do not receive queued actions', () => {
    const g = graph();
    const n = node(g, () => {});
    n.onAction = jest.fn();
    n._waiting_actions = [['go', 1, {}]];
    n.mode = LiteGraph.NEVER;
    n.executePendingActions();
    expect(n.onAction).not.toHaveBeenCalled();
});

test('ON_REQUEST data ancestors refresh in order and restore event state after exceptions', () => {
    const g = graph();
    const source = node(g, function () { this.setOutputData(0, this.value); });
    source.mode = LiteGraph.ON_REQUEST;
    source.value = 7;
    source.addOutput('value', 'number');
    const transform = node(g, function () { this.setOutputData(0, this.getInputData(0) * 2); });
    transform.mode = LiteGraph.ON_REQUEST;
    transform.addInput('value', 'number'); transform.addOutput('value', 'number');
    const sink = node(g);
    sink.addInput('value', 'number');
    source.connect(0, transform, 0); transform.connect(0, sink, 0);
    sink.refreshAncestors({ param: 0 });
    expect(sink.getInputData(0)).toBe(14);
    source.onExecute = () => { throw new Error('ancestor failed'); };
    expect(() => sink.refreshAncestors()).toThrow('ancestor failed');
    expect(g.ancestorsCall).toBeFalsy();
    expect(g.nodes_executing[source.id]).toBeFalsy();
    source.onExecute = function () { this.setOutputData(0, 9); };
    sink.refreshAncestors();
    expect(sink.getInputData(0)).toBe(18);
});

test('ancestor type filters use slot types', () => {
    const g = graph();
    const a = node(g); a.addOutput('n', 'number');
    const b = node(g); b.addInput('n', 'number');
    a.connect(0, b, 0);
    expect(g.getAncestors(b, { typesOnly: ['number'] })).toEqual([a]);
});

test('stop visits every node and registered hook even when an earlier callback fails', () => {
    const g = graph();
    const first = node(g); first.onStop = () => { throw new Error('first stop failed'); };
    const second = node(g); second.mode = LiteGraph.ON_EVENT;
    second.onStop = jest.fn();
    const third = node(g); const registered = jest.fn();
    third.registerCallbackHandler('onStop', registered);
    g.start(100);
    expect(() => g.stop()).toThrow('first stop failed');
    expect(second.onStop).toHaveBeenCalledTimes(1);
    expect(registered).toHaveBeenCalledTimes(1);
    expect(g.execution_timer_id).toBeNull();
    expect(g.status).toBe(LGraph.STATUS_STOPPED);
});

test('clear detaches every node and clears containers despite cleanup errors', () => {
    const g = graph();
    const first = node(g); first.onRemoved = () => { throw new Error('remove failed'); };
    const second = node(g); second.onRemoved = jest.fn();
    g.start(100);
    g.onStopEvent = () => { throw new Error('stop failed'); };
    expect(() => g.clear()).toThrow();
    expect(second.onRemoved).toHaveBeenCalledTimes(1);
    expect(first.graph).toBeNull(); expect(second.graph).toBeNull();
    expect(g._nodes).toEqual([]);
    expect(g._nodes_by_id).toEqual({});
    expect(g.links).toEqual({});
    expect(g.execution_timer_id).toBeNull();
});

test('remove completes structural removal when its callback fails', () => {
    const g = graph();
    const n = node(g, () => {});
    n.onRemoved = () => { throw new Error('remove failed'); };
    expect(() => g.remove(n)).toThrow('remove failed');
    expect(n.graph).toBeNull();
    expect(g.getNodeById(n.id)).toBeUndefined();
    expect(g._nodes_executable).not.toContain(n);
});

test('nested graphs execute data flow, survive serialization, and stop disabled children', () => {
    const g = graph();
    const sub = LiteGraph.createNode('graph/subgraph');
    g.add(sub);
    class Inner { onExecute() { this.calls = (this.calls || 0) + 1; } }
    LiteGraph.registerNodeType('test/nested-counter', Inner);
    const inner = LiteGraph.createNode('test/nested-counter');
    sub.subgraph.add(inner);
    inner.onStop = jest.fn();
    g.runStep(2, true);
    expect(inner.calls).toBe(2);
    expect(sub.subgraph.iteration).toBe(2);
    g.start(100);
    sub.enabled = false;
    g.stop();
    expect(inner.onStop).toHaveBeenCalledTimes(1);
    const restored = graph();
    expect(restored.configure(JSON.parse(JSON.stringify(g.serialize())))).toBeFalsy();
    expect(restored._nodes[0].subgraph._nodes).toHaveLength(1);
});

test('clear removes stale links and nodes can execute after reinsertion', () => {
    LiteGraph.ensureNodeSingleExecution = true;
    const g = graph();
    const source = node(g, jest.fn()); source.addOutput('value', 'number');
    const target = node(g); target.addInput('value', 'number');
    source.connect(0, target, 0);
    g.runStep(3, true);
    g.clear();
    expect(source.outputs[0].links).toBeNull();
    expect(target.inputs[0].link).toBeNull();
    const other = graph();
    other.add(source);
    other.runStep(1, true);
    expect(source.onExecute).toHaveBeenCalledTimes(4);
});

test('null callback results are valid and do not prevent later callbacks', () => {
    const g = graph();
    const n = node(g, () => null);
    const after = jest.fn();
    n.registerCallbackHandler('onExecute', () => null);
    n.registerCallbackHandler('onAfterExecuteNode', after);
    expect(() => g.runStep(1, true)).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
});

test('recursive removal hooks run once and foreign nodes cannot remove matching IDs', () => {
    const g = graph();
    const n = node(g);
    const other = graph();
    const foreign = node(other);
    expect(n.id).toBe(foreign.id);
    g.remove(foreign);
    expect(g.getNodeById(n.id)).toBe(n);
    n.onRemoved = jest.fn(() => g.remove(n));
    g.remove(n);
    expect(n.onRemoved).toHaveBeenCalledTimes(1);
    expect(g._nodes).toEqual([]);
    expect(foreign.graph).toBe(other);
});

test('unique action-call guard breaks a synchronous event cycle', () => {
    LiteGraph.ensureUniqueExecutionAndActionCall = true;
    const g = graph();
    const a = node(g); const b = node(g);
    for (const n of [a, b]) { n.addInput('in', LiteGraph.ACTION); n.addOutput('out', LiteGraph.EVENT); }
    a.connect(0, b, 0); b.connect(0, a, 0);
    let calls = 0;
    for (const n of [a, b]) n.onAction = (_action, value, options) => {
        calls++;
        if (calls > 5) throw new Error('event cycle was not stopped');
        n.triggerSlot(0, value, null, options);
    };
    a.actionDo('in', 1, { action_call: 'cycle' });
    expect(calls).toBe(2);
});

test('failed post-execution hooks do not poison single-execution recovery', () => {
    LiteGraph.ensureNodeSingleExecution = true;
    const g = graph();
    const n = node(g, jest.fn());
    n.onAfterExecuteNode = () => { throw new Error('after failed'); };
    expect(() => g.runStep(1, true)).toThrow('after failed');
    n.onAfterExecuteNode = undefined;
    g.runStep(1, true);
    expect(n.onExecute).toHaveBeenCalledTimes(2);
});

function nestedPorts(g, type) {
    const sub = LiteGraph.createNode('graph/subgraph'); g.add(sub);
    const input = LiteGraph.createNode('graph/input');
    const output = LiteGraph.createNode('graph/output');
    sub.subgraph.add(input); sub.subgraph.add(output);
    input.setProperty('type', type); input.setProperty('name', 'in');
    output.setProperty('type', type); output.setProperty('name', 'out');
    input.connect(0, output, 0);
    return sub;
}

test('nested graph data ports retain values and connections after serialization', () => {
    const g = graph();
    const sub = nestedPorts(g, 'number');
    class Value {
        constructor() { this.addOutput('value', 'number'); this.properties = { value: 12 }; }
        onExecute() { this.setOutputData(0, this.properties.value); }
    }
    LiteGraph.registerNodeType('test/nested-value', Value);
    const source = LiteGraph.createNode('test/nested-value'); g.add(source);
    source.connect(0, sub, sub.findInputSlot('in'));
    g.runStep(1, true);
    expect(sub.getOutputData(sub.findOutputSlot('out'))).toBe(12);
    const restored = graph();
    expect(restored.configure(JSON.parse(JSON.stringify(g.serialize())))).toBeFalsy();
    restored.getNodeById(source.id).properties.value = 21;
    restored.runStep(1, true);
    const copy = restored.getNodeById(sub.id);
    expect(copy.getOutputData(copy.findOutputSlot('out'))).toBe(21);
});

test('nested graph event ports preserve payload and action identity', () => {
    const g = graph();
    const sub = nestedPorts(g, LiteGraph.ACTION);
    const sink = node(g); sink.addInput('in', LiteGraph.ACTION); sink.onAction = jest.fn();
    sub.connect(sub.findOutputSlot('out'), sink, 0);
    const payload = { answer: 42 };
    sub.actionDo('in', payload, { action_call: 'nested-call' });
    expect(sink.onAction).toHaveBeenCalledWith('in', payload, expect.objectContaining({ action_call: 'nested-call' }), 0);
});
