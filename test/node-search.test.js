import { LiteGraph } from '../src/litegraph.js';
import { NodeSearch } from '../src/nodesearch.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    const reg = (type, def, slots = {}) => {
        class N { static def = def; constructor() { for (const [n, t] of slots.in ?? []) this.addInput(n, t); for (const [n, t] of slots.out ?? []) this.addOutput(n, t); } }
        LiteGraph.registerNodeType(type, N);
        for (const [, t] of slots.in ?? []) LiteGraph.registerNodeAndSlotType(type, t);
        for (const [, t] of slots.out ?? []) LiteGraph.registerNodeAndSlotType(type, t, true);
    };
    reg('qs/add', { display_name: 'Add', description: 'sum of two numbers', search_aliases: ['plus'], inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], outputs: [{ name: 'sum', type: 'number' }], source: 'core' });
    reg('qs/adder_deluxe', { display_name: 'Deluxe Adder', description: 'adds' , source: 'pack-x' });
    reg('qs/text/concat', { display_name: 'Concat', description: 'joins strings', search_aliases: ['join'], source: 'core' }, { in: [['a', 'string']], out: [['s', 'string']] });
    reg('qs/old_add', { display_name: 'Old Add', deprecated: true });
    reg('qs/beta_add', { display_name: 'Beta Add', experimental: true });
});

const types = () => Object.keys(LiteGraph.registered_node_types).filter((t) => t.startsWith('qs/'));
const search = (q) => LiteGraph.nodeSearch.search(q, { types: types() }).map((r) => r.type);

test('parseQuery separates words from i:/o:/c:/s: filters', () => {
    expect(NodeSearch.parseQuery('Add  i:Number c:math s:core extra')).toEqual({ terms: ['add', 'extra'], filters: { i: ['number'], o: [], c: ['math'], s: ['core'] } });
    expect(NodeSearch.parseQuery('')).toEqual({ terms: [], filters: { i: [], o: [], c: [], s: [] } });
});

test('ranking: exact title beats prefix beats alias beats description', () => {
    expect(search('add')).toEqual(['qs/add', 'qs/beta_add', 'qs/adder_deluxe']); // exact, whole word, word prefix
    expect(search('plus')).toEqual(['qs/add']);               // alias
    expect(search('joins')).toEqual(['qs/text/concat']);       // description
    expect(search('add sum')).toEqual(['qs/add']);              // every word must match
    expect(search('nothing-like-this')).toEqual([]);
});

test('filters narrow by slot types, category and source', () => {
    expect(search('i:number')).toEqual(['qs/add']);            // from the declared def inputs
    expect(search('i:string')).toEqual(['qs/text/concat']);    // from the slot-type registry
    expect(search('o:string')).toEqual(['qs/text/concat']);
    expect(search('c:qs/text')).toEqual(['qs/text/concat']);
    expect(search('c:qs').length).toBeGreaterThan(2);           // sub-categories included
    expect(search('s:pack-x')).toEqual(['qs/adder_deluxe']);
    expect(search('add s:core')).toEqual(['qs/add']);
});

test('definition filters: deprecated hidden by default, settings toggle them, custom filters dispose', () => {
    expect(search('old')).toEqual([]);
    expect(search('beta')).toEqual(['qs/beta_add']);
    LiteGraph.settings.set('LiteGraph.Search.ShowDeprecated', true);
    LiteGraph.settings.set('LiteGraph.Search.ShowExperimental', false);
    try {
        expect(search('old')).toEqual(['qs/old_add']);
        expect(search('beta')).toEqual([]);
    } finally {
        LiteGraph.settings.reset('LiteGraph.Search.ShowDeprecated');
        LiteGraph.settings.reset('LiteGraph.Search.ShowExperimental');
    }
    const dispose = LiteGraph.nodeSearch.registerFilter({ id: 'test.no-text', predicate: (def) => !def.type.startsWith('qs/text') });
    expect(search('concat')).toEqual([]);
    dispose();
    expect(search('concat')).toEqual(['qs/text/concat']);
    expect(LiteGraph.nodeSearch.listFilters().map((f) => f.id)).toEqual(expect.arrayContaining(['core.deprecated', 'core.experimental']));
});
