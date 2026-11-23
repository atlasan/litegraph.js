// Public declarations for this fork. ESM and CommonJS share this canonical module.
// Project: litegraph.js
// Definitions by: NateScarlet <https://github.com/NateScarlet>

export type GraphId = number | string;
export type SlotType = string | number;
export type Vector2 = [number, number] | Float32Array;
export type Vector4 = [number, number, number, number];
export type widgetTypes =
    | "number"
    | "slider"
    | "combo"
    | "text"
    | "toggle"
    | "button";
export type SlotShape =
    | typeof LiteGraph.BOX_SHAPE
    | typeof LiteGraph.CIRCLE_SHAPE
    | typeof LiteGraph.ARROW_SHAPE
    | number; // For custom shapes

/** https://github.com/jagenjo/litegraph.js/tree/master/guides#node-slots */
export interface INodeSlot {
    name: string;
    type: SlotType;
    label?: string;
    dir?:
        | typeof LiteGraph.UP
        | typeof LiteGraph.RIGHT
        | typeof LiteGraph.DOWN
        | typeof LiteGraph.LEFT;
    color_on?: string;
    color_off?: string;
    shape?: SlotShape;
    locked?: boolean;
    nameLocked?: boolean;
}

export interface INodeInputSlot extends INodeSlot {
    link: LLink["id"] | null;
    /** set on an input attached to a widget (see LGraphNode.addWidgetInput) */
    widget?: { name: string };
}
export interface INodeOutputSlot extends INodeSlot {
    links: LLink["id"][] | null;
}

export type WidgetCallback<T extends IWidget = IWidget> = (
    this: T,
    value: T["value"],
    graphCanvas: LGraphCanvas,
    node: LGraphNode,
    pos: Vector2,
    event?: MouseEvent
) => void;

export interface IWidget<TValue = any, TOptions = any> {
    name: string | null;
    value: TValue;
    options?: TOptions;
    type?: widgetTypes;
    y?: number;
    property?: string;
    last_y?: number;
    clicked?: boolean;
    marker?: boolean;
    callback?: WidgetCallback<this>;
    /** Called by `LGraphCanvas.drawNodeWidgets` */
    draw?(
        ctx: CanvasRenderingContext2D,
        node: LGraphNode,
        width: number,
        posY: number,
        height: number
    ): void;
    /**
     * Called by `LGraphCanvas.processNodeWidgets`
     * https://github.com/jagenjo/litegraph.js/issues/76
     */
    mouse?(
        event: MouseEvent,
        pos: Vector2,
        node: LGraphNode
    ): boolean;
    /** Called by `LGraphNode.computeSize` */
    computeSize?(width: number): [number, number];
}
export interface IButtonWidget extends IWidget<null, {}> {
    type: "button";
}
export interface IToggleWidget
    extends IWidget<boolean, { on?: string; off?: string }> {
    type: "toggle";
}
export interface ISliderWidget
    extends IWidget<number, { max: number; min: number }> {
    type: "slider";
}
export interface INumberWidget extends IWidget<number, { precision: number }> {
    type: "number";
}
export interface IComboWidget
    extends IWidget<
        string[],
        {
            values:
                | string[]
                | ((widget: IComboWidget, node: LGraphNode) => string[]);
        }
    > {
    type: "combo";
}

export interface ITextWidget extends IWidget<string, {}> {
    type: "text";
}

export interface IContextMenuItem {
    content: string;
    callback?: ContextMenuEventListener;
    /** Used as innerHTML for extra child element */
    title?: string;
    disabled?: boolean;
    has_submenu?: boolean;
    submenu?: {
        options: ContextMenuItem[];
    } & IContextMenuOptions;
    className?: string;
}
export interface IContextMenuOptions {
    callback?: ContextMenuEventListener;
    ignore_item_callbacks?: Boolean;
    event?: MouseEvent | CustomEvent;
    parentMenu?: ContextMenu;
    autoopen?: boolean;
    title?: string;
    extra?: any;
}

export type ContextMenuItem = IContextMenuItem | null;
export type ContextMenuEventListener = (
    value: ContextMenuItem,
    options: IContextMenuOptions,
    event: MouseEvent,
    parentMenu: ContextMenu | undefined,
    node: LGraphNode
) => boolean | void;

export interface LiteGraphAPI extends CallbackHost<LiteGraphHooks> {
    VERSION: string;
    /** library events: node types registered, replaced or unregistered; graphs and canvases created */
    readonly events: LGraphEventTarget<LiteGraphEventMap, LiteGraphAPI>;
    /** numeric graph-document schema version written by LGraph.serialize */
    SERIALIZATION_VERSION: number;

    CANVAS_GRID_SIZE: number;

    NODE_TITLE_HEIGHT: number;
    NODE_TITLE_TEXT_Y: number;
    NODE_SLOT_HEIGHT: number;
    NODE_WIDGET_HEIGHT: number;
    NODE_WIDTH: number;
    NODE_MIN_WIDTH: number;
    NODE_COLLAPSED_RADIUS: number;
    NODE_COLLAPSED_WIDTH: number;
    NODE_TITLE_COLOR: string;
    NODE_TEXT_SIZE: number;
    NODE_TEXT_COLOR: string;
    NODE_SUBTEXT_SIZE: number;
    NODE_DEFAULT_COLOR: string;
    NODE_DEFAULT_BGCOLOR: string;
    NODE_DEFAULT_BOXCOLOR: string;
    /** default node shape: a shape constant or "box" | "round" | "card" | "circle" */
    NODE_DEFAULT_SHAPE: number | string;
    /** size canvases for window.devicePixelRatio in LGraphCanvas.resize (default true) */
    canvas_high_dpi: boolean;
    DEFAULT_SHADOW_COLOR: string;
    DEFAULT_GROUP_FONT: number;

    LINK_COLOR: string;
    EVENT_LINK_COLOR: string;
    CONNECTING_LINK_COLOR: string;

    MAX_NUMBER_OF_NODES: number; //avoid infinite loops
    DEFAULT_POSITION: Vector2; //default node position
    VALID_SHAPES: ["default", "box", "round", "card"]; //,"circle"

    //shapes are used for nodes but also for slots
    BOX_SHAPE: 1;
    ROUND_SHAPE: 2;
    CIRCLE_SHAPE: 3;
    CARD_SHAPE: 4;
    ARROW_SHAPE: 5;
    GRID_SHAPE: 6;

    //enums
    INPUT: 1;
    OUTPUT: 2;

    EVENT: -1; //for outputs
    ACTION: -1; //for inputs

    ALWAYS: 0;
    ON_EVENT: 1;
    NEVER: 2;
    ON_TRIGGER: 3;
    ON_REQUEST: 4;

    UP: 1;
    DOWN: 2;
    LEFT: 3;
    RIGHT: 4;
    CENTER: 5;

    STRAIGHT_LINK: 0;
    LINEAR_LINK: 1;
    SPLINE_LINK: 2;

    NORMAL_TITLE: 0;
    NO_TITLE: 1;
    TRANSPARENT_TITLE: 2;
    AUTOHIDE_TITLE: 3;

    node_images_path: string;

    debug: boolean;
    catch_exceptions: boolean;
    throw_errors: boolean;
    /** if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration), which could lead to exploits */
    allow_scripts: boolean;
    /** node types by string */
    registered_node_types: Record<string, LGraphNodeConstructor>;
    /** used for dropping files in the canvas */
    node_types_by_file_extension: Record<string, LGraphNodeConstructor>;
    /** node types by class name */
    Nodes: Record<string, LGraphNodeConstructor>;

    /** used to add extra features to the search box */
    searchbox_extras: Record<
        string,
        {
            data: { outputs: string[][]; title: string };
            desc: string;
            type: string;
        }
    >;


    /** Register a node class so it can be listed when the user wants to create a new one */
    registerNodeType(type: string, base: new (...args: any[]) => object): void;
    /** removes a node type from the system */
    unregisterNodeType(type: string): void;
    /** Removes all previously registered node's types. */
    clearRegisteredTypes(): void;
    /**
     * Create a new node type by passing a function, it wraps it with a proper class and generates inputs according to the parameters of the function.
     * Useful to wrap simple methods that do not require properties, and that only process some input to generate an output.
     * @param name node name with namespace (p.e.: 'math/sum')
     * @param func
     * @param param_types an array containing the type of every parameter, otherwise parameters will accept any type
     * @param return_type string with the return type, otherwise it will be generic
     * @param properties properties to be configurable
     * @return {LGraphNode}
     */
    wrapFunctionAsNode(
        name: string,
        func: (...args: any[]) => any,
        param_types?: string[],
        return_type?: string,
        properties?: object
    ): LGraphNode;

    /**
     * Adds this method to all node types, existing and to be created
     * (You can add it to LGraphNode.prototype but then existing node types wont have it)
     */
    addNodeMethod(name: string, func: (...args: any[]) => any): void;

    /**
     * Create a node of a given type with a name. The node is not attached to any graph yet.
     * @param type full name of the node class. p.e. "math/sin"
     * @param name a name to distinguish from other nodes
     * @param options to set options
     */
    createNode<T extends LGraphNode = LGraphNode>(
        type: string,
        title?: string,
        options?: Partial<T>
    ): T | null;

    /**
     * Returns a registered node type with a given name
     * @param type full name of the node class. p.e. "math/sin"
     */
    getNodeType<T extends LGraphNode>(type: string): LGraphNodeConstructor<T>;

    /**
     * Returns a list of node types matching one category
     * @method getNodeTypesInCategory
     * @param {String} category category name
     * @param {String} filter only nodes with ctor.filter equal can be shown
     * @return {Array} array with all the node classes
     */
    getNodeTypesInCategory(
        category: string,
        filter: string
    ): LGraphNodeConstructor[];

    /**
     * Returns a list with all the node type categories
     * @method getNodeTypesCategories
     * @param {String} filter only nodes with ctor.filter equal can be shown
     * @return {Array} array with all the names of the categories
     */                           
    getNodeTypesCategories(filter?: string): string[];

    /** debug purposes: reloads all the js scripts that matches a wildcard */
    reloadNodes(folder_wildcard: string): void;

    getTime(): number;
    LLink: typeof LLink;
    LGraph: typeof LGraph;
    DragAndScale: typeof DragAndScale;
    compareObjects(a: object, b: object): boolean;
    distance(a: Vector2, b: Vector2): number;
    colorToString(c: string): string;
    isInsideRectangle(
        x: number,
        y: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): boolean;
    growBounding(bounding: Vector4, x: number, y: number): Vector4;
    isInsideBounding(p: Vector2, bb: Vector4): boolean;
    hex2num(hex: string): [number, number, number];
    num2hex(triplet: [number, number, number]): string;
    ContextMenu: typeof ContextMenu;
    extendClass(target: object, origin: object): void;
    getParameterNames(func: Function): string[];
    initialize(): void;
    LibraryManager: LibraryManager;
    commands: CommandRegistry;
    keybindings: KeybindingRegistry;
    settings: SettingsRegistry;
    extensions: ExtensionRegistry;
    menus: MenuRegistry;
    /** widget type name -> class (see registerWidgetType) */
    widget_types: Record<string, typeof BaseWidget>;
    /** value types: how a value of each type is edited on the canvas (widget) and in panels (editor) */
    valueTypes: ValueTypeRegistry;
    /** panel editor name -> editor (see registerPanelEditor) */
    panel_editors: Record<string, PanelEditor>;
    /** sections added to side panels (see registerPanelSection) */
    panel_sections: Map<string, PanelSectionDefinition>;
    /** node search: parsing, ranking and definition filters */
    nodeSearch: NodeSearch;
    /** node badges drawn in title bars; providers return badges for a node (settings LiteGraph.Node.IdBadge, LiteGraph.Node.SourceBadge) */
    nodeBadges: {
        register(provider: (node: LGraphNode) => NodeBadge | NodeBadge[] | null | undefined): () => void;
        collect(node: LGraphNode): NodeBadge[];
    };
    /** removing a routed link keeps its reroutes as a floating link (default true) */
    keep_floating_reroutes: boolean;
    /** root serialize: "inline" keeps each instance's inner graph; "definitions" writes the ComfyUI form */
    subgraph_format: "inline" | "definitions";
    /** nesting limit for subgraph definitions (load) and calls */
    subgraph_max_depth: number;
    /** registered components (registerSubgraphType) by node type */
    subgraph_components: Map<string, SubgraphComponentEntry>;
    /** registers a subgraph definition as a node type (a component); instances save as plain subgraph instances */
    registerSubgraphType(type: string, definition: SubgraphDefinition, options?: { revision?: number; title?: string; description?: string; category?: string; source?: string; definitions?: SubgraphDefinition[] }): SubgraphComponentEntry;
    /** a link dragged over a node body highlights, and a drop connects, the slot it would use (default true) */
    snap_link_to_slot: boolean;
    registerWidgetType(type: string, widgetClass: typeof BaseWidget): void;
    /** registers a value type (widget, editor, options, coercion, help); returns a disposer that restores a replaced one */
    registerValueType(name: string, def: ValueTypeDefinition, options?: { replace?: boolean }): () => void;
    /** the resolved value type for a name or alias (case-insensitive), or null */
    getValueType(name: string): Readonly<ResolvedValueType> | null;
    /** registers (or replaces) a panel editor; returns a disposer that restores the previous one */
    registerPanelEditor(name: string, editor: PanelEditor): () => void;
    /** adds a section to the node panel or the options panel; returns a disposer */
    registerPanelSection(def: PanelSectionDefinition): () => void;
    registerExtension(def: ExtensionDefinition): () => void;
    setupPlatform(): void;
    persistPlatformState(storage?: SettingsStorage): void;
    node_definitions: Record<string, Readonly<NodeDefinition>>;
    describeNodeType(type: string, base: Function): Readonly<NodeDefinition>;
    getNodeDefinition(type: string): Readonly<NodeDefinition> | null;
    /** recomputes the stored metadata of a registered type */
    refreshNodeDefinition(type: string): void;
    /** node packs: manifests, attribution of node types, provenance, replacement mappings */
    packs: PackRegistry;
    /** registers how to replace a node type by another, as data; returns a disposer */
    registerNodeReplacement(mapping: NodeReplacementMapping): () => void;
    getNodeReplacement(type: string): Readonly<NodeReplacementMapping> | null;
    listNodeDefinitions(filter?: { category?: string; capability?: string; includeDeprecated?: boolean; includeHidden?: boolean; supportedOnly?: boolean }): Readonly<NodeDefinition>[];
    declareCapabilities(selector: string | string[] | ((type: string) => boolean), capabilities: string[]): void;
    getRuntimeCapabilities(): Set<string>;
    getMissingCapabilities(type: string, runtime?: Set<string>): string[];
    isNodeTypeSupported(type: string, runtime?: Set<string>): boolean;
    getNodeSearchText(type: string): string;
    LGraphNode: typeof LGraphNode;
    LGraphCanvas: typeof LGraphCanvas;
    LGraphGroup: typeof LGraphGroup;
    Subgraph: typeof Subgraph;
    GraphInput: typeof GraphInput;
    GraphOutput: typeof GraphOutput;
    CallbackHandler: typeof CallbackHandler;
    /**
     * Sets the process-wide dispatch tap (null removes it): called after every hook dispatch and
     * typed event dispatch. Dispatches made inside the tap are not reported. Returns the previous tap.
     */
    setDispatchTap(tap: DispatchTap | null): DispatchTap | null;
    ExecutionState: typeof ExecutionState;
    RenderLink: typeof RenderLink;
    /** link routers by name: "spline", "linear", "straight", and registered ones */
    linkRouters: LinkRouterRegistry;
    /** link style resolvers by name: "spotlight", "dim-by-type", "hidden", "labelled", and registered ones */
    linkStyles: LinkStyleRegistry;
    /** auto-layout engines: "dagre" (loaded on demand), "layered", and registered ones */
    layout: LayoutRegistry;
    /** the node palette's data: groups, search, favourites, recent */
    palette: NodePalette;
    /** registers the optional libraries the core loads on demand (dagre) */
    registerBuiltinLibraries(): void;
    use_uuids: boolean;
    /**
     * Legacy execution flag, read by the "legacy" model; assigning it makes new graphs default to "legacy".
     * @deprecated use the "step" execution model (graph.setExecutionModel("step")); removal no earlier than 0.20
     */
    use_deferred_actions: boolean;
    /**
     * Legacy execution flag, read by the "legacy" model; assigning it makes new graphs default to "legacy".
     * @deprecated use the "strict" execution model; removal no earlier than 0.20
     */
    ensureNodeSingleExecution: boolean;
    /**
     * Legacy execution flag, read by the "legacy" model; assigning it makes new graphs default to "legacy".
     * @deprecated use the "strict" execution model; removal no earlier than 0.20
     */
    ensureNodeSingleAction: boolean;
    /**
     * Legacy execution flag, read by the "legacy" model; assigning it makes new graphs default to "legacy".
     * @deprecated use the "ancestors" execution model (memo per frame and call); removal no earlier than 0.20
     */
    ensureUniqueExecutionAndActionCall: boolean;
    /**
     * Legacy execution flag, read by the "legacy" model; assigning it makes new graphs default to "legacy".
     * @deprecated use the "ancestors" execution model; removal no earlier than 0.20
     */
    refreshAncestorsOnActions: boolean;
    /**
     * Legacy execution flag, read by the "legacy" model; assigning it makes new graphs default to "legacy".
     * @deprecated use the "ancestors" execution model; removal no earlier than 0.20
     */
    refreshAncestorsOnTriggers: boolean;
    /**
     * Legacy execution flag, read by the "legacy" model; assigning it makes new graphs default to "legacy".
     * @deprecated use the "ancestors" execution model (memo per frame and call); removal no earlier than 0.20
     */
    preventAncestorRecalculation: boolean;
    /** the canvas menu offers "Options" (graph info: the execution model; canvas switches) */
    showCanvasOptions: boolean;
    /** the execution model of new graphs: "ancestors", or "legacy" once a legacy flag was assigned (unless this was set) */
    default_execution_model: string;
    /** the execution engine and model registry (Wave 6) */
    ExecutionEngine: typeof ExecutionEngine;
    registerExecutionModel(name: string, rules?: ExecutionModelRules): ExecutionModel;
    getExecutionModel(name: string): ExecutionModel | null;
    /** declares the execution needs of registered types (in-class form: static def.execution) */
    declareNodeExecution(types: string | string[], execution: NodeExecutionDeclaration): void;
    /** the modes a node may use under its graph's model */
    getValidNodeModes(node: LGraphNode): number[];
    listExecutionModels(): ExecutionModel[];
    properties_allow_input_binding: boolean;
    properties_allow_output_binding: boolean;
    formatNumber(value: number | string, precision?: number): string;
    logging_set_level(level: number): void;
    uuidv4(): string;
    isBrowser: typeof isBrowser;
    getGlobalVariable: typeof getGlobalVariable;
    setGlobalVariable: typeof setGlobalVariable;
}
export declare class LiteGraphClass {}
export interface LiteGraphClass extends LiteGraphAPI {}
export declare const LiteGraph: LiteGraphClass;

export type serializedLGraph<
    TNode = ReturnType<LGraphNode["serialize"]>,
    // https://github.com/jagenjo/litegraph.js/issues/74
    TLink = SerializedLLink,
    TGroup = ReturnType<LGraphGroup["serialize"]>
> = {
    last_node_id: LGraph["last_node_id"];
    last_link_id: LGraph["last_link_id"];
    nodes: TNode[];
    links: TLink[];
    groups: TGroup[];
    config: LGraph["config"];
    extra?: object;
    /** numeric document schema version (0.4) */
    version: number;
    /** library version that wrote the document */
    litegraph_version?: string;
    /** fields from other editors are preserved verbatim */
    [foreignField: string]: unknown;
};

export interface LGraphState {
    lastNodeId: number;
    lastLinkId: number;
    lastGroupId: number;
    lastRerouteId: number;
}

export declare class LGraph {
    static supported_types: string[];
    static STATUS_STOPPED: 1;
    static STATUS_RUNNING: 2;

    constructor(o?: object);

    /** fresh id counters */
    static createState(): LGraphState;
    /** document identity (uuid) */
    id: string;
    /** number of saved changes to the document */
    revision: number;
    /** id counters; last_node_id/last_link_id are accessors over these */
    state: LGraphState;
    /** typed graph events */
    readonly events: LGraphEventTarget<LGraphEventMap, LGraph>;
    /** reroutes by id */
    reroutes: Map<number, Reroute>;
    /** add a reroute to a link (nearest the target) */
    addReroute(pos: ArrayLike<number>, link?: LLink): Reroute;
    /** remove a reroute; links and reroutes through it reconnect to its parent */
    removeReroute(id: number): boolean;
    getRerouteOnPos(x: number, y: number, radius?: number): Reroute | null;
    /** reroutes of a link, origin to target */
    getRerouteChain(link: LLink): Reroute[];
    /** reroute id -> link ids, for reroutes in use */
    getRerouteLinkIds(): Map<number, GraphId[]>;
    /** floating links: reroute chains attached to one end only (ComfyUI floatingLinks; origin or target is -1) */
    floating_links: Map<number, FloatingLink>;
    /** routes a link through a reroute chain; floating links whose reroutes it now uses are dropped */
    routeLink(link: LLink, parentId: number | undefined): void;
    getFloatingLinkEnd(floating: FloatingLink): { node: LGraphNode; slot: number; isOutput: boolean } | null;
    getFloatingLinksThrough(rerouteId: number): FloatingLink[];
    /** start (or nest) a transaction: saved changes until the outermost commit make one history entry */
    beginTransaction(label?: string): number;
    /** end the innermost transaction; true when the outermost one ended with changes */
    commitTransaction(): boolean;
    /** true while a transaction is open */
    readonly isInTransaction: boolean;
    /** run fn as one transaction; with rollback, restore the previous graph if fn throws */
    transact<T>(label: string, fn: () => T, options?: { rollback?: boolean }): T;

    filter: string;
    catch_errors: boolean;
    /** custom data */
    config: object;
    elapsed_time: number;
    fixedtime: number;
    fixedtime_lapse: number;
    globaltime: number;
    inputs: any;
    iteration: number;
    last_link_id: GraphId;
    last_node_id: number;
    last_update_time: number;
    links: Record<GraphId, LLink>;
    list_of_graphcanvas: LGraphCanvas[];
    outputs: any;
    runningtime: number;
    starttime: number;
    status: typeof LGraph.STATUS_RUNNING | typeof LGraph.STATUS_STOPPED;

    private _nodes: LGraphNode[];
    private _groups: LGraphGroup[];
    private _nodes_by_id: Record<GraphId, LGraphNode>;
    /** nodes that are executable sorted in execution order */
    private _nodes_executable:
        | (LGraphNode & { onExecute: NonNullable<LGraphNode["onExecute"]> })[]
        | null;
    /** nodes that contain onExecute */
    private _nodes_in_order: LGraphNode[];
    private _version: number;

    getSupportedTypes(): string[];
    /** Removes all nodes from this graph */
    clear(): void;
    /** Attach Canvas to this graph */
    attachCanvas(graphCanvas: LGraphCanvas): void;
    /** Detach Canvas to this graph */
    detachCanvas(graphCanvas: LGraphCanvas): void;
    /**
     * Starts running this graph every interval milliseconds.
     * @param interval amount of milliseconds between executions, if 0 then it renders to the monitor refresh rate
     */
    /** Basic graphs start immediately; graphs with dependencies return a readiness promise. */
    start(interval?: number): void | Promise<boolean>;
    startAsync(interval?: number): Promise<boolean>;
    whenReady(): Promise<this>;
    hasPendingInitialization(): boolean;
    /** Stops the execution loop of the graph */
    /** dropQueued: clear actions queued for deferred delivery (here and in inner graphs) */
    stop(options?: { dropQueued?: boolean }): void;
    /** the execution model this graph runs under, resolved from the root's config.execution; assigning it is `setExecutionModel(name)` (one undo step; an unknown name throws) */
    executionModel: string;
    getExecutionRules(): ExecutionModel;
    /** sets the root's config.execution in one undo step; throws for an unknown model */
    setExecutionModel(name: string): boolean;
    /** Await asynchronous cleanup returned by stop/removal callbacks. */
    whenIdle(): Promise<this>;
    stopAsync(): Promise<this>;
    clearAsync(): Promise<this>;
    removeAsync(node: LGraphNode): Promise<this>;
    cleanup_error?: Error | null;
    /**
     * Run N steps (cycles) of the graph
     * @param num number of steps to run, default is 1
     */
    runStep(num?: number, do_not_catch_errors?: boolean, limit?: number): void;
    /**
     * Updates the graph execution order according to relevance of the nodes (nodes with only outputs have more relevance than
     * nodes with only inputs.
     */
    updateExecutionOrder(): void;
    /** This is more internal, it computes the executable nodes in order and returns it */
    computeExecutionOrder<T = any>(only_onExecute: boolean, set_level: any): T;
    /**
     * Returns all the nodes that could affect this one (ancestors) by crawling all the inputs recursively.
     * It doesn't include the node itself
     * @return an array with all the LGraphNodes that affect this node, in order of execution
     */
    getAncestors(node: LGraphNode): LGraphNode[];
    /**
     * Positions every node in a more readable manner
     */
    arrange(margin?: number,layout?: string): void;
    /**
     * Returns the amount of time the graph has been running in milliseconds
     * @return number of milliseconds the graph has been running
     */
    getTime(): number;

    /**
     * Returns the amount of time accumulated using the fixedtime_lapse var. This is used in context where the time increments should be constant
     * @return number of milliseconds the graph has been running
     */
    getFixedTime(): number;

    /**
     * Returns the amount of time it took to compute the latest iteration. Take into account that this number could be not correct
     * if the nodes are using graphical actions
     * @return number of milliseconds it took the last cycle
     */
    getElapsedTime(): number;
    /**
     * Sends an event to all the nodes, useful to trigger stuff
     * @param eventName the name of the event (function to be called)
     * @param params parameters in array format
     */
    sendEventToAllNodes(eventName: string, params?: any, mode?: number | null): void;

    sendActionToCanvas(action: any, params: any[]): void;
    /**
     * Adds a new node instance to this graph
     * @param node the instance of the node
     */
    add<T extends LGraphNode>(node: T, skipComputeOrder?: boolean, options?: { doProcessChange?: boolean; doCalcSize?: boolean }): T | undefined;
    add(group: LGraphGroup, skipComputeOrder?: boolean, options?: object): void;
    /**
     * Called when a new node is added
     * @param node the instance of the node
     */
    onNodeAdded(node: LGraphNode): void;
    /** Removes a node from the graph */
    remove(node: LGraphNode): void;
    /** Returns a node by its id. */
    getNodeById(id: GraphId): LGraphNode | undefined;
    /**
     * Returns a list of nodes that matches a class
     * @param classObject the class itself (not an string)
     * @return a list with all the nodes of this type
     */
    findNodesByClass<T extends LGraphNode>(
        classObject: LGraphNodeConstructor<T>
    ): T[];
    /**
     * Returns a list of nodes that matches a type
     * @param type the name of the node type
     * @return a list with all the nodes of this type
     */
    findNodesByType<T extends LGraphNode = LGraphNode>(type: string): T[];
    /**
     * Returns the first node that matches a name in its title
     * @param title the name of the node to search
     * @return the node or null
     */
    findNodeByTitle<T extends LGraphNode = LGraphNode>(title: string): T | null;
    /**
     * Returns a list of nodes that matches a name
     * @param title the name of the node to search
     * @return a list with all the nodes with this name
     */
    findNodesByTitle<T extends LGraphNode = LGraphNode>(title: string): T[];
    /**
     * Returns the top-most node in this position of the canvas
     * @param x the x coordinate in canvas space
     * @param y the y coordinate in canvas space
     * @param nodes_list a list with all the nodes to search from, by default is all the nodes in the graph
     * @return the node at this position or null
     */
    getNodeOnPos<T extends LGraphNode = LGraphNode>(
        x: number,
        y: number,
        node_list?: LGraphNode[],
        margin?: number
    ): T | null;
    /**
     * Returns the top-most group in that position
     * @param x the x coordinate in canvas space
     * @param y the y coordinate in canvas space
     * @return the group or null
     */
    getGroupOnPos(x: number, y: number): LGraphGroup | null;

    onAction(action: any, param: any, options?: object): void;
    trigger(action: any, param: any, options?: object): void;
    /** Tell this graph it has a global graph input of this type */
    addInput(name: string, type: string, value?: any): void;
    /** Assign a data to the global graph input */
    setInputData(name: string, data: any): void;
    /** Returns the current value of a global graph input */
    getInputData<T = any>(name: string): T;
    /** Changes the name of a global graph input */
    renameInput(old_name: string, name: string): false | undefined;
    /** Changes the type of a global graph input */
    changeInputType(name: string, type: string): false | undefined;
    /** Removes a global graph input */
    removeInput(name: string): boolean;
    /** Creates a global graph output */
    addOutput(name: string, type: string, value: any): void;
    /** Assign a data to the global output */
    setOutputData(name: string, value: string): void;
    /** Returns the current value of a global graph output */
    getOutputData<T = any>(name: string): T;

    /** Renames a global graph output */
    renameOutput(old_name: string, name: string): false | undefined;
    /** Changes the type of a global graph output */
    changeOutputType(name: string, type: string): false | undefined;
    /** Removes a global graph output */
    removeOutput(name: string): boolean;
    triggerInput(name: string, value: any): void;
    setCallback(name: string, func: (...args: any[]) => any): void;
    beforeChange(info?: LGraphNode): void;
    afterChange(info?: LGraphNode): void;                       
    connectionChange(node: LGraphNode): void;
    /** returns if the graph is in live mode */
    isLive(): boolean;
    /** clears the triggered slot animation in all links (stop visual animation) */
    clearTriggeredSlots(): void;
    /* Called when something visually changed (not the graph!) */
    change(): void;
    setDirtyCanvas(fg: boolean, bg: boolean): void;
    /** Destroys a link */
    removeLink(link_id: GraphId): void;
    /** turns nodes into a subgraph node (one undo step; rolled back on failure) */
    convertToSubgraph(nodes: LGraphNode[]): Subgraph | null;
    /** replaces a subgraph node by its contents (one undo step) */
    unpackSubgraph(node: Subgraph): LGraphNode[];
    validateLinks(options?: { repair?: boolean }): {
        ok: boolean;
        repaired: boolean;
        issues: Array<{ kind: string; link_id?: GraphId; node_id?: GraphId; slot?: number }>;
    };
    /** Creates a Object containing all the info about this graph, it can be serialized */
    serialize<T extends serializedLGraph>(options?: { format?: "inline" | "definitions" }): T;
    /** subgraph definitions by id (on the root graph) */
    subgraphs: Map<string, SubgraphDefinition>;
    /** the outermost graph */
    readonly rootGraph: LGraph;
    /** adds the definitions of instances the root registry does not know yet; sync: also take instances edited since their last sync */
    registerSubgraphDefinitions(options?: { sync?: boolean }): void;
    /** inserts a subgraph node for a definition (or a registry id): a copy with a new id, or linked; one undo step */
    insertDefinition(definition: SubgraphDefinition | string, options?: { pos?: ArrayLike<number>; linked?: boolean; definitions?: SubgraphDefinition[] }): Subgraph;
    /** inserts a blueprint (a definition, or a document with definitions.subgraphs) as a copy */
    insertBlueprint(json: object, options?: { pos?: ArrayLike<number> }): Subgraph;
    /** the node at a path from the root graph ("3:7:2"), or null */
    resolvePath(path: string): LGraphNode | null;
    /** changed since loaded or marked saved */
    readonly isModified: boolean;
    markSaved(): void;
    markModified(): void;
    /** sets a node's execution state and emits execution-state on the root graph when someone listens */
    reportExecutionState(node: LGraphNode | null, kind: ExecutionStateKind, fields?: { status?: ExecutionStatus; value?: number; max?: number; message?: string }): ExecutionStateMessage;
    /** applies a received execution-state message (e.g. from the runner) */
    applyExecutionState(message: ExecutionStateMessage): LGraphNode | LGraph | null;
    /** arranges nodes with a layout engine, one undo step; nodes: only these (a selection) */
    autoLayout(options?: { engine?: string; nodes?: LGraphNode[]; direction?: 'LR' | 'RL' | 'TB' | 'BT'; spacing?: { node?: number; rank?: number } }): Promise<{ engine: string; moved: number }>;
    /** missing node types, one entry per type (deep: include subgraphs, default true) */
    getMissingNodes(options?: { deep?: boolean }): MissingNodeReport[];
    /** diagnostics against the execution model and the node declarations (see LiteGraph.Node.ExecutionBadge) */
    checkExecution(): ExecutionReport;
    /** sets the declared default modes of the current model on every node (one undo step); returns how many changed */
    applyExecutionModelModes(): number;
    /** replaces a node (one undo step); mapping: a mapping, a type name, or the registered mapping */
    replaceNode(node: LGraphNode, mapping?: NodeReplacementMapping | string): { node: LGraphNode; dropped: DroppedLink[] };
    /** replaces every matching node with a usable replacement (default: missing-type placeholders), one undo step per graph */
    replaceNodes(options?: { filter?: (node: LGraphNode) => boolean; deep?: boolean }): {
        replaced: { id: GraphId; path: string; from: string; to: string; dropped: DroppedLink[] }[];
        skipped: { id: GraphId; path: string; type: string; reason: string }[];
    };
    /** subgraph and function nodes, at any depth, that use a definition */
    findSubgraphInstances(id: string): Subgraph[];
    /** true while this graph or a graph containing it is being configured */
    readonly isConfiguring: boolean;
    /**
     * Configure a graph from a JSON string
     * @param data configure a graph from a JSON string
     * @returns if there was any error parsing
     */
    /** returns null when a configuring listener cancelled loading */
    configure(data: object, keep_old?: boolean): boolean | null | undefined;
    load(url: string): void;
}

export type SerializedLLink = [GraphId, GraphId, number, GraphId, number, SlotType];
export declare class LLink {
    id: GraphId;
    type: SlotType;
    origin_id: GraphId;
    origin_slot: number;
    target_id: GraphId;
    target_slot: number;
    /** reroute nearest the target, when the link is rerouted */
    parentId?: number;
    constructor(
        id: GraphId,
        type: SlotType,
        origin_id: GraphId,
        origin_slot: number,
        target_id: GraphId,
        target_slot: number
    );
    configure(o: LLink | SerializedLLink): void;
    serialize(): SerializedLLink;
}

export type SerializedLGraphNode<T extends LGraphNode = LGraphNode> = {
    id: T["id"];
    type: T["type"];
    pos: T["pos"];
    size: T["size"];
    flags: T["flags"];
    mode: T["mode"];
    inputs: T["inputs"];
    outputs: T["outputs"];
    title: T["title"];
    properties: T["properties"];
    widgets_values?: IWidget["value"][];
};

/** https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md#lgraphnode */
export declare class LGraphNode {
    /** Resolves when initialization and declared library loading complete. */
    ready: Promise<this>;
    initialization_state: "loading" | "ready" | "error";
    initialization_error?: Error;
    wrong_environment?: boolean;
    loading_lib?: boolean;
    executionEnvironment: string;
    runtime?: string;
    libraries: string[];
    requiredLibraries: string[];
    post_constructor(): Promise<this>;

    static title_color: string;
    static title: string;
    static type: null | string;
    static widgets_up: boolean;
    constructor(title?: string);

    title: string;
    type: null | string;
    size: Vector2;
    graph: null | LGraph;
    graph_version: number;
    pos: Vector2;
    is_selected: boolean;
    mouseOver: boolean;

    id: GraphId;

    //inputs available: array of inputs
    inputs: INodeInputSlot[];
    outputs: INodeOutputSlot[];
    connections: any[];

    //local data
    properties: Record<string, any>;
    properties_info: any[];

    flags: Partial<{
        collapsed: boolean
    }>;

    color: string;
    bgcolor: string;
    boxcolor: string;
    shape:
        | typeof LiteGraph.BOX_SHAPE
        | typeof LiteGraph.ROUND_SHAPE
        | typeof LiteGraph.CIRCLE_SHAPE
        | typeof LiteGraph.CARD_SHAPE
        | typeof LiteGraph.ARROW_SHAPE;

    serialize_widgets: boolean;
    skip_list: boolean;

    /** Used in `LGraphCanvas.onMenuNodeMode` */
    mode?:
        | typeof LiteGraph.ON_EVENT
        | typeof LiteGraph.ON_TRIGGER
        | typeof LiteGraph.NEVER
        | typeof LiteGraph.ALWAYS
        | typeof LiteGraph.ON_REQUEST;

    /** If set to true widgets do not start after the slots */
    widgets_up: boolean;
    /** widgets start at y distance from the top of the node */
    widgets_start_y: number;
    /** if you render outside the node, it will be clipped */
    clip_area: boolean;
    /** if set to false it wont be resizable with the mouse */
    resizable: boolean;
    /** slots are distributed horizontally */
    horizontal: boolean;
    /** if true, the node will show the bgcolor as 'red'  */
    has_errors?: boolean;

    /** configure a node from an object containing the serialized info */
    configure(info: SerializedLGraphNode): void;
    /** serialize the content */
    serialize(): SerializedLGraphNode;
    /** Creates a clone of this node  */
    clone(): this;
    /** serialize and stringify */
    toString(): string;
    /** get the title string */
    /** node ids from the root graph joined by ":" (e.g. "3:7:2" inside subgraphs) */
    getPath(): string;
    /** runtime execution state (not saved), set by runStep, reportProgress, setExecutionStatus or applyExecutionState */
    execution_state?: NodeExecutionState;
    /** why the last changeMode was refused (it names LiteGraph.Execution.AllowAnyMode), or null */
    mode_refusal?: string | null;
    /** a short glyph or a loaded image drawn before the title (else the definition's icon) */
    icon?: string | CanvasImageSource | null;
    /** reports progress (value of max) through the execution-state protocol */
    reportProgress(value: number, max?: number, message?: string): ExecutionStateMessage | null;
    /** sets the execution status; null clears it */
    setExecutionStatus(status: ExecutionStatus | null, message?: string): ExecutionStateMessage | null;
    getTitle(): string;
    /** sets the value of a property */
    setProperty(name: string, value: any): void;
    /** sets the output data */
    setOutputData(slot: number | string, data: any): void;
    /** sets the output data */
    setOutputDataType(slot: number, type: string): void;
    /**
     * Retrieves the input data (data traveling through the connection) from one slot
     * @param slot
     * @param force_update if set to true it will force the connected node of this slot to output data into this link
     * @return data or if it is not connected returns undefined
     */
    getInputData<T = any>(slot: number | string, force_update?: boolean): T;
    /**
     * Retrieves the input data type (in case this supports multiple input types)
     * @param slot
     * @return datatype in string format
     */
    getInputDataType(slot: number): string;
    /**
     * Retrieves the input data from one slot using its name instead of slot number
     * @param slot_name
     * @param force_update if set to true it will force the connected node of this slot to output data into this link
     * @return data or if it is not connected returns null
     */
    getInputDataByName<T = any>(slot_name: string, force_update?: boolean): T;
    /** tells you if there is a connection in one input slot */
    isInputConnected(slot: number): boolean;
    /** tells you info about an input connection (which node, type, etc) */
    getInputInfo(
        slot: number
    ): { link: GraphId | null; name: string; type: SlotType } | null;
    /** Returns the link info in the connection of an input slot */
    getInputLink(slot: number): LLink | null;
    /** returns the node connected in the input slot */
    getInputNode(slot: number): LGraphNode | null;
    /** returns the value of an input with this name, otherwise checks if there is a property with that name */
    getInputOrProperty<T = any>(name: string): T;
    /** tells you the last output data that went in that slot */
    getOutputData<T = any>(slot: number): T | null;
    /** tells you info about an output connection (which node, type, etc) */
    getOutputInfo(
        slot: number
    ): { name: string; type: SlotType; links: GraphId[] | null } | null;
    /** tells you if there is a connection in one output slot */
    isOutputConnected(slot: number): boolean;
    /** tells you if there is any connection in the output slots */
    isAnyOutputConnected(): boolean;
    /** retrieves all the nodes connected to this output slot */
    getOutputNodes(slot: number): LGraphNode[];
    /**  Triggers an event in this node, this will trigger any output with the same name */
    trigger(action: string, param?: any, options?: ExecutionOptions): void;
    /**
     * Triggers an slot event in this node
     * @param slot the index of the output slot
     * @param param
     * @param link_id in case you want to trigger and specific output link in a slot
     */
    triggerSlot(slot: number | string, param?: any, link_id?: GraphId | null, options?: ExecutionOptions): void;
    /**
     * clears the trigger slot animation
     * @param slot the index of the output slot
     * @param link_id in case you want to trigger and specific output link in a slot
     */
    clearTriggeredSlot(slot: number, link_id?: GraphId | null): void;
    /** changes node size and triggers callback */
    setSize(size: Vector2): void;
    /**
     * add a new property to this node
     * @param name
     * @param default_value
     * @param type string defining the output type ("vec3","number",...)
     * @param extra_info this can be used to have special properties of the property (like values, etc)
     */
    addProperty<T = any>(
        name: string,
        default_value: any,
        type?: string,
        extra_info?: object
    ): T;
    /**
     * add a new output slot to use in this node
     * @param name
     * @param type string defining the output type ("vec3","number",...)
     * @param extra_info this can be used to have special properties of an output (label, special color, position, etc)
     */
    addOutput(
        name: string,
        type: SlotType,
        extra_info?: Partial<INodeOutputSlot>
    ): INodeOutputSlot;
    /**
     * add a new output slot to use in this node
     * @param array of triplets like [[name,type,extra_info],[...]]
     */
    addOutputs(
        array: [string, SlotType, Partial<INodeOutputSlot> | undefined][]
    ): void;
    /** remove an existing output slot */
    removeOutput(slot: number): void;
    /** badges drawn in the title bar: entries or functions of the node (not serialized) */
    badges?: Array<NodeBadge | ((node: LGraphNode) => NodeBadge | NodeBadge[] | null)>;
    /** buttons drawn in the title bar (not serialized) */
    title_buttons?: NodeTitleButton[];
    addTitleButton(button: NodeTitleButton): NodeTitleButton;
    removeTitleButton(name: string): boolean;
    onTitleButtonClick?(button: NodeTitleButton, canvas: LGraphCanvas, e: any): void;

    /**
     * add a new input slot to use in this node
     * @param name
     * @param type string defining the input type ("vec3","number",...), it its a generic one use 0
     * @param extra_info this can be used to have special properties of an input (label, color, position, etc)
     */
    addInput(
        name: string,
        type: SlotType,
        extra_info?: Partial<INodeInputSlot>
    ): INodeInputSlot;
    /**
     * add several new input slots in this node
     * @param array of triplets like [[name,type,extra_info],[...]]
     */
    addInputs(
        array: [string, SlotType, Partial<INodeInputSlot> | undefined][]
    ): void;
    /** remove an existing input slot */
    removeInput(slot: number): void;
    /**
     * add an special connection to this node (used for special kinds of graphs)
     * @param name
     * @param type string defining the input type ("vec3","number",...)
     * @param pos position of the connection inside the node
     * @param direction if is input or output
     */
    addConnection(
        name: string,
        type: string,
        pos: Vector2,
        direction: string
    ): {
        name: string;
        type: string;
        pos: Vector2;
        direction: string;
        links: null;
    };
    /** computes the minimum size of a node according to its inputs and output slots */
    computeSize(minHeight?: Vector2): Vector2;
    /** returns all the info available about a property of this node */
    getPropertyInfo(property: string): object;
    /**
     * https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md#node-widgets
     * @return created widget
     */
    addWidget<T extends IWidget>(
        type: T["type"],
        name: string,
        value: T["value"],
        callback?: WidgetCallback<T> | string,
        options?: T["options"]
    ): T;

    addCustomWidget<T extends IWidget>(customWidget: T): T;
    /** true for an input attached to a widget (`input.widget = {name}`) */
    static isWidgetInputSlot(slot: unknown): boolean;
    getWidgetFromSlot(slot: INodeInputSlot): IWidget | null;
    getSlotFromWidget(widget: IWidget): INodeInputSlot | null;
    isWidgetLinked(widget: IWidget): boolean;
    /** adds an input on the widget's row; while linked the widget is disabled and the link drives it */
    addWidgetInput(widgetOrName: IWidget | string, type?: string): INodeInputSlot | null;
    /** the linked input's data when connected, else the widget value */
    getWidgetValue(name: string): any;

    /**
     * returns the bounding of the object, used for rendering purposes
     * @method getBounding
     * @param out [optional] a place to store the output, to free garbage
     * @param compute_outer [optional] set to true to include the shadow and connection points in the bounding calculation
     * @return the bounding box in format of [topleft_cornerx, topleft_cornery, width, height]
     */
    getBounding(out?: Vector4, compute_outer?: boolean): Vector4;
    /** checks if a point is inside the shape of a node */
    isPointInside(
        x: number,
        y: number,
        margin?: number,
        skipTitle?: boolean
    ): boolean;
    /** checks if a point is inside a node slot, and returns info about which slot */
    getSlotInPosition(
        x: number,
        y: number
    ): {
        input?: INodeInputSlot;
        output?: INodeOutputSlot;
        slot: number;
        link_pos: Vector2;
    };
    /**
     * returns the input slot with a given name (used for dynamic slots), -1 if not found
     * @param name the name of the slot
     * @return the slot (-1 if not found)
     */
    findInputSlot(name: string): number;
    /**
     * returns the output slot with a given name (used for dynamic slots), -1 if not found
     * @param name the name of the slot
     * @return  the slot (-1 if not found)
     */
    findOutputSlot(name: string): number;
    /**
     * connect this node output to the input of another node
     * @param slot (could be the number of the slot or the string with the name of the slot)
     * @param  targetNode the target node
     * @param  targetSlot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
     * @return {Object} the link_info is created, otherwise null
     */
    connect<T = any>(
        slot: number | string,
        targetNode: LGraphNode,
        targetSlot: number | string
    ): T | null;
    /**
     * disconnect one output to an specific node
     * @param slot (could be the number of the slot or the string with the name of the slot)
     * @param target_node the target node to which this slot is connected [Optional, if not target_node is specified all nodes will be disconnected]
     * @return if it was disconnected successfully
     */
    disconnectOutput(slot: number | string, targetNode?: LGraphNode | GraphId | false | null, options?: { doProcessChange?: boolean }): boolean;
    /**
     * disconnect one input
     * @param slot (could be the number of the slot or the string with the name of the slot)
     * @return if it was disconnected successfully
     */
    disconnectInput(slot: number | string, options?: { doProcessChange?: boolean }): boolean;
    /**
     * returns the center of a connection point in canvas coords
     * @param is_input true if if a input slot, false if it is an output
     * @param slot (could be the number of the slot or the string with the name of the slot)
     * @param out a place to store the output, to free garbage
     * @return the position
     **/
    getConnectionPos(
        is_input: boolean,
        slot: number | string,
        out?: Vector2
    ): Vector2;
    /** Force align to grid */
    alignToGrid(): void;
    /** Console output */
    trace(msg: string): void;
    /** Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
    setDirtyCanvas(fg: boolean, bg: boolean): void;
    loadImage(url: string): void;
    /** Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
    captureInput(v: any): void;
    /** Collapse the node to make it smaller on the canvas */
    collapse(force: boolean): void;
    /** Forces the node to do not move or realign on Z */
    pin(v?: boolean): void;
    localToScreen(x: number, y: number, graphCanvas: LGraphCanvas): Vector2;

    // https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md#custom-node-appearance
    onDrawBackground?(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement
    ): void;
    onDrawForeground?(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement
    ): void;

    // https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md#custom-node-behaviour
    onMouseDown?(
        event: MouseEvent,
        pos: Vector2,
        graphCanvas: LGraphCanvas
    ): void;
    onMouseMove?(
        event: MouseEvent,
        pos: Vector2,
        graphCanvas: LGraphCanvas
    ): void;
    onMouseUp?(
        event: MouseEvent,
        pos: Vector2,
        graphCanvas: LGraphCanvas
    ): void;
    onMouseEnter?(
        event: MouseEvent,
        pos: Vector2,
        graphCanvas: LGraphCanvas
    ): void;
    onMouseLeave?(
        event: MouseEvent,
        pos: Vector2,
        graphCanvas: LGraphCanvas
    ): void;
    onKey?(event: KeyboardEvent, pos: Vector2, graphCanvas: LGraphCanvas): void;

    /** Called by `LGraphCanvas.selectNodes` */
    onSelected?(): void;
    /** Called by `LGraphCanvas.deselectNode` */
    onDeselected?(): void;
    /** Called by `LGraph.runStep` `LGraphNode.getInputData` */
    onExecute?(param?: any, options?: ExecutionOptions): void;
    onAction?(action: string, param?: any, options?: ExecutionOptions, slot?: number): void;
    /** Called by `LGraph.serialize` */
    onSerialize?(o: SerializedLGraphNode): void;
    /** Called by `LGraph.configure` */
    onConfigure?(o: SerializedLGraphNode): void;
    /**
     * when added to graph (warning: this is called BEFORE the node is configured when loading)
     * Called by `LGraph.add`
     */
    onAdded?(graph: LGraph): void;
    /**
     * when removed from graph
     * Called by `LGraph.remove` `LGraph.clear`
     */
    onRemoved?(graph: LGraph): void | Promise<void>;
    onStop?(): void | Promise<void>;
    onStart?(): void;
    onPostConstruct?(): void;
    /**
     * if returns false the incoming connection will be canceled
     * Called by `LGraph.connect`
     * @param inputIndex target input slot number
     * @param outputType type of output slot
     * @param outputSlot output slot object
     * @param outputNode node containing the output
     * @param outputIndex index of output slot
     */
    onConnectInput?(
        inputIndex: number,
        outputType: INodeOutputSlot["type"],
        outputSlot: INodeOutputSlot,
        outputNode: LGraphNode,
        outputIndex: number
    ): boolean;
    /**
     * if returns false the incoming connection will be canceled
     * Called by `LGraph.connect`
     * @param outputIndex target output slot number
     * @param inputType type of input slot
     * @param inputSlot input slot object
     * @param inputNode node containing the input
     * @param inputIndex index of input slot
     */
    onConnectOutput?(
        outputIndex: number,
        inputType: INodeInputSlot["type"],
        inputSlot: INodeInputSlot,
        inputNode: LGraphNode,
        inputIndex: number
    ): boolean;

    /**
     * Called just before connection (or disconnect - if input is linked).
     * A convenient place to switch to another input, or create new one.
     * This allow for ability to automatically add slots if needed
     * @param inputIndex
     * @return selected input slot index, can differ from parameter value
     */
    onBeforeConnectInput?(
        inputIndex: number
    ): number;
    
    /** a connection changed (new one or removed) (LiteGraph.INPUT or LiteGraph.OUTPUT, slot, true if connected, link_info, input_info or output_info ) */
    onConnectionsChange(
        type: number,
        slotIndex: number,
        isConnected: boolean,
        link: LLink,
        ioSlot: (INodeOutputSlot | INodeInputSlot)
    ): void;                           

    /**
     * if returns false, will abort the `LGraphNode.setProperty`
     * Called when a property is changed
     * @param property
     * @param value
     * @param prevValue
     */
    onPropertyChanged?(property: string, value: any, prevValue: any): void | boolean;

    /** Called by `LGraphCanvas.processContextMenu` */
    getMenuOptions?(graphCanvas: LGraphCanvas): ContextMenuItem[];
    getSlotMenuOptions?(slot: INodeSlot): ContextMenuItem[];
}

export type LGraphNodeConstructor<T extends LGraphNode = LGraphNode> = {
    new (): T;
};

export type SerializedLGraphGroup = {
    title: LGraphGroup["title"];
    bounding: LGraphGroup["_bounding"];
    color: LGraphGroup["color"];
    font: LGraphGroup["font"];
};
export declare class LGraphGroup {
    /** numeric id assigned by the graph */
    id?: number;
    title: string;
    private _bounding: Vector4;
    color: string;
    font: string;

    configure(o: SerializedLGraphGroup): void;
    serialize(): SerializedLGraphGroup;
    move(deltaX: number, deltaY: number, ignoreNodes?: boolean): void;
    recomputeInsideNodes(): void;
    isPointInside: LGraphNode["isPointInside"];
    setDirtyCanvas: LGraphNode["setDirtyCanvas"];
    /** encloses items (nodes, groups, reroutes) with padding and room for the title */
    resizeTo(items: Array<LGraphNode | LGraphGroup | Reroute>, padding?: number): boolean;
    fitToContents(padding?: number): boolean;
    /** sets the execution mode of every node inside; returns the nodes changed */
    /** nodes whose type refuses the mode keep theirs and are listed in the result's (non-enumerable) skipped */
    setNodesMode(mode: number): LGraphNode[] & { readonly skipped: LGraphNode[] };
}

/** An event delivered by LGraphEventTarget. */
export declare class LGraphEvent<TDetail = unknown, TTarget = unknown> {
    constructor(type: string, detail: TDetail, target: TTarget, cancelable?: boolean);
    readonly type: string;
    readonly detail: TDetail;
    readonly target: TTarget;
    readonly cancelable: boolean;
    defaultPrevented: boolean;
    preventDefault(): void;
}

export interface ListenerOptions { once?: boolean; signal?: AbortSignal; /** higher runs first (default 0) */ priority?: number }

/** Typed event hub; listener errors are reported, never thrown to the dispatcher. "*" receives every event. */
export declare class LGraphEventTarget<TMap = Record<string, unknown>, TOwner = unknown> {
    constructor(owner?: TOwner, onError?: (error: unknown, event: LGraphEvent) => void);
    on<K extends keyof TMap & string>(type: K, listener: (this: TOwner, event: LGraphEvent<TMap[K], TOwner>) => void, options?: ListenerOptions): () => void;
    on(type: "*", listener: (this: TOwner, event: LGraphEvent<TMap[keyof TMap], TOwner>) => void, options?: ListenerOptions): () => void;
    once<K extends keyof TMap & string>(type: K, listener: (this: TOwner, event: LGraphEvent<TMap[K], TOwner>) => void, options?: Omit<ListenerOptions, "once">): () => void;
    once(type: "*", listener: (this: TOwner, event: LGraphEvent<TMap[keyof TMap], TOwner>) => void, options?: Omit<ListenerOptions, "once">): () => void;
    off<K extends keyof TMap & string>(type: K | "*", listener: (event: LGraphEvent<TMap[K], TOwner>) => void): void;
    has(type: (keyof TMap & string) | "*"): boolean;
    dispatch<K extends keyof TMap & string>(type: K, detail: TMap[K], options?: { cancelable?: boolean }): LGraphEvent<TMap[K], TOwner>;
}

export interface LGraphEventMap {
    /** before a document loads; mutate detail.data to migrate it, preventDefault() to cancel */
    configuring: { data: Record<string, unknown>; keep_old: boolean };
    /** replaced: nodes changed by automatic replacement mappings while loading */
    configured: { data: Record<string, unknown>; error: boolean; replaced: { id: GraphId; from: string; to: string; dropped: DroppedLink[] }[] };
    /** a document with missing node types loaded (root graph; only when someone listens) */
    /** reason: "load", or "history" / "rollback" when undo, redo or a failed transaction reloads the graph */
    "missing-nodes": { report: MissingNodeReport[]; reason: 'load' | 'history' | 'rollback' };
    "node-replaced": { node: LGraphNode; from: string; to: string; dropped: DroppedLink[] };
    /** one per recorded change (per transaction); from a subgraph also on the root graph with kind "subgraph"; kind "configure" after a load */
    "graph-changed": { kind: GraphChangeKind; kinds: GraphChangeKind[]; action: string; revision: number; graph: LGraph; reason?: 'load' | 'history' | 'rollback' };
    /** isModified changed */
    "modified-changed": { modified: boolean };
    /** a node's execution state changed (root graph); remote: applied from a received message */
    "execution-state": { message: ExecutionStateMessage; node: LGraphNode | null; remote?: boolean };
    "node-added": { node: LGraphNode };
    "node-removed": { node: LGraphNode };
    /** a saved change (one per transaction) */
    changed: { action: string; revision: number };
    "reroute-added": { reroute: Reroute; link: LLink | null };
    "reroute-removed": { reroute: Reroute };
    "link-connected": { link: LLink; origin: LGraphNode; originSlot: number; target: LGraphNode; targetSlot: number };
    "link-removed": { link: LLink; origin: LGraphNode | null; target: LGraphNode | null };
    "node-property-changed": { node: LGraphNode; name: string; value: unknown; previous: unknown };
    "widget-changed": { node: LGraphNode; widget: IWidget; value: unknown; previous: unknown };
    /** after each runStep iteration (only dispatched when someone listens) */
    "execution-step": { iteration: number };
    /** execution stopped on an error */
    /** node: the innermost failing node (also inside subgraphs); path: its LGraphNode.getPath() */
    "node-error": { error: unknown; node: LGraphNode | null; path: string | null };
    /** an event or execution was refused (root graph; only when someone listens); setting names what lifts a limit */
    "event-dropped": { node: LGraphNode | null; path: string | null; reason: EventDropReason; setting?: string; message: string };
    /** setExecutionModel changed the document's model (root graph) */
    "execution-model-changed": { model: string };
    /** execution diagnostics after the root graph loads (only when someone listens) */
    "execution-check": { report: ExecutionReport; reason: 'load' | 'history' | 'rollback' };
    /** a subgraph definition changed by a commit; linked instances were refreshed (root graph) */
    "subgraph-definition-changed": { id: string; node: LGraphNode; revision: number };
    /** an instance got its own definition: inserted content differed under the same id, or make unique (root graph) */
    "subgraph-forked": { node: LGraphNode; from: string; to: string; reason: string };
    "group-added": { group: LGraphGroup };
    "group-removed": { group: LGraphGroup };
}

/** Events of LiteGraph.events (the library). */
export interface LiteGraphEventMap {
    "node-type-registered": { type: string; ctor: Function; previous: Function | null };
    "node-type-replaced": { type: string; ctor: Function; previous: Function };
    "node-type-unregistered": { type: string; ctor: Function };
    "graph-created": { graph: LGraph };
    "canvas-created": { canvas: LGraphCanvas };
}

export interface LGraphCanvasEventMap {
    /** a dragged link was released on empty canvas; preventDefault() skips the default menu */
    "link-dropped-on-empty": {
        node: LGraphNode; slot: number; output: INodeOutputSlot | null; input: INodeInputSlot | null;
        type: string | number | undefined; canvasX: number; canvasY: number; event: PointerEvent;
    };
    "subgraph-opened": { graph: LGraph; parent: LGraph | null };
    "subgraph-closed": { graph: LGraph; subgraph: LGraph; node: LGraphNode | null };
    "selection-changed": { nodes: LGraphNode[]; items: Array<LGraphNode | LGraphGroup | Reroute> };
    disposed: { canvas: LGraphCanvas };
    /** the view moved or zoomed (checked once per drawn frame) */
    "viewport-changed": { offset: [number, number]; scale: number; visible_area: number[] };
    /** a dropped blueprint file could not be inserted */
    "blueprint-error": { error: unknown; file: unknown };
    /** re-emitted from the canvas LinkConnector */
    "link-drag-start": LinkDragDetail & { canvas: LGraphCanvas };
    "link-drag-end": LinkDragDetail & { canvas: LGraphCanvas };
}

/** A point links are routed through; chains via parentId towards the origin. */
export declare class Reroute {
    static radius: number;
    constructor(id: number, pos?: ArrayLike<number>, parentId?: number);
    id: number;
    pos: [number, number];
    parentId?: number;
    isPointInside(x: number, y: number, radius?: number): boolean;
    move(dx: number, dy: number): void;
    serialize(linkIds?: GraphId[]): { id: number; pos: [number, number]; linkIds: GraphId[]; parentId?: number };
}

/** State machine for dragging links; moves are one transaction and cancel restores detached links. */
export declare class LinkConnector {
    node: LGraphNode | null;
    slot: number;
    output: INodeOutputSlot | null;
    input: INodeInputSlot | null;
    pos: Vector2 | Float32Array | null;
    movingInputs: Array<{ node: LGraphNode; slot: number }> | null;
    detached: Array<{ origin_id: GraphId; origin_slot: number; target_id: GraphId; target_slot: number; parentId?: number }> | null;
    /** reroute the drag started from; a new link is routed through it */
    reroute: Reroute | null;
    /** receives "link-drag-start" and "link-drag-end" (set by the canvas, which re-emits them) */
    onEvent: ((type: "link-drag-start" | "link-drag-end", detail: LinkDragDetail) => void) | null;
    readonly isConnecting: boolean;
    readonly isMoving: boolean;
    readonly type: string | number | undefined;
    reset(): void;
    startFromOutput(node: LGraphNode, slot: number): this;
    startFromInput(node: LGraphNode, slot: number): this;
    moveInputLink(node: LGraphNode, slot: number): boolean;
    moveOutputLinks(node: LGraphNode, slot: number): boolean;
    /** starts a new link from a reroute (the output feeding it, or the input a floating chain is attached to), routed through it; false when nothing uses it */
    startFromReroute(reroute: Reroute, graph: LGraph): boolean;
    /** where a link started from the reroute is anchored, and the route it takes; null when nothing uses the reroute */
    static rerouteEnd(reroute: Reroute, graph: LGraph): { node: LGraphNode; slot: number; isOutput: boolean; parentId: number } | null;
    /** the slot a drop on the node body would connect to (a free compatible slot first), or -1 */
    findTargetSlot(target: LGraphNode): number;
    dropOnNode(target: LGraphNode, targetSlot?: number): unknown;
    dropOnEmpty(): { node: LGraphNode; slot: number; output: INodeOutputSlot | null; input: INodeInputSlot | null; type: string | number | undefined } | null;
    cancel(): null;
}

/** A reroute chain attached to one end: target_id/target_slot are -1 when attached to an output, origin_* when attached to an input. */
export interface FloatingLink {
    id: number;
    origin_id: GraphId;
    origin_slot: number;
    target_id: GraphId;
    target_slot: number;
    type: string | number | undefined;
    parentId: number;
}

/** Detail of the link-drag-start / link-drag-end events (link-drag-end adds outcome, link and target). */
export interface LinkDragDetail {
    node: LGraphNode;
    slot: number;
    output: INodeOutputSlot | null;
    input: INodeInputSlot | null;
    type: string | number | undefined;
    moving: boolean;
    reroute: Reroute | null;
    outcome?: "connected" | "rejected" | "dropped" | "cancelled";
    link?: unknown;
    target?: LGraphNode;
    canvas?: LGraphCanvas;
}

/** Tracks one pointer gesture: click vs drag tolerance and double-click detection. */
export declare class CanvasPointer {
    static double_click_time: number;
    static double_click_distance: number;
    static click_drift: number;
    static click_time: number;
    isDown: boolean;
    dragged: boolean;
    maxDrift: number;
    downEvent: { x: number; y: number; time: number; button: number; pointerId?: number; isDoubleClick: boolean } | null;
    lastClick: { x: number; y: number; time: number; button: number } | null;
    reset(): void;
    down(e: { clientX: number; clientY: number; button?: number; pointerId?: number }, now?: number): { isDoubleClick: boolean };
    move(e: { clientX: number; clientY: number }): boolean;
    up(e?: { clientX: number; clientY: number }, now?: number): { isClick: boolean; dragged: boolean; duration: number; handled: boolean };
    cancel(): void;
    static HANDLERS: string[];
    /** true when the current gesture has handlers: the pointer owns it */
    readonly hasHandlers: boolean;
    clearHandlers(): void;
    /** per-gesture handlers, assigned after down() and cleared when the gesture ends */
    onClick: ((e: any, pointer: CanvasPointer) => void) | null;
    onDoubleClick: ((e: any, pointer: CanvasPointer) => void) | null;
    onDragStart: ((e: any, pointer: CanvasPointer) => void) | null;
    onDrag: ((e: any, pointer: CanvasPointer) => void) | null;
    onDragEnd: ((e: any, pointer: CanvasPointer) => void) | null;
    /** runs at the end of every gesture, including cancel (e is null then) */
    finally: ((e: any, pointer: CanvasPointer) => void) | null;
}

export declare class DragAndScale {
    constructor(element?: HTMLElement, skipEvents?: boolean);
    offset: [number, number];
    scale: number;
    max_scale: number;
    min_scale: number;
    /** backing-store pixels per CSS pixel of the element */
    pixel_ratio?: number;
    onredraw: Function | null;
    enabled: boolean;
    last_mouse: Vector2;
    element: HTMLElement | null;
    visible_area: Vector4;
    bindEvents(element: HTMLElement): void;
    /** removes the listeners bindEvents added (LGraphCanvas never binds them) */
    unbindEvents(): void;
    computeVisibleArea(): void;
    onMouse(e: MouseEvent): void;
    toCanvasContext(ctx: CanvasRenderingContext2D): void;
    convertOffsetToCanvas(pos: Vector2): Vector2;
    convertCanvasToOffset(pos: Vector2): Vector2;
    mouseDrag(x: number, y: number): void;
    changeScale(value: number, zooming_center?: Vector2): void;
    changeDeltaScale(value: number, zooming_center?: Vector2): void;
    reset(): void;
}

/**
 * This class is in charge of rendering one graph inside a canvas. And provides all the interaction required.
 * Valid callbacks are: onNodeSelected, onNodeDeselected, onShowNodePanel, onNodeDblClicked
 *
 * @param canvas the canvas where you want to render (it accepts a selector in string format or the canvas element itself)
 * @param graph
 * @param options { skip_rendering, autoresize }
 */
export declare class LGraphCanvas {
    /** a short notice over the canvas (execution refusals); logs without a DOM */
    showExecutionNotice(message: string, ms?: number): HTMLElement | null;
    /** writes a widget value as a canvas edit does (value type coercion, onWidgetChanged, bound property, history, widget-changed, callback); true when it changed */
    applyWidgetValue(node: LGraphNode, widget: IWidget, value: any, context?: { old_value?: any; pos?: Vector2; event?: Event }): boolean;
    /** loose equality; arrays and objects compare by content */
    static sameValue(a: any, b: any): boolean;
    /** label, tooltip, category, type and default of each canvas option (options panel, Canvas tab) */
    static optionInfo: Record<string, CanvasOptionInfo>;
    /** opens the node panel as a double click does (the onShowNodePanel callback may handle it); true when the built-in panel opened */
    openNodePanel(node: LGraphNode): boolean;
    /** creates a side panel (see PanelBuilder) */
    createPanel(title: string, options?: PanelOptions): PanelElement;
    /** the open node panel, if any */
    node_panel: PanelElement | null;
    /** the open options panel, if any */
    options_panel: PanelElement | null;
    static node_colors: Record<
        string,
        {
            color: string;
            bgcolor: string;
            groupcolor: string;
        }
    >;
    static link_type_colors: Record<string, string>;
    static gradients: object;
    static search_limit: number;
    /** resolve a shape constant or shape name to a shape constant */
    static resolveShape(shape: number | string | undefined, fallback: number): number;
    /** clamp a number to a widget's optional min/max */
    static clampWidgetNumber(value: number, options?: { min?: number; max?: number }): number;
    /** backing-store pixels per CSS pixel */
    pixel_ratio: number;
    /** typed canvas events */
    readonly events: LGraphEventTarget<LGraphCanvasEventMap, LGraphCanvas>;
    /** reroute being dragged */
    dragging_reroute: Reroute | null;
    /** draw a link through intermediate points (reroutes) */
    renderLinkPath(ctx: CanvasRenderingContext2D, points: ArrayLike<number>[], link: LLink | null, skip_border?: boolean, flow?: number, color?: string | null, start_dir?: number, end_dir?: number): void;
    /** draw the reroutes links pass through */
    drawReroutes(ctx: CanvasRenderingContext2D): void;
    /** link-drag state; connecting_* fields are accessors over it */
    linkConnector: LinkConnector;
    /** primary pointer gesture state */
    pointer: CanvasPointer;
    /** canvas width in CSS pixels */
    readonly cssWidth: number;
    /** canvas height in CSS pixels */
    readonly cssHeight: number;

    static getFileExtension(url: string): string;
    static decodeHTML(str: string): string;

    static onMenuCollapseAll(): void;
    static onMenuNodeEdit(): void;
    static onShowNodeInfoEditor(
        item: any,
        options: any,
        e: any,
        menu: any,
        node: any
    ): void;
    /** Create menu for `Add Group` */
    static onGroupAdd: ContextMenuEventListener;
    /** Create menu for `Add Node` */
    static onMenuAdd: ContextMenuEventListener;
    static showMenuNodeOptionalInputs: ContextMenuEventListener;
    static showMenuNodeOptionalOutputs: ContextMenuEventListener;
    static onShowMenuNodeProperties: ContextMenuEventListener;
    static onResizeNode: ContextMenuEventListener;
    static onMenuNodeCollapse: ContextMenuEventListener;
    static onMenuNodePin: ContextMenuEventListener;
    static onMenuNodeMode: ContextMenuEventListener;
    static onMenuNodeColors: ContextMenuEventListener;
    static onMenuNodeShapes: ContextMenuEventListener;
    static onMenuNodeRemove: ContextMenuEventListener;
    static onMenuNodeClone: ContextMenuEventListener;

    constructor(
        canvas: HTMLCanvasElement | string,
        graph?: LGraph,
        options?: {
            skip_render?: boolean;
            autoresize?: boolean;
        }
    );

    static active_canvas: HTMLCanvasElement;
                           
    allow_dragcanvas: boolean;
    allow_dragnodes: boolean;
    /** allow to control widgets, buttons, collapse, etc */
    allow_interaction: boolean;
    /** allows to change a connection with having to redo it again */
    allow_reconnect_links: boolean;
    /** allow selecting multi nodes without pressing extra keys */
    multi_select: boolean;
    /** No effect */
    allow_searchbox: boolean;
    always_render_background: boolean;
    autoresize?: boolean;
    background_image: string;
    bgcanvas: HTMLCanvasElement;
    bgctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    canvas_mouse: Vector2;
    clear_background: boolean;
    connecting_node: LGraphNode | null;
    connections_width: number;
    ctx: CanvasRenderingContext2D;
    current_node: LGraphNode | null;
    default_connection_color: {
        input_off: string;
        input_on: string;
        output_off: string;
        output_on: string;
    };
    default_link_color: string;
    dirty_area: Vector4 | null;
    dirty_bgcanvas?: boolean;
    dirty_canvas?: boolean;
    drag_mode: boolean;
    dragging_canvas: boolean;
    dragging_rectangle: Vector4 | null;
    ds: DragAndScale;
    /** used for transition */
    editor_alpha: number;
    filter: any;
    fps: number;
    frame: number;
    graph: LGraph;
    highlighted_links: Record<GraphId, boolean>;
    highquality_render: boolean;
    inner_text_font: string;
    is_rendering: boolean;
    last_draw_time: number;
    last_mouse: Vector2;
    /**
     * Possible duplicated with `last_mouse`
     * https://github.com/jagenjo/litegraph.js/issues/70
     */
    last_mouse_position: Vector2;
    /** Timestamp of last mouse click, defaults to 0 */
    last_mouseclick: number;
    links_render_mode:
        | typeof LiteGraph.STRAIGHT_LINK
        | typeof LiteGraph.LINEAR_LINK
        | typeof LiteGraph.SPLINE_LINK;
    live_mode: boolean;
    node_capturing_input: LGraphNode | null;
    node_dragged: LGraphNode | null;
    node_in_panel: LGraphNode | null;
    node_over: LGraphNode | null;
    node_title_color: string;
    node_widget: [LGraphNode, IWidget] | null;
    /** Called by `LGraphCanvas.drawBackCanvas` */
    onDrawBackground:
        | ((ctx: CanvasRenderingContext2D, visibleArea: Vector4) => void)
        | null;
    /** Called by `LGraphCanvas.drawFrontCanvas` */
    onDrawForeground:
        | ((ctx: CanvasRenderingContext2D, visibleArea: Vector4) => void)
        | null;
    onDrawOverlay: ((ctx: CanvasRenderingContext2D) => void) | null;
    /** Called by `LGraphCanvas.processMouseDown` */
    onMouse: ((event: MouseEvent) => boolean) | null;
    /** Called by `LGraphCanvas.drawFrontCanvas` and `LGraphCanvas.drawLinkTooltip` */
    onDrawLinkTooltip: ((ctx: CanvasRenderingContext2D, link: LLink, _this: this) => void) | null;
    /** Called by `LGraphCanvas.selectNodes` */
    onNodeMoved: ((node: LGraphNode) => void) | null;
    /** Called by `LGraphCanvas.processNodeSelected` */
    onNodeSelected: ((node: LGraphNode) => void) | null;
    /** Called by `LGraphCanvas.deselectNode` */
    onNodeDeselected: ((node: LGraphNode) => void) | null;
    /** Called by `LGraphCanvas.processNodeDblClicked` */
    onShowNodePanel: ((node: LGraphNode) => void) | null;
    /** Called by `LGraphCanvas.processNodeDblClicked` */
    onNodeDblClicked: ((node: LGraphNode) => void) | null;
    /** Called by `LGraphCanvas.selectNodes` */
    onSelectionChange: ((nodes: Record<GraphId, LGraphNode>) => void) | null;
    /** Called by `LGraphCanvas.showSearchBox` */
    onSearchBox:
        | ((
              helper: Element,
              value: string,
              graphCanvas: LGraphCanvas
          ) => string[])
        | null;
    onSearchBoxSelection:
        | ((name: string, event: MouseEvent, graphCanvas: LGraphCanvas) => void)
        | null;
    pause_rendering: boolean;
    render_canvas_border: boolean;
    render_collapsed_slots: boolean;
    render_connection_arrows: boolean;
    render_connections_border: boolean;
    render_connections_shadows: boolean;
    render_curved_connections: boolean;
    render_execution_order: boolean;
    render_only_selected: boolean;
    render_shadows: boolean;
    render_title_colored: boolean;
    round_radius: number;
    selected_group: null | LGraphGroup;
    selected_group_resizing: boolean;
    selected_nodes: Record<GraphId, LGraphNode>;
    show_info: boolean;
    title_text_font: string;
    /** set to true to render title bar with gradients */
    use_gradients: boolean;
    visible_area: DragAndScale["visible_area"];
    visible_links: LLink[];
    visible_nodes: LGraphNode[];
    zoom_modify_alpha: boolean;

    /** clears all the data inside */
    clear(): void;
    /** assigns a graph, you can reassign graphs to the same canvas */
    setGraph(graph: LGraph, skipClear?: boolean): void;
    /** opens a graph contained inside a node in the current graph */
    openSubgraph(graph: LGraph): void;
    /** closes a subgraph contained inside a node */
    closeSubgraph(): void;
    /** inserts a blueprint file (a definition or a document) as a copy; opens a file input unless a File is given */
    pickBlueprintFile(pos?: ArrayLike<number>, file?: Blob | { text(): Promise<string> } | null): Promise<LGraphNode | null>;
    /** leaves open subgraphs until `level` is shown (0: the root graph); each one left commits its edits */
    closeSubgraphTo(level: number): void;
    /** the path of open subgraphs, root first */
    getBreadcrumb(): Array<{ level: number; title: string }>;
    drawBreadcrumb(ctx: CanvasRenderingContext2D, color?: string): void;
    /** the breadcrumb level at a canvas-relative CSS position, or null */
    getBreadcrumbAt(x: number, y: number): number | null;
    /** assigns a canvas */
    setCanvas(canvas: HTMLCanvasElement, skipEvents?: boolean): void;
    /** binds mouse, keyboard, touch and drag events to the canvas */
    bindEvents(): void;
    /** unbinds mouse events from the canvas */
    unbindEvents(): void;

    /**
     * this function allows to render the canvas using WebGL instead of Canvas2D
     * this is useful if you plant to render 3D objects inside your nodes, it uses litegl.js for webgl and canvas2DtoWebGL to emulate the Canvas2D calls in webGL
     **/
    enableWebGL(): void;

    /**
     * marks as dirty the canvas, this way it will be rendered again
     * @param fg if the foreground canvas is dirty (the one containing the nodes)
     * @param bg if the background canvas is dirty (the one containing the wires)
     */
    setDirty(fg: boolean, bg: boolean): void;

    /**
     * Used to attach the canvas in a popup
     * @return the window where the canvas is attached (the DOM root node)
     */
    getCanvasWindow(): Window;
    /** starts rendering the content of the canvas when needed */
    startRendering(): void;
    /** stops rendering the content of the canvas (to save resources) */
    stopRendering(): void;
    /** Stops rendering, detaches the graph and unbinds listeners; the canvas is unusable afterwards. */
    dispose(): void;

    processMouseDown(e: MouseEvent): boolean | undefined;
    processMouseMove(e: MouseEvent): boolean | undefined;
    processMouseUp(e: MouseEvent): boolean | undefined;
    processMouseWheel(e: MouseEvent): boolean | undefined;

    /** returns true if a position (in graph space) is on top of a node little corner box */
    isOverNodeBox(node: LGraphNode, canvasX: number, canvasY: number): boolean;
    /** returns true if a position (in graph space) is on top of a node input slot */
    isOverNodeInput(
        node: LGraphNode,
        canvasX: number,
        canvasY: number,
        slotPos: Vector2
    ): boolean;

    /** process a key event */
    processKey(e: KeyboardEvent): boolean | undefined;

    copyToClipboard(): void;
    pasteFromClipboard(connectUnselected?: boolean): { nodes: LGraphNode[]; groups: LGraphGroup[] } | undefined;
    processDrop(e: DragEvent): void;
    checkDropItem(e: DragEvent): void;
    processNodeDblClicked(n: LGraphNode): void;
    processNodeSelected(n: LGraphNode, e: MouseEvent): void;
    processNodeDeselected(node: LGraphNode): void;

    /** selects a given node (or adds it to the current selection) */
    selectNode(node: LGraphNode, add?: boolean): void;
    /** selects several nodes (or adds them to the current selection) */
    selectNodes(nodes?: LGraphNode[], add?: boolean): void;
    /** removes a node from the current selection */
    deselectNode(node: LGraphNode): void;
    /** removes all nodes from the current selection */
    deselectAllNodes(): void;
    /** deletes all nodes in the current selection from the graph */
    deleteSelectedNodes(): void;
    /** everything selected: nodes, groups and reroutes */
    readonly selectedItems: Array<LGraphNode | LGraphGroup | Reroute>;
    isItemSelected(item: LGraphNode | LGraphGroup | Reroute): boolean;
    selectItem(item: LGraphNode | LGraphGroup | Reroute, add?: boolean): void;
    deselectItem(item: LGraphNode | LGraphGroup | Reroute): void;
    /** moves the selection (group children are carried once), one undo step */
    moveSelected(dx: number, dy: number): void;
    /** deletes selected nodes, groups and reroutes, one undo step */
    deleteSelected(): void;
    /** the selection as a portable fragment (nodes, links incl. incoming ones, reroute chains, groups) */
    serializeSelection(): { litegraph_fragment: number; nodes: object[]; links: any[]; groups: object[] };
    /** inserts a fragment with fresh ids at pos (graph coordinates), one undo step */
    insertFragment(fragment: { nodes: object[]; links?: any[]; groups?: object[] }, pos?: ArrayLike<number>, options?: { select?: boolean; connectUnselected?: boolean }): { nodes: LGraphNode[]; groups: LGraphGroup[] };
    /** wraps the selection in a new group, one undo step */
    groupSelected(title?: string): LGraphGroup | null;
    getGroupMenuOptions(group?: LGraphGroup): any[];
    /** true for a graph node (registered classes need not extend LGraphNode) */
    static isNodeItem(item: unknown): boolean;

    /** centers the camera on a given node */
    centerOnNode(node: LGraphNode): void;
    /** changes the zoom level of the graph (default is 1), you can pass also a place used to pivot the zoom */
    setZoom(value: number, center: Vector2): void;
    /** brings a node to front (above all other nodes) */
    bringToFront(node: LGraphNode): void;
    /** sends a node to the back (below all other nodes) */
    sendToBack(node: LGraphNode): void;
    /** checks which nodes are visible (inside the camera area) */
    computeVisibleNodes(nodes: LGraphNode[]): LGraphNode[];
    /** renders the whole canvas content, by rendering in two separated canvas, one containing the background grid and the connections, and one containing the nodes) */
    draw(forceFG?: boolean, forceBG?: boolean): void;
    /** draws the front canvas (the one containing all the nodes) */
    drawFrontCanvas(): void;
    /** draws some useful stats in the corner of the canvas */
    renderInfo(ctx: CanvasRenderingContext2D, x: number, y: number): void;
    /** draws the back canvas (the one containing the background and the connections) */
    drawBackCanvas(): void;
    /** draws the given node inside the canvas */
    drawNode(node: LGraphNode, ctx: CanvasRenderingContext2D): void;
    /** draws graphic for node's slot */
    drawSlotGraphic(ctx: CanvasRenderingContext2D, pos: number[], shape: SlotShape, horizontal: boolean): void;
    /** draws the shape of the given node in the canvas */
    drawNodeShape(
        node: LGraphNode,
        ctx: CanvasRenderingContext2D,
        size: [number, number],
        fgColor: string,
        bgColor: string,
        selected: boolean,
        mouseOver: boolean
    ): void;
    /** draws every connection visible in the canvas */
    drawConnections(ctx: CanvasRenderingContext2D): void;
    /**
     * draws a link between two points
     * @param a start pos
     * @param b end pos
     * @param link the link object with all the link info
     * @param skipBorder ignore the shadow of the link
     * @param flow show flow animation (for events)
     * @param color the color for the link
     * @param startDir the direction enum
     * @param endDir the direction enum
     * @param numSublines number of sublines (useful to represent vec3 or rgb)
     **/
    renderLink(
        ctx: CanvasRenderingContext2D,
        a: Vector2,
        b: Vector2,
        link: LLink | null,
        skipBorder?: boolean,
        flow?: boolean | number,
        color?: string | null,
        startDir?: number,
        endDir?: number,
        numSublines?: number,
        options?: { style?: LinkStyle | null; source?: LLink | null }
    ): void;

    computeConnectionPoint(
        a: Vector2,
        b: Vector2,
        t: number,
        startDir?: number,
        endDir?: number
    ): [number, number];
    /** link router name (LiteGraph.linkRouters); null: from links_render_mode */
    link_router: string | null;
    /** active link style names; null: the setting LiteGraph.Canvas.LinkStyles */
    link_styles: string[] | null;
    /** a slot type whose links stay bright with the "dim-by-type" style */
    link_type_focus: string | number | null;
    getLinkRouter(): LinkRouter | null;
    getActiveLinkStyles(): string[];
    resolveLinkStyle(renderLink: RenderLink): LinkStyle | null;
    minimap?: MiniMap | null;
    showMinimap(options?: MiniMapOptions): MiniMap | null;
    hideMinimap(): void;
    toggleMinimap(options?: MiniMapOptions): boolean;

    drawExecutionOrder(ctx: CanvasRenderingContext2D): void;
    /** draws the widgets stored inside a node */
    drawNodeWidgets(
        node: LGraphNode,
        posY: number,
        ctx: CanvasRenderingContext2D,
        activeWidget: object
    ): void;
    /** process an event on widgets */
    processNodeWidgets(
        node: LGraphNode,
        pos: Vector2,
        event: Event,
        activeWidget: object
    ): void;
    /** draws every group area in the background */
    drawGroups(canvas: any, ctx: CanvasRenderingContext2D): void;
    adjustNodesSize(): void;
    /** resizes the canvas to a given size, if no size is passed, then it tries to fill the parentNode */
    resize(width?: number, height?: number): void;
    /**
     * switches to live mode (node shapes are not rendered, only the content)
     * this feature was designed when graphs where meant to create user interfaces
     **/
    switchLiveMode(transition?: boolean): void;
    onNodeSelectionChange(): void;
    touchHandler(event: TouchEvent): void;

    showLinkMenu(link: LLink, e: any): false;
    /** what a link released on empty space offers; true when something was shown */
    /** badge and title-button rectangles in node space (right-aligned, buttons outermost) */
    getNodeTitleDecorations(node: LGraphNode, ctx?: CanvasRenderingContext2D | null): { buttons: Array<{ button: NodeTitleButton; rect: number[] }>; badges: Array<{ badge: NodeBadge; rect: number[] }>; font: string };
    drawNodeTitleDecorations(node: LGraphNode, ctx: CanvasRenderingContext2D, title_height: number): void;
    static EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string>;
    /** drag data type for a node type dropped on the canvas (inserted through LiteGraph.palette) */
    static NODE_DRAG_MIME: string;
    executionOverlaysEnabled(): boolean;
    getNodeIcon(node: LGraphNode): string | CanvasImageSource | null;
    drawNodeTitleText(node: LGraphNode, ctx: CanvasRenderingContext2D, title_height: number, selected: boolean): void;
    drawNodeExecutionOverlay(node: LGraphNode, ctx: CanvasRenderingContext2D, size: ArrayLike<number>, title_height: number, shape: number, low_quality: boolean): void;
    getNodeTitleButtonAt(node: LGraphNode, x: number, y: number): NodeTitleButton | null;
    clickNodeTitleButton(node: LGraphNode, button: NodeTitleButton, e: any): void;
    /** the group's header toggle rectangle [x, y, w, h] (setting LiteGraph.Group.HeaderToggle), or null */
    getGroupToggleRect(group: LGraphGroup): number[] | null;
    isGroupMuted(group: LGraphGroup): boolean;
    /** mutes the group's nodes, or sets them back to ALWAYS when all are muted; one undo step; returns the mode set */
    toggleGroupMuted(group: LGraphGroup): number;
    drawGroupToggle(group: LGraphGroup, ctx: CanvasRenderingContext2D): void;
    /** draws floating links, dashed and dimmed */
    drawFloatingLinks(ctx: CanvasRenderingContext2D): void;
    showLinkReleaseAction(action: "context-menu" | "search-box" | "none", dropped: { node: LGraphNode; output?: INodeOutputSlot | null; input?: INodeInputSlot | null }, e: any): boolean;
    prompt(
        title: string,
        value: any,
        callback: Function,
        event: any
    ): HTMLDivElement;
    showSearchBox(event?: MouseEvent): void;
    showEditPropertyValue(node: LGraphNode, property: any, options: any): void;
    createDialog(
        html: string,
        options?: { position?: Vector2; event?: MouseEvent }
    ): void;

    convertOffsetToCanvas: DragAndScale["convertOffsetToCanvas"];
    convertCanvasToOffset: DragAndScale["convertCanvasToOffset"];
    /** converts event coordinates from canvas2D to graph coordinates */
    convertEventToCanvasOffset(e: MouseEvent): Vector2;
    /** adds some useful properties to a mouse event, like the position in graph coordinates */
    adjustMouseEvent(e: MouseEvent): void;

    getCanvasMenuOptions(): ContextMenuItem[];
    getNodeMenuOptions(node: LGraphNode): ContextMenuItem[];
    getGroupMenuOptions(): ContextMenuItem[];
    /** Called by `getCanvasMenuOptions`, replace default options */
    getMenuOptions?(): ContextMenuItem[];
    /** Called by `getCanvasMenuOptions`, append to default options */
    getExtraMenuOptions?(): ContextMenuItem[];
    /** Called when mouse right click */
    processContextMenu(node: LGraphNode, event: Event): void;
}

export declare class ContextMenu {
    static trigger(
        element: HTMLElement,
        event_name: string,
        params: any,
        origin: any
    ): void;
    static isCursorOverElement(event: MouseEvent, element: { left: number; top: number; width: number; height: number }): boolean;
    static closeAll(window?: Window): void;
    constructor(values: ContextMenuItem[], options?: IContextMenuOptions, window?: Window);
    options: IContextMenuOptions;
    parentMenu?: ContextMenu;
    lock: boolean;
    current_submenu?: ContextMenu;
    addItem(
        name: string,
        value: ContextMenuItem,
        options?: IContextMenuOptions
    ): void;
    close(e?: MouseEvent, ignore_parent_menu?: boolean): void;
    getTopMenu(): void;
    getFirstEvent(): void;
}




export interface ExecutionOptions { action_call?: string; [key: string]: unknown; }
export interface CallbackInfo {
    name: string;
    id: number;
    current_return_value: any;
    data: CallbackOptions;
    results_chain: any[];
}
export interface CallbackOptions {
    /** higher runs first; the default (legacy onX) callback runs between >= 0 and < 0 */
    priority?: number;
    /** skipped when another handler prevents the default */
    is_default?: boolean;
    /** unregister after the first call (alias: once) */
    call_once?: boolean;
    once?: boolean;
    /** unregister on abort */
    signal?: AbortSignal;
}
/** A handler result: a plain value, or this object. */
export interface CallbackResult { return_value?: any; result_priority?: number; prevent_default?: boolean; stop_replication?: boolean }
/**
 * Hook names and the arguments their handlers receive after `info`, per host (the legacy `onX`
 * receives the same arguments without `info`). Generated from the dispatch sites and kept in sync
 * by `tools/check-types.mjs`: every name dispatched in src/ must be declared in one of these maps.
 * Names not listed still compile through the `string` overloads.
 */
export interface LiteGraphHooks {
    onNodeTypeRegistered: [type: string, ctor: Function];
    onNodeTypeReplaced: [type: string, ctor: Function, previous: Function];
    on_lgraph_construct: [graph: LGraph];
    on_lgraphnode_construct: [node: LGraphNode];
    on_lgraphcanvas_construct: [canvas: LGraphCanvas];
}
export interface LGraphHooks {
    // lifecycle and history
    onConfigure: [data: serializedLGraph];
    onSerialize: [data: serializedLGraph];
    on_change: [graph: LGraph];
    onBeforeChange: [graph: LGraph, info?: any];
    onAfterChange: [graph: LGraph, info?: any];
    // execution
    onPlayEvent: [];
    onStopEvent: [];
    onBeforeStep: [];
    onExecuteStep: [];
    onAfterStep: [];
    onAfterExecute: [];
    onTrigger: [action: string, param: any, options?: ExecutionOptions];
    onNodeTrace: [node: LGraphNode, message: any];
    // nodes and links
    onNodeAdded: [node: LGraphNode];
    onNodeRemoved: [node: LGraphNode];
    onConnectionChange: [node: LGraphNode];
    onNodeConnectionChange: [type: number, node: LGraphNode, slot: number, other: LGraphNode | null, otherSlot: number | null];
    // graph inputs and outputs
    onInputAdded: [name: string, type: string];
    onInputRemoved: [name: string];
    onInputRenamed: [oldName: string, name: string];
    onInputTypeChanged: [name: string, type: string];
    onOutputAdded: [name: string, type: string];
    onOutputRemoved: [name: string];
    onOutputRenamed: [oldName: string, name: string];
    onOutputTypeChanged: [name: string, type: string];
    onInputsOutputsChange: [];
    // menus
    onGetNodeMenuOptions: [options: ContextMenuItem[], node: LGraphNode];
}
export interface LGraphNodeHooks {
    // lifecycle
    onNodeCreated: [];
    onPostConstruct: [];
    onAdded: [graph: LGraph];
    onRemoved: [graph?: LGraph];
    onConfigure: [data: SerializedLGraphNode];
    onSerialize: [data: SerializedLGraphNode];
    onResize: [size: Vector2];
    onBounding: [area: Float32Array | Vector4];
    onPropertyChanged: [name: string, value: any, previous?: any];
    onGetPropertyInfo: [name: string];
    // execution (graph.sendEventToAllNodes dispatches onStart, onStop and other names to every node)
    onStart: [];
    onStop: [];
    onExecute: [param?: any, options?: ExecutionOptions];
    onAction: [action: string, param: any, options?: ExecutionOptions, slot?: number];
    onAfterExecuteNode: [param?: any, options?: ExecutionOptions];
    onAfterActionedNode: [param?: any, options?: ExecutionOptions];
    // slots and links
    onInputAdded: [input: INodeInputSlot];
    onInputRemoved: [slot: number, input?: INodeInputSlot];
    onOutputAdded: [output: INodeOutputSlot];
    onOutputRemoved: [slot: number];
    onBeforeConnectInput: [slot: number];
    onConnectInput: [slot: number, type: string | number, output: INodeOutputSlot, origin: LGraphNode, originSlot: number];
    onConnectOutput: [slot: number, type: string | number, input: INodeInputSlot, target: LGraphNode, targetSlot: number];
    onConnectionsChange: [type: number, slot: number, connected: boolean, link: LLink | null, slotInfo: INodeInputSlot | INodeOutputSlot];
    onGetInputs: [];
    onGetOutputs: [];
    onNodeInputAdd: [value: any];
    onNodeOutputAdd: [value: any];
    // pointer, keys and drop
    onMouseDown: [event: MouseEvent, pos: Vector2, canvas: LGraphCanvas];
    onMouseUp: [event: MouseEvent, pos: Vector2, canvas?: LGraphCanvas];
    onMouseMove: [event: MouseEvent, pos: Vector2, canvas: LGraphCanvas];
    onMouseEnter: [event: MouseEvent];
    onMouseLeave: [event: MouseEvent];
    onDblClick: [event: MouseEvent, pos: Vector2, canvas: LGraphCanvas];
    onDrag: [offset: Vector2];
    onMoved: [node?: LGraphNode, selected?: Record<string, LGraphNode>];
    onSelected: [];
    onDeselected: [];
    onInputClick: [slot: number, event: MouseEvent];
    onInputDblClick: [slot: number, event: MouseEvent];
    onOutputClick: [slot: number, event: MouseEvent];
    onOutputDblClick: [slot: number, event: MouseEvent];
    onKeyDown: [event: KeyboardEvent];
    onKeyUp: [event: KeyboardEvent];
    onDropItem: [event: DragEvent];
    onDropFile: [file: File];
    onDropData: [data: string | ArrayBuffer | null, filename: string, file: File];
    onWidgetChanged: [name: string, value: any, previous: any, widget: IWidget];
    onTitleButtonClick: [button: any, canvas: LGraphCanvas, event: MouseEvent];
    // node panel
    onAddPropertyToPanel: [name: string, panel: any, value: any, info: any, update: (name: string, value: any) => void];
    onShowCustomPanelInfo: [panel: any];
    // drawing
    onDrawBackground: [ctx: CanvasRenderingContext2D, canvas: LGraphCanvas, element: HTMLCanvasElement, mouse: Vector2];
    onDrawForeground: [ctx: CanvasRenderingContext2D, canvas: LGraphCanvas, element: HTMLCanvasElement];
    onDrawCollapsed: [ctx: CanvasRenderingContext2D, canvas: LGraphCanvas];
    onDrawTitle: [ctx: CanvasRenderingContext2D];
    onDrawTitleBar: [ctx: CanvasRenderingContext2D, titleHeight: number, size: Vector2, scale: number, color: string];
    onDrawTitleBox: [ctx: CanvasRenderingContext2D, titleHeight: number, size: Vector2, scale: number];
    onDrawTitleText: [ctx: CanvasRenderingContext2D, titleHeight: number, size: Vector2, scale: number, font: string, selected: boolean];
    // menus
    getMenuOptions: [canvas: LGraphCanvas];
    getExtraMenuOptions: [canvas: LGraphCanvas, options: ContextMenuItem[]];
    getSlotMenuOptions: [slot: { input?: INodeInputSlot; output?: INodeOutputSlot; slot: number }];
    onMenuNodeInputs: [entries: ContextMenuItem[]];
    onMenuNodeOutputs: [entries: ContextMenuItem[]];
}
export interface LGraphCanvasHooks {
    // lifecycle
    onClear: [];
    onOpenSubgraph: [graph: LGraph, previous: LGraph];
    onCloseSubgraph: [graph: LGraph, previous: LGraph, node: LGraphNode | undefined];
    onShowNodePanel: [node: LGraphNode];
    onSearchBoxSelection: [type: string, event: Event, canvas: LGraphCanvas];
    // drawing
    onRender: [element: HTMLCanvasElement, ctx: CanvasRenderingContext2D];
    onRenderBackground: [element: HTMLCanvasElement, ctx: CanvasRenderingContext2D];
    onDrawBackground: [ctx: CanvasRenderingContext2D, visibleArea: Float32Array];
    onDrawForeground: [ctx: CanvasRenderingContext2D, visibleRect: Float32Array | Vector4];
    onDrawOverlay: [ctx: CanvasRenderingContext2D];
    onDrawLinkTooltip: [ctx: CanvasRenderingContext2D, link: LLink | null, canvas?: LGraphCanvas];
    // input
    onMouse: [event: MouseEvent];
    onMouseDown: [event: MouseEvent];
    onKeyDown: [event: KeyboardEvent];
    onDropItem: [event: DragEvent];
    // selection and moves
    onNodeSelected: [node: LGraphNode];
    onNodeDeselected: [node: LGraphNode];
    onSelectionChange: [selected: Record<string, LGraphNode>];
    onNodeMoved: [node: LGraphNode, selected: Record<string, LGraphNode>];
    onNodeDblClicked: [node: LGraphNode];
    onGroupMoving: [group: LGraphGroup, dx: number, dy: number];
    onGroupMoved: [group: LGraphGroup];
    onGroupResized: [group: LGraphGroup];
    // menus
    getMenuOptions: [];
    getExtraMenuOptions: [canvas: LGraphCanvas, options: ContextMenuItem[]];
}
export interface LGraphGroupHooks {
    onMoved: [];
}
/** the handler arguments of hook K in map H (after info) */
export type HookArgs<H, K extends keyof H> = H[K] extends any[] ? H[K] : any[];
/** The hook API of a host; H maps its hook names to their arguments (unknown names use the string overloads). */
export interface CallbackHost<H = {}> {
    registerCallbackHandler<K extends keyof H & string>(name: K, callback: (info: CallbackInfo, ...args: HookArgs<H, K>) => any, options?: CallbackOptions): number | false;
    registerCallbackHandler(name: string, callback: (info: CallbackInfo, ...args: any[]) => any, options?: CallbackOptions): number | false;
    unregisterCallbackHandler(name: string, id: number): boolean;
    /** runs the handlers and the default callback (def_cb, the legacy onX); synchronous; rethrows the first handler error after the chain */
    processCallbackHandlers(name: string, options?: { def_cb?: Function | false; on_result?: (result: any) => void }, ...args: any[]): any;
    hasCallbackHandlers(name: string): boolean;
    /** the handler registry, created on first read */
    cb_handler: CallbackHandler;
    /** registers a handler and returns its disposer */
    onHook<K extends keyof H & string>(name: K, callback: (info: CallbackInfo, ...args: HookArgs<H, K>) => any, options?: CallbackOptions): () => boolean;
    onHook(name: string, callback: (info: CallbackInfo, ...args: any[]) => any, options?: CallbackOptions): () => boolean;
}
export declare class CallbackHandler {
    constructor(owner: object);
    debug: boolean;
    ob_ref: object;
    /** the value a hook settled on: return_value of an object result, otherwise the result itself */
    static valueOf(result: any): any;
    /** true for value, plain or as {return_value: value} */
    static is(result: any, value: any): boolean;
    /** true for true, or an object result with a truthy return_value */
    static handled(result: any): boolean;
    /** menu and slot-list hooks: return_value when it is an object (null included), with arrays also an array result; otherwise fallback */
    static objectOf<T = any>(result: any, fallback?: T, arrays?: boolean): any;
    /**
     * Fires a point that has both faces: the hook chain (the legacy owner[name] as default), then the
     * typed event on emitter. With veto, a hook result equal to it skips the event. A detail function
     * is called after the hook; null skips the event. Returns the hook result.
     */
    static fireHookThenEvent(owner: CallbackHost<any>, name: string, args: any[], emitter: { _emit?(type: string, detail: any, options?: any): any } | null | undefined,
        type: string, detail: object | (() => object | null), options?: { veto?: any; emit?: { recorded?: boolean; cancelable?: boolean } }): any;
}
export interface CallbackHandler extends Omit<CallbackHost, "cb_handler"> {
    /** per hook name */
    callbacks_handlers: Record<string, ListenerList>;
}
/** One dispatch, as the dispatch tap sees it. */
export interface DispatchRecord {
    /** the hook host, or the event target's owner (LiteGraph, a graph, a canvas) */
    owner: object;
    /** the hook name or the event type */
    name: string;
    phase: "hook" | "event";
    /** duration of the whole dispatch, handlers and legacy onX included */
    ms: number;
    /** hooks: what the chain threw; events: the first listener error; otherwise null */
    error: unknown;
}
export type DispatchTap = (record: DispatchRecord) => void;
/** The listener core shared by hooks and typed events: ordered by priority, copy-on-write. */
export declare class ListenerList {
    /** the process-wide dispatch tap; set it with LiteGraph.setDispatchTap */
    static tap: DispatchTap | null;
    /** never mutated; replaced on every change */
    readonly handlers: ReadonlyArray<{ id: number; priority: number; callback: Function; data: Record<string, any> }>;
    last_id: number;
    readonly size: number;
    add(callback: Function, data?: { priority?: number; signal?: AbortSignal; [key: string]: any }): number;
    remove(id: number): boolean;
    find(callback: Function): { id: number; priority: number; callback: Function; data: Record<string, any> } | undefined;
}
/** Gives a class the hook API (registerCallbackHandler, unregisterCallbackHandler, processCallbackHandlers, hasCallbackHandlers, onHook). */
export declare function installHooks<T extends Function>(Class: T): T;
export interface LGraph extends CallbackHost<LGraphHooks> {}
export interface LGraphNode extends CallbackHost<LGraphNodeHooks> {
    doExecute(param?: any, options?: ExecutionOptions): void;
    execute(param?: any, options?: ExecutionOptions): void;
    actionDo(action: string, param?: any, options?: ExecutionOptions, action_slot?: number): void;
    executePendingActions(): void;
    refreshAncestors(options?: { action?: string; param?: any; options?: ExecutionOptions; passParam?: boolean }): boolean | undefined;
    loadLibraries(keys?: string[]): Promise<void>;
    loadRequiredLibraries(): Promise<void>;
}
export interface LGraphCanvas extends CallbackHost<LGraphCanvasHooks> {}
export interface LGraphGroup extends CallbackHost<LGraphGroupHooks> {}

export interface LibraryRegistration {
    key: string;
    version?: string;
    globalObject?: string;
    defaultExport?: boolean | string;
    browser?: { local?: string | string[]; remote?: string | string[]; target?: string };
    server?: { npm?: string | string[]; remote?: string | string[]; target?: string };
    description?: string;
    /** false when nodes cannot work at all without it (default true) */
    optional?: boolean;
}
export interface LibraryManifestEntry {
    key: string;
    version: string;
    globalObject: string;
    description: string;
    optional: boolean;
    browser: { local: string[]; remote: string[] };
    server: { npm: string[]; remote: string[] };
    state: LibraryState;
}
export type LibraryState = 'not_loaded' | 'loading' | 'loaded' | 'error';
export declare class LibraryManager {
    constructor();
    ready: Promise<void>;
    registerLibrary(registration: LibraryRegistration): void;
    registerLibrary(key: string, version?: string, globalObject?: string, localPaths?: string | string[], remoteUrls?: string | string[], npmPackages?: string | string[], serverRemoteUrls?: string | string[], defaultExport?: boolean | string): void;
    loadLibrary(key: string, callback?: (modules: any[]) => void): Promise<any[]>;
    getLib<T = any>(key: string): T | null;
    isLibraryLoaded(key: string): boolean;
    waitForLib<T = any>(key: string, timeout?: number): Promise<T>;
    getLibraryState(key: string): LibraryState | false;
    areAllLibrariesLoaded(): boolean;
    waitAllLibrariesLoaded(options?: { timeout?: number }): Promise<void>;
    /** Allow `server.remote` scripts to be evaluated in Node.js (vm is not a sandbox). Default false. */
    allowServerRemoteCode: boolean;
    static isSafePackageSpec(spec: string): boolean;
    loadAllLibraries(): Promise<void>;
    unloadLibrary(key: string): void;
    unloadAllLibraries(): void;
    getRegisteredLibraries(): string[];
    describeLibraries(): LibraryManifestEntry[];
    probeLibraries(keys?: string[]): Promise<Array<{ key: string; available: boolean | null; missing: string[]; error?: string }>>;
    loadScript(url: string, globalObject?: string, defaultExport?: boolean | string): Promise<any>;
    loadCSS(url: string): Promise<Event>;
    npmInstall(key: string, command?: string | string[]): Promise<string>;
}
export declare class Subgraph extends LGraphNode {
    subgraph: LGraph;
    enabled: boolean;
    /** fills this (added, empty) node from nodes of its graph; see LGraph.convertToSubgraph */
    buildFromNodes(nodes: LGraphNode[]): this;
    /** moves the contents back into the parent graph and removes this node; see LGraph.unpackSubgraph */
    unpack(): LGraphNode[];
    /** the definition this node uses (root registry), or null */
    getDefinition(): SubgraphDefinition | null;
    /** makes the current inner graph the definition and refreshes the linked instances (one undo step) */
    commitDefinition(): boolean;
    /** rebuilds the inner graph from the definition; outer slots follow it by slot id */
    refreshFromDefinition(options?: { matchNames?: boolean }): boolean;
    /** gives this node its own copy of the definition; returns the new id */
    makeUnique(): string | null;
    /** makes an inner slot part of the interface (adds and links a graph/input or graph/output); returns it */
    exposeSlot(innerNode: LGraphNode, slotIndex: number, isOutput: boolean, pos?: ArrayLike<number>): LGraphNode | null;
    /** moves an interface slot up (-1) or down (+1); outer links follow */
    moveInterfaceSlot(isInput: boolean, name: string, delta: number): boolean;
    /** a component instance takes its registered component's newer revision (all linked instances; one undo step) */
    updateFromSource(): boolean;
    /** true when the registered component is newer than this instance's */
    hasSourceUpdate(): boolean;
    /** the node class of a registered component */
    static componentClass(entry: SubgraphComponentEntry, meta?: object): typeof Subgraph;
    /** promotes an inner widget: a new interface input feeds it, this node shows it */
    promoteWidget(innerNode: LGraphNode, widgetName: string): boolean;
    unpromoteWidget(innerNode: LGraphNode, widgetName: string): boolean;
    isWidgetPromoted(innerNode: LGraphNode, widgetName: string): boolean;
    /** stored instance fields this runtime does not model (written back) */
    kept_fields: Record<string, unknown>;
}
export declare class GraphInput extends LGraphNode {
    /** replaces the value widget by the widget of a value type, keeping the value when it converts */
    setValueWidgetType(type: string): IWidget;
}
export declare class GraphOutput extends LGraphNode {}
/** calls a subgraph definition: call -> inputs in, one run, outputs out -> done */
export declare class NodeFunction extends Subgraph {
    /** uses a definition of the root registry; false when unknown or recursive */
    setDefinition(id: string): boolean;
    setDefinitionByLabel(label: string): boolean;
    definitionLabels(): string[];
    /** true when `id` is a definition this node is inside of */
    wouldRecurse(id: string): boolean;
    /** runs the definition once with the current inputs, then fires done */
    call(param?: unknown, options?: object): boolean;
}
export declare class CurveEditor {
    constructor(points: Vector2[]);
    points: Vector2[];
    static sampleCurve(value: number, points?: Vector2[]): number | undefined;
    draw(ctx: CanvasRenderingContext2D, size: Vector2, canvas: LGraphCanvas, backgroundColor?: string, lineColor?: string, inactive?: boolean): void;
    onMouseDown(position: Vector2, canvas: LGraphCanvas): boolean | undefined;
    onMouseMove(position: Vector2, canvas: LGraphCanvas): boolean | undefined;
    onMouseUp(): false;
    getCloserPoint(position: Vector2, maxDistance: number): number;
}
export declare function getGlobalObject(): typeof globalThis;
export declare function getGlobalVariable<T = any>(key: string): T;
export declare function setGlobalVariable(key: string, value: any): void;
export declare function isBrowser(): boolean;
export declare function isNode(): string | false | undefined;
export declare function isBun(): boolean;
export declare function getRuntime(): 'browser' | 'node' | 'bun' | 'unknown';

export interface CommandContext {
    canvas?: LGraphCanvas | null;
    graph?: LGraph | null;
    selectedNodes?: LGraphNode[];
    event?: Event;
    [key: string]: any;
}
export interface CommandDefinition {
    id: string;
    run(ctx: CommandContext): any;
    label?: string | ((ctx: CommandContext) => string);
    category?: string;
    /** whether the command applies to the context; a disabled command does not run */
    when?(ctx: CommandContext): boolean;
    /** run inside graph.transact(): one undo entry */
    mutatesGraph?: boolean;
    [key: string]: any;
}
export declare class CommandRegistry {
    constructor();
    register(command: CommandDefinition): () => void;
    get(id: string): Readonly<CommandDefinition> | null;
    has(id: string): boolean;
    list(filter?: { category?: string }): Readonly<CommandDefinition>[];
    contextFor(canvas: LGraphCanvas | null | undefined, extra?: object): CommandContext;
    isEnabled(id: string, ctx?: CommandContext): boolean;
    execute(id: string, ctx?: CommandContext): { executed: boolean; result?: any };
}
export interface KeybindingDefinition {
    /** e.g. "ctrl+shift+k", "f2", "arrowright"; "mod" is ctrl (meta on macOS) */
    combo: string;
    commandId: string;
    allowRepeat?: boolean;
}
export declare class KeybindingRegistry {
    static MODIFIERS: string[];
    static normalize(combo: string): string;
    static fromEvent(event: KeyboardEvent): string | null;
    static isTextEntry(event: Event): boolean;
    constructor(commands: CommandRegistry);
    commands: CommandRegistry;
    add(binding: KeybindingDefinition): () => void;
    setUserBinding(combo: string, commandId: string | null): void;
    clearUserBinding(combo: string): void;
    unsetDefault(combo: string, commandId: string): void;
    exportUserLayer(): { bindings: Record<string, string | null>; unset: string[] };
    importUserLayer(data: { bindings?: Record<string, string | null>; unset?: string[] }): void;
    resolve(combo: string): Array<{ combo: string; commandId: string; allowRepeat: boolean }>;
    combosFor(commandId: string): string[];
    /** called after the user layer changes, with exportUserLayer() */
    onUserLayerChange: ((layer: { bindings: Record<string, string | null>; unset: string[] }) => void) | null;
    handleKeyDown(event: KeyboardEvent, ctx?: CommandContext): boolean;
}
export interface SettingsStorage {
    load(): Record<string, any> | null | undefined;
    save(values: Record<string, any>): void;
}
export interface SettingDefinition<T = any> {
    id: string;
    default?: T | (() => T);
    type?: 'boolean' | 'number' | 'text' | 'combo' | 'color' | string;
    name?: string;
    tooltip?: string;
    category?: string[];
    options?: Array<T | { value: T; text?: string }>;
    migrate?(stored: any): T;
    onChange?(value: T, previous: T | undefined): void;
    /** mirror the value onto an existing property, e.g. a LiteGraph flag */
    bind?: { target: object; key: string };
    [key: string]: any;
}
export declare class SettingsRegistry {
    static localStorageAdapter(key?: string): SettingsStorage;
    constructor(storage?: SettingsStorage | null);
    setStorage(storage: SettingsStorage | null): void;
    define<T = any>(def: SettingDefinition<T>): () => void;
    has(id: string): boolean;
    getDefinition(id: string): SettingDefinition | null;
    list(prefix?: string): SettingDefinition[];
    get<T = any>(id: string): T | undefined;
    set<T = any>(id: string, value: T): boolean;
    reset(id: string): boolean;
}
export interface ExtensionCanvasContext {
    on(name: string, callback: (info: CallbackInfo, ...args: any[]) => any, options?: CallbackOptions): () => void;
}
export interface ExtensionContext {
    name: string;
    host: object;
    commands: { register(command: CommandDefinition): () => void };
    keybindings: { add(binding: KeybindingDefinition): () => void };
    settings: { define(def: SettingDefinition): () => void; get(id: string): any; set(id: string, value: any): boolean };
    on(name: string, callback: (info: CallbackInfo, ...args: any[]) => any, options?: CallbackOptions): () => void;
    onTarget(target: CallbackHost<any>, name: string, callback: (info: CallbackInfo, ...args: any[]) => any, options?: CallbackOptions): () => void;
    onCanvas(fn: (canvas: LGraphCanvas, ctx: ExtensionCanvasContext) => void | (() => void)): void;
    menus: { register(location: MenuLocation, provider: MenuProvider): () => void };
    /** side panel sections and editors, removed on dispose */
    panels: { registerSection(section: PanelSectionDefinition): () => void; registerEditor(name: string, editor: PanelEditor): () => void };
    /** value types, removed on dispose */
    valueTypes: { register(name: string, def: ValueTypeDefinition, options?: { replace?: boolean }): () => void };
    onEvent(target: { events: LGraphEventTarget<any, any> }, type: string, listener: (event: LGraphEvent<any, any>) => void, options?: ListenerOptions): () => void;
    /** hook names (onX, on_x, getXMenuOptions) register a hook handler; other names a typed listener */
    listen(target: CallbackHost<any> | { events: LGraphEventTarget<any, any> }, name: string, listener: (...args: any[]) => any, options?: CallbackOptions & ListenerOptions): () => void;
    addDisposer(dispose: () => void): () => void;
}
export interface ExtensionDefinition {
    name: string;
    version?: string;
    requires?: string[];
    commands?: CommandDefinition[];
    keybindings?: KeybindingDefinition[];
    settings?: SettingDefinition[];
    menus?: Partial<Record<MenuLocation, MenuProvider>>;
    setup?(ctx: ExtensionContext): void | (() => void);
    [key: string]: any;
}
export declare class ExtensionRegistry {
    constructor(host: object);
    host: object;
    disabled: Set<string>;
    readonly canvases: LGraphCanvas[];
    attachCanvas(canvas: LGraphCanvas): void;
    has(name: string): boolean;
    list(): string[];
    get(name: string): ExtensionDefinition | null;
    register(def: ExtensionDefinition): () => void;
    unregister(name: string): boolean;
}

export interface NodeSlotDefinition {
    name: string;
    type?: string | number;
    tooltip?: string;
    optional?: boolean;
    [key: string]: any;
}
/** Metadata of a registered node type (see LiteGraph.getNodeDefinition); a class may provide it as `static def`. */
export interface NodeDefinition {
    type: string;
    title: string;
    description: string;
    /** how to use the node (def.usage or a static usage); "" when not given */
    usage: string;
    category: string;
    search_aliases: readonly string[];
    /** what the type needs from its runtime: "browser", "node", "webgl", "audio", "midi", "dom", "network", "sys", or custom */
    capabilities: readonly string[];
    deprecated: boolean;
    experimental: boolean;
    hidden: boolean;
    source: string | null;
    /** a short glyph or an image drawn before the title */
    icon: string | CanvasImageSource | null;
    /** the installed pack that owns the type (see LiteGraph.packs) */
    pack: Readonly<{ id: string; version: string; builtin: boolean }> | null;
    inputs: readonly Readonly<NodeSlotDefinition>[] | null;
    outputs: readonly Readonly<NodeSlotDefinition>[] | null;
    /** execution needs from static def.execution (or LiteGraph.declareNodeExecution); null when undeclared */
    execution: Readonly<NodeExecutionDeclaration> | null;
}
/** What a node type needs from the execution model (Wave 6). Undeclared types are valid everywhere and start ALWAYS. */
export interface NodeExecutionDeclaration {
    /** per model: false = not valid there; or its default mode and valid modes */
    models?: Record<string, false | { default_mode?: number; modes?: readonly number[] }>;
    /** modes that are valid in every model (NEVER is always allowed) */
    modes?: readonly number[];
    /** the mode new nodes get outside legacy */
    default_mode?: number;
    /** "immediate": its events are delivered now, with a refresh, in every model but legacy (loops, Sequence) */
    emit?: 'immediate';
    /** needs the step loop (Timer, Delay): never re-run by a pull */
    ticks?: boolean;
    /** safe to re-run: ON_REQUEST by default under "ancestors" */
    pure?: boolean;
    /** a loop: checkExecution reports it without a body */
    loop?: boolean;
    /** action inputs delivered immediately even under deferred models ("break") */
    immediate_inputs?: readonly string[];
}
export interface ExecutionIssue { node: LGraphNode; path: string | null; code: 'invalid-model' | 'invalid-mode' | 'ticks-not-stepped' | 'on-request-emitter' | 'loop-without-body' | 'pure-always'; message: string }
export interface ExecutionReport { model: string; issues: ExecutionIssue[] }

/** A pack manifest: plain data, never code (see LiteGraph.packs). */
export interface PackManifest {
    id: string;
    version: string;
    title?: string;
    description?: string;
    /** true for the node families shipped with litegraph (never stamped, always compatible) */
    builtin?: boolean;
    /** e.g. { litegraph: ">=0.10.0" } */
    requires?: { litegraph?: string; [name: string]: string | undefined };
    nodes?: string[];
    extensions?: string[];
    libraries?: string[];
    templates?: unknown[];
    locales?: unknown[];
    docs?: string;
    repository?: string;
    license?: string;
    [key: string]: unknown;
}
export type PackState = 'active' | 'disabled' | 'incompatible' | 'indexed';
/** A pack template, in the shape of the editor's examples manifest (apps/editor/examples/index.json). */
export interface PackTemplate {
    pack: string;
    id: string;
    title: string;
    description: string;
    /** e.g. "flows/dataflow", "subgraphs", "ui"; "packs" when not given */
    category: string;
    profile: string | null;
    flow: string | null;
    tags: readonly string[];
    packs: readonly string[];
    level: string | null;
    /** relative, http or https */
    url: string | null;
    /** an inline graph */
    data: object | null;
}
export interface NodeReplacementMapping {
    old_type: string;
    new_type: string;
    /** old slot (name or index) → new slot (name or index), or null to drop; unlisted slots keep their name */
    inputs?: Record<string, string | number | null>;
    outputs?: Record<string, string | number | null>;
    /** old property → new property, or null to drop */
    properties?: Record<string, string | null>;
    /** old widget index → new widget index, or null to drop; unlisted values keep their position */
    widgets?: Record<string, number | null>;
    /** fixed values written on the new node */
    set?: { properties?: Record<string, unknown> };
    /** replace while loading, without asking (setting LiteGraph.Packs.AutoReplace) */
    auto?: boolean;
    reason?: string;
}
export interface DroppedLink { kind: 'input' | 'output'; slot: number; name: string; link: GraphId }
export interface MissingNodeReport {
    type: string;
    count: number;
    /** the type is registered now (the node can be rebuilt) */
    available: boolean;
    nodes: { id: GraphId; path: string }[];
    pack: { id: string; version: string | null; source: 'stamp' | 'index' | 'comfy'; installed?: boolean } | null;
    replacement: { type: string; auto: boolean; available: boolean; reason?: string } | null;
}
export declare class PackRegistry {
    constructor(host: object);
    static compareVersions(a: string, b: string): number;
    static satisfiesVersion(version: string, range: string): boolean;
    static normalizeManifest(manifest: PackManifest): Readonly<PackManifest>;
    static isMissingNodePlaceholder(node: LGraphNode): boolean;
    static storedNodeType(node: LGraphNode): string;
    static replaceNodeInGraph(graph: LGraph, node: LGraphNode, mapping: NodeReplacementMapping): { node: LGraphNode; dropped: DroppedLink[] };
    /** registers a pack; node types registered by setup belong to it; refused when incompatible unless LiteGraph.Packs.AllowIncompatible */
    register(manifest: PackManifest, setup?: (ctx: { manifest: Readonly<PackManifest>; registerNodeType: (type: string, cls: Function) => void }) => unknown): () => void;
    /** attributes registrations to a pack until close (built-in node files) */
    open(manifest: PackManifest): Readonly<PackManifest>;
    close(id?: string): void;
    unregister(id: string): boolean;
    /** known packs that are not installed (metadata only) */
    index(manifests: PackManifest | PackManifest[]): () => void;
    get(id: string): Readonly<PackManifest> | null;
    list(): Readonly<PackManifest>[];
    packOf(type: string): { id: string; version: string; builtin: boolean } | null;
    typesOf(id: string): string[];
    findPackForType(type: string): { id: string; version: string; installed: boolean; state?: PackState } | null;
    describe(): (PackManifest & { state: PackState; types: string[]; error?: string })[];
    /** the templates (example graphs) of the active packs, from their manifests' templates[] */
    listTemplates(): readonly Readonly<PackTemplate>[];
    stampFor(type: string): { pack: string; pack_ver: string } | null;
    registerReplacement(mapping: NodeReplacementMapping): () => void;
    getReplacement(type: string): Readonly<NodeReplacementMapping> | null;
    listReplacements(): Readonly<NodeReplacementMapping>[];
}

export type GraphChangeKind = 'node-added' | 'node-removed' | 'link' | 'property' | 'widget' | 'layout' | 'group' | 'reroute' | 'subgraph' | 'node-replaced' | 'configure' | 'other';
export type ExecutionStateKind = 'status' | 'progress' | 'error' | 'reset';
export type ExecutionStatus = 'queued' | 'running' | 'done' | 'error' | 'skipped';
/** One execution-state message (protocol v1), shared by the in-page loop and the runner. */
export interface ExecutionStateMessage {
    v: 1;
    kind: ExecutionStateKind;
    /** the node's path ("3:7" inside a subgraph); null with "reset" means every node */
    path: string | null;
    status?: ExecutionStatus;
    value?: number;
    max?: number;
    message?: string;
    time: number;
}
export interface NodeExecutionState { status: ExecutionStatus; time: number; value?: number; max?: number; message?: string }
export declare class ExecutionState {
    static VERSION: 1;
    static KINDS: readonly ExecutionStateKind[];
    static STATUSES: readonly ExecutionStatus[];
    static create(kind: ExecutionStateKind, path: string | null, fields?: { status?: ExecutionStatus; value?: number; max?: number; message?: string; time?: number }): ExecutionStateMessage;
    static isMessage(message: unknown): message is ExecutionStateMessage;
    static apply(graph: LGraph, message: ExecutionStateMessage): LGraphNode | LGraph | null;
    static applyToNode(node: LGraphNode, message: ExecutionStateMessage): LGraphNode;
    static clear(graph: LGraph): void;
}

export type EventDropReason = 'reentry' | 'refreshing' | 'no-handler' | 'mode' | 'stopped-queue' | 'max-passes' | 'max-depth' | 'cycle' | 'once-per-frame';
export interface ExecutionModelRules {
    /** "immediate": actions run when sent; "deferred": actions to nodes that execute wait for their turn */
    delivery?: 'deferred' | 'immediate';
    /** "ancestors": pull ON_REQUEST data ancestors before actions, triggers and (frame_pull) ALWAYS nodes */
    refresh?: 'none' | 'ancestors';
    frame_pull?: boolean;
    /** each node executes at most once per frame */
    once_per_frame?: boolean;
    /** the mode new nodes of undeclared types get */
    default_mode?: number;
    title?: string;
    description?: string;
}
export interface ExecutionModel extends Required<Pick<ExecutionModelRules, 'delivery' | 'refresh' | 'frame_pull' | 'once_per_frame' | 'default_mode'>> {
    name: string;
    legacy: boolean;
    title?: string;
    description?: string;
}
/** Execution models and the engine (Wave 6); see the guide's Execution section. */
export declare class ExecutionEngine {
    static models: Map<string, ExecutionModel>;
    static LEGACY: { name: 'legacy'; legacy: true; title: string };
    static registerModel(name: string, rules?: ExecutionModelRules): ExecutionModel;
    static getModel(name: string): ExecutionModel | { name: 'legacy'; legacy: true; title: string } | null;
    static listModels(): Array<ExecutionModel | { name: 'legacy'; legacy: true; title: string }>;
    static resolveDefaultModel(): string;
    static modelNameFor(graph: LGraph): string;
    static rulesFor(graph: LGraph): ExecutionModel | { name: 'legacy'; legacy: true; title: string };
    /** pulls a node's ON_REQUEST data ancestors (memo per frame and call, link data versions) */
    static pull(node: LGraphNode): void;
    static ensureFresh(node: LGraphNode): void;
    static drop(node: LGraphNode | null, reason: EventDropReason, extra?: { setting?: string; message?: string }): false;
    static readonly maxEventDepth: number;
    static readonly maxEventPasses: number;
}
export declare const EVENT_DROP_REASONS: readonly EventDropReason[];
/** the legacy execution flags with their defaults and replacements (deprecated; removed no earlier than 0.20) */
export declare const LEGACY_EXECUTION_FLAGS: Readonly<Record<'use_deferred_actions' | 'refreshAncestorsOnTriggers' | 'refreshAncestorsOnActions' | 'ensureUniqueExecutionAndActionCall' | 'ensureNodeSingleExecution' | 'ensureNodeSingleAction' | 'preventAncestorRecalculation', { value: boolean; replacement: string }>>;

/** One drawn link segment (see LiteGraph.linkRouters, LiteGraph.linkStyles). */
export declare class RenderLink {
    constructor(options: { a: ArrayLike<number>; b: ArrayLike<number>; startDir?: number; endDir?: number; link?: LLink | null; color?: string | null; type?: string | number; kind?: 'link' | 'segment' | 'floating' | 'drag' });
    a: ArrayLike<number>;
    b: ArrayLike<number>;
    startDir: number;
    endDir: number;
    link: LLink | null;
    color: string | null;
    type: string | number | undefined;
    kind: 'link' | 'segment' | 'floating' | 'drag';
    readonly length: number;
}
export interface LinkRouter {
    /** adds the segment to the current path (moveTo first) */
    path(ctx: CanvasRenderingContext2D, renderLink: RenderLink, offsety?: number): void;
    /** the point at fraction t of the segment */
    point(renderLink: RenderLink, t: number): [number, number];
    /** corner points, for polyline routers */
    polyline?(renderLink: RenderLink): ArrayLike<number>[];
}
export declare class LinkRouterRegistry {
    static MODE_NAMES: Record<number, string>;
    static nameForMode(mode: number): string | null;
    register(name: string, router: LinkRouter): () => void;
    get(name: string): LinkRouter | null;
    list(): string[];
    polyline(name: string, renderLink: RenderLink): ArrayLike<number>[] | null;
}
export interface LinkStyle { visible?: boolean; alpha?: number; color?: string; width?: number; dash?: number[]; label?: string }
export interface LinkStyleContext { canvas: LGraphCanvas; selectedIds: Set<GraphId>; focusType: string | number | null; hiddenTypes: string[] }
export type LinkStyleResolver = (renderLink: RenderLink, ctx: LinkStyleContext) => LinkStyle | null | undefined;
export declare class LinkStyleRegistry {
    register(name: string, resolver: LinkStyleResolver): () => void;
    get(name: string): LinkStyleResolver | null;
    list(): string[];
    resolve(renderLink: RenderLink, ctx: LinkStyleContext, active: string[]): (LinkStyle & { visible: boolean; alpha: number }) | null;
}
export interface MiniMapOptions { width?: number; height?: number; margin?: number; container?: HTMLElement; layers?: string[] }
export type MiniMapLayer = (ctx: CanvasRenderingContext2D, minimap: MiniMap) => void;
/** A minimap of a canvas's open graph with decoration layers; redraws on events only. */
export declare class MiniMap {
    static DEFAULT_LAYERS: string[];
    static LAYERS: Record<string, MiniMapLayer>;
    constructor(canvas: LGraphCanvas, options?: MiniMapOptions);
    canvas: LGraphCanvas;
    element: HTMLCanvasElement | null;
    width: number;
    height: number;
    redraws: number;
    layers: { name: string; draw: MiniMapLayer }[];
    addLayer(name: string, draw: MiniMapLayer): () => void;
    requestDraw(): void;
    draw(): void;
    computeBounds(): [number, number, number, number];
    toMap(point: ArrayLike<number>): [number, number];
    toGraph(x: number, y: number): [number, number];
    nodeRect(node: LGraphNode): [number, number, number, number];
    centerOnMapPoint(x: number, y: number): void;
    centerOn(x: number, y: number): void;
    dispose(): void;
}

export interface LayoutModel {
    nodes: { id: GraphId; width: number; height: number; x: number; y: number }[];
    edges: { id: GraphId; source: GraphId; target: GraphId; sourceSlot: number; targetSlot: number }[];
}
export interface LayoutOptions { direction: 'LR' | 'RL' | 'TB' | 'BT'; spacing: { node: number; rank: number } }
export interface LayoutEngine {
    /** a LibraryManager key loaded before layout runs; its global is passed as `lib` */
    library?: string;
    /** top-left corners (title included) by node id */
    layout(model: LayoutModel, options: LayoutOptions, lib: any): { positions: Record<string, [number, number]> } | Promise<{ positions: Record<string, [number, number]> }>;
}
export declare class LayoutRegistry {
    static dagreEngine: LayoutEngine;
    static layeredEngine: LayoutEngine;
    static buildModel(graph: LGraph, nodes: LGraphNode[]): LayoutModel;
    /** adapts an elkjs instance */
    static elkEngine(elk: { layout(graph: object): Promise<any> }): LayoutEngine;
    register(name: string, engine: LayoutEngine): () => void;
    get(name: string): LayoutEngine | null;
    list(): string[];
}
export interface NodePalettePreview { type: string; title: string; icon: unknown; color: string | null; bgcolor: string | null; inputs: { name: string; type: unknown }[]; outputs: { name: string; type: unknown }[] }
export declare class NodePalette {
    static RECENT_LIMIT: number;
    static PREVIEW_SKIP_CAPABILITIES: string[];
    constructor(host: object);
    definitions(options?: { includeDeprecated?: boolean }): Readonly<NodeDefinition>[];
    list(options?: { query?: string; pack?: string; category?: string; favoritesOnly?: boolean }): (NodeDefinition & { favorite: boolean })[];
    groups(options?: { query?: string; pack?: string; category?: string; favoritesOnly?: boolean }): { pack: { id: string; title: string; builtin: boolean }; categories: { category: string; items: (NodeDefinition & { favorite: boolean })[] }[] }[];
    favorites(): string[];
    isFavorite(type: string): boolean;
    toggleFavorite(type: string, on?: boolean): boolean;
    recent(): string[];
    recordUse(type: string): void;
    preview(type: string): NodePalettePreview | null;
    /** inserts a node at a graph position, selected, one undo step */
    insert(canvas: LGraphCanvas, type: string, pos: ArrayLike<number>): LGraphNode | null;
}

export type MenuLocation = 'canvas' | 'node';
/** A ContextMenu item, `{command: id}` (runs a registered command), or null for a separator. */
export type MenuItem = { command: string; content?: string; [key: string]: any } | { content: string; callback?: (...args: any[]) => any; [key: string]: any } | null;
export type MenuProvider = (ctx: CommandContext & { node?: LGraphNode }) => MenuItem[] | null | undefined;
export declare class MenuRegistry {
    static LOCATIONS: MenuLocation[];
    constructor(commands: CommandRegistry);
    commands: CommandRegistry;
    register(location: MenuLocation, provider: MenuProvider): () => void;
    collect(location: MenuLocation, ctx?: object): MenuItem[];
    contribute<T extends any[]>(location: MenuLocation, ctx: object, options: T): T;
}

/** Context passed to BaseWidget.draw. */
export interface WidgetDrawEnv {
    canvas: LGraphCanvas;
    show_text: boolean;
    show_label: boolean;
    active: boolean;
    margin: number;
    colors: { outline: string; background: string; text: string; secondary: string };
}
/** Context passed to BaseWidget.onPointer. */
export interface WidgetPointerEnv {
    canvas: LGraphCanvas;
    node: LGraphNode;
    x: number;
    y: number;
    pos: Vector2;
    widget_width: number;
    old_value: any;
    ref_window: Window;
    /** applies a new value: widget value, onWidgetChanged, history, widget-changed event, property, callback */
    changed(widget: IWidget, value: any, old_value?: any): void;
}
/** Canvas widget base class; one subclass per widget type (see LiteGraph.registerWidgetType). */
export declare class BaseWidget<TValue = any, TOptions = any> {
    type: string;
    name: string | null;
    value: TValue;
    options: TOptions;
    constructor(init?: Partial<IWidget<TValue, TOptions>> & Record<string, any>);
    [key: string]: any;
    draw(ctx: CanvasRenderingContext2D, node: LGraphNode, widget_width: number, y: number, H: number, env: WidgetDrawEnv): void;
    onPointer(event: PointerEvent, env: WidgetPointerEnv): void;
    static drawPill(ctx: CanvasRenderingContext2D, widget_width: number, y: number, H: number, env: WidgetDrawEnv): void;
    static clampToOptions(value: number, options: { min?: number; max?: number }): number;
}
export declare class ButtonWidget extends BaseWidget {}
export declare class ToggleWidget extends BaseWidget<boolean> {}
export declare class SliderWidget extends BaseWidget<number> {}
export declare class NumberWidget extends BaseWidget<number> {}
export declare class ComboWidget extends BaseWidget {
    resolveValues(node: LGraphNode): any[] | Record<string, any>;
}
export declare class TextWidget extends BaseWidget<string> {}
/** A colour value: a swatch (click: the browser colour picker, alpha kept) and its text (click the label to type it). */
export declare class ColorWidget extends BaseWidget<string> {
    static lastPicker: HTMLInputElement | null;
}
/** A vector of numbers (options.size, from vec2/vec3/vec4): one draggable field per component. */
export declare class VectorWidget extends BaseWidget<number[], { size?: number; min?: number; max?: number; step?: number; precision?: number; round?: number }> {
    static size(widget: IWidget): number;
    static layout(widget: IWidget, ctx: CanvasRenderingContext2D | null, widget_width: number, env: { margin: number; show_label: boolean }): { size: number; start: number; cell: number };
}

/** Context given to PanelEditor.create. */
export interface PanelEditorContext {
    doc: Document;
    name: string;
    value: any;
    /** the value type's options merged with the property info */
    options: Record<string, any>;
    info: Record<string, any>;
    /** resolved value type name */
    type: string | null;
    valueType: Readonly<ResolvedValueType> | null;
    readonly: boolean;
    row: HTMLElement;
    /** the label element (number editors scrub on it) */
    label: HTMLElement;
    panel: PanelElement;
    target: any;
    /** final value: coerced, validated, applied as one undo step */
    commit(value: any): boolean;
    /** live value while dragging */
    preview(value: any): boolean;
    describe(text: string): void;
}
/** A panel editor (see LiteGraph.registerPanelEditor). */
export interface PanelEditor {
    create(ctx: PanelEditorContext): { element: HTMLElement; set(value: any): void; focus?(): void; destroy?(): void; onRowClick?(): void };
}
/** A section added to a side panel (see LiteGraph.registerPanelSection). */
export interface PanelSectionDefinition {
    id: string;
    panel: "node" | "options";
    title?: string;
    /** options panel: "graph", "canvas", "settings" (default) or a new tab id */
    tab?: string;
    tabTitle?: string;
    order?: number;
    collapsed?: boolean;
    when?(target: any, ctx: object): boolean;
    render(section: HTMLDetailsElement, ctx: { panel: PanelElement; section: HTMLDetailsElement; node?: LGraphNode; graph?: LGraph; canvas?: LGraphCanvas; tab?: string }): void;
}
export interface CanvasOptionInfo {
    label?: string;
    tooltip?: string;
    description?: string;
    examples?: string[];
    category?: "Rendering" | "Links" | "Interaction" | "Advanced" | string;
    type?: string;
    default?: any;
    /** shown even when not listed in LiteGraph.availableCanvasOptions */
    always?: boolean;
    /** "index": the canvas stores the index of the chosen value (links_render_mode) */
    store?: "index";
    values?: any[] | (() => any[]);
    [key: string]: any;
}
export interface PanelOptions {
    closable?: boolean;
    window?: Window;
    width?: number | string;
    height?: number | string;
    onOpen?(): void;
    onClose?(): void;
    /** remembers collapsed sections under this id */
    id?: string;
}
/** A row spec for PanelElement.addRow. */
export interface PanelRowSpec {
    name: string;
    value: any;
    /** property info: type, widget, editor, label, tooltip, description, examples, min, max, step, precision, unit, values, readonly, placeholder, default_value, ... */
    info?: Record<string, any>;
    label?: string;
    commit?(value: any): void | false;
    preview?(value: any): void;
    defaultValue?: any;
    keywords?: string[];
    target?: any;
    readonly?: boolean;
}
/** The element createPanel returns: the former panel API plus sections, tabs, a toolbar and typed rows. */
export interface PanelElement extends HTMLDivElement {
    header: HTMLElement;
    title_element: HTMLElement;
    actions: HTMLElement;
    toolbar: HTMLElement;
    tabbar: HTMLElement;
    content: HTMLElement;
    alt_content: HTMLElement;
    footer: HTMLElement;
    node?: LGraphNode;
    panel_id: string;
    filter_state: { query: string; modified: boolean; sort: string };
    close(): void;
    clear(): void;
    addDisposer(fn: () => void): void;
    toggleAltContent(force?: boolean): void;
    toggleFooterVisibility(force?: boolean): void;
    addHTML(code: string, classname?: string, on_footer?: boolean): HTMLDivElement;
    addNote(text: string, classname?: string): HTMLDivElement;
    addButton(name: string, callback: (e: Event) => void, options?: any): HTMLButtonElement;
    addSeparator(): HTMLDivElement;
    addWidget(type: string, name: string, value: any, options?: Record<string, any>, callback?: (name: string, value: any, options: Record<string, any>) => void): HTMLElement;
    addRow(spec: PanelRowSpec): HTMLElement & { value: any; setValue(value: any): void };
    addSection(title: string, options?: { id?: string; collapsed?: boolean; description?: string; className?: string }): HTMLDetailsElement & { body: HTMLElement };
    endSection(): void;
    addTabs(tabs: { id: string; title: string }[], active?: string): void;
    showTab(id: string): void;
    useTab(id: string | null): void;
    addToolbar(options?: { placeholder?: string; sorts?: { id: string; label: string }[]; sort?: string; modified?: boolean; onSort?(mode: string): void }): HTMLInputElement;
    setAllSections(open: boolean): void;
    applyFilter(): number;
    applySort(): void;
    refresh?(): void;
    [key: string]: any;
}
/** Builds side panels (see LGraphCanvas.createPanel). */
export declare class PanelBuilder {
    static create(title: string, options?: PanelOptions & { canvas?: LGraphCanvas }): PanelElement;
    static highlight(el: HTMLElement | null, query: string): void;
    /** builds the graph options panel of a canvas */
    static showGraphOptions(canvas: LGraphCanvas): PanelElement;
    /** builds the node details panel */
    static showNode(canvas: LGraphCanvas, node: LGraphNode): PanelElement;
    static extraEditors(): Record<string, PanelEditor>;
}
/** Places panels: docking side and width (settings LiteGraph.Panel.Side / Width), resize handle. */
export declare class PanelHost {
    static place(panel: PanelElement, parent: HTMLElement | null, options?: { side?: "left" | "right"; width?: number }): PanelElement;
    static setSide(panel: PanelElement, side: "left" | "right"): void;
}
/** The built-in panel editors. */
export declare function defaultPanelEditors(): Record<string, PanelEditor>;

/** A value type definition (see LiteGraph.registerValueType). Every field is optional. */
export interface ValueTypeDefinition {
    /** a type whose fields are inherited; options are merged, the base's first */
    base?: string;
    aliases?: string[];
    label?: string;
    description?: string;
    examples?: string[];
    /** canvas widget type (LiteGraph.widget_types) */
    widget?: string;
    /** panel editor (LiteGraph.panel_editors) */
    editor?: string;
    /** default widget and editor options; a property's own info wins */
    options?: Record<string, any>;
    default?: any;
    coerce?(value: any, options: Record<string, any>): any;
    /** null, or why the value is refused */
    validate?(value: any, options: Record<string, any>): string | null;
    format?(value: any, options: Record<string, any>): string;
    parse?(text: string, options: Record<string, any>): any;
    [key: string]: any;
}
export interface ResolvedValueType extends ValueTypeDefinition {
    name: string;
    aliases: string[];
    /** names of the base chain, nearest first */
    bases: string[];
    options: Readonly<Record<string, any>>;
}
/** Value types: one type -> canvas widget, panel editor, options, coercion, validation and help. */
export declare class ValueTypeRegistry {
    constructor();
    register(name: string, def: ValueTypeDefinition, options?: { replace?: boolean }): () => void;
    has(name: string): boolean;
    get(name: string): Readonly<ResolvedValueType> | null;
    list(): Readonly<ResolvedValueType>[];
    defaultValue(name: string, options?: Record<string, any>): any;
    coerce(name: string, value: any, options?: Record<string, any>): any;
    validate(name: string, value: any, options?: Record<string, any>): string | null;
    format(name: string, value: any, options?: Record<string, any>): string;
    parse(name: string, text: string, options?: Record<string, any>): any;
    /** the panel editor for a property: info.editor, info.widget, info.type, then the JS type of the value; else "readonly" */
    resolveEditor(info: Record<string, any> | null | undefined, value?: any, editors?: Record<string, any>): { editor: string; type: string | null; options: Record<string, any>; valueType: Readonly<ResolvedValueType> | null };
    /** the canvas widget class for a type: a registered widget type wins, then the value type's widget */
    resolveWidgetClass(type: string, widgetTypes?: Record<string, typeof BaseWidget>): { cls: typeof BaseWidget; options: Record<string, any>; valueType: Readonly<ResolvedValueType> | null } | null;
    static formatAny(value: any): string;
    static clampNumber(value: number, options?: { min?: number; max?: number }): number;
    static builtins(): Record<string, ValueTypeDefinition>;
}
export declare function defaultWidgetTypes(): Record<string, typeof BaseWidget>;
/** The object whose draw/onPointer applies to a widget (its class, or its type's class for plain objects), or null. */
export declare function widgetImplementation(widget: IWidget | null | undefined, types?: Record<string, typeof BaseWidget>): BaseWidget | null;
/** Arithmetic for number entry (+ - * / % **, parentheses, pi, e); NaN for anything else. Nothing is executed. */
export declare function evaluateMathExpression(text: string): number;

export interface NodeBadge {
    text: string;
    fgColor?: string;
    bgColor?: string;
}

export interface NodeTitleButton {
    name: string;
    text?: string;
    tooltip?: string;
    fgColor?: string;
    bgColor?: string;
    onClick?(node: LGraphNode, canvas: LGraphCanvas, e: any): void;
}

export interface NodeSearchQuery {
    terms: string[];
    filters: { i: string[]; o: string[]; c: string[]; s: string[] };
}
/** Node search without a DOM: `add i:number c:math s:core` (see src/nodesearch.js). */
export interface SubgraphComponentEntry {
    type: string;
    id: string;
    revision: number;
    definitions: Map<string, SubgraphDefinition>;
}
/** a subgraph definition (ComfyUI `definitions.subgraphs[]` entry) */
export interface SubgraphDefinition {
    id: string;
    name?: string;
    version?: number;
    revision?: number;
    inputs: SubgraphInterfaceSlot[];
    outputs: SubgraphInterfaceSlot[];
    inputNode?: { id: -10; bounding?: number[] };
    outputNode?: { id: -20; bounding?: number[] };
    widgets?: Array<{ id: GraphId; name: string }>;
    nodes: object[];
    links: object[];
    [key: string]: unknown;
}
export interface SubgraphInterfaceSlot {
    id: string;
    name: string;
    type: string;
    /** LiteGraph type when the string type cannot carry it (event ports: -1) */
    litegraph_type?: number;
    linkIds?: GraphId[];
    [key: string]: unknown;
}
/** document transforms between inline subgraphs and definitions (pure JSON) */
export declare const SubgraphDefs: {
    readonly IO_INPUT_NODE: -10;
    readonly IO_OUTPUT_NODE: -20;
    readonly IO_INPUT_BASE: number;
    readonly IO_OUTPUT_BASE: number;
    isInstanceData(node: unknown): boolean;
    linkObject(link: unknown[] | object): { id: GraphId; origin_id: GraphId; origin_slot: number; target_id: GraphId; target_slot: number; type: unknown; parentId?: number };
    canonical(definition: object): string;
    definitionOf(node: object, out?: Map<string, SubgraphDefinition>): SubgraphDefinition;
    materialize(definition: SubgraphDefinition, definitions: Map<string, SubgraphDefinition>, context?: { errors?: object[]; stack?: string[] }): object;
    collectDefinitions(doc: object, out?: Map<string, SubgraphDefinition>, warnings?: object[]): Map<string, SubgraphDefinition>;
    toInline(doc: object): { doc: object; definitions: Map<string, SubgraphDefinition>; errors: object[]; warnings: object[] };
    toDefinitions(doc: object, options?: { definitions?: Map<string, SubgraphDefinition> }): object;
    directDefinitionIds(data: object): Set<string>;
    findCycles(definitions: Map<string, SubgraphDefinition>): Set<string>;
};

export declare class NodeSearch {
    static FILTER_PREFIXES: string[];
    constructor();
    registerFilter(filter: { id: string; name?: string; predicate(def: NodeDefinition): boolean; enabled?(): boolean }): () => void;
    listFilters(): Array<{ id: string; name: string }>;
    passesFilters(def: NodeDefinition): boolean;
    static parseQuery(text: string): NodeSearchQuery;
    static matchesFilters(def: NodeDefinition, filters: NodeSearchQuery["filters"]): boolean;
    /** -1 when a word does not match */
    static score(def: NodeDefinition, query: Pick<NodeSearchQuery, "terms">): number;
    search(text: string | NodeSearchQuery, options?: { types?: string[]; limit?: number; applyFilters?: boolean }): Array<{ type: string; score: number; def: NodeDefinition }>;
}
