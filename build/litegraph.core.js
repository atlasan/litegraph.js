// global.js

// Function to get the global object (browser or server)
export function getGlobalObject() {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof self !== 'undefined') return self;
    if (typeof window !== 'undefined') return window;
    if (typeof global !== 'undefined') return global;
    throw new Error('Unable to determine global object');
}

// Function to set a global variable
export function setGlobalVariable(key, value) {
    const globalObject = getGlobalObject();
    globalObject[key] = value;
}

// Function to get a global variable
export function getGlobalVariable(key) {
    const globalObject = getGlobalObject();
    return globalObject[key];
}

// Function to check if running in a browser environment
export function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// Function to check if running in a Node.js environment
export function isNode() {
    return typeof process !== 'undefined' && process.versions && process.versions.node;
}

// Function to check if running in a Bun.js environment
export function isBun() {
    return typeof Bun !== 'undefined';
}

// Function to detect the runtime environment
export function getRuntime() {
    if (isBrowser()) return 'browser';
    if (isBun()) return 'bun';
    if (isNode()) return 'node';
    return 'unknown';
}

/**
 * @class LiteGraph
 *
 * @NOTE:
 * Try to avoid adding things to this class.
 * https://dzone.com/articles/singleton-anti-pattern
 */
export class LiteGraphClass {

    VERSION = "0.10.10";
    /** numeric graph-document schema version written by LGraph.serialize (LiteGraph 0.4 layout, array links) */
    SERIALIZATION_VERSION = 0.4;
    /** size canvases for window.devicePixelRatio in LGraphCanvas.resize */
    canvas_high_dpi = true;

    LLink = null; //LLink;
    LGraph = null; //LGraph;
    LGraphNode = null; //LGraphNode;
    LGraphGroup = null; //LGraphGroup;
    LGraphCanvas = null; //LGraphCanvas;
    Subgraph = null; //Subgraph;
    GraphInput = null; //GraphInput;
    GraphOutput = null; //GraphOutput;
    DragAndScale = null; //DragAndScale;
    ContextMenuClass = null; //ContextMenuClass;
    ContextMenu = null;
    // ContextMenu = function(){ return new ContextMenuClass(...arguments); };
    CallbackHandler = null; //CallbackHandler;

    CANVAS_GRID_SIZE = 10;
    NODE_TITLE_HEIGHT = 30;
    NODE_TITLE_TEXT_Y = 20;
    NODE_SLOT_HEIGHT = 20;
    NODE_WIDGET_HEIGHT = 20;
    NODE_WIDTH = 140;
    NODE_MIN_WIDTH = 50;
    NODE_MIN_SIZE = [50, 0];
    NODE_COLLAPSED_RADIUS = 10;
    NODE_COLLAPSED_WIDTH = 80;
    NODE_TITLE_COLOR = "#999";
    NODE_SELECTED_TITLE_COLOR = "#FFF";
    NODE_TEXT_SIZE = 14;
    NODE_TEXT_COLOR = "#AAA";
    NODE_SUBTEXT_SIZE = 12;
    NODE_DEFAULT_COLOR = "#333";
    NODE_DEFAULT_BGCOLOR = "#353535";
    NODE_DEFAULT_BOXCOLOR = "#666";
    NODE_BGCOLOR_LOADINGLIB = "#353565";
    NODE_BGCOLOR_WRONGENV = "#653535";
    NODE_BGCOLOR_ERROR = "#F33";
    NODE_DEFAULT_SHAPE = 2; // ROUND_SHAPE; honoured by the canvas (shape constant or "box"/"round"/"card"/"circle")
    NODE_BOX_OUTLINE_COLOR = "#FFF";
    DEFAULT_SHADOW_COLOR = "rgba(0,0,0,0.5)";
    DEFAULT_GROUP_FONT = 24;

    WIDGET_BGCOLOR = "#222";
    WIDGET_OUTLINE_COLOR = "#666";
    WIDGET_TEXT_COLOR = "#DDD";
    WIDGET_SECONDARY_TEXT_COLOR = "#999";

    LINK_COLOR = "#9A9";
    EVENT_LINK_COLOR = "#A86";
    CONNECTING_LINK_COLOR = "#AFA";

    MAX_NUMBER_OF_NODES = 1000; // avoid infinite loops
    DEFAULT_POSITION = [100, 100]; // default node position
    VALID_SHAPES = ["default", "box", "round", "card"]; // ,"circle"

    // shapes are used for nodes but also for slots
    BOX_SHAPE = 1;
    ROUND_SHAPE = 2;
    CIRCLE_SHAPE = 3;
    CARD_SHAPE = 4;
    ARROW_SHAPE = 5;
    GRID_SHAPE = 6; // intended for slot arrays

    // enums
    INPUT = 1;
    OUTPUT = 2;

    EVENT = -1; // for outputs
    ACTION = -1; // for inputs

    NODE_MODES = ["Always", "On Event", "Never", "On Trigger", "On Request"]; // helper
    NODE_MODES_COLORS = ["#666", "#422", "#333", "#224", "#626"]; // use with node_box_coloured_by_mode
    ALWAYS = 0;
    ON_EVENT = 1;
    NEVER = 2;
    ON_TRIGGER = 3;
    ON_REQUEST = 4; // used from event-based nodes, where ancestors are recursively executed on needed

    UP = 1;
    DOWN = 2;
    LEFT = 3;
    RIGHT = 4;
    CENTER = 5;

    LINK_RENDER_MODES = ["Straight", "Linear", "Spline"]; // helper
    STRAIGHT_LINK = 0;
    LINEAR_LINK = 1;
    SPLINE_LINK = 2;

    NORMAL_TITLE = 0;
    NO_TITLE = 1;
    TRANSPARENT_TITLE = 2;
    AUTOHIDE_TITLE = 3;
    VERTICAL_LAYOUT = "vertical"; // arrange nodes vertically

    // canvas flags the graph Options panel offers as on/off switches
    availableCanvasOptions = [
        "allow_addOutSlot_onExecuted", "free_resize", "highquality_render", "use_gradients",
        "pause_rendering", "clear_background", "read_only", "live_mode", "show_info",
        "allow_dragcanvas", "allow_dragnodes", "allow_interaction", "allow_searchbox",
        "move_destination_link_without_shift", "set_canvas_dirty_on_mouse_event",
        "always_render_background", "render_shadows", "render_canvas_border",
        "render_connections_shadows", "render_connections_border", "render_connection_arrows",
        "render_collapsed_slots", "render_execution_order", "render_title_colored", "render_link_tooltip",
    ];

    proxy = null; // used to redirect calls
    node_images_path = "";

    catch_exceptions = true;
    throw_errors = true;
    allow_scripts = false; // nodes should be check this value before executing unsafe code :: does not prevent anything in the main library, implement in nodes :: if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration), which could lead to exploits
    use_deferred_actions = true; // executes actions during the graph execution flow
    registered_node_types = {}; // nodetypes by string
    node_types_by_file_extension = {}; // used for dropping files in the canvas
    Nodes = {}; // node types by classname
    Globals = {}; // used to store vars between graphs

    searchbox_extras = {}; // used to add extra features to the search box
    node_definitions = {}; // metadata per registered type, readable without creating a node (see getNodeDefinition)
    capability_rules = []; // [{match, capabilities}] from declareCapabilities, also applied to later registrations
    auto_sort_node_types = false; // [true!] If set to true, will automatically sort node types / categories in the context menus

    node_box_coloured_when_on = false; // [true!] this make the nodes box (top left circle) coloured when triggered (execute/action), visual feedback
    node_box_coloured_by_mode = false; // [true!] nodebox based on node mode, visual feedback

    dialog_close_on_mouse_leave = true; // [false on mobile] better true if not touch device, TODO add an helper/listener to close if false
    dialog_close_on_mouse_leave_delay = 500;

    shift_click_do_break_link_from = true; // [false!] prefer false if too easy to break links - implement with ALT or TODO custom keys
    click_do_break_link_to = false; // [false!]prefer false, way too easy to break links

    search_filter_enabled = false; // [true!] enable filtering slots type in the search widget, !requires auto_load_slot_types or manual set registered_slot_[in/out]_types and slot_types_[in/out]
    search_hide_on_mouse_leave = true; // [false on mobile] better true if not touch device, TODO add an helper/listener to close if false
    search_hide_on_mouse_leave_time = 1200; // time before hiding
    search_show_all_on_open = true; // [true!] opens the results list when opening the search widget

    show_node_tooltip = false; // [true!] show a tooltip with node property "tooltip" over the selected node
    show_node_tooltip_use_descr_property = false; // enabled tooltip from desc when property tooltip not set

    auto_load_slot_types = false; // [if want false, use true, run, get vars values to be statically set, than disable] nodes types and nodeclass association with node types need to be calculated, if dont want this, calculate once and set registered_slot_[in/out]_types and slot_types_[in/out]

    // set these values if not using auto_load_slot_types
    registered_slot_in_types = {}; // slot types for nodeclass
    registered_slot_out_types = {}; // slot types for nodeclass
    slot_types_in = []; // slot types IN
    slot_types_out = []; // slot types OUT
    slot_types_default_in = []; // specify for each IN slot type a(/many) default node(s), use single string, array, or object (with node, title, parameters, ..) like for search
    slot_types_default_out = []; // specify for each OUT slot type a(/many) default node(s), use single string, array, or object (with node, title, parameters, ..) like for search

    graphDefaultConfig = {
        align_to_grid: true,
        links_ontop: false,
    };

    alt_drag_do_clone_nodes = false; // [true!] very handy, ALT click to clone and drag the new node
    alt_shift_drag_connect_clone_with_input = true; // [true!] very handy, when cloning, keep input connections with SHIFT

    do_add_triggers_slots = false; // [true!] will create and connect event slots when using action/events connections, !WILL CHANGE node mode when using onTrigger (enable mode colors), onExecuted does not need this

    allow_multi_output_for_events = true; // [false!] being events, it is strongly reccomended to use them sequentially, one by one

    middle_click_slot_add_default_node = false; // [true!] allows to create and connect a ndoe clicking with the third button (wheel)

    release_link_on_empty_shows_menu = false; // [true!] dragging a link to empty space will open a menu, add from list, search or defaults
    two_fingers_opens_menu = false; // [true!] using pointer event isPrimary, when is not simulate right click

    backspace_delete = true; // [false!] delete key is enough, don't mess with text edit and custom

    ctrl_shift_v_paste_connect_unselected_outputs = false; // [true!] allows ctrl + shift + v to paste nodes with the outputs of the unselected nodes connected with the inputs of the newly pasted nodes

    actionHistory_enabled = false; // cntrlZ, cntrlY
    actionHistoryMaxSave = 300;

    /* EXECUTING ACTIONS AFTER UPDATING VALUES - ANCESTORS */
    refreshAncestorsOnTriggers = false; // [true!]
    refreshAncestorsOnActions = false; // [true!]
    ensureUniqueExecutionAndActionCall = false; // [true!] the new tecnique.. let's make it working best of

    // if true, all newly created nodes/links will use string UUIDs for their id fields instead of integers.
    // use this if you must have node IDs that are unique across all graphs and subgraphs.
    use_uuids = false;

    // enable filtering elements of the context menu with keypress (+ arrows for navigation, escape to close)
    context_menu_filter_enabled = false; // FIX event handler removal

    // ,"editor_alpha" //= 1; //used for transition

    canSetSlotsLabels = true; // setting the label should be safe

    canRemoveSlots = false; // use removable = true in specific slot
    canRenameSlots = false; // use nameLocked = false in specific slot

    ensureNodeSingleExecution = false; // OLD this will prevent nodes to be executed more than once for step (comparing graph.iteration)
    ensureNodeSingleAction = false; // OLD this will prevent nodes to be executed more than once for action call!
    preventAncestorRecalculation = false; // OLD(?) when calculating the ancestors, set a flag to prevent recalculate the subtree

    allowMultiOutputForEvents = false; // being events, it is strongly reccomended to use them sequentually, one by one

    reprocess_slot_while_node_configure = false; // reprocess inputs and output node slots comparing by name, will fix index changes, works on dynamics

    properties_allow_input_binding = false; // [true!] allow create and bind inputs, will update binded property value on node execute 
    properties_allow_output_binding = false; // [true!] allow create and bind outputs, will update output slots when node executed 
    properties_input_binding_check_ancestors = false; // [true!] when executing a node it will update binding, there when getting data will ensure data is updated

    allow_action_widget_button = true; // [true!] allow linking an action to a button widget to call it

    log_methods = ['error', 'warn', 'info', 'log', 'debug'];

    cb_handler = false;
    debug = true; // enable/disable logging :: in this.debug_level is stored the actual numeric value
    debug_level = 2; // set via this.logging_set_level

    constructor() {
        // if exporting stripping include for a bundle will trow error because not yet instantiated other classes
        // this.initialize();
    }

    /**
     * initialize LiteGraph, call when other classes are instantiated
     */
    initialize() {
        // event dispatcher, along direct (single) assignment of callbacks [ event entrypoint ]
        this.callbackhandler_setup();

        this.LLink = LLink;
        this.LGraph = LGraph;
        this.LGraphNode = LGraphNode;
        this.LGraphGroup = LGraphGroup;
        this.LGraphCanvas = LGraphCanvas;
        this.Subgraph = Subgraph;
        this.GraphInput = GraphInput;
        this.GraphOutput = GraphOutput;
        this.DragAndScale = DragAndScale;
        this.ContextMenuClass = ContextMenu;
        this.ContextMenu = function() {
            return new ContextMenu(...arguments);
        };
        this.CallbackHandler = CallbackHandler;
        this.LibraryManager ??= new LibraryManager();

        this.setupPlatform();

        // base inclusion
        this.includeBasicNodes();
    }

    includeBasicNodes() {
        this.registerNodeType("graph/subgraph", Subgraph);
        this.registerNodeType("graph/input", GraphInput);
        this.registerNodeType("graph/output", GraphOutput);
        this.registerNodeType("graph/function", NodeFunction);
    }

    callbackhandler_setup() {
        if (this.cb_handler) return;
        this.cb_handler = new CallbackHandler(this);
        // register CallbackHandler methods on this // Should move as class standard class methods?
        this.registerCallbackHandler = function() {
            return this.cb_handler.registerCallbackHandler(...arguments);
        };
        this.unregisterCallbackHandler = function() {
            return this.cb_handler.unregisterCallbackHandler(...arguments);
        };
        this.processCallbackHandlers = function() {
            return this.cb_handler.processCallbackHandlers(...arguments);
        };
    }

    registerCallbackHandler() {
        this.callbackhandler_setup();
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler() {
        this.callbackhandler_setup();
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers() {
        this.callbackhandler_setup();
        return this.cb_handler.processCallbackHandlers(...arguments);
    }

    /**
     * Builds the metadata of a node type without creating a node.
     * Sources, in order: an optional `static def = {...}` on the class, then the classic static
     * fields (`title`, `desc`/`description`, `search_aliases`, `capabilities`, `deprecated`,
     * `experimental`, `skip_list`), then capability rules from {@link declareCapabilities}.
     * `def.inputs` / `def.outputs` describe the slots when the class declares them (otherwise null:
     * slots are only known after construction).
     * @param {string} type
     * @param {Function} base_class
     * @returns {Readonly<object>} definition
     */
    describeNodeType(type, base_class) {
        const own = (base_class.def && typeof base_class.def === "object") ? base_class.def : {};
        const list = (value) => Array.isArray(value) ? [...value] : (value ? [value] : []);
        const capabilities = new Set([...list(own.capabilities), ...list(base_class.capabilities)]);
        for (const rule of this.capability_rules) {
            if (rule.match(type)) rule.capabilities.forEach((capability) => capabilities.add(capability));
        }
        const slots = (value) => Array.isArray(value) ? value.map((slot) => Object.freeze({
            ...slot
        })) : null;
        return Object.freeze({
            type,
            title: own.display_name ?? own.title ?? base_class.title ?? type,
            description: own.description ?? base_class.desc ?? base_class.description ?? "",
            category: own.category ?? base_class.category ?? "",
            search_aliases: Object.freeze([...list(own.search_aliases), ...list(base_class.search_aliases)]),
            capabilities: Object.freeze([...capabilities]),
            deprecated: !!(own.deprecated ?? base_class.deprecated),
            experimental: !!(own.experimental ?? base_class.experimental),
            hidden: !!(own.hidden ?? base_class.skip_list),
            source: own.source ?? base_class.source ?? null,
            inputs: slots(own.inputs),
            outputs: slots(own.outputs),
        });
    }

    /** @returns {Readonly<object>|null} the metadata of a registered node type */
    getNodeDefinition(type) {
        return this.node_definitions[type] ?? null;
    }

    /**
     * Lists node definitions.
     * @param {{category?: string, capability?: string, includeDeprecated?: boolean, includeHidden?: boolean, supportedOnly?: boolean}} [filter]
     *   category matches the category and its subcategories; supportedOnly drops types this runtime cannot run
     * @returns {Readonly<object>[]}
     */
    listNodeDefinitions({
        category,
        capability,
        includeDeprecated = true,
        includeHidden = true,
        supportedOnly = false
    } = {}) {
        return Object.values(this.node_definitions).filter((def) =>
            (category === undefined || def.category === category || def.category.startsWith(category + "/")) &&
            (capability === undefined || def.capabilities.includes(capability)) &&
            (includeDeprecated || !def.deprecated) &&
            (includeHidden || !def.hidden) &&
            (!supportedOnly || this.isNodeTypeSupported(def.type)));
    }

    /**
     * Declares what node types need from their runtime ("browser", "node", "webgl", "audio", "midi",
     * "dom", "network", "sys", or any custom name). Applies to registered types and to types
     * registered later with a matching name.
     * @param {string|string[]|((type: string) => boolean)} selector - exact type, a prefix ending in
     *   "/" or "::", a list of those, or a predicate
     * @param {string[]} capabilities
     */
    declareCapabilities(selector, capabilities) {
        const toMatcher = (entry) => typeof entry === "function" ? entry :
            (entry.endsWith("/") || entry.endsWith("::")) ? (type) => type.startsWith(entry) :
            (type) => type === entry;
        const matchers = (Array.isArray(selector) ? selector : [selector]).map(toMatcher);
        const rule = {
            match: (type) => matchers.some((match) => match(type)),
            capabilities: [...capabilities]
        };
        this.capability_rules.push(rule);
        for (const type of Object.keys(this.registered_node_types)) {
            if (rule.match(type)) this.node_definitions[type] = this.describeNodeType(type, this.registered_node_types[type]);
        }
    }

    /** The capabilities this runtime provides (computed on each call: environments can change). */
    getRuntimeCapabilities() {
        const has = new Set(["network"]);
        if (isNode() || isBun()) {
            has.add("node");
            has.add("sys");
        }
        if (isBrowser()) has.add("browser");
        if (typeof document !== "undefined" && document?.createElement) has.add("dom");
        if (typeof WebGLRenderingContext !== "undefined" || typeof WebGL2RenderingContext !== "undefined") has.add("webgl");
        if (typeof AudioContext !== "undefined" || typeof globalThis.webkitAudioContext !== "undefined") has.add("audio");
        if (typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function") has.add("midi");
        return has;
    }

    /** Known capabilities a type needs that this runtime lacks (custom names are not checked). */
    getMissingCapabilities(type, runtime = this.getRuntimeCapabilities()) {
        const known = ["browser", "node", "sys", "dom", "webgl", "audio", "midi", "network"];
        return (this.getNodeDefinition(type)?.capabilities ?? []).filter((capability) => known.includes(capability) && !runtime.has(capability));
    }

    /** @returns {boolean} true when the type is registered and this runtime has what it needs */
    isNodeTypeSupported(type, runtime) {
        return !!this.registered_node_types[type] && this.getMissingCapabilities(type, runtime).length === 0;
    }

    /**
     * Lower-case text the search box matches against: type, title, aliases and description.
     * @returns {string}
     */
    getNodeSearchText(type) {
        const def = this.node_definitions[type];
        if (!def) return String(type).toLowerCase();
        return [type, def.title, ...def.search_aliases, def.description].filter(Boolean).join(" \n").toLowerCase();
    }

    /**
     * Registers an extension (see ExtensionRegistry): commands, key bindings, settings and hooks
     * that are all removed again by the returned disposer.
     * @param {object} def
     * @returns {() => void} disposer
     */
    registerExtension(def) {
        this.setupPlatform();
        return this.extensions.register(def);
    }

    /**
     * Registers (or replaces) the class implementing a canvas widget type.
     * @param {string} type - e.g. "slider", or a custom name used with node.addWidget(type, ...)
     * @param {typeof BaseWidget} widgetClass - a BaseWidget subclass with draw() and onPointer()
     */
    registerWidgetType(type, widgetClass) {
        this.setupPlatform();
        if (typeof type !== "string" || !type) throw new TypeError("widget type must be a non-empty string");
        if (typeof widgetClass !== "function" || !(widgetClass.prototype instanceof BaseWidget)) {
            throw new TypeError(`widget type ${type}: class must extend BaseWidget`);
        }
        this.widget_types[type.toLowerCase()] = widgetClass;
    }

    /**
     * Persists settings and the user key-binding layer through a storage adapter
     * (default: localStorage under "litegraph.settings"). The Editor calls this unless created
     * with `{ skip_persistence: true }`; embedders can call it with their own adapter.
     * Calling it again only switches the storage.
     * @param {{load(): object, save(values: object): void}} [storage]
     */
    persistPlatformState(storage = SettingsRegistry.localStorageAdapter()) {
        this.setupPlatform();
        this.settings.setStorage(storage);
        const id = "LiteGraph.Keybindings.UserLayer";
        if (!this.settings.has(id)) {
            this.settings.define({
                id,
                type: "json",
                name: "Key bindings changed by the user",
                default: () => ({
                    bindings: {},
                    unset: []
                }),
                onChange: (value) => this.keybindings.importUserLayer(value),
            });
            this.keybindings.onUserLayerChange = (layer) => this.settings.set(id, layer);
        }
    }

    /**
     * Creates the platform registries once: shared operations (commands), key bindings,
     * settings and extensions. Called by initialize(); safe to call earlier.
     */
    setupPlatform() {
        this.callbackhandler_setup();
        this.commands ??= new CommandRegistry();
        this.keybindings ??= new KeybindingRegistry(this.commands);
        this.settings ??= new SettingsRegistry();
        this.menus ??= new MenuRegistry(this.commands);
        this.widget_types ??= defaultWidgetTypes();
        if (!this.nodeSearch) {
            this.nodeSearch = new NodeSearch();
            // definition filters: deprecated nodes are hidden unless a setting shows them
            this.settings.define({
                id: "LiteGraph.Search.ShowDeprecated",
                name: "Show deprecated nodes in search",
                default: false
            });
            this.settings.define({
                id: "LiteGraph.Search.ShowExperimental",
                name: "Show experimental nodes in search",
                default: true
            });
            this.nodeSearch.registerFilter({
                id: "core.deprecated",
                name: "Deprecated",
                predicate: (def) => !def.deprecated,
                enabled: () => !this.settings.get("LiteGraph.Search.ShowDeprecated")
            });
            this.nodeSearch.registerFilter({
                id: "core.experimental",
                name: "Experimental",
                predicate: (def) => !def.experimental,
                enabled: () => !this.settings.get("LiteGraph.Search.ShowExperimental")
            });
        }
        this.extensions ??= new ExtensionRegistry(this);
    }

    // set logging debug_level
    // from -1 (none), 0 (error), .. to 5 (debug) based on console methods 'error', 'warn', 'info', 'log', 'debug'
    // could be set higher to enable verbose logging
    logging_set_level(v) {
        this.debug_level = Number(v);
    }

    // entrypoint to debug log
    // pass 0 (error) to 4 (debug), (or more for verbose logging)
    logging(lvl /**/ ) { // arguments

        if (!this.debug && this.debug_level > 0) {
            // force only errors
            this.debug_level = 0;
        }

        if (lvl > this.debug_level) {
            return; // -- break, log only below or equal current --
        }

        function clean_args(args) {
            let aRet = [];
            if (lvl < 0 || lvl > 4)
                aRet.push("loglvl:" + lvl); // include not standard log level
            for (let iA = 1; iA < args.length; iA++) {
                if (typeof(args[iA]) !== "undefined") aRet.push(args[iA]);
            }
            return aRet;
        }

        let lvl_txt = "debug";
        if (lvl >= 0 && lvl <= 4) lvl_txt = ['error', 'warn', 'info', 'log', 'debug'][lvl];

        if (typeof(console[lvl_txt]) !== "function") {
            console.warn("[LG-log] invalid console method", lvl_txt, clean_args(arguments));
            throw new RangeError;
        }

        console[lvl_txt]("[LG]", ...clean_args(arguments));
    }
    log_error() {
        this.logging(0, ...arguments);
    }
    log_warn() {
        this.logging(1, ...arguments);
    }
    log_info() {
        this.logging(2, ...arguments);
    }
    log_log() {
        this.logging(3, ...arguments);
    }
    log_debug() {
        this.logging(4, ...arguments);
    }
    log_verbose() {
        this.logging(5, ...arguments);
    }

    /**
     * Register a node class so it can be listed when the user wants to create a new one
     * @method registerNodeType
     * @param {String} type name of the node and path
     * @param {Class} base_class class containing the structure of a node
     */
    registerNodeType(type, base_class) {
        if (!base_class.prototype) {
            throw new Error("Cannot register a simple object, it must be a class with a prototype");
        }
        base_class.type = type;

        this.log_debug("registerNodeType", "start", type);

        const classname = base_class.name;

        const pos = type.lastIndexOf("/");
        base_class.category = type.substring(0, pos);

        if (!base_class.title) {
            base_class.title = classname;
        }

        const propertyDescriptors = Object.getOwnPropertyDescriptors(LGraphNode.prototype);

        // WIP BAD
        // extend constructor instead of copy properties :: WANTED to have originalconstructor too
        // using manual constructor (?)
        // if(base_class.prototype.hasOwnProperty("constructor")){
        //     var base_constructor = base_class.prototype.constructor;
        //     function extendedConstructor(that){
        //         LGraphNode.prototype.constructor.bind(that);
        //         base_constructor.bind(that);
        //     }
        //     base_class.prototype.constructor = extendedConstructor(this);
        //     base_class.constructor = extendedConstructor(this);
        // }

        // Iterate over each property descriptor
        Object.keys(propertyDescriptors).forEach((propertyName) => {
            // Check if the property already exists on the target prototype
            if (!(propertyName in base_class.prototype)) {
                // If the property doesn't exist, copy it from the source to the target
                Object.defineProperty(base_class.prototype, propertyName, propertyDescriptors[propertyName]);
                // TOO MUCH VERBOSE :: this.log_verbose("registerNodeType","defineProperty",type,base_class.prototype, propertyName, propertyDescriptors[propertyName]);
            }
        });

        const prev = this.registered_node_types[type];
        if (prev) {
            this.log_debug("registerNodeType", "replacing node type", type, prev);
        }
        if (!Object.prototype.hasOwnProperty.call(base_class.prototype, "shape")) {
            Object.defineProperty(base_class.prototype, "shape", {
                set: function(v) {
                    switch (v) {
                        case "default":
                            delete this._shape;
                            break;
                        case "box":
                            this._shape = LiteGraph.BOX_SHAPE;
                            break;
                        case "round":
                            this._shape = LiteGraph.ROUND_SHAPE;
                            break;
                        case "circle":
                            this._shape = LiteGraph.CIRCLE_SHAPE;
                            break;
                        case "card":
                            this._shape = LiteGraph.CARD_SHAPE;
                            break;
                        default:
                            this._shape = v;
                    }
                },
                get: function() {
                    return this._shape;
                },
                enumerable: true,
                configurable: true,
            });


            // used to know which nodes to create when dragging files to the canvas
            if (base_class.supported_extensions) {
                for (let i in base_class.supported_extensions) {
                    const ext = base_class.supported_extensions[i];
                    if (ext && ext.constructor === String) {
                        this.node_types_by_file_extension[ext.toLowerCase()] = base_class;
                    }
                }
            }
        }

        this.registered_node_types[type] = base_class;
        if (classname) {
            this.Nodes[classname] = base_class;
        }
        this.node_definitions[type] = this.describeNodeType(type, base_class);

        this.processCallbackHandlers("onNodeTypeRegistered", {
            def_cb: this.onNodeTypeRegistered
        }, type, base_class);

        if (prev) {
            this.processCallbackHandlers("onNodeTypeReplaced", {
                def_cb: this.onNodeTypeReplaced
            }, type, base_class, prev);
        }

        // warnings
        if (base_class.prototype.onPropertyChange) {
            LiteGraph.log_warn("LiteGraph node class " +
                type +
                " has onPropertyChange method, it must be called onPropertyChanged with d at the end");
        }

        // used to know which nodes create when dragging files to the canvas
        if (base_class.supported_extensions) {
            for (var i = 0; i < base_class.supported_extensions.length; i++) {
                var ext = base_class.supported_extensions[i];
                if (ext && ext.constructor === String)
                    this.node_types_by_file_extension[ext.toLowerCase()] = base_class;
            }
        }

        this.log_debug("registerNodeType", "type registered", type);

        if (this.auto_load_slot_types) {
            // auto_load_slot_types should be used when not specifing slot type to LiteGraph
            // good for testing: this will create a temporary node for each type
            this.log_debug("registerNodeType", "auto_load_slot_types, create empy tmp node", type);
            let tmpnode = new base_class(base_class.title ?? "tmpnode");
            tmpnode.post_constructor(); // could not call, but eventually checking for errors in the chain ?
        }
    }

    /**
     * removes a node type from the system
     * @method unregisterNodeType
     * @param {String|Object} type name of the node or the node constructor itself
     */
    unregisterNodeType(type) {
        const base_class =
            type.constructor === String ?
            this.registered_node_types[type] :
            type;
        if (!base_class) {
            throw new Error("node type not found to unregister: " + type);
        }
        delete this.registered_node_types[base_class.type];
        delete this.node_definitions[base_class.type];
        // Nodes is keyed by class name (base_class.constructor is always Function)
        if (base_class.name && this.Nodes[base_class.name] === base_class) {
            delete this.Nodes[base_class.name];
        }
    }

    /**
     * Save a slot type and his node
     * @method registerSlotType
     * @param {String|Object} type name of the node or the node constructor itself
     * @param {String} slot_type name of the slot type (variable type), eg. string, number, array, boolean, ..
     */
    registerNodeAndSlotType(type, slot_type, out = false) {
        const base_class =
            type.constructor === String &&
            this.registered_node_types[type] !== "anonymous" ?
            this.registered_node_types[type] :
            type;

        // a node instance knows its type through its class; a class (or a type string) carries it itself
        // (it used to read base_class.constructor.type, which is Function.type: undefined for classes)
        const class_type = typeof base_class === "function" ? base_class.type : base_class.constructor.type;

        let allTypes = [];
        if (typeof slot_type === "string") {
            allTypes = slot_type.split(",");
        } else if (slot_type == this.EVENT || slot_type == this.ACTION) {
            allTypes = ["_event_"];
        } else {
            allTypes = ["*"];
        }

        for (let i = 0; i < allTypes.length; ++i) {
            let slotType = allTypes[i];
            if (slotType === "") {
                slotType = "*";
            }
            const registerTo = out ?
                "registered_slot_out_types" :
                "registered_slot_in_types";
            if (this[registerTo][slotType] === undefined) {
                this[registerTo][slotType] = {
                    nodes: []
                };
            }
            if (!this[registerTo][slotType].nodes.includes(class_type)) {
                this[registerTo][slotType].nodes.push(class_type);
            }

            // check if is a new type
            if (!out) {
                if (!this.slot_types_in.includes(slotType.toLowerCase())) {
                    this.slot_types_in.push(slotType.toLowerCase());
                    this.slot_types_in.sort();
                }
            } else {
                if (!this.slot_types_out.includes(slotType.toLowerCase())) {
                    this.slot_types_out.push(slotType.toLowerCase());
                    this.slot_types_out.sort();
                }
            }
        }
    }

    /**
     * Create a new nodetype by passing an object with some properties
     * like onCreate, inputs:Array, outputs:Array, properties, onExecute
     * @method buildNodeClassFromObject
     * @param {String} name node name with namespace (p.e.: 'math/sum')
     * @param {Object} object methods expected onCreate, inputs, outputs, properties, onExecute
     */
    buildNodeClassFromObject(
        name,
        object,
    ) {
        var ctor_code = "";
        if (object.inputs)
            for (let i = 0; i < object.inputs.length; ++i) {
                let _name = object.inputs[i][0];
                let _type = object.inputs[i][1];
                if (_type && _type.constructor === String)
                    _type = '"' + _type + '"';
                ctor_code += "this.addInput('" + _name + "'," + _type + ");\n";
            }
        if (object.outputs)
            for (let i = 0; i < object.outputs.length; ++i) {
                let _name = object.outputs[i][0];
                let _type = object.outputs[i][1];
                if (_type && _type.constructor === String)
                    _type = '"' + _type + '"';
                ctor_code += "this.addOutput('" + _name + "'," + _type + ");\n";
            }
        if (object.properties)
            for (let i in object.properties) {
                let prop = object.properties[i];
                if (prop && prop.constructor === String)
                    prop = '"' + prop + '"';
                ctor_code += "this.addProperty('" + i + "'," + prop + ");\n";
            }
        ctor_code += "if(this.onCreate)this.onCreate()";
        var classobj = Function(ctor_code);
        for (let i in object)
            if (i != "inputs" && i != "outputs" && i != "properties")
                classobj.prototype[i] = object[i];
        classobj.title = object.title || name.split("/").pop();
        classobj.desc = object.desc || "Generated from object";
        this.registerNodeType(name, classobj);
        return classobj;
    }

    /**
     * Create a new nodetype by passing a function, it wraps it with a proper class and generates inputs according to the parameters of the function.
     * Useful to wrap simple methods that do not require properties, and that only process some input to generate an output.
     * @method wrapFunctionAsNode
     * @param {String} name node name with namespace (p.e.: 'math/sum')
     * @param {Function} func
     * @param {Array} param_types [optional] an array containing the type of every parameter, otherwise parameters will accept any type
     * @param {String} return_type [optional] string with the return type, otherwise it will be generic
     * @param {Object} properties [optional] properties to be configurable
     */
    wrapFunctionAsNode(name, func, param_types, return_type, properties) {
        const names = LiteGraph.getParameterNames(func);

        const code = names.map((name, i) => {
            const paramType = param_types?.[i] ? `'${param_types[i]}'` : "0";
            return `this.addInput('${name}', ${paramType});`;
        }).join("\n");

        const returnTypeStr = return_type ? `'${return_type}'` : 0;
        const propertiesStr = properties ? `this.properties = ${JSON.stringify(properties)};` : "";

        const classObj = new Function(`
            ${code}
            this.addOutput('out', ${returnTypeStr});
            ${propertiesStr}
        `);

        classObj.title = name.split("/").pop();
        classObj.desc = `Generated from ${func.name}`;

        classObj.prototype.onExecute = function() {
            const params = names.map((name, i) => this.getInputData(i));
            const result = func.apply(this, params);
            this.setOutputData(0, result);
        };
        // TODO: should probably set onConfigure or INIT too the value set ??

        this.registerNodeType(name, classObj);

        return classObj;
    }

    wrapObjectAsNodeCollection(obj, objectNameId) {
        if (typeof(obj) !== "object") { // && typeof(obj)!=="function"){
            return;
        }
        const propsDescr = Object.getOwnPropertyDescriptors(obj);
        Object.keys(propsDescr).forEach((propertyName) => {
            console.debug("cyclingProps", objectNameId, propertyName, obj, typeof(obj[propertyName]));
            if (typeof(obj[propertyName]) == "function") {
                // .arguments
                try {
                    console.info("**", obj[propertyName]["arguments"]);
                } catch (e) {
                    // Strict-mode functions do not expose their arguments property.
                }
                this.wrapFunctionAsNode(objectNameId + "/" + propertyName, obj[propertyName]);
            } else {
                // GETTER SETTER
            }
        });
    }

    /**
     * Removes all previously registered node's types
     */
    clearRegisteredTypes() {
        this.registered_node_types = {};
        this.node_definitions = {};
        this.node_types_by_file_extension = {};
        this.Nodes = {};
        this.searchbox_extras = {};
    }

    /**
     * Adds this method to all nodetypes, existing and to be created
     * (You can add it to LGraphNode.prototype but then existing node types wont have it)
     * @method addNodeMethod
     * @param {Function} func
     */
    addNodeMethod(name, func) {
        LGraphNode.prototype[name] = func;
        for (var i in this.registered_node_types) {
            var type = this.registered_node_types[i];
            if (type.prototype[name]) {
                type.prototype["_" + name] = type.prototype[name];
            } // keep old in case of replacing
            type.prototype[name] = func;
        }
    }

    /**
     * Create a node of a given type with a name. The node is not attached to any graph yet.
     * @method createNode
     * @param {String} type full name of the node class. p.e. "math/sin"
     * @param {String} name a name to distinguish from other nodes
     * @param {Object} options to set options
     */

    createNode(type, title, options = {}) {
        const base_class = this.registered_node_types[type] ?? null;

        if (!base_class) {
            this.log_warn(`GraphNode type "${type}" not registered.`);
            return null;
        }

        LiteGraph.log_verbose("createNode", type, title, options, base_class);

        title = title ?? base_class.title ?? type;

        let node = null;

        if (LiteGraph.catch_exceptions) {
            try {
                node = new base_class(title);
            } catch (err) {
                console.warn("[ERR] createNode", err);
                this.log_error("createNode", err);
                return null;
            }
        } else {
            node = new base_class(title);
        }

        // basic size, before computing
        node.size_basic = node.size;

        node.type = type;
        node.title ??= title;
        node.properties ??= {};
        node.properties_info ??= [];
        node.flags ??= {};
        node.size ??= node.computeSize();
        node.pos ??= LiteGraph.DEFAULT_POSITION.concat();
        node.mode ??= LiteGraph.ALWAYS;


        // extra options
        Object.assign(node, options);
        node.post_constructor();

        LiteGraph.log_verbose("createNode", "created", node, node.processCallbackHandlers);

        // callback node event entrypoint
        node.processCallbackHandlers("onNodeCreated", {
            def_cb: node.onNodeCreated
        });
        return node;
    }


    /**
     * Returns a registered node type with a given name
     * @method getNodeType
     * @param {String} type full name of the node class. p.e. "math/sin"
     * @return {Class} the node class
     */
    getNodeType(type) {
        return this.registered_node_types[type];
    }

    /**
     * Returns a list of node types matching one category
     * @method getNodeType
     * @param {String} category category name
     * @return {Array} array with all the node classes
     */

    getNodeTypesInCategory(category, filter) {
        const filteredTypes = Object.values(this.registered_node_types).filter((type) => {
            if (type.filter !== filter) {
                return false;
            }

            if (category === "") {
                return type.category === null;
            } else {
                return type.category === category;
            }
        });

        if (this.auto_sort_node_types) {
            filteredTypes.sort((a, b) => a.title.localeCompare(b.title));
        }

        return filteredTypes;
    }


    /**
     * Returns a list with all the node type categories
     * @method getNodeTypesCategories
     * @param {String} filter only nodes with ctor.filter equal can be shown
     * @return {Array} array with all the names of the categories
     */
    getNodeTypesCategories(filter) {
        const categories = {
            "": 1
        };

        Object.values(this.registered_node_types).forEach((type) => {
            if (type.category && !type.skip_list && type.filter === filter) {
                categories[type.category] = 1;
            }
        });

        const result = Object.keys(categories);

        return this.auto_sort_node_types ? result.sort() : result;
    }


    // debug purposes: reloads all the js scripts that matches a wildcard
    reloadNodes(folder_wildcard) {
        var tmp = document.getElementsByTagName("script");
        // weird, this array changes by its own, so we use a copy
        var script_files = [];
        for (let i = 0; i < tmp.length; i++) {
            script_files.push(tmp[i]);
        }

        var docHeadObj = document.getElementsByTagName("head")[0];
        folder_wildcard = document.location.href + folder_wildcard;

        for (let i = 0; i < script_files.length; i++) {
            var src = script_files[i].src;
            if (
                !src ||
                src.substr(0, folder_wildcard.length) != folder_wildcard
            ) {
                continue;
            }

            try {
                this.log_debug("Reloading: " + src);
                var dynamicScript = document.createElement("script");
                dynamicScript.type = "text/javascript";
                dynamicScript.src = src;
                docHeadObj.appendChild(dynamicScript);
                docHeadObj.removeChild(script_files[i]);
            } catch (err) {
                if (LiteGraph.throw_errors) {
                    throw err;
                }
                this.log_debug("Error while reloading " + src);
            }
        }
        this.log_debug("Nodes reloaded");
    }

    /**
     * This is a cleaner helper to .configure methods that rely on json import
     * Happens that arrays are sometimes (strangely) exported as object with keyed strings: eg. [v0, v1] to {"0": v0, "1": v1}
     * This method successfully convert those to back to accessible by key numbers {0: v0, 1:v1} - note this is an object not an array as eventually was in origin
     * This eg. happens with groups ._bounding and nodes .position, but could happen anywere, advised implementation of parseStringifyObject to sanitize
     * @param {object} obj the object to parse clean
     * @returns the cleaned object
     */
    parseStringifyObject(obj, target) {
        // method 1: not working
        // return JSON.parse(JSON.stringify(obj));

        // method 2: working
        // for (const key in obj) {
        //     if (Object.prototype.hasOwnProperty.call(obj, key)) {
        //         target[key] = obj[key];
        //     }
        // }
        // return target;

        // just use cloneObject, original solution
        return this.cloneObject(obj, target);
    }

    cloneObject(obj, target) {
        if (obj == null) {
            return null;
        }
        const clonedObj = JSON.parse(JSON.stringify(obj));
        if (!target) {
            return clonedObj;
        }
        // copying a shorter array over a longer one must not keep the old tail
        // (e.g. node.inputs after removeInput, then clone/configure)
        if (Array.isArray(target) && Array.isArray(clonedObj)) {
            target.length = clonedObj.length;
        }
        for (const key in clonedObj) {
            if (Object.prototype.hasOwnProperty.call(clonedObj, key)) {
                target[key] = clonedObj[key];
            }
        }
        return target;
    }


    /*
     * https://gist.github.com/jed/982883?permalink_comment_id=852670#gistcomment-852670
     */
    uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (a) => (a ^ Math.random() * 16 >> a / 4).toString(16));
    }

    /**
     * Returns if the types of two slots are compatible (supports multiple types per slot, wildcards, and events)
     * @method isValidConnection
     * @param {String} type_a
     * @param {String} type_b
     * @return {Boolean} true if they can be connected
     */
    isValidConnection(type_a, type_b) {
        type_a = type_a === 0 ? "*" : type_a;
        type_b = type_b === 0 ? "*" : type_b;
        if (!type_a || !type_b) return true; // Empty types are universal

        // Handle wildcard cases
        if ((type_a === "*" && type_b != LiteGraph.EVENT) || (type_b === "*" && type_a != LiteGraph.EVENT)) return true;
        if (type_a === LiteGraph.EVENT && type_b === LiteGraph.ACTION) return true;

        // Normalize type strings (lowercase, split multiple types by `|` or `,`)
        let typesA = String(type_a).toLowerCase().split(/[|,]/);
        let typesB = String(type_b).toLowerCase().split(/[|,]/);

        // Check if any type in `typesA` matches any type in `typesB`
        return typesA.some(a => typesB.includes(a));
    }


    /**
     * Register a string in the search box so when the user types it it will recommend this node
     * @method registerSearchboxExtra
     * @param {String} node_type the node recommended
     * @param {String} description text to show next to it
     * @param {Object} data it could contain info of how the node should be configured
     * @return {Boolean} true if they can be connected
     */
    registerSearchboxExtra(node_type, description, data) {
        this.searchbox_extras[description.toLowerCase()] = {
            type: node_type,
            desc: description,
            // title: node_type.title, TODO implement searching by title, desc, and extra pars
            data: data,
        };
    }

    /**
     * Wrapper to load files (from url using fetch or from file using FileReader)
     * @method fetchFile
     * @param {String|File|Blob} url the url of the file (or the file itself)
     * @param {String} type an string to know how to fetch it: "text","arraybuffer","json","blob"
     * @param {Function} on_complete callback(data)
     * @param {Function} on_error in case of an error
     * @return {FileReader|Promise} returns the object used to
     */
    fetchFile(url, type, on_complete, on_error) {
        if (!url)
            return null;

        type = type || "text";
        if (url.constructor === String) {
            if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
                url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
            }
            return fetch(url)
                .then((response) => {
                    if (!response.ok)
                        throw new Error("File not found"); // it will be catch below
                    if (type == "arraybuffer")
                        return response.arrayBuffer();
                    else if (type == "text" || type == "string")
                        return response.text();
                    else if (type == "json")
                        return response.json();
                    else if (type == "blob")
                        return response.blob();
                })
                .then((data) => {
                    if (on_complete)
                        on_complete(data);
                })
                .catch((error) => {
                    this.log_error("error fetching file:", url);
                    if (on_error)
                        on_error(error);
                });
        } else if (url.constructor === File || url.constructor === Blob) {
            var reader = new FileReader();
            reader.onload = (e) => {
                var v = e.target.result;
                if (type == "json")
                    v = JSON.parse(v);
                if (on_complete)
                    on_complete(v);
            }
            if (type == "arraybuffer")
                return reader.readAsArrayBuffer(url);
            else if (type == "text" || type == "json")
                return reader.readAsText(url);
            else if (type == "blob")
                return reader.readAsBinaryString(url);
        }
        return null;
    }

    // @TODO These weren't even directly bound, so could be used as free functions
    compareObjects(a, b) {
        const aKeys = Object.keys(a);

        if (aKeys.length !== Object.keys(b).length) {
            return false;
        }

        return aKeys.every((key) => a[key] === b[key]);
    }

    distance(a, b) {
        const [xA, yA] = a;
        const [xB, yB] = b;

        return Math.sqrt((xB - xA) ** 2 + (yB - yA) ** 2);
    }

    colorToString(c) {
        return (
            "rgba(" +
            Math.round(c[0] * 255).toFixed() +
            "," +
            Math.round(c[1] * 255).toFixed() +
            "," +
            Math.round(c[2] * 255).toFixed() +
            "," +
            (c.length == 4 ? c[3].toFixed(2) : "1.0") +
            ")"
        );
    }

    textCalculateMaxWidth(text) {
        // TODO RESTART FROM HERE
        // const retCalc = this.canvasFillTextMultiline();
        // USING ctx.measureText directly
    }

    /**
     * helper function to write text to a canvas calculating multiline and returning info on final sizes 
     * @param {*} context 
     * @param {*} text 
     * @param {*} x 
     * @param {*} y 
     * @param {*} maxWidth 
     * @param {*} lineHeight 
     * @returns 
     */
    canvasFillTextMultiline(context, text, x, y, maxWidth, lineHeight) {
        var words = (text + "").trim().split(' ');
        var line = '';
        var ret = {
            lines: [],
            maxW: 0,
            height: 0
        };
        if (words.length > 1) {
            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                var metrics = context.measureText(testLine);
                var testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, y + (lineHeight * ret.lines.length));
                    line = words[n] + ' ';
                    // y += lineHeight;
                    ret.max = testWidth;
                    ret.lines.push(line);
                } else {
                    line = testLine;
                }
            }
        } else {
            line = words[0];
        }
        context.fillText(line, x, y + (lineHeight * ret.lines.length));
        ret.lines.push(line);
        ret.height = lineHeight * ret.lines.length || lineHeight;
        return ret;
    }

    isInsideRectangle(x, y, left, top, width, height) {
        return x > left && x < left + width && y > top && y < top + height;
    }

    isBoundingInsideRectangle(bounding, left, top, width, height) {
        let x = bounding[0];
        let y = bounding[1];
        if (!(x > left && x < left + width && y > top && y < top + height))
            return false;
        x = bounding[0] + bounding[2];
        y = bounding[1] + bounding[3];
        if (!(x > left && x < left + width && y > top && y < top + height))
            return false;
        return true;
    }

    // [minx,miny,maxx,maxy]
    growBounding(bounding, x, y) {
        if (x < bounding[0]) {
            bounding[0] = x;
        } else if (x > bounding[2]) {
            bounding[2] = x;
        }

        if (y < bounding[1]) {
            bounding[1] = y;
        } else if (y > bounding[3]) {
            bounding[3] = y;
        }
    }

    // point inside bounding box
    isInsideBounding(p, bb) {
        return p[0] >= bb[0][0] && p[1] >= bb[0][1] && p[0] <= bb[1][0] && p[1] <= bb[1][1];
    }

    // bounding overlap, format: [ startx, starty, width, height ]
    overlapBounding(a, b, add) {
        add = add || 0;
        const A_end_x = a[0] + a[2] + add;
        const A_end_y = a[1] + a[3] + add;
        const B_end_x = b[0] + b[2] + add;
        const B_end_y = b[1] + b[3] + add;

        return !(a[0] > B_end_x || a[1] > B_end_y || A_end_x < b[0] || A_end_y < b[1]);
    }

    // Convert a hex value to its decimal value - the inputted hex must be in the
    //	format of a hex triplet - the kind we use for HTML colours. The function
    //	will return an array with three values.
    hex2num(hex) {
        if (hex.charAt(0) == "#") {
            hex = hex.slice(1);
        } // Remove the '#' char - if there is one.
        hex = hex.toUpperCase();
        var hex_alphabets = "0123456789ABCDEF";
        var value = new Array(3);
        var k = 0;
        var int1, int2;
        for (var i = 0; i < 6; i += 2) {
            int1 = hex_alphabets.indexOf(hex.charAt(i));
            int2 = hex_alphabets.indexOf(hex.charAt(i + 1));
            value[k] = int1 * 16 + int2;
            k++;
        }
        return value;
    }

    // Give a array with three values as the argument and the function will return
    //	the corresponding hex triplet.
    num2hex(triplet) {
        var hex_alphabets = "0123456789ABCDEF";
        var hex = "#";
        var int1, int2;
        for (var i = 0; i < 3; i++) {
            int1 = triplet[i] / 16;
            int2 = triplet[i] % 16;

            hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
        }
        return hex;
    }

    extendClass = (target, origin) => {
        for (let i in origin) {
            // copy class properties
            if (Object.hasOwn(target, i)) {
                continue;
            }
            target[i] = origin[i];
        }

        if (origin.prototype) {
            // copy prototype properties
            for (let i in origin.prototype) {
                // only enumerable
                if (!Object.hasOwn(origin.prototype, i)) {
                    continue;
                }

                if (Object.hasOwn(target.prototype, i)) {
                    // avoid overwriting existing ones
                    continue;
                }

                // copy getters
                if (origin.prototype.__lookupGetter__(i)) {
                    target.prototype.__defineGetter__(
                        i,
                        origin.prototype.__lookupGetter__(i),
                    );
                } else {
                    target.prototype[i] = origin.prototype[i];
                }

                // and setters
                if (origin.prototype.__lookupSetter__(i)) {
                    target.prototype.__defineSetter__(
                        i,
                        origin.prototype.__lookupSetter__(i),
                    );
                }
            }
        }
    }

    // used to create nodes from wrapping functions
    getParameterNames = function(func) {
        return (func + "")
            .replace(/[/][/].*$/gm, "") // strip single-line comments
            .replace(/\s+/g, "") // strip white space
            .replace(/[/][*][^/*]*[*][/]/g, "") // strip multi-line comments  /**/
            .split("){", 1)[0]
            .replace(/^[^(]*[(]/, "") // extract the parameters
            .replace(/=[^,]+/g, "") // strip any ES6 defaults
            .split(",")
            .filter(Boolean); // split & filter [""]
    };

    clamp = (v, a, b) => {
        return a > v ? a : b < v ? b : v;
    };

    // @BUG checking
    /* pointerAddListener = () => {
        console.error?.("Removed and being re-integrated sorta");
    };
    pointerRemoveListener = () => {
        console.error?.("Removed and being re-integrated sorta");
    };
    set pointerevents_method(v) {
        console.error?.("Removed and being re-integrated sorta");
    }
    get pointerevents_method() {
        console.error?.("Removed and being re-integrated sorta");
    } */

    closeAllContextMenus = () => {
        LiteGraph.log_verbose('LiteGraph.closeAllContextMenus is deprecated in favor of ContextMenu.closeAll()');
        ContextMenu.closeAll();
    };

    getTime() {
        if (typeof performance != "undefined") {
            return performance.now(); //.bind(performance);
        } else if (typeof Date != "undefined" && Date.now) {
            Date.now();
        } else if (typeof process != "undefined") {
            const t = process.hrtime();
            return t[0] * 0.001 + t[1] * 1e-6;
        } else {
            return new Date().getTime();
        }
    }

    /**
     * 
     * @param {number} n number to be formatted
     * @param {*} precision decimal positions
     * @returns formatted number to precision witouth trailing zeros
     */
    formatNumber(n, precision = 3) {
        n = Number(n);
        if (Number.isNaN(n)) {
            return "";
        } else {
            return n.toFixed(precision).replace(/(\.\d*[1-9])0+$|\.0*$/, '$1');
        }
    }

    getGlobalObject = getGlobalObject;
    setGlobalVariable = setGlobalVariable;
    getGlobalVariable = getGlobalVariable;
    isBrowser = isBrowser;
}

// !¿ TODO MOVE THESE HELPERS ?!
// timer that works everywhere
// if (typeof performance != "undefined") {
//     LiteGraphClass.getTime = performance.now.bind(performance);
// } else if (typeof Date != "undefined" && Date.now) {
//     LiteGraphClass.getTime = Date.now.bind(Date);
// } else if (typeof process != "undefined") {
//     LiteGraphClass.getTime = () => {
//         var t = process.hrtime();
//         return t[0] * 0.001 + t[1] * 1e-6;
//     };
// } else {
//     LiteGraphClass.getTime = function getTime() {
//         return new Date().getTime();
//     };
// }

// @BROWSERONLY
if (typeof window != "undefined" && !window["requestAnimationFrame"]) {
    window.requestAnimationFrame =
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        ((callback) => {
            window.setTimeout(callback, 1000 / 60);
        });
}

// if(typeof(root) == "undefined" || !root){
//     var root = getGlobalObject();
// }

// export var getGlobalObject = getGlobalObject;
// export var setGlobalVariable = setGlobalVariable;
// export var getGlobalVariable = getGlobalVariable;


if (!getGlobalVariable("LiteGraph")) {
    setGlobalVariable("LiteGraph", new LiteGraphClass());
    let LGInst = getGlobalVariable("LiteGraph");
    LGInst.log_info("LiteGraph instantiated", LGInst.getTime());
    LGInst.root = getGlobalObject();
    // ? Initialize LiteGraph to set up core classes
    // LGInst.initialize();
    // LGInst.log_info("LiteGraph initialized",LGInst.getTime());
}
export const LiteGraph = getGlobalVariable("LiteGraph");
/**
 * WIP
 * intended to replace direct (single) assignment of callbacks [ event entrypoint ]
 */
export class CallbackHandler {

    debug = false;

    constructor(ref) {
        this.callbacks_handlers = {};
        this.ob_ref = ref;
        if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("CallbackHandler Initialize callbacks", ref);
    }

    /**
     * subscribe callbacks for events
     * @method registerCallbackHandler
     * @param {string} name event name to register to
     * @param {function} callback function to call when processing the event name
     * @param {object} opts options for registerCallBackHandler
     * @param {number} opts.priority default handler as 0, lesser value executes after, greater value will be execute before but their value eventually overridden in case if not stopping the chain
     * @param {boolean} opts.is_default original library handlers would have true, while custom registered has choice to be eventually treathed as such
     * @returns {number} the id of the handler for the specified name
     */
    registerCallbackHandler = function(name, callback, opts) {
        if (!opts || typeof(opts) !== "object") opts = {};
        const def_opts = {
            priority: 0,
            is_default: false,
            call_once: false
        };
        opts = Object.assign(def_opts, opts);

        if (typeof(callback) !== "function") {
            if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_error("registerCallbackHandler", "Invalid callback");
            return false;
        }

        if (typeof(this.callbacks_handlers[name]) === "undefined") {
            this.callbacks_handlers[name] = {
                last_id: 0,
                handlers: []
            };
        }
        const h_id = this.callbacks_handlers[name].last_id++;

        if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("registerCallbackHandler", "new callback handler", name, h_id);

        this.callbacks_handlers[name].handlers.push({
            id: h_id,
            priority: opts.priority,
            callback: callback,
            data: opts, // enqueue passed options, can store info in here
        });

        // sort descending
        this.callbacks_handlers[name].handlers.sort((a, b) => b.priority - a.priority);

        // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("registerCallbackHandler","sorted",this.callbacks_handlers[name]);

        return h_id; // return the cbhandle id
    };
    /**
     * 
     * @param {string} name event name to unregister from
     * @param {number} h_id the handler pointer, need to be saved when registering the callback
     * @returns {boolean} true if found
     */
    unregisterCallbackHandler(name, h_id) {
        // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("unregisterCallbackHandler","Checking in handlers",this.callbacks_handlers,name,h_id);
        if (typeof(this.callbacks_handlers[name]) !== "undefined") {
            const nHandlers = this.callbacks_handlers[name].handlers.length;
            this.callbacks_handlers[name].handlers = this.callbacks_handlers[name].handlers.filter(function(obj) {
                // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("unregisterCallbackHandler","Checking handle",obj.id,h_id);
                if (obj.id === h_id) {
                    LiteGraph.log_info("unregisterCallbackHandler", name, h_id);
                }
                return obj.id !== h_id;
            });
            if (this.callbacks_handlers[name].handlers.length < nHandlers) {
                return true;
            }
        }
        LiteGraph.log_warn("unregisterCallbackHandler", "no handlers for", name, h_id);
        return false;
    }

    /**
     * Executes the callbacks and cache their result
     * execution if from higher priority down
     * handler data is passed as first argument, than all the additional pars passed to this
     * @param {string} name the event name for which execute the callbacks registered to
     * @param {object} opts specify the option here
     * @param {object} opts.def_cb can specify a callback here to be treated as default callback, executed after the >= 0, eventually prevented
     * @returns {null|boolean|object} get back default result, and along the chain
     */
    processCallbackHandlers(name, opts /*, .. arguments */ ) {
        if (!opts || typeof(opts) !== "object") opts = {};
        const def_opts = {
            // WIP :: think try and implement options
            // process: "all", return: "first_result", skip_null_return: true, append_last_return: false
            // min_piority: false, max_priority: false
            def_cb: false // the [default] callback : in LG this is the previous(current) function called when an event is executed, can be undefined or null
        };
        opts = Object.assign(def_opts, opts);
        var cbHandle = this;

        if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("**processCallbackHandlers**", ...arguments);

        // ensure callback name is present on this
        if (typeof(this.callbacks_handlers[name]) == "undefined") {
            this.callbacks_handlers[name] = {
                last_id: 0,
                handlers: []
            };
        }

        var aArgs = ([].slice.call(arguments)).slice(2);
        // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("Cleaned arguments (slice 2)",aArgs,"original",arguments);

        // previous implementation of converting arguments
        // using shorter ([].slice.call(arguments)).slice(2)
        // can clean when checked works fine
        // function clean_args(args) {
        //     let aRet = [];
        //     for(let iA=2; iA<args.length; iA++) {
        //         // if(typeof(args[iA])!=="undefined")
        //         aRet.push(args[iA]);
        //     }
        //     return aRet;
        // }
        // var aArgs = clean_args(arguments);

        var stepRet = null; // temp step specific result 
        var cbRet = null; // progressive final result
        var aResChain = []; // progressive results chain
        var oCbInfo = {}; // info passed to the callback
        var cbResPriority = 0; // incremental result priority
        var defCbChecked = false; // flag activated when executed the [default] callback
        var preventDefCb = false; // if to prevent the [default] callback execution (set eventually by some callback result)
        var breakCycle = false; // if to stop callback execution (set eventually by some callback result)

        var executeDefaultCb = function() {
            if (!preventDefCb && typeof(opts.def_cb) == "function") {
                // execute default callback
                if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_verbose("Calling DEFAULT w Args", ...aArgs);
                // stepRet = opts.def_cb(...aArgs); // OLD, not working because of bas THIS 
                // call method on ref object (LiteGraph, LGraphNode, LGraphCanvas, ...) in othe method `this` will than correctly set
                stepRet = opts.def_cb.call(cbHandle.ob_ref, ...aArgs); // could pass more data
                if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "default callback executed", stepRet);
                checkStepRet();
            } else {
                if (typeof(opts.def_cb) == "function") {
                    if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "preventing default passed", opts.def_cb);
                } else {
                    // not passed
                }
            }
            defCbChecked = true;
        }
        // results should be structured a object (to try to return a final value or change chain execution behavior)
        /**
         * @prop {*} return_value assign the return ( could be overriden )
         * @prop {number} result_priority assign proper values to allow handlers with higher priority to have not their return_value overridden 
         * @prop {boolean} prevent_default stop default execution ( force only when really needed )
         * @prop {boolean} stop_replication stop the execution chain
         */
        var buildRetObj = function() {
            // TODO: implement object return construction :: THAN replace all result checking in the libs to easier object ensured checks
        }
        /**
         * called for each callback to push and merge results
         * void
         */
        // a result replaces the current one only when its result_priority (default 0) is not lower
        // than the priority of the result currently held
        var acceptResult = function(value, priority) {
            if (typeof(priority) !== "number" || isNaN(priority)) priority = 0;
            if (cbRet === null || priority >= cbResPriority) {
                cbRet = value;
                cbResPriority = priority;
            }
        }
        var checkStepRet = function() {
            aResChain.push(stepRet); // cache result
            opts.on_result?.(stepRet); // Observe each result, including overridden async cleanup hooks.
            // check result for structured object
            if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "checkStepRet", "stepRet check", stepRet);
            if (stepRet !== null && typeof(stepRet) == "object") {
                if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "checkStepRet", "result is object", stepRet);
                if (typeof(stepRet.prevent_default) !== "undefined" && stepRet.prevent_default) {
                    preventDefCb = true;
                }
                if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "checkStepRet", "object result", stepRet, oCbInfo);
                acceptResult(stepRet, stepRet.result_priority);
                if (typeof(stepRet.stop_replication) !== "undefined" && stepRet.stop_replication) {
                    if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "checkStepRet", "stop_replication", oCbInfo);
                    breakCycle = true;
                    return; // will break;
                }
            } else {
                if (cbHandle.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "checkStepRet", "result NOT object", stepRet);
                // ? save current result if not null or undefined (?)
                if (stepRet !== null && stepRet !== undefined) {
                    acceptResult(stepRet, 0); // plain values count as result_priority 0
                }
            }
        }
        for (let cbhX of this.callbacks_handlers[name].handlers) {

            // eventually prevent cb marked as default
            if (preventDefCb && cbhX.data.is_default) {
                if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("processCallbackHandlers", "preventing default registered", cbhX);
                continue;
            }

            // execute default if already processed the ones >= 0
            if (cbhX.priority < 0 && !defCbChecked) {
                if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("processCallbackHandlers", "process default passed", "nextCb:", cbhX);
                executeDefaultCb();
                if (breakCycle) break;
            }

            if (cbhX.data.call_once) {
                this.unregisterCallbackHandler(name, cbhX.id);
                if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "unregistered call_once", cbhX.id);
            }

            oCbInfo = {
                name: name // name of the handler
                    ,
                id: cbhX.id // id of the handler for the name
                    ,
                current_return_value: cbRet // current temporary value (if >= second call and previous return a value) 
                    ,
                data: cbhX.data // pass the priority and the additional data passed
                    ,
                results_chain: aResChain
                // opts: def_opts
            };

            // execute callback
            // OLD, not working because of bas THIS : stepRet = cbhX.callback(oCbInfo,...aArgs);
            // call method on ref object (LiteGraph, LGraphNode, LGraphCanvas, ...) in the method `this` will than correctly set
            stepRet = cbhX.callback.call(this.ob_ref, oCbInfo, ...aArgs);

            if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "callback executed", stepRet, oCbInfo);

            // push result
            checkStepRet();
            if (typeof(this) == "object" && typeof(this.debug) !== "undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers", "result checked", "cbRet", cbRet, "aResChain", aResChain, "cbResPriority", cbResPriority, "defCbChecked", defCbChecked, "preventDefCb", preventDefCb, "breakCycle", breakCycle);
            if (breakCycle) break;

        } // end cycle

        // run the default callback if no handler ran it yet, unless the chain was stopped
        // (stop_replication stops everything after it, the default callback included)
        if (!defCbChecked && !breakCycle) {
            executeDefaultCb();
        }

        // if(cbRet===null){
        //     // return default true if no callbacks specified a return value
        //     // [ some original LG callback execution checks for boolean return ]
        //     cbRet = true;
        // }
        return cbRet;

        // could return obj instead and there check for values, etc ..
        // TODO would be probably better to always return an object to than check for result and make easier code in implementation
    }
}
/**
 * Typed events for graphs and canvases, alongside CallbackHandler hooks.
 *
 *   const off = graph.events.on("node-added", (event) => console.log(event.detail.node));
 *   off(); // unsubscribe
 *
 * Listeners receive {type, detail, target, cancelable, defaultPrevented, preventDefault()}.
 * A throwing listener is logged and does not stop the others (safe in headless runners).
 * Design after Comfy-Org/litegraph.js CustomEventTarget (MIT); runtime-independent implementation.
 */
export class LGraphEvent {
    constructor(type, detail, target, cancelable = false) {
        this.type = type;
        this.detail = detail;
        this.target = target;
        this.cancelable = cancelable;
        this.defaultPrevented = false;
    }

    preventDefault() {
        if (this.cancelable) this.defaultPrevented = true;
    }
}

export class LGraphEventTarget {
    /**
     * @param {object} [owner] - reported as event.target
     * @param {(error: unknown, event: LGraphEvent) => void} [onError] - listener error reporter
     */
    constructor(owner, onError) {
        this.owner = owner;
        this.onError = onError;
        this._listeners = new Map();
    }

    /**
     * Subscribes to an event type.
     * @param {string} type
     * @param {(event: LGraphEvent) => void} listener
     * @param {{once?: boolean, signal?: AbortSignal}} [options]
     * @returns {() => void} unsubscribe
     */
    on(type, listener, options = {}) {
        if (typeof listener !== "function") throw new TypeError("listener must be a function");
        if (options.signal?.aborted) return () => {};
        if (!this._listeners.has(type)) this._listeners.set(type, []);
        const entry = {
            listener,
            once: !!options.once
        };
        this._listeners.get(type).push(entry);
        const off = () => this._remove(type, entry);
        options.signal?.addEventListener?.("abort", off, {
            once: true
        });
        return off;
    }

    /** subscribes for a single event */
    once(type, listener, options = {}) {
        return this.on(type, listener, {
            ...options,
            once: true
        });
    }

    /** removes a listener added with on() */
    off(type, listener) {
        const entry = this._listeners.get(type)?.find((item) => item.listener === listener);
        if (entry) this._remove(type, entry);
    }

    /** true when anything listens to type */
    has(type) {
        return !!this._listeners.get(type)?.length;
    }

    /**
     * Dispatches an event to the current listeners (in subscription order).
     * @returns {LGraphEvent} check defaultPrevented for cancelable events
     */
    dispatch(type, detail, options = {}) {
        const event = new LGraphEvent(type, detail, this.owner, !!options.cancelable);
        const entries = this._listeners.get(type);
        if (!entries?.length) return event;
        for (const entry of entries.slice()) {
            if (entry.once) this._remove(type, entry);
            try {
                entry.listener.call(this.owner, event);
            } catch (error) {
                if (this.onError) this.onError(error, event);
                else console.error?.("[LG] event listener failed", type, error);
            }
        }
        return event;
    }

    _remove(type, entry) {
        const entries = this._listeners.get(type);
        const index = entries?.indexOf(entry) ?? -1;
        if (index !== -1) entries.splice(index, 1);
    }
}

/**
 * Named, reusable operations shared by keybindings, menus, search and extensions.
 *
 * A command is `{id, run(ctx), label?, category?, when?(ctx), mutatesGraph?}`.
 * - `ctx` is a plain object, usually `{canvas, graph, event}` (see {@link CommandRegistry#contextFor}).
 * - `when(ctx)` decides if the command applies right now; a disabled command is not run.
 * - `mutatesGraph: true` runs the command inside `graph.transact(label, ...)`, so whatever it changes
 *   becomes one undo entry and one revision.
 */
export class CommandRegistry {

    constructor() {
        /** @type {Map<string, object>} */
        this._commands = new Map();
    }

    /**
     * Registers a command. Registering an id again replaces the previous command
     * (the previous one is restored if the replacement is disposed).
     * @param {object} command
     * @returns {() => void} disposer that unregisters this command
     */
    register(command) {
        if (!command || typeof command.id !== "string" || !command.id) {
            throw new TypeError("command.id must be a non-empty string");
        }
        if (typeof command.run !== "function") {
            throw new TypeError(`command ${command.id}: run must be a function`);
        }
        const entry = Object.freeze({
            label: command.id,
            category: "",
            mutatesGraph: false,
            ...command
        });
        const stack = this._commands.get(command.id) ?? [];
        stack.push(entry);
        this._commands.set(command.id, stack);
        return () => {
            const current = this._commands.get(command.id);
            if (!current) return;
            const index = current.indexOf(entry);
            if (index !== -1) current.splice(index, 1);
            if (!current.length) this._commands.delete(command.id);
        };
    }

    /** @returns {object|null} the active command for an id */
    get(id) {
        const stack = this._commands.get(id);
        return stack ? stack[stack.length - 1] : null;
    }

    has(id) {
        return this._commands.has(id);
    }

    /** @returns {object[]} active commands, optionally filtered by category */
    list({
        category
    } = {}) {
        const all = [...this._commands.keys()].map((id) => this.get(id));
        return category === undefined ? all : all.filter((command) => command.category === category);
    }

    /** Builds the usual context for a canvas: the graph shown on it and the selection. */
    contextFor(canvas, extra = {}) {
        const selected = canvas?.selected_nodes ? Object.values(canvas.selected_nodes) : [];
        const items = canvas?.selectedItems ?? selected;
        return {
            canvas: canvas ?? null,
            graph: canvas?.graph ?? null,
            selectedNodes: selected,
            selectedItems: items,
            ...extra
        };
    }

    /** @returns {boolean} true when the command exists and its `when` accepts the context */
    isEnabled(id, ctx = {}) {
        const command = this.get(id);
        if (!command) return false;
        if (typeof command.when !== "function") return true;
        try {
            return !!command.when(ctx);
        } catch (error) {
            console.error?.(`command ${id}: when() failed`, error);
            return false;
        }
    }

    /**
     * Runs a command.
     * @param {string} id
     * @param {object} [ctx]
     * @returns {{executed: boolean, result?: *}} executed is false when the command is unknown or disabled
     * @throws whatever the command throws (a graph-mutating command's transaction is still closed)
     */
    execute(id, ctx = {}) {
        const command = this.get(id);
        if (!command || !this.isEnabled(id, ctx)) return {
            executed: false
        };
        const graph = ctx.graph;
        // the history entry is named after the command id (stable, unlike a translated label)
        const result = command.mutatesGraph && typeof graph?.transact === "function" ?
            graph.transact(command.id, () => command.run(ctx)) :
            command.run(ctx);
        return {
            executed: true,
            result
        };
    }
}

/**
 * Key combinations mapped to command ids, in three layers:
 * - defaults: added by core and extensions (`add`), later additions win, removable by disposer;
 * - user bindings (`setUserBinding`), which override defaults;
 * - user unbindings (`unsetDefault`), which hide one default without replacing it.
 *
 * Combos are written like "ctrl+shift+k", "f2", "arrowright", "shift+tab"; "mod" means ctrl
 * (meta on macOS). Keys come from `KeyboardEvent.key`, compared case-insensitively.
 * Key events coming from text inputs, text areas, selects and editable content are ignored.
 */
export class KeybindingRegistry {

    static MODIFIERS = ["ctrl", "alt", "shift", "meta"];

    /**
     * @param {import("./commands.js").CommandRegistry} commands
     */
    constructor(commands) {
        this.commands = commands;
        /** @type {Array<{combo: string, commandId: string, allowRepeat: boolean}>} */
        this._defaults = [];
        /** @type {Map<string, string|null>} combo -> command id (null = explicitly unbound) */
        this._user = new Map();
        /** @type {Set<string>} "combo|commandId" defaults hidden by the user */
        this._unset = new Set();
        /** called after the user layer changes (e.g. to persist exportUserLayer()) */
        this.onUserLayerChange = null;
    }

    _userLayerChanged() {
        try {
            this.onUserLayerChange?.(this.exportUserLayer());
        } catch (error) {
            console.error?.("keybindings: onUserLayerChange failed", error);
        }
    }

    static isMac() {
        return typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform ?? "");
    }

    /**
     * Normalizes a combo string: lower case, modifiers in a fixed order, "mod" resolved.
     * @param {string} combo
     * @returns {string}
     */
    static normalize(combo) {
        if (typeof combo !== "string" || !combo.trim()) throw new TypeError("combo must be a non-empty string");
        const parts = combo.toLowerCase().split("+").map((part) => part.trim());
        // "ctrl++" means ctrl and the plus key
        if (combo.endsWith("++")) parts.splice(parts.length - 2, 2, "+");
        const modifiers = new Set();
        let key = null;
        for (const part of parts) {
            if (!part) continue;
            const name = part === "mod" ? (KeybindingRegistry.isMac() ? "meta" : "ctrl") :
                part === "control" ? "ctrl" :
                part === "cmd" || part === "command" ? "meta" :
                part === "option" ? "alt" :
                part;
            if (KeybindingRegistry.MODIFIERS.includes(name)) modifiers.add(name);
            else if (key === null) key = name === "space" ? " " : name === "esc" ? "escape" : name;
            else throw new Error(`combo "${combo}" has more than one key`);
        }
        if (key === null) throw new Error(`combo "${combo}" has no key`);
        return [...KeybindingRegistry.MODIFIERS.filter((m) => modifiers.has(m)), key].join("+");
    }

    /** @param {KeyboardEvent} event @returns {string|null} normalized combo, null for a bare modifier */
    static fromEvent(event) {
        const key = String(event.key ?? "").toLowerCase();
        if (!key || ["control", "alt", "shift", "meta"].includes(key)) return null;
        const mods = [];
        if (event.ctrlKey) mods.push("ctrl");
        if (event.altKey) mods.push("alt");
        if (event.shiftKey) mods.push("shift");
        if (event.metaKey) mods.push("meta");
        return [...mods, key].join("+");
    }

    /** True for key events typed into a text field, select or editable element. */
    static isTextEntry(event) {
        const target = event?.target;
        if (!target || typeof target !== "object") return false;
        const tag = String(target.localName ?? target.tagName ?? "").toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable === true;
    }

    /**
     * Adds a default binding.
     * @param {{combo: string, commandId: string, allowRepeat?: boolean}} binding
     * @returns {() => void} disposer
     */
    add({
        combo,
        commandId,
        allowRepeat = false
    }) {
        if (typeof commandId !== "string" || !commandId) throw new TypeError("commandId must be a non-empty string");
        const entry = {
            combo: KeybindingRegistry.normalize(combo),
            commandId,
            allowRepeat: !!allowRepeat
        };
        this._defaults.push(entry);
        return () => {
            const index = this._defaults.indexOf(entry);
            if (index !== -1) this._defaults.splice(index, 1);
        };
    }

    /** Binds a combo for the user, overriding defaults; `commandId: null` disables the combo. */
    setUserBinding(combo, commandId) {
        this._user.set(KeybindingRegistry.normalize(combo), commandId ?? null);
        this._userLayerChanged();
    }

    clearUserBinding(combo) {
        if (this._user.delete(KeybindingRegistry.normalize(combo))) this._userLayerChanged();
    }

    /** Hides one default binding (without binding the combo to something else). */
    unsetDefault(combo, commandId) {
        this._unset.add(`${KeybindingRegistry.normalize(combo)}|${commandId}`);
        this._userLayerChanged();
    }

    /** User layer as plain data, for persistence. */
    exportUserLayer() {
        return {
            bindings: Object.fromEntries(this._user),
            unset: [...this._unset]
        };
    }

    importUserLayer(data) {
        this._user = new Map(Object.entries(data?.bindings ?? {}));
        this._unset = new Set(Array.isArray(data?.unset) ? data.unset : []);
    }

    /**
     * Candidate bindings for a combo, most specific first: the user binding, then defaults
     * from the latest added to the earliest.
     * @returns {Array<{combo: string, commandId: string, allowRepeat: boolean}>}
     */
    resolve(combo) {
        const normalized = KeybindingRegistry.normalize(combo);
        if (this._user.has(normalized)) {
            const commandId = this._user.get(normalized);
            return commandId ? [{
                combo: normalized,
                commandId,
                allowRepeat: true
            }] : [];
        }
        return this._defaults
            .filter((entry) => entry.combo === normalized && !this._unset.has(`${normalized}|${entry.commandId}`))
            .reverse();
    }

    /** @returns {string[]} combos currently bound to a command (for menus and help) */
    combosFor(commandId) {
        const combos = new Set();
        for (const entry of this._defaults) {
            if (entry.commandId === commandId && !this._user.has(entry.combo) && !this._unset.has(`${entry.combo}|${commandId}`)) combos.add(entry.combo);
        }
        for (const [combo, id] of this._user)
            if (id === commandId) combos.add(combo);
        return [...combos];
    }

    /**
     * Runs the command bound to a keydown event, if any applies.
     * The first candidate whose command is enabled for the context runs; others are skipped.
     * @param {KeyboardEvent} event
     * @param {object} ctx command context (see CommandRegistry.contextFor)
     * @returns {boolean} true when a command ran (the caller should stop default handling)
     */
    handleKeyDown(event, ctx = {}) {
        if (!this.commands || KeybindingRegistry.isTextEntry(event)) return false;
        const combo = KeybindingRegistry.fromEvent(event);
        if (!combo) return false;
        for (const binding of this.resolve(combo)) {
            if (event.repeat && !binding.allowRepeat) continue;
            const commandCtx = {
                ...ctx,
                event
            };
            if (!this.commands.isEnabled(binding.commandId, commandCtx)) continue;
            this.commands.execute(binding.commandId, commandCtx);
            return true;
        }
        return false;
    }
}

/**
 * Declared, persistent settings.
 *
 * `define({id, default, type?, name?, tooltip?, category?, options?, migrate?, onChange?, bind?})`
 * - `id` is dotted ("LiteGraph.Canvas.SnapToGrid"); its first segments give a default category.
 * - `migrate(storedValue)` upgrades a value saved by an older version; the result is saved back.
 * - `onChange(value, previous)` runs on every change (and once at define time with the loaded value).
 * - `bind: {target, key}` mirrors the value onto an existing property (e.g. a `LiteGraph.*` flag):
 *   the property's current value is the default unless `default` is given, and set() writes it.
 *
 * Values are kept even for settings not defined yet, so a stored value can be loaded before the
 * extension that defines it. Persistence goes through a storage adapter `{load(): object, save(values)}`.
 */
export class SettingsRegistry {

    constructor(storage = null) {
        /** @type {Map<string, object>} */
        this._defs = new Map();
        /** @type {Record<string, *>} */
        this._values = {};
        this._storage = null;
        if (storage) this.setStorage(storage);
    }

    /** An adapter over `localStorage` (no-op when storage is unavailable). */
    static localStorageAdapter(key = "litegraph.settings") {
        return {
            load() {
                try {
                    return JSON.parse(globalThis.localStorage?.getItem(key) ?? "null") ?? {};
                } catch {
                    return {};
                }
            },
            save(values) {
                try {
                    globalThis.localStorage?.setItem(key, JSON.stringify(values));
                } catch {
                    /* unavailable: keep in memory */ }
            },
        };
    }

    /** Uses a storage adapter and loads its values (defined settings are re-applied). */
    setStorage(storage) {
        this._storage = storage;
        // values as they were before the switch, so onChange reports what actually changed
        const before = new Map([...this._defs.keys()].map((id) => [id, this.get(id)]));
        const loaded = storage?.load?.() ?? {};
        this._values = (loaded && typeof loaded === "object") ? {
            ...loaded
        } : {};
        for (const def of this._defs.values()) this._applyLoaded(def, before.get(def.id));
    }

    _save() {
        this._storage?.save?.({
            ...this._values
        });
    }

    _applyLoaded(def, previousValue) {
        // the first application reports no previous value; a storage switch passes the old value
        const previous = arguments.length > 1 ? previousValue : (def._initialized === true ? this.get(def.id) : undefined);
        if (Object.hasOwn(this._values, def.id) && typeof def.migrate === "function") {
            const migrated = def.migrate(this._values[def.id]);
            if (migrated !== this._values[def.id]) {
                this._values[def.id] = migrated;
                this._save();
            }
        }
        const value = this.get(def.id);
        if (def.bind) def.bind.target[def.bind.key] = value;
        if (value !== previous || def._initialized !== true) {
            def._initialized = true;
            this._notify(def, value, previous);
        }
    }

    _notify(def, value, previous) {
        if (typeof def.onChange !== "function") return;
        try {
            def.onChange(value, previous);
        } catch (error) {
            console.error?.(`setting ${def.id}: onChange failed`, error);
        }
    }

    /**
     * @param {object} def
     * @returns {() => void} disposer removing the definition (a stored value is kept)
     */
    define(def) {
        if (!def || typeof def.id !== "string" || !def.id) throw new TypeError("setting id must be a non-empty string");
        if (this._defs.has(def.id)) throw new Error(`setting ${def.id} is already defined`);
        if (def.bind && (typeof def.bind.target !== "object" && typeof def.bind.target !== "function" || !def.bind.key)) {
            throw new TypeError(`setting ${def.id}: bind needs {target, key}`);
        }
        const defaultValue = def.default !== undefined ? def.default : def.bind ? def.bind.target[def.bind.key] : undefined;
        const entry = {
            type: typeof defaultValue === "boolean" ? "boolean" : typeof defaultValue === "number" ? "number" : "text",
            name: def.id,
            category: def.id.split(".").slice(0, -1),
            ...def,
            default: defaultValue,
        };
        this._defs.set(def.id, entry);
        this._applyLoaded(entry);
        return () => {
            if (this._defs.get(def.id) === entry) this._defs.delete(def.id);
        };
    }

    has(id) {
        return this._defs.has(id);
    }

    /** @returns {object|null} definition */
    getDefinition(id) {
        return this._defs.get(id) ?? null;
    }

    /** @returns {object[]} definitions, optionally only those whose id starts with a prefix */
    list(prefix = "") {
        return [...this._defs.values()].filter((def) => def.id.startsWith(prefix));
    }

    /** Current value: stored value if any, else the default. */
    get(id) {
        if (Object.hasOwn(this._values, id)) return this._values[id];
        const def = this._defs.get(id);
        if (!def) return undefined;
        return typeof def.default === "function" ? def.default() : def.default;
    }

    /**
     * Sets and persists a value. Combo settings refuse values outside their options.
     * @returns {boolean} true when the value changed
     */
    set(id, value) {
        const def = this._defs.get(id);
        if (def?.type === "combo" && Array.isArray(def.options)) {
            const allowed = def.options.map((option) => (option && typeof option === "object" ? option.value : option));
            if (!allowed.includes(value)) throw new RangeError(`setting ${id}: ${JSON.stringify(value)} is not an option`);
        }
        const previous = this.get(id);
        this._values[id] = value;
        this._save();
        if (def?.bind) def.bind.target[def.bind.key] = value;
        if (def && previous !== value) this._notify(def, value, previous);
        return previous !== value;
    }

    /** Forgets the stored value, going back to the default. */
    reset(id) {
        if (!Object.hasOwn(this._values, id)) return false;
        const previous = this.get(id);
        delete this._values[id];
        this._save();
        const def = this._defs.get(id);
        const value = this.get(id);
        if (def?.bind) def.bind.target[def.bind.key] = value;
        if (def && value !== previous) this._notify(def, value, previous);
        return true;
    }
}

/**
 * Context-menu contributions: extensions add items to the canvas and node menus without
 * patching `getCanvasMenuOptions` / `getNodeMenuOptions`.
 *
 * ```js
 * LiteGraph.menus.register("node", (ctx) => [
 *     null,                                        // separator
 *     { command: "litegraph.rename" },             // runs a command (label from the command)
 *     { content: "Log", callback: () => console.log(ctx.node) }, // plain ContextMenu item
 * ]);
 * ```
 *
 * Locations: "canvas" (ctx: {canvas, graph, selectedNodes}) and "node" (ctx adds `node`).
 * Contributions are appended after the built-in items, in registration order. A failing provider
 * is skipped (and logged) so one extension cannot break the menu.
 */
export class MenuRegistry {

    static LOCATIONS = ["canvas", "node"];

    /** @param {import("./commands.js").CommandRegistry} commands */
    constructor(commands) {
        this.commands = commands;
        /** @type {Map<string, Array<(ctx: object) => Array<object|null>>>} */
        this._providers = new Map();
    }

    /**
     * @param {"canvas"|"node"} location
     * @param {(ctx: object) => Array<object|null>|null|undefined} provider
     * @returns {() => void} disposer
     */
    register(location, provider) {
        if (!MenuRegistry.LOCATIONS.includes(location)) throw new Error(`unknown menu location ${location}`);
        if (typeof provider !== "function") throw new TypeError("menu provider must be a function");
        const list = this._providers.get(location) ?? [];
        list.push(provider);
        this._providers.set(location, list);
        return () => {
            const index = list.indexOf(provider);
            if (index !== -1) list.splice(index, 1);
        };
    }

    /** Converts `{command: id}` shorthands into ContextMenu items bound to the context. */
    _toItem(item, ctx) {
        if (!item || typeof item !== "object" || typeof item.command !== "string") return item;
        const command = this.commands?.get(item.command);
        if (!command) return null;
        const label = item.content ?? (typeof command.label === "function" ? command.label(ctx) : command.label);
        return {
            ...item,
            content: label,
            disabled: item.disabled ?? !this.commands.isEnabled(item.command, ctx),
            callback: () => {
                this.commands.execute(item.command, ctx);
            },
        };
    }

    /**
     * Collects the contributed items for a location.
     * @returns {Array<object|null>} ContextMenu items (null = separator)
     */
    collect(location, ctx = {}) {
        const items = [];
        for (const provider of [...(this._providers.get(location) ?? [])]) {
            let contributed;
            try {
                contributed = provider(ctx);
            } catch (error) {
                console.error?.(`menu provider for ${location} failed`, error);
                continue;
            }
            if (!Array.isArray(contributed)) continue;
            for (const item of contributed) {
                const converted = this._toItem(item, ctx);
                if (converted !== null || item === null) items.push(converted);
            }
        }
        return items;
    }

    /** Appends contributions to a built-in option list (returns the same array). */
    contribute(location, ctx, options) {
        const items = this.collect(location, ctx);
        if (items.length && Array.isArray(options)) options.push(...items);
        return options;
    }
}

/**
 * Extensions with identity and clean removal.
 *
 * ```js
 * const dispose = LiteGraph.registerExtension({
 *     name: "my.extension",
 *     commands: [{ id: "my.hello", run: (ctx) => ..., mutatesGraph: true }],
 *     keybindings: [{ combo: "ctrl+h", commandId: "my.hello" }],
 *     settings: [{ id: "My.Flag", default: true }],
 *     setup(ctx) {
 *         ctx.on("onNodeTypeRegistered", (info, type) => ...);           // LiteGraph-level hook
 *         ctx.onCanvas((canvas, c) => c.on("onKeyDown", (info, e) => ...)); // every canvas, now and later
 *         return () => { ... };                                            // optional extra cleanup
 *     },
 * });
 * dispose(); // removes every command, binding, setting and hook registered above
 * ```
 *
 * Everything an extension registers goes through its context, so disposing it undoes all of it,
 * in reverse order. Hooks are CallbackHandler registrations (`opts.priority`, `prevent_default`,
 * `stop_replication` keep working). Names listed in `disabled` are skipped at registration time.
 */
export class ExtensionRegistry {

    /**
     * @param {object} host - normally the LiteGraph instance: provides registerCallbackHandler,
     *   unregisterCallbackHandler, commands, keybindings, settings
     */
    constructor(host) {
        this.host = host;
        /** @type {Map<string, {def: object, dispose: () => void}>} */
        this._extensions = new Map();
        /** names that must not be registered */
        this.disabled = new Set();
        /** @type {Set<object>} live canvases */
        this._canvases = new Set();
        /** @type {Set<(canvas: object) => void>} */
        this._canvasListeners = new Set();
    }

    /** Called by LGraphCanvas on construction; also usable for canvases made before the registry. */
    attachCanvas(canvas) {
        if (!canvas || this._canvases.has(canvas)) return;
        this._canvases.add(canvas);
        canvas.events?.on?.("disposed", () => this._canvases.delete(canvas));
        for (const listener of [...this._canvasListeners]) listener(canvas);
    }

    /** @returns {object[]} live canvases known to the registry */
    get canvases() {
        return [...this._canvases];
    }

    has(name) {
        return this._extensions.has(name);
    }

    /** @returns {string[]} registered extension names, in registration order */
    list() {
        return [...this._extensions.keys()];
    }

    get(name) {
        return this._extensions.get(name)?.def ?? null;
    }

    /**
     * Registers an extension.
     * @param {object} def - {name, version?, requires?: string[], commands?, keybindings?, settings?, menus?: {canvas?, node?}, setup?(ctx)}
     * @returns {() => void} disposer (a no-op when the extension is disabled)
     * @throws when the name is missing or taken, a required extension is missing, or setup throws
     *   (whatever was registered before the failure is undone first)
     */
    register(def) {
        if (!def || typeof def.name !== "string" || !def.name) throw new TypeError("extension name must be a non-empty string");
        if (this._extensions.has(def.name)) throw new Error(`extension ${def.name} is already registered`);
        if (this.disabled.has(def.name)) {
            console.info?.(`extension ${def.name} is disabled, not registered`);
            return () => {};
        }
        for (const required of def.requires ?? []) {
            if (!this._extensions.has(required)) throw new Error(`extension ${def.name} requires ${required}`);
        }

        const disposers = [];
        const track = (dispose) => {
            if (typeof dispose === "function") disposers.push(dispose);
            return dispose;
        };
        const disposeAll = () => {
            while (disposers.length) {
                const dispose = disposers.pop();
                try {
                    dispose();
                } catch (error) {
                    console.error?.(`extension ${def.name}: cleanup failed`, error);
                }
            }
        };
        const host = this.host;
        const hookOn = (target, name, fn, opts) => {
            const id = target.registerCallbackHandler(name, fn, opts);
            if (id === false || id === undefined) throw new Error(`extension ${def.name}: could not register ${name}`);
            return track(() => target.unregisterCallbackHandler(name, id));
        };
        const ctx = {
            name: def.name,
            host,
            commands: {
                register: (command) => track(host.commands.register(command))
            },
            keybindings: {
                add: (binding) => track(host.keybindings.add(binding))
            },
            settings: {
                define: (setting) => track(host.settings.define(setting)),
                get: (id) => host.settings.get(id),
                set: (id, value) => host.settings.set(id, value),
            },
            /** LiteGraph-level hook (e.g. "on_lgraphcanvas_construct", "onNodeTypeRegistered"). */
            on: (name, fn, opts) => hookOn(host, name, fn, opts),
            /** Adds context-menu items ("canvas" or "node"; see MenuRegistry). */
            menus: {
                register: (location, provider) => track(host.menus.register(location, provider))
            },
            /** Typed event listener (graph.events / canvas.events), removed on dispose. */
            onEvent: (target, type, listener, options) => {
                const events = target?.events;
                if (!events?.on) throw new Error(`extension ${def.name}: target has no typed events`);
                return track(events.on(type, listener, options));
            },
            /** Hook on any object with a CallbackHandler (graph, node, canvas). */
            onTarget: (target, name, fn, opts) => hookOn(target, name, fn, opts),
            /** Runs fn for every live canvas and every canvas created later, with a per-canvas `on`. */
            onCanvas: (fn) => {
                const apply = (canvas) => {
                    const canvasCtx = {
                        on: (name, handler, opts) => hookOn(canvas, name, handler, opts)
                    };
                    track(fn(canvas, canvasCtx));
                };
                this._canvasListeners.add(apply);
                track(() => this._canvasListeners.delete(apply));
                for (const canvas of this._canvases) apply(canvas);
            },
            /** Adds a cleanup function run on dispose. */
            addDisposer: (dispose) => track(dispose),
        };

        try {
            for (const setting of def.settings ?? []) ctx.settings.define(setting);
            for (const command of def.commands ?? []) ctx.commands.register(command);
            for (const binding of def.keybindings ?? []) ctx.keybindings.add(binding);
            for (const [location, provider] of Object.entries(def.menus ?? {})) ctx.menus.register(location, provider);
            if (typeof def.setup === "function") track(def.setup(ctx));
        } catch (error) {
            disposeAll();
            throw error;
        }

        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            disposeAll();
            if (this._extensions.get(def.name)?.dispose === dispose) this._extensions.delete(def.name);
        };
        this._extensions.set(def.name, {
            def,
            dispose
        });
        return dispose;
    }

    /** Disposes an extension by name. @returns {boolean} true if it was registered */
    unregister(name) {
        const entry = this._extensions.get(name);
        if (!entry) return false;
        entry.dispose();
        return true;
    }
}

export class ContextMenu {

    /**
     * @constructor
     * @param {Array<Object>} values (allows object { title: "Nice text", callback: function ... })
     * @param {Object} options [optional] Some options:\
     * - title: title to show on top of the menu
     * - callback: function to call when an option is clicked, it receives the item information
     * - ignore_item_callbacks: ignores the callback inside the item, it just calls the options.callback
     * - event: you can pass a MouseEvent, this way the ContextMenu appears in that position
     * - isCustomEvent: added to allow not default events
     *
     *   Rendering notes: This is only relevant to rendered graphs, and is rendered using HTML+CSS+JS.
     */
    constructor(values, options = {}) {
        this.options = options;
        options.scroll_speed ??= 0.1;
        options.filter_enabled ??= true;
        this.menu_elements = [];

        this.#linkToParent();
        this.#validateEventClass();
        this.#createRoot();
        this.#bindEvents();
        this.setTitle(this.options.title);
        this.addItems(values);
        this.#insertMenu();
        this.#calculateBestPosition();
        if (LiteGraph.context_menu_filter_enabled && options.filter_enabled) {
            this.createFilter(values, options);
        }
    }

    #createRoot() {
        const root = this.root = document.createElement("div");
        if (this.options.className) {
            root.className = this.options.className;
        }
        root.classList.add("litegraph", "litecontextmenu", "litemenubar-panel");
        root.style.minWidth = "80px";
        root.style.minHeight = "10px";
        return root;
    }

    #bindEvents() {
        const root = this.root;

        LiteGraph.log_info("**contextmenu**", "binding events on root", root, this);

        root.style.pointerEvents = "none";
        setTimeout(() => {
            root.style.pointerEvents = "auto";
        }, 100); // delay so the mouse up event is not caught by this element

        // this prevents the default context browser menu to open in case this menu was created when pressing right button
        root.addEventListener("pointerup", (e) => {
            // LiteGraph.log?.("pointerevents: ContextMenu up root prevent");
            e.preventDefault();
            return true;
        });
        root.addEventListener("contextmenu", (e) => {
            if (e.button != 2) {
                // right button
                return false;
            }
            e.preventDefault();
            return false;
        });
        root.addEventListener("pointerdown", (e) => {
            // LiteGraph.log?.("pointerevents: ContextMenu down");
            if (e.button == 2) {
                this.close();
                e.preventDefault();
                return true;
            }
        });
        root.addEventListener("wheel", (e) => {
            var pos = parseInt(root.style.top);
            root.style.top =
                (pos + e.deltaY * this.options.scroll_speed).toFixed() + "px";
            e.preventDefault();
            return true;
        });
        root.addEventListener("pointerenter", (_event) => {
            // LiteGraph.log?.("pointerevents: ContextMenu enter");
            if (root.closing_timer) {
                clearTimeout(root.closing_timer);
            }
        });
    }

    #linkToParent() {
        const parentMenu = this.options.parentMenu;
        if (!parentMenu)
            return;
        if (parentMenu.constructor !== this.constructor) {
            LiteGraph.log_error("contextmenu", "linkToParent", "parentMenu must be of class ContextMenu, ignoring it");
            this.options.parentMenu = null;
            return;
        }
        this.parentMenu = parentMenu;
        this.parentMenu.lock = true;
        this.parentMenu.current_submenu = this;
    }

    #validateEventClass() {
        if (!this.options.event)
            return;

        if (this.options.isCustomEvent) {
            LiteGraph.log_verbose("contextmenu", "linkToParent", "Custom event for ContextMenu.", this.options.event);
            return;
        }

        // why should we ignore other events ?
        // use strings because comparing classes between windows doesnt work
        const eventClass = this.options.event.constructor.name;
        if (eventClass !== "MouseEvent" &&
            eventClass !== "CustomEvent" &&
            eventClass !== "PointerEvent"
        ) {
            LiteGraph.log_warn(`Event passed to ContextMenu is not of type MouseEvent or CustomEvent. Was originally ignoring it. (${eventClass})`);
            // this.options.event = null;
        }
    }

    createFilter(values, options) {
        if (!values || !values.length || values.length == 1) return;

        const filter = document.createElement("input");
        filter.classList.add("context-menu-filter");
        filter.placeholder = "Filter list";
        this.root.prepend(filter);

        const items = Array.from(this.root.querySelectorAll(".litemenu-entry"));
        let displayedItems = [...items];
        let itemCount = displayedItems.length;

        console.info(options);

        // We must request an animation frame for the current node of the active canvas to update.
        requestAnimationFrame(() => {
            const currentNode = options.extra; //LGraphCanvas.active_canvas.current_node;
            const clickedComboValue = currentNode?.widgets
                ?.filter(w => w.type === "combo" && w.options.values.length === values.length)
                .find(w => w.options.values.every((v, i) => v === values[i]))
                ?.value;

            let selectedIndex = clickedComboValue ? values.findIndex(v => v === clickedComboValue) : 0;
            if (selectedIndex < 0) {
                selectedIndex = 0;
            }
            let selectedItem = displayedItems[selectedIndex];
            updateSelected();

            // Apply highlighting to the selected item
            function updateSelected() {
                selectedItem?.style.setProperty("background-color", "");
                selectedItem?.style.setProperty("color", "");
                selectedItem = displayedItems[selectedIndex];
                selectedItem?.style.setProperty("background-color", "#ccc", "important");
                selectedItem?.style.setProperty("color", "#000", "important");
            }

            const positionList = () => {
                const rect = this.root.getBoundingClientRect();

                // If the top is off-screen then shift the element with scaling applied
                if (rect.top < 0) {
                    const scale = 1 - this.root.getBoundingClientRect().height / this.root.clientHeight;
                    const shift = (this.root.clientHeight * scale) / 2;
                    this.root.style.top = -shift + "px";
                }
            }

            // Arrow up/down to select items
            filter.addEventListener("keydown", (event) => {
                switch (event.key) {
                    case "ArrowUp":
                        event.preventDefault();
                        if (selectedIndex === 0) {
                            selectedIndex = itemCount - 1;
                        } else {
                            selectedIndex--;
                        }
                        updateSelected();
                        break;
                    case "ArrowRight":
                        /* event.preventDefault();
                        selectedIndex = itemCount - 1;
                        updateSelected(); */
                        selectedItem?.do_click(event); //click();
                        break;
                    case "ArrowDown":
                        event.preventDefault();
                        if (selectedIndex === itemCount - 1) {
                            selectedIndex = 0;
                        } else {
                            selectedIndex++;
                        }
                        updateSelected();
                        break;
                    case "ArrowLeft": {
                        const parentMenu = this.parentMenu;
                        this.close(event, true);
                        if (parentMenu) {
                            const parentFilter = Array.from(parentMenu.root.querySelectorAll(".context-menu-filter"));
                            if (parentFilter && parentFilter.length) {
                                parentFilter[0].style.display = "block";
                                parentFilter[0].focus();
                            }
                        }
                        /* event.preventDefault();
                        selectedIndex = 0;
                        updateSelected(); */
                        break;
                    }
                    case "Enter":
                        selectedItem?.do_click(event); //click();
                        break;
                    case "Escape":
                        this.close();
                        break;
                }
            });

            filter.addEventListener("input", () => {
                // Hide all items that don't match our filter
                const term = filter.value.toLocaleLowerCase();
                // When filtering, recompute which items are visible for arrow up/down and maintain selection.
                displayedItems = items.filter(item => {
                    const isVisible = !term || item.textContent.toLocaleLowerCase().includes(term);
                    item.style.display = isVisible ? "block" : "none";
                    return isVisible;
                });

                selectedIndex = 0;
                if (displayedItems.includes(selectedItem)) {
                    selectedIndex = displayedItems.findIndex(d => d === selectedItem);
                }
                itemCount = displayedItems.length;

                updateSelected();

                // If we have an event then we can try and position the list under the source
                if (options.event) {
                    let top = options.event.clientY - 10;

                    const bodyRect = document.body.getBoundingClientRect();
                    const rootRect = this.root.getBoundingClientRect();
                    if (bodyRect.height && top > bodyRect.height - rootRect.height - 10) {
                        top = Math.max(0, bodyRect.height - rootRect.height - 10);
                    }

                    this.root.style.top = top + "px";
                    positionList();
                }
            });

            requestAnimationFrame(() => {
                // Focus the filter box when opening
                filter.focus();

                positionList();
            });
        })
    }

    /**
     * Creates a title element if it doesn't have one.
     * Sets the title of the menu.
     * @param {string} title - The title to be set.
     */
    setTitle(title) {
        if (!title)
            return;
        this.titleElement ??= document.createElement("div");
        const element = this.titleElement;
        element.className = "litemenu-title";
        element.innerHTML = title;
        if (!this.root.parentElement)
            this.root.appendChild(element);
    }

    /**
     * Adds a set of values to the menu.
     * @param {Array<string|object>} values - An array of values to be added.
     */
    addItems(values) {

        for (let i = 0; i < values.length; i++) {
            let name = values[i];

            if (typeof name !== 'string') {
                name = name && name.content !== undefined ? String(name.content) : String(name);
            }

            let value = values[i];

            // this.menu_elements.push(this.addItem(name, value, this.options));
            this.addItem(name, value, this.options);
        }
    }

    #insertMenu() {
        const doc = this.options.event?.target.ownerDocument ?? document;
        const parent = doc.fullscreenElement ?? doc.body;
        const root = this.root;
        const that = this;
        parent.appendChild(this.root);
    }

    #calculateBestPosition() {
        const options = this.options;
        const root = this.root;

        let left = options.left || 0;
        let top = options.top || 0;
        this.top_original = top;

        if (options.event) {
            left = options.event.clientX - 10;
            top = options.event.clientY - 10;

            if (options.title) {
                top -= 20;
            }
            this.top_original = top;

            if (options.parentMenu) {
                const rect = options.parentMenu.root.getBoundingClientRect();
                left = rect.left + rect.width;
            }

            const body_rect = document.body.getBoundingClientRect();
            const root_rect = root.getBoundingClientRect();
            if (body_rect.height === 0)
                LiteGraph.log_error("document.body height is 0. That is dangerous, set html,body { height: 100%; }");

            if (body_rect.width && left > body_rect.width - root_rect.width - 10) {
                left = body_rect.width - root_rect.width - 10;
            }
            if (body_rect.height && top > body_rect.height - root_rect.height - 10) {
                top = body_rect.height - root_rect.height - 10;
            }
        } else {
            LiteGraph.log_debug("contextmenu", "calculateBestPosition", "has no event");
        }

        root.style.left = `${left}px`;
        root.style.top = `${top}px`;

        if (options.scale) {
            // quarter steps keep text on the pixel grid (blurry fonts otherwise, Comfy 0b161c1)
            root.style.transform = `scale(${Math.round(options.scale * 4) * 0.25})`;
        }
    }

    /**
     * Adds an item to the menu.
     * @param {string} name - The name of the item.
     * @param {object | null} value - The value associated with the item.
     * @param {object} [options={}] - Additional options for the item.
     * @returns {HTMLElement} - The created HTML element representing the added item.
     */
    addItem(name, value, options = {}) {

        // value.callbacks_on_element_created ??= false; 

        LiteGraph.log_verbose("contextmenu", "addItem", ...arguments);

        const element = document.createElement("div");
        element.className = "litemenu-entry submenu";

        let disabled = false;
        var thisItem = element;

        if (value === null) {
            element.classList.add("separator");
        } else {
            element.innerHTML = value?.title ?? name;
            element.value = value;

            if (value) {
                if (value.disabled) {
                    disabled = true;
                    element.classList.add("disabled");
                }
                if (value.submenu || value.has_submenu) {
                    element.classList.add("has_submenu");
                }
            }

            if (typeof value == "function") {
                element.dataset["value"] = name;
                element.onclick_callback = value;
            } else {
                element.dataset["value"] = value;
            }

            if (value.className) {
                element.className += " " + value.className;
            }
            // execute element additional construction function
            if (typeof(value.callbacks_on_element_created) !== "undefined") {
                if (typeof(value.callbacks_on_element_created) == "function") {
                    value.callbacks_on_element_created = [value.callbacks_on_element_created];
                }
                var thisMenu = this;
                value.callbacks_on_element_created.forEach((fun) => {
                    if (typeof(fun) == "function") {
                        LiteGraph.log_debug("contextmenu", "addItem", "callbacks_on_element_created", element, fun);
                        fun(element, thisMenu);
                    }
                })
            }
        }

        this.root.appendChild(element);

        if (!disabled) {
            element.addEventListener("click", handleMenuItemClick);
            element.do_click = function(event, ignore_parent_menu) {
                // LiteGraph.log_verbose("contextmenu", "addItem", "do_click", "handleMenuItemClick", "this", this, "thisItem", thisItem, "event", event, "ignore_parent_menu", ignore_parent_menu);
                if (!event) {
                    LiteGraph.log_warn("contextmenu", "addItem", "do_click", "has no event", ...arguments);
                } else if (!event.clientX) {
                    LiteGraph.log_warn("contextmenu", "addItem", "do_click", "event has no clientX info", event);
                } else {
                    LiteGraph.log_verbose("contextmenu", "addItem", "do_click", "has clientX", event);
                }
                handleMenuItemClick.call(thisItem, event, ignore_parent_menu);
            };
        }
        if (!disabled && options.autoopen) {
            element.addEventListener("pointerenter", (event) => {
                const value = this.value;
                if (!value || !value.has_submenu) {
                    return;
                }
                // if it is a submenu, autoopen like the item was clicked
                handleMenuItemClick.call(this, event);
            });
        }

        var that = this;

        function handleMenuItemClick(event) {
            const value = this.value;
            let closeParent = true;

            LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "process", value, event, options, closeParent, this.current_submenu, this);

            // Close any current submenu
            that.current_submenu?.close(event);

            // Hide filter
            const thisFilter = Array.from(that.root.querySelectorAll(".context-menu-filter"));
            if (thisFilter && thisFilter.length) {
                thisFilter[0].style.display = "none";
            }

            // Execute global callback
            if (options.callback) {
                LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "global callback", this, value, options, event, that, options.node);

                const globalCallbackResult = options.callback.call(this, value, options, event, that, options.node);
                if (globalCallbackResult === true) {
                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "global callback processed, dont close parent?", globalCallbackResult);
                    closeParent = false;
                } else {
                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "global callback processed, will close parent", globalCallbackResult);
                }
            }

            // Handle special cases
            if (value) {
                if (value.callback && !options.ignore_item_callbacks && value.disabled !== true) {

                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "using value callback and !ignore_item_callbacks", this, value, options, event, that, options.node);
                    const itemCallbackResult = value.callback.call(this, value, options, event, that, options.extra);
                    if (itemCallbackResult === true) {
                        closeParent = false;
                    }
                }
                if (value.submenu) {
                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "SUBMENU", this, value, value.submenu.options, event, that, options);

                    if (!value.submenu.options) {
                        // throw new Error("contextmenu", "handleMenuItemClick", "submenu needs options");
                        LiteGraph.log_warn("contextmenu", "handleMenuItemClick", "SUBMENU", "submenu needs options");
                        return;
                    }
                    // Recursively create submenu
                    new that.constructor(value.submenu.options, {
                        callback: value.submenu.callback,
                        event: event,
                        parentMenu: that,
                        ignore_item_callbacks: value.submenu.ignore_item_callbacks,
                        title: value.submenu.title,
                        extra: value.submenu.extra,
                        autoopen: options.autoopen,
                    });
                    closeParent = false;
                }
            }

            // Close parent menu if necessary and not locked
            if (closeParent && !that.lock) {
                that.close();
            }
        }

        // push to menu_elements here
        this.menu_elements.push(element);

        return element;
    }

    /**
     * Closes this menu.
     * @param {Event} [e] - The event that triggered the close action.
     * @param {boolean} [ignore_parent_menu=false] - Whether to ignore the parent menu when closing.
     */
    close(e, ignore_parent_menu) {
        if (this.parentMenu && !ignore_parent_menu) {
            this.parentMenu.lock = false;
            this.parentMenu.current_submenu = null;
            if (e === undefined) {
                this.parentMenu.close();
            } else if (
                e &&
                !ContextMenu.isCursorOverElement(e, this.parentMenu.root)
            ) {
                ContextMenu.trigger(this.parentMenu.root, "pointerleave", e);
            }
        }
        this.current_submenu?.close(e, true);

        if (this.root.closing_timer) {
            clearTimeout(this.root.closing_timer);
        }

        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
    }

    /**
     * Closes all open ContextMenus in the specified window.
     * @param {Window} [ref_window=window] - The window object to search for open menus.
     */
    static closeAll = (ref_window = window) => {
        const elements = ref_window?.document?.querySelectorAll(".litecontextmenu");
        if (!elements || !elements.length)
            return;

        elements.forEach((element) => {
            if (element.close) {
                element.close();
            } else {
                element.parentNode?.removeChild(element);
            }
        });
    };

    /**
     * Triggers an event on the specified element with the given event name and parameters.
     * @param {HTMLElement} element - The element on which to trigger the event.
     * @param {string} event_name - The name of the event to trigger.
     * @param {Object} params - Additional parameters to include in the event.
     * @param {HTMLElement} origin - The origin of the event <currently not supported as CustomEvent can't have a target!>
     * @returns {CustomEvent} - The created CustomEvent instance.
     * @BUG: Probable bug related to params, origin not being configured/populated correctly
     */
    static trigger(element, event_name, params, origin) {
        const evt = new CustomEvent(event_name, {
            bubbles: true,
            cancelable: true,
            detail: params,
        });
        Object.defineProperty(evt, 'target', {
            value: origin
        });
        if (element.dispatchEvent) {
            element.dispatchEvent(evt);
        } else if (element.__events) {
            element.__events.dispatchEvent(evt);
        }
        return evt;
    }

    // returns the top most menu
    getTopMenu() {
        return this.options.parentMenu?.getTopMenu() ?? this;
    }

    getFirstEvent() {
        return this.options.parentMenu?.getFirstEvent() ?? this.options.event;
    }

    static isCursorOverElement(event, element) {
        return LiteGraph.isInsideRectangle(event.clientX, event.clientY, element.left, element.top, element.width, element.height);
    }
}

// used by some widgets to render a curve editor
export class CurveEditor {
    constructor(points) {
        this.points = points;
        this.selected = -1;
        this.nearest = -1;
        this.size = null; // stores last size used
        this.must_update = true;
        this.margin = 5;
    }

    static sampleCurve(f, points) {
        if (!points)
            return;
        for (var i = 0; i < points.length - 1; ++i) {
            var p = points[i];
            var pn = points[i + 1];
            if (pn[0] < f)
                continue;
            var r = (pn[0] - p[0]);
            if (Math.abs(r) < 0.00001)
                return p[1];
            var local_f = (f - p[0]) / r;
            return p[1] * (1.0 - local_f) + pn[1] * local_f;
        }
        return 0;
    }

    draw(ctx, size, graphcanvas, background_color, line_color, inactive) {
        var points = this.points;
        if (!points)
            return;
        this.size = size;
        var w = size[0] - this.margin * 2;
        var h = size[1] - this.margin * 2;

        line_color = line_color || "#666";

        ctx.save();
        ctx.translate(this.margin, this.margin);

        if (background_color) {
            ctx.fillStyle = "#111";
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#222";
            ctx.fillRect(w * 0.5, 0, 1, h);
            ctx.strokeStyle = "#333";
            ctx.strokeRect(0, 0, w, h);
        }
        ctx.strokeStyle = line_color;
        if (inactive)
            ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < points.length; ++i) {
            let p = points[i];
            ctx.lineTo(p[0] * w, (1.0 - p[1]) * h);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (!inactive)
            for (let i = 0; i < points.length; ++i) {
                let p = points[i];
                ctx.fillStyle = this.selected == i ? "#FFF" : (this.nearest == i ? "#DDD" : "#AAA");
                ctx.beginPath();
                ctx.arc(p[0] * w, (1.0 - p[1]) * h, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        ctx.restore();
    }

    // localpos is mouse in curve editor space
    onMouseDown(localpos, graphcanvas) {
        var points = this.points;
        if (!points)
            return;
        if (localpos[1] < 0)
            return;

        // this.captureInput(true);
        var w = this.size[0] - this.margin * 2;
        var h = this.size[1] - this.margin * 2;
        var x = localpos[0] - this.margin;
        var y = localpos[1] - this.margin;
        var pos = [x, y];
        var max_dist = 30 / graphcanvas.ds.scale;
        // search closer one
        this.selected = this.getCloserPoint(pos, max_dist);
        // create one
        if (this.selected == -1) {
            var point = [x / w, 1 - y / h];
            points.push(point);
            points.sort((a, b) => a[0] - b[0]);
            this.selected = points.indexOf(point);
            this.must_update = true;
        }
        if (this.selected != -1)
            return true;
    }

    onMouseMove(localpos, graphcanvas) {
        var points = this.points;
        if (!points)
            return;
        var s = this.selected;
        if (s < 0)
            return;
        var x = (localpos[0] - this.margin) / (this.size[0] - this.margin * 2);
        var y = (localpos[1] - this.margin) / (this.size[1] - this.margin * 2);
        var curvepos = [(localpos[0] - this.margin), (localpos[1] - this.margin)];
        var max_dist = 30 / graphcanvas.ds.scale;
        this._nearest = this.getCloserPoint(curvepos, max_dist);
        var point = points[s];
        if (point) {
            var is_edge_point = s == 0 || s == points.length - 1;
            if (!is_edge_point && (localpos[0] < -10 || localpos[0] > this.size[0] + 10 || localpos[1] < -10 || localpos[1] > this.size[1] + 10)) {
                points.splice(s, 1);
                this.selected = -1;
                return;
            }
            if (!is_edge_point) // not edges
                point[0] = LiteGraph.clamp(x, 0, 1);
            else
                point[0] = s == 0 ? 0 : 1;
            point[1] = 1.0 - LiteGraph.clamp(y, 0, 1);
            points.sort((a, b) => a[0] - b[0]);
            this.selected = points.indexOf(point);
            this.must_update = true;
        }
    }

    onMouseUp() { // not event handler, callback
        this.selected = -1;
        return false;
    }

    getCloserPoint(pos, max_dist) {
        var points = this.points;
        if (!points)
            return -1;
        max_dist = max_dist || 30;
        var w = (this.size[0] - this.margin * 2);
        var h = (this.size[1] - this.margin * 2);
        var num = points.length;
        var p2 = [0, 0];
        var min_dist = 1000000;
        var closest = -1;
        for (var i = 0; i < num; ++i) {
            var p = points[i];
            p2[0] = p[0] * w;
            p2[1] = (1.0 - p[1]) * h;
            var dist = Math.hypot(pos[0] - p2[0], pos[1] - p2[1]);
            if (dist > min_dist || dist > max_dist)
                continue;
            closest = i;
            min_dist = dist;
        }
        return closest;
    }
}

/**
 * Class responsible for handling scale and offset transformations for an HTML element,
 * enabling zooming and dragging functionalities.
 */
export class DragAndScale {
    /**
     * Creates an instance of DragAndScale.
     * @param {HTMLElement} element - The HTML element to apply scale and offset transformations.
     * @param {boolean} skip_events - Flag indicating whether to skip binding mouse and wheel events.
     *
     * Rendering:
     * toCanvasContext() is HTMLCanvas, and onredraw is probably also.  The rest is all HTML+CSS+JS
     */

    constructor(element, skip_events) {

        this.offset = new Float32Array([0, 0]);
        this.scale = 1;
        this.max_scale = 10;
        this.min_scale = 0.1;
        this.onredraw = null;
        this.enabled = true;
        this.last_mouse = [0, 0];
        this.element = null;
        this.visible_area = new Float32Array(4);

        if (element) {
            this.element = element;
            if (!skip_events) {
                this.bindEvents(element);
            }
        }
    }

    /**
     * Binds mouse and wheel events to the specified HTML element.
     *
     * @param {HTMLElement} element - The HTML element to bind the events to.
     */
    bindEvents(element) {
        this.last_mouse = new Float32Array(2);
        element.addEventListener("pointerdown", this.onMouseDown);
        element.addEventListener("wheel", this.onWheel);
    }

    onMouseDown = (event) => {
        if (!this.enabled) {
            return;
        }

        const canvas = this.element;
        const rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        event.canvasx = x;
        event.canvasy = y;
        event.dragging = this.dragging;

        var is_inside = !this.viewport || (this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]));

        if (is_inside) {
            this.dragging = true;
            this.abortController = new AbortController();
            document.addEventListener("pointermove", this.onMouseMove, {
                signal: this.abortController.signal
            });
            document.addEventListener("pointerup", this.onMouseUp, {
                signal: this.abortController.signal
            });
        }

        this.last_mouse[0] = x;
        this.last_mouse[1] = y;

    }

    onMouseMove = (event) => {
        if (!this.enabled) {
            return;
        }

        const canvas = this.element;
        const rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        event.canvasx = x;
        event.canvasy = y;
        event.dragging = this.dragging;

        var deltax = x - this.last_mouse[0];
        var deltay = y - this.last_mouse[1];
        if (this.dragging) {
            this.mouseDrag(deltax, deltay);
        }

        this.last_mouse[0] = x;
        this.last_mouse[1] = y;

    }

    onMouseUp = (_event) => {
        this.dragging = false;
        this.abortController?.abort();
    }

    onWheel = (event) => {
        event.wheel = -event.deltaY;

        // from stack overflow
        event.delta = event.wheelDelta ?
            event.wheelDelta / 40 :
            event.deltaY ?
            -event.deltaY / 3 :
            0;
        // zoom towards the pointer (relative to the element), not the element centre
        const rect = this.element?.getBoundingClientRect?.();
        const center = rect && event.clientX !== undefined ?
            [event.clientX - rect.left, event.clientY - rect.top] :
            undefined;
        this.changeDeltaScale(1.0 + event.delta * 0.05, center);
    }

    /**
     * Computes the visible area of the DragAndScale element based on the viewport.
     *
     * If the element is not set, the visible area will be reset to zero.
     *
     * @param {Array<number>} [viewport] - The viewport configuration to calculate the visible area.
     */
    computeVisibleArea(viewport) {
        if (!this.element) {
            this.visible_area.set([0, 0, 0, 0]);
            return;
        }
        const ratio = this.pixel_ratio || 1; // element size is in device pixels on high-DPI canvases
        let width = this.element.width / ratio;
        let height = this.element.height / ratio;
        let startx = -this.offset[0];
        let starty = -this.offset[1];
        if (viewport) {
            startx += viewport[0] / this.scale;
            starty += viewport[1] / this.scale;
            const [vpWidth, vpHeight] = viewport.slice(2);
            width = vpWidth;
            height = vpHeight;
        }

        const endx = startx + width / this.scale;
        const endy = starty + height / this.scale;
        const coords = [startx, starty, endx - startx, endy - starty];
        this.visible_area.set(coords);
        return coords;
    }

    /**
     * Applies the scale and offset transformations to the given 2D canvas rendering context.
     *
     * @param {CanvasRenderingContext2D} ctx - The 2D canvas rendering context to apply transformations to.
     */
    toCanvasContext(ctx) {
        ctx.scale(this.scale, this.scale);
        ctx.translate(this.offset[0], this.offset[1]);
    }

    /**
     * Converts a position from DragAndScale offset coordinates to canvas coordinates.
     *
     * @param {Array<number>} pos - The position in DragAndScale offset coordinates to convert.
     * @returns {Array<number>} The converted position in canvas coordinates.
     */
    convertOffsetToCanvas(pos) {
        return [
            (pos[0] + this.offset[0]) * this.scale,
            (pos[1] + this.offset[1]) * this.scale,
        ];
    }

    /**
     * Converts a position from canvas coordinates to DragAndScale offset coordinates.
     *
     * @param {Array<number>} pos - The position in canvas coordinates to convert.
     * @param {Array<number>} [out=[0, 0]] - The output array to store the converted position in DragAndScale offset coordinates.
     * @returns {Array<number>} The converted position in DragAndScale offset coordinates.
     */
    convertCanvasToOffset(pos, out = [0, 0]) {
        out[0] = pos[0] / this.scale - this.offset[0];
        out[1] = pos[1] / this.scale - this.offset[1];
        return out;
    }

    mouseDrag(x, y) {
        this.offset[0] += x / this.scale;
        this.offset[1] += y / this.scale;

        this.onredraw?.(this);
    }

    /**
     * Changes the scale of the DragAndScale element to the specified value around the zooming center.
     *
     * @param {number} value - The new scale value to set, clamped between min_scale and max_scale.
     * @param {Array<number>} zooming_center - The center point for zooming, defaulting to the middle of the element.
     */
    changeScale(value, zooming_center) {

        LiteGraph.log_debug("dragandscale", "changeScale", value, zooming_center);

        value = LiteGraph.clamp(value, this.min_scale, this.max_scale);

        if (value == this.scale || !this.element) {
            return;
        }
        const rect = this.element.getBoundingClientRect();
        if (!rect) {
            return;
        }

        zooming_center = zooming_center || [
            rect.width * 0.5,
            rect.height * 0.5,
        ];

        var center = this.convertCanvasToOffset(zooming_center);
        LiteGraph.log_debug("dragandscale", "changeScale", "center", center);
        this.scale = value;
        if (Math.abs(this.scale - 1) < 0.01) {
            this.scale = 1;
        }

        var new_center = this.convertCanvasToOffset(zooming_center);
        LiteGraph.log_debug("dragandscale", "changeScale", "new center", new_center);
        var delta_offset = [
            new_center[0] - center[0],
            new_center[1] - center[1],
        ];

        LiteGraph.log_debug("dragandscale", "changeScale", value, zooming_center);

        this.offset[0] += delta_offset[0];
        this.offset[1] += delta_offset[1];

        this.onredraw?.(this);
    }

    /**
     * Changes the scale of the DragAndScale element by a delta value relative to the current scale.
     *
     * @param {number} value - The delta value by which to scale the element.
     * @param {Array<number>} zooming_center - The center point for zooming the element.
     */
    changeDeltaScale(value, zooming_center) {
        this.changeScale(this.scale * value, zooming_center);
    }

    reset() {
        this.scale = 1;
        this.offset[0] = 0;
        this.offset[1] = 0;
    }
}

/**
 * Tracks one pointer gesture on a canvas: down -> move* -> up | cancel.
 *
 * Distinguishes clicks from drags with a movement tolerance (not only elapsed time), and detects
 * double clicks only when two clicks land close together in time and space.
 *
 * Gesture handlers: whoever handles a pointerdown can assign `onClick`, `onDoubleClick`,
 * `onDragStart`, `onDrag`, `onDragEnd` and `finally` for that gesture only. While handlers are
 * assigned the pointer owns the gesture (`hasHandlers`): move() calls onDragStart once the press
 * becomes a drag and onDrag on every move after it; up() calls onDragEnd for a drag, or
 * onClick / onDoubleClick for a click; finally runs at the end of every gesture, including cancel.
 * Handlers are cleared when the gesture ends.
 * Design follows the CanvasPointer idea in Comfy-Org/litegraph.js (MIT); independent implementation.
 */
export class CanvasPointer {
    /** maximum time between two clicks for a double click (ms) */
    static double_click_time = 300;
    /** maximum distance between two clicks for a double click (CSS px) */
    static double_click_distance = 6;
    /** movement before a press becomes a drag (CSS px) */
    static click_drift = 6;
    /** maximum press duration for a click (ms) */
    static click_time = 300;

    static HANDLERS = ["onClick", "onDoubleClick", "onDragStart", "onDrag", "onDragEnd", "finally"];

    constructor() {
        this.reset();
        this.clearHandlers();
        /** the last completed click, for double-click detection */
        this.lastClick = null;
    }

    /** true when the current gesture has handlers (the canvas then skips its legacy handling) */
    get hasHandlers() {
        return CanvasPointer.HANDLERS.some((name) => typeof this[name] === "function");
    }

    clearHandlers() {
        for (const name of CanvasPointer.HANDLERS) this[name] = null;
    }

    /** calls a handler; an error is reported but cannot leave the gesture half-finished */
    _call(name, e) {
        const handler = this[name];
        if (typeof handler !== "function") return;
        try {
            handler(e, this);
        } catch (error) {
            console.error?.(`CanvasPointer.${name} failed`, error);
        }
    }

    /** forget the gesture in progress */
    reset() {
        this.isDown = false;
        this.dragged = false;
        this.downEvent = null;
        this.maxDrift = 0;
    }

    /**
     * Starts a gesture.
     * @param {{clientX:number, clientY:number, button?:number, pointerId?:number}} e
     * @param {number} [now] - timestamp in ms
     * @returns {{isDoubleClick: boolean}}
     */
    down(e, now = Date.now()) {
        const last = this.lastClick;
        const isDoubleClick = !!last &&
            now - last.time <= CanvasPointer.double_click_time &&
            (last.button ?? 0) === (e.button ?? 0) &&
            Math.hypot(e.clientX - last.x, e.clientY - last.y) <= CanvasPointer.double_click_distance;
        this.clearHandlers(); // a new gesture starts without the previous one's handlers
        this.isDown = true;
        this.dragged = false;
        this.maxDrift = 0;
        this.downEvent = {
            x: e.clientX,
            y: e.clientY,
            time: now,
            button: e.button ?? 0,
            pointerId: e.pointerId,
            isDoubleClick
        };
        this.lastClick = null;
        return {
            isDoubleClick
        };
    }

    /**
     * Updates the gesture; returns true once the press has become a drag.
     * @param {{clientX:number, clientY:number}} e
     */
    move(e) {
        if (!this.isDown || !this.downEvent) return false;
        const drift = Math.hypot(e.clientX - this.downEvent.x, e.clientY - this.downEvent.y);
        if (drift > this.maxDrift) this.maxDrift = drift;
        if (drift > CanvasPointer.click_drift && !this.dragged) {
            this.dragged = true;
            this._call("onDragStart", e);
        }
        if (this.dragged) this._call("onDrag", e);
        return this.dragged;
    }

    /**
     * Ends the gesture.
     * @returns {{isClick: boolean, dragged: boolean, duration: number}}
     */
    up(e, now = Date.now()) {
        if (!this.isDown || !this.downEvent) {
            this.reset();
            return {
                isClick: false,
                dragged: false,
                duration: 0
            };
        }
        if (e) this.move(e);
        const duration = now - this.downEvent.time;
        const dragged = this.dragged;
        const isClick = !dragged && duration <= CanvasPointer.click_time;
        const handled = this.hasHandlers;
        if (dragged) this._call("onDragEnd", e);
        else if (isClick) this._call(this.downEvent.isDoubleClick ? "onDoubleClick" : "onClick", e);
        this._call("finally", e);
        this.clearHandlers();
        if (isClick && !this.downEvent.isDoubleClick) { // after a double click, a third click starts over
            const {
                x,
                y,
                button
            } = this.downEvent;
            this.lastClick = {
                x,
                y,
                button,
                time: now
            };
        } else {
            this.lastClick = null;
        }
        this.reset();
        return {
            isClick,
            dragged,
            duration,
            handled
        };
    }

    /** the system cancelled the gesture (pointercancel, lost capture): nothing completes */
    cancel() {
        this._call("finally", null);
        this.clearHandlers();
        this.reset();
        this.lastClick = null;
    }
}

/**
 * State machine for dragging links on a canvas.
 *
 *   idle --startFromOutput/startFromInput--> connecting --dropOnSlot/dropOnNode--> idle
 *   idle --moveInputLink/moveOutputLinks--> moving (links detached) --drop--> idle
 *                                                                   --cancel--> idle (links restored)
 *
 * Moving existing links detaches them when the drag starts; the whole move (detach + reconnect)
 * is one graph transaction, so it is a single undo step, and cancelling reconnects the
 * original links. Design follows the LinkConnector idea in Comfy-Org/litegraph.js (MIT);
 * independent implementation for this runtime's slots and events.
 */
export class LinkConnector {
    constructor() {
        this.reset();
    }

    /** back to idle (does not touch the graph) */
    reset() {
        /** node the dragged link end is attached to */
        this.node = null;
        /** slot index on that node */
        this.slot = -1;
        /** output slot object when dragging from an output */
        this.output = null;
        /** input slot object when dragging from an input */
        this.input = null;
        /** connection position of the fixed end (graph space) */
        this.pos = null;
        /** inputs whose links were detached from an output and are being moved: [{node, slot}] */
        this.movingInputs = null;
        /** original links detached by a move, restored on cancel: [{origin_id, origin_slot, target_id, target_slot}] */
        this.detached = null;
        this._graph = null;
    }

    get isConnecting() {
        return !!this.node;
    }

    /** true while existing links are being moved */
    get isMoving() {
        return !!this.detached;
    }

    /** type of the dragged link end */
    get type() {
        return (this.output || this.input)?.type;
    }

    /** start a new link from an output slot */
    startFromOutput(node, slot) {
        this._finishTransaction();
        this.reset();
        this._attachOutput(node, slot);
        return this;
    }

    /** start a new link from an input slot */
    startFromInput(node, slot) {
        this._finishTransaction();
        this.reset();
        this._attachInput(node, slot);
        return this;
    }

    /**
     * Detach the link entering an input and drag it from its origin output.
     * @returns {boolean} false when the input has no link
     */
    moveInputLink(node, slot) {
        const graph = node.graph;
        const link = graph?.links[node.inputs?.[slot]?.link];
        const origin = link && graph.getNodeById(link.origin_id);
        if (!origin) return false;
        this.startFromOutput(origin, link.origin_slot);
        this._beginMove(graph, [link]);
        node.disconnectInput(slot);
        return true;
    }

    /**
     * Detach every link leaving an output and drag them together from their target inputs.
     * @returns {boolean} false when the output has no links
     */
    moveOutputLinks(node, slot) {
        const graph = node.graph;
        const links = (node.outputs?.[slot]?.links ?? [])
            .map((id) => graph?.links[id])
            .filter((link) => link && graph.getNodeById(link.target_id));
        if (!links.length) return false;
        const first = graph.getNodeById(links[0].target_id);
        this.startFromInput(first, links[0].target_slot);
        this.movingInputs = links.map((link) => ({
            node: graph.getNodeById(link.target_id),
            slot: link.target_slot
        }));
        this._beginMove(graph, links);
        node.disconnectOutput(slot);
        return true;
    }

    /**
     * Drop the link on a node.
     * @param {LGraphNode} target
     * @param {number} targetSlot - slot under the pointer (input when dragging from an output and
     *   vice versa), or -1 to pick the first compatible slot
     * @returns {*} the connection result (falsy when nothing connected)
     */
    dropOnNode(target, targetSlot = -1) {
        if (!this.isConnecting || !target) return this.cancel();
        const graph = this._graph ?? target.graph ?? this.node.graph;
        const connect = () => {
            if (this.output) {
                const link = targetSlot !== -1 ?
                    this.node.connect(this.slot, target, targetSlot) :
                    this.node.connectByType(this.slot, target, this.type);
                this._keepRoute(link, (d) => d.origin_id === this.node.id && d.origin_slot === this.slot);
                return link;
            }
            const inputs = this.movingInputs ?? [{
                node: this.node,
                slot: this.slot
            }];
            let result = null;
            for (const {
                    node,
                    slot
                }
                of inputs) {
                result = targetSlot !== -1 ?
                    target.connect(targetSlot, node, slot) :
                    node.connectByTypeOutput(slot, target, this.type);
                this._keepRoute(result, (d) => d.target_id === node.id && d.target_slot === slot);
            }
            return result;
        };
        let result;
        try {
            result = graph?.transact && !this._graph ? graph.transact("connectLink", connect) : connect();
        } finally {
            this._finishTransaction();
            this.reset();
        }
        return result;
    }

    /**
     * Drop the link on empty space: moved links stay detached. Returns what was being dragged so
     * the canvas can offer a menu or search to create a node for it.
     * @returns {{node, slot: number, output: object|null, input: object|null, type: *}|null}
     */
    dropOnEmpty() {
        if (!this.isConnecting) return null;
        const dropped = {
            node: this.node,
            slot: this.slot,
            output: this.output,
            input: this.input,
            type: this.type
        };
        this._finishTransaction();
        this.reset();
        return dropped;
    }

    /** abandon the drag; moved links are reconnected as they were */
    cancel() {
        if (this.detached) {
            for (const link of this.detached) {
                const graph = this._graph;
                const origin = graph?.getNodeById(link.origin_id);
                const target = graph?.getNodeById(link.target_id);
                if (origin && target) {
                    const restored = origin.connect(link.origin_slot, target, link.target_slot);
                    if (restored && link.parentId !== undefined) restored.parentId = link.parentId;
                }
            }
        }
        this._finishTransaction();
        this.reset();
        return null;
    }

    _attachOutput(node, slot) {
        this.node = node;
        this.slot = slot;
        this.output = node.outputs[slot];
        if (this.output) this.output.slot_index = slot;
        this.input = null;
        this.pos = node.getConnectionPos(false, slot);
    }

    _attachInput(node, slot) {
        this.node = node;
        this.slot = slot;
        this.input = node.inputs[slot];
        if (this.input) this.input.slot_index = slot;
        this.output = null;
        this.pos = node.getConnectionPos(true, slot);
    }

    _beginMove(graph, links) {
        // parentId: the reroute chain the link was routed through, kept when it is reconnected
        this.detached = links.map(({
                origin_id,
                origin_slot,
                target_id,
                target_slot,
                parentId
            }) =>
            ({
                origin_id,
                origin_slot,
                target_id,
                target_slot,
                ...(parentId !== undefined ? {
                    parentId
                } : {})
            }));
        if (graph?.beginTransaction) {
            graph.beginTransaction("moveLink");
            this._graph = graph;
        }
    }

    /** a moved link keeps the reroutes of the link it replaces */
    _keepRoute(link, matches) {
        if (!link || typeof link !== "object" || !this.detached) return;
        const original = this.detached.find(matches);
        if (original?.parentId !== undefined && link.parentId === undefined) link.parentId = original.parentId;
    }

    _finishTransaction() {
        const graph = this._graph;
        this._graph = null;
        if (graph?.isInTransaction) graph.commitTransaction();
    }
}

/**
 * A point that links are routed through. Reroutes form chains: a link's parentId is the reroute
 * nearest its target, and each reroute's parentId is the next one towards the origin.
 *
 * The document form matches ComfyUI's (0.4: extra.reroutes + extra.linkExtensions); design after
 * Comfy-Org/litegraph.js Reroute (MIT), independent implementation.
 */
export class Reroute {
    /** hit radius in graph units */
    static radius = 7;

    /**
     * @param {number} id
     * @param {number[]} [pos]
     * @param {number} [parentId] - next reroute towards the origin
     */
    constructor(id, pos = [0, 0], parentId) {
        this.id = id;
        this.pos = [Number(pos[0]) || 0, Number(pos[1]) || 0];
        if (parentId !== undefined && parentId !== null) this.parentId = parentId;
    }

    /** true when (x, y) in graph space is on this reroute */
    isPointInside(x, y, radius = Reroute.radius) {
        return Math.hypot(x - this.pos[0], y - this.pos[1]) <= radius;
    }

    move(dx, dy) {
        this.pos[0] += dx;
        this.pos[1] += dy;
    }

    /** document form; linkIds lists the links routed through this reroute */
    serialize(linkIds = []) {
        const o = {
            id: this.id,
            pos: [this.pos[0], this.pos[1]],
            linkIds: [...linkIds]
        };
        if (this.parentId !== undefined) o.parentId = this.parentId;
        return o;
    }
}

/**
 * LGraph is the class that contain a full graph. We instantiate one and add nodes to it, and then we can run the execution loop.
 * supported callbacks:
    + onNodeAdded: when a new node is added to the graph
    + onNodeRemoved: when a node inside this graph is removed
    + onNodeConnectionChange: some connection has changed in the graph (connected or disconnected)
 */
export class LGraph {

    // default supported types
    static supported_types = ["number", "string", "boolean"];

    static STATUS_STOPPED = 1;
    static STATUS_RUNNING = 2;

    /** top-level document fields modelled by this runtime; any other loaded field is preserved verbatim on serialize */
    static serialized_fields = ["id", "revision", "state", "last_node_id", "last_link_id", "links", "config", "extra", "version", "litegraph_version"];

    /** fresh id counters; last_node_id/last_link_id are accessors over these */
    static createState() {
        return {
            lastNodeId: 0,
            lastLinkId: 0,
            lastGroupId: 0,
            lastRerouteId: 0
        };
    }

    /**
     * Typed graph events: configuring (cancelable), configured, node-added, node-removed,
     * changed, reroute-added, reroute-removed, link-connected, link-removed,
     * node-property-changed, widget-changed, execution-step, node-error. See LGraphEventTarget.
     */
    get events() {
        return this._events ??= new LGraphEventTarget(this, (error, event) =>
            LiteGraph.log_error("lgraph", "event listener failed", event.type, error));
    }

    /** dispatch only when someone listens (no allocation otherwise) */
    _emit(type, detail, options) {
        return this._events?.has(type) ? this._events.dispatch(type, detail, options) : null;
    }

    get last_node_id() {
        return this.state.lastNodeId;
    }
    set last_node_id(value) {
        this.state.lastNodeId = value;
    }
    get last_link_id() {
        return this.state.lastLinkId;
    }
    set last_link_id(value) {
        this.state.lastLinkId = value;
    }

    /** highest of `current` and every finite numeric id (uuids and other strings are ignored) */
    static _maxNumericId(current, ids) {
        let max = Number.isFinite(current) ? current : 0;
        for (const id of ids) {
            if (typeof id === "number" && Number.isFinite(id) && id > max) max = id;
        }
        return max;
    }

    /**
     * @constructor
     * @param {Object} o data from previous serialization [optional]} o
     */
    constructor(o) {
        LiteGraph.log_debug("Graph created", o);
        this.list_of_graphcanvas = null;

        /** document identity (uuid); kept by serialize/configure */
        this.id = LiteGraph.uuidv4();
        /** number of saved changes to this document */
        this.revision = 0;

        this.callbackhandler_setup();

        this.clear();

        if (o) {
            this.configure(o);
        }

        LiteGraph.processCallbackHandlers("on_lgraph_construct", {
            def_cb: LiteGraph.on_lgraph_construct
        }, this);
    }

    callbackhandler_setup() {
        this.cb_handler = new CallbackHandler(this);
    }

    registerCallbackHandler() {
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler() {
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers() {
        return this.cb_handler.processCallbackHandlers(...arguments);
    }

    /**
     * Gets the supported types of the LGraph class, falling back to the default supported types if not defined for the instance.
     * @returns {Array} An array of supported types for the LGraph class.
     */
    getSupportedTypes() {
        return this.supported_types ?? LGraph.supported_types;
    }

    /**
     * Removes all nodes from this graph
     * @method clear
     */
    clear() {
        if (this._clearing) return;
        this._clearing = true;
        const errors = [];
        try {
            this.stop();
        } catch (error) {
            errors.push(error);
        }
        this.status = LGraph.STATUS_STOPPED;

        this.state = LGraph.createState(); // also resets last_node_id / last_link_id

        // drop document fields kept from a previous configure
        for (const key in this._foreign_fields ?? {}) delete this[key];
        this._foreign_fields = {};

        this._version = -1; // used to detect changes

        // safe clear
        this._nodes?.slice().forEach((node) => {
            try {
                node.processCallbackHandlers("onRemoved", {
                    def_cb: node.onRemoved,
                    on_result: (value) => this._trackCleanup(value)
                }, this);
            } catch (error) {
                errors.push(error);
            } finally {
                if (node.subgraph) this._trackCleanup(node.subgraph.whenIdle());
                node.graph = null;
                node._waiting_actions = [];
                node.inputs?.forEach((input) => {
                    input.link = null;
                });
                node.outputs?.forEach((output) => {
                    output.links = null;
                });
            }
        });
        this._groups?.forEach((group) => {
            group.graph = null;
        });

        // nodes
        this._nodes = [];
        this._notifyReadinessChange();
        this._nodes_by_id = {};
        this._nodes_in_order = []; // nodes sorted in execution order
        this._nodes_executable = null; // nodes that contain onExecute sorted in execution order

        // other scene stuff
        this._groups = [];

        // links
        this.links = {}; // container with all the links
        this.reroutes = new Map(); // id -> Reroute (points links are routed through)
        this._floating_reroutes = [];

        // iterations
        this.iteration = 0;

        // custom data
        this.config = {};
        this.configApplyDefaults();

        this.vars = {};
        this.extra = {}; // to store custom data

        // timing
        this.globaltime = 0;
        this.runningtime = 0;
        this.fixedtime = 0;
        this.fixedtime_lapse = 0.01;
        this.elapsed_time = 0.01;
        this.last_update_time = 0;
        this.starttime = 0;

        this.catch_errors = true;

        // savings
        this.history = {
            actionHistory: [],
            actionHistoryVersions: [],
            actionHistoryPtr: 0,
        };

        this.nodes_executing = [];
        this.nodes_actioning = [];
        this.node_ancestorsCalculated = [];
        this.nodes_executedAction = [];

        // subgraph_data
        this.inputs = {};
        this.outputs = {};

        this.ancestorsCall = false;
        this.initialization_error = null;
        this._clearing = false;
        // Notification failures must not prevent the remaining cleanup notifications.
        try {
            this.change();
        } catch (error) {
            errors.push(error);
        }
        try {
            this.sendActionToCanvas("clear");
        } catch (error) {
            errors.push(error);
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length) throw new AggregateError(errors, "Graph cleanup failed");
    }

    /**
     * Apply config values to LGraph config object
     * @method configApply
     * @param {object} opts options to merge
     */
    configApply(opts) {
        /*
        align_to_grid
        links_ontop
        */
        this.config = Object.assign(this.config, opts);
    }

    /**
     * Apply config values to LGraph config object
     * @method configApply
     * @param {object} opts options to merge
     */
    configApplyDefaults() {
        var opts = LiteGraph.graphDefaultConfig;
        this.configApply(opts);
    }

    /**
     * Attach Canvas to this graph
     * @method attachCanvas
     * @param {GraphCanvas} graph_canvas
     */
    attachCanvas(graphcanvas) {
        if (!(graphcanvas instanceof LGraphCanvas)) {
            throw new Error("attachCanvas expects a LiteGraph.LGraphCanvas instance");
        }
        if (graphcanvas.graph && graphcanvas.graph != this) {
            LiteGraph.log_debug("lgraph", "attachCanvas", "detaching previous");
            graphcanvas.graph.detachCanvas(graphcanvas);
        }

        graphcanvas.graph = this;
        this.list_of_graphcanvas ??= [];
        var pos = this.list_of_graphcanvas.indexOf(graphcanvas);
        if (pos == -1) {
            LiteGraph.log_debug("lgraph", "attachCanvas", "attaching canvas");
            this.list_of_graphcanvas.push(graphcanvas);
        } else {
            LiteGraph.log_debug("lgraph", "attachCanvas", "canvas was already attached");
        }
    }

    /**
     * Detach Canvas from this graph
     * @method detachCanvas
     * @param {GraphCanvas} graph_canvas
     */
    detachCanvas(graphcanvas) {
        if (!this.list_of_graphcanvas) {
            return;
        }
        var pos = this.list_of_graphcanvas.indexOf(graphcanvas);
        if (pos == -1) {
            return;
        }
        // graphcanvas.graph = null; // ?!
        LiteGraph.log_debug("lgraph", "detachCanvas", pos, this.list_of_graphcanvas, this);
        this.list_of_graphcanvas.splice(pos, 1);
    }

    getCanvas() {
        if (!this.list_of_graphcanvas) {
            return;
        }
        return this.list_of_graphcanvas[0];
    }

    /** Whether any node or nested graph is loading or failed initialization. */
    hasPendingInitialization() {
        return this._nodes.some((node) => node.initialization_state === "loading" ||
            node.initialization_error || node.subgraph?.hasPendingInitialization());
    }

    _notifyReadinessChange() {
        this._readinessVersion = (this._readinessVersion || 0) + 1;
        this._readinessWaiters?.forEach((resolve) => resolve());
        this._readinessWaiters?.clear();
    }

    /** Wait for the current graph's dependencies; detached nodes keep their own readiness. */
    async whenReady() {
        for (;;) {
            const nodes = this._nodes.slice();
            if (!nodes.length) return this;
            const version = this._readinessVersion;
            let changed;
            const mutation = new Promise((resolve) => {
                changed = resolve;
                (this._readinessWaiters ??= new Set()).add(resolve);
            });
            const ready = Promise.all(nodes.map(async (node) => {
                try {
                    await node.ready;
                    if (node.graph !== this) return;
                    if (node.initialization_error) throw node.initialization_error;
                    if (node.subgraph) await node.subgraph.whenReady();
                } catch (error) {
                    if (node.graph === this) throw error;
                }
            }));
            try {
                await Promise.race([ready, mutation]);
            } finally {
                this._readinessWaiters.delete(changed);
            }
            if (this._readinessVersion === version) return this;
        }
    }

    startAsync(interval = 0) {
        if (this._pending_start) return this._pending_start.promise;
        const request = {};
        this._pending_start = request;
        request.promise = this.whenIdle().then(() => this.whenReady()).then(async () => {
            // Include nodes added between readiness settlement and this continuation.
            while (this._pending_start === request && this.hasPendingInitialization()) await this.whenReady();
            if (this._pending_start !== request) return false;
            request.starting = true;
            this.start(interval);
            return this.status === LGraph.STATUS_RUNNING;
        }).catch((error) => {
            if (this._pending_start !== request && !request.starting) return false;
            this.initialization_error = error;
            throw error;
        }).finally(() => {
            if (this._pending_start === request) this._pending_start = null;
        });
        request.promise.catch((error) => LiteGraph.log_error("Graph initialization failed", error));
        return request.promise;
    }

    /** Start immediately when ready, or return a Promise while dependencies load. */
    start(interval = 0) {
        if (this.status === LGraph.STATUS_RUNNING) return;
        if (this.hasPendingInitialization() || this._pendingCleanup?.size || this._cleanupWait) return this.startAsync(interval);
        this.initialization_error = null;

        this.status = LGraph.STATUS_RUNNING;
        try {
            this.processCallbackHandlers("onPlayEvent", {
                def_cb: this.onPlayEvent
            });
            this.sendEventToAllNodes("onStart");
        } catch (error) {
            try {
                this.stop();
            } catch (cleanupError) {
                LiteGraph.log_error("Graph start cleanup failed", cleanupError);
            }
            throw error;
        }
        if (this.status !== LGraph.STATUS_RUNNING) return;

        this.starttime = LiteGraph.getTime();
        this.last_update_time = this.starttime;

        const onAnimationFrame = () => {
            if (this.execution_timer_id !== -1) {
                return;
            }
            window.requestAnimationFrame(onAnimationFrame);
            this.processCallbackHandlers("onBeforeStep", {
                def_cb: this.onBeforeStep
            });
            this.runStep(1, !this.catch_errors);
            this.processCallbackHandlers("onAfterStep", {
                def_cb: this.onAfterStep
            });
        };

        if (interval === 0 && typeof window === "object" && window.requestAnimationFrame) {
            this.execution_timer_id = -1;
            onAnimationFrame();
        } else {
            this.execution_timer_id = setInterval(() => {
                this.processCallbackHandlers("onBeforeStep", {
                    def_cb: this.onBeforeStep
                });
                this.runStep(1, !this.catch_errors);
                this.processCallbackHandlers("onAfterStep", {
                    def_cb: this.onAfterStep
                });
            }, interval);
        }
    }

    /**
     * Stops the execution loop of the graph
     * @method stop execution
     */
    stop() {
        this._pending_start = null;
        if (this.status == LGraph.STATUS_STOPPED) {
            return;
        }
        this.status = LGraph.STATUS_STOPPED;
        if (this.execution_timer_id != null) {
            if (this.execution_timer_id != -1) {
                clearInterval(this.execution_timer_id);
            }
            this.execution_timer_id = null;
        }
        const errors = [];
        try {
            this.processCallbackHandlers("onStopEvent", {
                def_cb: this.onStopEvent,
                on_result: (value) => this._trackCleanup(value)
            });
        } catch (error) {
            errors.push(error);
        }
        try {
            this.sendEventToAllNodes("onStop", undefined, null);
        } catch (error) {
            errors.push(error);
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length) throw new AggregateError(errors, "Graph stop failed");
    }

    /** Record all asynchronous cleanup results without creating unhandled rejections. */
    _trackCleanup(value) {
        if (!value || typeof value.then !== "function") return;
        this._cleanupSources ??= new WeakSet();
        if (this._cleanupSources.has(value)) return;
        this._cleanupSources.add(value);
        this._pendingCleanup ??= new Set();
        const settled = Promise.resolve(value).then(() => null, (error) => {
            this.cleanup_error = error;
            return {
                error
            };
        });
        this._pendingCleanup.add(settled);
    }

    /** Wait for all cleanup initiated so far, including work queued during cleanup. */
    whenIdle() {
        const wait = async () => {
            const errors = [];
            while (this._cleanupWait || this._pendingCleanup?.size) {
                if (!this._cleanupWait) {
                    const batch = [...this._pendingCleanup];
                    this._pendingCleanup.clear();
                    this._cleanupWait = Promise.all(batch).finally(() => {
                        this._cleanupWait = null;
                    });
                }
                const results = await this._cleanupWait;
                for (const result of results)
                    if (result) errors.push(result.error);
            }
            if (errors.length === 1) throw errors[0];
            if (errors.length) throw new AggregateError(errors, "Asynchronous graph cleanup failed");
            this.cleanup_error = null;
            return this;
        };
        const pending = wait();
        pending.catch(() => {});
        return pending;
    }

    async _cleanupAsync(operation) {
        const errors = [];
        try {
            operation();
        } catch (error) {
            errors.push(error);
        }
        try {
            await this.whenIdle();
        } catch (error) {
            errors.push(error);
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length) throw new AggregateError(errors, "Graph cleanup failed");
        return this;
    }

    stopAsync() {
        return this._cleanupAsync(() => this.stop());
    }
    clearAsync() {
        return this._cleanupAsync(() => this.clear());
    }
    removeAsync(node) {
        return this._cleanupAsync(() => this.remove(node));
    }

    /**
     * Run N steps (cycles) of the graph
     * @method runStep
     * @param {number} num number of steps to run, default is 1
     * @param {Boolean} do_not_catch_errors [optional] if you want to try/catch errors
     * @param {number} limit max number of nodes to execute (used to execute from start to a node)
     */
    runStep(num = 1, do_not_catch_errors, limit) {
        const start = LiteGraph.getTime();
        this.globaltime = 0.001 * (start - this.starttime);
        const resetExecutionState = () => {
            this.nodes_executing = [];
            this.nodes_actioning = [];
            this.node_ancestorsCalculated = [];
            this.nodes_executedAction = [];
        };
        try {
            for (let step = 0; step < num; step++) {
                // Changes made during one cycle take effect in the following cycle.
                const nodes = this._nodes_executable ?? this._nodes;
                const count = limit == null ? nodes.length : Math.max(0, Math.min(nodes.length, limit));
                for (let index = 0; index < count; index++) {
                    const node = nodes[index];
                    if (node.graph !== this) continue;
                    if (LiteGraph.use_deferred_actions) node.executePendingActions();
                    if (node.mode === LiteGraph.ALWAYS) node.doExecute?.();
                }
                this.fixedtime += this.fixedtime_lapse;
                this.processCallbackHandlers("onExecuteStep", {
                    def_cb: this.onExecuteStep
                });
                this.iteration++;
                this._emit("execution-step", {
                    iteration: this.iteration
                });
                if (step + 1 < num) resetExecutionState();
            }
            this.processCallbackHandlers("onAfterExecute", {
                def_cb: this.onAfterExecute
            });
            this.errors_in_execution = false;
        } catch (error) {
            this.errors_in_execution = true;
            this._emit("node-error", {
                error,
                node: error?.node ?? this.nodes_executing?.at?.(-1) ?? null
            });
            try {
                this.stop();
            } catch (cleanupError) {
                LiteGraph.log_error("Graph error cleanup failed", cleanupError);
            }
            if (do_not_catch_errors || LiteGraph.throw_errors) throw error;
            LiteGraph.log_warn("lgraph", "Error during execution", error);
        } finally {
            const now = LiteGraph.getTime();
            this.execution_time = 0.001 * Math.max(1, now - start);
            this.globaltime += this.execution_time;
            this.elapsed_time = (now - this.last_update_time) * 0.001;
            this.last_update_time = now;
            resetExecutionState();
        }
    }

    /**
     * Updates the graph execution order according to relevance of the nodes (nodes with only outputs have more relevance than
     * nodes with only inputs.
     * @method updateExecutionOrder
     */
    updateExecutionOrder() {
        this._nodes_in_order = this.computeExecutionOrder(false);
        this._nodes_executable = [];
        for (var i = 0; i < this._nodes_in_order.length; ++i) {
            if (this._nodes_in_order[i].onExecute) {
                this._nodes_executable.push(this._nodes_in_order[i]);
            }
        }
    }

    /**
     * Computes the execution order of nodes in the flow graph based on their connections and levels.
     * @param {boolean} only_onExecute - Indicates whether to consider only nodes with an onExecute method.
     * @param {boolean} set_level - If true, assigns levels to the nodes based on their connections.
     * @returns {Array} An array of nodes in the calculated execution order.
     *
     * @TODO: mrpebble: This whole concept is a mistake. Should call graph back from output nodes
     * ADDENDUM: atlasan: actually ancestor solution will trigger output nodes when needed, it is not a mistake as it's working his way
     *                      so let's investigate, develop, try and document better
     */
    computeExecutionOrder(only_onExecute, set_level) {
        var L = [];
        var S = [];
        var M = {};
        var visited_links = {}; // to avoid repeating links
        var remaining_links = {}; // to a

        // search for the nodes without inputs (starting nodes)
        for (let i = 0, l = this._nodes.length; i < l; ++i) {
            let node = this._nodes[i];
            if (only_onExecute && !node.onExecute) {
                continue;
            }

            M[node.id] = node; // add to pending nodes

            var num = 0; // num of input connections
            if (node.inputs) {
                for (var j = 0, l2 = node.inputs.length; j < l2; j++) {
                    if (node.inputs[j] && node.inputs[j].link != null) {
                        num += 1;
                    }
                }
            }

            if (num == 0) {
                // is a starting node
                S.push(node);
                if (set_level) {
                    node._level = 1;
                }
            } else { // num of input links
                if (set_level) {
                    node._level = 0;
                }
                remaining_links[node.id] = num;
            }
        }

        while (S.length != 0) {

            // get an starting node
            var node = S.shift();
            L.push(node); // add to ordered list
            delete M[node.id]; // remove from the pending nodes

            if (!node.outputs) {
                continue;
            }

            // for every output
            for (let i = 0; i < node.outputs.length; i++) {
                let output = node.outputs[i];
                // not connected
                if (
                    output == null ||
                    output.links == null ||
                    output.links.length == 0
                ) {
                    continue;
                }

                // for every connection
                for (let j = 0; j < output.links.length; j++) {
                    let link_id = output.links[j];
                    let link = this.links[link_id];
                    if (!link) {
                        continue;
                    }

                    // already visited link (ignore it)
                    if (visited_links[link.id]) {
                        continue;
                    }

                    let target_node = this.getNodeById(link.target_id);
                    if (target_node == null) {
                        visited_links[link.id] = true;
                        continue;
                    }

                    if (
                        set_level &&
                        (!target_node._level ||
                            target_node._level <= node._level)
                    ) {
                        target_node._level = node._level + 1;
                    }

                    visited_links[link.id] = true; // mark as visited
                    remaining_links[target_node.id] -= 1; // reduce the number of links remaining
                    if (remaining_links[target_node.id] == 0) {
                        S.push(target_node);
                    } // if no more links, then add to starters array
                }
            }
        }

        // the remaining ones (loops)
        for (let i in M) {
            L.push(M[i]);
        }

        if (L.length != this._nodes.length && LiteGraph.debug) {
            LiteGraph.log_warn("lgraph", "computeExecutionOrder", "something went wrong, nodes missing");
        }

        var l = L.length;

        // save order number in the node
        for (let i = 0; i < l; ++i) {
            L[i].order = i;
        }

        // sort now by priority
        L = L.sort((A, B) => {
            let Ap = A.constructor.priority || A.priority || 0;
            let Bp = B.constructor.priority || B.priority || 0;
            if (Ap == Bp) {
                // if same priority, sort by order
                return A.order - B.order;
            }
            return Ap - Bp; // sort by priority
        });

        // save order number in the node, again...
        for (let i = 0; i < l; ++i) {
            L[i].order = i;
        }

        return L;
    }

    /**
     * Returns all the nodes that could affect this one (ancestors) by crawling all the inputs recursively.
     * It doesn't include the node itself
     * @method getAncestors
     * @return {Array} an array with all the LiteGraph.LGraphNodes that affect this node, in order of execution
     */
    getAncestors(node, optsIn = {}) {
        var optsDef = {
            modesSkip: [],
            modesOnly: [],
            typesSkip: [],
            typesOnly: [],
        };
        var opts = Object.assign(optsDef, optsIn);

        var ancestors = [];
        var ancestorsIds = [];
        var pending = [node];
        var visited = {};

        while (pending.length) {
            var current = pending.shift();
            if (!current) {
                continue;
            }
            if (visited[current.id]) {
                continue;
            }
            // mark as visited
            visited[current.id] = true;

            // add to ancestors
            if (current.id != node.id) {

                // mode check
                if (opts.modesSkip && opts.modesSkip.length) {
                    if (opts.modesSkip.indexOf(current.mode) != -1) {
                        // DBG EXCESS (keep) LiteGraph.log_verbose("mode skip "+current.id+":"+current.order+" :: "+current.mode);
                        continue;
                    }
                }
                if (opts.modesOnly && opts.modesOnly.length) {
                    if (opts.modesOnly.indexOf(current.mode) == -1) {
                        // DBG EXCESS (keep) LiteGraph.log_verbose("mode only "+current.id+":"+current.order+" :: "+current.mode);
                        continue;
                    }
                }

                if (ancestorsIds.indexOf(current.id) == -1) {
                    ancestors.push(current);
                    ancestorsIds.push(current.id);
                    // DBG EXCESS (keep) LiteGraph.log_verbose("push current "+current.id+":"+current.order);
                }

            }

            // get its inputs
            if (!current.inputs) {
                continue;
            }

            for (var i = 0; i < current.inputs.length; ++i) {
                var input = current.getInputNode(i);
                if (!input)
                    continue;
                var inputType = current.inputs[i].type;

                // type check
                if (opts.typesSkip && opts.typesSkip.length) {
                    if (opts.typesSkip.indexOf(inputType) != -1) {
                        // DBG EXCESS (keep) LiteGraph.log_verbose("type skip "+input.id+":"+input.order+" :: "+inputType);
                        continue;
                    }
                }
                if (opts.typesOnly && opts.typesOnly.length) {
                    if (opts.typesOnly.indexOf(inputType) == -1) {
                        // DBG EXCESS (keep) LiteGraph.log_verbose("type only "+input.id+":"+input.order+" :: "+inputType);
                        continue;
                    }
                }

                // DBG EXCESS (keep) LiteGraph.log_verbose("input "+i+" "+input.id+":"+input.order);
                // push em in
                if (ancestorsIds.indexOf(input.id) == -1) {
                    if (!visited[input.id]) {
                        pending.push(input);
                        // DBG EXCESS (keep) LiteGraph.log_verbose("push input "+input.id+":"+input.order);
                    }
                }
            }
        }

        ancestors.sort((a, b) => a.order - b.order);
        return ancestors;
    }

    /**
     * Positions every node in a more readable manner
     * @method arrange
     */
    arrange(margin = 100, layout) {
        const nodes = this.computeExecutionOrder(false, true);
        const columns = [];
        for (let i = 0; i < nodes.length; ++i) {
            const node = nodes[i];
            const col = node._level || 1;
            columns[col] ??= [];
            columns[col].push(node);
        }

        let x = margin;

        for (let i = 0; i < columns.length; ++i) {
            const column = columns[i];
            if (!column) {
                continue;
            }
            let max_size = 100;
            let y = margin + LiteGraph.NODE_TITLE_HEIGHT;
            for (let j = 0; j < column.length; ++j) {
                const node = column[j];
                node.pos[0] = (layout == LiteGraph.VERTICAL_LAYOUT) ? y : x;
                node.pos[1] = (layout == LiteGraph.VERTICAL_LAYOUT) ? x : y;
                const max_size_index = (layout == LiteGraph.VERTICAL_LAYOUT) ? 1 : 0;
                if (node.size[max_size_index] > max_size) {
                    max_size = node.size[max_size_index];
                }
                const node_size_index = (layout == LiteGraph.VERTICAL_LAYOUT) ? 0 : 1;
                y += node.size[node_size_index] + margin + LiteGraph.NODE_TITLE_HEIGHT;
            }
            x += max_size + margin;
        }

        this.setDirtyCanvas(true, true);
    }

    /**
     * Returns the amount of time the graph has been running in milliseconds
     * @method getTime
     * @return {number} number of milliseconds the graph has been running
     */
    getTime() {
        return this.globaltime;
    }

    /**
     * Returns the amount of time accumulated using the fixedtime_lapse var. This is used in context where the time increments should be constant
     * @method getFixedTime
     * @return {number} number of milliseconds the graph has been running
     */
    getFixedTime() {
        return this.fixedtime;
    }

    /**
     * Returns the amount of time it took to compute the latest iteration. Take into account that this number could be not correct
     * if the nodes are using graphical actions
     * @method getElapsedTime
     * @return {number} number of milliseconds it took the last cycle
     */
    getElapsedTime() {
        return this.elapsed_time;
    }

    /**
     * Sends an event to all the nodes, useful to trigger stuff
     * TODO :: nice stuff !! check and improve
     * @method sendEventToAllNodes
     * @param {String} eventname the name of the event (function to be called)
     * @param {Array} params parameters in array format
     */
    sendEventToAllNodes(eventname, params, mode = LiteGraph.ALWAYS) {
        const nodes = (this._nodes_in_order || this._nodes || []).slice();
        const args = params === undefined ? [] : Array.isArray(params) ? params : [params];
        const errors = [];
        for (const node of nodes) {
            if (node.graph !== this || (mode != null && node.mode !== mode)) continue;
            try {
                if (node instanceof LiteGraph.Subgraph && eventname !== "onExecute") {
                    try {
                        node.sendEventToAllNodes(eventname, params, mode);
                    } finally {
                        if (eventname === "onStop") this._trackCleanup(node.subgraph.whenIdle());
                    }
                } else {
                    node.processCallbackHandlers(eventname, {
                        def_cb: node[eventname],
                        on_result: eventname === "onStop" ? (value) => this._trackCleanup(value) : undefined,
                    }, ...args);
                }
            } catch (error) {
                // Startup and ordinary events abort on failure; shutdown visits everyone.
                if (eventname !== "onStop") throw error;
                errors.push(error);
            }
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length) throw new AggregateError(errors, "Node stop callbacks failed");
    }

    /**
     * Sends an action with parameters to the connected GraphCanvas instances for processing.
     * @param {string} action - The action to be performed on the GraphCanvas instances.
     * @param {Array} params - An array of parameters to be passed to the action method.
     */
    sendActionToCanvas(action, params) {
        if (!this.list_of_graphcanvas) {
            return;
        }

        // params is an argument list; a single value or nothing is allowed too
        // ("clear" and "checkPanels" are sent without any and used to be dropped)
        const args = params == null ? [] : Array.isArray(params) ? params : [params];
        for (const c of this.list_of_graphcanvas) {
            if (typeof(c[action]) == "function") {
                c[action](...args);
            }
        }
    }

    /**
     * Adds a new node instance to this graph
     * @method add
     * @param {LiteGraph.LGraphNode} node the instance of the node
     */
    add(node, skip_compute_order, optsIn = {}) {

        var optsDef = {
            doProcessChange: true,
            doCalcSize: true,
        };
        var opts = Object.assign(optsDef, optsIn);

        if (!node) {
            return;
        }

        if (this._clearing) throw new Error("Cannot add nodes while clearing a graph");
        if (node.graph === this) return node;
        if (node.graph) throw new Error("Remove a node from its current graph before adding it to another");

        // groups
        if (node.constructor === LiteGraph.LGraphGroup) {
            if (typeof node.id === "number" && Number.isFinite(node.id)) {
                this.state.lastGroupId = Math.max(this.state.lastGroupId, node.id);
                if (this._groups.some((group) => group.id === node.id)) node.id = ++this.state.lastGroupId;
            } else {
                node.id = ++this.state.lastGroupId;
            }
            this._groups.push(node);
            this.setDirtyCanvas(true);
            this.change();
            node.graph = this;
            this.onGraphChanged({
                action: "groupAdd",
                doSave: opts.doProcessChange
            });
            return;
        }

        // Directly constructed registered nodes need the same setup as createNode.
        node.post_constructor?.();

        // nodes
        if (node.id != -1 && this._nodes_by_id[node.id] != null) {
            LiteGraph.log_debug("lgraph", "add", "there is already a node with this ID, changing it", node);
            if (LiteGraph.use_uuids) {
                node.id = LiteGraph.uuidv4();
            } else {
                node.id = ++this.last_node_id;
            }
        }

        if (LiteGraph.MAX_NUMBER_OF_NODES > 0 && this._nodes.length >= LiteGraph.MAX_NUMBER_OF_NODES) {
            LiteGraph.log_error("lgraph", "add", "max number of nodes in a graph reached", LiteGraph.MAX_NUMBER_OF_NODES);
            return;
            // throw new Error("LiteGraph: max number of nodes in a graph reached");
        }

        // give him an id
        if (LiteGraph.use_uuids) {
            if (node.id == null || node.id == -1)
                node.id = LiteGraph.uuidv4();
        } else {
            if (node.id == null || node.id == -1) {
                node.id = ++this.last_node_id;
            } else if (this.last_node_id < node.id) {
                this.last_node_id = node.id;
            }
        }

        node.graph = this;
        node.exec_version = undefined;

        this._nodes.push(node);
        this._nodes_by_id[node.id] = node;
        this._notifyReadinessChange();

        node.processCallbackHandlers("onAdded", {
            def_cb: node.onAdded
        }, this);

        if (this.config.align_to_grid) {
            node.alignToGrid();
        }

        if (!skip_compute_order) {
            this.updateExecutionOrder();
        }

        this.processCallbackHandlers("onNodeAdded", {
            def_cb: this.onNodeAdded
        }, node);

        if (opts.doCalcSize) {
            // a node on the generic default size gets its computed size; a size assigned
            // by the node class or the caller is kept and only grown to fit
            node.autoSize(!node.hasDefaultSize?.());
        }
        // record after the node is in the graph, so the history snapshot contains it
        this.onGraphChanged({
            action: "nodeAdd",
            doSave: opts.doProcessChange
        });
        this._emit("node-added", {
            node
        });
        this.setDirtyCanvas(true);
        this.change();

        return node; // to chain actions
    }

    /**
     * Removes a node from the graph
     * @method remove
     * @param {LiteGraph.LGraphNode} node the instance of the node
     */
    remove(node) {
        if (!node || this._clearing || this._removingNodes?.has(node) || node.graph !== this) return;
        if (node.constructor === LiteGraph.LGraphGroup) {
            var index = this._groups.indexOf(node);
            if (index != -1) {
                this._groups.splice(index, 1);
            }
            node.graph = null;
            this.onGraphChanged({
                action: "groupRemove"
            });
            this.setDirtyCanvas(true, true);
            this.change();
            return;
        }

        if (this._nodes_by_id[node.id] !== node) {
            return;
        } // not found

        if (node.ignore_remove) {
            return;
        } // cannot be removed

        this._removingNodes ??= new WeakSet();
        this._removingNodes.add(node);
        const errors = [];
        const cleanup = (fn) => {
            try {
                fn();
            } catch (error) {
                errors.push(error);
            }
        };
        try {
            // this.beforeChange(); // sure? - almost sure is wrong

            // disconnect inputs
            if (node.inputs) {
                for (let i = 0; i < node.inputs.length; i++) {
                    let slot = node.inputs[i];
                    if (slot.link != null) {
                        cleanup(() => node.disconnectInput(i, {
                            doProcessChange: false
                        }));
                    }
                }
            }

            // disconnect outputs
            if (node.outputs) {
                for (let i = 0; i < node.outputs.length; i++) {
                    let slot = node.outputs[i];
                    if (slot.links != null && slot.links.length) {
                        cleanup(() => node.disconnectOutput(i, false, {
                            doProcessChange: false
                        }));
                    }
                }
            }

            // node.id = -1; //why?

            cleanup(() => node.processCallbackHandlers("onRemoved", {
                def_cb: node.onRemoved,
                on_result: (value) => this._trackCleanup(value)
            }, this));
            if (node.subgraph) this._trackCleanup(node.subgraph.whenIdle());
            node.graph = null;
            node._waiting_actions = [];

            // remove from canvas render
            if (this.list_of_graphcanvas) {
                for (let i = 0; i < this.list_of_graphcanvas.length; ++i) {
                    let canvas = this.list_of_graphcanvas[i];
                    if (canvas.selected_nodes[node.id]) {
                        delete canvas.selected_nodes[node.id];
                    }
                    if (canvas.node_dragged == node) {
                        canvas.node_dragged = null;
                    }
                }
            }

            // remove from containers
            var pos = this._nodes.indexOf(node);
            if (pos != -1) {
                this._nodes.splice(pos, 1);
            }
            delete this._nodes_by_id[node.id];
            this._notifyReadinessChange();

            this.updateExecutionOrder();
            cleanup(() => this.processCallbackHandlers("onNodeRemoved", {
                def_cb: this.onNodeRemoved
            }, node));

            cleanup(() => this.onGraphChanged({
                action: "nodeRemove"
            }));
            cleanup(() => this._emit("node-removed", {
                node
            }));

            // close panels
            cleanup(() => this.sendActionToCanvas("checkPanels"));

            cleanup(() => this.setDirtyCanvas(true, true));
            cleanup(() => this.change());

            if (errors.length === 1) throw errors[0];
            if (errors.length) throw new AggregateError(errors, "Node removal failed");
        } finally {
            this._removingNodes.delete(node);
        }
    }

    /**
     * Returns a node by its id.
     * @method getNodeById
     * @param {Number} id
     */
    getNodeById(id) {
        if (id == null) {
            return null;
        }
        return this._nodes_by_id[id];
    }

    /**
     * Returns a list of nodes that matches a class
     * @method findNodesByClass
     * @param {Class} classObject the class itself (not an string)
     * @return {Array} a list with all the nodes of this type
     */
    findNodesByClass(classObject, result = []) {
        result = this._nodes.filter((node) => node.constructor === classObject);
        return result;
    }

    /**
     * Returns a list of nodes that matches a type
     * @method findNodesByType
     * @param {String} type the name of the node type
     * @return {Array} a list with all the nodes of this type
     */
    findNodesByType(type, result = []) {
        const lowerCaseType = type.toLowerCase();
        result = this._nodes.filter((node) => node.type.toLowerCase() === lowerCaseType);
        return result;
    }

    /**
     * Returns the first node that matches a name in its title
     * @method findNodeByTitle
     * @param {String} name the name of the node to search
     * @return {Node} the node or null
     */
    findNodeByTitle(title) {
        return this._nodes.find((node) => node.title === title) ?? null;
    }

    /**
     * Returns a list of nodes that matches a name
     * @method findNodesByTitle
     * @param {String} name the name of the node to search
     * @return {Array} a list with all the nodes with this name
     */
    findNodesByTitle(title) {
        return this._nodes.filter((node) => node.title === title);
    }

    /**
     * Returns the top-most node in this position of the canvas
     * @method getNodeOnPos
     * @param {number} x the x coordinate in canvas space
     * @param {number} y the y coordinate in canvas space
     * @param {Array} nodes_list a list with all the nodes to search from, by default is all the nodes in the graph
     * @return {LiteGraph.LGraphNode} the node at this position or null
     */
    getNodeOnPos(x, y, nodes_list = this._nodes, margin = 0) {
        // last drawn is top-most; findLast, because reverse() would flip the caller's list
        return nodes_list?.findLast((node) => node.isPointInside(x, y, margin)) ?? null;
    }

    /**
     * Returns the y closest group enclosing a position
     * @method getGroupOnPos
     * @param {number} x the x coordinate in canvas space
     * @param {number} y the y coordinate in canvas space
     * @return {LiteGraph.LGraphGroup} the group or null
     */
    getGroupOnPos(x, y) {
        // let firstGroupMatching = this._groups.find((group) => group.isPointInside(x, y, 2, true)) ?? null;
        let aMatchingGroups = this._groups.filter((group, index) => {
            return group.isPointInside(x, y, 2, true); // ?? null;
        });
        if (!aMatchingGroups.length) return null;
        LiteGraph.log_verbose("lgraph", "getGroupOnPos", "matching groups by x,y", x, y, aMatchingGroups);
        // numeric comparator: a boolean result leaves the order engine-dependent
        let aSortedByYDistance = aMatchingGroups.sort((a, b) => Math.abs(a._pos[1] - y) - Math.abs(b._pos[1] - y));
        LiteGraph.log_verbose("lgraph", "getGroupOnPos", "sorted groups y distance", aSortedByYDistance);
        return aSortedByYDistance[0];
    }

    /**
     * Checks that the node type matches the node type registered, used when replacing a nodetype by a newer version during execution
     * this replaces the ones using the old version with the new version
     * @method checkNodeTypes
     */
    checkNodeTypes() {
        for (var i = 0; i < this._nodes.length; i++) {
            var node = this._nodes[i];
            var ctor = LiteGraph.registered_node_types[node.type];
            if (node.constructor == ctor) {
                continue;
            }
            LiteGraph.log_debug("lgraph", "checkNodeTypes", "node being replaced by newer version", node.type);
            var newnode = LiteGraph.createNode(node.type);
            this._nodes[i] = newnode;
            newnode.configure(node.serialize());
            newnode.graph = this;
            this._nodes_by_id[newnode.id] = newnode;
            if (node.inputs) {
                newnode.inputs = node.inputs.concat();
            }
            if (node.outputs) {
                newnode.outputs = node.outputs.concat();
            }
        }
        this.updateExecutionOrder();
    }

    /**
     * Executes an action on the GraphInput nodes based on the provided action name and parameters.
     * @param {string} action - The name of the action to be executed on the GraphInput nodes.
     * @param {any} param - The parameter to pass to the action method.
     * @param {object} options - Additional options for the action.
     */
    onAction(action, param, options) {
        this._input_nodes = this.findNodesByClass(
            LiteGraph.GraphInput,
            this._input_nodes,
        );
        LiteGraph.log_debug("lgraph", "onAction", "will trigger actionDo on input nodes", this._input_nodes, "with name(?!)", ...arguments);
        for (var i = 0; i < this._input_nodes.length; ++i) {
            var node = this._input_nodes[i];
            if (node.properties.name != action) {
                continue;
            }
            // wrap node.onAction(action, param);
            LiteGraph.log_debug("lgraph", "onAction", node, "node actionDo", ...arguments);
            node.actionDo(action, param, options);
            break;
        }
    }

    // TODO check this, investigate, _last_trigger_time ? who calls trigger ? who calls triggerInput ? who calls onTrigger ?
    trigger(action, param, options) {
        LiteGraph.log_debug("lgraph", "trigger", action, param);
        // this.onTrigger?.(action, param);
        this.processCallbackHandlers("onTrigger", {
            def_cb: this.onTrigger
        }, action, param, options);
    }

    /**
     * Tell this graph it has a global graph input of this type
     * @method addGlobalInput
     * @param {String} name
     * @param {String} type
     * @param {*} value [optional]
     */
    addInput(name, type, value) {
        var input = this.inputs[name];
        if (input) {
            // already exist
            return;
        }

        this.beforeChange();
        this.inputs[name] = {
            name: name,
            type: type,
            value: value
        };
        this.onGraphChanged({
            action: "addInput"
        });
        this.afterChange();
        this.processCallbackHandlers("onInputAdded", {
            def_cb: this.onInputAdded
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
    }

    /**
     * Assign a data to the global graph input
     * @method setGlobalInputData
     * @param {String} name
     * @param {*} data
     */
    setInputData(name, data) {
        var input = this.inputs[name];
        if (!input) {
            return;
        }
        input.value = data;
    }

    /**
     * Returns the current value of a global graph input
     * @method getInputData
     * @param {String} name
     * @return {*} the data
     */
    getInputData(name) {
        var input = this.inputs[name];
        if (!input) {
            return null;
        }
        return input.value;
    }

    /**
     * Changes the name of a global graph input
     * @method renameInput
     * @param {String} old_name
     * @param {String} new_name
     */
    renameInput(old_name, name) {
        if (name == old_name) {
            return;
        }

        if (!this.inputs[old_name]) {
            return false;
        }

        if (this.inputs[name]) {
            LiteGraph.log_error("lgraph", "renameInut", "there is already one input with that name");
            return false;
        }

        this.inputs[name] = this.inputs[old_name];
        delete this.inputs[old_name];
        this.onGraphChanged({
            action: "renameInput"
        });

        this.processCallbackHandlers("onInputRenamed", {
            def_cb: this.onInputRenamed
        }, old_name, name);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
    }

    /**
     * Changes the type of a global graph input
     * @method changeInputType
     * @param {String} name
     * @param {String} type
     */
    changeInputType(name, type) {
        if (!this.inputs[name]) {
            return false;
        }

        if (
            this.inputs[name].type &&
            String(this.inputs[name].type).toLowerCase() ==
            String(type).toLowerCase()
        ) {
            return;
        }

        this.inputs[name].type = type;
        this.onGraphChanged({
            action: "changeInputType"
        });
        this.processCallbackHandlers("onInputTypeChanged", {
            def_cb: this.onInputTypeChanged
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
    }

    /**
     * Removes a global graph input
     * @method removeInput
     * @param {String} name
     * @param {String} type
     */
    removeInput(name) {
        if (!this.inputs[name]) {
            return false;
        }

        delete this.inputs[name];
        this.onGraphChanged({
            action: "graphRemoveInput"
        });

        this.processCallbackHandlers("onInputRemoved", {
            def_cb: this.onInputRemoved
        }, name);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
        return true;
    }

    /**
     * Creates a global graph output
     * @method addOutput
     * @param {String} name
     * @param {String} type
     * @param {*} value
     */
    addOutput(name, type, value) {
        this.outputs[name] = {
            name: name,
            type: type,
            value: value
        };
        this.onGraphChanged({
            action: "addOutput"
        });

        this.processCallbackHandlers("onOutputAdded", {
            def_cb: this.onOutputAdded
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
    }

    /**
     * Assign a data to the global output
     * @method setOutputData
     * @param {String} name
     * @param {String} value
     */
    setOutputData(name, value) {
        var output = this.outputs[name];
        if (!output) {
            return;
        }
        output.value = value;
    }

    /**
     * Returns the current value of a global graph output
     * @method getOutputData
     * @param {String} name
     * @return {*} the data
     */
    getOutputData(name) {
        var output = this.outputs[name];
        if (!output) {
            return null;
        }
        return output.value;
    }

    /**
     * Renames a global graph output
     * @method renameOutput
     * @param {String} old_name
     * @param {String} new_name
     */
    renameOutput(old_name, name) {
        if (!this.outputs[old_name]) {
            return false;
        }

        if (this.outputs[name]) {
            LiteGraph.log_error("lgraph", "renameOutput", "there is already one output with that name");
            return false;
        }

        this.outputs[name] = this.outputs[old_name];
        delete this.outputs[old_name];
        this._version++;

        this.processCallbackHandlers("onOutputRenamed", {
            def_cb: this.onOutputRenamed
        }, old_name, name);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
    }

    /**
     * Changes the type of a global graph output
     * @method changeOutputType
     * @param {String} name
     * @param {String} type
     */
    changeOutputType(name, type) {
        if (!this.outputs[name]) {
            return false;
        }

        if (
            this.outputs[name].type &&
            String(this.outputs[name].type).toLowerCase() ==
            String(type).toLowerCase()
        ) {
            return;
        }

        this.outputs[name].type = type;
        this.onGraphChanged({
            action: "changeOutputType"
        });
        this.processCallbackHandlers("onOutputTypeChanged", {
            def_cb: this.onOutputTypeChanged
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
    }

    /**
     * Removes a global graph output
     * @method removeOutput
     * @param {String} name
     */
    removeOutput(name) {
        if (!this.outputs[name]) {
            return false;
        }
        delete this.outputs[name];
        this.onGraphChanged({
            action: "removeOutput"
        });

        this.processCallbackHandlers("onOutputRemoved", {
            def_cb: this.onOutputRemoved
        }, name);
        this.processCallbackHandlers("onInputsOutputsChange", {
            def_cb: this.onInputsOutputsChange
        });
        return true;
    }

    /**
     * Triggers the 'onTrigger' method on nodes with a specific title by passing a value to them.
     * // TODO check this, investigate, _last_trigger_time ? who calls triggerInput ? who calls onTrigger ?
     * @param {string} name - The title of the nodes to trigger.
     * @param {any} value - The value to pass to the 'onTrigger' method of the nodes.
     */
    triggerInput(name, value) {
        var nodes = this.findNodesByTitle(name);
        for (var i = 0; i < nodes.length; ++i) {
            nodes[i].onTrigger(value);
        }
    }

    /**
     * Sets a callback function on nodes with a specific title by invoking their 'setTrigger' method.
     * // TODO check this, investigate, who calls setCallback, setTrigger, onTrigger ?
     * @param {string} name - The title of the nodes to set the callback function on.
     * @param {Function} func - The callback function to be set on the nodes.
     */
    setCallback(name, func) {
        var nodes = this.findNodesByTitle(name);
        for (var i = 0; i < nodes.length; ++i) {
            nodes[i].setTrigger(func);
        }
    }

    /**
     * Executes actions before a change with the provided information detail.
     * Calls the 'onBeforeChange' function on the class instance and sends the action to connected GraphCanvas instances.
     * @param {object} info - The information detail about the change.
     */
    beforeChange(info) {
        this.processCallbackHandlers("onBeforeChange", {
            def_cb: this.onBeforeChange
        }, this, info);
        this.sendActionToCanvas("onBeforeChange", this);
    }

    /**
     * Starts (or nests) a transaction: every saved change until the matching commit is
     * recorded as one history entry and one revision.
     * @param {string} [label] - history action name of the outermost transaction
     * @returns {number} nesting depth
     */
    beginTransaction(label = "transaction") {
        if (!this._transaction) {
            this._transaction = {
                depth: 0,
                label,
                changed: false
            };
        }
        return ++this._transaction.depth;
    }

    /**
     * Ends the innermost transaction; the outermost one records its changes once.
     * @returns {boolean} true when the outermost transaction ended with changes
     */
    commitTransaction() {
        const transaction = this._transaction;
        if (!transaction) {
            LiteGraph.log_warn("lgraph", "commitTransaction", "no transaction in progress");
            return false;
        }
        if (--transaction.depth > 0) return false;
        this._transaction = null;
        if (transaction.changed) {
            this.onGraphChanged({
                action: transaction.label,
                doSave: true
            });
        }
        return transaction.changed;
    }

    /** true while a transaction is open */
    get isInTransaction() {
        return !!this._transaction;
    }

    /**
     * Runs fn as one transaction (one undo entry). The transaction always ends, even if fn throws.
     * @param {string} label - history action name
     * @param {Function} fn - the changes
     * @param {{rollback?: boolean}} [options] - rollback: on error restore the graph as it was before
     *   (reconfigures the whole graph, so node resources are recreated)
     * @returns {*} fn's result
     */
    transact(label, fn, options = {}) {
        const snapshot = options.rollback && !this._transaction ? this.serialize() : null;
        this.beginTransaction(label);
        try {
            return fn();
        } catch (error) {
            if (snapshot) {
                this._transaction = null;
                const history = this.history;
                this.configure(snapshot);
                this.history = history;
            }
            throw error;
        } finally {
            if (this._transaction) this.commitTransaction();
        }
    }

    /**
     * Executes actions after a change with the provided information detail.
     * Calls the 'onAfterChange' function on the class instance and sends the action to connected GraphCanvas instances.
     * @param {object} info - The information detail about the change.
     */
    afterChange(info) {
        this.processCallbackHandlers("onAfterChange", {
            def_cb: this.onAfterChange
        }, this, info);
        this.sendActionToCanvas("onAfterChange", this);
    }

    /**
     * Handles changes in node connections and triggers related actions.
     * Updates the execution order, calls the 'onConnectionChange' function on the class instance and connected GraphCanvas instances, and increments the version.
     * @param {object} node - The node where the connection change occurred.
     * @param {object} link_info - Information about the changed connection.
     */
    connectionChange(node) {
        this.updateExecutionOrder();
        this.processCallbackHandlers("onConnectionChange", {
            def_cb: this.onConnectionChange
        }, node);
        this.onGraphChanged({
            action: "connectionChange",
            doSave: false
        });
        this.sendActionToCanvas("onConnectionChange");
    }

    /**
     * returns if the graph is in live mode
     * @method isLive
     */
    isLive() {
        if (!this.list_of_graphcanvas) {
            return false;
        }

        for (var i = 0; i < this.list_of_graphcanvas.length; ++i) {
            var c = this.list_of_graphcanvas[i];
            if (c.live_mode) {
                return true;
            }
        }
        return false;
    }

    /**
     * clears the triggered slot animation in all links (stop visual animation)
     * @method clearTriggeredSlots
     */
    clearTriggeredSlots() {
        for (var i in this.links) {
            var link_info = this.links[i];
            if (!link_info) {
                continue;
            }
            link_info._last_time &&= 0;
        }
    }

    /**
     * Indicates a visual change in the graph (not the structure) and triggers related actions.
     * Logs a message if in debug mode, sends a 'setDirty' action with parameters to connected GraphCanvas instances, and calls the 'on_change' function on the class instance.
     * @method change
     */
    change() {
        LiteGraph.log_verbose("lgraph", "change", "Graph visually changed");
        this.sendActionToCanvas("setDirty", [true, true]);
        this.processCallbackHandlers("on_change", { // name refactor ? is this being used ?
            def_cb: this.on_change
        }, this);
    }

    setDirtyCanvas(fg, bg) {
        this.sendActionToCanvas("setDirty", [fg, bg]);
    }

    /**
     * Destroys a link
     * @method removeLink
     * @param {Number} link_id
     */
    removeLink(link_id) {
        var link = this.links[link_id];
        if (!link) {
            return;
        }
        var node = this.getNodeById(link.target_id);
        if (node) {
            this.beforeChange();
            node.disconnectInput(link.target_slot); /* , optsIn */
            this.afterChange();
        }
    }

    /**
     * Turns nodes of this graph into a subgraph node, as one undo step (see Subgraph.buildFromNodes).
     * @param {Array<object>} nodes
     * @returns {object|null} the new subgraph node
     */
    convertToSubgraph(nodes) {
        const selected = (nodes ?? []).filter((node) => node?.graph === this);
        if (!selected.length) return null;
        return this.transact("convertToSubgraph", () => {
            const subgraphNode = LiteGraph.createNode("graph/subgraph");
            this.add(subgraphNode);
            return subgraphNode.buildFromNodes(selected);
        }, {
            rollback: true
        });
    }

    /**
     * Replaces a subgraph node by its contents, as one undo step (see Subgraph.unpack).
     * @returns {Array<object>} the unpacked nodes
     */
    unpackSubgraph(subgraphNode) {
        if (subgraphNode?.graph !== this || typeof subgraphNode.unpack !== "function") return [];
        return this.transact("unpackSubgraph", () => subgraphNode.unpack(), {
            rollback: true
        });
    }

    /**
     * Checks that the link table and the slot references agree, and optionally repairs them.
     * The link table (`graph.links`) is the record of a connection; a slot reference is valid
     * only when the link it names connects that exact node and slot. Checks:
     * - a link whose origin/target node or slot does not exist (removed)
     * - a link the target input does not point back to (removed: the input belongs to another link)
     * - a valid link missing from its origin output's `links` (added back)
     * - an input `link` / output `links` entry naming a missing or mismatched link (cleared)
     * - a link `parentId` naming a missing reroute (cleared)
     * Applies only to this graph (not to nested subgraphs). Repairs bypass history and callbacks.
     * @param {object} [options]
     * @param {boolean} [options.repair=false] fix the problems found
     * @returns {{ok: boolean, repaired: boolean, issues: Array<{kind: string, link_id?: (number|string), node_id?: (number|string), slot?: number}>}}
     */
    validateLinks({
        repair = false
    } = {}) {
        const issues = [];
        const nodeOf = (id) => this.getNodeById(id);
        const remove = new Set();
        for (const key of Object.keys(this.links)) {
            const link = this.links[key];
            if (!link) {
                issues.push({
                    kind: "empty-link-entry",
                    link_id: key
                });
                remove.add(key);
                continue;
            }
            const origin = nodeOf(link.origin_id);
            const target = nodeOf(link.target_id);
            const output = origin?.outputs?.[link.origin_slot];
            const input = target?.inputs?.[link.target_slot];
            if (!origin || !target || !output || !input) {
                issues.push({
                    kind: "dangling-link",
                    link_id: link.id,
                    node_id: !origin ? link.origin_id : link.target_id
                });
                remove.add(key);
                continue;
            }
            if (input.link != link.id) {
                issues.push({
                    kind: "link-not-referenced-by-input",
                    link_id: link.id,
                    node_id: target.id,
                    slot: link.target_slot
                });
                remove.add(key);
                continue;
            }
            if (!output.links?.some((id) => id == link.id)) {
                issues.push({
                    kind: "link-missing-from-output",
                    link_id: link.id,
                    node_id: origin.id,
                    slot: link.origin_slot
                });
                if (repair)(output.links ??= []).push(link.id);
            }
            if (link.parentId !== undefined && this.reroutes && !this.reroutes.has(link.parentId)) {
                issues.push({
                    kind: "missing-reroute",
                    link_id: link.id
                });
                if (repair) delete link.parentId;
            }
        }
        if (repair) {
            for (const key of remove) delete this.links[key];
        }
        // links are keyed by id; anything scheduled for removal no longer counts as valid
        const valid = (id) => {
            const link = this.links[id];
            return link && link.id == id && !remove.has(String(id)) ? link : null;
        };
        for (const node of this._nodes ?? []) {
            node.inputs?.forEach((input, slot) => {
                if (input.link == null) return;
                const link = valid(input.link);
                if (!link || link.target_id != node.id || link.target_slot != slot) {
                    issues.push({
                        kind: "input-references-bad-link",
                        link_id: input.link,
                        node_id: node.id,
                        slot
                    });
                    if (repair) input.link = null;
                }
            });
            node.outputs?.forEach((output, slot) => {
                if (!output.links) return;
                const kept = output.links.filter((id) => {
                    const link = valid(id);
                    const ok = !!link && link.origin_id == node.id && link.origin_slot == slot;
                    if (!ok) issues.push({
                        kind: "output-references-bad-link",
                        link_id: id,
                        node_id: node.id,
                        slot
                    });
                    return ok;
                });
                if (repair && kept.length !== output.links.length) output.links = kept.length ? kept : null;
            });
        }
        if (repair && issues.length) {
            this.setDirtyCanvas?.(true, true);
        }
        return {
            ok: issues.length === 0,
            repaired: repair && issues.length > 0,
            issues
        };
    }

    /**
     * Adds a reroute to a link, as the point nearest the link's target.
     * @param {number[]} pos - graph-space position
     * @param {LLink} [link] - link to route through it
     * @returns {Reroute}
     */
    addReroute(pos, link) {
        const reroute = new Reroute(++this.state.lastRerouteId, pos, link?.parentId);
        this.reroutes.set(reroute.id, reroute);
        if (link) link.parentId = reroute.id;
        this.onGraphChanged({
            action: "rerouteAdd"
        });
        this._emit("reroute-added", {
            reroute,
            link: link ?? null
        });
        this.setDirtyCanvas(true, true);
        return reroute;
    }

    /**
     * Removes a reroute; links and reroutes routed through it reconnect to its parent.
     * @param {number} id
     * @returns {boolean} false if there was no such reroute
     */
    removeReroute(id) {
        const reroute = this.reroutes.get(id);
        if (!reroute) return false;
        for (const link of Object.values(this.links)) {
            if (link && link.parentId === id) {
                if (reroute.parentId === undefined) delete link.parentId;
                else link.parentId = reroute.parentId;
            }
        }
        for (const other of this.reroutes.values()) {
            if (other.parentId === id) {
                if (reroute.parentId === undefined) delete other.parentId;
                else other.parentId = reroute.parentId;
            }
        }
        this.reroutes.delete(id);
        this.onGraphChanged({
            action: "rerouteRemove"
        });
        this._emit("reroute-removed", {
            reroute
        });
        this.setDirtyCanvas(true, true);
        return true;
    }

    /** the reroute at a graph-space position, if any */
    getRerouteOnPos(x, y, radius) {
        for (const reroute of this.reroutes.values()) {
            if (reroute.isPointInside(x, y, radius)) return reroute;
        }
        return null;
    }

    /**
     * Reroutes a link passes through, ordered from origin to target.
     * @param {LLink} link
     * @returns {Reroute[]}
     */
    getRerouteChain(link) {
        const chain = [];
        const seen = new Set();
        let id = link?.parentId;
        while (id !== undefined && id !== null && !seen.has(id)) {
            const reroute = this.reroutes.get(id);
            if (!reroute) break;
            seen.add(id);
            chain.push(reroute);
            id = reroute.parentId;
        }
        return chain.reverse();
    }

    /** reroute id -> ids of the links routed through it (only reroutes in use) */
    getRerouteLinkIds() {
        const used = new Map();
        for (const link of Object.values(this.links)) {
            if (!link) continue;
            for (const reroute of this.getRerouteChain(link)) {
                if (!used.has(reroute.id)) used.set(reroute.id, []);
                used.get(reroute.id).push(link.id);
            }
        }
        return used;
    }

    /** loads reroutes from 0.4 (extra.reroutes + extra.linkExtensions) or version 1 (top-level) documents */
    _configureReroutes(data) {
        this.reroutes = new Map();
        this._floating_reroutes = []; // not modelled (they belong to floatingLinks); written back verbatim
        const extra = data.extra && typeof data.extra === "object" ? data.extra : {};
        const list = Array.isArray(data.reroutes) ? data.reroutes : Array.isArray(extra.reroutes) ? extra.reroutes : [];
        for (const item of list) {
            if (!item || typeof item.id !== "number") continue;
            if (item.floating) {
                this._floating_reroutes.push(LiteGraph.cloneObject(item));
                continue;
            }
            this.reroutes.set(item.id, new Reroute(item.id, item.pos ?? [0, 0], item.parentId));
        }
        for (const ext of Array.isArray(extra.linkExtensions) ? extra.linkExtensions : []) {
            const link = ext && this.links[ext.id];
            if (link && ext.parentId !== undefined) link.parentId = ext.parentId;
        }
        // documents may only list linkIds on reroutes: the link's parent is the listed reroute
        // that no other listing reroute points to (the one nearest the target)
        const listing = new Map();
        for (const item of list) {
            if (!this.reroutes.has(item?.id)) continue;
            for (const linkId of Array.isArray(item.linkIds) ? item.linkIds : []) {
                if (!listing.has(linkId)) listing.set(linkId, []);
                listing.get(linkId).push(item.id);
            }
        }
        for (const [linkId, ids] of listing) {
            const link = this.links[linkId];
            if (!link || link.parentId !== undefined) continue;
            const nearest = ids.filter((id) => !ids.some((other) => this.reroutes.get(other).parentId === id));
            if (nearest.length === 1) link.parentId = nearest[0];
        }
        if (this.reroutes.size || extra.reroutes || extra.linkExtensions) {
            // regenerated by serialize from the model
            this.extra = {
                ...extra
            };
            delete this.extra.reroutes;
            delete this.extra.linkExtensions;
        }
        this.state.lastRerouteId = LGraph._maxNumericId(this.state.lastRerouteId,
            [...this.reroutes.keys(), ...this._floating_reroutes.map((item) => item.id)]);
    }

    /**
     * Creates a Object containing all the info about this graph, it can be serialized
     * @method serialize
     * @return {Object} value of the node
     */
    serialize() {
        const nodesInfo = this._nodes.map((node) => node.serialize());
        // TODO ensure and remove
        // var nodesInfo = [];
        // for (var i = 0, l = this._nodes.length; i < l; ++i) {
        //     nodesInfo.push(this._nodes[i].serialize());
        // }

        // pack link info into a non-verbose format
        var links = [];
        for (var i in this.links) {
            // links is an OBJECT
            var link = this.links[i];
            if (!link.serialize) {
                // weird bug I havent solved yet
                LiteGraph.log_warn("lgraph", "serialize", "weird LLink bug, link info is not a LLink but a regular object");
                var link2 = new LLink();
                for (var j in link) {
                    link2[j] = link[j];
                }
                this.links[i] = link2;
                link = link2;
            }

            links.push(link.serialize());
        }

        const groupsInfo = this._groups.map((group) => group.serialize());
        // TODO ensure and remove
        // var groupsInfo = [];
        // for (var i = 0; i < this._groups.length; ++i) {
        //     groupsInfo.push(this._groups[i].serialize());
        // }

        // fields loaded from a document that this runtime does not model are written back untouched
        var data = LiteGraph.cloneObject(this._foreign_fields ?? {});
        Object.assign(data, {
            id: this.id,
            revision: this.revision,
            last_node_id: this.last_node_id,
            last_link_id: this.last_link_id,
            nodes: nodesInfo,
            links: links,
            groups: groupsInfo,
            config: this.config,
            extra: this._serializeExtra(),
            version: LiteGraph.SERIALIZATION_VERSION, // numeric schema version
            litegraph_version: LiteGraph.VERSION, // library that wrote the document
            state: {
                ...this.state
            }, // all id counters (nodes, links, groups, reroutes)
        });
        this.processCallbackHandlers("onSerialize", {
            def_cb: this.onSerialize
        }, data);

        LiteGraph.log_verbose("lgraph", "serialize", data);

        return data;
    }

    /** extra plus reroutes in the ComfyUI-compatible 0.4 form (only reroutes that links use) */
    _serializeExtra() {
        const used = this.getRerouteLinkIds();
        const floating = this._floating_reroutes ?? [];
        if (!used.size && !floating.length) return this.extra;
        const extra = {
            ...this.extra
        };
        extra.reroutes = [
            ...[...used.keys()].map((id) => this.reroutes.get(id).serialize(used.get(id))),
            ...LiteGraph.cloneObject(floating),
        ].sort((a, b) => a.id - b.id);
        extra.linkExtensions = Object.values(this.links)
            .filter((link) => link && link.parentId !== undefined && used.has(link.parentId))
            .map((link) => ({
                id: link.id,
                parentId: link.parentId
            }));
        return extra;
    }

    /**
     * Configure a graph from a JSON string
     * @method configure
     * @param {String} str configure a graph from a JSON string
     * @param {Boolean} returns if there was any error parsing
     */
    configure(data, keep_old) {
        if (!data) {
            return;
        }
        // listeners may inspect or migrate data, or cancel loading (returns null, graph unchanged)
        if (this._emit("configuring", {
                data,
                keep_old: !!keep_old
            }, {
                cancelable: true
            })?.defaultPrevented) {
            return null;
        }

        if (!keep_old) {
            this.clear();
        }

        var nodes = data.nodes;

        // decode links info (they are very verbose)
        if (data.links && data.links.constructor === Array) {
            var links = [];
            for (var i = 0; i < data.links.length; ++i) {
                var link_data = data.links[i];
                if (!link_data) { // @BUG: "weird bug" originally
                    LiteGraph.log_warn("lgraph", "configure", "serialized graph link data contains errors, skipping.", link_data, i, data.links);
                    continue;
                }
                var link = new LLink();
                link.configure(link_data);
                links[link.id] = link;
            }
            data.links = links;
        }

        // document identity and counters
        if (!keep_old) {
            this.id = typeof data.id === "string" && data.id ? data.id : LiteGraph.uuidv4();
        }
        const loadedState = {
            ...LGraph.createState(),
            ...(data.state && typeof data.state === "object" ? data.state : {})
        };

        // copy all stored fields
        this._foreign_fields = {};
        for (let i in data) {
            if (["nodes", "groups", "id", "revision", "state", "reroutes"].includes(i)) continue; // handled explicitly
            if (!LGraph.serialized_fields.includes(i) && !i.startsWith("_") && !(i in this)) {
                // not part of this runtime's model (e.g. another editor's document state): keep it for serialize
                this._foreign_fields[i] = LiteGraph.cloneObject(data[i]);
            }
            this[i] = data[i]; // TODO should probably use LiteGraph.cloneObject
        }

        var error = false;

        // create nodes
        this._nodes = [];
        if (nodes) {
            for (let i = 0, l = nodes.length; i < l; ++i) {
                var n_info = nodes[i]; // stored info
                var node = LiteGraph.createNode(n_info.type, n_info.title);
                if (!node) {
                    LiteGraph.log_warn("lgraph", "configure", "Node not found or has errors", n_info.type, n_info);

                    // in case of error we create a replacement node to avoid losing info
                    node = new LiteGraph.LGraphNode();
                    node.last_serialization = n_info;
                    node.has_errors = true;
                    error = true;
                    // continue;
                }

                node.id = n_info.id; // id it or it will create a new id
                this.add(node, true, {
                    doProcessChange: false
                }); // add before configure, otherwise configure cannot create links
            }

            // configure nodes afterwards so they can reach each other
            nodes.forEach((n_info) => {
                const node = this.getNodeById(n_info.id);
                node?.configure(n_info);
            });
        }

        // id counters: documents without (or with stale) last_*_id must not reuse ids
        this.state = {
            ...loadedState,
            lastNodeId: LGraph._maxNumericId(Math.max(loadedState.lastNodeId, Number(this.last_node_id) || 0), this._nodes.map((n) => n.id)),
            lastLinkId: LGraph._maxNumericId(Math.max(loadedState.lastLinkId, Number(this.last_link_id) || 0), Object.values(this.links ?? {}).map((l) => l?.id)),
        };

        // groups
        this._groups.length = 0;
        if (data.groups) {
            data.groups.forEach((groupData) => {
                const group = new LiteGraph.LGraphGroup();
                group.configure(groupData);
                this.add(group, true, {
                    doProcessChange: false
                });
            });
        }

        this.updateExecutionOrder();

        this.extra = data.extra ?? {};
        this._configureReroutes(data);
        if (!keep_old || Number.isFinite(data.revision)) {
            this.revision = Number.isFinite(data.revision) ? data.revision : 0;
        }

        this.processCallbackHandlers("onConfigure", {
            def_cb: this.onConfigure
        }, data);

        // TODO implement: when loading (configuring) a whole graph, skip calling graphChanged on every single configure
        if (!data._version) {
            this.onGraphChanged({
                action: "graphConfigure",
                doSave: false
            }); // this._version++;
        } else {
            LiteGraph.log_debug("lgraph", "configure", "skip onGraphChanged when configure passing version too!"); // atlasan DEBUG REMOVE
        }
        this.setDirtyCanvas(true, true);
        this._emit("configured", {
            data,
            error
        });
        return error;
    }

    /**
     * Loads graph data from a given URL or file and configures the graph accordingly.
     * @param {string | File | Blob} url - The URL or file to load the graph data from.
     * @param {Function} callback - An optional callback function to be executed after loading and configuring the graph.
     */
    // @TODO implement Node.JS loading? check string for being a graph
    load(url, callback) {
        var that = this;

        // from file
        if (url.constructor === File || url.constructor === Blob) {
            var reader = new FileReader();
            reader.addEventListener('load', (event) => {
                var data = JSON.parse(event.target.result);
                that.configure(data);
                callback?.();
            });
            reader.readAsText(url);
            return;
        }

        // is a string, then an URL
        var req = new XMLHttpRequest();
        req.open("GET", url, true);
        req.send(null);
        req.onload = (_event) => {
            if (req.status !== 200) {
                LiteGraph.log_error("Error loading graph:", req.status, req.response);
                return;
            }
            var data = JSON.parse(req.response);
            that.configure(data);
            callback?.();
        };
        req.onerror = (err) => {
            LiteGraph.log_error("Error loading graph:", err);
        };
    }

    /**
     * Meant to serve the history-saving mechanism
     * @method onGraphSaved
     * @param {object} optsIn options
     */
    onGraphSaved(optsIn = {}) {
        var optsDef = {};
        var opts = Object.assign(optsDef, optsIn);

        LiteGraph.log_debug("onGraphSaved", opts);

        this.savedVersion = this._version;
    }

    /**
     * Meant to serve the history-saving mechanism
     * @method onGraphSaved
     * @param {object} optsIn options
     */
    onGraphLoaded(optsIn = {}) {
        var optsDef = {};
        var opts = Object.assign(optsDef, optsIn);

        LiteGraph.log_debug("onGraphLoaded", opts);

        this.savedVersion = this._version;
    }

    /**
     * Ment to be track down every change annotating the action, the history and prevent-exit mechanism, call to change _version
     * @method onGraphChanged
     * @param {object} optsIn options
     */
    onGraphChanged(optsIn = {}) {
        var optsDef = {
            action: "",
            doSave: true, // log action in graph.history
            doSaveGraph: true, // save
        };
        var opts = Object.assign(optsDef, optsIn);

        this._version++;
        if (opts.doSave && this._transaction) {
            // recorded once when the outermost transaction commits
            this._transaction.changed = true;
            return;
        }
        if (opts.doSave) {
            this.revision++; // a saved (user-level) change to the document
            this._emit("changed", {
                action: opts.action,
                revision: this.revision
            });
        }

        if (opts.action) {
            LiteGraph.log_debug("Graph change", opts.action);
        } else {
            LiteGraph.log_debug("Graph change, no action", opts);
        }

        // TAG: EXTENSION, COULD extract and MOVE history to feature ?
        if (opts.doSave && LiteGraph.actionHistory_enabled) {

            LiteGraph.log_debug("LG_history", "onGraphChanged couldSAVE :: " + opts.action); // debug history

            var oHistory = {
                actionName: opts.action
            };
            if (opts.doSaveGraph) {
                // this seems a heavy method, but the alternative is way more complex: every action has to have its contrary
                oHistory = Object.assign(oHistory, {
                    graphSave: this.serialize()
                });
                LiteGraph.log_debug("LG_history", "onGraphChanged SAVED", oHistory); // debug history
            }

            let obH = this.history;

            // check if pointer has gone back: remove newest
            while (obH.actionHistoryPtr < obH.actionHistoryVersions.length - 1) {
                LiteGraph.log_debug("LG_history", "popping: gone back? " + (obH.actionHistoryPtr + " < " + (obH.actionHistoryVersions.length - 1))); // debug history
                obH.actionHistoryVersions.pop();
            }
            // check if maximum saves
            if (obH.actionHistoryVersions.length >= LiteGraph.actionHistoryMaxSave) {
                var olderSave = obH.actionHistoryVersions.shift();
                LiteGraph.log_debug("LG_history", "maximum saves reached: " + obH.actionHistoryVersions.length + ", remove older: " + olderSave); // debug history
                obH.actionHistory[olderSave] = false; // unset
            }

            // update pointer
            obH.actionHistoryPtr = obH.actionHistoryVersions.length;
            obH.actionHistoryVersions.push(obH.actionHistoryPtr);

            // save to pointer
            obH.actionHistory[obH.actionHistoryPtr] = oHistory;

            this.onGraphSaved({
                iVersion: obH.actionHistoryPtr
            });

            LiteGraph.log_debug("LG_history", "saved: " + obH.actionHistoryPtr, oHistory.actionName, obH.actionHistoryPtr); // debug history
        }
    }

    /**
     * Go back in action history
     * @method actionHistoryBack
     * @param {object} optsIn options
     */
    actionHistoryBack(optsIn = {}) {
        var optsDef = {
            steps: 1
        };
        var opts = Object.assign(optsDef, optsIn);

        var obH = this.history;

        if (obH.actionHistoryPtr != undefined && obH.actionHistoryPtr >= 0) {
            obH.actionHistoryPtr -= opts.steps;
            LiteGraph.log_debug("LG_history", "step back: " + obH.actionHistoryPtr); // debug history
            if (!this.actionHistoryLoad({
                    iVersion: obH.actionHistoryPtr
                })) {
                LiteGraph.log_warn("LG_history", "Load failed, restore pointer? " + obH.actionHistoryPtr); // debug history
                // history not found?
                obH.actionHistoryPtr += opts.steps;
                return false;
            } else {
                LiteGraph.log_debug("LG_history", "loaded back: " + obH.actionHistoryPtr); // debug history
                LiteGraph.log_debug(this.history);
                return true;
            }
        } else {
            LiteGraph.log_debug("LG_history", "is already at older state");
            return false;
        }
    }

    /**
     * Go forward in action history
     * @method actionHistoryForward
     * @param {object} optsIn options
     */
    actionHistoryForward(optsIn = {}) {
        var optsDef = {
            steps: 1
        };
        var opts = Object.assign(optsDef, optsIn);

        var obH = this.history;

        if (obH.actionHistoryPtr < obH.actionHistoryVersions.length) {
            obH.actionHistoryPtr += opts.steps;
            LiteGraph.log_debug("LG_history", "step forward: " + obH.actionHistoryPtr); // debug history
            if (!this.actionHistoryLoad({
                    iVersion: obH.actionHistoryPtr
                })) {
                LiteGraph.log_warn("LG_history", "Load failed, restore pointer? " + obH.actionHistoryPtr); // debug history
                // history not found?
                obH.actionHistoryPtr -= opts.steps;
                return false;
            } else {
                LiteGraph.log_debug("LG_history", "loaded forward: " + obH.actionHistoryPtr); // debug history
                return true;
            }
        } else {
            LiteGraph.log_debug("LG_history", "is already at newer state");
            return false;
        }
    }

    /**
     * Load from action history
     * @method actionHistoryLoad
     * @param {object} optsIn options
     */
    actionHistoryLoad(optsIn = {}) {
        var optsDef = {
            iVersion: false,
            backStep: false,
        };
        var opts = Object.assign(optsDef, optsIn);

        var obH = this.history;

        if (obH.actionHistory[opts.iVersion] && obH.actionHistory[opts.iVersion].graphSave) {
            var tmpHistory = JSON.stringify(this.history);
            this.configure(obH.actionHistory[opts.iVersion].graphSave);
            this.history = JSON.parse(tmpHistory);
            LiteGraph.log_debug("history loaded: " + opts.iVersion, obH.actionHistory[opts.iVersion].actionName); // debug history
            this.onGraphLoaded({
                iVersion: opts.iVersion
            });
            return true;
        } else {
            return false;
        }
    }

    /**
     * connect TWO nodes looking for matching types
     * @method autoConnectNodes
     **/
    autoConnectNodes(node_from, node_to, optsIn = {}) {
        var optsDef = {
            keep_alredy_connected: true,
        };
        var opts = Object.assign(optsDef, optsIn);

        if (!node_from || !node_to || !node_from.outputs || !node_from.outputs.length || !node_to.inputs || !node_to.inputs.length) {
            return false;
        }
        // cycle outputs
        // for(let iO in node_from.outputs){ // WARNING THIS GETS INDEXES AS STRING : ARE THOSE SAVED AS STRING AND IF SO WHY?
        for (let iO = 0; iO < node_from.outputs.length; iO++) { // TODO: Check if outputs are keyed by string and when
            let output = node_from.outputs[iO];
            if (!opts.keep_alredy_connected) {
                if (output.links !== null && output.links.length > 0) {
                    continue;
                }
            }
            node_from.connectByType(iO, node_to, output.type, {
                preferFreeSlot: true
            });
        }
    }

    updateNodeLinks(node, is_input, slots_from, slots_to) {
        LiteGraph.log_debug("lgraph", "updateNodeLinks", "looking for links", node.id, is_input, slots_from, slots_to)

        // cycle links
        for (var i in this.links) {
            var link_info = this.links[i];
            if (link_info === null || !link_info) {
                continue;
            }
            if (is_input) {
                if (link_info.target_id == node.id) {
                    // found link with target the node
                    if (link_info.target_slot == slots_from) {
                        // found link with target the slot
                        LiteGraph.log_debug("lgraph", "updateNodeLinks", "updating link input", this.links[i], node, is_input, slots_from, slots_to)
                        this.links[i].target_slot = slots_to;
                    }
                }
            } else {
                if (link_info.origin_id == node.id) {
                    // found link with origin the node
                    if (link_info.origin_slot == slots_from) {
                        // found link with origin the slot
                        LiteGraph.log_debug("lgraph", "updateNodeLinks", "updating link output", this.links[i], node, is_input, slots_from, slots_to)
                        this.links[i].origin_slot = slots_to;
                    }
                }
            }
        }

    }
}

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
        this.pixel_ratio = 1; // backing-store pixels per CSS pixel (see resize)
        this.pointer = new CanvasPointer(); // click/drag/double-click state of the primary pointer
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
        this.setCanvas(canvas, options.skip_events);
        this.clear();

        if (!this.skip_render && !options.skip_render) {
            this.startRendering();
        }

        // (the CallbackHandler was created at the top of the constructor; creating it again here
        // would drop every handler registered while constructing)
        LiteGraph.processCallbackHandlers("on_lgraphcanvas_construct", {
            def_cb: LiteGraph.on_lgraphcanvas_construct
        }, this);
        // extensions registered through LiteGraph.registerExtension see every canvas
        LiteGraph.extensions?.attachCanvas(this);
    }

    callbackhandler_setup() {
        this.cb_handler = new CallbackHandler(this);
        // register CallbackHandler methods on this // Should move as class standard class methods?
        // this.registerCallbackHandler = function(){ return this.cb_handler.registerCallbackHandler(...arguments); };
        // this.unregisterCallbackHandler = function(){ return this.cb_handler.unregisterCallbackHandler(...arguments); };
        // this.processCallbackHandlers = function(){ return this.cb_handler.processCallbackHandlers(...arguments); };
    }

    registerCallbackHandler() {
        // if(!this.cb_handler) this.callbackhandler_setup();
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler() {
        // if(!this.cb_handler) this.callbackhandler_setup();
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers() {
        // if(!this.cb_handler) this.callbackhandler_setup();
        return this.cb_handler.processCallbackHandlers(...arguments);
    }

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
        this.dragging_reroute = null;

        this.selected_nodes = {};
        /** selected groups and reroutes (nodes stay in selected_nodes; see selectedItems) */
        this._selected_items = new Set();
        this.selected_group = null;

        this.visible_nodes = [];
        this.node_dragged = null;
        this.node_over = null;
        this.node_capturing_input = null;
        this.linkConnector?.cancel(); // restores links being moved
        this.linkConnector = new LinkConnector(); // link-drag state; connecting_* are accessors over it
        this.clearSlotHighlights();
        this.highlighted_links = {};

        this.dragging_canvas = false;

        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
        this.dirty_area = null;

        // panels show nodes that are gone now
        if (this.canvas && typeof document !== "undefined") this.closePanels();
        this.node_in_panel = null;
        this._endWidgetTransaction();
        this.node_widget = null;

        this.last_mouse = [0, 0];
        this.last_mouseclick = 0;
        this.pointer_is_down = false;
        this.pointer_is_double = false;
        this.visible_area.set([0, 0, 0, 0]);

        // TAG callback graphrenderer event entrypoint
        this.processCallbackHandlers("onClear", {
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
        LiteGraph.log_debug("lgraphcanvas", "setGraph", graph, this);

        // remove the graph stack in case a subgraph was open
        this._graph_stack &&= null;
        this._view_stack &&= null;
        this.setDirty(true, true);
    }

    /**
     * returns the top level graph (in case there are subgraphs open on the canvas)
     *
     * @method getTopGraph
     * @return {LGraph} graph
     */
    getTopGraph() {
        if (this._graph_stack?.length)
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
            // remember the parent view, restored by closeSubgraph
            this._view_stack ||= [];
            this._view_stack[this._graph_stack.length - 1] = {
                offset: [...this.ds.offset],
                scale: this.ds.scale
            };
        }

        var prev_graph = this.graph;
        var cbRet = this.processCallbackHandlers("onOpenSubgraph", {
            def_cb: this.onOpenSubgraph
        }, graph, prev_graph);

        graph.attachCanvas(this);
        this.checkPanels();

        this.setDirty(true, true);
        this._emit("subgraph-opened", {
            graph,
            parent: prev_graph
        });
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
        var saved_view = this._view_stack?.[this._graph_stack.length];
        if (this._view_stack) this._view_stack.length = this._graph_stack.length;
        this.selected_nodes = {};
        this.highlighted_links = {};

        var cbRet = this.processCallbackHandlers("onCloseSubgraph", {
            def_cb: this.onCloseSubgraph
        }, graph, prev_graph, subgraph_node);

        graph.attachCanvas(this);
        this.setDirty(true, true);
        if (saved_view) {
            // back to where the user was before opening the subgraph
            this.ds.offset = [...saved_view.offset];
            this.ds.scale = saved_view.scale;
        } else if (subgraph_node) {
            this.centerOnNode(subgraph_node);
        }
        if (subgraph_node) {
            this.selectNodes([subgraph_node]);
        }
        this._emit("subgraph-closed", {
            graph,
            subgraph: prev_graph,
            node: subgraph_node ?? null
        });
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

        if (this.canvas) {
            // listeners belong to the old element: detach them before switching (or detaching)
            if (this._events_binded) {
                this.unbindEvents();
            }
            if (this.canvas.data === this) {
                delete this.canvas.data;
            }
        }

        this.canvas = canvas;
        this.ds.element = canvas;

        if (!canvas) {
            return;
        }

        // this.canvas.tabindex = "1000";
        canvas.classList.add("lgraphcanvas");
        canvas.data = this;
        // focusable, to receive key events (a <canvas> is not focusable by default)
        if (!canvas.hasAttribute?.("tabindex")) {
            canvas.tabIndex = 0;
        }

        // bg canvas: used for non changing stuff
        this.bgcanvas = document.createElement("canvas");
        this.bgcanvas.width = this.canvas.width;
        this.bgcanvas.height = this.canvas.height;

        if (canvas.getContext == null) {
            if (canvas.localName != "canvas") {
                throw new Error("Element supplied for LGraphCanvas must be a <canvas> element, you passed a " + canvas.localName);
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
        LiteGraph.log_verbose("pointerevents: _doNothing " + e.type);
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
        this._pointercancel_callback = this.processPointerCancel.bind(this);
        canvas.addEventListener("pointercancel", this._pointercancel_callback);
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
        canvas.removeEventListener("pointercancel", this._pointercancel_callback);
        this._restoreDocumentPointerListeners();
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

    /**
     * Typed canvas events: link-dropped-on-empty (cancelable: skip the default menu),
     * subgraph-opened, subgraph-closed, selection-changed, disposed. See LGraphEventTarget.
     */
    get events() {
        return this._events ??= new LGraphEventTarget(this, (error, event) =>
            LiteGraph.log_error("lgraphcanvas", "event listener failed", event.type, error));
    }

    _emit(type, detail, options) {
        return this._events?.has(type) ? this._events.dispatch(type, detail, options) : null;
    }

    // link-drag state, kept as fields for compatibility (see LinkConnector)
    get connecting_node() {
        return this.linkConnector?.node ?? null;
    }
    set connecting_node(value) {
        (this.linkConnector ??= new LinkConnector()).node = value;
    }
    get connecting_output() {
        return this.linkConnector?.output ?? null;
    }
    set connecting_output(value) {
        (this.linkConnector ??= new LinkConnector()).output = value;
    }
    get connecting_input() {
        return this.linkConnector?.input ?? null;
    }
    set connecting_input(value) {
        (this.linkConnector ??= new LinkConnector()).input = value;
    }
    get connecting_slot() {
        return this.linkConnector?.slot ?? -1;
    }
    set connecting_slot(value) {
        (this.linkConnector ??= new LinkConnector()).slot = value;
    }
    get connecting_pos() {
        return this.linkConnector?.pos ?? null;
    }
    set connecting_pos(value) {
        (this.linkConnector ??= new LinkConnector()).pos = value;
    }
    /** legacy multi-link move descriptor: {inputs: [{node, slot}]} or false */
    get connecting() {
        const inputs = this.linkConnector?.movingInputs;
        return inputs ? {
            inputs
        } : false;
    }
    set connecting(value) {
        (this.linkConnector ??= new LinkConnector()).movingInputs = value?.inputs ?? null;
    }

    /**
     * Resolves a node shape setting (shape constant or name) to a shape constant.
     * @param {number|string} shape - e.g. LiteGraph.BOX_SHAPE or "box"
     * @param {number} fallback - returned for unknown values
     */
    static resolveShape(shape, fallback) {
        if (typeof shape === "number" && shape > 0) return shape;
        const named = {
            box: LiteGraph.BOX_SHAPE,
            round: LiteGraph.ROUND_SHAPE,
            circle: LiteGraph.CIRCLE_SHAPE,
            card: LiteGraph.CARD_SHAPE,
        } [shape];
        return named ?? fallback;
    }

    /**
     * Clamps a number to a widget's optional min/max range.
     * @param {number} value
     * @param {{min?: number, max?: number}} [options]
     */
    static clampWidgetNumber(value, options) {
        if (options?.min != null && value < options.min) value = options.min;
        if (options?.max != null && value > options.max) value = options.max;
        return value;
    }

    static getFileExtension(url) {
        // const urlObj = new URL(url);
        // const path = urlObj.pathname;
        // const lastDotIndex = path.lastIndexOf(".");
        // if (lastDotIndex === -1) return "";
        // return path.slice(lastDotIndex + 1).toLowerCase();
        url = url ? url + "" : "";
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
        // each start gets its own loop token, so a stop followed by a quick restart
        // cannot leave the previous animation-frame chain running alongside the new one
        const loop = this._render_loop = {};
        renderFrame.call(this);

        function renderFrame() {
            if (this._render_loop !== loop || !this.is_rendering) {
                return;
            }
            if (!this.pause_rendering) {
                this.draw();
            }

            var window = this.getCanvasWindow();
            if (this.is_rendering && this._render_loop === loop) {
                this._render_frame_window = window;
                this._render_frame_id = window.requestAnimationFrame(renderFrame.bind(this));
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
        this._render_loop = null;
        if (this._render_frame_id != null) {
            this._render_frame_window?.cancelAnimationFrame?.(this._render_frame_id);
            this._render_frame_id = null;
            this._render_frame_window = null;
        }
        /*
    if(this.rendering_timer_id)
    {
        clearInterval(this.rendering_timer_id);
        this.rendering_timer_id = null;
    }
    */
    }

    /**
     * Releases everything this canvas holds: stops the render loop, closes panels and the
     * search box, detaches the graph and unbinds all DOM listeners. The instance must not be
     * used afterwards. Safe to call more than once.
     * @method dispose
     */
    dispose() {
        if (this._disposed) {
            return;
        }
        this.stopRendering();
        if (this.canvas && typeof document !== "undefined") {
            this.closePanels?.();
            this.search_box?.close?.();
        }
        this._emit("disposed", {
            canvas: this
        });
        if (this.graph) {
            this.setGraph(null, true);
        }
        this.setCanvas(null);
        this._graph_stack = null;
        this._view_stack = null;
        this.bgcanvas = null;
        this.bgctx = null;
        this.ctx = null;
        this.visible_nodes = [];
        this._disposed = true;
        if (LGraphCanvas.active_canvas === this) {
            LGraphCanvas.active_canvas = null;
        }
    }

    /** Commits the transaction opened for a widget gesture (see processMouseDown), if any. */
    _endWidgetTransaction() {
        const graph = this._widget_transaction;
        this._widget_transaction = null;
        if (graph?.isInTransaction) {
            graph.commitTransaction();
        }
    }

    /* LiteGraphCanvas input */

    // used to block future mouse events (because of im gui)
    blockClick() {
        this.block_click = true;
        this.last_mouseclick = 0;
    }

    processUserInputDown(e) {

        if (this.pointer_is_down && e.isPrimary !== undefined && !e.isPrimary) {
            this.userInput_isNotPrimary = true;
            // DBG("pointerevents: userInput_isNotPrimary start");
            LiteGraph.log_debug("lgraphcanvas", "processUserInputDown", "userInput_isNotPrimary", e);
        } else {
            this.userInput_isNotPrimary = false;
        }

        this.userInput_type = e.pointerType ? e.pointerType : false;
        this.userInput_id = e.pointerId ? e.pointerId : false;

        if (e.pointerType) {
            switch (e.pointerType) {
                case "mouse":
                    break;
                case "pen":
                    break;
                case "touch":
                    break;
                default:
                    LiteGraph.log_debug("pointerType unknown " + e.pointerType);
            }
        }

        if (e.button !== undefined) {
            this.userInput_button = e.button;
            LiteGraph.log_verbose("input button ", e.button);
            switch (e.button) {
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
            LiteGraph.log_verbose("input button_S ", e.buttons);
        }

        this.userInput_touches = (e.changedTouches !== undefined && e.changedTouches.length !== undefined) ? e.changedTouches : false;
        if (this.userInput_touches && this.userInput_touches.length) {
            LiteGraph.log_debug("check multiTouches", e.changedTouches);
        }

        return this.processMouseDown(e);
    }

    processMouseDown(e) {

        if (this.set_canvas_dirty_on_mouse_event)
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
        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "pointerId:" + e.pointerId + " which:" + e.which + " isPrimary:" + e.isPrimary + " :: x y " + x + " " + y, "previousClick", this.last_mouseclick, "diffTimeClick", (this.last_mouseclick ? LiteGraph.getTime() - this.last_mouseclick : "notlast"), "userInput_isNotPrimary", this.userInput_isNotPrimary);
        LiteGraph.log_verbose("coordinates", x, y, this.viewport, "canvas coordinates", e.canvasX, e.canvasY);

        this.ds.viewport = this.viewport;
        var is_inside = !this.viewport || (this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]));

        // move mouse move event to the window in case it drags outside of the canvas
        if (!this.options.skip_events) {
            this.canvas.removeEventListener("pointermove", this._mousemove_callback);
            ref_window.document.addEventListener("pointermove", this._mousemove_callback, true); // catch for the entire window
            ref_window.document.addEventListener("pointerup", this._mouseup_callback, true);
            ref_window.document.addEventListener("pointercancel", this._pointercancel_callback, true);
            this._pointer_document = ref_window.document;
        }

        if (!is_inside) {
            return;
        }

        var node = this.graph.getNodeOnPos(e.canvasX, e.canvasY, this.visible_nodes, 5);
        var skip_action = false;
        var now = LiteGraph.getTime();
        var is_primary = (e.isPrimary === undefined || e.isPrimary);
        // double click: two clicks (not drags) close in time and space
        var is_double_click = is_primary && this.pointer.down(e, now).isDoubleClick;
        this.mouse[0] = e.clientX;
        this.mouse[1] = e.clientY;
        this.graph_mouse[0] = e.canvasX;
        this.graph_mouse[1] = e.canvasY;
        this.last_click_position = [this.mouse[0], this.mouse[1]];

        if (this.pointer_is_down && is_primary) {
            this.pointer_is_double = true;
            LiteGraph.log_verbose("pointerevents: pointer_is_double start");
        } else {
            this.pointer_is_double = false;
        }
        this.pointer_is_down = true;
        this.canvas.focus();

        LiteGraph.ContextMenuClass.closeAll(ref_window);

        // if (this.onMouse?.(e))
        //     return;

        // TAG callback graphrenderer event entrypoint
        var cbRet = this.processCallbackHandlers("onClear", {
            def_cb: this.onMouse
        }, e);
        if ((typeof(cbRet) != "undefined" && cbRet !== null) && (cbRet === false || (typeof(cbRet) == "object" && cbRet.return_value === false))) {
            LiteGraph.log_info("lgraphcanvas", "processMouseDown", "callback prevents continue");
            return;
        }

        // left button mouse / single finger
        if (e.which == 1 && !this.userInput_isNotPrimary) {

            if (e.ctrlKey) {
                LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "starting box selection");
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
                    this.graph.add(cloned, false, {
                        doCalcSize: false
                    });
                    node = cloned;

                    if (LiteGraph.alt_shift_drag_connect_clone_with_input && e.shiftKey) {
                        // process links
                        LiteGraph.log_verbose("lgraphcanvas", "processMouseDown", "altCloned", original_node, node);
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
                                    LiteGraph.log_warn("lgraphcanvas", "processMouseDown", "not graph link info for input", input, original_node);
                                    continue;
                                }
                                if (ob_link.type === LiteGraph.EVENT) {
                                    // TODO put a sequencer in the middle or implement multi input
                                    LiteGraph.log_info("lgraphcanvas", "processMouseDown", "alt drag cloning", "skip moving events", input);
                                    continue;
                                }
                                var source_node;
                                if (ob_link.origin_id) {
                                    source_node = this.graph.getNodeById(ob_link.origin_id);
                                }
                                var target_node = node;
                                if (source_node && target_node) {
                                    LiteGraph.log_verbose("lgraphcanvas", "processMouseDown", "alt drag cloning", "connect newly created", source_node, target_node, ob_link);
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
                if (this.allow_interaction && !this.connecting_node && !node.flags.collapsed && !this.live_mode) {
                    // Search for corner for resize
                    if (!skip_action &&
                        node.resizable !== false && !node.flags.pinned &&
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
                            for (let i = 0, l = node.outputs.length; i < l; ++i) {
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
                                    this.linkConnector.startFromOutput(node, i);
                                    LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on output slot", node, output);

                                    if (LiteGraph.shift_click_do_break_link_from) {
                                        // break with shift
                                        if (e.shiftKey) {
                                            node.disconnectOutput(i);
                                        }
                                    } else {
                                        // move with shift: detach every link of this output and drag them together
                                        if (e.shiftKey && this.linkConnector.moveOutputLinks(node, i)) {
                                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "moving links source slot", this.linkConnector.movingInputs);
                                            this.dirty_bgcanvas = true;
                                            skip_action = true;
                                        }
                                    }

                                    if (is_double_click) {
                                        // TAG callback node event entrypoint
                                        node.processCallbackHandlers("onOutputDblClick", {
                                            def_cb: node.onOutputDblClick
                                        }, i, e);
                                    } else {
                                        // TAG callback node event entrypoint
                                        node.processCallbackHandlers("onOutputClick", {
                                            def_cb: node.onOutputClick
                                        }, i, e);
                                    }

                                    skip_action = true;
                                    break;
                                }
                            }
                        }

                        // search for inputs
                        if (node.inputs) {
                            for (let i = 0, l = node.inputs.length; i < l; ++i) {
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
                                        node.processCallbackHandlers("onInputDblClick", {
                                            def_cb: node.onInputDblClick
                                        }, i, e);
                                    } else {
                                        // TAG callback node event entrypoint
                                        node.processCallbackHandlers("onInputClick", {
                                            def_cb: node.onInputClick
                                        }, i, e);
                                    }

                                    if (input.link !== null) {
                                        var link_info = this.graph.links[
                                            input.link
                                        ]; // before disconnecting
                                        if (LiteGraph.click_do_break_link_to) {
                                            node.disconnectInput(i);
                                            this.dirty_bgcanvas = true;
                                            skip_action = true;
                                        } else {
                                            // do same action as has not node ?
                                        }

                                        if (
                                            // this.allow_reconnect_links ||
                                            // this.move_destination_link_without_shift ||
                                            e.shiftKey
                                        ) {
                                            if (!LiteGraph.click_do_break_link_to) {
                                                // detach and drag it from its origin; cancelling restores it
                                                this.linkConnector.moveInputLink(node, i);
                                            } else if (this.graph._nodes_by_id[link_info.origin_id]) {
                                                this.linkConnector.startFromOutput(this.graph._nodes_by_id[link_info.origin_id], link_info.origin_slot);
                                            }
                                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "moving link destination slot", this.connecting_node, this.connecting_slot, this.connecting_output, this.connecting_pos);
                                            this.dirty_bgcanvas = true;
                                            skip_action = true;
                                        }


                                    } else {
                                        // has not node
                                    }

                                    if (!skip_action) {
                                        // connect from in to out, from to to from
                                        this.linkConnector.startFromInput(node, i);

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

                    // widgets: a whole widget gesture (click, or drag until pointer up) is one undo step
                    const widgetGraph = this.graph;
                    widgetGraph.beginTransaction("widgetChanged");
                    var widget;
                    try {
                        widget = this.processNodeWidgets(node, this.graph_mouse, e);
                    } catch (error) {
                        widgetGraph.commitTransaction();
                        throw error;
                    }
                    if (widget) {
                        block_drag_node = true;
                        this.node_widget = [node, widget];
                        this._widget_transaction = widgetGraph;
                    } else {
                        widgetGraph.commitTransaction();
                    }

                    let cbRet = null;

                    // double clicking
                    if (this.allow_interaction && is_double_click && this.selected_nodes[node.id]) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "double clicked on node", node);
                        // TAG callback node event entrypoint
                        cbRet = node.processCallbackHandlers("onDblClick", {
                            def_cb: node.onDblClick
                        }, e, pos, this);
                        if (cbRet !== null && (cbRet === true || (typeof(cbRet) == "object" && cbRet.return_value))) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "dragging blocked by onDblClick", cbRet);
                        } else {
                            this.processNodeDblClicked(node);
                        }
                        block_drag_node = true;
                    }

                    // TAG callback node event entrypoint
                    cbRet = node.processCallbackHandlers("onMouseDown", {
                        def_cb: node.onMouseDown
                    }, e, pos, this);

                    // if do not capture mouse
                    if (cbRet !== null && (cbRet === true || (typeof(cbRet) == "object" && cbRet.return_value))) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "dragging blocked by onMouseDownCbRet", cbRet);
                        block_drag_node = true;
                    } else {
                        // open subgraph button
                        if (node.subgraph && !node.skip_subgraph_button) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on subgraph");
                            if (!node.flags.collapsed && pos[0] > node.size[0] - LiteGraph.NODE_TITLE_HEIGHT && pos[1] < 0) {
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
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "started dragging", node);
                            this.graph.beforeChange();
                            this.node_dragged = node;
                        }
                        this.processNodeSelected(node, e);
                    } else {
                        /**
                         * Don't call the function if the block is already selected.
                         * Otherwise, it could cause the block to be unselected while its panel is open.
                         */
                        if (!node.is_selected) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "node selected", node);
                            this.processNodeSelected(node, e);
                        }
                    }

                    this.dirty_canvas = true;
                }
            } else { // clicked outside of nodes
                LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked outside nodes");

                // reroutes: drag them, double click removes
                const reroute = !skip_action && !this.read_only ? this.graph.getRerouteOnPos?.(e.canvasX, e.canvasY) : null;
                if (reroute) {
                    if (is_double_click) {
                        this.graph.removeReroute(reroute.id);
                    } else {
                        this.selectItem(reroute, e.shiftKey || e.ctrlKey);
                        this._dragRerouteGesture(reroute);
                    }
                    skip_action = true;
                }

                if (!skip_action) {

                    // search for mouseDown on LINKS
                    if (!this.read_only) {
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
                            LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on link", link);
                            // link clicked
                            this.showLinkMenu(link, e);
                            this.over_link_center = null; // clear tooltip
                            break;
                        }
                    }

                    // search for mouseDown on GROUPS
                    this.selected_group = this.graph.getGroupOnPos(e.canvasX, e.canvasY);
                    this.selected_group_resizing = false;
                    if (this.selected_group && !this.read_only) {
                        LiteGraph.log_debug("lgraphcanvas", "processMouseDown", "clicked on group", link);
                        if (e.ctrlKey) {
                            this.dragging_rectangle = null;
                        }

                        // clicking the title band selects the group (shift/ctrl adds to the selection)
                        const title_height = (this.selected_group.font_size ?? LiteGraph.DEFAULT_GROUP_FONT ?? 24) * 1.4;
                        if (e.canvasY < this.selected_group.pos[1] + title_height) {
                            this.selectItem(this.selected_group, e.shiftKey || e.ctrlKey);
                        }

                        var dist = LiteGraph.distance([e.canvasX, e.canvasY], [this.selected_group.pos[0] + this.selected_group.size[0], this.selected_group.pos[1] + this.selected_group.size[1]]);
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

                    LiteGraph.log_debug("DEBUG canvas click is_double_click,this.allow_searchbox", is_double_click, this.allow_searchbox);
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
                            for (let i = 0, l = node.outputs.length; i < l; ++i) {
                                var output = node.outputs[i];
                                let link_pos = node.getConnectionPos(false, i);
                                if (LiteGraph.isInsideRectangle(e.canvasX, e.canvasY, link_pos[0] - 15, link_pos[1] - 10, 30, 20)) {
                                    mClikSlot = output;
                                    mClikSlot_index = i;
                                    mClikSlot_isOut = true;
                                    break;
                                }
                            }
                        }

                        // search for inputs
                        if (node.inputs) {
                            for (let i = 0, l = node.inputs.length; i < l; ++i) {
                                let input_clk = node.inputs[i];
                                let link_pos = node.getConnectionPos(true, i);
                                if (LiteGraph.isInsideRectangle(e.canvasX, e.canvasY, link_pos[0] - 15, link_pos[1] - 10, 30, 20)) {
                                    mClikSlot = input_clk;
                                    mClikSlot_index = i;
                                    mClikSlot_isOut = false;
                                    break;
                                }
                            }
                        }
                        LiteGraph.log_verbose("middleClickSlots? " + mClikSlot + " & " + (mClikSlot_index !== false));
                        if (mClikSlot && mClikSlot_index !== false) {

                            var alphaPosY = 0.5 - ((mClikSlot_index + 1) / ((mClikSlot_isOut ? node.outputs.length : node.inputs.length)));
                            var node_bounding = node.getBounding();
                            // estimate a position: this is a bad semi-bad-working mess .. REFACTOR with a correct autoplacement that knows about the others slots and nodes
                            var posRef = [
                                (!mClikSlot_isOut ? node_bounding[0] : node_bounding[0] + node_bounding[2]), // + node_bounding[0]/this.canvas.width*150
                                e.canvasY - 80, // + node_bounding[0]/this.canvas.width*66 // vertical "derive"
                            ];
                            this.createDefaultNodeForSlot({
                                nodeFrom: !mClikSlot_isOut ? null : node,
                                slotFrom: !mClikSlot_isOut ? null : mClikSlot_index,
                                nodeTo: !mClikSlot_isOut ? node : null,
                                slotTo: !mClikSlot_isOut ? mClikSlot_index : null,
                                position: posRef, // ,e: e
                                nodeType: "AUTO", // nodeNewType
                                posAdd: [!mClikSlot_isOut ? -30 : 30, -alphaPosY * 130], // -alphaPosY*30]
                                posSizeFix: [!mClikSlot_isOut ? -1 : 0, 0], // -alphaPosY*2*/
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
                    if (Object.keys(this.selected_nodes).length &&
                        (this.selected_nodes[node.id] || e.shiftKey || e.ctrlKey || e.metaKey)
                    ) {
                        // is multiselected or using shift to include the now node
                        if (!this.selected_nodes[node.id]) this.selectNodes([node], true); // add this if not present
                    } else {
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
            (ref_window.document.activeElement.nodeName.toLowerCase() != "input" &&
                ref_window.document.activeElement.nodeName.toLowerCase() != "textarea"
            )
        ) {
            e.preventDefault();
        }
        e.stopPropagation();
        // TAG callback graphrenderer event entrypoint
        this.processCallbackHandlers("onMouseDown", {
            def_cb: this.onMouseDown
        }, e);
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

        if (this.set_canvas_dirty_on_mouse_event) {
            this.dirty_canvas = true;
        }

        if (!this.graph) {
            LiteGraph.log_warn("lgraphcanvas", "processMouseMove", "no canvas ref");
            return;
        }

        LGraphCanvas.active_canvas = this;
        this.adjustMouseEvent(e);
        if (e.isPrimary !== false) this.pointer.move(e);
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

        // a gesture with handlers (see CanvasPointer) was handled by pointer.move above
        if (this.pointer.isDown && this.pointer.hasHandlers) {
            return;
        }

        // DBG EXCESS LiteGraph.log_verbose("pointerevents: processMouseMove "+e.pointerId+" "+e.isPrimary);

        // TODO CHECK ensure block_click should prevent all following 
        if (this.block_click) {
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
        var node = this.graph.getNodeOnPos(e.canvasX, e.canvasY, this.visible_nodes);
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
                if (deltax || deltay) {
                    this.processCallbackHandlers("onGroupMoving", {
                        def_cb: this.onGroupMoving
                    }, this.selected_group, deltax, deltay);
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
                if (this.graph._nodes[i].mouseOver && node != this.graph._nodes[i]) {
                    // mouse leave
                    this.graph._nodes[i].mouseOver = false;
                    if (this.node_over) {
                        // TAG callback node event entrypoint
                        this.node_over.processCallbackHandlers("onMouseLeave", {
                            def_cb: this.node_over.onMouseLeave
                        }, e);
                    }
                    this.node_over = null;
                    this.dirty_canvas = true;
                }
            }

            // mouse over a node
            if (node) {

                if (node.redraw_on_mouse)
                    this.dirty_canvas = true;

                // this.canvas.style.cursor = "move";
                if (!node.mouseOver) {
                    // mouse enter
                    node.mouseOver = true;
                    this.node_over = node;
                    this.dirty_canvas = true;
                    // TAG callback node event entrypoint
                    node.processCallbackHandlers("onMouseEnter", {
                        def_cb: node.onMouseEnter
                    }, e);
                }

                // in case the node wants to do something
                // TAG callback node event entrypoint
                node.processCallbackHandlers("onMouseMove", {
                    def_cb: node.onMouseMove
                }, e, [e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this);

                // TODO replace processNodeWidgets for dedicated method to just checking overing: implement int processNodeWidgets too
                var widgetOver = this.processNodeWidgets(node, this.graph_mouse); // not passing event! just check, e );
                if (widgetOver) {
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
                            let slot = this.isOverNodeInput(node, e.canvasX, e.canvasY, pos);
                            if (slot != -1 && node.inputs[slot]) {
                                let slot_type = node.inputs[slot].type;
                                if (LiteGraph.isValidConnection(this.connecting_output.type, slot_type)) {
                                    this._highlight_input = pos;
                                    this._highlight_input_slot = node.inputs[slot]; // @TODO CHECK THIS
                                }
                            } else {
                                this._highlight_input = null;
                                this._highlight_input_slot = null; // @TODO CHECK THIS
                            }
                        }

                    } else if (this.connecting_input) {

                        pos = this._highlight_output || [0, 0]; // to store the output of isOverNodeOutput

                        // on top of output
                        if (!this.isOverNodeBox(node, e.canvasX, e.canvasY)) {
                            // check if I have a slot below de mouse
                            let slot = this.isOverNodeOutput(node, e.canvasX, e.canvasY, pos);
                            if (slot != -1 && node.outputs[slot]) {
                                let slot_type = node.outputs[slot].type;
                                if (LiteGraph.isValidConnection(this.connecting_input.type, slot_type)) {
                                    this._highlight_output = pos;
                                    this._highlight_output_slot = node.outputs[slot];
                                }
                            } else {
                                this._highlight_output = null;
                                this._highlight_output_slot = null;
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
                if (over_link != this.over_link_center) {
                    this.over_link_center = over_link;
                    this.dirty_canvas = true;
                }

                if (this.canvas) {
                    this.canvas.style.cursor = "";
                }
            } // end

            // send event to node if capturing input (used with widgets that allow drag outside of the area of the node)
            if (this.node_capturing_input && this.node_capturing_input != node) {
                // TAG callback node event entrypoint
                this.node_capturing_input.processCallbackHandlers("onMouseMove", {
                    def_cb: this.node_capturing_input.onMouseMove
                }, e, [e.canvasX - this.node_capturing_input.pos[0], e.canvasY - this.node_capturing_input.pos[1]], this);
            }

            // node being dragged
            if (this.node_dragged && !this.live_mode) {
                LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "draggin!", this.selected_nodes);
                for (let i in this.selected_nodes) {
                    let n = this.selected_nodes[i];
                    if (n.flags?.pinned) continue; // pinned nodes keep their position
                    let off = [delta[0] / this.ds.scale, delta[1] / this.ds.scale];
                    n.pos[0] += off[0];
                    n.pos[1] += off[1];
                    if (!n.is_selected) this.processNodeSelected(n, e);
                    // Don't call the function if the block is already selected. Otherwise, it could cause the block to be unselected while dragging.
                    n.processCallbackHandlers("onDrag", {
                        def_cb: n.onDrag
                    }, off);
                }

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
            }

            if (this.resizing_node && !this.live_mode) {
                // convert mouse to node space
                var desired_size = [e.canvasX - this.resizing_node.pos[0], e.canvasY - this.resizing_node.pos[1]];
                var min_size = this.free_resize ? LiteGraph.NODE_MIN_SIZE : this.resizing_node.computeSize(); //this.resizing_node.size_basic; // .computeSize();
                desired_size[0] = Math.max(min_size[0], desired_size[0]);
                desired_size[1] = Math.max(min_size[1], desired_size[1]);
                this.resizing_node.setSize(desired_size);

                this.canvas.style.cursor = "se-resize";
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
            }
        } else {
            if (this.read_only) {
                LiteGraph.log_verbose("lgraphcanvas", "processMouseMove", "canvas is read only", this);
            } else {
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

        var is_primary = (e.isPrimary === undefined || e.isPrimary);

        // early exit for extra pointer
        if (!is_primary) {
            /* e.stopPropagation();
            e.preventDefault();*/
            LiteGraph.log_verbose("pointerevents: processMouseUp pointerN_stop " + e.pointerId + " " + e.isPrimary);
            return false;
        }

        LiteGraph.log_verbose("pointerevents: processMouseUp " + e.pointerId + " " + e.isPrimary + " :: " + e.clientX + " " + e.clientY);

        if (this.set_canvas_dirty_on_mouse_event)
            this.dirty_canvas = true;

        if (!this.graph) {
            LiteGraph.log_warn("lgraphcanvas", "processMouseUp", "has not graph", this);
            return;
        }

        var window = this.getCanvasWindow();
        var document = window.document;
        LGraphCanvas.active_canvas = this;

        // restore the mousemove event back to the canvas
        if (!this.options.skip_events) {
            LiteGraph.log_verbose("pointerevents: processMouseUp restoreEventListener");
            this._restoreDocumentPointerListeners(document);
        }

        this.adjustMouseEvent(e);
        var now = LiteGraph.getTime();
        e.click_time = now - this.last_mouseclick;
        // a click must not have moved beyond the drift tolerance (time alone misreads quick drags)
        const gesture = is_primary ? this.pointer.up(e, now) : {
            isClick: false,
            dragged: false
        };
        e.is_click = gesture.isClick;
        this.last_mouse_dragging = false;
        this.last_click_position = null;

        if (this.block_click) {
            LiteGraph.log_verbose("pointerevents: processMouseUp block_clicks");
            this.block_click = false; // used to avoid sending twice a click in a immediate button
        }

        LiteGraph.log_debug("pointerevents: processMouseUp which: " + e.which);

        if (e.which == 1) {

            if (this.node_widget) {
                try {
                    this.processNodeWidgets(this.node_widget[0], this.graph_mouse, e);
                } finally {
                    this._endWidgetTransaction();
                }
            }

            // left button
            this.node_widget = null;

            // reroute drags are pointer gestures (see _dragRerouteGesture)
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

                if (this.selected_group_resizing) {
                    this.processCallbackHandlers("onGroupResized", {
                        def_cb: this.onGroupResized
                    }, this.selected_group);
                    this.graph.onGraphChanged({
                        action: "groupResize",
                        doSave: true
                    });
                    this.graph.afterChange(); // this.selected_group
                } else {
                    // diffx/diffy is only the rounding of the final position: a drag is a move too
                    if (gesture.dragged || diffx || diffy) {
                        this.processCallbackHandlers("onGroupMoved", {
                            def_cb: this.onGroupMoved
                        }, this.selected_group);
                        this.graph.onGraphChanged({
                            action: "groupMove",
                            doSave: true
                        });
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
                        this.dragging_rectangle[2] < 0 ?
                        this.dragging_rectangle[0] - w :
                        this.dragging_rectangle[0];
                    var starty =
                        this.dragging_rectangle[3] < 0 ?
                        this.dragging_rectangle[1] - h :
                        this.dragging_rectangle[1];
                    this.dragging_rectangle[0] = startx;
                    this.dragging_rectangle[1] = starty;
                    this.dragging_rectangle[2] = w;
                    this.dragging_rectangle[3] = h;

                    // test dragging rect size, if minimun simulate a click
                    if (!node || (w > 10 && h > 10)) {
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
                        const other_items = this._itemsInRectangle(this.dragging_rectangle);
                        if (to_select.length || other_items.length) {
                            LiteGraph.log_debug("lgraphcanvas", "processMouseUp", "selecting nodes", to_select);
                            this.selectNodes(to_select, e.shiftKey); // add to selection with shift
                            for (const item of other_items) this.selectItem(item, true);
                        }
                    } else {
                        // will select of update selection
                        this.selectNodes([node], e.shiftKey || e.ctrlKey); // add to selection add to selection with ctrlKey or shiftKey
                    }

                }
                this.dragging_rectangle = null;
            } else if (this.connecting_node) {
                // dropping a dragged link (see LinkConnector)
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;

                node = this.graph.getNodeOnPos(
                    e.canvasX,
                    e.canvasY,
                    this.visible_nodes,
                );

                if (node) {
                    // slot below the pointer, or -1 to pick the first compatible one
                    const slot = this.connecting_output ?
                        this.isOverNodeInput(node, e.canvasX, e.canvasY) :
                        this.isOverNodeOutput(node, e.canvasX, e.canvasY);
                    LiteGraph.log_debug("lgraphcanvas", "processMouseUp", "drop link on node", node, slot);
                    this.linkConnector.dropOnNode(node, slot);
                } else {
                    const dropped = this.linkConnector.dropOnEmpty();
                    const dropEvent = dropped && this._emit("link-dropped-on-empty", {
                        ...dropped,
                        canvasX: e.canvasX,
                        canvasY: e.canvasY,
                        event: e
                    }, {
                        cancelable: true
                    });
                    // add menu when releasing link in empty space (unless a listener handled it)
                    if (dropped && !dropEvent?.defaultPrevented && LiteGraph.release_link_on_empty_shows_menu) {
                        if (e.shiftKey && this.allow_searchbox) {
                            if (dropped.output) {
                                this.showSearchBox(e, {
                                    node_from: dropped.node,
                                    slot_from: dropped.output,
                                    type_filter_in: dropped.output.type
                                });
                            } else if (dropped.input) {
                                this.showSearchBox(e, {
                                    node_to: dropped.node,
                                    slot_from: dropped.input,
                                    type_filter_out: dropped.input.type
                                });
                            }
                        } else {
                            if (dropped.output) {
                                this.showConnectionMenu({
                                    nodeFrom: dropped.node,
                                    slotFrom: dropped.output,
                                    e: e
                                });
                            } else if (dropped.input) {
                                this.showConnectionMenu({
                                    nodeTo: dropped.node,
                                    slotTo: dropped.input,
                                    e: e
                                });
                            }
                        }
                    }
                }
                this.linkConnector.reset();
                this.clearSlotHighlights();
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
                    e.click_time < 300 && !gesture.dragged &&
                    LiteGraph.isInsideRectangle(e.canvasX, e.canvasY, node.pos[0], node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT)
                ) {
                    node.collapse();
                }

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                this.node_dragged.pos[0] = Math.round(this.node_dragged.pos[0]);
                this.node_dragged.pos[1] = Math.round(this.node_dragged.pos[1]);
                if (this.graph.config.align_to_grid || this.align_to_grid) {
                    this.node_dragged.alignToGrid();
                }
                // TAG callback graphrenderer event entrypoint
                this.processCallbackHandlers("onNodeMoved", {
                    def_cb: this.onNodeMoved
                }, this.node_dragged, this.selected_nodes);
                // multi nodes dragged ?
                for (let i in this.selected_nodes) {
                    let ndrg = this.selected_nodes[i];
                    ndrg.processCallbackHandlers("onMoved", {
                        def_cb: ndrg.onMoved
                    }, this.node_dragged, this.selected_nodes);
                }
                this.graph.onGraphChanged({
                    action: "nodeDrag",
                    doSave: true
                });
                this.graph.afterChange(this.node_dragged);
                this.node_dragged = null;
            } else { // no node being dragged
                // get node over
                node = this.graph.getNodeOnPos(
                    e.canvasX,
                    e.canvasY,
                    this.visible_nodes,
                );

                if (!node && e.click_time < 300 && !gesture.dragged) {
                    this.deselectAllNodes();
                }

                this.dirty_canvas = true;
                this.dragging_canvas = false;

                if (this.node_over) {
                    // TAG callback node event entrypoint
                    this.node_over.processCallbackHandlers("onMouseUp", {
                        def_cb: this.node_over.onMouseUp
                    }, e, [e.canvasX - this.node_over.pos[0], e.canvasY - this.node_over.pos[1]], this);
                }
                if (this.node_capturing_input) {
                    // TAG callback node event entrypoint
                    this.node_capturing_input.processCallbackHandlers("onMouseUp", {
                        def_cb: this.node_capturing_input.onMouseUp
                    }, e, [e.canvasX - this.node_capturing_input.pos[0], e.canvasY - this.node_capturing_input.pos[1], ]);
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

    /** moves pointermove back to the canvas and drops the document-level gesture listeners */
    _restoreDocumentPointerListeners(doc = this._pointer_document) {
        if (!doc) return;
        doc.removeEventListener("pointermove", this._mousemove_callback, true);
        doc.removeEventListener("pointerup", this._mouseup_callback, true);
        if (this._pointercancel_callback) doc.removeEventListener("pointercancel", this._pointercancel_callback, true);
        this._pointer_document = null;
        if (this.canvas && this._mousemove_callback) {
            this.canvas.removeEventListener("pointermove", this._mousemove_callback); // never twice
            this.canvas.addEventListener("pointermove", this._mousemove_callback);
        }
    }

    /**
     * The system cancelled the pointer (touch interrupted, palm rejection, lost capture...):
     * abandon the gesture without completing a click, drop or connection.
     * @method processPointerCancel
     **/
    processPointerCancel(e) {
        if (e && e.isPrimary === false) return;
        this.pointer.cancel();
        this._restoreDocumentPointerListeners();
        this.linkConnector?.cancel(); // moved links go back where they were
        if (this.node_dragged) {
            this.graph?.afterChange(this.node_dragged);
            this.node_dragged = null;
        }
        if (this.resizing_node) {
            this.graph?.afterChange(this.resizing_node);
            this.resizing_node = null;
        }
        this.dragging_canvas = false;
        this.dragging_rectangle = null;
        // a reroute drag ends through pointer.cancel() (its gesture `finally`)
        this.selected_group = null;
        this.selected_group_resizing = false;
        this._endWidgetTransaction();
        this.node_widget = null;
        this.node_capturing_input = null;
        this.pointer_is_down = false;
        this.pointer_is_double = false;
        this.last_mouse_dragging = false;
        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
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
        var is_inside = !this.viewport || (this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]));
        if (!is_inside)
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
        this.setZoom(scale, [e.clientX - rect.left, e.clientY - rect.top]);

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
                const widget = LiteGraph.LGraphNode.isWidgetInputSlot(node.inputs[i]) ? node.getWidgetFromSlot(node.inputs[i]) : null;
                if (widget?.last_y != null && !node.horizontal) {
                    // a widget input accepts a link dropped anywhere on its widget row
                    is_inside = LiteGraph.isInsideRectangle(
                        canvasx,
                        canvasy,
                        node.pos[0] - 10,
                        node.pos[1] + widget.last_y,
                        node.size[0] + 10,
                        LiteGraph.NODE_WIDGET_HEIGHT,
                    );
                } else if (node.horizontal) {
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
        LiteGraph.log_verbose("lgraphcanvas", "processKey", e);

        if (e.target.localName == "input") {
            return;
        }

        // the canvas receiving key events is the active one (dialogs and the search box use it)
        if (e.type == "keydown") {
            LGraphCanvas.active_canvas = this;
        }

        // bound key combos run their command instead of the built-in handling below
        if (e.type == "keydown" && LiteGraph.keybindings?.handleKeyDown(e, LiteGraph.commands.contextFor(this))) {
            e.preventDefault();
            e.stopImmediatePropagation?.();
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
                if (this.node_panel) this.node_panel.close();
                if (this.linkConnector?.isConnecting) { // abandon a link drag; moved links are restored
                    this.linkConnector.cancel();
                    this.clearSlotHighlights();
                    this.dirty_canvas = true;
                    this.dirty_bgcanvas = true;
                }
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
                    this.deleteSelected();
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
                } else if (e.keyCode == 90 && e.ctrlKey) {
                    // Z
                    this.graph.actionHistoryBack();
                }
            }

            if (Object.keys(this.selected_nodes).length) {
                for (let i in this.selected_nodes) {
                    // TAG callback node event entrypoint
                    // SHOULD check return value (block canvasProcess? block_default?)
                    r = this.selected_nodes[i].processCallbackHandlers("onKeyDown", {
                        def_cb: this.selected_nodes[i].onKeyDown
                    }, e);
                    // could a node stop replicating to the others ?
                    if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
                        LiteGraph.log_debug("lgraphcanvas", "processKey", "onKeyDown has been processed with result true, prevent event bubbling");
                        block_default = true;
                    }
                }
            }

            // TAG callback GRAPHCANVAS event entrypoint
            // SHOULD check return value (block_default?)
            r = this.processCallbackHandlers("onKeyDown", {
                def_cb: this.onKeyDown
            }, e);
            if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
                LiteGraph.log_debug("lgraphcanvas", "processKey", "onKeyDown has been processed with result true, prevent event bubbling");
                block_default = true;
            } else {
                LiteGraph.log_verbose("lgraphcanvas", "processKey", "onKeyDown processed by CB handlers", r);
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
                    this.selected_nodes[i].processCallbackHandlers("onKeyUp", {
                        def_cb: this.selected_nodes[i].onKeyUp
                    }, e);
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

    /**
     * The selection as a portable fragment: selected nodes (copies), the links between them, links
     * coming into them from unselected nodes (for Ctrl+Shift+V), the reroutes on those links, and
     * the selected groups. Nodes with `clonable === false` are left out.
     * @returns {{litegraph_fragment: number, nodes: object[], links: Array, groups: object[]}}
     */
    serializeSelection() {
        const fragment = {
            litegraph_fragment: 1,
            nodes: [],
            links: [],
            groups: []
        };
        const index = new Map(); // node id -> index in fragment.nodes
        for (const node of Object.values(this.selected_nodes ?? {})) {
            if (node.clonable === false) continue;
            const cloned = node.clone();
            if (!cloned) {
                LiteGraph.log_warn("node type not found: " + node.type);
                continue;
            }
            index.set(node.id, fragment.nodes.length);
            fragment.nodes.push(cloned.serialize());
        }
        for (const node of Object.values(this.selected_nodes ?? {})) {
            if (!index.has(node.id)) continue;
            node.inputs?.forEach((input) => {
                const link = input?.link != null ? this.graph.links[input.link] : null;
                if (!link || !this.graph.getNodeById(link.origin_id)) return;
                const chain = this.graph.getRerouteChain?.(link) ?? [];
                fragment.links.push([
                    index.has(link.origin_id) ? index.get(link.origin_id) : null, // null: from an unselected node
                    link.origin_slot,
                    index.get(node.id),
                    link.target_slot,
                    link.origin_id,
                    chain.map((reroute) => ({
                        id: reroute.id,
                        pos: [reroute.pos[0], reroute.pos[1]]
                    })),
                ]);
            });
        }
        for (const item of this._selected_items ?? []) {
            if (item instanceof LiteGraph.LGraphGroup) fragment.groups.push(item.serialize());
        }
        return fragment;
    }

    /**
     * Inserts a fragment (from serializeSelection, the clipboard, or saved snippets) with fresh ids,
     * its top-left corner at `pos`, as one undo step.
     * @param {object} fragment
     * @param {number[]} [pos] - graph coordinates; default: the last pointer position
     * @param {{select?: boolean, connectUnselected?: boolean}} [options] - connectUnselected keeps
     *   links that came from nodes outside the copied selection (the Ctrl+Shift+V behaviour)
     * @returns {{nodes: object[], groups: object[]}}
     */
    insertFragment(fragment, pos = this.graph_mouse, {
        select = true,
        connectUnselected = false
    } = {}) {
        const result = {
            nodes: [],
            groups: []
        };
        const graph = this.graph;
        if (!graph || !fragment || !Array.isArray(fragment.nodes)) return result;
        const nodesData = fragment.nodes;
        const groupsData = Array.isArray(fragment.groups) ? fragment.groups : [];
        // top-left of everything inserted
        let minX = Infinity,
            minY = Infinity;
        for (const data of nodesData) {
            minX = Math.min(minX, data.pos[0]);
            minY = Math.min(minY, data.pos[1]);
        }
        for (const data of groupsData) {
            minX = Math.min(minX, data.bounding[0]);
            minY = Math.min(minY, data.bounding[1]);
        }
        if (!Number.isFinite(minX)) return result;
        const dx = pos[0] - minX,
            dy = pos[1] - minY;

        const insert = () => {
            const created = nodesData.map((data) => {
                const node = LiteGraph.createNode(data.type);
                if (!node) return null;
                node.configure(LiteGraph.cloneObject(data));
                node.id = -1; // a fresh id
                node.pos[0] += dx;
                node.pos[1] += dy;
                graph.add(node, {
                    doProcessChange: false
                });
                result.nodes.push(node);
                return node;
            });
            for (const data of groupsData) {
                const group = new LiteGraph.LGraphGroup();
                const copy = LiteGraph.cloneObject(data);
                delete copy.id;
                group.configure(copy);
                group._bounding[0] += dx;
                group._bounding[1] += dy;
                graph.add(group);
                result.groups.push(group);
            }
            const rerouteMap = new Map(); // reroute id in the fragment -> new reroute
            for (const entry of fragment.links ?? []) {
                const [originIndex, originSlot, targetIndex, targetSlot, originId, chain] = entry;
                let origin = originIndex != null ? created[originIndex] : null;
                if (!origin && originIndex == null && connectUnselected && originId != null) origin = graph.getNodeById(originId);
                const target = created[targetIndex];
                if (!origin || !target) {
                    if (originIndex != null) LiteGraph.log_warn("Warning, nodes missing on pasting");
                    continue;
                }
                const link = origin.connect(originSlot, target, targetSlot);
                if (!link || !Array.isArray(chain)) continue;
                for (const old of chain) { // origin -> target order
                    if (rerouteMap.has(old.id)) {
                        link.parentId = rerouteMap.get(old.id).id; // shared with an earlier link
                    } else if (graph.addReroute) {
                        rerouteMap.set(old.id, graph.addReroute([old.pos[0] + dx, old.pos[1] + dy], link));
                    }
                }
            }
            graph.onGraphChanged({
                action: "paste",
                doSave: true
            });
        };
        if (graph.transact) graph.transact("insertFragment", insert);
        else insert();
        if (select) {
            this.selectNodes(result.nodes);
            for (const group of result.groups) this.selectItem(group, true);
        }
        this.setDirty(true, true);
        return result;
    }

    copyToClipboard() {
        const fragment = this.serializeSelection();
        LiteGraph.log_debug("lgraphcanvas", "copyToClipboard", fragment);
        LGraphCanvas._clipboard = fragment; // also kept in memory when localStorage is unavailable
        try {
            localStorage.setItem("litegrapheditor_clipboard", JSON.stringify(fragment));
        } catch (error) {
            LiteGraph.log_warn("lgraphcanvas", "copyToClipboard", "localStorage unavailable", error);
        }
    }

    /** pastes the clipboard as one undoable change (Ctrl+Shift+V also reconnects unselected sources) */
    pasteFromClipboard(isConnectUnselected = false) {
        return this._pasteFromClipboard(isConnectUnselected);
    }

    _pasteFromClipboard(isConnectUnselected = false) {
        // if ctrl + shift + v is off, return when isConnectUnselected is true (shift is pressed) to maintain old behavior
        if (!LiteGraph.ctrl_shift_v_paste_connect_unselected_outputs && isConnectUnselected) {
            return;
        }
        let fragment = null;
        try {
            const data = localStorage.getItem("litegrapheditor_clipboard");
            fragment = data ? JSON.parse(data) : null;
        } catch (error) {
            LiteGraph.log_warn("lgraphcanvas", "pasteFromClipboard", "unreadable clipboard", error);
        }
        fragment ??= LGraphCanvas._clipboard ?? null;
        LiteGraph.log_debug("lgraphcanvas", "pasteFromClipboard", fragment);
        if (!fragment) return;
        return this.insertFragment(fragment, this.graph_mouse, {
            connectUnselected: isConnectUnselected
        });
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
        var is_inside = !this.viewport || (this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]));
        if (!is_inside) {
            LiteGraph.log_debug("graphcanvas processDrop", "Outside viewport (client)", x, y);
            return;
        }

        x = e.localX;
        y = e.localY;
        is_inside = !this.viewport || (this.viewport && x >= this.viewport[0] && x < (this.viewport[0] + this.viewport[2]) && y >= this.viewport[1] && y < (this.viewport[1] + this.viewport[3]));
        if (!is_inside) {
            LiteGraph.log_debug("graphcanvas processDrop", "Outside viewport (local)", x, y);
            return;
        }

        var pos = [e.canvasX, e.canvasY];
        var node = this.graph ? this.graph.getNodeOnPos(pos[0], pos[1]) : null;

        LiteGraph.log_verbose("graphcanvas processDrop", "going to process", pos, node);

        if (!node) {

            LiteGraph.log_verbose("lgraphcanvas", "processDrop", "look for drop implemetation in CANVAS", e);

            r = this.processCallbackHandlers("onDropItem", {
                def_cb: this.onDropItem
            }, e);
            if (r === null || !r || (typeof(r) == "object" && !r.return_value)) {
                LiteGraph.log_verbose("lgraphcanvas", "processDrop", "running default implementation", e);
                this.checkDropItem(e);
                return r === null ? r : (typeof(r) == "object" ? r.return_value : r); // this is probably ignored
            } else {
                return r; // this is probably ignored
            }

        } else {

            // has dropped on node

            // check for dropped files
            var files = e.dataTransfer.files;
            if (files && files.length) {
                for (let i = 0; i < files.length; i++) {
                    var file = e.dataTransfer.files[0];
                    var filename = file.name;

                    LiteGraph.log_debug("lgraphcanvas", "processDrop", "file on node", file);

                    // execute onDropFile on node
                    r = node.processCallbackHandlers("onDropFile", {
                        def_cb: node.onDropFile
                    }, file);

                    // if not getting a positive result, process file as data and call onDropData
                    if (!r || (typeof(r) == "object" && !r.return_value)) {

                        // prepare reader
                        var reader = new FileReader();
                        reader.onload = function(event) {
                            var data = event.target.result;
                            LiteGraph.log_debug("lgraphcanvas", "processDrop", "data on node", data, filename, file);
                            // execute onDropData on node
                            node.processCallbackHandlers("onDropData", {
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
            r = node.processCallbackHandlers("onDropItem", {
                def_cb: node.onDropItem
            }, e);
            // if getting a positive result, return
            if (r === true || (typeof(r) == "object" && r.return_value)) {
                return true;
            }

            // execute onDropItem on CANVAS
            r = this.processCallbackHandlers("onDropItem", {
                def_cb: this.onDropItem
            }, e);
            // if getting a positive result, return
            if (r === true || (typeof(r) == "object" && r.return_value)) {
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
                this.graph.add(node, false, {
                    doProcessChange: false
                });
                node.processCallbackHandlers("onDropFile", {
                    def_cb: node.onDropFile
                }, file);
                this.graph.onGraphChanged({
                    action: "fileDrop",
                    doSave: true
                });
                this.graph.afterChange();
            }
        }
    }

    processNodeDblClicked(n) {

        let r = this.processCallbackHandlers("onShowNodePanel", {
            def_cb: this.onShowNodePanel
        }, n);
        if (r === null || ((typeof(r) == "object" && (r.return_value === null || !r.return_value)))) {
            this.showShowNodePanel(n); // use onShowNodePanel, this is an only local method
        }

        this.processCallbackHandlers("onNodeDblClicked", {
            def_cb: this.onNodeDblClicked
        }, n);
        this.setDirty(true);
    }

    processNodeSelected(node, e) {
        this.selectNode(node, e && (e.shiftKey || e.ctrlKey || this.multi_select));
        this.processCallbackHandlers("onNodeSelected", {
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
        if (typeof nodes === "string") nodes = [nodes];
        if (typeof nodes.length === "undefined") nodes = [nodes];
        Object.values(nodes).forEach((node) => {
            if (node.is_selected) {
                this.deselectNode(node);
                return;
            }

            node.is_selected = true;
            this.selected_nodes[node.id] = node;

            node.processCallbackHandlers("onSelected", {
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
        this.processCallbackHandlers("onSelectionChange", {
            def_cb: this.onSelectionChange
        }, this.selected_nodes);
        this._emit?.("selection-changed", {
            nodes: Object.values(this.selected_nodes)
        });
        this.setDirty(true);
    }

    /**
     * removes a node from the current selection
     * @method deselectNode
     **/
    deselectNode(node) {
        if (!node.is_selected) return;

        node.processCallbackHandlers("onDeselected", {
            def_cb: node.onDeselected
        });
        node.is_selected = false;
        delete this.selected_nodes[node.id];
        if (this.current_node === node) this.current_node = null;
        this.processCallbackHandlers("onNodeDeselected", {
            def_cb: this.onNodeDeselected
        }, node);
        this.processCallbackHandlers("onSelectionChange", {
            def_cb: this.onSelectionChange
        }, this.selected_nodes);
        this._emit?.("selection-changed", {
            nodes: Object.values(this.selected_nodes)
        });

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

            node.processCallbackHandlers("onDeselected", {
                def_cb: node.onDeselected
            });
            node.is_selected = false;
            this.processCallbackHandlers("onNodeDeselected", {
                def_cb: this.onNodeDeselected
            }, node);
        });

        this.selected_nodes = {};
        this.current_node = null;
        this.highlighted_links = {};
        // clicking empty canvas (or a fresh selection) also drops selected groups and reroutes
        for (const item of this._selected_items ?? []) item.selected = false;
        this._selected_items?.clear();

        this.processCallbackHandlers("onSelectionChange", {
            def_cb: this.onSelectionChange
        }, this.selected_nodes);
        this._emit?.("selection-changed", {
            nodes: Object.values(this.selected_nodes)
        });
        this.setDirty(true);
    }


    /**
     * Everything selected on this canvas: nodes, groups and reroutes (positionable items).
     * Nodes stay in `selected_nodes` for compatibility; groups and reroutes are kept alongside.
     * @returns {Array<object>}
     */
    get selectedItems() {
        return [...Object.values(this.selected_nodes ?? {}), ...(this._selected_items ?? [])];
    }

    /**
     * True for a graph node. Registered node classes need not extend LGraphNode (registration
     * copies its methods), so this checks for node behaviour rather than the class.
     */
    static isNodeItem(item) {
        return !!item && (item instanceof LiteGraph.LGraphNode ||
            (typeof item.getConnectionPos === "function" && typeof item.computeSize === "function"));
    }

    /** @returns {boolean} */
    isItemSelected(item) {
        if (!item) return false;
        if (this.selected_nodes?.[item.id] === item) return true;
        return !!this._selected_items?.has(item);
    }

    /**
     * Selects a node, group or reroute.
     * @param {object} item
     * @param {boolean} [add] - keep the current selection
     */
    selectItem(item, add = false) {
        if (!item) return;
        if (LGraphCanvas.isNodeItem(item)) {
            if (!(add && item.is_selected)) this.selectNodes([item], add);
            return;
        }
        if (!add) this.deselectAllNodes();
        if (!this._selected_items.has(item)) {
            this._selected_items.add(item);
            item.selected = true;
            this._emit?.("selection-changed", {
                nodes: Object.values(this.selected_nodes),
                items: this.selectedItems
            });
        }
        this.setDirty(true, true);
    }

    /** Removes one item from the selection. */
    deselectItem(item) {
        if (!item) return;
        if (LGraphCanvas.isNodeItem(item)) {
            if (item.is_selected) this.deselectNode(item);
            return;
        }
        if (this._selected_items.delete(item)) {
            item.selected = false;
            this._emit?.("selection-changed", {
                nodes: Object.values(this.selected_nodes),
                items: this.selectedItems
            });
            this.setDirty(true, true);
        }
    }

    /** reroutes inside a rectangle and groups fully inside it */
    _itemsInRectangle(rect) {
        const items = [];
        for (const reroute of this.graph?.reroutes?.values?.() ?? []) {
            if (LiteGraph.isInsideRectangle(reroute.pos[0], reroute.pos[1], rect[0], rect[1], rect[2], rect[3])) items.push(reroute);
        }
        for (const group of this.graph?._groups ?? []) {
            if (LiteGraph.isBoundingInsideRectangle(group._bounding, rect[0], rect[1], rect[2], rect[3])) items.push(group);
        }
        return items;
    }

    /**
     * Moves every selected item by (dx, dy) in graph units, as one undo step. A group moves the
     * nodes inside it, so those nodes are not moved a second time.
     */
    moveSelected(dx, dy) {
        if (!this.graph || (!dx && !dy)) return;
        const groups = [...this._selected_items].filter((item) => item instanceof LiteGraph.LGraphGroup);
        const carried = new Set();
        for (const group of groups) {
            group.recomputeInsideNodes();
            group._nodes.forEach((node) => carried.add(node));
            group._groups.forEach((child) => carried.add(child));
        }
        this.graph.transact("moveSelected", () => {
            for (const item of this.selectedItems) {
                if (carried.has(item)) continue;
                if (LGraphCanvas.isNodeItem(item)) {
                    item.pos[0] += dx;
                    item.pos[1] += dy;
                    item.processCallbackHandlers?.("onMoved", {
                        def_cb: item.onMoved
                    });
                } else if (typeof item.move === "function") {
                    item.move(dx, dy);
                }
            }
            this.graph.onGraphChanged({
                action: "moveSelected"
            });
        });
        this.setDirty(true, true);
    }

    /** Deletes the selected nodes, groups and reroutes as one undo step. */
    deleteSelected() {
        const graph = this.graph;
        if (!graph) return;
        const others = [...this._selected_items];
        if (!others.length) return this.deleteSelectedNodes();
        graph.transact("deleteSelected", () => {
            for (const item of others) {
                if (item instanceof LiteGraph.LGraphGroup) graph.remove(item);
                else if (graph.reroutes?.get?.(item.id) === item) graph.removeReroute(item.id);
            }
            this._selected_items.clear();
            this._deleteSelectedNodes();
        });
        this.setDirty(true, true);
    }

    /** Pointer gesture for dragging a reroute (handlers on this.pointer; one undo step per drag). */
    _dragRerouteGesture(reroute) {
        const graph = this.graph;
        const pointer = this.pointer;
        let transactionOpen = false;
        let last = null;
        this.dragging_reroute = reroute;
        pointer.onDragStart = (e) => {
            graph.beginTransaction("rerouteMove");
            transactionOpen = true;
            last = [e.canvasX, e.canvasY];
        };
        pointer.onDrag = (e) => {
            if (!last) return;
            reroute.move(e.canvasX - last[0], e.canvasY - last[1]);
            last = [e.canvasX, e.canvasY];
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
        };
        pointer.onDragEnd = () => {
            reroute.pos[0] = Math.round(reroute.pos[0]);
            reroute.pos[1] = Math.round(reroute.pos[1]);
            if (graph.config.align_to_grid || this.align_to_grid) {
                const grid = LiteGraph.CANVAS_GRID_SIZE;
                reroute.pos[0] = grid * Math.round(reroute.pos[0] / grid);
                reroute.pos[1] = grid * Math.round(reroute.pos[1] / grid);
            }
            graph.onGraphChanged({
                action: "rerouteMove"
            });
        };
        pointer.finally = () => {
            if (transactionOpen && graph.isInTransaction) graph.commitTransaction();
            this.dragging_reroute = null;
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
        };
    }

    /**
     * deletes all nodes in the current selection from the graph
     * @method deleteSelectedNodes
     **/
    /** deletes the selected nodes as one undoable change */
    deleteSelectedNodes() {
        if (!this.graph?.transact) return this._deleteSelectedNodes();
        return this.graph.transact("deleteSelectedNodes", () => this._deleteSelectedNodes());
    }

    _deleteSelectedNodes() {

        this.graph.beforeChange();

        for (let i in this.selected_nodes) {
            var node = this.selected_nodes[i];

            if (node.block_delete)
                continue;

            // TODO make a better version
            // TODO should be an option default off
            // should use auto connect
            // autoconnect when possible (very basic, only takes into account first input-output)
            if (node.inputs && node.inputs.length && node.outputs && node.outputs.length && LiteGraph.isValidConnection(node.inputs[0].type, node.outputs[0].type) && node.inputs[0].link && node.outputs[0].links && node.outputs[0].links.length) {
                var input_link = node.graph.links[node.inputs[0].link];
                var output_link = node.graph.links[node.outputs[0].links[0]];
                var input_node = node.getInputNode(0);
                var output_node = node.getOutputNodes(0)[0];
                if (input_node && output_node)
                    input_node.connect(input_link.origin_slot, output_node, output_link.target_slot);
            }

            this.graph.remove(node);
            this.processCallbackHandlers("onNodeDeselected", {
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
        this.ds.offset[0] = -node.pos[0] -
            node.size[0] * 0.5 +
            (this.cssWidth * 0.5) / this.ds.scale;
        this.ds.offset[1] = -node.pos[1] -
            node.size[1] * 0.5 +
            (this.cssHeight * 0.5) / this.ds.scale;
        this.setDirty(true, true);
    }

    recenter() {
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
            this.ds.changeScale(this.cssWidth/bounds[2]*2, [canvasPos[0]+bounds[2]/2,canvasPos[1]+bounds[3]/2]);
            this.setDirty(true, true);
            return true;
        }else{
            return false;
        }
    }*/

    getMouseCoordinates() {
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

        if (!e.clientX) {
            // simulate position via event (little hack)
            const mouseCoord = this.getMouseCoordinates();
            const gloCoord = this.convertOffsetToEditorArea(mouseCoord);

            // need prompt to be absolute positioned relative to editor-area that needs relative positioning

            // prevent error for some read-only events: setting getter-only property
            try {
                e.clientX = gloCoord[0];
                e.clientY = gloCoord[1];
            } catch (error) {
                LiteGraph.log_debug("lgraphcanvas", "adjustMouseEvent", "failed set custom prop on event", e);
            }
            clientX = gloCoord[0];
            clientY = gloCoord[1];
        } else {
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
        return [canvasPos[0] + rect.left, canvasPos[1] + rect.top];
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
        var top = 0,
            left = 0;
        do {
            top += element.offsetTop || 0;
            left += element.offsetLeft || 0;
            element = element.offsetParent;
        } while (element);
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
        if (ctx.start2D && !this.viewport) {
            ctx.start2D();
            ctx.restore();
        }
        // base transform: draw in CSS pixels on a (possibly) high-DPI backing store
        ctx.setTransform(this.pixel_ratio, 0, 0, this.pixel_ratio, 0, 0);

        // clip dirty area if there is one, otherwise work in full canvas
        var area = this.viewport || this.dirty_area;
        if (area) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(area[0], area[1], area[2], area[3]);
            ctx.clip();
        }

        // clear
        // canvas.width = canvas.width;
        if (this.clear_background) {
            if (area)
                ctx.clearRect(area[0], area[1], area[2], area[3]);
            else
                ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
        }

        // draw bg canvas
        if (this.bgcanvas == this.canvas) {
            this.drawBackCanvas();
        } else {
            ctx.drawImage(this.bgcanvas, 0, 0, this.cssWidth, this.cssHeight);
        }

        // rendering
        this.processCallbackHandlers("onRender", {
            def_cb: this.onRender
        }, canvas, ctx);

        // info widget
        if (this.show_info) {
            this.renderInfo(ctx, area ? area[0] : 0, area ? area[1] : 0);
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
                if (connDir == null) {
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
                    if (this._highlight_input_slot?.shape === LiteGraph.ARROW_SHAPE) {
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
                    if (this._highlight_output_slot?.shape === LiteGraph.ARROW_SHAPE) {
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
            if (this.over_link_center && this.render_link_tooltip) {
                this.drawLinkTooltip(ctx, this.over_link_center);
            } else {
                // are we sure to call this here (?) should check for over_link
                this.processCallbackHandlers("onDrawLinkTooltip", {
                    def_cb: this.onDrawLinkTooltip
                }, ctx, null);
            }

            // custom info
            this.processCallbackHandlers("onDrawForeground", {
                def_cb: this.onDrawForeground
            }, ctx, this.visible_rect);
            ctx.restore();
        } else {
            LiteGraph.log_warn("lgraphcanvas", "drawFrontCanvas", "no graph", this);
        }

        // draws panel in the corner
        if (this._graph_stack && this._graph_stack.length) {
            this.drawSubgraphPanel(ctx);
        }
        this.processCallbackHandlers("onDrawOverlay", {
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
        if (!subgraph)
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
                        subgraph.add(newnode, false, {
                            doProcessChange: false
                        });
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
        var canvas_w = this.cssWidth;
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
                        subgraph.add(newnode, false, {
                            doProcessChange: false
                        });
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
        var hover = LiteGraph.isInsideRectangle(pos[0], pos[1], x, y, w, h);
        pos = this.last_click_position ? [this.last_click_position[0], this.last_click_position[1]] : null;
        if (pos) {
            var rect = this.canvas.getBoundingClientRect();
            pos[0] -= rect.left;
            pos[1] -= rect.top;
        }
        var clicked = pos && LiteGraph.isInsideRectangle(pos[0], pos[1], x, y, w, h);

        ctx.fillStyle = hover ? hovercolor : bgcolor;
        if (clicked)
            ctx.fillStyle = "#AAA";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, [4]);
        ctx.fill();

        if (text != null) {
            if (text.constructor == String) {
                ctx.fillStyle = textcolor;
                ctx.textAlign = "center";
                ctx.font = ((h * 0.65) | 0) + "px Arial";
                ctx.fillText(text, x + w * 0.5, y + h * 0.75);
                ctx.textAlign = "left";
            }
        }

        var was_clicked = clicked && !this.block_click;
        if (clicked)
            this.blockClick();
        return was_clicked;
    }

    isAreaClicked(x, y, w, h, hold_click) {
        var pos = this.last_click_position;
        var clicked = pos && LiteGraph.isInsideRectangle(pos[0], pos[1], x, y, w, h);
        var was_clicked = clicked && !this.block_click;
        if (clicked && hold_click)
            this.blockClick();
        return was_clicked;
    }

    /**
     * draws some useful stats in the corner of the canvas
     * @method renderInfo
     **/
    renderInfo(ctx, x, y) {
        x = x || 10;
        y = y || this.cssHeight - 80;

        ctx.save();
        ctx.translate(x, y);

        ctx.font = "10px Arial";
        ctx.fillStyle = "#888";
        ctx.textAlign = "left";
        if (this.graph) {
            ctx.fillText("T: " + this.graph.globaltime.toFixed(2) + "s", 5, 13 * 1);
            ctx.fillText("I: " + this.graph.iteration, 5, 13 * 2);
            ctx.fillText("N: " + this.graph._nodes.length + " [" + this.visible_nodes.length + "]", 5, 13 * 3);
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

        ctx.setTransform(this.pixel_ratio, 0, 0, this.pixel_ratio, 0, 0); // CSS-pixel drawing space
        var viewport = this.viewport || [0, 0, this.cssWidth, this.cssHeight];

        // clear
        if (this.clear_background) {
            ctx.clearRect(viewport[0], viewport[1], viewport[2], viewport[3]);
        }

        // show subgraph stack header
        if (this._graph_stack && this._graph_stack.length) {
            ctx.save();
            var subgraph_node = this.graph._subgraph_node;
            ctx.strokeStyle = subgraph_node.bgcolor;
            ctx.lineWidth = 10;
            ctx.strokeRect(1, 1, this.cssWidth - 2, this.cssHeight - 2);
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
                this.cssWidth * 0.5,
                40,
            );
            ctx.restore();
        }

        var bg_already_painted = false;
        let r = this.processCallbackHandlers("onRenderBackground", {
            def_cb: this.onRenderBackground
        }, canvas, ctx);
        if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
            bg_already_painted = true;
        }

        // reset in case of error
        if (!this.viewport) {
            ctx.restore();
            ctx.setTransform(this.pixel_ratio, 0, 0, this.pixel_ratio, 0, 0);
        }
        this.visible_links.length = 0;

        if (this.graph) {
            // apply transformations
            ctx.save();
            this.ds.toCanvasContext(ctx);

            // render BG
            if (this.ds.scale < 1.5 && !bg_already_painted && this.clear_background_color) {
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

            this.processCallbackHandlers("onDrawBackground", {
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
                node.processCallbackHandlers("onDrawForeground", {
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
            let r = node.processCallbackHandlers("onDrawCollapsed", {
                def_cb: node.onDrawCollapsed
            }, ctx, this);
            if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
                return;
            }
        }

        // clip if required (mask)
        var shape = node._shape || node.constructor.shape || LGraphCanvas.resolveShape(LiteGraph.NODE_DEFAULT_SHAPE, LiteGraph.BOX_SHAPE);
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
        node.processCallbackHandlers("onDrawForeground", {
            def_cb: node.onDrawForeground
        }, ctx, this, this.canvas);

        // node tooltip
        if (LiteGraph.show_node_tooltip &&
            node.mouseOver &&
            (node.is_selected && (!this.selected_nodes || Object.keys(this.selected_nodes).length <= 1))
        ) {
            this.drawNodeTooltip(ctx, node);
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
                    if (this.connecting_output && !LiteGraph.isValidConnection(slot.type, out_slot.type)) {
                        ctx.globalAlpha = 0.4 * editor_alpha;
                    }

                    ctx.fillStyle =
                        slot.link != null ?
                        slot.color_on ||
                        this.default_connection_color_byType[slot_type] ||
                        this.default_connection_color.input_on :
                        slot.color_off ||
                        this.default_connection_color_byTypeOff[slot_type] ||
                        this.default_connection_color_byType[slot_type] ||
                        this.default_connection_color.input_off;

                    let pos = node.getConnectionPos(true, i, slot_pos);
                    pos[0] -= node.pos[0];
                    pos[1] -= node.pos[1];
                    // widget inputs sit on their widget rows: they must not push the widgets down
                    const is_widget_input = LiteGraph.LGraphNode.isWidgetInputSlot(slot);
                    if (!is_widget_input && max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5) {
                        max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5;
                    }

                    ctx.beginPath();

                    if (slot_type == "array") {
                        slot_shape = LiteGraph.GRID_SHAPE; // place in addInput? addOutput instead?
                    } else if (slot.name == "onTrigger" || slot.name == "onExecuted") {
                        slot_shape = LiteGraph.ARROW_SHAPE;
                    } else if (slot_type === LiteGraph.EVENT || slot_type === LiteGraph.ACTION) {
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
                        if (low_quality)
                            ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8); // faster
                        else
                            ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                    }
                    ctx.fill();

                    // render name (a widget input is labelled by its widget)
                    if (render_text && !is_widget_input &&
                        !(slot.name == "onTrigger" || slot.name == "onExecuted")
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
                    if (this.connecting_input && !LiteGraph.isValidConnection(slot_type, in_slot.type)) {
                        ctx.globalAlpha = 0.4 * editor_alpha;
                    }

                    let pos = node.getConnectionPos(false, i, slot_pos);
                    pos[0] -= node.pos[0];
                    pos[1] -= node.pos[1];
                    if (max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5) {
                        max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5;
                    }

                    ctx.fillStyle =
                        slot.links && slot.links.length ?
                        slot.color_on ||
                        this.default_connection_color_byType[slot_type] ||
                        this.default_connection_color.output_on :
                        slot.color_off ||
                        this.default_connection_color_byTypeOff[slot_type] ||
                        this.default_connection_color_byType[slot_type] ||
                        this.default_connection_color.output_off;
                    ctx.beginPath();
                    // ctx.rect( node.size[0] - 14,i*14,10,10);

                    if (slot_type == "array") {
                        slot_shape = LiteGraph.GRID_SHAPE;
                    } else if (slot.name == "onTrigger" || slot.name == "onExecuted") {
                        slot_shape = LiteGraph.ARROW_SHAPE;
                    } else if (slot_type === LiteGraph.EVENT || slot_type === LiteGraph.ACTION) {
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
                        if (low_quality)
                            ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8);
                        else
                            ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                    }

                    // trigger
                    // if(slot.node_id != null && slot.slot == -1)
                    //	ctx.fillStyle = "#F85";

                    // if(slot.links != null && slot.links.length)
                    ctx.fill();
                    if (!low_quality && doStroke)
                        ctx.stroke();

                    // render output name
                    if (render_text &&
                        !(slot.name == "onTrigger" || slot.name == "onExecuted")
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
                if (node.widgets_start_y != null)
                    widgets_y = node.widgets_start_y;
                this.drawNodeWidgets(
                    node,
                    widgets_y,
                    ctx,
                    this.node_widget && this.node_widget[0] == node ?
                    this.node_widget[1] :
                    null,
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

    drawNodeTooltip(ctx, node) {
        if (!node || !ctx) {
            LiteGraph.log_warn("drawNodeTooltip: invalid node or ctx", node, ctx);
            return;
        }
        var text = node.properties.tooltip != undefined ? node.properties.tooltip : "";
        if (!text || text == "") {
            if (LiteGraph.show_node_tooltip_use_descr_property && node.constructor.desc) {
                text = node.constructor.desc;
            }
        }
        text = (text + "").trim();
        if (!text || text == "") {
            // DBG("Empty tooltip");
            return;
        }

        var pos = [0, -LiteGraph.NODE_TITLE_HEIGHT]; // node.pos;
        // text = text.substr(0,30); //avoid weird
        // text = text + "\n" + text;
        var size = node.flags.collapsed ? [LiteGraph.NODE_COLLAPSED_WIDTH, LiteGraph.NODE_TITLE_HEIGHT] : node.size;

        // using a trick to save the calculated height of the tip the first time using trasparent, to than show it
        // node.ttip_oTMultiRet is not set or false the first time

        ctx.font = "14px Courier New";
        // var info = ctx.measureText(text);
        var w = Math.max(node.size[0], 160) + 20; // info.width + 20;
        var h = node.ttip_oTMultiRet ? node.ttip_oTMultiRet.height + 15 : 21;

        ctx.globalAlpha = 0.7 * this.editor_alpha;

        ctx.shadowColor = node.ttip_oTMultiRet ? "black" : "transparent";
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 3;
        ctx.fillStyle = node.ttip_oTMultiRet ? "#454" : "transparent";
        ctx.beginPath();

        ctx.roundRect(pos[0] - w * 0.5 + size[0] / 2, pos[1] - 15 - h, w, h, [3]);
        ctx.moveTo(pos[0] - 10 + size[0] / 2, pos[1] - 15);
        ctx.lineTo(pos[0] + 10 + size[0] / 2, pos[1] - 15);
        ctx.lineTo(pos[0] + size[0] / 2, pos[1] - 5);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.textAlign = "center";
        ctx.fillStyle = node.ttip_oTMultiRet ? "#CEC" : "transparent";

        ctx.globalAlpha = this.editor_alpha;

        // ctx.fillText(text, pos[0] + size[0]/2, pos[1] - 15 - h * 0.3);
        const oTMultiRet = LiteGraph.canvasFillTextMultiline(ctx, text, pos[0] + size[0] / 2, pos[1] - (h), w, 14);

        node.ttip_oTMultiRet = oTMultiRet;

        ctx.closePath();
    }

    // used by this.over_link_center
    drawLinkTooltip(ctx, link) {
        var pos = link._pos;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 3, 0, Math.PI * 2);
        ctx.fill();

        if (link.data == null)
            return;

        let r = this.processCallbackHandlers("onDrawLinkTooltip", {
            def_cb: this.onDrawLinkTooltip
        }, ctx, link, this);
        if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
            return;
        }

        var data = link.data;
        var text = null;

        if (data.constructor === Number)
            text = data.toFixed(2);
        else if (data.constructor === String)
            text = "\"" + data + "\"";
        else if (data.constructor === Boolean)
            text = String(data);
        else if (data.toToolTip)
            text = data.toToolTip();
        else {
            try {
                text = "[" + data.constructor.name + "]";
            } catch (e) {
                text = "[" + typeof(data) + "]";
            }
        }

        if (text == null)
            return;
        text = text.substr(0, 30); // avoid weird

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
        ctx.roundRect(pos[0] - w * 0.5, pos[1] - 15 - h, w, h, [3]);
        ctx.moveTo(pos[0] - 10, pos[1] - 15);
        ctx.lineTo(pos[0] + 10, pos[1] - 15);
        ctx.lineTo(pos[0], pos[1] - 5);
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
        var shape = node._shape || node.constructor.shape || LGraphCanvas.resolveShape(LiteGraph.NODE_DEFAULT_SHAPE, LiteGraph.ROUND_SHAPE); // Comfy 11ce8e0

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
                    shape == LiteGraph.CARD_SHAPE ? [this.round_radius, this.round_radius, 0, 0] : [this.round_radius],
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
            if (!node.flags.collapsed && render_title) {
                ctx.shadowColor = "transparent";
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.fillRect(0, -1, area[2], 2);
            }
        }
        ctx.shadowColor = "transparent";

        node.processCallbackHandlers("onDrawBackground", {
            def_cb: node.onDrawBackground
        }, ctx, this, this.canvas, this.graph_mouse);

        // title bg (remember, it is rendered ABOVE the node)
        if (render_title || title_mode == LiteGraph.TRANSPARENT_TITLE) {
            // title bar
            r = node.processCallbackHandlers("onDrawTitleBar", {
                def_cb: node.onDrawTitleBar
            }, ctx, title_height, size, this.ds.scale, fgcolor);
            if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
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
                } else if (shape == LiteGraph.ROUND_SHAPE || shape == LiteGraph.CARD_SHAPE) {
                    ctx.roundRect(
                        0,
                        -title_height,
                        size[0] + 1,
                        title_height,
                        node.flags.collapsed ? [this.round_radius] : [this.round_radius, this.round_radius, 0, 0],
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
            r = node.processCallbackHandlers("onDrawTitleBox", {
                def_cb: node.onDrawTitleBox
            }, ctx, title_height, size, this.ds.scale);
            if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
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
                if (low_quality)
                    ctx.fillRect(title_height * 0.5 - box_size * 0.5, title_height * -0.5 - box_size * 0.5, box_size, box_size);
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
            node.processCallbackHandlers("onDrawTitleText", {
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
                            title_height, // + measure.width * 0.5,
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
                var over = LiteGraph.isInsideRectangle(this.graph_mouse[0] - node.pos[0], this.graph_mouse[1] - node.pos[1], x + 2, -w + 2, w - 4, w - 4);
                ctx.fillStyle = over ? "#888" : "#555";
                if (shape == LiteGraph.BOX_SHAPE || low_quality)
                    ctx.fillRect(x + 2, -w + 2, w - 4, w - 4);
                else {
                    ctx.beginPath();
                    ctx.roundRect(x + 2, -w + 2, w - 4, w - 4, [4]);
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
            node.processCallbackHandlers("onDrawTitle", {
                def_cb: node.onDrawTitle
            }, ctx);
        }

        // render selection marker
        if (selected) {
            node.processCallbackHandlers("onBounding", {
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
                    [this.round_radius * 2, 2, this.round_radius * 2, 2],
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
        if (node.execute_triggered > 0) node.execute_triggered--;
        if (node.action_triggered > 0) node.action_triggered--;
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
                const reroutes = link.parentId !== undefined ? this.graph.getRerouteChain?.(link) ?? [] : [];

                // compute link bounding (through its reroutes)
                let minX = Math.min(start_node_slotpos[0], end_node_slotpos[0]);
                let minY = Math.min(start_node_slotpos[1], end_node_slotpos[1]);
                let maxX = Math.max(start_node_slotpos[0], end_node_slotpos[0]);
                let maxY = Math.max(start_node_slotpos[1], end_node_slotpos[1]);
                for (const reroute of reroutes) {
                    minX = Math.min(minX, reroute.pos[0]);
                    minY = Math.min(minY, reroute.pos[1]);
                    maxX = Math.max(maxX, reroute.pos[0]);
                    maxY = Math.max(maxY, reroute.pos[1]);
                }
                link_bounding[0] = minX;
                link_bounding[1] = minY;
                link_bounding[2] = maxX - minX;
                link_bounding[3] = maxY - minY;

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

                const points = [start_node_slotpos, ...reroutes.map((reroute) => reroute.pos), end_node_slotpos];
                this.renderLinkPath(ctx, points, link, false, 0, null, start_dir, end_dir);

                // event triggered rendered on top
                if (link && link._last_time && now - link._last_time < 1000) {
                    var f = 2.0 - (now - link._last_time) * 0.002;
                    var tmp = ctx.globalAlpha;
                    ctx.globalAlpha = tmp * f;
                    this.renderLinkPath(ctx, points, link, true, f, "white", start_dir, end_dir);
                    ctx.globalAlpha = tmp;
                }
            }
        }
        this.drawReroutes(ctx);
        ctx.globalAlpha = 1;
    }

    /**
     * Draws a link through intermediate points (reroutes). The last segment carries the link
     * (center marker, hit testing); the others are drawn in the link's colour.
     * @method renderLinkPath
     **/
    renderLinkPath(ctx, points, link, skip_border, flow, color, start_dir, end_dir) {
        if (points.length <= 2) {
            this.renderLink(ctx, points[0], points[points.length - 1], link, skip_border, flow, color, start_dir, end_dir);
            return;
        }
        let segmentColor = color;
        if (!segmentColor && link) {
            segmentColor = this.highlighted_links[link.id] ? "#FFF" : (link.color || LGraphCanvas.link_type_colors[link.type]);
        }
        segmentColor ||= this.default_link_color;
        for (let k = 0; k < points.length - 1; k++) {
            const last = k === points.length - 2;
            this.renderLink(
                ctx, points[k], points[k + 1],
                last ? link : null, skip_border, flow,
                last ? color : segmentColor,
                k === 0 ? start_dir : LiteGraph.RIGHT,
                last ? end_dir : LiteGraph.LEFT,
            );
        }
    }

    /**
     * Draws the reroutes that links pass through.
     * @method drawReroutes
     **/
    drawReroutes(ctx) {
        if (!this.graph?.reroutes?.size) return;
        const used = this.graph.getRerouteLinkIds();
        ctx.save();
        for (const [id, linkIds] of used) {
            const reroute = this.graph.reroutes.get(id);
            const link = this.graph.links[linkIds[0]];
            ctx.fillStyle = link?.color || LGraphCanvas.link_type_colors[link?.type] || this.default_link_color;
            ctx.beginPath();
            const reroute_active = this.dragging_reroute === reroute || reroute.selected;
            ctx.arc(reroute.pos[0], reroute.pos[1], reroute_active ? 7 : 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = reroute_active ? "#FFF" : "rgba(0,0,0,0.6)";
            ctx.stroke();
        }
        ctx.restore();
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

        // follow the path renderLink actually draws, not always the spline
        if (this.links_render_mode == LiteGraph.LINEAR_LINK || this.links_render_mode == LiteGraph.STRAIGHT_LINK) {
            return LGraphCanvas.pointAlongPolyline(this.getLinkPolyline(a, b, start_dir, end_dir), t);
        }

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

    // text cut with an ellipsis to fit max_width as measured by ctx
    static fitText(ctx, text, max_width) {
        if (max_width <= 0) return "";
        if (ctx.measureText(text).width <= max_width) return text;
        var lo = 0;
        var hi = text.length;
        while (lo < hi) { // longest prefix that fits with the ellipsis
            var mid = (lo + hi + 1) >> 1;
            if (ctx.measureText(text.slice(0, mid) + "…").width <= max_width) lo = mid;
            else hi = mid - 1;
        }
        return lo ? text.slice(0, lo) + "…" : "";
    }

    // the slot under the mouse while dragging a link; a new drag must not start with
    // the previous one's highlight
    clearSlotHighlights() {
        this._highlight_input = null;
        this._highlight_input_slot = null;
        this._highlight_output = null;
        this._highlight_output_slot = null;
    }

    // corner points of a LINEAR_LINK / STRAIGHT_LINK path, as drawn by renderLink
    getLinkPolyline(a, b, start_dir, end_dir) {
        if (this.links_render_mode == LiteGraph.STRAIGHT_LINK) {
            var start_x = a[0] + (start_dir == LiteGraph.RIGHT ? 10 : 0);
            var start_y = a[1] + (start_dir == LiteGraph.RIGHT ? 0 : 10);
            var end_x = b[0] - (end_dir == LiteGraph.LEFT ? 10 : 0);
            var end_y = b[1] - (end_dir == LiteGraph.LEFT ? 0 : 10);
            var mid_x = (start_x + end_x) * 0.5;
            return [a, [start_x, start_y],
                [mid_x, start_y],
                [mid_x, end_y],
                [end_x, end_y], b
            ];
        }
        var dir = (d) => [
            d == LiteGraph.LEFT ? -1 : d == LiteGraph.RIGHT ? 1 : 0,
            d == LiteGraph.UP ? -1 : d == LiteGraph.DOWN ? 1 : 0,
        ];
        var l = 15;
        var s = dir(start_dir);
        var e = dir(end_dir);
        return [a, [a[0] + s[0] * l, a[1] + s[1] * l],
            [b[0] + e[0] * l, b[1] + e[1] * l], b
        ];
    }

    // point at fraction t (0..1) of the total length of a polyline
    static pointAlongPolyline(points, t) {
        var lengths = [];
        var total = 0;
        for (let i = 1; i < points.length; ++i) {
            var len = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
            lengths.push(len);
            total += len;
        }
        if (!total) return [points[0][0], points[0][1]];
        var target = LiteGraph.clamp(t, 0, 1) * total;
        for (let i = 0; i < lengths.length; ++i) {
            if (target <= lengths[i] || i == lengths.length - 1) {
                var f = lengths[i] ? Math.min(target / lengths[i], 1) : 0;
                var p = points[i];
                var q = points[i + 1];
                return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
            }
            target -= lengths[i];
        }
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
            // a widget whose input is linked is driven by the link: shown disabled
            if (w.disabled || node.isWidgetLinked?.(w))
                ctx.globalAlpha *= 0.5;
            var widget_width = w.width || width;

            // is over this widget?
            is_over_widget = this.over_widget == w;
            // is this widget active(clicked)?
            if (active_widget == w) {
                //
            }

            // per-type drawing lives in the widget classes (src/widgets.js)
            const impl = widgetImplementation(w);
            if (impl) {
                impl.draw.call(w, ctx, node, widget_width, y, H, {
                    canvas: this,
                    show_text,
                    show_label: is_over_widget || this.options.hide_widget_label_when_small === true || this.options.hide_widget_label_when_small < width,
                    active: active_widget == w,
                    margin,
                    colors: {
                        outline: outline_color,
                        background: background_color,
                        text: text_color,
                        secondary: secondary_text_color
                    },
                });
            } else if (w.draw) {
                w.draw(ctx, node, widget_width, y, H); // legacy custom widget
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
        if (node.flags?.collapsed) return null; // widgets are hidden, nothing to click
        if (!node.widgets || !node.widgets.length || (!this.allow_interaction && !node.flags.allow_interaction)) {
            if (!node.widgets || !node.widgets.length) LiteGraph.log_verbose("graph processNodeWidgets", "no widgets for node", node);
            if (!this.allow_interaction && !node.flags.allow_interaction) LiteGraph.log_verbose("graph processNodeWidgets", "interaction not allowed on graph and not overridden on node", node);
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
            if (!w || w.disabled || node.isWidgetLinked?.(w))
                continue;
            if (typeof(w.computeSize) == "function") {
                const wSize = w.computeSize(node.size[0], node.size[1]);
                widget_width = wSize[0];
                widget_height = wSize[1];
            } else {
                widget_width = w.width || width;
                widget_height = w.height || height;
            }
            // outside
            if (w != active_widget &&
                (x < 6 || x > widget_width - 12 || y < w.last_y || y > w.last_y + widget_height || w.last_y === undefined)) {
                continue;
            }

            var old_value = w.value;

            LiteGraph.log_verbose("graph processNodeWidgets", "has widget", w);

            // if ( w == active_widget || (x > 6 && x < widget_width - 12 && y > w.last_y && y < w.last_y + widget_height) ) {
            // inside widget
            if (event) {
                // per-type behaviour lives in the widget classes (src/widgets.js)
                const impl = widgetImplementation(w);
                if (impl) {
                    impl.onPointer.call(w, event, {
                        canvas: this,
                        node,
                        x,
                        y,
                        pos,
                        widget_width,
                        old_value,
                        ref_window,
                        changed: inner_value_change,
                    });
                } else if (w.mouse) {
                    this.dirty_canvas = w.mouse(event, [x, y], node); // legacy custom widget
                }
            }

            return w;
        } // end for

        function inner_value_change(widget, value, old_value) {
            LiteGraph.log_debug("inner_value_change for processNodeWidgets", widget, value);
            const value_original = value;
            if (widget.type == "number") {
                value = Number(value);
            }
            widget.value = value;
            // value changed: notify with the new value (text widgets used to report the old one)
            if (old_value != value) {
                node.processCallbackHandlers("onWidgetChanged", {
                    def_cb: node.onWidgetChanged
                }, widget.name, value, old_value, widget);
                node.graph.onGraphChanged({
                    action: "widgetChanged",
                    doSave: true
                }); // tag: graph event entrypoint
                node.graph._emit?.("widget-changed", {
                    node,
                    widget,
                    value,
                    previous: old_value
                });
            }
            if (widget.options && widget.options.property && node.properties[widget.options.property] !== undefined) {
                node.setProperty(widget.options.property, value);
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
            if (this.options.groups_border_alpha >= 0) {
                if (ctx.setStrokeColor) { // only webkit
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
            ctx.font = font_size + "px " + this.options.groups_title_font;
            ctx.textAlign = this.options.groups_title_alignment;
            if (this.options.groups_title_wrap) {
                LiteGraph.canvasFillTextMultiline(ctx, group.title, pos[0] + 4, pos[1] + font_size, size[0], font_size);
            } else {
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
            LiteGraph.log_debug("lgraphcanvas", "resize", "not passed: AUTO", parent, width, height);
        } else {
            LiteGraph.log_debug("lgraphcanvas", "resize", "passed", width, height, parent);
        }
        // high-DPI: backing store in device pixels, layout and drawing in CSS pixels (ported idea, Comfy 49944a0)
        const ratio = LiteGraph.canvas_high_dpi !== false && typeof window !== "undefined" && window.devicePixelRatio > 0 ?
            window.devicePixelRatio : 1;
        const backingWidth = Math.round(width * ratio);
        const backingHeight = Math.round(height * ratio);
        if (this.canvas.width == backingWidth && this.canvas.height == backingHeight && this.pixel_ratio == ratio) {
            return;
        }
        this.canvas.width = backingWidth;
        this.canvas.height = backingHeight;
        if (ratio !== 1 || this.pixel_ratio !== 1) {
            this.canvas.style.width = width + "px";
            this.canvas.style.height = height + "px";
        }
        this.pixel_ratio = ratio;
        this.ds.pixel_ratio = ratio;
        this.bgcanvas.width = this.canvas.width;
        this.bgcanvas.height = this.canvas.height;
        this.setDirty(true, true);
    }

    /** canvas width in CSS pixels (the drawing and pointer coordinate space) */
    get cssWidth() {
        return this.canvas ? this.canvas.width / (this.pixel_ratio || 1) : 0;
    }

    /** canvas height in CSS pixels (the drawing and pointer coordinate space) */
    get cssHeight() {
        return this.canvas ? this.canvas.height / (this.pixel_ratio || 1) : 0;
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
        if (canvas.options.groups_add_around_selected && Object.keys(canvas.selected_nodes).length) {
            const bounds = canvas.getBoundaryForSelection();
            if (bounds) {
                const spacing = canvas.options.groups_add_default_spacing;
                const titleSpace = canvas.options.groups_title_font_size * 1.5;
                group.pos = [bounds[0] - spacing, bounds[1] - titleSpace - spacing];
                group.size = [bounds[2] + (spacing * 2), bounds[3] + titleSpace + (spacing * 2)];
                LiteGraph.log_debug("lgraphcanvas", "onGroupAdd", "groups_add_around_selected", bounds, group);
            } else {
                group.pos = canvas.convertEventToCanvasOffset(mouse_event); // as default
            }
        } else {
            group.pos = canvas.convertEventToCanvasOffset(mouse_event);
        }
        canvas.graph.transact("groupAdd", () => canvas.graph.add(group));
    }

    /**
     * Wraps the whole selection (nodes, groups, reroutes) in a new group, as one undo step.
     * @param {string} [title]
     * @returns {object|null} the group
     */
    groupSelected(title = "Group") {
        const items = this.selectedItems;
        if (!this.graph || !items.length) return null;
        const group = new LiteGraph.LGraphGroup(title);
        this.graph.transact("groupSelected", () => {
            group.resizeTo(items, this.options.groups_add_default_spacing ?? 10);
            this.graph.add(group);
        });
        this.setDirty(true, true);
        return group;
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
    getBoundaryForSelection() {
        const nodesBounds = this.boundaryNodesForSelection();
        if (!nodesBounds || nodesBounds.left === null) return false;
        const ln = nodesBounds.left.getBounding();
        const tn = nodesBounds.top.getBounding();
        const rn = nodesBounds.right.getBounding();
        const bn = nodesBounds.bottom.getBounding();
        return [ln[0], tn[1], rn[0] + rn[2] - ln[0], bn[1] + bn[3] - tn[1]];
    }

    getCoordinateCenter(ob4v) {
        return [ob4v[0] + (ob4v[2] / 2), ob4v[1] + (ob4v[3] / 2)];
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
        const graph = Object.values(nodes).find((node) => node?.graph)?.graph;
        if (graph?.transact && !graph.isInTransaction) {
            return graph.transact("alignNodes", () => LGraphCanvas.alignNodes(nodes, direction, align_to));
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

        for (const node of Object.values(nodes)) { // the nodes passed in, not whatever the active canvas has selected
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

        graph?.onGraphChanged({
            action: "alignNodes"
        });
        graph?.setDirtyCanvas(true, true);
        if (canvas) {
            canvas.dirty_canvas = true;
            canvas.dirty_bgcanvas = true;
        }
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
                var category_name = category.replace(base_category_regex, "").split('/')[0];
                var category_path = base_category === '' ? category_name + '/' : base_category + category_name + '/';

                var name = category_name;
                if (name.indexOf("::") != -1) // in case it has a namespace like "shader::math/rand" it hides the namespace
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
                            LiteGraph.log_debug("onMenuAdd", "inner_onMenuAdded", "categories callback", ...arguments);
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
                    has_submenu: false,
                    callback: function(value, event, mouseEvent, contextMenu) {
                        var first_event = contextMenu.getFirstEvent();
                        canvas.graph.beforeChange();
                        var node = LiteGraph.createNode(value.value);
                        LiteGraph.log_debug("onMenuAdd", "inner_onMenuAdded", "node entry callback", first_event, ...arguments);
                        if (node) {
                            node.pos = canvas.convertEventToCanvasOffset(first_event);
                            canvas.graph.add(node);
                        }
                        if (callback) {
                            callback(node);
                        }
                        canvas.graph.afterChange();
                    },
                };

                entries.push(entry);

            });

            const e_check = e ? e : options.event;
            // LiteGraph.log_debug("lgraphcanvas", "onMenuAdd", "inner_onMenuAdded", "opening ContextMenu", e, options);
            LiteGraph.log_debug("lgraphcanvas", "onMenuAdd", "inner_onMenuAdded", "opening ContextMenu", entries, {
                event: e_check,
                parentMenu: prev_menu
            }, ref_window);

            LiteGraph.ContextMenu(entries, {
                event: e_check,
                parentMenu: prev_menu
            }, ref_window);

        }

        inner_onMenuAdded('', prev_menu);
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
        r = node.processCallbackHandlers("onGetInputs", {
            def_cb: node.onGetInputs
        });
        if (r !== null && (typeof(r) == "object")) {
            if (typeof(r.return_value) == "object") {
                options = r.return_value;
            } else if (typeof(r.length) !== "undefined") {
                options = r;
            }
        }

        var entries = [];
        if (options) {
            for (let i = 0; i < options.length; i++) {
                var entry = options[i];
                if (!entry) {
                    entries.push(null);
                    continue;
                }
                var label = entry[0];
                if (!entry[2])
                    entry[2] = {};

                if (entry[2].label) {
                    label = entry[2].label;
                }

                entry[2].removable = true;
                entry[2].optional = true;
                var data = {
                    content: label,
                    value: entry
                };
                if (entry[1] == LiteGraph.ACTION) {
                    data.className = "event";
                }
                entries.push(data);
            }
        }

        // add callback for modifing the menu elements onMenuNodeInputs
        r = node.processCallbackHandlers("onMenuNodeInputs", {
            def_cb: node.onMenuNodeInputs
        }, entries);
        if (r !== null && (typeof(r) == "object")) {
            if (typeof(r.return_value) == "object") {
                entries = r.return_value;
            }
        }

        if (LiteGraph.do_add_triggers_slots) { // canvas.allow_addOutSlot_onExecuted
            if (node.findInputSlot("onTrigger") == -1) {
                entries.push({
                    content: "On Trigger",
                    value: ["onTrigger", LiteGraph.EVENT, {
                        nameLocked: true,
                        removable: true,
                        optional: true
                    }],
                    className: "event"
                }); // , opts: {}
            }
        }

        if (!entries.length) {
            LiteGraph.log_debug("lgraphcanvas", "showMenuNodeOptionalInputs", "no input entries");
            return;
        }

        LiteGraph.ContextMenu(
            entries, {
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
                node.processCallbackHandlers("onNodeInputAdd", {
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
        let r = node.processCallbackHandlers("onGetOutputs", {
            def_cb: node.onGetOutputs
        });
        if (r !== null && (typeof(r) == "object")) {
            if (typeof(r.return_value) == "object") {
                options = r.return_value;
            } else if (typeof(r.length) !== "undefined") {
                options = r;
            }
        }

        var entries = [];
        if (options) {
            for (let i = 0; i < options.length; i++) {
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
                if (!entry[2])
                    entry[2] = {};
                if (entry[2].label) {
                    label = entry[2].label;
                }
                entry[2].removable = true;
                entry[2].optional = true;
                var data = {
                    content: label,
                    value: entry
                };
                if (entry[1] == LiteGraph.EVENT) {
                    data.className = "event";
                }
                entries.push(data);
            }
        }

        // add callback for modifing the menu elements onMenuNodeOutputs
        r = node.processCallbackHandlers("onMenuNodeOutputs", {
            def_cb: node.onMenuNodeOutputs
        }, entries);
        if (r !== null && (typeof(r) == "object")) {
            if (typeof(r.return_value) == "object") {
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
            entries, {
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
                    entries.push({
                        content: i,
                        value: value[i]
                    });
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
                node.processCallbackHandlers("onNodeOutputAdd", {
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
            if (typeof value == "object")
                value = JSON.stringify(value);
            let info = node.getPropertyInfo(i);
            let info_type = info && info !== null ? info.type : "string";
            let readonly = info && info !== null ? (info.readonly ? true : false) : false;
            let prevent_input_bind = readonly || (info && info !== null) ? (readonly || info.prevent_input_bind ? true : false) : false;
            let prevent_output_bind = info && info !== null ? (info.prevent_output_bind ? true : false) : false;
            let propName = info && info !== null && info.label ? info.label : i;

            // parse combo (and parse single number and number in string)
            if (info_type == "enum" || info_type == "combo" ||
                info_type == "number"
            ) {
                value = LGraphCanvas.getPropertyPrintableValue(value, info.values);
                // TODO add option to format numbers in string
                // }else if((info_type == "string" && !isNaN(value) && !isNaN(parseFloat(value)))){
                //     value = LGraphCanvas.getPropertyPrintableValue( value, info.values );
            }

            // value could contain invalid html characters, clean that
            value = LGraphCanvas.decodeHTML(value);
            let htmlEntry = "<span class='property_name'>" +
                propName +
                "</span>" +
                "<span class='property_value'>" +
                value +
                "</span>";

            let callbacks_on_element_created = []; // can pass in element construction function

            // allow property binding
            if (!prevent_input_bind && !readonly && LiteGraph.properties_allow_input_binding) {
                let relSlotOb = node.findInputSlot(propName, true);
                let hasSlotByName = relSlotOb !== -1;
                let slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                htmlEntry += "<span class='property_input_bind'>" +
                    (slotBinded
                        // input exists and is binded
                        ?
                        "<span class='property_input_binded'>linked</span>"
                        // input is not binded or does not exist
                        :
                        (hasSlotByName ?
                            "<span class='property_input_exist'>" +
                            "<input type='button' class='btn_bind_in btn_bind_property_to_input' value='link input' />" +
                            "</span>" :
                            "<span class=''>" +
                            "<input type='button' class='btn_bind_in btn_bind_property_to_input' value='create input' />" +
                            "</span>"
                        )
                    ) +
                    "</span>";
                callbacks_on_element_created.push(function(el, menu) {
                    LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "calling callback_on_element_created", propName, el, slotBinded, relSlotOb);
                    let btnConfirm = el.querySelector('.btn_bind_in');
                    if (!btnConfirm) {
                        el.disabled = "disabled";
                        LiteGraph.log_warn("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", ".btn_bind_in not found", propName, el);
                    } else {
                        LiteGraph.log_info("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", ".btn_bind_in binding!", btnConfirm, propName);
                        btnConfirm.addEventListener("click", function(ev) {
                            relSlotOb = node.findInputSlot(propName, true);
                            hasSlotByName = relSlotOb !== -1;
                            slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                            if (!slotBinded) {
                                if (!hasSlotByName) {
                                    LiteGraph.log_info("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "callback_on_element_created", "properties_allow_input_binding", "btnConfirm", "CREATING NEW INPUT ON NODE", relSlotOb, propName);
                                    // propName
                                    node.addInput(propName, info_type, {
                                        removable: true,
                                        nameLocked: true
                                    });
                                    relSlotOb = node.findInputSlot(propName, true);
                                }
                                LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "callback_on_element_created", "properties_allow_input_binding", "btnConfirm", "Linking property to input", relSlotOb);
                                relSlotOb.param_bind = true;
                                menu.close?.(ev, true);
                            } else {
                                LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "callback_on_element_created", "properties_allow_input_binding", "btnConfirm", "Property already binded", relSlotOb, propName);
                            }
                            ev.preventDefault();
                            ev.stopPropagation();
                        });
                    }
                });
            }
            if (!prevent_output_bind && LiteGraph.properties_allow_output_binding) {
                let relSlotOb = node.findOutputSlot(propName, true);
                let hasSlotByName = relSlotOb !== -1;
                let slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                htmlEntry += "<span class='property_output_bind'>" +
                    (slotBinded
                        // output exists and is binded
                        ?
                        "<span class='property_output_binded'>linked</span>"
                        // output is not binded or does not exist
                        :
                        (hasSlotByName ?
                            "<span class='property_output_exist'>" +
                            "<input type='button' class='btn_bind_out btn_bind_property_to_output' value='link output' />" +
                            "</span>" :
                            "<span class=''>" +
                            "<input type='button' class='btn_bind_out btn_bind_property_to_output' value='create output' />" +
                            "</span>"
                        )
                    ) +
                    "</span>";
                callbacks_on_element_created.push(function(el, menu) {
                    LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "output calling callback_on_element_created", propName, el, slotBinded, relSlotOb);
                    let btnConfirm = el.querySelector('.btn_bind_out');
                    if (!btnConfirm) {
                        el.disabled = "disabled";
                        LiteGraph.log_warn("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "output .btn_bind_out not found", propName, el);
                    } else {
                        LiteGraph.log_info("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "output .btn_bind_out binding!", btnConfirm, propName);
                        btnConfirm.addEventListener("click", function(ev) {
                            relSlotOb = node.findOutputSlot(propName, true);
                            hasSlotByName = relSlotOb !== -1;
                            slotBinded = hasSlotByName ? relSlotOb.param_bind : false;
                            if (!slotBinded) {
                                if (!hasSlotByName) {
                                    LiteGraph.log_info("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "output callback_on_element_created", "properties_allow_output_binding", "btnConfirm", "CREATING NEW OUTPUT ON NODE", relSlotOb, propName);
                                    // propName
                                    node.addOutput(propName, info_type, {
                                        removable: true,
                                        nameLocked: true
                                    });
                                    relSlotOb = node.findOutputSlot(propName, true);
                                }
                                LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "output callback_on_element_created", "properties_allow_output_binding", "btnConfirm", "Linking property to output", relSlotOb);
                                relSlotOb.param_bind = true;
                                menu.close?.(ev, true);
                            } else {
                                LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "onShowMenuNodeProperties", "output callback_on_element_created", "properties_allow_output_binding", "btnConfirm", "Property already binded", relSlotOb, propName);
                            }
                            ev.preventDefault();
                            ev.stopPropagation();
                        });
                    }
                });
            }
            // WIP TODO RESTART FROM HERE allow widget binding
            if (LiteGraph.properties_allow_widget_binding) {
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
            entries, {
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
            if (!this.disabled && !v.disabled) {
                if (!v.readonly) {
                    var rect = this.getBoundingClientRect();
                    canvas.showEditPropertyValue(node, v.value, {
                        position: [rect.left, rect.top]
                    });
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
        graph?.onGraphChanged({
            action: "resize",
            doSave: true
        });

        const fApplyMultiNode = (node) => {
            node.size = node.computeSize();
            node.processCallbackHandlers("onResize", {
                def_cb: node.onResize
            }, node.size);
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
            fApplyMultiNode(node);
        } else {
            for (let i in graphcanvas.selected_nodes) {
                fApplyMultiNode(graphcanvas.selected_nodes[i]);
            }
        }

        node.setDirtyCanvas(true, true);
    }

    showLinkMenu(link, e) {
        var that = this;
        LiteGraph.log_verbose(link);
        var node_left = that.graph.getNodeById(link.origin_id);
        var node_right = that.graph.getNodeById(link.target_id);
        var fromType = false;
        if (node_left && node_left.outputs && node_left.outputs[link.origin_slot]) fromType = node_left.outputs[link.origin_slot].type;
        var destType = false;
        if (node_right && node_right.outputs && node_right.outputs[link.target_slot]) destType = node_right.inputs[link.target_slot].type;

        var options = ["Add Node", "Add Reroute"];
        if (link.parentId !== undefined) options.push("Remove Reroutes");
        options.push(null, "Delete", null);


        var menu = LiteGraph.ContextMenu(options, {
            event: e,
            title: link.data != null ? link.data.constructor.name : null,
            callback: inner_clicked,
        });

        function inner_clicked(v, options, e) {
            switch (v) {
                case "Add Node":
                    LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "inner_clicked", "calling onMenuAdd");
                    LGraphCanvas.onMenuAdd(null, null, e, menu, function(node) {
                        if (!node.inputs || !node.inputs.length || !node.outputs || !node.outputs.length) {
                            return;
                        }
                        LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "inner_clicked", "node autoconnect on add node on link");
                        // leave the connection type checking inside connectByType
                        if (node_left.connectByType(link.origin_slot, node, fromType)) {
                            node.connectByType(link.target_slot, node_right, destType);
                            node.pos[0] -= node.size[0] * 0.5;
                        }
                    });
                    break;

                case "Delete":
                    LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "inner_clicked", "remove link");
                    that.graph.removeLink(link.id);
                    break;
                case "Add Reroute":
                    // at the link marker, nearest the target
                    that.graph.addReroute(link._pos ? [link._pos[0], link._pos[1]] : that.graph_mouse.slice(0, 2), link);
                    break;
                case "Remove Reroutes":
                    that.graph.transact("removeReroutes", () => {
                        for (const reroute of that.graph.getRerouteChain(link)) that.graph.removeReroute(reroute.id);
                    });
                    break;
                default:
                    LiteGraph.log_debug("lgraphcanvas", "showLinkMenu", "inner_clicked", "node in the middle or other operation", ...arguments);
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
        var opts = Object.assign({
                nodeFrom: null, // input
                slotFrom: null, // input
                nodeTo: null, // output
                slotTo: null, // output
                position: [], // pass the event coords
                nodeType: null, // choose a nodetype to add, AUTO to set at first good
                posAdd: [0, 0], // adjust x,y
                posSizeFix: [0, 0], // alpha, adjust the position x,y based on the new node size w,h
            },
            optPass,
        );
        var that = this;

        var isFrom = opts.nodeFrom && opts.slotFrom !== null;
        var isTo = !isFrom && opts.nodeTo && opts.slotTo !== null;

        if (!isFrom && !isTo) {
            LiteGraph.log_warn("lgraphcanvas", "createDefaultNodeForSlot", "No data passed " + opts.nodeFrom + " " + opts.slotFrom + " " + opts.nodeTo + " " + opts.slotTo);
            return false;
        }
        if (!opts.nodeType) {
            LiteGraph.log_warn("lgraphcanvas", "createDefaultNodeForSlot", "No type");
            return false;
        }

        var nodeX = isFrom ? opts.nodeFrom : opts.nodeTo;
        var slotX = isFrom ? opts.slotFrom : opts.slotTo;

        var iSlotConn = false;
        switch (typeof slotX) {
            case "string":
                iSlotConn = isFrom ? nodeX.findOutputSlot(slotX, false) : nodeX.findInputSlot(slotX, false);
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
                LiteGraph.log_warn("lgraphcanvas", "createDefaultNodeForSlot", "Cant get slot information " + slotX);
                return false;
        }

        if (slotX === false || iSlotConn === false) {
            LiteGraph.log_warn("lgraphcanvas", "createDefaultNodeForSlot", "bad slotX " + slotX + " " + iSlotConn);
        }

        // check for defaults nodes for this slottype
        var fromSlotType = slotX.type == LiteGraph.EVENT ? "_event_" : slotX.type;
        var slotTypesDefault = isFrom ? LiteGraph.slot_types_default_out : LiteGraph.slot_types_default_in;
        if (slotTypesDefault && slotTypesDefault[fromSlotType]) {
            if (slotX.link !== null) {
                // is connected
            } else {
                // is not not connected
            }
            var nodeNewType = false;
            if (typeof slotTypesDefault[fromSlotType] == "object") {
                for (var typeX in slotTypesDefault[fromSlotType]) {
                    if (opts.nodeType == slotTypesDefault[fromSlotType][typeX] || opts.nodeType == "AUTO") {
                        nodeNewType = slotTypesDefault[fromSlotType][typeX];
                        LiteGraph.log_verbose("lgraphcanvas", "createDefaultNodeForSlot", "opts.nodeType == slotTypesDefault[fromSlotType][typeX] :: " + opts.nodeType);
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
                if (newNode) {
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
                        opts.position[0] + opts.posAdd[0] + (opts.posSizeFix[0] ? opts.posSizeFix[0] * newNode.size[0] : 0),
                        opts.position[1] + opts.posAdd[1] + (opts.posSizeFix[1] ? opts.posSizeFix[1] * newNode.size[1] : 0),
                    ]; // that.last_click_position; //[e.canvasX+30, e.canvasX+5];*/

                    // that.graph.afterChange();

                    // connect the two!
                    if (isFrom) {
                        opts.nodeFrom.connectByType(iSlotConn, newNode, fromSlotType);
                    } else {
                        opts.nodeTo.connectByTypeOutput(iSlotConn, newNode, fromSlotType);
                    }

                    /* if connecting in between
                    if (isFrom && isTo){
                        //@TODO
                        // managing externally ? eg. link
                    }
                    */

                    return true;

                } else {
                    LiteGraph.log_warn("lgraphcanvas", "createDefaultNodeForSlot", "failed creating", nodeNewType);
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
        }, optPass);

        var that = this;
        var isFrom = opts.nodeFrom && opts.slotFrom;
        var isTo = !isFrom && opts.nodeTo && opts.slotTo;

        if (!isFrom && !isTo) {
            LiteGraph.log_warn("lgraphcanvas", "showConnectionMenu", "No data passed to showConnectionMenu");
            return false;
        }

        var nodeX = isFrom ? opts.nodeFrom : opts.nodeTo;
        var slotX = isFrom ? opts.slotFrom : opts.slotTo;

        var iSlotConn = false;
        switch (typeof slotX) {
            case "string":
                iSlotConn = isFrom ? nodeX.findOutputSlot(slotX, false) : nodeX.findInputSlot(slotX, false);
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
                LiteGraph.log_warn("lgraphcanvas", "showConnectionMenu", "Cant get slot information " + slotX);
                return false;
        }

        var options = ["Add Node", null];

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
            title: (slotX && slotX.name != "" ? (slotX.name + (fromSlotType ? " | " : "")) : "") + (slotX && fromSlotType ? fromSlotType : ""),
            callback: (v, options, e) => {
                const cases = {
                    "Add Node": () => {
                        LiteGraph.log_debug("lgraphcanvas", "showConnectionMenu", "callback", "Add Node calling onMenuAdd", v, options, e);
                        LGraphCanvas.onMenuAdd(null, null, e, menu, (node) => {
                            isFrom ? opts.nodeFrom.connectByType(iSlotConn, node, fromSlotType) : opts.nodeTo.connectByTypeOutput(iSlotConn, node, fromSlotType);
                        });
                    },
                    "Search": () => {
                        isFrom ? that.showSearchBox(e, {
                            node_from: opts.nodeFrom,
                            slot_from: slotX,
                            type_filter_in: fromSlotType
                        }) : that.showSearchBox(e, {
                            node_to: opts.nodeTo,
                            slot_from: slotX,
                            type_filter_out: fromSlotType
                        });
                    },
                    "default": () => {
                        LiteGraph.log_debug("lgraphcanvas", "showConnectionMenu", "callback", "createDefaultNodeForSlot", v, options, e);
                        // const new_pos = this.convertOffsetToEditorArea([opts.e.clientX, opts.e.clientY]);
                        const new_pos = [opts.e.canvasX, opts.e.canvasY];
                        that.createDefaultNodeForSlot(Object.assign(opts, {
                            position: new_pos,
                            nodeType: v
                        }));
                    },
                };

                // Execute the corresponding function based on the value of v
                (cases[v] || cases["default"])();
            },
        });

        return false;
    }

    doShowNodeInfoEditor(node, item, e, options) {
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
            dialog.style.left = (canvas.clientWidth || canvas.width) * 0.5 + offsetx + "px";
            dialog.style.top = (canvas.clientHeight || canvas.height) * 0.5 + offsety + "px";
        }

        var button = dialog.querySelector("button");
        button.addEventListener("click", inner);
        canvas.parentNode.appendChild(dialog);

        if (input) input.focus();

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
        if (multiline)
            dialog.innerHTML = "<span class='name'></span> <textarea autofocus class='value'></textarea><button class='rounded'>OK</button>";
        else
            dialog.innerHTML = "<span class='name'></span> <input autofocus type='text' class='value'/><button class='rounded'>OK</button>";

        dialog.close = () => {
            this.prompt_box = null;
            dialog.parentNode?.removeChild(dialog);
        };

        // this canvas (active_canvas is only set by pointer input, so keyboard-opened prompts had none)
        var graphcanvas = this.canvas ? this : LGraphCanvas.active_canvas;
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
                    if (e.target.localName !== "textarea" && typeof(callback) == "function") {
                        callback(input.value);
                        this.setDirty(true); // CHECK should probably call graphChanged instead
                    }
                    LiteGraph.log_debug("lgraphcanvas", "prompt", "prompt v2 ENTER", input.value, e.target.localName, callback);
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
            if (typeof(callback) == "function") {
                callback(input.value);
                this.setDirty(true); // CHECK should probably call graphChanged instead
            }
            LiteGraph.log_debug("lgraphcanvas", "prompt", "prompt v2 OK", input.value, callback);
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
            dialog.style.left = (canvas.clientWidth || canvas.width) * 0.5 + offsetx + "px";
            dialog.style.top = (canvas.clientHeight || canvas.height) * 0.5 + offsety + "px";
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

        if (typeof(event) !== "object" || typeof(event.target) == "undefined") {
            if (typeof(options.event) !== "undefined") {
                LiteGraph.log_debug("lgraphcanvas", "showSearchBox", "event not passed directly, using event from options", options.event, "first par was:", event);
                event = options.event;
            }
        }
        LiteGraph.log_debug("lgraphcanvas", "showSearchBox", event, options);

        if (typeof(that) == "undefined") {
            var that = this;
        } else {
            LiteGraph.log_debug("lgraphcanvas", "showSearchBox", "using already present graphcanvas reference", that, "this is other?", this);
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
        if (options.show_close_button) {
            dialog.innerHTML += "<button class='close_searchbox close'>X</button>";
        }
        dialog.innerHTML += "<div class='helper'></div>";

        if (root_document.fullscreenElement)
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
            // pending helper refresh must not run against a closed dialog
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            this.blur();
            canvas.focus();
            root_document.body.style.overflow = "";

            setTimeout(function() {
                that.canvas?.focus();
                if (!that.canvas) {
                    LiteGraph.log_debug("lgraphcanvas", "showSearchBox", "dont have reference to canvas", that, "this is other?", this);
                }
            }, 20); // important, if canvas loses focus keys wont be captured
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        };

        if (typeof(that.ds) !== "undefined") {
            if (that.ds.scale > 1) {
                dialog.style.transform = `scale(${that.ds.scale})`;
            }
        } else {
            LiteGraph.log_debug("lgraphcanvas", "showSearchBox", "ds reference not found, is this graphcanvas or what", "that", that, "this", this);
        }

        // hide on mouse leave
        if (options.hide_on_mouse_leave) {
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
                if (that.search_box)
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
                        select(unescape(selected.dataset["type"])); // the label may differ from the type (Comfy 49a3e31)
                    } else if (first) {
                        select(first);
                    } else {
                        dialog.close();
                    }
                } else {
                    if (timeout) {
                        clearTimeout(timeout);
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

                for (let iK = 0; iK < nSlots; iK++) {
                    let opt = document.createElement('option');
                    opt.value = aSlots[iK];
                    opt.innerHTML = aSlots[iK];
                    selIn.appendChild(opt);
                    if (options.type_filter_in !== false && (options.type_filter_in + "").toLowerCase() == (aSlots[iK] + "").toLowerCase()) {
                        // selIn.selectedIndex ..
                        opt.selected = true; // ? check this: multiselect!! (NO!,NO?)
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","comparing IN INCLUDED"+options.type_filter_in+" :: "+aSlots[iK]);
                    } else {
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","excluded comparing IN "+options.type_filter_in+" :: "+aSlots[iK]);
                    }
                }
                selIn.addEventListener("change", function() {
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
                    if (options.type_filter_out !== false && (options.type_filter_out + "").toLowerCase() == (aSlots[iK] + "").toLowerCase()) {
                        // selOut.selectedIndex ..
                        opt.selected = true; // ? check this: multiselect!! (NO!,NO?)
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","comparing IN INCLUDED"+options.type_filter_in+" :: "+aSlots[iK]);
                    } else {
                        // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas","showSearchBox","excluded comparing IN "+options.type_filter_in+" :: "+aSlots[iK]);
                    }
                }
                selOut.addEventListener("change", function() {
                    refreshHelper();
                });
            }
        }

        if (options.show_close_button) {
            var button = dialog.querySelector(".close");
            button.addEventListener("click", dialog.close);
        }

        // compute best position
        var rect = canvas.getBoundingClientRect();

        var left = (event ? event.clientX : (rect.left + rect.width * 0.5)) - 80;
        var top = (event ? event.clientY : (rect.top + rect.height * 0.5)) - 20;

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
            dialog.style.left = (canvas.clientWidth || canvas.width) * 0.5 + offsetx + "px";
            dialog.style.top = (canvas.clientHeight || canvas.height) * 0.5 + offsety + "px";
        }
        canvas.parentNode.appendChild(dialog);
        */

        input.focus();
        // Firefox can drop focus requested in the same frame the dialog is attached (Comfy 6f121fc)
        (typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout)(() => input.focus());
        if (options.show_all_on_open) refreshHelper();

        function select(name) {
            if (name) {
                if (!that || typeof(that) !== "object" || typeof(that.processCallbackHandlers) == "undefined") {
                    LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "select", "that reference is wrong", that, dialog, this, options);
                    return;
                }
                let r = that.processCallbackHandlers("onSearchBoxSelection", {
                    def_cb: that.onSearchBoxSelection
                }, name, event, graphcanvas);
                if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
                    // managed
                } else {
                    var extra = LiteGraph.searchbox_extras[name.toLowerCase()];
                    if (extra) {
                        name = extra.type;
                    }

                    const insertGraph = graphcanvas.graph;
                    insertGraph.beforeChange();
                    insertGraph.beginTransaction("insertNode");
                    // every exit below (failure, early return, exception) must close the change
                    try {
                        var node = LiteGraph.createNode(name);

                        if (!node) {
                            LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "select", "failed creating the node", node);
                            dialog.close();
                            return false;
                        }

                        node.pos = graphcanvas.convertEventToCanvasOffset(event);
                        graphcanvas.graph.add(node, false, {
                            doProcessChange: false
                        });

                        if (extra && extra.data) {
                            if (extra.data.properties) {
                                for (let i in extra.data.properties) {
                                    node.addProperty(i, extra.data.properties[i]);
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
                                    if (options.slot_from.name || options.slot_from.name === "") {
                                        iS = options.node_from.findOutputSlot(options.slot_from.name);
                                    } else {
                                        iS = -1;
                                    }
                                    if (iS == -1 && typeof options.slot_from.slot_index !== "undefined") iS = options.slot_from.slot_index;
                                    LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "slotindexfromobject search", "iS", iS, "ofFromOut", options.node_from.outputs, options.slot_from);
                                    break;
                                case "number":
                                    iS = options.slot_from;
                                    break;
                                default:
                                    iS = 0; // try with first if no name set
                            }
                            if (typeof options.node_from.outputs[iS] !== "undefined") {
                                if (iS !== false && iS > -1) {
                                    options.node_from.connectByType(iS, node, options.node_from.outputs[iS].type);
                                }
                            } else {
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
                                    } else {
                                        iS = -1;
                                    }
                                    if (iS == -1 && typeof options.slot_from.slot_index !== "undefined") iS = options.slot_from.slot_index;
                                    break;
                                case "number":
                                    iS = options.slot_from;
                                    break;
                                default:
                                    iS = 0; // try with first if no name set
                            }
                            if (typeof options.node_to.inputs[iS] !== "undefined") {
                                if (iS !== false && iS > -1) {
                                    // try connection
                                    options.node_to.connectByTypeOutput(iS, node, options.node_to.inputs[iS].type);
                                }
                            } else {
                                LiteGraph.log_warn("lgraphcanvas", "showSearchBox", "select", "cant find slot node_to to join using from slot type", options.slot_from, options.node_to.inputs);
                            }
                        }

                        insertGraph.onGraphChanged({
                            action: "insertNode"
                        }); // the add itself skips history
                    } finally {
                        insertGraph.commitTransaction();
                        insertGraph.afterChange();
                    }
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
                selected = forward ?
                    helper.childNodes[0] :
                    helper.childNodes[helper.childNodes.length];
            } else {
                selected = forward ?
                    selected.nextSibling :
                    selected.previousSibling;
                if (!selected) {
                    selected = prev;
                }
            }
            if (!selected) {
                return;
            }
            selected.classList.add("selected");
            selected.scrollIntoView({
                block: "end",
                behavior: "smooth"
            });
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
                const query = NodeSearch.parseQuery(str);
                const scores = new Map(); // type -> ranking score, filled by inner_test_filter

                let sIn, sOut;

                // filter by type preprocess
                if (options.do_type_filter && that.search_box) {
                    sIn = that.search_box.querySelector(".slot_in_type_filter");
                    sOut = that.search_box.querySelector(".slot_out_type_filter");
                } else {
                    sIn = false;
                    sOut = false;
                }

                const inner_test_filter = function(type, optsIn = {}) {
                    var optsDef = {
                        skipFilter: false,
                        inTypeOverride: false,
                        outTypeOverride: false,
                    };
                    var opts = Object.assign(optsDef, optsIn);
                    var ctor = LiteGraph.registered_node_types[type];
                    if (filter && ctor.filter != filter)
                        return false;

                    // words, i:/o:/c:/s: filters and definition filters (see src/nodesearch.js)
                    const def = LiteGraph.getNodeDefinition(type);
                    if (def) {
                        if (LiteGraph.nodeSearch && !LiteGraph.nodeSearch.passesFilters(def)) return false;
                        if (!NodeSearch.matchesFilters(def, query.filters)) return false;
                    }
                    const textScore = def && query.terms.length ? NodeSearch.score(def, query) : 0;
                    if ((!options.show_all_if_empty || str) && textScore < 0)
                        return false;
                    scores.set(type, textScore);

                    // filter by slot IN, OUT types
                    if (options.do_type_filter && !opts.skipFilter) {
                        var sType = type;
                        let doesInc;

                        var sV = sIn.value;
                        if (opts.inTypeOverride !== false) sV = opts.inTypeOverride;
                        // if (sV.toLowerCase() == "_event_") sV = LiteGraph.EVENT; // -1

                        if (sIn && sV) {
                            // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN will check filter against "+sV);
                            if (LiteGraph.registered_slot_in_types[sV] && LiteGraph.registered_slot_in_types[sV].nodes) { // type is stored
                                // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN check "+sType+" in "+LiteGraph.registered_slot_in_types[sV].nodes);
                                doesInc = LiteGraph.registered_slot_in_types[sV].nodes.includes(sType);
                                if (doesInc !== false) {
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+sType+" HAS "+sV);
                                } else {
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+LiteGraph.registered_slot_in_types[sV]," DONT includes "+type);
                                    return false;
                                }
                            }
                        }

                        sV = sOut.value;
                        if (opts.outTypeOverride !== false) {
                            sV = opts.outTypeOverride;
                        }
                        // if (sV.toLowerCase() == "_event_") sV = LiteGraph.EVENT; // -1

                        if (sOut && sV) {
                            // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN will check filter against "+sV);
                            if (LiteGraph.registered_slot_out_types[sV] && LiteGraph.registered_slot_out_types[sV].nodes) { // type is stored
                                // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN check "+sType+" in "+LiteGraph.registered_slot_in_types[sV].nodes);
                                doesInc = LiteGraph.registered_slot_out_types[sV].nodes.includes(sType);
                                if (doesInc !== false) {
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+sType+" HAS "+sV);
                                } else {
                                    // DBG EXCESS LiteGraph.log_verbose("lgraphcanvas", "showSearchBox", "inner_test_filter", "IN "+LiteGraph.registered_slot_in_types[sV]," DONT includes "+type);
                                    return false;
                                }
                            }
                        }
                    }
                    return true;
                };

                // extras
                for (let i in LiteGraph.searchbox_extras) {
                    var extra = LiteGraph.searchbox_extras[i];
                    // var passTextSearch = extra.desc.toLowerCase().indexOf(str) !== -1;
                    let str_node = extra.desc.toLowerCase();
                    let str_title = extra.title ? extra.title.toLowerCase() : "";
                    let a_srch_parts = str.toLowerCase().split(" ");
                    let passTextSearch = true;
                    for (let i_srch of a_srch_parts) {
                        // DBG EXCESS LiteGraph.log_verbose("search","check",i_srch,str_node); // verbose debug, make new higher level
                        if (i_srch.trim() === "") continue;
                        if (str_node.indexOf(i_srch) == -1 && str_title.indexOf(i_srch) == -1) {
                            passTextSearch = false;
                            // DBG EXCESS LiteGraph.log_verbose("search","do not pass",i_srch,str_node); // verbose debug, make new higher level
                            break;
                        }
                    }
                    if ((!options.show_all_if_empty || str) && !passTextSearch) {
                        continue;
                    }
                    var ctor = LiteGraph.registered_node_types[extra.type];
                    if (ctor && ctor.filter != filter)
                        continue;
                    if (!inner_test_filter(extra.type))
                        continue;
                    addResult(extra.desc, "searchbox_extra");
                    if (LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit) {
                        break;
                    }
                }

                var filtered = null;
                // filter by nodetype
                if (Array.prototype.filter) { // filter supported
                    let keys = Object.keys(LiteGraph.registered_node_types); // types
                    filtered = keys.filter(inner_test_filter);
                    // best matches first (see NodeSearch.score), then alphabetical by title
                    filtered.sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0) ||
                        String(LiteGraph.getNodeDefinition(a)?.title ?? a).localeCompare(String(LiteGraph.getNodeDefinition(b)?.title ?? b)));
                } else {
                    filtered = [];
                    for (let i in LiteGraph.registered_node_types) {
                        if (inner_test_filter(i)) {
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
                    if (LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit) {
                        break;
                    }
                }

                // add general type if filtering
                if (options.show_general_after_typefiltered &&
                    (sIn.value || sOut.value)
                ) {
                    let filtered_extra = [];
                    for (let i in LiteGraph.registered_node_types) {
                        if (inner_test_filter(i, {
                                inTypeOverride: sIn && sIn.value ? "*" : false,
                                outTypeOverride: sOut && sOut.value ? "*" : false
                            }))
                            filtered_extra.push(i);
                    }
                    for (let i = 0; i < filtered_extra.length; i++) {
                        addResult(filtered_extra[i], "generic_type");
                        if (LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit) {
                            break;
                        }
                    }
                }

                // check il filtering gave no results
                if ((sIn.value || sOut.value) &&
                    ((helper.childNodes.length == 0 && options.show_general_if_none_on_typefilter))
                ) {
                    let filtered_extra = [];
                    for (let i in LiteGraph.registered_node_types) {
                        if (inner_test_filter(i, {
                                skipFilter: true
                            }))
                            filtered_extra.push(i);
                    }
                    for (let i = 0; i < filtered_extra.length; i++) {
                        addResult(filtered_extra[i], "not_in_filter");
                        if (LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit) {
                            break;
                        }
                    }
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
        let type = info && info !== null ? info.type : "string";

        let input_html;

        if (type == "string" || type == "number" || type == "array" || type == "object" || type == "code") {
            input_html = "<input autofocus type='text' class='value'/>";
        } else if ((type == "enum" || type == "combo") && info.values) {
            LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "CREATING ENUM COMBO", input, type, dialog);
            input_html = "<select autofocus type='text' class='value'>";
            for (let i in info.values) {
                var v = i;
                if (info.values.constructor === Array)
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
            LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "showEditPropertyValue ENUM COMBO", input, type, dialog);
            input = dialog.querySelector("select");
            input.addEventListener("change", function(e) {
                dialog.modified();
                LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "Enum change", input, info, e.target);
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

            if (info && info.values && info.values.constructor === Object && info.values[value] != undefined)
                value = info.values[value];

            if (typeof node.properties[property] == "number") {
                value = Number(value);
            }
            if (type == "array" || type == "object") {
                value = JSON.parse(value);
            }
            const prevValue = node.properties[property];
            node.properties[property] = value;
            node.graph?.onGraphChanged({
                action: "propertyChanged",
                doSave: true
            });

            // Call onPropertyChanged and block the change if needed
            let r = node.processCallbackHandlers("onPropertyChanged", {
                def_cb: node.onPropertyChanged
            }, property, value, prevValue);
            if (r === false || (r !== null && (typeof(r) == "object" && r.return_value === false))) {
                node.properties[property] = prevValue;
                LiteGraph.log_debug("lgraphcanvas", "showEditPropertyValue", "setValue", "prevent property set by cbHandler", property, value, prevValue, r);
            }

            if (options.onclose)
                options.onclose();
            dialog.close();
            node.setDirtyCanvas(true, true);
        }

        return dialog;
    }

    // TODO refactor, theer are different dialog, some uses createDialog, some dont
    createDialog(html, options) {
        var def_options = {
            checkForInput: false,
            closeOnLeave: true,
            closeOnLeave_checkModified: true
        };
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
            offsetx += this.cssWidth * 0.5;
            offsety += this.cssHeight * 0.5;
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
                    iX.addEventListener("keydown", function(e) {
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
            if (options.closeOnLeave || LiteGraph.dialog_close_on_mouse_leave)
                if (!dialog.is_modified && LiteGraph.dialog_close_on_mouse_leave)
                    dialogCloseTimer = setTimeout(dialog.close, LiteGraph.dialog_close_on_mouse_leave_delay); // dialog.close();
        });
        dialog.addEventListener("pointerenter", function(_event) {
            if (options.closeOnLeave || LiteGraph.dialog_close_on_mouse_leave)
                if (dialogCloseTimer) clearTimeout(dialogCloseTimer);
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

        if (options.width)
            root.style.width = options.width + (options.width.constructor === Number ? "px" : "");
        if (options.height)
            root.style.height = options.height + (options.height.constructor === Number ? "px" : "");
        if (options.closable) {
            var close = document.createElement("span");
            close.innerHTML = "&#10005;";
            close.classList.add("close");
            close.addEventListener("click", function() {
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
            if (root.parentNode)
                root.parentNode.removeChild(root);
            /* XXX CHECK THIS */
            if (this.parentNode) {
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
            } else {
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
            } else {
                vTo = root.footer.style.display != "block" ? "block" : "none";
            }
            root.footer.style.display = vTo;
        }

        root.clear = function() {
            this.content.innerHTML = "";
        }

        root.addHTML = function(code, classname, on_footer) {
            var elem = document.createElement("div");
            if (classname)
                elem.className = classname;
            elem.innerHTML = code;
            if (on_footer)
                root.footer.appendChild(elem);
            else
                root.content.appendChild(elem);
            return elem;
        }

        root.addButton = function(name, callback, options) {
            var elem = document.createElement("button");
            elem.innerText = name;
            elem.options = options;
            elem.classList.add("btn");
            elem.addEventListener("click", callback);
            root.footer.appendChild(elem);
            return elem;
        }

        root.addSeparator = function() {
            var elem = document.createElement("div");
            elem.className = "separator";
            root.content.appendChild(elem);
        }

        root.addWidget = function(type, name, value, options, callback) {
            options = options || {};
            var str_value = String(value);
            type = type.toLowerCase();
            if (type == "number")
                str_value = LiteGraph.formatNumber(value, 3);

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

            if (type == "code") {
                elem.addEventListener("click", function(_event) {
                    root.inner_showCodePad(this.dataset["property"]);
                });
            } else if (type == "boolean") {
                elem.classList.add("boolean");
                if (value)
                    elem.classList.add("bool-on");
                elem.addEventListener("click", function() {
                    // var v = node.properties[this.dataset["property"]];
                    // node.setProperty(this.dataset["property"],!v); this.innerText = v ? "on" : "off";
                    var propname = this.dataset["property"];
                    this.value = !this.value;
                    this.classList.toggle("bool-on");
                    this.querySelector(".property_value").innerText = this.value ? "on" : "off";
                    innerChange(propname, this.value);
                });
            } else if (type == "string" || type == "number" || type == "undefined") {
                value_element.setAttribute("contenteditable", true);
                value_element.addEventListener("keydown", function(e) {
                    if (e.key == "Enter" && (type != "string" || !e.shiftKey)) { // allow for multiline; key also covers NumpadEnter
                        e.preventDefault();
                        this.blur();
                    }
                });
                value_element.addEventListener("blur", function() {
                    var v = this.innerText;
                    var propname = this.parentNode.dataset["property"];
                    var proptype = this.parentNode.dataset["type"];
                    if (proptype == "number")
                        v = Number(v);
                    innerChange(propname, v);
                });
            } else if (type == "enum" || type == "combo") {
                str_value = LGraphCanvas.getPropertyPrintableValue(value, options.values);
                value_element.innerText = str_value;

                LiteGraph.log_debug("lgraphcanvas", "createPanel", "addWidget", "ENUM COMBO", type, str_value, value_element, options);

                value_element.addEventListener("click", function(event) {
                    var values = options.values || [];
                    var propname = this.parentNode.dataset["property"];
                    var elem_that = this;
                    LiteGraph.ContextMenu(
                        values, {
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
                        innerChange(propname, v);
                        return false;
                    }
                });
            }

            root.content.appendChild(elem);

            function innerChange(name, value) {
                LiteGraph.log_debug("lgraphcanvas", "createPanel", "addWidget", "innerChange", name, value, options);
                // that.dirty_canvas = true;
                if (options.callback)
                    options.callback(name, value, options);
                if (callback)
                    callback(name, value, options);
            }

            return elem;
        }

        if (root.onOpen && typeof root.onOpen == "function") root.onOpen();

        return root;
    }

    static getPropertyPrintableValue(value, values) {
        if (!values) {
            if (typeof(value) == "number") {
                return parseFloat(value.toFixed(5));
                // TODO add option to format numbers in string
                // }else if((typeof(value) == "string" && !isNaN(value) && !isNaN(parseFloat(value)))){
                //     return parseFloat(Number(value).toFixed(5));
            }
            return String(value);
        }

        if (values.constructor === Array) {
            return String(value);
        }

        if (values.constructor === Object) {
            var desc_value = "";
            for (var k in values) {
                if (values[k] != value)
                    continue;
                desc_value = k;
                break;
            }
            return String(value) + " (" + desc_value + ")";
        }
    }

    showShowGraphOptionsPanel(refOpts, obEv) {
        let graphcanvas;
        if (this.constructor && this.constructor.name == "HTMLDivElement") {
            // assume coming from the menu event click
            if (!obEv?.event?.target?.lgraphcanvas) {
                LiteGraph.log_warn("lgraphcanvas", "showShowGraphOptionsPanel", "References not found to add optionPanel", refOpts, obEv); // need a ref to canvas obj
                LiteGraph.log_debug("lgraphcanvas", "showShowGraphOptionsPanel", "!obEv || !obEv.event || !obEv.event.target || !obEv.event.target.lgraphcanvas", obEv, obEv.event, obEv.event.target, obEv.event.target.lgraphcanvas);
                return;
            }
            graphcanvas = obEv.event.target.lgraphcanvas;
        } else {
            // assume called internally
            graphcanvas = this;
        }
        graphcanvas.closePanels();
        var ref_window = graphcanvas.getCanvasWindow();
        var panel = graphcanvas.createPanel("Options", {
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
                switch (name) {
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
                        LiteGraph.log_verbose("lgraphcanvas", "showShowGraphOptionsPanel", "want to update graph options: " + name + ": " + value);
                        if (options && options.key) {
                            name = options.key;
                        }
                        if (options.values) {
                            value = Object.values(options.values).indexOf(value);
                        }
                        LiteGraph.log_verbose("lgraphcanvas", "showShowGraphOptionsPanel", "update graph option: " + name + ": " + value);
                        graphcanvas[name] = value;
                        break;
                }
            };

            // panel.addWidget( "string", "Graph name", "", {}, fUpdate); // implement

            var aProps = [...(LiteGraph.availableCanvasOptions || [])].sort();
            for (var pI in aProps) {
                var pX = aProps[pI];
                panel.addWidget("boolean", pX, graphcanvas[pX], {
                    key: pX,
                    on: "on",
                    off: "off"
                }, fUpdate);
            }

            panel.addWidget("combo", "Render mode", LiteGraph.LINK_RENDER_MODES[graphcanvas.links_render_mode], {
                key: "links_render_mode",
                values: LiteGraph.LINK_RENDER_MODES
            }, fUpdate);

            panel.addSeparator();

            panel.footer.innerHTML = ""; // clear

        }
        inner_refresh();

        graphcanvas.canvas.parentNode.appendChild(panel);
    }

    showShowNodePanel(node) {
        this.SELECTED_NODE = node;
        this.closePanels();
        var ref_window = this.getCanvasWindow();

        var graphcanvas = this;
        var panel = this.createPanel(node.title || "", {
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
            panel.addHTML("<span class='node_type'>" + node.type + "</span>" +
                "<span class='node_desc'>" + (node.constructor.desc || "") + "</span>" +
                "<span class='separator'></span>");

            panel.addHTML("<h3>Properties</h3>");

            const fUpdate = (name, value) => {
                graphcanvas.graph.beforeChange(node);
                switch (name) {
                    case "Title":
                        node.title = value;
                        break;
                    case "Mode":
                        var kV = Object.values(LiteGraph.NODE_MODES).indexOf(value);
                        if (kV >= 0 && LiteGraph.NODE_MODES[kV]) {
                            node.changeMode(kV);
                        } else {
                            LiteGraph.log_warn("lgraphcanvas", "showShowNodePanel", "unexpected mode", value, kV);
                        }
                        break;
                    case "Color":
                        if (LGraphCanvas.node_colors[value]) {
                            node.color = LGraphCanvas.node_colors[value].color;
                            node.bgcolor = LGraphCanvas.node_colors[value].bgcolor;
                        } else {
                            LiteGraph.log_warn("lgraphcanvas", "showShowNodePanel", "unexpected color", value);
                        }
                        break;
                    default:
                        node.setProperty(name, value);
                        break;
                }
                graphcanvas.graph.afterChange();
                graphcanvas.dirty_canvas = true;
            };

            panel.addWidget("string", "Title", node.title, {}, fUpdate);

            panel.addWidget("combo", "Mode", LiteGraph.NODE_MODES[node.mode], {
                values: LiteGraph.NODE_MODES
            }, fUpdate);

            var nodeCol = "";
            if (node.color !== undefined) {
                nodeCol = Object.keys(LGraphCanvas.node_colors).filter(function(nK) {
                    return LGraphCanvas.node_colors[nK].color == node.color;
                });
            }

            panel.addWidget("combo", "Color", nodeCol, {
                values: Object.keys(LGraphCanvas.node_colors)
            }, fUpdate);

            for (var pName in node.properties) {
                var value = node.properties[pName];
                var info = node.getPropertyInfo(pName);
                let type = info && info !== null ? info.type : "string";

                // in case the user wants control over the side panel widget
                if (node.onAddPropertyToPanel && node.onAddPropertyToPanel(pName, panel, value, info, fUpdate)) {
                    continue;
                }
                panel.addWidget(info.widget || type, pName, value, info, fUpdate);
            }

            panel.addSeparator();

            if (node.onShowCustomPanelInfo)
                node.onShowCustomPanelInfo(panel);

            panel.footer.innerHTML = ""; // clear
            panel.addButton("Delete", function() {
                if (node.block_delete)
                    return;
                node.graph.remove(node);
                panel.close();
            }).classList.add("delete");
        }

        panel.inner_showCodePad = function(propname) {
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
                if (e.key == "Enter" && e.ctrlKey) {
                    node.setProperty(propname, textarea.value);
                    fDoneWith();
                }
            });
            panel.toggleAltContent(true);
            panel.toggleFooterVisibility(false);
            textarea.style.height = "calc(100% - 40px)";
            /* }*/
            var assign = panel.addButton("Assign", function() {
                node.setProperty(propname, textarea.value);
                fDoneWith();
            });
            panel.alt_content.appendChild(assign); // panel.content.appendChild(assign);
            var button = panel.addButton("Close", fDoneWith);
            button.style.float = "right";
            panel.alt_content.appendChild(button); // panel.content.appendChild(button);
        }

        inner_refresh();

        this.canvas.parentNode.appendChild(panel);
    }

    showSubgraphPropertiesDialog(node) {
        LiteGraph.log_debug("lgraphcanvas", "showSubgraphPropertiesDialog", "showing subgraph properties dialog");

        var old_panel = this.canvas.parentNode.querySelector(".subgraph_dialog");
        if (old_panel)
            old_panel.close();

        var panel = this.createPanel("Subgraph Inputs", {
            closable: true,
            width: 500
        });
        panel.node = node;
        panel.classList.add("subgraph_dialog");

        function inner_refresh() {
            panel.clear();

            // show currents
            if (node.inputs)
                for (let i = 0; i < node.inputs.length; ++i) {
                    var input = node.inputs[i];
                    if (input.not_subgraph_input)
                        continue;
                    var html = "<button>&#10005;</button> <span class='bullet_icon'></span><span class='name'></span><span class='type'></span>";
                    var elem = panel.addHTML(html, "subgraph_property");
                    elem.dataset["name"] = input.name;
                    elem.dataset["slot"] = i;
                    elem.querySelector(".name").innerText = input.name;
                    elem.querySelector(".type").innerText = input.type;
                    elem.querySelector("button").addEventListener("click", function(_event) {
                        node.removeInput(Number(this.parentNode.dataset["slot"]));
                        inner_refresh();
                    });
                }
        }

        // add extra
        var html = " + <span class='label'>Name</span><input class='name'/><span class='label'>Type</span><input class='type'></input><button>+</button>";
        var elem = panel.addHTML(html, "subgraph_property extra", true);
        elem.querySelector("button").addEventListener("click", function(_event) {
            var elem = this.parentNode;
            var name = elem.querySelector(".name").value;
            var type = elem.querySelector(".type").value;
            if (!name || node.findInputSlot(name) != -1)
                return;
            if (["event", "action"].indexOf(type) > -1) {
                type = LiteGraph.EVENT;
            }
            node.addInput(name, type);
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
        var panel = this.createPanel("Subgraph Outputs", {
            closable: true,
            width: 500
        });
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
                    elem.querySelector("button").addEventListener("click", function(_event) {
                        node.removeOutput(Number(this.parentNode.dataset["slot"]));
                        inner_refresh();
                    });
                }
        }

        // add extra
        var html = " + <span class='label'>Name</span><input class='name'/><span class='label'>Type</span><input class='type'></input><button>+</button>";
        var elem = panel.addHTML(html, "subgraph_property extra", true);
        elem.querySelector(".name").addEventListener("keydown", function(_event) {
            if (_event.keyCode == 13) {
                addOutput.apply(this)
            }
        })
        elem.querySelector("button").addEventListener("click", function(_event) {
            addOutput.apply(this)
        });

        function addOutput() {
            var elem = this.parentNode;
            var name = elem.querySelector(".name").value;
            var type = elem.querySelector(".type").value;
            if (!name || node.findOutputSlot(name) != -1)
                return;
            if (["event", "action"].indexOf(type) > -1) {
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
        if (panel)
            panel.close(); // ? panel.close.call(panel);
        panel = document.querySelector("#option-panel");
        if (panel)
            panel.close(); // ? panel.close.call(panel);
    }

    /**
     * will close .litegraph.dialog
     * @returns void
     */
    checkPanels() {
        if (!this.canvas || !this.canvas.parentNode)
            return;
        var panels = this.canvas.parentNode.querySelectorAll(".litegraph.dialog");
        for (let i = 0; i < panels.length; ++i) {
            var panel = panels[i];
            if (!panel.node)
                continue;
            // close panels of nodes that left this graph (panels have no .graph of their own)
            if (panel.node.graph !== this.graph)
                panel.close();
        }
    }

    static onMenuNodeCollapse(value, options, e, menu, node) {
        node.graph.beforeChange( /* ?*/ );

        var fApplyMultiNode = function(node) {
            node.collapse();
        }

        var graphcanvas = LGraphCanvas.active_canvas;
        if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
            fApplyMultiNode(node);
        } else {
            for (let i in graphcanvas.selected_nodes) {
                fApplyMultiNode(graphcanvas.selected_nodes[i]);
            }
        }

        node.graph.afterChange( /* ?*/ );
    }

    static onMenuNodePin(value, options, e, menu, node) {
        node.pin();
    }

    static onMenuNodeMode(value, options, e, menu, node) {
        LiteGraph.ContextMenu(
            LiteGraph.NODE_MODES, {
                event: e,
                callback: inner_clicked,
                parentMenu: menu,
                node: node
            },
        );

        function inner_clicked(v) {
            if (!node) {
                return;
            }
            var kV = Object.values(LiteGraph.NODE_MODES).indexOf(v);
            const fApplyMultiNode = (node) => {
                if (kV >= 0 && LiteGraph.NODE_MODES[kV])
                    node.changeMode(kV);
                else {
                    LiteGraph.log_warn("lgraphcanvas", "onMenuNodeMode", "unexpected mode", v, kV);
                    node.changeMode(LiteGraph.ALWAYS);
                }
            }

            var graphcanvas = LGraphCanvas.active_canvas;
            if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
                fApplyMultiNode(node);
            } else {
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
            content: "<span style='display: block; padding-left: 4px;'>No color</span>",
        });

        for (let i in LGraphCanvas.node_colors) {
            let color = LGraphCanvas.node_colors[i];
            value = {
                value: i,
                content: "<span style='display: block; color: #999; padding-left: 4px; border-left: 8px solid " +
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
            } else {
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
            node.graph.beforeChange( /* ?*/ ); // node

            const fApplyMultiNode = (node) => {
                node.shape = v;
            }

            var graphcanvas = LGraphCanvas.active_canvas;
            if (!graphcanvas.selected_nodes || Object.keys(graphcanvas.selected_nodes).length <= 1) {
                fApplyMultiNode(node);
            } else {
                for (let i in graphcanvas.selected_nodes) {
                    fApplyMultiNode(graphcanvas.selected_nodes[i]);
                }
            }

            node.graph.afterChange( /* ?*/ ); // node
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
        } else {
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
        if (!graphcanvas) {
            // ? happens ?
            // throw new Error("no graph");
            LiteGraph.log_warn("lgraphcanvas", "onMenuNodeToSubgraph", "graphcanvas invalid");
            return;
        }

        var nodes_list = Object.values(graphcanvas.selected_nodes || {});
        if (!nodes_list.length)
            nodes_list = [node];

        // one undo step; nothing is left behind if the conversion fails (rollback)
        var subgraph_node = graph.convertToSubgraph(nodes_list);

        graphcanvas.deselectAllNodes();
        if (subgraph_node) graphcanvas.selectNodes([subgraph_node]);
        graphcanvas.setDirty(true, true);
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
        } else {
            for (let i in graphcanvas.selected_nodes) {
                fApplyMultiNode(graphcanvas.selected_nodes[i]);
            }
        }

        if (Object.keys(newSelected).length) {
            graphcanvas.selectNodes(newSelected);
        }

        node.graph.afterChange();

        node.setDirtyCanvas(true, true);
    }

    getCanvasMenuOptions() {
        var options = null;
        var that = this;
        let r = this.processCallbackHandlers("getMenuOptions", {
            def_cb: this.getMenuOptions
        });
        if (r !== null && (r === true || (typeof(r) == "object" && r.return_value === true))) {
            // managed
        } else {

            options = [{
                    content: "Add Node",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuAdd,
                },
                {
                    content: "Search",
                    has_submenu: false,
                    callback: that.showSearchBox,
                },
                {
                    content: "Add Group",
                    callback: LGraphCanvas.onGroupAdd
                },
                // { content: "Arrange", callback: that.graph.arrange },
                // {content:"Collapse All", callback: LGraphCanvas.onMenuCollapseAll }
            ];

            if (this.selectedItems.length) {
                options.push({
                    content: "Group selected",
                    callback: () => this.groupSelected()
                });
            }

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

        r = this.processCallbackHandlers("getExtraMenuOptions", {
            def_cb: this.getExtraMenuOptions
        }, this, options);
        if (r !== null && (typeof(r) == "object")) {
            if (typeof(r.return_value) == "object") {
                options = options.concat(r.return_value);
            }
        }

        // extension contributions (LiteGraph.menus.register("canvas", ...))
        if (options) LiteGraph.menus?.contribute("canvas", LiteGraph.commands.contextFor(this), options);
        return options;
    }

    // called by processContextMenu to extract the menu list
    getNodeMenuOptions(node) {
        var options = null;

        let r = node.processCallbackHandlers("getMenuOptions", {
            def_cb: node.getMenuOptions
        }, this);
        if (r !== null && (typeof(r) == "object")) {
            if (typeof(r.return_value) == "object") {
                options = r.return_value;
            }
        }
        if (options === null) {
            options = [{
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
                }
            ];
            if (node.resizable !== false) {
                options.push({
                    content: "Resize",
                    callback: LGraphCanvas.onMenuResizeNode,
                });
            }
            options.push({
                    content: "Collapse",
                    callback: LGraphCanvas.onMenuNodeCollapse,
                }, {
                    content: "Pin",
                    callback: LGraphCanvas.onMenuNodePin
                }, {
                    content: "Colors",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuNodeColors,
                }, {
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

        r = node.processCallbackHandlers("getExtraMenuOptions", {
            def_cb: node.getExtraMenuOptions
        }, this, options);
        if (r !== null && (typeof(r) == "object")) {
            if (typeof(r.return_value) == "object") {
                if (typeof(r.return_value.length) !== "undefined" && r.return_value.length) {
                    options = options.concat(r.return_value);
                } else {
                    LiteGraph.log_warn("getExtraMenuOptions", "not array", r.return_value);
                }
            } else {
                if (typeof(r.length) !== "undefined" && r.length) {
                    options = options.concat(r);
                } else {
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
            disabled: !(node.removable !== false && !node.block_delete),
            callback: LGraphCanvas.onMenuNodeRemove,
        });

        if (node.graph) {
            node.graph.processCallbackHandlers("onGetNodeMenuOptions", {
                def_cb: node.graph.onGetNodeMenuOptions
            }, options, node);
        }

        // extension contributions (LiteGraph.menus.register("node", ...))
        LiteGraph.menus?.contribute("node", LiteGraph.commands.contextFor(this, {
            node
        }), options);
        return options;
    }

    getGroupMenuOptions(group) {
        const canvas = this;
        const modes = LiteGraph.NODE_MODES.map((name, mode) => ({
                content: name,
                mode
            }))
            .filter((entry) => entry.content);
        var o = [{
                content: "Title",
                callback: LGraphCanvas.onShowNodeInfoEditor
            },
            {
                content: "Fit to contents",
                callback: () => {
                    if (!group?.graph) return;
                    group.graph.transact("groupFit", () => {
                        group.fitToContents();
                        group.graph.onGraphChanged({
                            action: "groupFit"
                        });
                    });
                    canvas.setDirty(true, true);
                },
            },
            {
                content: "Mode for all nodes",
                has_submenu: true,
                submenu: {
                    options: modes,
                    callback: (entry) => {
                        if (!group?.graph) return;
                        group.graph.transact("groupNodesMode", () => {
                            if (group.setNodesMode(entry.mode).length) group.graph.onGraphChanged({
                                action: "groupNodesMode"
                            });
                        });
                        canvas.setDirty(true, true);
                    },
                },
            },
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
            {
                content: "Remove",
                callback: LGraphCanvas.onMenuNodeRemove
            },
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

        if (node)
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
            let r = node.processCallbackHandlers("getSlotMenuOptions", {
                def_cb: node.getSlotMenuOptions
            }, slot);
            if (r !== null && (typeof(r) == "object" && typeof(r.return_value) == "object")) {
                menu_info = r.return_value;
            } else {
                if (LiteGraph.canSetSlotsLabels) {
                    menu_info.push({
                        content: "Set Label",
                        slot: slot
                    });
                }
                var _slot = slot.input || slot.output;
                if (_slot.nameLocked === false || LiteGraph.canRenameSlots) {
                    menu_info.push({
                        content: "Rename Slot",
                        slot: slot
                    });
                }
                if (slot?.output?.links?.length || slot.input?.link) {
                    menu_info.push({
                        content: "Disconnect Links",
                        slot: slot
                    });
                }
                if (_slot.removable || LiteGraph.canRemoveSlots) {
                    menu_info.push(_slot.locked ?
                        "Cannot remove" :
                        {
                            content: "Remove Slot",
                            slot: slot
                        });
                }
            }
            var slotOb = slot.input || slot.output;
            options.title = slotOb.type || "*";
            if (slotOb.type == LiteGraph.ACTION) {
                options.title = "Action";
                if (LiteGraph.allow_action_widget_button) {
                    menu_info.push({
                        content: "Toggle widget",
                        callback: () => {
                            node.toggleActionWidget(slotOb.name, slot);
                        }
                    });
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
                        callback: function(this_mi, options, e, menu) {
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
                const slot_info = info.input ?
                    node.getInputInfo(info.slot) :
                    node.getOutputInfo(info.slot);
                const dialog = that.createDialog(
                    "<span class='name'>Name</span><input autofocus type='text'/><button>OK</button>",
                    options,
                );
                const input = dialog.querySelector("input");
                if (input && slot_info) {
                    input.value = slot_info.name || "";
                }
                const inner = function() {
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
                const slot_info = info.input ?
                    node.getInputInfo(info.slot) :
                    node.getOutputInfo(info.slot);
                const dialog = that.createDialog(
                    "<span class='name'>Label</span><input autofocus type='text'/><button>OK</button>",
                    options,
                );
                const input = dialog.querySelector("input");
                if (input && slot_info) {
                    input.value = slot_info.label || "";
                }
                const inner = function() {
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
        red: {
            color: "#322",
            bgcolor: "#533",
            groupcolor: "#A88"
        },
        brown: {
            color: "#332922",
            bgcolor: "#593930",
            groupcolor: "#b06634"
        },
        green: {
            color: "#232",
            bgcolor: "#353",
            groupcolor: "#8A8"
        },
        blue: {
            color: "#223",
            bgcolor: "#335",
            groupcolor: "#88A"
        },
        pale_blue: {
            color: "#2a363b",
            bgcolor: "#3f5159",
            groupcolor: "#3f789e"
        },
        cyan: {
            color: "#233",
            bgcolor: "#355",
            groupcolor: "#8AA"
        },
        purple: {
            color: "#323",
            bgcolor: "#535",
            groupcolor: "#a1309b"
        },
        yellow: {
            color: "#432",
            bgcolor: "#653",
            groupcolor: "#b58b2a"
        },
        black: {
            color: "#222",
            bgcolor: "#000",
            groupcolor: "#444"
        },
    };

    /**
     * returns ture if low qualty rendering requered at requested scale
     * */
    lowQualityRenderingRequired(activation_scale) {
        if (this.ds.scale < activation_scale) {
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
export class LGraphGroup {

    static opts = {
        inclusion_distance: 36 // distance to border to consider included inside the group 
    }

    /**
     * Constructor for the LGraphGroup class.
     * @param {string} [title="Group"] - The title of the group.
     */
    constructor(title = "Group") {
        this.title = title;
        this.font_size = 24;
        this.color = LiteGraph.LGraphCanvas.node_colors.pale_blue?.groupcolor ?? "#AAA";
        this._bounding = new Float32Array([10, 10, 140, 80]);
        this._pos = this._bounding.subarray(0, 2);
        this._size = this._bounding.subarray(2, 4);
        this._nodes = [];
        this._groups = [];
        this.graph = null;
        this.callbackhandler_setup();
    }

    callbackhandler_setup() {
        this.cb_handler = new CallbackHandler(this);
    }

    registerCallbackHandler() {
        if (!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler() {
        if (!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers() {
        if (!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.processCallbackHandlers(...arguments);
    }

    set pos(v) {
        if (!v || v.length < 2) {
            return;
        }
        this._pos[0] = v[0];
        this._pos[1] = v[1];
    }
    get pos() {
        return this._pos;
    }

    set size(v) {
        if (!v || v.length < 2) {
            return;
        }
        this._size[0] = Math.max(140, v[0]);
        this._size[1] = Math.max(80, v[1]);
    }
    get size() {
        return this._size;
    }

    /**
     * Updates the properties of the LGraphGroup instance based on the provided configuration object.
     * @param {Object} o - The configuration object with properties to update.
     * @param {string} o.title - The new title for the group.
     * @param {Float32Array} o.bounding - The new bounding box for the group.
     * @param {string} o.color - The new color for the group.
     * @param {number} o.font_size - The new font size for the group.
     */
    configure(o) {
        this.title = o.title;
        if (o.id !== undefined) this.id = o.id;
        // this._bounding.set(o.bounding); // TODO original, will remove this comment: Happens that arrays are sometimes (strangely) exported as object with keyed strings: eg. [v0, v1] to {"0": v0, "1": v1}
        // this._bounding = LiteGraph.parseStringifyObject(o.bounding, this._bounding); // tried specific cleaner implementation, reverted to cloneObject
        this._bounding = LiteGraph.cloneObject(o.bounding, this._bounding);
        this.color = o.color;
        if (o.font_size)
            this.font_size = o.font_size;
        // keep fields this runtime does not model (e.g. another editor's id/flags/locked) for serialize
        this.extra_fields = {};
        for (const key in o) {
            if (!["id", "title", "bounding", "color", "font_size"].includes(key)) {
                this.extra_fields[key] = LiteGraph.cloneObject(o[key]);
            }
        }
    }

    /**
     * Serializes the LGraphGroup instance into a plain JavaScript object.
     * @returns {Object} - The serialized representation of the LGraphGroup instance.
     * - title: string - The title of the group.
     * - bounding: Array<number> - The bounding box coordinates [x, y, width, height].
     * - color: string - The color of the group.
     * - font_size: number - The font size of the group.
     */
    serialize() {
        var b = this._bounding;
        return {
            ...LiteGraph.cloneObject(this.extra_fields ?? {}),
            ...(this.id !== undefined ? {
                id: this.id
            } : {}),
            title: this.title,
            bounding: Array.from(b, (value) => Math.round(value)), // plain array, not a typed array (JSON tuple)
            color: this.color,
            font_size: this.font_size,
        };
    }

    /**
     * Moves the LGraphGroup instance by the specified deltas and optionally updates the positions of contained nodes.
     * @param {number} deltax - The amount to move the group along the x-axis.
     * @param {number} deltay - The amount to move the group along the y-axis.
     * @param {boolean} ignore_nodes - Flag to indicate whether to move contained nodes along with the group.
     */
    move(deltax, deltay, ignore_nodes) {
        if (isNaN(deltax))
            console.error?.("LGraphGroup.move() deltax NaN");
        if (isNaN(deltay))
            console.error?.("LGraphGroup.move() deltay NaN");

        this._pos[0] += deltax;
        this._pos[1] += deltay;

        if (ignore_nodes) {
            return;
        }
        this._nodes.forEach((node) => {
            node.pos[0] += deltax;
            node.pos[1] += deltay;
        });
        this._groups.forEach((group) => {
            group.pos[0] += deltax;
            group.pos[1] += deltay;
        });
    }

    /**
     * Resizes the group to enclose items (nodes, groups, reroutes), with padding and room for the title.
     * Adapted from Comfy-Org/litegraph.js (MIT) LGraphGroup.resizeTo.
     * @param {Array<object>} items
     * @param {number} [padding=10]
     * @returns {boolean} false when there was nothing to enclose
     */
    resizeTo(items, padding = 10) {
        const box = [Infinity, Infinity, -Infinity, -Infinity];
        const bounding = new Float32Array(4);
        for (const item of items ?? []) {
            if (!item || item === this) continue;
            if (typeof item.getBounding === "function") item.getBounding(bounding);
            else if (item.pos) bounding.set([item.pos[0] - 6, item.pos[1] - 6, 12, 12]); // reroute
            else continue;
            box[0] = Math.min(box[0], bounding[0]);
            box[1] = Math.min(box[1], bounding[1]);
            box[2] = Math.max(box[2], bounding[0] + bounding[2]);
            box[3] = Math.max(box[3], bounding[1] + bounding[3]);
        }
        if (!Number.isFinite(box[0])) return false;
        const title = (this.font_size ?? LiteGraph.DEFAULT_GROUP_FONT_SIZE ?? 24) * 1.4;
        this._bounding[0] = box[0] - padding;
        this._bounding[1] = box[1] - padding - title;
        this._bounding[2] = box[2] - box[0] + padding * 2;
        this._bounding[3] = box[3] - box[1] + padding * 2 + title;
        return true;
    }

    /** Shrinks or grows the group around what is currently inside it. */
    fitToContents(padding = 10) {
        if (!this.graph) return false;
        this.recomputeInsideNodes();
        return this.resizeTo([...this._nodes, ...this._groups], padding);
    }

    /**
     * Sets the execution mode of every node inside the group (LiteGraph.ALWAYS, NEVER, ...).
     * @returns {Array<object>} the nodes changed
     */
    setNodesMode(mode) {
        if (!this.graph) return [];
        this.recomputeInsideNodes();
        const changed = this._nodes.filter((node) => node.mode !== mode);
        for (const node of changed) node.changeMode ? node.changeMode(mode) : (node.mode = mode);
        return changed;
    }

    /**
     * Recomputes and updates the list of nodes inside the LGraphGroup based on their bounding boxes.
     * This method checks for nodes that overlap with the group's bounding box and updates the internal nodes list accordingly.
     */
    recomputeInsideNodes() {
        this._nodes.length = 0;
        var nodes = this.graph._nodes;
        var node_bounding = new Float32Array(4);

        this._nodes = nodes.filter((node) => {
            node.getBounding(node_bounding);
            return LiteGraph.overlapBounding(this._bounding, node_bounding, -LGraphGroup.opts.inclusion_distance);
        });
        this.recomputeInsideGroups();
    }

    /**
     * Recomputes and updates the list of groups [LGraphGroup] inside this LGraphGroup based on their bounding boxes.
     */
    recomputeInsideGroups() {
        this._groups.length = 0;
        var groups = this.graph._groups;
        var group_bounding = new Float32Array(4);

        this._groups = groups.filter((group) => {
            if (group === this) return false; // a group is not its own child (move() would shift it twice)
            group.getBounding(group_bounding);
            return LiteGraph.isBoundingInsideRectangle(group_bounding, ...this._bounding)
            // return LiteGraph.overlapBounding(this._bounding, group_bounding, -LGraphGroup.opts.inclusion_distance);
        });
    }

    /**
     * The group's rectangle [x, y, width, height]. A group's title is drawn inside its bounding
     * (unlike a node's, which sits above `pos`), so the node implementation does not apply.
     * @param {Float32Array|number[]} [out]
     * @returns {Float32Array|number[]} out
     */
    getBounding(out = new Float32Array(4)) {
        out[0] = this._bounding[0];
        out[1] = this._bounding[1];
        out[2] = this._bounding[2];
        out[3] = this._bounding[3];
        return out;
    }
    isPointInside = LiteGraph.LGraphNode.prototype.isPointInside;
    setDirtyCanvas = LiteGraph.LGraphNode.prototype.setDirtyCanvas;
}

// src/lgraphnode.js
/*
title: string
pos: [x,y]
size: [x,y]
size_basic: [x,y] minimum size for the node beforeRecalculation

input|output: every connection
    +  { name:string, type:string, pos: [x,y]=Optional, direction: "input"|"output", links: Array });

general properties:
    + clip_area: if you render outside the node, it will be clipped
    + unsafe_execution: not allowed for safe execution
    + skip_repeated_outputs: when adding new outputs, it wont show if there is one already connected
    + resizable: if set to false it wont be resizable with the mouse
    + horizontal: slots are distributed horizontally
    + widgets_start_y: widgets start at y distance from the top of the node

flags object:
    + collapsed: if it is collapsed

supported callbacks:
    + onAdded: when added to graph (warning: this is called BEFORE the node is configured when loading)
    + onRemoved: when removed from graph
    + onStart:	when the graph starts playing
    + onStop:	when the graph stops playing
    + onDrawForeground: render the inside widgets inside the node
    + onDrawBackground: render the background area inside the node (only in edit mode)
    + onMouseDown
    + onMouseMove
    + onMouseUp
    + onMouseEnter
    + onMouseLeave
    + onExecute: execute the node
    + onPropertyChanged: when a property is changed in the panel (return true to skip default behaviour)
    + onGetInputs: returns an array of possible extra inputs
    + onGetOutputs: returns an array of possible extra outputs
    + onBounding: in case this node has a bigger bounding than the node itself (the callback receives the bounding as [x,y,w,h])
    + onDblClick: double clicked in the node
    + onInputDblClick: input slot double clicked (can be used to automatically create a node connected)
    + onOutputDblClick: output slot double clicked (can be used to automatically create a node connected)
    + onConfigure: called after the node has been configured
    + onSerialize: to add extra info when serializing (the callback receives the object that should be filled with the data)
    + onSelected
    + onDeselected
    + onDropItem : DOM item dropped over the node
    + onDropFile : file dropped over the node
    + onConnectInput : if returns false the incoming connection will be canceled
    + onConnectionsChange : a connection changed (new one or removed) (LiteGraph.INPUT or LiteGraph.OUTPUT, slot, true if connected, link_info, input_info )
    + onAction: action slot triggered
    + getExtraMenuOptions: to add option to context menu
*/

/**
 * Base Class for all the node type classes
 * @class LGraphNode
 * @param {String} name a name for the node
 */

export class LGraphNode {

    // trace() keeps at most this many messages in node.console
    static MAX_CONSOLE = 100;

    // size arrays created as the generic default (slot changes may resize them in place)
    static _default_sizes = new WeakSet();

    /** true while the node still uses the generic default size, i.e. no size was assigned */
    hasDefaultSize() {
        return LGraphNode._default_sizes.has(this.size);
    }

    cb_handler = false;
    executionEnvironment = "all"; // 'browser', 'node', 'all'
    requiredLibraries = []; // List of library keys

    constructor(title = "") {
        this.title = title;
        this.initializeNodeState();
        if (new.target === LGraphNode) {
            this.post_constructor();
        } else {
            // Subclass fields and constructor code must exist before initialization hooks.
            this.ready = Promise.resolve().then(() => this.post_constructor());
            this.ready.catch(() => {}); // The caller can still observe failure through ready.
        }
    }

    initializeNodeState() {
        this.executionEnvironment ??= "all";
        this.requiredLibraries ??= [];
        this.libraries ??= [];
        this.graph ??= null;
        this.id ??= LiteGraph.use_uuids ? LiteGraph.uuidv4() : -1;
        this.type ??= this.constructor.type ?? null;
        this.title ??= this.constructor.title ?? "";
        this.inputs ??= [];
        this.outputs ??= [];
        this.connections ??= [];
        this.properties ??= {};
        this.properties_info ??= [];
        this.flags ??= {};
        this.mode ??= LiteGraph.ALWAYS;
        this._pos ??= new Float32Array(LiteGraph.DEFAULT_POSITION);
        if (this.size == null) {
            this.size = [LiteGraph.NODE_WIDTH, 60];
            LGraphNode._default_sizes.add(this.size);
        }
        this.size_basic ??= this.size;
        this.callbackhandler_setup();
    }

    validateExecutionEnvironment() {
        return !this.executionEnvironment || ["all", "both", "any", "*", getRuntime()].includes(this.executionEnvironment);
    }

    validateRuntime() {
        return !this.runtime || ["all", "both", "any", "*", getRuntime()].includes(this.runtime);
    }

    /** Initialize exactly once; basic nodes are ready synchronously, dependencies asynchronously. */
    post_constructor() {
        if (this._initializationPromise) return this._initializationPromise;
        this.initializeNodeState();
        let resolveReady;
        let rejectReady;
        this.ready = this._initializationPromise = new Promise((resolve, reject) => {
            resolveReady = resolve;
            rejectReady = reject;
        });
        // Creation remains synchronous. Consumers may await ready to handle dependency errors.
        this.ready.catch(() => {});
        this.initialization_state = "loading";
        const fail = (error) => {
            this.loading_lib = false;
            this.initialization_state = "error";
            this.initialization_error = error;
            rejectReady(error);
        };
        const complete = () => {
            this.loading_lib = false;
            this.processCallbackHandlers("onPostConstruct", {
                def_cb: this.onPostConstruct
            });
            LiteGraph.processCallbackHandlers("on_lgraphnode_construct", {
                def_cb: LiteGraph.on_lgraphnode_construct,
            }, this);
            this.initialization_state = "ready";
            resolveReady(this);
        };
        try {
            this.wrong_environment = !this.validateExecutionEnvironment() || !this.validateRuntime();
            if (this.wrong_environment) {
                this.mode = LiteGraph.NEVER;
                throw new Error(`Node ${this.type || this.title} cannot run in ${getRuntime()}`);
            }
            if (this.libraries.length || this.requiredLibraries.length) {
                this.loading_lib = true;
                this.loadLibraries().then(complete).catch(fail);
            } else {
                complete();
            }
        } catch (error) {
            fail(error);
        }
        return this.ready;
    }

    async loadLibraries(keys = [...this.libraries, ...this.requiredLibraries]) {
        for (const key of new Set(keys)) {
            if (!LiteGraph.LibraryManager) throw new Error("LiteGraph.initialize() must be called before loading node libraries");
            await LiteGraph.LibraryManager.loadLibrary(key);
        }
    }

    loadRequiredLibraries() {
        return this.loadLibraries(this.requiredLibraries || []);
    }

    callbackhandler_setup() {
        if (!this.cb_handler) this.cb_handler = new CallbackHandler(this);
    }

    registerCallbackHandler() {
        if (!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler() {
        if (!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers() {
        if (!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.processCallbackHandlers(...arguments);
    }

    set pos(v) {
        if (!v || v.length < 2) {
            return;
        }
        this._pos ??= new Float32Array(2); // was Float32Array(10, 10): a 10-element array (Comfy e25c210)
        this._pos[0] = v[0];
        this._pos[1] = v[1];
    }
    get pos() {
        return this._pos;
    }

    /**
     * configure a node from an object containing the serialized info
     * @method configure
     */
    configure(info) {

        LiteGraph.log_debug("lgraphnode", "configure", this, info);

        if (this.graph)
            this.graph.onGraphChanged({
                action: "nodeBeforeConfigure",
                doSave: false
            });

        if (!this.properties) this.properties = {};
        Object.entries(info).forEach(([key, value]) => {
            if (key === "properties") {
                for (var k in value) {
                    this.properties[k] = value[k];
                    this.processCallbackHandlers("onPropertyChanged", {
                        def_cb: this.onPropertyChanged
                    }, k, value[k]);
                }
                return;
            }

            if (LiteGraph.reprocess_slot_while_node_configure) {
                // process inputs and outputs, checking for name to handle node changes
                if (key === "inputs" || key === "outputs") {
                    LiteGraph.log_debug("lgraphnode", "syncObjectByProperty", key, JSON.stringify(info[key]), JSON.stringify(this[key]));
                    const resSync = this.syncObjectByProperty(info[key], this[key], "name");
                    this[key] = resSync.ob_dest;
                    if (resSync.keys_remap && Object.keys(resSync.keys_remap).length) {
                        if (this.graph) {
                            for (let slotFrom in resSync.keys_remap) {
                                let slotTo = resSync.keys_remap[slotFrom];
                                this.graph.updateNodeLinks(this, key === "inputs", slotFrom, slotTo);
                            }
                        }
                    }
                    return;
                }
            }
            if (value === null) {
                // CHECK THIS should copy null value key? probably should
                LiteGraph.log_verbose("lgraphnode", "configure", "should copy null value key? probably should", key, this[key])
                return;
            } else if (typeof value === "object") {
                if (this[key] && typeof(this[key].configure) == "function") {
                    this[key].configure(value);
                    LiteGraph.log_verbose("lgraphnode", "configure", "use var internal configure method", key, value);
                } else {
                    LiteGraph.log_verbose("lgraphnode", "configure", "set ob var key", key, value, this[key]);
                    this[key] = LiteGraph.cloneObject(value, this[key]);
                }
            } else {
                LiteGraph.log_verbose("lgraphnode", "configure", "set node var", key, value);
                this[key] = value;
            }
        });

        if (!info.title) {
            this.title = this.constructor.title;
        }

        this.inputs?.forEach((input, i) => {
            if (!input.link)
                return;
            const link_info = this.graph ? this.graph.links[input.link] : null;
            this.processCallbackHandlers("onConnectionsChange", {
                def_cb: this.onConnectionsChange
            }, LiteGraph.INPUT, i, true, link_info, input);
            this.processCallbackHandlers("onInputAdded", {
                def_cb: this.onInputAdded
            }, input);
        });

        this.outputs?.forEach((output, i) => {
            if (!output.links)
                return;
            output.links.forEach((link, link_index) => {
                const link_info = this.graph?.links[link] || null; // fixed
                LiteGraph.log_verbose("lgraphnode", "configure", "cycle outputlinks", link, link_index, link_info);
                this.processCallbackHandlers("onConnectionsChange", {
                    def_cb: this.onConnectionsChange
                }, LiteGraph.OUTPUT, i, true, link_info, output);
            });
            this.processCallbackHandlers("onOutputAdded", {
                def_cb: this.onOutputAdded
            }, output);
        });

        if (this.widgets) {
            this.widgets.forEach((w) => {
                if (!w) {
                    return;
                }
                if (w.options && w.options.property && this.properties[w.options.property] !== undefined) {
                    w.value = JSON.parse(JSON.stringify(this.properties[w.options.property]));
                }
            });

            info.widgets_values?.forEach((value, i) => {
                if (this.widgets[i]) {
                    this.widgets[i].value = value;
                }
            });
        }
        this.processCallbackHandlers("onConfigure", {
            def_cb: this.onConfigure
        }, info);
        this.graph?.onGraphChanged({
            action: "nodeConfigure",
            doSave: false
        });
        LiteGraph.log_debug("lgraphnode", "configure complete", this);
    }

    /**
     * serialize the content
     * @method serialize
     */

    serialize() {
        // create serialization object
        var o = {
            id: this.id,
            type: this.type,
            // plain arrays: typed arrays stringify as {"0":x,"1":y}
            pos: this.pos ? Array.from(this.pos) : this.pos,
            size: this.size ? Array.from(this.size) : this.size,
            flags: LiteGraph.cloneObject(this.flags),
            order: this.order,
            mode: this.mode,
        };

        // placeholder for a missing node type: serialize current state (position, title, links, ...)
        // and keep every stored field this runtime does not model, so edits persist and nothing is lost
        const placeholderSource = this.constructor === LGraphNode ? this.last_serialization : null;

        if (this.inputs) {
            o.inputs = LiteGraph.cloneObject(this.inputs);
        }

        if (this.outputs) {
            // clear outputs last data (because data in connections is never serialized but stored inside the outputs info)
            this.outputs.forEach((output) => {
                delete output._data;
            });
            o.outputs = LiteGraph.cloneObject(this.outputs);
        }

        if (this.title && this.title != this.constructor.title) {
            o.title = this.title;
        }

        if (this.properties) {
            o.properties = LiteGraph.cloneObject(this.properties);
        }

        if (this.widgets && this.serialize_widgets) {
            o.widgets_values = this.widgets.map((widget) => widget?.value ?? null);
        }

        o.type ??= this.constructor.type;

        if (this.color) {
            o.color = this.color;
        }
        if (this.bgcolor) {
            o.bgcolor = this.bgcolor;
        }
        if (this.boxcolor) {
            o.boxcolor = this.boxcolor;
        }
        if (this.shape) {
            o.shape = this.shape;
        }

        if (placeholderSource) {
            LiteGraph.log_debug("lgraphnode", "serialize placeholder merging last_serialization");
            o.type = placeholderSource.type;
            for (const key in placeholderSource) {
                if (!(key in o)) {
                    o[key] = LiteGraph.cloneObject(placeholderSource[key]);
                }
            }
            if (o.title === undefined) delete o.title;
            for (const key of ["inputs", "outputs", "properties"]) {
                const v = o[key];
                const empty = Array.isArray(v) ? !v.length : (v && typeof v === "object" && !Object.keys(v).length);
                if (!(key in placeholderSource) && empty) delete o[key];
            }
        }

        let r = this.processCallbackHandlers("onSerialize", {
            def_cb: this.onSerialize
        }, o);
        // DBG EXCESS
        LiteGraph.log_verbose("lgraphnode", "serialize", "onSerialize", o, r);

        if (r !== null && (typeof(r) == "object" && r.return_value !== null)) {
            LiteGraph.log_warn("lgraphnode", "onSerialize shouldnt return anything, data should be stored in the object pass in the first parameter");
        }
        return o;
    }

    /* Creates a clone of this node */
    clone() {
        var node = LiteGraph.createNode(this.type);
        if (!node) {
            return null;
        }

        // we clone it because serialize returns shared containers
        var data = LiteGraph.cloneObject(this.serialize());

        // remove links
        data.inputs?.forEach((input) => {
            input.link = null;
        });

        data.outputs?.forEach((output) => {
            if (output.links)
                output.links.length = 0;
        });

        delete data["id"];

        if (LiteGraph.use_uuids) {
            data["id"] = LiteGraph.uuidv4()
        }

        // remove links
        node.configure(data);
        return node;
    }

    /**
     * serialize and stringify
     * @method toString
     */

    toString() {
        return JSON.stringify(this.serialize());
    }

    // LGraphNode.prototype.deserialize = function(info) {} //this cannot be done from within, must be done in LiteGraph

    /**
     * get the title string
     * @method getTitle
     */

    getTitle() {
        return this.title ?? this.constructor.title;
    }

    /**
     * sets the value of a property
     * @method setProperty
     * @param {String} name
     * @param {*} value
     */
    setProperty(name, value) {
        this.properties ||= {};

        // Check if the new value is the same as the current value
        if (value === this.properties[name]) {
            return;
        }

        const prevValue = this.properties[name];
        this.properties[name] = value;

        // Call onPropertyChanged and revert the change if needed
        let r = this.processCallbackHandlers("onPropertyChanged", {
            def_cb: this.onPropertyChanged
        }, name, value, prevValue);
        if (r === false || (r !== null && (typeof(r) == "object" && r.return_value === false))) {
            this.properties[name] = prevValue;
            LiteGraph.log_debug("lgraphnode", "setProperty", "prevent property set by cbHandler", name, value, prevValue, r);
        }

        if (this.properties[name] !== prevValue) {
            this.graph?._emit?.("node-property-changed", {
                node: this,
                name,
                value: this.properties[name],
                previous: prevValue
            });
        }

        // Update the widget value associated with the property name
        const widgetToUpdate = this.widgets?.find((widget) => widget && widget.options?.property === name);

        if (widgetToUpdate) {
            widgetToUpdate.value = value;
        }
    }



    // Execution *************************
    /**
     * sets the output data
     * @method setOutputData
     * @param {number|string} slot
     * @param {*} data
     */
    setOutputData(slot, data) {
        if (!this.outputs) {
            return;
        }

        if (slot?.constructor === String) {
            // not a niche case: consider that removable and optional slots will move indexes! just pass int value if preferred
            slot = this.findOutputSlot(slot);
        }
        if (slot == -1 || slot >= this.outputs.length) {
            return;
        }
        slot = this.getOutputSlot(slot);

        var output_info = this.outputs[slot];
        if (!output_info) {
            return;
        }

        // store data in the output itself in case we want to debug
        output_info._data = data;

        // if there are connections, pass the data to the connections
        this.outputs[slot].links?.forEach((link_id) => {
            const link = this.graph.links[link_id];
            if (link) {
                link.data = data;
            }
        });
    }

    /**
     * sets the output data type, useful when you want to be able to overwrite the data type
     * @method setOutputDataType
     * @param {number|string} slot
     * @param {String} datatype
     */
    setOutputDataType(slot, type) {
        if (!this.outputs) {
            return;
        }
        if (slot?.constructor === String) {
            // not a niche case: consider that removable and optional slots will move indexes! just pass int value if preferred
            slot = this.findOutputSlot(slot);
        }
        if (slot == -1 || slot >= this.outputs.length) {
            return;
        }
        var output_info = this.outputs[slot];
        if (!output_info) {
            return;
        }
        // store data in the output itself in case we want to debug
        output_info.type = type;

        // if there are connections, pass the data to the connections
        this.outputs[slot]?.links?.forEach((link_id) => {
            if (this.graph.links[link_id]) {
                this.graph.links[link_id].type = type;
            }
        });
    }

    /**
     * Retrieves the input data (data traveling through the connection) from one slot
     * @method getInputData
     * @param {number|string} slot
     * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
     * @return {*} data or if it is not connected returns undefined
     */
    getInputData(slot, force_update, refresh_tree) {
        if (!this.inputs) {
            return;
        } // undefined;

        if (slot?.constructor === String) {
            // not a niche case: consider that removable and optional slots will move indexes! just pass int value if preferred
            slot = this.findInputSlot(slot);
        }
        if (slot == -1 || slot >= this.inputs.length) {
            return;
        }

        if (this.inputs[slot].type == LiteGraph.ACTION) {
            // DBG EXCESS LiteGraph.log_verbose("lgraphnode", "getInputData", "skip getting data for event type", this.inputs[slot]);
            return;
        }

        let ob_input = this.inputs[slot];

        // hard coded input force returning that value, used in subgraph as functions to drive calling multiple times the same node
        if (typeof(ob_input.hard_coded_value) != "undefined") {
            console.debug("HARD_CODED_INPUT", this, ob_input, ob_input.hard_coded_value);
            return ob_input.hard_coded_value;
        }

        let link_id = ob_input.link;
        let link = this.graph?.links[link_id];
        if (!link) {
            // DBG EXCESS LiteGraph.log_verbose("lgraphnode", "getInputData", "No link", link_id, slot, this);
            return null;
        }

        if (!force_update) {
            return link.data;
        }

        // forcing origin data update
        // will execute the node (eventually after updating ancestors)

        let node = this.graph.getNodeById(link.origin_id);
        if (!node) {
            LiteGraph.log_debug("lgraphnode", "getInputData", "No origin node, return the link data", link.data, link, slot, this);
            return link.data;
        }

        // TODO Consider moving this out of here and use a single ancestorsCalculation (for each event?)
        // CHECK THIS : used in logic/while , is ATM necessary? does this solve reading self value while executing loops ?
        if (refresh_tree) {
            LiteGraph.log_warn("CHECK THIS", "lgraphnode", "getInputData", "Refreshing ancestors tree by ForcedUpdateSlotData", link, slot, this);
            LiteGraph.log_debug("lgraphnode", "getInputData", "Refreshing ancestors tree by ForcedUpdateSlotData", link, slot, this);
            let uIdRand = this.id + "_getInputData_forced_" + LiteGraph.uuidv4();
            let optsAncestors = {
                action: uIdRand,
                options: {
                    action_call: uIdRand
                }
            };
            this.refreshAncestors(optsAncestors);
        }

        if (node.updateOutputData) { // tag: node event entrypoint
            node.updateOutputData(link.origin_slot);
        } else {
            node.doExecute();
        }

        return link.data;
    }

    /**
     * Retrieves the input data type (in case this supports multiple input types)
     * @method getInputDataType
     * @param {number|string} slot
     * @return {String} datatype in string format
     */
    getInputDataType(slot) {
        if (!this.inputs) {
            return null;
        } // undefined;
        if (slot?.constructor === String) {
            // not a niche case: consider that removable and optional slots will move indexes! just pass int value if preferred
            slot = this.findInputSlot(slot);
        }
        if (slot >= this.inputs.length || this.inputs[slot].link == null) {
            return null;
        }

        if (this.inputs[slot].type == LiteGraph.ACTION) {
            // DBG EXCESS LiteGraph.log_verbose("lgraphnode", "getInputDataType", "skip getting data for event type", this.inputs[slot]);
            return;
        }

        var link_id = this.inputs[slot].link;
        var link = this.graph.links[link_id];
        if (!link) {
            // bug: weird case but it happens sometimes
            LiteGraph.log_warn("lgraphnode", "getInputDataType", "No link", link_id, slot, this);
            return null;
        }
        var node = this.graph.getNodeById(link.origin_id);
        if (!node) {
            return link.type;
        }
        var output_info = node.outputs[link.origin_slot];
        if (output_info) {
            return output_info.type;
        }
        return null;
    }

    /**
     * Retrieves the input data from one slot using its name instead of slot number
     * OLD: IMPLEMENTED in getInputData,use that instead
     * @method getInputDataByName
     * @param {String} slot_name
     * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
     * @return {*} data or if it is not connected returns null
     */
    getInputDataByName(slot_name, force_update) {
        var slot = this.findInputSlot(slot_name);
        if (slot == -1) {
            return null;
        }
        return this.getInputData(slot, force_update);
    }

    /**
     * tells you if there is a connection in one input slot
     * @method isInputConnected
     * @param {number} slot
     * @return {boolean}
     */
    isInputConnected(slot) {
        if (!this.inputs) {
            return false;
        }
        return slot < this.inputs.length && this.inputs[slot].link != null;
    }

    /**
     * tells you info about an input connection (which node, type, etc)
     * @method getInputInfo
     * @param {number} slot
     * @return {Object} object or null { link: id, name: string, type: string or 0 }
     */
    getInputInfo(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot < this.inputs.length) {
            return this.inputs[slot];
        }
        return null;
    }

    /**
     * Returns the link info in the connection of an input slot
     * @method getInputLink
     * @param {number} slot
     * @return {LiteGraph.LLink} object or null
     */
    getInputLink(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot < this.inputs.length) {
            var slot_info = this.inputs[slot];
            return this.graph.links[slot_info.link];
        }
        return null;
    }

    /**
     * returns the node connected in the input slot
     * @method getInputNode
     * @param {number} slot
     * @return {LGraphNode} node or null
     */
    getInputNode(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot >= this.inputs.length) {
            return null;
        }
        var input = this.inputs[slot];
        if (!input || input.link === null) {
            return null;
        }
        var link_info = this.graph.links[input.link];
        if (!link_info) {
            return null;
        }
        return this.graph.getNodeById(link_info.origin_id);
    }

    /**
     * returns the value of an input with this name, otherwise checks if there is a property with that name
     * @method getInputOrProperty
     * @param {string} name
     * @return {*} value
     */
    getInputOrProperty(name) {
        if (this.inputs) {
            for (var i = 0, l = this.inputs.length; i < l; ++i) {
                var input_info = this.inputs[i];
                if (name == input_info.name && input_info.link != null) {
                    var link = this.graph.links[input_info.link];
                    if (link) {
                        return link.data;
                    }
                }
            }
        }
        return this.properties ? this.properties[name] : null;
    }

    /**
     * tells you the last output data that went in that slot
     * @method getOutputData
     * @param {number} slot
     * @return {Object}  object or null
     */
    getOutputData(slot) {
        if (!this.outputs) {
            return null;
        }
        if (slot >= this.outputs.length) {
            return null;
        }

        var info = this.outputs[slot];
        return info._data;
    }

    /**
     * tells you info about an output connection (which node, type, etc)
     * @method getOutputInfo
     * @param {number} slot
     * @return {Object}  object or null { name: string, type: string, links: [ ids of links in number ] }
     */
    getOutputInfo(slot) {
        if (!this.outputs) {
            return null;
        }
        if (slot < this.outputs.length) {
            return this.outputs[slot];
        }
        return null;
    }

    /**
     * tells you if there is a connection in one output slot
     * @method isOutputConnected
     * @param {number} slot
     * @return {boolean}
     */
    isOutputConnected(slot) {
        if (!this.outputs) {
            return false;
        }
        return (
            slot < this.outputs.length &&
            this.outputs[slot].links &&
            this.outputs[slot].links.length
        );
    }

    /**
     * tells you if there is any connection in the output slots
     * @method isAnyOutputConnected
     * @return {boolean}
     */
    isAnyOutputConnected() {
        return this.outputs ? this.outputs.some((output) => output.links && output.links.length) : false;
    }

    /**
     * retrieves all the nodes connected to this output slot
     * @method getOutputNodes
     * @param {number} slot
     * @return {array}
     */
    getOutputNodes(slot) {
        if (!this.outputs || slot >= this.outputs.length) {
            return null;
        }

        const output = this.outputs[slot];
        if (!output.links || output.links.length === 0) {
            return null;
        }

        return output.links
            .map((link_id) => this.graph.links[link_id])
            .filter((link) => link)
            .map((link) => this.graph.getNodeById(link.target_id))
            .filter((target_node) => target_node);
    }

    addOnTriggerInput() {
        var trigS = this.findInputSlot("onTrigger");
        if (trigS == -1) { // !trigS ||
            this.addInput("onTrigger", LiteGraph.EVENT, {
                removable: true,
                nameLocked: true
            });
            return this.findInputSlot("onTrigger");
        }
        return trigS;
    }

    addOnExecutedOutput() {
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS == -1) { // !trigS ||
            this.addOutput("onExecuted", LiteGraph.ACTION, {
                removable: true,
                nameLocked: true
            });
            return this.findOutputSlot("onExecuted");
        }
        return trigS;
    }

    onAfterExecuteNode(param, options) {
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS != -1) {
            LiteGraph.log_verbose("lgraphnode", "onAfterExecuteNode", this.id + ":" + this.order + " triggering slot onAfterExecute", param, options);
            this.triggerSlot(trigS, param, null, options);
        }
    }

    onAfterActionedNode(param, options) {
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS != -1) {
            LiteGraph.log_verbose("lgraphnode", "onAfterActionedNode", this.id + ":" + this.order + " triggering slot onAfterActionedNode", this, trigS, param, options);
            this.triggerSlot(trigS, param, null, options);
        }
    }

    // ComfyUI compatiblity
    onResize(size) {
        // empty, will eventually implement
    }

    changeMode(modeTo) {
        switch (modeTo) {

            case LiteGraph.ON_TRIGGER:
                this.addOnTriggerInput();
                this.addOnExecutedOutput();
                break;

            case LiteGraph.ON_EVENT:
                // this.addOnExecutedOutput();
                break;
            case LiteGraph.NEVER:
                break;
            case LiteGraph.ALWAYS:
                break;
            case LiteGraph.ON_REQUEST:
                break;

            default:
                return false;
        }
        this.mode = modeTo;
        return true;
    }

    /**
     * Triggers the execution of actions that were deferred when the action was triggered
     * @method executePendingActions
     */
    executePendingActions() {
        if (this.mode === LiteGraph.NEVER) {
            this._waiting_actions = [];
            return;
        }
        if (this.initialization_state === "loading" || this.initialization_error || this.wrong_environment) return;
        // New actions remain queued for the next step. Consume a failing action once,
        // retaining the remaining queue so recovery cannot replay its side effects.
        const count = this._waiting_actions?.length || 0;
        for (let i = 0; i < count && this._waiting_actions.length; i++) {
            const action = this._waiting_actions.shift();
            this.actionDo(...action);
        }
    }

    /**
     * Triggers the node code execution, place a boolean/counter to mark the node as being executed
     * @method doExecute
     * @param {*} param
     * @param {*} options
     */
    doExecute(param, options = {}) {
        const graph = this.graph;
        if (!graph || this.mode === LiteGraph.NEVER || this.initialization_state === "loading" || this.initialization_error || this.wrong_environment) return;
        options.action_call ??= `${this.id}_exec_${LiteGraph.uuidv4()}`;
        if (graph.nodes_executing[this.id]) return;
        if (LiteGraph.ensureNodeSingleExecution && this.exec_version != null && this.exec_version >= graph.iteration) return;
        if (LiteGraph.ensureUniqueExecutionAndActionCall && graph.nodes_executedAction[this.id] === options.action_call) return;

        const previousExecution = this.exec_version;
        const previousAction = graph.nodes_executedAction[this.id];
        graph.nodes_executedAction[this.id] = options.action_call;
        graph.nodes_executing[this.id] = true;
        try {
            if (LiteGraph.properties_allow_input_binding) this.doUpdateBindedInputProperties();
            this.processCallbackHandlers("onExecute", {
                def_cb: this.onExecute
            }, param, options);
            this.exec_version = graph.iteration;
            this.action_call = options.action_call;
            graph.nodes_executedAction[this.id] = options.action_call;
            if (LiteGraph.properties_allow_output_binding) this.doUpdateBindedOutputProperties();
            this.execute_triggered = 2;
            this.processCallbackHandlers("onAfterExecuteNode", {
                def_cb: this.onAfterExecuteNode
            }, param, options);
        } catch (error) {
            this.exec_version = previousExecution;
            graph.nodes_executedAction[this.id] = previousAction;
            throw error;
        } finally {
            // A callback may remove this node or clear its graph.
            graph.nodes_executing[this.id] = false;
        }
    }
    /**
     * retrocompatibility :: old doExecute
     * @method doExecute
     * @param {*} param
     * @param {*} options
     */
    execute(param, options = {}) {
        LiteGraph.log_debug("lgraphnode", "execute", "You should replace .execute with .doExecute, has been renamed");
        return this.doExecute(param, options);
    }

    /**
     * Triggers an action, wrapped by logics to control execution flow
     * @method actionDo
     * @param {String} action name
     * @param {*} param
     */
    actionDo(action, param, options = {}, action_slot) {
        const graph = this.graph;
        if (!graph || this.mode === LiteGraph.NEVER || this.initialization_state === "loading" || this.initialization_error || this.wrong_environment) return;
        options.action_call ??= `${this.id}_${action || "action"}_${LiteGraph.uuidv4()}`;
        if (LiteGraph.ensureNodeSingleAction && graph.nodes_actioning[this.id] === options.action_call) return;
        if (LiteGraph.ensureUniqueExecutionAndActionCall && graph.nodes_executedAction[this.id] === options.action_call) return;
        const previousCall = graph.nodes_executedAction[this.id];
        graph.nodes_executedAction[this.id] = options.action_call;
        const previousAction = graph.nodes_actioning[this.id];
        graph.nodes_actioning[this.id] = options.action_call;
        try {
            if (LiteGraph.properties_allow_input_binding) this.doUpdateBindedInputProperties();
            this.processCallbackHandlers("onAction", {
                def_cb: this.onAction
            }, action, param, options, action_slot);
            if (LiteGraph.properties_allow_output_binding) this.doUpdateBindedOutputProperties();
            this.action_call = options.action_call;
            graph.nodes_executedAction[this.id] = options.action_call;
            this.action_triggered = 2;
            this.processCallbackHandlers("onAfterActionedNode", {
                def_cb: this.onAfterActionedNode
            }, param, options);
        } catch (error) {
            graph.nodes_executedAction[this.id] = previousCall;
            throw error;
        } finally {
            graph.nodes_actioning[this.id] = previousAction || false;
        }
    }

    /**
     * Triggers an event in this node, this will trigger any output with the same name
     * @method trigger
     * @param {String} event name ( "on_play", ... ) if action is equivalent to false then the event is send to all
     * @param {*} param
     */
    trigger(action, param, options) {
        if (!this.outputs || this.outputs.length === 0) {
            return;
        }

        // TODO check this, investigate, _last_trigger_time ? who calls trigger ?
        this.graph && (this.graph._last_trigger_time = LiteGraph.getTime());

        let triggered = 0;
        this.outputs.forEach((output, i) => {
            if (output && output.type === LiteGraph.EVENT && (!action || output.name === action)) {
                // TODO add callback handler onTriggerSlot
                LiteGraph.log_verbose("lgraphnode", "trigger", "triggering slot", i, param, options);
                this.triggerSlot(i, param, null, options);
                triggered++;
            } else {
                LiteGraph.log_verbose("lgraphnode", "trigger", "skip slot", output);
            }
        });
        if (!triggered) {
            LiteGraph.log_debug("lgraphnode", "trigger", "nothing found", ...arguments);
        }
    }

    /**
     * Triggers a slot event in this node: cycle output slots and launch execute/action on connected nodes
     * @method triggerSlot
     * @param {Number|string} slot the output slot
     * @param {*} param
     * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
     */
    triggerSlot(slot, param, link_id, options = {}) {
        if (!this.outputs) {
            return;
        }
        var output = null;
        // drive event for subgraph as functions (similarly to hard_coded_value)
        if (slot === null) {
            LiteGraph.log_error("lgraphnode", "triggerSlot", "wrong slot", slot);
            return;
        }
        if (this.mode === LiteGraph.NEVER) {
            return;
        }
        if (slot.constructor !== Number) {
            // LiteGraph.log_warn("lgraphnode", "triggerSlot","slot must be a number, use node.trigger('name') if you want to use a string");
            LiteGraph.log_verbose("lgraphnode", "triggerSlot", "slot not a number, find it", slot, param);
            slot = this.getOutputSlot(slot);
            LiteGraph.log_verbose("lgraphnode", "triggerSlot", "looked for slot not a number", slot);
        }
        output = this.outputs[slot];
        if (!output) {
            LiteGraph.log_debug("lgraphNODE", "triggerSlot", "output slot not found", slot, param);
            return;
        } else {
            LiteGraph.log_debug("lgraphNODE", "triggerSlot", output, slot, param);
        }
        if (typeof(output.hard_coded_output) != "undefined") {
            LiteGraph.log_debug("HARD_CODED_OUTPUT", this, output, output.hard_coded_output);
            output = output.hard_coded_output;
        }

        var links = output.links;
        if (!links || !links.length) {
            return;
        }

        // check for ancestors calls
        if (this.graph && this.graph.ancestorsCall) {
            LiteGraph.log_debug("ancestors call, prevent triggering slot " + slot + " on " + this.id + ":" + this.order);
            return;
        }

        if (this.graph) {
            this.graph._last_trigger_time = LiteGraph.getTime();
        }

        // for every link attached here
        for (var k = 0; k < links.length; ++k) {
            var id = links[k];
            if (link_id != null && link_id != id) {
                // to skip links
                continue;
            }
            var link_info = this.graph.links[links[k]];
            if (!link_info) {
                // not connected
                LiteGraph.log_debug("lgraphNODE", "triggerSlot", "invalid link", k, links[k], output, slot, param);
                continue;
            }
            link_info._last_time = LiteGraph.getTime();
            var node = this.graph.getNodeById(link_info.target_id);
            if (!node) {
                // node not found?
                LiteGraph.log_warn("lgraphNODE", "triggerSlot", "link has not node", link_info, output, slot, param);
                continue;
            }
            if (node.mode === LiteGraph.NEVER) continue;
            var target_slot = node.inputs[link_info.target_slot];
            if (node.mode === LiteGraph.ON_TRIGGER || target_slot?.name === "onTrigger") {
                // generate unique trigger ID if not present
                if (!options.action_call)
                    options.action_call = `${this.id}_trigg_${LiteGraph.uuidv4()}`; // TODO replace here and there fakeunique ID with real unique
                if (LiteGraph.refreshAncestorsOnTriggers)
                    node.refreshAncestors({
                        action: "trigger",
                        param: param,
                        options: options
                    });
                if (node.onExecute) {
                    // -- wrapping node.onExecute(param); --
                    node.doExecute(param, options);
                }
            } else if (node.onAction) {
                // generate unique action ID if not present
                if (!options.action_call) options.action_call = `${this.id}_act_${LiteGraph.uuidv4()}`;
                // pass the action name
                let target_connection = node.inputs[link_info.target_slot];

                // METHOD 1 ancestors
                if (LiteGraph.refreshAncestorsOnActions) {
                    LiteGraph.log_verbose("lgraphNODE", "triggerSlot", "refreshAncestorsOnActions", target_connection.name, output, slot, options);
                    node.refreshAncestors({
                        action: target_connection.name,
                        param: param,
                        options: options
                    });
                }

                // if using use_deferred_actions (alternative to ancestors) instead of executing them now, it will be executed in the next graph loop, to ensure data flow
                if (LiteGraph.use_deferred_actions && node.onExecute) {
                    node._waiting_actions ??= [];
                    node._waiting_actions.push([target_connection.name, param, {
                        ...options
                    }, link_info.target_slot]);
                    LiteGraph.log_verbose("lgraphnode", "triggerSlot", "push to deferred", target_connection.name, param, options, link_info.target_slot); //+this.id+":"+this.order+" :: "+target_connection.name);
                } else {
                    // trigger now the action
                    // wrap node.onAction(target_connection.name, param);
                    LiteGraph.log_verbose("lgraphnode", "triggerSlot", "call actionDo", node, target_connection.name, param, options, link_info.target_slot);
                    node.actionDo(target_connection.name, param, options, link_info.target_slot);
                }
            } else {
                // TODO CHECK
                // LiteGraph.log_verbose("lgraphnode", "triggerSlot","not executing node, what to do with this Node Mode on slot triggered?", node.mode, this);
                LiteGraph.log_debug("lgraphnode", "triggerSlot", "onAction not implemented on node for triggeringSlot", target_slot, node.title, "arguments", slot, param, link_id, options);
            }
        }
    }

    /**
     * clears the trigger slot animation
     * @method clearTriggeredSlot
     * @param {Number} slot the index of the output slot
     * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
     */
    clearTriggeredSlot(slot, link_id) {
        if (!this.outputs || !this.outputs[slot] || !this.outputs[slot].links) {
            return;
        }

        this.outputs[slot].links.forEach((id) => {
            if (link_id !== null && link_id !== id) {
                // Skip links
                return;
            }

            const link_info = this.graph.links[id];
            if (!link_info) {
                // Not connected
                return;
            }

            link_info._last_time = 0;
        });
    }

    doUpdateBindedInputProperties() {
        let thisNode = this;
        if (!this.inputs) return;
        this.inputs.forEach((ob_input) => {
            if (ob_input.param_bind) {
                LiteGraph.log_verbose("lgraphnode", "doUpdateBindedInputProperties", "has bind", ob_input, thisNode);
                if (thisNode.properties && typeof(thisNode.properties[ob_input.name]) !== "undefined") {
                    let inputData = thisNode.getInputData(ob_input.name, LiteGraph?.properties_input_binding_check_ancestors);
                    if (inputData !== null) {
                        // thisNode.properties[ob_input.name] = link.data;
                        LiteGraph.log_verbose("lgraphnode", "doUpdateBindedInputProperties", "update value", ob_input.name, inputData, thisNode);
                        this.setProperty(ob_input.name, inputData);
                    }
                } else {
                    LiteGraph.log_warn("lgraphnode", "doUpdateBindedInputProperties", "inexisting property", ob_input.name, thisNode);
                }
            }
        });
    }

    doUpdateBindedOutputProperties() {
        let thisNode = this;
        if (!this.outputs) return;
        this.outputs.forEach((ob_output) => {
            if (ob_output.param_bind) {
                LiteGraph.log_verbose("lgraphnode", "doUpdateBindedOutputProperties", "has bind", ob_output, thisNode);
                if (thisNode.properties && typeof(thisNode.properties[ob_output.name]) !== "undefined") {
                    let propertyData = this.properties[ob_output.name];
                    LiteGraph.log_verbose("lgraphnode", "doUpdateBindedOutputProperties", "update value", ob_output.name, propertyData, thisNode);
                    this.setOutputData(ob_output.name, propertyData);
                } else {
                    LiteGraph.log_warn("lgraphnode", "doUpdateBindedOutputProperties", "inexisting property", ob_output.name, thisNode);
                }
            }
        });
    }

    /**
     * set the node size to auto computed
     * @method autoSize
     */
    autoSize(only_greater_than_current) {
        let minSize = this.computeSize();
        let newSize = only_greater_than_current && this.size ?
            [Math.max(this.size[0], minSize[0]), Math.max(this.size[1], minSize[1])] :
            minSize;
        const was_default = this.hasDefaultSize();
        this.setSize(newSize);
        // fitting the slots is not choosing a size
        if (was_default) LGraphNode._default_sizes.add(this.size);
    }

    /**
     * changes node size and triggers callback
     * @method setSize
     * @param {vec2} size
     */
    setSize(size) {
        this.size = size;
        this.processCallbackHandlers("onResize", {
            def_cb: this.onResize
        }, this.size);
    }

    /**
     * add a new property to this node
     * @method addProperty
     * @param {string} name
     * @param {*} default_value
     * @param {string} type string defining the output type ("vec3","number",...)
     * @param {Object} extra_info this can be used to have special properties of the property (like values, etc)
     */
    addProperty(name, default_value, type, extra_info) {
        default_value ??= null;
        type ??= null;
        const o = {
            name,
            type,
            default_value,
            ...extra_info
        };
        this.properties_info = this.properties_info ?? [];
        this.properties_info.push(o);

        this.properties = this.properties ?? {};
        this.properties[name] = default_value;

        return o;
    }

    /**
     * Add a new input or output slot to use in this node.
     * @param {string} name - Name of the slot.
     * @param {string} type - Type of the slot ("vec3", "number", etc). For a generic type, use 0.
     * @param {Object} extra_info - Additional information for the slot (e.g., label, color, position).
     * @param {boolean} isInput - Whether the slot being added is an input slot.
     * @returns {Object} The newly added slot (input or output).
     *
     * @NOTE: These methods are slightly different, and it would be optimal to keep them separate,
     * but our goal here is to refactor them so they *aren't* slightly different.
     */
    addInput(name, type, extra_info) {
        return this.addSlot(name, type, extra_info, true);
    }
    addOutput(name, type, extra_info) {
        return this.addSlot(name, type, extra_info, false);
    }
    addSlot(name, type, extra_info, isInput) {
        const slot = isInput ? {
            name,
            type,
            link: null,
            ...extra_info
        } : {
            name,
            type,
            links: null,
            ...extra_info
        };
        if (isInput) {
            this.inputs = this.inputs ?? [];
            this.inputs.push(slot);
            this.processCallbackHandlers("onInputAdded", {
                def_cb: this.onInputAdded
            }, slot);
            LiteGraph.registerNodeAndSlotType(this, type);
        } else {
            this.outputs = this.outputs ?? [];
            this.outputs.push(slot);
            this.processCallbackHandlers("onOutputAdded", {
                def_cb: this.onOutputAdded
            }, slot);
            if (LiteGraph.auto_load_slot_types) {
                LiteGraph.registerNodeAndSlotType(this, type, true);
            }
        }

        this.autoSize(true);
        this.setDirtyCanvas(true, true);
        return slot;
    }

    /**
     * Add multiple input or output slots to use in this node.
     * @param {Array} array - Array of triplets like [[name, type, extra_info], [...]].
     * @param {boolean} isInput - Whether the slots being added are input slots.
     *
     * @NOTE: These methods are slightly different, and it would be optimal to keep them separate,
     * but our goal here is to refactor them so they *aren't* slightly different.
     */
    addInputs(array) {
        this.addSlots(array, true);
    }
    addOutputs(array) {
        this.addSlots(array, false);
    }
    addSlots(array, isInput) {
        if (typeof array === 'string')
            array = [
                [array]
            ]; // a single slot name, not a list of [name, type] entries

        array.forEach((info) => {
            const slot = isInput ? {
                name: info[0],
                type: info[1],
                link: null,
                ...(info[2] ?? {}),
            } : {
                name: info[0],
                type: info[1],
                links: null,
                ...(info[2] ?? {}),
            };

            if (isInput) {
                this.inputs = this.inputs ?? [];
                this.inputs.push(slot);
                this.processCallbackHandlers("onInputAdded", {
                    def_cb: this.onInputAdded
                }, slot);
                LiteGraph.registerNodeAndSlotType(this, info[1]);
            } else {
                this.outputs = this.outputs ?? [];
                this.outputs.push(slot);
                this.processCallbackHandlers("onOutputAdded", {
                    def_cb: this.onOutputAdded
                }, slot);
                if (LiteGraph.auto_load_slot_types) {
                    LiteGraph.registerNodeAndSlotType(this, info[1], true);
                }
            }
        });

        this.autoSize();
        this.setDirtyCanvas(true, true);
    }

    /**
     * remove an existing input slot
     * @method removeInput
     * @param {number} slot
     *
     * @NOTE: These two are different enough yet I can't even mash them together meaningfully.
     */
    removeInput(slot) {
        this.disconnectInput(slot);
        const removedInput = this.inputs.splice(slot, 1)[0];

        this.inputs.slice(slot).filter((input) => !!input).forEach((input) => {
            const link = this.graph.links[input.link];
            link?.target_slot && link.target_slot--;
        });

        this.autoSize();
        this.processCallbackHandlers("onInputRemoved", {
            def_cb: this.onInputRemoved
        }, slot, removedInput);
        this.setDirtyCanvas(true, true);
    }

    /**
     * remove an existing output slot
     * @method removeOutput
     * @param {number} slot
     */
    removeOutput(slot) {
        this.disconnectOutput(slot);
        this.outputs = this.outputs.filter((_, index) => index !== slot);

        this.outputs.slice(slot).forEach((output) => {
            if (!output || !output.links) {
                return;
            }
            output.links.forEach((linkId) => {
                const link = this.graph.links[linkId];
                if (link) {
                    link.origin_slot -= 1;
                }
            });
        });

        this.autoSize();
        this.processCallbackHandlers("onOutputRemoved", {
            def_cb: this.onOutputRemoved
        }, slot);
        this.setDirtyCanvas(true, true);
    }

    /**
     * Add a special connection to this node (used for special kinds of graphs)
     * @method addConnection
     * @param {string} name - The name of the connection
     * @param {string} type - String defining the input type ("vec3", "number", etc.)
     * @param {Float32[]} pos - Position of the connection inside the node as an array [x, y]
     * @param {string} direction - Specifies if it is an input or output connection
     */
    addConnection(name, type, pos, direction) {
        var o = {
            name: name,
            type: type,
            pos: pos,
            direction: direction,
            links: null,
        };
        this.connections.push(o);
        return o;
    }

    getDefaultCanvas() {
        if (!this.graph) return false;
        if (!this.graph.list_of_graphcanvas || !this.graph.list_of_graphcanvas.length) return false;
        return this.graph.list_of_graphcanvas[0];
    }

    /**
     * computes the minimum size of a node according to its inputs and output slots
     * @method computeSize
     * @param {vec2} minHeight
     * @return {vec2} the total size
     */
    computeSize(out) {
        if (this.constructor.size) {
            return this.constructor.size.concat();
        }

        var node = this;
        var size = out || new Float32Array([0, 0]);

        var font_size = LiteGraph.NODE_TEXT_SIZE; // although it should be graphcanvas.inner_text_font size

        // computeWidth
        const get_text_width = (text, isTitle) => {
            if (!text) {
                return 0;
            }
            const lgcanvas = node.getDefaultCanvas();
            if (lgcanvas && lgcanvas.canvas && lgcanvas.ctx) {
                if (isTitle) {
                    lgcanvas.ctx.font = lgcanvas.title_text_font;
                } else {
                    lgcanvas.ctx.font = lgcanvas.inner_text_font;
                }
                const measuredT = lgcanvas.ctx?.measureText(text);
                if (measuredT) {
                    // DBG EXCESS LiteGraph.log_verbose("lgraphnode","computeSize","measured text",text,measuredT,this);
                    return measuredT.width;
                }
            }
            // fallback
            // DBG EXCESS LiteGraph.log_verbose("lgraphnode","computeSize","fallback size",text,font_size * text.length * 0.6,this);
            return font_size * text.length * 0.423; // TODO this is not precise
        };
        var node_title = node.title;
        try {
            node_title = this.getTitle();
        } catch (e) {
            // skip :: being in construction properties could not be set yet
        }
        var title_width = 40 + get_text_width(node_title, true); // this.title
        var input_width = 0;
        var output_width = 0;

        if (this.inputs) {
            input_width = this.inputs.reduce((maxWidth, input) => {
                if (LGraphNode.isWidgetInputSlot(input)) return maxWidth; // label shown by the widget
                const text = input.label || input.name || "";
                const text_width = get_text_width(text);
                return Math.max(maxWidth, text_width);
            }, 0);
        }
        if (this.outputs) {
            output_width = this.outputs.reduce((maxWidth, output) => {
                const text = output.label || output.name || "";
                const text_width = get_text_width(text);
                return Math.max(maxWidth, text_width);
            }, 0);
        }

        if (this.horizontal) {
            // const lastIPos = this.getConnectionPos();
            size[0] = Math.max(size[0], title_width);
            size[1] = this.outputs.length ? Math.max(size[1], LiteGraph.NODE_SLOT_HEIGHT + 10) : size[1];
        } else {
            // basicWidth
            size[0] = Math.max(input_width + output_width + 40 + 10, title_width);
            // basicHeight
            size[1] = this.getSlotsHeight();
        }

        // min Width Height
        size[0] = Math.max(size[0], LiteGraph.NODE_MIN_WIDTH);
        size[0] = Math.max(size[0], LiteGraph.NODE_MIN_SIZE[0]);
        size[1] = Math.max(size[1], LiteGraph.NODE_MIN_SIZE[1]);

        // widgets calc
        let widgetsHeight = 0;
        if (this.widgets && this.widgets.length) {
            // width fallback
            size[0] = Math.max(size[0], LiteGraph.NODE_MIN_WIDTH * 1.5);
            // cycle widgets
            for (var i = 0, l = this.widgets.length; i < l; ++i) {
                if (this.widgets[i].computeSize) {
                    const wSize = this.widgets[i].computeSize(size[0]);
                    widgetsHeight += wSize[1] + 4;
                    size[0] = Math.max(size[0], wSize[0]);
                } else {
                    widgetsHeight += LiteGraph.NODE_WIDGET_HEIGHT + 4;
                    size[0] = Math.max(size[0], LiteGraph.NODE_WIDTH); // using node width as widget default WIDHT TODO refcator
                }
            }
            widgetsHeight += 8;
        }

        // process height
        if (this.widgets_up) {
            size[1] = Math.max(size[1], widgetsHeight);
        } else if (this.widgets_start_y != null) {
            size[1] = Math.max(size[1], widgetsHeight + this.widgets_start_y);
        } else {
            size[1] += widgetsHeight;
        }
        if (this.constructor.min_height) {
            size[1] = Math.max(size[1], this.constructor.min_height);
        }

        // size[1] += 6; // y margin
        return size;
    }

    getSlotsHeight() {
        // minimum height calculated by slots or 1
        const rowHeight = Math.max(
            // widget inputs sit on their widget rows, not in the slot rows
            this.inputs ? this.inputs.filter((input) => !LGraphNode.isWidgetInputSlot(input)).length : 1,
            this.outputs ? this.outputs.length : 1,
            1,
        ) * LiteGraph.NODE_SLOT_HEIGHT + 10;
        // add margin (should this be always?)
        return rowHeight + (this.constructor.slot_start_y || 0);
    }

    /**
     * returns all the info available about a property of this node.
     * common info are
     *  .type (.widget is used if present), "string" is used if both undefined
     *      "code", "boolean", "string", "number", "undefined", "enum", "combo"
        .readonly
        .prevent_input_bind
        .prevent_output_bind
        .label
        .values (Array (or Object))
            values are than passed down to LGraphCanvas-Panel, to Widget and to ContextMenu
     * 
     * @method getPropertyInfo
     * @param {String} property name of the property
     * @return {Object} the object with all the available info
    */
    getPropertyInfo(property) {
        var info = null;

        // there are several ways to define info about a property
        // legacy mode
        if (this.properties_info) {
            for (var i = 0; i < this.properties_info.length; ++i) {
                if (this.properties_info[i].name == property) {
                    info = this.properties_info[i];
                    break;
                }
            }
        }
        // litescene mode using the constructor
        if (this.constructor[`@${property}`]) {
            info = this.constructor[`@${property}`];
        }

        if (this.constructor.widgets_info && this.constructor.widgets_info[property]) {
            info = this.constructor.widgets_info[property];
        }

        // litescene mode using the constructor
        if (!info) {
            // info = this.onGetPropertyInfo(property);
            let r = this.processCallbackHandlers("onGetPropertyInfo", {
                def_cb: this.onGetPropertyInfo
            }, property);
            if (r !== null && typeof(r) == "object" && r.return_value !== null) {
                info = r.return_value;
            }
        }

        // DISABLED: REFACTOR code will use info.type or info. even if not valid
        // if still has no info, that's a "property does not exists and nobody is managing it"
        // if (info === null || typeof(info) == "undefined"){
        // return null;
        // }

        if (!info) {
            info = {};
        }
        if (!info.type) {
            info.type = typeof this.properties[property];
        }
        /* if(!info.property){
            info.property = property;
        } */
        // todo map types to common (bool-boolean, ..)
        // THINK: should map porpertyType, widgetType, basic_nodeType ..
        if (info.widget == "combo") {
            info.type = "enum";
        }

        return info;
    }

    /**
     * Defines a widget inside the node, it will be rendered on top of the node, you can control lots of properties
     *
     * @method addWidget
     * @param {String} type the widget type (could be "number","string","combo"
     * @param {String} name the text to show on the widget
     * @param {String} value the default value
     * @param {Function|String} callback function to call when it changes (optionally, it can be the name of the property to modify)
     * @param {Object} options the object that contains special properties of this widget
     * @return {Object} the created widget object
     */
    addWidget(type, name, value, callback, options) {
        this.widgets ??= [];

        if (!options && callback && callback.constructor === Object) {
            options = callback;
            callback = null;
        }

        if (options && options.constructor === String) // options can be the property name
            options = {
                property: options
            };

        if (callback && callback.constructor === String) { // callback can be the property name
            options ??= {};
            options.property = callback;
            callback = null;
        }

        if (callback && callback.constructor !== Function) {
            LiteGraph.log_warn("lgraphnode", "addWidget", "callback must be a function", callback);
            callback = null;
        }

        const fields = {
            type: type.toLowerCase(),
            name: name,
            value: value,
            callback: callback,
            options: options || {},
        };
        // an instance of the registered widget class (src/widgets.js), or a plain object for unknown types
        const WidgetClass = LiteGraph.widget_types?.[fields.type];
        var w = WidgetClass ? new WidgetClass(fields) : fields;

        if (w.options.y !== undefined) {
            w.y = w.options.y;
        }

        if (type == "combo" && !w.options.values) {
            // throw Error("LiteGraph addWidget('combo',...) requires to pass values in options: { values:['red','blue'] }");
            LiteGraph.log_warn("lgraphnode", "addWidget", "combo requires to pass values in options eg: { values:['red','blue'] }");
            return;
        }
        this.widgets.push(w);
        // options.socket: also add an input attached to the widget (true, or the slot type)
        if (w.options.socket) {
            this.addWidgetInput(w, typeof w.options.socket === "string" ? w.options.socket : undefined);
        }
        this.setSize(this.computeSize());
        return w;
    }

    /**Look for a widget by name
     * @method findWidget
     * @param {*} name 
     * @param {*} returnObj 
     * @returns {number|object}
     */
    findWidget(name, returnObj) {
        if (!this.widgets) {
            return -1;
        }
        //LiteGraph.log_debug("lgraphnode", "findWidget", this, name, returnObj);
        for (var i = 0, l = this.widgets.length; i < l; ++i) {
            if (name == this.widgets[i].name) {
                return !returnObj ? i : this.widgets[i];
            }
        }
        return -1;
    }

    /**
     * True for an input attached to a widget (`input.widget = {name}`): it is drawn on the widget's
     * row, and while it is linked the widget is disabled and the link provides the value
     * (see getWidgetValue).
     */
    static isWidgetInputSlot(slot) {
        return !!(slot && slot.widget && typeof slot.widget.name === "string");
    }

    /** @returns {object|null} the widget an input is attached to */
    getWidgetFromSlot(slot) {
        if (!LGraphNode.isWidgetInputSlot(slot)) return null;
        return this.widgets?.find((widget) => widget?.name === slot.widget.name) ?? null;
    }

    /** @returns {object|null} the input attached to a widget */
    getSlotFromWidget(widget) {
        if (!widget || !this.inputs) return null;
        return this.inputs.find((input) => LGraphNode.isWidgetInputSlot(input) && input.widget.name === widget.name) ?? null;
    }

    /** @returns {boolean} true when the widget's input is connected (the widget is then disabled) */
    isWidgetLinked(widget) {
        return this.getSlotFromWidget(widget)?.link != null;
    }

    /**
     * Adds an input attached to a widget, so a link can drive the widget's value.
     * @param {object|string} widgetOrName
     * @param {string} [type] - slot type; default from the widget type (number, boolean, string, or "*")
     * @returns {object|null} the input
     */
    addWidgetInput(widgetOrName, type) {
        const widget = typeof widgetOrName === "string" ? this.widgets?.find((w) => w?.name === widgetOrName) : widgetOrName;
        if (!widget) {
            LiteGraph.log_warn("lgraphnode", "addWidgetInput", "widget not found", widgetOrName);
            return null;
        }
        const existing = this.getSlotFromWidget(widget);
        if (existing) return existing;
        const byWidgetType = {
            number: "number",
            slider: "number",
            toggle: "boolean",
            boolean: "boolean",
            text: "string",
            string: "string"
        };
        return this.addInput(widget.name, type ?? byWidgetType[widget.type] ?? "*", {
            widget: {
                name: widget.name
            },
            label: widget.label
        });
    }

    /**
     * The value of a widget for execution: the data of its linked input when connected,
     * otherwise the widget value.
     * @param {string} name - widget name
     */
    getWidgetValue(name) {
        const widget = this.widgets?.find((w) => w?.name === name);
        const input = widget ? this.getSlotFromWidget(widget) : null;
        if (input && input.link != null) {
            const data = this.getInputData(this.inputs.indexOf(input));
            if (data !== undefined) return data;
        }
        return widget?.value;
    }

    addCustomWidget(custom_widget) {
        this.widgets ??= [];
        this.widgets.push(custom_widget);
        return custom_widget;
    }

    /**Add a button widget that triggers an action
     * @method addActionWidget
     * @param {*} action_name 
     * @param {*} action_slot 
     */
    addActionWidget(action_name, action_slot) {
        let wNode = this;
        let options = {};
        let param = null;
        let callback = () => {
            wNode.actionDo(action_name, param, options = {}, action_slot);
        };
        this.addWidget("button", action_name, null, callback, options);
    }

    /**Toggle a button widget for an action
     * @method toggleActionWidget
     * @param {*} action_name 
     * @param {*} action_slot 
     */
    toggleActionWidget(action_name, action_slot) {
        const widgetIndex = this.findWidget(action_name, false); //this.widgets?.find((widget) => widget && widget.name === action_name);
        LiteGraph.log_debug("lgraphnode", "toggleActionWidget", this, action_name, action_slot, widgetIndex, widgetIndex > -1 ? "REMOVE" : "ADD");
        if (widgetIndex > -1) {
            this.widgets.splice(widgetIndex, 1);
        } else {
            this.addActionWidget(action_name, action_slot);
        }
    }

    /**
     * Returns the bounding box of the object, used for rendering purposes
     * @method getBounding
     * @param {Float32[]} [out] - [Optional] A place to store the output to reduce garbage
     * @param {boolean} [compute_outer] - [Optional] Set to true to include the shadow and connection points in the bounding calculation
     * @return {Float32[]} The bounding box in the format of [topLeftCornerX, topLeftCornerY, width, height]
     */
    getBounding(out = new Float32Array(4), compute_outer) {
        const nodePos = this.pos;
        const isCollapsed = this.flags?.collapsed;
        const nodeSize = this.size;

        let left_offset = 0;
        // 1 offset due to how nodes are rendered
        let right_offset = 1;
        let top_offset = 0;
        let bottom_offset = 0;

        if (compute_outer) {
            // 4 offset for collapsed node connection points
            left_offset = 4;
            // 6 offset for right shadow and collapsed node connection points
            right_offset = 6 + left_offset;
            // 4 offset for collapsed nodes top connection points
            top_offset = 4;
            // 5 offset for bottom shadow and collapsed node connection points
            bottom_offset = 5 + top_offset;
        }

        out[0] = nodePos[0] - left_offset;
        out[1] = nodePos[1] - LiteGraph.NODE_TITLE_HEIGHT - top_offset;
        out[2] = isCollapsed ?
            (this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH) + right_offset :
            nodeSize[0] + right_offset;
        out[3] = isCollapsed ?
            LiteGraph.NODE_TITLE_HEIGHT + bottom_offset :
            nodeSize[1] + LiteGraph.NODE_TITLE_HEIGHT + bottom_offset;

        // TODO should retrieve bounding back if overriding
        this.processCallbackHandlers("onBounding", {
            def_cb: this.onBounding
        }, out)
        // TAG this callback could return behavior
        return out;
    }

    /**
     * checks if a point is inside the shape of a node
     * @method isPointInside
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    isPointInside(x, y, margin = 0, skip_title) {
        var margin_top = this.graph && this.graph.isLive() ? 0 : LiteGraph.NODE_TITLE_HEIGHT;
        if (skip_title) {
            margin_top = 0;
        }
        if (this.flags && this.flags.collapsed) {
            // if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
            if (
                LiteGraph.isInsideRectangle(
                    x,
                    y,
                    this.pos[0] - margin,
                    this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT - margin,
                    (this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH) +
                    2 * margin,
                    LiteGraph.NODE_TITLE_HEIGHT + 2 * margin,
                )
            ) {
                return true;
            }
        } else if (
            this.pos[0] - 4 - margin < x &&
            this.pos[0] + this.size[0] + 4 + margin > x &&
            this.pos[1] - margin_top - margin < y &&
            this.pos[1] + this.size[1] + margin > y
        ) {
            return true;
        }
        return false;
    }

    /**
     * checks if a point is inside a node slot, and returns info about which slot
     * @method getSlotInPosition
     * @param {number} x
     * @param {number} y
     * @return {Object} if found the object contains { input|output: slot object, slot: number, link_pos: [x,y] }
     */
    getSlotInPosition(x, y) {
        // search for inputs
        var link_pos = new Float32Array(2);
        if (this.inputs) {
            for (let i = 0, l = this.inputs.length; i < l; ++i) {
                let input = this.inputs[i];
                this.getConnectionPos(true, i, link_pos);
                if (
                    LiteGraph.isInsideRectangle(
                        x,
                        y,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        20,
                        10,
                    )
                ) {
                    return {
                        input: input,
                        slot: i,
                        link_pos: link_pos
                    };
                }
            }
        }

        if (this.outputs) {
            for (let i = 0, l = this.outputs.length; i < l; ++i) {
                let output = this.outputs[i];
                this.getConnectionPos(false, i, link_pos);
                if (
                    LiteGraph.isInsideRectangle(
                        x,
                        y,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        20,
                        10,
                    )
                ) {
                    return {
                        output: output,
                        slot: i,
                        link_pos: link_pos
                    };
                }
            }
        }

        return null;
    }

    /**
     * returns the input slot with a given name (used for dynamic slots), -1 if not found
     * @method findInputSlot
     * @param {string} name the name of the slot
     * @param {boolean} returnObj if the obj itself wanted
     * @return {number|object} the slot (-1 if not found)
     */
    findInputSlot(name, returnObj) {
        if (!this.inputs) {
            return -1;
        }
        for (var i = 0, l = this.inputs.length; i < l; ++i) {
            if (name === this.inputs[i].name) {
                return !returnObj ? i : this.inputs[i];
            }
        }
        return -1;
    }

    /**
     * returns the output slot with a given name (used for dynamic slots), -1 if not found
     * @method findOutputSlot
     * @param {string} name the name of the slot
     * @param {boolean} returnObj if the obj itself wanted
     * @return {number|object} the slot (-1 if not found)
     */
    findOutputSlot(name, returnObj = false) {
        if (!this.outputs) {
            return -1;
        }
        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            if (name === this.outputs[i].name) {
                return !returnObj ? i : this.outputs[i];
            }
        }
        return -1;
    }

    /**
     * Get a slot from his index or name
     * @param {boolean} is_input use look for input / output 
     * @param {number|string} slot_index_or_name 
     * @returns 
     */
    getSlot(is_input, slot_index_or_name, returnObj = false) {
        if (!is_input || is_input === LiteGraph.OUTPUT) {
            if (typeof(this.outputs[slot_index_or_name]) !== "undefined") {
                LiteGraph.log_verbose("lgraphnode", "getSlot", "output slot_index_or_name found", slot_index_or_name, this.outputs[slot_index_or_name]);
                return !returnObj ? slot_index_or_name : this.outputs[slot_index_or_name];
            } else {
                LiteGraph.log_verbose("lgraphnode", "getSlot", "output slot_index_or_name NOT found, find it", slot_index_or_name);
                return this.findOutputSlot(slot_index_or_name, returnObj);
            }
        } else {
            if (typeof(this.inputs[slot_index_or_name]) !== "undefined") {
                LiteGraph.log_verbose("lgraphnode", "getSlot", "input slot_index_or_name found", slot_index_or_name, this.inputs[slot_index_or_name]);
                return !returnObj ? slot_index_or_name : this.inputs[slot_index_or_name];
            } else {
                LiteGraph.log_verbose("lgraphnode", "getSlot", "input slot_index_or_name NOT found, find it", slot_index_or_name);
                return this.findInputSlot(slot_index_or_name, returnObj);
            }
        }
    }
    getOutputSlot(index_or_name, returnObj = false) {
        return this.getSlot(false, index_or_name, returnObj);
    }
    getInputSlot(index_or_name, returnObj = false) {
        return this.getSlot(true, index_or_name, returnObj);
    }

    // TODO refactor: USE SINGLE findInput/findOutput functions! :: merge options

    /**
     * Returns the first free input slot, can filter by types (supports multiple types per slot).
     * @method findInputSlotFree
     * @param {object} options
     * @return {number|object} the slot (-1 if not found)
     */
    findInputSlotFree(optsIn = {}) {
        let optsDef = {
            returnObj: false,
            typesNotAccepted: [],
        };
        let opts = Object.assign(optsDef, optsIn);

        if (!this.inputs) return -1;

        for (let i = 0, l = this.inputs.length; i < l; ++i) {
            let slot = this.inputs[i];

            if (slot.link != null) continue; // Skip occupied slots

            if (opts.typesNotAccepted.length > 0) {
                let slotTypes = slot.type ? slot.type.split("|") : [];
                let isNotAccepted = slotTypes.some(type => opts.typesNotAccepted.includes(type));

                if (isNotAccepted) continue; // Skip unwanted types
            }

            return opts.returnObj ? slot : i;
        }

        return -1;
    }

    /**
     * Returns the first free output slot, can filter by types (supports multiple types per slot).
     * @method findOutputSlotFree
     * @param {object} options
     * @return {number|object} the slot (-1 if not found)
     */
    findOutputSlotFree(optsIn = {}) {
        let optsDef = {
            returnObj: false,
            typesNotAccepted: [],
        };
        let opts = Object.assign(optsDef, optsIn);

        if (!this.outputs) return -1;

        for (let i = 0, l = this.outputs.length; i < l; ++i) {
            let slot = this.outputs[i];

            if (slot.links && slot.links.length > 0) continue; // Skip occupied slots

            if (opts.typesNotAccepted.length > 0) {
                let slotTypes = slot.type ? slot.type.split("|") : [];
                let isNotAccepted = slotTypes.some(type => opts.typesNotAccepted.includes(type));

                if (isNotAccepted) continue; // Skip unwanted types
            }

            return opts.returnObj ? slot : i;
        }

        return -1;
    }


    /**
     * findSlotByType for INPUTS
     */
    findInputSlotByType(type, returnObj, preferFreeSlot, doNotUseOccupied) {
        return this.findSlotByType(true, type, returnObj, preferFreeSlot, doNotUseOccupied);
    }

    /**
     * findSlotByType for OUTPUTS
     */
    findOutputSlotByType(type, returnObj, preferFreeSlot, doNotUseOccupied) {
        return this.findSlotByType(false, type, returnObj, preferFreeSlot, doNotUseOccupied);
    }

    /**
     * Returns the output (or input) slot with a given type, -1 if not found.
     * @method findSlotByType
     * @param {boolean} is_input Use inputs (true) or outputs (false)
     * @param {string|number} type The type of the slot to look for (supports multiple types separated by "," or "|")
     * @param {boolean} returnObj If true, returns the slot object instead of index
     * @param {boolean} preferFreeSlot If true, prioritizes free slots
     * @param {boolean} doNotUseOccupied If true, ignores already occupied slots
     * @return {number|object} The slot index or object (-1 if not found)
     */
    findSlotByType(is_input = false, type, returnObj = false, preferFreeSlot = false, doNotUseOccupied = false) {
        let slots = is_input ? this.inputs : this.outputs;
        if (!slots || slots.length === 0) return -1;

        // Normalize input type
        let normalizedTypes;
        if (typeof type === "number") {
            normalizedTypes = [type]; // Directly use the number type
        } else if (typeof type === "string" && type.length > 0) {
            normalizedTypes = type.toLowerCase().split(/[|,]/).map(t => (t === "_event_" ? LiteGraph.EVENT : t));
        } else {
            normalizedTypes = [0]; // Default to general type
        }

        let fallbackSlot = -1;

        for (let i = 0, l = slots.length; i < l; ++i) {
            let slot = slots[i];

            // Normalize slot type
            let slotTypes;
            if (typeof slot.type === "number") {
                slotTypes = [slot.type]; // Directly use the number type
            } else if (typeof slot.type === "string") {
                slotTypes = slot.type.toLowerCase().split(/[|,]/).map(t => (t === "_event_" ? LiteGraph.EVENT : t));
            } else {
                slotTypes = [0]; // Default to general type
            }

            for (let sourceType of normalizedTypes) {
                for (let slotType of slotTypes) {
                    if (LiteGraph.isValidConnection(sourceType, slotType)) {
                        let isOccupied = slot.link !== null || (slot.links && slot.links.length > 0);

                        if (preferFreeSlot && isOccupied) {
                            LiteGraph.log_verbose("lgraphnode", "findSlotByType", "preferFreeSlot but has link", sourceType, slotType, "for slot", i);
                            fallbackSlot = fallbackSlot === -1 ? i : fallbackSlot;
                            continue;
                        }

                        LiteGraph.log_verbose("lgraphnode", "findSlotByType", "found right type", i, slot);
                        return returnObj ? slot : i;
                    }
                }
            }
        }

        // If no free slot was found, check if we can use occupied ones
        if (preferFreeSlot && !doNotUseOccupied && fallbackSlot !== -1) {
            LiteGraph.log_verbose("lgraphnode", "findSlotByType", "Returning occupied slot", fallbackSlot);
            return returnObj ? slots[fallbackSlot] : fallbackSlot;
        }

        return -1;
    }



    /**
     * Connect this node output to the input of another node BY TYPE.
     * @method connectByType
     * @param {number|string} slot Slot number or name of the output slot
     * @param {LGraphNode} target_node The target node
     * @param {string} target_slotType The expected input slot type of the target node
     * @return {Object|null} Link info if created, otherwise null
     */
    connectByType(slot, target_node, target_slotType = "*", optsIn = {}) {
        let opts = Object.assign({
            createEventInCase: true,
            firstFreeIfOutputGeneralInCase: true,
            generalTypeInCase: true,
            preferFreeSlot: false,
        }, optsIn);

        if (typeof target_node === "number") {
            target_node = this.graph.getNodeById(target_node);
        }
        if (!target_node) return null;

        let target_slot = target_node.findSlotByType(true, target_slotType, false, opts.preferFreeSlot);
        if (target_slot >= 0) {
            LiteGraph.log_debug("lgraphnode", "connectByType", "Connecting type", target_slotType, "to slot", target_slot);
            return this.connect(slot, target_node, target_slot);
        }

        if (opts.createEventInCase && target_slotType === LiteGraph.EVENT) {
            LiteGraph.log_debug("lgraphnode", "connectByType", "Creating onTrigger for", target_slotType, "on", target_node);
            return this.connect(slot, target_node, -1);
        }

        if (opts.generalTypeInCase) {
            target_slot = target_node.findSlotByType(true, 0, false, true);
            if (target_slot >= 0) {
                return this.connect(slot, target_node, target_slot);
            }
        }

        if (opts.firstFreeIfOutputGeneralInCase && [0, "*", ""].includes(target_slotType)) {
            target_slot = target_node.findInputSlotFree({
                typesNotAccepted: [LiteGraph.EVENT]
            });
            if (target_slot >= 0) {
                return this.connect(slot, target_node, target_slot);
            }
        }

        LiteGraph.log_debug("lgraphnode", "connectByType", "No way to connect type", target_slotType, "to target", target_node);
        return null;
    }

    /**
     * Connect this node input to the output of another node BY TYPE.
     * @method connectByTypeOutput
     * @param {number|string} slot Slot number or name of the input slot
     * @param {LGraphNode} source_node The source node
     * @param {string} source_slotType The expected output slot type of the source node
     * @return {Object|null} Link info if created, otherwise null
     */
    connectByTypeOutput(slot, source_node, source_slotType = "*", optsIn = {}) {
        let opts = Object.assign({
            createEventInCase: true,
            firstFreeIfInputGeneralInCase: true,
            generalTypeInCase: true,
        }, optsIn);

        if (typeof source_node === "number") {
            source_node = this.graph.getNodeById(source_node);
        }
        if (!source_node) return null;

        let source_slot = source_node.findSlotByType(false, source_slotType, false, opts.preferFreeSlot);
        if (source_slot >= 0) {
            LiteGraph.log_debug("lgraphnode", "connectByTypeOutput", "Connecting type", source_slotType, "to slot", source_slot);
            return source_node.connect(source_slot, this, slot);
        }

        if (opts.generalTypeInCase) {
            source_slot = source_node.findSlotByType(false, 0, false, true);
            if (source_slot >= 0) {
                return source_node.connect(source_slot, this, slot);
            }
        }

        if (opts.createEventInCase && source_slotType === LiteGraph.EVENT) {
            if (LiteGraph.do_add_triggers_slots) {
                source_slot = source_node.addOnExecutedOutput();
                return source_node.connect(source_slot, this, slot);
            }
        }

        if (opts.firstFreeIfInputGeneralInCase && [0, "*", "", "undefined"].includes(source_slotType)) {
            source_slot = source_node.findOutputSlotFree({
                typesNotAccepted: [LiteGraph.EVENT]
            });
            if (source_slot >= 0) {
                return source_node.connect(source_slot, this, slot);
            }
        }

        LiteGraph.log_debug("lgraphnode", "connectByTypeOutput", "No way to connect type", source_slotType, "to source", source_node);
        return null;
    }


    /**
     * connect this node output to the input of another node
     * @method connect
     * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} node the target node
     * @param {number|string} target_slot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
     * @return {Object} the link_info is created, otherwise null
     */
    connect(slot, target_node, target_slot = 0) {
        if (!this.graph) {
            // could be connected before adding it to a graph
            LiteGraph.log_warn("lgraphnode", "connect", "Error, node doesn't belong to any graph. Nodes must be added first to a graph before connecting them.", this); // due to link ids being associated with graphs
            return null;
        }

        let r = null;

        // seek for the output slot
        /* if (slot.constructor === String) {
            slot = this.findOutputSlot(slot);
            if (slot == -1) {
                LiteGraph.log_warn("lgraphnode","connect", "Error, string slot not found",this,slot);
                return null;
            }
        } else if (!this.outputs || slot >= this.outputs.length) {
            LiteGraph.log_warn("lgraphnode","connect", "Error, number slot not found",this,slot);
            return null;
        } */
        slot = this.getOutputSlot(slot);
        if (slot == -1) {
            LiteGraph.log_warn("lgraphnode", "connect", "Slot not found", this, slot);
            return null;
        }

        if (target_node && target_node.constructor === Number) { // check this ? Number constructor falling back to ID ?
            LiteGraph.log_debug("lgraphnode", "connect", "Target node constructor is number", target_node);
            target_node = this.graph.getNodeById(target_node);
            LiteGraph.log_debug("lgraphnode", "connect", "Target node number constructor, looked for node by ID", target_node);
        }
        if (!target_node) {
            // throw new Error("target node is null");
            LiteGraph.log_warn("lgraphnode", "connect", "Target node null", target_node);
            return;
        }

        // A removal callback must not recreate links to a node being detached.
        if (target_node.graph !== this.graph || this.graph._clearing ||
            this.graph._removingNodes?.has(this) || this.graph._removingNodes?.has(target_node)) return null;

        // avoid loopback
        if (target_node == this) {
            return null;
        }

        if (target_slot === LiteGraph.EVENT) {

            if (LiteGraph.do_add_triggers_slots) {
                // search for first slot with event? :: NO this is done outside
                // LiteGraph.log?.("Connect: Creating triggerEvent");
                // force mode
                target_node.changeMode(LiteGraph.ON_TRIGGER);
                target_slot = target_node.findInputSlot("onTrigger");
                LiteGraph.log_debug("lgraphnode", "connect", "Created onTrigger slot", target_slot);
            } else {
                return null; // -- break --
            }

        } else {
            target_slot = target_node.getInputSlot(target_slot);
        }

        // you can specify the slot by name
        /* if (target_slot.constructor === String) {
            target_slot = target_node.findInputSlot(target_slot);
            if (target_slot == -1) {
                LiteGraph.log_warn("lgraphnode","connect", "Target string slot not found",target_slot);
                return null;
            }
        } else */

        if (
            !target_node.inputs || target_slot == -1
            // target_slot >= target_node.inputs.length
        ) {
            LiteGraph.log_warn("lgraphnode", "connect", "Target slot not found", target_slot, target_node.inputs);
            return null;
        }

        var changed = false;

        var input = target_node.inputs[target_slot];
        var link_info = null;
        var output = this.outputs[slot];

        if (!this.outputs[slot]) {
            LiteGraph.log_warn("lgraphnode", "connect", "Invalid processed output slot: ", slot, this.outputs);
            return null;
        }

        // callback, allow the node to change target slot: it gets the slot and returns
        // another slot index (plain or as {return_value}), or false to refuse
        r = target_node.processCallbackHandlers("onBeforeConnectInput", {
            def_cb: target_node.onBeforeConnectInput
        }, target_slot);
        var redirect = r !== null && typeof(r) == "object" ? r.return_value : r;
        if (redirect === false) {
            LiteGraph.log_debug("lgraphnode", "connect", "Node onBeforeConnectInput refused the connection", target_slot);
            return null;
        }
        if (typeof(redirect) == "number" && redirect !== target_slot) {
            LiteGraph.log_debug("lgraphnode", "connect", "Node onBeforeConnectInput changing target_slot", target_slot, redirect);
            target_slot = redirect;
            input = target_node.inputs[target_slot];
            if (!input) {
                LiteGraph.log_warn("lgraphnode", "connect", "onBeforeConnectInput returned a missing slot", target_slot);
                return null;
            }
        }

        // callback, allow the node to stop connection
        r = this.processCallbackHandlers("onConnectOutput", {
            def_cb: this.onConnectOutput
        }, slot, input.type, input, target_node, target_slot);
        if (r !== null && (r === false || (typeof(r) == "object" && r.return_value === false))) {
            LiteGraph.log_debug("lgraphnode", "connect", "Node onConnectOutput stopping connection", r.return_value);
            return null;
        }

        // check target_slot and check connection types
        if (target_slot === false || target_slot === null || !LiteGraph.isValidConnection(output.type, input.type)) {
            LiteGraph.log_warn("lgraphnode", "connect", "target_slot is NOT valid", target_slot, output.type, input.type);
            this.setDirtyCanvas(false, true);
            if (changed)
                this.graph.connectionChange(this, link_info);
            return null;
        } else {
            LiteGraph.log_debug("lgraphnode", "connect", "target_slot is valid", target_slot);
        }

        // callback, allow the target node to stop connection
        r = target_node.processCallbackHandlers("onConnectInput", {
            def_cb: target_node.onConnectInput
        }, target_slot, output.type, output, this, slot);
        if (r !== null && (r === false || (typeof(r) == "object" && r.return_value === false))) {
            LiteGraph.log_debug("lgraphnode", "connect", "targetNode onConnectInput stopping connection", r.return_value);
            return null;
        }
        // check :: was already called just few steps here above
        // if ( this.onConnectOutput?.(slot, input.type, input, target_node, target_slot) === false ) {
        //     return null;
        // }

        // if there is something already plugged there, disconnect
        if (target_node.inputs[target_slot] && target_node.inputs[target_slot].link != null) {
            this.graph.beforeChange();
            target_node.disconnectInput(target_slot, {
                doProcessChange: false
            });
            changed = true;
        }
        if (output.links?.length) {
            switch (output.type) {
                case LiteGraph.EVENT:
                    if (!LiteGraph.allow_multi_output_for_events) {
                        this.graph.beforeChange();
                        this.disconnectOutput(slot, false, {
                            doProcessChange: false
                        }); // Input(target_slot, {doProcessChange: false});
                        changed = true;
                    }
                    break;
                default:
                    break;
            }
        }

        var nextId
        if (LiteGraph.use_uuids)
            nextId = LiteGraph.uuidv4();
        else
            nextId = ++this.graph.last_link_id;

        // create link class
        link_info = new LiteGraph.LLink(
            nextId,
            input.type || output.type,
            this.id,
            slot,
            target_node.id,
            target_slot,
        );

        // add to graph links list
        this.graph.links[link_info.id] = link_info;

        // connect in output
        if (output.links == null) {
            output.links = [];
        }
        output.links.push(link_info.id);
        // connect in input
        if (typeof target_node.inputs[target_slot] == "undefined") {
            LiteGraph.log_warn("lgraphnode", "connect", "FIXME error, target_slot does not exists on target_node", target_node, target_slot);
        }
        target_node.inputs[target_slot].link = link_info.id;

        this.processCallbackHandlers("onConnectionsChange", {
            def_cb: this.onConnectionsChange
        }, LiteGraph.OUTPUT, slot, true, link_info, output, );

        target_node.processCallbackHandlers("onConnectionsChange", {
            def_cb: target_node.onConnectionsChange
        }, LiteGraph.INPUT, target_slot, true, link_info, input, );

        if (this.graph) {

            this.graph.processCallbackHandlers("onNodeConnectionChange", {
                def_cb: this.graph.onNodeConnectionChange
            }, LiteGraph.INPUT, target_node, target_slot, this, slot, );

            this.graph.processCallbackHandlers("onNodeConnectionChange", {
                def_cb: this.graph.onNodeConnectionChange
            }, LiteGraph.OUTPUT, this, slot, target_node, target_slot, );

        }

        this.graph.onGraphChanged({
            action: "connect"
        });
        this.setDirtyCanvas(false, true);
        this.graph.afterChange();
        this.graph.connectionChange(this, link_info);
        this.graph._emit?.("link-connected", {
            link: link_info,
            origin: this,
            originSlot: slot,
            target: target_node,
            targetSlot: target_slot
        });

        return link_info;
    }

    /**
     * disconnect one output to an specific node
     * @method disconnectOutput
     * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} target_node the target node to which this slot is connected [Optional, if not target_node is specified all nodes will be disconnected]
     * @return {boolean} if it was disconnected successfully
     */
    disconnectOutput(slot, target_node, optsIn = {}) {
        slot = this.getOutputSlot(slot);
        const output = this.outputs[slot];
        const graph = this.graph;
        if (!graph || !output?.links?.length) return false;
        let links = output.links.slice();
        if (target_node !== undefined && target_node !== null && target_node !== false) {
            const targetId = typeof target_node === "object" ? target_node.id : target_node;
            const link = links.find((id) => graph.links[id]?.target_id === targetId);
            if (link === undefined) return false;
            links = [link];
        } else {
            // Detach this list before notifications, which can reconnect or remove nodes.
            output.links = null;
        }
        this._disconnectLinks(links, "disconnectOutput", optsIn);
        return true;
    }

    /** Disconnect one input, accepting its slot number or name. */
    disconnectInput(slot, optsIn = {}) {
        slot = this.getInputSlot(slot);
        const input = this.inputs[slot];
        if (!input || !this.graph) return false;
        const link = input.link;
        input.link = null;
        this._disconnectLinks(link == null ? [] : [link], "disconnectInput", optsIn);
        return true;
    }

    /** Commit every link removal before invoking user callbacks, then report failures. */
    _disconnectLinks(ids, action, opts) {
        const graph = this.graph;
        const notifications = [];
        for (const id of ids) {
            const link = graph.links[id];
            if (!link) continue;
            const origin = graph.getNodeById(link.origin_id);
            const target = graph.getNodeById(link.target_id);
            const output = origin?.outputs?.[link.origin_slot];
            const input = target?.inputs?.[link.target_slot];
            if (output?.links) {
                const index = output.links.indexOf(id);
                if (index !== -1) output.links.splice(index, 1);
            }
            if (input?.link === id) input.link = null;
            delete graph.links[id];
            notifications.push({
                link,
                origin,
                target,
                output,
                input
            });
        }
        const errors = [];
        const notify = (fn) => {
            try {
                fn();
            } catch (error) {
                errors.push(error);
            }
        };
        for (const {
                link,
                origin,
                target,
                output,
                input
            }
            of notifications) {
            notify(() => graph.onGraphChanged({
                action,
                doSave: opts.doProcessChange ?? true
            }));
            notify(() => graph._emit?.("link-removed", {
                link,
                origin: origin ?? null,
                target: target ?? null
            }));
            if (target) notify(() => target.processCallbackHandlers("onConnectionsChange", {
                def_cb: target.onConnectionsChange,
            }, LiteGraph.INPUT, link.target_slot, false, link, input));
            if (origin) notify(() => origin.processCallbackHandlers("onConnectionsChange", {
                def_cb: origin.onConnectionsChange,
            }, LiteGraph.OUTPUT, link.origin_slot, false, link, output));
            notify(() => graph.processCallbackHandlers("onNodeConnectionChange", {
                def_cb: graph.onNodeConnectionChange,
            }, LiteGraph.INPUT, target, link.target_slot, origin, link.origin_slot));
            notify(() => graph.processCallbackHandlers("onNodeConnectionChange", {
                def_cb: graph.onNodeConnectionChange,
            }, LiteGraph.OUTPUT, origin, link.origin_slot, target, link.target_slot));
        }
        notify(() => graph.setDirtyCanvas(false, true));
        notify(() => graph.connectionChange(this));
        if (errors.length === 1) throw errors[0];
        if (errors.length) throw new AggregateError(errors, "Link disconnection failed");
    }

    /**
     * Returns the center of a connection point in canvas coordinates
     * @method getConnectionPos
     * @param {boolean} is_input - True if it is an input slot, false if it is an output slot
     * @param {number | string} slot - Could be the number of the slot or the string with the name of the slot
     * @param {vec2} [out] - [Optional] A place to store the output to reduce garbage
     * @return {Float32[]} The position as [x, y]
     */
    getConnectionPos(is_input, slot_number, out = new Float32Array(2)) {
        var num_slots = 0;
        if (is_input && this.inputs) {
            num_slots = this.inputs.length;
        }
        if (!is_input && this.outputs) {
            num_slots = this.outputs.length;
        }

        var offset = LiteGraph.NODE_SLOT_HEIGHT * 0.5;

        if (this.flags.collapsed) {
            var w = this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH;
            if (this.horizontal) {
                out[0] = this.pos[0] + w * 0.5;
                if (is_input) {
                    out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
                } else {
                    out[1] = this.pos[1];
                }
            } else {
                if (is_input) {
                    out[0] = this.pos[0];
                } else {
                    out[0] = this.pos[0] + w;
                }
                out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            }
            return out;
        }

        // if not specifing a slot fallback to title center, similar to collapsed
        if (is_input && slot_number == -1) {
            LiteGraph.log_debug("lgraphnode", "getConnectionPos", "asking for connection slot -1");
            out[0] = this.pos[0] + LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            out[1] = this.pos[1] + LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            return out;
        }

        // hard-coded pos
        if (
            is_input &&
            num_slots > slot_number &&
            this.inputs[slot_number].pos
        ) {
            out[0] = this.pos[0] + this.inputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.inputs[slot_number].pos[1];
            return out;
        } else if (
            !is_input &&
            num_slots > slot_number &&
            this.outputs[slot_number].pos
        ) {
            out[0] = this.pos[0] + this.outputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.outputs[slot_number].pos[1];
            return out;
        }

        // horizontal distributed slots
        if (this.horizontal) {
            out[0] =
                this.pos[0] + (slot_number + 0.5) * (this.size[0] / num_slots);
            if (is_input) {
                out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
            } else {
                out[1] = this.pos[1] + this.size[1];
            }
            return out;
        }

        // default vertical slots
        if (is_input) {
            out[0] = this.pos[0] + offset;
            const input = this.inputs?.[slot_number];
            if (input && LGraphNode.isWidgetInputSlot(input)) {
                // a widget input sits on its widget's row (known once the widgets were drawn)
                const widget = this.getWidgetFromSlot(input);
                if (widget?.last_y != null) {
                    out[1] = this.pos[1] + widget.last_y + LiteGraph.NODE_WIDGET_HEIGHT * 0.5;
                    return out;
                }
            }
            // rows count only ordinary inputs
            let row = 0;
            for (let i = 0; i < slot_number; i++) {
                if (!LGraphNode.isWidgetInputSlot(this.inputs[i])) row++;
            }
            out[1] = this.pos[1] + (row + 0.7) * LiteGraph.NODE_SLOT_HEIGHT + (this.constructor.slot_start_y || 0);
            return out;
        }
        out[0] = this.pos[0] + this.size[0] + 1 - offset;
        out[1] =
            this.pos[1] +
            (slot_number + 0.7) * LiteGraph.NODE_SLOT_HEIGHT +
            (this.constructor.slot_start_y || 0);
        return out;
    }

    /* Force align to grid */
    alignToGrid() {
        if (!this.pos) this.pos = [0, 0];
        this.pos[0] =
            LiteGraph.CANVAS_GRID_SIZE *
            Math.round(this.pos[0] / LiteGraph.CANVAS_GRID_SIZE);
        this.pos[1] =
            LiteGraph.CANVAS_GRID_SIZE *
            Math.round(this.pos[1] / LiteGraph.CANVAS_GRID_SIZE);
    }

    /* Console output */
    trace(msg) {
        if (!this.console) {
            this.console = [];
        }

        this.console.push?.(msg);
        if (this.console.length > LGraphNode.MAX_CONSOLE) {
            this.console.shift?.();
        }

        this.graph?.processCallbackHandlers("onNodeTrace", {
            def_cb: this.graph?.onNodeTrace
        }, this, msg);
    }

    /* Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
    setDirtyCanvas(dirty_foreground, dirty_background) {
        if (!this.graph) {
            return;
        }
        this.graph.sendActionToCanvas("setDirty", [
            dirty_foreground,
            dirty_background,
        ]);
    }

    // XXX: not used, could implement background image (? should do it graphcanvas to share same image or trust cache)
    loadImage(url) {
        var img = new Image();
        img.src = LiteGraph.node_images_path + url;
        img.ready = false;

        var that = this;
        img.onload = function() {
            this.ready = true;
            that.setDirtyCanvas(true);
        };
        return img;
    }

    // safe LGraphNode action execution (not sure if safe)
    /*
    LGraphNode.prototype.executeAction = function(action)
    {
    if(action == "") return false;

    if( action.indexOf(";") != -1 || action.indexOf("}") != -1)
    {
        this.trace("Error: Action contains unsafe characters");
        return false;
    }

    var tokens = action.split("(");
    var func_name = tokens[0];
    if( typeof(this[func_name]) != "function")
    {
        this.trace("Error: Action not found on node: " + func_name);
        return false;
    }

    var code = action;

    try
    {
        var _foo = eval;
        eval = null;
        (new Function("with(this) { " + code + "}")).call(this);
        eval = _foo;
    }
    catch (err)
    {
        this.trace("Error executing action {" + action + "} :" + err);
        return false;
    }

    return true;
    }
    */

    /* Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
    captureInput(v) {
        if (!this.graph || !this.graph.list_of_graphcanvas) {
            return;
        }

        var list = this.graph.list_of_graphcanvas;

        for (var i = 0; i < list.length; ++i) {
            var c = list[i];
            // releasing somebody elses capture?!
            if (!v && c.node_capturing_input != this) {
                continue;
            }

            // change
            c.node_capturing_input = v ? this : null;
        }
    }

    /**
     * Collapse the node to make it smaller on the canvas
     * @method collapse
     **/
    collapse(force) {
        this.graph.onGraphChanged({
            action: "collapse"
        });
        if (this.constructor.collapsable === false && !force) {
            return;
        }
        if (!this.flags.collapsed) {
            this.flags.collapsed = true;
        } else {
            this.flags.collapsed = false;
        }
        this.setDirtyCanvas(true, true);
    }

    /**
     * Forces the node to do not move or realign on Z
     * @method pin
     **/

    pin(v) {
        this.graph?.onGraphChanged({
            action: "pin"
        }); // a node may be pinned before it is added (Comfy a0b50dc)
        if (v === undefined) {
            this.flags.pinned = !this.flags.pinned;
        } else {
            this.flags.pinned = v;
        }
    }

    localToScreen(x, y, graphcanvas) {
        return [
            (x + this.pos[0]) * graphcanvas.scale + graphcanvas.offset[0],
            (y + this.pos[1]) * graphcanvas.scale + graphcanvas.offset[1],
        ];
    }

    refreshAncestors(optsIn = {}) {
        var optsDef = {
            action: "",
            param: null,
            options: null,
            passParam: true,
        };
        var opts = Object.assign(optsDef, optsIn);

        if (!this.inputs || !this.graph) {
            return;
        }
        if (LiteGraph.preventAncestorRecalculation) {
            if (this.graph.node_ancestorsCalculated && this.graph.node_ancestorsCalculated[this.id]) {
                LiteGraph.log_verbose("lgraphnode", "refreshAncestors", "already calculated subtree! Prevent! " + this.id + ":" + this.order, this);
                return;
            }
        }

        if (!opts.action || opts.action == "")
            opts.action = this.id + "_ancestors";
        if (opts.param == null)
            opts.param = this.id + "_ancestors";
        if (!opts.options)
            opts.options = {};
        opts.options = Object.assign({
            action_call: opts.action
        }, opts.options);

        LiteGraph.log_verbose("lgraphnode", "refreshAncestors", "ancestors processing", this.id + ":" + this.order + " " + opts.options.action_call, this);

        const graph = this.graph;
        const previousAncestorsCall = graph.ancestorsCall;
        graph.ancestorsCall = true; // prevent triggering slots

        var optsAncestors = {
            modesSkip: [LiteGraph.NEVER, LiteGraph.ON_EVENT, LiteGraph.ON_TRIGGER],
            modesOnly: [LiteGraph.ALWAYS, LiteGraph.ON_REQUEST],
            typesSkip: [LiteGraph.ACTION],
            typesOnly: [],
        };
        try {
            const ancestors = graph.getAncestors(this, optsAncestors);
            for (const ancestor of ancestors) {
                ancestor.doExecute(opts.param, opts.options);
                graph.node_ancestorsCalculated[ancestor.id] = true;
            }
            graph.node_ancestorsCalculated[this.id] = true;
        } finally {
            graph.ancestorsCall = previousAncestorsCall;
        }

        return true;
    }

    /**
     * syncObjectByProperty ensures that duplicate slots are merged in a controlled way:
     * - For each unique slot (as defined by the given property), the total count in the result
     *   will be the maximum number of occurrences found in either the source or destination.
     * - When a slot appears in both arrays, the destination order is preserved for those slots.
     *   However, if the source array provides extra copies (or a different order), those items are
     *   used (or appended) so that the new order reflects any changes from the source.
     * - If a destination slot has no matching source item, fallback checks (if provided) are applied.
     *
     * @param {Array} ob_from - The source array (new configuration).
     * @param {Array} ob_dest - The destination array (current configuration).
     * @param {string} property - The property name used for matching (e.g. a slot name).
     * @param {object} optsIn - Optional parameters. Options include:
     *    - only_in_source: "append" (if extra source slots exist, append them)
     *    - fallback_checks: an array of alternative property checks (e.g. [{name:"type"}])
     *
     * @returns {object} An object containing:
     *   - ob_dest: the new merged array.
     *   - keys_remap: a mapping from each source item’s original index to its new index.
     *   - only_in_source: any items found only in the source.
     *   - only_in_target: any items found only in the destination.
     */
    syncObjectByProperty_NEW_DISABLED_WIP(ob_from, ob_dest, property, optsIn) {
        // Default options.
        const optsDef = {
            only_in_source: "append",
            fallback_checks: [{
                name: "type"
            }]
        };
        const opts = Object.assign({}, optsDef, optsIn);

        // Ensure we have arrays to work with.
        ob_from = ob_from || [];
        ob_dest = ob_dest || [];

        // Compute the unique keys (slots) in order.
        // Start with the order from destination, then add any keys from source that aren’t already included.
        const keyOrder = [];
        const seenKeys = new Set();
        ob_dest.forEach(item => {
            const keyVal = item[property];
            if (!seenKeys.has(keyVal)) {
                keyOrder.push(keyVal);
                seenKeys.add(keyVal);
                LiteGraph.log_verbose("lgraphnode", "syncObjectByProperty", "ob_dest seen", keyVal, item);
            }
        });
        ob_from.forEach(item => {
            const keyVal = item[property];
            if (!seenKeys.has(keyVal)) {
                keyOrder.push(keyVal);
                seenKeys.add(keyVal);
                LiteGraph.log_verbose("lgraphnode", "syncObjectByProperty", "ob_from seen", keyVal, item);
            }
        });

        // Group items by their key.
        const groupFrom = {};
        ob_from.forEach((item, idx) => {
            const keyVal = item[property];
            if (!groupFrom[keyVal]) groupFrom[keyVal] = [];
            groupFrom[keyVal].push({
                idx,
                item
            });
        });
        LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "groupFrom", JSON.stringify(groupFrom));
        const groupDest = {};
        ob_dest.forEach((item, idx) => {
            const keyVal = item[property];
            if (!groupDest[keyVal]) groupDest[keyVal] = [];
            groupDest[keyVal].push({
                idx,
                item
            });
        });
        LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "groupDest", JSON.stringify(groupDest));

        // Global set to record which source indices have been used.
        const usedSource = new Set();
        // Mapping from source index to new index.
        const keys_remap = {};
        // The new merged destination array.
        const new_dest = [];

        // Process each unique key in the order defined by destination (with extras from source appended).
        keyOrder.forEach(keyVal => {
            const srcGroup = groupFrom[keyVal] || [];
            const destGroup = groupDest[keyVal] || [];
            // Allowed number is the greatest count in either array.
            const allowedCount = Math.max(srcGroup.length, destGroup.length);
            // For each copy of this slot…
            for (let i = 0; i < allowedCount; i++) {
                let chosen = null;
                if (i < destGroup.length) {
                    // This slot exists in destination.
                    LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "slot exists in destination (i?)", i);
                    if (i < srcGroup.length) {
                        // Prefer the source item to update the slot.
                        chosen = LiteGraph.cloneObject(srcGroup[i].item);
                        usedSource.add(srcGroup[i].idx);
                        keys_remap[srcGroup[i].idx] = new_dest.length;
                        LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "prefer source", i, chosen);
                    } else {
                        // No matching source item in this position.
                        // Try fallback matching: search all unused source items for a match on any fallback property.
                        let fallbackMatched = false;
                        const destItem = destGroup[i].item;
                        LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "no matching (i?)", destItem);
                        if (opts.fallback_checks && opts.fallback_checks.length) {
                            for (const check of opts.fallback_checks) {
                                for (let j = 0; j < ob_from.length; j++) {
                                    if (usedSource.has(j)) continue;
                                    if (ob_from[j][check.name] === destItem[check.name]) {
                                        chosen = LiteGraph.cloneObject(ob_from[j]);
                                        usedSource.add(j);
                                        keys_remap[j] = new_dest.length;
                                        fallbackMatched = true;
                                        break;
                                    }
                                }
                                if (fallbackMatched) {
                                    LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "fallbackMatched", i, chosen);
                                    break;
                                } else {
                                    LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "fallback NOT Matched");
                                }
                            }
                        }
                        // If no fallback match, retain the destination item.
                        if (!fallbackMatched) {
                            chosen = LiteGraph.cloneObject(destItem);
                            LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "fallback NOT Matched chosen is dest", chosen);
                        }
                    }
                } else {
                    // i >= destGroup.length: destination had fewer copies than source.
                    if (i < srcGroup.length) {
                        chosen = LiteGraph.cloneObject(srcGroup[i].item);
                        usedSource.add(srcGroup[i].idx);
                        keys_remap[srcGroup[i].idx] = new_dest.length;
                        LiteGraph.log_warn("lgraphnode", "syncObjectByProperty", "destination had fewer copies than source", i, chosen, srcGroup[i].idx, usedSource);
                    }
                }
                if (chosen !== null) {
                    new_dest.push(chosen);
                } else {
                    LiteGraph.log_verbose("lgraphnode", "syncObjectByProperty", "destination had fewer copies than source", i, chosen);
                }
            }
        });

        // Compute any items present only in source (unused items) and only in destination.
        const only_in_source = ob_from.filter((item, idx) => !usedSource.has(idx));
        const only_in_target = ob_dest.filter(destItem =>
            !ob_from.some(srcItem => srcItem[property] === destItem[property])
        );

        LiteGraph.log_verbose("syncObjectByProperty", "Merge Result", {
            ob_from,
            ob_dest,
            new_dest,
            keys_remap,
            only_in_source,
            only_in_target
        });

        return {
            ob_dest: new_dest,
            keys_remap: keys_remap,
            only_in_source: only_in_source,
            only_in_target: only_in_target
        };
    }

    /**
     * syncObjectByProperty will ensure using the right index for node inputs and outputs when onConfigure (de-serializing) 
     * @param {*} ob_from 
     * @param {*} ob_dest 
     * @param {*} property 
     * @param {*} optsIn 
     * @returns {object} return the result object and differences if found
     */
    syncObjectByProperty(ob_from, ob_dest, property, optsIn) {
        var optsDef = {
            only_in_source: "append",
            // only_in_dest: "keep"
            fallback_checks: [{
                name: "type"
            }]
        };
        var opts = Object.assign({}, optsDef, optsIn);

        if (ob_from === null || !ob_from) ob_from = [];
        if (ob_dest === null || !ob_dest) ob_dest = [];
        var new_dest = [];

        let keys_remap = {};

        let only_in_target = ob_dest.filter(input => !ob_from.some(srcInput => srcInput[property] === input[property]));
        /* if (opts.only_in_dest !== "keep") {
            new_dest = ob_dest.filter(input => ob_from.some(srcInput => srcInput[property] === input[property]) || opts.only_in_dest === "keep");
        } */

        let sourceUsedIds = [];
        let aNotFoundInSource = [];
        // cycle dest, for each cycle source for matching
        ob_dest.forEach((destInput, destIndex) => {
            let hasChangedIndex = false;
            let foundInSource = false;
            ob_from.forEach((sourceInput, sourceIndex) => {
                if (foundInSource) return;
                if (sourceUsedIds.includes(sourceIndex)) {
                    LiteGraph.log_verbose("syncObjectByProperty", "skip used", sourceInput, sourceIndex);
                } else if (sourceInput[property] === destInput[property]) {
                    foundInSource = true;
                    sourceUsedIds.push(sourceIndex);
                    new_dest[destIndex] = LiteGraph.cloneObject(sourceInput);
                    if (destIndex != sourceIndex) {
                        LiteGraph.log_debug("syncObjectByProperty", "push SHIFTED", destInput[property], destInput, sourceIndex, destIndex);
                        hasChangedIndex = true;
                        keys_remap[sourceIndex] = destIndex;
                    } else {
                        LiteGraph.log_verbose("syncObjectByProperty", "found ok, same index", destInput[property], sourceInput, destIndex);
                    }
                }
            });
            if (!foundInSource) { //} && !hasChangedIndex){
                aNotFoundInSource.push({
                    ob: destInput,
                    index: destIndex
                });
                // TODO: should check link ?!
                // TODO: should try to connect by type before than pushing, check AUDIO example (has invalid link or bad behavior?)
            }
        });
        if (aNotFoundInSource.length) {
            if (!opts.fallback_checks.length) {
                aNotFoundInSource.forEach((ob, i) => {
                    LiteGraph.log_debug("syncObjectByProperty", "!using fallback checks", "push !foundInSource", ob.ob[property], ob);
                    new_dest[ob.index] = LiteGraph.cloneObject(ob.ob);
                });
            } else {
                aNotFoundInSource.forEach((ob, i) => {
                    let destInput = ob.ob;
                    let destIndex = ob.index;
                    // LiteGraph.log_warn("syncObjectByProperty", "CHECKING", destIndex, destInput);
                    let foundInSource = false;
                    let hasChangedIndex = false;
                    opts.fallback_checks.forEach((checkX, ckI) => {
                        if (foundInSource) return;
                        ob_from.forEach((sourceInput, sourceIndex) => {
                            if (foundInSource) return;
                            if (sourceUsedIds.includes(sourceIndex)) {
                                LiteGraph.log_verbose("syncObjectByProperty", "aNotFoundInSource skip used slot", sourceInput, sourceIndex);
                            } else if (
                                sourceInput[checkX.name] === destInput[checkX.name]
                                // && (!checkX.dest_valid || )
                            ) {
                                foundInSource = true;
                                sourceUsedIds.push(sourceIndex);
                                new_dest[destIndex] = LiteGraph.cloneObject(sourceInput);
                                LiteGraph.log_debug("syncObjectByProperty", "aNotFoundInSource", checkX, "push SHIFTED", destInput[checkX], destInput, sourceIndex, destIndex);
                                hasChangedIndex = true;
                                keys_remap[sourceIndex] = destIndex;
                            }
                        });
                    });
                    if (!foundInSource) {
                        LiteGraph.log_debug("syncObjectByProperty", "aNotFoundInSource, push !foundInSource", ob.ob[property], ob);
                        new_dest[ob.index] = LiteGraph.cloneObject(ob.ob);
                    }
                });
            }
        }

        // check only in source
        /* let only_in_source = ob_from.filter(input => !ob_dest.some(destInput => destInput[property] === input[property]));
        if (opts.only_in_source === "append" && only_in_source.length) {
            LiteGraph.log_debug("syncObjectByProperty", "push only_in_source", only_in_source);
            new_dest.push(...only_in_source);
        } */
        let destUsedIds = [];
        // cycle source, for each cycle dest
        let only_in_source = [];
        ob_from.forEach((sourceInput, sourceIndex) => {
            let foundInDest = false;
            if (sourceUsedIds.includes(sourceIndex)) {
                return;
            }
            ob_dest.forEach((destInput, destIndex) => {
                if (foundInDest) return;
                if (destUsedIds.includes(destIndex)) {
                    LiteGraph.log_verbose("syncObjectByProperty", "only_in_source", "skip checked slot", sourceInput, sourceIndex);
                } else if (sourceInput[property] === destInput[property]) {
                    destUsedIds.push(destIndex);
                    foundInDest = true;
                }
            });
            if (!foundInDest) {
                // TODO: should try to connect by type before than pushing, check AUDIO example (has invalid link or bad behavior?)
                LiteGraph.log_debug("syncObjectByProperty", "push only_in_source", sourceInput[property], sourceInput);
                new_dest.push(LiteGraph.cloneObject(sourceInput));
                keys_remap[sourceIndex] = new_dest.length - 1;
                only_in_source.push(sourceInput);
            }
        });


        LiteGraph.log_verbose("lgraphnode", "syncByProperty", {
            only_in_source: only_in_source,
            only_in_target: only_in_target,
            ob_from: ob_from,
            ob_dest: ob_dest,
            new_dest: new_dest,
            keys_remap: keys_remap,
        });

        return {
            ob_dest: new_dest,
            keys_remap: keys_remap,
            only_in_source: only_in_source,
            only_in_target: only_in_target,
        };
    }
}


/**
 * Class representing a link object that stores link information between two nodes.
 */
export class LLink {

    /**
     * Create a link object.
     * @param {string} id - The unique identifier of the link.
     * @param {string} type - The type of the link.
     * @param {string} origin_id - The identifier of the origin node.
     * @param {string} origin_slot - The slot of the origin node the link is connected to.
     * @param {string} target_id - The identifier of the target node.
     * @param {string} target_slot - The slot of the target node the link is connected to.
     */
    constructor(id, type, origin_id, origin_slot, target_id, target_slot) {
        this.id = id;
        this.type = type;
        this.origin_id = origin_id;
        this.origin_slot = origin_slot;
        this.target_id = target_id;
        this.target_slot = target_slot;

        this._data = null;
        this._pos = new Float32Array(2); // center
    }

    /**
     * Configure the link object with new data.
     * @param {Array|Object} o - An array or object containing link data to configure.
     */
    configure(o) {
        if (o.constructor === Array) {
            this.id = o[0];
            this.origin_id = o[1];
            this.origin_slot = o[2];
            this.target_id = o[3];
            this.target_slot = o[4];
            this.type = o[5];
        } else {
            this.id = o.id;
            this.type = o.type;
            this.origin_id = o.origin_id;
            this.origin_slot = o.origin_slot;
            this.target_id = o.target_id;
            this.target_slot = o.target_slot;
            if (o.parentId !== undefined && o.parentId !== null) this.parentId = o.parentId; // reroute nearest the target
        }
    }

    /**
     * Serialize the link object to an array.
     * @returns {Array} An array containing the serialized link data.
     */
    serialize() {
        return [
            this.id,
            this.origin_id,
            this.origin_slot,
            this.target_id,
            this.target_slot,
            this.type,
        ];
    }
}

/**
 * extracted from base nodes
 */

// Subgraph: a node that contains a graph
export class Subgraph {

    static title = "Subgraph";
    static desc = "Graph inside a node";

    constructor() {

        this.size = [140, 80];
        this.properties = {
            enabled: true
        };
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
        return [
            ["enabled", "boolean"]
        ];
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
        setTimeout(function() {
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
        LiteGraph.log_debug("subgraph", "onAction", ...arguments);
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
        LiteGraph.log_verbose("subgraph", "onExecute", "subgraph runStep", this.subgraph);
        this.subgraph.runStep();

        // send subgraph global outputs to outputs
        if (this.outputs) {
            for (let i = 0; i < this.outputs.length; i++) {
                let output = this.outputs[i];
                let value = this.subgraph.getOutputData(output.name);
                LiteGraph.log_verbose("subgraph", "onExecute", "outputDataSet", i, value);
                this.setOutputData(i, value);
            }
        }
    }

    sendEventToAllNodes(eventname, param, mode) {
        if (this.enabled || eventname === "onStop") {
            LiteGraph.log_debug("subgraph", "sendEventToAllNodes", ...arguments);
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
        LiteGraph.log_debug("subgraph", "onSubgraphTrigger", ...arguments);
        var slot = this.findOutputSlot(event);
        if (slot != -1) {
            LiteGraph.log_debug("subgraph", "onSubgraphTrigger", "triggerSlot", slot);
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
        return [{
                content: "Open",
                callback: function() {
                    graphcanvas.openSubgraph(that.subgraph);
                },
            },
            {
                content: "Unpack subgraph",
                callback: function() {
                    const nodes = that.graph.unpackSubgraph(that);
                    graphcanvas.selectNodes(nodes);
                    graphcanvas.setDirty(true, true);
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
        const idMap = {
            nodeIDs: {},
            linkIDs: {}
        };

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
                const merge = this.reassignSubgraphUUIDs(node.subgraph);
                Object.assign(idMap.nodeIDs, merge.nodeIDs);
                Object.assign(idMap.linkIDs, merge.linkIDs);
            }
        }
        return idMap;
    }

    clone() {
        var node = LiteGraph.createNode(this.type);
        // serialize() shares containers with this node and its inner graph
        var data = LiteGraph.cloneObject(this.serialize());

        if (LiteGraph.use_uuids) {
            this.reassignSubgraphUUIDs(data.subgraph);
        }

        delete data["id"];
        // keep the outer slots (order and any added by hand), just not their links;
        // the inner GraphInput/GraphOutput nodes match them by name
        data.inputs?.forEach((input) => {
            input.link = null;
        });
        data.outputs?.forEach((output) => {
            if (output.links) output.links.length = 0;
        });
        node.configure(data);
        return node;
    }

    /**
     * Fills this (empty, already added) subgraph node with copies of `nodes` and rewires the
     * outside: one graph input per distinct outside source feeding the selection, one graph output
     * per inside source feeding the outside. Internal links are kept; event links become event
     * ports. The original nodes are removed from the parent graph.
     * Use LGraph.convertToSubgraph(nodes) for the transactional, one-undo-step version.
     * @param {Array<object>} nodes - nodes of this node's graph
     * @returns {this}
     */
    buildFromNodes(nodes) {
        const graph = this.graph;
        if (!graph) throw new Error("buildFromNodes: add the subgraph node to a graph first");
        const selected = nodes.filter((node) => node && node !== this && node.graph === graph);
        if (!selected.length) return this;
        const inner = this.subgraph;
        const inSet = new Set(selected.map((node) => node.id));
        const links = Object.values(graph.links).filter(Boolean);
        const linkType = (link) => (link.type === LiteGraph.EVENT || link.type === LiteGraph.ACTION || link.type === -1) ? "event" : (link.type || "*");

        // 1. classify the links touching the selection
        const internal = links.filter((link) => inSet.has(link.origin_id) && inSet.has(link.target_id));
        const incoming = new Map(); // outside source -> {origin, slot, type, name, targets[]}
        const outgoing = new Map(); // inside source -> {origin, slot, type, name, targets[]}
        for (const link of links) {
            const fromIn = inSet.has(link.origin_id),
                toIn = inSet.has(link.target_id);
            if (!fromIn && toIn) {
                const key = `${link.origin_id}:${link.origin_slot}`;
                const target = graph.getNodeById(link.target_id);
                const entry = incoming.get(key) ?? {
                    origin: link.origin_id,
                    slot: link.origin_slot,
                    type: linkType(link),
                    name: target?.inputs?.[link.target_slot]?.name || "in",
                    targets: []
                };
                entry.targets.push({
                    node: link.target_id,
                    slot: link.target_slot
                });
                incoming.set(key, entry);
            } else if (fromIn && !toIn) {
                const key = `${link.origin_id}:${link.origin_slot}`;
                const origin = graph.getNodeById(link.origin_id);
                const entry = outgoing.get(key) ?? {
                    origin: link.origin_id,
                    slot: link.origin_slot,
                    type: linkType(link),
                    name: origin?.outputs?.[link.origin_slot]?.name || "out",
                    targets: []
                };
                entry.targets.push({
                    node: link.target_id,
                    slot: link.target_slot
                });
                outgoing.set(key, entry);
            }
        }

        // 2. copies of the nodes, without their links (ids are kept: the inner graph is empty)
        const bounds = [Infinity, Infinity, -Infinity, -Infinity];
        const copies = new Map();
        for (const node of selected) {
            bounds[0] = Math.min(bounds[0], node.pos[0]);
            bounds[1] = Math.min(bounds[1], node.pos[1]);
            bounds[2] = Math.max(bounds[2], node.pos[0] + (node.size?.[0] ?? 0));
            bounds[3] = Math.max(bounds[3], node.pos[1] + (node.size?.[1] ?? 0));
            const data = LiteGraph.cloneObject(node.serialize());
            data.inputs?.forEach((input) => {
                input.link = null;
            });
            data.outputs?.forEach((output) => {
                output.links = null;
            });
            const copy = LiteGraph.createNode(data.type);
            if (!copy) throw new Error(`buildFromNodes: cannot create a node of type ${data.type}`);
            copy.configure(data);
            copies.set(node.id, copy);
        }

        // 3. the originals leave the parent graph (their boundary links go with them)
        for (const node of selected) graph.remove(node);
        this.pos = [bounds[0], bounds[1]];
        for (const copy of copies.values()) inner.add(copy);
        for (const link of internal) {
            copies.get(link.origin_id).connect(link.origin_slot, copies.get(link.target_id), link.target_slot);
        }

        // 4. graph inputs and outputs, then the outside wiring
        const unique = (name, taken) => {
            let candidate = name,
                n = 2;
            while (taken.has(candidate)) candidate = `${name}_${n++}`;
            taken.add(candidate);
            return candidate;
        };
        const inputNames = new Set(),
            outputNames = new Set();
        let row = 0;
        for (const entry of incoming.values()) {
            const io = LiteGraph.createNode("graph/input");
            inner.add(io);
            io.pos = [bounds[0] - 260, bounds[1] + 100 * row++];
            io.setProperty("type", entry.type);
            const name = unique(entry.name, inputNames);
            io.setProperty("name", name);
            for (const target of entry.targets) io.connect(0, copies.get(target.node), target.slot);
            const source = graph.getNodeById(entry.origin);
            const slot = this.findInputSlot(name);
            if (source && slot !== -1) source.connect(entry.slot, this, slot);
        }
        row = 0;
        for (const entry of outgoing.values()) {
            const io = LiteGraph.createNode("graph/output");
            inner.add(io);
            io.pos = [bounds[2] + 80, bounds[1] + 100 * row++];
            io.setProperty("type", entry.type);
            const name = unique(entry.name, outputNames);
            io.setProperty("name", name);
            copies.get(entry.origin).connect(entry.slot, io, 0);
            const slot = this.findOutputSlot(name);
            for (const target of entry.targets) {
                const node = graph.getNodeById(target.node);
                if (node && slot !== -1) this.connect(slot, node, target.slot);
            }
        }
        this.setSize(this.computeSize());
        return this;
    }

    /**
     * Moves the inner nodes back into the parent graph (with fresh ids) and reconnects them to what
     * this node was connected to; links passing straight through the subgraph are bridged.
     * This node is removed. Use LGraph.unpackSubgraph(node) for the one-undo-step version.
     * @returns {Array<object>} the unpacked nodes
     */
    unpack() {
        const graph = this.graph;
        if (!graph) throw new Error("unpack: the subgraph node is not in a graph");
        const inner = this.subgraph;
        const isInput = (node) => node?.type === "graph/input";
        const isOutput = (node) => node?.type === "graph/output";
        const contents = inner._nodes.filter((node) => !isInput(node) && !isOutput(node));

        // outside connections of this node, captured before it is removed
        const outerSource = new Map(); // input name -> {node, slot}
        this.inputs?.forEach((input) => {
            const link = input.link != null ? graph.links[input.link] : null;
            if (link) outerSource.set(input.name, {
                node: graph.getNodeById(link.origin_id),
                slot: link.origin_slot
            });
        });
        const outerTargets = new Map(); // output name -> [{node, slot}]
        this.outputs?.forEach((output) => {
            outerTargets.set(output.name, (output.links ?? []).map((id) => graph.links[id]).filter(Boolean)
                .map((link) => ({
                    node: graph.getNodeById(link.target_id),
                    slot: link.target_slot
                })));
        });

        // copies in the parent graph, laid out where the subgraph node was
        const minX = Math.min(...contents.map((node) => node.pos[0]));
        const minY = Math.min(...contents.map((node) => node.pos[1]));
        const copies = new Map();
        for (const node of contents) {
            const data = LiteGraph.cloneObject(node.serialize());
            data.inputs?.forEach((input) => {
                input.link = null;
            });
            data.outputs?.forEach((output) => {
                output.links = null;
            });
            const copy = LiteGraph.createNode(data.type);
            if (!copy) throw new Error(`unpack: cannot create a node of type ${data.type}`);
            copy.configure(data);
            copy.id = -1; // a fresh id in the parent graph
            copy.pos = [this.pos[0] + node.pos[0] - minX, this.pos[1] + node.pos[1] - minY];
            copies.set(node.id, copy);
        }

        // what to connect, resolved through the graph inputs and outputs
        const plan = [];
        const sourceOf = (link) => {
            const origin = inner.getNodeById(link.origin_id);
            if (isInput(origin)) return outerSource.get(origin.properties.name) ?? null;
            return copies.has(link.origin_id) ? {
                node: copies.get(link.origin_id),
                slot: link.origin_slot
            } : null;
        };
        for (const link of Object.values(inner.links).filter(Boolean)) {
            const target = inner.getNodeById(link.target_id);
            const source = sourceOf(link);
            if (!source?.node) continue;
            if (isOutput(target)) {
                for (const outer of outerTargets.get(target.properties.name) ?? []) {
                    if (outer.node) plan.push([source, outer]);
                }
            } else if (copies.has(link.target_id)) {
                plan.push([source, {
                    node: copies.get(link.target_id),
                    slot: link.target_slot
                }]);
            }
        }

        graph.remove(this);
        for (const copy of copies.values()) graph.add(copy);
        for (const [source, target] of plan) source.node.connect(source.slot, target.node, target.slot);
        return [...copies.values()];
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
            function(v) {
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
            function(v) {
                that.setProperty("type", v);
            },
        );

        this.value_widget = this.addWidget(
            "number",
            "Value",
            this.properties.value,
            function(v) {
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
            this.value_widget.value = this.value_widget.value && (this.value_widget.value + "").toLocaleLowerCase() !== "false" && this.value_widget.value !== "" ? true : false; // "true"
        } else if (type == "string") {
            this.value_widget.type = "text";
            this.value_widget.value = this.value_widget.value + ""; // ""
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
            LiteGraph.log_debug("GraphInput", "onAction", "triggering slot", action, param);
            this.triggerSlot(0, param, null, options);
        } else {
            LiteGraph.log_debug("GraphInput", "onAction", "NOT eventAction TYPE", "this", this, "arugments", ...arguments);
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
        this.properties = {
            name: "",
            type: ""
        };

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
            LiteGraph.log_debug("GraphOutput", "onAction", ...arguments);
            LiteGraph.log_debug("GraphOutput", "onAction", "graphTrigger", this.properties.name, param);
            this.graph.trigger(this.properties.name, param, options);
        } else {
            LiteGraph.log_debug("GraphOutput", "onAction", "skipping not ACTION type", this.properties.type, this.properties);
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
        this._wCombo = this.addWidget("combo", "functions", null, this.functionChange, {
            values: []
        });
        this.addWidget("button", "CALL", null, this.onBtnExecute);
        this._subMap = [];
        this._subGFuncNode = null;
        this.properties = {
            func_subgraph_id: null
        };
    }

    onBtnExecute(value, canvas, node, pos, event, value_second) {
        console.error("SELFEXECUTE", this, ...arguments);
        node.doExecute();
    }

    functionChange(value, canvas, node, pos, event, value_second) {
        console.error("FUNCTIONCHANGE", "this", this);
        console.error("FUNCTIONCHANGE", "arguments", ...arguments);
        console.error("FUNCTIONCHANGE", "node", node);
        node.btnSetFunction(null, canvas, node, pos, event);
        node.title = "Func: " + node.title;
    }

    onConfigure() {
        this.refreshFunctions();
        this.ensureSubFunction();
    }

    // SETTING initial onExecute: will override when setting a proper function
    // eg. in a node.js env there will be no add and no chance to check if related node has already been added before this
    onExecute() {
        this.ensureSubFunction();
    }

    onAdded() {
        if (this.properties["func_subgraph_id"] !== null && this.properties["func_subgraph_id"] !== undefined) {
            this._wCombo.value = this.properties["func_subgraph_id"];
        }
        this.refreshFunctions();
    }

    refreshFunctions_byEvent(widget, canvas, node, pos, event) {
        node.refreshFunctions.bind(node);
    }
    refreshFunctions() {
        const aSubgraphs = this.graph?.findNodesByClass(Subgraph);
        console.debug("NODEFUNCTION refreshFunctions", this, aSubgraphs, this._wCombo);
        this._wCombo.options.values = {};
        this._subMap = [];
        const ths = this;
        if (aSubgraphs && aSubgraphs.length) {
            console.debug("NODEFUNCTION subgraphs", aSubgraphs);
            aSubgraphs.forEach(element => {
                // using array
                // this._wCombo.options.values.push(element.title);
                // using object
                ths._wCombo.options.values[element.id] = element.title;
                ths._subMap.push(element.id);
                if (ths.properties["func_subgraph_id"] === element.id) {
                    ths._wCombo.value = element.id;
                }
            });
        } else {
            // empty
        }
    }

    ensureSubFunction() {
        if (!this._subGFuncNode) {
            if (this.properties["func_subgraph_id"] !== null && this.properties["func_subgraph_id"] !== undefined) {
                // this.refreshFunctions();
                this.lookForFuncNodeById(this.properties["func_subgraph_id"]);
                this.refreshFunctions();
            }
        }
    }

    lookForFuncNodeById(nId) {
        const subGFuncNode = this.graph.getNodeById(nId);
        if (subGFuncNode) {
            console.error("NODEFUNCTION FOUND", "this?", this);
            this.updateSubFunction(subGFuncNode);
        } else {
            console.error("NODEFUNCTION NOT FOUND", "nodeNotFound", nId);
            this.updateSubFunction(false);
        }
    }

    btnSetFunction(widget, canvas, node, pos, event) {
        console.debug("NODEFUNCTION SET", node, node._wCombo.value);
        this.lookForFuncNodeById(node._wCombo.value);
    }

    updateSubFunction(nodeFrom) {
        // const nodeFrom = this._subGFuncNode;
        this._subGFuncNode = nodeFrom;
        // const nodeFrom = this._subGFuncNode;
        console.debug("REFRESHSLOTS", this);
        if (nodeFrom !== undefined && nodeFrom !== null && nodeFrom) {
            this.properties["func_subgraph_id"] = nodeFrom.id;
            // this.inputs = LiteGraph.cloneObject(nodeFrom.inputs) ?? [];
            nodeFrom.inputs.forEach((element, index) => {
                // element.links = [];
                if (typeof this.inputs[index] !== "undefined" && this.inputs[index].type == element.type) {
                    // keep (links?)
                } else {
                    this.inputs[index] = {
                        name: element.name,
                        type: element.type
                    };
                }
            });
            // this.outputs = LiteGraph.cloneObject(nodeFrom.outputs) ?? [];
            nodeFrom.outputs.forEach((element, index) => {
                // element.links = [];
                if (typeof this.outputs[index] !== "undefined" && this.outputs[index].type == element.type) {
                    // keep (links?)
                } else {
                    this.outputs[index] = {
                        name: element.name,
                        type: element.type
                    };
                }
            });
            this.autoSize();
        } else {
            this.properties["func_subgraph_id"] = null;
            this.inputs = [];
            this.outputs = [];
        }
        this.bindEvents();
    }

    bindEvents() {
        const nodeFrom = this._subGFuncNode;
        const thisFNode = this;
        console.debug("BINDEVENTS", this);
        if (nodeFrom !== undefined && nodeFrom !== null && nodeFrom) {
            this.onExecute = function() {
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
                    if (element.type == LiteGraph.EVENT) {
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
        } else {
            this.onExecute = function() {
                // no action
                console.debug("NODEFUNCTION has no functionset", this);
            }
        }
    }

}
// export const root = getGlobalObject();

// node modules ::
// path
// fs
// vm
// node-fetch
// ws
// http
// socket-io
// socket-io-client

export class LibraryManager {
    constructor() {
        this.libraries_known = {};
        this.libraries_loaded = {};
        this.libraries_to_load = [];
        this.libraries_state = {};
        this.loading_promises = {};
        this.fs = null;
        this.path = null;
        /**
         * Allow `server.remote` URLs to be fetched and evaluated in Node.js.
         * Off by default: `vm` is not a security boundary, so remote code runs with full process rights.
         * @type {boolean}
         */
        this.allowServerRemoteCode = false;
        /**
         * Let `npmInstall` pass any package spec npm understands (git URLs, tarball URLs, paths, tags),
         * not only plain `name@version` specs. Flags (a leading "-") are refused either way, and on
         * Windows, where npm runs through cmd.exe, so are shell metacharacters.
         * @type {boolean}
         */
        this.allowAnyPackageSpec = false;

        // Dynamically import Node.js modules (avoid errors in browsers)
        this.ready = isBrowser() ? Promise.resolve() : this.importNodeModules();

        setGlobalVariable("LibraryManager", this);
    }

    async importNodeModules() {
        // ERROR in NuNu when packing
        try {
            this.fs = await import("fs").then(m => m.default || m);
        } catch (e) {
            console.warn("Error importing 'fs':", e);
        }
        try {
            this.path = await import("path").then(m => m.default || m);
        } catch (e) {
            console.warn("Error importing 'path':", e);
        }
        try {
            this.vm = await import("vm").then(m => m.default || m);
            this.fetch = await import("node-fetch").then(m => m.default || m);
        } catch (e) {
            console.warn("Error importing Node.js modules:", e);
        }
    }

    /**
     * Register a library with flexible options (structured object or simple format).
     * If the library is already registered, merge new data with the existing one.
     * Options:
     *  - key, version, globalObject, defaultExport
     *  - browser: { local, remote, target } where target can be "client", "both"
     *  - server: { npm, remote, target } where target can be "server", "both"
     */
    registerLibrary(...args) {
        let newLib = {};
        if (typeof args[0] === "object" && !Array.isArray(args[0])) {
            const {
                key,
                version,
                globalObject,
                browser = {},
                server = {},
                defaultExport,
                description,
                optional
            } = args[0];
            newLib = {
                key,
                version,
                globalObject,
                description: description ?? "",
                optional: optional ?? true,
                localPaths: this.ensureArray(browser.local),
                remoteUrls: this.ensureArray(browser.remote),
                browserTarget: browser.target || "both",
                npmPackages: this.ensureArray(server.npm),
                serverRemoteUrls: this.ensureArray(server.remote),
                serverTarget: server.target || "both",
                defaultExport
            };
        } else {
            const [key, version, globalObject, localPaths, remoteUrls, npmPackages, serverRemoteUrls, defaultExport] = args;
            newLib = {
                key,
                version,
                globalObject,
                localPaths: this.ensureArray(localPaths),
                remoteUrls: this.ensureArray(remoteUrls),
                browserTarget: "both",
                npmPackages: this.ensureArray(npmPackages),
                serverRemoteUrls: this.ensureArray(serverRemoteUrls),
                serverTarget: "both",
                defaultExport
            };
        }

        // If already registered, merge configurations.
        if (this.libraries_known[newLib.key]) {
            const existing = this.libraries_known[newLib.key];
            // Merge arrays using a Set to ensure uniqueness.
            existing.localPaths = Array.from(new Set([...existing.localPaths, ...newLib.localPaths]));
            existing.remoteUrls = Array.from(new Set([...existing.remoteUrls, ...newLib.remoteUrls]));
            existing.npmPackages = Array.from(new Set([...existing.npmPackages, ...newLib.npmPackages]));
            existing.serverRemoteUrls = Array.from(new Set([...existing.serverRemoteUrls, ...newLib.serverRemoteUrls]));
            // Optionally update version if provided new value (here we override if different).
            if (newLib.version && existing.version !== newLib.version) {
                existing.version = newLib.version;
            }
            // Merge target flags: if they differ, default to "both"
            if (existing.browserTarget !== newLib.browserTarget) {
                existing.browserTarget = "both";
            }
            if (existing.serverTarget !== newLib.serverTarget) {
                existing.serverTarget = "both";
            }
            // Update default export if provided.
            if (newLib.defaultExport !== undefined) {
                existing.defaultExport = newLib.defaultExport;
            }
            if (newLib.description) existing.description = newLib.description;
            if (newLib.optional === false) existing.optional = false;
            // Do not change the load state if already loaded.
            this.libraries_known[newLib.key] = existing;
        } else {
            // First registration: simply add it.
            this.libraries_known[newLib.key] = newLib;
            this.libraries_state[newLib.key] = "not_loaded";
        }
    }

    /**
     * Helper function to ensure a value is always an array.
     */
    ensureArray(value) {
        return Array.isArray(value) ? value : value ? [value] : [];
    }

    camelize(str) {
        return str.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, '_$&');
    }

    async loadLibrary(key, callback) {
        if (!Object.hasOwn(this.libraries_known, key)) {
            throw new Error(`Library ${key} not registered`);
        }
        if (this.libraries_state[key] === "loaded") {
            callback?.(this.libraries_loaded[key]);
            return this.libraries_loaded[key];
        }
        if (!this.loading_promises[key]) {
            this.libraries_to_load.push(key);
            this.libraries_state[key] = "loading";
            this.loading_promises[key] = Promise.resolve().then(async () => {
                await this.ready;
                const library = this.libraries_known[key];
                const modules = isBrowser() ?
                    await this.loadBrowserLibrary(library) :
                    await this.loadServerLibrary(library);
                this.libraries_loaded[key] = modules;
                this.libraries_state[key] = "loaded";
                return modules;
            }).catch((error) => {
                this.libraries_state[key] = "error";
                throw error;
            }).finally(() => {
                delete this.loading_promises[key];
                this.libraries_to_load = this.libraries_to_load.filter((item) => item !== key);
            });
        }
        const modules = await this.loading_promises[key];
        callback?.(modules);
        return modules;
    }

    // Each list is an ordered dependency group; remote sources are a fallback group.
    async loadBrowserLibrary(library) {
        const groups = [library.localPaths, library.remoteUrls].filter((urls) => urls.length);
        if (!groups.length) {
            if (library.npmPackages.length || library.serverRemoteUrls.length) {
                throw new Error(`Library ${library.key} is not available in the browser`);
            }
            return [];
        }
        let failure;
        for (const urls of groups) {
            try {
                const loaded = [];
                for (const url of urls) loaded.push(await this.loadScript(url, library.globalObject, library.defaultExport));
                return loaded;
            } catch (error) {
                failure = error;
            }
        }
        throw new Error(`Could not load browser library ${library.key}`, {
            cause: failure
        });
    }

    selectExport(namespace, defaultExport) {
        if (!defaultExport) return namespace;
        const name = defaultExport === true ? "default" : defaultExport;
        if (!(name in namespace)) throw new Error(`Library export ${name} was not found`);
        return namespace[name];
    }

    async loadServerLibrary(library) {
        await this.ready;
        const groups = [];
        if (library.npmPackages.length) groups.push(() => this.loadPackages(library));
        if (library.serverRemoteUrls.length) groups.push(async () => {
            const modules = [];
            for (const url of library.serverRemoteUrls) modules.push(await this.loadServerRemoteScript(url));
            return modules;
        });
        if (!groups.length) {
            if (library.localPaths.length || library.remoteUrls.length) {
                throw new Error(`Library ${library.key} is not available on the server`);
            }
            return [];
        }
        let failure;
        for (const load of groups) {
            try {
                const modules = await load();
                if (library.globalObject) setGlobalVariable(library.globalObject, modules[modules.length - 1]);
                return modules;
            } catch (error) {
                failure = error;
            }
        }
        throw new Error(`Could not load server library ${library.key}`, {
            cause: failure
        });
    }

    async loadPackages(library) {
        const modules = [];
        for (const name of library.npmPackages) {
            modules.push(this.selectExport(await import(name), library.defaultExport));
        }
        return modules;
    }

    isLibraryLoaded(libKey) {
        return this.getLibraryState(libKey) === "loaded";
    }

    getLib(libKey) {
        if (!this.isLibraryLoaded(libKey)) {
            console.warn(`[NodeJsSys] Library '${libKey}' is not loaded. Attempting to load...`);
            this.loadLibrary(libKey).catch((error) => console.error(error));
            return null;
        }
        const library = this.libraries_known[libKey];
        return library ? getGlobalVariable(library.globalObject) || null : null;
    }

    /**
     * Wait for a library to be loaded.
     * @param {string} libKey - The key of the library.
     * @param {number} timeout - Maximum wait time in milliseconds.
     * @returns {Promise<any>} Resolves with the global object for the library.
     */
    waitForLib(libKey, timeout = 9000) {
        return new Promise((resolve, reject) => {
            const timer = timeout ? setTimeout(() => reject(new Error(`Library ${libKey} did not load within ${timeout}ms`)), timeout) : null;
            this.loadLibrary(libKey).then(() => {
                clearTimeout(timer);
                resolve(getGlobalVariable(this.libraries_known[libKey].globalObject));
            }, (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    /**
     * Fetch and evaluate a remote CommonJS script in Node.js.
     * The `vm` context is NOT a sandbox (code can escape it), so this is refused unless
     * `allowServerRemoteCode` was enabled explicitly for trusted sources.
     */
    async loadServerRemoteScript(url) {
        if (!this.allowServerRemoteCode) {
            throw new Error(`Refusing to evaluate remote server code from ${url}; set LiteGraph.LibraryManager.allowServerRemoteCode = true for trusted sources (the code runs with full process rights)`);
        }
        if (!this.fetch || !this.vm) throw new Error("Node.js modules 'fetch' and 'vm' are required.");

        console.log(`Fetching remote script: ${url}`);
        const response = await this.fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);

        const scriptText = await response.text();
        const script = new this.vm.Script(scriptText);
        const exports = {};
        const sandbox = {
            window: {},
            module: {
                exports
            },
            exports
        };
        script.runInNewContext(sandbox);

        console.log("✅ Loaded from remote:", url);
        return sandbox.module.exports || sandbox.exports;
    }

    async loadScript(url, globalObject = "library_last", defaultExport) {
        if (await this.isESModule(url)) {
            const namespace = await import(new URL(url, document.baseURI).href);
            const value = this.selectExport(namespace, defaultExport);
            if (globalObject) setGlobalVariable(globalObject, value);
            return value;
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = url;
            script.onload = () => resolve(globalObject ? getGlobalVariable(globalObject) : script);
            script.onerror = () => {
                script.remove();
                reject(new Error(`Failed to load script: ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    // **Check if a script is an ES Module**
    async isESModule(url) {
        try {
            let response = await fetch(url);
            let text = await response.text();
            return /export\s|import\s/.test(text); // Detect ES Module keywords
        } catch (e) {
            return false; // Default to CommonJS if fetch fails
        }
    }

    // Load CSS
    loadCSS(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    // **Unload a library**
    unloadLibrary(key) {
        if (!this.libraries_known[key]) {
            console.error(`Library ${key} not registered.`);
            return;
        }

        if (this.libraries_state[key] !== "loaded") {
            console.warn(`Library ${key} is not loaded.`);
            return;
        }

        const library = this.libraries_known[key];
        if (isBrowser())[...library.localPaths, ...library.remoteUrls].forEach(file => {
            if (file.endsWith(".js")) {
                document.querySelectorAll(`script[src="${file}"]`).forEach(el => el.remove());
            } else if (file.endsWith(".css")) {
                document.querySelectorAll(`link[href="${file}"]`).forEach(el => el.remove());
            }
        });

        this.libraries_state[key] = "not_loaded";
        delete this.libraries_loaded[key];
        console.log(`Library ${key} unloaded.`);
    }

    // **Get the state of a library**
    getLibraryState(key) {
        return this.libraries_state[key] || false;
    }

    /**
     * Check if all libraries to load are loaded.
     * @returns {boolean} True if every library's state is "loaded", false otherwise.
     */
    areAllLibrariesLoaded() {
        return !Object.values(this.libraries_state).some((state) => state === "loading" || state === "error");
    }

    /**
     * True for an npm package spec this manager will pass to npm: a (scoped) package name,
     * optionally followed by `@version-or-range`. Paths, URLs, git specs and flags are refused.
     * @param {string} spec
     * @returns {boolean}
     */
    static isSafePackageSpec(spec) {
        return typeof spec === "string" &&
            /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[a-zA-Z0-9.^~*_-]+)?$/.test(spec) &&
            spec.length <= 214;
    }

    /**
     * True for a package spec that can be passed to npm as one argument when
     * `allowAnyPackageSpec` is set: not a flag, no control characters, and, when npm runs through
     * cmd.exe (Windows), no shell metacharacters.
     * @param {string} spec
     * @param {boolean} [throughShell]
     * @returns {boolean}
     */
    static isPassableArgument(spec, throughShell = false) {
        if (typeof spec !== "string" || !spec || spec.length > 2048 || spec.startsWith("-")) return false;
        // whitespace and control characters (code points below 0x20, and 0x7f)
        if (/\s/.test(spec) || [...spec].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f)) return false;
        return !throughShell || !/[&|<>^%"!()]/.test(spec);
    }

    /**
     * Attempt to install NPM packages required for a library.
     * This method is only supported in Node.js or Bun environments.
     * Runs without a shell: the command and every package spec are separate arguments, and
     * package specs must pass {@link LibraryManager.isSafePackageSpec} (or, with
     * `allowAnyPackageSpec`, {@link LibraryManager.isPassableArgument}).
     * @param {string} libKey The key of the library.
     * @param {string|string[]} [command] Program and leading arguments, e.g. "npm install" or ["pnpm", "add"].
     * @returns {Promise<string>} The stdout from the npm install command.
     */
    async npmInstall(libKey, command = "npm install") {
        if (!isNode() && !isBun()) {
            console.warn('npmInstall is only supported in Node.js or Bun environments.');
            return;
        }
        if (!this.libraries_known[libKey]) {
            console.error(`Library ${libKey} not registered.`);
            return;
        }
        const library = this.libraries_known[libKey];
        if (!library.npmPackages || library.npmPackages.length === 0) {
            console.warn(`Library ${libKey} has no npm packages to install.`);
            return;
        }
        let child_process;
        try {
            child_process = await import("child_process").then(m => m.default || m);
        } catch (e) {
            console.error("Failed to import child_process:", e);
            return;
        }
        const packages = library.npmPackages.filter((name) => !name.startsWith("node:"));
        const useShell = typeof process !== "undefined" && process.platform === "win32";
        const unsafe = packages.filter((name) => this.allowAnyPackageSpec ?
            !LibraryManager.isPassableArgument(name, useShell) :
            !LibraryManager.isSafePackageSpec(name));
        if (unsafe.length) {
            const hint = this.allowAnyPackageSpec ?
                "flags and shell metacharacters are always refused" :
                "only plain name@version specs are accepted; set LiteGraph.LibraryManager.allowAnyPackageSpec = true to allow git/URL/path specs from trusted sources";
            throw new Error(`Refusing to install unsafe package spec(s) for ${libKey}: ${unsafe.join(", ")} (${hint})`);
        }
        const argv = (Array.isArray(command) ? command : String(command).trim().split(/\s+/)).filter(Boolean);
        if (!argv.length) throw new Error("npmInstall needs a command, e.g. \"npm install\"");
        const [program, ...programArgs] = argv;
        // npm is a .cmd script on Windows, which execFile can only start through a shell; the
        // arguments were validated above, so no shell metacharacters can reach it.
        return new Promise((resolve, reject) => {
            child_process.execFile(program, [...programArgs, ...packages], {
                shell: useShell
            }, (error, stdout) => {
                if (error) {
                    console.error(`Error installing npm packages for ${libKey}:`, error);
                    reject(error);
                    return;
                }
                console.log(`npm install output for ${libKey}:`, stdout);
                resolve(stdout);
            });
        });
    }

    /**
     * Wait until no library is loading any more.
     * Rejects when a library ended in the "error" state, or when the timeout elapses first.
     * @param {{timeout?: number}} [options] timeout in milliseconds; 0 waits without a limit.
     * @returns {Promise<void>}
     */
    async waitAllLibrariesLoaded({
        timeout = 30000
    } = {}) {
        const settle = (async () => {
            while (Object.keys(this.loading_promises).length) {
                await Promise.allSettled(Object.values(this.loading_promises));
            }
            const failed = Object.keys(this.libraries_state).filter((key) => this.libraries_state[key] === "error");
            if (failed.length) throw new Error(`Libraries failed to load: ${failed.join(", ")}`);
        })();
        if (!timeout) return settle;
        let timer;
        const expired = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Libraries still loading after ${timeout}ms: ${this.libraries_to_load.join(", ")}`)), timeout);
        });
        try {
            await Promise.race([settle, expired]);
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Load all registered libraries concurrently.
     * @returns {Promise<void>} Resolves when all libraries have attempted to load.
     */
    async loadAllLibraries() {
        const keys = Object.keys(this.libraries_known);
        await Promise.all(keys.map(key => this.loadLibrary(key)));
    }

    /**
     * Unload all loaded libraries.
     */
    unloadAllLibraries() {
        Object.keys(this.libraries_known).forEach(key => {
            if (this.libraries_state[key] === "loaded") {
                this.unloadLibrary(key);
            }
        });
    }

    /**
     * The library manifest: every registered library with its sources and current state,
     * as plain data (for editors, runners and diagnostics).
     * @returns {Array<{key: string, version: string, globalObject: string, description: string, optional: boolean,
     *   browser: {local: string[], remote: string[]}, server: {npm: string[], remote: string[]}, state: string}>}
     */
    describeLibraries() {
        return Object.values(this.libraries_known).map((library) => ({
            key: library.key,
            version: library.version ?? "",
            globalObject: library.globalObject ?? "",
            description: library.description ?? "",
            optional: library.optional !== false,
            browser: {
                local: [...library.localPaths],
                remote: [...library.remoteUrls]
            },
            server: {
                npm: [...library.npmPackages],
                remote: [...library.serverRemoteUrls]
            },
            state: this.getLibraryState(library.key) || "not_loaded",
        }));
    }

    /**
     * Checks, in Node.js, whether the npm packages of registered libraries can be imported, without
     * changing their load state or globals. In a browser nothing is fetched: every entry reports
     * "unknown" unless it is already loaded.
     * @param {string[]} [keys] - libraries to check (default: all)
     * @returns {Promise<Array<{key: string, available: boolean|null, missing: string[], error?: string}>>}
     */
    async probeLibraries(keys = Object.keys(this.libraries_known)) {
        await this.ready;
        const results = [];
        for (const key of keys) {
            const library = this.libraries_known[key];
            if (!library) {
                results.push({
                    key,
                    available: false,
                    missing: [],
                    error: "not registered"
                });
                continue;
            }
            if (this.getLibraryState(key) === "loaded") {
                results.push({
                    key,
                    available: true,
                    missing: []
                });
                continue;
            }
            if (isBrowser() || !library.npmPackages.length) {
                results.push({
                    key,
                    available: null,
                    missing: []
                });
                continue;
            }
            const missing = [];
            let error;
            for (const name of library.npmPackages) {
                try {
                    await import(name);
                } catch (e) {
                    missing.push(name);
                    error ??= e?.message ?? String(e);
                }
            }
            results.push({
                key,
                available: missing.length === 0,
                missing,
                ...(error ? {
                    error
                } : {})
            });
        }
        return results;
    }

    /**
     * Get a list of all registered library keys.
     * @returns {string[]} An array of registered library keys.
     */
    getRegisteredLibraries() {
        return Object.keys(this.libraries_known);
    }
}

export default LibraryManager;

/**
 * Canvas widgets as classes, one per type, replacing the two `switch (w.type)` blocks that used
 * to live in LGraphCanvas.drawNodeWidgets / processNodeWidgets. The structure follows the MIT
 * Comfy-Org/litegraph.js standalone (BaseWidget + one class per type + a legacy fallback); the
 * drawing and pointer behaviour is this fork's own, moved here unchanged.
 *
 * Compatibility:
 * - `node.addWidget(type, ...)` returns an instance of the registered class (same own fields as before).
 * - Plain-object widgets (pushed directly, or created by older code) still work: the canvas calls
 *   the class methods for their `type` with the object as `this` (see {@link widgetImplementation}).
 * - Unknown types keep the legacy custom hooks `w.draw(ctx, node, width, y, H)` and
 *   `w.mouse(event, [x, y], node)`.
 *
 * Custom types: `LiteGraph.registerWidgetType("mytype", class extends BaseWidget { draw(...) {...}
 * onPointer(...) {...} })`.
 */
export class BaseWidget {

    /** @param {object} [init] - widget fields (type, name, value, callback, options, ...) */
    constructor(init = {}) {
        Object.assign(this, init);
        this.options ??= {};
    }

    /**
     * Draws the widget.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} node
     * @param {number} widget_width
     * @param {number} y
     * @param {number} H - row height
     * @param {object} env - {canvas, show_text, show_label, active, margin, colors: {outline, background, text, secondary}}
     */
    // eslint-disable-next-line no-unused-vars
    draw(ctx, node, widget_width, y, H, env) {}

    /**
     * Handles a pointer event inside the widget.
     * @param {PointerEvent} event
     * @param {object} env - {canvas, node, x, y, pos, widget_width, old_value, changed(widget, value, old_value), ref_window}
     */
    // eslint-disable-next-line no-unused-vars
    onPointer(event, env) {}

    /** Background shape shared by most widgets: a pill when text is shown, a plain box otherwise. */
    static drawPill(ctx, widget_width, y, H, env) {
        const margin = env.margin;
        ctx.textAlign = "left";
        ctx.strokeStyle = env.colors.outline;
        ctx.fillStyle = env.colors.background;
        ctx.beginPath();
        if (env.show_text) ctx.roundRect(margin, y, widget_width - margin * 2, H, [H * 0.5]);
        else ctx.rect(margin, y, widget_width - margin * 2, H);
        ctx.fill();
    }

    /** Clamps a number to the widget's min/max options. */
    static clampToOptions(value, options) {
        if (options.min != null && value < options.min) value = options.min;
        if (options.max != null && value > options.max) value = options.max;
        return value;
    }
}

export class ButtonWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        if (this.clicked) {
            ctx.fillStyle = "#AAA";
            this.clicked = false;
            env.canvas.dirty_canvas = true;
        }
        ctx.fillRect(margin, y, widget_width - margin * 2, H);
        if (env.show_text && !this.disabled) ctx.strokeRect(margin, y, widget_width - margin * 2, H);
        if (env.show_text) {
            ctx.textAlign = "center";
            ctx.fillStyle = env.colors.text;
            if (env.show_label) ctx.fillText(this.label || this.name, widget_width * 0.5, y + H * 0.7);
        }
    }

    onPointer(event, env) {
        if (event.type !== "pointerdown") return;
        if (this.callback) {
            setTimeout(() => this.callback(this, env.canvas, env.node, env.pos, event), 20);
        }
        this.clicked = true;
        env.canvas.dirty_canvas = true;
    }
}

export class ToggleWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        BaseWidget.drawPill(ctx, widget_width, y, H, env);
        if (env.show_text && !this.disabled) ctx.stroke();
        ctx.fillStyle = this.value ? "#89A" : "#333";
        ctx.beginPath();
        ctx.arc(widget_width - margin * 2, y + H * 0.5, H * 0.36, 0, Math.PI * 2);
        ctx.fill();
        if (env.show_text) {
            ctx.fillStyle = env.colors.secondary;
            const label = this.label || this.name;
            if (label != null && env.show_label) ctx.fillText(label, margin * 2, y + H * 0.7);
            ctx.fillStyle = this.value ? env.colors.text : env.colors.secondary;
            ctx.textAlign = "right";
            ctx.fillText(this.value ? this.options.on || "on" : this.options.off || "off", widget_width - 40, y + H * 0.7);
        }
    }

    onPointer(event, env) {
        if (event.type !== "pointerdown") return;
        const old_value = env.old_value;
        this.value = !this.value;
        setTimeout(() => env.changed(this, this.value, old_value), 20);
    }
}

export class SliderWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        const options = this.options;
        ctx.fillStyle = env.colors.background;
        ctx.fillRect(margin, y, widget_width - margin * 2, H);
        const range = options.max - options.min;
        const nvalue = LiteGraph.clamp((this.value - options.min) / range, 0, 1);
        ctx.fillStyle = Object.hasOwn(options, "slider_color") ? options.slider_color : (env.active ? "#89A" : "#678");
        ctx.fillRect(margin, y, nvalue * (widget_width - margin * 2), H);
        if (env.show_text && !this.disabled) ctx.strokeRect(margin, y, widget_width - margin * 2, H);
        if (this.marker) {
            const marker_nvalue = LiteGraph.clamp((this.marker - options.min) / range, 0, 1);
            ctx.fillStyle = Object.hasOwn(options, "marker_color") ? options.marker_color : "#AA9";
            ctx.fillRect(margin + marker_nvalue * (widget_width - margin * 2), y, 2, H);
        }
        if (env.show_text) {
            ctx.textAlign = "center";
            ctx.fillStyle = env.colors.text;
            if (env.show_label) {
                ctx.fillText(
                    this.label || this.name + "  " + LiteGraph.formatNumber(this.value, options.precision != null ? options.precision : 3),
                    widget_width * 0.5,
                    y + H * 0.7,
                );
            }
        }
    }

    onPointer(event, env) {
        const options = this.options;
        if (options.read_only) return;
        const nvalue = LiteGraph.clamp((env.x - 15) / (env.widget_width - 30), 0, 1);
        this.value = options.min + (options.max - options.min) * nvalue;
        if (options.step > 0) {
            // snap to min + k * step, staying inside the range
            this.value = options.min + Math.round((this.value - options.min) / options.step) * options.step;
            this.value = LiteGraph.clamp(this.value, options.min, options.max);
        }
        const old_value = env.old_value;
        if (old_value != this.value) setTimeout(() => env.changed(this, this.value, old_value), 20);
        env.canvas.dirty_canvas = true;
    }
}

/** Shared drawing of number and combo widgets: arrows, label and right-aligned value. */
function drawArrowsAndLabel(widget, ctx, widget_width, y, H, env, valueText) {
    const margin = env.margin;
    BaseWidget.drawPill(ctx, widget_width, y, H, env);
    if (!env.show_text) return;
    if (!widget.disabled) ctx.stroke();
    ctx.fillStyle = env.colors.text;
    if (!widget.disabled) {
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
    ctx.fillStyle = env.colors.secondary;
    if (env.show_label) ctx.fillText(widget.label || widget.name, margin * 2 + 5, y + H * 0.7);
    ctx.fillStyle = env.colors.text;
    ctx.textAlign = "right";
    ctx.fillText(valueText, widget_width - margin * 2 - 20, y + H * 0.7);
}

export class NumberWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        drawArrowsAndLabel(this, ctx, widget_width, y, H, env,
            LiteGraph.formatNumber(this.value, this.options.precision !== undefined ? this.options.precision : 3));
    }

    onPointer(event, env) {
        const options = this.options;
        const old_value = env.old_value;
        if (event.type == "pointermove") {
            const deltaX = event.deltaX || event.deltax || 0;
            if (deltaX) this.value += deltaX * 0.1 * (options.step || 1);
            this.value = BaseWidget.clampToOptions(this.value, options);
        } else if (event.type == "pointerdown") {
            const delta = env.x < 40 ? -1 : env.x > env.widget_width - 40 ? 1 : 0;
            this.value = BaseWidget.clampToOptions(this.value + delta * (options.step || 1), options);
        } else if (event.type == "pointerup") {
            const delta = env.x < 40 ? -1 : env.x > env.widget_width - 40 ? 1 : 0;
            if (event.click_time < 200 && delta == 0) {
                env.canvas.prompt("Value", this.value, (typed) => {
                    // arithmetic is allowed ("2*8+1"); anything else is read as a number
                    const computed = evaluateMathExpression(typed);
                    const value = Number.isFinite(computed) ? computed : Number(typed);
                    // typed values respect the widget range like drag and arrows do (Comfy c5db2d8)
                    this.value = LGraphCanvas.clampWidgetNumber(value, options);
                    env.changed(this, this.value, old_value);
                }, event);
            }
        }
        if (old_value != this.value) setTimeout(() => env.changed(this, this.value, old_value), 20);
        env.canvas.dirty_canvas = true;
    }
}

export class ComboWidget extends BaseWidget {
    /** the option list as given (array, object map, or the result of a values function) */
    resolveValues(node) {
        let values = this.options.values;
        if (values && values.constructor === Function) values = this.options.values(this, node);
        return values;
    }

    draw(ctx, node, widget_width, y, H, env) {
        let shown = this.value;
        if (this.options.values) {
            let values = this.options.values;
            if (values.constructor === Function) values = values();
            if (values && values.constructor !== Array) shown = values[this.value];
        }
        drawArrowsAndLabel(this, ctx, widget_width, y, H, env, shown);
    }

    onPointer(event, env) {
        const old_value = env.old_value;
        if (event.type == "pointerdown") {
            const values = this.resolveValues(env.node);
            const values_list = values.constructor === Array ? values : Object.keys(values);
            const delta = env.x < 40 ? -1 : env.x > env.widget_width - 40 ? 1 : 0;
            if (delta) { // clicked on an arrow
                env.canvas.last_mouseclick = 0; // avoids a double click event
                let index = values.constructor === Object ?
                    values_list.indexOf(String(this.value)) + delta :
                    values_list.indexOf(this.value) + delta;
                index = LiteGraph.clamp(index, 0, values_list.length - 1);
                if (values.constructor === Array) this.value = values[index];
                else if (values != values_list) this.value = Object.keys(values)[index];
                else this.value = index;
            } else { // clicked on the value: pick from a menu
                const entries = values != values_list ?
                    Object.keys(values).map((key) => ({
                        value: key,
                        content: values[key]
                    })) :
                    values;
                const widget = this;
                LiteGraph.ContextMenu(entries, {
                    scale: Math.max(1, env.canvas.ds.scale),
                    event,
                    className: "dark",
                    callback(v) {
                        const picked = (typeof v == "object" && typeof v.value !== "undefined") ? v.value : v;
                        widget.value = picked;
                        env.changed(widget, picked, old_value);
                        env.canvas.dirty_canvas = true;
                        return false;
                    },
                }, env.ref_window);
            }
        }
        if (old_value != this.value) setTimeout(() => env.changed(this, this.value, old_value), 20);
        env.canvas.dirty_canvas = true;
    }
}

export class TextWidget extends BaseWidget {
    draw(ctx, node, widget_width, y, H, env) {
        const margin = env.margin;
        BaseWidget.drawPill(ctx, widget_width, y, H, env);
        if (!env.show_text) return;
        if (!this.disabled) ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.rect(margin, y, widget_width - margin * 2, H);
        ctx.clip();
        ctx.fillStyle = env.colors.secondary;
        const label = this.label || this.name;
        let label_width = 0;
        if (label != null && env.show_label) {
            ctx.fillText(label, margin * 2, y + H * 0.7);
            label_width = ctx.measureText(String(label)).width + margin * 2;
        }
        ctx.fillStyle = env.colors.text;
        ctx.textAlign = "right";
        // show as much of the value as fits beside the label
        const value_width = widget_width - margin * 4 - label_width;
        ctx.fillText(LGraphCanvas.fitText(ctx, String(this.value), value_width), widget_width - margin * 2, y + H * 0.7);
        ctx.restore();
    }

    onPointer(event, env) {
        if (event.type != "pointerdown") return;
        const old_value = this.value;
        env.canvas.prompt("Value", this.value, (typed) => env.changed(this, typed, old_value), event, this.options ? this.options.multiline : false);
    }
}

/** The built-in widget types (several type names share a class). */
export function defaultWidgetTypes() {
    return {
        button: ButtonWidget,
        toggle: ToggleWidget,
        boolean: ToggleWidget,
        slider: SliderWidget,
        number: NumberWidget,
        combo: ComboWidget,
        enum: ComboWidget,
        text: TextWidget,
        string: TextWidget,
    };
}

/**
 * The behaviour to use for a widget: its own class methods when it is a BaseWidget, otherwise the
 * registered class for its type (applied to the plain object), otherwise null (legacy draw/mouse).
 * @returns {BaseWidget|null} an object whose draw/onPointer should be called with the widget as `this`
 */
export function widgetImplementation(widget, types = LiteGraph.widget_types) {
    if (!widget) return null;
    if (widget instanceof BaseWidget) return widget;
    const cls = types?.[widget.type];
    return cls ? cls.prototype : null;
}

/**
 * Evaluates arithmetic typed into a number field: numbers, + - * / % **, parentheses, unary signs,
 * and the constants pi and e. Anything else returns NaN (nothing is executed).
 * @param {string} text
 * @returns {number}
 */
export function evaluateMathExpression(text) {
    const source = String(text ?? "").trim();
    if (!source) return NaN;
    const tokens = source.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|\*\*|[-+*/%()]|pi|e|\s+|./gi)
        ?.filter((token) => !/^\s+$/.test(token)) ?? [];
    let index = 0;
    const peek = () => tokens[index];
    const take = () => tokens[index++];
    const fail = () => {
        throw new SyntaxError("not an arithmetic expression");
    };
    const primary = () => {
        const token = take();
        if (token === undefined) fail();
        if (token === "(") {
            const value = sum();
            if (take() !== ")") fail();
            return value;
        }
        if (/^pi$/i.test(token)) return Math.PI;
        if (/^e$/i.test(token)) return Math.E;
        if (/^(\d|\.\d)/.test(token)) return Number(token);
        return fail();
    };
    const unary = () => {
        if (peek() === "-") {
            take();
            return -unary();
        }
        if (peek() === "+") {
            take();
            return unary();
        }
        return power();
    };
    const power = () => {
        const base = primary();
        if (peek() === "**") {
            take();
            return base ** unary();
        }
        return base;
    };
    const product = () => {
        let value = unary();
        while (["*", "/", "%"].includes(peek())) {
            const op = take();
            const right = unary();
            value = op === "*" ? value * right : op === "/" ? value / right : value % right;
        }
        return value;
    };
    const sum = () => {
        let value = product();
        while (peek() === "+" || peek() === "-") {
            const op = take();
            const right = product();
            value = op === "+" ? value + right : value - right;
        }
        return value;
    };
    try {
        const value = sum();
        return index === tokens.length ? value : NaN;
    } catch {
        return NaN;
    }
}

/**
 * Node search without a DOM: query parsing, matching and ranking over node definitions
 * (LiteGraph.getNodeDefinition), plus a registry of definition filters.
 *
 * Query syntax: plain words must all match (type, title, aliases or description); filters narrow
 * the result: `i:number` (has an input of that type), `o:string` (has an output of that type),
 * `c:math` (category, or a sub-category), `s:core` (source). Words and filters combine freely:
 * `add i:number c:math`.
 *
 * Ranking per word, best match wins: exact type or title, title prefix, whole word, word prefix,
 * alias, substring of type/title, description. Slot filters use the declared `def` slots, else the
 * slot-type registry (filled as nodes are created). Results are sorted by score, then title.
 */
export class NodeSearch {

    static FILTER_PREFIXES = ["i", "o", "c", "s"];

    constructor() {
        /** @type {Map<string, {id: string, name: string, predicate: (def: object) => boolean, enabled: () => boolean}>} */
        this._filters = new Map();
    }

    /**
     * Registers a definition filter. `predicate(def)` returns true to keep a definition;
     * `enabled()` (default: always) decides whether the filter applies right now.
     * @returns {() => void} disposer
     */
    registerFilter({
        id,
        name = id,
        predicate,
        enabled = () => true
    }) {
        if (typeof id !== "string" || !id) throw new TypeError("filter id must be a non-empty string");
        if (typeof predicate !== "function") throw new TypeError(`filter ${id}: predicate must be a function`);
        const entry = {
            id,
            name,
            predicate,
            enabled
        };
        this._filters.set(id, entry);
        return () => {
            if (this._filters.get(id) === entry) this._filters.delete(id);
        };
    }

    /** @returns {Array<{id: string, name: string}>} */
    listFilters() {
        return [...this._filters.values()].map(({
            id,
            name
        }) => ({
            id,
            name
        }));
    }

    /** true when no enabled definition filter rejects the definition */
    passesFilters(def) {
        for (const filter of this._filters.values()) {
            let active = true;
            try {
                active = filter.enabled();
            } catch {
                active = true;
            }
            if (active && !filter.predicate(def)) return false;
        }
        return true;
    }

    /**
     * @param {string} text
     * @returns {{terms: string[], filters: {i: string[], o: string[], c: string[], s: string[]}}}
     */
    static parseQuery(text) {
        const query = {
            terms: [],
            filters: {
                i: [],
                o: [],
                c: [],
                s: []
            }
        };
        for (const token of String(text ?? "").trim().split(/\s+/)) {
            if (!token) continue;
            const match = /^([ioIOcCsS]):(.+)$/.exec(token);
            if (match) query.filters[match[1].toLowerCase()].push(match[2].toLowerCase());
            else query.terms.push(token.toLowerCase());
        }
        return query;
    }

    /** slot types of a registered type, from its definition or the slot-type registry */
    static _slotTypes(def, input) {
        const declared = input ? def.inputs : def.outputs;
        if (declared) return declared.map((slot) => String(slot.type ?? "").toLowerCase());
        const registry = input ? LiteGraph.registered_slot_in_types : LiteGraph.registered_slot_out_types;
        const types = [];
        for (const [slotType, entry] of Object.entries(registry ?? {})) {
            if (entry?.nodes?.includes?.(def.type)) types.push(String(slotType).toLowerCase());
        }
        return types;
    }

    /** true when a definition passes the query's i:/o:/c:/s: filters */
    static matchesFilters(def, filters) {
        const typeMatch = (types, wanted) => types.some((type) => type === wanted || type.split(",").includes(wanted));
        for (const wanted of filters.i)
            if (!typeMatch(NodeSearch._slotTypes(def, true), wanted)) return false;
        for (const wanted of filters.o)
            if (!typeMatch(NodeSearch._slotTypes(def, false), wanted)) return false;
        const category = String(def.category ?? "").toLowerCase();
        for (const wanted of filters.c)
            if (category !== wanted && !category.startsWith(wanted + "/")) return false;
        const source = String(def.source ?? "").toLowerCase();
        for (const wanted of filters.s)
            if (!source.includes(wanted)) return false;
        return true;
    }

    /**
     * Score of a definition for the query's words: -1 when a word does not match at all.
     * @param {object} def - from LiteGraph.getNodeDefinition
     * @param {{terms: string[]}} query
     */
    static score(def, query) {
        const type = def.type.toLowerCase();
        const title = String(def.title ?? "").toLowerCase();
        const aliases = (def.search_aliases ?? []).map((alias) => String(alias).toLowerCase());
        const description = String(def.description ?? "").toLowerCase();
        const words = `${title} ${type.replace(/[/:_-]/g, " ")}`.split(/\s+/).filter(Boolean);
        let total = 0;
        for (const term of query.terms) {
            let best = -1;
            if (type === term || title === term || type.endsWith("/" + term)) best = 100;
            else if (title.startsWith(term)) best = 60;
            else if (words.includes(term)) best = 50;
            else if (words.some((word) => word.startsWith(term))) best = 40;
            else if (aliases.some((alias) => alias === term || alias.startsWith(term))) best = 35;
            else if (title.includes(term) || type.includes(term)) best = 20;
            else if (aliases.some((alias) => alias.includes(term))) best = 15;
            else if (description.includes(term)) best = 8;
            if (best < 0) return -1;
            total += best;
        }
        return total;
    }

    /**
     * Searches registered node types.
     * @param {string|object} text - query text, or a parsed query
     * @param {{types?: string[], limit?: number, applyFilters?: boolean}} [options]
     * @returns {Array<{type: string, score: number, def: object}>}
     */
    search(text, {
        types = Object.keys(LiteGraph.registered_node_types),
        limit = -1,
        applyFilters = true
    } = {}) {
        const query = typeof text === "string" ? NodeSearch.parseQuery(text) : text;
        const results = [];
        for (const type of types) {
            const def = LiteGraph.getNodeDefinition(type);
            if (!def) continue;
            if (applyFilters && !this.passesFilters(def)) continue;
            if (!NodeSearch.matchesFilters(def, query.filters)) continue;
            const score = query.terms.length ? NodeSearch.score(def, query) : 0;
            if (score < 0) continue;
            results.push({
                type,
                score,
                def
            });
        }
        results.sort((a, b) => b.score - a.score || String(a.def.title).localeCompare(String(b.def.title)) || a.type.localeCompare(b.type));
        return limit >= 0 ? results.slice(0, limit) : results;
    }
}

// this needs to be called after all classes has been included, before registering nodes and creating canvas
// will setup callback handlers and LiteGraph.CLASSES references ( eg. LitegGraph.LGraph, .. )
LiteGraph.initialize();