/**
 * Typed events for graphs and canvases, alongside CallbackHandler hooks.
 *
 *   const off = graph.events.on("node-added", (event) => console.log(event.detail.node));
 *   off(); // unsubscribe
 *
 * Listeners receive {type, detail, target, cancelable, defaultPrevented, preventDefault()}.
 * A throwing listener is logged and does not stop the others (safe in headless runners).
 * Design after Comfy-Org/litegraph.js CustomEventTarget (MIT); runtime-independent implementation.
 */
export class LGraphEvent {
    constructor(type, detail, target, cancelable = false) {
        this.type = type;
        this.detail = detail;
        this.target = target;
        this.cancelable = cancelable;
        this.defaultPrevented = false;
    }

    preventDefault() {
        if (this.cancelable) this.defaultPrevented = true;
    }
}

export class LGraphEventTarget {
    /**
     * @param {object} [owner] - reported as event.target
     * @param {(error: unknown, event: LGraphEvent) => void} [onError] - listener error reporter
     */
    constructor(owner, onError) {
        this.owner = owner;
        this.onError = onError;
        this._listeners = new Map();
    }

    /**
     * Subscribes to an event type.
     * @param {string} type
     * @param {(event: LGraphEvent) => void} listener
     * @param {{once?: boolean, signal?: AbortSignal}} [options]
     * @returns {() => void} unsubscribe
     */
    on(type, listener, options = {}) {
        if (typeof listener !== "function") throw new TypeError("listener must be a function");
        if (options.signal?.aborted) return () => {};
        if (!this._listeners.has(type)) this._listeners.set(type, []);
        const entry = { listener, once: !!options.once };
        this._listeners.get(type).push(entry);
        const off = () => this._remove(type, entry);
        options.signal?.addEventListener?.("abort", off, { once: true });
        return off;
    }

    /** subscribes for a single event */
    once(type, listener, options = {}) {
        return this.on(type, listener, { ...options, once: true });
    }

    /** removes a listener added with on() */
    off(type, listener) {
        const entry = this._listeners.get(type)?.find((item) => item.listener === listener);
        if (entry) this._remove(type, entry);
    }

    /** true when anything listens to type */
    has(type) {
        return !!this._listeners.get(type)?.length;
    }

    /**
     * Dispatches an event to the current listeners (in subscription order).
     * @returns {LGraphEvent} check defaultPrevented for cancelable events
     */
    dispatch(type, detail, options = {}) {
        const event = new LGraphEvent(type, detail, this.owner, !!options.cancelable);
        const entries = this._listeners.get(type);
        if (!entries?.length) return event;
        for (const entry of entries.slice()) {
            if (entry.once) this._remove(type, entry);
            try {
                entry.listener.call(this.owner, event);
            } catch (error) {
                if (this.onError) this.onError(error, event);
                else console.error?.("[LG] event listener failed", type, error);
            }
        }
        return event;
    }

    _remove(type, entry) {
        const entries = this._listeners.get(type);
        const index = entries?.indexOf(entry) ?? -1;
        if (index !== -1) entries.splice(index, 1);
    }
}
