
// EG METHOD

// function mMETHOD(){
//     this.properties = { };
//     // this.addInput("onTrigger", LiteGraph.ACTION);
//     // this.addInput("condition", "boolean");
//     // this.addOutput("true", LiteGraph.EVENT);
//     // this.addOutput("false", LiteGraph.EVENT);
//     this.mode = LiteGraph.ON_TRIGGER;
// }
// mMETHOD.title = "Branch";
// mMETHOD.desc = "Branch execution on condition";
// mMETHOD.prototype.onExecute = function(param, options) {
//     // this.triggerSlot(0);
// };
// mMETHOD.prototype.onAction = function(action, param, options){
// };
// mMETHOD.prototype.onGetInputs = function() {
//     //return [["optional slot in", 0]];
// };
// mMETHOD.prototype.onGetOutputs = function() {
//     //return [["optional slot out", 0]];
// };
// LiteGraph.registerNodeType("objects/egnode", mMETHOD);

// --------------------------

function objProperties() {



        this.addInput("obj", "object");
        // this.addInput("condition", "boolean");

        this.addOutput("properties", "array");
        // this.addOutput("false", LiteGraph.EVENT);

        // this.mode = LiteGraph.ON_TRIGGER;
        // this.widget = this.addWidget("text","prop.","",this.setValue.bind(this) );
        // this.widgets_up = true;
        // this.size = [140, 30];
        this._value = null;
        this._objProperties = [];
    }

objProperties.prototype.onExecute = function() {
        var data = this.getInputData(0);
        if (data != null) {
            this._value = data;
            try{
                this._objProperties = Object.keys(this._value);
            }catch(e) {
                console.error?.(e);
            }
            this.setOutputData(0, this._objProperties);
        }
    }
objProperties.prototype.onAction = function() {
        // should probably execute on action
    }
objProperties.prototype.onGetInputs = function() {
        // return [["in", 0]];
    }
objProperties.prototype.onGetOutputs = function() {
        // return [["out", 0]];
    }
objProperties.prototype.getTitle = function() {
    //    if (this.flags.collapsed) {
    //    }
        return this.title;
    }
objProperties.prototype.onPropertyChanged = function() {
        // this.widget.value = value;
    }
}
objProperties.title = "OBJ props";
objProperties.desc = "Properties for objects";
LiteGraph.registerNodeType("objects/properties", objProperties);

// --------------------------

// node events
/*
onWidgetChanged
*/


// widgets
/*

this.widg_prop = this.addWidget("property","prop.","",this.setValue.bind(this) );
this.widg_prop = this.addWidget("combo","prop.",this.properties.prop,{ property: "prop", values: [] }); //,this.setValue.bind(this) );

// to put it before inputs
this.widgets_up = true;

// remove or update does not exists :: should save index to do it :: this.removeWidget();
// to clear
this.widgets = [];
// readd if needed
this.widg_prop = this.addWidget();

// can specify draw function
obWidget.draw = function(ctx, node, widget_width, y, H){

}
// can override sizing
obWidget.computeSize = function(width, height){
    return [newW,newH];
}

obWidget.mouse = function(){
    return b_isDirtyCanvas; // can specify if canvas should get dirty
}

obWidget.callback = function(value, canvas, node, pos, event){

}

*/

// --------------------------


function objPropertyWidget() {



        this.addInput("obj", "object");
        // this.addInput("condition", "boolean");

        this.addOutput("value", "*");
        // this.addOutput("false", LiteGraph.EVENT);

        this.addProperty("prop", 0);

        // this.mode = LiteGraph.ON_REQUEST; // to be optimized, could run always
        // this.widg_prop = this.addWidget("property","prop.","",this.setValue.bind(this) );
        this.widg_prop = this.addWidget("combo","prop.",this.properties.prop,{ property: "prop", values: [] }); // ,this.setValue.bind(this) );
        // this.widgets_up = true;
        // this.size = [140, 30];

        this._obin = null;
        this._value = null;
        this._objProperties = [];
    }

objPropertyWidget.prototype.setValue = function(v) {
        this.properties.prop = v;
        this.widg_prop.value = v;
    }

objPropertyWidget.prototype.updateFromInput = function() {
        let refresh_ancestors = true;
        var data = this.getInputData(0, refresh_ancestors);
        if (data != null) {
            this._obin = data;
objPropertyWidget.prototype.if = function(this._obin) {
                // TODO should detect change or rebuild use a widget/action to refresh properties list
                try{
                    this._objProperties = Object.keys(this._obin);
objPropertyWidget.prototype.if = function(this._objProperties && this._objProperties.sort) {
                        this._objProperties = this._objProperties.sort();
                    }
                }catch(e) {
                    console.error?.(this.name, "updateFromInput error", e);
                }
                // recreate property widget
objPropertyWidget.prototype.if = function(this._objProperties) {
                    // this.removeWidget();
                    this.widgets = [];
                    console.info("**propertywidget**","refreshing widget","will set previous value if found", this.properties.prop);
                    this.widg_prop = this.addWidget("combo", "prop", this.properties.prop, { property: "prop", values: this._objProperties });
                }
objPropertyWidget.prototype.if = function(typeof this._obin[this.properties.prop] !== "undefined") {
                    this._value = this._obin[this.properties.prop];
                }else{
                    this._value = null;
                }
            }else{
                this._value = null;
                this._objProperties = [];
            }
        }
        if(!this.widg_prop.options) this.widg_prop.options = {};
        this.widg_prop.options.values = this._objProperties;
        this.setOutputData(0, this._value);
    }

objPropertyWidget.prototype.onConnectionsChange = function(connection, slot, connected, link_info) {
        // only process the inputs
        if (connection != LiteGraph.INPUT) {
            return;
        }
        this.updateFromInput();
    }

objPropertyWidget.prototype.onExecute = function() {
        //this.updateFromInput();
    }

objPropertyWidget.prototype.onAction = function() {
        // should probably execute on action
        //this.updateFromInput();
    }

objPropertyWidget.prototype.onGetInputs = function() {
        // return [["in", 0]];
    }

objPropertyWidget.prototype.onGetOutputs = function() {
        // return [["out", 0]];
    }

objPropertyWidget.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.prop;
        }
        return this.title;
    }

objPropertyWidget.prototype.onPropertyChanged = function(name, value) {
objPropertyWidget.prototype.if = function(name == "value") {
            this.widg_prop.value = value;
        }
    }

objPropertyWidget.prototype.getExtraMenuOptions = function() {
        return [{
            content: "Console DBG", // has_submenu: false,
            callback: function(menuitO,obX,ev,htmO,nodeX) {
                console.debug?.(nodeX.widg_prop);
                console.debug?.(nodeX);
            },
        }];
    }
}
objPropertyWidget.title = "Obj Prop widget";
objPropertyWidget.desc = "Choose a property for an object";
LiteGraph.registerNodeType("objects/property_widget", objPropertyWidget);


function objMethodWidget() {


        // this.addInput("onTrigger", LiteGraph.ACTION);
        this.addInput("obj", "object"); // 0
        this.addInput("refresh", LiteGraph.ACTION); // 1
        this.addInput("execute", LiteGraph.ACTION); // 2 : DYNAMICALLY SWITCH TO "new"
        this.addOutput("executed", LiteGraph.EVENT);
        this.addOutput("method", "function");
        this.addOutput("return", "*");
        this.addProperty("method", null);
        // this.mode = LiteGraph.ON_REQUEST; // to be optimized, could run always
        this.widg_prop = this.addWidget("combo","method",this.properties.method,{ property: "method", values: [] }); // ,this.setValue.bind(this) );
        this._obin = null;
        this._function = null;
        this._methods = [];
    }

objMethodWidget.prototype.setValue = function(v) {
        this.properties.method = v;
        this.widg_prop.value = v;
    }

objMethodWidget.prototype.updateFromInput = function(v) {
        var that = this;
        let refresh_ancestors = true;
        var data = this.getInputData(0, refresh_ancestors);
        if (data != null) {
            this._obin = data;
objMethodWidget.prototype.if = function(this._obin) {
                // TODO should detect change or rebuild use a widget/action to refresh properties list
                try{
                    this._methods = [];
                    // method 1, simple
                    /* var allProps = Object.keys(this._obin);
                    console.debug("Props",allProps);
objMethodWidget.prototype.for = function(var iM in allProps) {
                        // console.debug("dbg prop",allProps[iM],typeof(this._obin[allProps[iM]]));
                        if(typeof(this._obin[allProps[iM]]) == "function"){
                            this._methods.push(allProps[iM]);
                        }
                    } */
                    // method 2, better
                    /* for(var iM in this._obin){
                        // console.debug("dbg prop",allProps[iM],typeof(this._obin[allProps[iM]]));
                        if(typeof(this._obin[iM]) == "function"){
                            this._methods.push(iM);
                        }
                    } */
                    // method 3
                    this._objProperties = [];
                    let currentObj = this._obin;
                    do {
                        Object.getOwnPropertyNames(currentObj).map(function(item){ if(!that._objProperties.includes(item)) that._objProperties.push(item) });
                    } while ((currentObj = Object.getPrototypeOf(currentObj)));
objMethodWidget.prototype.for = function(var iM in this._objProperties) {
                        if(typeof(this._obin[this._objProperties[iM]]) == "function"){
                            this._methods.push(this._objProperties[iM]);
                        }
                    }
                    if(this._methods && this._methods.sort) this._methods = this._methods.sort();
                    console.debug(this.name, "got methods", this._methods);
                    this.boxcolor = "#0F0";
                }catch(e) {
                    console.warn?.("Err on methods get",e);
                    this.boxcolor = "#F00";
                }
objMethodWidget.prototype.if = function(this._methods) {
                    // this.removeWidget();
                    this.widgets = [];
                    this.widg_prop = this.addWidget("combo","method",this.properties.method,{ property: "method", values: this._methods });
                }

            }else{
                console.debug?.("Invalid obj",data);
                this._function = null;
                this._methods = [];
                this.boxcolor = "#F00";
            }
        }else{
            console.debug(this.name, "empty data");
            this.boxcolor = "#000";
        }
        if(!this.widg_prop.options) this.widg_prop.options = {}; // reset widget options
        this.widg_prop.options.values = this._methods; // set widget options

        this.refreshMethodAndInputs();
    }

objMethodWidget.prototype.onConfigure = function() {
        this.updateFromInput();
        this.refreshMethodAndInputs();
    }

objMethodWidget.prototype.onConnectionsChange = function(connection, slot, connected, link_info) {
        console.debug("onConnectionsChange", this.name, connection, slot, connected);
        // only process the inputs
        if (connection != LiteGraph.INPUT) {
            return;
        }
        this.updateFromInput();
        this.refreshMethodAndInputs();
    }

objMethodWidget.prototype.refreshMethodAndInputs = function(actVal) {
        // TODO fixthis :: property is not yet updated?
        actVal = actVal || this.properties.method; //this.widg_prop.value; // this.properties.method
objMethodWidget.prototype.if = function(actVal && this._obin && typeof this._obin[actVal] !== "undefined") {

            // if changed, reset inputs
            // if(this._function !== this._obin[actVal]){
            //     for (var i = 3; i < this.inputs; ++i) {
            //         this.removeSlot(i);
            //     }
            // }

            this._function = this._obin[actVal];
            
            // inheritance ?
            // using call or apply ?
            // prototype Â¿
            // Uncaught (in promise) TypeError: can't access private field or method: object is not the right class
            /*
            BAD
            var actVal = this.widg_prop.value; // this.properties.method
            var r = this._obin.prototype[actVal].call(this._obin); */

            // cycle inputs
            var params = Array(this._function.length);
            var names = LiteGraph.getParameterNames(this._function);
            for (var i = 0; i < names.length; ++i) {
                var exs = this.findInputSlot(names[i]);
objMethodWidget.prototype.if = function(exs == -1) {
                    this.addInput(names[i],"",{auto: true, removable: false, nameLocked: true});
                }
            }
            this._params = names;

            // check if method is a class constructor
            if((this._function?.prototype?.constructor+"").startsWith("class")){
                this._isClass = true;
                this.inputs[2].name = "new";
            }else{
                this._isClass = false;
                this.inputs[2].name = "execute";
            }

        }else{
            console.debug?.("Invalid method",actVal);
            this._function = null;
        }
        this.setOutputData(1, this._function); // update function output
    }

objMethodWidget.prototype.onExecute = function() {
        // this.updateFromInput();
        // ?
    }

    // objMethodWidget.prototype.onPropertyChanged = function(name, value, prev_value){
    //     console.debug?.("Property changed", name, value, prev_value)
    //     this.refreshMethodAndInputs();
    // }

objMethodWidget.prototype.onWidgetChanged = function(name, value, prev_value) {
        console.debug?.("Widget changed", name, value, prev_value);
        // if changed, reset inputs
objMethodWidget.prototype.if = function(this.properties.method !== value) {
            const nInputs = this.inputs.length;
            for (var i = 3; i < nInputs; ++i) {
                this.removeInput(3); // not i
            }
        }
        this.refreshMethodAndInputs(this.widg_prop.value);
    }

objMethodWidget.prototype.onAction = function(action) {
        // should probably execute on action
        // this.updateFromInput();
objMethodWidget.prototype.if = function(action == "refresh") {
            this.updateFromInput();
        }else if(action == "execute" || action == "new") {
            if (!this._function || typeof(this._function) == "function") {
                console.debug?.("NodeObjMethod Execute", "force recheck input and method");
                // force check
                this.updateFromInput();
                this.refreshMethodAndInputs();
            }
            if(this._function && typeof(this._function) == "function") {

                var parValues = [];
                for (var i = 3; i < this.inputs.length; i++) {
                    parValues.push(this.getInputData(i));
                }

                // call execute
                console.debug?.("NodeObjMethod Execute", this._function, this._obin, parValues);
                try{
objMethodWidget.prototype.if = function(this._isClass) {
                        var r = new this._function(...parValues); // this._function.apply(this, parValues);
                    }else{
                        // TODO: spread arguments
                        var r = this._function.call(this._obin, ...parValues); // this._function.apply(this, parValues);
                        console.debug?.("NodeObjMethod Execute", "result", r);
                    }
                    this.setOutputData(2, r); // update method result
                    this.triggerSlot(0);
                    this.boxcolor = "#0F0";
                }catch(e){
                    console.warn("[NodeObjMethod]","execute error",e);
                    this.boxcolor = "#F00";
                }
            }else{
                console.warn?.("NodeObjMethod Execute has not method", parValues);
                this.setOutputData(1, null);
                this.setOutputData(2, null);
            }
        }else{
            console.debug(this.name, "unknown action", action);
        }
    }

objMethodWidget.prototype.onGetInputs = function() {
        // return [["in", 0]];
    }

objMethodWidget.prototype.onGetOutputs = function() {
        // return [["out", 0]];
    }

objMethodWidget.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.method;
        }
        return this.title;
    }

objMethodWidget.prototype.onPropertyChanged = function(name, value) {
objMethodWidget.prototype.if = function(name == "method") {
            this.widg_prop.value = value;
            this.refreshMethodAndInputs(value);
        }
    }

objMethodWidget.prototype.getExtraMenuOptions = function() {
        return [{
            content: "NodeObjMethod DBG", // has_submenu: false,
            callback: function(menuitO,obX,ev,htmO,nodeX) {
                console.debug?.(NodeObjMethod, nodeX.widg_prop, nodeX);
            },
        }];
    }
}
objMethodWidget.title = "Obj Method widget";
objMethodWidget.desc = "Choose and execute a method from an object";
LiteGraph.registerNodeType("objects/method_widget", objMethodWidget);


// eval a Global object
function objEvalGlo() {


        this.size = [60, 30];
        this.addProperty("obj_eval", "window");
        this.addOutput("obj", "object");
        this._func = null;
        this.data = {};
    }

    // SINGLE object EVAL
    onConfigure = function(o) {
        if (o.properties.obj_eval)
            this.compileCode(o.properties.obj_eval);
    };


    onPropertyChanged = function(name, value) {
        if (name == "obj_eval")
            this.compileCode(value);
    };

objEvalGlo.prototype.compileCode = function(code) {
        this._func = null;
        if (LiteGraph.allow_scripts){
            // ok
        }else{
            console.warn("Obj string not evaluated, LiteGraph.allow_scripts is false");
        }
        if (code.length > 256) {
            console.warn?.("Script too long, max 256 chars");
        } else {
            var code_eval = "return "+code;
            // var forbidden_words = [
            //     "script",
            //     "body",
            //     "document",
            //     "eval",
            //     "objEvalGlo",
            //     "function"
            // ]; //bad security solution
            // for (var i = 0; i < forbidden_words.length; ++i) {
            //     if (code_low.indexOf(forbidden_words[i]) != -1) {
            //         console.warn?.("invalid script");
            //         return;
            //     }
            // }
            try {
                this._func = new Function("DATA", "node", code_eval);
                // console.debug("Evaluated",code,this._func);
                this.title = (code+"").substring(0,33);
                this.autoSize();
            } catch (err) {
                console.error?.("Error parsing obj evaluation");
                console.error?.(err);
                this.title = "Eval ERR";
                this.autoSize();
            }
        }
        return false;
    }

objEvalGlo.prototype.onExecute = function() {
        if (this.properties.obj_eval)
            this.compileCode(this.properties.obj_eval);
        if (!this._func) {
            this.setOutputData(0, null);
            return;
        }
        try {
            this.setOutputData(0, this._func(this.data, this));
        } catch (err) {
            this.setOutputData(0, null);
            console.error?.("Error in code eval");
            console.error?.(err);
        }
    }

    // objEvalGlo.prototype.onGetOutputs = function() {
    //     return [["C", ""]];
    // };
}
objEvalGlo.title = "Eval Obj";
objEvalGlo.desc = "Evaluate an object";
objEvalGlo.widgets_info = {obj_eval: { type: "code" }};
LiteGraph.registerNodeType("objects/evaluate", objEvalGlo);


// eval a Global object
function EventAsFunction() {


        this.size = [60, 30];
        this.addOutput("fun", "function");
        this.addOutput("executed", LiteGraph.EVENT);
        var that = this;
        this._func = function(){
            that.triggerSlot(1);
            // add arguments on slot
        };
        this.setOutputData("fun",this._func);
        this.data = {};
    }

EventAsFunction.prototype.onConfigure = function(o) {
        this.setOutputData("fun",this._func);
    }

EventAsFunction.prototype.onExecute = function() {
        if (!this._func) {
            return;
        }
        this.setOutputData("fun",this._func);
    }

}
EventAsFunction.title = "Event Function";
EventAsFunction.desc = "Get a function binded to an event";
LiteGraph.registerNodeType("objects/event_function", EventAsFunction);


function ObjectProperty() {


        this.addInput("obj", "object");
        this.addOutput("property", 0);
        this.addProperty("value", 0);
        this.widget = this.addWidget("text", "prop.", "", this.setValue.bind(this));
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;
    }

ObjectProperty.prototype.setValue = function(v) {
        this.properties.value = v;
        this.widget.value = v;
    }

ObjectProperty.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return "in." + this.properties.value;
        }
        return this.title;
    }

ObjectProperty.prototype.onPropertyChanged = function(name, value) {
        this.widget.value = value;
    }

ObjectProperty.prototype.onExecute = function() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, data[this.properties.value]);
        }
    }
}
ObjectProperty.title = "Object property";
ObjectProperty.desc = "Outputs the property of an object";
LiteGraph.registerNodeType("objects/get_property", ObjectProperty);


function ObjectKeys() {
        this.addInput("obj", "object");
        this.addOutput("keys", "array");
        this.size = [140, 30];
    }

ObjectKeys.prototype.onExecute = function() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, Object.keys(data));
        }
    }
}
ObjectKeys.title = "Object keys";
ObjectKeys.desc = "Outputs an array with the keys of an object";
LiteGraph.registerNodeType("objects/object_keys", ObjectKeys);


function SetObject() {


        this.addInput("obj", "object");
        this.addInput("value", "");
        this.addOutput("obj", "object");
        this.properties = { property: "" };
        this.name_widget = this.addWidget(
            "text",
            "prop.",
            this.properties.property,
            "property",
        );
    }
SetObject.prototype.onExecute = function() {
        var obj = this.getInputData(0);
        if (!obj) return;
        var v = this.getInputData(1);
        if (v === undefined) return;
        if (this.properties.property) obj[this.properties.property] = v;
        this.setOutputData(0, obj);
    }
}
SetObject.title = "Set property";
SetObject.desc = "Set property of object";
LiteGraph.registerNodeType("objects/set_property", SetObject);


function MergeObjects() {


        this.addInput("A", "object");
        this.addInput("B", "object");
        this.addOutput("out", "object");
        this._result = {};
        var that = this;
        this.addWidget("button", "clear", "", function () {
            that._result = {};
        });
        this.size = this.computeSize();
    }

MergeObjects.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        var C = this._result;
        if (A)
            for (let i in A)
                C[i] = A[i];
        if (B)
            for (let i in B)
                C[i] = B[i];
        this.setOutputData(0, C);
    }
}
MergeObjects.title = "Merge Objects";
MergeObjects.desc = "Creates an object copying properties from others";
LiteGraph.registerNodeType("objects/merge_objects", MergeObjects);

function ObjectEditorNode() {

        this.addInput("set", LiteGraph.ACTION);
        this.addOutput("data", "object");
        this.addProperty("value", "{}");  // Entire JSON as a string
        this.addProperty("selectedProp", ""); // Selected property path
        this.addProperty("propValue", ""); // Selected property value

        this.widget = this.addWidget("text", "JSON", "{}", "value", this.onJSONChanged.bind(this));

        this.propSelector = this.addWidget("combo", "Property", this.properties.selectedProp, {
            property: "selectedProp",
            values: [],
        });

        this.valueEditor = null; // Will be dynamically created based on value type

        // this.widgets_up = true;
        this.size = [300, 210];
        this._parsedValue = {};
        this._currentPath = ""; // Tracks property path
    }

    // When JSON is edited
ObjectEditorNode.prototype.onJSONChanged = function(value) {
        this.parseJSON(value);
    }

ObjectEditorNode.prototype.onPropertyChanged = function(name, value) {
        if (name === "value") {
            this.parseJSON(value);
        } else if (name === "selectedProp") {
            this.updateSelectedProperty();
        }
    }

ObjectEditorNode.prototype.parseJSON = function(jsonString) {
        try {
            this._parsedValue = JSON.parse(jsonString);
            this.boxcolor = "#4CAF50"; // Green for valid JSON
            this._currentPath = ""; // Reset path when JSON is updated
            this.updatePropertyList();
        } catch (err) {
            this.boxcolor = "red"; // Red for invalid JSON
            this._parsedValue = null;
        }
        this.updateSelectedProperty();
        this.setOutputData(0, this._parsedValue);
    }

ObjectEditorNode.prototype.updatePropertyList = function() {
        if (!this._parsedValue || typeof this._parsedValue !== "object") {
            this.propSelector.options.values = [];
            return;
        }
        const keys = Object.keys(this._parsedValue).sort();
        this.propSelector.options.values = ["", ".."].concat(keys);
    }

ObjectEditorNode.prototype.updateSelectedProperty = function() {
        if (!this._parsedValue) {
            this._currentPath = "";
            this.properties.selectedProp = "";
            this.updatePropertyList();
            this.updateValueEditor("");
            return;
        }

        const selectedPath = this.properties.selectedProp;

        if (selectedPath === "..") {
            // Go back up one level
            // this._currentPath = this._currentPath.split('.').slice(0, -1).join('.');
            this.properties.selectedProp = this._currentPath.split('.').slice(0, -1).join('.'); //this._currentPath.split('.').pop() || "";
            this.updateSelectedProperty();
            return;
        }

        this._currentPath = selectedPath;
ObjectEditorNode.prototype.if = function(this._currentPath == "") {
            this.updateValueEditor(this._parsedValue);
            this.updatePropertyList();
            return;
        }
        
        const propValue = this.getValueByPath(this._parsedValue, this._currentPath);
        if (propValue === undefined) {
            // ? this._currentPath = ""; // Reset if path is invalid
            // this.updatePropertyList();
            this.updatePropertyListBasedOnPath(null);
            this.updateValueEditor(""); // this._parsedValue
            return;
        }

        this.updatePropertyListBasedOnPath(propValue);
        this.updateValueEditor(propValue);
    }

ObjectEditorNode.prototype.updatePropertyListBasedOnPath = function(propValue) {
        console.debug("UpdateOBWidget",propValue,this.properties,this._currentPath);
        if (typeof propValue === "object" && propValue !== null) {
            const subKeys = Object.keys(propValue).sort();
ObjectEditorNode.prototype.if = function(this._currentPath && this._currentPath != "") {
                this.propSelector.options.values = ["", ".."];
            }else{
                this.propSelector.options.values = [];
            }
            this.propSelector.options.values = this.propSelector.options.values.concat(subKeys.map(subKey => `${this._currentPath}.${subKey}`));
        } else{
            const precCat = this._currentPath.split(".").slice(0,-1).join(".");
            const precValue = this.getValueByPath(this._parsedValue, precCat);
            console.debug("UpdateOBWidget preCat",precCat,precValue);
            if (typeof precValue === "object" && precValue !== null) {
                const subKeys = Object.keys(precValue).sort();
                this.propSelector.options.values = ["", ".."].concat(subKeys.map(subKey => `${precCat}.${subKey}`));
            }else{
                this.propSelector.options.values = ["", ".."];
            }
        }
    }

ObjectEditorNode.prototype.updateValueEditor = function(propValue) {
        if (this.valueEditor) {
            this.widgets.splice(this.widgets.indexOf(this.valueEditor), 1); // Remove old widget
        }

        let widgetType = "text";
        let displayValue = propValue;

        if (typeof propValue === "object") {
            widgetType = "text"; // Use text area for JSON objects
            displayValue = JSON.stringify(propValue, null, 2);
        }

        this.valueEditor = this.addWidget(widgetType, "Edit Value", displayValue, "propValue");
        this.properties.propValue = displayValue;
    }

ObjectEditorNode.prototype.getValueByPath = function(obj, path) {
        return path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
    }

ObjectEditorNode.prototype.setValueByPath = function(obj, path, newValue) {
        const keys = path.split('.');
        let ref = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (typeof ref[keys[i]] !== "object" || ref[keys[i]] === null) {
                ref[keys[i]] = {}; // Create sub-object if missing
            }
            ref = ref[keys[i]];
        }

        ref[keys[keys.length - 1]] = this.tryParseValue(newValue);
    }

ObjectEditorNode.prototype.onAction = function(action, value) {
ObjectEditorNode.prototype.if = function(action=="set") {
            this.updatePropertyValue(this.properties.propValue);
        }
    }

ObjectEditorNode.prototype.updatePropertyValue = function(value) {
        if (!this._parsedValue) return;

        // this.setValueByPath(this._parsedValue, this._currentPath, value);
        this.setValueByPath(this._parsedValue, this._currentPath, value);
        this.properties.value = JSON.stringify(this._parsedValue, null, 2);
        this.widget.value = this.properties.value;
        this.setOutputData(0, this._parsedValue);

        this.updateSelectedProperty(); // Refresh UI
    }

ObjectEditorNode.prototype.tryParseValue = function(value) {
        try {
            return JSON.parse(value);
        } catch {
            return value; // Keep as string if parsing fails
        }
    }

ObjectEditorNode.prototype.onExecute = function() {
        this.setOutputData(0, this._parsedValue);
    }
}
ObjectEditorNode.title = "JSON Editor+";
ObjectEditorNode.desc = "Edit JSON and navigate/edit nested properties dynamically.";

LiteGraph.registerNodeType("objects/json_editor", ObjectEditorNode);


