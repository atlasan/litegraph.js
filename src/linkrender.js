import { LiteGraph } from "./litegraph.js";

/**
 * Link drawing in three pieces (Wave 4c, idea H1):
 * - `RenderLink`: what one drawn link segment is (ends, directions, the link, colour).
 * - `LinkRouterRegistry` (`LiteGraph.linkRouters`): how a segment's path runs between its ends.
 *   Built-in routers: "spline", "linear", "straight" (the classic `links_render_mode` values).
 * - `LinkStyleRegistry` (`LiteGraph.linkStyles`): how a link looks right now. Resolvers return
 *   `{visible, alpha, color, width, dash, label}` and compose in the order they are active.
 *   Built-in: "spotlight", "dim-by-type", "hidden", "labelled".
 *
 * Design reference: the RenderLink / link renderer split in Comfy-Org/litegraph.js (MIT); this is
 * an independent implementation.
 */
export class RenderLink {
    /**
     * @param {object} options
     * @param {number[]} options.a - start point (graph space)
     * @param {number[]} options.b - end point
     * @param {number} [options.startDir] - LiteGraph.RIGHT, LEFT, UP, DOWN, CENTER
     * @param {number} [options.endDir]
     * @param {object|null} [options.link] - the LLink drawn (null for a drag preview or a floating link)
     * @param {string|null} [options.color]
     * @param {string|number} [options.type] - the slot type
     * @param {"link"|"segment"|"floating"|"drag"} [options.kind]
     */
    constructor({ a, b, startDir = LiteGraph.RIGHT, endDir = LiteGraph.LEFT, link = null, color = null, type, kind = "link" } = {}) {
        this.a = a;
        this.b = b;
        this.startDir = startDir || LiteGraph.RIGHT;
        this.endDir = endDir || LiteGraph.LEFT;
        this.link = link;
        this.color = color;
        this.type = type ?? link?.type;
        this.kind = kind;
    }

    get length() {
        return Math.hypot(this.b[0] - this.a[0], this.b[1] - this.a[1]);
    }
}

const linkDirUnit = (dir) => [
    dir == LiteGraph.LEFT ? -1 : dir == LiteGraph.RIGHT ? 1 : 0,
    dir == LiteGraph.UP ? -1 : dir == LiteGraph.DOWN ? 1 : 0,
];

/** point at fraction t (0..1) of the length of a polyline */
function linkPointOnPolyline(points, t) {
    const lengths = [];
    let total = 0;
    for (let i = 1; i < points.length; ++i) {
        const len = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        lengths.push(len);
        total += len;
    }
    if (!total) return [points[0][0], points[0][1]];
    let target = Math.min(Math.max(t, 0), 1) * total;
    for (let i = 0; i < lengths.length; ++i) {
        if (target <= lengths[i] || i == lengths.length - 1) {
            const f = lengths[i] ? Math.min(target / lengths[i], 1) : 0;
            const p = points[i];
            const q = points[i + 1];
            return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
        }
        target -= lengths[i];
    }
    return [points[points.length - 1][0], points[points.length - 1][1]];
}

/** a router that draws a polyline (its corner points) */
const linkPolylineRouter = (polyline) => ({
    polyline,
    path(ctx, rl, offsety = 0) {
        const points = polyline(rl);
        ctx.moveTo(points[0][0], points[0][1] + offsety);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1] + offsety);
    },
    point(rl, t) {
        return linkPointOnPolyline(polyline(rl), t);
    },
});

/** the built-in routers, as the classic render modes drew them */
const LINK_BUILTIN_ROUTERS = {
    spline: {
        controls(rl) {
            const dist = LiteGraph.distance(rl.a, rl.b);
            const s = linkDirUnit(rl.startDir);
            const e = linkDirUnit(rl.endDir);
            return [
                [rl.a[0] + s[0] * dist * 0.25, rl.a[1] + s[1] * dist * 0.25],
                [rl.b[0] + e[0] * dist * 0.25, rl.b[1] + e[1] * dist * 0.25],
            ];
        },
        path(ctx, rl, offsety = 0) {
            const [p1, p2] = this.controls(rl);
            ctx.moveTo(rl.a[0], rl.a[1] + offsety);
            ctx.bezierCurveTo(p1[0], p1[1] + offsety, p2[0], p2[1] + offsety, rl.b[0], rl.b[1] + offsety);
        },
        point(rl, t) {
            const [p1, p2] = this.controls(rl);
            const p0 = rl.a;
            const p3 = rl.b;
            const c1 = (1 - t) * (1 - t) * (1 - t);
            const c2 = 3 * ((1 - t) * (1 - t)) * t;
            const c3 = 3 * (1 - t) * (t * t);
            const c4 = t * t * t;
            return [c1 * p0[0] + c2 * p1[0] + c3 * p2[0] + c4 * p3[0], c1 * p0[1] + c2 * p1[1] + c3 * p2[1] + c4 * p3[1]];
        },
    },
    linear: linkPolylineRouter((rl) => {
        const l = 15;
        const s = linkDirUnit(rl.startDir);
        const e = linkDirUnit(rl.endDir);
        return [rl.a, [rl.a[0] + s[0] * l, rl.a[1] + s[1] * l], [rl.b[0] + e[0] * l, rl.b[1] + e[1] * l], rl.b];
    }),
    straight: linkPolylineRouter((rl) => {
        const a = rl.a;
        const b = rl.b;
        const start_x = a[0] + (rl.startDir == LiteGraph.RIGHT ? 10 : 0);
        const start_y = a[1] + (rl.startDir == LiteGraph.RIGHT ? 0 : 10);
        const end_x = b[0] - (rl.endDir == LiteGraph.LEFT ? 10 : 0);
        const end_y = b[1] - (rl.endDir == LiteGraph.LEFT ? 0 : 10);
        const mid_x = (start_x + end_x) * 0.5;
        return [a, [start_x, start_y], [mid_x, start_y], [mid_x, end_y], [end_x, end_y], b];
    }),
};

/**
 * Link routers by name (`LiteGraph.linkRouters`). A router is `{path(ctx, renderLink, offsety),
 * point(renderLink, t)}`: `path` adds the segment to the current canvas path (moveTo first),
 * `point` returns the point at fraction `t` (used for the link centre, arrows and flow dots).
 * A canvas uses `canvas.link_router` (a name) or, when that is null, its `links_render_mode`.
 */
export class LinkRouterRegistry {

    /** links_render_mode → router name */
    static MODE_NAMES = { 0: "straight", 1: "linear", 2: "spline" };

    constructor() {
        /** @type {Map<string, object>} */
        this._routers = new Map();
        for (const [name, router] of Object.entries(LINK_BUILTIN_ROUTERS)) this._routers.set(name, router);
    }

    /** @returns {() => void} disposer (a replaced built-in comes back) */
    register(name, router) {
        if (typeof name !== "string" || !name) throw new TypeError("link router name must be a non-empty string");
        if (typeof router?.path !== "function" || typeof router?.point !== "function") {
            throw new TypeError(`link router ${name}: needs path(ctx, renderLink, offsety) and point(renderLink, t)`);
        }
        const previous = this._routers.get(name);
        this._routers.set(name, router);
        return () => {
            if (this._routers.get(name) !== router) return;
            if (previous) this._routers.set(name, previous);
            else this._routers.delete(name);
        };
    }

    get(name) {
        return this._routers.get(name) ?? null;
    }

    list() {
        return [...this._routers.keys()];
    }

    /** the router name for a links_render_mode value */
    static nameForMode(mode) {
        return LinkRouterRegistry.MODE_NAMES[mode] ?? null;
    }

    /** corner points of a polyline router (linear, straight), or null for curves */
    polyline(name, rl) {
        const router = this.get(name);
        return typeof router?.polyline === "function" ? router.polyline(rl) : null;
    }
}

/** the built-in style resolvers */
const LINK_BUILTIN_STYLES = {
    /** links touching the selected nodes stay bright and a little wider; the others fade */
    spotlight(rl, ctx) {
        const selected = ctx.selectedIds;
        if (!selected?.size || !rl.link) return null;
        const touches = selected.has(rl.link.origin_id) || selected.has(rl.link.target_id);
        return touches ? { width: (ctx.canvas?.connections_width ?? 3) + 1 } : { alpha: 0.15 };
    },
    /** while a link is dragged (or `canvas.link_type_focus` is set), links of other types fade */
    "dim-by-type"(rl, ctx) {
        const focus = ctx.focusType;
        if (focus === undefined || focus === null || focus === "" || focus === 0 || focus === "*") return null;
        return LiteGraph.isValidConnection(rl.type, focus) ? null : { alpha: 0.2 };
    },
    /** links with `link.hidden`, or of a type listed in `LiteGraph.Canvas.HiddenLinkTypes`, are not drawn */
    hidden(rl, ctx) {
        if (rl.link?.hidden) return { visible: false };
        const types = ctx.hiddenTypes;
        return types?.length && types.includes(String(rl.type)) ? { visible: false } : null;
    },
    /** the link's label (`link.label`) or its type, at its centre */
    labelled(rl) {
        if (!rl.link) return null;
        const text = rl.link.label ?? rl.type;
        return text === undefined || text === null || text === "" || text === 0 || text === -1 ? null : { label: String(text) };
    },
};

/**
 * Link style resolvers by name (`LiteGraph.linkStyles`). A resolver is
 * `(renderLink, ctx) → {visible?, alpha?, color?, width?, dash?, label?} | null`; `ctx` has
 * `canvas`, `selectedIds` (Set of selected node ids), `focusType` and `hiddenTypes`.
 * Active resolvers come from `canvas.link_styles` or the setting `LiteGraph.Canvas.LinkStyles`
 * and compose in that order: later ones override earlier fields, `alpha` multiplies, and
 * `visible: false` wins.
 */
export class LinkStyleRegistry {

    constructor() {
        /** @type {Map<string, Function>} */
        this._resolvers = new Map(Object.entries(LINK_BUILTIN_STYLES));
    }

    /** @returns {() => void} disposer */
    register(name, resolver) {
        if (typeof name !== "string" || !name) throw new TypeError("link style name must be a non-empty string");
        if (typeof resolver !== "function") throw new TypeError(`link style ${name}: resolver must be a function`);
        const previous = this._resolvers.get(name);
        this._resolvers.set(name, resolver);
        return () => {
            if (this._resolvers.get(name) !== resolver) return;
            if (previous) this._resolvers.set(name, previous);
            else this._resolvers.delete(name);
        };
    }

    get(name) {
        return this._resolvers.get(name) ?? null;
    }

    list() {
        return [...this._resolvers.keys()];
    }

    /**
     * Composes the active resolvers for one link.
     * @param {RenderLink} rl
     * @param {object} ctx
     * @param {string[]} active - resolver names, in order
     * @returns {{visible: boolean, alpha: number, color?: string, width?: number, dash?: number[], label?: string}|null}
     *   null when no active resolver changed anything
     */
    resolve(rl, ctx, active) {
        let style = null;
        for (const name of active ?? []) {
            const resolver = this._resolvers.get(name);
            if (!resolver) continue;
            let part;
            try {
                part = resolver(rl, ctx);
            } catch (error) {
                LiteGraph.log_warn?.("linkStyles", `resolver ${name} failed`, error);
                continue;
            }
            if (!part) continue;
            style ??= { visible: true, alpha: 1 };
            if (part.visible === false) style.visible = false;
            if (Number.isFinite(part.alpha)) style.alpha *= part.alpha;
            for (const key of ["color", "width", "dash", "label"]) if (part[key] !== undefined) style[key] = part[key];
        }
        return style;
    }
}
