import { LiteGraph } from "../litegraph.js";

// built-in pack: node types registered below belong to "litegraph/basic" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/basic", version: LiteGraph.VERSION, title: "Basic", description: "Constants, variables, watches, arrays, JSON and console helpers, scripts: the everyday data nodes.", builtin: true });

class Time {

    static title = "Time";
    static desc = "Time";

    constructor() {
        this.addOutput("in ms", "number");
        this.addOutput("in sec", "number");
    }

    onExecute() {
        this.setOutputData(0, this.graph.globaltime * 1000);
        this.setOutputData(1, this.graph.globaltime);
    }
}
LiteGraph.registerNodeType("basic/time", Time);

class Empty {

    static title = "";
    static desc = "Empty node";

    constructor() {
        
    }

    onExecute() {
        
    }
}
LiteGraph.registerNodeType("basic/empty", Empty);

// Constant
class ConstantNumber {

    static title = "Const Number";
    static desc = "Constant number";

    constructor() {
        this.addOutput("value", "number");
        this.addProperty("value", 1.0, "number");
        this.addProperty("precision", 12, "number", {min: 0, max: 12});
        this.addProperty("step", 1, "number");
        this.addProperty("min", 0, "number");
        this.addProperty("max", Number.MAX_SAFE_INTEGER, "number");
        this.widget = this.addWidget("number", "value", 1, "value", { precision: this.properties.precision, step: this.properties.step, min: this.properties.min });
        this.widgets_up = true;
        this.size = [180, 30];
    }

    onPropertyChanged(name, value) {
        if (["precision","step","min"].indexOf(name) !== -1) {
            if(name=="precision"){
                value = Math.max(0,Math.min(value,12));
                return false;
            }
            this.widgets[0].options[name] = value;
        }
    }

    onExecute() {
        this.setOutputData(0, parseFloat(this.isWidgetLinked(this.widget) ? this.getWidgetValue("value") : this.properties["value"]));
    }

    getTitle() {
        if (this.flags?.collapsed) {
            return this.properties?.value;
        }
        return this.title;
    }

    setValue(v) {
        this.setProperty("value", v);
    }

    onDrawBackground() {
        // show the current value
        this.outputs[0].label = LiteGraph.formatNumber(this.isWidgetLinked(this.widget) ? this.getWidgetValue("value") : this.properties["value"],3);
    }
}
LiteGraph.registerNodeType("basic/const", ConstantNumber);

class ConstantBoolean {

    static title = "Const Boolean";
    static desc = "A true/false value. Edit the toggle or send an action to its optional toggle input.";
    static usage = "Change value in the widget or properties. Add the optional toggle action input to invert it on each action; the bool output remains a boolean value.";
    static search_aliases = ["toggle", "bool", "true", "false"];
    static icon = "◉";

    constructor() {
        this.addOutput("bool", "boolean");
        this.addProperty("value", true);
        this.widget = this.addWidget("toggle", "value", true, "value", { on: "true", off: "false" });
        this.serialize_widgets = true;
        this.widgets_up = true;
        this.size = [160, 30];
    }

    onExecute() {
        this.setOutputData(0, this.properties["value"]);
    }

    onConfigure() {
        // The saved property is authoritative when legacy widget values disagree.
        this.widget.value = this.properties.value;
    }

    onDrawBackground() {
        this.outputs[0].label = this.properties.value ? "true" : "false";
    }

    onGetInputs() {
        return [["toggle", LiteGraph.ACTION]];
    }

    onAction() {
        this.setValue(!this.properties?.value);
    }
}
ConstantBoolean.prototype.getTitle = ConstantNumber.prototype.getTitle;
ConstantBoolean.prototype.setValue = ConstantNumber.prototype.setValue;
LiteGraph.registerNodeType("basic/boolean", ConstantBoolean);


class ConstantString {

    static title = "Const String";
    static desc = "Constant string";

    constructor() {
        this.addOutput("string", "string");
        this.addProperty("value", "");
        this.widget = this.addWidget("text", "value", "", "value"); // link to property value
        this.widgets_up = true;
        this.size = [180, 30];
    }

    onExecute() {
        this.setOutputData(0, this.properties["value"]);
    }

    onDropFile(file) {
        var that = this;
        var reader = new FileReader();
        reader.onload = function (e) {
            that.setProperty("value", e.target.result);
        };
        reader.readAsText(file);
    }
}
ConstantString.prototype.getTitle = ConstantNumber.prototype.getTitle;
ConstantString.prototype.setValue = ConstantNumber.prototype.setValue;
LiteGraph.registerNodeType("basic/string", ConstantString);


class ConstantObject {

    static title = "Const Object";
    static desc = "Constant Object";

    constructor() {
        this.addOutput("obj", "object");
        this.size = [120, 30];
        this._object = {};
    }

    onExecute() {
        this.setOutputData(0, this._object);
    }
}
LiteGraph.registerNodeType("basic/object", ConstantObject);


class ConstantFile {

    static title = "Const File";
    static desc = "Fetches a file from an url";

    constructor() {
        this.addInput("url", "string");
        this.addOutput("file", "string");
        this.addProperty("url", "");
        this.addProperty("type", "text");
        this.widget = this.addWidget("text", "url", "", "url");
        this._data = null;
    }

    onPropertyChanged(name, value) {
        if (name == "url") {
            if (value == null || value == "") this._data = null;
            else {
                this.fetchFile(value);
            }
        }
    }

    onExecute() {
        var url = this.getInputData(0) || this.properties.url;
        if (url && (url != this._url || this._type != this.properties?.type))
            this.fetchFile(url);
        this.setOutputData(0, this._data);
    }

    fetchFile(url) {
        var that = this;
        if (!url || url.constructor !== String) {
            that._data = null;
            that.boxcolor = null;
            return;
        }

        this._url = url;
        this._type = this.properties?.type;
        if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
            url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
        }
        fetch(url)
            .then(function (response) {
                if (!response.ok) throw new Error("File not found");

                if (that.properties.type == "arraybuffer")
                    return response.arrayBuffer();
                else if (that.properties.type == "text") return response.text();
                else if (that.properties.type == "json") return response.json();
                else if (that.properties.type == "blob") return response.blob();
            })
            .then(function (data) {
                that._data = data;
                that.boxcolor = "#AEA";
            })
            .catch((_error) => {
                that._data = null;
                that.boxcolor = "red";
                console.error?.("error fetching file:", url);
            });
    }

    onDropFile(file) {
        var that = this;
        this._url = file.name;
        this._type = this.properties?.type;
        this.properties.url = file.name;
        var reader = new FileReader();
        reader.onload = function (e) {
            that.boxcolor = "#AEA";
            var v = e.target.result;
            if (that.properties.type == "json") v = JSON.parse(v);
            that._data = v;
        };
        if (that.properties.type == "arraybuffer") reader.readAsArrayBuffer(file);
        else if (that.properties.type == "text" || that.properties.type == "json")
            reader.readAsText(file);
        else if (that.properties.type == "blob")
            return reader.readAsBinaryString(file);
    }

    static "@type" = {
        type: "enum",
        values: ["text", "arraybuffer", "blob", "json"],
    };
}
ConstantFile.prototype.setValue = ConstantNumber.prototype.setValue;
LiteGraph.registerNodeType("basic/file", ConstantFile);


// to store json objects
class JSONParse {

    static title = "JSON Parse";
    static desc = "Parses JSON String into object";

    constructor() {
        this.addInput("parse", LiteGraph.ACTION);
        this.addInput("json", "string");
        this.addOutput("done", LiteGraph.EVENT);
        this.addOutput("object", "object");
        this.widget = this.addWidget("button", "parse", "", this.parse.bind(this));
        this._str = null;
        this._obj = null;
    }

    parse() {
        // read the text now: the action can come before this node ever executed (graph stopped)
        const str = this.getInputData(1) ?? this._str;
        if (str == null || str === "") return;
        try {
            this._str = str;
            this._obj = JSON.parse(str);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
            return;
        }
        // the object output is set before "done" fires, so the nodes it triggers read the new object
        this.setOutputData(1, this._obj);
        this.triggerSlot(0);
    }

    onExecute() {
        this._str = this.getInputData(1);
        this.setOutputData(1, this._obj);
    }

    onAction(name) {
        if (name == "parse") this.parse();
    }
}
LiteGraph.registerNodeType("basic/jsonparse", JSONParse);


// to store json objects
class ConstantData {

    static title = "Const Data";
    static desc = "Constant Data";

    constructor() {
        this.addOutput("data", "object");
        this.addProperty("value", "");
        this.widget = this.addWidget("text", "json", "", "value");
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;
    }

    onPropertyChanged(name, value) {
        this.widget.value = value;
        if (value == null || value == "") {
            return;
        }

        try {
            this._value = JSON.parse(value);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
        }
    }

    onExecute() {
        this.setOutputData(0, this._value);
    }
}
ConstantData.prototype.setValue = ConstantNumber.prototype.setValue;
LiteGraph.registerNodeType("basic/data", ConstantData);


// to store json objects
class ConstantArray {

    static title = "Const Array";
    static desc = "Constant Array";

    constructor() {
        this._value = [];
        this.addInput("array", "");
        this.addOutput("arrayOut", "array");
        this.addOutput("length", "number");
        this.addProperty("value", "[]");
        this.addProperty("persistent", false);
        this.widget = this.addWidget(
            "text",
            "array",
            this.properties.value,
            "value",
        );
        this.addWidget(
            "combo",
            "persistent",
            this.properties.persistent,
            "persistent",
            {values: [true, false]},
        );
        this.widgets_up = true;
        this.size = [140, 50];
    }

    onPropertyChanged(name, value) {
        if(name=="value"){
            this.widget.value = value; // force widget update (is it needed?)
            // if (value == null || value == "") {
            //     return;
            // }
            // this._value = value;
        }
        this.processArray();
    }

    processArray(){
        if (!this.properties.value || !this.properties?.persistent || this.properties?.persistent==="false"){
            // var v = this.getInputOrProperty("array"); //getInputData(0);
            // this._value = v;
            this._value = new Array();
            try {
                if (this.properties.value && typeof(this.properties.value[0] !== "undefined") && this.properties.value[0] != "["){
                    this._value = JSON.parse("[" + this.properties.value + "]");
                }
                else this._value = JSON.parse(this.properties.value);
                this.boxcolor = "#AEA";
            } catch (err) {
                this.boxcolor = "red";
            }
        }
    }

    onExecute() {
        this.processArray();
        // clone
        // this._value.length = v.length;
        // for (var i = 0; i < v.length; ++i)
        //     this._value[i] = v[i];
        // this.changeOutputType("arrayOut", "array");
        // TODO restart here, convert and reprocess ad array
        this.setOutputData(0, this._value);
        this.setOutputData(1, this._value ? this._value.length || 0 : 0);
    }

    onAdded(){
        this.processArray();
    }
}
ConstantArray.prototype.setValue = ConstantNumber.prototype.setValue;
LiteGraph.registerNodeType("basic/array", ConstantArray);

class ArrayLength {

    static title = "aLength";
    static desc = "Get the length of an array";

    constructor() {
        this.addInput("arr", "array");
        this.addOutput("length", "number");
    }

    onExecute() {
        var arr = this.getInputData(0);
        if(!arr)
            return;
        if(["array","object"].includes(typeof(arr)) && typeof(arr.length)!=="undefined") {
            this.setOutputData(0,arr.length);
        }else{
            console.debug?.("Not an array or object",typeof(arr),arr);
            this.setOutputData(0,null);
        }
    }
}
LiteGraph.registerNodeType("basic/array_length", ArrayLength );


class SetArray {

    static title = "Set Array";
    static desc = "Sets index of array";

    constructor() {
        this.addInput("arr", "array");
        this.addInput("value", "");
        this.addOutput("arr", "array");
        this.properties = { index: 0 };
        this.widget = this.addWidget(
            "number",
            "i",
            this.properties?.index,
            "index",
            { precision: 0, step: 10, min: 0 },
        );
    }

    onExecute() {
        var arr = this.getInputData(0);
        if (!arr) return;
        var v = this.getInputData(1);
        if (v === undefined) return;
        let aK = Math.floor(this.properties?.index);
        if(typeof(arr[aK])!=="undefined") arr[aK] = v;
        this.setOutputData(0, arr);
    }
}
LiteGraph.registerNodeType("basic/set_array", SetArray);


class ArrayElement {

    static title = "Array[i]";
    static desc = "Returns an element from an array";

    constructor() {
        this.addInput("array", "array,table,string");
        this.addInput("index", "number");
        this.addOutput("value", "");
        this.addProperty("index", 0);
    }

    onExecute() {
        var array = this.getInputData(0);
        var index = this.getInputData(1);
        if (index == null) index = this.properties?.index;
        if (array == null || index == null) return;
        this.setOutputData(0, array[Math.floor(Number(index))]);
    }
}
LiteGraph.registerNodeType("basic/array[]", ArrayElement);

class ArrayAppend {
    static title = "Array Append";
    static desc = "Pushes an element to an array";

    constructor() {
        this.addInput("array", "array");
        this.addInput("element", 0);
        this.addOutput("success", "boolean");
    }

    onExecute() {
        var array = this.getInputData(0);
        var el = this.getInputData(1);
        if(array !== null && array && typeof(array.push) == "function"){
            array.push(el);
            this.setOutputData(0, true);
        }else{
            this.setOutputData(0, false);
        }
    }
}
LiteGraph.registerNodeType("basic/array_append", ArrayAppend);


class TableElement {

    static title = "Table[row][col]";
    static desc = "Returns an element from a table";

    constructor() {
        this.addInput("table", "table");
        this.addInput("row", "number");
        this.addInput("col", "number");
        this.addOutput("value", "");
        this.addProperty("row", 0);
        this.addProperty("column", 0);
    }

    onExecute() {
        var table = this.getInputData(0);
        var row = this.getInputData(1);
        var col = this.getInputData(2);
        if (row == null) row = this.properties?.row;
        if (col == null) col = this.properties?.column;
        if (table == null || row == null || col == null) return;
        row = table[Math.floor(Number(row))];
        if (row) this.setOutputData(0, row[Math.floor(Number(col))]);
        else this.setOutputData(0, null);
    }
}
LiteGraph.registerNodeType("basic/table[][]", TableElement);


// Store as variable
class Variable {

    static title = "Variable";
    static desc = "store/read variable value";

    constructor() {
        this.size = [60, 30];
        this.addInput("in");
        this.addOutput("out");
        this.properties = { varname: "myname", container: Variable.LITEGRAPH };
        this.value = null;
    }

    onExecute() {
        var container = this.getContainer();

        if (this.isInputConnected(0)) {
            this.value = this.getInputData(0);
            container[this.properties?.varname] = this.value;
            this.setOutputData(0, this.value);
            return;
        }

        this.setOutputData(0, container[this.properties?.varname]);
    }

    getContainer() {
        switch (this.properties?.container) {
            case Variable.GRAPH:
                if (this.graph) return this.graph.vars;
                return {};
            case Variable.GLOBALSCOPE:
                return global; // @BUG: not sure what to do with this now
            default:
                return LiteGraph.Globals;
        }
    }

    getTitle() {
        return this.properties?.varname;
    }

}
// @TODO:Enum
Variable.LITEGRAPH = 0; // between all graphs
Variable.GRAPH = 1; // only inside this graph
Variable.GLOBALSCOPE = 2; // attached to Window
Variable["@container"] = {
    type: "enum",
    values: {
        litegraph: Variable.LITEGRAPH,
        graph: Variable.GRAPH,
        global: Variable.GLOBALSCOPE,
    },
};
LiteGraph.registerNodeType("basic/variable", Variable);


function length(v) {
    if (v && v.length != null) return Number(v.length);
    return 0;
}
LiteGraph.wrapFunctionAsNode("basic/length", length, [""], "number");



LiteGraph.wrapFunctionAsNode(
    "basic/not",
    function (a) {
        return !a;
    },
    [""],
    "boolean",
);


class DownloadData {

    static title = "Download";
    static desc = "Download some data";

    constructor() {
        this.size = [60, 30];
        this.addInput("data", 0);
        this.addInput("download", LiteGraph.ACTION);
        this.properties = { filename: "data.json" };
        this.value = null;
        var that = this;
        this.addWidget("button", "Download", "", () => {
            if (!that.value) return;
            that.downloadAsFile();
        });
    }

    downloadAsFile() {
        if (this.value == null) return;

        var str = null;
        if (this.value.constructor === String) str = this.value;
        else str = JSON.stringify(this.value);

        var file = new Blob([str]);
        var url = URL.createObjectURL(file);
        var element = document.createElement("a");
        element.setAttribute("href", url);
        element.setAttribute("download", this.properties?.filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000 * 60); // wait one minute to revoke url
    }

    onAction() {
        var that = this;
        setTimeout(function () {
            that.downloadAsFile();
        }, 100); // deferred to avoid blocking the renderer with the popup
    }

    onExecute() {
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    }

    getTitle() {
        if (this.flags?.collapsed) {
            return this.properties?.filename;
        }
        return this.title;
    }
}
LiteGraph.registerNodeType("basic/download", DownloadData);


// Watch a value in the editor
/**
 * Watch: shows the value on its input. One node with three displays (property `display`):
 * - "value": the value as the input's label (the classic watch);
 * - "text": multiline text with font options (was `basic/watch_advanced`);
 * - "tree": a JSON tree viewer (was `watch/value`, registered by watch.js as a display).
 * The old types load as this one through automatic replacement mappings.
 */
class Watch {

    static title = "Watch";
    static desc = "Show value of input";

    /** displays by name: {setup?(node), execute?(node), draw?(node, ctx, ...), mouseDown?(node, e, pos), menu?(node, canvas)} */
    static displays = {
        auto: {
            setup(node) {
                if (node.inputs[0]) node.inputs[0].label = "value";
                // Give the new display room once; incoming data never changes the size.
                node.size[0] = Math.max(node.size[0], 240);
                node.size[1] = Math.max(node.size[1], 130);
            },
            execute(node) {
                node.value = node.getInputData(0);
                const link = node.graph?.links[node.inputs[0]?.link];
                const declared = link?.type || "*";
                const observed = node.value === null ? "null" : Array.isArray(node.value) ? "array" : typeof node.value;
                const expected = String(declared).toLowerCase().split(",");
                const known = ["number", "string", "boolean", "object", "array", "null", "undefined"];
                const mismatch = expected.every((type) => known.includes(type)) && !expected.includes(observed);
                const missing = node.inputs[0]?.link == null;
                node.auto_status = missing ? "No input connected" : `${declared} → ${observed}${mismatch ? " · type mismatch" : ""}`;
                node.auto_preview = missing ? "Connect a value to inspect it." : Watch.preview(node.value);
            },
            draw(node, ctx) {
                if (node.flags?.collapsed) return;
                ctx.save();
                ctx.beginPath(); ctx.rect(0, 0, node.size[0], node.size[1]); ctx.clip();
                ctx.font = "12px monospace";
                ctx.textAlign = "left";
                ctx.fillStyle = "#aabace";
                ctx.fillText(node.auto_status ?? "Run the graph to inspect a value", 8, 40);
                ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
                const text = node.auto_preview ?? "";
                // Wrap only the bounded preview; node size is a user choice, never data-driven.
                const columns = Math.max(8, Math.floor((node.size[0] - 16) / 7.3));
                const lines = text.match(new RegExp(`.{1,${columns}}`, "g")) ?? [];
                for (let i = 0; i < Math.min(lines.length, 8); i++) ctx.fillText(lines[i], 8, 60 + i * 16);
                ctx.restore();
            },
        },
        value: {
            draw(node) {
                node.inputs[0].label = Watch.toString(node.value);
            },
        },
        text: {
            setup(node) {
                if (node.inputs[0]) node.inputs[0].label = "";
                for (const [name, value, type] of [["font_family", "Arial", "string"], ["font_size", 14, "number"], ["clip", false, "toggle"]]) {
                    if (!(name in node.properties)) node.addProperty(name, value, type);
                }
                node.value_last = undefined;
                node.contlines = { lines: [], lines_tot: 0 };
                node.changed = true;
                // the text display's menu and resize handlers call these through `this`
                for (const method of ["showFull", "fullWidth", "fullHeight", "copyContent", "onResize", "onResizeEnd"]) {
                    if (typeof node[method] !== "function") node[method] = WatchAdvanced.prototype[method];
                }
            },
            execute(node) {
                WatchAdvanced.prototype.onExecute.call(node);
            },
            draw(node, ctx) {
                WatchAdvanced.prototype.onDrawBackground.call(node, ctx);
            },
            menu(node, canvas) {
                return WatchAdvanced.prototype.getExtraMenuOptions.call(node, canvas);
            },
        },
    };

    constructor() {
        this.size = [60, 30];
        this.addInput("value", 0, { label: "" });
        this.addProperty("display", "value", "enum", { values: ["value", "auto", "text", "tree"] });
        this.value = null;
    }

    /** the display in use (an unknown name, e.g. "tree" without watch.js, falls back to "value") */
    getDisplay() {
        return Watch.displays[this.properties?.display] ?? Watch.displays.value;
    }

    onPropertyChanged(name, value) {
        if (name === "display") {
            this.getDisplay().setup?.(this);
            this.setDirtyCanvas?.(true, true);
        } else if (this.properties?.display === "text") {
            this.changed = true;
        } else if (name === "clip_area") {
            this.clip_area = value;
        }
    }

    onConfigure() {
        this.getDisplay().setup?.(this);
    }

    onConnectionsChange(connection, slot, connected, link_info) {
        // only process the inputs
        if (connection != LiteGraph.INPUT) {
            return;
        }
        if (this.properties?.display === "text") {
            this.changed = true;
            return;
        }
        this.value = this.getInputData(0,true); // force update
    }

    onExecute() {
        const display = this.getDisplay();
        if (display.execute) {
            display.execute(this);
        } else if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    }

    getTitle() {
        if (this.flags?.collapsed) {
            return this.inputs[0].label;
        }
        return this.title;
    }

    /** Bounded inspection of own data properties; getters and custom toString are never invoked. */
    static preview(value) {
        const seen = new WeakSet();
        let budget = 32;
        const visit = (item, depth) => {
            if (--budget < 0) return "…";
            if (item === null) return "null";
            if (typeof item === "string") return JSON.stringify(item.slice(0, 100)) + (item.length > 100 ? "…" : "");
            if (typeof item !== "object") return typeof item === "function" ? "[Function]" : String(item);
            if (seen.has(item)) return "[Circular]";
            if (depth >= 3) return "[…]";
            seen.add(item);
            try {
                const array = Array.isArray(item);
                const keys = Object.keys(item);
                const parts = keys.slice(0, 8).map((key) => {
                    const desc = Object.getOwnPropertyDescriptor(item, key);
                    const text = desc && "value" in desc ? visit(desc.value, depth + 1) : "[Accessor]";
                    return array ? text : `${key.slice(0, 40)}: ${text}`;
                });
                if (keys.length > 8) parts.push(`… +${keys.length - 8}`);
                return (array ? "[" : "{") + parts.join(", ") + (array ? "]" : "}");
            } catch { return "[Uninspectable]"; }
            finally { seen.delete(item); }
        };
        return visit(value, 0).slice(0, 600);
    }

    static toString(o) {
        if (o == null) {
            return "null";
        } else if (o.constructor === Number) {
            return o.toFixed(3);
        } else if (o.constructor === Array) {
            let str = "[";
            for (var i = 0; i < o.length; ++i) {
                str += WatchAdvanced.toString(o[i]) + (i + 1 != o.length ? "," : "");
            }
            str += "]";
            return str;
        } else {
            try{
                return String(o);
            }catch(e){
                return typeof(o);
            }
        }
    }

    onDrawBackground(ctx, canvas, element, pos) {
        this.getDisplay().draw?.(this, ctx, canvas, element, pos);
    }

    onMouseDown(e, pos, canvas) {
        return this.getDisplay().mouseDown?.(this, e, pos, canvas);
    }

    getExtraMenuOptions(canvas) {
        return this.getDisplay().menu?.(this, canvas) ?? [];
    }
}
LiteGraph.registerNodeType("basic/watch", Watch);


class WatchAdvanced{
    static title = "WatchA";
    static desc = "Show value of input, improved formatting";

    constructor() {
        this.size = [60, 30];
        this.addInput("value", 0, { label: "" });
        this.addProperty("font_family","Arial","string");
        this.addProperty("font_size",14,"number"); //, "==", "enum", { values: GenericCompare.values });
        this.addProperty("clip",false,"toggle");
        this.value = 0;
        this.value_last = 0;
        this.contlines = {};
        this.changed = true;
    }

    onExecute() {
        if (this.inputs[0]) {
            this.value = WatchAdvanced.toString(this.getInputData(0));
            if (this.value !== this.value_last){
                this.changed = true;
                this.value_last = this.value;
            }
        }
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.inputs[0].label;
        }
        return this.title;
    }

    static toString = function(o) {
        if (o == null) {
            return "null";
        } else if (o.constructor === Number) {
            return o.toFixed(3);
        } else if (o.constructor === Object) {
            let str = "";
            try{
                str = JSON.stringify(o,null,2);
            }catch(e){
                str = "{OBJ}";
            }
            return str;
        } else if (o.constructor === Array) {
            let str = "[";
            for (var i = 0; i < o.length; ++i) {
                str += WatchAdvanced.toString(o[i]) + (i + 1 != o.length ? "," : "");
            }
            str += "]";
            return str;
        } else {
            return String(o);
        }
    };

    onDrawBackground(ctx) {
        //show the current value
        //this.inputs[0].label = WatchAdvanced.toString(this.value);
        if (this.flags.collapsed)
            return;
        var lS = this.properties.font_size || 9;
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT - 0.5;
        // var oTMultiRet = {lines: [], maxW: 0, height:0}
        ctx.font = lS+"px"
                    +" "
                    +(this.properties.font_family ? this.properties.font_family+"" : "Arial");
        ctx.fillStyle = "#FFF";
        if(this.changed){
            var text = this.value; //WatchAdvanced.toString(this.value);
            this.contlines = LiteGraph.canvasFillTextMultiline(ctx, text, 15, LiteGraph.NODE_TITLE_HEIGHT, this.size[0], lS, 0, y/lS); // context, text, x, y, maxWidth, lineHeight, startLine, endLine
            this.changed = false;
            console.debug("calculated multiline",this.contlines);
        }else{
            //console.debug("not changed",this.contlines);
            
        }
        var nL = this.contlines.lines.length;
        var nL_dif = this.contlines.lines_tot - nL;
        //if(nL_dif > 0) nL -= 2; // show less? stay inside with .. +x lines message 
        for(var iL=0; iL<nL; iL++){
            ctx.fillText(this.contlines.lines[iL], 15, LiteGraph.NODE_TITLE_HEIGHT+(lS*iL));
        }
        if(nL_dif > 0){
            ctx.fillText("... +"+nL_dif+" lines", 15, LiteGraph.NODE_TITLE_HEIGHT+(lS*(iL+1)));
        }
        this.clip_area = this.properties.clip;
    }

    fullWidth(menuitem,contextmenu,options,e,that_node,options_node){
        if(!that_node) that_node = this;
        if(!that_node || !that_node.size) return;
        if(that_node.contlines && that_node.contlines.lines_tot){
            if(that_node.size[0] != that_node.contlines.maxW + 15){
                that_node.size[0] = that_node.contlines.maxW + 15;
            }else{
                that_node.size[0] = that_node.contlines.width + 15;
            }
        }else{
            that_node.size[0] = 90;
        }
        that_node.changed = true;
        that_node.setDirtyCanvas(true, true);
    }

    fullHeight(menuitem,contextmenu,options,e,that_node,options_node){
        if(!that_node) that_node = this;
        if(!that_node || !that_node.size) return;
        if(that_node.contlines && that_node.contlines.lines_tot){
            if(that_node.size[1] != that_node.properties.font_size*that_node.contlines.lines_tot){
                that_node.size[1] = that_node.properties.font_size*that_node.contlines.lines_tot;
            }else{
                that_node.size[1] = 90;
            }
        }else{
            that_node.size[1] = that_node.size_basic ? that_node.size_basic[0] : 30;
        }
        that_node.changed = true;
        that_node.setDirtyCanvas(true, true);
    }

    showFull(menuitem,contextmenu,options,e,that_node,options_node){
        /*console.debug("menuitem",menuitem);
        console.debug("contextmenu",contextmenu);
        console.debug("options",options);
        console.debug("e",e);
        console.debug("that_node",that_node);
        console.debug("options_node",options_node);*/
        if(!that_node) that_node = this;
        if(!that_node || !that_node.size) return;
        if(that_node.contlines && that_node.contlines.lines_tot){
            if(that_node.size[1] < that_node.properties.font_size*that_node.contlines.lines_tot){
                that_node.size[0] = that_node.contlines.maxW + 15;
                that_node.size[1] = that_node.properties.font_size*that_node.contlines.lines_tot;
                //that_node.properties.clip = false;
            }else{
                // should recalculate to know the size
                that_node.size[0] = that_node.contlines.width + 15;
                //that_node.size[1] = 120;
                that_node.size[1] = 90;
                //that_node.properties.clip = true;
            }
        }else{
            that_node.size[1] = that_node.size_basic ? that_node.size_basic[1] : 30;
            that_node.size[0] = that_node.size_basic ? that_node.size_basic[0] : 90;
        }
        that_node.changed = true;
        that_node.setDirtyCanvas(true, true);
    }

    // context menu (right click) OVERRIDE 
    // getMenuOptions(lgcanvas){ }

    // context menu (right click) ADD
    getExtraMenuOptions(lgcanvas){
        return [{
            content: "Toggle full",
            has_submenu: false,
            callback: this.showFull
        },{
            content: "Full Width",
            callback: this.fullWidth
        },{
            content: "Full Height",
            callback: this.fullHeight
        }
        ,null
        ,{
            content: "TODO - Copy",
            callback: this.copyContent
        }];
    }

    copyContent(menuitem,contextmenu,options,e,that_node,options_node){
        //
    }

    onPropertyChanged(property, value){
        this.changed = true;
    }

    onDblClick(e, pos, lgcanvas){
        // use right click Fill view
        // this.showFull();
    }

    onResize(size){
        if(!this.resizeStart){
            this.resizeStart = this.size;
            this.changed = true;
        }
        // if(typeof this.flags !== "undefined"){
        //     if(typeof this.flags.resizing !== "undefined" && !this.flags.resizing){
        //         this.changed = true;
        //     }
        // }
    }
    onResizeEnd(lgcanvas){
        if(typeof this.flags !== "undefined"){
            if(typeof this.flags.resizing !== "undefined" && !this.flags.resizing){
                this.resizeEnd = this.size;
                if(this.resizeStart[0] != this.resizeEnd[0] || this.resizeStart[1] != this.resizeEnd[1]){
                    this.changed = true;
                }
                this.resizeStart = false;
            }
        }
    }
}
// basic/watch_advanced is now basic/watch with display "text" (catalog cleanup, Wave 4e)
LiteGraph.registerNodeReplacement({
    old_type: "basic/watch_advanced", new_type: "basic/watch", auto: true,
    properties: { font_family: "font_family", font_size: "font_size", clip: "clip" },
    set: { properties: { display: "text" } },
    reason: "one watch node: basic/watch with display \"text\"",
});


// in case one type doesnt match other type but you want to connect them anyway
class Cast {

    static title = "Cast";
    static desc = "Allows to connect different types";

    constructor() {
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.size = [40, 30];
    }

    onExecute() {
        this.setOutputData(0, this.getInputData(0));
    }
}
LiteGraph.registerNodeType("basic/cast", Cast);


// Show value inside the debug console
class Console {

    static title = "Console";
    static desc = "Show value inside the console";
    // @BUG: Didn't output text to console, either in browser or cmd

    constructor() {
        this.mode = LiteGraph.ON_EVENT;
        this.size = [80, 30];
        this.addProperty("msg", "");
        this.addInput("log", LiteGraph.EVENT);
        this.addInput("msg", 0);
    }

    onAction(action, param, options, slot_index) {
        this.onExecute(action, param, options);
    }

    onExecute(param, options) {
        // param is the action
        const action = param;
        let msg = this.getInputData(1); // getInputDataByName("msg");
        // if (msg == null || typeof msg == "undefined") return;
        if (!msg) msg = this.properties?.msg;
        if (action == "log") {
            console.log(msg,param);
        } else if (action == "warn") {
            console.warn(msg,param);
        } else if (action == "error") {
            console.error(msg,param);
        }else{
            console.info("[ConsoleNode]",msg,param);
            console.debug("[ConsoleNode]",msg,param,"options:",options);
        }
    }

    onGetInputs() {
        return [
            ["log", LiteGraph.ACTION],
            ["warn", LiteGraph.ACTION],
            ["error", LiteGraph.ACTION],
        ];
    }
}
LiteGraph.registerNodeType("basic/console", Console);


// Show value inside the debug console
class Alert {

    static title = "Alert";
    static desc = "Show an alert window";

    constructor() {
        this.mode = LiteGraph.ON_EVENT;
        this.addProperty("msg", "");
        this.addInput("", LiteGraph.EVENT);

        this.widget = this.addWidget("text", "Text", "", "msg");
        this.widgets_up = true;
        this.size = [200, 30];
    }

    onConfigure(o) {
        this.widget.value = o.properties.msg;
    }

    onAction() {
        var msg = this.properties?.msg;
        setTimeout(function () {
            alert(msg);
        }, 10);
    }

    static color = "#510";
}
LiteGraph.registerNodeType("basic/alert", Alert);


// Executes simple code
class NodeScript {

    static title = "Script";
    static desc = "executes a code (max 256 characters)";

    constructor() {
        this.size = [60, 30];
        this.addProperty("onExecute", "return A;");
        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("out", 0);

        this._func = null;
        this.data = {};
    }

    onConfigure(o) {
        if (o.properties.onExecute && LiteGraph.allow_scripts)
            this.compileCode(o.properties.onExecute);
        else console.warn?.("Script not compiled, LiteGraph.allow_scripts is false");
    }

    onPropertyChanged(name, value) {
        if (name == "onExecute" && LiteGraph.allow_scripts) this.compileCode(value);
        else console.warn?.("Script not compiled, LiteGraph.allow_scripts is false");
    }

    compileCode(code) {
        this._func = null;
        if (code.length > 256) {
            console.warn?.("Script too long, max 256 chars");
        } else {
            var code_low = code.toLowerCase();
            var forbidden_words = [
                "script",
                "body",
                "document",
                "eval",
                "nodescript",
                "function",
            ]; // bad security solution
            for (var i = 0; i < forbidden_words.length; ++i) {
                if (code_low.indexOf(forbidden_words[i]) != -1) {
                    console.warn?.("invalid script");
                    return;
                }
            }
            try {
                this._func = new Function("A", "B", "C", "DATA", "node", code);
            } catch (err) {
                console.error?.("Error parsing script");
                console.error?.(err);
            }
        }
    }

    onExecute() {
        if (!this._func) {
            return;
        }

        try {
            var A = this.getInputData(0);
            var B = this.getInputData(1);
            var C = this.getInputData(2);
            this.setOutputData(0, this._func(A, B, C, this.data, this));
        } catch (err) {
            console.error?.("Error in script");
            console.error?.(err);
        }
    }

    onGetOutputs() {
        return [["C", ""]];
    }

    static widgets_info = { onExecute: { type: "code" } };
}
LiteGraph.registerNodeType("basic/script", NodeScript);


class GenericCompare {

    static title = "Compare *";
    static desc = "evaluates condition between A and B";

    constructor() {
        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("true", "boolean");
        this.addOutput("false", "boolean");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", "==", "enum", { values: GenericCompare.values });
        this.addWidget("combo", "Op.", this.properties?.OP, {
            property: "OP",
            values: GenericCompare.values,
        });

        this.size = [80, 60];
    }

    getTitle() {
        return "*A " + this.properties?.OP + " *B";
    }

    onExecute() {
        var A = this.getInputData(0);
        if (A === undefined) {
            A = this.properties?.A;
        } else {
            this.properties.A = A;
        }

        var B = this.getInputData(1);
        if (B === undefined) {
            B = this.properties?.B;
        } else {
            this.properties.B = B;
        }

        var result = false;
        if (typeof A == typeof B) {
            switch (this.properties?.OP) {
                case "==":
                case "!=":
                    // traverse both objects.. consider that this is not a true deep check! consider underscore or other library for thath :: _isEqual()
                    result = true;
                    switch (typeof A) {
                        case "object":
                            if (A === null || B === null) {
                                result = A === B;
                                break;
                            }
                            var aProps = Object.getOwnPropertyNames(A);
                            var bProps = Object.getOwnPropertyNames(B);
                            if (aProps.length != bProps.length) {
                                result = false;
                                break;
                            }
                            for (var i = 0; i < aProps.length; i++) {
                                var propName = aProps[i];
                                if (A[propName] !== B[propName]) {
                                    result = false;
                                    break;
                                }
                            }
                            break;
                        default:
                            result = A == B;
                    }
                    if (this.properties?.OP == "!=") result = !result;
                    break;
                /* case ">":
                    result = A > B;
                    break;
                case "<":
                    result = A < B;
                    break;
                case "<=":
                    result = A <= B;
                    break;
                case ">=":
                    result = A >= B;
                    break;
                case "||":
                    result = A || B;
                    break;
                case "&&":
                    result = A && B;
                    break;*/
            }
        }
        this.setOutputData(0, result);
        this.setOutputData(1, !result);
    }

    static values = ["==", "!="]; // [">", "<", "==", "!=", "<=", ">=", "||", "&&" ];

    static "@OP" = {
        type: "enum",
        title: "operation",
        values: GenericCompare.values,
    };
}
LiteGraph.registerNodeType("basic/CompareValues", GenericCompare);

// execution needs (Wave 6): pure readers run on request in the ancestors model
LiteGraph.declareNodeExecution(["basic/array_length", "basic/array[]", "basic/table[][]", "basic/cast", "basic/CompareValues"], { pure: true });
// declaration pass (flows track): constants and conversions are pure; alert only reacts to events
LiteGraph.declareNodeExecution(["basic/const", "basic/boolean", "basic/string", "basic/data", "basic/array", "basic/length", "basic/not"], { pure: true });
LiteGraph.declareNodeExecution(["basic/alert"], { default_mode: LiteGraph.ON_EVENT });
// volatile (FLW-02, flows step 4): they read time or outside state; ON_REQUEST runs them once per call
// scope (a step, an event, a loop iteration, a Sequence output)
LiteGraph.declareNodeExecution(["basic/time"], { pure: "volatile" });
// Volatile but kept undeclared and ALWAYS until checked in a browser: basic/object, basic/script, basic/file.
// basic/variable is not pure: with its input connected it writes the variable (a setter, often ON_TRIGGER).
// Side effects or state, kept ALWAYS (a mode change would stop them): basic/set_array, basic/array_append,
// basic/console, basic/download, basic/jsonparse, basic/data_store, basic/watch.

LiteGraph.packs.close("litegraph/basic");
