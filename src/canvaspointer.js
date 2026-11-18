/**
 * Tracks one pointer gesture on a canvas: down -> move* -> up | cancel.
 *
 * Distinguishes clicks from drags with a movement tolerance (not only elapsed time), and detects
 * double clicks only when two clicks land close together in time and space.
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

    constructor() {
        this.reset();
        /** the last completed click, for double-click detection */
        this.lastClick = null;
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
        if (drift > CanvasPointer.click_drift) this.dragged = true;
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
        if (isClick && !this.downEvent.isDoubleClick) { // after a double click, a third click starts over
            const { x, y, button } = this.downEvent;
            this.lastClick = { x, y, button, time: now };
        } else {
            this.lastClick = null;
        }
        this.reset();
        return { isClick, dragged, duration };
    }

    /** the system cancelled the gesture (pointercancel, lost capture): nothing completes */
    cancel() {
        this.reset();
        this.lastClick = null;
    }
}
