import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const bundle = new URL('../.lg/classic-build/litegraph.classic.js', import.meta.url);
const script = new Script(readFileSync(bundle, 'utf8'), { filename: 'litegraph.classic.js' });
const browser = createContext({ console, document: {}, queueMicrotask, setTimeout, clearTimeout });
const run = (source) => new Script(source).runInContext(browser);
run("globalThis.window = globalThis");

script.runInContext(browser);
assert.equal(run(`
    typeof LiteGraph === "object" &&
    LGraph === LiteGraph.LGraph && LGraphNode === LiteGraph.LGraphNode &&
    LGraphCanvas === LiteGraph.LGraphCanvas && LGraphGroup === LiteGraph.LGraphGroup &&
    LLink === LiteGraph.LLink && DragAndScale === LiteGraph.DragAndScale &&
    typeof ContextMenu === "function" && typeof CurveEditor === "function" &&
    LGraphTexture === LiteGraph.registered_node_types["texture/texture"] &&
    typeof LiteGraphClass === "undefined" && typeof ExecutionEngine === "undefined" &&
    !LiteGraph.allow_scripts
`), true, 'Classic globals should expose only the intended API and share the registered classes');

assert.equal(run(`
    (() => {
        const graph = new LGraph();
        const value = LiteGraph.createNode("basic/const");
        const watch = LiteGraph.createNode("basic/watch");
        graph.add(value);
        graph.add(watch);
        value.setProperty("value", 42);
        value.connect(0, watch, 0);
        graph.runStep();
        return watch.getInputData(0);
    })()
`), 42);

const registry = browser.LiteGraph;
assert.throws(() => script.runInContext(browser), /only LiteGraph build/);
assert.equal(browser.LiteGraph, registry);
console.log('Classic script exposes a single LiteGraph registry, runs a graph, and leaves unrelated globals alone.');
