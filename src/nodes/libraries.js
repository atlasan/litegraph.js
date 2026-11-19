
import { LiteGraph } from "../litegraph.js";

// WIP moved standalone, CLEAN
// class LibraryManager {
//     constructor() {
//         this.libraries_known = {};  
//         this.libraries_loaded = {}; 
//         this.libraries_state = {};  
//     }

//     registerLibrary(key, version, files, globalObject) {
//         this.libraries_known[key] = { key, version, files, globalObject };
//         this.libraries_state[key] = "not_loaded";
//     }

//     async loadLibrary(key, callback) {
//         if (!this.libraries_known[key]) {
//             console.error(`Library ${key} not registered.`);
//             return;
//         }

//         if (this.libraries_state[key] === "loading") {
//             console.warn(`Library ${key} is already loading.`);
//             return;
//         }

//         if (this.libraries_state[key] === "loaded") {
//             console.warn(`Library ${key} is already loaded.`);
//             callback && callback(this.libraries_loaded[key]);
//             return;
//         }

//         this.libraries_state[key] = "loading";
//         const library = this.libraries_known[key];

//         for (const fileX of library.files) {
//             // Detect required imports before loading
//             const requiredImports = await this.detectRequiredImports(fileX);

//             // Load only the necessary remapped files
//             const promises = requiredImports.map(file => this.loadScript(file));

//             Promise.all(promises)
//                 .then(() => {
//                     this.loadScript(fileX, key).then(()=>{
//                         this.libraries_state[key] = "loaded";
//                         this.libraries_loaded[key] = window[key] || {};
//                         console.log(`Library ${key} loaded.`);
//                         callback && callback(this.libraries_loaded[key]);
//                     })
//                     .catch(error => {
//                         this.libraries_state[key] = "error";
//                         console.error(`Error loading ${key}:`, error);
//                     });
//                 })
//                 .catch(error => {
//                     this.libraries_state[key] = "error";
//                     console.error(`Error loading required imports ${key}:`, error);
//                 });
//         }
//     }

//     // **Detect only the required imports using the source map**
//     async detectRequiredImports(scriptURL) {
//         try {
//             // Step 1: Fetch the script content
//             const response = await fetch(scriptURL);
//             if (!response.ok) throw new Error(`Failed to fetch ${scriptURL}`);
//             const scriptText = await response.text();
    
//             // Step 2: Extract all bare imports from the script
//             const importMatches = [...scriptText.matchAll(/import\s+.*?["']([^"']+)["']/g)];
//             const bareImports = importMatches.map(match => match[1]).filter(spec => !spec.startsWith("."));
    
//             // Step 3: Find the source map URL
//             const sourceMapMatch = scriptText.match(/\/\/# sourceMappingURL=(.+)/);
//             if (!sourceMapMatch) {
//                 console.warn(`No source map found in ${scriptURL}`);
//                 return[]; // DO NOT, return only extra : [scriptURL]; // NO OLD Default to the original file
//             }
    
//             const sourceMapURL = new URL(sourceMapMatch[1], scriptURL).href;
//             console.log(`Found source map: ${sourceMapURL}`);
    
//             // Step 4: Fetch the source map JSON
//             const mapResponse = await fetch(sourceMapURL);
//             if (!mapResponse.ok) throw new Error(`Failed to fetch source map: ${sourceMapURL}`);
//             const sourceMap = await mapResponse.json();
    
//             // Step 5: Correctly resolve only the required imports
//             const resolvedFiles = bareImports
//                 .map(importName => {
//                     // Check if `sourcesContent` or `sources` contains the module
//                     const exactMatch = sourceMap.sources.find(src => src.endsWith(`/${importName}.js`));
//                     return exactMatch ? new URL(exactMatch, scriptURL).href : null;
//                 })
//                 .filter(Boolean); // Remove nulls
    
//             console.log(`Correctly resolved imports:`, resolvedFiles);
//             return resolvedFiles.length > 0 ? resolvedFiles : []; // DO NOT, return only extra : NO OLD Use original file if no matches found
//         } catch (error) {
//             console.error(`Error resolving imports for ${scriptURL}:`, error);
//             return[]; // DO NOT, return only extra : [scriptURL]; // NO OLD Default to the original file
//         }
//     }

//     // **Detect and Load JavaScript as Module or CommonJS**
//     async loadScript(url, globalObject="lastscript") {
//         console.debug("Load script", url, globalObject);
//         return new Promise(async (resolve, reject) => {
//             let isModule = await this.isESModule(url);
//             console.debug("loadScript", isModule?"MODULE":"COMMONJS", url);
//             if (isModule) {
//                 let script = document.createElement("script");
//                 script.type = "module";
//                 script.textContent = `
//                     import { LiteGraph } from '../src/litegraph.js';
//                     import * as ${globalObject} from '${url}';
//                     window.${globalObject} = ${globalObject};
//                     LiteGraph.LibraryManager?.${globalObject} = ${globalObject};
//                     console.warn('LOADLIBOBJECT',window.${globalObject});
//                     // alert('loaded ${globalObject}');
//                 `;
//                 //alert(script.textContent);
//                 document.head.appendChild(script);
//                 resolve();
//             } else {
//                 let script = document.createElement("script");
//                 script.type = "text/javascript";
//                 script.src = url;
//                 script.onload = resolve;
//                 script.onerror = reject;
//                 document.head.appendChild(script);
//             }
//         });
//     }

//     // **Check if a script is an ES Module**
//     async isESModule(url) {
//         try {
//             let response = await fetch(url);
//             let text = await response.text();
//             return /export\s|import\s/.test(text); // Detect ES Module keywords
//         } catch (e) {
//             return false; // Default to CommonJS if fetch fails
//         }
//     }

//     // Load CSS
//     loadCSS(href) {
//         return new Promise((resolve, reject) => {
//             const link = document.createElement("link");
//             link.rel = "stylesheet";
//             link.href = href;
//             link.onload = resolve;
//             link.onerror = reject;
//             document.head.appendChild(link);
//         });
//     }

//     // Unload a library
//     unloadLibrary(key) {
//         if (!this.libraries_known[key]) {
//             console.error(`Library ${key} not registered.`);
//             return;
//         }

//         if (this.libraries_state[key] !== "loaded") {
//             console.warn(`Library ${key} is not loaded.`);
//             return;
//         }

//         const library = this.libraries_known[key];
//         library.files.forEach(file => {
//             if (file.endsWith(".js")) {
//                 document.querySelectorAll(`script[src="${file}"]`).forEach(el => el.remove());
//             } else if (file.endsWith(".css")) {
//                 document.querySelectorAll(`link[href="${file}"]`).forEach(el => el.remove());
//             }
//         });

//         this.libraries_state[key] = "not_loaded";
//         delete this.libraries_loaded[key];
//         console.log(`Library ${key} unloaded.`);
//     }

//     // Get the state of a library
//     getLibraryState(key) {
//         return this.libraries_state[key] || false; //"unknown";
//     }
// }

// // Attach LibraryManager to LiteGraph
// LiteGraph.LibraryManager = new LibraryManager();


// Utility function to format names
function camelize(str) {
    return str.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, '_$&');
}

// LiteGraph Node: CDNLibInclude
class CDNLibInclude {
    static title = "Lib Load";
    static desc = "Load by LibraryManager";

    constructor() {
        this.addInput("load", LiteGraph.ACTION);
        this.addInput("name", "string", { param_bind: true });
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("error", LiteGraph.EVENT);

        this.addProperty("name", "", "string");

        this.addWidget("string", "name", "", "name", {});
    }

    load() {
        const that = this;
        let name = this.getInputOrProperty("name");
    
        this.setProperty("name", name);

        LiteGraph.LibraryManager?.loadLibrary(name, () => {
            that.on_loaded(name);
        });
    }

    on_loaded(name) {
        console.debug?.("Loaded library", name);
        this.trigger("ready");
        this.boxcolor = "#0F0";
    }

    on_error(name, e) {
        this.trigger("error");
        this.boxcolor = "#F00";
        console.warn?.("Lib loading failed", name, e);
    }

    onAction(evt) {
        if (evt === "load") {
            this.load();
        }
    }

    onExecute() {}

    onGetInputs() {}

    onGetOutputs() {}
}
// Register the node
LiteGraph.registerNodeType("libraries/load", CDNLibInclude);


class CDNLibRegister {
    static title = "Lib Register";
    static desc = "Register a JS library (by url or object)";

    constructor() {
        this.addInput("load", LiteGraph.ACTION);
        this.addInput("lib_spec", "object,cdn_lib");
        this.addInput("url", "string,url", { param_bind: true });
        this.addInput("name", "string", { param_bind: true });
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("error", LiteGraph.EVENT);

        this.addProperty("module", true, "boolean");
        this.addProperty("url", "", "string");
        this.addProperty("name", "", "string");

        this.addWidget("string", "url", "", "url", {});
        this.addWidget("string", "name", "", "name", {});
        this.addWidget("toggle", "module", false, "module", {});
    }

    register() {
        const that = this;
        let url = this.getInputOrProperty("url");
        let name = this.getInputOrProperty("name");
        let lib_spec = {};

        if (!url) {
            lib_spec = this.getInputOrProperty("lib_spec");
            if (lib_spec && typeof lib_spec === "object" && lib_spec.latest) {
                url = lib_spec.latest;
                name = camelize(lib_spec.name);
            }
        } else {
            if (url && name) {
                lib_spec = { name, latest: url };
            } else {
                this.boxcolor = "#F00";
                return;
            }
        }

        if (lib_spec.latest) {
            this.setProperty("name", name);
            this.setProperty("url", url);

            LiteGraph.LibraryManager?.registerLibrary(name, "latest", name, [], [url]);
            
        } else {
            this.boxcolor = "#F00";
        }
    }

    on_loaded(lib_spec) {
        console.debug?.("Loaded library", lib_spec);
        if (lib_spec && lib_spec.name) {
            this.trigger("ready");
            this.boxcolor = "#0F0";
        } else {
            this.on_error(lib_spec);
        }
    }

    on_error(lib_spec, e) {
        this.trigger("error");
        this.boxcolor = "#F00";
        console.warn?.("Lib registration failed", lib_spec, e);
    }

    onAction(evt) {
        if (evt === "register") {
            this.register();
        }
    }

    onExecute() {}

    onGetInputs() {}

    onGetOutputs() {}
}
// Register the node
LiteGraph.registerNodeType("libraries/register", CDNLibRegister);


class CDNLibSearch {
    constructor() {
        this.addInput("search", LiteGraph.ACTION);
        this.addProperty("name", "", "string");
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("results", "array");
        this.addOutput("first name", "string");
        this.addOutput("first object", "object");
        this.addOutput("error", LiteGraph.EVENT);

        this.addWidget("string", "name", this.properties.name, "name");

        this._data = null;
        this._fetching = null;
        this.base_url = "https://api.cdnjs.com/libraries";
    }

    static title = "CDN Search";
    static desc = "Search and fetch CDN libraries";

    search() {
        const that = this;
        let url = this.base_url;
        const name = this.getInputOrProperty("name");

        if (name && name !== "") {
            url += "?search=" + encodeURIComponent(name);
        }

        this._fetching = fetch(url)
            .then((resp) => {
                if (!resp.ok) {
                    this.boxcolor = "#F00";
                    that.trigger("error");
                    return null;
                }
                return resp.json();
            })
            .then((data) => {
                if (!data || !data.results) {
                    that.boxcolor = "#F00";
                    that.trigger("error");
                    return;
                }

                that._data = data;
                that.boxcolor = "#0F0";

                if (data.results.length > 0) {
                    const firstLib = data.results[0];

                    // Extract details
                    const lib_spec = {
                        name: firstLib.name,
                        latest: firstLib.latest,
                        files: [firstLib.latest] // Assuming the latest file URL is the main script
                    };

                    // Register in LibraryManager
                    LiteGraph.LibraryManager?.registerLibrary(lib_spec.name, "latest", lib_spec.name, [], lib_spec.files);

                    // Set output data
                    that.setOutputData(1, data.results);  // Full results array
                    that.setOutputData(2, firstLib.name); // First library name
                    that.setOutputData(3, lib_spec);      // First library object
                } else {
                    that.setOutputData(2, null);
                    that.setOutputData(3, null);
                }

                that.trigger("ready");
            })
            .catch((error) => {
                console.error("CDN Search error:", error);
                that.boxcolor = "#F00";
                that.trigger("error");
            });
    }

    onAction(evt) {
        if (evt === "search") {
            this.search();
        }
    }

    onGetInputs() {
        return [["name", "string"]];
    }

    onGetOutputs() {
        return [
            ["error", LiteGraph.EVENT],
            ["results", "array"],
            ["first name", "string"],
            ["first object", "object"]
        ];
    }
}

// Register the node
LiteGraph.registerNodeType("libraries/search_CDN_lib", CDNLibSearch);


class CDNLibrarySelector {
    constructor() {
        this.addInput("refresh", LiteGraph.ACTION);
        this.addOutput("selected lib", "object");
        this.addOutput("libraries", "array");

        this.addProperty("selectedLibrary", "", "string");

        this.librariesList = this.getLibraries(); // Initial list

        this.addWidget("combo", "Library", this.properties.selectedLibrary, (v) => {
            this.properties.selectedLibrary = v;
        }, { values: this.librariesList });

        this.addWidget("button", "Refresh", null, () => this.refreshLibraries());
    }

    static title = "Library Selector";
    static desc = "Select and output a registered library";

    // Get list of registered libraries
    getLibraries() {
        return Object.keys(LiteGraph.LibraryManager?.libraries_known || {});
    }

    // Refresh library list
    refreshLibraries() {
        this.librariesList = this.getLibraries();
        this.widgets[0].options.values = this.librariesList;
        this.setDirtyCanvas(true);
    }

    onAction(event) {
        if (event === "refresh") {
            this.refreshLibraries();
        }
    }

    onExecute() {
        this.refreshLibraries();

        const selectedLib = this.properties.selectedLibrary;
        if (selectedLib && LiteGraph.LibraryManager?.libraries_known[selectedLib]) {
            this.setOutputData(0, LiteGraph.LibraryManager?.libraries_known[selectedLib]);
        }
        
        this.setOutputData(1, this.librariesList);
    }

    onGetInputs() {
        return [["refresh", LiteGraph.ACTION]];
    }

    onGetOutputs() {
        return [["selected lib", "object"], ["libraries", "array"]];
    }
}

// Register the node
LiteGraph.registerNodeType("libraries/selector", CDNLibrarySelector);

// what these node types need from the runtime (see LiteGraph.declareCapabilities)
LiteGraph.declareCapabilities("libraries/", ["network"]);
