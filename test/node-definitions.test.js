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
            usage: 'Connect two numbers; read the sum.',
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
        type: 'defs/modern', title: 'Modern Node', description: 'Adds things', usage: 'Connect two numbers; read the sum.', category: 'defs',
        search_aliases: ['plus', 'sum'], experimental: true, deprecated: false, hidden: false,
        inputs: [{ name: 'a', type: 'number', tooltip: 'first' }], outputs: [{ name: 'out', type: 'number' }],
    });
    expect([...modern.capabilities].sort()).toEqual(['custom-cap', 'webgl']);
    expect(Object.isFrozen(modern)).toBe(true);
    const classic = LiteGraph.getNodeDefinition('defs/classic');
    expect(classic).toMatchObject({ title: 'Classic', description: 'Old style', usage: '', hidden: true, inputs: null });
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

describe('execution declarations (Wave 6c)', () => {
    let LGraph;
    beforeAll(async () => {
        ({ LGraph } = await import('../src/lgraph.js'));
        await import('../src/nodes/base.js');
        await import('../src/nodes/events.js');
        await import('../src/nodes/logic.js');
        await import('../src/nodes/math.js');
        await import('../src/nodes/strings.js');
    });
    afterEach(() => { LiteGraph.settings.set('LiteGraph.Execution.AllowAnyMode', false); });
    const graph = (model) => { const g = new LGraph(); g.config.execution = model; return g; };

    test('declarations are readable without creating a node', () => {
        let constructed = 0;
        class Declared {
            static def = { execution: { pure: true, models: { strict: false, event: { default_mode: LiteGraph.ON_EVENT } }, modes: [0, 4] } };
            constructor() { constructed++; }
        }
        LiteGraph.registerNodeType('defs/declared', Declared);
        const exec = LiteGraph.getNodeDefinition('defs/declared').execution;
        expect(exec).toMatchObject({ pure: true, modes: [0, 4], models: { strict: false, event: { default_mode: 1 } } });
        expect(Object.isFrozen(exec)).toBe(true);
        expect(constructed).toBe(0);
        expect(LiteGraph.getNodeDefinition('basic/script').execution).toBeNull(); // undeclared (basic/const is pure since the declaration pass)
        expect(LiteGraph.getNodeDefinition('basic/time').execution).toMatchObject({ pure: true, volatile: true }); // flows step 4
        expect(LiteGraph.getNodeDefinition('logic/CycleFOR').execution).toMatchObject({ emit: 'immediate', loop: true, immediate_inputs: ['break'] });
        expect(LiteGraph.getNodeDefinition('events/timer').execution).toMatchObject({ ticks: true, modes: [0, 2] });
        expect(LiteGraph.getNodeDefinition('math/operation').execution.pure).toBe(true);
        expect(LiteGraph.getNodeDefinition('string/concatenate').execution.pure).toBe(true);
        expect(LiteGraph.getNodeDefinition('math/rand').execution).toMatchObject({ pure: true, volatile: true });
        expect(LiteGraph.getNodeDefinition('math/operation').execution.volatile).toBe(false);
    });

    test('changeMode refuses an invalid mode and names the setting that lifts it', () => {
        const g = graph('ancestors');
        const timer = LiteGraph.createNode('events/timer');
        g.add(timer);
        expect(timer.changeMode(LiteGraph.ON_EVENT)).toBe(false);
        expect(timer.mode).toBe(LiteGraph.ALWAYS);
        expect(timer.mode_refusal).toBe('events/timer: mode "On Event" is not valid for this node under the "ancestors" execution model (valid: Always, Never, Bypass); set LiteGraph.Execution.AllowAnyMode to allow any mode');
        expect(timer.changeMode(LiteGraph.NEVER)).toBe(true);
        LiteGraph.settings.set('LiteGraph.Execution.AllowAnyMode', true);
        expect(timer.changeMode(LiteGraph.ON_EVENT)).toBe(true);
        expect(LiteGraph.getValidNodeModes(LiteGraph.createNode('basic/const'))).toEqual([0, 1, 2, 3, 4, 5]);
        // a model a type declares invalid leaves only NEVER and BYPASS
        const w = LiteGraph.createNode('logic/CycleWHILE');
        graph('strict').add(w);
        expect(LiteGraph.getValidNodeModes(w)).toEqual([LiteGraph.NEVER, LiteGraph.BYPASS]);
    });

    test('a group mode change reports the nodes it skipped', async () => {
        const { LGraphGroup } = await import('../src/lgraphgroup.js');
        const g = graph('ancestors');
        const timer = LiteGraph.createNode('events/timer'); timer.pos = [10, 40]; g.add(timer);
        const c = LiteGraph.createNode('basic/const'); c.pos = [10, 120]; g.add(c);
        const group = new LGraphGroup('G'); group.pos = [0, 0]; group.size = [400, 400]; g.add(group);
        const changed = group.setNodesMode(LiteGraph.ON_EVENT);
        expect(changed).toEqual([c]);
        expect(changed.skipped).toEqual([timer]);
        expect([timer.mode, c.mode]).toEqual([LiteGraph.ALWAYS, LiteGraph.ON_EVENT]);
    });

    test('a new node gets its model\'s default mode; a configured graph keeps its modes', () => {
        const add = (g, type) => { const n = LiteGraph.createNode(type); g.add(n); return n; };
        const a = graph('ancestors');
        expect([add(a, 'math/operation').mode, add(a, 'logic/CycleFOR').mode, add(a, 'math/rand').mode, add(a, 'logic/IF').mode])
            .toEqual([LiteGraph.ON_REQUEST, LiteGraph.ON_EVENT, LiteGraph.ON_REQUEST, LiteGraph.ON_TRIGGER]); // math/rand: volatile since flows step 4
        const s = graph('step');
        expect([add(s, 'math/operation').mode, add(s, 'logic/CycleFOR').mode]).toEqual([LiteGraph.ALWAYS, LiteGraph.ON_EVENT]);
        const legacy = graph('legacy');
        expect([add(legacy, 'math/operation').mode, add(legacy, 'logic/CycleFOR').mode]).toEqual([LiteGraph.ALWAYS, LiteGraph.ALWAYS]);
        // an explicit mode is kept
        const explicit = LiteGraph.createNode('math/operation');
        explicit.mode = LiteGraph.ALWAYS; explicit.mode = LiteGraph.ON_EVENT;
        a.add(explicit);
        expect(explicit.mode).toBe(LiteGraph.ON_EVENT);
        // a saved ALWAYS math node stays ALWAYS when loaded under ancestors
        const saved = graph('ancestors');
        const op = add(saved, 'math/operation');
        op.mode = LiteGraph.ALWAYS;
        const loaded = new LGraph(saved.serialize());
        expect(loaded._nodes[0].mode).toBe(LiteGraph.ALWAYS);
    });
});
