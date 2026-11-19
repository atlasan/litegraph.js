import { LiteGraph } from '../src/litegraph.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
});

test('definition from static def, classic statics and capability rules, without creating a node', () => {
    let constructed = 0;
    class Modern {
        static def = {
            display_name: 'Modern Node',
            description: 'Adds things',
            search_aliases: ['plus', 'sum'],
            capabilities: ['custom-cap'],
            experimental: true,
            inputs: [{ name: 'a', type: 'number', tooltip: 'first' }],
            outputs: [{ name: 'out', type: 'number' }],
        };
        constructor() { constructed++; }
    }
    class Classic { static desc = 'Old style'; static skip_list = true; static capabilities = ['browser']; }
    LiteGraph.registerNodeType('defs/modern', Modern);
    LiteGraph.declareCapabilities('defs/', ['webgl']);
    LiteGraph.registerNodeType('defs/classic', Classic);
    const modern = LiteGraph.getNodeDefinition('defs/modern');
    expect(modern).toMatchObject({
        type: 'defs/modern', title: 'Modern Node', description: 'Adds things', category: 'defs',
        search_aliases: ['plus', 'sum'], experimental: true, deprecated: false, hidden: false,
        inputs: [{ name: 'a', type: 'number', tooltip: 'first' }], outputs: [{ name: 'out', type: 'number' }],
    });
    expect([...modern.capabilities].sort()).toEqual(['custom-cap', 'webgl']);
    expect(Object.isFrozen(modern)).toBe(true);
    const classic = LiteGraph.getNodeDefinition('defs/classic');
    expect(classic).toMatchObject({ title: 'Classic', description: 'Old style', hidden: true, inputs: null });
    expect([...classic.capabilities].sort()).toEqual(['browser', 'webgl']); // rule applies to later registrations
    expect(constructed).toBe(0);

    expect(LiteGraph.listNodeDefinitions({ category: 'defs' }).map((d) => d.type).sort()).toEqual(['defs/classic', 'defs/modern']);
    expect(LiteGraph.listNodeDefinitions({ category: 'defs', includeHidden: false }).map((d) => d.type)).toEqual(['defs/modern']);
    expect(LiteGraph.listNodeDefinitions({ capability: 'custom-cap' }).map((d) => d.type)).toEqual(['defs/modern']);

    LiteGraph.unregisterNodeType('defs/classic');
    expect(LiteGraph.getNodeDefinition('defs/classic')).toBeNull();
});

test('runtime support: known capabilities are checked, custom ones are descriptive', () => {
    class NeedsNode { static capabilities = ['node', 'custom-thing']; }
    class NeedsMidi { static capabilities = ['midi']; }
    LiteGraph.registerNodeType('caps/node', NeedsNode);
    LiteGraph.registerNodeType('caps/midi', NeedsMidi);
    const runtime = LiteGraph.getRuntimeCapabilities();
    expect(runtime.has('node')).toBe(true); // jest runs on Node.js
    expect(LiteGraph.isNodeTypeSupported('caps/node')).toBe(true);
    expect(LiteGraph.getMissingCapabilities('caps/midi', new Set(['node']))).toEqual(['midi']);
    expect(LiteGraph.isNodeTypeSupported('caps/midi', new Set(['node']))).toBe(false);
    expect(LiteGraph.isNodeTypeSupported('caps/missing')).toBe(false);
    expect(LiteGraph.listNodeDefinitions({ category: 'caps', supportedOnly: true }).map((d) => d.type)).toContain('caps/node');
});

test('search text covers type, title, aliases and description', () => {
    class Searchable { static title = 'Fancy Mixer'; static desc = 'Blends two colours'; static search_aliases = ['lerp']; }
    LiteGraph.registerNodeType('search/mix', Searchable);
    const text = LiteGraph.getNodeSearchText('search/mix');
    for (const word of ['search/mix', 'fancy mixer', 'lerp', 'blends']) expect(text).toContain(word);
    expect(LiteGraph.getNodeSearchText('not/registered')).toBe('not/registered');
});
