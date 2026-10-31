import { LiteGraph } from "./litegraph.js";
import { CallbackHandler } from "./callbackhandler.js";
import { DragAndScale } from "./dragandscale.js";
import { ContextMenu } from "./contextmenu.js";

/**
 * This class is in charge of rendering one graph inside a canvas. And provides all the interaction required.
 * Valid callbacks are: onNodeSelected, onNodeDeselected, onShowNodePanel, onNodeDblClicked
 *
 * @class LGraphCanvas
 * @constructor
 * @param {HTMLCanvas} canvas the canvas where you want to render (it accepts a selector in string format or the canvas element itself)
 * @param {LGraph} graph [optional]
 * @param {Object} options [optional] { skip_rendering, autoresize, viewport }
 */
export class LGraphCanvas {
    constructor(canvas, graph, options) {
        options ??= {
            skip_render: false,
            autoresize: false,
            clip_all_nodes: false,
            free_resize: true,

            groups_alpha: 0.21,
            groups_border_alpha: 0.45,
            groups_triangle_handler_size: 15,
            groups_title_font: "Arial",
            groups_title_alignment: "left",
            groups_title_font_size: 24, // group font size is actually a lgraphgroup property, and the default is in LiteGraph
            groups_title_wrap: true,
            groups_add_around_selected: true,
            groups_add_default_spacing: 15,

            hide_widget_label_when_small: 150, //false,

        };
        this.options = options;
        
        // register CallbackHandler methods on this
        this.callbackhandler_setup();

        // if(graph === undefined)
        //	throw new Error("No graph assigned");
        this.background_image = LGraphCanvas.DEFAULT_BACKGROUND_IMAGE;

        if (canvas && canvas.constructor === String) {
            canvas = document.querySelector(canvas);
        }

        this.ds = new DragAndScale();
        this.zoom_modify_alpha = true; // otherwise it generates ugly patterns when scaling down too much

        this.title_text_font = `${LiteGraph.NODE_TEXT_SIZE}px Arial`;
        this.inner_text_font = `normal ${LiteGraph.NODE_SUBTEXT_SIZE}px Arial`;
        this.node_title_color = LiteGraph.NODE_TITLE_COLOR;
        this.default_link_color = LiteGraph.LINK_COLOR;
        this.default_connection_color = {
            input_off: "#778",
            input_on: "#7F7", // "#BBD"
            output_off: "#778",
            output_on: "#7F7", // "#BBD"
        };
        this.default_connection_color_byType = {}; /* number: "#7F7", string: "#77F", boolean: "#F77",*/
        this.default_connection_color_byTypeOff = {}; /* number: "#474", string: "#447", boolean: "#744",*/
        this.drag_mode = false; // never used ?
        this.dragging_rectangle = null;

        this.filter = null; // allows to filter to only accept some type of nodes in a graph

        this.highquality_render = true;
        this.use_gradients = false; // set to true to render titlebar with gradients
        this.editor_alpha = 1; // used for transition
        this.pause_rendering = false;
        this.clear_background = true;
        this.clear_background_color = "#222";

        this.read_only = false; // if set to true users cannot modify the graph
        //  this.render_only_selected = true; // @TODO Atlasan figures this isn't used
        this.live_mode = false;
        this.show_info = true;
        this.allow_dragcanvas = true;
        this.allow_dragnodes = true;
        this.allow_interaction = true; // allow to control widgets, buttons, collapse, etc
        this.multi_select = false; // allow selecting multi nodes without pressing extra keys
        this.allow_searchbox = true;
        //  this.allow_reconnect_links = true; // @TODO: replaced by Atlasan.  Clean up.  allows to change a connection with having to redo it again
        this.move_destination_link_without_shift = false;
        this.align_to_grid = false; // snap to grid

        this.drag_mode = false;
        this.dragging_rectangle = null;

        this.filter = null; // allows to filter to only accept some type of nodes in a graph

        this.set_canvas_dirty_on_mouse_event = true; // forces to redraw the canvas if the mouse does anything
        this.always_render_background = false;
        this.render_shadows = true;
        this.render_canvas_border = true;
        this.render_connections_shadows = false; // too much cpu
        this.render_connections_border = true;
        this.render_curved_connections = true;
        this.render_connection_arrows = false;
        this.render_collapsed_slots = true;
        this.render_execution_order = false;
        this.render_title_colored = true;
        this.render_link_tooltip = true;

        this.links_render_mode = LiteGraph.SPLINE_LINK;

        // TODO refactor: options object do need refactoring .. all the options are actually outside of it
        this.autoresize = options.autoresize;
        this.skip_render = options.skip_render;
        this.clip_all_nodes = options.clip_all_nodes;
        this.free_resize = options.free_resize;

        this.mouse = [0, 0]; // mouse in canvas coordinates, where 0,0 is the top-left corner of the blue rectangle
        this.graph_mouse = [0, 0]; // mouse in graph coordinates, where 0,0 is the top-left corner of the blue rectangle
        this.canvas_mouse = this.graph_mouse; // LEGACY: REMOVE THIS, USE GRAPH_MOUSE INSTEAD

        // to personalize the search box
        this.onSearchBox = null;
        this.onSearchBoxSelection = null;

        // callbacks
        this.onMouse = null;
        this.onDrawBackground = null; // to render background objects (behind nodes and connections) in the canvas affected by transform
        this.onDrawForeground = null; // to render foreground objects (above nodes and connections) in the canvas affected by transform
        this.onDrawOverlay = null; // to render foreground objects not affected by transform (for GUIs)
        this.onDrawLinkTooltip = null; // called when rendering a tooltip
        this.onNodeMoved = null; // called after moving a node
        this.onSelectionChange = null; // called if the selection changes
        this.onConnectingChange = null; // called before any link changes
        this.onBeforeChange = null; // called before modifying the graph
        this.onAfterChange = null; // called after modifying the graph

        this.connections_width = 3;
        this.round_radius = 8;

        this.current_node = null;
        this.node_widget = null; // used for widgets: active (clicked) widget
        this.over_widget = null;
        this.over_node = null;
        this.over_link_center = null;
        this.last_mouse_position = [0, 0];
        this.visible_area = this.ds.visible_area;
        this.visible_links = [];

        this.viewport = options.viewport || null; // to constraint render area to a portion of the canvas
        this.low_quality_rendering_threshold = 5; // amount of slow fps to switch to low quality rendering

        // link canvas and graph
        graph?.attachCanvas(this);
        this.setCanvas(canvas,options.skip_events);
        this.clear();

        if (!this.skip_render && !options.skip_render) {
            this.startRendering();
        }

        // event dispatcher, along direct (single) assignment of callbacks [ event entrypoint ]
        this.callbackhandler_setup();

        LiteGraph.processCallbackHandlers("on_lgraphcanvas_construct",{
            def_cb: LiteGraph.on_lgraphcanvas_construct
        }, this);
    }

    callbackhandler_setup(){
        this.cb_handler = new CallbackHandler(this);
        // register CallbackHandler methods on this // Should move as class standard class methods?
        // this.registerCallbackHandler = function(){ return this.cb_handler.registerCallbackHandler(...arguments); };
        // this.unregisterCallbackHandler = function(){ return this.cb_handler.unregisterCallbackHandler(...arguments); };
        // this.processCallbackHandlers = function(){ return this.cb_handler.processCallbackHandlers(...arguments); };
    }

    registerCallbackHandler(){
        // if(!this.cb_handler) this.callbackhandler_setup();
        return this.cb_handler.registerCallbackHandler(...arguments);
    };
    unregisterCallbackHandler(){
        // if(!this.cb_handler) this.callbackhandler_setup();
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    };
    processCallbackHandlers(){
        // if(!this.cb_handler) this.callbackhandler_setup();
        return this.cb_handler.processCallbackHandlers(...arguments);
    };

    /**
     * clears all the data inside
     *
     * @method clear
     */
    clear() {
        this.frame = 0;
        this.last_draw_time = 0;
        this.render_time = 0;
        this.fps = 0;
        this.low_quality_rendering_counter = 0;

        // this.scale = 1;
        // this.offset = [0,0];

        this.dragging_rectangle = null;

        this.selected_nodes = {};
        this.selected_group = null;

        this.visible_nodes = [];
        this.node_dragged = null;
        this.node_over = null;
        this.node_capturing_input = null;
        this.connecting_node = null;
        this.connecting = false; // ment to progressively replace connecting_node
        this.highlighted_links = {};

        this.dragging_canvas = false;

        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
        this.dirty_area = null;

        this.node_in_panel = null;
        this.node_widget = null;

        this.last_mouse = [0, 0];
        this.last_mouseclick = 0;
        this.pointer_is_down = false;
        this.pointer_is_double = false;
        this.visible_area.set([0, 0, 0, 0]);

        // TAG callback graphrenderer event entrypoint
        this.processCallbackHandlers("onClear",{
            def_cb: this.onClear
        });
    }

    /**
     * assigns a graph, you can reassign graphs to the same canvas
     *
     * @method setGraph
     * @param {LGraph} graph
     */
    setGraph(graph, skip_clear) {
        if (this.graph == graph) {
            return;
        }

        if (!skip_clear) {
            this.clear();
        }

        if (!graph) {
            this.graph?.detachCanvas(this);
            return;
        }

        graph.attachCanvas(this);
        LiteGraph.log_debug("lgraphcanvas","setGraph",graph,this);

        // remove the graph stack in case a subgraph was open
        this._graph_stack &&= null;
        this.setDirty(true, true);
    }

    /**
     * returns the top level graph (in case there are subgraphs open on the canvas)
     *
     * @method getTopGraph
     * @return {LGraph} graph
     */
    getTopGraph() {
        if(this._graph_stack.length)
            return this._graph_stack[0];
        return this.graph;
    }

    /**
     * opens a graph contained inside a node in the current graph
     *
     * @method openSubgraph
     * @param {LGraph} graph
     */
    openSubgraph(graph) {
        if (!graph) {
            throw new Error("graph cannot be null");
        }

        if (this.graph == graph) {
            throw new Error("graph cannot be the same");
        }

        this.clear();
        
        if (this.graph) {
            this._graph_stack ||= [];
            this._graph_stack.push(this.graph);
        }

        var prev_graph = this.graph;
        var cbRet = this.processCallbackHandlers("onOpenSubgraph",{
            def_cb: this.onOpenSubgraph
        }, graph, prev_graph);

        graph.attachCanvas(this);
        this.checkPanels();
        
        this.setDirty(true, true);
    }

    /**
     * closes a subgraph contained inside a node
     *
     * @method closeSubgraph
     * @param {LGraph} assigns a graph
     */
    closeSubgraph() {
        if (!this._graph_stack || this._graph_stack.length == 0) {
            return;
        }
        var subgraph_node = this.graph._subgraph_node;
        var prev_graph = this.graph;
        var graph = this._graph_stack.pop();
        this.selected_nodes = {};
        this.highlighted_links = {};

        var cbRet = this.processCallbackHandlers("onCloseSubgraph",{
            def_cb: this.onCloseSubgraph
        }, graph, prev_graph, subgraph_node );

        graph.attachCanvas(this);
        this.setDirty(true, true);
        if (subgraph_node) {
            this.centerOnNode(subgraph_node);
            this.selectNodes([subgraph_node]);
        }
        // when close sub graph back to offset [0, 0] scale 1
        this.ds.offset = [0, 0]
        this.ds.scale = 1
    }

    /**
     * returns the visually active graph (in case there are more in the stack)
     * @method getCurrentGraph
     * @return {LGraph} the active graph
     */
    getCurrentGraph() {
        return this.graph;
    }

    /**
     * assigns a canvas
     *
     * @method setCanvas
     * @param {Canvas} assigns a canvas (also accepts the ID of the element (not a selector)
     */
    setCanvas(canvas, skip_events) {

        if (canvas) {
            if (canvas.constructor === String) {
                canvas = document.getElementById(canvas);
                if (!canvas) {
                    throw new Error("Error creating LiteGraph canvas: Canvas not found");
                }
            }
        }

        if (canvas === this.canvas) {
            return;
        }

        if (!canvas && this.canvas) {
            // maybe detach events from old_canvas
            if (!skip_events) {
                this.unbindEvents();
            }
        }

        this.canvas = canvas;
        this.ds.element = canvas;

        if (!canvas) {
            return;
        }

        // this.canvas.tabindex = "1000";
        canvas.className += " lgraphcanvas";
        canvas.data = this;
        canvas.tabindex = "1"; // to allow key events

        // bg canvas: used for non changing stuff
        this.bgcanvas = document.createElement("canvas");
        this.bgcanvas.width = this.canvas.width;
        this.bgcanvas.height = this.canvas.height;

        if (canvas.getContext == null) {
            if (canvas.localName != "canvas") {
                throw new Error("Element supplied for LGraphCanvas must be a <canvas> element, you passed a "+canvas.localName);
            }
            throw new Error("This browser doesn't support Canvas");
        }

        var ctx = this.ctx = canvas.getContext("2d");
        if (ctx == null) {
            if (!canvas.webgl_enabled) {
                LiteGraph.log_info("This canvas seems to be WebGL, enabling WebGL renderer");
            }
            this.enableWebGL();
        }

        if (!skip_events) {
            
            this.bindEvents();
        }
    }

    // used in some events to capture them
    _doNothing(e) {
        LiteGraph.log_verbose("pointerevents: _doNothing "+e.type);
        e.preventDefault();
        return false;
    }

    _doReturnTrue(e) {
        e.preventDefault();
        return true;
    }

    /**
     * binds mouse, keyboard, touch and drag events to the canvas
     * @method bindEvents
     **/
    bindEvents() {
        if (this._events_binded) {
            LiteGraph.log_warn("LGraphCanvas: events already binded");
            return;
        }
        this._events_binded = true;
        var canvas = this.canvas;
        var ref_window = this.getCanvasWindow();
        var document = ref_window.document; // multiwindows

        LiteGraph.log_info("[lgraphcanvas]", "BINDing events", canvas, document);

        // Pointer
        this._mousedown_callback = this.processMouseDown.bind(this);
        this._mousemove_callback = this.processMouseMove.bind(this);
        this._mouseup_callback = this.processMouseUp.bind(this);
        canvas.addEventListener("pointerdown", this._mousedown_callback); //, true);
        canvas.addEventListener("pointermove", this._mousemove_callback);
        canvas.addEventListener("pointerup", this._mouseup_callback); //, true);
        canvas.addEventListener("contextmenu", this._doNothing);

        // Wheel
        canvas.addEventListener("wheel", this.processMouseWheel);

        // Keyboard
        canvas.addEventListener("keydown", this.processKey);
        document.addEventListener("keyup", this.processKey); // in document, otherwise it doesn't fire keyup

        // Drop
        canvas.addEventListener("dragover", this._doNothing, false);
        canvas.addEventListener("dragend", this._doNothing, false);
        canvas.addEventListener("drop", this.processDrop);
        canvas.addEventListener("dragenter", this._doReturnTrue, false);
    }

    /**
     * unbinds mouse events from the canvas
     * @method unbindEvents
     **/
    unbindEvents() {
        if (!this._events_binded) {
            LiteGraph.log_warn("LGraphCanvas: no events binded");
            return;
        }
        this._events_binded = false;
        var canvas = this.canvas;
        var ref_window = this.getCanvasWindow();
        var document = ref_window.document;
        
        LiteGraph.log_info("[lgraphcanvas]", "UNbinding events", canvas, document);

        // Pointer
        canvas.removeEventListener("pointerdown", this._mousedown_callback); //, true);
        canvas.removeEventListener("pointermove", this._mousemove_callback);
        canvas.removeEventListener("pointerup", this._mouseup_callback); //, true);
        canvas.removeEventListener("contextmenu", this._doNothing);

        // Wheel
        canvas.removeEventListener("wheel", this.processMouseWheel);

        // Keyboard
        canvas.removeEventListener("keydown", this.processKey);
        document.removeEventListener("keyup", this.processKey);

        // Drop
        canvas.removeEventListener("dragover", this._doNothing, false);
        canvas.removeEventListener("dragend", this._doNothing, false);
        canvas.removeEventListener("drop", this.processDrop);
        canvas.removeEventListener("dragenter", this._doReturnTrue, false);

        this._mousedown_callback = null;

    }

    static getFileExtension(url) {
        // const urlObj = new URL(url);
        // const path = urlObj.pathname;
        // const lastDotIndex = path.lastIndexOf(".");
        // if (lastDotIndex === -1) return "";
        // return path.slice(lastDotIndex + 1).toLowerCase();
        url = url ? url+"" : "";
        return url.slice((url.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }

    /**
     * this function allows to render the canvas using WebGL instead of Canvas2D
     * this is useful if you plant to render 3D objects inside your nodes, it uses litegl.js for webgl and canvas2DtoWebGL to emulate the Canvas2D calls in webGL
     * @method enableWebGL
     **/
    enableWebGL() {
        if (typeof GL === "undefined") {
            throw new Error("litegl.js must be included to use a WebGL canvas");
        }
        if (typeof enableWebGLCanvas === "undefined") {
            throw new Error("webglCanvas.js must be included to use this feature");
        }

        this.gl = this.ctx = enableWebGLCanvas(this.canvas);
        this.ctx.webgl = true;
        this.bgcanvas = this.canvas;
        this.bgctx = this.gl;
        this.canvas.webgl_enabled = true;

        /*
    GL.create({ canvas: this.bgcanvas });
    this.bgctx = enableWebGLCanvas( this.bgcanvas );
    window.gl = this.gl;
    */
    }

    /**
     * marks as dirty the canvas, this way it will be rendered again
     *
     * @class LGraphCanvas
     * @method setDirty
     * @param {bool} fgcanvas if the foreground canvas is dirty (the one containing the nodes)
     * @param {bool} bgcanvas if the background canvas is dirty (the one containing the wires)
     */
    setDirty(fgcanvas, bgcanvas) {
        if (fgcanvas) {
            this.dirty_canvas = true;
        }
        if (bgcanvas) {
            this.dirty_bgcanvas = true;
        }
    }

    /**
     * Used to attach the canvas in a popup
     *
     * @method getCanvasWindow
     * @return {window} returns the window where the canvas is attached (the DOM root node)
     */
    getCanvasWindow() {
        if (!this.canvas) {
            return window;
        }
        var doc = this.canvas.ownerDocument;
        return doc.defaultView ?? doc.parentWindow;
    }

    /**
     * starts rendering the content of the canvas when needed
     *
     * @method startRendering
     */
    startRendering() {
        if (this.is_rendering) {
            return;
        } // already rendering

        this.is_rendering = true;
        renderFrame.call(this);

        function renderFrame() {
            if (!this.pause_rendering) {
                this.draw();
            }

            var window = this.getCanvasWindow();
            if (this.is_rendering) {
                window.requestAnimationFrame(renderFrame.bind(this));
            }
        }
    }

    /**
     * stops rendering the content of the canvas (to save resources)
     *
     * @method stopRendering
     */
    stopRendering() {
        this.is_rendering = false;
        /*
    if(this.rendering_timer_id)
    {
        clearInterval(this.rendering_timer_id);
        this.rendering_timer_id = null;
    }
    */
    }

    /* LiteGraphCanvas input */

    // used to block future mouse events (because of im gui)
    blockClick() {
        this.block_click = true;
        this.last_mouseclick = 0;
    }

    processUserInputDown(e) {

        if(this.pointer_is_down && e.isPrimary !== undefined && !e.isPrimary) {
            this.userInput_isNotPrimary = true;
            // DBG("pointerevents: userInput_isNotPrimary start");
            LiteGraph.log_debug("lgraphcanvas","processUserInputDown","userInput_isNotPrimary",e);
        } else {
            this.userInput_isNotPrimary = false;
        }

        this.userInput_type = e.pointerType?e.pointerType:false;
        this.userInput_id = e.pointerId?e.pointerId:false;

        if (e.pointerType) {
            switch (e.pointerType) {
                case "mouse":
                    break;
                case "pen":
                    break;
                case "touch":
                    break;
                default:
                    LiteGraph.log_debug("pointerType unknown " + ev.pointerType);
            }
        }

        if (e.button !== undefined) {
            this.userInput_button = e.button;
            LiteGraph.log_verbose("input button ",e.button);
            switch(e.button) {
                case -1: // no changes since last event
                case 0: // Left Mouse, Touch Contact, Pen contact
                case 1: // Middle Mouse
                case 2: // Right Mouse, Pen barrel button
                case 3: // X1 (back) Mouse
                case 4: // X2 (forward) Mouse
                case 5: // Pen eraser button
                default: // ?? move without touches
            }
        }
        if (e.buttons !== undefined) {
            this.userInput_button_s = e.buttons;
            LiteGraph.log_verbose("input button_S ",e.buttons);
        }

        this.userInput_touches = (e.changedTouches!==undefined && e.changedTouches.length!==undefined) ? e.changedTouches : false;
        if (this.userInput_touches && this.userInput_touches.length) {
            LiteGraph.log_debug("check multiTouches",e.changedTouches);
        }

        return this.processMouseDown(e);
    }

    processMouseDown(e) {

        if( this.set_canvas_dirty_on_mouse_event )
            this.dirty_canvas = true;

        if (!this.graph) {
            return;
        }

        this.adjustMouseEvent(e);

        var ref_window = this.getCanvasWindow();
        LGraphCanvas.active_canvas = this;

        // processing mouseDown for all canvas ?

        var x = e.clientX;
        var y = e.clientY;
        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "pointerId:"+e.pointerId+" which:"+e.which+" isPrimary:"+e.isPrimary+" :: x y "+x+" "+y,"previousClick",this.last_mouseclick,"diffTimeClick",(this.last_mouseclick?LiteGraph.getTime()-this.last_mouseclick:"notlast"),"userInput_isNotPrimary",this.userInput_isNotPrimary);
        LiteGraph.log_verbose("coordinates",x,y,this.viewport, "canvas coordinates", e.canvasX, e.canvasY);

        this.ds.viewport = this.viewport;
        var is_inside = !this.viewport || ( this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]) );

        // move mouse move event to the window in case it drags outside of the canvas
        if(!this.options.skip_events) {
            this.canvas.removeEventListener("pointermove", this._mousemove_callback);
            ref_window.document.addEventListener("pointermove", this._mousemove_callback,true); // catch for the entire window
            ref_window.document.addEventListener("pointerup", this._mouseup_callback,true);
        }

        if(!is_inside) {
            return;
        }

        var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes, 5 );
        var skip_action = false;
        var now = LiteGraph.getTime();
        var is_primary = (e.isPrimary === undefined || e.isPrimary);
        var is_double_click = (now - this.last_mouseclick < 300) && is_primary;
        this.mouse[0] = e.clientX;
        this.mouse[1] = e.clientY;
        this.graph_mouse[0] = e.canvasX;
        this.graph_mouse[1] = e.canvasY;
        this.last_click_position = [this.mouse[0],this.mouse[1]];

        if (this.pointer_is_down && is_primary ) {
            this.pointer_is_double = true;
            LiteGraph.log_verbose("pointerevents: pointer_is_double start");
        }else{
            this.pointer_is_double = false;
        }
        this.pointer_is_down = true;
        this.canvas.focus();
        
        LiteGraph.ContextMenuClass.closeAll(ref_window);
        
        // if (this.onMouse?.(e))
        //     return;

        // TAG callback graphrenderer event entrypoint
        var cbRet = this.processCallbackHandlers("onClear",{
            def_cb: this.onMouse
        }, e );
        if((typeof(cbRet)!="undefined" && cbRet!==null) && (cbRet === false || (typeof(cbRet)=="object" && cbRet.return_value === false))){
            LiteGraph.log_info("lgraphcanvas", "processMouseDown", "callback prevents continue");
            return;
        }

        // left button mouse / single finger
        if (e.which == 1 && !this.userInput_isNotPrimary) {

            if (e.ctrlKey) {
                LiteGraph.log_debug("lgraphcanvas", "processMouseDown","starting box selection");
                this.dragging_rectangle = new Float32Array(4);
                this.dragging_rectangle[0] = e.canvasX;
                this.dragging_rectangle[1] = e.canvasY;
                this.dragging_rectangle[2] = 1;
                this.dragging_rectangle[3] = 1;
                skip_action = true;
            }

            // clone node ALT dragging
            if (LiteGraph.alt_drag_do_clone_nodes && e.altKey && node && this.allow_interaction && !skip_action && !this.read_only) {
                LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "cloning node");
                let original_node = node;
                let cloned = node.clone();
                if (cloned) {
                    cloned.pos[0] += 5;
                    cloned.pos[1] += 5;
                    this.graph.add(cloned,false,{doCalcSize: false});
                    node = cloned;

                    if( LiteGraph.alt_shift_drag_connect_clone_with_input && e.shiftKey ) {
                        // process links
                        LiteGraph.log_verbose("lgraphcanvas", "processMouseDown", "altCloned",original_node,node);
                        if (original_node.inputs && original_node.inputs.length) {
                            // DBG("cycle original inputs",original_node.inputs);
                            for (var j = 0; j < original_node.inputs.length; ++j) {
                                var input = original_node.inputs[j];
                                if (!input || input.link == null) {
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "processMouseDown", "alt drag cloning", "not input link",input);
                                    continue;
                                }
                                var ob_link = this.graph.links[input.link];
                                if (!ob_link) {
                                    LiteGraph.log_warn("lgraphcanvas", "processMouseDown", "not graph link info for input",input,original_node);
                                    continue;
                                }
                                if (ob_link.type === LiteGraph.EVENT) {
                                    // TODO put a sequencer in the middle or implement multi input
                                    LiteGraph.log_info("lgraphcanvas", "processMouseDown", "alt drag cloning", "skip moving events",input);
                                    continue;
                                }
                                var source_node;
                                if (ob_link.origin_id) {
                                    source_node = this.graph.getNodeById(ob_link.origin_id);
                                }
                                var target_node = node;
                                if( source_node && target_node ) {
                                    LiteGraph.log_verbose("lgraphcanvas", "processMouseDown", "alt drag cloning", "connect newly created",source_node,target_node,ob_link);
                                    // DBG LiteGraph.log_info("connect cloned node",ob_link.origin_slot, target_node, ob_link.target_slot);
                                    source_node.connect(ob_link.origin_slot, target_node, ob_link.target_slot);
                                }
                            }
                        }
                    }

                    skip_action = true;
                    if (!block_drag_node) {
                        if (this.allow_dragnodes) {
                            this.graph.beforeChange();
                            this.node_dragged = node;
                        }
                        if (!this.selected_nodes[node.id]) {
                            this.processNodeSelected(node, e);
                        }
                    }
                }
            }

            var clicking_canvas_bg = false;

            // when clicked on top of a node
            // and it is not interactive
            // or action skipped or read_only
            if (node && (this.allow_interaction || node.flags.allow_interaction) && !skip_action && !this.read_only) {
                LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicking on node");
                if (!this.live_mode && !node.flags.pinned) {
                    this.bringToFront(node);
                } // if it wasn't selected?

                // not dragging mouse to connect two slots
                // interaction allowed, not collpased, not live_mode
                if ( this.allow_interaction && !this.connecting_node && !node.flags.collapsed && !this.live_mode ) {
                    // Search for corner for resize
                    if ( !skip_action &&
                        node.resizable !== false &&
                        LiteGraph.isInsideRectangle(
                            e.canvasX,
                            e.canvasY,
                            node.pos[0] + node.size[0] - 9,
                            node.pos[1] + node.size[1] - 9,
                            18,
                            18,
                        )
                    ) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "start resizing node");
                        this.graph.beforeChange();
                        this.resizing_node = node;
                        this.canvas.style.cursor = "se-resize";
                        skip_action = true;
                    } else {
                        // search for outputs
                        if (node.outputs) {
                            for ( let i = 0, l = node.outputs.length; i < l; ++i ) {
                                let output = node.outputs[i];
                                let link_pos = node.getConnectionPos(false, i);
                                if (
                                    LiteGraph.isInsideRectangle(
                                        e.canvasX,
                                        e.canvasY,
                                        link_pos[0] - 15,
                                        link_pos[1] - 10,
                                        30,
                                        20,
                                    )
                                ) {
                                    this.connecting_node = node;
                                    this.connecting_output = output;
                                    this.connecting_output.slot_index = i;
                                    this.connecting_pos = node.getConnectionPos( false, i );
                                    this.connecting_slot = i;
                                    LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on output slot", node, output);
                                    
                                    if (LiteGraph.shift_click_do_break_link_from) {
                                        // break with shift
                                        if (e.shiftKey) {
                                            node.disconnectOutput(i);
                                        }
                                    }else{
                                        // move with shift
                                        if (e.shiftKey) { // || this.move_source_link_without_shift
                                            LiteGraph.log_debug("lgraphcanvas","processMouseDown","will move link source slot"
                                                    ,this.connecting_node
                                                    ,this.connecting_slot
                                                    ,this.connecting_output
                                                    ,this.connecting_pos);

                                            // this.connecting_node
                                            // this.connecting_output

                                            var aOLinks = [];
                                            var aONodes = [];
                                            var aOSlots = [];
                                            var aConnectingInputs = [];
                                            if (output.links !== null && output.links.length) {
                                                for(let il in output.links){
                                                    let oNodeX = false;
                                                    let oLnkX = this.graph.links[output.links[il]];
                                                    if(oLnkX && this.graph._nodes_by_id[oLnkX.target_id]){
                                                        oNodeX = this.graph._nodes_by_id[oLnkX.target_id];
                                                        if(oNodeX){
                                                            aOLinks.push(oLnkX);
                                                            aONodes.push(oNodeX);
                                                            aOSlots.push(oLnkX.target_slot);
                                                            aConnectingInputs.push({node: oNodeX, slot: oLnkX.target_slot, link: oLnkX});
                                                        }
                                                    }
                                                }
                                            }

                                            // WIP implemented multi links ....
                                            // TODO use a trick for now: visually dragging one and check ther rest later on

                                            if(aOLinks.length){
                                                // should disconnect output
                                                node.disconnectOutput(i);
                                                this.connecting_output = false;

                                                this.connecting = {inputs: aConnectingInputs};
                                                LiteGraph.log_debug("lgraphcanvas","processMouseDown","moving links source slot",this.connecting);

                                                let link_info = aOLinks[0];
                                                this.connecting_node = this.graph._nodes_by_id[link_info.target_id];
                                                this.connecting_slot = link_info.target_slot;
                                                this.connecting_input = this.connecting_node.inputs[this.connecting_slot];
                                                // this.connecting_input.slot_index = this.connecting_slot;
                                                this.connecting_pos = this.connecting_node.getConnectionPos( true, this.connecting_slot );
                                                this.dirty_bgcanvas = true;
                                                skip_action = true;
                                            }
                                        }
                                    }

                                    if (is_double_click) {
                                        // TAG callback node event entrypoint
                                        node.processCallbackHandlers("onOutputDblClick",{
                                            def_cb: node.onOutputDblClick
                                        }, i, e );
                                    } else {
                                        // TAG callback node event entrypoint
                                        node.processCallbackHandlers("onOutputClick",{
                                            def_cb: node.onOutputClick
                                        }, i, e );
                                    }

                                    skip_action = true;
                                    break;
                                }
                            }
                        }

                        // search for inputs
                        if (node.inputs) {
                            for ( let i = 0, l = node.inputs.length; i < l; ++i ) {
                                let input = node.inputs[i];
                                let link_pos = node.getConnectionPos(true, i);
                                if (
                                    LiteGraph.isInsideRectangle(
                                        e.canvasX,
                                        e.canvasY,
                                        link_pos[0] - 15,
                                        link_pos[1] - 10,
                                        30,
                                        20,
                                    )
                                ) {
                                    LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on input slot", node, input);
                                    if (is_double_click) {
                                        // TAG callback node event entrypoint
                                        node.processCallbackHandlers("onInputDblClick",{
                                            def_cb: node.onInputDblClick
                                        }, i, e );
                                    } else {
                                        // TAG callback node event entrypoint
                                        node.processCallbackHandlers("onInputClick",{
                                            def_cb: node.onInputDblClick
                                        }, i, e );
                                    }

                                    if (input.link !== null) {
                                        var link_info = this.graph.links[
                                            input.link
                                        ]; // before disconnecting
                                        if (LiteGraph.click_do_break_link_to) {
                                            node.disconnectInput(i);
                                            this.dirty_bgcanvas = true;
                                            skip_action = true;
                                        }else{
                                            // do same action as has not node ?
                                        }

                                        if (
                                            // this.allow_reconnect_links ||
                                            // this.move_destination_link_without_shift ||
                                            e.shiftKey
                                        ) {
                                            if (!LiteGraph.click_do_break_link_to) {
                                                node.disconnectInput(i);
                                            }
                                            this.connecting_node = this.graph._nodes_by_id[link_info.origin_id];
                                            this.connecting_slot = link_info.origin_slot;
                                            this.connecting_output = this.connecting_node.outputs[this.connecting_slot];
                                            this.connecting_pos = this.connecting_node.getConnectionPos( false, this.connecting_slot );
                                            LiteGraph.log_debug("lgraphcanvas","processMouseDown","moving link destination slot",this.connecting_node,this.connecting_slot,this.connecting_output,this.connecting_pos);
                                            this.dirty_bgcanvas = true;
                                            skip_action = true;
                                        }


                                    }else{
                                        // has not node
                                    }

                                    if (!skip_action) {
                                        // connect from in to out, from to to from
                                        this.connecting_node = node;
                                        this.connecting_input = input;
                                        this.connecting_input.slot_index = i;
                                        this.connecting_pos = node.getConnectionPos( true, i );
                                        this.connecting_slot = i;

                                        this.dirty_bgcanvas = true;
                                        skip_action = true;
                                    }
                                }
                            }
                        }
                    } // not resizing
                }

                // it wasn't clicked on the links boxes, nor on slots
                if (!skip_action) {
                    LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "check clicked on node", node);
                    var block_drag_node = false;
                    var pos = [e.canvasX - node.pos[0], e.canvasY - node.pos[1]];

                    // widgets
                    var widget = this.processNodeWidgets( node, this.graph_mouse, e );
                    if (widget) {
                        block_drag_node = true;
                        this.node_widget = [node, widget];
                    }

                    let cbRet = null;

                    // double clicking
                    if (this.allow_interaction && is_double_click && this.selected_nodes[node.id]) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "double clicked on node", node);
                        // TAG callback node event entrypoint
                        cbRet = node.processCallbackHandlers("onDblClick",{
                            def_cb: node.onDblClick
                        }, e, pos, this );
                        if ( cbRet!==null && (cbRet === true || (typeof(cbRet)=="object" && cbRet.return_value)) ) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "dragging blocked by onDblClick", cbRet);
                        }else{
                            this.processNodeDblClicked(node);
                        }
                        block_drag_node = true;
                    }

                    // TAG callback node event entrypoint
                    cbRet = node.processCallbackHandlers("onMouseDown",{
                        def_cb: node.onMouseDown
                    }, e, pos, this );
                    
                    // if do not capture mouse
                    if ( cbRet!==null && (cbRet === true || (typeof(cbRet)=="object" && cbRet.return_value)) ) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "dragging blocked by onMouseDownCbRet", cbRet);
                        block_drag_node = true;
                    } else {
                        // open subgraph button
                        if(node.subgraph && !node.skip_subgraph_button) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on subgraph");
                            if ( !node.flags.collapsed && pos[0] > node.size[0] - LiteGraph.NODE_TITLE_HEIGHT && pos[1] < 0 ) {
                                setTimeout(() => {
                                    this.openSubgraph(node.subgraph);
                                }, 10);
                            }
                        }

                        if (this.live_mode) {
                            clicking_canvas_bg = true;
                            block_drag_node = true;
                        }
                    }

                    if (!block_drag_node) {
                        if (this.allow_dragnodes) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "started dragging",node);
                            this.graph.beforeChange();
                            this.node_dragged = node;
                        }
                        this.processNodeSelected(node, e);
                    } else {
                        /**
                         * Don't call the function if the block is already selected.
                         * Otherwise, it could cause the block to be unselected while its panel is open.
                         */
                        if (!node.is_selected){
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "node selected",node);
                            this.processNodeSelected(node, e);
                        }
                    }

                    this.dirty_canvas = true;
                }
            } else { // clicked outside of nodes
                LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked outside nodes");
                if (!skip_action) {

                    // search for mouseDown on LINKS
                    if(!this.read_only) {
                        for (let i = 0; i < this.visible_links.length; ++i) {
                            var link = this.visible_links[i];
                            var center = link._pos;
                            if (
                                !center ||
                                e.canvasX < center[0] - 4 ||
                                e.canvasX > center[0] + 4 ||
                                e.canvasY < center[1] - 4 ||
                                e.canvasY > center[1] + 4
                            ) {
                                continue;
                            }
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on link",link);
                            // link clicked
                            this.showLinkMenu(link, e);
                            this.over_link_center = null; // clear tooltip
                            break;
                        }
                    }

                    // search for mouseDown on GROUPS
                    this.selected_group = this.graph.getGroupOnPos( e.canvasX, e.canvasY );
                    this.selected_group_resizing = false;
                    if (this.selected_group && !this.read_only ) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on group",link);
                        if (e.ctrlKey) {
                            this.dragging_rectangle = null;
                        }

                        var dist = LiteGraph.distance( [e.canvasX, e.canvasY], [ this.selected_group.pos[0] + this.selected_group.size[0], this.selected_group.pos[1] + this.selected_group.size[1] ] );
                        if (dist * this.ds.scale < this.options.groups_triangle_handler_size) {
                            this.selected_group_resizing = true;
                        } else {
                            this.selected_group.recomputeInsideNodes();
                        }
                    }

                    if (is_double_click && !this.read_only && this.allow_searchbox) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "showing search box");
                        this.showSearchBox(e);
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    LiteGraph.log_debug("DEBUG canvas click is_double_click,this.allow_searchbox",is_double_click,this.allow_searchbox);
                    clicking_canvas_bg = true;
                }
            }

            if (!skip_action && clicking_canvas_bg && this.allow_dragcanvas) {
                LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "dragging_canvas start");
                this.dragging_canvas = true;
            }

        } else if (e.which == 2) {
            // middle button

            if (LiteGraph.middle_click_slot_add_default_node) {
                if (node && this.allow_interaction && !skip_action && !this.read_only) {
                    // not dragging mouse to connect two slots
                    if (
                        !this.connecting_node &&
                        !node.flags.collapsed &&
                        !this.live_mode
                    ) {
                        var mClikSlot = false;
                        var mClikSlot_index = false;
                        var mClikSlot_isOut = false;
                        // search for outputs
                        if (node.outputs) {
                            for ( let i = 0, l = node.outputs.length; i < l; ++i ) {
                                var output = node.outputs[i];
                                let link_pos = node.getConnectionPos(false, i);
                                if (LiteGraph.isInsideRectangle(e.canvasX,e.canvasY,link_pos[0] - 15,link_pos[1] - 10,30,20)) {
                                    mClikSlot = output;
                                    mClikSlot_index = i;
                                    mClikSlot_isOut = true;
                                    break;
                                }
                            }
                        }

                        // search for inputs
                        if (node.inputs) {
                            for ( let i = 0, l = node.inputs.length; i < l; ++i ) {
                                let input_clk = node.inputs[i];
                                let link_pos = node.getConnectionPos(true, i);
                                if (LiteGraph.isInsideRectangle(e.canvasX,e.canvasY,link_pos[0] - 15,link_pos[1] - 10,30,20)) {
                                    mClikSlot = input_clk;
                                    mClikSlot_index = i;
                                    mClikSlot_isOut = false;
                                    break;
                                }
                            }
                        }
                        LiteGraph.log_verbose("middleClickSlots? "+mClikSlot+" & "+(mClikSlot_index!==false));
                        if (mClikSlot && mClikSlot_index!==false) {

                            var alphaPosY = 0.5-((mClikSlot_index+1)/((mClikSlot_isOut?node.outputs.length:node.inputs.length)));
                            var node_bounding = node.getBounding();
                            // estimate a position: this is a bad semi-bad-working mess .. REFACTOR with a correct autoplacement that knows about the others slots and nodes
                            var posRef = [
                                (!mClikSlot_isOut?node_bounding[0]:node_bounding[0]+node_bounding[2]),// + node_bounding[0]/this.canvas.width*150
                                e.canvasY-80,// + node_bounding[0]/this.canvas.width*66 // vertical "derive"
                            ];
                            this.createDefaultNodeForSlot({
                                nodeFrom: !mClikSlot_isOut?null:node,
                                slotFrom: !mClikSlot_isOut?null:mClikSlot_index,
                                nodeTo: !mClikSlot_isOut?node:null,
                                slotTo: !mClikSlot_isOut?mClikSlot_index:null,
                                position: posRef, // ,e: e
                                nodeType: "AUTO", // nodeNewType
                                posAdd: [!mClikSlot_isOut?-30:30, -alphaPosY*130], // -alphaPosY*30]
                                posSizeFix: [!mClikSlot_isOut?-1:0, 0], // -alphaPosY*2*/
                            });

                        }
                    }
                }
            } else if (!skip_action && this.allow_dragcanvas) {
                LiteGraph.log_verbose("pointerevents: dragging_canvas start from middle button");
                this.dragging_canvas = true;
            }


        } else if (e.which == 3 || (LiteGraph.two_fingers_opens_menu && this.userInput_isNotPrimary)) {

            // right button
            if (this.allow_interaction && !skip_action && !this.read_only) {

                // is it hover a node ?
                if (node) {
                    if(Object.keys(this.selected_nodes).length
                        && (this.selected_nodes[node.id] || e.shiftKey || e.ctrlKey || e.metaKey)
                    ) {
                        // is multiselected or using shift to include the now node
                        if (!this.selected_nodes[node.id]) this.selectNodes([node],true); // add this if not present
                    }else{
                        // update selection
                        this.selectNodes([node]);
                    }
                }

                // show menu on this node
                this.processContextMenu(node, e);
            }

        }

        // TODO
        // if(this.node_selected != prev_selected)
        //	this.onNodeSelectionChange(this.node_selected);

        this.last_mouse[0] = e.clientX;
        this.last_mouse[1] = e.clientY;
        this.last_mouseclick = LiteGraph.getTime();
        this.last_mouse_dragging = true;

        /*
        if( (this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null)
            this.draw();
        */

        this.graph.change();

        // this is to ensure to defocus(blur) if a text input element is on focus
        if (
            !ref_window.document.activeElement ||
            (   ref_window.document.activeElement.nodeName.toLowerCase() != "input"
                && ref_window.document.activeElement.nodeName.toLowerCase() != "textarea"
            )
        ) {
            e.preventDefault();
        }
        e.stopPropagation();
        // TAG callback graphrenderer event entrypoint
        this.processCallbackHandlers("onMouseDown",{
            def_cb: this.onMouseDown
        }, e );
        return false;
    }

    /**
     * Called when a mouse move event has to be processed
     * @method processMouseMove
     **/
    processMouseMove(e) {
        if (this.autoresize) {
            this.resize(); // ? really ? every mouse move ? TODO move this
        }

        if( this.set_canvas_dirty_on_mouse_event ){
            this.dirty_canvas = true;
        }

        if (!this.graph) {
            LiteGraph.log_warn("lgraphcanvas", "processMouseMove", "no canvas ref");
            return;
        }

        LGraphCanvas.active_canvas = this;
        this.adjustMouseEvent(e);
        var mouse = [e.clientX, e.clientY];
        this.mouse[0] = mouse[0];
        this.mouse[1] = mouse[1];
        var delta = [
            mouse[0] - this.last_mouse[0],
            mouse[1] - this.last_mouse[1],
        ];
        this.last_mouse = mouse;
        this.graph_mouse[0] = e.canvasX;
        this.graph_mouse[1] = e.canvasY;

        // DBG EXCESS LiteGraph.log_verbose("pointerevents: processMouseMove "+e.pointerId+" "+e.isPrimary);

        // TODO CHECK ensure block_click should prevent all following 
        if(this.block_click) {
            LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "block_click");
            e.preventDefault();
            return false;
        }

        this.over_widget = false; // will set again later on here

        e.dragging = this.last_mouse_dragging;

        // pass event to active widget (previously)clicked
        if (this.node_widget) {
            this.processNodeWidgets(
                this.node_widget[0],
                this.graph_mouse,
                e,
                this.node_widget[1],
            );
            this.dirty_canvas = true;
        }

        // get node over
        var node = this.graph.getNodeOnPos(e.canvasX,e.canvasY,this.visible_nodes);
        this.over_node = node;
        
        if (this.dragging_rectangle) {
            LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "making rectangle");
            this.dragging_rectangle[2] = e.canvasX - this.dragging_rectangle[0];
            this.dragging_rectangle[3] = e.canvasY - this.dragging_rectangle[1];
            this.dirty_canvas = true;
        } else if (this.selected_group && !this.read_only) {
            // moving/resizing a group
            if (this.selected_group_resizing) {
                LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "resizing group");
                this.selected_group.size = [
                    e.canvasX - this.selected_group.pos[0],
                    e.canvasY - this.selected_group.pos[1],
                ];
            } else {
                LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "dragging group");
                var deltax = delta[0] / this.ds.scale;
                var deltay = delta[1] / this.ds.scale;
                this.selected_group.move(deltax, deltay, e.ctrlKey);
                if (this.selected_group._nodes.length) {
                    this.dirty_canvas = true;
                }
                if(deltax || deltay){
                    this.processCallbackHandlers("onGroupMoving",{
                        def_cb: this.onGroupMoving
                    }, this.selected_group, deltax, deltay );
                }
            }
            this.dirty_bgcanvas = true;
        } else if (this.dragging_canvas) {
            LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "dragging_canvas");
            this.ds.offset[0] += delta[0] / this.ds.scale;
            this.ds.offset[1] += delta[1] / this.ds.scale;
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
        } else if ((this.allow_interaction || (node && node.flags.allow_interaction)) && !this.read_only) {
            if (this.connecting_node) {
                this.dirty_canvas = true;
            }

            // remove mouseover flag
            for (let i = 0, l = this.graph._nodes.length; i < l; ++i) {
                if (this.graph._nodes[i].mouseOver && node != this.graph._nodes[i] ) {
                    // mouse leave
                    this.graph._nodes[i].mouseOver = false;
                    if (this.node_over) {
                        // TAG callback node event entrypoint
                        this.node_over.processCallbackHandlers("onMouseLeave",{
                            def_cb: this.node_over.onMouseLeave
                        }, e );
                    }
                    this.node_over = null;
                    this.dirty_canvas = true;
                }
            }

            // mouse over a node
            if (node) {

                if(node.redraw_on_mouse)
                    this.dirty_canvas = true;

                // this.canvas.style.cursor = "move";
                if (!node.mouseOver) {
                    // mouse enter
                    node.mouseOver = true;
                    this.node_over = node;
                    this.dirty_canvas = true;
                    // TAG callback node event entrypoint
                    node.processCallbackHandlers("onMouseEnter",{
                        def_cb: node.onMouseEnter
                    }, e );
                }

                // in case the node wants to do something
                // TAG callback node event entrypoint
                node.processCallbackHandlers("onMouseMove",{
                    def_cb: node.onMouseMove
                }, e, [e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this );

                // TODO replace processNodeWidgets for dedicated method to just checking overing: implement int processNodeWidgets too
                var widgetOver = this.processNodeWidgets( node, this.graph_mouse ); // not passing event! just check, e );
                if (widgetOver){
                    this.over_widget = widgetOver;
                }

                // if dragging a link
                if (this.connecting_node) {
                    let pos;
                    if (this.connecting_output) {

                        pos = this._highlight_input || [0, 0]; // to store the output of isOverNodeInput

                        // on top of input
                        if (!this.isOverNodeBox(node, e.canvasX, e.canvasY)) {
                            // check if I have a slot below de mouse
                            let slot = this.isOverNodeInput( node, e.canvasX, e.canvasY, pos );
                            if (slot != -1 && node.inputs[slot]) {
                                let slot_type = node.inputs[slot].type;
                                if ( LiteGraph.isValidConnection( this.connecting_output.type, slot_type ) ) {
                                    this._highlight_input = pos;
                                    this._highlight_input_slot = node.inputs[slot]; // @TODO CHECK THIS
                                }
                            } else {
                                this._highlight_input = null;
                                this._highlight_input_slot = null; // @TODO CHECK THIS
                            }
                        }

                    }else if(this.connecting_input) {

                        pos = this._highlight_output || [0, 0]; // to store the output of isOverNodeOutput

                        // on top of output
                        if (this.isOverNodeBox(node, e.canvasX, e.canvasY)) {
                            // check if I have a slot below de mouse
                            let slot = this.isOverNodeOutput( node, e.canvasX, e.canvasY, pos );
                            if (slot != -1 && node.outputs[slot]) {
                                let slot_type = node.outputs[slot].type;
                                if ( LiteGraph.isValidConnection( this.connecting_input.type, slot_type ) ) {
                                    this._highlight_output = pos;
                                }
                            } else {
                                this._highlight_output = null;
                            }
                        }
                    }
                }

                // Search for corner
                if (this.canvas) {
                    if (
                        LiteGraph.isInsideRectangle(
                            e.canvasX,
                            e.canvasY,
                            node.pos[0] + node.size[0] - 5,
                            node.pos[1] + node.size[1] - 5,
                            5,
                            5,
                        )
                    ) {
                        this.canvas.style.cursor = "se-resize";
                    } else {
                        this.canvas.style.cursor = "crosshair";
                    }
                }
            } else { // not over a node

                // search for link connector
                var over_link = null;
                for (let i = 0; i < this.visible_links.length; ++i) {
                    var link = this.visible_links[i];
                    var center = link._pos;
                    if (
                        !center ||
                        e.canvasX < center[0] - 4 ||
                        e.canvasX > center[0] + 4 ||
                        e.canvasY < center[1] - 4 ||
                        e.canvasY > center[1] + 4
                    ) {
                        continue;
                    }
                    over_link = link;
                    break;
                }
                if( over_link != this.over_link_center ) {
                    this.over_link_center = over_link;
                    this.dirty_canvas = true;
                }

                if (this.canvas) {
                    this.canvas.style.cursor = "";
                }
            } // end

            // send event to node if capturing input (used with widgets that allow drag outside of the area of the node)
            if ( this.node_capturing_input && this.node_capturing_input != node ) {
                // TAG callback node event entrypoint
                this.node_capturing_input.processCallbackHandlers("onMouseMove",{
                    def_cb: this.node_capturing_input.onMouseMove
                }, e,[e.canvasX - this.node_capturing_input.pos[0],e.canvasY - this.node_capturing_input.pos[1]], this );
            }

            // node being dragged
            if (this.node_dragged && !this.live_mode) {
                LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "draggin!",this.selected_nodes);
                for (let i in this.selected_nodes) {
                    let n = this.selected_nodes[i];
                    let off = [delta[0] / this.ds.scale, delta[1] / this.ds.scale];
                    n.pos[0] += off[0];
                    n.pos[1] += off[1];
                    if (!n.is_selected) this.processNodeSelected(n, e);
                    // Don't call the function if the block is already selected. Otherwise, it could cause the block to be unselected while dragging.
                    n.processCallbackHandlers("onDrag",{
                        def_cb: n.onDrag
                    }, off );
                }

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
            }

            if (this.resizing_node && !this.live_mode) {
                // convert mouse to node space
                var desired_size = [ e.canvasX - this.resizing_node.pos[0], e.canvasY - this.resizing_node.pos[1] ];
                var min_size = this.free_resize?LiteGraph.NODE_MIN_SIZE:this.resizing_node.computeSize(); //this.resizing_node.size_basic; // .computeSize();
                desired_size[0] = Math.max( min_size[0], desired_size[0] );
                desired_size[1] = Math.max( min_size[1], desired_size[1] );
                this.resizing_node.setSize( desired_size );

                this.canvas.style.cursor = "se-resize";
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
            }
        }else{
            if(this.read_only){
                LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "canvas is read only", this);
            }else{
                // interaction not allowed
                LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "interaction not allowed (nor canvas and node)", this.allow_interaction, node.flags);
            } 
        }

        e.preventDefault();
        return false;
    }

    /**
     * Called when a mouse up event has to be processed
     * @method processMouseUp
     **/
    processMouseUp(e) {

        var is_primary = ( e.isPrimary === undefined || e.isPrimary );

        // early exit for extra pointer
        if(!is_primary) {
            /* e.stopPropagation();
            e.preventDefault();*/
            LiteGraph.log_verbose("pointerevents: processMouseUp pointerN_stop "+e.pointerId+" "+e.isPrimary);
            return false;
        }

        LiteGraph.log_verbose("pointerevents: processMouseUp "+e.pointerId+" "+e.isPrimary+" :: "+e.clientX+" "+e.clientY);

        if( this.set_canvas_dirty_on_mouse_event )
            this.dirty_canvas = true;

        if (!this.graph){
            LiteGraph.log_warn("lgraphcanvas", "processMouseUp", "has not graph", this);
            return;
        }

        var window = this.getCanvasWindow();
        var document = window.document;
        LGraphCanvas.active_canvas = this;

        // restore the mousemove event back to the canvas
        if(!this.options.skip_events) {
            LiteGraph.log_verbose("pointerevents: processMouseUp restoreEventListener");
            document.removeEventListener("pointermove", this._mousemove_callback,true);
            this.canvas.addEventListener("pointermove", this._mousemove_callback);
            document.removeEventListener("pointerup", this._mouseup_callback,true);
        }

        this.adjustMouseEvent(e);
        var now = LiteGraph.getTime();
        e.click_time = now - this.last_mouseclick;
        this.last_mouse_dragging = false;
        this.last_click_position = null;

        if(this.block_click) {
            LiteGraph.log_verbose("pointerevents: processMouseUp block_clicks");
            this.block_click = false; // used to avoid sending twice a click in a immediate button
        }

        LiteGraph.log_debug("pointerevents: processMouseUp which: "+e.which);

        if (e.which == 1) {

            if( this.node_widget ) {
                this.processNodeWidgets( this.node_widget[0], this.graph_mouse, e );
            }

            // left button
            this.node_widget = null;

            if (this.selected_group) {
                var diffx =
                    this.selected_group.pos[0] -
                    Math.round(this.selected_group.pos[0]);
                var diffy =
                    this.selected_group.pos[1] -
                    Math.round(this.selected_group.pos[1]);
                this.selected_group.move(diffx, diffy, e.ctrlKey);
                this.selected_group.pos[0] = Math.round(this.selected_group.pos[0]);
                this.selected_group.pos[1] = Math.round(this.selected_group.pos[1]);
                if (this.selected_group._nodes.length) {
                    this.dirty_canvas = true;
                }
                
                this.selected_group.recomputeInsideNodes();

                if(this.selected_group_resizing){
                    this.processCallbackHandlers("onGroupResized",{
                        def_cb: this.onGroupResized
                    }, this.selected_group );
                    this.graph.onGraphChanged({action: "groupResize", doSave: true});
                    this.graph.afterChange(); // this.selected_group
                }else{
                    if(diffx || diffy){
                        this.processCallbackHandlers("onGroupMoved",{
                            def_cb: this.onGroupMoved
                        }, this.selected_group );
                        this.graph.onGraphChanged({action: "groupMove", doSave: true});
                        this.graph.afterChange(); // this.selected_group
                    }
                }
                this.selected_group = null;
            }
            this.selected_group_resizing = false;

            var node = this.graph.getNodeOnPos(
                e.canvasX,
                e.canvasY,
                this.visible_nodes,
            );

            if (this.dragging_rectangle) {
                if (this.graph) {
                    var nodes = this.graph._nodes;
                    var node_bounding = new Float32Array(4);

                    // compute bounding and flip if left to right
                    var w = Math.abs(this.dragging_rectangle[2]);
                    var h = Math.abs(this.dragging_rectangle[3]);
                    var startx =
                        this.dragging_rectangle[2] < 0
                            ? this.dragging_rectangle[0] - w
                            : this.dragging_rectangle[0];
                    var starty =
                        this.dragging_rectangle[3] < 0
                            ? this.dragging_rectangle[1] - h
                            : this.dragging_rectangle[1];
                    this.dragging_rectangle[0] = startx;
                    this.dragging_rectangle[1] = starty;
                    this.dragging_rectangle[2] = w;
                    this.dragging_rectangle[3] = h;

                    // test dragging rect size, if minimun simulate a click
                    if (!node || (w > 10 && h > 10 )) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseUp", "computing box selection for nodes", this.dragging_rectangle);
                        // test against all nodes (not visible because the rectangle maybe start outside
                        var to_select = [];
                        for (let i = 0; i < nodes.length; ++i) {
                            var nodeX = nodes[i];
                            nodeX.getBounding(node_bounding);
                            if (
                                !LiteGraph.overlapBounding(
                                    this.dragging_rectangle,
                                    node_bounding,
                                )
                            ) {
                                continue;
                            } // out of the visible area
                            to_select.push(nodeX);
                        }
                        if (to_select.length) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseUp", "selecting nodes", to_select);
                            this.selectNodes(to_select,e.shiftKey); // add to selection with shift
                        }
                    }else{
                        // will select of update selection
                        this.selectNodes([node],e.shiftKey||e.ctrlKey); // add to selection add to selection with ctrlKey or shiftKey
                    }

                }
                this.dragging_rectangle = null;
            } else if (this.connecting_node) {
                // dragging a connection
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;

                var connInOrOut = this.connecting_output || this.connecting_input;
                var connType = connInOrOut.type;

                node = this.graph.getNodeOnPos(
                    e.canvasX,
                    e.canvasY,
                    this.visible_nodes,
                );

                // node below mouse
                if (node) {

                    // slot below mouse? connect
                    let slot;
                    if (this.connecting_output) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseUp", "connecting_output", this.connecting_output, "connecting_node", this.connecting_node, "connecting_slot", this.connecting_slot);
                        slot = this.isOverNodeInput(
                            node,
                            e.canvasX,
                            e.canvasY,
                        );
                        if (slot != -1) {
                            this.connecting_node.connect(this.connecting_slot, node, slot);
                        } else {
                            // not on top of an input
                            // look for a good slot
                            this.connecting_node.connectByType(this.connecting_slot,node,connType);
                        }

                    }else if (this.connecting_input) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseUp", "connecting_input", this.connecting_input, "connecting_node", this.connecting_node, "connecting_slot", this.connecting_slot);
                        slot = this.isOverNodeOutput(
                            node,
                            e.canvasX,
                            e.canvasY,
                        );

                        if (slot != -1) {

                            if(this.connecting && this.connecting.inputs){
                                // multi connect
                                for(let iC in this.connecting.inputs){
                                    node.connect(slot, this.connecting.inputs[iC].node, this.connecting.inputs[iC].slot);
                                }
                            }else{
                                // default single connect
                                node.connect(slot, this.connecting_node, this.connecting_slot); // this is inverted has output-input nature like
                            }

                        } else {
                            // not on top of an input
                            // look for a good slot
                            this.connecting_node.connectByTypeOutput(this.connecting_slot,node,connType);
                        }

                    }
                    // }
                }else{
                    // add menu when releasing link in empty space
                    if (LiteGraph.release_link_on_empty_shows_menu) {
                        if (e.shiftKey && this.allow_searchbox) {
                            if(this.connecting_output) {
                                this.showSearchBox(e,{node_from: this.connecting_node, slot_from: this.connecting_output, type_filter_in: this.connecting_output.type});
                            }else if(this.connecting_input) {
                                this.showSearchBox(e,{node_to: this.connecting_node, slot_from: this.connecting_input, type_filter_out: this.connecting_input.type});
                            }
                        }else{
                            if(this.connecting_output) {
                                this.showConnectionMenu({nodeFrom: this.connecting_node, slotFrom: this.connecting_output, e: e});
                            }else if(this.connecting_input) {
                                this.showConnectionMenu({nodeTo: this.connecting_node, slotTo: this.connecting_input, e: e});
                            }
                        }
                    }
                }

                this.connecting_output = null;
                this.connecting_input = null;
                this.connecting_pos = null;
                this.connecting_node = null;
                this.connecting_slot = -1;
                this.connecting = false;
            } else if (this.resizing_node) { // not dragging connection
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                this.graph.afterChange(this.resizing_node);
                this.resizing_node = null;
            } else if (this.node_dragged) {
                // node being dragged?
                node = this.node_dragged;
                if (
                    node &&
                    e.click_time < 300 &&
                    LiteGraph.isInsideRectangle( e.canvasX, e.canvasY, node.pos[0], node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT )
                ) {
                    node.collapse();
                }

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                this.node_dragged.pos[0] = Math.round(this.node_dragged.pos[0]);
                this.node_dragged.pos[1] = Math.round(this.node_dragged.pos[1]);
                if (this.graph.config.align_to_grid || this.align_to_grid ) {
                    this.node_dragged.alignToGrid();
                }
                // TAG callback graphrenderer event entrypoint
                this.processCallbackHandlers("onNodeMoved",{
                    def_cb: this.onNodeMoved
                }, this.node_dragged, this.selected_nodes );
                // multi nodes dragged ?
                for (let i in this.selected_nodes) {
                    let ndrg = this.selected_nodes[i];
                    ndrg.processCallbackHandlers("onMoved",{
                        def_cb: ndrg.onMoved
                    }, this.node_dragged, this.selected_nodes );
                }
                this.graph.onGraphChanged({action: "nodeDrag", doSave: true});
                this.graph.afterChange(this.node_dragged);
                this.node_dragged = null;
            } else { // no node being dragged
                // get node over
                node = this.graph.getNodeOnPos(
                    e.canvasX,
                    e.canvasY,
                    this.visible_nodes,
                );

                if (!node && e.click_time < 300) {
                    this.deselectAllNodes();
                }

                this.dirty_canvas = true;
                this.dragging_canvas = false;

                if (this.node_over) {
                    // TAG callback node event entrypoint
                    this.node_over.processCallbackHandlers("onMouseUp",{
                        def_cb: this.node_over.onMouseUp
                    }, e, [ e.canvasX - this.node_over.pos[0], e.canvasY - this.node_over.pos[1] ], this );
                }
                if ( this.node_capturing_input ) {
                    // TAG callback node event entrypoint
                    this.node_capturing_input.processCallbackHandlers("onMouseUp",{
                        def_cb: this.node_capturing_input.onMouseUp
                    }, e, [ e.canvasX - this.node_capturing_input.pos[0], e.canvasY - this.node_capturing_input.pos[1], ] );
                }
            }
        } else if (e.which == 2) {
            // middle button
            // trace("middle");
            this.dirty_canvas = true;
            this.dragging_canvas = false;
        } else if (e.which == 3) {
            // right button
            // trace("right");
            this.dirty_canvas = true;
            this.dragging_canvas = false;
        }

        /*
        if((this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null)
            this.draw();
        */

        if (is_primary) {
            this.pointer_is_down = false;
            this.pointer_is_double = false;
        }

        this.graph.change();

        LiteGraph.log_verbose("pointerevents: processMouseUp stopPropagation");
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    /**
     * Called when a mouse wheel event has to be processed
     * @method processMouseWheel
     **/
    processMouseWheel = (e) => {
        if (!this.graph || !this.allow_dragcanvas) {
            return;
        }

        var delta = e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60;

        this.adjustMouseEvent(e);

        var x = e.clientX;
        var y = e.clientY;
        var is_inside = !this.viewport || ( this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]) );
        if(!is_inside)
            return;

        var scale = this.ds.scale;

        if (delta > 0) {
            scale *= 1.1;
        } else if (delta < 0) {
            scale *= 1 / 1.1;
        }

        // TODO check this, probably should use DragAndScale instead
        // should check too that target is always the correct element when getting buondingBox
        // this.ds.changeScale(scale, [e.clientX, e.clientY]);
        var rect = e.target.getBoundingClientRect();
        this.setZoom( scale, [ e.clientX - rect.left, e.clientY - rect.top ] );

        this.graph.change();

        e.preventDefault();
        return false; // prevent default
    }

    /**
     * returns true if a position (in graph space) is on top of a node little corner box
     * @method isOverNodeBox
     **/
    isOverNodeBox(node, canvasx, canvasy) {
        var title_height = LiteGraph.NODE_TITLE_HEIGHT;
        if (
            LiteGraph.isInsideRectangle(
                canvasx,
                canvasy,
                node.pos[0] + 2,
                node.pos[1] + 2 - title_height,
                title_height - 4,
                title_height - 4,
            )
        ) {
            return true;
        }
        return false;
    }

    /**
     * returns the INDEX if a position (in graph space) is on top of a node input slot
     * @method isOverNodeInput
     **/
    isOverNodeInput(node, canvasx, canvasy, slot_pos) {
        if (node.inputs) {
            for (let i = 0, l = node.inputs.length; i < l; ++i) {
                var link_pos = node.getConnectionPos(true, i);
                var is_inside = false;
                if (node.horizontal) {
                    is_inside = LiteGraph.isInsideRectangle(
                        canvasx,
                        canvasy,
                        link_pos[0] - 5,
                        link_pos[1] - 10,
                        10,
                        20,
                    );
                } else {
                    is_inside = LiteGraph.isInsideRectangle(
                        canvasx,
                        canvasy,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        40,
                        10,
                    );
                }
                if (is_inside) {
                    if (slot_pos) {
                        slot_pos[0] = link_pos[0];
                        slot_pos[1] = link_pos[1];
                    }
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * returns the INDEX if a position (in graph space) is on top of a node output slot
     * @method isOverNodeOuput
     **/
    isOverNodeOutput(node, canvasx, canvasy, slot_pos) {
        if (node.outputs) {
            for (let i = 0, l = node.outputs.length; i < l; ++i) {
                var link_pos = node.getConnectionPos(false, i);
                var is_inside = false;
                if (node.horizontal) {
                    is_inside = LiteGraph.isInsideRectangle(
                        canvasx,
                        canvasy,
                        link_pos[0] - 5,
                        link_pos[1] - 10,
                        10,
                        20,
                    );
                } else {
                    is_inside = LiteGraph.isInsideRectangle(
                        canvasx,
                        canvasy,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        40,
                        10,
                    );
                }
                if (is_inside) {
                    if (slot_pos) {
                        slot_pos[0] = link_pos[0];
                        slot_pos[1] = link_pos[1];
                    }
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * process a key event
     * @method processKey
     **/
    /**
     * TODO : processKey replace static keys for config values
     * TODO : processKey save keys being down, fire single first keyDown instead of constantly pressed (use new event and promote that), clean on up
     * NOTE should use event.repeat meanwhile
     */
    processKey = (e) => {
        if (!this.graph) {
            return;
        }

        var block_default = false;
        let r = null;
        LiteGraph.log_verbose("lgraphcanvas","processKey",e);

        if (e.target.localName == "input") {
            return;
        }

        if (e.type == "keydown") {
            
            if (e.keyCode == 32) {
                // space
                this.dragging_canvas = true;
                block_default = true;
            }

            if (e.keyCode == 27) {
                // esc
                if(this.node_panel) this.node_panel.close();
                block_default = true;
            }

            // select all Control A
            if (e.keyCode == 65 && e.ctrlKey) {
                this.selectNodes();
                block_default = true;
            }

            if ((e.keyCode === 67) && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                // copy
                if (this.selected_nodes) {
                    this.copyToClipboard();
                    block_default = true;
                }
            }

            if ((e.keyCode === 86) && (e.metaKey || e.ctrlKey)) {
                // paste
                this.pasteFromClipboard(e.shiftKey);
            }

            // delete or backspace
            if (e.keyCode == 46 || (LiteGraph.backspace_delete && e.keyCode == 8)) {
                if (
                    e.target.localName != "input" &&
                    e.target.localName != "textarea"
                ) {
                    this.deleteSelectedNodes();
                    block_default = true;
                }
            }

            // collapse
            // ...

            // ctlr+Z, ctlr+Y (or ctlr+shift+Z)
            if (LiteGraph.actionHistory_enabled) {
                if ((e.keyCode == 89 && e.ctrlKey) || (e.keyCode == 90 && e.ctrlKey && e.shiftKey)) {
                    // Y
                    this.graph.actionHistoryForward();
                }else if (e.keyCode == 90 && e.ctrlKey) {
                    // Z
                    this.graph.actionHistoryBack();
                }
            }

            if (Object.keys(this.selected_nodes).length) {
                for (let i in this.selected_nodes) {
                    // TAG callback node event entrypoint
                    // SHOULD check return value (block canvasProcess? block_default?)
                    r = this.selected_nodes[i].processCallbackHandlers("onKeyDown",{
                        def_cb: this.selected_nodes[i].onKeyDown
                    }, e );
                    // could a node stop replicating to the others ?
                    if(r!==null && (r===true || (typeof(r)=="object" && r.return_value===true))){
                        LiteGraph.log_debug("lgraphcanvas","processKey","onKeyDown has been processed with result true, prevent event bubbling");
                        block_default = true;
                    }
                }
            }

            // TAG callback GRAPHCANVAS event entrypoint
            // SHOULD check return value (block_default?)
            r = this.processCallbackHandlers("onKeyDown",{
                def_cb: this.onKeyDown
            }, e );
            if(r!==null && (r===true || (typeof(r)=="object" && r.return_value===true))){
                LiteGraph.log_debug("lgraphcanvas","processKey","onKeyDown has been processed with result true, prevent event bubbling");
                block_default = true;
            }else{
                LiteGraph.log_verbose("lgraphcanvas","processKey","onKeyDown processed by CB handlers",r);
            }

        } else if (e.type == "keyup") {
            if (e.keyCode == 32) {
                // space
                this.dragging_canvas = false;
            }

            if (this.selected_nodes) {
                for (let i in this.selected_nodes) {
                    // TAG callback node event entrypoint
                    // SHOULD check return value (block_default?)
                    this.selected_nodes[i].processCallbackHandlers("onKeyUp",{
                        def_cb: this.selected_nodes[i].onKeyUp
                    }, e );
                }
            }
        }

        this.graph.change();

        if (block_default) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }
    }

    copyToClipboard() {
        var clipboard_info = {
            nodes: [],
            links: [],
        };
        var index = 0;
        var selected_nodes_array = [];
        for (let i in this.selected_nodes) {
            let node = this.selected_nodes[i];
            if (node.clonable === false)
                continue;
            node._relative_id = index;
            selected_nodes_array.push(node);
            index += 1;
        }

        for (let i = 0; i < selected_nodes_array.length; ++i) {
            let node = selected_nodes_array[i];
            if(node.clonable === false)
                continue;
            var cloned = node.clone();
            if(!cloned) {
                LiteGraph.log_warn("node type not found: " + node.type );
                continue;
            }
            clipboard_info.nodes.push(cloned.serialize());
            if (node.inputs && node.inputs.length) {
                for (var j = 0; j < node.inputs.length; ++j) {
                    var input = node.inputs[j];
                    if (!input || input.link == null) {
                        continue;
                    }
                    var link_info = this.graph.links[input.link];
                    if (!link_info) {
                        continue;
                    }
                    var target_node = this.graph.getNodeById(link_info.origin_id);
                    if (!target_node) {
                        continue;
                    }
                    clipboard_info.links.push([
                        target_node._relative_id,
                        link_info.origin_slot, // j,
                        node._relative_id,
                        link_info.target_slot,
                        target_node.id,
                    ]);
                }
            }
        }
        LiteGraph.log_debug("lgraphcanvas","copyToClipboard",clipboard_info);
        localStorage.setItem( "litegrapheditor_clipboard", JSON.stringify(clipboard_info), );
    }

    pasteFromClipboard(isConnectUnselected = false) {
        // if ctrl + shift + v is off, return when isConnectUnselected is true (shift is pressed) to maintain old behavior
        if (!LiteGraph.ctrl_shift_v_paste_connect_unselected_outputs && isConnectUnselected) {
            return;
        }
        var data = localStorage.getItem("litegrapheditor_clipboard");
        LiteGraph.log_debug("lgraphcanvas","pasteFromClipboard",data);
        if (!data) {
            return;
        }

        this.graph.beforeChange(); // TODO check and investigate beforeChange afterChange

        // create nodes
        var clipboard_info = JSON.parse(data);
        // calculate top-left node, could work without this processing but using diff with last node pos :: clipboard_info.nodes[clipboard_info.nodes.length-1].pos
        var posMin = false;
        var posMinIndexes = false;
        for (let i = 0; i < clipboard_info.nodes.length; ++i) {
            if (posMin) {
                if(posMin[0]>clipboard_info.nodes[i].pos[0]) {
                    posMin[0] = clipboard_info.nodes[i].pos[0];
                    posMinIndexes[0] = i;
                }
                if(posMin[1]>clipboard_info.nodes[i].pos[1]) {
                    posMin[1] = clipboard_info.nodes[i].pos[1];
                    posMinIndexes[1] = i;
                }
            } else{
                posMin = [clipboard_info.nodes[i].pos[0], clipboard_info.nodes[i].pos[1]];
                posMinIndexes = [i, i];
            }
        }
        var nodes = [];
        for (let i = 0; i < clipboard_info.nodes.length; ++i) {
            var node_data = clipboard_info.nodes[i];
            var node = LiteGraph.createNode(node_data.type);
            if (node) {
                node.configure(node_data);

                // paste in last known mouse position
                node.pos[0] += this.graph_mouse[0] - posMin[0]; // += 5;
                node.pos[1] += this.graph_mouse[1] - posMin[1]; // += 5;

                this.graph.add(node,{doProcessChange: false});

                nodes.push(node);
            }
        }

        // create links
        for (let i = 0; i < clipboard_info.links.length; ++i) {
            var link_info = clipboard_info.links[i];
            var origin_node = undefined;
            var origin_node_relative_id = link_info[0];
            if (origin_node_relative_id != null) {
                origin_node = nodes[origin_node_relative_id];
            } else if (LiteGraph.ctrl_shift_v_paste_connect_unselected_outputs && isConnectUnselected) {
                var origin_node_id = link_info[4];
                if (origin_node_id) {
                    origin_node = this.graph.getNodeById(origin_node_id);
                }
            }
            var target_node = nodes[link_info[2]];
            if( origin_node && target_node )
                origin_node.connect(link_info[1], target_node, link_info[3]);
            else
                LiteGraph.log_warn("Warning, nodes missing on pasting");
        }

        this.selectNodes(nodes);
        this.graph.onGraphChanged({action: "paste", doSave: true});
        this.graph.afterChange(); // TODO investigate and revise afterChange
    }

    /**
     * process a item drop event on top the canvas
     * @method processDrop
     **/
    processDrop = (e) => {
        e.preventDefault();
        this.adjustMouseEvent(e);

        let r = null;

        var x = e.clientX;
        var y = e.clientY;
        var is_inside = !this.viewport || ( this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]) );
        if(!is_inside) {
            LiteGraph.log_debug("graphcanvas processDrop","Outside viewport (client)",x,y);
            return;
        }

        x = e.localX;
        y = e.localY;
        is_inside = !this.viewport || ( this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]) );
        if(!is_inside) {
            LiteGraph.log_debug("graphcanvas processDrop","Outside viewport (local)",x,y);
            return;
        }

        var pos = [e.canvasX, e.canvasY];
        var node = this.graph ? this.graph.getNodeOnPos(pos[0], pos[1]) : null;

        LiteGraph.log_verbose("graphcanvas processDrop","going to process",pos,node);

        if (!node) {

            LiteGraph.log_verbose("lgraphcanvas", "processDrop", "look for drop implemetation in CANVAS", e);
            
            r = this.processCallbackHandlers("onDropItem",{
                def_cb: this.onDropItem
            }, e);
            if(r===null || !r || (typeof(r)=="object" && !r.return_value)){
                LiteGraph.log_verbose("lgraphcanvas", "processDrop", "running default implementation", e);
                this.checkDropItem(e);
                return r===null ? r : (typeof(r)=="object" ? r.return_value : r); // this is probably ignored
            }else{
                return r; // this is probably ignored
            }

        }else{
            
            // has dropped on node

            // check for dropped files
            var files = e.dataTransfer.files;
            if (files && files.length) {
                for (let i = 0; i < files.length; i++) {
                    var file = e.dataTransfer.files[0];
                    var filename = file.name;
                    
                    LiteGraph.log_debug("lgraphcanvas", "processDrop", "file on node", file);

                    // execute onDropFile on node
                    r = node.processCallbackHandlers("onDropFile",{
                        def_cb: node.onDropFile
                    }, file);

                    // if not getting a positive result, process file as data and call onDropData
                    if(!r || (typeof(r)=="object" && !r.return_value)){
                            
                        // prepare reader
                        var reader = new FileReader();
                        reader.onload = function(event) {
                            var data = event.target.result;
                            LiteGraph.log_debug("lgraphcanvas", "processDrop", "data on node", data, filename, file);
                            // execute onDropData on node
                            node.processCallbackHandlers("onDropData",{
                                def_cb: node.onDropData
                            }, data, filename, file);
                        };

                        // read data
                        var type = file.type.split("/")[0];
                        if (type == "text" || type == "") {
                            reader.readAsText(file);
                        } else if (type == "image") {
                            reader.readAsDataURL(file);
                        } else {
                            reader.readAsArrayBuffer(file);
                        }
                        
                    }

                }
            }

            // execute onDropItem on NODE
            r = node.processCallbackHandlers("onDropItem",{
                def_cb: node.onDropItem
            }, e);
            // if getting a positive result, return
            if(r === true || (typeof(r)=="object" && r.return_value)){
                return true;
            }

            // execute onDropItem on CANVAS
            r = this.processCallbackHandlers("onDropItem",{
                def_cb: this.onDropItem
            }, e);
            // if getting a positive result, return
            if(r === true || (typeof(r)=="object" && r.return_value)){
                return true;
            }

            LiteGraph.log_info("lgraphcanvas", "processDrop", "neither node and canvas has processed the drop");

            return false;
        }
    }

    // called if the graph doesn't have a default drop item behaviour
    checkDropItem(e) {
        if (e.dataTransfer.files.length) {
            var file = e.dataTransfer.files[0];
            var ext = LGraphCanvas.getFileExtension(file.name);
            var nodetype = LiteGraph.node_types_by_file_extension[ext];
            if (nodetype) {
                this.graph.beforeChange();
                var node = LiteGraph.createNode(nodetype.type);
                node.pos = [e.canvasX, e.canvasY];
                this.graph.add(node, false, {doProcessChange: false});
                node.processCallbackHandlers("onDropFile",{
                    def_cb: node.onDropFile
                }, file);
                this.graph.onGraphChanged({action: "fileDrop", doSave: true});
                this.graph.afterChange();
            }
        }
    }

    processNodeDblClicked(n) {

        let r = this.processCallbackHandlers("onShowNodePanel",{
            def_cb: this.onShowNodePanel
        }, n);
        if(r===null || ((typeof(r)=="object" && (r.return_value === null || !r.return_value)))){
            this.showShowNodePanel(n); // use onShowNodePanel, this is an only local method
        }

        this.processCallbackHandlers("onNodeDblClicked",{
            def_cb: this.onNodeDblClicked
        }, n);
        this.setDirty(true);
    }

    processNodeSelected(node, e) {
        this.selectNode(node, e && (e.shiftKey || e.ctrlKey || this.multi_select));
        this.processCallbackHandlers("onNodeSelected",{
            def_cb: this.onNodeSelected
        }, node);
    }

    /**
     * selects a given node (or adds it to the current selection)
     * @method selectNode
     **/
    selectNode(node, add_to_current_selection) {
        if (node == null) {
            this.deselectAllNodes();
        } else {
            this.selectNodes([node], add_to_current_selection);
        }
    }

    /**
     * selects several nodes (or adds them to the current selection)
     * @method selectNodes
     **/
    selectNodes(nodes, add_to_current_selection) {
        if (!add_to_current_selection) {
            this.deselectAllNodes();
        }

        nodes = nodes || this.graph._nodes;
        if(typeof nodes === "string") nodes = [nodes];
        if(typeof nodes.length === "undefined") nodes = [nodes];
        Object.values(nodes).forEach((node) => {
            if (node.is_selected) {
                this.deselectNode(node);
                return;
            }

            node.is_selected = true;
            this.selected_nodes[node.id] = node;

            node.processCallbackHandlers("onSelected",{
                def_cb: node.onSelected
            });

            node.inputs?.forEach((input) => {
                this.highlighted_links[input.link] = true;
            });

            node.outputs?.forEach((out) => {
                out.links?.forEach((link) => {
                    this.highlighted_links[link] = true;
                });
            });
        });
        this.processCallbackHandlers("onSelectionChange",{
            def_cb: this.onSelectionChange
        }, this.selected_nodes);
        this.setDirty(true);
    }

    /**
     * removes a node from the current selection
     * @method deselectNode
     **/
    deselectNode(node) {
        if (!node.is_selected) return;

        node.processCallbackHandlers("onDeselected",{
            def_cb: node.onDeselected
        });
        node.is_selected = false;
        this.processCallbackHandlers("onNodeDeselected",{
            def_cb: this.onNodeDeselected
        }, node);

        // Remove highlighted
        node.inputs?.forEach((input) => {
            delete this.highlighted_links?.[input.link]
        });
        node.outputs?.forEach((out) => {
            out.links?.forEach((link) => delete this.highlighted_links?.[link])
        });
    }


    /**
     * removes all nodes from the current selection
     * @method deselectAllNodes
     **/
    deselectAllNodes() {
        if (!this.graph) {
            return;
        }

        this.graph._nodes?.forEach((node) => {
            if (!node.is_selected) return;

            node.processCallbackHandlers("onDeselected",{
                def_cb: node.onDeselected
            });
            node.is_selected = false;
            this.processCallbackHandlers("onNodeDeselected",{
                def_cb: this.onNodeDeselected
            }, node);
        });

        this.selected_nodes = {};
        this.current_node = null;
        this.highlighted_links = {};

        this.processCallbackHandlers("onSelectionChange",{
            def_cb: this.onSelectionChange
        }, this.selected_nodes);
        this.setDirty(true);
    }


    /**
     * deletes all nodes in the current selection from the graph
     * @method deleteSelectedNodes
     **/
    deleteSelectedNodes() {

        this.graph.beforeChange();

        for (let i in this.selected_nodes) {
            var node = this.selected_nodes[i];

            if(node.block_delete)
                continue;

            // TODO make a better version
            // TODO should be an option default off
            // should use auto connect
            // autoconnect when possible (very basic, only takes into account first input-output)
            if(node.inputs && node.inputs.length && node.outputs && node.outputs.length && LiteGraph.isValidConnection( node.inputs[0].type, node.outputs[0].type ) && node.inputs[0].link && node.outputs[0].links && node.outputs[0].links.length ) {
                var input_link = node.graph.links[node.inputs[0].link];
                var output_link = node.graph.links[node.outputs[0].links[0]];
                var input_node = node.getInputNode(0);
                var output_node = node.getOutputNodes(0)[0];
                if(input_node && output_node)
                    input_node.connect( input_link.origin_slot, output_node, output_link.target_slot );
            }

            this.graph.remove(node);
            this.processCallbackHandlers("onNodeDeselected",{
                def_cb: this.onNodeDeselected
            }, node);
        }
        this.selected_nodes = {};
        this.current_node = null;
        this.highlighted_links = {};
        this.setDirty(true);
        this.graph.afterChange();
    }

    /**
     * centers the camera on a given node
     * @method centerOnNode
     **/
    centerOnNode(node) {
        this.ds.offset[0] =
            -node.pos[0] -
            node.size[0] * 0.5 +
            (this.canvas.width * 0.5) / this.ds.scale;
        this.ds.offset[1] =
            -node.pos[1] -
            node.size[1] * 0.5 +
            (this.canvas.height * 0.5) / this.ds.scale;
        this.setDirty(true, true);
    }

    recenter(){
        this.ds.offset[0] = 0;
        this.ds.offset[1] = 0;
        this.setDirty(true, true);
    }
    
    // BAD WIP
    // TODO check right scaling and positioning
    /*centerOnSelection(){
        // const canvas = LGraphCanvas.active_canvas;
        const bounds = this.getBoundaryForSelection();
        if(bounds){
            const boundPos = [bounds[0], bounds[1]];
            var canvasPos = this.convertCanvasToOffset(boundPos);
            this.ds.offset[0] = canvasPos[0]; // - (this.canvas.width * 0.5) / this.ds.scale;
            this.ds.offset[1] = canvasPos[1]; // - (this.canvas.height * 0.5) / this.ds.scale;
            this.ds.changeScale(this.canvas.width/bounds[2]*2, [canvasPos[0]+bounds[2]/2,canvasPos[1]+bounds[3]/2]);
            this.setDirty(true, true);
            return true;
        }else{
            return false;
        }
    }*/

    getMouseCoordinates(){
        return this.graph_mouse;
    }

    // getAdjustedMouseCoordinates(pos){
    //     var clientX_rel = 0;
    //     var clientY_rel = 0;

    //     if (this.canvas) {
    //         var b = this.canvas.getBoundingClientRect();
    //         clientX_rel = pos[0] - b.left;
    //         clientY_rel = pos[1] - b.top;
    //     } else {
    //         clientX_rel = pos[0];
    //         clientY_rel = pos[1];
    //     }
        
    //     return [clientX_rel / this.ds.scale - this.ds.offset[0]
    //             ,clientY_rel / this.ds.scale - this.ds.offset[1]
    //         ];
    // }

    /**
     * adds some useful properties to a mouse event, like the position in graph coordinates
     * @method adjustMouseEvent
     **/
    adjustMouseEvent(e) {
        let clientX_rel = 0;
        let clientX = 0;
        let clientY_rel = 0;
        let clientY = 0;

        if(!e.clientX){
            // simulate position via event (little hack)
            const mouseCoord = this.getMouseCoordinates();
            const gloCoord = this.convertOffsetToEditorArea(mouseCoord);
            
            // need prompt to be absolute positioned relative to editor-area that needs relative positioning
            
            // prevent error for some read-only events: setting getter-only property
            try{
                e.clientX = gloCoord[0];
                e.clientY = gloCoord[1];
            }catch(error){
                LiteGraph.log_debug("lgraphcanvas","adjustMouseEvent","failed set custom prop on event",e);
            }
            clientX = gloCoord[0];
            clientY = gloCoord[1];
        }else{
            clientX = e.clientX;
            clientY = e.clientY;
        }

        if (this.canvas) {
            var b = this.canvas.getBoundingClientRect();
            clientX_rel = clientX - b.left;
            clientY_rel = clientY - b.top;
        } else {
            clientX_rel = clientX;
            clientY_rel = clientY;
        }

        // e.deltaX = clientX_rel - this.last_mouse_position[0];
        // e.deltaY = clientY_rel- this.last_mouse_position[1];

        this.last_mouse_position[0] = clientX_rel;
        this.last_mouse_position[1] = clientY_rel;

        e.canvasX = clientX_rel / this.ds.scale - this.ds.offset[0];
        e.canvasY = clientY_rel / this.ds.scale - this.ds.offset[1];

        // DBG EXCESS LiteGraph.log_verbose("pointerevents: adjustMouseEvent "+e.clientX+":"+e.clientY+" "+clientX_rel+":"+clientY_rel+" "+e.canvasX+":"+e.canvasY);
    }

    /**
     * changes the zoom level of the graph (default is 1), you can pass also a place used to pivot the zoom
     * @method setZoom
     **/
    setZoom(value, zooming_center) {
        this.ds.changeScale(value, zooming_center);
        
        /*
        if(!zooming_center && this.canvas)
            zooming_center = [this.canvas.width * 0.5,this.canvas.height * 0.5];

        var center = this.convertOffsetToCanvas( zooming_center );

        this.ds.scale = value;

        if(this.scale > this.max_zoom)
            this.scale = this.max_zoom;
        else if(this.scale < this.min_zoom)
            this.scale = this.min_zoom;

        var new_center = this.convertOffsetToCanvas( zooming_center );
        var delta_offset = [new_center[0] - center[0], new_center[1] - center[1]];

        this.offset[0] += delta_offset[0];
        this.offset[1] += delta_offset[1];
        */

        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
    }

    /**
     * converts a coordinate from graph coordinates to canvas2D coordinates
     * @method convertOffsetToCanvas
     **/
    convertOffsetToCanvas(pos, out) {
        return this.ds.convertOffsetToCanvas(pos, out);
    }

    /**
     * converts a coordinate from Canvas2D coordinates to graph space
     * @method convertCanvasToOffset
     **/
    convertCanvasToOffset(pos, out) {
        return this.ds.convertCanvasToOffset(pos, out);
    }
    
    /**
     * converts a coordinate from Canvas2D coordinates to global space
     * @method convertCanvasToOffset
     **/
    convertOffsetToEditorArea(pos) {
        // working actually for absolute positioning to editor-area eg. prompt with class graphdialog
        const rect = this.canvas.getBoundingClientRect();
        const canvasPos = this.convertOffsetToCanvas(pos);
        // return [canvasPos[0]+rect.left, canvasPos[1]+rect.top];
        return [canvasPos[0]+rect.left, canvasPos[1]+rect.top];
        // not working
        // const canvasAbsPos = this.cumulativeOffset(this.canvas);
        // const canvasPos = this.convertOffsetToCanvas(pos);
        // return [canvasPos[0]+canvasAbsPos[0], pos[1]+canvasAbsPos[1]];
    }

    // converts event coordinates from canvas2D to graph coordinates
    convertEventToCanvasOffset(e) {
        const rect = this.canvas.getBoundingClientRect();
        return this.convertCanvasToOffset([
            e.clientX - rect.left,
            e.clientY - rect.top,
        ]);
    }

    cumulativeOffset(element) {
        var top = 0, left = 0;
        do {
            top += element.offsetTop  || 0;
            left += element.offsetLeft || 0;
            element = element.offsetParent;
        } while(element);
        // return {top: top, left: left};
        return [left, top];
    }

    /**
     * brings a node to front (above all other nodes)
     * @method bringToFront
     **/
    bringToFront(node) {
        var i = this.graph._nodes.indexOf(node);
        if (i == -1) {
            return;
        }

        this.graph._nodes.splice(i, 1);
        this.graph._nodes.push(node);
    }

    /**
     * sends a node to the back (below all other nodes)
     * @method sendToBack
     **/
    sendToBack(node) {
        var i = this.graph._nodes.indexOf(node);
        if (i == -1) {
            return;
        }

        this.graph._nodes.splice(i, 1);
        this.graph._nodes.unshift(node);
    }

    /**
     * checks which nodes are visible (inside the camera area)
     * @method computeVisibleNodes
     **/
    computeVisibleNodes(nodes, out) {
        var visible_nodes = out || [];
        visible_nodes.length = 0;
        nodes = nodes || this.graph._nodes;
        for (var i = 0, l = nodes.length; i < l; ++i) {
            var n = nodes[i];

            // skip rendering nodes in live mode
            if (this.live_mode && !n.onDrawBackground && !n.onDrawForeground) {
                continue;
            }

            if (!LiteGraph.overlapBounding(this.visible_area, n.getBounding(temp, true))) {
                continue;
            } // out of the visible area

            visible_nodes.push(n);
        }
        return visible_nodes;
    }

    /**
     * renders the whole canvas content, by rendering in two separated canvas, one containing the background grid and the connections, and one containing the nodes)
     * @method draw
     **/
    draw(force_canvas, force_bgcanvas) {
        if (!this.canvas || this.canvas.width == 0 || this.canvas.height == 0) {
            return;
        }

        // fps counting
        var now = LiteGraph.getTime();
        this.render_time = (now - this.last_draw_time) * 0.001;
        this.last_draw_time = now;

        if (this.graph) {
            this.ds.computeVisibleArea(this.viewport);
        }

        if (
            this.dirty_bgcanvas ||
            force_bgcanvas ||
            this.always_render_background ||
            (this.graph &&
                this.graph._last_trigger_time &&
                now - this.graph._last_trigger_time < 1000)
        ) {
            this.drawBackCanvas();
        }

        var draw_front_canvas = this.dirty_canvas || force_canvas;
        if (draw_front_canvas) {
            this.drawFrontCanvas();
        }

        this.fps = this.render_time ? 1.0 / this.render_time : 0;
        this.frame += 1;

        // update low qualty counter
        if (this.ds.scale < 0.7) {
            if (draw_front_canvas) {
                // count only slow frames with havy rendering
                var threshold = this.low_quality_rendering_threshold;
                const acceptable_fps = 45;
                if (this.fps < acceptable_fps) {
                    this.low_quality_rendering_counter += acceptable_fps / this.fps;
                    this.low_quality_rendering_counter = Math.min(this.low_quality_rendering_counter, 2 * threshold); // clamp counter
                } else {
                    // make 100 slower the recovery as there are a lot of cahced rendering calls
                    this.low_quality_rendering_counter -= this.fps / acceptable_fps * 0.01;
                    this.low_quality_rendering_counter = Math.max(this.low_quality_rendering_counter, 0); // clamp counter
                }
            }
        } else {
            // force reset to high quality when zoomed in
            this.low_quality_rendering_counter = 0;
        }
    }

    /**
     * draws the front canvas (the one containing all the nodes)
     * @method drawFrontCanvas
     **/
    drawFrontCanvas() {
        this.dirty_canvas = false;

        if (!this.ctx) {
            this.ctx = this.bgcanvas.getContext("2d");
        }
        var ctx = this.ctx;
        if (!ctx) {
            // maybe is using webgl...
            LiteGraph.log_warn("lgraphcanvas", "drawFrontCanvas", "no ctx", this);
            return;
        }

        var canvas = this.canvas;
        if ( ctx.start2D && !this.viewport ) {
            ctx.start2D();
            ctx.restore();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // clip dirty area if there is one, otherwise work in full canvas
        var area = this.viewport || this.dirty_area;
        if (area) {
            ctx.save();
            ctx.beginPath();
            ctx.rect( area[0],area[1],area[2],area[3] );
            ctx.clip();
        }

        // clear
        // canvas.width = canvas.width;
        if (this.clear_background) {
            if(area)
                ctx.clearRect( area[0],area[1],area[2],area[3] );
            else
                ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // draw bg canvas
        if (this.bgcanvas == this.canvas) {
            this.drawBackCanvas();
        } else {
            ctx.drawImage( this.bgcanvas, 0, 0 );
        }

        // rendering
        this.processCallbackHandlers("onRender",{
            def_cb: this.onRender
        }, canvas, ctx);

        // info widget
        if (this.show_info) {
            this.renderInfo(ctx, area ? area[0] : 0, area ? area[1] : 0 );
        }

        if (this.graph) {
            // apply transformations
            ctx.save();
            this.ds.toCanvasContext(ctx);

            var visible_nodes = this.computeVisibleNodes(
                null,
                this.visible_nodes,
            );

            for (let i = 0; i < visible_nodes.length; ++i) {
                let node = visible_nodes[i];

                // transform coords system
                ctx.save();
                ctx.translate(node.pos[0], node.pos[1]);

                // Draw
                this.drawNode(node, ctx);

                // Restore
                ctx.restore();
            }

            // on top (debug)
            if (this.render_execution_order) {
                this.drawExecutionOrder(ctx);
            }

            // connections ontop?
            if (this.graph.config.links_ontop) {
                if (!this.live_mode) {
                    this.drawConnections(ctx);
                }
            }

            // current connection (the one being dragged by the mouse)
            if (this.connecting_pos != null) {
                ctx.lineWidth = this.connections_width;
                var link_color = null;

                var connInOrOut = this.connecting_output || this.connecting_input;

                var connType = connInOrOut.type;
                var connDir = connInOrOut.dir;
                if(connDir == null) {
                    if (this.connecting_output)
                        connDir = this.connecting_node.horizontal ? LiteGraph.DOWN : LiteGraph.RIGHT;
                    else
                        connDir = this.connecting_node.horizontal ? LiteGraph.UP : LiteGraph.LEFT;
                }
                var connShape = connInOrOut.shape;

                switch (connType) {
                    case LiteGraph.EVENT:
                    case LiteGraph.ACTION:
                        link_color = LiteGraph.EVENT_LINK_COLOR;
                        break;
                    default:
                        link_color = LiteGraph.CONNECTING_LINK_COLOR;
                }

                // the connection being dragged by the mouse
                this.renderLink(
                    ctx,
                    this.connecting_pos,
                    [this.graph_mouse[0], this.graph_mouse[1]],
                    null,
                    false,
                    null,
                    link_color,
                    connDir,
                    LiteGraph.CENTER,
                );

                ctx.beginPath();
                if (
                    connType === LiteGraph.EVENT ||
                    connType === LiteGraph.ACTION ||
                    connShape === LiteGraph.BOX_SHAPE
                ) {
                    ctx.rect(
                        this.connecting_pos[0] - 6 + 0.5,
                        this.connecting_pos[1] - 5 + 0.5,
                        14,
                        10,
                    );
                    ctx.fill();
                    ctx.beginPath();
                    ctx.rect(
                        this.graph_mouse[0] - 6 + 0.5,
                        this.graph_mouse[1] - 5 + 0.5,
                        14,
                        10,
                    );
                } else if (connShape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(this.connecting_pos[0] + 8, this.connecting_pos[1] + 0.5);
                    ctx.lineTo(this.connecting_pos[0] - 4, this.connecting_pos[1] + 6 + 0.5);
                    ctx.lineTo(this.connecting_pos[0] - 4, this.connecting_pos[1] - 6 + 0.5);
                    ctx.closePath();
                } else {
                    ctx.arc(
                        this.connecting_pos[0],
                        this.connecting_pos[1],
                        4,
                        0,
                        Math.PI * 2,
                    );
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(
                        this.graph_mouse[0],
                        this.graph_mouse[1],
                        4,
                        0,
                        Math.PI * 2,
                    );
                }
                ctx.fill();

                ctx.fillStyle = "#ffcc00";
                if (this._highlight_input) {
                    ctx.beginPath();
                    var shape = this._highlight_input_slot.shape;
                    if (shape === LiteGraph.ARROW_SHAPE) {
                        ctx.moveTo(this._highlight_input[0] + 8, this._highlight_input[1] + 0.5);
                        ctx.lineTo(this._highlight_input[0] - 4, this._highlight_input[1] + 6 + 0.5);
                        ctx.lineTo(this._highlight_input[0] - 4, this._highlight_input[1] - 6 + 0.5);
                        ctx.closePath();
                    } else {
                        ctx.arc(
                            this._highlight_input[0],
                            this._highlight_input[1],
                            6,
                            0,
                            Math.PI * 2,
                        );
                    }
                    ctx.fill();
                }
                if (this._highlight_output) {
                    ctx.beginPath();
                    if (shape === LiteGraph.ARROW_SHAPE) {
                        ctx.moveTo(this._highlight_output[0] + 8, this._highlight_output[1] + 0.5);
                        ctx.lineTo(this._highlight_output[0] - 4, this._highlight_output[1] + 6 + 0.5);
                        ctx.lineTo(this._highlight_output[0] - 4, this._highlight_output[1] - 6 + 0.5);
                        ctx.closePath();
                    } else {
                        ctx.arc(
                            this._highlight_output[0],
                            this._highlight_output[1],
                            6,
                            0,
                            Math.PI * 2,
                        );
                    }
                    ctx.fill();
                }
            }

            // the selection rectangle
            if (this.dragging_rectangle) {
                ctx.strokeStyle = "#FFF";
                ctx.strokeRect(
                    this.dragging_rectangle[0],
                    this.dragging_rectangle[1],
                    this.dragging_rectangle[2],
                    this.dragging_rectangle[3],
                );
            }

            // on top of link center
            if(this.over_link_center && this.render_link_tooltip){
                this.drawLinkTooltip( ctx, this.over_link_center );
            }else{
                // are we sure to call this here (?) should check for over_link
                this.processCallbackHandlers("onDrawLinkTooltip",{
                    def_cb: this.onDrawLinkTooltip
                }, ctx, null);
            }

            // custom info
            this.processCallbackHandlers("onDrawForeground",{
                def_cb: this.onDrawForeground
            }, ctx, this.visible_rect);
            ctx.restore();
        }else{
            LiteGraph.log_warn("lgraphcanvas", "drawFrontCanvas", "no graph", this);
        }

        // draws panel in the corner
        if (this._graph_stack && this._graph_stack.length) {
            this.drawSubgraphPanel( ctx );
        }
        this.processCallbackHandlers("onDrawOverlay",{
            def_cb: this.onDrawOverlay
        }, ctx);
        if (area) {
            ctx.restore();
        }
        ctx.finish2D?.(); // this is a function original developer (Javi tamat) use in webgl renderer
    }

    /**
     * draws the panel in the corner that shows subgraph properties
     * @method drawSubgraphPanel
     **/
    drawSubgraphPanel(ctx) {
        var subgraph = this.graph;
        if( !subgraph)
            return;
        var subnode = subgraph._subgraph_node;
        if (!subnode) {
            LiteGraph.log_warn("subgraph without subnode");
            return;
        }
        this.drawSubgraphPanelLeft(subgraph, subnode, ctx)
        this.drawSubgraphPanelRight(subgraph, subnode, ctx)
    }

    drawSubgraphPanelLeft(subgraph, subnode, ctx) {
        var num = subnode.inputs ? subnode.inputs.length : 0;
        var w = 200;
        var h = Math.floor(LiteGraph.NODE_SLOT_HEIGHT * 1.6);

        ctx.fillStyle = "#111";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.roundRect(10, 10, w, (num + 1) * h + 50, [8]);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#888";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.fillText("Graph Inputs", 20, 34);
        // var pos = this.mouse;

        if (this.drawButton(w - 20, 20, 20, 20, "X", "#151515")) {
            this.closeSubgraph();
            return;
        }

        var y = 50;
        ctx.font = "14px Arial";
        if (subnode.inputs)
            for (var i = 0; i < subnode.inputs.length; ++i) {
                var input = subnode.inputs[i];
                if (input.not_subgraph_input)
                    continue;

                // input button clicked
                if (this.drawButton(20, y + 2, w - 20, h - 2)) {
                    var type = subnode.constructor.input_node_type || "graph/input";
                    this.graph.beforeChange();
                    var newnode = LiteGraph.createNode(type);
                    if (newnode) {
                        subgraph.add(newnode, false, {doProcessChange: false} );
                        this.block_click = false;
                        this.last_click_position = null;
                        this.selectNodes([newnode]);
                        this.node_dragged = newnode;
                        this.dragging_canvas = false;
                        newnode.setProperty("name", input.name);
                        newnode.setProperty("type", input.type);
                        this.node_dragged.pos[0] = this.graph_mouse[0] - 5;
                        this.node_dragged.pos[1] = this.graph_mouse[1] - 5;
                        this.graph.afterChange();
                    } else {
                        LiteGraph.log_error("graph input node not found:", type);
                    }
                }
                ctx.fillStyle = "#9C9";
                ctx.beginPath();
                ctx.arc(w - 16, y + h * 0.5, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = "#AAA";
                ctx.fillText(input.name, 30, y + h * 0.75);
                // var tw = ctx.measureText(input.name);
                ctx.fillStyle = "#777";
                ctx.fillText(input.type, 130, y + h * 0.75);
                y += h;
            }
        // add + button
        if (this.drawButton(20, y + 2, w - 20, h - 2, "+", "#151515", "#222")) {
            this.showSubgraphPropertiesDialog(subnode);
        }
    }

    drawSubgraphPanelRight(subgraph, subnode, ctx) {
        var num = subnode.outputs ? subnode.outputs.length : 0;
        var canvas_w = this.bgcanvas.width;
        var w = 200;
        var h = Math.floor(LiteGraph.NODE_SLOT_HEIGHT * 1.6);

        ctx.fillStyle = "#111";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.roundRect(canvas_w - w - 10, 10, w, (num + 1) * h + 50, [8]);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#888";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        const title_text = "Graph Outputs";
        var tw = ctx.measureText(title_text).width
        ctx.fillText(title_text, (canvas_w - tw) - 20, 34);
        // var pos = this.mouse;
        if (this.drawButton(canvas_w - w, 20, 20, 20, "X", "#151515")) {
            this.closeSubgraph();
            return;
        }

        var y = 50;
        ctx.font = "14px Arial";
        if (subnode.outputs)
            for (var i = 0; i < subnode.outputs.length; ++i) {
                var output = subnode.outputs[i];
                if (output.not_subgraph_input)
                    continue;

                // output button clicked
                if (this.drawButton(canvas_w - w, y + 2, w - 20, h - 2)) {
                    var type = subnode.constructor.output_node_type || "graph/output";
                    this.graph.beforeChange();
                    var newnode = LiteGraph.createNode(type);
                    if (newnode) {
                        subgraph.add(newnode, false, {doProcessChange: false} );
                        this.block_click = false;
                        this.last_click_position = null;
                        this.selectNodes([newnode]);
                        this.node_dragged = newnode;
                        this.dragging_canvas = false;
                        newnode.setProperty("name", output.name);
                        newnode.setProperty("type", output.type);
                        this.node_dragged.pos[0] = this.graph_mouse[0] - 5;
                        this.node_dragged.pos[1] = this.graph_mouse[1] - 5;
                        this.graph.afterChange();
                    } else {
                        LiteGraph.log_error("graph input node not found:", type);
                    }
                }
                ctx.fillStyle = "#9C9";
                ctx.beginPath();
                ctx.arc(canvas_w - w + 16, y + h * 0.5, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = "#AAA";
                ctx.fillText(output.name, canvas_w - w + 30, y + h * 0.75);
                // var tw = ctx.measureText(input.name);
                ctx.fillStyle = "#777";
                ctx.fillText(output.type, canvas_w - w + 130, y + h * 0.75);
                y += h;
            }
        // add + button
        if (this.drawButton(canvas_w - w, y + 2, w - 20, h - 2, "+", "#151515", "#222")) {
            this.showSubgraphPropertiesDialogRight(subnode);
        }
    }

    // Draws a button into the canvas overlay and computes if it was clicked using the immediate gui paradigm
    drawButton(x, y, w, h, text, bgcolor, hovercolor, textcolor) {
        var ctx = this.ctx;
        bgcolor = bgcolor || LiteGraph.NODE_DEFAULT_COLOR;
        hovercolor = hovercolor || "#555";
        textcolor = textcolor || LiteGraph.NODE_TEXT_COLOR;
        var pos = this.ds.convertOffsetToCanvas(this.graph_mouse);
        var hover = LiteGraph.isInsideRectangle( pos[0], pos[1], x,y,w,h );
        pos = this.last_click_position ? [this.last_click_position[0], this.last_click_position[1]] : null;
        if(pos) {
            var rect = this.canvas.getBoundingClientRect();
            pos[0] -= rect.left;
            pos[1] -= rect.top;
        }
        var clicked = pos && LiteGraph.isInsideRectangle( pos[0], pos[1], x,y,w,h );

        ctx.fillStyle = hover ? hovercolor : bgcolor;
        if(clicked)
            ctx.fillStyle = "#AAA";
        ctx.beginPath();
        ctx.roundRect(x,y,w,h,[4] );
        ctx.fill();

        if(text != null) {
            if(text.constructor == String) {
                ctx.fillStyle = textcolor;
                ctx.textAlign = "center";
                ctx.font = ((h * 0.65)|0) + "px Arial";
                ctx.fillText( text, x + w * 0.5,y + h * 0.75 );
                ctx.textAlign = "left";
            }
        }

        var was_clicked = clicked && !this.block_click;
        if(clicked)
            this.blockClick();
        return was_clicked;
    }

    isAreaClicked(x, y, w, h, hold_click) {
        var pos = this.last_click_position;
        var clicked = pos && LiteGraph.isInsideRectangle( pos[0], pos[1], x,y,w,h );
        var was_clicked = clicked && !this.block_click;
        if(clicked && hold_click)
            this.blockClick();
        return was_clicked;
    }

    /**
     * draws some useful stats in the corner of the canvas
     * @method renderInfo
     **/
    renderInfo(ctx, x, y) {
        x = x || 10;
        y = y || this.canvas.height - 80;

        ctx.save();
        ctx.translate(x, y);

        ctx.font = "10px Arial";
        ctx.fillStyle = "#888";
        ctx.textAlign = "left";
        if (this.graph) {
            ctx.fillText( "T: " + this.graph.globaltime.toFixed(2) + "s", 5, 13 * 1 );
            ctx.fillText("I: " + this.graph.iteration, 5, 13 * 2 );
            ctx.fillText("N: " + this.graph._nodes.length + " [" + this.visible_nodes.length + "]", 5, 13 * 3 );
            ctx.fillText("V: " + this.graph._version, 5, 13 * 4);
            ctx.fillText("FPS:" + this.fps.toFixed(2), 5, 13 * 5);
        } else {
            ctx.fillText("No graph selected", 5, 13 * 1);
        }
        ctx.restore();
    }

    /**
     * draws the back canvas (the one containing the background and the connections)
     * @method drawBackCanvas
     **/
    drawBackCanvas() {
        var canvas = this.bgcanvas;

        // ComfyUI compatibility
        // ensure correct sizing
        this.bgcanvas.width = this.canvas.width;
        this.bgcanvas.height = this.canvas.height;

        if (!this.bgctx) {
            this.bgctx = this.bgcanvas.getContext("2d");
        }
        var ctx = this.bgctx;
        if (ctx.start) {
            ctx.start();
        }

        var viewport = this.viewport || [0,0,ctx.canvas.width,ctx.canvas.height];

        // clear
        if (this.clear_background) {
            ctx.clearRect( viewport[0], viewport[1], viewport[2], viewport[3] );
        }

        // show subgraph stack header
        if (this._graph_stack && this._graph_stack.length) {
            ctx.save();
            var subgraph_node = this.graph._subgraph_node;
            ctx.strokeStyle = subgraph_node.bgcolor;
            ctx.lineWidth = 10;
            ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
            ctx.lineWidth = 1;
            ctx.font = "40px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = subgraph_node.bgcolor || "#AAA";
            let title = "";
            this._graph_stack.slice(1).forEach((item, index) => {
                title += `${item._subgraph_node.getTitle()} ${index < this._graph_stack.length - 2 ? ">> " : ""}`;
            });
            ctx.fillText(
                title + subgraph_node.getTitle(),
                canvas.width * 0.5,
                40,
            );
            ctx.restore();
        }

        var bg_already_painted = false;
        let r = this.processCallbackHandlers("onRenderBackground",{
            def_cb: this.onRenderBackground
        }, canvas, ctx);
        if(r!==null && (r === true || (typeof(r)=="object" && r.return_value === true))){
            bg_already_painted = true;
        }

        // reset in case of error
        if ( !this.viewport ) {
            ctx.restore();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        this.visible_links.length = 0;

        if (this.graph) {
            // apply transformations
            ctx.save();
            this.ds.toCanvasContext(ctx);

            // render BG
            if ( this.ds.scale < 1.5 && !bg_already_painted && this.clear_background_color ) {
                ctx.fillStyle = this.clear_background_color;
                ctx.fillRect(
                    this.visible_area[0],
                    this.visible_area[1],
                    this.visible_area[2],
                    this.visible_area[3],
                );
            }

            if (
                this.background_image &&
                this.ds.scale > 0.5 &&
                !bg_already_painted
            ) {
                if (this.zoom_modify_alpha) {
                    ctx.globalAlpha =
                        (1.0 - 0.5 / this.ds.scale) * this.editor_alpha;
                } else {
                    ctx.globalAlpha = this.editor_alpha;
                }
                ctx.imageSmoothingEnabled = ctx.imageSmoothingEnabled = false; // ctx.mozImageSmoothingEnabled =
                if (
                    !this._bg_img ||
                    this._bg_img.name != this.background_image
                ) {
                    this._bg_img = new Image();
                    this._bg_img.name = this.background_image;
                    this._bg_img.src = this.background_image;
                    var that = this;
                    this._bg_img.onload = function() {
                        that.draw(true, true);
                    };
                }

                var pattern = null;
                if (this._pattern == null && this._bg_img.width > 0) {
                    pattern = ctx.createPattern(this._bg_img, "repeat");
                    this._pattern_img = this._bg_img;
                    this._pattern = pattern;
                } else {
                    pattern = this._pattern;
                }
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(
                        this.visible_area[0],
                        this.visible_area[1],
                        this.visible_area[2],
                        this.visible_area[3],
                    );
                    ctx.fillStyle = "transparent";
                }

                ctx.globalAlpha = 1.0;
                ctx.imageSmoothingEnabled = ctx.imageSmoothingEnabled = true; // = ctx.mozImageSmoothingEnabled
            }

            // groups
            if (this.graph._groups.length && !this.live_mode) {
                this.drawGroups(canvas, ctx);
            }

            this.processCallbackHandlers("onDrawBackground",{
                def_cb: this.onDrawBackground
            }, ctx, this.visible_area);

            if (this.onBackgroundRender) {
                // LEGACY
                LiteGraph.log_error("WARNING! onBackgroundRender deprecated, now is named onDrawBackground ");
                this.onBackgroundRender = null;
            }

            // DEBUG: show clipping area
            // ctx.fillStyle = "red";
            // ctx.fillRect( this.visible_area[0] + 10, this.visible_area[1] + 10, this.visible_area[2] - 20, this.visible_area[3] - 20);

            // bg
            if (this.render_canvas_border) {
                ctx.strokeStyle = "#235";
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }

            if (this.render_connections_shadows) {
                ctx.shadowColor = "#000";
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 6;
            } else {
                ctx.shadowColor = "rgba(0,0,0,0)";
            }

            // draw connections
            if (!this.live_mode) {
                this.drawConnections(ctx);
            }

            ctx.shadowColor = "rgba(0,0,0,0)";

            // restore state
            ctx.restore();
        }

        ctx.finish?.();
        this.dirty_bgcanvas = false;
        this.dirty_canvas = true; // to force to repaint the front canvas with the bgcanvas
    }

    /**
     * draws the given node inside the canvas
     * @method drawNode
     **/
    drawNode(node, ctx) {

        this.current_node = node;

        var color = node.color || node.constructor.color || LiteGraph.NODE_DEFAULT_COLOR;
        var bgcolor = node.bgcolor || node.constructor.bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;
        var low_quality = this.ds.scale < 0.6; // zoomed out

        // only render if it forces it to do it
        if (this.live_mode) {
            if (!node.flags.collapsed) {
                ctx.shadowColor = "transparent";
                node.processCallbackHandlers("onDrawForeground",{
                    def_cb: node.onDrawForeground
                }, ctx, this, this.canvas);
            }
            return;
        }

        var editor_alpha = this.editor_alpha;
        ctx.globalAlpha = editor_alpha;

        if (this.render_shadows && !low_quality) {
            ctx.shadowColor = LiteGraph.DEFAULT_SHADOW_COLOR;
            ctx.shadowOffsetX = 2 * this.ds.scale;
            ctx.shadowOffsetY = 2 * this.ds.scale;
            ctx.shadowBlur = 3 * this.ds.scale;
        } else {
            ctx.shadowColor = "transparent";
        }

        // custom draw collapsed method (draw after shadows because they are affected)
        if (node.flags.collapsed) {
            let r = node.processCallbackHandlers("onDrawCollapsed",{
                def_cb: node.onDrawCollapsed
            }, ctx, this);
            if(r!==null && (r === true || (typeof(r)=="object" && r.return_value === true))){
                return;
            }
        }

        // clip if required (mask)
        var shape = node._shape || LiteGraph.BOX_SHAPE;
        var size = temp_vec2;
        temp_vec2.set(node.size);
        var horizontal = node.horizontal; // || node.flags.horizontal;

        if (node.flags.collapsed) {
            ctx.font = this.title_text_font;
            var title = node.getTitle ? node.getTitle() : node.title;
            if (title != null) {
                node._collapsed_width = Math.min(
                    node.size[0],
                    ctx.measureText(title).width + LiteGraph.NODE_TITLE_HEIGHT * 2,
                ); // LiteGraph.NODE_COLLAPSED_WIDTH;
                size[0] = node._collapsed_width;
                size[1] = 0;
            }
        }

        if (node.clip_area || this.clip_all_nodes) {
            // Start clipping
            ctx.save();
            ctx.beginPath();
            if (shape == LiteGraph.BOX_SHAPE) {
                ctx.rect(0, 0, size[0], size[1]);
            } else if (shape == LiteGraph.ROUND_SHAPE) {
                ctx.roundRect(0, 0, size[0], size[1], [10]);
            } else if (shape == LiteGraph.CIRCLE_SHAPE) {
                ctx.arc(
                    size[0] * 0.5,
                    size[1] * 0.5,
                    size[0] * 0.5,
                    0,
                    Math.PI * 2,
                );
            }
            ctx.clip();
        }

        // draw shape
        if (node.loading_lib) {
            bgcolor = LiteGraph.NODE_BGCOLOR_LOADINGLIB;
        }
        if (node.wrong_environment) {
            bgcolor = LiteGraph.NODE_BGCOLOR_WRONGENV;
        }
        if (node.has_errors) {
            bgcolor = LiteGraph.NODE_BGCOLOR_ERROR;
        }
        this.drawNodeShape(
            node,
            ctx,
            size,
            color,
            bgcolor,
            node.is_selected,
            node.mouseOver,
        );
        ctx.shadowColor = "transparent";

        // draw foreground
        node.processCallbackHandlers("onDrawForeground",{
            def_cb: node.onDrawForeground
        }, ctx, this, this.canvas);

        // node tooltip
        if (LiteGraph.show_node_tooltip
            && node.mouseOver
            && (node.is_selected && (!this.selected_nodes || Object.keys(this.selected_nodes).length <= 1))
        ) {
            this.drawNodeTooltip(ctx,node);
        }

        // connection slots
        ctx.textAlign = horizontal ? "center" : "left";
        ctx.font = this.inner_text_font;

        var render_text = !this.lowQualityRenderingRequired(0.6);

        var out_slot = this.connecting_output;
        var in_slot = this.connecting_input;
        ctx.lineWidth = 1;

        var max_y = 0;
        var slot_pos = new Float32Array(2); // to reuse
        var doStroke;

        // render inputs and outputs
        if (!node.flags.collapsed) {
            // input connection slots
            if (node.inputs) {
                for (let i = 0; i < node.inputs.length; i++) {
                    let slot = node.inputs[i];
                    let slot_type = slot.type;
                    let slot_shape = slot.shape;

                    ctx.globalAlpha = editor_alpha;
                    // change opacity of incompatible slots when dragging a connection
                    if ( this.connecting_output && !LiteGraph.isValidConnection( slot.type , out_slot.type) ) {
                        ctx.globalAlpha = 0.4 * editor_alpha;
                    }

                    ctx.fillStyle =
                        slot.link != null
                            ? slot.color_on ||
                                this.default_connection_color_byType[slot_type] ||
                                this.default_connection_color.input_on
                            : slot.color_off ||
                                this.default_connection_color_byTypeOff[slot_type] ||
                                this.default_connection_color_byType[slot_type] ||
                                this.default_connection_color.input_off;

                    let pos = node.getConnectionPos(true, i, slot_pos);
                    pos[0] -= node.pos[0];
                    pos[1] -= node.pos[1];
                    if (max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5) {
                        max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5;
                    }

                    ctx.beginPath();

                    if (slot_type == "array") {
                        slot_shape = LiteGraph.GRID_SHAPE; // place in addInput? addOutput instead?
                    } else if (slot.name == "onTrigger" || slot.name == "onExecuted") {
                        slot_shape = LiteGraph.ARROW_SHAPE;
                    } else if(slot_type === LiteGraph.EVENT || slot_type === LiteGraph.ACTION) {
                        slot_shape = LiteGraph.BOX_SHAPE;
                    }

                    doStroke = true;

                    if (slot_shape === LiteGraph.BOX_SHAPE) {
                        if (horizontal) {
                            ctx.rect(
                                pos[0] - 5 + 0.5,
                                pos[1] - 8 + 0.5,
                                10,
                                14,
                            );
                        } else {
                            ctx.rect(
                                pos[0] - 6 + 0.5,
                                pos[1] - 5 + 0.5,
                                14,
                                10,
                            );
                        }
                    } else if (slot_shape === LiteGraph.ARROW_SHAPE) {
                        ctx.moveTo(pos[0] + 8, pos[1] + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] + 6 + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] - 6 + 0.5);
                        ctx.closePath();
                    } else if (slot_shape === LiteGraph.GRID_SHAPE) {
                        ctx.rect(pos[0] - 4, pos[1] - 4, 2, 2);
                        ctx.rect(pos[0] - 1, pos[1] - 4, 2, 2);
                        ctx.rect(pos[0] + 2, pos[1] - 4, 2, 2);
                        ctx.rect(pos[0] - 4, pos[1] - 1, 2, 2);
                        ctx.rect(pos[0] - 1, pos[1] - 1, 2, 2);
                        ctx.rect(pos[0] + 2, pos[1] - 1, 2, 2);
                        ctx.rect(pos[0] - 4, pos[1] + 2, 2, 2);
                        ctx.rect(pos[0] - 1, pos[1] + 2, 2, 2);
                        ctx.rect(pos[0] + 2, pos[1] + 2, 2, 2);
                        doStroke = false;
                    } else {
                        if(low_quality)
                            ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8 ); // faster
                        else
                            ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                    }
                    ctx.fill();

                    // render name
                    if (render_text
                        && !(slot.name == "onTrigger" || slot.name == "onExecuted")
                    ) {
                        let text = slot.label != null ? slot.label : slot.name;
                        if (text) {
                            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
                            if (horizontal || slot.dir == LiteGraph.UP) {
                                ctx.fillText(text, pos[0], pos[1] - 10);
                            } else {
                                ctx.fillText(text, pos[0] + 10, pos[1] + 5);
                            }
                        }
                    }
                }
            }

            // output connection slots

            ctx.textAlign = horizontal ? "center" : "right";
            ctx.strokeStyle = "black";
            if (node.outputs) {
                for (let i = 0; i < node.outputs.length; i++) {
                    let slot = node.outputs[i];
                    let slot_type = slot.type;
                    let slot_shape = slot.shape;

                    // change opacity of incompatible slots when dragging a connection
                    if (this.connecting_input && !LiteGraph.isValidConnection( slot_type , in_slot.type) ) {
                        ctx.globalAlpha = 0.4 * editor_alpha;
                    }

                    let pos = node.getConnectionPos(false, i, slot_pos);
                    pos[0] -= node.pos[0];
                    pos[1] -= node.pos[1];
                    if (max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5) {
                        max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5;
                    }

                    ctx.fillStyle =
                        slot.links && slot.links.length
                            ? slot.color_on ||
                                this.default_connection_color_byType[slot_type] ||
                                this.default_connection_color.output_on
                            : slot.color_off ||
                                this.default_connection_color_byTypeOff[slot_type] ||
                                this.default_connection_color_byType[slot_type] ||
                                this.default_connection_color.output_off;
                    ctx.beginPath();
                    // ctx.rect( node.size[0] - 14,i*14,10,10);

                    if (slot_type == "array") {
                        slot_shape = LiteGraph.GRID_SHAPE;
                    } else if (slot.name == "onTrigger" || slot.name == "onExecuted") {
                        slot_shape = LiteGraph.ARROW_SHAPE;
                    } else if(slot_type === LiteGraph.EVENT || slot_type === LiteGraph.ACTION) {
                        slot_shape = LiteGraph.BOX_SHAPE;
                    }

                    doStroke = true;

                    if (slot_shape === LiteGraph.BOX_SHAPE) {
                        if (horizontal) {
                            ctx.rect(
                                pos[0] - 5 + 0.5,
                                pos[1] - 8 + 0.5,
                                10,
                                14,
                            );
                        } else {
                            ctx.rect(
                                pos[0] - 6 + 0.5,
                                pos[1] - 5 + 0.5,
                                14,
                                10,
                            );
                        }
                    } else if (slot_shape === LiteGraph.ARROW_SHAPE) {
                        ctx.moveTo(pos[0] + 8, pos[1] + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] + 6 + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] - 6 + 0.5);
                        ctx.closePath();
                    } else if (slot_shape === LiteGraph.GRID_SHAPE) {
                        ctx.rect(pos[0] - 4, pos[1] - 4, 2, 2);
                        ctx.rect(pos[0] - 1, pos[1] - 4, 2, 2);
                        ctx.rect(pos[0] + 2, pos[1] - 4, 2, 2);
                        ctx.rect(pos[0] - 4, pos[1] - 1, 2, 2);
                        ctx.rect(pos[0] - 1, pos[1] - 1, 2, 2);
                        ctx.rect(pos[0] + 2, pos[1] - 1, 2, 2);
                        ctx.rect(pos[0] - 4, pos[1] + 2, 2, 2);
                        ctx.rect(pos[0] - 1, pos[1] + 2, 2, 2);
                        ctx.rect(pos[0] + 2, pos[1] + 2, 2, 2);
                        doStroke = false;
                    } else {
                        if(low_quality)
                            ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8 );
                        else
                            ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                    }

                    // trigger
                    // if(slot.node_id != null && slot.slot == -1)
                    //	ctx.fillStyle = "#F85";

                    // if(slot.links != null && slot.links.length)
                    ctx.fill();
                    if(!low_quality && doStroke)
                        ctx.stroke();

                    // render output name
                    if (render_text
                        && !(slot.name == "onTrigger" || slot.name == "onExecuted")
                    ) {
                        let text = slot.label != null ? slot.label : slot.name;
                        if (text) {
                            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
                            if (horizontal || slot.dir == LiteGraph.DOWN) {
                                ctx.fillText(text, pos[0], pos[1] - 8);
                            } else {
                                ctx.fillText(text, pos[0] - 10, pos[1] + 5);
                            }
                        }
                    }
                }
            }

            ctx.textAlign = "left";
            ctx.globalAlpha = 1;

            if (node.widgets) {
                var widgets_y = max_y;
                if (horizontal || node.widgets_up) {
                    widgets_y = 2;
                }
                if( node.widgets_start_y != null )
                    widgets_y = node.widgets_start_y;
                this.drawNodeWidgets(
                    node,
                    widgets_y,
                    ctx,
                    this.node_widget && this.node_widget[0] == node
                        ? this.node_widget[1]
                        : null,
                );
            }
        } else if (this.render_collapsed_slots) {
            // if collapsed
            var input_slot = null;
            var output_slot = null;

            // get first connected slot to render
            if (node.inputs) {
                for (let i = 0; i < node.inputs.length; i++) {
                    var slot_i = node.inputs[i];
                    if (slot_i.link == null) {
                        continue;
                    }
                    input_slot = slot_i;
                    break;
                }
            }
            if (node.outputs) {
                for (let i = 0; i < node.outputs.length; i++) {
                    var slot_o = node.outputs[i];
                    if (!slot_o.links || !slot_o.links.length) {
                        continue;
                    }
                    output_slot = slot_o;
                }
            }

            if (input_slot) {
                let x = 0;
                let y = LiteGraph.NODE_TITLE_HEIGHT * -0.5; // center
                if (horizontal) {
                    x = node._collapsed_width * 0.5;
                    y = -LiteGraph.NODE_TITLE_HEIGHT;
                }
                ctx.fillStyle = "#686";
                ctx.beginPath();
                if (
                    input_slot.type === LiteGraph.EVENT || input_slot.type === LiteGraph.ACTION ||
                    input_slot.shape === LiteGraph.BOX_SHAPE
                ) {
                    ctx.rect(x - 7 + 0.5, y - 4, 14, 8);
                } else if (input_slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(x + 8, y);
                    ctx.lineTo(x + -4, y - 4);
                    ctx.lineTo(x + -4, y + 4);
                    ctx.closePath();
                } else {
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
            }

            if (output_slot) {
                let x = node._collapsed_width;
                let y = LiteGraph.NODE_TITLE_HEIGHT * -0.5; // center
                if (horizontal) {
                    x = node._collapsed_width * 0.5;
                    y = 0;
                }
                ctx.fillStyle = "#686";
                ctx.strokeStyle = "black";
                ctx.beginPath();
                if (
                    output_slot.type === LiteGraph.EVENT || output_slot.type === LiteGraph.ACTION ||
                    output_slot.shape === LiteGraph.BOX_SHAPE
                ) {
                    ctx.rect(x - 7 + 0.5, y - 4, 14, 8);
                } else if (output_slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(x + 6, y);
                    ctx.lineTo(x - 6, y - 4);
                    ctx.lineTo(x - 6, y + 4);
                    ctx.closePath();
                } else {
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
                // ctx.stroke();
            }
        }

        if (node.clip_area || this.clip_all_nodes) {
            ctx.restore();
        }

        ctx.globalAlpha = 1.0;
    }

    drawNodeTooltip( ctx, node ) {
        if(!node || !ctx) {
            LiteGraph.log_warn("drawNodeTooltip: invalid node or ctx",node,ctx);
            return;
        }
        var text = node.properties.tooltip!=undefined?node.properties.tooltip:"";
        if (!text || text=="") {
            if (LiteGraph.show_node_tooltip_use_descr_property && node.constructor.desc) {
                text = node.constructor.desc;
            }
        }
        text = (text+"").trim();
        if(!text || text == "") {
            // DBG("Empty tooltip");
            return;
        }

        var pos = [0,-LiteGraph.NODE_TITLE_HEIGHT]; // node.pos;
        // text = text.substr(0,30); //avoid weird
        // text = text + "\n" + text;
        var size = node.flags.collapsed? [LiteGraph.NODE_COLLAPSED_WIDTH, LiteGraph.NODE_TITLE_HEIGHT] : node.size;

        // using a trick to save the calculated height of the tip the first time using trasparent, to than show it
        // node.ttip_oTMultiRet is not set or false the first time

        ctx.font = "14px Courier New";
        // var info = ctx.measureText(text);
        var w = Math.max(node.size[0],160) + 20; // info.width + 20;
        var h = node.ttip_oTMultiRet ? node.ttip_oTMultiRet.height + 15 : 21;

        ctx.globalAlpha = 0.7 * this.editor_alpha;

        ctx.shadowColor = node.ttip_oTMultiRet?"black":"transparent";
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 3;
        ctx.fillStyle = node.ttip_oTMultiRet?"#454":"transparent";
        ctx.beginPath();

        ctx.roundRect( pos[0] - w*0.5 + size[0]/2, pos[1] - 15 - h, w, h, [3]);
        ctx.moveTo( pos[0] - 10 + size[0]/2, pos[1] - 15 );
        ctx.lineTo( pos[0] + 10 + size[0]/2, pos[1] - 15 );
        ctx.lineTo( pos[0] + size[0]/2, pos[1] - 5 );
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.textAlign = "center";
        ctx.fillStyle = node.ttip_oTMultiRet?"#CEC":"transparent";

        ctx.globalAlpha = this.editor_alpha;

        // ctx.fillText(text, pos[0] + size[0]/2, pos[1] - 15 - h * 0.3);
        const oTMultiRet = LiteGraph.canvasFillTextMultiline(ctx, text, pos[0] + size[0]/2, pos[1] - (h), w, 14);

        node.ttip_oTMultiRet = oTMultiRet;

        ctx.closePath();
    }

    // used by this.over_link_center
    drawLinkTooltip(ctx, link) {
        var pos = link._pos;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc( pos[0], pos[1], 3, 0, Math.PI * 2 );
        ctx.fill();

        if(link.data == null)
            return;

        let r = this.processCallbackHandlers("onDrawLinkTooltip",{
            def_cb: this.onDrawLinkTooltip
        }, ctx, link, this);
        if(r!==null && (r === true || (typeof(r)=="object" && r.return_value === true))){
            return;
        }

        var data = link.data;
        var text = null;

        if( data.constructor === Number )
            text = data.toFixed(2);
        else if( data.constructor === String )
            text = "\"" + data + "\"";
        else if( data.constructor === Boolean )
            text = String(data);
        else if (data.toToolTip)
            text = data.toToolTip();
        else{
            try{
                text = "[" + data.constructor.name + "]";
            }catch(e){
                text = "["+typeof(data)+"]";
            }
        }

        if(text == null)
            return;
        text = text.substr(0,30); // avoid weird

        ctx.font = "14px Courier New";
        var info = ctx.measureText(text);
        var w = info.width + 20;
        var h = 24;
        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 3;
        ctx.fillStyle = "#454";
        ctx.beginPath();
        ctx.roundRect( pos[0] - w*0.5, pos[1] - 15 - h, w, h, [3]);
        ctx.moveTo( pos[0] - 10, pos[1] - 15 );
        ctx.lineTo( pos[0] + 10, pos[1] - 15 );
        ctx.lineTo( pos[0], pos[1] - 5 );
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.textAlign = "center";
        ctx.fillStyle = "#CEC";
        ctx.fillText(text, pos[0], pos[1] - 15 - h * 0.3);
    }

    drawNodeShape(node, ctx, size, fgcolor, bgcolor, selected, mouse_over) {
        // bg rect
        ctx.strokeStyle = fgcolor;
        ctx.fillStyle = bgcolor;

        let r = null;
        var title_height = LiteGraph.NODE_TITLE_HEIGHT;
        var low_quality = this.lowQualityRenderingRequired(0.5);

        // render node area depending on shape
        var shape = node._shape || node.constructor.shape || LiteGraph.ROUND_SHAPE;

        var title_mode = node.constructor.title_mode;

        var render_title = true;
        if (title_mode == LiteGraph.TRANSPARENT_TITLE || title_mode == LiteGraph.NO_TITLE) {
            render_title = false;
        } else if (title_mode == LiteGraph.AUTOHIDE_TITLE && mouse_over) {
            render_title = true;
        }

        var area = tmp_area;
        area[0] = 0; // x
        area[1] = render_title ? -title_height : 0; // y
        area[2] = size[0] + 1; // w
        area[3] = render_title ? size[1] + title_height : size[1]; // h

        var old_alpha = ctx.globalAlpha;

        // full node shape
        // if(node.flags.collapsed)
        {
            ctx.beginPath();
            if (shape == LiteGraph.BOX_SHAPE || low_quality) {
                ctx.fillRect(area[0], area[1], area[2], area[3]);
            } else if (
                shape == LiteGraph.ROUND_SHAPE ||
                shape == LiteGraph.CARD_SHAPE
            ) {
                ctx.roundRect(
                    area[0],
                    area[1],
                    area[2],
                    area[3],
                    shape == LiteGraph.CARD_SHAPE ? [this.round_radius,this.round_radius,0,0] : [this.round_radius],
                );
            } else if (shape == LiteGraph.CIRCLE_SHAPE) {
                ctx.arc(
                    size[0] * 0.5,
                    size[1] * 0.5,
                    size[0] * 0.5,
                    0,
                    Math.PI * 2,
                );
            }
            ctx.fill();

            // separator
            if(!node.flags.collapsed && render_title) {
                ctx.shadowColor = "transparent";
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.fillRect(0, -1, area[2], 2);
            }
        }
        ctx.shadowColor = "transparent";
        
        node.processCallbackHandlers("onDrawBackground",{
            def_cb: node.onDrawBackground
        }, ctx, this, this.canvas, this.graph_mouse);

        // title bg (remember, it is rendered ABOVE the node)
        if (render_title || title_mode == LiteGraph.TRANSPARENT_TITLE) {
            // title bar
            r = node.processCallbackHandlers("onDrawTitleBar",{
                def_cb: node.onDrawTitleBar
            }, ctx, title_height, size, this.ds.scale, fgcolor);
            if(r!==null && (r === true || (typeof(r)=="object" && r.return_value === true))){
                // managed
            } else if (
                title_mode != LiteGraph.TRANSPARENT_TITLE &&
                (node.constructor.title_color || this.render_title_colored)
            ) {
                var title_color = node.constructor.title_color || fgcolor;

                if (node.flags.collapsed) {
                    ctx.shadowColor = LiteGraph.DEFAULT_SHADOW_COLOR;
                }

                //* gradient test
                if (this.use_gradients) {
                    var grad = LGraphCanvas.gradients[title_color];
                    if (!grad) {
                        grad = LGraphCanvas.gradients[title_color] = ctx.createLinearGradient(0, 0, 400, 0);
                        grad.addColorStop(0, title_color); // TODO refactor: validate color !! prevent DOMException
                        grad.addColorStop(1, "#000");
                    }
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = title_color;
                }

                // ctx.globalAlpha = 0.5 * old_alpha;
                ctx.beginPath();
                if (shape == LiteGraph.BOX_SHAPE || low_quality) {
                    ctx.rect(0, -title_height, size[0] + 1, title_height);
                } else if ( shape == LiteGraph.ROUND_SHAPE || shape == LiteGraph.CARD_SHAPE ) {
                    ctx.roundRect(
                        0,
                        -title_height,
                        size[0] + 1,
                        title_height,
                        node.flags.collapsed ? [this.round_radius] : [this.round_radius,this.round_radius,0,0],
                    );
                }
                ctx.fill();
                ctx.shadowColor = "transparent";
            }

            let colState = false;
            if (LiteGraph.node_box_coloured_by_mode && LiteGraph.NODE_MODES_COLORS[node.mode]) {
                colState = LiteGraph.NODE_MODES_COLORS[node.mode];
            }
            if (LiteGraph.node_box_coloured_when_on) {
                colState = node.action_triggered ? "#FFF" : (node.execute_triggered ? "#AAA" : colState);
            }

            // title box
            var box_size = 10;
            r = node.processCallbackHandlers("onDrawTitleBox",{
                def_cb: node.onDrawTitleBox
            }, ctx, title_height, size, this.ds.scale);
            if(r!==null && (r === true || (typeof(r)=="object" && r.return_value === true))){
                // managed
            } else if (
                shape == LiteGraph.ROUND_SHAPE ||
                shape == LiteGraph.CIRCLE_SHAPE ||
                shape == LiteGraph.CARD_SHAPE
            ) {
                if (low_quality) {
                    ctx.fillStyle = "black";
                    ctx.beginPath();
                    ctx.arc(
                        title_height * 0.5,
                        title_height * -0.5,
                        box_size * 0.5 + 1,
                        0,
                        Math.PI * 2,
                    );
                    ctx.fill();
                }

                ctx.fillStyle = node.boxcolor || colState || LiteGraph.NODE_DEFAULT_BOXCOLOR;
                if(low_quality)
                    ctx.fillRect( title_height * 0.5 - box_size *0.5, title_height * -0.5 - box_size *0.5, box_size , box_size );
                else {
                    ctx.beginPath();
                    ctx.arc(
                        title_height * 0.5,
                        title_height * -0.5,
                        box_size * 0.5,
                        0,
                        Math.PI * 2,
                    );
                    ctx.fill();
                }
            } else {
                if (low_quality) {
                    ctx.fillStyle = "black";
                    ctx.fillRect(
                        (title_height - box_size) * 0.5 - 1,
                        (title_height + box_size) * -0.5 - 1,
                        box_size + 2,
                        box_size + 2,
                    );
                }
                ctx.fillStyle = node.boxcolor || colState || LiteGraph.NODE_DEFAULT_BOXCOLOR;
                ctx.fillRect(
                    (title_height - box_size) * 0.5,
                    (title_height + box_size) * -0.5,
                    box_size,
                    box_size,
                );
            }
            ctx.globalAlpha = old_alpha;

            // title text
            node.processCallbackHandlers("onDrawTitleText",{
                    def_cb: node.onDrawTitleText
                },
                ctx,
                title_height,
                size,
                this.ds.scale,
                this.title_text_font,
                selected,
            );
            if (!low_quality) {
                ctx.font = this.title_text_font;
                var title = String(node.getTitle());
                if (title) {
                    if (selected) {
                        ctx.fillStyle = LiteGraph.NODE_SELECTED_TITLE_COLOR;
                    } else {
                        ctx.fillStyle =
                            node.constructor.title_text_color ||
                            this.node_title_color;
                    }
                    if (node.flags.collapsed) {
                        ctx.textAlign = "left";
                        ctx.fillText(
                            title, // NO? .substring(0,20), // avoid urls too long
                            title_height,// + measure.width * 0.5,
                            LiteGraph.NODE_TITLE_TEXT_Y - title_height,
                        );
                        ctx.textAlign = "left";
                    } else {
                        ctx.textAlign = "left";
                        ctx.fillText(
                            title,
                            title_height,
                            LiteGraph.NODE_TITLE_TEXT_Y - title_height,
                        );
                    }
                }
            }

            // subgraph box
            if (!node.flags.collapsed && node.subgraph && !node.skip_subgraph_button) {
                var w = LiteGraph.NODE_TITLE_HEIGHT;
                var x = node.size[0] - w;
                var over = LiteGraph.isInsideRectangle( this.graph_mouse[0] - node.pos[0], this.graph_mouse[1] - node.pos[1], x+2, -w+2, w-4, w-4 );
                ctx.fillStyle = over ? "#888" : "#555";
                if( shape == LiteGraph.BOX_SHAPE || low_quality)
                    ctx.fillRect(x+2, -w+2, w-4, w-4);
                else {
                    ctx.beginPath();
                    ctx.roundRect(x+2, -w+2, w-4, w-4,[4]);
                    ctx.fill();
                }
                ctx.fillStyle = "#333";
                ctx.beginPath();
                ctx.moveTo(x + w * 0.2, -w * 0.6);
                ctx.lineTo(x + w * 0.8, -w * 0.6);
                ctx.lineTo(x + w * 0.5, -w * 0.3);
                ctx.fill();
            }

            // custom title render
            node.processCallbackHandlers("onDrawTitle",{
                def_cb: node.onDrawTitle
            }, ctx);
        }

        // render selection marker
        if (selected) {
            node.processCallbackHandlers("onBounding",{
                def_cb: node.onBounding
            }, area);

            if (title_mode == LiteGraph.TRANSPARENT_TITLE) {
                area[1] -= title_height;
                area[3] += title_height;
            }
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            if (shape == LiteGraph.BOX_SHAPE) {
                ctx.rect(
                    -6 + area[0],
                    -6 + area[1],
                    12 + area[2],
                    12 + area[3],
                );
            } else if (
                shape == LiteGraph.ROUND_SHAPE ||
                (shape == LiteGraph.CARD_SHAPE && node.flags.collapsed)
            ) {
                ctx.roundRect(
                    -6 + area[0],
                    -6 + area[1],
                    12 + area[2],
                    12 + area[3],
                    [this.round_radius * 2],
                );
            } else if (shape == LiteGraph.CARD_SHAPE) {
                ctx.roundRect(
                    -6 + area[0],
                    -6 + area[1],
                    12 + area[2],
                    12 + area[3],
                    [this.round_radius * 2,2,this.round_radius * 2,2],
                );
            } else if (shape == LiteGraph.CIRCLE_SHAPE) {
                ctx.arc(
                    size[0] * 0.5,
                    size[1] * 0.5,
                    size[0] * 0.5 + 6,
                    0,
                    Math.PI * 2,
                );
            }
            ctx.strokeStyle = LiteGraph.NODE_BOX_OUTLINE_COLOR;
            ctx.stroke();
            ctx.strokeStyle = fgcolor;
            ctx.globalAlpha = 1;
        }

        // these counter helps in conditioning drawing based on if the node has been executed or an action occurred
        if (node.execute_triggered>0) node.execute_triggered--;
        if (node.action_triggered>0) node.action_triggered--;
    }

    // TODO should implement correct getBounding to do it
    // drawNodeOutsideBorder(title_mode, fgcolor) {
    //     var shape = node._shape || node.constructor.shape || LiteGraph.ROUND_SHAPE;
    //     if (title_mode == LiteGraph.TRANSPARENT_TITLE) {
    //         area[1] -= LiteGraph.NODE_TITLE_HEIGHT;
    //         area[3] += LiteGraph.NODE_TITLE_HEIGHT;
    //     }
    //     ctx.lineWidth = 1;
    //     ctx.globalAlpha = 0.8;
    //     ctx.beginPath();
    //     if (shape == LiteGraph.BOX_SHAPE) {
    //         ctx.rect(
    //             -6 + area[0],
    //             -6 + area[1],
    //             12 + area[2],
    //             12 + area[3],
    //         );
    //     } else if (
    //         shape == LiteGraph.ROUND_SHAPE ||
    //         (shape == LiteGraph.CARD_SHAPE && node.flags.collapsed)
    //     ) {
    //         ctx.roundRect(
    //             -6 + area[0],
    //             -6 + area[1],
    //             12 + area[2],
    //             12 + area[3],
    //             [this.round_radius * 2],
    //         );
    //     } else if (shape == LiteGraph.CARD_SHAPE) {
    //         ctx.roundRect(
    //             -6 + area[0],
    //             -6 + area[1],
    //             12 + area[2],
    //             12 + area[3],
    //             [this.round_radius * 2,2,this.round_radius * 2,2],
    //         );
    //     } else if (shape == LiteGraph.CIRCLE_SHAPE) {
    //         ctx.arc(
    //             size[0] * 0.5,
    //             size[1] * 0.5,
    //             size[0] * 0.5 + 6,
    //             0,
    //             Math.PI * 2,
    //         );
    //     }
    //     ctx.strokeStyle = LiteGraph.NODE_BOX_OUTLINE_COLOR;
    //     ctx.stroke();
    //     ctx.strokeStyle = fgcolor;
    //     ctx.globalAlpha = 1;
    // }

    /**
     * draws every connection visible in the canvas
     * OPTIMIZE THIS: pre-catch connections position instead of recomputing them every time
     * @method drawConnections
     **/
    drawConnections(ctx) {
        var now = LiteGraph.getTime();
        var visible_area = this.visible_area;
        margin_area[0] = visible_area[0] - 20;
        margin_area[1] = visible_area[1] - 20;
        margin_area[2] = visible_area[2] + 40;
        margin_area[3] = visible_area[3] + 40;

        // draw connections
        ctx.lineWidth = this.connections_width;

        ctx.fillStyle = "#AAA";
        ctx.strokeStyle = "#AAA";
        ctx.globalAlpha = this.editor_alpha;
        // for every node
        var nodes = this.graph._nodes;
        for (var n = 0, l = nodes.length; n < l; ++n) {
            var node = nodes[n];
            // for every input (we render just inputs because it is easier as every slot can only have one input)
            if (!node.inputs || !node.inputs.length) {
                continue;
            }

            for (let i = 0; i < node.inputs.length; ++i) {
                var input = node.inputs[i];
                if (!input || input.link == null) {
                    continue;
                }
                var link_id = input.link;
                var link = this.graph.links[link_id];
                if (!link) {
                    continue;
                }

                // find link info
                var start_node = this.graph.getNodeById(link.origin_id);
                if (start_node == null) {
                    continue;
                }
                var start_node_slot = link.origin_slot;
                var start_node_slotpos = null;
                if (start_node_slot == -1) {
                    start_node_slotpos = [
                        start_node.pos[0] + 10,
                        start_node.pos[1] + 10,
                    ];
                } else {
                    start_node_slotpos = start_node.getConnectionPos(
                        false,
                        start_node_slot,
                        tempA,
                    );
                }
                var end_node_slotpos = node.getConnectionPos(true, i, tempB);

                // compute link bounding
                link_bounding[0] = start_node_slotpos[0];
                link_bounding[1] = start_node_slotpos[1];
                link_bounding[2] = end_node_slotpos[0] - start_node_slotpos[0];
                link_bounding[3] = end_node_slotpos[1] - start_node_slotpos[1];
                if (link_bounding[2] < 0) {
                    link_bounding[0] += link_bounding[2];
                    link_bounding[2] = Math.abs(link_bounding[2]);
                }
                if (link_bounding[3] < 0) {
                    link_bounding[1] += link_bounding[3];
                    link_bounding[3] = Math.abs(link_bounding[3]);
                }

                // skip links outside of the visible area of the canvas
                if (!LiteGraph.overlapBounding(link_bounding, margin_area)) {
                    continue;
                }

                var start_slot = start_node.outputs[start_node_slot];
                var end_slot = node.inputs[i];
                if (!start_slot || !end_slot) {
                    continue;
                }
                var start_dir =
                    start_slot.dir ||
                    (start_node.horizontal ? LiteGraph.DOWN : LiteGraph.RIGHT);
                var end_dir =
                    end_slot.dir ||
                    (node.horizontal ? LiteGraph.UP : LiteGraph.LEFT);

                this.renderLink(
                    ctx,
                    start_node_slotpos,
                    end_node_slotpos,
                    link,
                    false,
                    0,
                    null,
                    start_dir,
                    end_dir,
                );

                // event triggered rendered on top
                if (link && link._last_time && now - link._last_time < 1000) {
                    var f = 2.0 - (now - link._last_time) * 0.002;
                    var tmp = ctx.globalAlpha;
                    ctx.globalAlpha = tmp * f;
                    this.renderLink(
                        ctx,
                        start_node_slotpos,
                        end_node_slotpos,
                        link,
                        true,
                        f,
                        "white",
                        start_dir,
                        end_dir,
                    );
                    ctx.globalAlpha = tmp;
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    /**
     * draws a link between two points
     * @method renderLink
     * @param {vec2} a start pos
     * @param {vec2} b end pos
     * @param {Object} link the link object with all the link info
     * @param {boolean} skip_border ignore the shadow of the link
     * @param {boolean} flow show flow animation (for events)
     * @param {string} color the color for the link
     * @param {number} start_dir the direction enum
     * @param {number} end_dir the direction enum
     * @param {number} num_sublines number of sublines (useful to represent vec3 or rgb)
     **/
    renderLink(
        ctx,
        a,
        b,
        link,
        skip_border,
        flow,
        color,
        start_dir,
        end_dir,
        num_sublines,
    ) {
        if (link) {
            this.visible_links.push(link);
        }

        // choose color
        if (!color && link) {
            color = link.color || LGraphCanvas.link_type_colors[link.type];
        }
        if (!color) {
            color = this.default_link_color;
        }
        if (link != null && this.highlighted_links[link.id]) {
            color = "#FFF";
        }

        start_dir = start_dir || LiteGraph.RIGHT;
        end_dir = end_dir || LiteGraph.LEFT;

        var dist = LiteGraph.distance(a, b);

        if (this.render_connections_border && this.ds.scale > 0.6) {
            ctx.lineWidth = this.connections_width + 4;
        }
        ctx.lineJoin = "round";
        num_sublines = num_sublines || 1;
        if (num_sublines > 1) {
            ctx.lineWidth = 0.5;
        }

        // begin line shape
        ctx.beginPath();
        for (let i = 0; i < num_sublines; i += 1) {
            var offsety = (i - (num_sublines - 1) * 0.5) * 5;

            if (this.links_render_mode == LiteGraph.SPLINE_LINK) {
                ctx.moveTo(a[0], a[1] + offsety);
                let start_offset_x = 0;
                let start_offset_y = 0;
                let end_offset_x = 0;
                let end_offset_y = 0;
                switch (start_dir) {
                    case LiteGraph.LEFT:
                        start_offset_x = dist * -0.25;
                        break;
                    case LiteGraph.RIGHT:
                        start_offset_x = dist * 0.25;
                        break;
                    case LiteGraph.UP:
                        start_offset_y = dist * -0.25;
                        break;
                    case LiteGraph.DOWN:
                        start_offset_y = dist * 0.25;
                        break;
                }
                switch (end_dir) {
                    case LiteGraph.LEFT:
                        end_offset_x = dist * -0.25;
                        break;
                    case LiteGraph.RIGHT:
                        end_offset_x = dist * 0.25;
                        break;
                    case LiteGraph.UP:
                        end_offset_y = dist * -0.25;
                        break;
                    case LiteGraph.DOWN:
                        end_offset_y = dist * 0.25;
                        break;
                }
                ctx.bezierCurveTo(
                    a[0] + start_offset_x,
                    a[1] + start_offset_y + offsety,
                    b[0] + end_offset_x,
                    b[1] + end_offset_y + offsety,
                    b[0],
                    b[1] + offsety,
                );
            } else if (this.links_render_mode == LiteGraph.LINEAR_LINK) {
                ctx.moveTo(a[0], a[1] + offsety);
                let start_offset_x = 0;
                let start_offset_y = 0;
                let end_offset_x = 0;
                let end_offset_y = 0;
                switch (start_dir) {
                    case LiteGraph.LEFT:
                        start_offset_x = -1;
                        break;
                    case LiteGraph.RIGHT:
                        start_offset_x = 1;
                        break;
                    case LiteGraph.UP:
                        start_offset_y = -1;
                        break;
                    case LiteGraph.DOWN:
                        start_offset_y = 1;
                        break;
                }
                switch (end_dir) {
                    case LiteGraph.LEFT:
                        end_offset_x = -1;
                        break;
                    case LiteGraph.RIGHT:
                        end_offset_x = 1;
                        break;
                    case LiteGraph.UP:
                        end_offset_y = -1;
                        break;
                    case LiteGraph.DOWN:
                        end_offset_y = 1;
                        break;
                }
                var l = 15;
                ctx.lineTo(
                    a[0] + start_offset_x * l,
                    a[1] + start_offset_y * l + offsety,
                );
                ctx.lineTo(
                    b[0] + end_offset_x * l,
                    b[1] + end_offset_y * l + offsety,
                );
                ctx.lineTo(b[0], b[1] + offsety);
            } else if (this.links_render_mode == LiteGraph.STRAIGHT_LINK) {
                ctx.moveTo(a[0], a[1]);
                var start_x = a[0];
                var start_y = a[1];
                var end_x = b[0];
                var end_y = b[1];
                if (start_dir == LiteGraph.RIGHT) {
                    start_x += 10;
                } else {
                    start_y += 10;
                }
                if (end_dir == LiteGraph.LEFT) {
                    end_x -= 10;
                } else {
                    end_y -= 10;
                }
                ctx.lineTo(start_x, start_y);
                ctx.lineTo((start_x + end_x) * 0.5, start_y);
                ctx.lineTo((start_x + end_x) * 0.5, end_y);
                ctx.lineTo(end_x, end_y);
                ctx.lineTo(b[0], b[1]);
            } else {
                return;
            } // unknown
        }

        // rendering the outline of the connection can be a little bit slow
        if (
            this.render_connections_border &&
            this.ds.scale > 0.6 &&
            !skip_border
        ) {
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.stroke();
        }

        ctx.lineWidth = this.connections_width;
        ctx.fillStyle = ctx.strokeStyle = color;
        ctx.stroke();
        // end line shape

        var pos = this.computeConnectionPoint(a, b, 0.5, start_dir, end_dir);
        if (link && link._pos) {
            link._pos[0] = pos[0];
            link._pos[1] = pos[1];
        }

        // render arrow in the middle
        if (
            this.ds.scale >= 0.6 &&
            this.highquality_render &&
            end_dir != LiteGraph.CENTER
        ) {
            // render arrow
            if (this.render_connection_arrows) {
                // compute two points in the connection
                var posA = this.computeConnectionPoint(
                    a,
                    b,
                    0.25,
                    start_dir,
                    end_dir,
                );
                var posB = this.computeConnectionPoint(
                    a,
                    b,
                    0.26,
                    start_dir,
                    end_dir,
                );
                var posC = this.computeConnectionPoint(
                    a,
                    b,
                    0.75,
                    start_dir,
                    end_dir,
                );
                var posD = this.computeConnectionPoint(
                    a,
                    b,
                    0.76,
                    start_dir,
                    end_dir,
                );

                // compute the angle between them so the arrow points in the right direction
                var angleA = 0;
                var angleB = 0;
                if (this.render_curved_connections) {
                    angleA = -Math.atan2(posB[0] - posA[0], posB[1] - posA[1]);
                    angleB = -Math.atan2(posD[0] - posC[0], posD[1] - posC[1]);
                } else {
                    angleB = angleA = b[1] > a[1] ? 0 : Math.PI;
                }

                // render arrow
                ctx.save();
                ctx.translate(posA[0], posA[1]);
                ctx.rotate(angleA);
                ctx.beginPath();
                ctx.moveTo(-5, -3);
                ctx.lineTo(0, +7);
                ctx.lineTo(+5, -3);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.translate(posC[0], posC[1]);
                ctx.rotate(angleB);
                ctx.beginPath();
                ctx.moveTo(-5, -3);
                ctx.lineTo(0, +7);
                ctx.lineTo(+5, -3);
                ctx.fill();
                ctx.restore();
            }

            // circle
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // render flowing points
        if (flow) {
            ctx.fillStyle = color;
            for (let i = 0; i < 5; ++i) {
                var f = (LiteGraph.getTime() * 0.001 + i * 0.2) % 1;
                pos = this.computeConnectionPoint(
                    a,
                    b,
                    f,
                    start_dir,
                    end_dir,
                );
                ctx.beginPath();
                ctx.arc(pos[0], pos[1], 5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    // returns the link center point based on curvature
    computeConnectionPoint(a, b, t, start_dir, end_dir) {
        start_dir = start_dir || LiteGraph.RIGHT;
        end_dir = end_dir || LiteGraph.LEFT;

        var dist = LiteGraph.distance(a, b);
        var p0 = a;
        var p1 = [a[0], a[1]];
        var p2 = [b[0], b[1]];
        var p3 = b;

        switch (start_dir) {
            case LiteGraph.LEFT:
                p1[0] += dist * -0.25;
                break;
            case LiteGraph.RIGHT:
                p1[0] += dist * 0.25;
                break;
            case LiteGraph.UP:
                p1[1] += dist * -0.25;
                break;
            case LiteGraph.DOWN:
                p1[1] += dist * 0.25;
                break;
        }
        switch (end_dir) {
            case LiteGraph.LEFT:
                p2[0] += dist * -0.25;
                break;
            case LiteGraph.RIGHT:
                p2[0] += dist * 0.25;
                break;
            case LiteGraph.UP:
                p2[1] += dist * -0.25;
                break;
            case LiteGraph.DOWN:
                p2[1] += dist * 0.25;
                break;
        }

        var c1 = (1 - t) * (1 - t) * (1 - t);
        var c2 = 3 * ((1 - t) * (1 - t)) * t;
        var c3 = 3 * (1 - t) * (t * t);
        var c4 = t * t * t;

        var x = c1 * p0[0] + c2 * p1[0] + c3 * p2[0] + c4 * p3[0];
        var y = c1 * p0[1] + c2 * p1[1] + c3 * p2[1] + c4 * p3[1];
        return [x, y];
    }

    drawExecutionOrder(ctx) {
        ctx.shadowColor = "transparent";
        ctx.globalAlpha = 0.25;

        ctx.textAlign = "center";
        ctx.strokeStyle = "white";
        ctx.globalAlpha = 0.75;

        var visible_nodes = this.visible_nodes;
        for (let i = 0; i < visible_nodes.length; ++i) {
            var node = visible_nodes[i];
            ctx.fillStyle = "black";
            ctx.fillRect(
                node.pos[0] - LiteGraph.NODE_TITLE_HEIGHT,
                node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT,
                LiteGraph.NODE_TITLE_HEIGHT,
                LiteGraph.NODE_TITLE_HEIGHT,
            );
            if (node.order == 0) {
                ctx.strokeRect(
                    node.pos[0] - LiteGraph.NODE_TITLE_HEIGHT + 0.5,
                    node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5,
                    LiteGraph.NODE_TITLE_HEIGHT,
                    LiteGraph.NODE_TITLE_HEIGHT,
                );
            }
            ctx.fillStyle = "#FFF";
            ctx.fillText(
                node.order,
                node.pos[0] + LiteGraph.NODE_TITLE_HEIGHT * -0.5,
                node.pos[1] - 6,
            );
        }
        ctx.globalAlpha = 1;
    }

    /**
     * draws the widgets stored inside a node
     * @method drawNodeWidgets
     **/
    drawNodeWidgets(node, posY, ctx, active_widget) {
        if (!node.widgets || !node.widgets.length) {
            return 0;
        }
        var width = node.size[0];
        var widgets = node.widgets;
        posY += 2;
        var H = LiteGraph.NODE_WIDGET_HEIGHT;
        var show_text = !this.lowQualityRenderingRequired(0.5);
        ctx.save();
        ctx.globalAlpha = this.editor_alpha;
        var outline_color = LiteGraph.WIDGET_OUTLINE_COLOR;
        var background_color = LiteGraph.WIDGET_BGCOLOR;
        var text_color = LiteGraph.WIDGET_TEXT_COLOR;
        var secondary_text_color = LiteGraph.WIDGET_SECONDARY_TEXT_COLOR;
        var margin = 15;
        var is_over_widget = false;

        for (let i = 0; i < widgets.length; ++i) {
            var w = widgets[i];
            var y = posY;
            if (w.y) {
                y = w.y;
            }
            w.last_y = y;
            ctx.strokeStyle = outline_color;
            ctx.fillStyle = "#222";
            ctx.textAlign = "left";
            // ctx.lineWidth = 2;
            if(w.disabled)
                ctx.globalAlpha *= 0.5;
            var widget_width = w.width || width;

            // is over this widget?
            is_over_widget = this.over_widget == w;
            // is this widget active(clicked)?
            if(active_widget == w){
                //
            }
            
            switch (w.type) {
                case "button":
                    if (w.clicked) {
                        ctx.fillStyle = "#AAA";
                        w.clicked = false;
                        this.dirty_canvas = true;
                    }
                    ctx.fillRect(margin, y, widget_width - margin * 2, H);
                    if(show_text && !w.disabled)
                        ctx.strokeRect( margin, y, widget_width - margin * 2, H );
                    if (show_text) {
                        ctx.textAlign = "center";
                        ctx.fillStyle = text_color;
                        if(is_over_widget || this.options.hide_widget_label_when_small===true || this.options.hide_widget_label_when_small < width){
                            ctx.fillText(w.label || w.name, widget_width * 0.5, y + H * 0.7);
                        }
                    }
                    break;
                case "toggle":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
                    if (show_text)
                        ctx.roundRect(margin, y, widget_width - margin * 2, H, [H * 0.5]);
                    else
                        ctx.rect(margin, y, widget_width - margin * 2, H );
                    ctx.fill();
                    if(show_text && !w.disabled)
                        ctx.stroke();
                    ctx.fillStyle = w.value ? "#89A" : "#333";
                    ctx.beginPath();
                    ctx.arc( widget_width - margin * 2, y + H * 0.5, H * 0.36, 0, Math.PI * 2 );
                    ctx.fill();
                    if (show_text) {
                        ctx.fillStyle = secondary_text_color;
                        const label = w.label || w.name;
                        if (label != null) {
                            if(is_over_widget || this.options.hide_widget_label_when_small===true || this.options.hide_widget_label_when_small < width){
                                ctx.fillText(label, margin * 2, y + H * 0.7);
                            }
                        }
                        ctx.fillStyle = w.value ? text_color : secondary_text_color;
                        ctx.textAlign = "right";
                        ctx.fillText(
                            w.value
                                ? w.options.on || "on"
                                : w.options.off || "off",
                            widget_width - 40,
                            y + H * 0.7,
                        );
                    }
                    break;
                case "slider":
                    ctx.fillStyle = background_color;
                    ctx.fillRect(margin, y, widget_width - margin * 2, H);
                    var range = w.options.max - w.options.min;
                    var nvalue = (w.value - w.options.min) / range;
                    if(nvalue < 0.0) nvalue = 0.0;
                    if(nvalue > 1.0) nvalue = 1.0;
                    ctx.fillStyle = w.options.hasOwnProperty("slider_color") ? w.options.slider_color : (active_widget == w ? "#89A" : "#678");
                    ctx.fillRect(margin, y, nvalue * (widget_width - margin * 2), H);
                    if(show_text && !w.disabled)
                        ctx.strokeRect(margin, y, widget_width - margin * 2, H);
                    if (w.marker) {
                        var marker_nvalue = (w.marker - w.options.min) / range;
                        if(marker_nvalue < 0.0) marker_nvalue = 0.0;
                        if(marker_nvalue > 1.0) marker_nvalue = 1.0;
                        ctx.fillStyle = w.options.hasOwnProperty("marker_color") ? w.options.marker_color : "#AA9";
                        ctx.fillRect( margin + marker_nvalue * (widget_width - margin * 2), y, 2, H );
                    }
                    if (show_text) {
                        ctx.textAlign = "center";
                        ctx.fillStyle = text_color;
                        if(is_over_widget || this.options.hide_widget_label_when_small===true || this.options.hide_widget_label_when_small < width){
                            ctx.fillText(
                                w.label ||
                                    w.name + "  "
                                    + LiteGraph.formatNumber(w.value, w.options.precision != null ? w.options.precision : 3)
                                ,
                                widget_width * 0.5,
                                y + H * 0.7,
                            );
                        }
                    }
                    break;
                case "number":
                case "combo":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
                    if(show_text)
                        ctx.roundRect(margin, y, widget_width - margin * 2, H, [H * 0.5] );
                    else
                        ctx.rect(margin, y, widget_width - margin * 2, H );
                    ctx.fill();
                    if (show_text) {
                        if(!w.disabled)
                            ctx.stroke();
                        ctx.fillStyle = text_color;
                        if(!w.disabled) {
                            ctx.beginPath();
                            ctx.moveTo(margin + 16, y + 5);
                            ctx.lineTo(margin + 6, y + H * 0.5);
                            ctx.lineTo(margin + 16, y + H - 5);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.moveTo(widget_width - margin - 16, y + 5);
                            ctx.lineTo(widget_width - margin - 6, y + H * 0.5);
                            ctx.lineTo(widget_width - margin - 16, y + H - 5);
                            ctx.fill();
                        }
                        ctx.fillStyle = secondary_text_color;
                        if(is_over_widget || this.options.hide_widget_label_when_small===true || this.options.hide_widget_label_when_small < width){
                            ctx.fillText(w.label || w.name, margin * 2 + 5, y + H * 0.7);
                        }
                        ctx.fillStyle = text_color;
                        ctx.textAlign = "right";
                        if (w.type == "number") {
                            ctx.fillText(
                                LiteGraph.formatNumber(w.value, w.options.precision !== undefined ? w.options.precision : 3),
                                widget_width - margin * 2 - 20,
                                y + H * 0.7,
                            );
                        } else {
                            var v = w.value;
                            if( w.options.values ) {
                                var values = w.options.values;
                                if( values.constructor === Function )
                                    values = values();
                                if(values && values.constructor !== Array)
                                    v = values[w.value];
                            }
                            ctx.fillText(
                                v,
                                widget_width - margin * 2 - 20,
                                y + H * 0.7,
                            );
                        }
                    }
                    break;
                case "string":
                case "text":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
                    if (show_text)
                        ctx.roundRect(margin, y, widget_width - margin * 2, H, [H * 0.5]);
                    else
                        ctx.rect( margin, y, widget_width - margin * 2, H );
                    ctx.fill();
                    if (show_text) {
                        if(!w.disabled)
                            ctx.stroke();
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(margin, y, widget_width - margin * 2, H);
                        ctx.clip();

                        // ctx.stroke();
                        ctx.fillStyle = secondary_text_color;
                        const label = w.label || w.name;
                        if (label != null) {
                            if(is_over_widget || this.options.hide_widget_label_when_small===true || this.options.hide_widget_label_when_small < width){
                                ctx.fillText(label, margin * 2, y + H * 0.7);
                            }
                        }
                        ctx.fillStyle = text_color;
                        ctx.textAlign = "right";
                        ctx.fillText(String(w.value).substr(0,30), widget_width - margin * 2, y + H * 0.7); // 30 chars max
                        ctx.restore();
                    }
                    break;
                default:
                    if (w.draw) {
                        w.draw(ctx, node, widget_width, y, H);
                    }
                    break;
            }
            posY += (w.computeSize ? w.computeSize(widget_width)[1] : H) + 4;
            ctx.globalAlpha = this.editor_alpha;

        }
        ctx.restore();
        ctx.textAlign = "left";
    }

    /**
     * process an event on widgets, or check overed widget if no event 
     * @method processNodeWidgets
     **/
    processNodeWidgets(node, pos, event, active_widget) {
        // if node has no widgets or not allowed interaction, return null
        if (!node.widgets || !node.widgets.length || (!this.allow_interaction && !node.flags.allow_interaction)) {
            if(!node.widgets || !node.widgets.length) LiteGraph.log_verbose("graph processNodeWidgets","no widgets for node", node);
            if(!this.allow_interaction && !node.flags.allow_interaction) LiteGraph.log_verbose("graph processNodeWidgets","interaction not allowed on graph and not overridden on node", node);
            return null;
        }

        var x = pos[0] - node.pos[0];
        var y = pos[1] - node.pos[1];
        var width = node.size[0];
        var height = LiteGraph.NODE_WIDGET_HEIGHT;
        var deltaX = event?.deltaX || event?.deltax || 0;
        var that = this;
        var ref_window = this.getCanvasWindow();
        var widget_width = width;
        var widget_height = height;

        for (let i = 0; i < node.widgets.length; ++i) {
            var w = node.widgets[i];
            if(!w || w.disabled)
                continue;
            if(typeof(w.computeSize)=="function"){
                const wSize = w.computeSize(node.size[0], node.size[1]);
                widget_width = wSize[0];
                widget_height = wSize[1];
            }else{
                widget_width = w.width || width;
                widget_height = w.height || height;
            }
            // outside
            if ( w != active_widget &&
                (x < 6 || x > widget_width - 12 || y < w.last_y || y > w.last_y + widget_height || w.last_y === undefined) ){
                continue;
            }

            var old_value = w.value;

            LiteGraph.log_verbose("graph processNodeWidgets","has widget", w);

            // if ( w == active_widget || (x > 6 && x < widget_width - 12 && y > w.last_y && y < w.last_y + widget_height) ) {
            // inside widget
            if(event){
                switch (w.type) {
                    case "button":
                        if (event.type === "pointerdown") {
                            if (w.callback) {
                                LiteGraph.log_debug("graph processNodeWidgets","button, calling callback", w.callback);
                                setTimeout(function() {
                                    w.callback(w, that, node, pos, event);
                                }, 20);
                            }else{
                                LiteGraph.log_verbose("graph processNodeWidgets","button, has not callback", w);
                            }
                            w.clicked = true;
                            this.dirty_canvas = true;
                        }else{
                            LiteGraph.log_verbose("graph processNodeWidgets","button, event is not pointer down", event);
                        }
                        break;
                    case "slider":
                        var nvalue = LiteGraph.clamp((x - 15) / (widget_width - 30), 0, 1);
                        if(w.options.read_only) break;
                        w.value = w.options.min + (w.options.max - w.options.min) * nvalue;
                        if (old_value != w.value) {
                            setTimeout(function() {
                                inner_value_change(w, w.value, old_value);
                            }, 20);
                        }
                        this.dirty_canvas = true;
                        break;
                    case "number":
                    case "combo":
                    case "enum":
                        if (event.type == "pointermove" && w.type == "number") {
                            if(deltaX)
                                w.value += deltaX * 0.1 * (w.options.step || 1);
                            if ( w.options.min != null && w.value < w.options.min ) {
                                w.value = w.options.min;
                            }
                            if ( w.options.max != null && w.value > w.options.max ) {
                                w.value = w.options.max;
                            }
                        } else if (event.type == "pointerdown") {
                            var values = w.options.values;
                            if (values && values.constructor === Function) {
                                values = w.options.values(w, node);
                            }
                            var values_list = null;

                            if( w.type != "number")
                                values_list = values.constructor === Array ? values : Object.keys(values);

                            let delta = x < 40 ? -1 : x > widget_width - 40 ? 1 : 0;
                            if (w.type == "number") {
                                w.value += delta * (w.options.step || 1);
                                if ( w.options.min != null && w.value < w.options.min ) {
                                    w.value = w.options.min;
                                }
                                if ( w.options.max != null && w.value > w.options.max ) {
                                    w.value = w.options.max;
                                }
                            } else if (delta) { // clicked on arrow, used for combos
                                var index = -1;
                                this.last_mouseclick = 0; // avoids double click event
                                if(values.constructor === Object)
                                    index = values_list.indexOf( String( w.value ) ) + delta;
                                else
                                    index = values_list.indexOf( w.value ) + delta;
                                if (index >= values_list.length) {
                                    index = values_list.length - 1;
                                }
                                if (index < 0) {
                                    index = 0;
                                }
                                if( values.constructor === Array )
                                    w.value = values[index];
                                else{
                                    // combo arrow
                                    console.debug("ARROW_ComboOrOtherWidget","clickCHECK",w,index,values);
                                    if(values != values_list){
                                        w.value = Object.keys(values)[index];
                                    }else{
                                        w.value = index;
                                    }
                                }
                            } else { // combo clicked
                                // var text_values = values != values_list ? Object.values(values) : values;
                                var entries = [];
                                if(values != values_list){
                                    Object.keys(values).forEach((element) => {
                                        entries.push({ value: element, content: values[element] });
                                    });
                                }else{
                                    // using simple
                                    entries = values;
                                }
                                console.debug("ComboOrOtherWidget","filling from",values,"to",entries);
                                let inner_clicked = function(v, cnv, node, pos, event, value_original) {
                                    console.debug("ComboOrOtherWidget","inner_clicked",...arguments);
                                    console.debug("ComboOrOtherWidget","inner_clicked",v,entries,values,values_list,"old_value",old_value);
                                    if(typeof v == "object" && typeof v.value !== "undefined"){
                                        console.debug("ComboOrOtherWidget","inner_clicked","using object key value",v);
                                        this.value = v.value;
                                        inner_value_change(this, v.value, old_value);
                                    }else{
                                        // if(values != values_list){
                                        //     console.debug("ComboOrOtherWidget","inner_clicked","value from key?",v,);
                                        //     // using simples
                                        //     v = entries.indexOf(v);
                                        // }
                                        console.debug("ComboOrOtherWidget","inner_clicked","using simple",v);
                                        // using simples
                                        this.value = v;
                                        inner_value_change(this, v, old_value);
                                    }
                                    that.dirty_canvas = true;
                                    return false;
                                }
                                LiteGraph.ContextMenu(
                                    entries, {
                                        scale: Math.max(1, this.ds.scale),
                                        event: event,
                                        className: "dark",
                                        callback: inner_clicked.bind(w),
                                    },
                                    ref_window,
                                );
                            }
                            // end mousedown
                        } else if(event.type == "pointerup" && w.type == "number") {
                            let delta = x < 40 ? -1 : x > widget_width - 40 ? 1 : 0;
                            if (event.click_time < 200 && delta == 0) {
                                this.prompt(
                                    "Value",w.value,function(v) {
                                    // check if v is a valid equation or a number
                                        if (/^[0-9+\-*/()\s]+|\d+\.\d+$/.test(v)) {
                                            try {// solve the equation if possible
                                                v = eval(v);
                                            } catch (error) {
                                                LiteGraph.log_warn(error);
                                            }
                                        }
                                        this.value = Number(v);
                                        inner_value_change(this, this.value, old_value);
                                    }.bind(w),
                                    event,
                                );
                            }
                        }

                        if( old_value != w.value )
                            setTimeout(
                                function() {
                                    inner_value_change(this, this.value, old_value);
                                }.bind(w),
                                20,
                            );
                        this.dirty_canvas = true;
                        break;
                    case "boolean":
                    case "toggle":
                        if (event.type == "pointerdown") {
                            w.value = !w.value;
                            setTimeout(function() {
                                inner_value_change(w, w.value);
                            }, 20);
                        }
                        break;
                    case "string":
                    case "text":
                        if (event.type == "pointerdown") {
                            this.prompt(
                                "Value",w.value,function(v) {
                                    // @TODO: this.value = v; // CHECK
                                    inner_value_change(this, v);
                                }.bind(w),
                                event,w.options ? w.options.multiline : false,
                            );
                        }
                        break;
                    default:
                        if (w.mouse) {
                            this.dirty_canvas = w.mouse(event, [x, y], node);
                        }
                        break;
                }
            }

            return w;
        }// end for

        function inner_value_change(widget, value, old_value) {
            LiteGraph.log_debug("inner_value_change for processNodeWidgets",widget,value);
            const value_original = value;
            // value changed
            if( old_value != w.value ) {
                node.processCallbackHandlers("onWidgetChanged",{
                    def_cb: node.onWidgetChanged
                }, w.name, w.value, old_value, w);
                // node.graph._version++;
                node.graph.onGraphChanged({action: "widgetChanged", doSave: true}); // tag: graph event entrypoint
            }
            if(widget.type == "number") {
                value = Number(value);
            }
            widget.value = value;
            if ( widget.options && widget.options.property && node.properties[widget.options.property] !== undefined ) {
                node.setProperty( widget.options.property, value );
            }
            if (widget.callback) {
                widget.callback(widget.value, that, node, pos, event, value_original);
            }
        }

        return null;
    }

    /**
     * draws every group area in the background
     * @method drawGroups
     **/
    drawGroups(canvas, ctx) {
        if (!this.graph) {
            return;
        }

        var groups = this.graph._groups;

        ctx.save();

        for (let i = 0; i < groups.length; ++i) {
            var group = groups[i];

            if (!LiteGraph.overlapBounding(this.visible_area, group._bounding)) {
                continue;
            } // out of the visible area

            ctx.fillStyle = group.color || "#335";
            ctx.strokeStyle = group.color || "#335";
            if(this.options.groups_border_alpha>=0){
                if(ctx.setStrokeColor){ // only webkit
                    ctx.setStrokeColor(ctx.strokeStyle, this.options.groups_border_alpha);
                }
            }
            var pos = group._pos;
            var size = group._size;
            ctx.globalAlpha = this.options.groups_alpha * this.editor_alpha; // check, not affecting
            ctx.beginPath();
            ctx.rect(pos[0] + 0.5, pos[1] + 0.5, size[0], size[1]);
            ctx.fill();
            ctx.globalAlpha = this.editor_alpha;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pos[0] + size[0], pos[1] + size[1]);
            ctx.lineTo(pos[0] + size[0] - this.options.groups_triangle_handler_size, pos[1] + size[1]);
            ctx.lineTo(pos[0] + size[0], pos[1] + size[1] - this.options.groups_triangle_handler_size);
            ctx.fill();

            var font_size = group.font_size || this.options.groups_title_font_size || LiteGraph.DEFAULT_GROUP_FONT_SIZE;
            ctx.font = font_size + "px "+this.options.groups_title_font;
            ctx.textAlign = this.options.groups_title_alignment;
            if(this.options.groups_title_wrap){
                LiteGraph.canvasFillTextMultiline(ctx, group.title, pos[0] + 4, pos[1] + font_size, size[0], font_size);
            }else{
                ctx.fillText(group.title, pos[0] + 4, pos[1] + font_size);
            }
        }

        ctx.restore();
    }

    adjustNodesSize() {
        var nodes = this.graph._nodes;
        for (let i = 0; i < nodes.length; ++i) {
            nodes[i].size = nodes[i].computeSize();
        }
        this.setDirty(true, true);
    }

    /**
     * resizes the canvas to a given size, if no size is passed, then it tries to fill the parentNode
     * @method resize
     **/
    resize(width, height) {
        if (!width && !height) {
            var parent = this.canvas.parentNode;
            width = parent.offsetWidth;
            height = parent.offsetHeight;
            LiteGraph.log_debug("lgraphcanvas","resize","not passed: AUTO",parent,width,height);
        }else{
            LiteGraph.log_debug("lgraphcanvas","resize","passed",width,height,parent);
        }
        if (this.canvas.width == width && this.canvas.height == height) {
            return;
        }
        this.canvas.width = width;
        this.canvas.height = height;
        this.bgcanvas.width = this.canvas.width;
        this.bgcanvas.height = this.canvas.height;
        this.setDirty(true, true);
    }

    /**
     * switches to live mode (node shapes are not rendered, only the content)
     * this feature was designed when graphs where meant to create user interfaces
     * @method switchLiveMode
     **/
    switchLiveMode(transition) {
        if (!transition) {
            this.live_mode = !this.live_mode;
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
            return;
        }

        var self = this;
        var delta = this.live_mode ? 1.1 : 0.9;
        if (this.live_mode) {
            this.live_mode = false;
            this.editor_alpha = 0.1;
        }

        var t = setInterval(function() {
            self.editor_alpha *= delta;
            self.dirty_canvas = true;
            self.dirty_bgcanvas = true;

            if (delta < 1 && self.editor_alpha < 0.01) {
                clearInterval(t);
                if (delta < 1) {
                    self.live_mode = true;
                }
            }
            if (delta > 1 && self.editor_alpha > 0.99) {
                clearInterval(t);
                self.editor_alpha = 1;
            }
        }, 1);
    }

    /* @TODO: Validate this is never called
    onNodeSelectionChange() {
        return; // disabled
    }
    */

    /* this is an implementation for touch not in production and not ready
        */
    /* LGraphCanvas.prototype.touchHandler = function(event) {
        //alert("foo");
        var touches = event.changedTouches,
            first = touches[0],
            type = "";

        switch (event.type) {
            case "touchstart":
                type = "pointerdown";
                break;
            case "touchmove":
                type = "pointermove";
                break;
            case "touchend":
                type = "pointerup";
                break;
            default:
                return;
        }

        //initMouseEvent(type, canBubble, cancelable, view, clickCount,
        //           screenX, screenY, clientX, clientY, ctrlKey,
        //           altKey, shiftKey, metaKey, button, relatedTarget);

        // this is eventually a Dom object, get the LGraphCanvas back
        if(typeof this.getCanvasWindow == "undefined"){
            var window = this.lgraphcanvas.getCanvasWindow();
        }else{
            var window = this.getCanvasWindow();
        }

        var document = window.document;

        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(
            type,
            true,
            true,
            window,
            1,
            first.screenX,
            first.screenY,
            first.clientX,
            first.clientY,
            false,
            false,
            false,
            false,
            0, //left
            null
        );
        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
    };*/

    /* CONTEXT MENU ********************/

    static onGroupAdd(info, entry, mouse_event) {
        const canvas = LGraphCanvas.active_canvas;
        var group = new LiteGraph.LGraphGroup();
        if(canvas.options.groups_add_around_selected && Object.keys(canvas.selected_nodes).length){
            const bounds = canvas.getBoundaryForSelection();
            if(bounds){ 
                const spacing = canvas.options.groups_add_default_spacing;
                const titleSpace = canvas.options.groups_title_font_size*1.5;
                group.pos = [   bounds[0] - spacing
                                ,bounds[1] - titleSpace - spacing
                            ];
                group.size = [  bounds[2] + (spacing*2)
                                ,bounds[3]+ titleSpace + (spacing*2)
                            ];
                LiteGraph.log_debug("lgraphcanvas","onGroupAdd","groups_add_around_selected",bounds,group);
            }else{
                group.pos = canvas.convertEventToCanvasOffset(mouse_event); // as default
            }
        }else{
            group.pos = canvas.convertEventToCanvasOffset(mouse_event);
        }
        canvas.graph.add(group);
    }

    /**
     * Determines the furthest nodes in each direction
     * @param nodes {LGraphNode[]} the nodes to from which boundary nodes will be extracted
     * @return {{left: LGraphNode, top: LGraphNode, right: LGraphNode, bottom: LGraphNode}}
     */
    static getBoundaryNodes(nodes) {
        let top = null;
        let right = null;
        let bottom = null;
        let left = null;
        for (const nID in nodes) {
            const node = nodes[nID];
            const [x, y] = node.pos;
            const [width, height] = node.size;

            if (top === null || y < top.pos[1]) {
                top = node;
            }
            if (right === null || x + width > right.pos[0] + right.size[0]) {
                right = node;
            }
            if (bottom === null || y + height > bottom.pos[1] + bottom.size[1]) {
                bottom = node;
            }
            if (left === null || x < left.pos[0]) {
                left = node;
            }
        }

        return {
            "top": top,
            "right": right,
            "bottom": bottom,
            "left": left,
        };
    }

    /**
     * Determines the furthest nodes in each direction for the currently selected nodes
     * @return {{left: LGraphNode, top: LGraphNode, right: LGraphNode, bottom: LGraphNode}}
     */
    boundaryNodesForSelection() {
        return LGraphCanvas.getBoundaryNodes(Object.values(this.selected_nodes));
    }

    // returns x, y, w, h
    getBoundaryForSelection(){
        const nodesBounds = this.boundaryNodesForSelection();
        if(!nodesBounds || nodesBounds.left===null) return false;
        const ln = nodesBounds.left.getBounding();
        const tn = nodesBounds.top.getBounding();
        const rn = nodesBounds.right.getBounding();
        const bn = nodesBounds.bottom.getBounding();
        return [ ln[0]
                ,tn[1]
                ,rn[0]+rn[2] - ln[0]
                ,bn[1]+bn[3] - tn[1]
            ];
    }

    getCoordinateCenter(ob4v){
        return [ ob4v[0]+(ob4v[2]/2), ob4v[1]+(ob4v[3]/2) ];
    }

    /**
     *
     * @param {LGraphNode[]} nodes a list of nodes
     * @param {"top"|"bottom"|"left"|"right"} direction Direction to align the nodes
     * @param {LGraphNode?} align_to Node to align to (if null, align to the furthest node in the given direction)
     */
    static alignNodes(nodes, direction, align_to) {
        if (!nodes) {
            return;
        }

        const canvas = LGraphCanvas.active_canvas;
        let boundaryNodes = []
        if (align_to === undefined) {
            boundaryNodes = LGraphCanvas.getBoundaryNodes(nodes)
        } else {
            boundaryNodes = {
                "top": align_to,
                "right": align_to,
                "bottom": align_to,
                "left": align_to,
            }
        }

        for (const [_, node] of Object.entries(canvas.selected_nodes)) {
            switch (direction) {
                case "right":
                    node.pos[0] = boundaryNodes["right"].pos[0] + boundaryNodes["right"].size[0] - node.size[0];
                    break;
                case "left":
                    node.pos[0] = boundaryNodes["left"].pos[0];
                    break;
                case "top":
                    node.pos[1] = boundaryNodes["top"].pos[1];
                    break;
                case "bottom":
                    node.pos[1] = boundaryNodes["bottom"].pos[1] + boundaryNodes["bottom"].size[1] - node.size[1];
                    break;
            }
        }

        canvas.dirty_canvas = true;
        canvas.dirty_bgcanvas = true;
    }

    static onNodeAlign(value, options, event, prev_menu, node) {
        LiteGraph.ContextMenu(["Top", "Bottom", "Left", "Right"], {
            event: event,
            callback: inner_clicked,
            parentMenu: prev_menu,
        });

        function inner_clicked(value) {
            LGraphCanvas.alignNodes(LGraphCanvas.active_canvas.selected_nodes, value.toLowerCase(), node);
        }
    }

    static onGroupAlign(value, options, event, prev_menu) {
        LiteGraph.ContextMenu(["Top", "Bottom", "Left", "Right"], {
            event: event,
            callback: inner_clicked,
            parentMenu: prev_menu,
        });

        function inner_clicked(value) {
            LGraphCanvas.alignNodes(LGraphCanvas.active_canvas.selected_nodes, value.toLowerCase());
        }
    }

    static onMenuAdd(node, options, e, prev_menu, callback) {

        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();
        var graph = canvas.graph;
        if (!graph)
            return;

        function inner_onMenuAdded(base_category, prev_menu) {

            var categories = LiteGraph.getNodeTypesCategories(canvas.filter || graph.filter).filter(function(category) {
                return category.startsWith(base_category)
            });
            var entries = [];

            categories.map(function(category) {

                if (!category)
                    return;

                var base_category_regex = new RegExp('^(' + base_category + ')');
                var category_name = category.replace(base_category_regex,"").split('/')[0];
                var category_path = base_category === '' ? category_name + '/' : base_category + category_name + '/';

                var name = category_name;
                if(name.indexOf("::") != -1) // in case it has a namespace like "shader::math/rand" it hides the namespace
                    name = name.split("::")[1];

                var index = entries.findIndex(function(entry) {
                    return entry.value === category_path
                });
                if (index === -1) {
                    entries.push({
                        value: category_path,
                        content: name,
                        has_submenu: true,
                        callback: function(value, event, mouseEvent, contextMenu) {
                            LiteGraph.log_debug("onMenuAdd","inner_onMenuAdded","categories callback",...arguments);
                            inner_onMenuAdded(value.value, contextMenu);
                        },
                    });
                }

            });

            var nodes = LiteGraph.getNodeTypesInCategory(base_category.slice(0, -1), canvas.filter || graph.filter);
            nodes.map(function(node) {

                if (node.skip_list)
                    return;

                var entry = {
                    value: node.type,
                    content: node.title,
                    has_submenu: false ,
                    callback: function(value, event, mouseEvent, contextMenu) {
                        var first_event = contextMenu.getFirstEvent();
                        canvas.graph.beforeChange();
                        var node = LiteGraph.createNode(value.value);
                        LiteGraph.log_debug("onMenuAdd","inner_onMenuAdded","node entry callback",first_event,...arguments);
                        if (node) {
                            node.pos = canvas.convertEventToCanvasOffset(first_event);
                            canvas.graph.add(node);
                        }
                        if(callback){
                            callback(node);
                        }
                        canvas.graph.afterChange();
                    },
                };

                entries.push(entry);

            });

            const e_check = e ? e : options.event;
            // LiteGraph.log_debug("lgraphcanvas", "onMenuAdd", "inner_onMenuAdded", "opening ContextMenu", e, options);
            LiteGraph.log_debug("lgraphcanvas", "onMenuAdd", "inner_onMenuAdded", "opening ContextMenu", entries, { event: e_check, parentMenu: prev_menu }, ref_window);

            LiteGraph.ContextMenu( entries, { event: e_check, parentMenu: prev_menu }, ref_window );

        }

        inner_onMenuAdded('',prev_menu);
        return false;

    }

    static onMenuCollapseAll() {}
    static onMenuNodeEdit() {}

    static showMenuNodeOptionalInputs(v, options, e, prev_menu, node) {
        if (!node) {
            return;
        }

        var that = this;
        let r = null;
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        options = node.optional_inputs;
        r = node.processCallbackHandlers("onGetInputs",{
            def_cb: node.onGetInputs
        });
        if(r!==null && (typeof(r)=="object")){
            if(typeof(r.return_value)=="object"){
                options = r.return_value;
            }else if(typeof(r.length)!=="undefined"){
                options = r;
            }
        }

        var entries = [];
        if (options) {
            for (let i=0; i < options.length; i++) {
                var entry = options[i];
                if (!entry) {
                    entries.push(null);
                    continue;
                }
                var label = entry[0];
                if(!entry[2])
                    entry[2] = {};

                if (entry[2].label) {
                    label = entry[2].label;
                }

                entry[2].removable = true;
                entry[2].optional = true;
                var data = { content: label, value: entry };
                if (entry[1] == LiteGraph.ACTION) {
                    data.className = "event";
                }
                entries.push(data);
            }
        }

        // add callback for modifing the menu elements onMenuNodeInputs
        r = node.processCallbackHandlers("onMenuNodeInputs",{
            def_cb: node.onMenuNodeInputs
        }, entries);
        if(r!==null && (typeof(r)=="object")){
            if(typeof(r.return_value)=="object"){
                entries = r.return_value;
            }
        }

        if (LiteGraph.do_add_triggers_slots) { // canvas.allow_addOutSlot_onExecuted
            if (node.findInputSlot("onTrigger") == -1) {
                entries.push({content: "On Trigger", value: ["onTrigger", LiteGraph.EVENT, {nameLocked: true, removable: true, optional: true}], className: "event"}); // , opts: {}
            }
        }

        if (!entries.length) {
            LiteGraph.log_debug("lgraphcanvas","showMenuNodeOptionalInputs","no input entries");
            return;
        }

        LiteGraph.ContextMenu(
            entries,
            {
                event: e,
                callback: inner_clicked,
                parentMenu: prev_menu,
                node: node,
            },
            ref_window,
        );

        function inner_clicked(v, e, prev) {
            if (!node) {
                return;
            }

            if (v.callback) {
                v.callback.call(that, node, v, e, prev);
            }

            if (v.value) {
                node.graph.beforeChange();
                var slotOpts = {}; // TODO CHECK THIS :: can be removed: removabled:true? .. optional: true?
                if (v.value[2]) slotOpts = Object.assign(slotOpts, v.value[2]);

                node.addInput(v.value[0], v.value[1], slotOpts);
                // a callback to the node when adding a slot
                node.processCallbackHandlers("onNodeInputAdd",{
                    def_cb: node.onNodeInputAdd
                }, v.value);
                node.setDirtyCanvas(true, true);
                node.graph.afterChange();
            }
        }

        return false;
    }

    static showMenuNodeOptionalOutputs(v, options, e, prev_menu, node) {
        if (!node) {
            return;
        }

        var that = this;
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        options = node.optional_outputs;
        let r = node.processCallbackHandlers("onGetOutputs",{
            def_cb: node.onGetOutputs
        });
        if(r!==null && (typeof(r)=="object")){
            if(typeof(r.return_value)=="object"){
                options = r.return_value;
            }else if(typeof(r.length)!=="undefined"){
                options = r;
            }
        }

        var entries = [];
        if (options) {
            for (let i=0; i < options.length; i++) {
                var entry = options[i];
                if (!entry) {
                    // separator?
                    entries.push(null);
                    continue;
                }

                if (
                    node.flags &&
                    node.flags.skip_repeated_outputs &&
                    node.findOutputSlot(entry[0]) != -1
                ) {
                    continue;
                } // skip the ones already on
                var label = entry[0];
                if(!entry[2])
                    entry[2] = {};
                if (entry[2].label) {
                    label = entry[2].label;
                }
                entry[2].removable = true;
                entry[2].optional = true;
                var data = { content: label, value: entry };
                if (entry[1] == LiteGraph.EVENT) {
                    data.className = "event";
                }
                entries.push(data);
            }
        }

        // add callback for modifing the menu elements onMenuNodeOutputs
        r = node.processCallbackHandlers("onMenuNodeOutputs",{
            def_cb: node.onMenuNodeOutputs
        }, entries);
        if(r!==null && (typeof(r)=="object")){
            if(typeof(r.return_value)=="object"){
                entries = r.return_value;
            }
        }

        if (LiteGraph.do_add_triggers_slots) { // canvas.allow_addOutSlot_onExecuted
            if (node.findOutputSlot("onExecuted") == -1) {
                entries.push({
                    content: "On Executed",
                    value: [
                        "onExecuted",
                        LiteGraph.EVENT,
                        {
                            nameLocked: true,
                            removable: true,
                            optional: true,
                        },
                    ],
                    className: "event",
                });
            }
        }

        if (!entries.length) {
            return;
        }

        LiteGraph.ContextMenu(
            entries,
            {
                event: e,
                callback: inner_clicked,
                parentMenu: prev_menu,
                node: node,
            },
            ref_window,
        );

        function inner_clicked(v, e, prev) {
            if (!node) {
                return;
            }

            if (v.callback) {
                v.callback.call(that, node, v, e, prev);
            }

            if (!v.value) {
                return;
            }

            var value = v.value[1];

            if (
                value &&
                (value.constructor === Object || value.constructor === Array)
            ) {
                // submenu why?
                var entries = [];
                for (let i in value) {
                    entries.push({ content: i, value: value[i] });
                }
                LiteGraph.ContextMenu(entries, {
                    event: e,
                    callback: inner_clicked,
                    parentMenu: prev_menu,
                    node: node,
                });
                return false;
            } else {
                node.graph.beforeChange();
                var slotOpts = {}; // TODO CHECK THIS :: can be removed: removabled:true? .. optional: true?
                if (v.value[2]) slotOpts = Object.assign(slotOpts, v.value[2]);
                // if(v.opts) slotOpts = Object.assign(slotOpts, v.opts);

                node.addOutput(v.value[0], v.value[1], slotOpts);
                // a callback to the node when adding a slot
                node.processCallbackHandlers("onNodeOutputAdd",{
                    def_cb: node.onNodeOutputAdd
                }, v.value);
                node.setDirtyCanvas(true, true);
                node.graph.afterChange();
            }
        }

        return false;
    }

    doShowMenuNodeProperties(element, options, e, prev_menu, node) {
        LGraphCanvas.onShowMenuNodeProperties(element, options, e, prev_menu, node);
    }

    static onShowMenuNodeProperties(element, options, e, prev_menu, node) {
        if (!node || !node.properties) {
            return;
        }

        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        let entries = [];
        for (let i in node.properties) {
            let value = node.properties[i] !== undefined ? node.properties[i] : " ";
            if( typeof value == "object" )
                value = JSON.stringify(value);
            let info = node.getPropertyInfo(i);
            let info_type = info && info!==null ? info.type : "string";
            let readonly = info && info!==null ? (info.readonly?true:false) : false;
            let prevent_input_bind = readonly || (info && info!==null) ? (readonly || info.prevent_input_bind?true:false) : false;
            let prevent_output_bind = info && info!==null ? (info.prevent_output_bind?true:false) : false;
            let propName = info && info!==null && info.label ? info.label : i;

            // parse combo (and parse single number and number in string)
            if( info_type == "enum" || info_type == "combo"
                || info_type == "number"
            ){
                value = LGraphCanvas.getPropertyPrintableValue( value, info.values );
            // TODO add option to format numbers in string
            // }else if((info_type == "string" && !isNaN(value) && !isNaN(parseFloat(value)))){
            //     value = LGraphCanvas.getPropertyPrintableValue( value, info.values );
            }

            // value could contain invalid html characters, clean that
            value = LGraphCanvas.decodeHTML(value);
            let htmlEntry = "<span class='property_name'>"
                                + propName
                            + "</span>"
                            + "<span class='property_value'>"
                                + value
                            + "</span>";
            
            let callbacks_on_element_created = []; // can pass in element construction function

            // allow property binding
            if(!prevent_input_bind && !readonly && LiteGraph.properties_allow_input_binding){
                let relSlotOb = node.findInputSlot(propName, true);
                let hasSlotByName = relSlotOb !== -1;
                let slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                htmlEntry += "<span class='property_input_bind'>"
                                + ( slotBinded
                                        // input exists and is binded
                                        ?   "<span class='property_input_binded'>linked</span>"
                                        // input is not binded or does not exist
                                        :   ( hasSlotByName
                                                ?   "<span class='property_input_exist'>"
                                                        + "<input type='button' class='btn_bind_in btn_bind_property_to_input' value='link input' />"
                                                    + "</span>"
                                                : "<span class=''>"
                                                        + "<input type='button' class='btn_bind_in btn_bind_property_to_input' value='create input' />"
                                                    + "</span>"
                                            )
                                    )
                            +"</span>";
                    callbacks_on_element_created.push(function(el, menu){
                    LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","calling callback_on_element_created",propName,el,slotBinded,relSlotOb);
                    let btnConfirm = el.querySelector('.btn_bind_in');
                    if(!btnConfirm){
                        el.disabled = "disabled";
                        LiteGraph.log_warn("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties",".btn_bind_in not found",propName,el);
                    }else{
                        LiteGraph.log_info("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties",".btn_bind_in binding!",btnConfirm,propName);
                        btnConfirm.addEventListener("click", function(ev){
                            relSlotOb = node.findInputSlot(propName, true);
                            hasSlotByName = relSlotOb !== -1;
                            slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                            if ( !slotBinded ){
                                if( !hasSlotByName ){
                                    LiteGraph.log_info("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","callback_on_element_created","properties_allow_input_binding","btnConfirm","CREATING NEW INPUT ON NODE",relSlotOb,propName);
                                    // propName
                                    node.addInput(propName, info_type, {removable: true, nameLocked: true});
                                    relSlotOb = node.findInputSlot(propName, true);
                                }
                                LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","callback_on_element_created","properties_allow_input_binding","btnConfirm","Linking property to input",relSlotOb);
                                relSlotOb.param_bind = true;
                                menu.close?.(ev, true);
                            }else{
                                LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","callback_on_element_created","properties_allow_input_binding","btnConfirm","Property already binded",relSlotOb,propName);
                            }
                            ev.preventDefault();
                            ev.stopPropagation();
                        });
                    }
                });
            }
            if(!prevent_output_bind && LiteGraph.properties_allow_output_binding){
                let relSlotOb = node.findOutputSlot(propName, true);
                let hasSlotByName = relSlotOb !== -1;
                let slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                htmlEntry += "<span class='property_output_bind'>"
                                + ( slotBinded
                                        // output exists and is binded
                                        ?   "<span class='property_output_binded'>linked</span>"
                                        // output is not binded or does not exist
                                        :   ( hasSlotByName
                                                ?   "<span class='property_output_exist'>"
                                                        + "<input type='button' class='btn_bind_out btn_bind_property_to_output' value='link output' />"
                                                    + "</span>"
                                                : "<span class=''>"
                                                        + "<input type='button' class='btn_bind_out btn_bind_property_to_output' value='create output' />"
                                                    + "</span>"
                                            )
                                    )
                            +"</span>";
                    callbacks_on_element_created.push(function(el, menu){
                    LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","output calling callback_on_element_created",propName,el,slotBinded,relSlotOb);
                    let btnConfirm = el.querySelector('.btn_bind_out');
                    if(!btnConfirm){
                        el.disabled = "disabled";
                        LiteGraph.log_warn("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","output .btn_bind_out not found",propName,el);
                    }else{
                        LiteGraph.log_info("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","output .btn_bind_out binding!",btnConfirm,propName);
                        btnConfirm.addEventListener("click", function(ev){
                            relSlotOb = node.findOutputSlot(propName, true);
                            hasSlotByName = relSlotOb !== -1;
                            slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                            if ( !slotBinded ){
                                if( !hasSlotByName ){
                                    LiteGraph.log_info("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","output callback_on_element_created","properties_allow_output_binding","btnConfirm","CREATING NEW OUTPUT ON NODE",relSlotOb,propName);
                                    // propName
                                    node.addOutput(propName, info_type, {removable: true, nameLocked: true});
                                    relSlotOb = node.findOutputSlot(propName, true);
                                }
                                LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","output callback_on_element_created","properties_allow_output_binding","btnConfirm","Linking property to output",relSlotOb);
                                relSlotOb.param_bind = true;
                                menu.close?.(ev, true);
                            }else{
                                LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","output callback_on_element_created","properties_allow_output_binding","btnConfirm","Property already binded",relSlotOb,propName);
                            }
                            ev.preventDefault();
                            ev.stopPropagation();
                        });
                    }
                });
            }
            // WIP TODO RESTART FROM HERE allow widget binding
            if(LiteGraph.properties_allow_widget_binding){
                const relWidgetOb = node.widgets?.find((widget) => widget && widget.options?.property === propName);
                const hasWidgetByName = relWidgetOb && relWidgetOb !== null;
            //     let relSlotOb = node.findInputSlot(propName, true);
            //     let hasSlotByName = relSlotOb !== -1;
            //     let slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
            //     htmlEntry += "<span class='property_input_bind'>"
            //                     + ( slotBinded
            //                             // input exists and is binded
            //                             ?   "<span class='property_input_binded'>linked</span>"
            //                             // input is not binded or does not exist
            //                             :   ( hasSlotByName
            //                                     ?   "<span class='property_input_exist'>"
            //                                             + "<input type='button' class='btn_confirm btn_bind_property_to_input' value='link input' />"
            //                                         + "</span>"
            //                                     : "<span class=''>"
            //                                             + "<input type='button' class='btn_confirm btn_bind_property_to_input' value='create input' />"
            //                                         + "</span>"
            //                                 )
            //                         )
            //                 +"</span>";
            //         callbacks_on_element_created.push(function(el, menu){
            //         LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","calling callback_on_element_created",propName,el,slotBinded,relSlotOb);
            //         let btnConfirm = el.querySelector('.btn_confirm');
            //         if(!btnConfirm){
            //             el.disabled = "disabled";
            //             LiteGraph.log_warn("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties",".btn_confirm not found",propName,el);
            //         }else{
            //             LiteGraph.log_info("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties",".btn_confirm binding!",btnConfirm,propName);
            //             btnConfirm.addEventListener("click", function(ev){
            //                 relSlotOb = node.findInputSlot(propName, true);
            //                 hasSlotByName = relSlotOb !== -1;
            //                 slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
            //                 if ( !slotBinded ){
            //                     if( !hasSlotByName ){
            //                         LiteGraph.log_info("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","callback_on_element_created","properties_allow_input_binding","btnConfirm","CREATING NEW INPUT ON NODE",relSlotOb,propName);
            //                         // propName
            //                         node.addInput(propName, info_type, {removable: true, nameLocked: true});
            //                         relSlotOb = node.findInputSlot(propName, true);
            //                     }
            //                     LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","callback_on_element_created","properties_allow_input_binding","btnConfirm","Linking property to input",relSlotOb);
            //                     relSlotOb.param_bind = true;
            //                     menu.close?.(ev, true);
            //                 }else{
            //                     LiteGraph.log_debug("lgraphcanvas","showLinkMenu","onShowMenuNodeProperties","callback_on_element_created","properties_allow_input_binding","btnConfirm","Property already binded",relSlotOb,propName);
            //                 }
            //                 ev.preventDefault();
            //                 ev.stopPropagation();
            //             });
            //         }
            //     });
            }

            entries.push({
                content: htmlEntry,
                value: i,
                callbacks_on_element_created: callbacks_on_element_created,
                readonly: readonly
            });
        }
        if (!entries.length) {
            return;
        }

        LiteGraph.ContextMenu(
            entries,
            {
                event: e,
                callback: inner_clicked,
                parentMenu: prev_menu,
                allow_html: true,
                node: node,
            },
            ref_window,
        );

        function inner_clicked(v, options, event, parent_menu, rel_node) {
            LiteGraph.log_debug("lgraphcanvas", "onShowMenuNodeProperties", "inner_clicked", this, ...arguments);
            if (!node) {
                return;
            }
            console.warn("**showeditproperty**", v, options);
            if( !this.disabled && !v.disabled ){
                if( !v.readonly ){
                    var rect = this.getBoundingClientRect();
                    canvas.showEditPropertyValue(node, v.value, { position: [rect.left, rect.top] });
                }
            }
        }

        return false;
    }

    static decodeHTML(str) {
        var e = document.createElement("div");
        e.innerText = str;
        return e.innerHTML;
    }

    static onMenuResizeNode(value, options, e, menu, node) {
        if (!node) {
            return;
        }

        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();
        var graph = canvas.graph;
        graph?.onGraphChanged({action: "resize", doSave: true});
        
        const fApplyMultiNode = (node) => {
            node.size = node.computeSize();
            node.processCallbackHandlers("onResize",{
                def_cb: node.onResize
            }, node.size);
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
            fApplyMultiNode(node);
        }else{
            for (let i in graphcanvas.selected_nodes) {
                fApplyMultiNode(graphcanvas.selected_nodes[i]);
            }
        }

        node.setDirtyCanvas(true, true);
    }

    showLinkMenu(link, e) {
        var that = this;
        LiteGraph.log_verbose(link);
        var node_left = that.graph.getNodeById( link.origin_id );
        var node_right = that.graph.getNodeById( link.target_id );
        var fromType = false;
        if (node_left && node_left.outputs && node_left.outputs[link.origin_slot]) fromType = node_left.outputs[link.origin_slot].type;
        var destType = false;
        if (node_right && node_right.outputs && node_right.outputs[link.target_slot]) destType = node_right.inputs[link.target_slot].type;

        var options = ["Add Node",null,"Delete",null];


        var menu = LiteGraph.ContextMenu(options, {
            event: e,
            title: link.data != null ? link.data.constructor.name : null,
            callback: inner_clicked,
        });

        function inner_clicked(v,options,e) {
            switch (v) {
                case "Add Node":
                    LiteGraph.log_debug("lgraphcanvas","showLinkMenu","inner_clicked","calling onMenuAdd");
                    LGraphCanvas.onMenuAdd(null, null, e, menu, function(node) {
                        if(!node.inputs || !node.inputs.length || !node.outputs || !node.outputs.length) {
                            return;
                        }
                        LiteGraph.log_debug("lgraphcanvas","showLinkMenu","inner_clicked","node autoconnect on add node on link");
                        // leave the connection type checking inside connectByType
                        if (node_left.connectByType( link.origin_slot, node, fromType )) {
                            node.connectByType( link.target_slot, node_right, destType );
                            node.pos[0] -= node.size[0] * 0.5;
                        }
                    });
                    break;

                case "Delete":
                    LiteGraph.log_debug("lgraphcanvas","showLinkMenu","inner_clicked","remove link");
                    that.graph.removeLink(link.id);
                    break;
                default:
                    LiteGraph.log_debug("lgraphcanvas","showLinkMenu","inner_clicked","node in the middle or other operation",...arguments);
                    /* var nodeCreated = createDefaultNodeForSlot({   nodeFrom: node_left
                                                                    ,slotFrom: link.origin_slot
                                                                    ,nodeTo: node
                                                                    ,slotTo: link.target_slot
                                                                    ,e: e
                                                                    ,nodeType: "AUTO"
                                                                });
                    if(nodeCreated) LiteGraph.log_debug("new node in beetween "+v+" created");*/
            }
        }

        return false;
    }

    createDefaultNodeForSlot(optPass = {}) { // addNodeMenu for connection
        var opts = Object.assign(
            {
                nodeFrom: null, // input
                slotFrom: null, // input
                nodeTo: null, // output
                slotTo: null, // output
                position: [],	// pass the event coords
                nodeType: null,	// choose a nodetype to add, AUTO to set at first good
                posAdd: [0,0],	// adjust x,y
                posSizeFix: [0,0], // alpha, adjust the position x,y based on the new node size w,h
            },
            optPass,
        );
        var that = this;

        var isFrom = opts.nodeFrom && opts.slotFrom!==null;
        var isTo = !isFrom && opts.nodeTo && opts.slotTo!==null;

        if (!isFrom && !isTo) {
            LiteGraph.log_warn("lgraphcanvas","createDefaultNodeForSlot","No data passed "+opts.nodeFrom+" "+opts.slotFrom+" "+opts.nodeTo+" "+opts.slotTo);
            return false;
        }
        if (!opts.nodeType) {
            LiteGraph.log_warn("lgraphcanvas","createDefaultNodeForSlot","No type");
            return false;
        }

        var nodeX = isFrom ? opts.nodeFrom : opts.nodeTo;
        var slotX = isFrom ? opts.slotFrom : opts.slotTo;

        var iSlotConn = false;
        switch (typeof slotX) {
            case "string":
                iSlotConn = isFrom ? nodeX.findOutputSlot(slotX,false) : nodeX.findInputSlot(slotX,false);
                slotX = isFrom ? nodeX.outputs[slotX] : nodeX.inputs[slotX];
                break;
            case "object":
                // ok slotX
                iSlotConn = isFrom ? nodeX.findOutputSlot(slotX.name) : nodeX.findInputSlot(slotX.name);
                break;
            case "number":
                iSlotConn = slotX;
                slotX = isFrom ? nodeX.outputs[slotX] : nodeX.inputs[slotX];
                break;
            default:
                // bad ?
                // iSlotConn = 0;
                LiteGraph.log_warn("lgraphcanvas","createDefaultNodeForSlot","Cant get slot information "+slotX);
                return false;
        }

        if (slotX===false || iSlotConn===false) {
            LiteGraph.log_warn("lgraphcanvas","createDefaultNodeForSlot","bad slotX "+slotX+" "+iSlotConn);
        }

        // check for defaults nodes for this slottype
        var fromSlotType = slotX.type==LiteGraph.EVENT?"_event_":slotX.type;
        var slotTypesDefault = isFrom ? LiteGraph.slot_types_default_out : LiteGraph.slot_types_default_in;
        if(slotTypesDefault && slotTypesDefault[fromSlotType]) {
            if (slotX.link !== null) {
                // is connected
            }else{
                // is not not connected
            }
            var nodeNewType = false;
            if(typeof slotTypesDefault[fromSlotType] == "object") {
                for(var typeX in slotTypesDefault[fromSlotType]) {
                    if (opts.nodeType == slotTypesDefault[fromSlotType][typeX] || opts.nodeType == "AUTO") {
                        nodeNewType = slotTypesDefault[fromSlotType][typeX];
                        LiteGraph.log_verbose("lgraphcanvas","createDefaultNodeForSlot","opts.nodeType == slotTypesDefault[fromSlotType][typeX] :: "+opts.nodeType);
                        break; // --------
                    }
                }
            } else {
                if (opts.nodeType == slotTypesDefault[fromSlotType] || opts.nodeType == "AUTO")
                    nodeNewType = slotTypesDefault[fromSlotType];
            }
            if (nodeNewType) {
                var nodeNewOpts = false;
                if (typeof nodeNewType == "object" && nodeNewType.node) {
                    nodeNewOpts = nodeNewType;
                    nodeNewType = nodeNewType.node;
                }

                // that.graph.beforeChange();

                var newNode = LiteGraph.createNode(nodeNewType);
                if(newNode) {
                    // if is object pass options
                    if (nodeNewOpts) {
                        if (nodeNewOpts.properties) {
                            for (const [key, value] of Object.entries(nodeNewOpts.properties)) {
                                newNode.addProperty(key, value);
                            }
                        }
                        if (nodeNewOpts.inputs) {
                            newNode.inputs = [];
                            Object.values(nodeNewOpts.inputs).forEach((value) => {
                                newNode.addOutput(value[0], value[1]);
                            });
                        }
                        if (nodeNewOpts.outputs) {
                            newNode.outputs = [];
                            Object.values(nodeNewOpts.outputs).forEach((value) => {
                                newNode.addOutput(value[0], value[1]);
                            });
                        }
                        if (nodeNewOpts.title) {
                            newNode.title = nodeNewOpts.title;
                        }
                        if (nodeNewOpts.json) {
                            newNode.configure(nodeNewOpts.json);
                        }

                    }

                    // add the node
                    that.graph.add(newNode);
                    newNode.pos = [
                        opts.position[0]+opts.posAdd[0]+(opts.posSizeFix[0]?opts.posSizeFix[0]*newNode.size[0]:0),
                        opts.position[1]+opts.posAdd[1]+(opts.posSizeFix[1]?opts.posSizeFix[1]*newNode.size[1]:0),
                    ]; // that.last_click_position; //[e.canvasX+30, e.canvasX+5];*/

                    // that.graph.afterChange();

                    // connect the two!
                    if (isFrom) {
                        opts.nodeFrom.connectByType( iSlotConn, newNode, fromSlotType );
                    }else{
                        opts.nodeTo.connectByTypeOutput( iSlotConn, newNode, fromSlotType );
                    }

                    /* if connecting in between
                    if (isFrom && isTo){
                        //@TODO
                        // managing externally ? eg. link
                    }
                    */

                    return true;

                }else{
                    LiteGraph.log_warn("lgraphcanvas","createDefaultNodeForSlot","failed creating", nodeNewType);
                }
            }
        }
        return false;
    }

    showConnectionMenu(optPass = {}) { // addNodeMenu for connection

        var opts = Object.assign({
            nodeFrom: null, // input
            slotFrom: null, // input
            nodeTo: null, // output
            slotTo: null, // output
            e: null,
            isCustomEvent: false
        },optPass);

        var that = this;
        var isFrom = opts.nodeFrom && opts.slotFrom;
        var isTo = !isFrom && opts.nodeTo && opts.slotTo;

        if (!isFrom && !isTo) {
            LiteGraph.log_warn("lgraphcanvas","showConnectionMenu","No data passed to showConnectionMenu");
            return false;
        }

        var nodeX = isFrom ? opts.nodeFrom : opts.nodeTo;
        var slotX = isFrom ? opts.slotFrom : opts.slotTo;

        var iSlotConn = false;
        switch (typeof slotX) {
            case "string":
                iSlotConn = isFrom ? nodeX.findOutputSlot(slotX,false) : nodeX.findInputSlot(slotX,false);
                slotX = isFrom ? nodeX.outputs[slotX] : nodeX.inputs[slotX];
                break;
            case "object":
                // ok slotX
                iSlotConn = isFrom ? nodeX.findOutputSlot(slotX.name) : nodeX.findInputSlot(slotX.name);
                break;
            case "number":
                iSlotConn = slotX;
                slotX = isFrom ? nodeX.outputs[slotX] : nodeX.inputs[slotX];
                break;
            default:
                // bad ?
                // iSlotConn = 0;
                LiteGraph.log_warn("lgraphcanvas","showConnectionMenu","Cant get slot information "+slotX);
                return false;
        }

        var options = ["Add Node",null];

        if (that.allow_searchbox) {
            options.push("Search");
            options.push(null);
        }

        // get defaults nodes for this slottype
        const fromSlotType = slotX.type === LiteGraph.EVENT ? "_event_" : slotX.type;
        const slotTypesDefault = isFrom ? LiteGraph.slot_types_default_out : LiteGraph.slot_types_default_in;

        if (slotTypesDefault && slotTypesDefault[fromSlotType]) {
            const slotType = slotTypesDefault[fromSlotType];

            if (Array.isArray(slotType) || typeof slotType === "object") {
                Object.values(slotType).forEach((typeX) => {
                    options.push(typeX);
                });
            } else {
                options.push(slotType);
            }
        }

        // build menu
        var menu = LiteGraph.ContextMenu(options, {
            event: opts.e,
            isCustomEvent: opts.isCustomEvent,
            title: (slotX && slotX.name!="" ? (slotX.name + (fromSlotType?" | ":"")) : "")+(slotX && fromSlotType ? fromSlotType : ""),
            callback: (v, options, e) => {
                const cases = {
                    "Add Node": () => {
                        LiteGraph.log_debug("lgraphcanvas","showConnectionMenu","callback","Add Node calling onMenuAdd",v,options,e);
                        LGraphCanvas.onMenuAdd(null, null, e, menu, (node) => {
                            isFrom ? opts.nodeFrom.connectByType(iSlotConn, node, fromSlotType) : opts.nodeTo.connectByTypeOutput(iSlotConn, node, fromSlotType);
                        });
                    },
                    "Search": () => {
                        isFrom ? that.showSearchBox(e, {node_from: opts.nodeFrom, slot_from: slotX, type_filter_in: fromSlotType}) : that.showSearchBox(e, {node_to: opts.nodeTo, slot_from: slotX, type_filter_out: fromSlotType});
                    },
                    "default": () => {
                        LiteGraph.log_debug("lgraphcanvas","showConnectionMenu","callback","createDefaultNodeForSlot",v,options,e);
                        // const new_pos = this.convertOffsetToEditorArea([opts.e.clientX, opts.e.clientY]);
                        const new_pos = [opts.e.canvasX, opts.e.canvasY];
                        that.createDefaultNodeForSlot(Object.assign(opts, {position: new_pos, nodeType: v}));
                    },
                };

                // Execute the corresponding function based on the value of v
                (cases[v] || cases["default"])();
            },
        });

        return false;
    }

    doShowNodeInfoEditor(node, item, e, options){
        LGraphCanvas.onShowNodeInfoEditor(item, options, e, null, node);
    }

    // TODO refactor :: this is used fot title but not for properties!
    static onShowNodeInfoEditor(item, options, e, menu, node) {
        var property = item.property || "title";
        var value = node[property];

        // TODO refactor :: use createDialog ?

        var dialog = document.createElement("div");
        dialog.is_modified = false;
        dialog.className = "graphdialog";
        dialog.innerHTML =
            "<span class='name'></span><input autofocus type='text' class='value'/><button>OK</button>";
        dialog.close = () => {
            dialog.parentNode?.removeChild(dialog);
        };
        var title = dialog.querySelector(".name");
        title.innerText = property;
        var input = dialog.querySelector(".value");

        const inner = () => {
            if (input) {
                setValue(input.value);
            }
        };

        if (input) {
            input.value = value;
            input.addEventListener("blur", function(_event) {
                this.focus();
            });
            input.addEventListener("keydown", function(e) {
                dialog.is_modified = true;
                if (e.keyCode == 27) {
                    // ESC
                    dialog.close();
                } else if (e.keyCode == 13) {
                    inner(); // save
                } else if (e.keyCode != 13 && e.target.localName != "textarea") {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
            });
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        var canvas = graphcanvas.canvas;

        var rect = canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (event) {
            dialog.style.left = event.clientX + offsetx + "px";
            dialog.style.top = event.clientY + offsety + "px";
        } else {
            dialog.style.left = canvas.width * 0.5 + offsetx + "px";
            dialog.style.top = canvas.height * 0.5 + offsety + "px";
        }

        var button = dialog.querySelector("button");
        button.addEventListener("click", inner);
        canvas.parentNode.appendChild(dialog);

        if(input) input.focus();

        let dialogCloseTimer = null;

        dialog.addEventListener("pointerleave", (_event) => {
            if (LiteGraph.dialog_close_on_mouse_leave && !dialog.is_modified) {
                dialogCloseTimer = setTimeout(dialog.close, LiteGraph.dialog_close_on_mouse_leave_delay);
            }
        });

        dialog.addEventListener("pointerenter", (_event) => {
            if (LiteGraph.dialog_close_on_mouse_leave && dialogCloseTimer) {
                clearTimeout(dialogCloseTimer);
            }
        });

        const setValue = (value) => {
            switch (item.type) {
                case "Number":
                    value = Number(value);
                    break;
                case "Boolean":
                    value = Boolean(value);
                    break;
            }
            node[property] = value;
            dialog.parentNode?.removeChild(dialog);
            node.setDirtyCanvas(true, true);
        };
    }

    // refactor: there are different dialogs, some uses createDialog some dont
    // prompt v2
    prompt(title = "", value, callback, event, multiline) {

        var dialog = document.createElement("div");
        dialog.is_modified = false;
        dialog.className = "graphdialog rounded";
        if(multiline)
            dialog.innerHTML = "<span class='name'></span> <textarea autofocus class='value'></textarea><button class='rounded'>OK</button>";
        else
            dialog.innerHTML = "<span class='name'></span> <input autofocus type='text' class='value'/><button class='rounded'>OK</button>";

        dialog.close = () => {
            this.prompt_box = null;
            dialog.parentNode?.removeChild(dialog);
        };

        var graphcanvas = LGraphCanvas.active_canvas;
        var canvas = graphcanvas.canvas;
        canvas.parentNode.appendChild(dialog);

        if (this.ds.scale > 1) {
            dialog.style.transform = `scale(${this.ds.scale})`;
        }

        var dialogCloseTimer = null;
        var prevent_timeout = false;
        dialog.addEventListener("pointerleave", (_event) => {
            if (prevent_timeout) return;
            if (LiteGraph.dialog_close_on_mouse_leave && !dialog.is_modified && LiteGraph.dialog_close_on_mouse_leave) {
                dialogCloseTimer = setTimeout(dialog.close, LiteGraph.dialog_close_on_mouse_leave_delay);
            }
        });

        dialog.addEventListener("pointerenter", (_event) => {
            if (LiteGraph.dialog_close_on_mouse_leave && dialogCloseTimer) {
                clearTimeout(dialogCloseTimer);
            }
        });

        const selInDia = dialog.querySelectorAll("select");
        if (selInDia) {
            // @BUG: prevent_timeout is never used.  This is literally thrashing just to keep some timeout from happening!
            let prevent_timeout = 0;
            selInDia.forEach((selIn) => {
                selIn.addEventListener("click", (_event) => {
                    prevent_timeout++;
                });
                selIn.addEventListener("blur", (_event) => {
                    prevent_timeout = 0;
                });
                selIn.addEventListener("change", (_event) => {
                    prevent_timeout = -1;
                });
            });
        }

        this.prompt_box?.close();
        this.prompt_box = dialog;

        var name_element = dialog.querySelector(".name");
        name_element.innerText = title;
        var value_element = dialog.querySelector(".value");
        value_element.value = value;

        const input = value_element;
        input.addEventListener("keydown", (e) => {
            dialog.is_modified = true;

            switch (e.keyCode) {
                case 27: // ESC key
                    dialog.close();
                    break;
                case 13: // Enter key
                    if (e.target.localName !== "textarea" && typeof(callback)=="function") {
                        callback(input.value);
                        this.setDirty(true); // CHECK should probably call graphChanged instead
                    }
                    LiteGraph.log_debug("lgraphcanvas","prompt","prompt v2 ENTER",input.value,e.target.localName,callback);
                    dialog.close();
                    break;
                default:
                    return; // Ignore other key codes
            }

            e.preventDefault();
            e.stopPropagation();
        });

        const button = dialog.querySelector("button");
        button.addEventListener("click", (_event) => {
            if (typeof(callback)=="function") {
                callback(input.value);
                this.setDirty(true); // CHECK should probably call graphChanged instead
            }
            LiteGraph.log_debug("lgraphcanvas","prompt","prompt v2 OK",input.value,callback);
            dialog.close();
        });

        var rect = canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (event) {
            dialog.style.left = event.clientX + offsetx + "px";
            dialog.style.top = event.clientY + offsety + "px";
        } else {
            dialog.style.left = canvas.width * 0.5 + offsetx + "px";
            dialog.style.top = canvas.height * 0.5 + offsety + "px";
        }

        setTimeout(function() {
            input.focus();
        }, 10);

        return dialog;
    }

    showSearchBox(event, options) {
        // proposed defaults
        var def_options = {
            slot_from: null,
            node_from: null,
            node_to: null,
            do_type_filter: LiteGraph.search_filter_enabled, // TODO check for registered_slot_[in/out]_types not empty // this will be checked for functionality enabled : filter on slot type, in and out
            type_filter_in: false, // these are default: pass to set initially set values
            type_filter_out: false,
            show_general_if_none_on_typefilter: true,
            show_general_after_typefiltered: true,
            hide_on_mouse_leave: LiteGraph.search_hide_on_mouse_leave,
            hide_on_mouse_leave_time: LiteGraph.search_hide_on_mouse_leave_time,
            show_all_if_empty: true,
            show_all_on_open: LiteGraph.search_show_all_on_open,
        };
        options = Object.assign(def_options, options || {});

        if(typeof(event)!=="object" || typeof(event.target)=="undefined"){
            if(typeof(options.event)!=="undefined"){
                LiteGraph.log_debug("lgraphcanvas","showSearchBox","event not passed directly, using event from options",options.event,"first par was:",event);
                event = options.event;
            }
        }
        LiteGraph.log_debug("lgraphcanvas","showSearchBox",event,options);

        if(typeof(that)=="undefined"){
            var that = this;
        }else{
            LiteGraph.log_debug("lgraphcanvas","showSearchBox","using already present graphcanvas reference",that,"this is other?",this);
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        var canvas = graphcanvas.canvas;
        var root_document = canvas.ownerDocument || document;

        var dialog = document.createElement("div");
        dialog.className = "litegraph litesearchbox graphdialog rounded";
        dialog.innerHTML = "<span class='name'>Search</span> <input autofocus type='text' class='value rounded'/>";
        if (options.do_type_filter) {
            dialog.innerHTML += "<select class='slot_in_type_filter'><option value=''></option></select>";
            dialog.innerHTML += "<select class='slot_out_type_filter'><option value=''></option></select>";
        }
        if(options.show_close_button) {
            dialog.innerHTML += "<button class='close_searchbox close'>X</button>";
        }
        dialog.innerHTML += "<div class='helper'></div>";

        if( root_document.fullscreenElement )
            root_document.fullscreenElement.appendChild(dialog);
        else {
            root_document.body.appendChild(dialog);
            root_document.body.style.overflow = "hidden";
        }
        // dialog element has been appended

        if (options.do_type_filter) {
            var selIn = dialog.querySelector(".slot_in_type_filter");
            var selOut = dialog.querySelector(".slot_out_type_filter");
        }

        dialog.close = function() {
            that.search_box = null;
            this.blur();
            canvas.focus();
            root_document.body.style.overflow = "";

            setTimeout(function() {
                that.canvas?.focus();
                if(!that.canvas){
                    LiteGraph.log_debug("lgraphcanvas","showSearchBox","dont have reference to canvas",that,"this is other?",this);
                }
            }, 20); // important, if canvas loses focus keys wont be captured
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        };

        if(typeof(that.ds)!=="undefined"){
            if (that.ds.scale > 1) {
                dialog.style.transform = `scale(${that.ds.scale})`;
            }
        }else{
            LiteGraph.log_debug("lgraphcanvas","showSearchBox","ds reference not found, is this graphcanvas or what","that",that,"this",this);
        }

        // hide on mouse leave
        if(options.hide_on_mouse_leave) {
            var prevent_timeout = false;
            var timeout_close = null;
            dialog.addEventListener("pointerenter", function(_event) {
                if (timeout_close) {
                    clearTimeout(timeout_close);
                    timeout_close = null;
                }
            });
            dialog.addEventListener("pointerleave", function(_event) {
                if (prevent_timeout) {
                    return;
                }
                timeout_close = setTimeout(function() {
                    dialog.close();
                }, options.hide_on_mouse_leave_time);
            });
            // if filtering, check focus changed to comboboxes and prevent closing
            if (options.do_type_filter) {
                selIn.addEventListener("click", function(_event) {
                    prevent_timeout++;
                });
                selIn.addEventListener("blur", function(_event) {
                    prevent_timeout = 0;
                });
                selIn.addEventListener("change", function(_event) {
                    prevent_timeout = -1;
                });
                selOut.addEventListener("click", function(_event) {
                    prevent_timeout++;
                });
                selOut.addEventListener("blur", function(_event) {
                    prevent_timeout = 0;
                });
                selOut.addEventListener("change", function(_event) {
                    prevent_timeout = -1;
                });
            }
        }

        if (that.search_box) {
            that.search_box.close();
        }
        that.search_box = dialog;

        var helper = dialog.querySelector(".helper");

        var first = null;
        var timeout = null;
        var selected = null;

        var input = dialog.querySelector("input");
        if (input) {
            input.addEventListener("blur", function(_event) {
                if(that.search_box)
                    this.focus();
            });
            input.addEventListener("keydown", function(e) {
                if (e.keyCode == 38) { // @TODO: deprecated
                    // UP
                    changeSelection(false);
                } else if (e.keyCode == 40) {
                    // DOWN
                    changeSelection(true);
                } else if (e.keyCode == 27) {
                    // ESC
                    dialog.close();
                } else if (e.keyCode == 13) {
                    refreshHelper();
                    if (selected) {
                        select(selected.innerHTML);
                    } else if (first) {
                        select(first);
                    } else {
                        dialog.close();
                    }
                } else {
                    if (timeout) {
                        clearInterval(timeout);
                    }
                    timeout = setTimeout(refreshHelper, 250);
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return true;
            });
        }

        // if should filter on type, load and fill selected and choose elements if passed
        if (options.do_type_filter) {
            if (selIn) {
                let aSlots = LiteGraph.slot_types_in;
                let nSlots = aSlots.length; // this for object :: Object.keys(aSlots).length;

                if (options.type_filter_in == LiteGraph.EVENT || options.type_filter_in == LiteGraph.ACTION)
                    options.type_filter_in = "_event_";
                /* this will filter on * .. but better do it manually in case
                else if(options.type_filter_in === "" || options.type_filter_in === 0)
                    options.type_filter_in = "*";*/

                for (let iK=0; iK<nSlots; iK++) {
                    let opt = document.createElement('option');
                    opt.value = aSlots[iK];
                    opt.innerHTML = aSlots[iK];
                    selIn.appendChild(opt);
                    if(options.type_filter_in !==false && (options.type_filter_in+"").toLowerCase() == (aSlots[iK]+"").toLowerCase()) {
                        // selIn.selectedIndex ..
                        opt.selected = true; // ? check this: multiselect!! (NO!,NO?)
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","comparing IN INCLUDED"+options.type_filter_in+" :: "+aSlots[iK]);
                    }else{
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","excluded comparing IN "+options.type_filter_in+" :: "+aSlots[iK]);
                    }
                }
                selIn.addEventListener("change",function() {
                    refreshHelper();
                });
            }
            if (selOut) {
                let aSlots = LiteGraph.slot_types_out;
                let nSlots = aSlots.length; // this for object :: Object.keys(aSlots).length;

                if (options.type_filter_out == LiteGraph.EVENT || options.type_filter_out == LiteGraph.ACTION)
                    options.type_filter_out = "_event_";
                /* this will filter on * .. but better do it manually in case
                else if(options.type_filter_out === "" || options.type_filter_out === 0)
                    options.type_filter_out = "*";*/

                for (let iK = 0; iK < nSlots; iK++) {
                    let opt = document.createElement('option');
                    opt.value = aSlots[iK];
                    opt.innerHTML = aSlots[iK];
                    selOut.appendChild(opt);
                    if(options.type_filter_out !==false && (options.type_filter_out+"").toLowerCase() == (aSlots[iK]+"").toLowerCase()) {
                        // selOut.selectedIndex ..
                        opt.selected = true; // ? check this: multiselect!! (NO!,NO?)
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","comparing IN INCLUDED"+options.type_filter_in+" :: "+aSlots[iK]);
                    }else{
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","excluded comparing IN "+options.type_filter_in+" :: "+aSlots[iK]);
                    }
                }
                selOut.addEventListener("change",function() {
                    refreshHelper();
                });
            }
        }

        if(options.show_close_button) {
            var button = dialog.querySelector(".close");
            button.addEventListener("click", dialog.close);
        }

        // compute best position
        var rect = canvas.getBoundingClientRect();

        var left = ( event ? event.clientX : (rect.left + rect.width * 0.5) ) - 80;
        var top = ( event ? event.clientY : (rect.top + rect.height * 0.5) ) - 20;

        if (rect.width - left < 470) left = rect.width - 470;
        if (rect.height - top < 220) top = rect.height - 220;
        if (left < rect.left + 20) left = rect.left + 20;
        if (top < rect.top + 20) top = rect.top + 20;

        dialog.style.left = left + "px";
        dialog.style.top = top + "px";

        /*
        var offsetx = -20;
        var offsety = -20;
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (event) {
            dialog.style.left = event.clientX + offsetx + "px";
            dialog.style.top = event.clientY + offsety + "px";
        } else {
            dialog.style.left = canvas.width * 0.5 + offsetx + "px";
            dialog.style.top = canvas.height * 0.5 + offsety + "px";
        }
        canvas.parentNode.appendChild(dialog);
        */

        input.focus();
        if (options.show_all_on_open) refreshHelper();

        function select(name) {
            if (name) {
                if(!that || typeof(that)!=="object" || typeof(that.processCallbackHandlers)=="undefined"){
                    LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "select", "that reference is wrong", that, dialog, this, options);
                    return;
                }
                let r = that.processCallbackHandlers("onSearchBoxSelection",{
                    def_cb: that.onSearchBoxSelection
                }, name, event, graphcanvas);
                if(r!==null && (r === true || (typeof(r)=="object" && r.return_value === true))){
                    // managed
                } else {
                    var extra = LiteGraph.searchbox_extras[name.toLowerCase()];
                    if (extra) {
                        name = extra.type;
                    }

                    graphcanvas.graph.beforeChange();
                    var node = LiteGraph.createNode(name);

                    if(!node){
                        LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "select", "failed creating the node", node);
                        dialog.close();
                        return false;
                    }

                    node.pos = graphcanvas.convertEventToCanvasOffset(event);
                    graphcanvas.graph.add(node, false, {doProcessChange: false});

                    if (extra && extra.data) {
                        if (extra.data.properties) {
                            for (let i in extra.data.properties) {
                                node.addProperty( i, extra.data.properties[i] );
                            }
                        }
                        if (extra.data.inputs) {
                            node.inputs = [];
                            for (let i in extra.data.inputs) {
                                node.addOutput(
                                    extra.data.inputs[i][0],
                                    extra.data.inputs[i][1],
                                );
                            }
                        }
                        if (extra.data.outputs) {
                            node.outputs = [];
                            for (let i in extra.data.outputs) {
                                node.addOutput(
                                    extra.data.outputs[i][0],
                                    extra.data.outputs[i][1],
                                );
                            }
                        }
                        if (extra.data.title) {
                            node.title = extra.data.title;
                        }
                        if (extra.data.json) {
                            node.configure(extra.data.json);
                        }

                    }

                    let iS;

                    // join node after inserting
                    if (options.node_from) {
                        iS = false;
                        switch (typeof options.slot_from) {
                            case "string":
                                iS = options.node_from.findOutputSlot(options.slot_from);
                                break;
                            case "object":
                                if (options.slot_from.name||options.slot_from.name==="") {
                                    iS = options.node_from.findOutputSlot(options.slot_from.name);
                                }else{
                                    iS = -1;
                                }
                                if (iS==-1 && typeof options.slot_from.slot_index !== "undefined") iS = options.slot_from.slot_index;
                                LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "slotindexfromobject search", "iS", iS, "ofFromOut", options.node_from.outputs, options.slot_from);
                                break;
                            case "number":
                                iS = options.slot_from;
                                break;
                            default:
                                iS = 0; // try with first if no name set
                        }
                        if (typeof options.node_from.outputs[iS] !== "undefined") {
                            if (iS!==false && iS>-1) {
                                options.node_from.connectByType( iS, node, options.node_from.outputs[iS].type );
                            }
                        }else{
                            LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "select", "cant find slot node_from to join using from slot type", "iS", iS, "ofFromOut", options.node_from.outputs, options.slot_from);
                        }
                    }
                    if (options.node_to) {
                        iS = false;
                        switch (typeof options.slot_from) {
                            case "string":
                                iS = options.node_to.findInputSlot(options.slot_from);
                                break;
                            case "object":
                                if (options.slot_from.name) {
                                    iS = options.node_to.findInputSlot(options.slot_from.name);
                                }else{
                                    iS = -1;
                                }
                                if (iS==-1 && typeof options.slot_from.slot_index !== "undefined") iS = options.slot_from.slot_index;
                                break;
                            case "number":
                                iS = options.slot_from;
                                break;
                            default:
                                iS = 0; // try with first if no name set
                        }
                        if (typeof options.node_to.inputs[iS] !== "undefined") {
                            if (iS!==false && iS>-1) {
                                // try connection
                                options.node_to.connectByTypeOutput(iS,node,options.node_to.inputs[iS].type);
                            }
                        }else{
                            LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "select", "cant find slot node_to to join using from slot type", options.slot_from, options.node_to.inputs);
                        }
                    }

                    graphcanvas.graph.afterChange();
                }
            }

            dialog.close();
        }

        function changeSelection(forward) {
            var prev = selected;
            if (selected) {
                selected.classList.remove("selected");
            }
            if (!selected) {
                selected = forward
                    ? helper.childNodes[0]
                    : helper.childNodes[helper.childNodes.length];
            } else {
                selected = forward
                    ? selected.nextSibling
                    : selected.previousSibling;
                if (!selected) {
                    selected = prev;
                }
            }
            if (!selected) {
                return;
            }
            selected.classList.add("selected");
            selected.scrollIntoView({block: "end", behavior: "smooth"});
        }

        function refreshHelper() {
            timeout = null;
            var str = input.value;
            first = null;
            helper.innerHTML = "";
            if (!str && !options.show_all_if_empty) {
                return;
            }

            if (that.onSearchBox) {
                var list = that.onSearchBox(helper, str, graphcanvas);
                if (list) {
                    for (let i = 0; i < list.length; ++i) {
                        addResult(list[i]);
                    }
                }
            } else {
                var c = 0;
                str = str.toLowerCase();
                var filter = graphcanvas.filter || graphcanvas.graph.filter;

                let sIn, sOut;

                // filter by type preprocess
                if(options.do_type_filter && that.search_box) {
                    sIn = that.search_box.querySelector(".slot_in_type_filter");
                    sOut = that.search_box.querySelector(".slot_out_type_filter");
                }else{
                    sIn = false;
                    sOut = false;
                }

                // extras
                for (let i in LiteGraph.searchbox_extras) {
                    var extra = LiteGraph.searchbox_extras[i];
                    // var passTextSearch = extra.desc.toLowerCase().indexOf(str) !== -1;
                    let str_node = extra.desc.toLowerCase();
                    let str_title = extra.title ? extra.title.toLowerCase() : "";
                    let a_srch_parts = str.toLowerCase().split(" ");
                    let passTextSearch = true;
                    for(let i_srch of a_srch_parts){
                        // DBG EXCESS LiteGraph.log_verbose("search","check",i_srch,str_node); // verbose debug, make new higher level
                        if(i_srch.trim() === "") continue;
                        if(str_node.indexOf(i_srch) == -1 && str_title.indexOf(i_srch) == -1){
                            passTextSearch = false;
                            // DBG EXCESS LiteGraph.log_verbose("search","do not pass",i_srch,str_node); // verbose debug, make new higher level
                            break;
                        }
                    }
                    if ((!options.show_all_if_empty || str) && !passTextSearch) {
                        continue;
                    }
                    var ctor = LiteGraph.registered_node_types[extra.type];
                    if( ctor && ctor.filter != filter )
                        continue;
                    if( ! inner_test_filter(extra.type) )
                        continue;
                    addResult( extra.desc, "searchbox_extra" );
                    if ( LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit ) {
                        break;
                    }
                }

                var filtered = null;
                // filter by nodetype
                if (Array.prototype.filter) { // filter supported
                    let keys = Object.keys( LiteGraph.registered_node_types ); // types
                    filtered = keys.filter( inner_test_filter );
                } else {
                    filtered = [];
                    for (let i in LiteGraph.registered_node_types) {
                        if( inner_test_filter(i) ){
                            filtered.push(i);
                        }
                    }
                }
                // add filter by title and desc
                // TODO
                /* if (Array.prototype.filter) { // filter supported
                    let keys = Object.keys( LiteGraph.registered_node_types ); // types
                    filtered = keys.filter( inner_test_filter );
                } else {
                    filtered = [];
                    for (let i in LiteGraph.registered_node_types) {
                        if( inner_test_filter(i) ){
                            filtered.push(i);
                        }
                    }
                } */

                for (let i = 0; i < filtered.length; i++) {
                    addResult(filtered[i]);
                    if ( LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit ) {
                        break;
                    }
                }

                // add general type if filtering
                if (options.show_general_after_typefiltered
                    && (sIn.value || sOut.value)
                ) {
                    let filtered_extra = [];
                    for (let i in LiteGraph.registered_node_types) {
                        if( inner_test_filter(i, {inTypeOverride: sIn&&sIn.value?"*":false, outTypeOverride: sOut&&sOut.value?"*":false}) )
                            filtered_extra.push(i);
                    }
                    for (let i = 0; i < filtered_extra.length; i++) {
                        addResult(filtered_extra[i], "generic_type");
                        if ( LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit ) {
                            break;
                        }
                    }
                }

                // check il filtering gave no results
                if ((sIn.value || sOut.value) &&
                    ( (helper.childNodes.length == 0 && options.show_general_if_none_on_typefilter) )
                ) {
                    let filtered_extra = [];
                    for (let i in LiteGraph.registered_node_types) {
                        if( inner_test_filter(i, {skipFilter: true}) )
                            filtered_extra.push(i);
                    }
                    for (let i = 0; i < filtered_extra.length; i++) {
                        addResult(filtered_extra[i], "not_in_filter");
                        if ( LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit ) {
                            break;
                        }
                    }
                }

                function inner_test_filter(type, optsIn = {}) {
                    var optsDef = {
                        skipFilter: false,
                        inTypeOverride: false,
                        outTypeOverride: false,
                    };
                    var opts = Object.assign(optsDef,optsIn);
                    var ctor = LiteGraph.registered_node_types[type];
                    if(filter && ctor.filter != filter )
                        return false;
                    
                    let str_node = type.toLowerCase();
                    let a_srch_parts = str.toLowerCase().split(" ");
                    let passTextSearch = true;
                    for(let i_srch of a_srch_parts){
                        LiteGraph.log_verbose("search","check",i_srch,str_node); // verbose debug, make new higher level
                        if(i_srch.trim() === "") continue;
                        if(str_node.indexOf(i_srch) == -1){
                            passTextSearch = false;
                            LiteGraph.log_verbose("search","do not pass",i_srch,str_node); // verbose debug, make new higher level
                            break;
                        }
                    }

                    if ((!options.show_all_if_empty || str) && !passTextSearch)
                        return false;

                    // filter by slot IN, OUT types
                    if(options.do_type_filter && !opts.skipFilter) {
                        var sType = type;
                        let doesInc;

                        var sV = sIn.value;
                        if (opts.inTypeOverride!==false) sV = opts.inTypeOverride;
                        // if (sV.toLowerCase() == "_event_") sV = LiteGraph.EVENT; // -1

                        if(sIn && sV) {
                            // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN will check filter against "+sV);
                            if (LiteGraph.registered_slot_in_types[sV] && LiteGraph.registered_slot_in_types[sV].nodes) { // type is stored
                                // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN check "+sType+" in "+LiteGraph.registered_slot_in_types[sV].nodes);
                                doesInc = LiteGraph.registered_slot_in_types[sV].nodes.includes(sType);
                                if (doesInc!==false) {
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+sType+" HAS "+sV);
                                }else{
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+LiteGraph.registered_slot_in_types[sV]," DONT includes "+type);
                                    return false;
                                }
                            }
                        }

                        sV = sOut.value;
                        if (opts.outTypeOverride!==false) {
                            sV = opts.outTypeOverride;
                        }
                        // if (sV.toLowerCase() == "_event_") sV = LiteGraph.EVENT; // -1

                        if(sOut && sV) {
                            // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN will check filter against "+sV);
                            if (LiteGraph.registered_slot_out_types[sV] && LiteGraph.registered_slot_out_types[sV].nodes) { // type is stored
                                // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN check "+sType+" in "+LiteGraph.registered_slot_in_types[sV].nodes);
                                doesInc = LiteGraph.registered_slot_out_types[sV].nodes.includes(sType);
                                if (doesInc!==false) {
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+sType+" HAS "+sV);
                                }else{
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+LiteGraph.registered_slot_in_types[sV]," DONT includes "+type);
                                    return false;
                                }
                            }
                        }
                    }
                    return true;
                }
            }

            function addResult(type, className) {
                var help = document.createElement("div");
                if (!first) {
                    first = type;
                }
                help.innerText = type;
                help.dataset["type"] = escape(type); // @TODO: deprecated
                help.className = "litegraph lite-search-item";
                if (className) {
                    help.className += " " + className;
                }
                help.addEventListener("click", function(_event) {
                    select(unescape(this.dataset["type"]));
                });
                helper.appendChild(help);
            }
        }

        return dialog;
    }

    showEditPropertyValue(node, property, options) {
        if (!node || node.properties[property] === undefined) {
            return;
        }

        options = options || {};

        var info = node.getPropertyInfo(property);
        let type = info && info!==null ? info.type : "string";

        let input_html;

        if (type == "string" || type == "number" || type == "array" || type == "object" || type == "code") {
            input_html = "<input autofocus type='text' class='value'/>";
        } else if ( (type == "enum" || type == "combo") && info.values) {
            LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "CREATING ENUM COMBO",input,type,dialog);
            input_html = "<select autofocus type='text' class='value'>";
            for (let i in info.values) {
                var v = i;
                if( info.values.constructor === Array )
                    v = info.values[i];

                input_html +=
                    "<option value='" +
                    v +
                    "' " +
                    (v == node.properties[property] ? "selected" : "") +
                    ">" +
                    info.values[i] +
                    "</option>";
            }
            input_html += "</select>";
        } else if (type == "boolean" || type == "toggle") {
            input_html =
                "<input autofocus type='checkbox' class='value' " +
                (node.properties[property] ? "checked" : "") +
                "/>";
        } else {
            LiteGraph.log_warn("lgraphcanvas", "showEditPropertyValue", "unknown type", type);
            return;
        }

        var dialog = this.createDialog(
            "<span class='name'>" +
                (info.label ? info.label : property) +
                "</span>" +
                input_html +
                "<button>OK</button>",
            options,
        );

        var input = false;
        if ((type == "enum" || type == "combo") && info.values) {
            LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "showEditPropertyValue ENUM COMBO",input,type,dialog);
            input = dialog.querySelector("select");
            input.addEventListener("change", function(e) {
                dialog.modified();
                LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "Enum change",input,info,e.target);
                setValue(e.target.value);
                // var index = e.target.value;
                // setValue( e.options[e.selectedIndex].value );
            });
        } else if (type == "boolean" || type == "toggle") {
            LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "TOGGLE", input, type, dialog);
            input = dialog.querySelector("input");
            if (input) {
                input.addEventListener("click", function(_event) {
                    dialog.modified();
                    setValue(!!input.checked);
                });
            }
        } else {
            input = dialog.querySelector("input");
            LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", input, type, dialog);
            if (input) {
                input.addEventListener("blur", function(_event) {
                    this.focus();
                });

                v = node.properties[property] !== undefined ? node.properties[property] : "";
                if (type !== 'string') {
                    v = JSON.stringify(v);
                }

                input.value = v;
                input.addEventListener("keydown", function(e) {
                    if (e.keyCode == 27) {
                        // ESC
                        dialog.close();
                    } else if (e.keyCode == 13) {
                        // ENTER
                        inner(); // save
                    } else if (e.keyCode != 13) {
                        dialog.modified();
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                });
            }
        }
        if (input) input.focus();

        var button = dialog.querySelector("button");
        button.addEventListener("click", inner);

        function inner() {
            setValue(input.value);
        }

        function setValue(value) {

            if(info && info.values && info.values.constructor === Object && info.values[value] != undefined )
                value = info.values[value];

            if (typeof node.properties[property] == "number") {
                value = Number(value);
            }
            if (type == "array" || type == "object") {
                value = JSON.parse(value);
            }
            const prevValue = node.properties[property];
            node.properties[property] = value;
            node.graph?.onGraphChanged({action: "propertyChanged", doSave: true});
            
            // Call onPropertyChanged and block the change if needed
            let r = node.processCallbackHandlers("onPropertyChanged",{
                def_cb: node.onPropertyChanged
            }, property, value, prevValue);
            if(r===false || (r!==null && (typeof(r)=="object" && r.return_value===false))){
                node.properties[property] = prevValue;
                LiteGraph.log_debug("lgraphcanvas","showEditPropertyValue","setValue","prevent property set by cbHandler",property,value,prevValue,r);
            }
            
            if(options.onclose)
                options.onclose();
            dialog.close();
            node.setDirtyCanvas(true, true);
        }

        return dialog;
    }

    // TODO refactor, theer are different dialog, some uses createDialog, some dont
    createDialog(html, options) {
        var def_options = { checkForInput: false, closeOnLeave: true, closeOnLeave_checkModified: true };
        options = Object.assign(def_options, options || {});

        var dialog = document.createElement("div");
        dialog.className = "graphdialog";
        dialog.innerHTML = html;
        dialog.is_modified = false;

        var rect = this.canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (options.position) {
            offsetx += options.position[0];
            offsety += options.position[1];
        } else if (options.event) {
            offsetx += options.event.clientX;
            offsety += options.event.clientY;
        } else { // centered
            offsetx += this.canvas.width * 0.5;
            offsety += this.canvas.height * 0.5;
        }

        dialog.style.left = offsetx + "px";
        dialog.style.top = offsety + "px";

        this.canvas.parentNode.appendChild(dialog);

        // check for input and use default behaviour: save on enter, close on esc
        if (options.checkForInput) {
            var aI = [];
            var focused = false;
            aI = dialog.querySelectorAll("input");
            if (aI) {
                aI.forEach(function(iX) {
                    iX.addEventListener("keydown",function(e) {
                        dialog.modified();
                        if (e.keyCode == 27) {
                            dialog.close();
                        } else if (e.keyCode != 13) {
                            return;
                        }
                        // set value ?
                        e.preventDefault();
                        e.stopPropagation();
                    });
                    if (!focused) iX.focus();
                });
            }
        }

        dialog.modified = function() {
            dialog.is_modified = true;
        }
        dialog.close = function() {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        };

        var dialogCloseTimer = null;
        var prevent_timeout = false;
        dialog.addEventListener("pointerleave", function(_event) {
            if (prevent_timeout)
                return;
            if(options.closeOnLeave || LiteGraph.dialog_close_on_mouse_leave)
                if (!dialog.is_modified && LiteGraph.dialog_close_on_mouse_leave)
                    dialogCloseTimer = setTimeout(dialog.close, LiteGraph.dialog_close_on_mouse_leave_delay); // dialog.close();
        });
        dialog.addEventListener("pointerenter", function(_event) {
            if(options.closeOnLeave || LiteGraph.dialog_close_on_mouse_leave)
                if(dialogCloseTimer) clearTimeout(dialogCloseTimer);
        });
        var selInDia = dialog.querySelectorAll("select");
        if (selInDia) {
            // if filtering, check focus changed to comboboxes and prevent closing
            selInDia.forEach(function(selIn) {
                selIn.addEventListener("click", function(_event) {
                    prevent_timeout++;
                });
                selIn.addEventListener("blur", function(_event) {
                    prevent_timeout = 0;
                });
                selIn.addEventListener("change", function(_event) {
                    prevent_timeout = -1;
                });
            });
        }

        return dialog;
    }

    createPanel(title, options) {
        options = options || {};

        var ref_window = options.window || window;
        var root = document.createElement("div");
        root.className = "litegraph dialog";
        root.innerHTML = "<div class='dialog-header'><span class='dialog-title'></span></div><div class='dialog-content'></div><div style='display:none;' class='dialog-alt-content'></div><div class='dialog-footer'></div>";
        root.header = root.querySelector(".dialog-header");

        if(options.width)
            root.style.width = options.width + (options.width.constructor === Number ? "px" : "");
        if(options.height)
            root.style.height = options.height + (options.height.constructor === Number ? "px" : "");
        if(options.closable) {
            var close = document.createElement("span");
            close.innerHTML = "&#10005;";
            close.classList.add("close");
            close.addEventListener("click",function() {
                root.close();
            });
            root.header.appendChild(close);
        }
        root.title_element = root.querySelector(".dialog-title");
        root.title_element.innerText = title;
        root.content = root.querySelector(".dialog-content");
        root.alt_content = root.querySelector(".dialog-alt-content");
        root.footer = root.querySelector(".dialog-footer");

        root.close = function() {
            if (root.onClose && typeof root.onClose == "function") {
                root.onClose();
            }
            if(root.parentNode)
                root.parentNode.removeChild(root);
            /* XXX CHECK THIS */
            if(this.parentNode) {
                this.parentNode.removeChild(this);
            }
            /* XXX this was not working, was fixed with an IF, check this */
            // check: maybe need a .call(this)
        }

        // function to swap panel content
        root.toggleAltContent = function(force) {
            let vTo, vAlt;
            if (typeof force != "undefined") {
                vTo = force ? "block" : "none";
                vAlt = force ? "none" : "block";
            }else{
                vTo = root.alt_content.style.display != "block" ? "block" : "none";
                vAlt = root.alt_content.style.display != "block" ? "none" : "block";
            }
            root.alt_content.style.display = vTo;
            root.content.style.display = vAlt;
        }

        root.toggleFooterVisibility = function(force) {
            let vTo;
            if (typeof force != "undefined") {
                vTo = force ? "block" : "none";
            }else{
                vTo = root.footer.style.display != "block" ? "block" : "none";
            }
            root.footer.style.display = vTo;
        }

        root.clear = function() {
            this.content.innerHTML = "";
        }

        root.addHTML = function(code, classname, on_footer) {
            var elem = document.createElement("div");
            if(classname)
                elem.className = classname;
            elem.innerHTML = code;
            if(on_footer)
                root.footer.appendChild(elem);
            else
                root.content.appendChild(elem);
            return elem;
        }

        root.addButton = function( name, callback, options ) {
            var elem = document.createElement("button");
            elem.innerText = name;
            elem.options = options;
            elem.classList.add("btn");
            elem.addEventListener("click",callback);
            root.footer.appendChild(elem);
            return elem;
        }

        root.addSeparator = function() {
            var elem = document.createElement("div");
            elem.className = "separator";
            root.content.appendChild(elem);
        }

        root.addWidget = function( type, name, value, options, callback ) {
            options = options || {};
            var str_value = String(value);
            type = type.toLowerCase();
            if(type == "number")
                str_value = LiteGraph.formatNumber(value,3);

            var elem = document.createElement("div");
            elem.className = "property";
            elem.innerHTML = "<span class='property_name'></span><span class='property_value'></span>";
            elem.querySelector(".property_name").innerText = options.label || name;
            var value_element = elem.querySelector(".property_value");
            value_element.innerText = str_value;
            elem.dataset["property"] = name;
            elem.dataset["type"] = options.type || type;
            // if(elem.dataset["type"]=="number"){
            //     elem.dataset["precision"] = options.precision || 3;
            // }
            elem.options = options;
            elem.value = value;

            LiteGraph.log_debug("lgraphcanvas", "createPanel", "addWidget", type, value, value_element, options);

            if(type == "code") {
                elem.addEventListener("click", function(_event) {
                    root.inner_showCodePad( this.dataset["property"] );
                });
            } else if (type == "boolean") {
                elem.classList.add("boolean");
                if(value)
                    elem.classList.add("bool-on");
                elem.addEventListener("click", function() {
                    // var v = node.properties[this.dataset["property"]];
                    // node.setProperty(this.dataset["property"],!v); this.innerText = v ? "on" : "off";
                    var propname = this.dataset["property"];
                    this.value = !this.value;
                    this.classList.toggle("bool-on");
                    this.querySelector(".property_value").innerText = this.value ? "on" : "off";
                    innerChange(propname, this.value );
                });
            } else if (type == "string" || type == "number" || type == "undefined") {
                value_element.setAttribute("contenteditable",true);
                value_element.addEventListener("keydown", function(e) {
                    if(e.code == "Enter" && (type != "string" || !e.shiftKey)) { // allow for multiline
                        e.preventDefault();
                        this.blur();
                    }
                });
                value_element.addEventListener("blur", function() {
                    var v = this.innerText;
                    var propname = this.parentNode.dataset["property"];
                    var proptype = this.parentNode.dataset["type"];
                    if( proptype == "number")
                        v = Number(v);
                    innerChange(propname, v);
                });
            } else if (type == "enum" || type == "combo") {
                str_value = LGraphCanvas.getPropertyPrintableValue( value, options.values );
                value_element.innerText = str_value;

                LiteGraph.log_debug("lgraphcanvas", "createPanel", "addWidget", "ENUM COMBO", type, str_value, value_element, options);

                value_element.addEventListener("click", function(event) {
                    var values = options.values || [];
                    var propname = this.parentNode.dataset["property"];
                    var elem_that = this;
                    LiteGraph.ContextMenu(
                        values,{
                            event: event,
                            className: "dark",
                            callback: inner_clicked,
                        },
                        ref_window,
                    );
                    function inner_clicked(v) {
                        // node.setProperty(propname,v);
                        // graphcanvas.dirty_canvas = true;
                        elem_that.innerText = v;
                        innerChange(propname,v);
                        return false;
                    }
                });
            }

            root.content.appendChild(elem);

            function innerChange(name, value) {
                LiteGraph.log_debug("lgraphcanvas", "createPanel", "addWidget", "innerChange", name, value, options);
                // that.dirty_canvas = true;
                if(options.callback)
                    options.callback(name,value,options);
                if(callback)
                    callback(name,value,options);
            }

            return elem;
        }

        if (root.onOpen && typeof root.onOpen == "function") root.onOpen();

        return root;
    }

    static getPropertyPrintableValue(value, values) {
        if(!values){
            if( typeof(value)=="number"){
                return parseFloat(value.toFixed(5));
            // TODO add option to format numbers in string
            // }else if((typeof(value) == "string" && !isNaN(value) && !isNaN(parseFloat(value)))){
            //     return parseFloat(Number(value).toFixed(5));
            }
            return String(value);
        }

        if(values.constructor === Array) {
            return String(value);
        }

        if(values.constructor === Object) {
            var desc_value = "";
            for(var k in values) {
                if(values[k] != value)
                    continue;
                desc_value = k;
                break;
            }
            return String(value) + " ("+desc_value+")";
        }
    }

    showShowGraphOptionsPanel(refOpts, obEv) {
        let graphcanvas;
        if(this.constructor && this.constructor.name == "HTMLDivElement") {
            // assume coming from the menu event click
            if (! obEv?.event?.target?.lgraphcanvas) {
                LiteGraph.log_warn("lgraphcanvas", "showShowGraphOptionsPanel", "References not found to add optionPanel", refOpts, obEv); // need a ref to canvas obj
                LiteGraph.log_debug("lgraphcanvas", "showShowGraphOptionsPanel", "!obEv || !obEv.event || !obEv.event.target || !obEv.event.target.lgraphcanvas",obEv,obEv.event,obEv.event.target,obEv.event.target.lgraphcanvas);
                return;
            }
            graphcanvas = obEv.event.target.lgraphcanvas;
        }else{
            // assume called internally
            graphcanvas = this;
        }
        graphcanvas.closePanels();
        var ref_window = graphcanvas.getCanvasWindow();
        panel = graphcanvas.createPanel("Options",{
            closable: true,
            window: ref_window,
            onOpen: function() {
                graphcanvas.OPTIONPANEL_IS_OPEN = true;
            },
            onClose: function() {
                graphcanvas.OPTIONPANEL_IS_OPEN = false;
                graphcanvas.options_panel = null;
            },
        });
        graphcanvas.options_panel = panel;
        panel.id = "option-panel";
        panel.classList.add("settings");

        function inner_refresh() {

            panel.content.innerHTML = ""; // clear

            const fUpdate = (name, value, options) => {
                switch(name) {
                    /* case "Render mode":
                        // Case ""..
                        if (options.values && options.key){
                            var kV = Object.values(options.values).indexOf(value);
                            if (kV>=0 && options.values[kV]){
                                LiteGraph.log_debug("update graph options: "+options.key+": "+kV);
                                graphcanvas[options.key] = kV;
                                //LiteGraph.log_debug(graphcanvas);
                                break;
                            }
                        }
                        LiteGraph.log_warn("unexpected options");
                        LiteGraph.log_debug(options);
                        break;*/
                    default:
                        LiteGraph.log_verbose("lgraphcanvas", "showShowGraphOptionsPanel", "want to update graph options: "+name+": "+value);
                        if (options && options.key) {
                            name = options.key;
                        }
                        if (options.values) {
                            value = Object.values(options.values).indexOf(value);
                        }
                        LiteGraph.log_verbose("lgraphcanvas", "showShowGraphOptionsPanel", "update graph option: "+name+": "+value);
                        graphcanvas[name] = value;
                        break;
                }
            };

            // panel.addWidget( "string", "Graph name", "", {}, fUpdate); // implement

            var aProps = LiteGraph.availableCanvasOptions;
            aProps.sort();
            for(var pI in aProps) {
                var pX = aProps[pI];
                panel.addWidget( "boolean", pX, graphcanvas[pX], {key: pX, on: "on", off: "off"}, fUpdate);
            }

            panel.addWidget( "combo", "Render mode", LiteGraph.LINK_RENDER_MODES[graphcanvas.links_render_mode], {key: "links_render_mode", values: LiteGraph.LINK_RENDER_MODES}, fUpdate);

            panel.addSeparator();

            panel.footer.innerHTML = ""; // clear

        }
        inner_refresh();

        graphcanvas.canvas.parentNode.appendChild( panel );
    }

    showShowNodePanel(node) {
        this.SELECTED_NODE = node;
        this.closePanels();
        var ref_window = this.getCanvasWindow();

        var graphcanvas = this;
        var panel = this.createPanel(node.title || "",{
            closable: true,
            window: ref_window,
            onOpen: function() {
                graphcanvas.NODEPANEL_IS_OPEN = true;
            },
            onClose: function() {
                graphcanvas.NODEPANEL_IS_OPEN = false;
                graphcanvas.node_panel = null;
            },
        });
        graphcanvas.node_panel = panel;
        panel.id = "node-panel";
        panel.node = node;
        panel.classList.add("settings");

        function inner_refresh() {
            panel.content.innerHTML = ""; // clear
            panel.addHTML("<span class='node_type'>"+node.type+"</span>"+
                "<span class='node_desc'>"+(node.constructor.desc || "")+"</span>"+
                "<span class='separator'></span>");

            panel.addHTML("<h3>Properties</h3>");

            const fUpdate = (name,value) => {
                graphcanvas.graph.beforeChange(node);
                switch(name) {
                    case "Title":
                        node.title = value;
                        break;
                    case "Mode":
                        var kV = Object.values(LiteGraph.NODE_MODES).indexOf(value);
                        if (kV>=0 && LiteGraph.NODE_MODES[kV]) {
                            node.changeMode(kV);
                        }else{
                            LiteGraph.log_warn("lgraphcanvas", "showShowNodePanel", "unexpected mode",value,kV);
                        }
                        break;
                    case "Color":
                        if (LGraphCanvas.node_colors[value]) {
                            node.color = LGraphCanvas.node_colors[value].color;
                            node.bgcolor = LGraphCanvas.node_colors[value].bgcolor;
                        }else{
                            LiteGraph.log_warn("lgraphcanvas", "showShowNodePanel", "unexpected color",value);
                        }
                        break;
                    default:
                        node.setProperty(name,value);
                        break;
                }
                graphcanvas.graph.afterChange();
                graphcanvas.dirty_canvas = true;
            };

            panel.addWidget( "string", "Title", node.title, {}, fUpdate);

            panel.addWidget( "combo", "Mode", LiteGraph.NODE_MODES[node.mode], {values: LiteGraph.NODE_MODES}, fUpdate);

            var nodeCol = "";
            if (node.color !== undefined) {
                nodeCol = Object.keys(LGraphCanvas.node_colors).filter(function(nK) {
                    return LGraphCanvas.node_colors[nK].color == node.color;
                });
            }

            panel.addWidget( "combo", "Color", nodeCol, {values: Object.keys(LGraphCanvas.node_colors)}, fUpdate);

            for(var pName in node.properties) {
                var value = node.properties[pName];
                var info = node.getPropertyInfo(pName);
                let type = info && info!==null ? info.type : "string";

                // in case the user wants control over the side panel widget
                if( node.onAddPropertyToPanel && node.onAddPropertyToPanel(pName, panel, value, info, fUpdate) ) {
                    continue;
                }
                panel.addWidget( info.widget || type, pName, value, info, fUpdate);
            }

            panel.addSeparator();

            if(node.onShowCustomPanelInfo)
                node.onShowCustomPanelInfo(panel);

            panel.footer.innerHTML = ""; // clear
            panel.addButton("Delete",function() {
                if(node.block_delete)
                    return;
                node.graph.remove(node);
                panel.close();
            }).classList.add("delete");
        }

        panel.inner_showCodePad = function( propname ) {
            panel.classList.remove("settings");
            panel.classList.add("centered");

            /* TODO restore, export to extensions
            if(window.CodeFlask) //disabled for now
            {
                panel.content.innerHTML = "<div class='code'></div>";
                var flask = new CodeFlask( "div.code", { language: 'js' });
                flask.updateCode(node.properties[propname]);
                flask.onUpdate( function(code) {
                    node.setProperty(propname, code);
                });
            }
            else
            {*/
            panel.alt_content.innerHTML = "<textarea class='code'></textarea>";
            var textarea = panel.alt_content.querySelector("textarea");
            var fDoneWith = () => {
                panel.toggleAltContent(false); // if(node_prop_div) node_prop_div.style.display = "block"; // panel.close();
                panel.toggleFooterVisibility(true);
                textarea.parentNode.removeChild(textarea);
                panel.classList.add("settings");
                panel.classList.remove("centered");
                inner_refresh();
            }
            textarea.value = node.properties[propname];
            textarea.addEventListener("keydown", function(e) {
                if(e.code == "Enter" && e.ctrlKey ) {
                    node.setProperty(propname, textarea.value);
                    fDoneWith();
                }
            });
            panel.toggleAltContent(true);
            panel.toggleFooterVisibility(false);
            textarea.style.height = "calc(100% - 40px)";
            /* }*/
            var assign = panel.addButton( "Assign", function() {
                node.setProperty(propname, textarea.value);
                fDoneWith();
            });
            panel.alt_content.appendChild(assign); // panel.content.appendChild(assign);
            var button = panel.addButton( "Close", fDoneWith);
            button.style.float = "right";
            panel.alt_content.appendChild(button); // panel.content.appendChild(button);
        }

        inner_refresh();

        this.canvas.parentNode.appendChild( panel );
    }

    showSubgraphPropertiesDialog(node) {
        LiteGraph.log_debug("lgraphcanvas", "showSubgraphPropertiesDialog", "showing subgraph properties dialog");

        var old_panel = this.canvas.parentNode.querySelector(".subgraph_dialog");
        if(old_panel)
            old_panel.close();

        var panel = this.createPanel("Subgraph Inputs",{closable: true, width: 500});
        panel.node = node;
        panel.classList.add("subgraph_dialog");

        function inner_refresh() {
            panel.clear();

            // show currents
            if(node.inputs)
                for(let i = 0; i < node.inputs.length; ++i) {
                    var input = node.inputs[i];
                    if(input.not_subgraph_input)
                        continue;
                    var html = "<button>&#10005;</button> <span class='bullet_icon'></span><span class='name'></span><span class='type'></span>";
                    var elem = panel.addHTML(html,"subgraph_property");
                    elem.dataset["name"] = input.name;
                    elem.dataset["slot"] = i;
                    elem.querySelector(".name").innerText = input.name;
                    elem.querySelector(".type").innerText = input.type;
                    elem.querySelector("button").addEventListener("click",function(_event) {
                        node.removeInput( Number( this.parentNode.dataset["slot"] ) );
                        inner_refresh();
                    });
                }
        }

        // add extra
        var html = " + <span class='label'>Name</span><input class='name'/><span class='label'>Type</span><input class='type'></input><button>+</button>";
        var elem = panel.addHTML(html,"subgraph_property extra", true);
        elem.querySelector("button").addEventListener("click", function(_event) {
            var elem = this.parentNode;
            var name = elem.querySelector(".name").value;
            var type = elem.querySelector(".type").value;
            if(!name || node.findInputSlot(name) != -1)
                return;
            if(["event","action"].indexOf(type)>-1){
                type = LiteGraph.EVENT;
            }
            node.addInput(name,type);
            elem.querySelector(".name").value = "";
            elem.querySelector(".type").value = "";
            inner_refresh();
        });

        inner_refresh();
        this.canvas.parentNode.appendChild(panel);
        return panel;
    }

    showSubgraphPropertiesDialogRight(node) {

        LiteGraph.log_verbose("lgraphcanvas", "showSubgraphPropertiesDialogRight", "showing subgraph properties dialog RIGHT");

        // old_panel if old_panel is exist close it
        var old_panel = this.canvas.parentNode.querySelector(".subgraph_dialog");
        if (old_panel)
            old_panel.close();
        // new panel
        var panel = this.createPanel("Subgraph Outputs", { closable: true, width: 500 });
        panel.node = node;
        panel.classList.add("subgraph_dialog");

        function inner_refresh() {
            panel.clear();
            // show currents
            if (node.outputs)
                for (let i = 0; i < node.outputs.length; ++i) {
                    var input = node.outputs[i];
                    if (input.not_subgraph_output)
                        continue;
                    var html = "<button>&#10005;</button> <span class='bullet_icon'></span><span class='name'></span><span class='type'></span>";
                    var elem = panel.addHTML(html, "subgraph_property");
                    elem.dataset["name"] = input.name;
                    elem.dataset["slot"] = i;
                    elem.querySelector(".name").innerText = input.name;
                    elem.querySelector(".type").innerText = input.type;
                    elem.querySelector("button").addEventListener("click", function (_event) {
                        node.removeOutput(Number(this.parentNode.dataset["slot"]));
                        inner_refresh();
                    });
                }
        }

        // add extra
        var html = " + <span class='label'>Name</span><input class='name'/><span class='label'>Type</span><input class='type'></input><button>+</button>";
        var elem = panel.addHTML(html, "subgraph_property extra", true);
        elem.querySelector(".name").addEventListener("keydown", function (_event) {
            if (_event.keyCode == 13) {
                addOutput.apply(this)
            }
        })
        elem.querySelector("button").addEventListener("click", function (_event) {
            addOutput.apply(this)
        });
        function addOutput() {
            var elem = this.parentNode;
            var name = elem.querySelector(".name").value;
            var type = elem.querySelector(".type").value;
            if (!name || node.findOutputSlot(name) != -1)
                return;
            if(["event","action"].indexOf(type)>-1){
                type = LiteGraph.EVENT;
            }
            node.addOutput(name, type);
            elem.querySelector(".name").value = "";
            elem.querySelector(".type").value = "";
            inner_refresh();
        }

        inner_refresh();
        this.canvas.parentNode.appendChild(panel);
        return panel;
    }

    /**
     * will close node-panel and option-panel
     * @returns void 
     */
    closePanels() {
        var panel = document.querySelector("#node-panel");
        if(panel)
            panel.close(); // ? panel.close.call(panel);
        panel = document.querySelector("#option-panel");
        if(panel)
            panel.close(); // ? panel.close.call(panel);
    }

    /**
     * will close .litegraph.dialog
     * @returns void
     */
    checkPanels() {
        if(!this.canvas)
            return;
        var panels = this.canvas.parentNode.querySelectorAll(".litegraph.dialog");
        for(let i = 0; i < panels.length; ++i) {
            var panel = panels[i];
            if( !panel.node )
                continue;
            if( !panel.node.graph || panel.graph != this.graph )
                panel.close();
        }
    }

    static onMenuNodeCollapse(value, options, e, menu, node) {
        node.graph.beforeChange(/* ?*/);

        var fApplyMultiNode = function(node) {
            node.collapse();
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
            fApplyMultiNode(node);
        }else{
            for (let i in graphcanvas.selected_nodes) {
                fApplyMultiNode(graphcanvas.selected_nodes[i]);
            }
        }

        node.graph.afterChange(/* ?*/);
    }

    static onMenuNodePin(value, options, e, menu, node) {
        node.pin();
    }

    static onMenuNodeMode(value, options, e, menu, node) {
        LiteGraph.ContextMenu(
            LiteGraph.NODE_MODES,
            { event: e, callback: inner_clicked, parentMenu: menu, node: node },
        );

        function inner_clicked(v) {
            if (!node) {
                return;
            }
            var kV = Object.values(LiteGraph.NODE_MODES).indexOf(v);
            const fApplyMultiNode = (node) => {
                if (kV>=0 && LiteGraph.NODE_MODES[kV])
                    node.changeMode(kV);
                else{
                    LiteGraph.log_warn("lgraphcanvas", "onMenuNodeMode", "unexpected mode", v, kV);
                    node.changeMode(LiteGraph.ALWAYS);
                }
            }

            var graphcanvas = LGraphCanvas.active_canvas;
            if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
                fApplyMultiNode(node);
            }else{
                for (let i in graphcanvas.selected_nodes) {
                    fApplyMultiNode(graphcanvas.selected_nodes[i]);
                }
            }
        }

        return false;
    }

    static onMenuNodeColors(value, options, e, menu, node) {
        if (!node) {
            // ? happens ?
            // throw new Error("no node for color");
            LiteGraph.log_warn("lgraphcanvas", "onMenuNodeColors", "invalid node");
            return;
        }

        var values = [];
        values.push({
            value: null,
            content:
                "<span style='display: block; padding-left: 4px;'>No color</span>",
        });

        for (let i in LGraphCanvas.node_colors) {
            let color = LGraphCanvas.node_colors[i];
            value = {
                value: i,
                content:
                    "<span style='display: block; color: #999; padding-left: 4px; border-left: 8px solid " +
                    color.color +
                    "; background-color:" +
                    color.bgcolor +
                    "'>" +
                    i +
                    "</span>",
            };
            values.push(value);
        }
        LiteGraph.ContextMenu(values, {
            event: e,
            callback: inner_clicked,
            parentMenu: menu,
            node: node,
        });

        function inner_clicked(v) {
            if (!node) {
                LiteGraph.log_warn("lgraphcanvas", "onMenuNodeColors", "inner_clicked", "no node");
                return;
            }

            let color = v.value ? LGraphCanvas.node_colors[v.value] : null;

            const fApplyColor = (node) => {
                if (color) {
                    if (node.constructor === LiteGraph.LGraphGroup) {
                        node.color = color.groupcolor;
                    } else {
                        node.color = color.color;
                        node.bgcolor = color.bgcolor;
                    }
                } else {
                    delete node.color;
                    delete node.bgcolor;
                }
            }

            var graphcanvas = LGraphCanvas.active_canvas;
            if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
                fApplyColor(node);
            }else{
                for (let i in graphcanvas.selected_nodes) {
                    fApplyColor(graphcanvas.selected_nodes[i]);
                }
            }
            node.setDirtyCanvas(true, true);
        }

        return false;
    }

    static onMenuNodeShapes(value, options, e, menu, node) {
        if (!node) {
            // ? happens ?
            // throw new Error("no node passed");
            LiteGraph.log_warn("lgraphcanvas", "onMenuNodeShapes", "invalid node");
            return;
        }

        LiteGraph.ContextMenu(LiteGraph.VALID_SHAPES, {
            event: e,
            callback: inner_clicked,
            parentMenu: menu,
            node: node,
        });

        function inner_clicked(v) {
            if (!node) {
                LiteGraph.log_warn("lgraphcanvas", "onMenuNodeShapes", "inner_clicked", "no node");
                return;
            }
            node.graph.beforeChange(/* ?*/); // node

            const fApplyMultiNode = (node) => {
                node.shape = v;
            }

            var graphcanvas = LGraphCanvas.active_canvas;
            if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
                fApplyMultiNode(node);
            }else{
                for (let i in graphcanvas.selected_nodes) {
                    fApplyMultiNode(graphcanvas.selected_nodes[i]);
                }
            }

            node.graph.afterChange(/* ?*/); // node
            node.setDirtyCanvas(true);
        }

        return false;
    }

    static onMenuNodeRemove(value, options, e, menu, node) {
        if (!node) {
            // ? happens ?
            // throw new Error("no node passed");
            LiteGraph.log_warn("lgraphcanvas", "onMenuNodeShapes", "invalid node");
            return;
        }

        var graph = node.graph;
        graph.beforeChange();

        const fApplyMultiNode = (node) => {
            if (node.removable === false) {
                return;
            }
            graph.remove(node);
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
            fApplyMultiNode(node);
        }else{
            for (let i in graphcanvas.selected_nodes) {
                fApplyMultiNode(graphcanvas.selected_nodes[i]);
            }
        }

        graph.afterChange();
        node.setDirtyCanvas(true, true);
    }

    static onMenuNodeToSubgraph(value, options, e, menu, node) {
        var graph = node.graph;
        var graphcanvas = LGraphCanvas.active_canvas;
        if(!graphcanvas){
            // ? happens ?
            // throw new Error("no graph");
            LiteGraph.log_warn("lgraphcanvas", "onMenuNodeToSubgraph", "graphcanvas invalid");
            return;
        }

        var nodes_list = Object.values( graphcanvas.selected_nodes || {} );
        if( !nodes_list.length )
            nodes_list = [ node ];

        var subgraph_node = LiteGraph.createNode("graph/subgraph");
        subgraph_node.pos = node.pos.concat();
        graph.add(subgraph_node);

        subgraph_node.buildFromNodes( nodes_list );

        graphcanvas.deselectAllNodes();
        node.setDirtyCanvas(true, true);
    }

    static onMenuNodeClone(value, options, e, menu, node) {

        node.graph.beforeChange();

        var newSelected = {};

        const fApplyMultiNode = (node) => {
            if (node.clonable === false) {
                return;
            }
            var newnode = node.clone();
            if (!newnode) {
                return;
            }
            newnode.pos = [node.pos[0] + 5, node.pos[1] + 5];
            node.graph.add(newnode);
            newSelected[newnode.id] = newnode;
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
            fApplyMultiNode(node);
        }else{
            for (let i in graphcanvas.selected_nodes) {
                fApplyMultiNode(graphcanvas.selected_nodes[i]);
            }
        }

        if(Object.keys(newSelected).length) {
            graphcanvas.selectNodes(newSelected);
        }

        node.graph.afterChange();

        node.setDirtyCanvas(true, true);
    }

    getCanvasMenuOptions() {
        var options = null;
        var that = this;
        let r = this.processCallbackHandlers("getMenuOptions",{
            def_cb: this.getMenuOptions
        });
        if(r!==null && (r === true || (typeof(r)=="object" && r.return_value === true))){
            // managed
        } else {

            options = [
                {
                    content: "Add Node",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuAdd,
                },
                {
                    content: "Search",
                    has_submenu: false,
                    callback: that.showSearchBox,
                },
                { content: "Add Group", callback: LGraphCanvas.onGroupAdd },
                // { content: "Arrange", callback: that.graph.arrange },
                // {content:"Collapse All", callback: LGraphCanvas.onMenuCollapseAll }
            ];

            if (Object.keys(this.selected_nodes).length > 1) {
                options.push({
                    content: "Align",
                    has_submenu: true,
                    callback: LGraphCanvas.onGroupAlign,
                })
            }

            if (this._graph_stack && this._graph_stack.length > 0) {
                options.push(null, {
                    content: "Close subgraph",
                    callback: this.closeSubgraph.bind(this),
                });
            }
        }

        r = this.processCallbackHandlers("getExtraMenuOptions",{
            def_cb: this.getExtraMenuOptions
        }, this, options);
        if(r!==null && (typeof(r)=="object")){
            if(typeof(r.return_value)=="object"){
                options = options.concat(r.return_value);
            }
        }

        return options;
    }

    // called by processContextMenu to extract the menu list
    getNodeMenuOptions(node) {
        var options = null;

        let r = node.processCallbackHandlers("getMenuOptions",{
            def_cb: node.getMenuOptions
        }, this);
        if(r!==null && (typeof(r)=="object")){
            if(typeof(r.return_value)=="object"){
                options = r.return_value;
            }
        }
        if(options===null){
            options = [
                {
                    content: "Inputs",
                    has_submenu: true,
                    // disabled: true, // disable Input and Output slots ? would need better check :: TODO use showMenuNodeOptional ins
                    callback: LGraphCanvas.showMenuNodeOptionalInputs,
                },
                {
                    content: "Outputs",
                    has_submenu: true,
                    // disabled: true, // disable Input and Output slots ? would need better check :: TODO use showMenuNodeOptional ins
                    callback: LGraphCanvas.showMenuNodeOptionalOutputs,
                },
                null,
                {
                    content: "Properties",
                    has_submenu: true,
                    callback: LGraphCanvas.onShowMenuNodeProperties,
                },
                null,
                {
                    content: "Title",
                    callback: LGraphCanvas.onShowNodeInfoEditor,
                },
                {
                    content: "Mode",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuNodeMode,
                }];
            if(node.resizable !== false) {
                options.push({
                    content: "Resize",
                    callback: LGraphCanvas.onMenuResizeNode,
                });
            }
            options.push(
                {
                    content: "Collapse",
                    callback: LGraphCanvas.onMenuNodeCollapse,
                },
                { content: "Pin", callback: LGraphCanvas.onMenuNodePin },
                {
                    content: "Colors",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuNodeColors,
                },
                {
                    content: "Shapes",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuNodeShapes,
                },
                null,
            );
        }

        // disable Input and Output slots ? would need better check :: TODO use showMenuNodeOptional instead

        // r = node.processCallbackHandlers("onGetInputs",{
        //     def_cb: node.onGetInputs
        // });
        // if(r!==null && (typeof(r)=="object")){
        //     if(typeof(r.return_value)=="object"){
        //         if(typeof(r.return_value.length)!=="undefined" && r.return_value.length){
        //             options[0].disabled = false;
        //         }
        //     }else if(typeof(r.length)!=="undefined" && r.length){
        //         options[0].disabled = false;
        //     }
        // }

        // r = node.processCallbackHandlers("onGetOutputs",{
        //     def_cb: node.onGetOutputs
        // });
        // if(r!==null && (typeof(r)=="object")){
        //     if(typeof(r.return_value)=="object"){
        //         if(typeof(r.return_value.length)!=="undefined" && r.return_value.length){
        //             options[1].disabled = false;
        //         }
        //     }else if(typeof(r.length)!=="undefined" && r.length){
        //         options[0].disabled = false;
        //     }
        // }

        if (LiteGraph.do_add_triggers_slots)
            options[1].disabled = false;

        r = node.processCallbackHandlers("getExtraMenuOptions",{
            def_cb: node.getExtraMenuOptions
        }, this, options);
        if(r!==null && (typeof(r)=="object")){
            if(typeof(r.return_value)=="object"){
                if(typeof(r.return_value.length)!=="undefined" && r.return_value.length){
                    options = options.concat(r.return_value);
                }else{
                    LiteGraph.log_warn("getExtraMenuOptions", "not array", r.return_value);
                }
            }else{
                if(typeof(r.length)!=="undefined" && r.length){
                    options = options.concat(r);
                }else{
                    // LiteGraph.log_verbose("getExtraMenuOptions", "not returning additional options", r);
                }
            }
        }

        if (node.clonable !== false) {
            options.push({
                content: "Clone",
                callback: LGraphCanvas.onMenuNodeClone,
            });
        }
        /*
        if(0) // @TODO: implement collpase to SubGraph
        options.push({
            content: "To Subgraph",
            callback: LGraphCanvas.onMenuNodeToSubgraph
        });
        */
        if (Object.keys(this.selected_nodes).length > 1) {
            options.push({
                content: "Align Selected To",
                has_submenu: true,
                callback: LGraphCanvas.onNodeAlign,
            })
        }

        options.push(null, {
            content: "Remove",
            disabled: !(node.removable !== false && !node.block_delete ),
            callback: LGraphCanvas.onMenuNodeRemove,
        });

        if (node.graph) {
            node.graph.processCallbackHandlers("onGetNodeMenuOptions",{
                def_cb: node.graph.onGetNodeMenuOptions
            }, options, node);
        }

        return options;
    }

    getGroupMenuOptions() {
        var o = [
            { content: "Title", callback: LGraphCanvas.onShowNodeInfoEditor },
            {
                content: "Color",
                has_submenu: true,
                callback: LGraphCanvas.onMenuNodeColors,
            },
            {
                content: "Font size",
                property: "font_size",
                type: "Number",
                callback: LGraphCanvas.onShowNodeInfoEditor,
            },
            null,
            { content: "Remove", callback: LGraphCanvas.onMenuNodeRemove },
        ];

        return o;
    }

    processContextMenu(node, event) {
        var that = this;
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        var menu_info = null;
        var options = {
            event: event,
            callback: inner_option_clicked,
            extra: node,
        };

        if(node)
            options.title = node.type;

        // check if mouse is in input
        var slot = null;
        if (node) {
            slot = node.getSlotInPosition(event.canvasX, event.canvasY);
            LGraphCanvas.active_node = node;
        }

        if (slot) {
            // on slot
            menu_info = [];
            let r = node.processCallbackHandlers("getSlotMenuOptions",{
                def_cb: node.getSlotMenuOptions
            }, slot);
            if(r!==null && (typeof(r)=="object" && typeof(r.return_value) == "object")){
                menu_info = r.return_value;
            } else {
                if (LiteGraph.canSetSlotsLabels) {
                    menu_info.push({ content: "Set Label", slot: slot });
                }
                var _slot = slot.input || slot.output;
                if (_slot.nameLocked===false || LiteGraph.canRenameSlots) {
                    menu_info.push({ content: "Rename Slot", slot: slot });
                }
                if (slot?.output?.links?.length || slot.input?.link) {
                    menu_info.push({ content: "Disconnect Links", slot: slot });
                }
                if (_slot.removable || LiteGraph.canRemoveSlots) {
                    menu_info.push(_slot.locked
                        ? "Cannot remove"
                        : { content: "Remove Slot", slot: slot });
                }
            }
            var slotOb = slot.input || slot.output;
            options.title = slotOb.type || "*";
            if (slotOb.type == LiteGraph.ACTION) {
                options.title = "Action";
                if(LiteGraph.allow_action_widget_button){
                    menu_info.push({ content: "Toggle widget", callback: ()=>{ node.toggleActionWidget(slotOb.name, slot); } });
                }
            } else if (slotOb.type == LiteGraph.EVENT) {
                options.title = "Event";
            }
        } else {
            if (node) {
                // on node
                menu_info = this.getNodeMenuOptions(node);
            } else {
                menu_info = this.getCanvasMenuOptions();
                var group = this.graph.getGroupOnPos(
                    event.canvasX,
                    event.canvasY,
                );
                options.filter_enabled = false;
                if (group) {
                    // on group
                    menu_info.push(null, {
                        content: "Edit Group",
                        has_submenu: true,
                        submenu: {
                            title: "Group",
                            extra: group,
                            options: this.getGroupMenuOptions(group),
                        },
                    });
                    menu_info.push(null, {
                        content: "Select nodes",
                        canvas: this,
                        group: group,
                        callback: function(this_mi, options, e, menu){
                            console.warn(this_mi);
                            this_mi.canvas.selectNodes(this_mi.group._nodes);
                        }
                    });
                }
            }
        }

        // show menu
        if (!menu_info) {
            return;
        }

        LiteGraph.ContextMenu(menu_info, options, ref_window);

        function inner_option_clicked(v, options) {
            if (!v) {
                return;
            }
            let info;

            if (v.content == "Remove Slot") {
                info = v.slot;
                node.graph.beforeChange();
                if (info.input) {
                    node.removeInput(info.slot);
                } else if (info.output) {
                    node.removeOutput(info.slot);
                }
                node.graph.afterChange();
                return;
            } else if (v.content == "Disconnect Links") {
                info = v.slot;
                node.graph.beforeChange();
                if (info.output) {
                    node.disconnectOutput(info.slot);
                } else if (info.input) {
                    node.disconnectInput(info.slot);
                }
                node.graph.afterChange();
                return;
            } else if (v.content == "Rename Slot") {
                info = v.slot;
                var slot_info = info.input
                    ? node.getInputInfo(info.slot)
                    : node.getOutputInfo(info.slot);
                var dialog = that.createDialog(
                    "<span class='name'>Name</span><input autofocus type='text'/><button>OK</button>",
                    options,
                );
                var input = dialog.querySelector("input");
                if (input && slot_info) {
                    input.value = slot_info.name || "";
                }
                var inner = function() {
                    node.graph.beforeChange();
                    if (input.value) {
                        if (slot_info) {
                            slot_info.name = input.value;
                        }
                        that.setDirty(true);
                    }
                    dialog.close();
                    node.graph.afterChange();
                }
                dialog.querySelector("button").addEventListener("click", inner);
                input.addEventListener("keydown", function(e) {
                    dialog.is_modified = true;
                    if (e.keyCode == 27) {
                        // ESC
                        dialog.close();
                    } else if (e.keyCode == 13) {
                        inner(); // save
                    } else if (e.keyCode != 13 && e.target.localName != "textarea") {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                });
                input.focus();
            } else if (v.content == "Rename Label") {
                info = v.slot;
                var slot_info = info.input
                    ? node.getInputInfo(info.slot)
                    : node.getOutputInfo(info.slot);
                var dialog = that.createDialog(
                    "<span class='name'>Label</span><input autofocus type='text'/><button>OK</button>",
                    options,
                );
                var input = dialog.querySelector("input");
                if (input && slot_info) {
                    input.value = slot_info.label || "";
                }
                var inner = function() {
                    node.graph.beforeChange();
                    if (input.value) {
                        if (slot_info) {
                            slot_info.label = input.value;
                        }
                        that.setDirty(true);
                    }
                    dialog.close();
                    node.graph.afterChange();
                }
                dialog.querySelector("button").addEventListener("click", inner);
                input.addEventListener("keydown", function(e) {
                    dialog.is_modified = true;
                    if (e.keyCode == 27) {
                        // ESC
                        dialog.close();
                    } else if (e.keyCode == 13) {
                        inner(); // save
                    } else if (e.keyCode != 13 && e.target.localName != "textarea") {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                });
                input.focus();
            }
            // if(v.callback)
            //	return v.callback.call(that, node, options, e, menu, that, event );
        }
    }



    static DEFAULT_BACKGROUND_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQBJREFUeNrs1rEKwjAUhlETUkj3vP9rdmr1Ysammk2w5wdxuLgcMHyptfawuZX4pJSWZTnfnu/lnIe/jNNxHHGNn//HNbbv+4dr6V+11uF527arU7+u63qfa/bnmh8sWLBgwYJlqRf8MEptXPBXJXa37BSl3ixYsGDBMliwFLyCV/DeLIMFCxYsWLBMwSt4Be/NggXLYMGCBUvBK3iNruC9WbBgwYJlsGApeAWv4L1ZBgsWLFiwYJmCV/AK3psFC5bBggULloJX8BpdwXuzYMGCBctgwVLwCl7Be7MMFixYsGDBsu8FH1FaSmExVfAxBa/gvVmwYMGCZbBg/W4vAQYA5tRF9QYlv/QAAAAASUVORK5CYII=";

    static link_type_colors = {
        "-1": "#A86",
        "number": "#AAA",
        "node": "#DCA",
        "string": "#77F",
        "boolean": "#F77",
    };

    static gradients = {}; // cache of gradients

    static search_limit = -1;

    static node_colors = {
        red: { color: "#322", bgcolor: "#533", groupcolor: "#A88" },
        brown: { color: "#332922", bgcolor: "#593930", groupcolor: "#b06634" },
        green: { color: "#232", bgcolor: "#353", groupcolor: "#8A8" },
        blue: { color: "#223", bgcolor: "#335", groupcolor: "#88A" },
        pale_blue: { color: "#2a363b", bgcolor: "#3f5159", groupcolor: "#3f789e" },
        cyan: { color: "#233", bgcolor: "#355", groupcolor: "#8AA" },
        purple: { color: "#323", bgcolor: "#535", groupcolor: "#a1309b" },
        yellow: { color: "#432", bgcolor: "#653", groupcolor: "#b58b2a" },
        black: { color: "#222", bgcolor: "#000", groupcolor: "#444" },
    };

    /**
     * returns ture if low qualty rendering requered at requested scale
     * */
    lowQualityRenderingRequired(activation_scale) {
        if ( this.ds.scale < activation_scale) {
            return this.low_quality_rendering_counter > this.low_quality_rendering_threshold;
        }
        return false;
    }

    /**
     * Changes the background color of the canvas.
     *
     * @method updateBackground
     * @param {image} String
     * @param {clearBackgroundColor} String
     * @
     */
    updateBackground(image, clearBackgroundColor) {
        this._bg_img = new Image();
        this._bg_img.name = image;
        this._bg_img.src = image;
        this._bg_img.onload = () => {
            this.draw(true, true);
        };
        this.background_image = image;
    
        this.clear_background = true;
        this.clear_background_color = clearBackgroundColor;
        this._pattern = null
    }

}

/* LGraphCanvas render */
var temp = new Float32Array(4);
var temp_vec2 = new Float32Array(2);

/**
 * draws the shape of the given node in the canvas
 * @method drawNodeShape
 **/
var tmp_area = new Float32Array(4);
var margin_area = new Float32Array(4);
var link_bounding = new Float32Array(4);
var tempA = new Float32Array(2);
var tempB = new Float32Array(2);