// Validated loader for untrusted graphs (X-04): LiteGraph.validateGraphData and graph.configureValidated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { GraphLoader } from '../src/graphloader.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); this.addProperty('value', 1); } }
    class Dst { constructor() { this.addInput('in', 'number'); this.addInput('b', 'number'); } }
    LiteGraph.registerNodeType('loader/src', Src);
    LiteGraph.registerNodeType('loader/dst', Dst);
});

const node = (id, type = 'loader/src', extra = {}) => ({ id, type, pos: [id * 10, 0], size: [100, 40], flags: {}, mode: 0, properties: {}, ...extra });
/** a small valid document: src(1) -> dst(2) */
function doc(extra = {}) {
    return {
        id: 'a0000000-0000-4000-8000-000000000001', revision: 0, last_node_id: 2, last_link_id: 1,
        nodes: [
            node(1, 'loader/src', { outputs: [{ name: 'out', type: 'number', links: [1] }], properties: { value: 3 } }),
            node(2, 'loader/dst', { inputs: [{ name: 'in', type: 'number', link: 1 }, { name: 'b', type: 'number', link: null }] }),
        ],
        links: [[1, 1, 0, 2, 0, 'number']],
        groups: [{ title: 'G', bounding: [0, 0, 200, 100], color: '#335', font_size: 24 }],
        config: {}, extra: {}, version: 0.4, ...extra,
    };
}
const codes = (result, severity) => result.report.issues.filter((i) => !severity || i.severity === severity).map((i) => i.code);
const validate = (data, options) => LiteGraph.validateGraphData(data, options);

describe('clean documents', () => {
    test('a valid document passes, as a copy, and the input is not changed', () => {
        const input = doc();
        const before = JSON.stringify(input);
        const result = validate(input);
        expect(result.ok).toBe(true);
        expect(result.report.ok).toBe(true);
        expect(result.report.issues).toEqual([]);
        expect(result.report.counts).toEqual({ nodes: 2, links: 1, groups: 1, definitions: 0, depth: 0 });
        expect(result.data).not.toBe(input);
        expect(result.data).toEqual(input);
        expect(JSON.stringify(input)).toBe(before);
    });

    test('a serialized live graph round-trips through the pass', () => {
        const graph = new LGraph();
        graph.configure(doc());
        const data = graph.serialize();
        const result = validate(data);
        expect(result.report.issues).toEqual([]);
        expect(result.data).toEqual(JSON.parse(JSON.stringify(data)));
    });

    test('not a document: refused', () => {
        for (const bad of [null, 3, 'x', [], { nodes: 'no' }, { nodes: [], links: 'no' }]) {
            const result = validate(bad);
            expect(result.ok).toBe(false);
            expect(result.data).toBeNull();
            expect(codes(result, 'error').length).toBeGreaterThan(0);
        }
        expect(validate({}).ok).toBe(true); // an empty document is a valid empty graph
    });
});

describe('bounds', () => {
    const many = (count) => Array.from({ length: count }, (_, i) => node(i + 1));
    test.each([
        ['maxNodes', { nodes: many(4), links: [] }, 3, 'too-many-nodes'],
        ['maxLinks', { ...doc(), links: [[1, 1, 0, 2, 0, 'number'], [2, 1, 0, 2, 1, 'number']] }, 1, 'too-many-links'],
        ['maxGroups', { nodes: [], groups: [{ title: 'a', bounding: [0, 0, 1, 1] }, { title: 'b', bounding: [0, 0, 1, 1] }] }, 1, 'too-many-groups'],
    ])('%s', (key, data, limit, code) => {
        const result = validate(data, { limits: { [key]: limit } });
        expect(result.ok).toBe(false);
        expect(codes(result, 'error')).toContain(code);
        const issue = result.report.issues.find((i) => i.code === code);
        expect(issue.limit).toBe(limit);
        expect(validate(data, { limits: { [key]: limit }, repair: true }).ok).toBe(false); // bounds are never repaired
        expect(validate(data, { limits: { [key]: limit + 10 } }).ok).toBe(true);
    });

    test('maxDefinitions counts nested definition blocks', () => {
        const def = (id, inner = []) => ({ id, nodes: [], links: [], inputs: [], outputs: [], definitions: { subgraphs: inner } });
        const data = { nodes: [], links: [], definitions: { subgraphs: [def('d1', [def('d2')]), def('d3')] } };
        expect(validate(data).report.counts.definitions).toBe(3);
        expect(codes(validate(data, { limits: { maxDefinitions: 2 } }), 'error')).toContain('too-many-definitions');
    });

    test('maxDepth bounds inline subgraph and definition nesting', () => {
        let inner = { nodes: [node(9)], links: [] };
        for (let i = 0; i < 5; i++) inner = { nodes: [node(i + 1, 'graph/subgraph', { subgraph: inner })], links: [] };
        expect(validate(inner).report.counts.depth).toBe(5);
        const result = validate(inner, { limits: { maxDepth: 4 } });
        expect(codes(result, 'error')).toContain('too-deep');
        expect(validate(inner, { limits: { maxDepth: 5 } }).ok).toBe(true);
    });

    test('maxValueDepth bounds nested values in properties, extra and foreign fields', () => {
        let deep = 1;
        for (let i = 0; i < 20; i++) deep = { a: deep };
        expect(codes(validate({ nodes: [node(1, 'loader/src', { properties: { deep } })] }, { limits: { maxValueDepth: 10 } }), 'error')).toContain('value-too-deep');
        expect(codes(validate({ nodes: [], extra: { deep } }, { limits: { maxValueDepth: 10 } }), 'error')).toContain('value-too-deep');
        expect(codes(validate({ nodes: [], someEditor: [[[[[[[[[[[[1]]]]]]]]]]]] }, { limits: { maxValueDepth: 10 } }), 'error')).toContain('value-too-deep');
        expect(validate({ nodes: [node(1, 'loader/src', { properties: { deep } })] }).ok).toBe(true);
    });

    test('maxStringLength bounds every string, keys and titles included', () => {
        const long = 'x'.repeat(101);
        const limits = { maxStringLength: 100 };
        expect(codes(validate({ nodes: [node(1, 'loader/src', { title: long })] }, { limits }), 'error')).toContain('string-too-long');
        expect(codes(validate({ nodes: [node(1, 'loader/src', { properties: { v: long } })] }, { limits }), 'error')).toContain('string-too-long');
        expect(codes(validate({ nodes: [node(1, 'loader/src', { properties: { [long]: 1 } })] }, { limits }), 'error')).toContain('string-too-long');
        expect(codes(validate({ nodes: [node(1, long)] }, { limits }), 'error')).toContain('string-too-long');
        expect(validate({ nodes: [node(1, 'loader/src', { title: 'x'.repeat(100) })] }, { limits }).ok).toBe(true);
    });

    test('maxPropertiesSize bounds one node\'s properties and widget values', () => {
        const limits = { maxPropertiesSize: 1000 };
        const big = Array.from({ length: 200 }, (_, i) => i * 1000);
        expect(codes(validate({ nodes: [node(1, 'loader/src', { properties: { big } })] }, { limits }), 'error')).toContain('properties-too-large');
        expect(codes(validate({ nodes: [node(1, 'loader/src', { widgets_values: big })] }, { limits }), 'error')).toContain('properties-too-large');
        expect(validate({ nodes: [node(1, 'loader/src', { properties: { small: [1, 2, 3] } })] }, { limits }).ok).toBe(true);
    });

    test('maxDocumentSize bounds the whole document', () => {
        const nodes = Array.from({ length: 50 }, (_, i) => node(i + 1, 'loader/src', { properties: { text: 'y'.repeat(100) } }));
        expect(codes(validate({ nodes }, { limits: { maxDocumentSize: 2000 } }), 'error')).toContain('document-too-large');
        expect(validate({ nodes }).ok).toBe(true);
    });

    test('coordinates must be finite and bounded; repair clamps them', () => {
        const limits = { maxCoordinate: 1000 };
        const cases = [
            { nodes: [node(1, 'loader/src', { pos: [5000, 0] })] },
            { nodes: [node(1, 'loader/src', { pos: [Infinity, 0] })] },
            { nodes: [node(1, 'loader/src', { pos: [NaN, 0] })] },
            { nodes: [node(1, 'loader/src', { pos: ['1', 0] })] },
            { nodes: [node(1, 'loader/src', { size: [100, -5000] })] },
            { nodes: [], groups: [{ title: 'g', bounding: [0, 0, 1e9, 10] }] },
            { nodes: [], reroutes: [{ id: 1, pos: [1e9, 0] }] },
            { nodes: [], links: [], definitions: { subgraphs: [{ id: 'd', nodes: [], links: [], inputs: [], outputs: [], inputNode: { id: -10, bounding: [-1e9, 0, 10, 10] } }] } },
        ];
        for (const data of cases) {
            const strict = validate(data, { limits });
            expect(codes(strict, 'error')).toContain('bad-coordinate');
            const repaired = validate(data, { limits, repair: true });
            expect(repaired.ok).toBe(true);
            expect(repaired.report.repaired).toBe(true);
        }
        const clamped = validate({ nodes: [node(1, 'loader/src', { pos: [5000, NaN] })] }, { limits, repair: true });
        expect(clamped.data.nodes[0].pos).toEqual([1000, 0]);
        // the object form some exports produce ({"0": x, "1": y}) is accepted
        expect(validate({ nodes: [node(1, 'loader/src', { pos: { 0: 10, 1: 20 } })] }).ok).toBe(true);
    });

    test('limits come from LiteGraph.settings, and options override them', () => {
        const id = 'LiteGraph.Loader.MaxNodes';
        expect(LiteGraph.settings.get(id)).toBe(GraphLoader.DEFAULT_LIMITS.maxNodes);
        LiteGraph.settings.set(id, 1);
        try {
            expect(GraphLoader.limits().maxNodes).toBe(1);
            expect(codes(validate(doc()), 'error')).toContain('too-many-nodes');
            expect(validate(doc(), { limits: { maxNodes: 5 } }).ok).toBe(true);
        } finally { LiteGraph.settings.reset(id); }
        expect(validate(doc()).ok).toBe(true);
        for (const key of Object.keys(GraphLoader.DEFAULT_LIMITS)) expect(typeof GraphLoader.DEFAULT_LIMITS[key]).toBe('number');
    });
});

describe('runtime-only fields', () => {
    test('graph keys naming runtime members, private keys and prototype keys are dropped; foreign keys are kept', () => {
        const input = JSON.parse(JSON.stringify({ ...doc(), _nodes: [], runStep: 'boom', status: 2, list_of_graphcanvas: [], models: [{ name: 'm.safetensors' }] }).replace('{', '{"__proto__":{"polluted":true},'));
        const result = validate(input);
        expect(result.ok).toBe(true);
        const dropped = result.report.issues.filter((i) => i.code === 'dropped-field').map((i) => i.path).sort();
        expect(dropped).toEqual(['$.__proto__', '$._nodes', '$.list_of_graphcanvas', '$.runStep', '$.status']);
        expect(result.report.issues.every((i) => i.severity === 'warning')).toBe(true);
        expect(Object.hasOwn(result.data, '__proto__')).toBe(false);
        expect(result.data.models).toEqual([{ name: 'm.safetensors' }]);
        const graph = new LGraph();
        graph.configure(result.data);
        expect(Object.getPrototypeOf(graph)).toBe(LGraph.prototype);
        expect(typeof graph.runStep).toBe('function');
    });

    test('node keys naming methods, callbacks and runtime state are dropped; document keys are kept', () => {
        const extra = { graph: { nodes: [] }, onExecute: 'x', getTitle: 'y', widgets: [{}], libraries: ['http://evil.example/x.js'], _data: 1, has_errors: true, last_serialization: {}, widgets_values: [1, 'a'], color: '#123', bgcolor: '#456', shape: 2, comfyField: { keep: true } };
        const input = JSON.parse(JSON.stringify({ nodes: [node(1, 'loader/src', extra)], links: [] }).replace('"properties":{}', '"properties":{"__proto__":{"x":1},"ok":1}'));
        const result = validate(input);
        expect(result.ok).toBe(true);
        const dropped = result.report.issues.filter((i) => i.code === 'dropped-field').map((i) => i.path).sort();
        expect(dropped).toEqual(['$.nodes[0]._data', '$.nodes[0].getTitle', '$.nodes[0].graph', '$.nodes[0].has_errors', '$.nodes[0].last_serialization', '$.nodes[0].libraries', '$.nodes[0].onExecute', '$.nodes[0].properties.__proto__', '$.nodes[0].widgets'].sort());
        const out = result.data.nodes[0];
        expect(out).toMatchObject({ widgets_values: [1, 'a'], color: '#123', bgcolor: '#456', shape: 2, comfyField: { keep: true }, properties: { ok: 1 } });
        expect(Object.hasOwn(out.properties, '__proto__')).toBe(false);
        expect(result.report.issues.find((i) => i.path === '$.nodes[0].onExecute').node).toBe(1);
    });

    test('non-JSON values are refused (strict) or dropped (repair), cycles are refused', () => {
        const fn = { nodes: [node(1, 'loader/src', { properties: { f() {} } })] };
        expect(codes(validate(fn), 'error')).toContain('non-json-value');
        const repaired = validate(fn, { repair: true });
        expect(repaired.ok).toBe(true);
        expect(repaired.data.nodes[0].properties).toEqual({});
        const cyclic = { nodes: [node(1)] };
        cyclic.nodes[0].properties.self = cyclic.nodes[0].properties;
        expect(codes(validate(cyclic), 'error')).toContain('cycle');
        // typed arrays from a live graph become plain arrays
        expect(validate({ nodes: [node(1, 'loader/src', { pos: new Float32Array([1, 2]) })] }).data.nodes[0].pos).toEqual([1, 2]);
    });
});

describe('nodes and links', () => {
    test('malformed nodes are refused', () => {
        expect(codes(validate({ nodes: [3] }), 'error')).toContain('bad-node');
        expect(codes(validate({ nodes: [{ id: 1 }] }), 'error')).toContain('bad-node-type');
        expect(codes(validate({ nodes: [{ id: {}, type: 'loader/src' }] }), 'error')).toContain('bad-node');
        expect(codes(validate({ nodes: [node(1), node(1)] }), 'error')).toContain('duplicate-node-id');
        expect(codes(validate({ nodes: [node(1, 'loader/src', { inputs: 'x' })] }), 'error')).toContain('bad-slots');
        expect(codes(validate({ nodes: [node(1, 'loader/src', { outputs: [{ name: 'o', links: 'x' }] })] }), 'error')).toContain('bad-slots');
        // repair resets malformed slot data; the node class recreates its slots
        const repaired = validate({ nodes: [node(1, 'loader/src', { outputs: [{ name: 'o', links: 'x' }] })] }, { repair: true });
        expect(repaired.ok).toBe(true);
        expect(repaired.data.nodes[0].outputs[0].links).toBeNull();
    });

    test.each([
        ['a non-link entry', 'x', 'bad-link', true],
        ['a short array', [2, 1, 0], 'bad-link', true],
        ['a fractional slot', [2, 1, 0.5, 2, 1, 'number'], 'bad-link', true],
        ['a negative slot', [2, 1, 0, 2, -1, 'number'], 'bad-link', true],
        ['an object id', [{}, 1, 0, 2, 1, 'number'], 'bad-link', true],
        ['a duplicate id', [1, 1, 0, 2, 1, 'number'], 'duplicate-link-id', true],
        ['an unknown target node', [2, 1, 0, 99, 0, 'number'], 'dangling-link', false],
        ['an unknown origin node', { id: 2, origin_id: 77, origin_slot: 0, target_id: 2, target_slot: 1, type: 'number' }, 'dangling-link', false],
        ['a slot past the stored slots', [2, 1, 0, 2, 5, 'number'], 'bad-slot-reference', false],
    ])('%s is reported, and repair removes it', (_name, entry, code, refused) => {
        const data = doc();
        data.links.push(entry);
        data.nodes[1].inputs[1].link = 2;
        const strict = validate(data);
        // malformed entries are refused; links to nothing are reported (configure keeps them inert)
        expect(strict.ok).toBe(!refused);
        expect(codes(strict, refused ? 'error' : 'warning')).toContain(code);
        const repaired = validate(data, { repair: true });
        expect(repaired.ok).toBe(true);
        expect(repaired.report.repaired).toBe(true);
        expect(repaired.data.links).toEqual([[1, 1, 0, 2, 0, 'number']]);
        // the slot reference to the removed link is cleared too
        if (code !== 'duplicate-link-id') expect(repaired.data.nodes[1].inputs[1].link).toBeNull();
        expect(repaired.report.issues.find((i) => i.code === code).severity).toBe('warning');
    });

    test('a slot reference to a missing link is a warning; repair clears it', () => {
        const data = doc();
        data.nodes[1].inputs[1].link = 42;
        data.nodes[0].outputs[0].links = [1, 43];
        const strict = validate(data);
        expect(strict.ok).toBe(true);
        expect(codes(strict, 'warning').sort()).toEqual(['missing-link', 'missing-link']);
        const repaired = validate(data, { repair: true });
        expect(repaired.data.nodes[1].inputs[1].link).toBeNull();
        expect(repaired.data.nodes[0].outputs[0].links).toEqual([1]);
    });

    test('links must be an array', () => {
        expect(codes(validate({ nodes: [], links: { 1: [1, 1, 0, 2, 0] } }), 'error')).toContain('bad-links');
        expect(validate({ nodes: [], links: null }).ok).toBe(true);
    });

    test('definition links may use the virtual IO nodes -10 and -20; other graphs may not', () => {
        const id = 'b0000000-0000-4000-8000-000000000002';
        const definition = { id, name: 'Pass', nodes: [node(3, 'loader/dst', { inputs: [{ name: 'in', type: 'number', link: 5 }, { name: 'b', type: 'number', link: null }] })],
            links: [{ id: 5, origin_id: -10, origin_slot: 0, target_id: 3, target_slot: 0, type: 'number' }],
            inputs: [{ id: 'i', name: 'x', type: 'number', linkIds: [5] }], outputs: [], inputNode: { id: -10, bounding: [-200, 0, 120, 60] }, outputNode: { id: -20, bounding: [400, 0, 120, 60] } };
        const data = { nodes: [node(1, id)], links: [], definitions: { subgraphs: [definition] } };
        const result = validate(data);
        expect(result.report.issues).toEqual([]);
        expect(result.data.definitions.subgraphs[0].inputs).toEqual(definition.inputs); // the interface is not a runtime field there
        expect(codes(validate({ ...doc(), links: [[1, -10, 0, 2, 0, 'number']] }), 'warning')).toContain('dangling-link');
    });

    test('inline subgraphs are checked like the root, with paths', () => {
        const inner = { nodes: [node(5)], links: [[1, 5, 0, 66, 0, 'number']] };
        const result = validate({ nodes: [node(1, 'graph/subgraph', { subgraph: inner, inputs: 'x' })], links: [] });
        expect(result.ok).toBe(false);
        expect(result.report.issues.find((i) => i.code === 'dangling-link').path).toBe('$.nodes[0].subgraph.links[0]');
        expect(result.report.issues.find((i) => i.code === 'bad-slots').path).toBe('$.nodes[0].inputs');
        expect(validate(inner, { repair: true }).data.links).toEqual([]);
    });
});

describe('type hook', () => {
    test('allowType is asked about every node type with its location; false or a reason refuses', () => {
        const asked = [];
        const id = 'c0000000-0000-4000-8000-000000000003';
        const data = { nodes: [node(1), node(2, 'graph/subgraph', { subgraph: { nodes: [node(7, 'loader/dst')], links: [] } }), node(3, id)], links: [],
            definitions: { subgraphs: [{ id, nodes: [node(4, 'bad/type')], links: [], inputs: [], outputs: [] }] } };
        const result = validate(data, { allowType: (type, context) => {
            asked.push([type, context.path, context.node]);
            return type === 'bad/type' ? 'refused by policy' : true;
        } });
        expect(asked.map(([type]) => type).sort()).toEqual(['bad/type', 'graph/subgraph', 'loader/dst', 'loader/src']); // not the definition instance
        expect(asked.find(([type]) => type === 'loader/dst')[1]).toBe('$.nodes[1].subgraph.nodes[0]');
        expect(result.ok).toBe(false);
        const issue = result.report.issues.find((i) => i.code === 'type-refused');
        expect(issue).toMatchObject({ severity: 'error', node: 4 });
        expect(issue.message).toMatch(/bad\/type.*refused by policy/);
        expect(codes(validate(data, { allowType: (type) => type !== 'loader/src' }), 'error')).toContain('type-refused');
        expect(validate(data, { allowType: (type) => type !== 'loader/src', repair: true }).ok).toBe(false); // never repaired
    });

    test('formatReport summarises the issues', () => {
        const result = validate({ nodes: [node(1), node(1)], links: [[1, 1, 0, 9, 0]] });
        const text = GraphLoader.formatReport(result.report);
        expect(text).toMatch(/duplicate-node-id/);
        expect(text).toMatch(/dangling-link/);
        expect(GraphLoader.formatReport(validate(doc()).report)).toBe('');
    });
});

describe('graph.configureValidated and graph.load', () => {
    test('a refused document leaves the graph unchanged and emits load-report', () => {
        const graph = new LGraph();
        graph.configure(doc());
        const reports = [];
        graph.events.on('load-report', (event) => reports.push(event.detail));
        const result = graph.configureValidated({ nodes: [node(1), node(1)] }, { source: 'drop' });
        expect(result.ok).toBe(false);
        expect(graph._nodes.length).toBe(2);
        expect(reports).toHaveLength(1);
        expect(reports[0]).toMatchObject({ ok: false, source: 'drop' });
        expect(reports[0].report.issues[0].code).toBe('duplicate-node-id');
    });

    test('repair is the default: malformed links are removed, then the document loads', () => {
        const graph = new LGraph();
        const data = doc();
        data.links.push([2, 1, 0, 99, 0, 'number'], 'not a link');
        const reports = [];
        graph.events.on('load-report', (event) => reports.push(event.detail));
        const result = graph.configureValidated(data);
        expect(result.ok).toBe(true);
        expect(result.error).toBe(false);
        expect(Object.keys(graph.links)).toEqual(['1']);
        expect(graph.validateLinks().ok).toBe(true);
        expect(reports[0]).toMatchObject({ ok: true, source: 'data' });
        expect(reports[0].report.repaired).toBe(true);
        // strict mode refuses the same document
        expect(new LGraph().configureValidated(data, { repair: false }).ok).toBe(false);
        // a clean document emits no report
        const quiet = new LGraph();
        let emitted = 0;
        quiet.events.on('load-report', () => emitted++);
        expect(quiet.configureValidated(doc()).ok).toBe(true);
        expect(emitted).toBe(0);
    });

    test('graph.load(Blob) validates by the LiteGraph.Loader.OnOpen setting', async () => {
        const data = doc();
        data.links.push('not a link');
        const loadBlob = (graph) => new Promise((resolve) => graph.load(new Blob([JSON.stringify(data)]), resolve));
        const original = globalThis.FileReader;
        // a minimal FileReader (the Node test environment has none)
        globalThis.FileReader = class { addEventListener(_type, fn) { this.fn = fn; } readAsText(blob) { blob.text().then((result) => this.fn({ target: { result } })); } };
        try {
        expect(LiteGraph.settings.get('LiteGraph.Loader.OnOpen')).toBe('repair');
        const repaired = new LGraph();
        const result = await loadBlob(repaired);
        expect(result.ok).toBe(true);
        expect(Object.keys(repaired.links)).toEqual(['1']);
        LiteGraph.settings.set('LiteGraph.Loader.OnOpen', 'strict');
        try {
            const strict = new LGraph();
            expect((await loadBlob(strict)).ok).toBe(false);
            expect(strict._nodes.length).toBe(0);
            LiteGraph.settings.set('LiteGraph.Loader.OnOpen', 'off');
            const trusted = new LGraph();
            await loadBlob(trusted);
            expect(trusted._nodes.length).toBe(2); // configure() as before
        } finally { LiteGraph.settings.reset('LiteGraph.Loader.OnOpen'); }
        // a file that is not JSON is refused with a report
        const reports = [];
        const broken = new LGraph();
        broken.events.on('load-report', (event) => reports.push(event.detail));
        const refused = await new Promise((resolve) => broken.load(new Blob(['{nope']), resolve));
        expect(refused.ok).toBe(false);
        expect(reports[0].report.issues[0].code).toBe('bad-json');
        } finally { globalThis.FileReader = original; }
    });

    test('configure() itself is unchanged: no validation on trusted in-memory data', () => {
        const graph = new LGraph();
        const data = doc({ someEditorState: { a: 1 } });
        data.links.push([2, 1, 0, 99, 0, 'number']);
        expect(graph.configure(data)).toBe(false);
        expect(graph._nodes.length).toBe(2);
    });
});

describe('every example and fixture validates strict', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const files = [];
    const walk = (dir) => {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) walk(full);
            else if (/\.json$/i.test(name) && name !== 'index.json' && !name.endsWith('.expected.json')) files.push(full);
        }
    };
    walk(path.join(root, 'apps/editor/examples'));
    walk(path.join(root, 'test/fixtures'));
    walk(path.join(root, 'apps/runner/workflows'));
    test('there are files to check', () => expect(files.length).toBeGreaterThan(20));
    test.each(files.map((file) => [path.relative(root, file), file]))('%s', (_name, file) => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const result = validate(data);
        expect(result.report.issues.filter((i) => i.severity === 'error')).toEqual([]);
        expect(result.report.issues.filter((i) => i.code === 'dropped-field')).toEqual([]);
        expect(result.ok).toBe(true);
    });
});
