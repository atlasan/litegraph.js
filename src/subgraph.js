import { LiteGraph } from "./litegraph.js";
import { CallbackHandler } from "./callbackhandler.js";
import { LGraphNode } from "./lgraphnode.js";
import { SubgraphDefs } from "./subgraphdefs.js";

/**
 * extracted from base nodes
 */

// Subgraph: a node that contains a graph
export class Subgraph {

    static title = "Subgraph";
    static desc = "Graph inside a node";

    constructor() {

        this.size = [140, 80];
        // subgraph_id: the definition this instance uses (LGraph.subgraphs of the root graph)
        this.properties = { enabled: true, subgraph_id: LiteGraph.uuidv4() };
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
        return [["enabled", "boolean"]];
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
        setTimeout(function () {
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
        LiteGraph.log_debug("subgraph","onAction",...arguments);
        this.subgraph.onAction(action, param, options);
    }

    onExecute() {
        this.enabled = this.getInputOrProperty("enabled");
        if (!this.enabled) {
            return;
        }

        // send inputs to subgraph global inputs (a promoted widget gives the value of a free input)
        this._pushInputs();

        // execute
        LiteGraph.log_verbose("subgraph","onExecute","subgraph runStep",this.subgraph);
        this.subgraph.runStep();

        // send subgraph global outputs to outputs
        if (this.outputs) {
            for (let i = 0; i < this.outputs.length; i++) {
                let output = this.outputs[i];
                let value = this.subgraph.getOutputData(output.name);
                LiteGraph.log_verbose("subgraph","onExecute","outputDataSet", i, value);
                this.setOutputData(i, value);
            }
        }
    }

    sendEventToAllNodes(eventname, param, mode) {
        if (this.enabled || eventname === "onStop") {
            LiteGraph.log_debug("subgraph","sendEventToAllNodes",...arguments);
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
        LiteGraph.log_debug("subgraph","onSubgraphTrigger",...arguments);
        var slot = this.findOutputSlot(event);
        if (slot != -1) {
            LiteGraph.log_debug("subgraph","onSubgraphTrigger","triggerSlot",slot);
            this.triggerSlot(slot, param, null, options);
        }
    }

    onSubgraphNewInput(name, type) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            // add input to the node
            this.addInput(name, type);
        }
    }

    onSubgraphRenamedInput(oldname, name) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findInputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.name = name;
    }

    onSubgraphTypeChangeInput(name, type) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.type = type;
    }

    onSubgraphRemovedInput(name) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeInput(slot);
    }

    //* *** OUTPUTS ***********************************
    onSubgraphNewOutput(name, type) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            this.addOutput(name, type);
        }
    }

    onSubgraphRenamedOutput(oldname, name) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findOutputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.name = name;
    }

    onSubgraphTypeChangeOutput(name, type) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.type = type;
    }

    onSubgraphRemovedOutput(name) {
        if (this._refreshing) return; // refreshFromDefinition reconciles the slots itself
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeOutput(slot);
    }

    /** inputs into the inner graph; promoted widgets give the value of free inputs */
    _pushInputs() {
        this.inputs?.forEach((input, i) => {
            if (input.type === LiteGraph.ACTION || input.type === LiteGraph.EVENT) return;
            const promoted = this._promoted?.find((entry) => entry.name === input.name);
            const value = promoted && input.link == null ? promoted.widget.value : this.getInputData(i);
            this.subgraph.setInputData(input.name, value);
            if (promoted) this._applyPromoted(promoted, value);
        });
    }

    // --- promoted widgets: an interface input linked to an inner widget input shows that widget here ---

    /** the promotions of the inner graph: interface inputs whose links reach an inner widget input */
    _findPromotions() {
        const inner = this.subgraph;
        const found = [];
        for (const io of inner._nodes.filter((node) => node.type === "graph/input")) {
            for (const linkId of io.outputs?.[0]?.links ?? []) {
                const link = inner.links[linkId];
                const target = link && inner.getNodeById(link.target_id);
                const slot = target?.inputs?.[link.target_slot];
                const widget = slot ? target.getWidgetFromSlot?.(slot) : null;
                if (widget) {
                    found.push({ name: io.properties.name, io, node: target, innerWidget: widget, widgetIndex: target.widgets.indexOf(widget) });
                    break; // the first widget input wins
                }
            }
        }
        const order = (this.inputs ?? []).map((input) => input.name);
        return found.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    }

    /**
     * Builds the promoted widgets of this instance. Values: `values` (stored widgets_values, in
     * order), else the current promoted value, else the definition's default.
     */
    _syncPromotedWidgets(values) {
        const previous = new Map((this._promoted ?? []).map((entry) => [entry.name, entry.widget.value]));
        const definition = this.getDefinition?.();
        this.widgets = (this.widgets ?? []).filter((widget) => !widget._promoted);
        for (const input of this.inputs ?? []) if (input.widget && input._promoted_slot) { delete input.widget; delete input._promoted_slot; }
        this._promoted = this._findPromotions().map((entry, index) => {
            const stored = definition?.nodes?.find((node) => node.id === entry.node.id)?.widgets_values?.[entry.widgetIndex];
            const fallback = stored !== undefined ? stored : entry.innerWidget.value;
            const value = values && index < values.length ? values[index] : (previous.has(entry.name) ? previous.get(entry.name) : fallback);
            const options = LiteGraph.cloneObject(entry.innerWidget.options ?? {});
            delete options.property; delete options.socket;
            const widget = this.addWidget(entry.innerWidget.type, entry.name, value, () => this._applyPromoted(promoted), options);
            widget._promoted = true;
            const promoted = { ...entry, widget, defaultValue: fallback };
            const input = this.inputs?.find((slot) => slot.name === entry.name);
            if (input && !input.widget) { input.widget = { name: entry.name }; input._promoted_slot = true; }
            this._applyPromoted(promoted);
            return promoted;
        });
        this.serialize_widgets = this._promoted.length > 0 || this.serialize_widgets === true;
        this.setSize?.(this.computeSize());
        return this._promoted;
    }

    /** writes a promoted value into the inner widget (and its property), as the canvas would */
    _applyPromoted(promoted, value = promoted.widget.value) {
        const { node, innerWidget } = promoted;
        if (innerWidget.value === value) return;
        const old = innerWidget.value;
        innerWidget.value = value;
        node.processCallbackHandlers?.("onWidgetChanged", { def_cb: node.onWidgetChanged }, innerWidget.name, value, old, innerWidget);
        const property = innerWidget.options?.property;
        if (property && node.properties?.[property] !== undefined) node.properties[property] = value;
        innerWidget.callback?.(value, null, node, null, null, value);
    }

    /** true when an inner widget is promoted to this subgraph's interface */
    isWidgetPromoted(innerNode, widgetName) {
        return !!this._findPromotions().find((entry) => entry.node === innerNode && entry.innerWidget.name === widgetName);
    }

    /**
     * Promotes an inner widget: its widget input is linked from a new interface input, and this node
     * shows the widget. One undo step in the inner graph; linked instances follow on commit.
     * @returns {boolean}
     */
    promoteWidget(innerNode, widgetName) {
        const widget = innerNode?.widgets?.find((w) => w?.name === widgetName);
        if (!widget || innerNode.graph !== this.subgraph || this.isWidgetPromoted(innerNode, widgetName)) return false;
        let input = innerNode.getSlotFromWidget(widget);
        if (input?.link != null) return false; // the widget is fed by another link
        this.subgraph.transact("promoteWidget", () => {
            input ??= innerNode.addWidgetInput(widget);
            const io = this.exposeSlot(innerNode, innerNode.inputs.indexOf(input), false, [innerNode.pos[0] - 260, innerNode.pos[1]]);
            io?.setProperty("value", widget.value);
        });
        this._syncPromotedWidgets();
        return true;
    }

    /** removes a promotion: the interface input goes when it fed only this widget */
    unpromoteWidget(innerNode, widgetName) {
        const entry = this._findPromotions().find((e) => e.node === innerNode && e.innerWidget.name === widgetName);
        if (!entry) return false;
        this.subgraph.transact("unpromoteWidget", () => {
            const slot = innerNode.getSlotFromWidget(entry.innerWidget);
            if ((entry.io.outputs[0].links ?? []).length <= 1) this.subgraph.remove(entry.io);
            else innerNode.disconnectInput(innerNode.inputs.indexOf(slot));
            this._applyPromoted({ ...entry, widget: { value: entry.innerWidget.value } }); // keep what the widget shows
        });
        this._syncPromotedWidgets();
        return true;
    }

    /**
     * Instance fields this runtime does not model (e.g. ComfyUI's widgets_values of promoted
     * widgets) are kept and written back.
     */
    onConfigure(info) {
        this.kept_fields = {};
        for (const key of Object.keys(info ?? {})) {
            if (!Subgraph.MODELLED_FIELDS.includes(key) && key !== "widgets_values") this.kept_fields[key] = LiteGraph.cloneObject(info[key]);
        }
        // stored values: this node's own widgets first, the promoted ones last
        const promotions = this._findPromotions().length;
        const stored = Array.isArray(info?.widgets_values) ? info.widgets_values : undefined;
        const values = stored?.slice(Math.max(0, stored.length - promotions));
        if (promotions) this._syncPromotedWidgets(values);
        else if (stored) this.kept_fields.widgets_values = LiteGraph.cloneObject(stored); // nothing promoted here: keep them
    }

    onSerialize(data) {
        for (const [key, value] of Object.entries(this.kept_fields ?? {})) {
            if (!(key in data)) data[key] = LiteGraph.cloneObject(value);
        }
    }

    // --- definitions (see subgraphdefs.js and LGraph.subgraphs) ---

    /** the definition this node uses, from the root graph's registry */
    getDefinition() {
        return this.graph?.rootGraph?.subgraphs.get(this.properties.subgraph_id) ?? null;
    }

    /**
     * Inserted by paste, insert or clone (not while loading): the same id with the same content
     * stays linked; the same id with different content (another document's edit) becomes a new
     * definition, so it never silently replaces the one already here.
     */
    onAdded(graph) {
        if (!graph || graph.isConfiguring) return;
        const root = graph.rootGraph;
        const id = this.properties.subgraph_id;
        const known = root.subgraphs.get(id);
        if (!known || !this.subgraph._nodes.length) return; // registered when saved, or on commit
        const found = new Map();
        const mine = SubgraphDefs.definitionOf(this.serialize(), found);
        if (SubgraphDefs.canonical(mine) === SubgraphDefs.canonical(known)) {
            this._definition_revision = this.subgraph.revision;
            return;
        }
        this._assignNewDefinition(root, "forked on insert");
    }

    /** gives this node a new definition id, registered with its current content */
    _assignNewDefinition(root, reason) {
        const from = this.properties.subgraph_id;
        this.properties.subgraph_id = LiteGraph.uuidv4();
        this.subgraph.id = this.properties.subgraph_id;
        const found = new Map();
        const definition = SubgraphDefs.definitionOf(this.serialize(), found);
        root.subgraphs.set(definition.id, definition);
        for (const [key, nested] of found) if (!root.subgraphs.has(key)) root.subgraphs.set(key, nested);
        this._definition_revision = this.subgraph.revision;
        root._emit?.("subgraph-forked", { node: this, from, to: definition.id, reason });
        return definition.id;
    }

    /**
     * Makes this node's current inner graph its definition, and refreshes every other node linked to
     * it (one undo step on the root graph). Called when the canvas leaves the subgraph.
     * @returns {boolean} true when the definition changed
     */
    commitDefinition() {
        const root = this.graph?.rootGraph;
        if (!root) return false;
        const id = this.properties.subgraph_id;
        const found = new Map();
        const definition = SubgraphDefs.definitionOf(this.serialize(), found);
        const previous = root.subgraphs.get(id);
        for (const [key, nested] of found) if (key !== id && !root.subgraphs.has(key)) root.subgraphs.set(key, nested);
        if (previous && SubgraphDefs.canonical(previous) === SubgraphDefs.canonical(definition)) {
            this._definition_revision = this.subgraph.revision;
            return false;
        }
        definition.revision = (previous?.revision ?? 0) + 1;
        this._syncPromotedWidgets();
        root.transact("editSubgraph", () => {
            root.subgraphs.set(id, definition);
            this._definition_revision = this.subgraph.revision;
            for (const other of root.findSubgraphInstances(id)) {
                if (other !== this) other.refreshFromDefinition();
            }
            root.onGraphChanged({ action: "editSubgraph" });
        });
        root._emit?.("subgraph-definition-changed", { id, node: this, revision: definition.revision });
        return true;
    }

    /**
     * Rebuilds the inner graph from the registry definition. Outer slots follow the interface by
     * slot id (then name), so outer links survive renames and reorders; slots that are not part of
     * the interface (e.g. "enabled") stay after it. Inner nodes restart, as on load.
     * @returns {boolean}
     */
    refreshFromDefinition({ matchNames = false } = {}) {
        const root = this.graph?.rootGraph;
        const definition = root?.subgraphs.get(this.properties.subgraph_id);
        if (!definition) return false;
        const data = SubgraphDefs.materialize(definition, root.subgraphs);
        const ids = (type) => new Map(this.subgraph._nodes.filter((n) => n.type === type).map((n) => [n.properties.name, n.properties.slot_id]));
        // matchNames: slots without an inner IO node may still be interface slots (matched by name)
        const reserved = new Set(["call", "done", "enabled"]);
        const idOf = (type, slot) => ids(type).get(slot.name) ?? (matchNames && !reserved.has(slot.name) ? `name:${slot.name}` : null);
        const oldInputIds = (this.inputs ?? []).map((slot) => idOf("graph/input", slot));
        const oldOutputIds = (this.outputs ?? []).map((slot) => idOf("graph/output", slot));
        this._refreshing = true;
        try {
            this.subgraph.configure(data);
        } finally {
            this._refreshing = false;
        }
        this._reconcileSlots(true, oldInputIds, definition.inputs ?? []);
        this._reconcileSlots(false, oldOutputIds, definition.outputs ?? []);
        this._syncPromotedWidgets();
        this._definition_revision = this.subgraph.revision;
        this.setSize?.(this.computeSize());
        this.setDirtyCanvas?.(true, true);
        return true;
    }

    /** outer slots in interface order (matched by slot id, then name); extras after; links remapped */
    _reconcileSlots(isInput, oldIds, iface) {
        const list = (isInput ? this.inputs : this.outputs) ?? [];
        const used = new Set();
        const plan = []; // [old index or -1, interface slot or null]
        for (const slot of iface) {
            let j = oldIds.findIndex((id, index) => id === slot.id && !used.has(index));
            if (j < 0) j = list.findIndex((old, index) => !used.has(index) && oldIds[index] !== null && old.name === slot.name);
            if (j >= 0) used.add(j);
            plan.push([j, slot]);
        }
        const extras = [];
        list.forEach((old, j) => { if (!used.has(j) && oldIds[j] === null) { used.add(j); extras.push([j, null]); } });
        if (this._slot_extras_first) plan.unshift(...extras); else plan.push(...extras);
        // slots that left the interface lose their links
        for (let j = list.length - 1; j >= 0; j--) {
            if (used.has(j)) continue;
            if (isInput) this.disconnectInput(j); else this.disconnectOutput(j);
        }
        const typeOf = (slot) => (typeof slot.litegraph_type === "number" ? slot.litegraph_type
            : (slot.type === "event" ? LiteGraph.EVENT : slot.type));
        const next = plan.map(([j, slot]) => {
            const kept = j >= 0 ? list[j] : (isInput ? { link: null } : { links: null });
            if (slot) {
                kept.name = slot.name;
                kept.type = typeOf(slot);
            }
            return kept;
        });
        const links = this.graph?.links ?? {};
        next.forEach((slot, index) => {
            if (isInput && slot.link != null && links[slot.link]) links[slot.link].target_slot = index;
            if (!isInput) for (const id of slot.links ?? []) if (links[id]) links[id].origin_slot = index;
        });
        if (isInput) this.inputs = next; else this.outputs = next;
    }

    /**
     * Makes an inner slot part of the interface: a graph/input (for an inner input) or graph/output
     * (for an inner output) is added and linked; its name is the slot name, made unique. One undo
     * step in the inner graph; leaving the subgraph commits it to the linked instances.
     * @returns {object|null} the boundary node
     */
    exposeSlot(innerNode, slotIndex, isOutput, pos) {
        const inner = this.subgraph;
        const slot = isOutput ? innerNode?.outputs?.[slotIndex] : innerNode?.inputs?.[slotIndex];
        if (!slot || innerNode.graph !== inner) return null;
        const taken = isOutput ? inner.outputs : inner.inputs;
        const base = slot.name || (isOutput ? "out" : "in");
        let name = base, n = 2;
        while (taken?.[name] || ["enabled", "call", "done"].includes(name)) name = `${base}_${n++}`;
        const type = slot.type === LiteGraph.EVENT || slot.type === LiteGraph.ACTION ? "event" : (slot.type || "");
        let io = null;
        inner.transact("exposeSubgraphSlot", () => {
            io = LiteGraph.createNode(isOutput ? "graph/output" : "graph/input");
            io.pos = pos ? [pos[0], pos[1]] : [innerNode.pos[0] + (isOutput ? innerNode.size[0] + 80 : -260), innerNode.pos[1]];
            inner.add(io);
            io.setProperty("type", type);
            io.setProperty("name", name);
            if (isOutput) innerNode.connect(slotIndex, io, 0);
            else io.connect(0, innerNode, slotIndex);
        });
        this.setSize?.(this.computeSize());
        return io;
    }

    /**
     * Moves an interface slot up (-1) or down (+1) among the interface slots of this node; outer
     * links follow. Other linked instances follow by slot id when the definition is committed.
     * @returns {boolean}
     */
    moveInterfaceSlot(isInput, name, delta) {
        const list = isInput ? this.inputs : this.outputs;
        if (!list || !this.graph) return false;
        const names = new Set(this.subgraph._nodes.filter((n) => n.type === (isInput ? "graph/input" : "graph/output")).map((n) => n.properties.name));
        const from = list.findIndex((slot) => slot.name === name);
        if (from < 0 || !names.has(name)) return false;
        let to = from + Math.sign(delta);
        while (to >= 0 && to < list.length && !names.has(list[to].name)) to += Math.sign(delta);
        if (to < 0 || to >= list.length) return false;
        this.graph.transact("reorderSubgraphSlot", () => {
            [list[from], list[to]] = [list[to], list[from]];
            const links = this.graph.links;
            for (const index of [from, to]) {
                const slot = list[index];
                if (isInput && slot.link != null && links[slot.link]) links[slot.link].target_slot = index;
                if (!isInput) for (const id of slot.links ?? []) if (links[id]) links[id].origin_slot = index;
            }
            this.graph.onGraphChanged({ action: "reorderSubgraphSlot" });
        });
        this.subgraph.onGraphChanged({ action: "reorderInterface" }); // the definition changed: saved and committed
        this.setDirtyCanvas?.(true, true);
        return true;
    }

    /** this node gets its own copy of its definition (a new id); one undo step */
    makeUnique() {
        const root = this.graph?.rootGraph;
        if (!root) return null;
        let id = null;
        root.transact("makeSubgraphUnique", () => {
            id = this._assignNewDefinition(root, "make unique");
            root.onGraphChanged({ action: "makeSubgraphUnique" });
        });
        return id;
    }

    getExtraMenuOptions(graphcanvas) {
        var that = this;
        const linked = this.graph?.rootGraph?.findSubgraphInstances(this.properties.subgraph_id).length ?? 0;
        return [
            {
                content: linked > 1 ? `Make unique (${linked - 1} linked)` : "Make unique",
                disabled: linked < 2,
                callback: () => {
                    that.makeUnique();
                    graphcanvas.setDirty(true, true);
                },
            },
            {
                content: "Open",
                callback: function () {
                    graphcanvas.openSubgraph(that.subgraph);
                },
            },
            {
                content: "Unpack subgraph",
                callback: function () {
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
        // promoted values belong to this instance (widgets_values); the inner widgets keep the defaults
        for (const entry of this._promoted ?? []) {
            const inner = data.subgraph.nodes?.find((node) => node.id === entry.node.id);
            if (!inner) continue;
            if (Array.isArray(inner.widgets_values) && entry.widgetIndex >= 0) inner.widgets_values[entry.widgetIndex] = LiteGraph.cloneObject(entry.defaultValue);
            const property = entry.innerWidget.options?.property;
            if (property && inner.properties && property in inner.properties) inner.properties[property] = LiteGraph.cloneObject(entry.defaultValue);
        }
        return data;
    }

    // no need to define node.configure, the default method detects node.subgraph and passes the object to node.subgraph.configure()
    reassignSubgraphUUIDs(graph) {
        const idMap = { nodeIDs: {}, linkIDs: {} };

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
        // linked by default (one definition); with LiteGraph.Subgraph.PasteLinked off, a copy
        if (LiteGraph.settings?.get?.("LiteGraph.Subgraph.PasteLinked") === false) {
            data.properties = { ...data.properties, subgraph_id: LiteGraph.uuidv4() };
            if (data.subgraph) data.subgraph.id = data.properties.subgraph_id;
        }
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
            const fromIn = inSet.has(link.origin_id), toIn = inSet.has(link.target_id);
            if (!fromIn && toIn) {
                const key = `${link.origin_id}:${link.origin_slot}`;
                const target = graph.getNodeById(link.target_id);
                const entry = incoming.get(key) ?? { origin: link.origin_id, slot: link.origin_slot, type: linkType(link), name: target?.inputs?.[link.target_slot]?.name || "in", targets: [] };
                entry.targets.push({ node: link.target_id, slot: link.target_slot });
                incoming.set(key, entry);
            } else if (fromIn && !toIn) {
                const key = `${link.origin_id}:${link.origin_slot}`;
                const origin = graph.getNodeById(link.origin_id);
                const entry = outgoing.get(key) ?? { origin: link.origin_id, slot: link.origin_slot, type: linkType(link), name: origin?.outputs?.[link.origin_slot]?.name || "out", targets: [] };
                entry.targets.push({ node: link.target_id, slot: link.target_slot });
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
            data.inputs?.forEach((input) => { input.link = null; });
            data.outputs?.forEach((output) => { output.links = null; });
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
            let candidate = name, n = 2;
            while (taken.has(candidate)) candidate = `${name}_${n++}`;
            taken.add(candidate);
            return candidate;
        };
        const inputNames = new Set(), outputNames = new Set();
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
            if (link) outerSource.set(input.name, { node: graph.getNodeById(link.origin_id), slot: link.origin_slot });
        });
        const outerTargets = new Map(); // output name -> [{node, slot}]
        this.outputs?.forEach((output) => {
            outerTargets.set(output.name, (output.links ?? []).map((id) => graph.links[id]).filter(Boolean)
                .map((link) => ({ node: graph.getNodeById(link.target_id), slot: link.target_slot })));
        });

        // copies in the parent graph, laid out where the subgraph node was
        const minX = Math.min(...contents.map((node) => node.pos[0]));
        const minY = Math.min(...contents.map((node) => node.pos[1]));
        const copies = new Map();
        for (const node of contents) {
            const data = LiteGraph.cloneObject(node.serialize());
            data.inputs?.forEach((input) => { input.link = null; });
            data.outputs?.forEach((output) => { output.links = null; });
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
            return copies.has(link.origin_id) ? { node: copies.get(link.origin_id), slot: link.origin_slot } : null;
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
                plan.push([source, { node: copies.get(link.target_id), slot: link.target_slot }]);
            }
        }

        graph.remove(this);
        for (const copy of copies.values()) graph.add(copy);
        for (const [source, target] of plan) source.node.connect(source.slot, target.node, target.slot);
        return [...copies.values()];
    }

    static title_color = "#334";

    /** node fields the core serializer writes; other stored fields are kept (kept_fields) */
    static MODELLED_FIELDS = ["id", "type", "pos", "size", "flags", "order", "mode", "inputs", "outputs",
        "properties", "title", "color", "bgcolor", "boxcolor", "shape", "subgraph"];
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
            slot_id: LiteGraph.uuidv4(), // stable id of this interface input (definitions)
        };

        var that = this;

        this.name_widget = this.addWidget(
            "text",
            "Name",
            this.properties.name,
            function (v) {
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
            function (v) {
                that.setProperty("type", v);
            },
        );

        this.value_widget = this.addWidget(
            "number",
            "Value",
            this.properties.value,
            function (v) {
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
            this.value_widget.value = this.value_widget.value&&(this.value_widget.value+"").toLocaleLowerCase()!=="false"&&this.value_widget.value!==""?true:false; // "true"
        } else if (type == "string") {
            this.value_widget.type = "text";
            this.value_widget.value = this.value_widget.value+""; // ""
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
    onPropertyChanged(name, v, previous) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph?.inputs?.[v]) { // interface names are unique: values are keyed by name
                LiteGraph.log_warn("graph/input", "rename", `refused: the subgraph already has an input named "${v}"`);
                if (this.name_widget) this.name_widget.value = previous ?? this.name_in_graph;
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
            LiteGraph.log_debug("GraphInput","onAction","triggering slot", action, param);
            this.triggerSlot(0, param, null, options);
        }else{
            LiteGraph.log_debug("GraphInput","onAction","NOT eventAction TYPE", "this", this, "arugments", ...arguments);
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

    /** inside a subgraph: move this slot in the interface */
    getExtraMenuOptions() {
        const host = this.graph?._subgraph_node;
        if (!host?.moveInterfaceSlot) return [];
        return [
            { content: "Move up in the interface", callback: () => host.moveInterfaceSlot(true, this.properties.name, -1) },
            { content: "Move down in the interface", callback: () => host.moveInterfaceSlot(true, this.properties.name, 1) },
        ];
    }
}


// Output for a subgraph
export class GraphOutput {

    static title = "Output";
    static desc = "Output of the graph";

    constructor() {

        this.addInput("", "");

        this.name_in_graph = "";
        this.properties = { name: "", type: "", slot_id: LiteGraph.uuidv4() }; // slot_id: stable id of this interface output

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

    onPropertyChanged(name, v, previous) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph?.outputs?.[v]) { // interface names are unique: values are keyed by name
                LiteGraph.log_warn("graph/output", "rename", `refused: the subgraph already has an output named "${v}"`);
                if (this.name_widget) this.name_widget.value = previous ?? this.name_in_graph;
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
            LiteGraph.log_debug("GraphOutput","onAction", ...arguments);
            LiteGraph.log_debug("GraphOutput","onAction", "graphTrigger", this.properties.name, param);
            this.graph.trigger(this.properties.name, param, options);
        }else{
            LiteGraph.log_debug("GraphOutput","onAction","skipping not ACTION type", this.properties.type, this.properties);
        }
    }

    onRemoved() {
        if (this.name_in_graph) {
            this.graph.removeOutput(this.name_in_graph);
        }
    }

    /** inside a subgraph: move this slot in the interface */
    getExtraMenuOptions() {
        const host = this.graph?._subgraph_node;
        if (!host?.moveInterfaceSlot) return [];
        return [
            { content: "Move up in the interface", callback: () => host.moveInterfaceSlot(false, this.properties.name, -1) },
            { content: "Move down in the interface", callback: () => host.moveInterfaceSlot(false, this.properties.name, 1) },
        ];
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

/**
 * Calls a subgraph definition like a function: `call` pushes the inputs into its own copy of the
 * definition, runs one step, pulls the outputs and fires `done`. Inner event outputs pass through.
 * It does nothing on ordinary graph steps. Its copy keeps state between calls (counters, timers),
 * and is linked like a subgraph node: committing an edit refreshes it.
 * Older documents (func_subgraph_id: the id of a subgraph node in the same graph) migrate to that
 * node's definition.
 */
export class NodeFunction extends Subgraph {

    static title = "Function";
    static desc = "Calls a subgraph definition";

    constructor() {
        super();
        this.properties = { subgraph_id: null };
        this._slot_extras_first = true; // call/done stay above the interface slots
        this.addInput("call", LiteGraph.ACTION);
        this.addOutput("done", LiteGraph.EVENT);
        this.function_widget = this.addWidget("combo", "function", "", (value) => this.setDefinitionByLabel(value), {
            values: () => this.definitionLabels(),
        });
        this.addWidget("button", "call", null, () => this.call());
        this.serialize_widgets = false;
        this.size = [200, 80];
    }

    /** "Name · abcd" for every definition in the registry (the label picks it) */
    definitionLabels() {
        const root = this.graph?.rootGraph;
        return root ? [...root.subgraphs.values()].map((definition) => NodeFunction.labelOf(definition)) : [];
    }

    static labelOf(definition) {
        return `${definition.name ?? "Subgraph"} · ${String(definition.id).slice(0, 4)}`;
    }

    setDefinitionByLabel(label) {
        const root = this.graph?.rootGraph;
        const definition = root && [...root.subgraphs.values()].find((d) => NodeFunction.labelOf(d) === label);
        return definition ? this.setDefinition(definition.id) : false;
    }

    /** true when calling `id` from here would call a definition this node is inside of */
    wouldRecurse(id) {
        for (let graph = this.graph; graph; graph = graph._subgraph_node?.graph) {
            if (graph._subgraph_node?.properties?.subgraph_id === id) return true;
        }
        return false;
    }

    /**
     * Uses a definition of the root registry (one undo step on the root graph).
     * @returns {boolean} false when it is unknown or would call itself
     */
    setDefinition(id) {
        const root = this.graph?.rootGraph;
        const definition = root?.subgraphs.get(id);
        if (!definition) return false;
        if (this.wouldRecurse(id)) {
            LiteGraph.log_warn("graph/function", "setDefinition", `refused: ${definition.name ?? id} contains this function node (recursion)`);
            return false;
        }
        root.transact("functionDefinition", () => {
            this.properties.subgraph_id = id;
            this.subgraph.id = id;
            this.refreshFromDefinition();
            this.title = definition.name ?? NodeFunction.title;
            root.onGraphChanged({ action: "functionDefinition" });
        });
        if (this.function_widget) this.function_widget.value = NodeFunction.labelOf(definition);
        return true;
    }

    onConfigure(info) {
        Subgraph.prototype.onConfigure.call(this, info);
        // an older document: the definition of the subgraph node it pointed at
        const host = info?.properties?.func_subgraph_id;
        if (host !== undefined && host !== null && !info.properties.subgraph_id) this._migrate_host = host;
        delete this.properties.func_subgraph_id;
        const definition = this.getDefinition();
        if (definition && this.function_widget) this.function_widget.value = NodeFunction.labelOf(definition);
    }

    _migrate() {
        if (this._migrate_host === undefined || !this.graph) return;
        const host = this.graph.getNodeById(this._migrate_host);
        delete this._migrate_host;
        const id = host?.properties?.subgraph_id;
        if (typeof id !== "string") return;
        this.graph.rootGraph.registerSubgraphDefinitions();
        // the old node copied the host's slots: they match the interface by name
        this.properties.subgraph_id = id;
        this.subgraph.id = id;
        if (this.findInputSlot("call") < 0) this.addInput("call", LiteGraph.ACTION);
        if (this.findOutputSlot("done") < 0) this.addOutput("done", LiteGraph.EVENT);
        this.refreshFromDefinition({ matchNames: true });
        this.title = this.getDefinition()?.name ?? this.title;
    }

    /** runs the definition once with the current inputs; fires done */
    call(param, options = {}) {
        this._migrate();
        if (!this.getDefinition() && !this.subgraph._nodes.length) return false;
        const depth = NodeFunction._depth;
        const limit = LiteGraph.subgraph_max_depth ?? 32;
        if (depth >= limit) throw new Error(`graph/function: call depth limit reached (LiteGraph.subgraph_max_depth = ${limit})`);
        NodeFunction._depth = depth + 1;
        try {
            this._pushInputs();
            this.subgraph.runStep(1);
            this.outputs?.forEach((output, i) => {
                if (output.type === LiteGraph.EVENT || output.type === LiteGraph.ACTION) return;
                this.setOutputData(i, this.subgraph.getOutputData(output.name));
            });
        } finally {
            NodeFunction._depth = depth;
        }
        this.triggerSlot(this.findOutputSlot("done"), param, null, options);
        return true;
    }

    onAction(action, param, options) {
        if (action === "call") return this.call(param, options);
        this._migrate();
        this.subgraph.onAction(action, param, options); // an interface event input
        // the inner graph only steps on call: deliver the event chain now (deferred actions)
        for (let pass = 0; pass < 64; pass++) {
            const waiting = this.subgraph._nodes.filter((node) => node._waiting_actions?.length);
            if (!waiting.length) break;
            for (const node of waiting) node.executePendingActions();
        }
    }

    onExecute() {
        // only calls run the definition
        this._migrate();
    }

    serialize() {
        this._migrate();
        const data = Subgraph.prototype.serialize.call(this);
        if (typeof this.properties.subgraph_id !== "string") delete data.subgraph; // nothing picked yet
        return data;
    }

    getExtraMenuOptions(graphcanvas) {
        return Subgraph.prototype.getExtraMenuOptions.call(this, graphcanvas).filter((option) => !/^Unpack/.test(option?.content ?? ""));
    }

    /** slots and widgets (the subgraph node's size ignores widgets) */
    computeSize() {
        const size = LGraphNode.prototype.computeSize.call(this);
        size[0] = Math.max(size[0], 220);
        return size;
    }

    // the subgraph node's slot dialogs edit the outer slots only: not for a function
    onDrawBackground() {}
    onMouseDown() {}
    onResize() {}
}

NodeFunction._depth = 0;
