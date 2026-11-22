import { LiteGraph } from "./litegraph.js";
import { ListenerList } from "./eventtarget.js";

/**
 * Prioritised, vetoable hooks around the classic `onX` callbacks.
 *
 * Assigning `node.onExecute = fn` (or a prototype method) keeps working: it is the *default*
 * callback of the chain. Registered handlers run by priority (highest first); the default runs
 * after those with priority >= 0 and before the negative ones.
 *
 *   const off = node.onHook("onExecute", (info, param) => ({ return_value: 42, result_priority: 1 }), { priority: 1 });
 *   off(); // or node.unregisterCallbackHandler("onExecute", id) with the id registerCallbackHandler returns
 *
 * A handler result may be a plain value or `{return_value, result_priority, prevent_default, stop_replication}`.
 * Hooks are synchronous (a Promise result is not awaited). A handler that throws does not stop
 * the others: the chain completes and the first error is then rethrown to the caller.
 * Listener storage, ordering and copy-on-write come from ListenerList (shared with typed events).
 */
export class CallbackHandler {

    debug = false;

    constructor(ref) {
        /** @type {Record<string, ListenerList>} per hook name: `{handlers, last_id}` */
        this.callbacks_handlers = {};
        this.ob_ref = ref;
    }

    /**
     * Subscribes a handler to a hook.
     * @param {string} name hook name, e.g. "onExecute"
     * @param {Function} callback called as `callback.call(owner, info, ...args)`
     * @param {object} [opts]
     * @param {number} [opts.priority=0] higher runs first; the default callback runs between >= 0 and < 0
     * @param {boolean} [opts.is_default=false] skipped when another handler prevents the default
     * @param {boolean} [opts.call_once=false] unregister after the first call (alias: `once`)
     * @param {AbortSignal} [opts.signal] unregister on abort
     * @returns {number|false} the handler id for this name, false for an invalid callback
     */
    registerCallbackHandler(name, callback, opts) {
        if (typeof callback !== "function") {
            LiteGraph?.log_warn?.("registerCallbackHandler", "invalid callback for", name);
            return false;
        }
        const data = { priority: 0, is_default: false, call_once: false, ...(opts && typeof opts === "object" ? opts : {}) };
        if (data.once) data.call_once = true;
        return (this.callbacks_handlers[name] ??= new ListenerList()).add(callback, data);
    }

    /** @returns {boolean} true if the handler was registered */
    unregisterCallbackHandler(name, h_id) {
        return this.callbacks_handlers[name]?.remove(h_id) ?? false;
    }

    /** true when a handler is registered for name */
    hasCallbackHandlers(name) {
        return !!this.callbacks_handlers[name]?.size;
    }

    /**
     * Runs the handlers registered for name and the default callback.
     * @param {string} name
     * @param {{def_cb?: Function|false, on_result?: (result: any) => void}} [opts] def_cb is the classic `onX`
     * @param {...any} args passed after `info` to handlers, and alone to the default callback
     * @returns {any} null when nothing returned a value; otherwise the winning plain value or result object
     */
    processCallbackHandlers(name, opts, ...args) {
        return CallbackHandler.run(this.ob_ref, this, name, opts, args);
    }

    /**
     * The chain behind processCallbackHandlers (also used directly by hook hosts, see installHooks).
     * With no registered handler it only calls the default callback.
     */
    static run(owner, handler, name, opts, args) {
        const def_cb = typeof opts?.def_cb === "function" ? opts.def_cb : null;
        const handlers = handler ? handler.callbacks_handlers[name]?.handlers : null;
        if (!handlers?.length) {
            if (!def_cb) return null;
            const ret = def_cb.apply(owner, args);
            opts.on_result?.(ret);
            return ret ?? null;
        }

        const results = [];
        let value = null;
        let valuePriority = 0;
        let prevented = false;
        let stopped = false;
        let defaultDone = false;
        let failure = null;

        // a result replaces the kept one when its result_priority (plain values: 0) is not lower
        const call = (fn, info) => {
            let ret;
            try {
                ret = info ? fn.call(owner, info, ...args) : fn.apply(owner, args);
            } catch (error) {
                if (failure) LiteGraph?.log_error?.("hook", name, "handler failed", error);
                else failure = { error };
                return;
            }
            results.push(ret);
            opts?.on_result?.(ret);
            if (ret !== null && typeof ret === "object") {
                if (ret.prevent_default) prevented = true;
                const priority = typeof ret.result_priority === "number" && !isNaN(ret.result_priority) ? ret.result_priority : 0;
                if (value === null || priority >= valuePriority) {
                    value = ret;
                    valuePriority = priority;
                }
                if (ret.stop_replication) stopped = true;
            } else if (ret !== null && ret !== undefined && (value === null || valuePriority <= 0)) {
                value = ret;
                valuePriority = 0;
            }
        };
        const runDefault = () => {
            defaultDone = true;
            if (def_cb && !prevented) call(def_cb, null);
        };

        for (const entry of handlers) {
            if (prevented && entry.data.is_default) continue;
            if (entry.priority < 0 && !defaultDone) {
                runDefault();
                if (stopped) break;
            }
            // unregistered before the call, so a re-entrant dispatch cannot run it again
            if (entry.data.call_once) handler.unregisterCallbackHandler(name, entry.id);
            call(entry.callback, { name, id: entry.id, current_return_value: value, data: entry.data, results_chain: results });
            if (stopped) break;
        }
        // stop_replication stops everything after it, the default callback included
        if (!defaultDone && !stopped) runDefault();

        if (failure) throw failure.error;
        return value;
    }

    /** The value a hook settled on: `return_value` of an object result, otherwise the result itself. */
    static valueOf(result) {
        return result !== null && typeof result === "object" ? result.return_value : result;
    }

    /** true when the result is `value`, plain or as `{return_value: value}` (e.g. a `false` veto). */
    static is(result, value) {
        return result === value || (result !== null && typeof result === "object" && result.return_value === value);
    }

    /** The pointer hooks' "handled": `true`, or an object result with a truthy `return_value`. */
    static handled(result) {
        return result === true || (result !== null && typeof result === "object" && !!result.return_value);
    }
}

/**
 * Gives a class the hook API. One implementation for LiteGraph, LGraph, LGraphNode, LGraphGroup
 * and LGraphCanvas (registered node classes receive it through the LGraphNode prototype copy).
 * The CallbackHandler is created on first registration; dispatching without one only calls `onX`.
 * @param {Function} Class
 */
export function installHooks(Class) {
    const methods = {
        /** @returns {CallbackHandler} this object's handler registry (created once) */
        callbackhandler_setup() {
            return (this.cb_handler ||= new CallbackHandler(this));
        },
        registerCallbackHandler(name, callback, opts) {
            return this.callbackhandler_setup().registerCallbackHandler(name, callback, opts);
        },
        unregisterCallbackHandler(name, h_id) {
            return this.cb_handler ? this.cb_handler.unregisterCallbackHandler(name, h_id) : false;
        },
        processCallbackHandlers(name, opts, ...args) {
            return CallbackHandler.run(this, this.cb_handler, name, opts, args);
        },
        hasCallbackHandlers(name) {
            return !!this.cb_handler?.hasCallbackHandlers(name);
        },
        /**
         * Registers a hook handler and returns its disposer.
         * @returns {() => boolean} unregisters the handler
         */
        onHook(name, callback, opts) {
            const id = this.registerCallbackHandler(name, callback, opts);
            if (id === false) throw new TypeError(`hook ${name}: callback must be a function`);
            return () => this.unregisterCallbackHandler(name, id);
        },
    };
    for (const [key, value] of Object.entries(methods)) {
        Object.defineProperty(Class.prototype, key, { value, writable: true, configurable: true });
    }
    return Class;
}
