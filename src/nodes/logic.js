import { LiteGraph } from "../litegraph.js";

// built-in pack: node types registered below belong to "litegraph/logic" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/logic", version: LiteGraph.VERSION, title: "Logic", builtin: true });

class Selector {

    static title = "Selector";
    static desc = "selects an output";

    constructor() {
        this.addInput("sel", "number");
        this.addInput("A");
        this.addInput("B");
        this.addInput("C");
        this.addInput("D");
        this.addOutput("out");

        this.selected = 0;
    }

    onDrawBackground(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AFB";
        var y = (this.selected + 1) * LiteGraph.NODE_SLOT_HEIGHT + 6;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(50, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(34, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
    }

    onExecute() {
        var sel = this.getInputData(0);
        if (typeof sel !== "number" || !Number.isFinite(sel)) sel = 0;
        var count = this.inputs.length - 1;
        this.selected = sel = ((Math.round(sel) % count) + count) % count;
        var v = this.getInputData(sel + 1);
        if (v !== undefined) {
            this.setOutputData(0, v);
        }
    }

    onGetInputs() {
        return [
            ["E", 0],
            ["F", 0],
            ["G", 0],
            ["H", 0],
        ];
    }
}
LiteGraph.registerNodeType("logic/selector", Selector);


class Sequence {

    static title = "Sequence";
    static desc = "select one element from a sequence from a string";

    constructor() {
        this.properties = {sequence: "A,B,C"};
        this.addInput("index", "number");
        this.addInput("seq");
        this.addOutput("out");

        this.index = 0;
        this.values = this.properties.sequence.split(",");
    }

    onPropertyChanged(name, value) {
        if (name == "sequence" && typeof value === "string") {
            this.values = value.split(",");
        }
    }

    onExecute() {
        var seq = this.getInputData(1);
        if (seq && seq != this.current_sequence) {
            if (typeof seq === "string") this.values = seq.split(",");
            else if (Array.isArray(seq)) this.values = seq;
            this.current_sequence = seq;
        }
        var index = this.getInputData(0);
        if (typeof index === "string" && index.trim() !== "") {
            index = Number(index); // "2" still selects the third value
        }
        if (typeof index !== "number" || !Number.isFinite(index)) {
            index = 0;
        }
        var count = this.values.length || 1;
        this.index = index = ((Math.round(index) % count) + count) % count;

        this.setOutputData(0, this.values[index]);
    }
}
LiteGraph.registerNodeType("logic/sequence", Sequence);


class logicAnd {

    static title = "AND";
    static desc = "Return true if all inputs are true";

    constructor() {
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute() {
        let ret = true;
        for (let inX in this.inputs) {
            if (!this.getInputData(inX)) {
                ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

    onGetInputs() {
        return [["and", "boolean"]];
    }
}
LiteGraph.registerNodeType("logic/AND", logicAnd);


class logicOr {

    static title = "OR";
    static desc = "Return true if at least one input is true";

    constructor() {
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute() {
        var ret = false;
        for (var inX in this.inputs) {
            if (this.getInputData(inX)) {
                ret = true;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

    onGetInputs() {
        return [["or", "boolean"]];
    }
}
LiteGraph.registerNodeType("logic/OR", logicOr);


class logicNot {
    static title = "NOT";
    static desc = "Return the logical negation";
    constructor() {
        this.properties = {};
        this.addInput("in", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute() {
        var ret = !this.getInputData(0);
        this.setOutputData(0, ret);
    }
}
LiteGraph.registerNodeType("logic/NOT", logicNot);


class logicCompare {

    static title = "bool == bool";
    static desc = "Compare for logical equality";

    constructor() {
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

    onExecute() {
        var last = null;
        var ret = true;
        for (var inX in this.inputs) {
            if (last === null) last = this.getInputData(inX);
            else if (last != this.getInputData(inX)) {
                ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

    onGetInputs() {
        return [["bool", "boolean"]];
    }
}
LiteGraph.registerNodeType("logic/CompareBool", logicCompare);


class logicBranch {

    static title = "Branch";
    static desc = "Branch execution on condition";

    constructor() {
        this.properties = {};
        this.addInput("onTrigger", LiteGraph.ACTION);
        this.addInput("condition", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.mode = LiteGraph.ON_TRIGGER;
    }

    onExecute(_param, _options) {
        var conditition = this.getInputData(1);
        if (conditition) {
            console.debug(this,conditition);
            this.triggerSlot(0, _param, null, _options);
        } else {
            this.triggerSlot(1, _param, null, _options);
        }
    }
}
LiteGraph.registerNodeType("logic/IF", logicBranch);


class logicFor {
    constructor() {
        this.properties = { };
        this.addInput("start", "number");
        this.addInput("nElements", "number");
        this.addInput("do", LiteGraph.ACTION);
        this.addInput("break", LiteGraph.ACTION);
        // this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("do", LiteGraph.EVENT);
        this.addOutput("index", "number");
        this.started = false;
        this.stopped = false;
    }

    static title = "FOR";
    static desc = "Cycle FOR";

    onExecute(param) {
        if (!this.started) return;
        var iI = this.getInputData(0);
        var num = this.getInputData(1);
        for (var k=iI;k<iI+num;k++) {
            console.debug?.("for cycle "+k);
            this.setOutputData(1, k);
            this.triggerSlot(0, param);
            if (this.stopped) {
                console.debug?.("for cycle stopped on index "+k);
                break;
            }
        }
        this.started = false;
        this.stopped = true;
    }

    onAction(action) {
        /* console.debug?.(action);
        console.debug?.(param);
        console.debug?.(this);*/
        switch(action) {
            case "break":
                this.stopped = true;
                break;
            /* case "reset":
                this.stopped = false;
            break;*/
            case "do":
                this.started = true;
                this.stopped = false;
                this.doExecute();
                break;
        }
    }
}
LiteGraph.registerNodeType("logic/CycleFOR", logicFor);

class logicForEach {
    constructor() {
        this.properties = { };
        this.addInput("array", "array");
        this.addInput("do", LiteGraph.ACTION);
        this.addInput("break", LiteGraph.ACTION);
        this.addOutput("do", LiteGraph.EVENT);
        this.addOutput("index", "number");
        this.addOutput("element", 0);
        this.started = false;
        this.stopped = false;
    }

    static title = "ForEach";
    static desc = "Cycle for each element in array";

    onExecute(param) {
        if (!this.started) return;
        var ar = this.getInputData(0);
        if(ar === null || !ar || typeof(ar.forEach)!="function"){
            return;
        }
        // a plain loop, so that break stops it (B5); slot 1 is the "do" action, not data
        const elements = Array.from(ar);
        for (let k = 0; k < elements.length; k++) {
            this.setOutputData(1, k);
            this.setOutputData(2, elements[k]);
            this.triggerSlot(0, param);
            if (this.stopped) break;
        }
        this.started = false;
        this.stopped = true;
    }

    onAction(action) {
        /* console.debug?.(action);
        console.debug?.(param);
        console.debug?.(this);*/
        switch(action) {
            case "break":
                this.stopped = true;
                break;
            /* case "reset":
                this.stopped = false;
            break;*/
            case "do":
                this.started = true;
                this.stopped = false;
                this.doExecute();
                break;
        }
    }
}
LiteGraph.registerNodeType("logic/CycleForEach", logicForEach);


class logicWhile {
    constructor() {
        this.properties = { cycleLimit: 999, checkOnStart: true };
        this.addInput("do", LiteGraph.ACTION);
        this.addInput("condition", "boolean");
        this.addInput("break", LiteGraph.ACTION);
        this.addOutput("do", LiteGraph.EVENT);
        this.addOutput("index", "number");
        this.started = false;
        this.stopped = false;
        this.k = 0;
        this.cond = false;
        this.addWidget("toggle","checkOnStart",this.properties.checkOnStart,"checkOnStart");
    }

    static title = "WHILE";
    static desc = "Cycle WHILE";

    onExecute() {
        this.setOutputData(1, this.k);
        this.cond = this.getInputData(1);
    }
    onAction(action, param) {
        switch(action) {
            case "break":
                this.stopped = true;
                break;
            case "do":
                /* this.started = true;
                this.stopped = false;
                this.execute();*/
                this.started = true;
                this.stopped = false;
                var checkOnStart = this.getInputOrProperty("checkOnStart");
                this.cond = !checkOnStart || this.getInputData(1);
                this.k = 0;
                var cycleLimit = this.properties.cycleLimit || 999;
                while (this.cond && this.k<cycleLimit) {
                    console.debug?.("while cycle "+this.k);
                    this.setOutputData(1, this.k);
                    this.triggerSlot(0, param);
                    // done
                    if (this.stopped) {
                        console.debug?.("while cycle stopped on index "+this.k);
                        break;
                    }
                    this.k++;
                    this.cond = this.getInputData(1,true,true); // CHECK THIS : USING FORCE ANCESTOR REFRESH ( ?!? getInputData refresh_tree )
                }
                this.k = 0;
                this.setOutputData(1, this.k);
                this.cond = this.getInputData(1);
                this.started = false;
                this.stopped = true;
                break;
        }
    }
}
LiteGraph.registerNodeType("logic/CycleWHILE", logicWhile);

LiteGraph.packs.close("litegraph/logic");
