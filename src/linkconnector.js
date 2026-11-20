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
 *
 * Lifecycle: `onEvent(type, detail)` (set by the canvas) receives "link-drag-start" when a drag
 * starts and "link-drag-end" when it ends, with `outcome` "connected", "rejected" (dropped on a
 * node that refused it), "dropped" (on empty space) or "cancelled".
 */
export class LinkConnector {
    constructor() {
        /** @type {((type: string, detail: object) => void) | null} */
        this.onEvent = null;
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
        /** reroute the drag started from: a new link is routed through it */
        this.reroute = null;
        this._routeId = undefined;
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
        this._restart();
        this._attachOutput(node, slot);
        this._started();
        return this;
    }

    /** start a new link from an input slot */
    startFromInput(node, slot) {
        this._restart();
        this._attachInput(node, slot);
        this._started();
        return this;
    }

    /**
     * Start a new link from a reroute: it leaves the output feeding the reroute and is routed
     * through it (and the reroutes before it).
     * @param {Reroute} reroute
     * @param {LGraph} graph
     * @returns {boolean} false when no link passes through the reroute
     */
    startFromReroute(reroute, graph) {
        const end = LinkConnector.rerouteEnd(reroute, graph);
        if (!end) return false;
        this._restart();
        if (end.isOutput) this._attachOutput(end.node, end.slot);
        else this._attachInput(end.node, end.slot);
        this.reroute = reroute;
        this._routeId = end.parentId;
        this.pos = [reroute.pos[0], reroute.pos[1]];
        this._started();
        return true;
    }

    /**
     * Where a link started from a reroute is anchored: the output feeding it (a link passes through
     * it, or a floating link attached to an output), or the input a floating link is attached to.
     * `parentId` is the route the new link takes.
     * @returns {{node, slot: number, isOutput: boolean, parentId: number}|null}
     */
    static rerouteEnd(reroute, graph) {
        if (!reroute || !graph) return null;
        for (const id of graph.getRerouteLinkIds?.().get(reroute.id) ?? []) {
            const link = graph.links[id];
            const node = link && graph.getNodeById(link.origin_id);
            if (node) return { node, slot: link.origin_slot, isOutput: true, parentId: reroute.id };
        }
        for (const floating of graph.getFloatingLinksThrough?.(reroute.id) ?? []) {
            const end = graph.getFloatingLinkEnd(floating);
            if (!end) continue;
            // towards an output the route ends at this reroute; towards an input it is the whole chain
            return { ...end, parentId: end.isOutput ? reroute.id : floating.parentId };
        }
        return null;
    }

    /**
     * The slot a drop on `target`'s body would connect to: a compatible free slot first, then any
     * compatible slot, then a generic one. -1 when none (the drop may still create an event slot).
     * @returns {number}
     */
    findTargetSlot(target) {
        if (!this.isConnecting || !target || target === this.node) return -1;
        const isInput = !!this.output; // dragging from an output looks for an input
        const type = this.type ?? 0;
        let slot = target.findSlotByType?.(isInput, type, false, true) ?? -1;
        if (slot < 0 && ![0, "", "*"].includes(type)) slot = target.findSlotByType?.(isInput, 0, false, true) ?? -1;
        return slot;
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
        this._restart();
        this._attachOutput(origin, link.origin_slot);
        this._beginMove(graph, [link]);
        node.disconnectInput(slot);
        this._started();
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
        this._restart();
        this._attachInput(first, links[0].target_slot);
        this.movingInputs = links.map((link) => ({ node: graph.getNodeById(link.target_id), slot: link.target_slot }));
        this._beginMove(graph, links);
        node.disconnectOutput(slot);
        this._started();
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
        if (targetSlot === -1) targetSlot = this.findTargetSlot(target);
        const connect = () => {
            if (this.output) {
                const link = targetSlot !== -1
                    ? this.node.connect(this.slot, target, targetSlot)
                    : this.node.connectByType(this.slot, target, this.type);
                this._keepRoute(link, (d) => d.origin_id === this.node.id && d.origin_slot === this.slot);
                this._routeThroughReroute(graph, link);
                return link;
            }
            const inputs = this.movingInputs ?? [{ node: this.node, slot: this.slot }];
            let result = null;
            for (const { node, slot } of inputs) {
                result = targetSlot !== -1
                    ? target.connect(targetSlot, node, slot)
                    : node.connectByTypeOutput(slot, target, this.type);
                this._keepRoute(result, (d) => d.target_id === node.id && d.target_slot === slot);
                this._routeThroughReroute(graph, result);
            }
            return result;
        };
        let result;
        const ended = this._snapshot();
        try {
            result = graph?.transact && !this._graph ? graph.transact("connectLink", connect) : connect();
        } finally {
            this._finishTransaction();
            this.reset();
        }
        this._emit("link-drag-end", { ...ended, outcome: result ? "connected" : "rejected", link: result || null, target });
        return result;
    }

    /**
     * Drop the link on empty space: moved links stay detached. Returns what was being dragged so
     * the canvas can offer a menu or search to create a node for it.
     * @returns {{node, slot: number, output: object|null, input: object|null, type: *}|null}
     */
    dropOnEmpty() {
        if (!this.isConnecting) return null;
        const dropped = { node: this.node, slot: this.slot, output: this.output, input: this.input, type: this.type };
        const ended = this._snapshot();
        this._finishTransaction();
        this.reset();
        this._emit("link-drag-end", { ...ended, outcome: "dropped", link: null });
        return dropped;
    }

    /** abandon the drag; moved links are reconnected as they were */
    cancel() {
        const ended = this.isConnecting ? this._snapshot() : null;
        if (this.detached) {
            for (const link of this.detached) {
                const graph = this._graph;
                const origin = graph?.getNodeById(link.origin_id);
                const target = graph?.getNodeById(link.target_id);
                if (origin && target) {
                    const restored = origin.connect(link.origin_slot, target, link.target_slot);
                    if (restored && link.parentId !== undefined) LinkConnector._route(graph, restored, link.parentId);
                }
            }
        }
        this._finishTransaction();
        this.reset();
        if (ended) this._emit("link-drag-end", { ...ended, outcome: "cancelled", link: null });
        return null;
    }

    /** a new drag replaces the one in progress (whose move transaction is committed) */
    _restart() {
        this._finishTransaction();
        this.reset();
    }

    /** what is being dragged, for the lifecycle events */
    _snapshot() {
        return {
            node: this.node, slot: this.slot, output: this.output, input: this.input, type: this.type,
            moving: this.isMoving, reroute: this.reroute,
        };
    }

    _started() {
        this._emit("link-drag-start", this._snapshot());
    }

    _emit(type, detail) {
        if (typeof this.onEvent !== "function") return;
        try { this.onEvent(type, detail); } catch (error) { console.error?.(`LinkConnector ${type} listener failed`, error); }
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
        this.detached = links.map(({ origin_id, origin_slot, target_id, target_slot, parentId }) =>
            ({ origin_id, origin_slot, target_id, target_slot, ...(parentId !== undefined ? { parentId } : {}) }));
        if (graph?.beginTransaction) {
            graph.beginTransaction("moveLink");
            this._graph = graph;
        }
    }

    /** a moved link keeps the reroutes of the link it replaces */
    _keepRoute(link, matches) {
        if (!link || typeof link !== "object" || !this.detached) return;
        const original = this.detached.find(matches);
        if (original?.parentId !== undefined && link.parentId === undefined) LinkConnector._route(this._graph ?? this.node?.graph, link, original.parentId);
    }

    /** a link started from a reroute is routed through it */
    _routeThroughReroute(graph, link) {
        if (!link || typeof link !== "object" || !this.reroute || this._routeId === undefined) return;
        if (!graph?.reroutes?.has(this._routeId)) return;
        LinkConnector._route(graph, link, this._routeId);
        graph.onGraphChanged?.({ action: "linkRoute" });
    }

    /** sets a link's route; through the graph when it can (floating links are re-attached) */
    static _route(graph, link, parentId) {
        if (typeof graph?.routeLink === "function") graph.routeLink(link, parentId);
        else link.parentId = parentId;
    }

    _finishTransaction() {
        const graph = this._graph;
        this._graph = null;
        if (graph?.isInTransaction) graph.commitTransaction();
    }
}
