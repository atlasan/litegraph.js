
/**
 * logging level enums
 */
export const E_NONE = -1;
export const ERROR = 0;
export const WARNING = 1;
export const INFO = 2;
export const LOG = 3;
export const DEBUG = 4;
export const VERBOSE = 5;
export const TRACE = 6;
export const SILLY = 7;

export const LOG_LEVELS = {
    E_NONE,
    ERROR,
    WARNING,
    INFO,
    LOG,
    DEBUG,
    VERBOSE,
    TRACE,
    SILLY,
};

/**
 * Class to handle logging, can dinamically set verbosity and have direct reference of who logs binding it to an object
 * @constructor
 * @param {Object} optsIn
 * @param {Number} optsIn[level] - default logging level
 * @param {Object} optsIn[target] - the object the logger will get attached to
 * @param {Boolean} optsIn[log_prepend_target] - enable prepending the target reference to the log
 * @param {Array} optsIn[log_prepend_arguments] - pass additional arguments to be prepended
 * @param {Array} optsIn[log_append_arguments] - pass additional arguments to be appended
 */
export class Logger {

    constructor(optsIn = {}) {
        const optDef = {
            level: LOG,
            target: null,
            log_prepend_target: true,
            log_prepend_arguments: [],
            log_append_arguments: [],
        };
        const opts = Object.assign(optDef, optsIn);
        Object.keys(optDef).forEach((par_name) => {
            this[par_name] = opts[par_name];
        });
    }

    /**
     * Sets logging level
      @param {Number,String} level
     */
    setLevel(level) {
        if(typeof(level)=="string" && typeof(LOG_LEVELS[level])!=="undefined") {
            level = LOG_LEVELS[level];
        }
        this.level = Number(level);
        if(isNaN(this.level)) this.level = LOG;
        return this.level;
    }

    /**
     * doLog helpers implementations for standard levels
     */
    log() {
        this.doLog(LOG, ...arguments);
    }
    logError() {
        this.doLog(ERROR, ...arguments);
    }
    logWarn() {
        this.doLog(WARNING, ...arguments);
    }
    logInfo() {
        this.doLog(INFO, ...arguments);
    }
    logDebug() {
        this.doLog(DEBUG, ...arguments);
    }
    logVerbose() {
        this.doLog(VERBOSE, ...arguments);
    }
    logTrace() {
        this.doLog(TRACE, ...arguments);
    }
    logSilly() {
        this.doLog(SILLY, ...arguments);
    }

    /**
     * Will send the log to the console if passed level if lower or equal than the level set for this logger
     * @param {Number} level
     * @argument {*} moreArgs - all additional arguments are passed along
     * @returns {Boolean} - logged or not, usually not needed
     */
    doLog(level = LOG, moreArgs) {
        level = parseInt(level);

        if(level > this.level) {
            return false; // -- break --
        }

        let consoleMethod = "debug";
        if(level>=0 && level<=4) {
            consoleMethod = ['error', 'warn', 'info', 'log', 'debug'][level];
        }

        if(typeof(console)=="object" && typeof(console[consoleMethod])=="function") {
            console[consoleMethod](...this.parseArguments(level, arguments));
        }else{
            return false;
        }

        return true;
    }

    /**
     * Will process passed arguments cleaning and prepending and appending info
     * @param {Array} args - arguments to be parsed, will skip first
     * @returns {Array} - parsed arguments
     */
    parseArguments(level, args) {
        let aRet = [];
        if(level<0 || level>4) {
            aRet.push("[lvl:"+level+"]");
        }
        if(typeof(this.log_prepend_arguments.forEach)!=="undefined") {
            this.log_prepend_arguments.forEach(element => {
                aRet.push(element);
            });
        }
        if(this.log_prepend_target && this.target!==null) {
            aRet.push(this.target);
        }
        for(let iA=1; iA<args.length; iA++) {
            aRet.push(args[iA]!=="undefined" ? args[iA] : "undefined");
        }
        if(typeof(this.log_append_arguments.forEach)!=="undefined") {
            this.log_append_arguments.forEach(element => {
                aRet.push(element);
            });
        }
        return aRet;
    }

}