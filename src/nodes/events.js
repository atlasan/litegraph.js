import { LiteGraph } from "../litegraph.js";

// built-in pack: node types registered below belong to "litegraph/events" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/events", version: LiteGraph.VERSION, title: "Events", description: "Execution flow: triggers, sequences, timers, delays, counters, gates and filters that pass events between nodes.", builtin: true });

// Show value inside the debug console
class LogEvent {

    static title = "Log Event";
    static desc = "Log event in console";

    constructor() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
    }
    onAction(action, param, options, slot_index) {
        console.info("[LogNode]", param);
        console.debug("[LogNode]", action, param, options, slot_index);
    }
}
LiteGraph.registerNodeType("events/log", LogEvent);


// convert to Event if the value is true
class TriggerEvent {

    static title = "TriggerEvent";
    static desc = "Triggers event if input evaluates to true";
    // an event emitter cannot be ON_REQUEST: triggers are dropped while data is pulled (A4)
    static def = { execution: { modes: [LiteGraph.ALWAYS, LiteGraph.ON_EVENT, LiteGraph.ON_TRIGGER, LiteGraph.NEVER] } };

    constructor() {
        this.size = [60, 30];
        this.addInput("if", "");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.properties = {
            only_on_change: true,
            tooltip: "Triggers event if input evaluates to true",
        };
        this.prev = 0;
    }

    onExecute(param, options) {
        var v = this.getInputData(0);
        var changed = v != this.prev;
        if (this.prev === 0) changed = false;
        var must_resend =
            (changed && this.properties.only_on_change) ||
            (!changed && !this.properties.only_on_change);
        if (v && must_resend) this.triggerSlot(0, param, null, options);
        if (!v && must_resend) this.triggerSlot(2, param, null, options);
        if (changed) this.triggerSlot(1, param, null, options);
        this.prev = v;
    }
}


LiteGraph.registerNodeType("events/trigger", TriggerEvent);

// Sequence of events
class EvSequence {

    static title = "Sequence";
    static desc = "Triggers a sequence of events when an event arrives";
    // its outputs fire now, in slot order, in every model (B4)
    static def = {
        execution: { emit: "immediate" },
        usage: "Connect one event to an input; its outputs fire one after the other, top to bottom, before the next node runs.",
    };
    // @ BUG: fails to construct Node

    constructor() {
        var that = this;
        this.addInput("", LiteGraph.ACTION, {removable: true, nameLocked: false});
        this.addInput("", LiteGraph.ACTION, {removable: true, nameLocked: false});
        this.addInput("", LiteGraph.ACTION, {removable: true, nameLocked: false});
        this.addOutput("", LiteGraph.EVENT, {removable: true, nameLocked: false});
        this.addOutput("", LiteGraph.EVENT, {removable: true, nameLocked: false});
        this.addOutput("", LiteGraph.EVENT, {removable: true, nameLocked: false});
        this.addWidget("button", "+", null, function () {
            that.addInput("", LiteGraph.ACTION);
            that.addOutput("", LiteGraph.EVENT);
        });
        this.size = [90, 30];
        this.flags = { horizontal: true, render_box: false };
    }

    getTitle() {
        return "";
    }

    onAction(action, param, options) {
        if (this.outputs) {
            // each output gets its own call id on a copy: the caller's options are not changed (B4)
            const base = options?.action_call ?? this.id + "_" + (action ? action : "action");
            for (var i = 0; i < this.outputs.length; ++i) {
                const call = { ...options, action_call: base + "_seq_" + i + "_" + Math.floor(Math.random() * 9999) };
                this.triggerSlot(i, param, null, call);
            }
        }
    }
}
LiteGraph.registerNodeType("events/sequence", EvSequence);


// Sequence of events
class WaitAll {

    static title = "WaitAll";
    static desc = "Wait until all input events arrive then triggers output";

    constructor() {
        var that = this;
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addOutput("", LiteGraph.EVENT);
        this.addWidget("button", "+", null, function () {
            that.addInput("", LiteGraph.ACTION);
            that.size[0] = 90;
        });
        this.size = [90, 70];
        this.ready = [];
    }

    getTitle() {
        return "";
    }

    onDrawBackground(ctx) {
        if (this.flags?.collapsed) {
            return;
        }
        for (var i = 0; i < this.inputs.length; ++i) {
            var y = i * LiteGraph.NODE_SLOT_HEIGHT + 10;
            ctx.fillStyle = this.ready[i] ? "#AFB" : "#000";
            ctx.fillRect(20, y, 10, 10);
        }
    }

    onAction(action, param, options, slot_index) {
        if (slot_index == null) return;

        // check all
        this.ready.length = this.inputs.length; // one flag per input to wait for
        this.ready[slot_index] = true;
        for (var i = 0; i < this.ready.length; ++i)
            if (!this.ready[i])
                return;
        // pass, with the payload of the completing event (B15)
        this.reset();
        this.triggerSlot(0, param, null, options);
    }

    reset() {
        this.ready.length = 0;
    }
}
LiteGraph.registerNodeType("events/waitAll", WaitAll);


// Sequencer for events
class Stepper {

    static title = "Stepper";
    static desc = "Trigger events sequentially when an tick arrives";

    constructor() {
        var that = this;
        this.properties = { index: 0 };
        this.addInput("index", "number");
        this.addInput("step", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("index", "number");
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT, { removable: true });
        this.addWidget("button", "+", null, function () {
            that.addOutput("", LiteGraph.EVENT, { removable: true });
        });
        this.size = [120, 120];
        this.flags = { render_box: false };
    }

    onDrawBackground(ctx) {
        if (this.flags?.collapsed) {
            return;
        }
        var index = this.properties.index || 0;
        ctx.fillStyle = "#AFB";
        var w = this.size[0];
        var y = (index + 1) * LiteGraph.NODE_SLOT_HEIGHT + 4;
        ctx.beginPath();
        ctx.moveTo(w - 30, y);
        ctx.lineTo(w - 30, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(w - 15, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
    }

    onExecute() {
        var index = this.getInputData(0);
        if (index != null) {
            index = Math.floor(index);
            index = LiteGraph.clamp(
                index,
                0,
                this.outputs ? this.outputs.length - 2 : 0,
            );
            if (index != this.properties.index) {
                this.properties.index = index;
                this.triggerSlot(index + 1);
            }
        }

        this.setOutputData(0, this.properties.index);
    }

    onAction(action, param, options) {
        if (action == "reset") this.properties.index = 0;
        else if (action == "step") {
            this.triggerSlot(this.properties.index + 1, param, null, options);
            var n = this.outputs ? this.outputs.length - 1 : 0;
            this.properties.index = (this.properties.index + 1) % n;
        }
    }
}
LiteGraph.registerNodeType("events/stepper", Stepper);

// Filter events
class FilterEvent {

    static title = "Filter Event";
    static desc = "Blocks events that do not match the filter";

    constructor() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("event", LiteGraph.EVENT);
        this.properties = {
            equal_to: "",
            has_property: "",
            property_equal_to: "",
        };
    }

    onAction(action, param, options) {
        if (param == null) {
            return;
        }

        if (this.properties.equal_to && this.properties.equal_to != param) {
            return;
        }

        if (this.properties.has_property) {
            var prop = param[this.properties.has_property];
            if (prop == null) {
                return;
            }

            if (
                this.properties.property_equal_to &&
                this.properties.property_equal_to != prop
            ) {
                return;
            }
        }

        this.triggerSlot(0, param, null, options);
    }
}
LiteGraph.registerNodeType("events/filter", FilterEvent);

class EventBranch {

    static title = "Branch";
    static desc = "If condition is true, outputs triggers true, otherwise false";

    constructor() {
        this.addInput("in", LiteGraph.ACTION);
        this.addInput("cond", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.size = [120, 60];
        this._value = false;
    }

    onExecute() {
        this._value = this.getInputData(1);
    }

    onAction(action, param, options) {
        this._value = this.getInputData(1);
        this.triggerSlot(this._value ? 0 : 1, param, null, options);
    }
}
LiteGraph.registerNodeType("events/branch", EventBranch);


// Show value inside the debug console
class EventCounter {

    static title = "Counter";
    static desc = "Counts events";

    constructor() {
        this.addInput("inc", LiteGraph.ACTION);
        this.addInput("dec", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("num", "number");
        this.addProperty(
            "doCountExecution",
            false,
            "boolean",
            { name: "Count Executions" },
        );
        this.addWidget(
            "toggle",
            "Count Exec.",
            this.properties.doCountExecution,
            "doCountExecution",
        );
        this.num = 0;
    }

    getTitle() {
        if (this.flags?.collapsed) {
            return String(this.num);
        }
        return this.title;
    }

    onAction(action) {
        var v = this.num;
        if (action == "inc") {
            this.num += 1;
        } else if (action == "dec") {
            this.num -= 1;
        } else if (action == "reset") {
            this.num = 0;
        }
        this.setOutputData(1, this.num);
        if (this.num != v) {
            this.changed();
        }
    }

    changed(){
        this.trigger("change", this.num);
    }

    onDrawBackground(ctx) {
        if (this.flags?.collapsed) {
            return;
        }
        ctx.fillStyle = "#AAA";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.num, this.size[0] * 0.5, this.size[1] * 0.5);
    }

    onExecute() {
        if (this.properties.doCountExecution) {
            this.num += 1;
            this.changed();
        }
        this.setOutputData(1, this.num);
    }
}
LiteGraph.registerNodeType("events/counter", EventCounter);


// Show value inside the debug console
class DelayEvent {

    static title = "Delay";
    static desc = "Delays one event";
    // counts time in the step loop: ALWAYS only (B7)
    static def = {
        execution: { ticks: true, modes: [LiteGraph.ALWAYS, LiteGraph.NEVER] },
        usage: "Send an event to the input; on_time fires time_in_ms later, while the graph is running.",
    };

    constructor() {
        this.size = [60, 30];
        this.addProperty("time_in_ms", 1000);
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("on_time", LiteGraph.EVENT);
        this._pending = [];
    }

    onAction(action, param, options) {
        var time = this.properties.time_in_ms;
        if (time <= 0) {
            this.trigger(null, param, options);
        } else {
            this._pending.push([time, param]);
        }
    }

    onExecute(param, options) {
        var dt = this.graph.elapsed_time * 1000; // in ms

        if (this.isInputConnected(1)) {
            this.properties.time_in_ms = this.getInputData(1);
        }

        for (var i = 0; i < this._pending.length; ++i) {
            var actionPass = this._pending[i];
            actionPass[0] -= dt;
            if (actionPass[0] > 0) {
                continue;
            }

            // remove
            this._pending.splice(i, 1);
            --i;

            // trigger
            this.trigger(null, actionPass[1], options);
        }
    }

    onGetInputs() {
        return [
            ["event", LiteGraph.ACTION],
            ["time_in_ms", "number"],
        ];
    }
}
LiteGraph.registerNodeType("events/delay", DelayEvent);


// Show value inside the debug console
class TimerEvent {

    static title = "Timer";
    static desc = "Sends an event every N milliseconds";
    static def = {
        execution: { ticks: true, modes: [LiteGraph.ALWAYS, LiteGraph.NEVER] },
        usage: "Start the graph; on_tick fires every interval milliseconds. A start point for event flows.",
    };

    constructor() {
        this.addProperty("interval", 1000);
        this.addProperty("event", "tick");
        this.addOutput("on_tick", LiteGraph.EVENT);
        this.time = 0;
        this.last_interval = 1000;
        this.triggered = false;
    }

    onStart() {
        this.time = 0;
    }

    getTitle() {
        return "Timer: " + this.last_interval.toString() + "ms";
    }

    onDrawBackground() {
        this.boxcolor = this.triggered ? TimerEvent.on_color : TimerEvent.off_color;
        this.triggered = false;
    }

    onExecute() {
        var dt = this.graph.elapsed_time * 1000; // in ms

        var trigger = this.time == 0;

        this.time += dt;
        this.last_interval = Math.max(1, this.getInputOrProperty("interval") | 0);

        if (
            !trigger &&
            (this.time < this.last_interval || isNaN(this.last_interval))
        ) {
            if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
                this.setOutputData(1, false);
            }
            return;
        }

        this.triggered = true;
        this.time = this.time % this.last_interval;
        this.trigger("on_tick", this.properties.event);
        if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
            this.setOutputData(1, true);
        }
    }

    onGetInputs() {
        return [["interval", "number"]];
    }

    onGetOutputs() {
        return [["tick", "boolean"]];
    }
}
TimerEvent.on_color = "#AAA";
TimerEvent.off_color = "#222";
LiteGraph.registerNodeType("events/timer", TimerEvent);


class SemaphoreEvent {

    static title = "Semaphore Event";
    static desc = "Until both events are not triggered, it doesnt continue.";

    constructor() {
        this.addInput("go", LiteGraph.ACTION);
        this.addInput("green", LiteGraph.ACTION);
        this.addInput("red", LiteGraph.ACTION);
        this.addOutput("continue", LiteGraph.EVENT);
        this.addOutput("blocked", LiteGraph.EVENT);
        this.addOutput("is_green", "boolean");
        this._ready = false;
        this.properties = {};
        var that = this;
        this.addWidget("button", "reset", "", function () {
            that._ready = false;
        });
    }

    onExecute() {
        this.setOutputData(2, this._ready);
        this.boxcolor = this._ready ? "#9F9" : "#FA5";
    }

    onAction(action, param, options) {
        if (action == "go") this.triggerSlot(this._ready ? 0 : 1, param, null, options);
        else if (action == "green") this._ready = true;
        else if (action == "red") this._ready = false;
    }
}
LiteGraph.registerNodeType("events/semaphore", SemaphoreEvent);


class OnceEvent {

    static title = "Once";
    static desc = "Only passes an event once, then gets locked";

    constructor() {
        this.addInput("in", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("out", LiteGraph.EVENT);
        this._once = false;
        this.properties = {};
        var that = this;
        this.addWidget("button", "reset", "", function () {
            that._once = false;
        });
    }

    onAction(action, param, options) {
        if (action == "in" && !this._once) {
            this._once = true;
            this.triggerSlot(0, param, null, options);
        } else if (action == "reset") this._once = false;
    }
}
LiteGraph.registerNodeType("events/once", OnceEvent);


class DataStore {

    static title = "Data Store";
    static desc = "Stores data and only changes when event is received";

    constructor() {
        this.addInput("data", 0);
        this.addInput("assign", LiteGraph.ACTION);
        this.addOutput("data", 0);
        this._last_value = null;
        this.properties = { data: null, serialize: true };
        var that = this;
        this.addWidget("button", "store", "", function () {
            that.properties.data = that._last_value;
        });
    }

    onExecute() {
        this._last_value = this.getInputData(0);
        this.setOutputData(0, this.properties.data);
    }

    onAction() {
        // the value on the input when the event arrives, not the one of the previous step (B15)
        this.properties.data = this.isInputConnected(0) ? this.getInputData(0) : this._last_value;
    }

    onSerialize(o) {
        if (o.data == null) return;
        if (
            !this.properties.serialize ||
            (o.data.constructor !== String &&
                o.data.constructor !== Number &&
                o.data.constructor !== Boolean &&
                o.data.constructor !== Array &&
                o.data.constructor !== Object)
        )
            o.data = null;
    }
}
LiteGraph.registerNodeType("basic/data_store", DataStore);

class EventSwitch {

    static title = "Switch";
    static desc = "Switch trigger on data";

    constructor() {
        this.addInput("in", 0, {param_bind: true});
        this.addProperty("in");
        this.addOutput("default", LiteGraph.EVENT);
        this.selected = 0;
        // this.clip_area = true;
    }

    // onDrawBackground(ctx) {
    //     if (this.flags.collapsed) {
    //         return;
    //     }
    //     ctx.fillStyle = "#AFB";
    //     const y = (this.selected) * LiteGraph.NODE_SLOT_HEIGHT + 6;
    //     const x = this.size[0];
    //     ctx.beginPath();
    //     ctx.moveTo(x - 50, y);
    //     ctx.lineTo(x - 50, y + LiteGraph.NODE_SLOT_HEIGHT);
    //     ctx.lineTo(x - 34, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
    //     ctx.fill();
    // }

    onExecute() {
        // var sel = this.getInputData("in");
        const sel = String(this.getInputOrProperty("in"));
        // fires when the selection changes, not on every step (B14)
        if (sel === this._last_selection) return;
        this._last_selection = sel;
        let found = false;
        for(let iS in this.outputs){
            let outSlot = this.outputs[iS];
            if(outSlot.type == LiteGraph.EVENT && (outSlot.name == sel || outSlot.label == sel)){
                this.selected = outSlot.name; //iS;
                found = true;
                this.triggerSlot(outSlot.name); //iS);
                break;
            }
        }
        if(!found){
            this.selected = 0;
            this.triggerSlot("default");
        }
    }

    onGetOutputs() {
        return [
            ["val", LiteGraph.EVENT, {removable: true, nameLocked: false}]
        ];
    }
}
LiteGraph.registerNodeType("events/switch", EventSwitch);

LiteGraph.packs.close("litegraph/events");
