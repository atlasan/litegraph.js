// Compatibility golden tests (Wave 6, step 2): each example document runs for a fixed number of
// steps on a fixed clock under the flag presets of today, and the data on every link and the state
// of every node is snapshotted. The documents are frozen copies of the editor examples
// (test/fixtures/golden-examples), so the examples library can evolve without moving them. The snapshots must stay identical through Wave 6: a document
// without `config.execution` runs as `legacy`. A changed snapshot needs a finding id in the commit.
import { jest } from '@jest/globals';
import fs from 'node:fs';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import '../src/nodes/base.js';
import '../src/nodes/events.js';
import '../src/nodes/logic.js';
import '../src/nodes/math.js';
import '../src/nodes/strings.js';
import '../src/nodes/interface.js';
import '../src/nodes/input.js';
import '../src/nodes/graphics.js';
import '../src/nodes/midi.js';

const FLAGS = ['use_deferred_actions', 'refreshAncestorsOnActions', 'refreshAncestorsOnTriggers', 'ensureUniqueExecutionAndActionCall', 'throw_errors'];
const PRESETS = {
    defaults: {},
    event_based: { use_deferred_actions: false, refreshAncestorsOnActions: true, refreshAncestorsOnTriggers: true, ensureUniqueExecutionAndActionCall: true },
};
const EXAMPLES = [
    'features.json', 'benchmark.json', 'subgraph.json', 'midi_generation.json',
    'node_execution_modes.JSON', 'ancestors/check_frame_value.JSON', 'ancestors/check_subgraph.JSON', 'conditionals/while_console_test.JSON',
];
const read = (url) => JSON.parse(fs.readFileSync(url, 'utf8'));
const documents = Object.fromEntries(EXAMPLES.map((name) => [name, read(new URL(`./fixtures/golden-examples/${name}`, import.meta.url))]));
const fixtures = read(new URL('./fixtures/sa-subgraphs.json', import.meta.url));
for (const [name, definition] of Object.entries(fixtures)) {
    documents[`sa-subgraphs/${name}`] = {
        nodes: [{ id: 1, type: definition.id, pos: [0, 0], size: [140, 60], flags: {}, mode: 0, inputs: [], outputs: [], properties: {} }],
        links: [], definitions: { subgraphs: [definition] },
    };
}

let saved;
let clock;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    saved = Object.fromEntries(FLAGS.map((key) => [key, LiteGraph[key]]));
});
beforeEach(() => {
    clock = 1000;
    let seed = 42;
    jest.spyOn(Math, 'random').mockImplementation(() => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; });
    jest.spyOn(LiteGraph, 'getTime').mockImplementation(() => clock);
    for (const level of ['info', 'debug', 'log', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => { Object.assign(LiteGraph, saved); jest.restoreAllMocks(); });

/** a JSON-stable picture of a value: rounded numbers, bounded depth, class instances by name */
function picture(value, depth = 0) {
    if (value === undefined) return '<undefined>';
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : String(value);
    if (typeof value === 'function') return '<function>';
    if (ArrayBuffer.isView(value)) return Array.from(value.slice(0, 8), (v) => picture(v, depth + 1));
    if (depth > 2) return `<${value.constructor?.name ?? 'object'}>`;
    if (Array.isArray(value)) return value.slice(0, 16).map((v) => picture(v, depth + 1));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return `<${value.constructor?.name ?? 'object'}>`;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, picture(value[key], depth + 1)]));
}

function capture(graph) {
    const links = {};
    for (const [id, link] of Object.entries(graph.links ?? {})) if (link) links[id] = picture(link.data);
    const nodes = {};
    for (const node of graph._nodes) {
        nodes[node.id] = {
            type: node.type, mode: node.mode,
            properties: picture(node.properties),
            outputs: (node.outputs ?? []).map((output) => picture(output._data)),
            ...(node.subgraph ? { inner: capture(node.subgraph) } : {}),
        };
    }
    return { links, nodes };
}

describe.each(Object.keys(PRESETS))('flag preset %s', (preset) => {
    test.each(Object.keys(documents))('%s', (name) => {
        Object.assign(LiteGraph, saved, PRESETS[preset], { throw_errors: false });
        const graph = new LGraph();
        graph.configure(structuredClone(documents[name]));
        graph.catch_errors = true;
        graph.starttime = graph.last_update_time = clock;
        const frames = {};
        for (let index = 1; index <= 30; index++) {
            clock += 50;
            // press every root button (as a click does) on steps 3 and 10
            if (index === 3 || index === 10) {
                for (const node of graph._nodes) if (node.type === 'widget/button') { try { node.triggerSlot(0, 'press'); } catch { /* recorded by the state */ } }
            }
            graph.runStep(1, false);
            if (index === 1 || index === 4 || index === 11 || index === 30) frames[`step ${index}`] = capture(graph);
        }
        expect(frames).toMatchSnapshot();
        graph.clear();
    });
});
