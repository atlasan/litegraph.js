import { LiteGraph } from '../../build/litegraph.js';

// Feed a real link so getInputData follows the same path as an ordinary graph.
const sources = new WeakMap();
export function setNodeInput(node, index, value) {
    if (!node.graph || !node.inputs?.[index]) throw new Error(`Missing input ${index}`);
    let inputs = sources.get(node);
    if (!inputs) { inputs = new Map(); sources.set(node, inputs); }
    let source = inputs.get(index);
    if (!source) {
        source = new LiteGraph.LGraphNode('Test input');
        source.addOutput('value', node.inputs[index].type);
        node.graph.add(source);
        if (!source.connect(0, node, index)) throw new Error(`Cannot connect input ${index}`);
        inputs.set(index, source);
    }
    source.setOutputData(0, value);
}

// LiteGraph treats an empty, 0, "*" or missing slot type as "accept anything",
// and unnamed slots are common. Expectations and actual slots are both passed
// through these so the comparison checks the slot, not how it was spelled.
export function slotType(type) {
    if (type === undefined || type === null || type === '' || type === 0 || type === '*') return 'any';
    return String(type);
}
export function slotName(slot, index, kind) {
    const name = slot?.name;
    return name === undefined || name === null || name === '' ? `${kind}_${index}` : String(name);
}
