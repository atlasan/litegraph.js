import { LiteGraph } from "./litegraph.js";
import { CallbackHandler } from "./callbackhandler.js";
import { LGraphNode } from "./lgraphnode.js";

/**
 * extracted from base nodes
 */

// Subgraph: a node that contains a graph
export class Subgraph {

    static title = "Subgraph";
    static desc = "Graph inside a node";

    constructor() {

        this.size = [140, 80];
        this.properties = { enabled: true };
        this.enabled = true;

        // create inner graph
        this.subgraph = new LiteGraph.LGraph();
        this.subgraph._subgraph_node = this;
        this.subgraph._is_subgraph = true;

        this.subgraph.onTrigger = this.onSubgraphTrigger.bind(this);

        // nodes input node added inside
        this.subgraph.onInputAdded = this.onSubgraphNewInput.bind(this);
        this.subgraph.onInputRenamed = this.onSubgraphRenamedInput.bind(this);
        this.subgraph.onInputTypeChanged = this.onSubgraphTypeChangeInput.bind(this);
        this.subgraph.onInputRemoved = this.onSubgraphRemovedInput.bind(this);

        this.subgraph.onOutputAdded = this.onSubgraphNewOutput.bind(this);
        this.subgraph.onOutputRenamed = this.onSubgraphRenamedOutput.bind(this);
        this.subgraph.onOutputTypeChanged = this.onSubgraphTypeChangeOutput.bind(this);
        this.subgraph.onOutputRemoved = this.onSubgraphRemovedOutput.bind(this);
    }

    onGetInputs() {
        return [["enabled", "boolean"]];
    }

    /*
    Subgraph.prototype.onDrawTitle = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        ctx.fillStyle = "#555";
        var w = LiteGraph.NODE_TITLE_HEIGHT;
        var x = this.size[0] - w;
        ctx.fillRect(x, -w, w, w);
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, -w * 0.6);
        ctx.lineTo(x + w * 0.8, -w * 0.6);
        ctx.lineTo(x + w * 0.5, -w * 0.3);
        ctx.fill();
    };
    */

    onDblClick(e, pos, graphcanvas) {
        var that = this;
        setTimeout(function () {
            graphcanvas.openSubgraph(that.subgraph);
        }, 10);
    }

    /*
    Subgraph.prototype.onMouseDown = function(e, pos, graphcanvas) {
        if (
            !this.flags.collapsed &&
            pos[0] > this.size[0] - LiteGraph.NODE_TITLE_HEIGHT &&
            pos[1] < 0
        ) {
            var that = this;
            setTimeout(function() {
                graphcanvas.openSubgraph(that.subgraph);
            }, 10);
        }
    };
    */

    onAction(action, param, options) {
        LiteGraph.log_debug("subgraph","onAction",...arguments);
        this.subgraph.onAction(action, param, options);
    }

    onExecute() {
        this.enabled = this.getInputOrProperty("enabled");
        if (!this.enabled) {
            return;
        }

        // send inputs to subgraph global inputs
        if (this.inputs) {
            for (let i = 0; i < this.inputs.length; i++) {
                let input = this.inputs[i];
                let value = this.getInputData(i);
                this.subgraph.setInputData(input.name, value);
            }
        }

        // execute
        LiteGraph.log_verbose("subgraph","onExecute","subgraph runStep",this.subgraph);
        this.subgraph.runStep();

        // send subgraph global outputs to outputs
        if (this.outputs) {
            for (let i = 0; i < this.outputs.length; i++) {
                let output = this.outputs[i];
                let value = this.subgraph.getOutputData(output.name);
                LiteGraph.log_verbose("subgraph","onExecute","outputDataSet", i, value);
                this.setOutputData(i, value);
            }
        }
    }

    sendEventToAllNodes(eventname, param, mode) {
        if (this.enabled || eventname === "onStop") {
            LiteGraph.log_debug("subgraph","sendEventToAllNodes",...arguments);
            this.subgraph.sendEventToAllNodes(eventname, param, mode);
        }
    }

    onRemoved() {
        // Removing a subgraph must release nested resources while retaining its
        // configuration for undo or reinsertion.
        if (this.subgraph.status === LiteGraph.LGraph.STATUS_RUNNING) this.subgraph.stop();
        else this.subgraph.sendEventToAllNodes("onStop", undefined, null);
    }

    onDrawBackground(ctx, graphcanvas, canvas, pos) {
        if (this.flags.collapsed) return;
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        // button
        var over = LiteGraph.isInsideRectangle(
            pos[0],
            pos[1],
            this.pos[0],
            this.pos[1] + y,
            this.size[0],
            LiteGraph.NODE_TITLE_HEIGHT,
        );
        let overleft = LiteGraph.isInsideRectangle(
            pos[0],
            pos[1],
            this.pos[0],
            this.pos[1] + y,
            this.size[0] / 2,
            LiteGraph.NODE_TITLE_HEIGHT,
        );
        ctx.fillStyle = over ? "#555" : "#222";
        ctx.beginPath();
        if (this._shape == LiteGraph.BOX_SHAPE) {
            if (overleft) {
                ctx.rect(0, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT);
            } else {
                ctx.rect(
                    this.size[0] / 2,
                    y,
                    this.size[0] / 2 + 1,
                    LiteGraph.NODE_TITLE_HEIGHT,
                );
            }
        } else {
            if (overleft) {
                ctx.roundRect(
                    0,
                    y,
                    this.size[0] / 2 + 1,
                    LiteGraph.NODE_TITLE_HEIGHT,
                    [0, 0, 8, 8],
                );
            } else {
                ctx.roundRect(
                    this.size[0] / 2,
                    y,
                    this.size[0] / 2 + 1,
                    LiteGraph.NODE_TITLE_HEIGHT,
                    [0, 0, 8, 8],
                );
            }
        }
        if (over) {
            ctx.fill();
        } else {
            ctx.fillRect(0, y, this.size[0] + 1, LiteGraph.NODE_TITLE_HEIGHT);
        }
        // button
        ctx.textAlign = "center";
        ctx.font = "24px Arial";
        ctx.fillStyle = over ? "#DDD" : "#999";
        ctx.fillText("+", this.size[0] * 0.25, y + 24);
        ctx.fillText("+", this.size[0] * 0.75, y + 24);
    }

    // Subgraph.prototype.onMouseDown = function(e, localpos, graphcanvas)
    // {
    // 	var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
    // 	if(localpos[1] > y)
    // 	{
    // 		graphcanvas.showSubgraphPropertiesDialog(this);
    // 	}
    // }
    onMouseDown(e, localpos, graphcanvas) {
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        console.log?.(0);
        if (localpos[1] > y) {
            if (localpos[0] < this.size[0] / 2) {
                console.log?.(1);
                graphcanvas.showSubgraphPropertiesDialog(this);
            } else {
                console.log?.(2);
                graphcanvas.showSubgraphPropertiesDialogRight(this);
            }
        }
    }

    computeSize() {
        var num_inputs = this.inputs ? this.inputs.length : 0;
        var num_outputs = this.outputs ? this.outputs.length : 0;
        return [
            200,
            Math.max(num_inputs, num_outputs) * LiteGraph.NODE_SLOT_HEIGHT +
                LiteGraph.NODE_TITLE_HEIGHT,
        ];
    }

    //* *** INPUTS ***********************************
    onSubgraphTrigger(event, param, options) {
        LiteGraph.log_debug("subgraph","onSubgraphTrigger",...arguments);
        var slot = this.findOutputSlot(event);
        if (slot != -1) {
            LiteGraph.log_debug("subgraph","onSubgraphTrigger","triggerSlot",slot);
            this.triggerSlot(slot, param, null, options);
        }
    }

    onSubgraphNewInput(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            // add input to the node
            this.addInput(name, type);
        }
    }

    onSubgraphRenamedInput(oldname, name) {
        var slot = this.findInputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.name = name;
    }

    onSubgraphTypeChangeInput(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.type = type;
    }

    onSubgraphRemovedInput(name) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeInput(slot);
    }

    //* *** OUTPUTS ***********************************
    onSubgraphNewOutput(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            this.addOutput(name, type);
        }
    }

    onSubgraphRenamedOutput(oldname, name) {
        var slot = this.findOutputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.name = name;
    }

    onSubgraphTypeChangeOutput(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.type = type;
    }

    onSubgraphRemovedOutput(name) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeOutput(slot);
    }

    getExtraMenuOptions(graphcanvas) {
        var that = this;
        return [
            {
                content: "Open",
                callback: function () {
                    graphcanvas.openSubgraph(that.subgraph);
                },
            },
        ];
    }

    onResize(size) {
        size[1] += 20; // TODO check and verify onResize callback :: using byRef! 
    }

    serialize() {
        var data = LiteGraph.LGraphNode.prototype.serialize.call(this);
        data.subgraph = this.subgraph.serialize();
        return data;
    }

    // no need to define node.configure, the default method detects node.subgraph and passes the object to node.subgraph.configure()
    reassignSubgraphUUIDs(graph) {
        const idMap = { nodeIDs: {}, linkIDs: {} };

        for (const node of graph.nodes) {
            const oldID = node.id;
            const newID = LiteGraph.uuidv4();
            node.id = newID;

            if (idMap.nodeIDs[oldID] || idMap.nodeIDs[newID]) {
                throw new Error(`New/old node UUID wasn't unique in changed map! ${oldID} ${newID}`);
            }

            idMap.nodeIDs[oldID] = newID;
            idMap.nodeIDs[newID] = oldID;
        }

        for (const link of graph.links) {
            const oldID = link[0];
            const newID = LiteGraph.uuidv4();
            link[0] = newID;

            if (idMap.linkIDs[oldID] || idMap.linkIDs[newID]) {
                throw new Error(`New/old link UUID wasn't unique in changed map! ${oldID} ${newID}`);
            }

            idMap.linkIDs[oldID] = newID;
            idMap.linkIDs[newID] = oldID;

            const nodeFrom = link[1];
            const nodeTo = link[3];

            if (!idMap.nodeIDs[nodeFrom]) {
                throw new Error(`Old node UUID not found in mapping! ${nodeFrom}`);
            }

            link[1] = idMap.nodeIDs[nodeFrom];

            if (!idMap.nodeIDs[nodeTo]) {
                throw new Error(`Old node UUID not found in mapping! ${nodeTo}`);
            }

            link[3] = idMap.nodeIDs[nodeTo];
        }

        // Reconnect links
        for (const node of graph.nodes) {
            if (node.inputs) {
                for (const input of node.inputs) {
                    if (input.link) {
                        input.link = idMap.linkIDs[input.link];
                    }
                }
            }
            if (node.outputs) {
                for (const output of node.outputs) {
                    if (output.links) {
                        output.links = output.links.map((l) => idMap.linkIDs[l]);
                    }
                }
            }
        }

        // Recurse!
        for (const node of graph.nodes) {
            if (node.type === "graph/subgraph") {
                const merge = reassignGraphUUIDs(node.subgraph);
                idMap.nodeIDs.assign(merge.nodeIDs);
                idMap.linkIDs.assign(merge.linkIDs);
            }
        }
    }

    clone() {
        var node = LiteGraph.createNode(this.type);
        var data = this.serialize();

        if (LiteGraph.use_uuids) {
            // LiteGraph.LGraph.serialize() seems to reuse objects in the original graph. But we
            // need to change node IDs here, so clone it first.
            const subgraph = LiteGraph.cloneObject(data.subgraph);

            this.reassignSubgraphUUIDs(subgraph);

            data.subgraph = subgraph;
        }

        delete data["id"];
        delete data["inputs"];
        delete data["outputs"];
        node.configure(data);
        return node;
    }

    buildFromNodes(nodes) {
        // clear all?
        // TODO

        // nodes that connect data between parent graph and subgraph

        // mark inner nodes
        var ids = {};
        // TODO: these aren't currently used.  Examine and decide whether to excise.
        //    var min_x = 0;
        //    var max_x = 0;
        for (let i = 0; i < nodes.length; ++i) {
            ids[node.id] = nodes[i];
            //      min_x = Math.min(node.pos[0], min_x);
            //      max_x = Math.max(node.pos[0], min_x);
        }

        for (let i = 0; i < nodes.length; ++i) {
            let node = nodes[i];
            // check inputs
            if (node.inputs)
                for (let j = 0; j < node.inputs.length; ++j) {
                    let input = node.inputs[j];
                    if (!input || !input.link) continue;
                    let link = node.graph.links[input.link];
                    if (!link) continue;
                    if (ids[link.origin_id]) continue;
                    // this.addInput(input.name,link.type);
                    this.subgraph.addInput(input.name, link.type);
                    /*
                    var input_node = LiteGraph.createNode("graph/input");
                    this.subgraph.add( input_node );
                    input_node.pos = [min_x - 200, last_input_y ];
                    last_input_y += 100;
                    */
                }

            // check outputs
            if (node.outputs)
                for (let j = 0; j < node.outputs.length; ++j) {
                    let output = node.outputs[j];
                    if (!output || !output.links || !output.links.length) continue;
                    //    var is_external = false;
                    for (let k = 0; k < output.links.length; ++k) {
                        let link = node.graph.links[output.links[k]];
                        if (!link) continue;
                        if (ids[link.target_id]) continue;
                        //        is_external = true;
                        break;
                    }
                    // if (!is_external) continue;
                    // this.addOutput(output.name,output.type);
                    /*
                    var output_node = LiteGraph.createNode("graph/output");
                    this.subgraph.add( output_node );
                    output_node.pos = [max_x + 50, last_output_y ];
                    last_output_y += 100;
                    */
                }
        }

        // detect inputs and outputs
        // split every connection in two data_connection nodes
        // keep track of internal connections
        // connect external connections

        // clone nodes inside subgraph and try to reconnect them

        // connect edge subgraph nodes to extarnal connections nodes
    }

    static title_color = "#334";
}


export class GraphInput {

    static title = "Input";
    static desc = "Input of the graph";

    constructor() {

        this.addOutput("", "number");

        this.name_in_graph = "";
        this.properties = {
            name: "",
            type: "number",
            value: 0,
        };

        var that = this;

        this.name_widget = this.addWidget(
            "text",
            "Name",
            this.properties.name,
            function (v) {
                if (!v) {
                    return;
                }
                that.setProperty("name", v);
            },
        );
        this.type_widget = this.addWidget(
            "text",
            "Type",
            this.properties.type,
            function (v) {
                that.setProperty("type", v);
            },
        );

        this.value_widget = this.addWidget(
            "number",
            "Value",
            this.properties.value,
            function (v) {
                that.setProperty("value", v);
            },
        );

        this.widgets_up = true;
        this.size = [180, 90];
    }

    onConfigure() {
        this.updateType();
    }

    // ensures the type in the node output and the type in the associated graph input are the same
    updateType() {
        var type = this.properties.type;
        this.type_widget.value = type;

        // update output
        if (type == "action" || type == "event") type = LiteGraph.EVENT;
        if (this.outputs[0].type !== type) {
            if (!LiteGraph.isValidConnection(this.outputs[0].type, type))
                this.disconnectOutput(0);
            this.outputs[0].type = type;
        }
        this.properties.type = type;

        // update widget
        if (type == "number") {
            this.value_widget.type = "number";
            this.value_widget.value = Number(); // 0
        } else if (type == "boolean") {
            this.value_widget.type = "toggle";
            this.value_widget.value = this.value_widget.value&&(this.value_widget.value+"").toLocaleLowerCase()!=="false"&&this.value_widget.value!==""?true:false; // "true"
        } else if (type == "string") {
            this.value_widget.type = "text";
            this.value_widget.value = this.value_widget.value+""; // ""
        } else {
            this.value_widget.type = null;
            // this.value_widget.value = null;
        }
        this.properties.value = this.value_widget.value;

        // update graph
        if (this.graph && this.name_in_graph) {
            this.graph.changeInputType(this.name_in_graph, type);
        }
    }

    // this is executed AFTER the property has changed
    onPropertyChanged(name, v) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph) {
                if (this.name_in_graph) {
                    // already added
                    this.graph.renameInput(this.name_in_graph, v);
                } else {
                    this.graph.addInput(v, this.properties.type);
                }
            } // what if not?!
            this.name_widget.value = v;
            this.name_in_graph = v;
        } else if (name == "type") {
            this.updateType();
        }
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    }

    onAction(action, param, options) {
        if (this.properties.type == LiteGraph.EVENT) {
            LiteGraph.log_debug("GraphInput","onAction","triggering slot", action, param);
            this.triggerSlot(0, param, null, options);
        }else{
            LiteGraph.log_debug("GraphInput","onAction","NOT eventAction TYPE", "this", this, "arugments", ...arguments);
        }
    }

    onExecute() {
        var name = this.properties.name;
        // read from global input
        var data = this.graph.inputs[name];
        if (!data) {
            this.setOutputData(0, this.properties.value);
            return;
        }

        this.setOutputData(
            0,
            data.value !== undefined ? data.value : this.properties.value,
        );
    }

    onRemoved() {
        if (this.name_in_graph) {
            this.graph.removeInput(this.name_in_graph);
        }
    }
}


// Output for a subgraph
export class GraphOutput {

    static title = "Output";
    static desc = "Output of the graph";

    constructor() {

        this.addInput("", "");

        this.name_in_graph = "";
        this.properties = { name: "", type: "" };

        // Object.defineProperty(this.properties, "name", {
        //     get: function() {
        //         return that.name_in_graph;
        //     },
        //     set: function(v) {
        //         if (v == "" || v == that.name_in_graph) {
        //             return;
        //         }
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.renameOutput(that.name_in_graph, v);
        //         } else {
        //             that.graph.addOutput(v, that.properties.type);
        //         }
        //         that.name_widget.value = v;
        //         that.name_in_graph = v;
        //     },
        //     enumerable: true
        // });

        // Object.defineProperty(this.properties, "type", {
        //     get: function() {
        //         return that.inputs[0].type;
        //     },
        //     set: function(v) {
        //         if (v == "action" || v == "event") {
        //             v = LiteGraph.ACTION;
        //         }
        //         if (!LiteGraph.isValidConnection(that.inputs[0].type,v))
        // 			that.disconnectInput(0);
        //         that.inputs[0].type = v;
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.changeOutputType(
        //                 that.name_in_graph,
        //                 that.inputs[0].type
        //             );
        //         }
        //         that.type_widget.value = v || "";
        //     },
        //     enumerable: true
        // });

        this.name_widget = this.addWidget(
            "text",
            "Name",
            this.properties.name,
            "name",
        );
        this.type_widget = this.addWidget(
            "text",
            "Type",
            this.properties.type,
            "type",
        );
        this.widgets_up = true;
        this.size = [180, 60];
    }

    onPropertyChanged(name, v) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph) {
                if (this.name_in_graph) {
                    // already added
                    this.graph.renameOutput(this.name_in_graph, v);
                } else {
                    this.graph.addOutput(v, this.properties.type);
                }
            } // what if not?!
            this.name_widget.value = v;
            this.name_in_graph = v;
        } else if (name == "type") {
            this.updateType();
        }
    }

    updateType() {
        var type = this.properties.type;
        if (this.type_widget) this.type_widget.value = type;

        // update output
        if (type == "action" || type == "event") type = LiteGraph.EVENT;
        if (this.inputs[0].type !== type) {
            if (!LiteGraph.isValidConnection(this.inputs[0].type, type))
                this.disconnectInput(0);
            this.inputs[0].type = type;
        }
        this.properties.type = type;

        // TODO CHECK why differente from GraphInput 
        /* // update widget
        if (type == "number") {
            this.value_widget.type = "number";
            this.value_widget.value = Number(); // 0
        } else if (type == "boolean") {
            this.value_widget.type = "toggle";
            this.value_widget.value = this.value_widget.value&&(this.value_widget.value+"").toLocaleLowerCase()!=="false"&&this.value_widget.value!==""?true:false; // "true"
        } else if (type == "string") {
            this.value_widget.type = "text";
            this.value_widget.value = this.value_widget.value+""; // ""
        } else {
            this.value_widget.type = null;
            // this.value_widget.value = null;
        }
        this.properties.value = this.value_widget.value; */

        // update graph
        if (this.graph && this.name_in_graph) {
            this.graph.changeOutputType(this.name_in_graph, type);
        }
    }

    onExecute() {
        this._value = this.getInputData(0);
        // setting graph output by name
        this.graph.setOutputData(this.properties.name, this._value);
    }

    onAction(action, param, options) {
        if (this.properties.type == LiteGraph.ACTION) {
            LiteGraph.log_debug("GraphOutput","onAction", ...arguments);
            LiteGraph.log_debug("GraphOutput","onAction", "graphTrigger", this.properties.name, param);
            this.graph.trigger(this.properties.name, param, options);
        }else{
            LiteGraph.log_debug("GraphOutput","onAction","skipping not ACTION type", this.properties.type, this.properties);
        }
    }

    onRemoved() {
        if (this.name_in_graph) {
            this.graph.removeOutput(this.name_in_graph);
        }
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    }
}

// LiteGraph.registerNodeType("graph/subgraph", Subgraph);
// LiteGraph.registerNodeType("graph/input", GraphInput);
// LiteGraph.registerNodeType("graph/output", GraphOutput);

export class NodeFunction extends LGraphNode {

    static title = "NodeFunction";
    static desc = "Subgraph as function";

    constructor() {
        // this.size = [140, 80];
        // this.properties = { subgraph: null };
        // this.enabled = true;
        super(...arguments);
        this._subgraph = null;
        this._linking = false;
        // this.addWidget("button", "subgraph_link", null, function(widget, canvas, node, pos, event){
        //     console.debug("SUBGRAPHLINK", ...arguments);
        //     if(node._linking){
        //         node._linking = false;
        //         widget.name = "subgraph_link";
        //     }else{
        //         node._linking = true;
        //         widget.name = "click on subgraph";
        //     }
        // });
        this.addWidget("button", "refresh", null, this.refreshFunctions_byEvent);
        this._wCombo = this.addWidget("combo", "functions", null, this.functionChange, {values: []});
        this.addWidget("button", "CALL", null, this.onBtnExecute);
        this._subMap = [];
        this._subGFuncNode = null;
        this.properties = {func_subgraph_id: null};
    }

    onBtnExecute(value, canvas, node, pos, event, value_second){
        console.error("SELFEXECUTE", this, ...arguments);
        node.doExecute();
    }

    functionChange(value, canvas, node, pos, event, value_second){
        console.error("FUNCTIONCHANGE", "this", this);
        console.error("FUNCTIONCHANGE", "arguments", ...arguments);
        console.error("FUNCTIONCHANGE", "node", node);
        node.btnSetFunction(null, canvas, node, pos, event);
        node.title = "Func: "+node.title;
    }

    onConfigure(){
        this.refreshFunctions();
        this.ensureSubFunction();
    }

    // SETTING initial onExecute: will override when setting a proper function
    // eg. in a node.js env there will be no add and no chance to check if related node has already been added before this
    onExecute(){
        this.ensureSubFunction();
    }

    onAdded(){
        if(this.properties["func_subgraph_id"] !== null && this.properties["func_subgraph_id"] !== undefined){
            this._wCombo.value = this.properties["func_subgraph_id"];
        }
        this.refreshFunctions();
    }

    refreshFunctions_byEvent(widget, canvas, node, pos, event){
        node.refreshFunctions.bind(node);
    }
    refreshFunctions(){
        const aSubgraphs = this.graph?.findNodesByClass(Subgraph);
        console.debug("NODEFUNCTION refreshFunctions", this, aSubgraphs, this._wCombo);
        this._wCombo.options.values = {};
        this._subMap = [];
        const ths = this;
        if(aSubgraphs && aSubgraphs.length){
            console.debug("NODEFUNCTION subgraphs", aSubgraphs);
            aSubgraphs.forEach(element => {
                // using array
                // this._wCombo.options.values.push(element.title);
                // using object
                ths._wCombo.options.values[element.id] = element.title;
                ths._subMap.push(element.id);
                if(ths.properties["func_subgraph_id"] === element.id){
                    ths._wCombo.value = element.id;
                }
            });
        }else{
            // empty
        }
    }

    ensureSubFunction(){
        if(!this._subGFuncNode){
            if(this.properties["func_subgraph_id"] !== null && this.properties["func_subgraph_id"] !== undefined){
                // this.refreshFunctions();
                this.lookForFuncNodeById(this.properties["func_subgraph_id"]);
                this.refreshFunctions();
            }
        }
    }

    lookForFuncNodeById(nId){
        const subGFuncNode = this.graph.getNodeById(nId);
        if(subGFuncNode){
            console.error("NODEFUNCTION FOUND", "this?", this);
            this.updateSubFunction(subGFuncNode);
        }else{
            console.error("NODEFUNCTION NOT FOUND", "nodeNotFound", nId);
            this.updateSubFunction(false);
        }
    }

    btnSetFunction(widget, canvas, node, pos, event){
        console.debug("NODEFUNCTION SET", node, node._wCombo.value);
        this.lookForFuncNodeById(node._wCombo.value);
    }

    updateSubFunction(nodeFrom){
        // const nodeFrom = this._subGFuncNode;
        this._subGFuncNode = nodeFrom;
        // const nodeFrom = this._subGFuncNode;
        console.debug("REFRESHSLOTS",this);
        if(nodeFrom !== undefined && nodeFrom !== null && nodeFrom){
            this.properties["func_subgraph_id"] = nodeFrom.id;
            // this.inputs = LiteGraph.cloneObject(nodeFrom.inputs) ?? [];
            nodeFrom.inputs.forEach((element, index) => {
                // element.links = [];
                if(typeof this.inputs[index] !== "undefined" && this.inputs[index].type == element.type){
                    // keep (links?)
                }else{
                    this.inputs[index] = {name: element.name, type: element.type};
                }
            });
            // this.outputs = LiteGraph.cloneObject(nodeFrom.outputs) ?? [];
            nodeFrom.outputs.forEach((element, index) => {
                // element.links = [];
                if(typeof this.outputs[index] !== "undefined" && this.outputs[index].type == element.type){
                    // keep (links?)
                }else{
                    this.outputs[index] = {name: element.name, type: element.type};
                }
            });
            this.autoSize();
        }else{
            this.properties["func_subgraph_id"] = null;
            this.inputs = [];
            this.outputs = [];
        }
        this.bindEvents();
    }

    bindEvents(){
        const nodeFrom = this._subGFuncNode;
        const thisFNode = this;
        console.debug("BINDEVENTS", this);
        if(nodeFrom !== undefined && nodeFrom !== null && nodeFrom){
            this.onExecute = function(){
                console.debug("NODEFUNCTION executing", this);
                // should execute subgraph passing right values
                this.inputs.forEach((element, index) => {
                    const iVal = this.getInputData(index);
                    nodeFrom.inputs[index].hard_coded_value = iVal;
                    console.debug("read and set input data", index, iVal);
                });
                // WIP : try to bind internal subgraph events to this node connected events
                this.outputs.forEach((element, index) => {
                    // nodeFrom.outputs[index].hard_coded_value ?
                    if(element.type == LiteGraph.EVENT){
                        console.warn("NODEFUNCTION event", "should prevent default and call custom");
                        // hack onSubgraphTrigger
                        // ? var slot = this.findOutputSlot(event);
                        console.warn("NODEFUNCTION event", "hack output slot", element, nodeFrom, nodeFrom.outputs, index);
                        console.warn("NODEFUNCTION event", "hack output slot", nodeFrom.outputs[index], element);
                        nodeFrom.outputs[index].hard_coded_output = element;
                    }
                });
                // --
                console.debug("execute function node", nodeFrom);
                nodeFrom.doExecute();
                // --
                this.outputs.forEach((element, index) => {
                    const oVal = nodeFrom.getOutputData(index);
                    // BAD // set to related graph output
                    // BAD nodeFrom.graph.setOutputData(element.name, oVal);
                    // BAD console.debug("read and set graph output data", index, element, oVal);
                    // set to node output, not enough ?
                    this.setOutputData(index, oVal);
                    console.debug("read and set output node data", index, oVal);
                });
                // --
                // than clean inputs
                this.inputs.forEach((element, index) => {
                    delete(nodeFrom.inputs[index].hard_coded_value);
                    console.debug("clean hard coded input data", index);
                });
                // this.outputs.forEach((element, index) => {
                //     if(element.type == LiteGraph.EVENT){
                //         delete(nodeFrom.outputs[index].hard_coded_output);
                //         console.debug("clean hard coded output slot", index);
                //     }
                // });
            }
        }else{
            this.onExecute = function(){
                // no action
                console.debug("NODEFUNCTION has no functionset", this);
            }
        }
    }

}