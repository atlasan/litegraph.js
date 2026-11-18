import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { LGraphEventTarget } from '../src/eventtarget.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); } }
    class Dst { constructor() { this.addInput('in', 'number'); } }
    LiteGraph.registerNodeType('ev/src', Src);
    LiteGraph.registerNodeType('ev/dst', Dst);
});

describe('LGraphEventTarget', () => {
    test('on/off/once, order, unsubscribe and AbortSignal', () => {
        const owner = {};
        const target = new LGraphEventTarget(owner);
        const seen = [];
        const off = target.on('x', (e) => seen.push(['a', e.detail, e.target === owner]));
        target.once('x', (e) => seen.push(['once', e.detail]));
        const controller = new AbortController();
        target.on('x', () => seen.push(['signal']), { signal: controller.signal });
        target.dispatch('x', 1);
        controller.abort();
        off();
        target.dispatch('x', 2);
        expect(seen).toEqual([['a', 1, true], ['once', 1], ['signal']]);
        expect(target.has('x')).toBe(false);
    });

    test('a throwing listener is reported and the rest still run', () => {
        const errors = [];
        const target = new LGraphEventTarget(null, (error, event) => errors.push([error.message, event.type]));
        const after = jest.fn();
        target.on('x', () => { throw new Error('bad'); });
        target.on('x', after);
        target.dispatch('x');
        expect(errors).toEqual([['bad', 'x']]);
        expect(after).toHaveBeenCalled();
    });

    test('only cancelable events can be prevented', () => {
        const target = new LGraphEventTarget();
        target.on('x', (e) => e.preventDefault());
        expect(target.dispatch('x', null).defaultPrevented).toBe(false);
        expect(target.dispatch('x', null, { cancelable: true }).defaultPrevented).toBe(true);
    });
});

describe('graph events', () => {
    test('node-added, node-removed and changed carry the node and revision', () => {
        const graph = new LGraph();
        const log = [];
        graph.events.on('node-added', (e) => log.push(['added', e.detail.node.type]));
        graph.events.on('node-removed', (e) => log.push(['removed', e.detail.node.type]));
        graph.events.on('changed', (e) => log.push(['changed', e.detail.action, e.detail.revision]));
        const node = LiteGraph.createNode('ev/src');
        graph.add(node);
        graph.remove(node);
        expect(log).toEqual([
            ['changed', 'nodeAdd', 1], ['added', 'ev/src'],
            ['changed', 'nodeRemove', 2], ['removed', 'ev/src'],
        ]);
        graph.clear();
    });

    test('a transaction emits one changed event with its label', () => {
        const graph = new LGraph();
        const changes = [];
        graph.events.on('changed', (e) => changes.push(e.detail.action));
        graph.transact('build', () => {
            const a = LiteGraph.createNode('ev/src');
            const b = LiteGraph.createNode('ev/dst');
            graph.add(a);
            graph.add(b);
            a.connect(0, b, 0);
        });
        expect(changes).toEqual(['build']);
        graph.clear();
    });

    test('configuring can migrate or cancel a document; configured reports errors', () => {
        const graph = new LGraph();
        graph.add(LiteGraph.createNode('ev/src'));
        const doc = graph.serialize();

        const target = new LGraph();
        const configured = [];
        target.events.on('configured', (e) => configured.push(e.detail.error));
        const off = target.events.on('configuring', (e) => { e.detail.data.extra = { migrated: true }; });
        target.configure(JSON.parse(JSON.stringify(doc)));
        expect(target.extra.migrated).toBe(true);
        off();

        target.events.on('configuring', (e) => e.preventDefault());
        expect(target.configure({ nodes: [], links: [] })).toBeNull();
        expect(target._nodes).toHaveLength(1); // unchanged
        expect(configured).toEqual([false]);
        graph.clear();
        target.clear();
    });

    test('reroute events', () => {
        const graph = new LGraph();
        const log = [];
        graph.events.on('reroute-added', (e) => log.push(['added', e.detail.reroute.id]));
        graph.events.on('reroute-removed', (e) => log.push(['removed', e.detail.reroute.id]));
        const r = graph.addReroute([0, 0]);
        graph.removeReroute(r.id);
        expect(log).toEqual([['added', 1], ['removed', 1]]);
        graph.clear();
    });

    test('no listeners: no event objects are created', () => {
        const graph = new LGraph();
        graph.add(LiteGraph.createNode('ev/src'));
        expect(graph._events).toBeUndefined();
        graph.clear();
    });
});

describe('canvas events', () => {
    test('subgraph-opened and subgraph-closed', () => {
        const canvas = Object.create(LGraphCanvas.prototype);
        const parent = new LGraph();
        const child = new LGraph();
        canvas.graph = parent;
        canvas.ds = { offset: [0, 0], scale: 1 };
        canvas.clear = () => {};
        canvas.checkPanels = () => {};
        canvas.setDirty = () => {};
        canvas.centerOnNode = () => {};
        canvas.selectNodes = () => {};
        canvas.processCallbackHandlers = () => null;
        const log = [];
        canvas.events.on('subgraph-opened', (e) => log.push(['open', e.detail.graph === child, e.detail.parent === parent]));
        canvas.events.on('subgraph-closed', (e) => log.push(['close', e.detail.graph === parent, e.detail.subgraph === child]));
        canvas.openSubgraph(child);
        canvas.closeSubgraph();
        expect(log).toEqual([['open', true, true], ['close', true, true]]);
        parent.clear();
        child.clear();
    });
});
