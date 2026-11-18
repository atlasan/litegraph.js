import library = require('@litegraph/litegraph');
import nodeLibrary = require('@litegraph/litegraph/node');
const graph: library.LGraph = new nodeLibrary.LGraph();
const node = library.LiteGraph.createNode('basic/const');
if (node) graph.add(node);
graph.runStep(1, true, 1);
void graph.clearAsync();

import core = require('@litegraph/litegraph/core');
const coreGraph: library.LGraph = new core.LGraph();
void coreGraph.clearAsync();
