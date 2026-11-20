import { LiteGraph } from "./litegraph.js";
import { CallbackHandler } from "./callbackhandler.js";
import { LGraphCanvas } from "./lgraphcanvas.js";
import { LLink } from "./llink.js";
import { Reroute } from "./reroute.js";
import { LGraphEventTarget } from "./eventtarget.js";
import { SubgraphDefs } from "./subgraphdefs.js";

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
        return { lastNodeId: 0, lastLinkId: 0, lastGroupId: 0, lastRerouteId: 0 };
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

    get last_node_id() { return this.state.lastNodeId; }
    set last_node_id(value) { this.state.lastNodeId = value; }
    get last_link_id() { return this.state.lastLinkId; }
    set last_link_id(value) { this.state.lastLinkId = value; }

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
        LiteGraph.log_debug("Graph created",o);
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
        
        LiteGraph.processCallbackHandlers("on_lgraph_construct",{
            def_cb: LiteGraph.on_lgraph_construct
        }, this);
    }

    callbackhandler_setup(){
        this.cb_handler = new CallbackHandler(this);
    }

    registerCallbackHandler(){
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler(){
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers(){
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
        try { this.stop(); } catch (error) { errors.push(error); }
        this.status = LGraph.STATUS_STOPPED;

        this.state = LGraph.createState(); // also resets last_node_id / last_link_id
        /** subgraph definitions by id (meaningful on the root graph; see rootGraph) */
        this.subgraphs = new Map();

        // drop document fields kept from a previous configure
        for (const key in this._foreign_fields ?? {}) delete this[key];
        this._foreign_fields = {};

        this._version = -1; // used to detect changes

        // safe clear
        this._nodes?.slice().forEach((node) => {
            try {
                node.processCallbackHandlers("onRemoved", { def_cb: node.onRemoved, on_result: (value) => this._trackCleanup(value) }, this);
            } catch (error) {
                errors.push(error);
            } finally {
                if (node.subgraph) this._trackCleanup(node.subgraph.whenIdle());
                node.graph = null;
                node._waiting_actions = [];
                node.inputs?.forEach((input) => { input.link = null; });
                node.outputs?.forEach((output) => { output.links = null; });
            }
        });
        this._groups?.forEach((group) => { group.graph = null; });

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
        /** floating links: reroute chains left attached to one end (ComfyUI 0.4 floatingLinks); id -> link */
        this.floating_links = new Map();
        this._floating_links_field = false; // the loaded document had a floatingLinks field

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
        try { this.change(); } catch (error) { errors.push(error); }
        try { this.sendActionToCanvas("clear"); } catch (error) { errors.push(error); }
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
        this.config = Object.assign(this.config,opts);
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
        if ( ! (graphcanvas instanceof LGraphCanvas) ) {
            throw new Error("attachCanvas expects a LiteGraph.LGraphCanvas instance");
        }
        if (graphcanvas.graph && graphcanvas.graph != this) {
            LiteGraph.log_debug("lgraph","attachCanvas","detaching previous");
            graphcanvas.graph.detachCanvas(graphcanvas);
        }

        graphcanvas.graph = this;
        this.list_of_graphcanvas ??= [];
        var pos = this.list_of_graphcanvas.indexOf(graphcanvas);
        if (pos == -1) {
            LiteGraph.log_debug("lgraph","attachCanvas","attaching canvas");
            this.list_of_graphcanvas.push(graphcanvas);
        }else{
            LiteGraph.log_debug("lgraph","attachCanvas","canvas was already attached");
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
        LiteGraph.log_debug("lgraph","detachCanvas",pos,this.list_of_graphcanvas,this);
        this.list_of_graphcanvas.splice(pos, 1);
    }

    getCanvas(){
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
            try { await Promise.race([ready, mutation]); }
            finally { this._readinessWaiters.delete(changed); }
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
            this.processCallbackHandlers("onPlayEvent",{
                def_cb: this.onPlayEvent
            });
            this.sendEventToAllNodes("onStart");
        } catch (error) {
            try { this.stop(); } catch (cleanupError) { LiteGraph.log_error("Graph start cleanup failed", cleanupError); }
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
            this.processCallbackHandlers("onBeforeStep",{
                def_cb: this.onBeforeStep
            });
            this.runStep(1, !this.catch_errors);
            this.processCallbackHandlers("onAfterStep",{
                def_cb: this.onAfterStep
            });
        };

        if (interval === 0 && typeof window === "object" && window.requestAnimationFrame) {
            this.execution_timer_id = -1;
            onAnimationFrame();
        } else {
            this.execution_timer_id = setInterval(() => {
                this.processCallbackHandlers("onBeforeStep",{
                    def_cb: this.onBeforeStep
                });
                this.runStep(1, !this.catch_errors);
                this.processCallbackHandlers("onAfterStep",{
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
        try { this.processCallbackHandlers("onStopEvent", { def_cb: this.onStopEvent, on_result: (value) => this._trackCleanup(value) }); }
        catch (error) { errors.push(error); }
        try { this.sendEventToAllNodes("onStop", undefined, null); }
        catch (error) { errors.push(error); }
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
            return { error };
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
                    this._cleanupWait = Promise.all(batch).finally(() => { this._cleanupWait = null; });
                }
                const results = await this._cleanupWait;
                for (const result of results) if (result) errors.push(result.error);
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
        try { operation(); } catch (error) { errors.push(error); }
        try { await this.whenIdle(); } catch (error) { errors.push(error); }
        if (errors.length === 1) throw errors[0];
        if (errors.length) throw new AggregateError(errors, "Graph cleanup failed");
        return this;
    }

    stopAsync() { return this._cleanupAsync(() => this.stop()); }
    clearAsync() { return this._cleanupAsync(() => this.clear()); }
    removeAsync(node) { return this._cleanupAsync(() => this.remove(node)); }

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
                this.processCallbackHandlers("onExecuteStep", { def_cb: this.onExecuteStep });
                this.iteration++;
                this._emit("execution-step", { iteration: this.iteration });
                if (step + 1 < num) resetExecutionState();
            }
            this.processCallbackHandlers("onAfterExecute", { def_cb: this.onAfterExecute });
            this.errors_in_execution = false;
        } catch (error) {
            this.errors_in_execution = true;
            this._emit("node-error", { error, node: error?.node ?? this.nodes_executing?.at?.(-1) ?? null });
            try { this.stop(); } catch (cleanupError) { LiteGraph.log_error("Graph error cleanup failed", cleanupError); }
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
        var opts = Object.assign(optsDef,optsIn);

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
                    if(!visited[input.id]) {
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
                    try { node.sendEventToAllNodes(eventname, params, mode); }
                    finally { if (eventname === "onStop") this._trackCleanup(node.subgraph.whenIdle()); }
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
            if (typeof(c[action])=="function") {
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
        var opts = Object.assign(optsDef,optsIn);

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
            this.onGraphChanged({action: "groupAdd", doSave: opts.doProcessChange});
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

        node.processCallbackHandlers("onAdded",{
            def_cb: node.onAdded
        }, this);

        if (this.config.align_to_grid) {
            node.alignToGrid();
        }

        if (!skip_compute_order) {
            this.updateExecutionOrder();
        }

        this.processCallbackHandlers("onNodeAdded",{
            def_cb: this.onNodeAdded
        }, node);

        if (opts.doCalcSize) {
            // a node on the generic default size gets its computed size; a size assigned
            // by the node class or the caller is kept and only grown to fit
            node.autoSize(!node.hasDefaultSize?.());
        }
        // record after the node is in the graph, so the history snapshot contains it
        this.onGraphChanged({action: "nodeAdd", doSave: opts.doProcessChange});
        this._emit("node-added", { node });
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
            this.onGraphChanged({action: "groupRemove"});
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
        const cleanup = (fn) => { try { fn(); } catch (error) { errors.push(error); } };
        try {
            // this.beforeChange(); // sure? - almost sure is wrong

            // disconnect inputs
            if (node.inputs) {
                for (let i = 0; i < node.inputs.length; i++) {
                    let slot = node.inputs[i];
                    if (slot.link != null) {
                        cleanup(() => node.disconnectInput(i, {doProcessChange: false}));
                    }
                }
            }

            // disconnect outputs
            if (node.outputs) {
                for (let i = 0; i < node.outputs.length; i++) {
                    let slot = node.outputs[i];
                    if (slot.links != null && slot.links.length) {
                        cleanup(() => node.disconnectOutput(i, false, {doProcessChange: false}));
                    }
                }
            }

            // node.id = -1; //why?

            cleanup(() => node.processCallbackHandlers("onRemoved", { def_cb: node.onRemoved, on_result: (value) => this._trackCleanup(value) }, this));
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
            cleanup(() => this._removeFloatingLinksOf(node.id));
            this._notifyReadinessChange();

            this.updateExecutionOrder();
            cleanup(() => this.processCallbackHandlers("onNodeRemoved", { def_cb: this.onNodeRemoved }, node));

            cleanup(() => this.onGraphChanged({action: "nodeRemove"}));
            cleanup(() => this._emit("node-removed", { node }));

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
        if(!aMatchingGroups.length) return null;
        LiteGraph.log_verbose("lgraph","getGroupOnPos","matching groups by x,y",x,y,aMatchingGroups);
        // numeric comparator: a boolean result leaves the order engine-dependent
        let aSortedByYDistance = aMatchingGroups.sort((a,b) => Math.abs(a._pos[1]-y) - Math.abs(b._pos[1]-y));
        LiteGraph.log_verbose("lgraph","getGroupOnPos","sorted groups y distance",aSortedByYDistance);
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
        LiteGraph.log_debug("lgraph","trigger",action, param);
        // this.onTrigger?.(action, param);
        this.processCallbackHandlers("onTrigger",{
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
        this.inputs[name] = { name: name, type: type, value: value };
        this.onGraphChanged({action: "addInput"});
        this.afterChange();
        this.processCallbackHandlers("onInputAdded",{
            def_cb: this.onInputAdded
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange",{
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
        this.onGraphChanged({action: "renameInput"});

        this.processCallbackHandlers("onInputRenamed",{
            def_cb: this.onInputRenamed
        }, old_name, name);
        this.processCallbackHandlers("onInputsOutputsChange",{
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
        this.onGraphChanged({action: "changeInputType"});
        this.processCallbackHandlers("onInputTypeChanged",{
            def_cb: this.onInputTypeChanged
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange",{
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
        this.onGraphChanged({action: "graphRemoveInput"});

        this.processCallbackHandlers("onInputRemoved",{
            def_cb: this.onInputRemoved
        }, name);
        this.processCallbackHandlers("onInputsOutputsChange",{
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
        this.outputs[name] = { name: name, type: type, value: value };
        this.onGraphChanged({action: "addOutput"});

        this.processCallbackHandlers("onOutputAdded",{
            def_cb: this.onOutputAdded
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange",{
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

        this.processCallbackHandlers("onOutputRenamed",{
            def_cb: this.onOutputRenamed
        }, old_name, name);
        this.processCallbackHandlers("onInputsOutputsChange",{
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
        this.onGraphChanged({action: "changeOutputType"});
        this.processCallbackHandlers("onOutputTypeChanged",{
            def_cb: this.onOutputTypeChanged
        }, name, type);
        this.processCallbackHandlers("onInputsOutputsChange",{
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
        this.onGraphChanged({action: "removeOutput"});

        this.processCallbackHandlers("onOutputRemoved",{
            def_cb: this.onOutputRemoved
        }, name);
        this.processCallbackHandlers("onInputsOutputsChange",{
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
        this.processCallbackHandlers("onBeforeChange",{
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
            this._transaction = { depth: 0, label, changed: false };
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
            this.onGraphChanged({ action: transaction.label, doSave: true });
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
        const snapshot = options.rollback && !this._transaction ? this.serialize({ format: "inline" }) : null;
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
        this.processCallbackHandlers("onAfterChange",{
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
        this.processCallbackHandlers("onConnectionChange",{
            def_cb: this.onConnectionChange
        }, node);
        this.onGraphChanged({action: "connectionChange", doSave: false});
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
        this.processCallbackHandlers("on_change",{ // name refactor ? is this being used ?
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
        if(node) {
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
        return this._withoutFloatingLinks(() => this.transact("convertToSubgraph", () => {
            const subgraphNode = LiteGraph.createNode("graph/subgraph");
            this.add(subgraphNode);
            return subgraphNode.buildFromNodes(selected);
        }, { rollback: true }));
    }

    /** runs fn with floating links off: operations that rebuild links leave no floating chains */
    _withoutFloatingLinks(fn) {
        const was = this._suspend_floating_links;
        this._suspend_floating_links = true;
        try { return fn(); } finally { this._suspend_floating_links = was; }
    }

    /**
     * Replaces a subgraph node by its contents, as one undo step (see Subgraph.unpack).
     * @returns {Array<object>} the unpacked nodes
     */
    unpackSubgraph(subgraphNode) {
        if (subgraphNode?.graph !== this || typeof subgraphNode.unpack !== "function") return [];
        return this._withoutFloatingLinks(() => this.transact("unpackSubgraph", () => subgraphNode.unpack(), { rollback: true }));
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
    validateLinks({ repair = false } = {}) {
        const issues = [];
        const nodeOf = (id) => this.getNodeById(id);
        const remove = new Set();
        for (const key of Object.keys(this.links)) {
            const link = this.links[key];
            if (!link) {
                issues.push({ kind: "empty-link-entry", link_id: key });
                remove.add(key);
                continue;
            }
            const origin = nodeOf(link.origin_id);
            const target = nodeOf(link.target_id);
            const output = origin?.outputs?.[link.origin_slot];
            const input = target?.inputs?.[link.target_slot];
            if (!origin || !target || !output || !input) {
                issues.push({ kind: "dangling-link", link_id: link.id, node_id: !origin ? link.origin_id : link.target_id });
                remove.add(key);
                continue;
            }
            if (input.link != link.id) {
                issues.push({ kind: "link-not-referenced-by-input", link_id: link.id, node_id: target.id, slot: link.target_slot });
                remove.add(key);
                continue;
            }
            if (!output.links?.some((id) => id == link.id)) {
                issues.push({ kind: "link-missing-from-output", link_id: link.id, node_id: origin.id, slot: link.origin_slot });
                if (repair) (output.links ??= []).push(link.id);
            }
            if (link.parentId !== undefined && this.reroutes && !this.reroutes.has(link.parentId)) {
                issues.push({ kind: "missing-reroute", link_id: link.id });
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
                    issues.push({ kind: "input-references-bad-link", link_id: input.link, node_id: node.id, slot });
                    if (repair) input.link = null;
                }
            });
            node.outputs?.forEach((output, slot) => {
                if (!output.links) return;
                const kept = output.links.filter((id) => {
                    const link = valid(id);
                    const ok = !!link && link.origin_id == node.id && link.origin_slot == slot;
                    if (!ok) issues.push({ kind: "output-references-bad-link", link_id: id, node_id: node.id, slot });
                    return ok;
                });
                if (repair && kept.length !== output.links.length) output.links = kept.length ? kept : null;
            });
        }
        if (repair && issues.length) {
            this.setDirtyCanvas?.(true, true);
        }
        return { ok: issues.length === 0, repaired: repair && issues.length > 0, issues };
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
        this.onGraphChanged({action: "rerouteAdd"});
        this._emit("reroute-added", { reroute, link: link ?? null });
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
                if (reroute.parentId === undefined) delete link.parentId; else link.parentId = reroute.parentId;
            }
        }
        for (const other of this.reroutes.values()) {
            if (other.parentId === id) {
                if (reroute.parentId === undefined) delete other.parentId; else other.parentId = reroute.parentId;
            }
        }
        for (const [floatingId, floating] of this.floating_links) {
            if (floating.parentId !== id) continue;
            if (reroute.parentId === undefined) this.floating_links.delete(floatingId); // nothing left to keep
            else floating.parentId = reroute.parentId;
        }
        this.reroutes.delete(id);
        this.onGraphChanged({action: "rerouteRemove"});
        this._emit("reroute-removed", { reroute });
        this.setDirtyCanvas(true, true);
        return true;
    }

    /**
     * Routes a link through a reroute chain (`parentId`, the reroute nearest the target). Floating
     * links whose reroutes the link now uses are dropped: the chain is attached again.
     * @param {LLink} link
     * @param {number|undefined} parentId
     */
    routeLink(link, parentId) {
        if (!link) return;
        if (parentId === undefined || parentId === null || !this.reroutes.has(parentId)) delete link.parentId;
        else link.parentId = parentId;
        if (link.parentId === undefined || !this.floating_links.size) return;
        const chain = new Set(this.getRerouteChain(link).map((reroute) => reroute.id));
        for (const [id, floating] of this.floating_links) {
            if (chain.has(floating.parentId)) this.floating_links.delete(id);
        }
    }

    /**
     * Keeps the reroutes of a removed link as a floating link attached to the end that remains
     * (LiteGraph.keep_floating_reroutes). Nothing is kept when another link still uses the reroutes.
     * @param {LLink} link - already removed from graph.links
     * @param {"origin"|"target"} keep - the end that stays
     * @returns {object|null} the floating link
     */
    _keepFloatingLink(link, keep) {
        if (!LiteGraph.keep_floating_reroutes || this._suspend_floating_links || link?.parentId === undefined || !this.reroutes.has(link.parentId)) return null;
        if (this.getRerouteLinkIds().has(link.parentId)) return null; // still routed by another link
        const node = this.getNodeById(keep === "origin" ? link.origin_id : link.target_id);
        if (!node) return null;
        const id = Math.max(0, ...this.floating_links.keys()) + 1;
        const floating = keep === "origin"
            ? { id, origin_id: link.origin_id, origin_slot: link.origin_slot, target_id: -1, target_slot: -1, type: link.type, parentId: link.parentId }
            : { id, origin_id: -1, origin_slot: -1, target_id: link.target_id, target_slot: link.target_slot, type: link.type, parentId: link.parentId };
        this.floating_links.set(id, floating);
        return floating;
    }

    /** drops the floating links attached to a node */
    _removeFloatingLinksOf(nodeId) {
        for (const [id, floating] of this.floating_links) {
            if (floating.origin_id === nodeId || floating.target_id === nodeId) this.floating_links.delete(id);
        }
    }

    /**
     * The end a floating link is attached to.
     * @returns {{node: LGraphNode, slot: number, isOutput: boolean}|null}
     */
    getFloatingLinkEnd(floating) {
        const isOutput = floating.origin_id !== -1;
        const node = this.getNodeById(isOutput ? floating.origin_id : floating.target_id);
        return node ? { node, slot: isOutput ? floating.origin_slot : floating.target_slot, isOutput } : null;
    }

    /** floating links whose reroute chain passes through a reroute */
    getFloatingLinksThrough(rerouteId) {
        return [...this.floating_links.values()].filter((floating) =>
            this.getRerouteChain(floating).some((reroute) => reroute.id === rerouteId));
    }

    /** reroute id -> slot type ("output"/"input") for reroutes only floating links use */
    _floatingRerouteSlots(used = this.getRerouteLinkIds()) {
        const slots = new Map();
        for (const floating of this.floating_links.values()) {
            for (const reroute of this.getRerouteChain(floating)) {
                if (!used.has(reroute.id) && !slots.has(reroute.id)) slots.set(reroute.id, floating.origin_id !== -1 ? "output" : "input");
            }
        }
        return slots;
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
        this.floating_links = new Map();
        const extra = data.extra && typeof data.extra === "object" ? data.extra : {};
        const list = Array.isArray(data.reroutes) ? data.reroutes : Array.isArray(extra.reroutes) ? extra.reroutes : [];
        for (const item of list) {
            if (!item || typeof item.id !== "number") continue;
            this.reroutes.set(item.id, new Reroute(item.id, item.pos ?? [0, 0], item.parentId));
        }
        // floating links: kept when their reroute and the node they are attached to exist
        this._floating_links_field = Array.isArray(data.floatingLinks);
        for (const item of this._floating_links_field ? data.floatingLinks : []) {
            if (!item || typeof item.id !== "number" || !this.reroutes.has(item.parentId)) continue;
            const floating = {
                id: item.id, origin_id: item.origin_id ?? -1, origin_slot: item.origin_slot ?? -1,
                target_id: item.target_id ?? -1, target_slot: item.target_slot ?? -1, type: item.type, parentId: item.parentId,
            };
            if (this.getFloatingLinkEnd(floating)) this.floating_links.set(floating.id, floating);
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
            this.extra = { ...extra };
            delete this.extra.reroutes;
            delete this.extra.linkExtensions;
        }
        this.state.lastRerouteId = LGraph._maxNumericId(this.state.lastRerouteId, [...this.reroutes.keys()]);
    }

    /**
     * Creates a Object containing all the info about this graph, it can be serialized
     * @method serialize
     * @return {Object} value of the node
     */
    /**
     * @param {{format?: "inline"|"definitions"}} [options] - subgraph format of a root graph
     *   (default LiteGraph.subgraph_format). Both write the definition registry to
     *   definitions.subgraphs; "inline" also keeps each instance's inner graph, "definitions"
     *   replaces instances by references (ComfyUI form). Nested graphs always serialize inline.
     */
    serialize(options = {}) {
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
            state: { ...this.state }, // all id counters (nodes, links, groups, reroutes)
        });
        if (this.floating_links?.size || this._floating_links_field) {
            data.floatingLinks = [...this.floating_links.values()].map((floating) => ({ ...floating }));
        }
        if (!this._subgraph_node) data = this._serializeDefinitions(data, options.format ?? LiteGraph.subgraph_format);
        this.processCallbackHandlers("onSerialize",{
            def_cb: this.onSerialize
        }, data);
        
        LiteGraph.log_verbose("lgraph","serialize",data);

        return data;
    }

    /** the outermost graph: subgraph instances' inner graphs lead up through their nodes */
    get rootGraph() {
        let graph = this;
        while (graph._subgraph_node?.graph) graph = graph._subgraph_node.graph;
        return graph;
    }

    /**
     * Adds the definitions of subgraph instances (at any depth) that the root registry does not
     * know yet, taken from their current inner graphs.
     */
    registerSubgraphDefinitions({ sync = false } = {}) {
        const root = this.rootGraph;
        const visit = (graph, depth) => {
            if (depth > (LiteGraph.subgraph_max_depth ?? 32)) return;
            for (const node of graph._nodes) {
                if (!node?.subgraph) continue;
                const id = node.properties?.subgraph_id;
                if (typeof id === "string" && id) {
                    const known = root.subgraphs.has(id);
                    const edited = known && sync && node._definition_revision !== undefined && node.subgraph.revision !== node._definition_revision;
                    if (!known || edited) {
                        const found = new Map();
                        const definition = SubgraphDefs.definitionOf(node.serialize(), found);
                        if (edited) definition.revision = (root.subgraphs.get(id).revision ?? 0) + 1;
                        root.subgraphs.set(id, definition);
                        for (const [key, nested] of found) if (!root.subgraphs.has(key)) root.subgraphs.set(key, nested);
                    }
                    if (!known || edited || node._definition_revision === undefined) node._definition_revision = node.subgraph.revision;
                }
                visit(node.subgraph, depth + 1);
            }
        };
        visit(this, 0);
    }

    /** subgraph and function nodes (at any depth) that use a definition */
    findSubgraphInstances(id) {
        const found = [];
        const visit = (graph, depth) => {
            if (depth > (LiteGraph.subgraph_max_depth ?? 32)) return;
            for (const node of graph._nodes) {
                if (!node?.subgraph) continue;
                if (node.properties?.subgraph_id === id) found.push(node);
                visit(node.subgraph, depth + 1);
            }
        };
        visit(this.rootGraph, 0);
        return found;
    }

    /** root serialize: the definition registry, and in "definitions" format references for instances */
    _serializeDefinitions(data, format) {
        // instances edited without a commit (e.g. by code) bring their edit; siblings refresh only on commit
        this.registerSubgraphDefinitions({ sync: true });
        if (format === "definitions") return SubgraphDefs.toDefinitions(data, { definitions: this.subgraphs });
        if (this.subgraphs.size) {
            data.definitions = { ...(data.definitions ?? {}), subgraphs: [...this.subgraphs.values()].map((definition) => LiteGraph.cloneObject(definition)) };
        }
        return data;
    }

    /**
     * extra plus reroutes in the ComfyUI-compatible 0.4 form: reroutes that links use, and floating
     * ones (only floating links use them) with `floating: {slotType}`
     */
    _serializeExtra() {
        const used = this.getRerouteLinkIds();
        const floating = this._floatingRerouteSlots(used);
        if (!used.size && !floating.size) return this.extra;
        const extra = { ...this.extra };
        extra.reroutes = [
            ...[...used.keys()].map((id) => this.reroutes.get(id).serialize(used.get(id))),
            ...[...floating].map(([id, slotType]) => ({ ...this.reroutes.get(id).serialize([]), floating: { slotType } })),
        ].sort((a, b) => a.id - b.id);
        extra.linkExtensions = Object.values(this.links)
            .filter((link) => link && link.parentId !== undefined && used.has(link.parentId))
            .map((link) => ({ id: link.id, parentId: link.parentId }));
        return extra;
    }

    /**
     * Configure a graph from a JSON string
     * @method configure
     * @param {String} str configure a graph from a JSON string
     * @param {Boolean} returns if there was any error parsing
     */
    configure(data, keep_old) {
        this._configuring = (this._configuring ?? 0) + 1;
        try {
            return this._configure(data, keep_old);
        } finally {
            this._configuring--;
        }
    }

    /** true while this graph, or a graph containing it, is being configured (loading) */
    get isConfiguring() {
        for (let graph = this; graph; graph = graph._subgraph_node?.graph) {
            if (graph._configuring) return true;
        }
        return false;
    }

    _configure(data, keep_old) {
        if (!data) {
            return;
        }
        // listeners may inspect or migrate data, or cancel loading (returns null, graph unchanged)
        if (this._emit("configuring", { data, keep_old: !!keep_old }, { cancelable: true })?.defaultPrevented) {
            return null;
        }

        if (!keep_old) {
            this.clear();
        }

        // subgraph definitions: instances that reference one get their inner graph; the root keeps the registry
        let subgraphErrors = [];
        if (Array.isArray(data.definitions?.subgraphs)) {
            const inline = SubgraphDefs.toInline(data);
            data = inline.doc;
            subgraphErrors = inline.errors;
            for (const issue of [...inline.errors, ...inline.warnings]) LiteGraph.log_warn("lgraph", "configure", "subgraph definition", issue);
            if (!this._subgraph_node) {
                for (const [id, definition] of inline.definitions) this.subgraphs.set(id, definition);
            }
        }

        var nodes = data.nodes;

        // decode links info (they are very verbose)
        if (data.links && data.links.constructor === Array) {
            var links = [];
            for (var i = 0; i < data.links.length; ++i) {
                var link_data = data.links[i];
                if(!link_data) { // @BUG: "weird bug" originally
                    LiteGraph.log_warn("lgraph", "configure", "serialized graph link data contains errors, skipping.",link_data,i,data.links);
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
        const loadedState = { ...LGraph.createState(), ...(data.state && typeof data.state === "object" ? data.state : {}) };

        // copy all stored fields
        this._foreign_fields = {};
        for (let i in data) {
            if (["nodes", "groups", "id", "revision", "state", "reroutes", "floatingLinks", "subgraphs", "rootGraph"].includes(i)) continue; // handled explicitly
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
                this.add(node, true, {doProcessChange: false}); // add before configure, otherwise configure cannot create links
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
                this.add(group, true, {doProcessChange: false});
            });
        }

        this.updateExecutionOrder();
        if (!this._subgraph_node) this.registerSubgraphDefinitions();
        if (subgraphErrors.length) error = true;

        this.extra = data.extra ?? {};
        this._configureReroutes(data);
        if (!keep_old || Number.isFinite(data.revision)) {
            this.revision = Number.isFinite(data.revision) ? data.revision : 0;
        }

        this.processCallbackHandlers("onConfigure",{
            def_cb: this.onConfigure
        }, data);

        // TODO implement: when loading (configuring) a whole graph, skip calling graphChanged on every single configure
        if (!data._version) {
            this.onGraphChanged({action: "graphConfigure", doSave: false}); // this._version++;
        } else {
            LiteGraph.log_debug("lgraph", "configure", "skip onGraphChanged when configure passing version too!"); // atlasan DEBUG REMOVE
        }
        this.setDirtyCanvas(true, true);
        this._emit("configured", { data, error });
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
        if(url.constructor === File || url.constructor === Blob) {
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
            var data = JSON.parse( req.response );
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
        var opts = Object.assign(optsDef,optsIn);

        LiteGraph.log_debug("onGraphSaved",opts);

        this.savedVersion = this._version;
    }

    /**
    * Meant to serve the history-saving mechanism
    * @method onGraphSaved
    * @param {object} optsIn options
    */
    onGraphLoaded(optsIn = {}) {
        var optsDef = {};
        var opts = Object.assign(optsDef,optsIn);

        LiteGraph.log_debug("onGraphLoaded",opts);

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
        var opts = Object.assign(optsDef,optsIn);

        this._version++;
        if (opts.doSave && this._transaction) {
            // recorded once when the outermost transaction commits
            this._transaction.changed = true;
            return;
        }
        if (opts.doSave) {
            this.revision++; // a saved (user-level) change to the document
            this._emit("changed", { action: opts.action, revision: this.revision });
        }

        if(opts.action) {
            LiteGraph.log_debug("Graph change",opts.action);
        } else {
            LiteGraph.log_debug("Graph change, no action",opts);
        }

        // TAG: EXTENSION, COULD extract and MOVE history to feature ?
        if(opts.doSave && LiteGraph.actionHistory_enabled) {

            LiteGraph.log_debug("LG_history","onGraphChanged couldSAVE :: "+opts.action); // debug history
            
            var oHistory = { actionName: opts.action };
            if(opts.doSaveGraph) {
                // this seems a heavy method, but the alternative is way more complex: every action has to have its contrary
                oHistory = Object.assign(oHistory, { graphSave: this.serialize({ format: "inline" }) });
                LiteGraph.log_debug("LG_history","onGraphChanged SAVED",oHistory); // debug history
            }

            let obH = this.history;

            // check if pointer has gone back: remove newest
            while(obH.actionHistoryPtr < obH.actionHistoryVersions.length-1) {
                LiteGraph.log_debug("LG_history","popping: gone back? "+(obH.actionHistoryPtr+" < "+(obH.actionHistoryVersions.length-1))); // debug history
                obH.actionHistoryVersions.pop();
            }
            // check if maximum saves
            if(obH.actionHistoryVersions.length>=LiteGraph.actionHistoryMaxSave) {
                var olderSave = obH.actionHistoryVersions.shift();
                LiteGraph.log_debug("LG_history","maximum saves reached: "+obH.actionHistoryVersions.length+", remove older: "+olderSave); // debug history
                obH.actionHistory[olderSave] = false; // unset
            }

            // update pointer
            obH.actionHistoryPtr = obH.actionHistoryVersions.length;
            obH.actionHistoryVersions.push(obH.actionHistoryPtr);

            // save to pointer
            obH.actionHistory[obH.actionHistoryPtr] = oHistory;

            this.onGraphSaved({ iVersion: obH.actionHistoryPtr });

            LiteGraph.log_debug("LG_history","saved: "+obH.actionHistoryPtr,oHistory.actionName,obH.actionHistoryPtr); // debug history
        }
    }

    /**
    * Go back in action history
    * @method actionHistoryBack
    * @param {object} optsIn options
    */
    actionHistoryBack(optsIn = {}) {
        var optsDef = { steps: 1 };
        var opts = Object.assign(optsDef,optsIn);

        var obH = this.history;

        if (obH.actionHistoryPtr != undefined && obH.actionHistoryPtr >= 0) {
            obH.actionHistoryPtr -= opts.steps;
            LiteGraph.log_debug("LG_history","step back: "+obH.actionHistoryPtr); // debug history
            if (!this.actionHistoryLoad({iVersion: obH.actionHistoryPtr})) {
                LiteGraph.log_warn("LG_history","Load failed, restore pointer? "+obH.actionHistoryPtr); // debug history
                // history not found?
                obH.actionHistoryPtr += opts.steps;
                return false;
            }else{
                LiteGraph.log_debug("LG_history","loaded back: "+obH.actionHistoryPtr); // debug history
                LiteGraph.log_debug(this.history);
                return true;
            }
        }else{
            LiteGraph.log_debug("LG_history","is already at older state");
            return false;
        }
    }

    /**
    * Go forward in action history
    * @method actionHistoryForward
    * @param {object} optsIn options
    */
    actionHistoryForward(optsIn = {}) {
        var optsDef = { steps: 1 };
        var opts = Object.assign(optsDef,optsIn);

        var obH = this.history;

        if (obH.actionHistoryPtr<obH.actionHistoryVersions.length) {
            obH.actionHistoryPtr += opts.steps;
            LiteGraph.log_debug("LG_history","step forward: "+obH.actionHistoryPtr); // debug history
            if (!this.actionHistoryLoad({iVersion: obH.actionHistoryPtr})) {
                LiteGraph.log_warn("LG_history","Load failed, restore pointer? "+obH.actionHistoryPtr); // debug history
                // history not found?
                obH.actionHistoryPtr -= opts.steps;
                return false;
            }else{
                LiteGraph.log_debug("LG_history","loaded forward: "+obH.actionHistoryPtr); // debug history
                return true;
            }
        }else{
            LiteGraph.log_debug("LG_history","is already at newer state");
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
        var opts = Object.assign(optsDef,optsIn);

        var obH = this.history;

        if(obH.actionHistory[opts.iVersion] && obH.actionHistory[opts.iVersion].graphSave) {
            var tmpHistory = JSON.stringify(this.history);
            this.configure( obH.actionHistory[opts.iVersion].graphSave );
            this.history = JSON.parse(tmpHistory);
            LiteGraph.log_debug("history loaded: "+opts.iVersion,obH.actionHistory[opts.iVersion].actionName); // debug history
            this.onGraphLoaded({ iVersion: opts.iVersion });
            return true;
        }else{
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
        var opts = Object.assign(optsDef,optsIn);

        if(!node_from || !node_to || !node_from.outputs || !node_from.outputs.length || !node_to.inputs || !node_to.inputs.length){
            return false;
        }
        // cycle outputs
        // for(let iO in node_from.outputs){ // WARNING THIS GETS INDEXES AS STRING : ARE THOSE SAVED AS STRING AND IF SO WHY?
        for(let iO=0; iO<node_from.outputs.length; iO++){ // TODO: Check if outputs are keyed by string and when
            let output = node_from.outputs[iO];
            if(!opts.keep_alredy_connected){
                if(output.links !== null && output.links.length > 0){
                    continue;
                }
            }
            node_from.connectByType(iO, node_to, output.type,{
                preferFreeSlot: true
            });
        }
    }

    updateNodeLinks(node, is_input, slots_from, slots_to){
        LiteGraph.log_debug("lgraph","updateNodeLinks","looking for links", node.id, is_input, slots_from, slots_to)
        
        // cycle links
        for (var i in this.links) {
            var link_info = this.links[i];
            if (link_info===null || !link_info) {
                continue;
            }
            if(is_input){
                if(link_info.target_id == node.id){
                    // found link with target the node
                    if(link_info.target_slot == slots_from){
                        // found link with target the slot
                        LiteGraph.log_debug("lgraph","updateNodeLinks","updating link input", this.links[i], node, is_input, slots_from, slots_to)
                        this.links[i].target_slot = slots_to;
                    }
                }
            }else{
                if(link_info.origin_id == node.id){
                    // found link with origin the node
                    if(link_info.origin_slot == slots_from){
                        // found link with origin the slot
                        LiteGraph.log_debug("lgraph","updateNodeLinks","updating link output", this.links[i], node, is_input, slots_from, slots_to)
                        this.links[i].origin_slot = slots_to;
                    }
                }
            }
        }

    }
}
