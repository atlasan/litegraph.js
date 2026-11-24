// basic/jsonparse: the parse action reads its text input at once (also when the graph is not
// running) and sets the object output before "done" fires.
import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import '../src/nodes/base.js';

beforeAll(() => { LiteGraph.initialize(); });
beforeEach(() => { for (const level of ['log', 'info', 'debug']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

test('JSON Parse parses on its action before the graph ran, then fires done with the object set', () => {
    const graph = new LGraph();
    graph.setExecutionModel('ancestors');
    const text = LiteGraph.createNode('basic/string');
    text.properties.value = '{"name": "Ada"}';
    const parse = LiteGraph.createNode('basic/jsonparse');
    graph.add(text); graph.add(parse);
    text.connect(0, parse, 1);
    text.setOutputData(0, text.properties.value);
    let seen;
    const done = jest.spyOn(parse, 'triggerSlot').mockImplementation((slot) => { if (slot === 0) seen = parse.getOutputData(1); });
    parse.onAction('parse');
    expect(done).toHaveBeenCalledWith(0);
    expect(seen).toEqual({ name: 'Ada' });
});

test('JSON Parse leaves the output unchanged and fires nothing on invalid JSON', () => {
    const graph = new LGraph();
    const text = LiteGraph.createNode('basic/string');
    const parse = LiteGraph.createNode('basic/jsonparse');
    graph.add(text); graph.add(parse);
    text.connect(0, parse, 1);
    text.setOutputData(0, '{not json');
    const fired = jest.spyOn(parse, 'triggerSlot');
    parse.onAction('parse');
    expect(fired).not.toHaveBeenCalled();
    expect(parse.boxcolor).toBe('red');
});
