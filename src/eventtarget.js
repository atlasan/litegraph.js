/**
 * The listener core shared by typed events (LGraphEventTarget) and hooks (CallbackHandler).
 *
 *   const off = graph.events.on("node-added", (event) => console.log(event.detail.node));
 *   off(); // unsubscribe
 *
 * Listeners receive {type, detail, target, cancelable, defaultPrevented, preventDefault()}.
 * A throwing listener is logged and does not stop the others (safe in headless runners).
 * Design after Comfy-Org/litegraph.js CustomEventTarget (MIT); runtime-independent implementation.
 */

/**
 * An ordered list of listeners: highest `priority` first, then registration order.
 * Copy-on-write: every change replaces `handlers`, so a dispatch in progress keeps iterating the
 * list it started with (a listener added meanwhile runs from the next dispatch).
 * Entries are `{id, priority, callback, data}`; `data` holds the options given at registration.
 */
export class ListenerList {
    /** @type {{id: number, priority: number, callback: Function, data: object}[]} never mutated */
    handlers = [];
    last_id = 0;

    /**
     * @param {Function} callback
     * @param {{priority?: number, signal?: AbortSignal}} [data] - kept on the entry
     * @returns {number} the entry id
     */
    add(callback, data = {}) {
        const entry = { id: this.last_id++, priority: Number(data.priority) || 0, callback, data };
        const signal = data.signal;
        if (signal?.aborted) return entry.id;
        if (signal?.addEventListener) {
            const onAbort = () => this.remove(entry.id);
            signal.addEventListener("abort", onAbort, { once: true });
            // detached on removal, so a long-lived signal does not keep removed listeners alive
            entry.detach = () => signal.removeEventListener?.("abort", onAbort);
        }
        this.handlers = [...this.handlers, entry].sort((a, b) => b.priority - a.priority);
        return entry.id;
    }

    /** @returns {boolean} true if the entry was there */
    remove(id) {
        const entry = this.handlers.find((item) => item.id === id);
        if (!entry) return false;
        this.handlers = this.handlers.filter((item) => item !== entry);
        entry.detach?.();
        return true;
    }

    find(callback) {
        return this.handlers.find((entry) => entry.callback === callback);
    }

    get size() {
        return this.handlers.length;
    }
}

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
        /** @type {Map<string, ListenerList>} */
        this._listeners = new Map();
    }

    /**
     * Subscribes to an event type; `"*"` receives every event of this target (after its own listeners).
     * @param {string} type
     * @param {(event: LGraphEvent) => void} listener
     * @param {{once?: boolean, signal?: AbortSignal, priority?: number}} [options]
     * @returns {() => void} unsubscribe
     */
    on(type, listener, options = {}) {
        if (typeof listener !== "function") throw new TypeError("listener must be a function");
        if (options.signal?.aborted) return () => {};
        let list = this._listeners.get(type);
        if (!list) this._listeners.set(type, list = new ListenerList());
        const id = list.add(listener, { ...options });
        return () => { list.remove(id); };
    }

    /** subscribes for a single event */
    once(type, listener, options = {}) {
        return this.on(type, listener, { ...options, once: true });
    }

    /** removes a listener added with on() */
    off(type, listener) {
        const list = this._listeners.get(type);
        const entry = list?.find(listener);
        if (entry) list.remove(entry.id);
    }

    /** true when anything listens to type (a "*" listener counts) */
    has(type) {
        return !!(this._listeners.get(type)?.size || this._listeners.get("*")?.size);
    }

    /**
     * Dispatches an event to the current listeners (by priority, then subscription order),
     * then to the "*" listeners.
     * @returns {LGraphEvent} check defaultPrevented for cancelable events
     */
    dispatch(type, detail, options = {}) {
        const event = new LGraphEvent(type, detail, this.owner, !!options.cancelable);
        this._deliver(this._listeners.get(type), event);
        if (type !== "*") this._deliver(this._listeners.get("*"), event);
        return event;
    }

    _deliver(list, event) {
        if (!list?.size) return;
        for (const entry of list.handlers) {
            // a re-entrant dispatch may already have delivered (and removed) a once listener
            if (entry.data.once && !list.remove(entry.id)) continue;
            try {
                entry.callback.call(this.owner, event);
            } catch (error) {
                if (this.onError) this.onError(error, event);
                else console.error?.("[LG] event listener failed", event.type, error);
            }
        }
    }
}
