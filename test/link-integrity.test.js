import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); } }
    class Dst { constructor() { this.addInput('in', 'number'); this.addInput('b', 'number'); } }
    LiteGraph.registerNodeType('integrity/src', Src);
    LiteGraph.registerNodeType('integrity/dst', Dst);
});

function connected() {
    const graph = new LGraph();
    const a = LiteGraph.createNode('integrity/src'), b = LiteGraph.createNode('integrity/dst');
    graph.add(a); graph.add(b);
    a.connect(0, b, 0);
    return { graph, a, b, link: Object.values(graph.links)[0] };
}
const kinds = (result) => result.issues.map((issue) => issue.kind).sort();

test('a consistent graph validates clean and stays untouched', () => {
    const { graph } = connected();
    const before = JSON.stringify(graph.serialize().links);
    expect(graph.validateLinks({ repair: true })).toEqual({ ok: true, repaired: false, issues: [] });
    expect(JSON.stringify(graph.serialize().links)).toBe(before);
});

test('dangling links and stale slot references are reported, then repaired', () => {
    const { graph, a, b, link } = connected();
    graph.links[99] = Object.assign(Object.create(Object.getPrototypeOf(link)), link, { id: 99, target_id: 12345 });
    a.outputs[0].links.push(99, 77);
    b.inputs[1].link = 55;
    const report = graph.validateLinks();
    expect(report.ok).toBe(false);
    expect(kinds(report)).toEqual(['dangling-link', 'input-references-bad-link', 'output-references-bad-link', 'output-references-bad-link']);
    expect(graph.links[99]).toBeDefined(); // report only
    const fixed = graph.validateLinks({ repair: true });
    expect(fixed.repaired).toBe(true);
    expect(graph.links[99]).toBeUndefined();
    expect(a.outputs[0].links).toEqual([link.id]);
    expect(b.inputs[1].link).toBeNull();
    expect(graph.validateLinks().ok).toBe(true);
});

test('a link missing from its output list is restored; one its input disowns is dropped', () => {
    const { graph, a, b, link } = connected();
    a.outputs[0].links = [];
    let report = graph.validateLinks({ repair: true });
    expect(kinds(report)).toEqual(['link-missing-from-output']);
    expect(a.outputs[0].links).toEqual([link.id]);
    b.inputs[0].link = null;
    report = graph.validateLinks({ repair: true });
    expect(kinds(report)).toEqual(['link-not-referenced-by-input', 'output-references-bad-link']);
    expect(graph.links[link.id]).toBeUndefined();
    expect(a.outputs[0].links).toBeNull();
    expect(graph.validateLinks().ok).toBe(true);
});

test('a link parented to a missing reroute is detached from it', () => {
    const { graph, link } = connected();
    link.parentId = 404;
    expect(kinds(graph.validateLinks({ repair: true }))).toEqual(['missing-reroute']);
    expect(link.parentId).toBeUndefined();
});
