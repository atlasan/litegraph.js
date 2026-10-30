import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';

beforeAll(async () => {
    LiteGraph.initialize();
    // Wait for the optional Node module imports before the test environment closes.
    await LiteGraph.LibraryManager.importNodeModules();
});

test('registration preserves inherited custom methods', () => {
    class Parent { getTitle() { return 'inherited title'; } }
    class Child extends Parent {}
    LiteGraph.registerNodeType('test/inherited', Child);
    const node = LiteGraph.createNode('test/inherited');
    expect(node.getTitle()).toBe('inherited title');
    expect(node.serialize).toBeDefined();
});

test.each([true, false])('runStep respects limits (uncaught=%s)', (uncaught) => {
    class Counter { onExecute() {} }
    LiteGraph.registerNodeType('test/counter', Counter);
    const graph = new LGraph();
    const nodes = [0, 1, 2].map(() => LiteGraph.createNode('test/counter'));
    for (const node of nodes) { graph.add(node); node.doExecute = jest.fn(); }
    graph.runStep(1, uncaught, 0);
    expect(nodes[0].doExecute).not.toHaveBeenCalled();
    graph.runStep(1, uncaught, 1);
    expect(nodes[0].doExecute).toHaveBeenCalledTimes(1);
    expect(nodes[1].doExecute).not.toHaveBeenCalled();
    graph.runStep(1, uncaught);
    expect(nodes[0].doExecute).toHaveBeenCalledTimes(2);
    expect(nodes[1].doExecute).toHaveBeenCalledTimes(1);
    expect(nodes[2].doExecute).toHaveBeenCalledTimes(1);
    graph.clear();
});

test('connected data flow survives graph serialization and configure', () => {
    class Source {
        constructor() { this.addOutput('value', 'number'); this.addProperty('value', 7); }
        onExecute() { this.setOutputData(0, this.properties.value); }
    }
    class Double {
        constructor() { this.addInput('value', 'number'); this.addOutput('result', 'number'); }
        onExecute() { this.setOutputData(0, this.getInputData(0) * 2); }
    }
    LiteGraph.registerNodeType('test/source', Source);
    LiteGraph.registerNodeType('test/double', Double);
    const graph = new LGraph();
    const source = LiteGraph.createNode('test/source');
    const target = LiteGraph.createNode('test/double');
    graph.add(target);
    graph.add(source);
    source.connect(0, target, 0);
    graph.runStep(1, true);
    expect(target.getOutputData(0)).toBe(14);
    const restored = new LGraph();
    expect(restored.configure(JSON.parse(JSON.stringify(graph.serialize())))).toBeFalsy();
    restored.getNodeById(source.id).properties.value = 11;
    restored.runStep(1, true);
    expect(restored.getNodeById(target.id).getOutputData(0)).toBe(22);
    graph.clear();
    restored.clear();
});
