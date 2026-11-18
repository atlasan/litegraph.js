import test from 'node:test';
import assert from 'node:assert/strict';
import { TestRunner } from '../../editor_tester/js/test-runner.js';

const runner = new TestRunner({});
const signal = () => new AbortController().signal;
const utils = { setNodeInput() {}, triggerNodeExecution() {} };

test('legacy load scenarios reject invalid sizes and durations instead of silently passing', async () => {
    await assert.rejects(runner.executePerformanceTest({}, {iterations:0, maxExecutionTime:10}, utils, signal()), /iterations/);
    await assert.rejects(runner.executeHighFrequencyStress({}, {frequency:10, duration:-1}, utils, signal()), /duration/);
    await assert.rejects(runner.executeMemoryPressureStress({}, {iterations:-1, memoryPerIteration:10}, utils, signal()), /iterations/);
    await assert.rejects(runner.executeLargeDataStress({}, {dataSize:0, dataType:'unknown'}, utils, signal()), /dataType/);
});

test('legacy load limits reject nonfinite and excessive workloads before node execution', async () => {
    let calls = 0;
    const observed = { setNodeInput() { calls++; }, triggerNodeExecution() { calls++; } };
    for (const size of [NaN, Infinity, -1, 1.5, 100001]) {
        await assert.rejects(runner.executeLargeDataStress({}, {dataSize:size, dataType:'array'}, observed, signal()), /dataSize/);
    }
    await assert.rejects(runner.executeMemoryPressureStress({}, {iterations:1000, memoryPerIteration:100000}, observed, signal()), /total memory elements/);
    await assert.rejects(runner.executeHighFrequencyStress({}, {frequency:Infinity, duration:10}, observed, signal()), /frequency/);
    await assert.rejects(runner.executeHighFrequencyStress({}, {frequency:1, duration:Infinity}, observed, signal()), /duration/);
    assert.equal(calls, 0);
});

test('bounded data scenarios deliver their declared shape and cancellation stops generation', async () => {
    const values = []; let executions = 0;
    const observed = { setNodeInput(node, index, value) { assert.equal(index, 0); values.push(value); }, triggerNodeExecution() { executions++; } };
    for (const dataType of ['array','string','object']) {
        await runner.executeLargeDataStress({}, {dataSize:3, dataType}, observed, signal());
    }
    assert.deepEqual(values, [[0,1,2], 'xxx', {key0:'value0',key1:'value1',key2:'value2'}]);
    assert.equal(executions, 3);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 0);
    await assert.rejects(runner.executeLargeDataStress({}, {dataSize:100000, dataType:'object'}, observed, controller.signal), {name:'AbortError'});
    assert.equal(executions, 3);
});

test('memory pressure stops on abort and low-frequency scenarios respect their duration', async () => {
    let calls = 0; const controller = new AbortController();
    const observed = { triggerNodeExecution() { calls++; controller.abort(); } };
    await assert.rejects(runner.executeMemoryPressureStress({}, {iterations:10, memoryPerIteration:5}, observed, controller.signal), {name:'AbortError'});
    assert.equal(calls, 1);
    // 0.1 Hz would previously wait ten seconds even for a ten-millisecond scenario.
    const durationController = new AbortController();
    const deadline = setTimeout(() => durationController.abort(), 500);
    try { await runner.executeHighFrequencyStress({}, {frequency:0.1, duration:10}, utils, durationController.signal); }
    finally { clearTimeout(deadline); }
    assert.equal(durationController.signal.aborted, false);
});
