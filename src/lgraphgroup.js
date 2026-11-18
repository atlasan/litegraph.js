import { LiteGraph } from "./litegraph.js";
import { CallbackHandler } from "./callbackhandler.js";

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

    callbackhandler_setup(){
        this.cb_handler = new CallbackHandler(this);
    }

    registerCallbackHandler(){
        if(!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.registerCallbackHandler(...arguments);
    }
    unregisterCallbackHandler(){
        if(!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    }
    processCallbackHandlers(){
        if(!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
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
        // this._bounding.set(o.bounding); // TODO original, will remove this comment: Happens that arrays are sometimes (strangely) exported as object with keyed strings: eg. [v0, v1] to {"0": v0, "1": v1}
        // this._bounding = LiteGraph.parseStringifyObject(o.bounding, this._bounding); // tried specific cleaner implementation, reverted to cloneObject
        this._bounding = LiteGraph.cloneObject(o.bounding, this._bounding);
        this.color = o.color;
        if(o.font_size)
            this.font_size = o.font_size;
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
            group.getBounding(group_bounding);
            return LiteGraph.isBoundingInsideRectangle(group_bounding, ...this._bounding)
            // return LiteGraph.overlapBounding(this._bounding, group_bounding, -LGraphGroup.opts.inclusion_distance);
        });
    }

    getBounding = function(){ LiteGraph.LGraphNode.prototype.getBounding.call(this,...arguments); };
    isPointInside = LiteGraph.LGraphNode.prototype.isPointInside;
    setDirtyCanvas = LiteGraph.LGraphNode.prototype.setDirtyCanvas;
}
