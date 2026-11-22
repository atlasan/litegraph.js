import test from 'node:test';
import assert from 'node:assert/strict';
import { TestFramework } from '../../apps/tester/js/test-framework.js';
import { TestCaseGenerator } from '../../apps/tester/js/test-generator.js';
import { LiteGraph } from '../../build/litegraph.js';
import { setNodeInput } from '../../apps/tester/js/test-inputs.js';

const definition = (extra = {}) => ({ nodeType: 'basic/const', id: 'test', timeout: 100, expectedInputs: [], expectedOutputs: [], ...extra });

test('async timeout remains armed until completion', async () => {
    const framework = new TestFramework();
    await assert.rejects(framework.executeWithTimeout(() => new Promise(() => {}), 20), /timed out/);
    assert.equal(await framework.executeWithTimeout(async () => 42, 100), 42);
});

test('failed execution still runs cleanup and clears graph', async () => {
    const framework = new TestFramework();
    let graph;
    let cleaned = false;
    const result = await framework.runSingleTest(definition({
        setup(_node, current) { graph = current; },
        execute() { throw new Error('expected failure'); },
        cleanup() { cleaned = true; },
    }));
    assert.equal(result.status, 'failed');
    assert.equal(cleaned, true);
    assert.equal(graph._nodes.length, 0);
});

test('failed custom validation is not reported as a pass', async () => {
    const result = await new TestFramework().runSingleTest(definition({ validate: () => ({ passed: false, issues: ['wrong output'] }) }));
    assert.equal(result.status, 'failed');
    assert.match(result.errors[0].message, /wrong output/);
});

test('generated basic test executes through the framework', async () => {
    const generated = new TestCaseGenerator().generateBasicTests('basic/const');
    assert.equal(generated.length, 1);
    const result = await new TestFramework().runSingleTest(definition(generated[0]));
    assert.equal(result.status, 'passed', JSON.stringify(result.errors));
    assert.equal(result.details.executionResult.outputs[0].value, 1);
});

test('test inputs use real graph links and update output data', () => {
    const graph = new LiteGraph.LGraph();
    const node = LiteGraph.createNode('math/abs');
    graph.add(node);
    setNodeInput(node, 0, -7);
    node.onExecute();
    assert.equal(node.getOutputData(0), 7);
    setNodeInput(node, 0, -3);
    node.onExecute();
    assert.equal(node.getOutputData(0), 3);
    assert.equal(graph._nodes.length, 2);
    graph.clear();
});

test('default execution supplies real inputs for ordinary data nodes', async () => {
    const result = await new TestFramework().runSingleTest(definition({ nodeType: 'math/abs' }));
    assert.equal(result.status, 'passed', JSON.stringify(result.errors));
    assert.equal(result.details.executionResult.executionCount, 2);
});

test('tester waits for initialization and reports dependency failures', async () => {
    class DelayedNode {
        constructor() { this.libraries = ['tester-dependency']; }
        onPostConstruct() { this.initialized = true; }
        onExecute() { assert.equal(this.initialized, true); }
    }
    LiteGraph.registerNodeType('test/delayed', DelayedNode);
    const manager = LiteGraph.LibraryManager;
    const originalLoad = manager.loadLibrary;
    let resolve;
    manager.loadLibrary = () => new Promise((done) => { resolve = done; });
    const framework = new TestFramework();
    let setupCalled = false;
    try {
        const pending = framework.runSingleTest(definition({ nodeType: 'test/delayed', setup() { setupCalled = true; } }));
        await new Promise((done) => setTimeout(done, 5));
        assert.equal(setupCalled, false);
        resolve([]);
        const result = await pending;
        assert.equal(result.status, 'passed', JSON.stringify(result.errors));
        assert.equal(setupCalled, true);
        manager.loadLibrary = async () => { throw new Error('dependency failed'); };
        const failed = await framework.runSingleTest(definition({ nodeType: 'test/delayed' }));
        assert.equal(failed.status, 'failed');
        assert.match(failed.errors[0].message, /dependency failed/);
    } finally {
        manager.loadLibrary = originalLoad;
        LiteGraph.unregisterNodeType('test/delayed');
    }
});

test('slot validation treats unnamed and generic slots as matching their analysis', async () => {
    // basic/watch has an input of type 0 and widget/number an unnamed output: they used to
    // fail with "expected type 'any', got '0'" / "expected name 'output_0', got ''".
    for (const nodeType of ['basic/watch', 'widget/number', 'logic/selector']) {
        const generated = new TestCaseGenerator().generateBasicTests(nodeType);
        const result = await new TestFramework().runSingleTest(definition({ ...generated[0], nodeType }));
        const slotErrors = result.errors.filter((e) => /_(name|type)_mismatch$/.test(e.type));
        assert.deepEqual(slotErrors, [], `${nodeType}: ${JSON.stringify(slotErrors)}`);
    }
});

test('slot validation still reports a real slot mismatch', async () => {
    const result = await new TestFramework().runSingleTest(definition({
        nodeType: 'basic/watch',
        expectedInputs: [{ name: 'other', type: 'number' }],
    }));
    const messages = result.errors.map((e) => e.message);
    assert.ok(messages.some((m) => /Input 0: expected name 'other', got 'value'/.test(m)), messages.join('\n'));
    assert.ok(messages.some((m) => /Input 0: expected type 'number', got 'any'/.test(m)), messages.join('\n'));
});
