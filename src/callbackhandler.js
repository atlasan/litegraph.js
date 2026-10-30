import { LiteGraph } from "./litegraph.js";

/**
 * WIP
 * intended to replace direct (single) assignment of callbacks [ event entrypoint ]
 */
export class CallbackHandler {

    debug = false;

    constructor(ref){
        this.callbacks_handlers = {};
        this.ob_ref = ref;
        if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("CallbackHandler Initialize callbacks",ref);
    }

    /**
     * subscribe callbacks for events
     * @method registerCallbackHandler
     * @param {string} name event name to register to
     * @param {function} callback function to call when processing the event name
     * @param {object} opts options for registerCallBackHandler
     * @param {number} opts.priority default handler as 0, lesser value executes after, greater value will be execute before but their value eventually overridden in case if not stopping the chain
     * @param {boolean} opts.is_default original library handlers would have true, while custom registered has choice to be eventually treathed as such
     * @returns {number} the id of the handler for the specified name
     */
    registerCallbackHandler = function(name, callback, opts){
        if(!opts || typeof(opts)!=="object") opts = {};
        const def_opts = {priority: 0, is_default: false, call_once: false};
        opts = Object.assign(def_opts, opts);
        
        if(typeof(callback)!=="function"){
            if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_error("registerCallbackHandler","Invalid callback");
            return false;
        }

        if(typeof(this.callbacks_handlers[name]) === "undefined"){
            this.callbacks_handlers[name] = {last_id: 0, handlers:[]};
        }
        const h_id = this.callbacks_handlers[name].last_id++;

        if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("registerCallbackHandler","new callback handler",name,h_id);

        this.callbacks_handlers[name].handlers.push({
            id: h_id,
            priority: opts.priority,
            callback: callback,
            data: opts, // enqueue passed options, can store info in here
        });

        // sort descending
        this.callbacks_handlers[name].handlers.sort((a, b) => b.priority - a.priority);

        // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("registerCallbackHandler","sorted",this.callbacks_handlers[name]);

        return h_id; // return the cbhandle id
    };
    /**
     * 
     * @param {string} name event name to unregister from
     * @param {number} h_id the handler pointer, need to be saved when registering the callback
     * @returns {boolean} true if found
     */
    unregisterCallbackHandler(name, h_id){
        // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("unregisterCallbackHandler","Checking in handlers",this.callbacks_handlers,name,h_id);
        if(typeof(this.callbacks_handlers[name]) !== "undefined"){
            const nHandlers = this.callbacks_handlers[name].handlers.length;
            this.callbacks_handlers[name].handlers = this.callbacks_handlers[name].handlers.filter(function( obj ) {
                // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("unregisterCallbackHandler","Checking handle",obj.id,h_id);
                if(obj.id === h_id){
                    LiteGraph.log_info("unregisterCallbackHandler",name,h_id);
                }
                return obj.id !== h_id;
            });
            if(this.callbacks_handlers[name].handlers.length < nHandlers){
                return true;
            }
        }
        LiteGraph.log_warn("unregisterCallbackHandler","no handlers for",name,h_id);
        return false;
    }

    /**
     * Executes the callbacks and cache their result
     * execution if from higher priority down
     * handler data is passed as first argument, than all the additional pars passed to this
     * @param {string} name the event name for which execute the callbacks registered to
     * @param {object} opts specify the option here
     * @param {object} opts.def_cb can specify a callback here to be treated as default callback, executed after the >= 0, eventually prevented
     * @returns {null|boolean|object} get back default result, and along the chain
     */
    processCallbackHandlers(name,opts/*, .. arguments */){
        if(!opts || typeof(opts)!=="object") opts = {};
        const def_opts = {
            // WIP :: think try and implement options
            // process: "all", return: "first_result", skip_null_return: true, append_last_return: false
            // min_piority: false, max_priority: false
            def_cb: false // the [default] callback : in LG this is the previous(current) function called when an event is executed, can be undefined or null
        };
        opts = Object.assign(def_opts, opts);
        var cbHandle = this;

        if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("**processCallbackHandlers**",...arguments);

        // ensure callback name is present on this
        if(typeof(this.callbacks_handlers[name]) == "undefined"){
            this.callbacks_handlers[name] = {last_id: 0, handlers:[]};
        }
        
        var aArgs = ([].slice.call(arguments)).slice(2);
        // if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("Cleaned arguments (slice 2)",aArgs,"original",arguments);

        // previous implementation of converting arguments
        // using shorter ([].slice.call(arguments)).slice(2)
        // can clean when checked works fine
        // function clean_args(args) {
        //     let aRet = [];
        //     for(let iA=2; iA<args.length; iA++) {
        //         // if(typeof(args[iA])!=="undefined")
        //         aRet.push(args[iA]);
        //     }
        //     return aRet;
        // }
        // var aArgs = clean_args(arguments);

        var stepRet = null;         // temp step specific result 
        var cbRet = null;           // progressive final result
        var aResChain = [];         // progressive results chain
        var oCbInfo = {};           // info passed to the callback
        var cbResPriority = 0;      // incremental result priority
        var defCbChecked = false;   // flag activated when executed the [default] callback
        var preventDefCb = false;   // if to prevent the [default] callback execution (set eventually by some callback result)
        var breakCycle = false;     // if to stop callback execution (set eventually by some callback result)

        var executeDefaultCb = function(){
            if(!preventDefCb && typeof(opts.def_cb)=="function"){
                // execute default callback
                if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_verbose("Calling DEFAULT w Args",...aArgs);
                // stepRet = opts.def_cb(...aArgs); // OLD, not working because of bas THIS 
                // call method on ref object (LiteGraph, LGraphNode, LGraphCanvas, ...) in othe method `this` will than correctly set
                stepRet = opts.def_cb.call(cbHandle.ob_ref, ...aArgs); // could pass more data
                if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","default callback executed",stepRet);
                checkStepRet();
            }else{
                if(typeof(opts.def_cb)=="function"){
                    if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","preventing default passed",opts.def_cb);
                }else{
                    // not passed
                }
            }
            defCbChecked = true;
        }
        // results should be structured a object (to try to return a final value or change chain execution behavior)
        /**
         * @prop {*} return_value assign the return ( could be overriden )
         * @prop {number} result_priority assign proper values to allow handlers with higher priority to have not their return_value overridden 
         * @prop {boolean} prevent_default stop default execution ( force only when really needed )
         * @prop {boolean} stop_replication stop the execution chain
         */
        var buildRetObj = function(){
            // TODO: implement object return construction :: THAN replace all result checking in the libs to easier object ensured checks
        }
        /**
         * called for each callback to push and merge results
         * void
         */
        var checkStepRet = function(){
            aResChain.push(stepRet); // cache result
            // check result for structured object
            if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","checkStepRet","stepRet check",stepRet);
            if(stepRet !== null && typeof(stepRet)=="object"){
                if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","checkStepRet","result is object",stepRet);
                if(typeof(stepRet.prevent_default)!=="undefined" && stepRet.prevent_default){
                    preventDefCb = true;
                }
                if(typeof(stepRet.return_value)!=="undefined"){
                    if( !cbResPriority
                        || (typeof(stepRet.result_priority)!=="undefined" && cbResPriority <= stepRet.result_priority)
                        || (typeof(stepRet.result_priority)==="undefined" && (!cbResPriority || cbResPriority <= 0))
                    ){
                        if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","checkStepRet","set result from object",stepRet,oCbInfo);
                        cbRet = stepRet;
                    }
                }else{
                    if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","checkStepRet","set result, not object",stepRet,oCbInfo);
                    cbRet = stepRet;
                }
                if(typeof(stepRet.stop_replication)!=="undefined" && stepRet.stop_replication){
                    if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","checkStepRet","stop_replication",oCbInfo);
                    breakCycle = true;
                    return; // will break;
                }
            }else{
                if(cbHandle.debug&&LiteGraph!==undefined) LiteGraph.log_debug("processCallbackHandlers","checkStepRet","result NOT object",stepRet);
                // ? save current result if not null or undefined (?)
                if(stepRet !== null && stepRet !== undefined){
                    cbRet = stepRet; // TODO maybe to remove, leave for current stability
                }
            }
        }
        for(let cbhX of this.callbacks_handlers[name].handlers){

            // eventually prevent cb marked as default
            if(preventDefCb && cbhX.is_default){
                if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("processCallbackHandlers","preventing default registered",cbhX);
                continue;
            }
            
            // execute default if already processed the ones >= 0
            if(cbhX.priority<0 && !defCbChecked){
                if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_verbose("processCallbackHandlers","process default passed","nextCb:",cbhX);
                executeDefaultCb();
                if(breakCycle) break;
            }

            oCbInfo = {
                name: name // name of the handler
                ,id: cbhX.id // id of the handler for the name
                ,current_return_value: cbRet // current temporary value (if >= second call and previous return a value) 
                ,data: cbhX.data // pass the priority and the additional data passed
                ,results_chain: aResChain
                // opts: def_opts
            };

            // execute callback
            // OLD, not working because of bas THIS : stepRet = cbhX.callback(oCbInfo,...aArgs);
            // call method on ref object (LiteGraph, LGraphNode, LGraphCanvas, ...) in the method `this` will than correctly set
            stepRet = cbhX.callback.call(this.ob_ref, oCbInfo, ...aArgs);

            if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers","callback executed",stepRet,oCbInfo);
            
            // push result
            checkStepRet();
            if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers","result checked","cbRet", cbRet,"aResChain", aResChain,"cbResPriority", cbResPriority,"defCbChecked", defCbChecked,"preventDefCb", preventDefCb,"breakCycle", breakCycle);
            if(breakCycle) break;

            if(cbhX.data.call_once){
                this.unregisterCallbackHandler(name, cbhX.id);
                if (typeof(this)=="object" && typeof(this.debug)!=="undefined" && this.debug && LiteGraph !== undefined) LiteGraph.log_debug("processCallbackHandlers","unregistered call_once",oCbInfo);
            }

        } // end cycle
    
        // recheck for default cb passed after cycling
        if(!defCbChecked){
            executeDefaultCb();
        }

        // if(cbRet===null){
        //     // return default true if no callbacks specified a return value
        //     // [ some original LG callback execution checks for boolean return ]
        //     cbRet = true;
        // }
        return cbRet;

        // could return obj instead and there check for values, etc ..
        // TODO would be probably better to always return an object to than check for result and make easier code in implementation
    }
}