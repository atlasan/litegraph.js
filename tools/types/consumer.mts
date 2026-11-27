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
    graph.events.on("group-added", (event) => { const title: string = event.detail.group.title; void title; }, { priority: 1 });
    graph.events.on("*", (event) => { void event.type; });
    LiteGraph.events.on("node-type-registered", (event) => { const type: string = event.detail.type; void type; });
    const offHook: () => boolean = graph.onHook("onNodeAdded", (info, node: LGraphNode) => { void info.id; void node; }, { priority: 1, once: true });
    const vetoed: boolean = CallbackHandler.is(graph.processCallbackHandlers("onNodeAdded", {}), false);
    const handled: boolean = CallbackHandler.handledAt("onMouseDown", graph.processCallbackHandlers("onMouseDown", {}), CallbackHandler.valueOf);
    const strictId: "LiteGraph.Hooks.StrictHandled" = CallbackHandler.STRICT_HANDLED;
    void offHook; void vetoed; void handled; void strictId; void CallbackHandler.strictHandled();
    off();
    const committed: boolean = graph.commitTransaction();
    const result: number = graph.transact("label", () => 1);
    void committed; void result;
}

// typed hook names: arguments are inferred per host; unknown names still compile
{
    const graph = new LGraph();
    const node = new LGraphNode('typed hooks');
    graph.onHook("onNodeAdded", (info, added) => { const title: string = added.title; void title; void info; });
    node.onHook("onConnectInput", (_info, slot, _type, _output, origin) => { const index: number = slot; void index; void origin.id; return false; });
    node.registerCallbackHandler("onPropertyChanged", (_info, name, value) => { void name.length; void value; });
    LiteGraph.onHook("onNodeTypeRegistered", (_info, type) => { void type.toUpperCase(); });
    node.onHook("onMyCustomHook", (_info, anything) => { void anything; });
    // @ts-expect-error onNodeAdded passes a node, which has no such member
    graph.onHook("onNodeAdded", (_info, added) => added.notAMember);
    const previous = LiteGraph.setDispatchTap((record) => { const ms: number = record.ms; void ms; void record.phase; });
    LiteGraph.setDispatchTap(previous);
}


// HMD first pass: the public starter and glyph-slot contracts compile for consumers.
const starterEntries = LiteGraph.palette.starterPreview({ pack: 'litegraph/basic', category: 'basic' });
const starterReason: string | undefined = starterEntries[0]?.reason;
const glyphLabel: string = LiteGraph.getSlotLabel(node, { name: 'enabled', type: 'boolean', label_icon: '◉', label_mode: 'icon' });
void starterReason; void glyphLabel;
