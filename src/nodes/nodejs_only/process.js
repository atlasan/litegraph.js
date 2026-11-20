// built-in pack: node types registered below belong to "litegraph/nodejs-process" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/nodejs-process", version: LiteGraph.VERSION, title: "Node.js process", builtin: true });

class NodeProcessInfo {
    constructor() {
        this.runtime = "node";
        this.libraries = ["os"];
        this.addOutput("info", "object");
        this.output = null;
    }

    onPostConstruct() {
        this.os = LiteGraph.LibraryManager.getLib("os");
        this.output = this.getSystemInfo();
    }

    getSystemInfo() {
        return {
            platform: this.os.platform(),
            arch: this.os.arch(),
            cpuCores: this.os.cpus().length,
            freeMemory: this.os.freemem(),
            totalMemory: this.os.totalmem(),
            uptime: this.os.uptime(),
        };
    }

    onExecute() {
        this.output = this.getSystemInfo();
        this.setOutputData(0, this.output);
    }
}

LiteGraph.registerNodeType("server/process/NodeProcessInfo", NodeProcessInfo);

// what these node types need from the runtime (see LiteGraph.declareCapabilities)
LiteGraph.declareCapabilities("server/process/", ["node", "sys"]);

LiteGraph.packs.close("litegraph/nodejs-process");
