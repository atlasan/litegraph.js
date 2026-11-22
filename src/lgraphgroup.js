import { LiteGraph } from "./litegraph.js";
import { installHooks } from "./callbackhandler.js";

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
        if(o.font_size)
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
            ...(this.id !== undefined ? { id: this.id } : {}),
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
        if(isNaN(deltax))
            console.error?.("LGraphGroup.move() deltax NaN");
        if(isNaN(deltay))
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
     * Nodes whose type declares the mode invalid keep theirs: they are listed in `changed.skipped`.
     * @returns {Array<object>} the nodes changed, with `skipped` (the nodes that refused the mode)
     */
    setNodesMode(mode) {
        const changed = [];
        // the nodes that refused the mode (not enumerable: the result stays a plain list)
        Object.defineProperty(changed, "skipped", { value: [], enumerable: false });
        if (!this.graph) return changed;
        this.recomputeInsideNodes();
        for (const node of this._nodes.filter((n) => n.mode !== mode)) {
            const ok = node.changeMode ? node.changeMode(mode) !== false : ((node.mode = mode), true);
            (ok ? changed : changed.skipped).push(node);
        }
        if (changed.skipped.length) {
            LiteGraph.log_warn("lgraphgroup", "setNodesMode", `${changed.skipped.length} node(s) kept their mode: ${changed.skipped.map((n) => n.mode_refusal ?? n.type).join("; ")}`);
        }
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

// the hook API (registerCallbackHandler, processCallbackHandlers, onHook, ...)
installHooks(LGraphGroup);
