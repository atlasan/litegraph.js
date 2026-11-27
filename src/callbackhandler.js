import { LiteGraph } from "./litegraph.js";
import { ListenerList } from "./eventtarget.js";

/** The setting that makes every "handled" site strict (decision 0007); also CallbackHandler.STRICT_HANDLED. */
const HOOK_STRICT_HANDLED = "LiteGraph.Hooks.StrictHandled";

/** Logs a warning once per key per process (deprecations, lenient "handled" results). */
function hookWarnOnce(key, topic, message) {
    if (CallbackHandler._warnedOnce.has(key)) return;
    CallbackHandler._warnedOnce.add(key);
    LiteGraph?.log_warn?.(topic, message);
}

/** A host's registry, created when first needed (the library's own path; `cb_handler` is the deprecated one). */
function hookRegistryOf(host) {
    return (host._cb_handler ||= new CallbackHandler(host));
}

/** A result as a warning shows it. */
function describeHookResult(result) {
    try {
        const text = JSON.stringify(result);
        return text === undefined ? String(result) : (text.length > 60 ? text.slice(0, 57) + "..." : text);
    } catch {
        return String(result);
    }
}

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
        this._lists = {};
        this.ob_ref = ref;
    }

    /**
     * The per-name record (live). Deprecated: logged once; use registerCallbackHandler, onHook,
     * unregisterCallbackHandler and hasCallbackHandlers.
     * @deprecated
     */
    get callbacks_handlers() {
        hookWarnOnce("deprecated:callbacks_handlers", "deprecated", "CallbackHandler.callbacks_handlers is deprecated (it keeps working, no removal date); use registerCallbackHandler, onHook, unregisterCallbackHandler and hasCallbackHandlers on the hook host.");
        return this._lists;
    }

    set callbacks_handlers(record) {
        hookWarnOnce("deprecated:callbacks_handlers", "deprecated", "CallbackHandler.callbacks_handlers is deprecated (it keeps working, no removal date); use registerCallbackHandler, onHook, unregisterCallbackHandler and hasCallbackHandlers on the hook host.");
        this._lists = record;
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
        let list = this._lists[name];
        // code that replaced an entry with a plain {last_id, handlers} object keeps working
        if (!(list instanceof ListenerList)) list = this._lists[name] = Object.assign(new ListenerList(), list);
        return list.add(callback, data);
    }

    /** Registers a handler and returns its disposer. */
    onHook(name, callback, opts) {
        const id = this.registerCallbackHandler(name, callback, opts);
        if (id === false) throw new TypeError(`hook ${name}: callback must be a function`);
        return () => this.unregisterCallbackHandler(name, id);
    }

    /** @returns {boolean} true if the handler was registered */
    unregisterCallbackHandler(name, h_id) {
        return this._lists[name]?.remove(h_id) ?? false;
    }

    /** true when a handler is registered for name */
    hasCallbackHandlers(name) {
        return !!this._lists[name]?.size;
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
     * With no registered handler it only calls the default callback. A dispatch tap, when set,
     * receives each dispatch with its duration (see ListenerList.tap).
     */
    static run(owner, handler, name, opts, args, untapped) {
        if (ListenerList.tap !== null && !untapped && !ListenerList.tapping) {
            const tap = ListenerList.tap, start = ListenerList.now();
            let error = null;
            try {
                return CallbackHandler.run(owner, handler, name, opts, args, true);
            } catch (thrown) {
                error = thrown;
                throw thrown;
            } finally {
                ListenerList.report(tap, owner, name, "hook", start, error);
            }
        }
        const def_cb = typeof opts?.def_cb === "function" ? opts.def_cb : null;
        const handlers = handler ? (handler._lists ?? handler.callbacks_handlers)?.[name]?.handlers : null;
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
            // unregistered before the call; skipped when a re-entrant dispatch already ran it
            if (entry.data.call_once && !handler.unregisterCallbackHandler(name, entry.id)) continue;
            call(entry.callback, { name, id: entry.id, current_return_value: value, data: entry.data, results_chain: results });
            if (stopped) break;
        }
        // stop_replication stops everything after it, the default callback included
        if (!defaultDone && !stopped) runDefault();

        if (failure) throw failure.error;
        return value;
    }

    /**
     * Fires a point that has both faces, in the one documented order: the hook chain (handlers by
     * priority, the legacy `owner[name]` as default) and then the typed event. With `veto`, a hook
     * result equal to it (plain or as `{return_value}`) skips the event.
     * @param {object} owner the hook host
     * @param {string} name the hook name; its default callback is `owner[name]`
     * @param {any[]} args the hook arguments
     * @param {{_emit?: Function}|null|undefined} emitter where the event goes: LiteGraph, a graph or a canvas
     * @param {string} type the event type
     * @param {object|(() => object|null)} detail the payload; a function is called after the hook, and null skips the event
     * @param {{veto?: any, emit?: object}} [options] `emit` is passed on to `_emit` (`recorded`, `cancelable`)
     * @returns {any} the hook result, as processCallbackHandlers returns it
     */
    static fireHookThenEvent(owner, name, args, emitter, type, detail, options) {
        const result = owner.processCallbackHandlers(name, { def_cb: owner[name] }, ...args);
        if (!emitter?._emit || (options && "veto" in options && CallbackHandler.is(result, options.veto))) return result;
        const payload = typeof detail === "function" ? detail() : detail;
        if (payload) emitter._emit(type, payload, options?.emit);
        return result;
    }

    /** The value a hook settled on: `return_value` of an object result, otherwise the result itself. */
    static valueOf(result) {
        return result !== null && typeof result === "object" ? result.return_value : result;
    }

    /** true when the result is `value`, plain or as `{return_value: value}` (e.g. a `false` veto). */
    static is(result, value) {
        return result === value || (result !== null && typeof result === "object" && result.return_value === value);
    }

    /**
     * The menu and slot-list hooks' rule: the `return_value` of an object result when it is an
     * object (null included), with `arrays` also an array-like result itself; otherwise `fallback`.
     * @param {any} result a hook result
     * @param {any} [fallback] returned when the result holds no object
     * @param {boolean} [arrays=false] accept a plain array result (onGetInputs, onGetOutputs, node getExtraMenuOptions)
     */
    static objectOf(result, fallback = undefined, arrays = false) {
        if (result === null || typeof result !== "object") return fallback;
        if (typeof result.return_value === "object") return result.return_value;
        return arrays && result.length !== undefined ? result : fallback;
    }

    /** The pointer hooks' "handled": `true`, or an object result with a truthy `return_value`. */
    static handled(result) {
        return result === true || (result !== null && typeof result === "object" && !!result.return_value);
    }

    /**
     * "Handled" at a site whose own rule also accepts other truthy results (decision 0007).
     * - `true` or `{return_value: true}` is handled in both modes.
     * - With the setting `LiteGraph.Hooks.StrictHandled` on, nothing else is.
     * - Off (the default), the site's `legacy` rule decides; when it accepts the result, a warning
     *   naming the setting is logged once per hook name.
     * @param {string} name the hook name, for the warning
     * @param {any} result the hook result
     * @param {(result: any) => any} [legacy=CallbackHandler.handled] the site's own rule
     * @returns {boolean}
     */
    static handledAt(name, result, legacy = CallbackHandler.handled) {
        if (result === true) return true;
        if (result === null || result === undefined || result === false) return false;
        if (typeof result === "object" && result.return_value === true) return true;
        if (CallbackHandler.strictHandled()) return false;
        if (!legacy(result)) return false;
        hookWarnOnce(`handled:${name}`, "hooks", `hook ${name}: the result ${describeHookResult(result)} counted as handled. Only true or {return_value: true} will when the setting ${HOOK_STRICT_HANDLED} is on (a later release may make it the default): return true or {return_value: true}.`);
        return true;
    }

    /** true when the setting `LiteGraph.Hooks.StrictHandled` is on (false before the settings exist). */
    static strictHandled() {
        try {
            return LiteGraph?.settings?.get(HOOK_STRICT_HANDLED) === true;
        } catch {
            return false;
        }
    }
}

/** Keys already warned about in this process (see hookWarnOnce); tests clear it. */
CallbackHandler._warnedOnce = new Set();
/** The id of the setting that makes every "handled" site strict. */
CallbackHandler.STRICT_HANDLED = HOOK_STRICT_HANDLED;

/**
 * Gives a class the hook API. One implementation for LiteGraph, LGraph, LGraphNode, LGraphGroup
 * and LGraphCanvas (registered node classes receive it through the LGraphNode prototype copy).
 * The CallbackHandler is created when first needed: registering a handler (or reading the deprecated `cb_handler`).
 * Dispatching while there is none only calls `onX`.
 * @param {Function} Class
 */
export function installHooks(Class) {
    const proto = Class.prototype;
    const cbHandlerMessage = "cb_handler is deprecated (it keeps working, no removal date); register on the host itself with registerCallbackHandler or onHook, and trace dispatches with LiteGraph.setDispatchTap.";
    Object.defineProperty(proto, "cb_handler", {
        configurable: true,
        /** this object's CallbackHandler (created on first read; assignable, as before). Deprecated: logged once. */
        get() {
            hookWarnOnce("deprecated:cb_handler", "deprecated", cbHandlerMessage);
            return hookRegistryOf(this);
        },
        set(handler) {
            hookWarnOnce("deprecated:cb_handler", "deprecated", cbHandlerMessage);
            this._cb_handler = handler;
        },
    });
    const methods = {
        /**
         * @returns {CallbackHandler} this object's handler registry (created once)
         * @deprecated logged once; the registry is created when first needed
         */
        callbackhandler_setup() {
            hookWarnOnce("deprecated:callbackhandler_setup", "deprecated", "callbackhandler_setup() is deprecated (it keeps working, no removal date); nothing replaces it: the hook registry is created when a handler is first registered.");
            return hookRegistryOf(this);
        },
        registerCallbackHandler(name, callback, opts) {
            return hookRegistryOf(this).registerCallbackHandler(name, callback, opts);
        },
        unregisterCallbackHandler(name, h_id) {
            return this._cb_handler ? this._cb_handler.unregisterCallbackHandler(name, h_id) : false;
        },
        processCallbackHandlers(name, opts, ...args) {
            const handler = this._cb_handler;
            // an overridden processCallbackHandlers on the handler (e.g. a tracing wrapper) still runs
            if (handler && handler.processCallbackHandlers !== CallbackHandler.prototype.processCallbackHandlers) {
                return handler.processCallbackHandlers(name, opts, ...args);
            }
            return CallbackHandler.run(handler ? handler.ob_ref : this, handler, name, opts, args);
        },
        hasCallbackHandlers(name) {
            return !!this._cb_handler?.hasCallbackHandlers(name);
        },
        /**
         * Registers a hook handler and returns its disposer.
         * @returns {() => boolean} unregisters the handler
         */
        onHook(name, callback, opts) {
            return hookRegistryOf(this).onHook(name, callback, opts);
        },
    };
    for (const [key, value] of Object.entries(methods)) {
        Object.defineProperty(proto, key, { value, writable: true, configurable: true });
    }
    return Class;
}
