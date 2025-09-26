
function Selector() {


        this.addInput("sel", "number");
        this.addInput("A");
        this.addInput("B");
        this.addInput("C");
        this.addInput("D");
        this.addOutput("out");

        this.selected = 0;
    }

Selector.prototype.onDrawBackground = function(ctx) {
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

Selector.prototype.onExecute = function() {
        var sel = this.getInputData(0);
        if (sel == null || sel.constructor !== Number) sel = 0;
        this.selected = sel = Math.round(sel) % (this.inputs.length - 1);
        var v = this.getInputData(sel + 1);
        if (v !== undefined) {
            this.setOutputData(0, v);
        }
    }

Selector.prototype.onGetInputs = function() {
        return [
            ["E", 0],
            ["F", 0],
            ["G", 0],
            ["H", 0],
        ];
    }
}
Selector.title = "Selector";
Selector.desc = "selects an output";
LiteGraph.registerNodeType("logic/selector", Selector);


function Sequence() {


        this.properties = {sequence: "A,B,C"};
        this.addInput("index", "number");
        this.addInput("seq");
        this.addOutput("out");

        this.index = 0;
        this.values = this.properties.sequence.split(",");
    }

Sequence.prototype.onPropertyChanged = function(name, value) {
        if (name == "sequence") {
            this.values = value.split(",");
        }
    }

Sequence.prototype.onExecute = function() {
        var seq = this.getInputData(1);
        if (seq && seq != this.current_sequence) {
            this.values = seq.split(",");
            this.current_sequence = seq;
        }
        var index = this.getInputData(0);
        if (index == null) {
            index = 0;
        }
        this.index = index = Math.round(index) % this.values.length;

        this.setOutputData(0, this.values[index]);
    }
}
Sequence.title = "Sequence";
Sequence.desc = "select one element from a sequence from a string";
LiteGraph.registerNodeType("logic/sequence", Sequence);


function logicAnd() {


        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

logicAnd.prototype.onExecute = function() {
        let ret = true;
        for (let inX in this.inputs) {
            if (!this.getInputData(inX)) {
                ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

logicAnd.prototype.onGetInputs = function() {
        return [["and", "boolean"]];
    }
}
logicAnd.title = "AND";
logicAnd.desc = "Return true if all inputs are true";
LiteGraph.registerNodeType("logic/AND", logicAnd);


function logicOr() {


        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

logicOr.prototype.onExecute = function() {
        var ret = false;
        for (var inX in this.inputs) {
            if (this.getInputData(inX)) {
                ret = true;
                break;
            }
        }
        this.setOutputData(0, ret);
    }

logicOr.prototype.onGetInputs = function() {
        return [["or", "boolean"]];
    }
}
logicOr.title = "OR";
logicOr.desc = "Return true if at least one input is true";
LiteGraph.registerNodeType("logic/OR", logicOr);


function logicNot() {
        this.properties = {};
        this.addInput("in", "boolean");
        this.addOutput("out", "boolean");
    }

logicNot.prototype.onExecute = function() {
        var ret = !this.getInputData(0);
        this.setOutputData(0, ret);
    }
}
logicNot.title = "NOT";
logicNot.desc = "Return the logical negation";
LiteGraph.registerNodeType("logic/NOT", logicNot);


function logicCompare() {


        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }

logicCompare.prototype.onExecute = function() {
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

logicCompare.prototype.onGetInputs = function() {
        return [["bool", "boolean"]];
    }
}
logicCompare.title = "bool == bool";
logicCompare.desc = "Compare for logical equality";
LiteGraph.registerNodeType("logic/CompareBool", logicCompare);


function logicBranch() {


        this.properties = {};
        this.addInput("onTrigger", LiteGraph.ACTION);
        this.addInput("condition", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.mode = LiteGraph.ON_TRIGGER;
    }

logicBranch.prototype.onExecute = function(_param, _options) {
        var conditition = this.getInputData(1);
        if (conditition) {
            console.debug(this,conditition);
            this.triggerSlot(0, _param, null, _options);
        } else {
            this.triggerSlot(1, _param, null, _options);
        }
    }
}
logicBranch.title = "Branch";
logicBranch.desc = "Branch execution on condition";
LiteGraph.registerNodeType("logic/IF", logicBranch);


function logicFor() {
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


logicFor.prototype.onExecute = function(param) {
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

logicFor.prototype.onAction = function(action) {
        /* console.debug?.(action);
        console.debug?.(param);
        console.debug?.(this);*/
logicFor.prototype.switch = function(action) {
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
logicFor.title = "FOR";
logicFor.desc = "Cycle FOR";
LiteGraph.registerNodeType("logic/CycleFOR", logicFor);

function logicForEach() {
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


logicForEach.prototype.onExecute = function(param) {
        if (!this.started) return;
        var ar = this.getInputData(0);
        var num = this.getInputData(1);
        if(ar === null || !ar || typeof(ar.forEach)!="function"){
            return;
        }
        // for (var k=iI;k<iI+num;k++) {
        ar.forEach((el,k)=>{
            console.debug?.("for cycle "+k);
            this.setOutputData(1, k);
            this.setOutputData(2, el);
            this.triggerSlot(0, param);
            if (this.stopped) {
                console.debug?.("foreach cycle stopped on index "+k);
                return;
            }
        })
        this.started = false;
        this.stopped = true;
    }

logicForEach.prototype.onAction = function(action) {
        /* console.debug?.(action);
        console.debug?.(param);
        console.debug?.(this);*/
logicForEach.prototype.switch = function(action) {
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
logicForEach.title = "ForEach";
logicForEach.desc = "Cycle for each element in array";
LiteGraph.registerNodeType("logic/CycleForEach", logicForEach);


function logicWhile() {
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


logicWhile.prototype.onExecute = function() {
        this.setOutputData(1, this.k);
        this.cond = this.getInputData(1);
    }
logicWhile.prototype.onAction = function(action, param) {
logicWhile.prototype.switch = function(action) {
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
                        console.debug?.("while cycle stopped on index "+k);
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
logicWhile.title = "WHILE";
logicWhile.desc = "Cycle WHILE";
LiteGraph.registerNodeType("logic/CycleWHILE", logicWhile);

