import { LiteGraph } from "./litegraph.js";

// this needs to be called after all classes has been included, before registering nodes and creating canvas
// will setup callback handlers and LiteGraph.CLASSES references ( eg. LitegGraph.LGraph, .. )
LiteGraph.initialize();