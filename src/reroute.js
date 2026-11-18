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
        const o = { id: this.id, pos: [this.pos[0], this.pos[1]], linkIds: [...linkIds] };
        if (this.parentId !== undefined) o.parentId = this.parentId;
        return o;
    }
}
