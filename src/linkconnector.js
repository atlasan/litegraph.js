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
        this.movingInputs = links.map((link) => ({ node: graph.getNodeById(link.target_id), slot: link.target_slot }));
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
                return targetSlot !== -1
                    ? this.node.connect(this.slot, target, targetSlot)
                    : this.node.connectByType(this.slot, target, this.type);
            }
            const inputs = this.movingInputs ?? [{ node: this.node, slot: this.slot }];
            let result = null;
            for (const { node, slot } of inputs) {
                result = targetSlot !== -1
                    ? target.connect(targetSlot, node, slot)
                    : node.connectByTypeOutput(slot, target, this.type);
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
        const dropped = { node: this.node, slot: this.slot, output: this.output, input: this.input, type: this.type };
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
                if (origin && target) origin.connect(link.origin_slot, target, link.target_slot);
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
        this.detached = links.map(({ origin_id, origin_slot, target_id, target_slot }) => ({ origin_id, origin_slot, target_id, target_slot }));
        if (graph?.beginTransaction) {
            graph.beginTransaction("moveLink");
            this._graph = graph;
        }
    }

    _finishTransaction() {
        const graph = this._graph;
        this._graph = null;
        if (graph?.isInTransaction) graph.commitTransaction();
    }
}
