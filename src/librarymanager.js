import { isBrowser, isNode, isBun, getRuntime } from "./global.js";
import { getGlobalObject, setGlobalVariable, getGlobalVariable } from './global.js';

// export const root = getGlobalObject();

// node modules ::
// path
// fs
// vm
// node-fetch
// ws
// http
// socket-io
// socket-io-client

export class LibraryManager {
    constructor() {
        this.libraries_known = {};
        this.libraries_loaded = {};
        this.libraries_to_load = [];
        this.libraries_state = {};
        this.loading_promises = {};
        this.fs = null;
        this.path = null;

        // Dynamically import Node.js modules (avoid errors in browsers)
        this.ready = isBrowser() ? Promise.resolve() : this.importNodeModules();

        setGlobalVariable("LibraryManager", this);
    }

    async importNodeModules() {
        // ERROR in NuNu when packing
        try {
            this.fs = await import("fs").then(m => m.default || m);
        } catch (e) {
            console.warn("Error importing 'fs':", e);
        }
        try {
            this.path = await import("path").then(m => m.default || m);
        } catch (e) {
            console.warn("Error importing 'path':", e);
        }
        try {
            this.vm = await import("vm").then(m => m.default || m);
            this.fetch = await import("node-fetch").then(m => m.default || m);
        } catch (e) {
            console.warn("Error importing Node.js modules:", e);
        }
    }

    /**
     * Register a library with flexible options (structured object or simple format).
     * If the library is already registered, merge new data with the existing one.
     * Options:
     *  - key, version, globalObject, defaultExport
     *  - browser: { local, remote, target } where target can be "client", "both"
     *  - server: { npm, remote, target } where target can be "server", "both"
     */
    registerLibrary(...args) {
        let newLib = {};
        if (typeof args[0] === "object" && !Array.isArray(args[0])) {
            const { key, version, globalObject, browser = {}, server = {}, defaultExport } = args[0];
            newLib = {
                key,
                version,
                globalObject,
                localPaths: this.ensureArray(browser.local),
                remoteUrls: this.ensureArray(browser.remote),
                browserTarget: browser.target || "both",
                npmPackages: this.ensureArray(server.npm),
                serverRemoteUrls: this.ensureArray(server.remote),
                serverTarget: server.target || "both",
                defaultExport
            };
        } else {
            const [key, version, globalObject, localPaths, remoteUrls, npmPackages, serverRemoteUrls, defaultExport] = args;
            newLib = {
                key,
                version,
                globalObject,
                localPaths: this.ensureArray(localPaths),
                remoteUrls: this.ensureArray(remoteUrls),
                browserTarget: "both",
                npmPackages: this.ensureArray(npmPackages),
                serverRemoteUrls: this.ensureArray(serverRemoteUrls),
                serverTarget: "both",
                defaultExport
            };
        }

        // If already registered, merge configurations.
        if (this.libraries_known[newLib.key]) {
            const existing = this.libraries_known[newLib.key];
            // Merge arrays using a Set to ensure uniqueness.
            existing.localPaths = Array.from(new Set([...existing.localPaths, ...newLib.localPaths]));
            existing.remoteUrls = Array.from(new Set([...existing.remoteUrls, ...newLib.remoteUrls]));
            existing.npmPackages = Array.from(new Set([...existing.npmPackages, ...newLib.npmPackages]));
            existing.serverRemoteUrls = Array.from(new Set([...existing.serverRemoteUrls, ...newLib.serverRemoteUrls]));
            // Optionally update version if provided new value (here we override if different).
            if (newLib.version && existing.version !== newLib.version) {
                existing.version = newLib.version;
            }
            // Merge target flags: if they differ, default to "both"
            if (existing.browserTarget !== newLib.browserTarget) {
                existing.browserTarget = "both";
            }
            if (existing.serverTarget !== newLib.serverTarget) {
                existing.serverTarget = "both";
            }
            // Update default export if provided.
            if (newLib.defaultExport !== undefined) {
                existing.defaultExport = newLib.defaultExport;
            }
            // Do not change the load state if already loaded.
            this.libraries_known[newLib.key] = existing;
        } else {
            // First registration: simply add it.
            this.libraries_known[newLib.key] = newLib;
            this.libraries_state[newLib.key] = "not_loaded";
        }
    }

    /**
     * Helper function to ensure a value is always an array.
     */
    ensureArray(value) {
        return Array.isArray(value) ? value : value ? [value] : [];
    }

    camelize(str) {
        return str.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, '_$&');
    }

    async loadLibrary(key, callback) {
        if (!Object.hasOwn(this.libraries_known, key)) {
            throw new Error(`Library ${key} not registered`);
        }
        if (this.libraries_state[key] === "loaded") {
            callback?.(this.libraries_loaded[key]);
            return this.libraries_loaded[key];
        }
        if (!this.loading_promises[key]) {
            this.libraries_to_load.push(key);
            this.libraries_state[key] = "loading";
            this.loading_promises[key] = Promise.resolve().then(async () => {
                await this.ready;
                const library = this.libraries_known[key];
                const modules = isBrowser()
                    ? await this.loadBrowserLibrary(library)
                    : await this.loadServerLibrary(library);
                this.libraries_loaded[key] = modules;
                this.libraries_state[key] = "loaded";
                return modules;
            }).catch((error) => {
                this.libraries_state[key] = "error";
                throw error;
            }).finally(() => {
                delete this.loading_promises[key];
                this.libraries_to_load = this.libraries_to_load.filter((item) => item !== key);
            });
        }
        const modules = await this.loading_promises[key];
        callback?.(modules);
        return modules;
    }

    // Each list is an ordered dependency group; remote sources are a fallback group.
    async loadBrowserLibrary(library) {
        const groups = [library.localPaths, library.remoteUrls].filter((urls) => urls.length);
        if (!groups.length) {
            if (library.npmPackages.length || library.serverRemoteUrls.length) {
                throw new Error(`Library ${library.key} is not available in the browser`);
            }
            return [];
        }
        let failure;
        for (const urls of groups) {
            try {
                const loaded = [];
                for (const url of urls) loaded.push(await this.loadScript(url, library.globalObject, library.defaultExport));
                return loaded;
            } catch (error) {
                failure = error;
            }
        }
        throw new Error(`Could not load browser library ${library.key}`, { cause: failure });
    }

    selectExport(namespace, defaultExport) {
        if (!defaultExport) return namespace;
        const name = defaultExport === true ? "default" : defaultExport;
        if (!(name in namespace)) throw new Error(`Library export ${name} was not found`);
        return namespace[name];
    }

    async loadServerLibrary(library) {
        await this.ready;
        const groups = [];
        if (library.npmPackages.length) groups.push(() => this.loadPackages(library));
        if (library.serverRemoteUrls.length) groups.push(async () => {
            const modules = [];
            for (const url of library.serverRemoteUrls) modules.push(await this.loadServerRemoteScript(url));
            return modules;
        });
        if (!groups.length) {
            if (library.localPaths.length || library.remoteUrls.length) {
                throw new Error(`Library ${library.key} is not available on the server`);
            }
            return [];
        }
        let failure;
        for (const load of groups) {
            try {
                const modules = await load();
                if (library.globalObject) setGlobalVariable(library.globalObject, modules[modules.length - 1]);
                return modules;
            } catch (error) {
                failure = error;
            }
        }
        throw new Error(`Could not load server library ${library.key}`, { cause: failure });
    }

    async loadPackages(library) {
        const modules = [];
        for (const name of library.npmPackages) {
            modules.push(this.selectExport(await import(name), library.defaultExport));
        }
        return modules;
    }

    isLibraryLoaded(libKey){
        return this.getLibraryState(libKey) === "loaded";
    }

    getLib(libKey) {
        if (!this.isLibraryLoaded(libKey)) {
            console.warn(`[NodeJsSys] Library '${libKey}' is not loaded. Attempting to load...`);
            this.loadLibrary(libKey).catch((error) => console.error(error));
            return null;
        }
        const library = this.libraries_known[libKey];
        return library ? getGlobalVariable(library.globalObject) || null : null;
    }

     /**
     * Wait for a library to be loaded.
     * @param {string} libKey - The key of the library.
     * @param {number} timeout - Maximum wait time in milliseconds.
     * @returns {Promise<any>} Resolves with the global object for the library.
     */
    waitForLib(libKey, timeout = 9000) {
        return new Promise((resolve, reject) => {
            const timer = timeout ? setTimeout(() => reject(new Error(`Library ${libKey} did not load within ${timeout}ms`)), timeout) : null;
            this.loadLibrary(libKey).then(() => {
                clearTimeout(timer);
                resolve(getGlobalVariable(this.libraries_known[libKey].globalObject));
            }, (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    async loadServerRemoteScript(url) {
        if (!this.fetch || !this.vm) throw new Error("Node.js modules 'fetch' and 'vm' are required.");

        console.log(`Fetching remote script: ${url}`);
        const response = await this.fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);

        const scriptText = await response.text();
        const script = new this.vm.Script(scriptText);
        const exports = {};
        const sandbox = { window: {}, module: { exports }, exports };
        script.runInNewContext(sandbox);

        console.log("✅ Loaded from remote:", url);
        return sandbox.module.exports || sandbox.exports;
    }

    async loadScript(url, globalObject = "library_last", defaultExport) {
        if (await this.isESModule(url)) {
            const namespace = await import(new URL(url, document.baseURI).href);
            const value = this.selectExport(namespace, defaultExport);
            if (globalObject) setGlobalVariable(globalObject, value);
            return value;
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = url;
            script.onload = () => resolve(globalObject ? getGlobalVariable(globalObject) : script);
            script.onerror = () => {
                script.remove();
                reject(new Error(`Failed to load script: ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    // **Check if a script is an ES Module**
    async isESModule(url) {
        try {
            let response = await fetch(url);
            let text = await response.text();
            return /export\s|import\s/.test(text); // Detect ES Module keywords
        } catch (e) {
            return false; // Default to CommonJS if fetch fails
        }
    }

    // Load CSS
    loadCSS(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    // **Unload a library**
    unloadLibrary(key) {
        if (!this.libraries_known[key]) {
            console.error(`Library ${key} not registered.`);
            return;
        }

        if (this.libraries_state[key] !== "loaded") {
            console.warn(`Library ${key} is not loaded.`);
            return;
        }

        const library = this.libraries_known[key];
        if (isBrowser()) [...library.localPaths, ...library.remoteUrls].forEach(file => {
            if (file.endsWith(".js")) {
                document.querySelectorAll(`script[src="${file}"]`).forEach(el => el.remove());
            } else if (file.endsWith(".css")) {
                document.querySelectorAll(`link[href="${file}"]`).forEach(el => el.remove());
            }
        });

        this.libraries_state[key] = "not_loaded";
        delete this.libraries_loaded[key];
        console.log(`Library ${key} unloaded.`);
    }

    // **Get the state of a library**
    getLibraryState(key) {
        return this.libraries_state[key] || false;
    }

    /**
     * Check if all libraries to load are loaded.
     * @returns {boolean} True if every library's state is "loaded", false otherwise.
     */
    areAllLibrariesLoaded() {
        return !Object.values(this.libraries_state).some((state) => state === "loading" || state === "error");
    }

    /**
     * Attempt to install NPM packages required for a library.
     * This method is only supported in Node.js or Bun environments.
     * @param {string} libKey The key of the library.
     * @returns {Promise<string>} The stdout from the npm install command.
     */
    async npmInstall(libKey, command="npm install") {
        if (!isNode() && !isBun()) {
            console.warn('npmInstall is only supported in Node.js or Bun environments.');
            return;
        }
        if (!this.libraries_known[libKey]) {
            console.error(`Library ${libKey} not registered.`);
            return;
        }
        const library = this.libraries_known[libKey];
        if (!library.npmPackages || library.npmPackages.length === 0) {
            console.warn(`Library ${libKey} has no npm packages to install.`);
            return;
        }
        let child_process;
        try {
            child_process = await import("child_process").then(m => m.default || m);
        } catch (e) {
            console.error("Failed to import child_process:", e);
            return;
        }
        const packages = library.npmPackages.join(" ");
        const cmd = command + ` ${packages}`;
        return new Promise((resolve, reject) => {
            child_process.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error installing npm packages for ${libKey}:`, error);
                    reject(error);
                    return;
                }
                console.log(`npm install output for ${libKey}:`, stdout);
                resolve(stdout);
            });
        });
    }

    /**
     * Wait until all registered libraries have been loaded.
     * @returns {Promise<void>} Resolves when all libraries are in the "loaded" state.
     */
    async waitAllLibrariesLoaded() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.areAllLibrariesLoaded()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Load all registered libraries concurrently.
     * @returns {Promise<void>} Resolves when all libraries have attempted to load.
     */
    async loadAllLibraries() {
        const keys = Object.keys(this.libraries_known);
        await Promise.all(keys.map(key => this.loadLibrary(key)));
    }

    /**
     * Unload all loaded libraries.
     */
    unloadAllLibraries() {
        Object.keys(this.libraries_known).forEach(key => {
            if (this.libraries_state[key] === "loaded") {
                this.unloadLibrary(key);
            }
        });
    }

    /**
     * Get a list of all registered library keys.
     * @returns {string[]} An array of registered library keys.
     */
    getRegisteredLibraries() {
        return Object.keys(this.libraries_known);
    }
}

export default LibraryManager;
