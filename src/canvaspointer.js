/**
 * Tracks one pointer gesture on a canvas: down -> move* -> up | cancel.
 *
 * Distinguishes clicks from drags with a movement tolerance (not only elapsed time), and detects
 * double clicks only when two clicks land close together in time and space.
 *
 * Gesture handlers: whoever handles a pointerdown can assign `onClick`, `onDoubleClick`,
 * `onDragStart`, `onDrag`, `onDragEnd` and `finally` for that gesture only. While handlers are
 * assigned the pointer owns the gesture (`hasHandlers`): move() calls onDragStart once the press
 * becomes a drag and onDrag on every move after it; up() calls onDragEnd for a drag, or
 * onClick / onDoubleClick for a click; finally runs at the end of every gesture, including cancel.
 * Handlers are cleared when the gesture ends.
 * Design follows the CanvasPointer idea in Comfy-Org/litegraph.js (MIT); independent implementation.
 */
export class CanvasPointer {
    /** maximum time between two clicks for a double click (ms) */
    static double_click_time = 300;
    /** maximum distance between two clicks for a double click (CSS px) */
    static double_click_distance = 6;
    /** movement before a press becomes a drag (CSS px) */
    static click_drift = 6;
    /** maximum press duration for a click (ms) */
    static click_time = 300;

    static HANDLERS = ["onClick", "onDoubleClick", "onDragStart", "onDrag", "onDragEnd", "finally"];

    constructor() {
        this.reset();
        this.clearHandlers();
        /** the last completed click, for double-click detection */
        this.lastClick = null;
    }

    /** true when the current gesture has handlers (the canvas then skips its legacy handling) */
    get hasHandlers() {
        return CanvasPointer.HANDLERS.some((name) => typeof this[name] === "function");
    }

    clearHandlers() {
        for (const name of CanvasPointer.HANDLERS) this[name] = null;
    }

    /** calls a handler; an error is reported but cannot leave the gesture half-finished */
    _call(name, e) {
        const handler = this[name];
        if (typeof handler !== "function") return;
        try { handler(e, this); } catch (error) { console.error?.(`CanvasPointer.${name} failed`, error); }
    }

    /** forget the gesture in progress */
    reset() {
        this.isDown = false;
        this.dragged = false;
        this.downEvent = null;
        this.maxDrift = 0;
    }

    /**
     * Starts a gesture.
     * @param {{clientX:number, clientY:number, button?:number, pointerId?:number}} e
     * @param {number} [now] - timestamp in ms
     * @returns {{isDoubleClick: boolean}}
     */
    down(e, now = Date.now()) {
        const last = this.lastClick;
        const isDoubleClick = !!last &&
            now - last.time <= CanvasPointer.double_click_time &&
            (last.button ?? 0) === (e.button ?? 0) &&
            Math.hypot(e.clientX - last.x, e.clientY - last.y) <= CanvasPointer.double_click_distance;
        this.clearHandlers(); // a new gesture starts without the previous one's handlers
        this.isDown = true;
        this.dragged = false;
        this.maxDrift = 0;
        this.downEvent = { x: e.clientX, y: e.clientY, time: now, button: e.button ?? 0, pointerId: e.pointerId, isDoubleClick };
        this.lastClick = null;
        return { isDoubleClick };
    }

    /**
     * Updates the gesture; returns true once the press has become a drag.
     * @param {{clientX:number, clientY:number}} e
     */
    move(e) {
        if (!this.isDown || !this.downEvent) return false;
        const drift = Math.hypot(e.clientX - this.downEvent.x, e.clientY - this.downEvent.y);
        if (drift > this.maxDrift) this.maxDrift = drift;
        if (drift > CanvasPointer.click_drift && !this.dragged) {
            this.dragged = true;
            this._call("onDragStart", e);
        }
        if (this.dragged) this._call("onDrag", e);
        return this.dragged;
    }

    /**
     * Ends the gesture.
     * @returns {{isClick: boolean, dragged: boolean, duration: number}}
     */
    up(e, now = Date.now()) {
        if (!this.isDown || !this.downEvent) {
            this.reset();
            return { isClick: false, dragged: false, duration: 0 };
        }
        if (e) this.move(e);
        const duration = now - this.downEvent.time;
        const dragged = this.dragged;
        const isClick = !dragged && duration <= CanvasPointer.click_time;
        const handled = this.hasHandlers;
        if (dragged) this._call("onDragEnd", e);
        else if (isClick) this._call(this.downEvent.isDoubleClick ? "onDoubleClick" : "onClick", e);
        this._call("finally", e);
        this.clearHandlers();
        if (isClick && !this.downEvent.isDoubleClick) { // after a double click, a third click starts over
            const { x, y, button } = this.downEvent;
            this.lastClick = { x, y, button, time: now };
        } else {
            this.lastClick = null;
        }
        this.reset();
        return { isClick, dragged, duration, handled };
    }

    /** the system cancelled the gesture (pointercancel, lost capture): nothing completes */
    cancel() {
        this._call("finally", null);
        this.clearHandlers();
        this.reset();
        this.lastClick = null;
    }
}
