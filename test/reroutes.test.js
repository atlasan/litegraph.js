import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { Reroute } from '../src/reroute.js';
import { ComfyInterop } from '../src/extensions/comfy_interop.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); } }
    class Dst { constructor() { this.addInput('in', 'number'); } }
    LiteGraph.registerNodeType('rr/src', Src);
    LiteGraph.registerNodeType('rr/dst', Dst);
});

const json = (value) => JSON.parse(JSON.stringify(value));

function linked() {
    const graph = new LGraph();
    const a = LiteGraph.createNode('rr/src');
    const b = LiteGraph.createNode('rr/dst');
    const c = LiteGraph.createNode('rr/dst');
    graph.add(a); graph.add(b); graph.add(c);
    a.connect(0, b, 0);
    a.connect(0, c, 0);
    const [ab, ac] = Object.values(graph.links);
    return { graph, a, b, c, ab, ac };
}

test('reroutes chain from origin to target and get sequential ids', () => {
    const { graph, ab } = linked();
    const r1 = graph.addReroute([100, 10], ab);
    const r2 = graph.addReroute([200, 10], ab); // inserted nearest the target
    expect([r1.id, r2.id]).toEqual([1, 2]);
    expect(ab.parentId).toBe(r2.id);
    expect(r2.parentId).toBe(r1.id);
    expect(graph.getRerouteChain(ab).map((r) => r.id)).toEqual([1, 2]);
    expect(graph.state.lastRerouteId).toBe(2);
    graph.clear();
});

test('removing a reroute reconnects its links and children to its parent', () => {
    const { graph, ab } = linked();
    const r1 = graph.addReroute([100, 10], ab);
    const r2 = graph.addReroute([200, 10], ab);
    graph.removeReroute(r2.id);
    expect(ab.parentId).toBe(r1.id);
    const r3 = graph.addReroute([300, 10], ab);
    graph.removeReroute(r1.id);
    expect(r3.parentId).toBeUndefined();
    expect(graph.getRerouteChain(ab).map((r) => r.id)).toEqual([r3.id]);
    graph.removeReroute(r3.id);
    expect(ab.parentId).toBeUndefined();
    expect(graph.removeReroute(999)).toBe(false);
    graph.clear();
});

test('shared reroutes serialize in the ComfyUI 0.4 form and load back', () => {
    const { graph, ab, ac } = linked();
    const shared = graph.addReroute([100, 10], ab);
    ac.parentId = shared.id; // both links pass through it
    const own = graph.addReroute([150, 40], ac);
    graph.addReroute([0, 0]); // unused: not saved

    const data = json(graph.serialize());
    expect(data.extra.reroutes).toEqual([
        { id: shared.id, pos: [100, 10], linkIds: [ab.id, ac.id] },
        { id: own.id, pos: [150, 40], linkIds: [ac.id], parentId: shared.id },
    ]);
    expect(data.extra.linkExtensions).toEqual([{ id: ab.id, parentId: shared.id }, { id: ac.id, parentId: own.id }]);
    expect(graph.extra.reroutes).toBeUndefined(); // the live extra is not polluted

    const loaded = new LGraph();
    loaded.configure(data);
    expect(loaded.reroutes.size).toBe(2);
    expect(loaded.getRerouteChain(loaded.links[ac.id]).map((r) => r.id)).toEqual([shared.id, own.id]);
    expect(loaded.extra.reroutes).toBeUndefined();
    expect(json(loaded.serialize()).extra).toEqual(data.extra);
    const next = loaded.addReroute([1, 1], loaded.links[ab.id]);
    expect(next.id).toBe(4);
    graph.clear();
    loaded.clear();
});

test('reroutes load from version 1 documents and from linkIds alone', () => {
    const { graph, ab } = linked();
    const doc = json(graph.serialize());
    // version 1 style: top-level reroutes, link parent on the link object
    const v1 = { ...doc, reroutes: [{ id: 5, pos: [9, 9], linkIds: [ab.id] }],
        links: doc.links.map(([id, o, os, t, ts, type]) => ({ id, origin_id: o, origin_slot: os, target_id: t, target_slot: ts, type, ...(id === ab.id ? { parentId: 5 } : {}) })) };
    const fromV1 = new LGraph();
    fromV1.configure(v1);
    expect(fromV1.links[ab.id].parentId).toBe(5);
    expect(fromV1.state.lastRerouteId).toBe(5);

    // only linkIds (no linkExtensions): the nearest-target reroute becomes the parent
    const listOnly = { ...doc, extra: { reroutes: [{ id: 1, pos: [0, 0], linkIds: [ab.id] }, { id: 2, pos: [5, 0], parentId: 1, linkIds: [ab.id] }] } };
    const fromList = new LGraph();
    fromList.configure(listOnly);
    expect(fromList.links[ab.id].parentId).toBe(2);
    expect(fromList.getRerouteChain(fromList.links[ab.id]).map((r) => r.id)).toEqual([1, 2]);
    for (const g of [graph, fromV1, fromList]) g.clear();
});

test('ComfyUI exports keep modelled reroutes in both schema versions', () => {
    const { graph, ab } = linked();
    graph.addReroute([100, 10], ab);
    const v04 = json(ComfyInterop.exportWorkflow(graph));
    expect(v04.extra.reroutes).toHaveLength(1);
    expect(v04.extra.linkExtensions).toEqual([{ id: ab.id, parentId: 1 }]);
    const v1 = json(ComfyInterop.exportWorkflow(graph, { version: 1 }));
    expect(v1.reroutes).toHaveLength(1);
    expect(v1.links.find((l) => l.id === ab.id).parentId).toBe(1);
    expect(v1.state.lastRerouteId).toBe(1);
    graph.clear();
});

test('reroute hit testing and movement', () => {
    const graph = new LGraph();
    const r = graph.addReroute([50, 50]);
    expect(graph.getRerouteOnPos(53, 52)).toBe(r);
    expect(graph.getRerouteOnPos(70, 50)).toBeNull();
    r.move(10, -5);
    expect(r.pos).toEqual([60, 45]);
    expect(new Reroute(1, [1, 2], 3).serialize([7])).toEqual({ id: 1, pos: [1, 2], linkIds: [7], parentId: 3 });
    graph.clear();
});

test('links draw through their reroutes; only the last segment carries the link', () => {
    const { graph, ab } = linked();
    graph.addReroute([100, 10], ab);
    graph.addReroute([200, 10], ab);
    const canvas = Object.create(LGraphCanvas.prototype);
    Object.assign(canvas, { graph, highlighted_links: {}, default_link_color: '#9A9' });
    const calls = [];
    canvas.renderLink = (ctx, a, b, link, skip, flow, color, sd, ed) => calls.push({ a: [a[0], a[1]], b: [b[0], b[1]], link, color, sd, ed });
    const points = [[0, 0], ...graph.getRerouteChain(ab).map((r) => r.pos), [300, 10]];
    canvas.renderLinkPath({}, points, ab, false, 0, null, LiteGraph.RIGHT, LiteGraph.LEFT);
    expect(calls).toHaveLength(3);
    expect(calls.map((c) => c.a)).toEqual([[0, 0], [100, 10], [200, 10]]);
    expect(calls.map((c) => c.link)).toEqual([null, null, ab]);
    expect(calls[0].color).toBeTruthy();

    const ctx = { save: jest.fn(), restore: jest.fn(), beginPath: jest.fn(), arc: jest.fn(), fill: jest.fn(), stroke: jest.fn() };
    canvas.drawReroutes(ctx);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    graph.clear();
});

test('floating reroutes (owned by floatingLinks) load, are modelled and round-trip', () => {
    const { graph } = linked();
    const doc = json(graph.serialize());
    doc.extra = { reroutes: [{ id: 3, pos: [1, 2], linkIds: [], floating: { slotType: 'output' } }] };
    doc.floatingLinks = [{ id: 9, origin_id: 1, origin_slot: 0, target_id: -1, target_slot: -1, type: 'number', parentId: 3 }];
    const loaded = new LGraph();
    loaded.configure(doc);
    expect(loaded.reroutes.size).toBe(1);
    expect(loaded.floating_links.get(9).origin_id).toBe(1);
    const out = json(loaded.serialize());
    expect(out.extra.reroutes).toEqual(doc.extra.reroutes);
    expect(out.floatingLinks).toEqual(doc.floatingLinks);
    expect(loaded.addReroute([0, 0]).id).toBe(4); // ids stay unique
    graph.clear();
    loaded.clear();
});

describe('floating reroutes', () => {
    test('removing a routed link keeps its reroutes, attached to the end that remains', () => {
        const { graph, a, b, ab } = linked();
        const r1 = graph.addReroute([100, 10], ab);
        const r2 = graph.addReroute([200, 10], ab);
        b.disconnectInput(0); // the input side goes: the chain stays on the output
        const [floating] = graph.floating_links.values();
        expect(floating).toMatchObject({ origin_id: a.id, origin_slot: 0, target_id: -1, parentId: r2.id });
        expect(graph.getFloatingLinkEnd(floating)).toEqual({ node: a, slot: 0, isOutput: true });
        const out = json(graph.serialize());
        expect(out.floatingLinks).toHaveLength(1);
        expect(out.extra.reroutes.map((r) => [r.id, r.floating?.slotType])).toEqual([[r1.id, 'output'], [r2.id, 'output']]);
        // a node removal drops the floating links attached to it
        graph.remove(a);
        expect(graph.floating_links.size).toBe(0);
        graph.clear();
    });

    test('disconnecting the output keeps the chain on the input; shared reroutes make no floating link', () => {
        const { graph, a, c, ab, ac } = linked();
        const shared = graph.addReroute([100, 10], ab);
        graph.routeLink(ac, shared.id);
        a.disconnectOutput(0, c); // ac goes, but ab still uses the reroute
        expect(graph.floating_links.size).toBe(0);
        a.disconnectOutput(0); // now ab goes too, from the output side
        const [floating] = graph.floating_links.values();
        expect(floating).toMatchObject({ origin_id: -1, target_id: ab.target_id, target_slot: 0, parentId: shared.id });
        graph.clear();
    });

    test('routing a link through the chain again attaches it; keep_floating_reroutes=false keeps nothing', () => {
        const { graph, a, b, ab } = linked();
        const r1 = graph.addReroute([100, 10], ab);
        b.disconnectInput(0);
        expect(graph.floating_links.size).toBe(1);
        const link = a.connect(0, b, 0);
        graph.routeLink(link, r1.id);
        expect(graph.floating_links.size).toBe(0);
        expect(json(graph.serialize()).extra.reroutes[0].floating).toBeUndefined();
        const was = LiteGraph.keep_floating_reroutes;
        LiteGraph.keep_floating_reroutes = false;
        try {
            b.disconnectInput(0);
            expect(graph.floating_links.size).toBe(0);
        } finally { LiteGraph.keep_floating_reroutes = was; }
        graph.clear();
    });

    test('removing the last reroute of a floating link drops it; the middle one re-parents', () => {
        const { graph, b, ab } = linked();
        const r1 = graph.addReroute([100, 10], ab);
        const r2 = graph.addReroute([200, 10], ab);
        b.disconnectInput(0);
        graph.removeReroute(r2.id);
        expect([...graph.floating_links.values()][0].parentId).toBe(r1.id);
        graph.removeReroute(r1.id);
        expect(graph.floating_links.size).toBe(0);
        graph.clear();
    });
});
