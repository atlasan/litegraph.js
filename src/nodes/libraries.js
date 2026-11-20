
import { LiteGraph } from "../litegraph.js";

// built-in pack: node types registered below belong to "litegraph/libraries" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/libraries", version: LiteGraph.VERSION, title: "Libraries", builtin: true });

// The library manager itself lives in src/librarymanager.js (LiteGraph.LibraryManager).

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

            LiteGraph.LibraryManager?.registerLibrary({ key: name, version: "latest", globalObject: name, browser: { remote: url } });
            
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
                    LiteGraph.LibraryManager?.registerLibrary({ key: lib_spec.name, version: "latest", globalObject: lib_spec.name, browser: { remote: lib_spec.files } });

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

LiteGraph.packs.close("litegraph/libraries");
