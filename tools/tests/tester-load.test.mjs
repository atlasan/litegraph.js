import test from 'node:test';
import assert from 'node:assert/strict';
import { TestFramework } from '../../apps/tester/js/test-framework.js';
import { TestCaseGenerator } from '../../apps/tester/js/test-generator.js';
import { TestRunner } from '../../apps/tester/js/test-runner.js';
import { pause } from '../../apps/tester/js/test-control.js';

const definition = extra => ({ id:'load', nodeType:'basic/const', expectedInputs:[], expectedOutputs:[], timeout:200, ...extra });
const config = { execution: { timeout:200, maxConcurrent:1, retryCount:2, retryDelay:0 } };

test('runner wires configured timeouts, memory tracking, and benchmark sample counts', async () => {
    const { default: testConfig } = await import('../../apps/tester/js/test-config.js');
    const previous = testConfig.config;
    const runner = new TestRunner({ getNodeInfo: () => ({}) });
    try {
        testConfig.config = { ...previous, execution:{...previous.execution, timeout:300, enableMemoryTracking:false},
            testTypes:{performance:true}, performance:{...previous.performance, benchmarkIterations:3, warmupIterations:0} };
        runner.startExecution();
        assert.equal(runner.framework.config.timeout, 300);
        assert.equal(runner.framework.config.validateMemory, false);
        const settings = testConfig.get();
        const cases = await runner.generateTestsForNode('math/abs', settings);
        assert.equal(cases.length, 1); assert.equal(cases[0].timeout, 300);
        const result = await runner.executeTestCase('math/abs', cases[0], settings);
        assert.equal(result.status, 'passed', JSON.stringify(result.errors));
        assert.equal(result.details.executionResult.executionTimes.length, 3);
    } finally { testConfig.config = previous; runner.endExecution(); runner.updateExecutionSettings(); }
});

test('benchmark settings control iterations, inputs, wrapper execution, and thresholds', async () => {
    const generator = new TestCaseGenerator();
    const scenario = generator.generatePerformanceTests('math/abs', null, { benchmarkIterations:3, warmupIterations:2, maxExecutionTime:1000, maxMemoryUsage:1024 })[0];
    let calls = 0, lastOutput;
    const result = await new TestFramework().runSingleTest(definition({ ...scenario, nodeType:'math/abs', setup(node) {
        node.registerCallbackHandler('onExecute', () => { calls++; lastOutput = node.getOutputData(0); });
    } }));
    assert.equal(result.status, 'passed', JSON.stringify(result.errors));
    assert.equal(calls, 5); assert.equal(typeof lastOutput, 'number');
    assert.equal(result.details.executionResult.executionTimes.length, 3);
    const failed = scenario.validate(null, null, { executionTimes:[1001], memoryUsage:[], memorySupported:false });
    assert.equal(failed.passed, false);
    assert.match(failed.issues.join(' '), /execution time/i);
});

test('generated stress work yields and Stop prevents further executions', async () => {
    const controller = new AbortController(); let calls = 0;
    const scenario = new TestCaseGenerator().generateStressTests('basic/const')[0];
    const result = await new TestFramework().runSingleTest(definition({ ...scenario, setup(node) {
        node.registerCallbackHandler('onExecute', () => { if (++calls === 1) setTimeout(() => controller.abort(), 0); });
    } }), { signal:controller.signal });
    assert.equal(result.status, 'skipped'); assert.ok(calls > 0 && calls < 1000);
    const stoppedAt = calls; await pause(10); assert.equal(calls, stoppedAt);
});

test('timeout signals cooperative work before cleanup and remains a failure', async () => {
    let ticks = 0, abortedAtCleanup = false;
    const result = await new TestFramework().runSingleTest(definition({ timeout:15,
        async execute(node, graph, {signal}) { node.signal = signal; for (;;) { await pause(0, signal); ticks++; } },
        cleanup(node) { abortedAtCleanup = node.signal.aborted; },
    }));
    assert.equal(result.status, 'failed'); assert.equal(result.details.timedOut, true);
    assert.equal(abortedAtCleanup, true);
    const stoppedAt = ticks; await pause(10); assert.equal(ticks, stoppedAt);
});

test('retry uses fresh graphs, retains failed attempts, and counts a case once', async () => {
    const runner = new TestRunner({}); runner.startExecution();
    const graphs = []; let calls = 0;
    try {
        const result = await runner.executeTestCase('basic/const', { id:'retry', execute(node, graph) {
            graphs.push(graph); if (++calls < 3) throw new Error('transient');
        } }, config);
        assert.equal(result.status, 'passed'); assert.equal(calls, 3);
        assert.equal(new Set(graphs).size, 3); assert.ok(graphs.every(graph => graph._nodes.length === 0));
        assert.deepEqual(result.details.attempts.map(attempt => attempt.status), ['failed','failed','passed']);
        assert.equal(runner.framework.stats.total, 1); assert.equal(runner.framework.stats.passed, 1);
    } finally { runner.endExecution(); }
});

test('Stop interrupts retry delay and timeout or cleanup failure is never retried', async () => {
    const runner = new TestRunner({}); runner.startExecution(); let calls = 0;
    try {
        const pending = runner.executeTestCase('basic/const', { id:'cancel-retry', execute() {
            calls++; setTimeout(() => runner.stopTests(), 5); throw new Error('transient');
        } }, { execution:{ ...config.execution, retryDelay:10000 } });
        const result = await pending;
        assert.equal(result.status, 'skipped'); assert.equal(calls, 1);
        runner.endExecution(); runner.startExecution(); calls = 0;
        const timeout = await runner.executeTestCase('basic/const', { id:'timeout', timeout:10, execute() { calls++; return new Promise(() => {}); } }, config);
        assert.equal(timeout.status, 'failed'); assert.equal(calls, 1);
        calls = 0;
        const cleanup = await runner.executeTestCase('basic/const', { id:'cleanup', execute() { calls++; }, cleanup() { throw new Error('cleanup failed'); } }, config);
        assert.equal(cleanup.status, 'failed'); assert.equal(calls, 1);
    } finally { runner.endExecution(); }
});

test('randomized execution runs every selected case once without mutating selection', async () => {
    const runner = new TestRunner({}); const visited = [];
    const selection = ['a','b','c'].map(id => ({ id, execute() { visited.push(id); } }));
    const previous = Math.random; Math.random = () => 0;
    try {
        const results = await runner.executeNodeTests('basic/const', selection, {execution:{...config.execution, randomizeOrder:true}});
        assert.deepEqual(visited, ['b','c','a']);
        assert.deepEqual(results.map(result => result.status), ['passed','passed','passed']);
        assert.deepEqual(selection.map(item => item.id), ['a','b','c']);
    } finally { Math.random = previous; }
});
