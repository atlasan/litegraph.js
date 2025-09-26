

/**
 * will extend a node class creating an html element for it available in this._el_cont, use this._html to set his content
 * @param {object} nodeX
 */
function nodeEmpower_htmlElement(nodeX){
    nodeX.htmlCreateElement = (function(){
        if(this._added) return;
        const myGCanvas = this.graph?.getCanvas();
        if(myGCanvas){
            const htEl = document.createElement("div");
            this._el = htEl;
            this._el.classList.add('lg-html-element');
            this._el.style.position = "absolute";
            // this._el.style.pointerEvents = "";
            myGCanvas.canvas?.parentNode?.appendChild(this._el);
            this._el_cont = document.createElement("div");
            
            // centered content
            // this._el_cont.style.display = "flex";
            // // this._el_cont.style.alignItems = "center";
            // this._el_cont.style.justifyContent = "center";

            this._el_cont.style.overflow = "auto";
            this._el_cont.style.position = "relative";
            this._el_cont.style.width = "100%";
            this._el_cont.style.height = "100%";
            this._el_cont.style.margin = "0px";
            this._el_cont.style.padding = "0px";
            this._el.appendChild(this._el_cont);
            this._added = true;
            this.htmlRefreshElement();
            const htGraph = myGCanvas.graph;
            myGCanvas.registerCallbackHandler("onOpenSubgraph",function(info, graph, prev_graph){
               // should hide or remove?
                if(htGraph == graph){
                    console.debug("htmlEmpoweredNode","restore on onOpenSubgraph",this,graph);
                    htEl.style.display = htEl.style.display_prev ? htEl.style.display_prev : "block";
                }else{
                    console.debug("htmlEmpoweredNode","hide on onOpenSubgraph",this,graph);
                    htEl.style.display_prev = htEl.style.display;
                    htEl.style.display = "none";
                }
            });
            myGCanvas.registerCallbackHandler("onCloseSubgraph",function(info, graph, prev_graph, subgraph_node){
                // should restore hide or recreate? 
                if(htGraph == graph){
                    console.debug("htmlEmpoweredNode","restore on onCloseSubgraph",this,graph);
                    htEl.style.display = htEl.style.display_prev ? htEl.style.display_prev : "block";
                }else{
                    console.debug("htmlEmpoweredNode","hide on onCloseSubgraph",this,graph);
                    htEl.style.display_prev = htEl.style.display;
                    htEl.style.display = "none";
                }
             });
        }else{
            console.warn(this,"NO CANVAS");
        }
    }).bind(nodeX);
    nodeX.htmlRefreshElement = (function(){
        if(!this._added){
            this.htmlCreateElement();
        }
        if(!this.pos) return;
        if(!this.size) return;
        const myGCanvas = this.graph?.getCanvas();
        if(!myGCanvas){
            console.warn("htmlRefreshElement","has no graphcanvas",this);
            return;
        }
        const absPos = myGCanvas.convertOffsetToCanvas(this.pos);
        this._el.style.left = absPos[0] +"px";
        this._el.style.top = (absPos[1]+this.getSlotsHeight()) +"px";
        this._el.style.width = Math.round(this.size[0]*myGCanvas.ds.scale) +"px";
        this._el.style.height = (Math.round(this.size[1]*myGCanvas.ds.scale)-this.getSlotsHeight()) +"px";
    }).bind(nodeX);
    nodeX.setHtml = function(html){
        this._html = html;
        if( typeof(this._el)=="undefined"||typeof(this._el_cont)=="undefined"
            || !this._el||!this._el_cont
        ){
            this.htmlRefreshElement();
        }
        if(typeof(this._el_cont)!=="undefined"){
            this._el_cont.innerHTML = this._html;
        }
    }
    nodeX.registerCallbackHandler("onConfigure",function(info){
        console.info("empoweredHtmlNode",this,"onConfigure",...arguments);
        console.info(this, "configure", info);
        this.refreshSlots();
        this.htmlRefreshElement();
    });
    nodeX.registerCallbackHandler("onDrawForeground",function(){
        // console.info("empoweredHtmlNode",this,"onDrawForeground",...arguments);
        this.htmlRefreshElement();
    });
    nodeX.registerCallbackHandler("onSelected",function(){
        console.info("empoweredHtmlNode",this,"onSelected",...arguments);
        // if(this._el) this._el.style.pointerEvents = "none";
    });
    nodeX.registerCallbackHandler("onDeselected",function(){
        console.info("empoweredHtmlNode",this,"onDeselected",...arguments);
        // if(this._el) this._el.style.pointerEvents = "";
    });
    nodeX.registerCallbackHandler("onRemoved",function(){
        console.info("empoweredHtmlNode",this,"onRemoved",...arguments);
        this._el?.parentNode?.removeChild(this._el);
    });
}

function DOMSelector() {


        this.addInput("selector", "string");
        this.addOutput("result", "htmlelement");
        this.properties = { };
    }

DOMSelector.prototype.onExecute = function() {
        var sSel = this.getInputData(0);
        var res = null;
        if (sSel) {
            try{
                res = document.querySelector(sSel);
            }catch(e) {
                res = false;
            }
        }
        this.setOutputData(0,res);
    }
}
DOMSelector.title = "DOMSelector";
DOMSelector.desc = "Execute a selection query on the document returning the corresponging DOM element";
LiteGraph.registerNodeType("html/dom_selector", DOMSelector);

function HtmlNode() {


        this.addInput("html", "string,html", {param_bind: true});
        this.addOutput("element", "htmlelement");
        this.properties = { html: "" }; // scale_content: false
        this._added = false;
        this._html = "";
        this.size = [210, 210/1.618];
    }
HtmlNode.prototype.refreshSlots = function() {
        this.htmlRefreshElement?.();
        var sHtml = this.getInputOrProperty("html");
        if (sHtml) {
            try{
                this.setHtml?.(sHtml); // this._html = sHtml;
            }catch(e) {
                console.log(this, "failed setting html content");
                this.setHtml?.(""); // this._html = "";
            }
        }else{
            this.setHtml?.(""); // this._html = "";
        }
        this.setOutputData(0,this._el_cont?this._el_cont:false);
    }
HtmlNode.prototype.onPropertyChanged = function() {
        this.refreshSlots();
    }
HtmlNode.prototype.onExecute = function() {
        this.refreshSlots();
    }
HtmlNode.prototype.onPostConstruct = function() {
        nodeEmpower_htmlElement(this);
    }
}
HtmlNode.title = "Html Node";
HtmlNode.desc = "Have html inside a node";
LiteGraph.registerNodeType("html/node_html", HtmlNode);

function JsonViewerNode() {
        this.addInput("value", 0);
        this.properties = { html: "", collapsed: false, max_depth: 3 }; // scale_content: false
        this._added = false;
        this._html = "";
        this.size = [210, 210/1.618];
    }
JsonViewerNode.prototype.onPostConstruct = function() {
        nodeEmpower_htmlElement(this);
    }
JsonViewerNode.prototype.refreshSlots = function() {
        this.htmlRefreshElement?.();
        var sHtml = htmlJsonViewerHelper(this.getInputData(0), this.properties.collapsed, this.properties.max_depth);
        if (sHtml) {
            try{
                this.setHtml?.(sHtml); // this._html = sHtml;
                // this._el_cont.innerHTML = sHtml;
            }catch(e) {
                this.setHtml?.("");
                console.log(this, "failed setting html content");
            }
        }else{
            this.setHtml?.("");
        }
        this.setOutputData(0,this._el_cont?this._el_cont:false);
    }
JsonViewerNode.prototype.onPropertyChanged = function() {
        this.refreshSlots();
    }
JsonViewerNode.prototype.onExecute = function() {
        this.refreshSlots();
    }
}
JsonViewerNode.title = "Json View";
JsonViewerNode.desc = "Show and navigate a value structure";
LiteGraph.registerNodeType("html/json_viewer", JsonViewerNode);
// helper function 
function htmlJsonViewerHelper(json, collapsed=false, max_depth=6) {
    var TEMPLATES = {
        item:   '<div class="json__item">'
                    +'<div class="json__key">%KEY%</div>'
                    +'<div class="json__value json__value--%TYPE%">%VALUE%</div>'
                +'</div>',
        itemCollapsible:    '<label class="json__item json__item--collapsible">'
                                +'<input type="checkbox" class="json__toggle"/><div class="json__key">%KEY%</div>'
                                +'<div class="json__value json__value--type-%TYPE%">%VALUE%</div>'
                                +'%CHILDREN%'
                            +'</label>',
        itemCollapsibleOpen:    '<label class="json__item json__item--collapsible">'
                                    +'<input type="checkbox" checked class="json__toggle"/><div class="json__key">%KEY%</div>'
                                    +'<div class="json__value json__value--type-%TYPE%">%VALUE%</div>'
                                    +'%CHILDREN%'
                                +'</label>'
    };
    function createItem(key, value, type, max_depth=6, cur_depth=0){
        var element = TEMPLATES.item.replace('%KEY%', key);
        if(value===null){
            element = element.replace('%VALUE%', "[NULL]");
            element = element.replace('%TYPE%', "null");
        }else{
            try{
                if(type == 'string') {
                    element = element.replace('%VALUE%', '"' + value + '"');
                } else {
                    if(type === 'object' || type === 'array' || type === 'function') {
                        if(value.constructor === Array){
                            value = "array ["+value.length+"]";
                            // TODO should cut array (value)
                        }else if(type === 'function'){
                            value = type+" {"+value.constructor+"}";
                        }else{
                            value = type+" {"+Object.keys(value).length+"}";
                        }
                        if(cur_depth >= max_depth){
                            value += " [MAX_DEPTH]";
                        }
                    }
                    element = element.replace('%VALUE%', value);
                }
                element = element.replace('%TYPE%', type);
            }catch(e){
                console.warn("html createItem error", type, value, e);
                element = element.replace('%VALUE%', "[ERR]");
                element = element.replace('%TYPE%', type);
            }
        }
        return element;
    }
    function createCollapsibleItem(key, value, type, html_children){
        var tpl = 'itemCollapsible';   
        if(collapsed) {
            tpl = 'itemCollapsibleOpen';
        }
        var element = TEMPLATES[tpl].replace('%KEY%', key);
        if(value===null){
            type = "[NULL]";
            value = "null";
        }else{
            if(typeof value === 'object') {
                if(value.constructor === Array){
                    value = "array ["+value.length+"]";
                    // TODO should cut array (value)
                }else{
                    value = "object {"+Object.keys(value).length+"}"
                }
            }else if(typeof(value) == "function"){
                value = "function";
            }
        }
        element = element.replace('%VALUE%', value);
        element = element.replace('%TYPE%', type);
        element = element.replace('%CHILDREN%', html_children);
        return element;
    }
    function handleChildren(key, value, type, already_processed, max_depth=6, cur_depth=0) {
        if(!already_processed) already_processed = [];
        let html = '';
        let nItems = 0;
        for(var item in value) { 
            var _key = item;
            var _val = value[item];
            if(typeof(_val)!=="object" || !already_processed.includes(_val)){
                if(typeof(_val)=="object"){
                    already_processed.push(_val);
                }
                html += handleItem(_key, _val, already_processed, max_depth, cur_depth+1);
            }else{
                html += createItem(_key, "[OBJ_CYCLE]");
            }
            nItems++;
        }
        if(nItems){
            return createCollapsibleItem(key, value, type, html);
        }else{
            return createItem(key, value, type, max_depth, cur_depth);
        }
    }

    function handleItem(key, value, already_processed, max_depth=6, cur_depth=0) {
        if(!already_processed) already_processed = [];
        var type = typeof value;
        if(type === 'object') {
            // if(value.constructor === Array){
            //     type = "array";
            //     // TODO should cut array (value)
            // }
            if(cur_depth >= max_depth){
                // value += " [MAX_DEPTH]";
            }else{
                return handleChildren(key, value, type, already_processed, max_depth, cur_depth);
            }
        }
        return createItem(key, value, type, max_depth, cur_depth);
    }

    function parseObject(obj) {
        var _result = '<div class="html__json">';
        for(var item in obj) { 
            var key = item;
            var value = obj[item];
            var type = typeof value;
            _result += handleItem(key, value, false, max_depth, 0);
        }
        _result += '</div>';
        return _result;
    }
    return parseObject(json);
}



function DOMSelectorAll() {


        this.addInput("selector", "string");
        this.addOutput("result", "array");
        this.properties = { };
    }

DOMSelectorAll.prototype.onExecute = function() {
        var sSel = this.getInputData(0);
        var res = null;
        if (sSel) {
            res = document.querySelectorAll(sSel);
        }
        this.setOutputData(0,res);
    }
}
DOMSelectorAll.title = "DOMSelectorAll";
DOMSelectorAll.desc = "Execute a querySelectorAll() on the document returning the corresponding Elements";
LiteGraph.registerNodeType("html/dom_selector_all", DOMSelectorAll);


function HtmlEventListener() {


        this.addInput("element", "htmlelement");
        this.addInput("add_listener", LiteGraph.ACTION);
        this.addOutput("listener", "htmlelement_listener");
        this.addOutput("on_event", LiteGraph.EVENT);
        this.addOutput("last_event", "");
        this.addOutput("current_event", "");
        this.addOutput("all_listeners", "[htmlelement_listener]");
        this.addProperty("eventType", "");
        this.addWidget("combo","eventType",this.properties["eventType"],"eventType",{values: ["click","dblclick", "mouseover","mousedown","mouseup","mousemove","mouseout","keydown","keyup","keypress","load","unload","mousewheel","contextmenu", "focus","change","blur","pointerdown","pointerup","pointermove","pointerover","pointerout","pointerenter","pointerleave","pointercancel","gotpointercapture","lostpointercapture", "touchstart","touchmove","touchend","touchcancel","submit","scroll","resize","hashchange"]});
        // this.properties = {eventType: "" };
        this.mode = LiteGraph.ON_ACTION;
    }

HtmlEventListener.prototype.onExecute = function(param, options) {
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER) {
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+LiteGraph.uuidv4();
            this.onAction(action, param, options);
        } else this.setOutputData(3,null);
        var sSel = this.getInputData(0);
        if (sSel){
            this.setOutputData(4,sSel.attributes["data-listeners"]);
        }
    }

HtmlEventListener.prototype.onAction = function(action) {
        var sSel = this.getInputData(0);
        var eventType = this.getInputOrProperty("eventType");
        var res = null;
        if (sSel && eventType && sSel.addEventListener) {
HtmlEventListener.prototype.switch = function(action) {
                case "add_listener":
                default:
                    var fEv;
                    if ( ! sSel.attributes["data-listener-"+eventType] ) {
                        var that = this;
                        fEv = function(e) {
                            that.setOutputData(2,e);
                            that.setOutputData(3,e);
                            that.triggerSlot(1);
                        }
                        sSel.addEventListener(eventType, fEv);
                        sSel.attributes["data-listener-"+eventType] = fEv;
HtmlEventListener.prototype.if = function(!sSel.attributes["data-listeners"]) {
                            sSel.attributes["data-listeners"] = [];
                        }
                        sSel.attributes["data-listeners"].push(eventType);
                        that.setOutputData(4,sSel.attributes["data-listeners"]);
                    }else{
                        fEv = sSel.attributes["data-listener-"+eventType];
                    }
                    res = {element: sSel, function: fEv, event: eventType};
                    console.debug("event listener added", res);
                    this.setOutputData(0,res);
                    break;
            }
        }else{
            console.log?.("no el to add event");
            // this.setOutputData(2,null); // clean ?
        }
    }
}
HtmlEventListener.title = "HTML Listener";
HtmlEventListener.desc = "Add an event listener on an html element";
LiteGraph.registerNodeType("html/event_listener", HtmlEventListener);


function HtmlEventListenerRemove() {


        this.addInput("listener", "htmlelement_listener");
        this.addInput("remove_listener", LiteGraph.ACTION);
        this.addOutput("result","boolean");
        this.mode = LiteGraph.ON_ACTION;
    }

HtmlEventListenerRemove.prototype.onExecute = function(param, options) {
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER) {
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+LiteGraph.uuidv4();
            this.onAction(action, param, options);
        }
    }

HtmlEventListenerRemove.prototype.onAction = function() {
        var oLis = this.getInputData(0);
        var res = false;
        if (oLis && oLis.element && oLis.function && oLis.event && oLis.element.removeEventListener) {
            oLis.element.attributes["data-listener-"+oLis.event] = false;
            delete(oLis.element.attributes["data-listeners"][oLis.event]);
            oLis.element.removeEventListener(oLis.event, oLis.function);
            res = true;
        }else{
            console.log?.("bad element to remove listener");
        }
        this.setOutputData(0,res);
    }
    // HtmlEventListenerRemove.prototype.onAction = function(action, param, options){}
}
HtmlEventListenerRemove.title = "HTML Remove Listener";
HtmlEventListenerRemove.desc = "Remove an event listener by passing his reference";
LiteGraph.registerNodeType("html/event_listener_remove", HtmlEventListenerRemove);


function HtmlValue() {


        this.addInput("element", "htmlelement");
        // this.addInput("get", LiteGraph.ACTION);
        this.addOutput("result","string");
        // this.mode = LiteGraph.ON_ACTION;
    }

HtmlValue.prototype.onExecute = function() {
        var el = this.getInputData(0);
        var res = false;
        if (el) {
HtmlValue.prototype.if = function(typeof el == "object") {
                if (typeof el.value != "undefined") {
                    res = el.value;
                }else if(typeof el.checked != "undefined") { // el.constructor.name == "HTMLInputElement" && ..
                    res = el.checked?true:false;
                }else if(typeof el.textContent != "undefined") {
                    res = el.textContent;
                }else{
                    res = "";
                }
                /* switch(el.constructor.name){
                }*/
            }
        }else{
            // console.log?.("no element to get value");
        }
        this.setOutputData(0,res);
    }
}
HtmlValue.title = "HTML GET Value";
HtmlValue.desc = "Get the value (or the text content) of an HTML element";
LiteGraph.registerNodeType("html/element_value", HtmlValue);


function HtmlValueSet() {


        this.addInput("element", "htmlelement");
        // this.addInput("set", LiteGraph.ACTION);
        this.addInput("value", "string");
        this.addOutput("result","boolean");
        this.addProperty("value","");
        // this.mode = LiteGraph.ON_ACTION;
    }

HtmlValueSet.prototype.onExecute = function() {
        // if (this.mode == LiteGraph.ON_TRIGGER) this.onAction(action, param, options);
        var el = this.getInputData(0);
        var sVal = this.getInputOrProperty("value"); // getInputData(1);
        var res = false;
        if (el) {
HtmlValueSet.prototype.if = function(typeof el == "object") {
                if (typeof el.value != "undefined") {
                    el.value = sVal+"";
                    res = true;
                }else if(typeof el.checked != "undefined") {
                    el.checked = sVal?true:false;
                    res = true;
                }else if(typeof el.textContent != "undefined") {
                    el.textContent = sVal+"";
                    res = true;
                }else{
                    console.log?.("unkonwn element to set value");
                }
                /* switch(el.constructor.name){
                }*/
            }
        }else{
            // console.log?.("no element to set value");
        }
        this.setOutputData(0,res);
    }
}
HtmlValueSet.title = "HTML SET Value";
HtmlValueSet.desc = "Set the value (or the text content) of an HTML element";
// HtmlValueSet.prototype.onAction = function(action, param, options){
LiteGraph.registerNodeType("html/element_value_set", HtmlValueSet);


function HtmlCreateElement() {


        this.addInput("create", LiteGraph.ACTION);
        this.addInput("type", "string");
        this.addInput("content", "html");
        this.addInput("id", "string");
        this.addInput("class", "string");
        this.addOutput("element","htmlelement");
        this.addProperty("type", "");
        this.addProperty("content", "");
        this.addProperty("id", "");
        this.addProperty("class", "");
        this.addWidget("combo","type",this.properties["type"],"type",{values: ["div","a","span","input","form","br","hr","table","th","tr","td","h1","h2","h3","h4","h5","h6"]});
        this.mode = LiteGraph.ON_ACTION;
    }

HtmlCreateElement.prototype.onExecute = function(param, options) {
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER) {
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+LiteGraph.uuidv4();
            this.onAction(action, param, options);
        }
    }

HtmlCreateElement.prototype.onAction = function() {
        var sType = this.getInputOrProperty("type"); // this.getInputData(1);
        var sId = this.getInputOrProperty("id"); // getInputData(2);
        var sClass = this.getInputOrProperty("class"); // getInputData(3);
        var sContent = this.getInputOrProperty("class"); // getInputData(3);
        var res = null;
        if (sType) {
            var el = document.createElement(sType);
            if (el) {
                if (sId) el.id = sId+"";
                if (sClass) el.className = sClass+"";
                if (sContent) el.innerHTML = sContent+"";
                res = el;
            }
        }else{
            // console.log?.("no type to create");
        }
        this.setOutputData(0,res);
    }
}
HtmlCreateElement.title = "HTML Create El";
HtmlCreateElement.desc = "Create an HTML element";
LiteGraph.registerNodeType("html/create_element", HtmlCreateElement);


function HtmlAppendChild() {


        this.addInput("parent", "htmlelement");
        this.addInput("child", "htmlelement");
        this.addInput("add", LiteGraph.ACTION);
        this.addOutput("result","");
        this.mode = LiteGraph.ON_ACTION;
    }

HtmlAppendChild.prototype.onExecute = function(param, options) {
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER) {
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+LiteGraph.uuidv4();
            this.onAction(action, param, options);
        }
    }

HtmlAppendChild.prototype.onAction = function() {
        var parent = this.getInputData(0);
        var child = this.getInputData(1);
        var res = null;
        if (parent && child && parent.appendChild) {
            res = parent.appendChild(child)?true:false;
        }else{
            // console.log?.("no type to create");
        }
        this.setOutputData(0,res);
    }
}
HtmlAppendChild.title = "HTML Append Child";
HtmlAppendChild.desc = "Append an HTML element to another";
LiteGraph.registerNodeType("html/append_child", HtmlAppendChild);


function HtmlRemoveElement() {


        this.addInput("element", "htmlelement");
        this.addInput("remove", LiteGraph.ACTION);
        this.addOutput("result","");
        this.mode = LiteGraph.ON_ACTION;
    }

HtmlRemoveElement.prototype.onExecute = function(param, options) {
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER) {
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+LiteGraph.uuidv4();
            this.onAction(action, param, options);
        }
    }

HtmlRemoveElement.prototype.onAction = function() {
        var element = this.getInputData(0);
        var res = null;
        if (element && element.remove) {
            res = element.remove()?true:false;
        }else{
            // console.log?.("no type to create");
        }
        this.setOutputData(0,res);
    }
}
HtmlRemoveElement.title = "HTML Remove element";
HtmlRemoveElement.desc = "Remove an HTML element";
LiteGraph.registerNodeType("html/remove_element", HtmlRemoveElement);


function HtmlElementStyle() {


        this.addInput("element", "htmlelement");
        this.addInput("apply", LiteGraph.ACTION);
        this.addProperty("cssProperty", "");
        this.addProperty("cssValue", "");
        this.addOutput("result","");
        this.mode = LiteGraph.ON_ACTION;
    }


HtmlElementStyle.prototype.onGetInputs = function() {
        var entries = [];
        entries.push(["cssProperty", "string", {nameLocked: true, removable: true}]);
        entries.push(["cssValue", "", {nameLocked: true, removable: true}]);
        return entries;
    }

HtmlElementStyle.prototype.onGetOutputs = function() {
        var entries = [];
        entries.push(["some output"]);
        return entries;
    }

HtmlElementStyle.prototype.onExecute = function(param, options) {
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER) {
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+LiteGraph.uuidv4();
            this.onAction(action, param, options);
        }
    }

HtmlElementStyle.prototype.onAction = function() {
        var element = this.getInputData(0);
        var res = null;
        var cssProperty = this.getInputOrProperty("cssProperty");
        var cssValue = this.getInputOrProperty("cssValue");
        if (element && element.style) {
            res = element.style[cssProperty] = cssValue;
            console.log?.("applied",cssProperty,cssValue,"to",element);
        }else{
            console.log?.("no el to apply css");
        }
        this.setOutputData(0,res);
    }
}
HtmlElementStyle.title = "HTML Css";
HtmlElementStyle.desc = "HTML Element apply Css Style";
HtmlElementStyle.commonProperties = [{"property": "box-decoration-break","values": null},{"property": "hyphens","values": null},{"property": "line-break","values": null},{"property": "overflow-wrap","values": null},{"property": "text-combine-upright","values": null},{"property": "text-underline-position","values": null},{"property": "@font-feature-values","values": null},{"property": "font-feature-settings","values": null},{"property": "font-kerning","values": null},{"property": "font-language-override","values": null},{"property": "font-synthesis","values": null},{"property": "font-variant-alternates","values": null},{"property": "font-variant-caps","values": null},{"property": "font-variant-east-asian","values": null},{"property": "font-variant-ligatures","values": null},{"property": "font-variant-numeric","values": null},{"property": "font-variant-position","values": null},{"property": "text-orientation","values": null},{"property": "text-combine-upright","values": null},{"property": "writing-mode","values": null},{"property": "ime-mode","values": null},{"property": "break-after","values": null},{"property": "break-before","values": null},{"property": "break-inside","values": null},{"property": "widows","values": null},{"property": "orphans","values": null},{"property": "marks","values": null},{"property": "image-orientation","values": null},{"property": "image-rendering","values": null},{"property": "image-resolution","values": null},{"property": "object-fit","values": null},{"property": "object-position","values": null},{"property": "mask","values": null},{"property": "mask-type","values": null},{"property": "mark","values": null},{"property": "mark-after","values": null},{"property": "mark-before","values": null},{"property": "phonemes","values": null},{"property": "rest","values": null},{"property": "rest-after","values": null},{"property": "rest-before","values": null},{"property": "voice-balance","values": null},{"property": "voice-duration","values": null},{"property": "voice-pitch","values": null},{"property": "voice-pitch-range","values": null},{"property": "voice-rate","values": null},{"property": "voice-stress","values": null},{"property": "voice-volume","values": null},{"property": "marquee-direction","values": null},{"property": "marquee-play-count","values": null},{"property": "marquee-speed","values": null},{"property": "marquee-style","values": null},{"property": "color","values": ["color","initial","inherit"]},{"property": "opacity","values": ["number","initial","inherit"]},{"property": "background-position","values": ["left top\r\n      left center\r\n      left bottom\r\n      right top\r\n      right center\r\n      right bottom\r\n      center top\r\n      center center\r\n      center bottom","x% y%","xpos ypos","initial","inherit"]},{"property": "background-image","values": ["url('URL')","none","initial","inherit"]},{"property": "background-color","values": ["color","transparent","initial","inherit"]},{"property": "border","values": ["border-width","border-style","border-color","initial","inherit"]},{"property": "word-wrap","values": ["normal","break-word","initial","inherit"]},{"property": "direction","values": ["ltr","rtl","initial","inherit"]},{"property": "unicode-bidi","values": ["normal","embed","bidi-override","initial","inherit"]},{"property": "font-size","values": ["medium","xx-small","x-small","small","large","x-large","xx-large","smaller","larger","length","%","initial","inherit"]},{"property": "text-decoration-line","values": ["none","underline","overline","line-through","initial","inherit"]},{"property": "border-collapse","values": ["separate","collapse","initial","inherit"]},{"property": "background-size","values": ["auto","length","percentage"," cover"," contain","initial","inherit"]},{"property": "list-style-type","values": ["disc","armenian","circle","cjk-ideographic","decimal","decimal-leading-zero","georgian","hebrew","hiragana","hiragana-iroha","katakana","katakana-iroha","lower-alpha","lower-greek","lower-latin","lower-roman","none","square","upper-alpha","upper-latin","upper-roman","initial","inherit"]},{"property": "@keyframes","values": ["animationname","keyframes-selector","css-styles"]},{"property": "border-top-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "background-blend-mode","values": ["normal","multiply","screen","overlay","darken","lighten","color-dodge","saturation","color","luminosity"]},{"property": "background-repeat","values": ["repeat","repeat-x","repeat-y","no-repeat","initial","inherit"]},{"property": "background-clip","values": ["border-box","padding-box","content-box","initial","inherit"]},{"property": "animation-direction","values": ["normal","reverse","alternate","alternate-reverse","initial","inherit"]},{"property": "animation-duration","values": ["time","initial","inherit"]},{"property": "counter-reset","values": ["none","name","number","initial","inherit"]},{"property": "padding-left","values": ["length","%","initial","inherit"]},{"property": "border-bottom-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "list-style","values": ["list-style-type","list-style-position","list-style-image","initial","inherit"]},{"property": "counter-increment","values": ["none","id number","initial","inherit"]},{"property": "align-self","values": ["auto","stretch","center","flex-start","flex-end","baseline","initial","inherit"]},{"property": "min-height","values": ["length","%","initial","inherit"]},{"property": "visibility","values": ["visible","hidden","collapse","initial","inherit"]},{"property": "max-height","values": ["none","length","%","initial","inherit"]},{"property": "position","values": ["static","absolute","fixed","relative","initial","inherit"]},{"property": "border-left-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "border-image-outset","values": ["length"," number","initial","inherit"]},{"property": "overflow-x","values": ["visible","hidden","scroll","auto","initial","inherit"]},{"property": "border-left-color","values": ["color","transparent","initial","inherit"]},{"property": "quotes","values": ["none","string string string string","initial","inherit","","\"","'","â€¹","â€º","Â«","Â»","â€˜","â€™","â€œ","â€","â€ž"]},{"property": "perspective-origin","values": ["x-axis","y-axis","initial","inherit"]},{"property": "flex","values": ["flex-grow","flex-shrink","flex-basis","auto","initial","none","inherit"]},{"property": "border-image","values": [" border-image-source"," border-image-slice"," border-image-width"," border-image-outset"," border-image-repeat","initial","inherit"]},{"property": "animation-delay","values": ["time","initial","inherit"]},{"property": "border-color","values": ["color","transparent","initial","inherit"]},{"property": "clear","values": ["none","left","right","both","initial","inherit"]},{"property": "border-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "overflow\r\n    ","values": ["visible","hidden","scroll","auto","initial","inherit"]},{"property": "column-rule-color","values": [" color","initial","inherit"]},{"property": "border-right-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "border-image-source","values": [" none"," image","initial","inherit"]},{"property": "background-attachment","values": ["scroll","fixed","local","initial","inherit"]},{"property": "border-right","values": ["border-right-width","border-right-style","border-right-color","initial","inherit"]},{"property": "margin-right","values": ["length","%","auto","initial","inherit"]},{"property": "border-bottom","values": ["border-bottom-width","border-bottom-style","border-bottom-color","initial","inherit"]},{"property": "border-right-color","values": ["color","transparent","initial","inherit"]},{"property": "margin-top","values": ["length","%","auto","initial","inherit"]},{"property": "border-radius","values": ["length","%","initial","inherit"]},{"property": "max-width","values": ["none","length","%","initial","inherit"]},{"property": "min-width","values": ["length","%","initial","inherit"]},{"property": "z-index","values": ["auto","number","initial","inherit"]},{"property": "border-bottom-left-radius","values": ["length","%","initial","inherit"]},{"property": "text-transform","values": ["none","capitalize","uppercase","lowercase","initial","inherit"]},{"property": "text-indent","values": ["length","%","initial","inherit"]},{"property": "text-justify","values": ["auto","inter-word","inter-ideograph","inter-cluster","distribute","kashida","trim","none","initial","inherit"]},{"property": "text-align","values": ["left","right","center","justify","initial","inherit"]},{"property": "border-bottom-color","values": ["color","transparent","initial","inherit"]},{"property": "background","values": ["background-color","background-image","background-position","background-size","background-repeat","background-origin","background-clip","background-attachment","initial","inherit"]},{"property": "letter-spacing","values": ["normal","length","initial","inherit"]},{"property": "align-items","values": ["stretch","center","flex-start","flex-end","baseline","initial","inherit"]},{"property": "tab-size","values": ["number","length","initial","inherit"]},{"property": "flex-wrap","values": ["nowrap","wrap","wrap-reverse","initial","inherit"]},{"property": "flex-direction","values": ["row","row-reverse","column","column-reverse","initial","inherit"]},{"property": "flex-basis","values": ["number","auto","initial","inherit"]},{"property": "flex-shrink","values": ["number","initial","inherit"]},{"property": "bottom","values": ["auto","length","%","initial","inherit"]},{"property": "clip","values": ["auto","shape","initial","inherit"]},{"property": "flex-grow","values": ["number","initial","inherit"]},{"property": "font","values": ["font-style","font-variant","font-weight","font-size/line-height","font-family","caption","icon","menu","message-box","small-caption","status-bar","initial","inherit"]},{"property": "margin-left","values": ["length","%","auto","initial","inherit"]},{"property": "text-decoration-color","values": ["color","initial","inherit"]},{"property": "border-bottom-right-radius","values": ["length","%","initial","inherit"]},{"property": "list-style-position","values": ["inside","outside","initial","inherit"]},{"property": "top","values": ["auto","length","%","initial","inherit"]},{"property": "right","values": ["auto","length","%","initial","inherit"]},{"property": "background-origin","values": ["padding-box","border-box","content-box","initial","inherit"]},{"property": "table-layout","values": ["auto","fixed","initial","inherit"]},{"property": "margin-bottom","values": ["length","%","auto","initial","inherit"]},{"property": "padding-bottom","values": ["length","%","initial","inherit"]},{"property": "border-image-slice","values": [" number"," %"," fill","initial","inherit"]},{"property": "flex-flow","values": ["flex-direction","flex-wrap","initial","inherit"]},{"property": "float","values": ["none","left","right","initial","inherit"]},{"property": "vertical-align","values": ["baseline","length","%","sub","super","top","text-top","middle","bottom","text-bottom","initial","inherit"]},{"property": "padding-right","values": ["length","%","initial","inherit"]},{"property": "width","values": ["auto","length","%","initial","inherit"]},{"property": "align-content","values": ["stretch","center","flex-start","flex-end","space-between","space-around","initial","inherit"]},{"property": "padding","values": ["length","%","initial","inherit"]},{"property": "hanging-punctuation","values": ["none","first","last","allow-end","force-end","initial","inherit"]},{"property": "border-bottom-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "border-left-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "text-align-last","values": ["auto","left","right","center","justify","start","end","initial","inherit"]},{"property": "order","values": ["number","initial","inherit"]},{"property": "border-top-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "border-top-color","values": ["color","transparent","initial","inherit"]},{"property": "display","values": ["inline","block","flex","inline-block","inline-flex","inline-table","list-item","run-in","table","table-caption","\r\n      table-column-group","table-header-group","table-footer-group","table-row-group","table-cell","table-column","table-row","none","initial","inherit"]},{"property": "left","values": ["auto","length","%","initial","inherit"]},{"property": "border-top-left-radius","values": ["length","%","initial","inherit"]},{"property": "margin","values": ["length","%","auto","initial","inherit"]},{"property": "border-image-repeat","values": [" stretch"," repeat"," round","space","initial","inherit"]},{"property": "box-shadow","values": ["none","h-shadow","v-shadow","blur","spread","color","inset","initial","inherit"]},{"property": "border-top-right-radius","values": ["length","%","initial","inherit"]},{"property": "text-decoration-style","values": ["solid","double","dotted","dashed","wavy","initial","inherit"]},{"property": "height","values": ["auto","length","%","initial","inherit"]},{"property": "border-right-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "border-left","values": ["border-left-width","border-left-style","border-left-color","initial","inherit"]},{"property": "border-image-width","values": ["length","number","%","auto","initial","inherit"]},{"property": "font-family","values": ["family-name\r\n      generic-family","initial","inherit"]},{"property": "border-top","values": ["border-top-width","border-top-style","border-top-color","initial","inherit"]},{"property": "empty-cells","values": ["show","hide","initial","inherit"]},{"property": "justify-content","values": ["flex-start","flex-end","center","space-between","space-around","initial","inherit"]},{"property": "text-shadow","values": ["h-shadow","v-shadow","blur-radius","color","none","initial","inherit"]},{"property": "overflow-y","values": ["visible","hidden","scroll","auto","initial","inherit"]},{"property": "padding-top","values": ["length","%","initial","inherit"]},{"property": "border-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "border-spacing","values": ["length length","initial","inherit"]},{"property": "word-break","values": ["normal","break-all","keep-all ","initial","inherit"]},{"property": "@font-face","values": ["font-family","src","font-stretch","font-style","font-weight","unicode-range"]},{"property": "text-decoration","values": ["none","underline","overline","line-through","initial","inherit"]},{"property": "white-space","values": ["normal","nowrap","pre","pre-line","pre-wrap","initial","inherit"]},{"property": "font-size-adjust","values": ["number","none","initial","inherit"]},{"property": "font-style","values": ["normal","italic","oblique","initial","inherit"]},{"property": "line-height","values": ["normal","number","length","%","initial","inherit"]},{"property": "font-weight","values": ["normal","bold","bolder","lighter","100\r\n      200\r\n      300\r\n      400\r\n      500\r\n      600\r\n      700\r\n      800\r\n      900","initial","inherit"]},{"property": "word-spacing","values": ["normal","length","initial","inherit"]},{"property": "page-break-after","values": ["auto","always","avoid","left","right","initial","inherit"]},{"property": "outline-color","values": ["invert","color","initial","inherit"]},{"property": "column-gap","values": ["length","normal","initial","inherit"]},{"property": "column-rule","values": [" column-rule-width"," column-rule-style"," column-rule-color","initial","inherit"]},{"property": "columns","values": ["auto","column-width","column-count","initial","inherit"]},{"property": "column-rule-style","values": [" none"," hidden"," dotted"," dashed"," solid"," double"," groove"," ridge"," inset"," outset","initial","inherit"]},{"property": "font-variant","values": ["normal","small-caps","initial","inherit"]},{"property": "column-rule-width","values": [" medium"," thin"," thick"," length","initial","inherit"]},{"property": "cursor","values": ["alias","all-scroll","auto","cell","context-menu","col-resize","copy","crosshair","default","e-resize","ew-resize","grab","grabbing","help","move","n-resize","ne-resize","nesw-resize","ns-resize","nw-resize","nwse-resize","no-drop","none","not-allowed","pointer","progress","row-resize","s-resize","se-resize","sw-resize","text","URL","vertical-text","w-resize","wait","zoom-in","zoom-out","initial","inherit"]},{"property": "column-fill","values": ["balance","auto","initial","inherit"]},{"property": "animation-fill-mode","values": ["none","forwards","backwards","both","initial","inherit"]},{"property": "nav-left","values": ["auto","id","target-name","initial","inherit"]},{"property": "outline-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "nav-right","values": ["auto","id","target-name","initial","inherit"]},{"property": "nav-up","values": ["auto","id","target-name","initial","inherit"]},{"property": "nav-down","values": ["auto","id","target-name","initial","inherit"]},{"property": "outline","values": ["outline-color","outline-style","outline-width","initial","inherit"]},{"property": "animation","values": ["animation-name","animation-duration","\r\n\tanimation-timing-function","animation-delay","\r\n\tanimation-iteration-count","animation-direction","animation-fill-mode","animation-play-state","initial","inherit"]},{"property": "nav-index","values": ["auto","number","initial","inherit"]},{"property": "font-stretch","values": ["ultra-condensed","extra-condensed","condensed","semi-condensed","normal","semi-expanded","expanded","extra-expanded","ultra-expanded","initial","inherit"]},{"property": "list-style-image","values": ["none","url","initial","inherit"]},{"property": "transition-duration","values": ["time","initial","inherit"]},{"property": "perspective","values": ["length","none","initial","inherit"]},{"property": "animation-play-state","values": ["paused","running","initial","inherit"]},{"property": "backface-visibility","values": ["visible","hidden","initial","inherit"]},{"property": "column-count","values": ["number","auto","initial","inherit"]},{"property": "transition-delay","values": ["time","initial","inherit"]},{"property": "transform","values": ["none","matrix(n,n,n,n,n,n)","matrix3d\r\n\t(n,n,n,n,n,n,n,n,n,n,n,n,n,n,n,n)","translate(x,y)","translate3d(x,y,z)","translateX(x)","translateY(y)","translateZ(z)","scale(x,y)","scale3d(x,y,z)","scaleX(x)","scaleY(y)","scaleZ(z)","rotate(angle)","rotate3d(x,y,z,angle)","rotateX(angle)","rotateY(angle)","rotateZ(angle)","skew(x-angle,y-angle)","skewX(angle)","skewY(angle)","perspective(n)","initial","inherit"]},{"property": "resize","values": [" none"," both"," horizontal"," vertical","initial","inherit"]},{"property": "text-overflow","values": ["clip","ellipsis","string","initial","inherit"]},{"property": "caption-side","values": ["top","bottom","initial","inherit"]},{"property": "filter","values": ["none","blur(px)","brightness(%)","contrast(%)","drop-shadow(h-shadow v-shadow blur spread color)","grayscale(%)","hue-rotate(deg)","invert(%)","opacity(%)","saturate(%)","sepia(%)","url()","initial","inherit"]},{"property": "content","values": ["normal","none","counter","attr(attribute)","string","open-quote","close-quote","no-open-quote","no-close-quote","url(url)","initial","inherit"]},{"property": "transition-timing-function","values": ["ease","linear","ease-in","ease-out","ease-in-out","cubic-bezier(n,n,n,n)","initial","inherit"]},{"property": "box-sizing","values": [" content-box"," border-box","initial","inherit"]},{"property": "page-break-before","values": ["auto","always","avoid","left","right","initial","inherit"]},{"property": "animation-timing-function","values": ["linear","ease","ease-in","ease-out","ease-in-out","cubic-bezier(n,n,n,n)","initial","inherit"]},{"property": "outline-offset","values": [" length","initial","inherit"]},{"property": "column-width","values": ["auto","length","initial","inherit"]},{"property": "outline-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "transform-origin","values": ["x-axis","y-axis","z-axis","initial","inherit"]},{"property": "transform-style","values": ["flat","preserve-3d","initial","inherit"]},{"property": "transition","values": ["transition-property","transition-duration","transition-timing-function","transition-delay","initial","inherit"]},{"property": "page-break-inside","values": ["auto","avoid","initial","inherit"]},{"property": "column-span","values": ["1","all","initial","inherit"]},{"property": "transition-property","values": ["none","all","property","initial","inherit"]},{"property": "animation-iteration-count","values": ["number","infinite","initial","inherit"]},{"property": "animation-name","values": ["keyframename","none","initial","inherit"]}][{"property": "box-decoration-break","values": null},{"property": "hyphens","values": null},{"property": "line-break","values": null},{"property": "overflow-wrap","values": null},{"property": "text-combine-upright","values": null},{"property": "text-underline-position","values": null},{"property": "@font-feature-values","values": null},{"property": "font-feature-settings","values": null},{"property": "font-kerning","values": null},{"property": "font-language-override","values": null},{"property": "font-synthesis","values": null},{"property": "font-variant-alternates","values": null},{"property": "font-variant-caps","values": null},{"property": "font-variant-east-asian","values": null},{"property": "font-variant-ligatures","values": null},{"property": "font-variant-numeric","values": null},{"property": "font-variant-position","values": null},{"property": "text-orientation","values": null},{"property": "text-combine-upright","values": null},{"property": "writing-mode","values": null},{"property": "ime-mode","values": null},{"property": "break-after","values": null},{"property": "break-before","values": null},{"property": "break-inside","values": null},{"property": "widows","values": null},{"property": "orphans","values": null},{"property": "marks","values": null},{"property": "image-orientation","values": null},{"property": "image-rendering","values": null},{"property": "image-resolution","values": null},{"property": "object-fit","values": null},{"property": "object-position","values": null},{"property": "mask","values": null},{"property": "mask-type","values": null},{"property": "mark","values": null},{"property": "mark-after","values": null},{"property": "mark-before","values": null},{"property": "phonemes","values": null},{"property": "rest","values": null},{"property": "rest-after","values": null},{"property": "rest-before","values": null},{"property": "voice-balance","values": null},{"property": "voice-duration","values": null},{"property": "voice-pitch","values": null},{"property": "voice-pitch-range","values": null},{"property": "voice-rate","values": null},{"property": "voice-stress","values": null},{"property": "voice-volume","values": null},{"property": "marquee-direction","values": null},{"property": "marquee-play-count","values": null},{"property": "marquee-speed","values": null},{"property": "marquee-style","values": null},{"property": "color","values": ["color","initial","inherit"]},{"property": "opacity","values": ["number","initial","inherit"]},{"property": "background-position","values": ["left top\r\n      left center\r\n      left bottom\r\n      right top\r\n      right center\r\n      right bottom\r\n      center top\r\n      center center\r\n      center bottom","x% y%","xpos ypos","initial","inherit"]},{"property": "background-image","values": ["url('URL')","none","initial","inherit"]},{"property": "background-color","values": ["color","transparent","initial","inherit"]},{"property": "border","values": ["border-width","border-style","border-color","initial","inherit"]},{"property": "word-wrap","values": ["normal","break-word","initial","inherit"]},{"property": "direction","values": ["ltr","rtl","initial","inherit"]},{"property": "unicode-bidi","values": ["normal","embed","bidi-override","initial","inherit"]},{"property": "font-size","values": ["medium","xx-small","x-small","small","large","x-large","xx-large","smaller","larger","length","%","initial","inherit"]},{"property": "text-decoration-line","values": ["none","underline","overline","line-through","initial","inherit"]},{"property": "border-collapse","values": ["separate","collapse","initial","inherit"]},{"property": "background-size","values": ["auto","length","percentage"," cover"," contain","initial","inherit"]},{"property": "list-style-type","values": ["disc","armenian","circle","cjk-ideographic","decimal","decimal-leading-zero","georgian","hebrew","hiragana","hiragana-iroha","katakana","katakana-iroha","lower-alpha","lower-greek","lower-latin","lower-roman","none","square","upper-alpha","upper-latin","upper-roman","initial","inherit"]},{"property": "@keyframes","values": ["animationname","keyframes-selector","css-styles"]},{"property": "border-top-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "background-blend-mode","values": ["normal","multiply","screen","overlay","darken","lighten","color-dodge","saturation","color","luminosity"]},{"property": "background-repeat","values": ["repeat","repeat-x","repeat-y","no-repeat","initial","inherit"]},{"property": "background-clip","values": ["border-box","padding-box","content-box","initial","inherit"]},{"property": "animation-direction","values": ["normal","reverse","alternate","alternate-reverse","initial","inherit"]},{"property": "animation-duration","values": ["time","initial","inherit"]},{"property": "counter-reset","values": ["none","name","number","initial","inherit"]},{"property": "padding-left","values": ["length","%","initial","inherit"]},{"property": "border-bottom-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "list-style","values": ["list-style-type","list-style-position","list-style-image","initial","inherit"]},{"property": "counter-increment","values": ["none","id number","initial","inherit"]},{"property": "align-self","values": ["auto","stretch","center","flex-start","flex-end","baseline","initial","inherit"]},{"property": "min-height","values": ["length","%","initial","inherit"]},{"property": "visibility","values": ["visible","hidden","collapse","initial","inherit"]},{"property": "max-height","values": ["none","length","%","initial","inherit"]},{"property": "position","values": ["static","absolute","fixed","relative","initial","inherit"]},{"property": "border-left-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "border-image-outset","values": ["length"," number","initial","inherit"]},{"property": "overflow-x","values": ["visible","hidden","scroll","auto","initial","inherit"]},{"property": "border-left-color","values": ["color","transparent","initial","inherit"]},{"property": "quotes","values": ["none","string string string string","initial","inherit","","\"","'","â€¹","â€º","Â«","Â»","â€˜","â€™","â€œ","â€","â€ž"]},{"property": "perspective-origin","values": ["x-axis","y-axis","initial","inherit"]},{"property": "flex","values": ["flex-grow","flex-shrink","flex-basis","auto","initial","none","inherit"]},{"property": "border-image","values": [" border-image-source"," border-image-slice"," border-image-width"," border-image-outset"," border-image-repeat","initial","inherit"]},{"property": "animation-delay","values": ["time","initial","inherit"]},{"property": "border-color","values": ["color","transparent","initial","inherit"]},{"property": "clear","values": ["none","left","right","both","initial","inherit"]},{"property": "border-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "overflow\r\n    ","values": ["visible","hidden","scroll","auto","initial","inherit"]},{"property": "column-rule-color","values": [" color","initial","inherit"]},{"property": "border-right-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "border-image-source","values": [" none"," image","initial","inherit"]},{"property": "background-attachment","values": ["scroll","fixed","local","initial","inherit"]},{"property": "border-right","values": ["border-right-width","border-right-style","border-right-color","initial","inherit"]},{"property": "margin-right","values": ["length","%","auto","initial","inherit"]},{"property": "border-bottom","values": ["border-bottom-width","border-bottom-style","border-bottom-color","initial","inherit"]},{"property": "border-right-color","values": ["color","transparent","initial","inherit"]},{"property": "margin-top","values": ["length","%","auto","initial","inherit"]},{"property": "border-radius","values": ["length","%","initial","inherit"]},{"property": "max-width","values": ["none","length","%","initial","inherit"]},{"property": "min-width","values": ["length","%","initial","inherit"]},{"property": "z-index","values": ["auto","number","initial","inherit"]},{"property": "border-bottom-left-radius","values": ["length","%","initial","inherit"]},{"property": "text-transform","values": ["none","capitalize","uppercase","lowercase","initial","inherit"]},{"property": "text-indent","values": ["length","%","initial","inherit"]},{"property": "text-justify","values": ["auto","inter-word","inter-ideograph","inter-cluster","distribute","kashida","trim","none","initial","inherit"]},{"property": "text-align","values": ["left","right","center","justify","initial","inherit"]},{"property": "border-bottom-color","values": ["color","transparent","initial","inherit"]},{"property": "background","values": ["background-color","background-image","background-position","background-size","background-repeat","background-origin","background-clip","background-attachment","initial","inherit"]},{"property": "letter-spacing","values": ["normal","length","initial","inherit"]},{"property": "align-items","values": ["stretch","center","flex-start","flex-end","baseline","initial","inherit"]},{"property": "tab-size","values": ["number","length","initial","inherit"]},{"property": "flex-wrap","values": ["nowrap","wrap","wrap-reverse","initial","inherit"]},{"property": "flex-direction","values": ["row","row-reverse","column","column-reverse","initial","inherit"]},{"property": "flex-basis","values": ["number","auto","initial","inherit"]},{"property": "flex-shrink","values": ["number","initial","inherit"]},{"property": "bottom","values": ["auto","length","%","initial","inherit"]},{"property": "clip","values": ["auto","shape","initial","inherit"]},{"property": "flex-grow","values": ["number","initial","inherit"]},{"property": "font","values": ["font-style","font-variant","font-weight","font-size/line-height","font-family","caption","icon","menu","message-box","small-caption","status-bar","initial","inherit"]},{"property": "margin-left","values": ["length","%","auto","initial","inherit"]},{"property": "text-decoration-color","values": ["color","initial","inherit"]},{"property": "border-bottom-right-radius","values": ["length","%","initial","inherit"]},{"property": "list-style-position","values": ["inside","outside","initial","inherit"]},{"property": "top","values": ["auto","length","%","initial","inherit"]},{"property": "right","values": ["auto","length","%","initial","inherit"]},{"property": "background-origin","values": ["padding-box","border-box","content-box","initial","inherit"]},{"property": "table-layout","values": ["auto","fixed","initial","inherit"]},{"property": "margin-bottom","values": ["length","%","auto","initial","inherit"]},{"property": "padding-bottom","values": ["length","%","initial","inherit"]},{"property": "border-image-slice","values": [" number"," %"," fill","initial","inherit"]},{"property": "flex-flow","values": ["flex-direction","flex-wrap","initial","inherit"]},{"property": "float","values": ["none","left","right","initial","inherit"]},{"property": "vertical-align","values": ["baseline","length","%","sub","super","top","text-top","middle","bottom","text-bottom","initial","inherit"]},{"property": "padding-right","values": ["length","%","initial","inherit"]},{"property": "width","values": ["auto","length","%","initial","inherit"]},{"property": "align-content","values": ["stretch","center","flex-start","flex-end","space-between","space-around","initial","inherit"]},{"property": "padding","values": ["length","%","initial","inherit"]},{"property": "hanging-punctuation","values": ["none","first","last","allow-end","force-end","initial","inherit"]},{"property": "border-bottom-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "border-left-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "text-align-last","values": ["auto","left","right","center","justify","start","end","initial","inherit"]},{"property": "order","values": ["number","initial","inherit"]},{"property": "border-top-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "border-top-color","values": ["color","transparent","initial","inherit"]},{"property": "display","values": ["inline","block","flex","inline-block","inline-flex","inline-table","list-item","run-in","table","table-caption","\r\n      table-column-group","table-header-group","table-footer-group","table-row-group","table-cell","table-column","table-row","none","initial","inherit"]},{"property": "left","values": ["auto","length","%","initial","inherit"]},{"property": "border-top-left-radius","values": ["length","%","initial","inherit"]},{"property": "margin","values": ["length","%","auto","initial","inherit"]},{"property": "border-image-repeat","values": [" stretch"," repeat"," round","space","initial","inherit"]},{"property": "box-shadow","values": ["none","h-shadow","v-shadow","blur","spread","color","inset","initial","inherit"]},{"property": "border-top-right-radius","values": ["length","%","initial","inherit"]},{"property": "text-decoration-style","values": ["solid","double","dotted","dashed","wavy","initial","inherit"]},{"property": "height","values": ["auto","length","%","initial","inherit"]},{"property": "border-right-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "border-left","values": ["border-left-width","border-left-style","border-left-color","initial","inherit"]},{"property": "border-image-width","values": ["length","number","%","auto","initial","inherit"]},{"property": "font-family","values": ["family-name\r\n      generic-family","initial","inherit"]},{"property": "border-top","values": ["border-top-width","border-top-style","border-top-color","initial","inherit"]},{"property": "empty-cells","values": ["show","hide","initial","inherit"]},{"property": "justify-content","values": ["flex-start","flex-end","center","space-between","space-around","initial","inherit"]},{"property": "text-shadow","values": ["h-shadow","v-shadow","blur-radius","color","none","initial","inherit"]},{"property": "overflow-y","values": ["visible","hidden","scroll","auto","initial","inherit"]},{"property": "padding-top","values": ["length","%","initial","inherit"]},{"property": "border-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "border-spacing","values": ["length length","initial","inherit"]},{"property": "word-break","values": ["normal","break-all","keep-all ","initial","inherit"]},{"property": "@font-face","values": ["font-family","src","font-stretch","font-style","font-weight","unicode-range"]},{"property": "text-decoration","values": ["none","underline","overline","line-through","initial","inherit"]},{"property": "white-space","values": ["normal","nowrap","pre","pre-line","pre-wrap","initial","inherit"]},{"property": "font-size-adjust","values": ["number","none","initial","inherit"]},{"property": "font-style","values": ["normal","italic","oblique","initial","inherit"]},{"property": "line-height","values": ["normal","number","length","%","initial","inherit"]},{"property": "font-weight","values": ["normal","bold","bolder","lighter","100\r\n      200\r\n      300\r\n      400\r\n      500\r\n      600\r\n      700\r\n      800\r\n      900","initial","inherit"]},{"property": "word-spacing","values": ["normal","length","initial","inherit"]},{"property": "page-break-after","values": ["auto","always","avoid","left","right","initial","inherit"]},{"property": "outline-color","values": ["invert","color","initial","inherit"]},{"property": "column-gap","values": ["length","normal","initial","inherit"]},{"property": "column-rule","values": [" column-rule-width"," column-rule-style"," column-rule-color","initial","inherit"]},{"property": "columns","values": ["auto","column-width","column-count","initial","inherit"]},{"property": "column-rule-style","values": [" none"," hidden"," dotted"," dashed"," solid"," double"," groove"," ridge"," inset"," outset","initial","inherit"]},{"property": "font-variant","values": ["normal","small-caps","initial","inherit"]},{"property": "column-rule-width","values": [" medium"," thin"," thick"," length","initial","inherit"]},{"property": "cursor","values": ["alias","all-scroll","auto","cell","context-menu","col-resize","copy","crosshair","default","e-resize","ew-resize","grab","grabbing","help","move","n-resize","ne-resize","nesw-resize","ns-resize","nw-resize","nwse-resize","no-drop","none","not-allowed","pointer","progress","row-resize","s-resize","se-resize","sw-resize","text","URL","vertical-text","w-resize","wait","zoom-in","zoom-out","initial","inherit"]},{"property": "column-fill","values": ["balance","auto","initial","inherit"]},{"property": "animation-fill-mode","values": ["none","forwards","backwards","both","initial","inherit"]},{"property": "nav-left","values": ["auto","id","target-name","initial","inherit"]},{"property": "outline-width","values": ["medium","thin","thick","length","initial","inherit"]},{"property": "nav-right","values": ["auto","id","target-name","initial","inherit"]},{"property": "nav-up","values": ["auto","id","target-name","initial","inherit"]},{"property": "nav-down","values": ["auto","id","target-name","initial","inherit"]},{"property": "outline","values": ["outline-color","outline-style","outline-width","initial","inherit"]},{"property": "animation","values": ["animation-name","animation-duration","\r\n\tanimation-timing-function","animation-delay","\r\n\tanimation-iteration-count","animation-direction","animation-fill-mode","animation-play-state","initial","inherit"]},{"property": "nav-index","values": ["auto","number","initial","inherit"]},{"property": "font-stretch","values": ["ultra-condensed","extra-condensed","condensed","semi-condensed","normal","semi-expanded","expanded","extra-expanded","ultra-expanded","initial","inherit"]},{"property": "list-style-image","values": ["none","url","initial","inherit"]},{"property": "transition-duration","values": ["time","initial","inherit"]},{"property": "perspective","values": ["length","none","initial","inherit"]},{"property": "animation-play-state","values": ["paused","running","initial","inherit"]},{"property": "backface-visibility","values": ["visible","hidden","initial","inherit"]},{"property": "column-count","values": ["number","auto","initial","inherit"]},{"property": "transition-delay","values": ["time","initial","inherit"]},{"property": "transform","values": ["none","matrix(n,n,n,n,n,n)","matrix3d\r\n\t(n,n,n,n,n,n,n,n,n,n,n,n,n,n,n,n)","translate(x,y)","translate3d(x,y,z)","translateX(x)","translateY(y)","translateZ(z)","scale(x,y)","scale3d(x,y,z)","scaleX(x)","scaleY(y)","scaleZ(z)","rotate(angle)","rotate3d(x,y,z,angle)","rotateX(angle)","rotateY(angle)","rotateZ(angle)","skew(x-angle,y-angle)","skewX(angle)","skewY(angle)","perspective(n)","initial","inherit"]},{"property": "resize","values": [" none"," both"," horizontal"," vertical","initial","inherit"]},{"property": "text-overflow","values": ["clip","ellipsis","string","initial","inherit"]},{"property": "caption-side","values": ["top","bottom","initial","inherit"]},{"property": "filter","values": ["none","blur(px)","brightness(%)","contrast(%)","drop-shadow(h-shadow v-shadow blur spread color)","grayscale(%)","hue-rotate(deg)","invert(%)","opacity(%)","saturate(%)","sepia(%)","url()","initial","inherit"]},{"property": "content","values": ["normal","none","counter","attr(attribute)","string","open-quote","close-quote","no-open-quote","no-close-quote","url(url)","initial","inherit"]},{"property": "transition-timing-function","values": ["ease","linear","ease-in","ease-out","ease-in-out","cubic-bezier(n,n,n,n)","initial","inherit"]},{"property": "box-sizing","values": [" content-box"," border-box","initial","inherit"]},{"property": "page-break-before","values": ["auto","always","avoid","left","right","initial","inherit"]},{"property": "animation-timing-function","values": ["linear","ease","ease-in","ease-out","ease-in-out","cubic-bezier(n,n,n,n)","initial","inherit"]},{"property": "outline-offset","values": [" length","initial","inherit"]},{"property": "column-width","values": ["auto","length","initial","inherit"]},{"property": "outline-style","values": ["none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset","initial","inherit"]},{"property": "transform-origin","values": ["x-axis","y-axis","z-axis","initial","inherit"]},{"property": "transform-style","values": ["flat","preserve-3d","initial","inherit"]},{"property": "transition","values": ["transition-property","transition-duration","transition-timing-function","transition-delay","initial","inherit"]},{"property": "page-break-inside","values": ["auto","avoid","initial","inherit"]},{"property": "column-span","values": ["1","all","initial","inherit"]},{"property": "transition-property","values": ["none","all","property","initial","inherit"]},{"property": "animation-iteration-count","values": ["number","infinite","initial","inherit"]},{"property": "animation-name","values": ["keyframename","none","initial","inherit"]}];
LiteGraph.registerNodeType("html/apply_element_css", HtmlElementStyle);

