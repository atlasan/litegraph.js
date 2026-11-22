import { LLink } from "./llink.js";
import { LGraph } from "./lgraph.js";
import { LGraphNode } from "./lgraphnode.js";
import { LGraphGroup } from "./lgraphgroup.js";
import { LGraphCanvas } from "./lgraphcanvas.js";
import { Subgraph, GraphInput, GraphOutput, NodeFunction } from "./subgraph.js";
import { SubgraphDefs } from "./subgraphdefs.js";
import { DragAndScale } from "./dragandscale.js";
import { ContextMenu } from "./contextmenu.js";
import { CallbackHandler } from "./callbackhandler.js";
import { getGlobalObject, setGlobalVariable, getGlobalVariable, isBrowser, isNode, isBun, getRuntime } from './global.js';
import { LibraryManager } from "./librarymanager.js";
import { CommandRegistry } from "./commands.js";
import { KeybindingRegistry } from "./keybindings.js";
import { SettingsRegistry } from "./settings.js";
import { ExtensionRegistry } from "./extensionregistry.js";
import { MenuRegistry } from "./menus.js";
import { BaseWidget, defaultWidgetTypes } from "./widgets.js";
import { NodeSearch } from "./nodesearch.js";
import { PackRegistry } from "./packs.js";
import { ExecutionState } from "./executionstate.js";
import { ExecutionEngine } from "./execution.js";
import { LinkRouterRegistry, LinkStyleRegistry, RenderLink } from "./linkrender.js";
import { LayoutRegistry } from "./layout.js";
import { NodePalette } from "./palette.js";

/**
 * @class LiteGraph
 *
 * @NOTE:
 * Try to avoid adding things to this class.
 * https://dzone.com/articles/singleton-anti-pattern
 */

/**
 * Node badges: small labels drawn in node title bars. Providers return a badge (or an array, or
 * null) for a node: `{text, fgColor?, bgColor?}`. Nodes may also list their own in `node.badges`.
 */
function createNodeBadgeRegistry() {
    const providers = new Set();
    return {
        /** @returns {() => void} disposer */
        register(provider) {
            if (typeof provider !== "function") throw new TypeError("badge provider must be a function");
            providers.add(provider);
            return () => providers.delete(provider);
        },
        /** badges for a node: its own (`node.badges`, entries may be functions of the node), then the providers' */
        collect(node) {
            const badges = [];
            const add = (value) => {
                for (const badge of Array.isArray(value) ? value : [value]) {
                    if (badge && typeof badge === "object" && badge.text !== undefined && badge.text !== "") badges.push(badge);
                }
            };
            for (const entry of node?.badges ?? []) {
                try { add(typeof entry === "function" ? entry(node) : entry); } catch (error) { console.error?.("node badge failed", error); }
            }
            for (const provider of providers) {
                try { add(provider(node)); } catch (error) { console.error?.("node badge provider failed", error); }
            }
            return badges;
        },
    };
}

export class LiteGraphClass {

    VERSION = "0.18.0-dev.1";
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
    NODE_MODES_COLORS = ["#666","#422","#333","#224","#626"]; // use with node_box_coloured_by_mode
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

    showCanvasOptions = false; // the canvas menu offers "Options": graph info (execution model) and canvas switches
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
    // use_deferred_actions and the other legacy execution flags are accessors (LEGACY_EXECUTION_FLAGS below)
    _legacy_flag_values = Object.fromEntries(Object.entries(LEGACY_EXECUTION_FLAGS).map(([name, flag]) => [name, flag.value]));
    _legacy_flags_assigned = new Set(); // flags a project assigned: the default execution model resolves to "legacy"
    _default_execution_model = "ancestors";
    _default_execution_model_set = false;
    _dispatch_depth = 0; // runtime: nesting of runStep and event entry points (node-error reporting)
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

    keep_floating_reroutes = true; // removing a routed link keeps its reroutes, attached to the end that remains (ComfyUI floating links)
    subgraph_format = "definitions"; // root serialize: "definitions" (ComfyUI form, instances reference definitions.subgraphs) or "inline" (instances keep their inner graph, for older readers)
    subgraph_max_depth = 32; // nesting limit for subgraph definitions (load) and calls
    subgraph_components = new Map(); // registerSubgraphType: type -> {type, id, revision, definitions}
    snap_link_to_slot = true; // dragging a link over a node body highlights (and a drop connects to) the slot it would use
    release_link_on_empty_shows_menu = false; // [true!] dragging a link to empty space will open a menu, add from list, search or defaults
    two_fingers_opens_menu = false; // [true!] using pointer event isPrimary, when is not simulate right click

    backspace_delete = true; // [false!] delete key is enough, don't mess with text edit and custom

    ctrl_shift_v_paste_connect_unselected_outputs = false; // [true!] allows ctrl + shift + v to paste nodes with the outputs of the unselected nodes connected with the inputs of the newly pasted nodes

    actionHistory_enabled = false; // cntrlZ, cntrlY
    actionHistoryMaxSave = 300;


    // if true, all newly created nodes/links will use string UUIDs for their id fields instead of integers.
    // use this if you must have node IDs that are unique across all graphs and subgraphs.
    use_uuids = false;

    // enable filtering elements of the context menu with keypress (+ arrows for navigation, escape to close)
    context_menu_filter_enabled = false; // FIX event handler removal

    // ,"editor_alpha" //= 1; //used for transition

    canSetSlotsLabels = true; // setting the label should be safe

    canRemoveSlots = false; // use removable = true in specific slot
    canRenameSlots = false; // use nameLocked = false in specific slot



    reprocess_slot_while_node_configure = false; // reprocess inputs and output node slots comparing by name, will fix index changes, works on dynamics

    properties_allow_input_binding = false; // [true!] allow create and bind inputs, will update binded property value on node execute 
    properties_allow_output_binding = false; // [true!] allow create and bind outputs, will update output slots when node executed 
    properties_input_binding_check_ancestors = false; // [true!] when executing a node it will update binding, there when getting data will ensure data is updated

    allow_action_widget_button = true; // [true!] allow linking an action to a button widget to call it

    log_methods = ['error', 'warn', 'info', 'log', 'debug'];

    cb_handler = false;
    debug = true; // enable/disable logging :: in this.debug_level is stored the actual numeric value
    debug_level = 2; // set via this.logging_set_level

    constructor(){
        // if exporting stripping include for a bundle will trow error because not yet instantiated other classes
        // this.initialize();
    }

    /**
     * initialize LiteGraph, call when other classes are instantiated
     */
    initialize(){
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
        this.ContextMenu = function(){ return new ContextMenu(...arguments); };
        this.CallbackHandler = CallbackHandler;
        this.ExecutionState = ExecutionState;
        this.ExecutionEngine = ExecutionEngine;
        this.LibraryManager ??= new LibraryManager();

        this.setupPlatform();
        this.registerBuiltinLibraries();

        // base inclusion
        this.includeBasicNodes();
    }

    /** Optional libraries the core uses on demand (loaded only when needed). */
    registerBuiltinLibraries() {
        const manager = this.LibraryManager;
        if (!manager || manager.libraries_known?.dagre) return;
        manager.registerLibrary({
            key: "dagre",
            version: "3.1.3",
            globalObject: "dagre",
            description: "Graph layout for the \"dagre\" auto-layout engine (graph.autoLayout)",
            optional: true,
            browser: { remote: ["https://cdn.jsdelivr.net/npm/@dagrejs/dagre@3.1.3/dist/dagre.min.js"] },
            server: { npm: ["@dagrejs/dagre"] },
        });
    }

    includeBasicNodes(){
        this.packs.open({ id: "litegraph/core", version: this.VERSION, title: "Subgraphs", description: "Subgraphs and functions: the subgraph node, its graph inputs and outputs, and the function node that runs an inner graph per call.", builtin: true });
        try {
            this.registerNodeType("graph/subgraph", Subgraph);
            this.registerNodeType("graph/input", GraphInput);
            this.registerNodeType("graph/output", GraphOutput);
            this.registerNodeType("graph/function", NodeFunction);
        } finally {
            this.packs.close("litegraph/core");
        }
    }

    callbackhandler_setup(){
        if(this.cb_handler) return;
        this.cb_handler = new CallbackHandler(this);
        // register CallbackHandler methods on this // Should move as class standard class methods?
        this.registerCallbackHandler = function(){ return this.cb_handler.registerCallbackHandler(...arguments); };
        this.unregisterCallbackHandler = function(){ return this.cb_handler.unregisterCallbackHandler(...arguments); };
        this.processCallbackHandlers = function(){ return this.cb_handler.processCallbackHandlers(...arguments); };
    }

    registerCallbackHandler(){
        this.callbackhandler_setup();
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler(){
        this.callbackhandler_setup();
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers(){
        this.callbackhandler_setup();
        return this.cb_handler.processCallbackHandlers(...arguments);
    }

    /**
     * Builds the metadata of a node type without creating a node.
     * Sources, in order: an optional `static def = {...}` on the class, then the classic static
     * fields (`title`, `desc`/`description`, `usage`, `search_aliases`, `capabilities`, `deprecated`,
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
        const slots = (value) => Array.isArray(value) ? value.map((slot) => Object.freeze({ ...slot })) : null;
        return Object.freeze({
            type,
            title: own.display_name ?? own.title ?? base_class.title ?? type,
            description: own.description ?? base_class.desc ?? base_class.description ?? "",
            // how to use the node: a short how-to for the node reference (docs/nodes) and tooltips
            usage: own.usage ?? base_class.usage ?? "",
            category: own.category ?? base_class.category ?? "",
            search_aliases: Object.freeze([...list(own.search_aliases), ...list(base_class.search_aliases)]),
            capabilities: Object.freeze([...capabilities]),
            deprecated: !!(own.deprecated ?? base_class.deprecated),
            experimental: !!(own.experimental ?? base_class.experimental),
            hidden: !!(own.hidden ?? base_class.skip_list),
            source: own.source ?? base_class.source ?? null,
            icon: own.icon ?? base_class.icon ?? null,
            pack: this.packs?.packOf(type) ? Object.freeze(this.packs.packOf(type)) : null,
            inputs: slots(own.inputs),
            outputs: slots(own.outputs),
            // execution needs (Wave 6): models, modes, emit, ticks, pure (see ExecutionEngine.normalizeDeclaration)
            execution: ExecutionEngine.normalizeDeclaration(own.execution ?? base_class.execution),
        });
    }

    /**
     * Declares the execution needs of registered node types without editing their classes
     * (`static def.execution` is the in-class form). Recomputes their definitions.
     * @param {string|string[]} types
     * @param {object} execution - {models, modes, default_mode, emit, ticks, pure, loop, immediate_inputs}
     */
    declareNodeExecution(types, execution) {
        for (const type of Array.isArray(types) ? types : [types]) {
            const base_class = this.registered_node_types[type];
            if (!base_class) continue;
            base_class.execution = { ...(base_class.execution ?? {}), ...execution };
            this.refreshNodeDefinition(type);
        }
    }

    /** @returns {number[]} the modes a node may use under its graph's execution model */
    getValidNodeModes(node) {
        return ExecutionEngine.validModes(node, ExecutionEngine.modelNameFor(node?.graph));
    }

    /** @returns {Readonly<object>|null} the metadata of a registered node type */
    getNodeDefinition(type) {
        return this.node_definitions[type] ?? null;
    }

    /** Recomputes the stored metadata of a registered type (after its pack or capabilities changed). */
    refreshNodeDefinition(type) {
        const base_class = this.registered_node_types[type];
        if (base_class) this.node_definitions[type] = this.describeNodeType(type, base_class);
    }

    /**
     * Registers how to replace a node type by another, as data (see PackRegistry.registerReplacement).
     * @returns {() => void} disposer
     */
    registerNodeReplacement(mapping) {
        this.setupPlatform();
        return this.packs.registerReplacement(mapping);
    }

    /**
     * Registers a named execution model (Wave 6): a set of rules a document can choose in its
     * `config.execution` (see ExecutionEngine.registerModel).
     */
    registerExecutionModel(name, rules) {
        return ExecutionEngine.registerModel(name, rules);
    }

    /** @returns {object|null} the rules of an execution model ("legacy" included) */
    getExecutionModel(name) {
        return ExecutionEngine.getModel(name);
    }

    /** @returns {object[]} every execution model, "legacy" first */
    listExecutionModels() {
        return ExecutionEngine.listModels();
    }

    /** @returns {object|null} the replacement mapping registered for a node type */
    getNodeReplacement(type) {
        return this.packs?.getReplacement(type) ?? null;
    }

    /**
     * Registers a subgraph definition as a node type (a component): it appears in search and menus
     * like any node. Inserting one gives the document the definition; instances of it link to it.
     * Documents save them as plain subgraph instances (properties.component = {type, revision}), so
     * they load without the registration. Registering a higher revision offers "update" on
     * instances made from an older one.
     * @param {string} type - e.g. "my/blur"
     * @param {object} definition - a subgraph definition (ComfyUI shape), with an id
     * @param {{revision?: number, title?: string, description?: string, category?: string, source?: string, definitions?: object[]}} [options]
     *   definitions: nested definitions it uses
     * @returns {{type: string, id: string, revision: number, definitions: Map<string, object>}}
     */
    registerSubgraphType(type, definition, options = {}) {
        if (typeof type !== "string" || !type) throw new TypeError("registerSubgraphType: type must be a non-empty string");
        if (typeof definition?.id !== "string" || !definition.id) throw new TypeError(`registerSubgraphType ${type}: the definition needs an id`);
        const definitions = SubgraphDefs.collectDefinitions({ definitions: { subgraphs: [definition, ...(options.definitions ?? [])] } });
        if (SubgraphDefs.findCycles(definitions).size) throw new Error(`registerSubgraphType ${type}: the definition contains itself`);
        const entry = { type, id: definition.id, revision: Number(options.revision ?? definition.revision ?? 0), definitions };
        this.subgraph_components.set(type, entry);
        this.registerNodeType(type, Subgraph.componentClass(entry, options));
        return entry;
    }

    /**
     * Lists node definitions.
     * @param {{category?: string, capability?: string, includeDeprecated?: boolean, includeHidden?: boolean, supportedOnly?: boolean}} [filter]
     *   category matches the category and its subcategories; supportedOnly drops types this runtime cannot run
     * @returns {Readonly<object>[]}
     */
    listNodeDefinitions({ category, capability, includeDeprecated = true, includeHidden = true, supportedOnly = false } = {}) {
        return Object.values(this.node_definitions).filter((def) =>
            (category === undefined || def.category === category || def.category.startsWith(category + "/"))
            && (capability === undefined || def.capabilities.includes(capability))
            && (includeDeprecated || !def.deprecated)
            && (includeHidden || !def.hidden)
            && (!supportedOnly || this.isNodeTypeSupported(def.type)));
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
        const toMatcher = (entry) => typeof entry === "function" ? entry
            : (entry.endsWith("/") || entry.endsWith("::")) ? (type) => type.startsWith(entry)
            : (type) => type === entry;
        const matchers = (Array.isArray(selector) ? selector : [selector]).map(toMatcher);
        const rule = { match: (type) => matchers.some((match) => match(type)), capabilities: [...capabilities] };
        this.capability_rules.push(rule);
        for (const type of Object.keys(this.registered_node_types)) {
            if (rule.match(type)) this.node_definitions[type] = this.describeNodeType(type, this.registered_node_types[type]);
        }
    }

    /** The capabilities this runtime provides (computed on each call: environments can change). */
    getRuntimeCapabilities() {
        const has = new Set(["network"]);
        if (isNode() || isBun()) { has.add("node"); has.add("sys"); }
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
                default: () => ({ bindings: {}, unset: [] }),
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
            this.settings.define({ id: "LiteGraph.Search.ShowDeprecated", name: "Show deprecated nodes in search", default: false });
            this.settings.define({ id: "LiteGraph.Search.ShowExperimental", name: "Show experimental nodes in search", default: true });
            this.nodeSearch.registerFilter({ id: "core.deprecated", name: "Deprecated", predicate: (def) => !def.deprecated, enabled: () => !this.settings.get("LiteGraph.Search.ShowDeprecated") });
            this.nodeSearch.registerFilter({ id: "core.experimental", name: "Experimental", predicate: (def) => !def.experimental, enabled: () => !this.settings.get("LiteGraph.Search.ShowExperimental") });
        }
        if (!this.nodeBadges) {
            this.nodeBadges = createNodeBadgeRegistry();
            // built-in badges, off unless a setting shows them
            this.settings.define({ id: "LiteGraph.Node.IdBadge", name: "Show node id badges", default: false });
            this.settings.define({ id: "LiteGraph.Node.SourceBadge", name: "Show node source badges", default: false });
            this.settings.define({ id: "LiteGraph.Node.LifecycleBadge", name: "Show deprecated and experimental badges", default: true });
            this.settings.define({ id: "LiteGraph.Group.HeaderToggle", name: "Show the mute toggle in group headers", default: true });
            this.settings.define({ id: "LiteGraph.Subgraph.PasteLinked", name: "Pasted or duplicated subgraphs share their definition", default: true });
            this.settings.define({ id: "LiteGraph.Execution.MaxEventDepth", name: "Deepest nesting of actions and executions in one event chain", default: 256 });
            this.settings.define({ id: "LiteGraph.Execution.MaxEventPasses", name: "Passes that deliver queued inner events at a subgraph or function boundary", default: 64 });
            this.settings.define({ id: "LiteGraph.Execution.AllowAnyMode", name: "Allow node modes their type declares invalid", default: false });
            this.settings.define({ id: "LiteGraph.Node.ExecutionBadge", name: "Show execution problems (graph.checkExecution) as node badges", default: false });
            // execution problems (graph.checkExecution), refreshed at most twice a second per document
            this.nodeBadges.register((node) => {
                if (!this.settings.get("LiteGraph.Node.ExecutionBadge")) return null;
                const root = node.graph?.rootGraph;
                if (!root?.checkExecution) return null;
                const now = Date.now();
                if (!root._execution_issues || now - (root._execution_issues_time ?? 0) > 500) {
                    root.checkExecution();
                    root._execution_issues_time = now;
                }
                const issue = root._execution_issues.get(node);
                return issue ? { text: "⚠ exec", title: issue.message, fgColor: "#FED", bgColor: "rgba(150,80,20,0.85)" } : null;
            });
            this.nodeBadges.register((node) => {
                if (!this.settings.get("LiteGraph.Node.LifecycleBadge")) return null;
                const def = this.getNodeDefinition?.(node.type) ?? node.constructor ?? {};
                if (def.deprecated) return { text: "deprecated", fgColor: "#FDD", bgColor: "rgba(140,40,40,0.8)" };
                if (def.experimental) return { text: "experimental", fgColor: "#FFE", bgColor: "rgba(120,100,30,0.8)" };
                return null;
            });
            this.nodeBadges.register((node) => this.settings.get("LiteGraph.Node.IdBadge") ? { text: `#${node.id}` } : null);
            this.settings.define({ id: "LiteGraph.Subgraph.UpdateBadge", name: "Show an update badge on components with a newer registered revision", default: true });
            this.nodeBadges.register((node) => (this.settings.get("LiteGraph.Subgraph.UpdateBadge") && node.hasSourceUpdate?.())
                ? { text: "update", fgColor: "#EFE", bgColor: "rgba(40,110,60,0.85)" } : null);
            this.nodeBadges.register((node) => {
                if (!this.settings.get("LiteGraph.Node.SourceBadge")) return null;
                const source = node.constructor?.source ?? this.getNodeDefinition?.(node.type)?.source;
                return source && source !== "core" ? { text: String(source) } : null;
            });
        }
        this.extensions ??= new ExtensionRegistry(this);
        this.layout ??= new LayoutRegistry();
        this.palette ??= new NodePalette(this);
        if (!this.settings.has("LiteGraph.Palette.Favorites")) {
            this.settings.define({ id: "LiteGraph.Palette.Favorites", type: "json", name: "Favourite node types (palette)", default: () => [] });
            this.settings.define({ id: "LiteGraph.Palette.Recent", type: "json", name: "Recently inserted node types (palette)", default: () => [] });
        }
        if (!this.settings.has("LiteGraph.Layout.Engine")) {
            this.settings.define({ id: "LiteGraph.Layout.Engine", name: "Auto-layout engine (dagre, layered, or a registered one)", default: "dagre" });
        }
        this.linkRouters ??= new LinkRouterRegistry();
        this.linkStyles ??= new LinkStyleRegistry();
        this.RenderLink ??= RenderLink;
        if (!this.settings.has("LiteGraph.Canvas.LinkStyles")) {
            this.settings.define({ id: "LiteGraph.Canvas.LinkStyles", type: "json", name: "Active link styles, in order (spotlight, dim-by-type, hidden, labelled, or registered ones)", default: () => [] });
            this.settings.define({ id: "LiteGraph.Canvas.HiddenLinkTypes", type: "json", name: "Slot types whose links the \"hidden\" link style does not draw", default: () => [] });
            this.settings.define({ id: "LiteGraph.Canvas.Minimap", name: "Show a minimap on canvases (Editor)", default: false });
        }
        if (!this.settings.has("LiteGraph.Canvas.ExecutionOverlays")) {
            this.settings.define({ id: "LiteGraph.Canvas.ExecutionOverlays", name: "Show node status, progress and errors on the canvas", default: true });
        }
        if (!this.packs) {
            this.packs = new PackRegistry(this);
            this.settings.define({ id: "LiteGraph.Packs.Stamp", name: "Stamp the pack and its version on nodes of non-builtin packs", default: true });
            this.settings.define({ id: "LiteGraph.Packs.AutoReplace", name: "Apply automatic node replacements when loading", default: true });
            this.settings.define({ id: "LiteGraph.Packs.AllowIncompatible", name: "Register packs whose litegraph requirement does not match", default: false });
            this.settings.define({ id: "LiteGraph.Packs.Disabled", type: "json", name: "Packs whose setup does not run", default: () => [] });
        }
    }

    // set logging debug_level
    // from -1 (none), 0 (error), .. to 5 (debug) based on console methods 'error', 'warn', 'info', 'log', 'debug'
    // could be set higher to enable verbose logging
    logging_set_level(v) {
        this.debug_level = Number(v);
    }

    // entrypoint to debug log
    // pass 0 (error) to 4 (debug), (or more for verbose logging)
    logging(lvl/**/) { // arguments

        if(!this.debug && this.debug_level>0) {
            // force only errors
            this.debug_level = 0;
        }
        
        if(lvl > this.debug_level){
            return; // -- break, log only below or equal current --
        }

        function clean_args(args) {
            let aRet = [];
            if(lvl<0 || lvl>4)
                aRet.push("loglvl:"+lvl); // include not standard log level
            for(let iA=1; iA<args.length; iA++) {
                if(typeof(args[iA])!=="undefined") aRet.push(args[iA]);
            }
            return aRet;
        }

        let lvl_txt = "debug";
        if(lvl>=0 && lvl<=4) lvl_txt = ['error', 'warn', 'info', 'log', 'debug'][lvl];

        if(typeof(console[lvl_txt])!=="function") {
            console.warn("[LG-log] invalid console method",lvl_txt,clean_args(arguments));
            throw new RangeError;
        }

        console[lvl_txt]("[LG]",...clean_args(arguments));
    }
    log_error() {
        this.logging(0,...arguments);
    }
    log_warn() {
        this.logging(1,...arguments);
    }
    log_info() {
        this.logging(2,...arguments);
    }
    log_log() {
        this.logging(3,...arguments);
    }
    log_debug() {
        this.logging(4,...arguments);
    }
    log_verbose() {
        this.logging(5,...arguments);
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

        this.log_debug("registerNodeType","start",type);

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
        if(prev) {
            this.log_debug("registerNodeType","replacing node type",type,prev);
        }
        if( !Object.prototype.hasOwnProperty.call( base_class.prototype, "shape") ) {
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
                    if(ext && ext.constructor === String) {
                        this.node_types_by_file_extension[ext.toLowerCase()] = base_class;
                    }
                }
            }
        }

        this.registered_node_types[type] = base_class;
        if (classname) {
            this.Nodes[classname] = base_class;
        }
        this.packs?._onTypeRegistered(type);
        this.node_definitions[type] = this.describeNodeType(type, base_class);

        this.processCallbackHandlers("onNodeTypeRegistered",{
            def_cb: this.onNodeTypeRegistered
        }, type, base_class);

        if (prev) {
            this.processCallbackHandlers("onNodeTypeReplaced",{
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
            for (var i=0; i < base_class.supported_extensions.length; i++) {
                var ext = base_class.supported_extensions[i];
                if(ext && ext.constructor === String)
                    this.node_types_by_file_extension[ext.toLowerCase()] = base_class;
            }
        }

        this.log_debug("registerNodeType","type registered",type);

        if (this.auto_load_slot_types){
            // auto_load_slot_types should be used when not specifing slot type to LiteGraph
            // good for testing: this will create a temporary node for each type
            this.log_debug("registerNodeType","auto_load_slot_types, create empy tmp node",type);
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
            type.constructor === String
                ? this.registered_node_types[type]
                : type;
        if (!base_class) {
            throw new Error("node type not found to unregister: " + type);
        }
        delete this.registered_node_types[base_class.type];
        delete this.node_definitions[base_class.type];
        this.packs?._onTypeUnregistered(base_class.type);
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
            this.registered_node_types[type] !== "anonymous"
                ? this.registered_node_types[type]
                : type;

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
            const registerTo = out
                ? "registered_slot_out_types"
                : "registered_slot_in_types";
            if (this[registerTo][slotType] === undefined) {
                this[registerTo][slotType] = { nodes: [] };
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
        if(object.inputs)
            for(let i=0; i < object.inputs.length; ++i) {
                let _name = object.inputs[i][0];
                let _type = object.inputs[i][1];
                if(_type && _type.constructor === String)
                    _type = '"'+_type+'"';
                ctor_code += "this.addInput('"+_name+"',"+_type+");\n";
            }
        if(object.outputs)
            for(let i=0; i < object.outputs.length; ++i) {
                let _name = object.outputs[i][0];
                let _type = object.outputs[i][1];
                if(_type && _type.constructor === String)
                    _type = '"'+_type+'"';
                ctor_code += "this.addOutput('"+_name+"',"+_type+");\n";
            }
        if(object.properties)
            for(let i in object.properties) {
                let prop = object.properties[i];
                if(prop && prop.constructor === String)
                    prop = '"'+prop+'"';
                ctor_code += "this.addProperty('"+i+"',"+prop+");\n";
            }
        ctor_code += "if(this.onCreate)this.onCreate()";
        var classobj = Function(ctor_code);
        for(let i in object)
            if(i!="inputs" && i!="outputs" && i!="properties")
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

    wrapObjectAsNodeCollection(obj, objectNameId){
        if(typeof(obj)!=="object"){ // && typeof(obj)!=="function"){
            return;
        }
        const propsDescr = Object.getOwnPropertyDescriptors(obj);
        Object.keys(propsDescr).forEach((propertyName) => {
            console.debug("cyclingProps", objectNameId, propertyName, obj, typeof(obj[propertyName]));
            if(typeof(obj[propertyName])=="function"){
                // .arguments
                try{
                    console.info("**",obj[propertyName]["arguments"]);
                }catch(e){
                    // Strict-mode functions do not expose their arguments property.
                }
                this.wrapFunctionAsNode(objectNameId+"/"+propertyName, obj[propertyName]);
            }else{
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

        LiteGraph.log_verbose("createNode",type,title,options,base_class);

        title = title ?? base_class.title ?? type;

        let node = null;

        if (LiteGraph.catch_exceptions) {
            try {
                node = new base_class(title);
            } catch (err) {
                console.warn("[ERR] createNode",err);
                this.log_error("createNode",err);
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
        // the constructor's mode: when still unchanged at graph.add, a declared type gets its model's default
        node._constructed_mode = node.mode;

        // provenance: nodes of non-builtin packs remember their pack (a loaded node keeps its stored stamp)
        const stamp = this.packs?.stampFor(type);
        if (stamp) Object.assign(node.properties, stamp);

        // extra options
        Object.assign(node, options);
        node.post_constructor();

        LiteGraph.log_verbose("createNode","created",node,node.processCallbackHandlers);

        // callback node event entrypoint
        node.processCallbackHandlers("onNodeCreated",{
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
        const categories = { "": 1 };

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
        for (let i=0; i < tmp.length; i++) {
            script_files.push(tmp[i]);
        }

        var docHeadObj = document.getElementsByTagName("head")[0];
        folder_wildcard = document.location.href + folder_wildcard;

        for (let i=0; i < script_files.length; i++) {
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
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,(a) => (a^Math.random()*16>>a/4).toString(16));
    }

    /**
     * Returns if the types of two slots are compatible (supports multiple types per slot, wildcards, and events)
     * @method isValidConnection
     * @param {String} type_a
     * @param {String} type_b
     * @return {Boolean} true if they can be connected
     */
    isValidConnection(type_a, type_b) {
        type_a = type_a===0?"*":type_a;
        type_b = type_b===0?"*":type_b;
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
    fetchFile( url, type, on_complete, on_error ) {
        if(!url)
            return null;

        type = type || "text";
        if( url.constructor === String ) {
            if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
                url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
            }
            return fetch(url)
                .then((response) => {
                    if(!response.ok)
                        throw new Error("File not found"); // it will be catch below
                    if(type == "arraybuffer")
                        return response.arrayBuffer();
                    else if(type == "text" || type == "string")
                        return response.text();
                    else if(type == "json")
                        return response.json();
                    else if(type == "blob")
                        return response.blob();
                })
                .then((data) => {
                    if(on_complete)
                        on_complete(data);
                })
                .catch((error) => {
                    this.log_error("error fetching file:",url);
                    if(on_error)
                        on_error(error);
                });
        } else if( url.constructor === File || url.constructor === Blob) {
            var reader = new FileReader();
            reader.onload = (e) => {
                var v = e.target.result;
                if( type == "json" )
                    v = JSON.parse(v);
                if(on_complete)
                    on_complete(v);
            }
            if(type == "arraybuffer")
                return reader.readAsArrayBuffer(url);
            else if(type == "text" || type == "json")
                return reader.readAsText(url);
            else if(type == "blob")
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

    textCalculateMaxWidth(text){
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
        var words = (text+"").trim().split(' ');
        var line = '';
        var ret = {lines: [], maxW: 0, height: 0};
        if (words.length>1) {
            for(var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                var metrics = context.measureText(testLine);
                var testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, y+(lineHeight*ret.lines.length));
                    line = words[n] + ' ';
                    // y += lineHeight;
                    ret.max = testWidth;
                    ret.lines.push(line);
                }else{
                    line = testLine;
                }
            }
        } else {
            line = words[0];
        }
        context.fillText(line, x, y+(lineHeight*ret.lines.length));
        ret.lines.push(line);
        ret.height = lineHeight*ret.lines.length || lineHeight;
        return ret;
    }

    isInsideRectangle(x, y, left, top, width, height) {
        return x > left && x < left + width && y > top && y < top + height;
    }

    isBoundingInsideRectangle(bounding, left, top, width, height) {
        let x = bounding[0];
        let y = bounding[1];
        if(!(x > left && x < left + width && y > top && y < top + height))
            return false;
        x = bounding[0] + bounding[2];
        y = bounding[1] + bounding[3];
        if(!(x > left && x < left + width && y > top && y < top + height))
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

    getTime(){
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
    formatNumber(n, precision = 3){
        n = Number(n);
        if(Number.isNaN(n)){
            return "";
        }else{
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


/**
 * The legacy execution flags (Wave 6). Each is an accessor: assigning one notes it, and the default
 * execution model of new graphs then resolves to "legacy" (see LiteGraph.default_execution_model).
 * Reading and writing keeps working; they are deprecated and removed no earlier than 0.20.
 */
export const LEGACY_EXECUTION_FLAGS = Object.freeze({
    use_deferred_actions: { value: true, replacement: 'the "step" execution model (graph.setExecutionModel("step"))' },
    refreshAncestorsOnTriggers: { value: false, replacement: 'the "ancestors" execution model' },
    refreshAncestorsOnActions: { value: false, replacement: 'the "ancestors" execution model' },
    ensureUniqueExecutionAndActionCall: { value: false, replacement: 'the "ancestors" execution model (memo per frame and call)' },
    ensureNodeSingleExecution: { value: false, replacement: 'the "strict" execution model' },
    ensureNodeSingleAction: { value: false, replacement: 'the "strict" execution model' },
    preventAncestorRecalculation: { value: false, replacement: 'the "ancestors" execution model (memo per frame and call)' },
});
for (const name of Object.keys(LEGACY_EXECUTION_FLAGS)) {
    Object.defineProperty(LiteGraphClass.prototype, name, {
        configurable: true,
        enumerable: true,
        get() { return this._legacy_flag_values[name]; },
        set(value) {
            this._legacy_flag_values[name] = value;
            if (!this._legacy_flags_assigned.has(name)) {
                this._legacy_flags_assigned.add(name);
                // deprecated: said once per flag (removal no earlier than 0.20)
                this.log_warn?.("deprecated", `LiteGraph.${name} is deprecated (removal no earlier than 0.20); use ${LEGACY_EXECUTION_FLAGS[name].replacement}. Assigning it makes new graphs run under the "legacy" execution model unless LiteGraph.default_execution_model is set.`);
            }
        },
    });
}
Object.defineProperty(LiteGraphClass.prototype, "default_execution_model", {
    configurable: true,
    enumerable: true,
    /** the model of new graphs ("ancestors"); "legacy" when a legacy flag was assigned and this was not */
    get() { return this._default_execution_model_set ? this._default_execution_model : ExecutionEngine.resolveDefaultModel(); },
    set(value) {
        this._default_execution_model = value;
        this._default_execution_model_set = true;
    },
});

if(!getGlobalVariable("LiteGraph")){
    setGlobalVariable("LiteGraph", new LiteGraphClass());
    let LGInst = getGlobalVariable("LiteGraph");
    LGInst.log_info("LiteGraph instantiated",LGInst.getTime());
    LGInst.root = getGlobalObject();
    // ? Initialize LiteGraph to set up core classes
    // LGInst.initialize();
    // LGInst.log_info("LiteGraph initialized",LGInst.getTime());
}
export const LiteGraph = getGlobalVariable("LiteGraph");