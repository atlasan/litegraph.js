
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
