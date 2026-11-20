import { LiteGraph } from "./litegraph.js";

/**
 * A minimap for a canvas (Wave 4c, ideas H1/H9): the nodes of the open graph, the visible area,
 * and decoration layers drawn on top (selection and execution state by default).
 *
 * It redraws on events, never on a timer: `graph-changed` and `execution-state` of the open
 * graph, and `viewport-changed`, `selection-changed`, `subgraph-opened` / `subgraph-closed` of
 * the canvas; redraws are coalesced to one per animation frame. A click or drag on it centres
 * the canvas on that point.
 *
 * ```js
 * const minimap = canvas.showMinimap({ width: 220, height: 150 });
 * minimap.addLayer("bookmarks", (ctx, map) => { ... map.toMap([x, y]) ... });
 * canvas.hideMinimap();
 * ```
 */
export class MiniMap {

    /** built-in layers, drawn in this order after the nodes */
    static DEFAULT_LAYERS = ["selection", "execution"];

    /**
     * @param {object} canvas - an LGraphCanvas
     * @param {{width?: number, height?: number, margin?: number, container?: HTMLElement, layers?: string[]}} [options]
     */
    constructor(canvas, { width = 200, height = 140, margin = 10, container, layers = MiniMap.DEFAULT_LAYERS } = {}) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.padding = 20;
        this.redraws = 0;
        /** @type {Array<{name: string, draw: Function}>} */
        this.layers = [];
        this._abort = new AbortController();
        this._unsubscribe = [];
        this._frame = null;
        this._graph = null;
        this._transform = null;

        const element = this.element = canvas.canvas?.ownerDocument?.createElement("canvas") ?? null;
        if (element) {
            element.className = "litegraph-minimap";
            element.width = width;
            element.height = height;
            element.style.cssText = `position:absolute;right:${margin}px;bottom:${margin}px;width:${width}px;height:${height}px;`
                + "z-index:4;border:1px solid #555;border-radius:4px;background:rgba(20,20,20,0.85);cursor:crosshair;touch-action:none";
            (container ?? canvas.canvas?.parentNode)?.appendChild(element);
            const signal = this._abort.signal;
            let dragging = false;
            const move = (e) => this.centerOnMapPoint(e.offsetX, e.offsetY);
            element.addEventListener("pointerdown", (e) => {
                dragging = true;
                element.setPointerCapture?.(e.pointerId);
                move(e);
                e.preventDefault();
                e.stopPropagation();
            }, { signal });
            element.addEventListener("pointermove", (e) => { if (dragging) move(e); }, { signal });
            const end = () => { dragging = false; };
            element.addEventListener("pointerup", end, { signal });
            element.addEventListener("pointercancel", end, { signal });
        }

        for (const name of layers) {
            const draw = MiniMap.LAYERS[name];
            if (draw) this.addLayer(name, draw);
        }
        const events = canvas.events;
        for (const type of ["viewport-changed", "selection-changed", "subgraph-opened", "subgraph-closed"]) {
            this._unsubscribe.push(events.on(type, () => this.requestDraw()));
        }
        this._watchGraph();
        this.draw();
    }

    /** follows the canvas's open graph (and its root, for execution state) */
    _watchGraph() {
        const graph = this.canvas.graph;
        if (graph === this._graph) return;
        this._graphUnsubscribe?.forEach((off) => off());
        this._graph = graph;
        this._graphUnsubscribe = [];
        if (!graph) return;
        this._graphUnsubscribe.push(graph.events.on("graph-changed", () => this.requestDraw()));
        const root = graph.rootGraph ?? graph;
        this._graphUnsubscribe.push(root.events.on("execution-state", () => this.requestDraw()));
    }

    /**
     * Adds a decoration layer: `draw(ctx, minimap)` runs after the nodes on every redraw.
     * @returns {() => void} disposer
     */
    addLayer(name, draw) {
        if (typeof draw !== "function") throw new TypeError(`minimap layer ${name}: draw must be a function`);
        const layer = { name, draw };
        this.layers.push(layer);
        this.requestDraw();
        return () => {
            const index = this.layers.indexOf(layer);
            if (index !== -1) this.layers.splice(index, 1);
            this.requestDraw();
        };
    }

    /** Redraws once on the next animation frame (or now without one). */
    requestDraw() {
        if (this._frame !== null) return;
        const raf = this.canvas.canvas?.ownerDocument?.defaultView?.requestAnimationFrame;
        if (typeof raf !== "function") {
            this.draw();
            return;
        }
        this._frame = raf(() => {
            this._frame = null;
            this.draw();
        });
    }

    /** graph-space bounds of the nodes and the visible area: [x, y, w, h] */
    computeBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const add = (x, y, w, h) => {
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
        };
        for (const node of this.canvas.graph?._nodes ?? []) {
            add(node.pos[0], node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, node.size[0], node.size[1] + LiteGraph.NODE_TITLE_HEIGHT);
        }
        const area = this.canvas.visible_area ?? this.canvas.ds?.visible_area;
        if (area && area[2] > 0 && area[3] > 0) add(area[0], area[1], area[2], area[3]);
        if (!Number.isFinite(minX)) return [0, 0, 1, 1];
        return [minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY)];
    }

    /** graph point → minimap pixel */
    toMap(point) {
        const t = this._transform ?? this._computeTransform();
        return [(point[0] - t.x) * t.scale + t.ox, (point[1] - t.y) * t.scale + t.oy];
    }

    /** minimap pixel → graph point */
    toGraph(x, y) {
        const t = this._transform ?? this._computeTransform();
        return [(x - t.ox) / t.scale + t.x, (y - t.oy) / t.scale + t.y];
    }

    /** a node's rectangle in minimap pixels: [x, y, w, h] */
    nodeRect(node) {
        const t = this._transform ?? this._computeTransform();
        const [x, y] = this.toMap([node.pos[0], node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT]);
        return [x, y, Math.max(2, node.size[0] * t.scale), Math.max(2, (node.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * t.scale)];
    }

    _computeTransform() {
        const [x, y, w, h] = this.computeBounds();
        const pad = this.padding;
        const scale = Math.min((this.width - 2 * pad / 4) / w, (this.height - 2 * pad / 4) / h);
        const ox = (this.width - w * scale) / 2;
        const oy = (this.height - h * scale) / 2;
        return (this._transform = { x, y, scale, ox, oy });
    }

    /** Centres the canvas on the graph point under a minimap pixel. */
    centerOnMapPoint(x, y) {
        const [gx, gy] = this.toGraph(x, y);
        this.centerOn(gx, gy);
    }

    /** Centres the canvas on a graph point. */
    centerOn(gx, gy) {
        const ds = this.canvas.ds;
        ds.computeVisibleArea?.(this.canvas.viewport); // the view may have moved since the last frame
        const area = this.canvas.visible_area ?? ds.visible_area;
        const cx = area[0] + area[2] / 2;
        const cy = area[1] + area[3] / 2;
        ds.offset[0] += cx - gx;
        ds.offset[1] += cy - gy;
        ds.computeVisibleArea?.(this.canvas.viewport);
        this.canvas.setDirty(true, true);
        this.requestDraw();
    }

    /** Draws the minimap now. */
    draw() {
        this._watchGraph();
        this.redraws++;
        this._transform = null;
        const t = this._computeTransform();
        const ctx = this.element?.getContext?.("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, this.width, this.height);
        for (const node of this.canvas.graph?._nodes ?? []) {
            const [x, y, w, h] = this.nodeRect(node);
            ctx.fillStyle = node.bgcolor || node.constructor.bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR || "#353535";
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = node.color || node.constructor.color || LiteGraph.NODE_DEFAULT_COLOR || "#333";
            ctx.fillRect(x, y, w, Math.max(1, LiteGraph.NODE_TITLE_HEIGHT * t.scale));
        }
        for (const layer of this.layers) {
            try {
                ctx.save();
                layer.draw(ctx, this);
            } catch (error) {
                LiteGraph.log_warn?.("minimap", `layer ${layer.name} failed`, error);
            } finally {
                ctx.restore();
            }
        }
        const area = this.canvas.visible_area ?? this.canvas.ds?.visible_area;
        if (area) {
            const [vx, vy] = this.toMap([area[0], area[1]]);
            ctx.strokeStyle = "#DDD";
            ctx.lineWidth = 1;
            ctx.strokeRect(vx + 0.5, vy + 0.5, area[2] * t.scale, area[3] * t.scale);
        }
    }

    dispose() {
        if (this._frame !== null) this.canvas.canvas?.ownerDocument?.defaultView?.cancelAnimationFrame?.(this._frame);
        this._frame = null;
        this._abort.abort();
        this._unsubscribe.forEach((off) => off());
        this._graphUnsubscribe?.forEach((off) => off());
        this._unsubscribe = [];
        this._graphUnsubscribe = [];
        this.element?.remove();
        this.element = null;
    }
}

/** built-in decoration layers */
MiniMap.LAYERS = {
    /** selected nodes outlined */
    selection(ctx, map) {
        const selected = Object.values(map.canvas.selected_nodes ?? {});
        if (!selected.length) return;
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 1.5;
        for (const node of selected) {
            if (node.graph !== map.canvas.graph) continue;
            const [x, y, w, h] = map.nodeRect(node);
            ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
        }
    },
    /** execution state: running and failed nodes in their overlay colours */
    execution(ctx, map) {
        const colors = map.canvas.constructor?.EXECUTION_STATUS_COLORS ?? {};
        for (const node of map.canvas.graph?._nodes ?? []) {
            const status = node.execution_state?.status;
            if (status !== "running" && status !== "error") continue;
            const [x, y, w, h] = map.nodeRect(node);
            ctx.fillStyle = colors[status] ?? (status === "error" ? "#E44" : "#FC3");
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x, y, w, h);
        }
    },
};
