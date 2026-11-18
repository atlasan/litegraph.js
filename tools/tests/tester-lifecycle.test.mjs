import test from 'node:test';
import assert from 'node:assert/strict';
import { TestFramework } from '../../editor_tester/js/test-framework.js';
import { TestRunner } from '../../editor_tester/js/test-runner.js';
import { LiteGraph } from '../../build/litegraph.js';

const config = { execution: { timeout: 200, maxConcurrent: 2 } };
const definition = (extra = {}) => ({ id: 'fixture', nodeType: 'basic/const', timeout: 200, expectedInputs: [], expectedOutputs: [], ...extra });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('cancellation stops pending work, skips validation, and awaits resource cleanup', async () => {
    const framework = new TestFramework(); const controller = new AbortController();
    const entered = deferred(); const cleanup = deferred(); let validated = false, finished = false;
    const pending = framework.runSingleTest(definition({
        execute(node) { node.onRemoved = () => cleanup.promise; entered.resolve(); return new Promise(() => {}); },
        validate() { validated = true; },
    }), { signal: controller.signal }).then(result => { finished = true; return result; });
    await entered.promise; controller.abort();
    await new Promise(done => setTimeout(done, 10));
    assert.equal(finished, false); cleanup.resolve();
    const result = await pending;
    assert.equal(result.status, 'skipped'); assert.equal(result.details.cancelled, true);
    assert.equal(validated, false);
});

test('runner Stop cancels every generated case in a concurrent batch', async () => {
    const runner = new TestRunner({}); runner.startExecution();
    const entered = deferred(); let calls = 0;
    const tests = [1, 2, 3].map(id => ({ id: String(id), execute() { if (++calls === 2) entered.resolve(); return new Promise(() => {}); } }));
    const pending = runner.executeNodeTests('basic/const', tests, config);
    await entered.promise; runner.stopTests();
    const results = await pending; runner.endExecution();
    assert.equal(calls, 2); assert.equal(results.length, 2);
    assert.ok(results.every(result => result.status === 'skipped' && result.details.cancelled));
    const report = JSON.parse(runner.framework.exportReport('json'));
    assert.equal(report.stats.total, 2); assert.equal(report.stats.skipped, 2);
    assert.equal(report.stats.passed, 0); assert.equal(report.stats.coverage, 0);
});

test('tester statistics preserve execution progress and do not label skipped nodes passed', async () => {
    const { JSDOM } = await import('jsdom');
    const { UIManager } = await import('../../editor_tester/js/ui-manager.js');
    const dom = new JSDOM('<div data-node-type="basic/const"><span class="node-status"></span></div>');
    const previous = globalThis.document; globalThis.document = dom.window.document;
    try {
        const ui = Object.create(UIManager.prototype);
        ui.app = { getAvailableNodeTypes: () => Object.keys(LiteGraph.registered_node_types) };
        ui.currentResults = [{ nodeType:'basic/const', status:'skipped' }];
        ui.elements = Object.fromEntries(['totalTests', 'passedTests', 'failedTests', 'coveragePercent', 'statTotal', 'statPassed', 'statFailed', 'statCoverage', 'progressBar', 'progressText'].map(key => [key, document.createElement('div')]));
        ui.updateProgress(25, 'Stopped after 1 of 4 nodes'); ui.updateStats();
        assert.equal(ui.elements.progressBar.style.width, '25%');
        assert.equal(ui.elements.progressText.textContent, 'Stopped after 1 of 4 nodes');
        assert.equal(ui.elements.coveragePercent.textContent, '0%');
        ui.updateNodeStatuses(ui.currentResults);
        assert.equal(document.querySelector('.node-status').classList.contains('all-passed'), false);
        assert.equal(document.querySelector('.node-status').classList.contains('has-skipped'), true);
    } finally { globalThis.document = previous; dom.window.close(); }
});

test('legacy cases run in independent graphs, await readiness, and release graphs', async () => {
    const runner = new TestRunner({}); const graphs = [];
    runner.executeTestCaseLogic = async (node, testCase, utils) => {
        assert.equal(node.initialization_state, 'ready'); graphs.push(node.graph);
        node.properties.value = testCase.value;
        await new Promise(done => setTimeout(done, testCase.value));
        utils.triggerNodeExecution(node);
        assert.equal(utils.getNodeOutput(node, 0), testCase.value);
    };
    const results = await runner.executeNodeTests('basic/const', [{ id:'a', type:'basic', value:5 }, { id:'b', type:'basic', value:10 }], config);
    assert.ok(results.every(result => result.status === 'passed'), JSON.stringify(results));
    assert.equal(new Set(graphs).size, 2);
    assert.ok(graphs.every(graph => graph._nodes.length === 0));
});

test('legacy input and error-condition checks fail when the expected exception is missing', async () => {
    const runner = new TestRunner({}); const signal = new AbortController().signal;
    const utils = { setNodeInput() {}, triggerNodeExecution() {} };
    await assert.rejects(runner.executeInputValidationTest({}, { invalidInputs:[null], expectedBehavior:'error' }, utils, signal), /Expected error/);
    runner.applyErrorCondition = async () => {};
    await assert.rejects(runner.executeErrorHandlingTest({}, { errorConditions:[{type:'fixture', shouldThrow:true}] }, utils, signal), /Expected error/);
});

test('framework coverage and reports contain only the current executed selection', async () => {
    const framework = new TestFramework();
    framework.registerTest('basic/const', { execute() {} });
    framework.registerTest('math/abs', { execute() {} });
    await framework.runTests({ nodeType:'basic/const' });
    await framework.runTests({ nodeType:'math/abs' });
    assert.deepEqual(framework.getResults().map(result => result.nodeType), ['math/abs']);
    assert.equal(framework.stats.coverage, Number((100 / Object.keys(LiteGraph.registered_node_types).length).toFixed(1)));
});

test('HTML, CSV, JSON, and JUnit reports preserve text and skipped outcomes', async () => {
    const { TestReporter } = await import('../../editor_tester/js/test-reporter.js');
    const { JSDOM } = await import('jsdom');
    const reporter = new TestReporter(); const framework = new TestFramework();
    const result = { testId:'=bad,"<img src=x>"', nodeType:'fixture/<script>bad()</script>', status:'skipped', duration:1, errors:[{type:'fixture',message:'bad ]]> <img src=x>'}], warnings:['"quoted",\nnext'] };
    framework.results.set('id', result);
    for (const html of [reporter.formatHTML([result]), framework.exportReport('html')]) {
        const dom = new JSDOM(html);
        assert.equal(dom.window.document.querySelectorAll('script,img').length, 0);
        assert.ok(dom.window.document.body.textContent.includes(result.nodeType)); dom.window.close();
    }
    for (const csv of [reporter.formatCSV([result], {includeDetails:true}), framework.exportReport('csv')]) {
        assert.ok(csv.includes('"\'=bad,""<img src=x>"""'));
    }
    const xml = reporter.formatJUnit([result], {suiteName:'A "quoted" suite'});
    const dom = new JSDOM(xml, {contentType:'text/xml'});
    assert.equal(dom.window.document.querySelectorAll('skipped').length, 1); dom.window.close();
    assert.ok(JSON.parse(reporter.formatJSON([result])).statistics.nodeTypes[result.nodeType]);
});
