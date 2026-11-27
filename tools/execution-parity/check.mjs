import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { createEditorApp } from '../../apps/editor/server.js';
import { findFirefox, launchFirefox } from '../browser/firefox-bidi.mjs';

const editorPath = '/editor/editor_build.html';
const unavailable = 'execution-parity-unavailable-model';
const filename = 'workflow.json';
const action = (id, inner = []) => [[id, 'running'], ...inner, [id, 'done']];
const effect = (value) => [['effect', value]];

const branch = {
    file: 'branch-counter.json',
    probe: '4',
    phases: [['initial', 1], ['restart', 2], ['reopen', 1]].map(([name, count]) => ({
        name, reopen: name !== 'restart',
        trace: action('3', action('4', action('5', effect(count)))),
    })),
};

// A and B materialize the same definition. WaitAll state belongs to each live instance.
const linkedCycle = [
    ['prime', [...action('3:3'), ...action('4:3')]], // A left, B right
    ['release-a', action('3:3', action('3:4', action('5', effect(1))))], // A right
    ['requeue-a-release-b', [...action('3:3'), ...action('4:3', action('4:4', action('6', effect(1))))]], // A right, B left
];
const linked = {
    file: 'linked-wait-all.json',
    probe: '3:4',
    stepperId: 2,
    phases: ['', 'reopen-'].flatMap((prefix) => linkedCycle.map(([name, trace], index) => ({
        name: prefix + name, reopen: index === 0, trace, nextStep: (index + 1) % linkedCycle.length,
    }))),
};

const deferredCheckpoint = [['8', 'done'], ['9', 'done']];
const deferredPrime = [...action('4:-1000'), ...action('5:-1000'), ...deferredCheckpoint];
const deferredEmpty = [['4:-1000', 'done'], ['5:-1000', 'done'], ...deferredCheckpoint];
const deferredRelease = [
    ['4:-1000', 'done'], ...action('4:2'), ...action('6', effect(1)),
    ['5:-1000', 'done'], ...action('5:2'), ...action('7', effect(1)),
    ...deferredCheckpoint,
];
const deferred = ['step', 'strict', 'legacy'].map((model) => ({
    id: `linked-deferred-actions:${model}`,
    file: 'linked-deferred-actions.json',
    model,
    probe: '4:2',
    stepperId: 2,
    // The first pulse queues one action per disabled instance. The second enables
    // both instances. The watches confirm both have taken their turn.
    phases: [
        { name: 'queue-before-stop', reopen: true, nextStep: 1, trace: deferredPrime },
        { name: 'restart-delivers', nextStep: 0, trace: deferredRelease },
        { name: 'queue-before-reopen', reopen: true, nextStep: 1, trace: deferredPrime },
        { name: 'reopen-discards', reopen: 'checkpoint', nextStep: 0, trace: deferredEmpty },
        { name: 'queue-before-clear', reopen: true, nextStep: 1, trace: deferredPrime },
        { name: 'clear-while-stopped', clearBeforeStart: true, nextStep: 0, trace: deferredEmpty },
        { name: 'queue-and-clear-on-stop', reopen: true, clearOnStop: true, nextStep: 1, trace: deferredPrime },
        { name: 'restart-after-clearing-stop', nextStep: 0, trace: deferredEmpty },
    ],
}));

function traceEntry({ kind, path, status, value }) {
    if (kind === 'reset') return ['reset'];
    if (kind === 'effect') return ['effect', value];
    if (kind === 'status') return [path, status];
}

async function until(read, label) {
    const deadline = Date.now() + 5000;
    do {
        const value = await read();
        if (value) return value;
        await delay(20);
    } while (Date.now() < deadline);
    throw new Error(`Timed out waiting for ${label}`);
}

// Runs inside the existing editor. Keep transport and fixture assertions in Node.
function installEditorProbe() {
    const graph = window.graph;
    const trace = [];
    graph.events.on('execution-state', ({ detail }) => {
        const { kind, path, status } = detail.message;
        if (kind === 'reset' || kind === 'status') trace.push({ kind, path, status });
    });
    const info = console.info;
    console.info = (...args) => {
        if (args[0] === '[LogNode]') trace.push({ kind: 'effect', value: args[1] });
        info.apply(console, args);
    };
    window.executionParityProbe = {
        open(data) {
            const file = new File([JSON.stringify(data)], 'execution-parity.json', { type: 'application/json' });
            return new Promise((resolve, reject) => graph.load(file, (result) => {
                if (!result.ok || result.error) return reject(new Error(JSON.stringify(result)));
                const opened = this.inspect();
                if (opened.executionBlocked && document.querySelector('.litegraph-execution-notice')?.textContent !== opened.executionBlocked) {
                    return reject(new Error('Editor did not show the unavailable-model reason on open'));
                }
                resolve(opened);
            }));
        },
        inspect() {
            return {
                status: graph.status === graph.constructor.STATUS_RUNNING ? 'running' : 'stopped',
                executionBlocked: graph.getExecutionBlockReason(),
                serializedGraph: graph.serialize(),
                iteration: graph.iteration,
            };
        },
        async start() {
            const started = await graph.startAsync();
            return { ...this.inspect(), error: started ? undefined : graph.getExecutionBlockReason() };
        },
        stop: (dropQueued) => graph.stopAsync({ dropQueued }).then(() => true),
        takeTrace() {
            return trace.splice(0);
        },
        tryControls(nodePath) {
            document.getElementById('playnode_button').click();
            document.getElementById('playstepnode_button').click();
            graph.runStep(1);
            graph.resolvePath(nodePath).actionDo('inc');
            return this.inspect();
        },
    };
    return true;
}

async function withBrowser(firefox, exercise) {
    const server = createEditorApp().listen(0, '127.0.0.1');
    let browser;
    try {
        await once(server, 'listening');
        const startup = [];
        try {
            browser = await launchFirefox({ ...firefox, log: (line) => {
                startup.push(line);
                if (startup.length > 12) startup.shift();
            } });
        } catch (cause) {
            throw new Error([cause.message, ...startup].join('\n'), { cause });
        }
        const { contexts: [{ context }] } = await browser.send('browsingContext.getTree', {});
        const pageErrors = [];
        browser.onEvent(({ method, params }) => {
            if (method === 'log.entryAdded' && (params.type === 'javascript' || params.level === 'error')) pageErrors.push(params.text);
        });
        await browser.send('session.subscribe', { events: ['log.entryAdded'] });
        const url = `http://127.0.0.1:${server.address().port}${editorPath}`;
        await browser.send('browsingContext.navigate', { context, url, wait: 'complete' }, 60000);
        const evaluate = async (expression) => {
            const response = await browser.send('script.evaluate', {
                expression: `(async () => JSON.stringify(await (${expression})))()`,
                target: { context }, awaitPromise: true, resultOwnership: 'none',
            });
            if (response.type === 'exception') throw new Error(response.exceptionDetails.text);
            return JSON.parse(response.result.value);
        };
        await until(() => evaluate("Boolean(window.graph && window.graphcanvas)"), 'the editor');
        await evaluate(`(${installEditorProbe})()`);
        const call = (name, ...args) => evaluate(`executionParityProbe.${name}(${args.map((arg) => JSON.stringify(arg)).join(',')})`);
        const result = await exercise({
            name: 'browser',
            open: (data) => call('open', data),
            start: () => call('start'),
            stop: (dropQueued = false) => call('stop', dropQueued),
            inspect: () => call('inspect'),
            tryControls: (nodePath) => call('tryControls', nodePath),
            takeTrace: async () => (await call('takeTrace')).map(traceEntry).filter(Boolean),
        });
        assert.deepEqual(pageErrors, [], 'editor page errors');
        return result;
    } finally {
        try { await browser?.close(); }
        finally { if (server.listening) await new Promise((resolve) => server.close(resolve)); }
    }
}

async function withRunner(exercise) {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'litegraph-execution-parity-'));
    process.env.WORKFLOWS_DIR = dir; // graphManager resolves its workflow root on import
    let manager;
    try {
        manager = await import('../../apps/runner/server/graphManager.js');
        const trace = [];
        manager.setExecutionStateCallback((_id, message) => {
            const entry = traceEntry(message);
            if (entry) trace.push(entry);
        });
        manager.setConsolePipeCallback((_id, level, message) => {
            if (level === 'info' && message.startsWith('[LogNode] ')) trace.push(['effect', Number(message.slice('[LogNode] '.length))]);
        });
        return await exercise({
            name: 'node-runner',
            async open(data) {
                if (manager.getCurrentProcesses().includes(filename)) {
                    const closed = await manager.unloadGraph(filename);
                    assert.equal(closed.status, 'unloaded', closed.error);
                }
                await writeFile(path.join(dir, filename), JSON.stringify(data));
                return manager.openGraph(filename);
            },
            start: () => manager.controlGraph(filename, 'start'),
            stop: async (dropQueued = false) => {
                const stopped = await manager.controlGraph(filename, 'stop', undefined, { dropQueued });
                assert.equal(stopped.status, 'stopped', stopped.error);
            },
            inspect: () => manager.requestSync(filename),
            takeTrace: () => trace.splice(0),
        });
    } finally {
        try { await manager?.unloadAllGraphs(); }
        finally { await rm(dir, { recursive: true, force: true }); }
    }
}

function graphShape(doc) {
    const nodes = ({ nodes }) => nodes.map(({ id, type, mode }) => [id, type, mode]);
    const ports = (slots) => slots.map(({ id, name, type, linkIds }) => [id, name, type, linkIds ?? []]);
    return {
        nodes: nodes(doc),
        links: doc.links,
        definitions: (doc.definitions?.subgraphs ?? []).map((definition) => ({
            id: definition.id,
            nodes: nodes(definition),
            links: definition.links,
            inputs: ports(definition.inputs),
            outputs: ports(definition.outputs),
        })),
    };
}

async function exercise(host, { id, probe, phases, fixture, stepperId }) {
    const label = `${host.name} ${id}`;
    const observed = new Set(phases.flatMap(({ trace }) => trace.map(([path]) => path)));
    const takeTrace = async () => (await host.takeTrace()).filter(([path]) => path === 'reset' || observed.has(path));
    const verifyOpen = (data, reply) => {
        assert.equal(reply.status, 'stopped', reply.error ?? `${label} open status`);
        const reopened = reply.serializedGraph;
        assert.equal(reopened.id, data.id, `${label} document ID`);
        assert.equal(reopened.config.execution, data.config.execution, `${label} saved model`);
        assert.deepEqual(graphShape(reopened), graphShape(data), `${label} document wiring and definitions`);
    };
    const runs = {};
    let checkpoint;
    for (const { name, reopen, trace: expectedEvents, nextStep, clearBeforeStart, clearOnStop } of phases) {
        if (reopen) {
            const document = reopen === 'checkpoint' ? checkpoint : fixture;
            verifyOpen(document, await host.open(document));
        }
        if (clearBeforeStart) await host.stop(true);
        await host.takeTrace();
        const expected = [['reset'], ...expectedEvents];
        const trace = [];
        const collect = async () => {
            trace.push(...await takeTrace());
            const observedPrefix = trace.slice(0, expected.length);
            assert.deepEqual(observedPrefix, expected.slice(0, observedPrefix.length), `${label} ${name} trace prefix`);
            return trace.length >= expected.length;
        };
        const started = await host.start();
        assert.equal(started.status, 'running', started.error ?? `${label} ${name} start status`);
        await until(collect, `${label} ${name} trace`);
        await host.stop(clearOnStop);
        const stopped = await host.inspect();
        assert.equal(stopped.status, 'stopped', stopped.error ?? `${label} ${name} stop status`);
        checkpoint = stopped.serializedGraph;
        const step = stepperId === undefined ? undefined
            : checkpoint.nodes.find(({ id }) => id === stepperId)?.properties.index;
        assert.equal(step, nextStep, `${label} ${name} next step`);
        await collect();
        assert.deepEqual(trace, expected, `${label} ${name} ordered trace`);
        runs[name] = { trace, status: stopped.status, ...(step === undefined ? {} : { nextStep: step }) };
    }

    const missing = { ...fixture, config: { ...fixture.config, execution: unavailable } };
    const opened = await host.open(missing);
    verifyOpen(missing, opened);
    assert.ok(opened.executionBlocked?.includes(unavailable), `${label} missing-model diagnostic`);
    await host.takeTrace();
    const attempted = await host.start();
    assert.equal(attempted.error, opened.executionBlocked);
    const inspected = host.tryControls ? await host.tryControls(probe) : await host.inspect();
    verifyOpen(missing, inspected);
    assert.equal(inspected.iteration, opened.iteration, `${label} paused iteration`);
    assert.deepEqual(await host.takeTrace(), [], `${label} paused trace`);
    return { runs, paused: { model: unavailable, status: inspected.status, reason: opened.executionBlocked } };
}

async function main() {
    const { values } = parseArgs({ options: {
        json: { type: 'string' }, 'if-browser': { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
        console.log('Usage: npm run check:execution-parity [-- --json report.json]\nRequires Node 22, built bundles, and Firefox (LG_FIREFOX may override the path).\n--if-browser uses the browser smoke settings and still runs Node if Firefox is skipped.');
        return;
    }
    const optional = values['if-browser'];
    const firefox = optional && process.env.LG_BROWSER_SMOKE === '0'
        ? { reason: 'LG_BROWSER_SMOKE=0' } : findFirefox();
    if (!firefox.executable && (!optional || firefox.configured || process.env.LG_BROWSER_SMOKE === 'require')) {
        throw new Error(firefox.reason);
    }
    const cases = await Promise.all([branch, linked, ...deferred].map(async (scenario) => {
        const fixture = JSON.parse(await readFile(new URL(scenario.file, import.meta.url), 'utf8'));
        if (scenario.model) fixture.config.execution = scenario.model;
        return { id: scenario.file, ...scenario, fixture };
    }));
    const exerciseCases = async (host) => {
        const reports = {};
        for (const scenario of cases) reports[scenario.id] = await exercise(host, scenario);
        return reports;
    };
    const results = await Promise.allSettled([
        firefox.executable ? withBrowser(firefox, exerciseCases) : Promise.resolve(null),
        withRunner(exerciseCases),
    ]);
    const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
    if (errors.length) throw new AggregateError(errors, 'Execution parity host check failed');
    const [{ value: browser }, { value: runner }] = results;
    const report = { schemaVersion: 2, browser, runner, browserSkipped: browser ? null : firefox.reason };
    if (values.json) await writeFile(values.json, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    if (browser) assert.deepEqual(browser, runner, 'Browser and Node runner diverged');
    else console.log(`execution parity: browser skipped: ${firefox.reason}`);
    console.log(`execution parity: ${cases.length}/${cases.length} cases passed (${browser ? 'browser and Node' : 'Node only'})`);
}

main().catch((error) => {
    console.error(`execution parity: FAIL: ${error.message}`);
    console.error(error);
    process.exitCode = 1;
});
