import DefaultLibraryManager, {
    LiteGraph, LiteGraphClass, LGraph, LGraphNode, Subgraph, LibraryManager,
    CallbackHandler, ContextMenu, CurveEditor, isBrowser, getRuntime,
    type SerializedLLink,
} from '@litegraph/litegraph';
import { LGraph as NodeGraph } from '@litegraph/litegraph/node';

class Scale extends LGraphNode {
    constructor() {
        super('Scale');
        this.addInput('value', 'number');
        this.addOutput('result', 'number');
        this.addProperty('factor', 2);
        this.mode = LiteGraph.ON_REQUEST;
    }
    onExecute() { this.setOutputData('result', this.getInputData<number>('value') * this.properties.factor); }
    async onStop() { await Promise.resolve(); }
    async onRemoved() { await Promise.resolve(); }
}
LiteGraph.registerNodeType('typed/scale', Scale);
const graph = new LGraph();
const node = LiteGraph.createNode<Scale>('typed/scale', 'Typed scale');
if (!node) throw new Error('Unregistered type');
graph.add(node, false, { doProcessChange: false });
await graph.whenReady();
node.registerCallbackHandler('onStop', async (_info) => { await Promise.resolve(); });
node.actionDo('go', { value: 1 }, { action_call: 'typed-call' });
node.doExecute();
graph.runStep(2, true, 1);
await graph.stopAsync();
await graph.removeAsync(node);
await graph.clearAsync();
const nodeGraph: LGraph = new NodeGraph();
const sub: Subgraph = LiteGraph.createNode<Subgraph>('graph/subgraph')!;
await sub.subgraph.whenReady();
const manager: LibraryManager = LiteGraph.LibraryManager;
manager.registerLibrary({ key: 'fixture', globalObject: 'Fixture', defaultExport: 'Client', server: { npm: 'fixture' } });
await manager.loadLibrary('fixture');
const constructor: typeof LibraryManager = DefaultLibraryManager;
const singleton: LiteGraphClass = LiteGraph;
const callback = new CallbackHandler(graph);
callback.registerCallbackHandler('event', () => null);
const link: SerializedLLink = ['uuid', 'source', 0, 'target', 1, 'number'];
void [isBrowser(), getRuntime(), new constructor(), singleton, callback, link, ContextMenu, CurveEditor, nodeGraph];
// @ts-expect-error Unknown execution mode.
node.mode = 99;
// @ts-expect-error Missing library key.
manager.registerLibrary({ server: { npm: 'fixture' } });

import { LGraph as CoreGraph } from '@litegraph/litegraph/core';
const coreGraph: LGraph = new CoreGraph();
void coreGraph.clearAsync();

import nodeDefault from '@litegraph/litegraph/node';
const nodeSingleton: LiteGraphClass = nodeDefault.LiteGraph;
void nodeSingleton;

// typed events
{
    const graph = new LGraph();
    const off = graph.events.on("node-added", (event) => { const id: string | number = event.detail.node.id; void id; });
    graph.events.on("changed", (event) => { const revision: number = event.detail.revision; void revision; });
    graph.events.on("configuring", (event) => event.preventDefault());
    off();
    const committed: boolean = graph.commitTransaction();
    const result: number = graph.transact("label", () => 1);
    void committed; void result;
}
