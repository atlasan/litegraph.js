import { LiteGraph } from "../litegraph.js";

//LiteGraph library related nodes

// --------------------------

class LGLibrary{
    constructor(){
        this.addOutput("ref", "object");
        this._value = null;
        this._properties = [];
        this.setOutputData(0, LiteGraph);
    }
    static title = "LGLib";
    static desc = "LiteGraph object reference";
    onExecute(param, options) {
        this.setOutputData(0, LiteGraph);
    }
    onAction(action, param, options){
        // should probably execute on action
    }
    onGetInputs() {
        //return [["in", 0]];
    }
    onGetOutputs() {
        //return [["out", 0]];
    }
    getTitle() {
        return "LiteGraph";
    }
}
LiteGraph.registerNodeType("litegraph/litegraph", LGLibrary);


// --------------------------

class LGGraph{
    constructor(){
        this.addInput("start", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);
        this.addInput("step", LiteGraph.ACTION);
        this.addOutput("ref", "object");
        this.addOutput("stepped", LiteGraph.EVENT);
        this._value = null;
        this._properties = [];
        this.setOutputData(0, this.graph);
    }
    static title = "Graph";
    static desc = "Graph object reference";
    onExecute(param, options) {
        this.setOutputData(0, this.graph);
        this.triggerSlot(1, param, null, options);
    }
    onAction(action, param, options){
        console.debug("GraphAction",action);
        switch(action){
            case "start":
                this.graph.start();
                console.debug("this.graph.start();",this,this.graph);
            break;
            case "stop":
                this.graph.stop();
                console.debug("this.graph.stop();",this,this.graph);
            break;
            case "step":
                if(this.graph.onBeforeStep)
                    this.graph.onBeforeStep();
                this.graph.runStep(1, !this.graph.catch_errors);
                console.debug("this.graph.runStep(1, !this.graph.catch_errors);",this,this.graph);
                if(this.graph.onAfterStep)
                    this.graph.onAfterStep();
            break;
        }
    }
    onGetInputs() {
        //return [["in", 0]];
    }
    onGetOutputs() {
        //return [["out", 0]];
    }
    getTitle() {
        return "Graph";
    }
}
LiteGraph.registerNodeType("litegraph/graph", LGGraph);